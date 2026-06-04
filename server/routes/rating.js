// NumeraRating System (NRS) — the competitive rating API: per-session rating updates
// (domain + global with influence weighting), profile/history/leaderboard, skill-based
// matchmaking, seasons, admin analytics, and per-session explanations. The internal helpers
// are NRS-specific and live here with the routes; the math lives in mathEngine/ratingEngine.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const NRS = require('../mathEngine/ratingEngine');

const router = express.Router();

// ── Internal helpers ──────────────────────────────────────────────────────────

function getRatingRow(userId, domain, callback) {
  db.get('SELECT * FROM user_ratings WHERE user_id = ? AND domain = ?', [userId, domain], (err, row) => {
    if (err) return callback(err);
    if (row) return callback(null, row);
    callback(null, {
      user_id: userId,
      domain,
      mu: NRS.MU_INIT,
      sigma: NRS.SIGMA_INIT,
      display_rating: 0,
      sessions_count: 0,
      last_updated: 0,
    });
  });
}

function persistRatingUpdate(userId, domain, before, after, sessionMeta, explanation, callback) {
  const now = Math.floor(Date.now() / 1000);
  db.run(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, domain) DO UPDATE SET
       mu             = excluded.mu,
       sigma          = excluded.sigma,
       display_rating = excluded.display_rating,
       sessions_count = excluded.sessions_count,
       last_updated   = excluded.last_updated`,
    [userId, domain, after.mu, after.sigma, after.displayRating, after.sessionsCount, now],
    (errUpsert) => {
      if (errUpsert) return callback(errUpsert);
      db.run(
        `INSERT INTO rating_history
           (user_id, domain, mu_before, sigma_before, mu_after, sigma_after,
            display_before, display_after, delta, performance_score, expected_score,
            components_json, explanation, session_category, session_level, game_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          domain,
          before.mu,
          before.sigma,
          after.mu,
          after.sigma,
          before.display_rating,
          after.displayRating,
          after.delta,
          after.performanceScore,
          after.expectedPerformance,
          JSON.stringify(after.components),
          explanation,
          sessionMeta.category,
          sessionMeta.level,
          sessionMeta.gameMode,
          now,
        ],
        (errHist) => callback(errHist)
      );
    }
  );
}

function maybeUpdateSeasonPeak(userId, domain, displayRating) {
  db.get('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1', (errS, season) => {
    if (errS || !season) return;
    db.run(
      `INSERT INTO season_ratings (user_id, season_id, domain, peak_display, final_display)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, season_id, domain) DO UPDATE SET
         peak_display  = MAX(peak_display, excluded.peak_display),
         final_display = excluded.final_display`,
      [userId, season.id, domain, displayRating, displayRating]
    );
  });
}

function nrsUpdateVelocity(userId, domain, delta) {
  db.get('SELECT velocity FROM learning_velocity WHERE user_id = ? AND domain = ?', [userId, domain], (err, row) => {
    const newVel = NRS.updateLearningVelocity(row ? row.velocity : 0, delta);
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO learning_velocity (user_id, domain, velocity, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, domain) DO UPDATE SET velocity = excluded.velocity, updated_at = excluded.updated_at`,
      [userId, domain, newVel, now]
    );
  });
}

function checkSmurfSignals(userId, excess, sessionsCount) {
  db.get('SELECT * FROM smurf_signals WHERE user_id = ?', [userId], (err, row) => {
    const updated = NRS.evaluateSmurfSignals(row || {}, excess, sessionsCount);
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO smurf_signals (user_id, anomaly_score, consecutive_high, flagged, last_checked)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         anomaly_score    = excluded.anomaly_score,
         consecutive_high = excluded.consecutive_high,
         flagged          = MAX(flagged, excluded.flagged),
         last_checked     = excluded.last_checked`,
      [userId, updated.anomaly_score, updated.consecutive_high, updated.flagged ? 1 : 0, now]
    );
    if (updated.flagged) {
      securityLog(userId, 'SMURF_FLAG', 'system', `anomaly_score=${updated.anomaly_score.toFixed(3)}, consecutive=${updated.consecutive_high}`);
    }
  });
}

function nrsUpdateTilt(userId, performanceScore, sessionData) {
  db.get('SELECT * FROM tilt_tracking WHERE user_id = ?', [userId], (err, row) => {
    const updated = NRS.updateTiltState(row || {}, performanceScore, sessionData);
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO tilt_tracking (user_id, loss_streak, tilt_score, tilted, last_session)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         loss_streak  = excluded.loss_streak,
         tilt_score   = excluded.tilt_score,
         tilted       = excluded.tilted,
         last_session = excluded.last_session`,
      [userId, updated.loss_streak, updated.tilt_score, updated.tilted ? 1 : 0, now]
    );
    if (updated.tilted && (!row || !row.tilted)) {
      db.run(
        `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
         VALUES (?, 'Take a Break 🧘', ?, 'system', 0, ?)`,
        [userId, "You've had a tough session run. Taking a short break often improves performance. Your matchmaking will be adjusted to find you better-suited opponents.", now]
      );
    }
  });
}

// ── POST /api/rating/session ──────────────────────────────────────────────────
router.post('/api/rating/session', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { category, level, usedCalculator, gameMode } = req.body;
  let { solvedCount, totalProblems, errorsCount, speedBonus, comboBonus } = req.body;

  solvedCount = Math.min(Math.max(parseInt(solvedCount, 10) || 0, 0), 20);
  totalProblems = Math.min(Math.max(parseInt(totalProblems, 10) || 3, 1), 20);
  errorsCount = Math.min(Math.max(parseInt(errorsCount, 10) || 0, 0), 20);
  speedBonus = Math.min(Math.max(parseInt(speedBonus, 10) || 0, 0), 20);
  comboBonus = Math.min(Math.max(parseInt(comboBonus, 10) || 0, 0), 15);
  const lv = Math.max(1, parseInt(level, 10) || 1);
  const gMode = gameMode || 'level';
  const domain = NRS.categoryToDomain(category);

  const sessionData = {
    solvedCount,
    totalProblems,
    errorsCount,
    speedBonus,
    comboBonus,
    level: lv,
    usedCalculator: Boolean(usedCalculator),
    gameMode: gMode,
  };

  getRatingRow(userId, 'global', (errG, globalRow) => {
    if (errG) return res.status(500).json({ error: 'Rating fetch failed' });
    getRatingRow(userId, domain, (errD, domainRow) => {
      if (errD) return res.status(500).json({ error: 'Rating fetch failed' });

      const domainResult = NRS.applySessionToRating(domainRow, sessionData);
      const domainExplanation = NRS.buildRatingExplanation(domain, sessionData, domainResult);

      const globalInfluence = NRS.domainInfluenceWeight(domainRow, globalRow);
      const scaledDelta = domainResult.delta * globalInfluence;
      const globalAfter = NRS.applySessionToRating(globalRow, sessionData);
      globalAfter.mu = globalRow.mu + scaledDelta;
      globalAfter.displayRating = Math.max(0, Math.floor(globalAfter.mu - 2 * globalAfter.sigma));
      const globalExplanation = NRS.buildRatingExplanation('global', sessionData, {
        ...globalAfter,
        delta: scaledDelta,
      });

      persistRatingUpdate(userId, domain, domainRow, domainResult, { category, level: lv, gameMode: gMode }, domainExplanation, (errPD) => {
        if (errPD) return res.status(500).json({ error: 'Domain rating save failed' });

        persistRatingUpdate(userId, 'global', globalRow, globalAfter, { category, level: lv, gameMode: gMode }, globalExplanation, (errPG) => {
          if (errPG) return res.status(500).json({ error: 'Global rating save failed' });

          maybeUpdateSeasonPeak(userId, domain, domainResult.displayRating);
          maybeUpdateSeasonPeak(userId, 'global', globalAfter.displayRating);
          nrsUpdateVelocity(userId, domain, domainResult.delta);
          nrsUpdateVelocity(userId, 'global', scaledDelta);

          const excess = domainResult.performanceScore - domainResult.expectedPerformance;
          checkSmurfSignals(userId, excess, domainResult.sessionsCount);
          nrsUpdateTilt(userId, domainResult.performanceScore, sessionData);

          const newRank = NRS.displayRatingToRank(globalAfter.displayRating, globalAfter.sessionsCount);
          db.run('UPDATE users SET elo = ?, competitive_matches = ? WHERE id = ?', [Math.round(globalAfter.mu), globalAfter.sessionsCount, userId]);

          res.json({
            success: true,
            domain: {
              name: domain,
              displayRating: domainResult.displayRating,
              mu: +domainResult.mu.toFixed(1),
              sigma: +domainResult.sigma.toFixed(1),
              delta: +domainResult.delta.toFixed(1),
              performanceScore: +domainResult.performanceScore.toFixed(3),
              explanation: domainExplanation,
            },
            global: {
              displayRating: globalAfter.displayRating,
              mu: +globalAfter.mu.toFixed(1),
              sigma: +globalAfter.sigma.toFixed(1),
              delta: +scaledDelta.toFixed(1),
              rank: newRank,
              explanation: globalExplanation,
            },
          });
        });
      });
    });
  });
});

// ── GET /api/rating/profile ───────────────────────────────────────────────────
router.get('/api/rating/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT r.domain, r.mu, r.sigma, r.display_rating, r.sessions_count, r.last_updated,
            COALESCE(v.velocity, 0) AS velocity,
            COALESCE(t.tilt_score, 0) AS tilt_score,
            COALESCE(t.tilted, 0) AS tilted
     FROM user_ratings r
     LEFT JOIN learning_velocity v ON v.user_id = r.user_id AND v.domain = r.domain
     LEFT JOIN tilt_tracking t ON t.user_id = r.user_id
     WHERE r.user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const profile = {};
      (rows || []).forEach((row) => {
        profile[row.domain] = {
          mu: +row.mu.toFixed(1),
          sigma: +row.sigma.toFixed(1),
          displayRating: row.display_rating,
          rank: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
          sessionsCount: row.sessions_count,
          lastUpdated: row.last_updated,
          velocity: +row.velocity.toFixed(2),
          tiltScore: +row.tilt_score.toFixed(2),
          tilted: !!row.tilted,
        };
      });

      NRS.KNOWN_DOMAINS.forEach((d) => {
        if (!profile[d]) {
          profile[d] = {
            mu: NRS.MU_INIT,
            sigma: NRS.SIGMA_INIT,
            displayRating: 0,
            rank: 'Unranked (Placement: 0/5)',
            sessionsCount: 0,
            lastUpdated: 0,
            velocity: 0,
            tiltScore: 0,
            tilted: false,
          };
        }
      });

      db.get('SELECT id, name, start_at, end_at FROM seasons WHERE is_active = 1 LIMIT 1', (errSe, season) => {
        if (season) {
          db.all('SELECT domain, peak_display FROM season_ratings WHERE user_id = ? AND season_id = ?', [userId, season.id], (errPk, peaks) => {
            const seasonPeaks = {};
            (peaks || []).forEach((p) => {
              seasonPeaks[p.domain] = p.peak_display;
            });
            res.json({ profile, season: { ...season, peaks: seasonPeaks } });
          });
        } else {
          res.json({ profile, season: null });
        }
      });
    }
  );
});

// ── GET /api/rating/history ───────────────────────────────────────────────────
router.get('/api/rating/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const domain = req.query.domain || null;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const where = domain ? 'WHERE user_id = ? AND domain = ?' : 'WHERE user_id = ?';
  const params = domain ? [userId, domain, limit] : [userId, limit];

  db.all(
    `SELECT id, domain, display_before, display_after, delta, performance_score,
            expected_score, explanation, session_category, session_level, game_mode, created_at
     FROM rating_history ${where}
     ORDER BY created_at DESC LIMIT ?`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ── GET /api/rating/leaderboard ───────────────────────────────────────────────
router.get('/api/rating/leaderboard', authenticateToken, (req, res) => {
  const domain = NRS.KNOWN_DOMAINS.includes(req.query.domain) ? req.query.domain : 'global';
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  db.all(
    `SELECT u.username, u.avatar, u.active_badge,
            r.display_rating, r.sessions_count
     FROM user_ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.domain = ? AND r.sessions_count >= 5
     ORDER BY r.display_rating DESC LIMIT ?`,
    [domain, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        (rows || []).map((row, i) => ({
          rank: i + 1,
          username: row.username,
          avatar: row.avatar,
          badge: row.active_badge,
          displayRating: row.display_rating,
          rankName: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
          sessionsCount: row.sessions_count,
        }))
      );
    }
  );
});

// ── GET /api/rating/matchmaking ───────────────────────────────────────────────
router.get('/api/rating/matchmaking', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const domain = NRS.KNOWN_DOMAINS.includes(req.query.domain) ? req.query.domain : 'global';
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  getRatingRow(userId, domain, (errMe, myRow) => {
    if (errMe) return res.status(500).json({ error: 'Rating lookup failed' });

    db.all(
      `SELECT u.id, u.username, u.avatar, r.mu, r.sigma, r.display_rating, r.sessions_count,
              COALESCE(t.tilt_score, 0) AS tilt_score
       FROM user_ratings r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN tilt_tracking t ON t.user_id = r.user_id
       WHERE r.domain = ? AND r.user_id != ? AND r.sessions_count >= 3`,
      [domain, userId],
      (err, candidates) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT tilt_score FROM tilt_tracking WHERE user_id = ?', [userId], (_, tiltRow) => {
          const myTilt = tiltRow ? tiltRow.tilt_score : 0;

          const scored = (candidates || []).map((c) => {
            let quality = NRS.computeMatchQuality(myRow, c);
            if (c.tilt_score > 0.5 && myTilt > 0.5) quality *= 0.6;
            return { ...c, matchQuality: quality };
          });
          scored.sort((a, b) => b.matchQuality - a.matchQuality);

          res.json(
            scored.slice(0, limit).map((c) => ({
              userId: c.id,
              username: c.username,
              avatar: c.avatar,
              displayRating: c.display_rating,
              rankName: NRS.displayRatingToRank(c.display_rating, c.sessions_count),
              matchQuality: +c.matchQuality.toFixed(3),
              sessionsCount: c.sessions_count,
            }))
          );
        });
      }
    );
  });
});

// ── GET /api/rating/season ────────────────────────────────────────────────────
router.get('/api/rating/season', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1', (errSe, season) => {
    if (errSe || !season) return res.json({ season: null });
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.max(0, Math.ceil((season.end_at - now) / 86400));

    db.all(
      `SELECT sr.domain, sr.peak_display, sr.final_display, r.display_rating
       FROM season_ratings sr
       LEFT JOIN user_ratings r ON r.user_id = sr.user_id AND r.domain = sr.domain
       WHERE sr.user_id = ? AND sr.season_id = ?`,
      [userId, season.id],
      (errPk, peaks) => {
        res.json({
          season: { id: season.id, name: season.name, startAt: season.start_at, endAt: season.end_at, daysRemaining },
          myPeaks: (peaks || []).map((p) => ({
            domain: p.domain,
            peakDisplay: p.peak_display,
            finalDisplay: p.final_display,
            currentDisplay: p.display_rating,
          })),
        });
      }
    );
  });
});

// ── POST /api/rating/season/end — admin only ──────────────────────────────────
router.post('/api/rating/season/end', authenticateToken, requireAdmin, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const newSeasonName = req.body.newSeasonName || `Season (${new Date().toLocaleDateString()})`;
  const newDurationDays = Math.min(Math.max(parseInt(req.body.durationDays, 10) || 90, 30), 365);

  db.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1', (errS, oldSeason) => {
    if (errS || !oldSeason) return res.status(400).json({ error: 'No active season found' });

    db.run('UPDATE seasons SET is_active = 0, end_at = ? WHERE id = ?', [now, oldSeason.id], (errEnd) => {
      if (errEnd) return res.status(500).json({ error: errEnd.message });

      const newEnd = now + newDurationDays * 86400;
      db.run('INSERT INTO seasons (name, start_at, end_at, is_active) VALUES (?, ?, ?, 1)', [newSeasonName, now, newEnd], function (errNew) {
        if (errNew) return res.status(500).json({ error: errNew.message });

        db.all('SELECT user_id, domain, mu, sigma FROM user_ratings', (errAll, allRatings) => {
          if (errAll || !allRatings || allRatings.length === 0) {
            return res.json({ success: true, playersReset: 0 });
          }
          let pending = allRatings.length;
          allRatings.forEach((row) => {
            const { mu: newMu, sigma: newSigma } = NRS.applySeasonReset(row.mu, row.sigma);
            const newDisplay = Math.max(0, Math.floor(newMu - 2 * newSigma));
            db.run('UPDATE user_ratings SET mu = ?, sigma = ?, display_rating = ? WHERE user_id = ? AND domain = ?', [newMu, newSigma, newDisplay, row.user_id, row.domain], () => {
              if (--pending === 0) res.json({ success: true, playersReset: allRatings.length });
            });
          });
        });
      });
    });
  });
});

// ── GET /api/rating/analytics — admin only ────────────────────────────────────
router.get('/api/rating/analytics', authenticateToken, requireAdmin, (req, res) => {
  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

  db.all(
    `SELECT domain,
            COUNT(*) AS total_sessions,
            AVG(delta) AS avg_delta,
            AVG(performance_score) AS avg_performance,
            AVG(expected_score) AS avg_expected,
            AVG(ABS(performance_score - expected_score)) AS avg_prediction_error
     FROM rating_history WHERE created_at >= ?
     GROUP BY domain`,
    [since],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get('SELECT COUNT(*) AS n FROM smurf_signals WHERE flagged = 1', (_, sm) => {
        db.get('SELECT COUNT(*) AS n, AVG(tilt_score) AS avg FROM tilt_tracking WHERE tilted = 1', (_, tl) => {
          res.json({
            domainStats: (rows || []).map((r) => ({
              domain: r.domain,
              totalSessions: r.total_sessions,
              avgRatingDelta: +(r.avg_delta || 0).toFixed(2),
              avgPerformance: +(r.avg_performance || 0).toFixed(3),
              avgExpected: +(r.avg_expected || 0).toFixed(3),
              avgPredictionError: +(r.avg_prediction_error || 0).toFixed(3),
              inflationSignal: (r.avg_delta || 0) > 5 ? 'inflation' : (r.avg_delta || 0) < -5 ? 'deflation' : 'stable',
            })),
            integrity: {
              flaggedSmurfAccounts: sm ? sm.n : 0,
              tiltedPlayersNow: tl ? tl.n : 0,
              avgTiltScore: tl ? +(tl.avg || 0).toFixed(3) : 0,
            },
          });
        });
      });
    }
  );
});

// ── GET /api/rating/explanation/:sessionId ────────────────────────────────────
router.get('/api/rating/explanation/:sessionId', authenticateToken, (req, res) => {
  const id = parseInt(req.params.sessionId, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid session ID' });

  db.get('SELECT * FROM rating_history WHERE id = ? AND user_id = ?', [id, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Not found' });
    let components = {};
    try {
      components = JSON.parse(row.components_json);
    } catch (e) {
      components = {};
    }
    res.json({
      domain: row.domain,
      category: row.session_category,
      level: row.session_level,
      gameMode: row.game_mode,
      displayBefore: row.display_before,
      displayAfter: row.display_after,
      delta: +row.delta.toFixed(1),
      performanceScore: +row.performance_score.toFixed(3),
      expectedScore: +row.expected_score.toFixed(3),
      components,
      explanation: row.explanation,
      date: row.created_at,
    });
  });
});

module.exports = router;
