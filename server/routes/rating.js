// NumeraRating System (NRS) — the competitive rating API: per-session rating updates
// (domain + global with influence weighting), profile/history/leaderboard, skill-based
// matchmaking, seasons, admin analytics, and per-session explanations. The internal helpers
// are NRS-specific and live here with the routes; the math lives in mathEngine/ratingEngine.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const NRS = require('../mathEngine/ratingEngine');
const { TITLE_CATALOG, isTitleEarned } = require('../lib/titles');
const { detectRatingPump } = require('../lib/integritySignals');
const { notify } = require('../services/notificationService');
const { withTransaction } = require('../dbx');
// Shared NRS persistence + the users.* mirror (also used by the socket duel path) — see
// services/ratingService.js and docs/specs/Spec-RatingUnification.md.
const {
  getRatingRow,
  persistRatingUpdate,
  maybeUpdateSeasonPeak,
  nrsUpdateVelocity,
  syncCompetitiveMirror,
} = require('../services/ratingService');

const router = express.Router();

// End-of-season coin prizes for the top finishers (by season peak rating).
const SEASON_REWARDS = [500, 300, 150];
const SEASON_DEFAULT_DAYS = 90;

// Seasonal Rank Reward track: per metal tier (Bronze..Grandmaster, indices 0..6 matching
// NRS.RANK_TIERS), the reward claimable once you REACH that tier during a season. Tokens are the
// prestige currency (season_tokens, spent on token-only cosmetics); coins are a bonus. (Audit #4.)
const TIER_REWARDS = [
  { tokens: 1, coins: 50 },    // Bronze
  { tokens: 2, coins: 75 },    // Silver
  { tokens: 3, coins: 100 },   // Gold
  { tokens: 5, coins: 150 },   // Platinum
  { tokens: 8, coins: 250 },   // Diamond
  { tokens: 12, coins: 400 },  // Master
  { tokens: 20, coins: 600 },  // Grandmaster
];
// Season-reward cosmetic (competitive audit #14): reaching Diamond on the season track grants a
// season-exclusive, earn-only banner — tied to the season's slot so it rotates and is scarce. Must
// match the catalog ids + season_slot in db.js and the SEASON_SLOTS used by the shop.
const SEASON_SLOTS = 3;
const DIAMOND_TIER_INDEX = NRS.RANK_TIERS.indexOf('Diamond'); // 4
const SEASON_REWARD_BANNERS = ['banner_champion_aureate', 'banner_champion_verdant', 'banner_champion_crimson'];
const seasonRewardBanner = (seasonId) => SEASON_REWARD_BANNERS[seasonId % SEASON_SLOTS];

const nextSeasonName = () => `New Season (${new Date().toISOString().slice(0, 10)})`;

// ── Season rollover (shared by the admin endpoint and the lazy auto-rollover) ──
// Reward the top finishers (idempotent via rewards_finalized), soft-reset every rating, close the
// old season, and open the next. Runs inside one transaction. Returns the new season + the list of
// rewarded winners (notified by the caller AFTER commit).
async function rolloverSeason(tx, oldSeason, { name, durationDays }) {
  const now = Math.floor(Date.now() / 1000);
  const winners = [];

  if (!oldSeason.rewards_finalized) {
    // A player's "season score" is their best peak across domains.
    const top = await tx.all(
      `SELECT user_id, MAX(peak_display) AS peak
         FROM season_ratings WHERE season_id = ?
        GROUP BY user_id ORDER BY peak DESC LIMIT ?`,
      [oldSeason.id, SEASON_REWARDS.length]
    );
    for (let i = 0; i < top.length; i++) {
      const reward = SEASON_REWARDS[i];
      await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, top[i].user_id]);
      winners.push({ userId: top[i].user_id, reward, position: i + 1, seasonName: oldSeason.name });
    }

    // Mint each placed player's season-peak badge ("Act Rank" — a permanent record of the highest
    // rank they reached this season). The peak is their best across domains; the global session count
    // gates it (a peak only becomes a badge once they were actually placed, ≥5 rated). Idempotent via
    // PK(user_id, season_id) + the rewards_finalized guard. (Competitive audit Top-25 #5.)
    const peaks = await tx.all(
      `SELECT sr.user_id AS user_id, MAX(sr.peak_display) AS peak,
              MAX(COALESCE(ug.sessions_count, 0)) AS sessions
         FROM season_ratings sr
         LEFT JOIN user_ratings ug ON ug.user_id = sr.user_id AND ug.domain = 'global'
        WHERE sr.season_id = ?
        GROUP BY sr.user_id`,
      [oldSeason.id]
    );
    for (const p of peaks) {
      const peakRank = NRS.displayRatingToRank(p.peak, p.sessions);
      if (peakRank.startsWith('Unranked')) continue; // never placed → no badge
      await tx.run(
        `INSERT OR IGNORE INTO season_awards (user_id, season_id, season_name, peak_display, peak_rank, awarded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [p.user_id, oldSeason.id, oldSeason.name, p.peak, peakRank, now]
      );
    }

    await tx.run('UPDATE seasons SET rewards_finalized = 1 WHERE id = ?', [oldSeason.id]);
  }

  await tx.run('UPDATE seasons SET is_active = 0, end_at = ? WHERE id = ?', [now, oldSeason.id]);

  // Soft-reset every rating toward the mean (same regression the admin path applied).
  const ratings = await tx.all('SELECT user_id, domain, mu, sigma FROM user_ratings', []);
  for (const r of ratings) {
    const { mu, sigma } = NRS.applySeasonReset(r.mu, r.sigma);
    const display = Math.max(0, Math.floor(mu - 2 * sigma));
    await tx.run('UPDATE user_ratings SET mu = ?, sigma = ?, display_rating = ? WHERE user_id = ? AND domain = ?', [mu, sigma, display, r.user_id, r.domain]);
  }

  const ins = await tx.run(
    'INSERT INTO seasons (name, start_at, end_at, is_active, rewards_finalized) VALUES (?, ?, ?, 1, 0)',
    [name, now, now + durationDays * 86400]
  );
  const next = await tx.get('SELECT * FROM seasons WHERE id = ?', [ins.lastID]);
  return { next, winners, playersReset: ratings.length };
}

// Ensure there's a current active season, auto-rolling over an expired one (rewards + reset + new).
async function ensureSeason(tx) {
  const now = Math.floor(Date.now() / 1000);
  let active = await tx.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1');
  let winners = [];
  if (active && active.end_at <= now) {
    const r = await rolloverSeason(tx, active, { name: nextSeasonName(), durationDays: SEASON_DEFAULT_DAYS });
    active = r.next;
    winners = r.winners;
  } else if (!active) {
    const ins = await tx.run(
      'INSERT INTO seasons (name, start_at, end_at, is_active, rewards_finalized) VALUES (?, ?, ?, 1, 0)',
      [nextSeasonName(), now, now + SEASON_DEFAULT_DAYS * 86400]
    );
    active = await tx.get('SELECT * FROM seasons WHERE id = ?', [ins.lastID]);
  }
  return { season: active, winners };
}

// Fire the post-commit "you placed in the season" notifications for a winners list.
function notifySeasonWinners(winners) {
  for (const w of winners) {
    notify(w.userId, {
      category: 'season_result',
      title: '🏅 Season Result',
      message: `You finished #${w.position} in ${w.seasonName} and earned ${w.reward} coins!`,
      type: 'social',
      dedupKey: `season:${w.seasonName}:${w.userId}`,
    });
  }
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
      notify(userId, {
        category: 'tilt',
        title: 'Take a Break 🧘',
        message: "You've had a tough session run. Taking a short break often improves performance. Your matchmaking will be adjusted to find you better-suited opponents.",
        type: 'system',
      });
    }
  });
}

// ── POST /api/rating/session ──────────────────────────────────────────────────
router.post('/api/rating/session', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { category, level, usedCalculator, gameMode } = req.body;
  let { solvedCount, totalProblems, errorsCount, speedBonus, comboBonus } = req.body;

  // Bound every client-supplied metric (the solo path is the last place the client asserts its own
  // performance — duels are server-graded). Beyond bounds, enforce INTERNAL CONSISTENCY so a cheater
  // can't claim an impossible/maximal session to pump the unified rating (audit #29/#95 / Top-25 #8).
  totalProblems = Math.min(Math.max(parseInt(totalProblems, 10) || 3, 1), 20);
  solvedCount = Math.min(Math.max(parseInt(solvedCount, 10) || 0, 0), 20);
  solvedCount = Math.min(solvedCount, totalProblems); // can't solve more than you attempted
  errorsCount = Math.min(Math.max(parseInt(errorsCount, 10) || 0, 0), 20);
  speedBonus = Math.min(Math.max(parseInt(speedBonus, 10) || 0, 0), 20);
  comboBonus = Math.min(Math.max(parseInt(comboBonus, 10) || 0, 0), 15);
  // The perfect-combo bonus is only legitimate on a flawless full run (no errors, everything solved);
  // otherwise it's a spoofed value and is dropped — speed/combo can't outrank an honest careful solver.
  const perfectRun = errorsCount === 0 && solvedCount > 0 && solvedCount === totalProblems;
  if (!perfectRun) comboBonus = 0;
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
          // The users.elo / competitive_matches / competitive_rank columns are now a DERIVED MIRROR of
          // the just-persisted global rating — written ONLY here (and by the duel path) via the shared
          // helper, never independently. (Was the ad-hoc `SET elo = round(mu)` that collided with the
          // duel writer — see docs/specs/Spec-RatingUnification.md.)
          syncCompetitiveMirror(userId);

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
        const prog = NRS.rankProgress(row.display_rating, row.sessions_count);
        profile[row.domain] = {
          mu: +row.mu.toFixed(1),
          sigma: +row.sigma.toFixed(1),
          displayRating: row.display_rating,
          rank: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
          // Provisional `?` while σ is still wide — the rating isn't calibrated yet (audit opp #9).
          provisional: NRS.isProvisional(row.sigma),
          // Divisions/pips (audit Top-25 #7): where the player sits within their division.
          progress: +prog.progress.toFixed(3),
          pointsToNext: prog.pointsToNext,
          nextRank: prog.nextRank,
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
            provisional: true,
            progress: 0,
            pointsToNext: null,
            nextRank: null,
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
    `SELECT id, domain,
            display_before   AS displayBefore,
            display_after    AS displayAfter,
            delta,
            performance_score AS performanceScore,
            expected_score    AS expectedScore,
            explanation,
            session_category  AS sessionCategory,
            session_level     AS sessionLevel,
            game_mode         AS gameMode,
            created_at        AS createdAt
     FROM rating_history ${where}
     ORDER BY created_at DESC LIMIT ?`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ── GET /api/rating/matches ───────────────────────────────────────────────────
// Competitive match history (Phase 2 identity): the caller's recent rated results — opponent,
// scoreline, win/loss, rating delta — newest first. Optionally filtered to one opponent (head-to-head).
router.get('/api/rating/matches', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  const vs = req.query.vs ? parseInt(req.query.vs, 10) : null;

  const where = vs ? 'WHERE user_id = ? AND opponent_id = ?' : 'WHERE user_id = ?';
  const params = vs ? [userId, vs, limit] : [userId, limit];

  db.all(
    `SELECT id, mode, opponent_id AS opponentId, opponent_name AS opponentName,
            my_score AS myScore, opp_score AS oppScore, result,
            rating_delta AS ratingDelta, ref_id AS refId, created_at AS createdAt,
            EXISTS(SELECT 1 FROM commendations c WHERE c.from_user = match_log.user_id AND c.match_id = match_log.id) AS commended
       FROM match_log ${where}
      ORDER BY created_at DESC, id DESC LIMIT ?`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      // `commendable` = a real human opponent you haven't yet commended (audit #24 honor system).
      res.json((rows || []).map((r) => ({ ...r, commended: !!r.commended, commendable: !!r.opponentId && !r.commended })));
    }
  );
});

// ── Honor / commendation system (competitive audit #24) ───────────────────────
const COMMEND_TYPES = ['good_game', 'tough_opponent', 'good_sport'];
const HONOR_THRESHOLDS = [3, 10, 25, 60, 120]; // total commendations → honor level (count passed)
const honorLevel = (total) => HONOR_THRESHOLDS.filter((t) => total >= t).length;

// Commend the opponent from one of your matches. One commendation per match (UNIQUE), only matches
// with a real human opponent. Peer recognition — never punitive (the "reward the good" ethic).
router.post('/api/rating/commend', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const matchId = parseInt(req.body && req.body.matchId, 10);
  const type = req.body && req.body.type;
  if (!matchId) return res.status(400).json({ error: 'matchId is required' });
  if (!COMMEND_TYPES.includes(type)) return res.status(400).json({ error: 'invalid commendation type' });

  db.get('SELECT opponent_id FROM match_log WHERE id = ? AND user_id = ?', [matchId, userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'match not found' });
    if (!row.opponent_id) return res.status(400).json({ error: 'no human opponent to commend' });
    if (row.opponent_id === userId) return res.status(400).json({ error: 'cannot commend yourself' });

    db.run(
      `INSERT INTO commendations (from_user, to_user, match_id, type, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(from_user, match_id) DO NOTHING`,
      [userId, row.opponent_id, matchId, type, Math.floor(Date.now() / 1000)],
      function (e) {
        if (e) return res.status(500).json({ error: e.message });
        res.json({ success: true, commended: true, alreadyCommended: this.changes === 0, toUserId: row.opponent_id });
      }
    );
  });
});

// Competitive onboarding (audit #20): mark that the player has seen their placement rank-reveal
// ceremony, so it fires exactly once. Only meaningful once they're placed (≥5 rated games).
router.post('/api/rating/reveal-seen', authenticateToken, (req, res) => {
  db.run('UPDATE users SET rank_revealed = 1 WHERE id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// The caller's received honor: total commendations + derived level + breakdown by type.
router.get('/api/rating/honor', authenticateToken, (req, res) => {
  db.all(
    'SELECT type, COUNT(*) AS n FROM commendations WHERE to_user = ? GROUP BY type',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const byType = {};
      let total = 0;
      (rows || []).forEach((r) => { byType[r.type] = r.n; total += r.n; });
      res.json({ total, level: honorLevel(total), byType });
    }
  );
});

// ── GET /api/rating/share-card ────────────────────────────────────────────────
// A composed, shareable boast about the player's competitive standing (audit #22 — the viral loop /
// reach gap). Server-built so the copy is consistent and the rank can't be spoofed by the client.
// Returns a ready-to-share `text` + the structured bits so the client can render a card too.
const APP_TAGLINE = 'the ranked math ladder where understanding wins, not speed';
router.get('/api/rating/share-card', authenticateToken, (req, res) => {
  getRatingRow(req.user.id, 'global', (err, row) => {
    if (err) return res.status(500).json({ error: 'Rating lookup failed' });
    const placed = (row.sessions_count || 0) >= 5;
    const rank = NRS.displayRatingToRank(row.display_rating, row.sessions_count);
    db.get('SELECT active_title, username FROM users WHERE id = ?', [req.user.id], (e2, u) => {
      const titleId = u && u.active_title;
      const title = titleId ? TITLE_CATALOG.find((t) => t.id === titleId) : null;
      const titleStr = title ? ` "${title.name}"` : '';
      // Link to the public web profile when a base URL is configured (completes the viral loop into
      // the SEO profile page, audit #75). Omitted when unconfigured (dev) so the text stays clean.
      const base = require('../config').APP_BASE_URL;
      const profileUrl = base && u && u.username ? `${base.replace(/\/$/, '')}/u/${encodeURIComponent(u.username)}` : null;
      const urlSuffix = profileUrl ? ` ${profileUrl}` : '';
      const text = (placed
        ? `🧠 I'm ${rank} (${row.display_rating})${titleStr} on Numera — ${APP_TAGLINE}. Think you can climb higher?`
        : `🧠 I'm climbing the ranked ladder on Numera — ${APP_TAGLINE}. Come compete with me!`) + urlSuffix;
      res.json({
        text,
        placed,
        rank: placed ? rank : null,
        displayRating: placed ? row.display_rating : null,
        title: title ? title.name : null,
        profileUrl,
      });
    });
  });
});

// ── GET /api/rating/rivals ────────────────────────────────────────────────────
// Head-to-head records (Phase 2 identity, audit #71): the caller's win/loss/draw tally against each
// human opponent they've faced, most-played first. Only real opponents (bots/benchmark excluded).
router.get('/api/rating/rivals', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
  db.all(
    `SELECT m.opponent_id AS opponentId, u.username AS opponentName, u.avatar AS opponentAvatar,
            SUM(CASE WHEN m.result = 'win'  THEN 1 ELSE 0 END) AS wins,
            SUM(CASE WHEN m.result = 'loss' THEN 1 ELSE 0 END) AS losses,
            SUM(CASE WHEN m.result = 'draw' THEN 1 ELSE 0 END) AS draws,
            COUNT(*) AS total,
            MAX(m.created_at) AS lastPlayed
       FROM match_log m JOIN users u ON u.id = m.opponent_id
      WHERE m.user_id = ? AND m.opponent_id IS NOT NULL
      GROUP BY m.opponent_id
      ORDER BY total DESC, lastPlayed DESC
      LIMIT ?`,
    [userId, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ── Competitive titles (earned identity) ──────────────────────────────────────
// The earned SET is derived on the fly from existing data; only the chosen title is stored
// (users.active_title). Catalog + earn rules live in lib/titles.js (shared with publicProfile).

// Gather the stats the title conditions need (rank/peak, duel & reasoning counts, best head-to-head).
function computeTitleStats(userId, cb) {
  db.get('SELECT competitive_matches, competitive_rank, active_title FROM users WHERE id = ?', [userId], (e, u) => {
    db.get(
      "SELECT SUM(CASE WHEN mode = 'duel' THEN 1 ELSE 0 END) AS duels, SUM(CASE WHEN mode = 'reasoning' THEN 1 ELSE 0 END) AS reasoning FROM match_log WHERE user_id = ?",
      [userId],
      (e2, mc) => {
        db.get(
          "SELECT MAX(w) AS maxW FROM (SELECT SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS w FROM match_log WHERE user_id = ? AND opponent_id IS NOT NULL GROUP BY opponent_id)",
          [userId],
          (e3, h2h) => {
            db.all('SELECT peak_rank FROM season_awards WHERE user_id = ?', [userId], (e4, awards) => {
              let peakTier = NRS.rankToTierIndex(u ? u.competitive_rank : '');
              for (const a of awards || []) peakTier = Math.max(peakTier, NRS.rankToTierIndex(a.peak_rank));
              cb({
                activeTitle: (u && u.active_title) || '',
                placed: !!(u && u.competitive_matches >= 5),
                duels: (mc && mc.duels) || 0,
                reasoning: (mc && mc.reasoning) || 0,
                peakTier,
                maxH2HWins: (h2h && h2h.maxW) || 0,
              });
            });
          }
        );
      }
    );
  });
}

router.get('/api/rating/titles', authenticateToken, (req, res) => {
  computeTitleStats(req.user.id, (s) => {
    res.json({
      active: s.activeTitle,
      titles: TITLE_CATALOG.map((t) => ({ id: t.id, name: t.name, desc: t.desc, earned: isTitleEarned(t.id, s), active: t.id === s.activeTitle })),
    });
  });
});

router.post('/api/rating/titles/select', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const title = String((req.body && req.body.title) || '');
  if (title === '') {
    db.run("UPDATE users SET active_title = '' WHERE id = ?", [userId], () => res.json({ success: true, active: '' }));
    return;
  }
  if (!TITLE_CATALOG.find((t) => t.id === title)) return res.status(400).json({ error: 'Unknown title' });
  computeTitleStats(userId, (s) => {
    if (!isTitleEarned(title, s)) return res.status(400).json({ error: "You haven't earned that title yet" });
    db.run('UPDATE users SET active_title = ? WHERE id = ?', [title, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, active: title });
    });
  });
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

// ── GET /api/rating/apex ──────────────────────────────────────────────────────
// The apex tier (competitive audit #23): a leaderboard-only standing ABOVE the rank thresholds, in
// the spirit of LoL Challenger / VALORANT Radiant. Eligibility = placed (≥5 rated) AND at least Master
// tier; the apex is the top `limit` of those by global display rating. Returns the leaders + the
// requester's own standing (null unless they're inside the apex). Empty until someone reaches Master —
// it is aspirational by design.
const APEX_MIN_TIER = NRS.RANK_TIERS.indexOf('Master'); // 5 — Master & Grandmaster qualify
router.get('/api/rating/apex', authenticateToken, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
  db.all(
    `SELECT u.id, u.username, u.avatar, r.display_rating, r.sessions_count
     FROM user_ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.domain = 'global' AND r.sessions_count >= 5
     ORDER BY r.display_rating DESC, r.sessions_count DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const eligible = (rows || []).filter(
        (row) => NRS.rankToTierIndex(NRS.displayRatingToRank(row.display_rating, row.sessions_count)) >= APEX_MIN_TIER
      );
      const leaders = eligible.slice(0, limit).map((row, i) => ({
        position: i + 1,
        userId: row.id,
        username: row.username,
        avatar: row.avatar,
        displayRating: row.display_rating,
        rank: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
      }));
      const meIdx = leaders.findIndex((l) => l.userId === req.user.id);
      res.json({
        size: leaders.length,
        cutoffRating: leaders.length ? leaders[leaders.length - 1].displayRating : null,
        leaders,
        you: meIdx >= 0 ? { position: meIdx + 1, displayRating: leaders[meIdx].displayRating } : null,
      });
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
// The current season + the caller's peaks. Lazily auto-rolls over an expired season (paying its
// top finishers and opening the next), so seasons keep cycling without an admin or a cron.
router.get('/api/rating/season', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const { season, winners } = await withTransaction((tx) => ensureSeason(tx));
    notifySeasonWinners(winners);
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.max(0, Math.ceil((season.end_at - now) / 86400));

    db.all(
      `SELECT sr.domain, sr.peak_display, sr.final_display, r.display_rating
       FROM season_ratings sr
       LEFT JOIN user_ratings r ON r.user_id = sr.user_id AND r.domain = sr.domain
       WHERE sr.user_id = ? AND sr.season_id = ?`,
      [userId, season.id],
      (errPk, peaks) => {
        if (errPk) return res.status(500).json({ error: errPk.message });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/rating/season/leaderboard ────────────────────────────────────────
// This season's standings: players ranked by their best peak rating, plus the caller's own rank.
router.get('/api/rating/season/leaderboard', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const { season } = await withTransaction((tx) => ensureSeason(tx));
    db.all(
      `SELECT u.username, sr.user_id AS userId, MAX(sr.peak_display) AS peak
         FROM season_ratings sr JOIN users u ON u.id = sr.user_id
        WHERE sr.season_id = ?
        GROUP BY sr.user_id
        ORDER BY peak DESC
        LIMIT 50`,
      [season.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const board = (rows || []).map((r, i) => ({ position: i + 1, username: r.username, userId: r.userId, peak: r.peak, isMe: r.userId === userId }));
        const mine = board.find((b) => b.isMe);
        res.json({
          season: { id: season.id, name: season.name, endAt: season.end_at },
          leaderboard: board,
          yourRank: mine ? mine.position : null,
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/rating/season-history ────────────────────────────────────────────
// The caller's permanent season-peak badges (Act Rank): the highest rank they reached in each ended
// season, newest first. Forward-looking identity — empty until the player's first season ends.
router.get('/api/rating/season-history', authenticateToken, (req, res) => {
  db.all(
    `SELECT season_id AS seasonId, season_name AS seasonName, peak_display AS peakDisplay,
            peak_rank AS peakRank, awarded_at AS awardedAt
       FROM season_awards WHERE user_id = ?
      ORDER BY awarded_at DESC, season_id DESC LIMIT 50`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ awards: rows || [] });
    }
  );
});

// ── GET /api/rating/reward-track ──────────────────────────────────────────────
// The seasonal Rank Reward track: for the active season, each metal tier with whether the caller has
// REACHED it (by season peak) and whether they've CLAIMED its reward. Lazily ensures a season exists.
router.get('/api/rating/reward-track', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const { season, winners } = await withTransaction((tx) => ensureSeason(tx));
    notifySeasonWinners(winners);
    db.get('SELECT MAX(peak_display) AS peak FROM season_ratings WHERE user_id = ? AND season_id = ?', [userId, season.id], (e1, pk) => {
      if (e1) return res.status(500).json({ error: e1.message });
      db.get("SELECT sessions_count FROM user_ratings WHERE user_id = ? AND domain = 'global'", [userId], (e2, ses) => {
        if (e2) return res.status(500).json({ error: e2.message });
        const peak = (pk && pk.peak) || 0;
        const sessions = (ses && ses.sessions_count) || 0;
        const peakRank = NRS.displayRatingToRank(peak, sessions);
        const peakTier = NRS.rankToTierIndex(peakRank);
        db.all('SELECT tier_index FROM season_reward_claims WHERE user_id = ? AND season_id = ?', [userId, season.id], (e3, claims) => {
          if (e3) return res.status(500).json({ error: e3.message });
          const claimed = new Set((claims || []).map((c) => c.tier_index));
          const now = Math.floor(Date.now() / 1000);
          res.json({
            season: { id: season.id, name: season.name, endAt: season.end_at, daysRemaining: Math.max(0, Math.ceil((season.end_at - now) / 86400)) },
            peakRank,
            peakTier,
            tiers: NRS.RANK_TIERS.map((tierName, i) => ({
              tierIndex: i,
              tierName,
              tokens: TIER_REWARDS[i].tokens,
              coins: TIER_REWARDS[i].coins,
              // The Diamond tier also yields this season's earn-only exclusive Champion banner (#14).
              cosmetic: i === DIAMOND_TIER_INDEX ? seasonRewardBanner(season.id) : null,
              reached: i <= peakTier,
              claimed: claimed.has(i),
            })),
          });
        });
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/rating/reward-track/claim ───────────────────────────────────────
// Claim one tier's seasonal reward (season_tokens + coins). Validated server-side against the season
// PEAK so a later derank never blocks a reward already earned; idempotent via the claim ledger.
router.post('/api/rating/reward-track/claim', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const tier = parseInt(req.body && req.body.tier, 10);
  if (!Number.isInteger(tier) || tier < 0 || tier >= NRS.RANK_TIERS.length) {
    return res.status(400).json({ error: 'Invalid tier' });
  }
  withTransaction(async (tx) => {
    const season = await tx.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1');
    if (!season) { const e = new Error('No active season'); e.status = 400; throw e; }
    const pk = await tx.get('SELECT MAX(peak_display) AS peak FROM season_ratings WHERE user_id = ? AND season_id = ?', [userId, season.id]);
    const ses = await tx.get("SELECT sessions_count FROM user_ratings WHERE user_id = ? AND domain = 'global'", [userId]);
    const peak = (pk && pk.peak) || 0;
    const sessions = (ses && ses.sessions_count) || 0;
    const peakTier = NRS.rankToTierIndex(NRS.displayRatingToRank(peak, sessions));
    if (tier > peakTier) { const e = new Error("You haven't reached this tier this season yet"); e.status = 400; throw e; }
    const existing = await tx.get('SELECT 1 FROM season_reward_claims WHERE user_id = ? AND season_id = ? AND tier_index = ?', [userId, season.id, tier]);
    if (existing) { const e = new Error('Reward already claimed'); e.status = 400; throw e; }
    const reward = TIER_REWARDS[tier];
    await tx.run('INSERT INTO season_reward_claims (user_id, season_id, tier_index, claimed_at) VALUES (?, ?, ?, ?)', [userId, season.id, tier, Math.floor(Date.now() / 1000)]);
    await tx.run('UPDATE users SET season_tokens = season_tokens + ?, coins = coins + ? WHERE id = ?', [reward.tokens, reward.coins, userId]);

    // Reaching the Diamond tier this season also grants the season-exclusive Champion banner — an
    // earned (never bought), season-scoped cosmetic trophy (audit #14). Idempotent (the per-tier claim
    // ledger above already gates this), and OR IGNORE guards a re-grant if they own it.
    let cosmeticAwarded = null;
    if (tier >= DIAMOND_TIER_INDEX) {
      const banner = seasonRewardBanner(season.id);
      await tx.run('INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)', [userId, banner]);
      cosmeticAwarded = banner;
    }

    const u = await tx.get('SELECT season_tokens, coins FROM users WHERE id = ?', [userId]);
    return { tier, tierName: NRS.RANK_TIERS[tier], tokensAwarded: reward.tokens, coinsAwarded: reward.coins, cosmeticAwarded, seasonTokens: u.season_tokens, coins: u.coins };
  })
    .then((r) => res.json({ success: true, ...r }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// ── POST /api/rating/season/end — admin only ──────────────────────────────────
// Force the current season to close NOW. Shares rolloverSeason with the lazy auto-rollover, so the
// admin path also pays the top finishers and soft-resets ratings before opening the next season.
router.post('/api/rating/season/end', authenticateToken, requireAdmin, (req, res) => {
  const newSeasonName = req.body.newSeasonName || nextSeasonName();
  const durationDays = Math.min(Math.max(parseInt(req.body.durationDays, 10) || SEASON_DEFAULT_DAYS, 30), 365);

  withTransaction(async (tx) => {
    const oldSeason = await tx.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1');
    if (!oldSeason) throw new Error('No active season found');
    return rolloverSeason(tx, oldSeason, { name: newSeasonName, durationDays });
  })
    .then((result) => {
      notifySeasonWinners(result.winners);
      res.json({ success: true, playersReset: result.playersReset, rewarded: result.winners.length, season: { id: result.next.id, name: result.next.name } });
    })
    .catch((err) => res.status(err.message === 'No active season found' ? 400 : 500).json({ error: err.message }));
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

// ── GET /api/rating/admin/collusion ───────────────────────────────────────────
// Competitive-integrity review queue (audit #18): surfaces (player → opponent) pairs whose ranked
// rating gains look pumped — most of a player's gains from one opponent over many duels, and/or an
// ~always-win record vs them (win-trading / boosting signature). REVIEW ONLY — no auto-action, fitting
// the "flag for a human, never silently punish" ethic. Admin-gated + read-only.
router.get('/api/rating/admin/collusion', authenticateToken, requireAdmin, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const minMatches = Math.max(2, parseInt(req.query.minMatches, 10) || 6);

  db.all(
    `SELECT user_id AS userId, opponent_id AS opponentId,
            COUNT(*) AS matches,
            SUM(CASE WHEN rating_delta > 0 THEN rating_delta ELSE 0 END) AS posDelta,
            SUM(CASE WHEN result = 'win' THEN 1 ELSE 0 END) AS wins
       FROM match_log
      WHERE opponent_id IS NOT NULL AND mode = 'duel'
      GROUP BY user_id, opponent_id
     HAVING matches >= ?`,
    [minMatches],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const flagged = detectRatingPump(rows || [], { minMatches }).slice(0, limit);
      if (flagged.length === 0) return res.json({ flagged: [] });

      // Attach usernames for the flagged ids (one lookup).
      const ids = [...new Set(flagged.flatMap((f) => [f.userId, f.opponentId]))];
      db.all(`SELECT id, username FROM users WHERE id IN (${ids.map(() => '?').join(',')})`, ids, (e2, users) => {
        const nameOf = {};
        (users || []).forEach((u) => { nameOf[u.id] = u.username; });
        res.json({
          flagged: flagged.map((f) => ({ ...f, username: nameOf[f.userId] || null, opponentName: nameOf[f.opponentId] || null })),
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
