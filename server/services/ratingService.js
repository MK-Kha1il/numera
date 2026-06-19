// Shared NRS persistence + the rating-unification glue (docs/specs/Spec-RatingUnification.md).
//
// These helpers were local to routes/rating.js (the solo-session path). They're extracted here so
// the SOCKET DUEL path (server.js) can write the SAME authoritative store — `user_ratings` — making
// solo sessions and ranked duels move ONE number per domain (CLAUDE.md: DB logic shared by ≥2
// routes → services/). `user_ratings` is the source of truth; the denormalised users.elo /
// competitive_matches / competitive_rank columns are a DERIVED MIRROR written ONLY by
// syncCompetitiveMirror — never independently by feature code (that independent double-write was the
// competitive-audit "smoking gun").
'use strict';

const { db } = require('../db');
const NRS = require('../mathEngine/ratingEngine');

// Fetch a user's (mu, sigma) row for a domain, or a fresh default if they have none yet.
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

// Upsert the new (mu, sigma) and append the transparency row to rating_history. `after` is the
// shape returned by applySessionToRating OR applyDuelOutcomeToRating (same shape by design).
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

// Track this player's best display rating for the active season (per domain).
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

// EMA of rating deltas (learning velocity) for a domain.
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

// THE MIRROR. Recompute the denormalised users.* competitive columns from the authoritative
// `user_ratings` global row. This is the ONLY writer of those columns — call it after any rating
// change. users.rank is intentionally NOT touched (it is the level/progression rank, a different
// concept owned by math/quests/mistakes/onboarding); competitive rank lives in competitive_rank.
function syncCompetitiveMirror(userId, callback) {
  const cb = callback || (() => {});
  db.get('SELECT mu, display_rating, sessions_count FROM user_ratings WHERE user_id = ? AND domain = ?', [userId, 'global'], (err, row) => {
    if (err || !row) return cb(err || null);
    const elo = Math.round(row.mu);
    const matches = row.sessions_count || 0;
    const rank = NRS.displayRatingToRank(row.display_rating, matches);
    db.run('UPDATE users SET elo = ?, competitive_matches = ?, competitive_rank = ? WHERE id = ?', [elo, matches, rank, userId], (e) => cb(e || null));
  });
}

// Apply one head-to-head duel result to a player's GLOBAL rating (Phase 0: global only; per-domain
// attribution is a later item). Persists history, season peak, velocity, then syncs the mirror.
// `outcome` ∈ {1 win, 0.5 draw, 0 loss}. Returns the `after` result so the caller can surface the
// rating delta / new rank in the duel debrief.
function applyDuelResultToRatings({ userId, opponentMu, opponentSigma, outcome, gameMode = 'duel', category = null, level = null }, callback) {
  const cb = callback || (() => {});
  const domain = 'global';
  getRatingRow(userId, domain, (err, before) => {
    if (err) return cb(err);
    const after = NRS.applyDuelOutcomeToRating(before, { outcome, opponentMu, opponentSigma });

    // Rank-up detection for the debrief "you ranked up!" moment (audit Top-25 #7). A promotion is
    // either completing placement, or crossing UP into a new division. No best-of-N promo series —
    // a single result that crosses a boundary is the moment (RL-style soft divisions).
    const previousRank = NRS.displayRatingToRank(before.display_rating, before.sessions_count);
    const newRank = NRS.displayRatingToRank(after.displayRating, after.sessionsCount);
    const placedNow = !newRank.startsWith('Unranked');
    after.previousRank = previousRank;
    after.promoted = placedNow && (
      previousRank.startsWith('Unranked') ||
      (newRank !== previousRank && after.displayRating > before.display_rating)
    );

    const dir = after.delta >= 0 ? 'increased' : 'decreased';
    const mag = Math.abs(Math.round(after.delta));
    const winPct = Math.round(after.expectedPerformance * 100);
    const explanation = `Your Overall Rating ${dir} by ${mag} points from a ranked duel (your win probability was ${winPct}%).`;
    persistRatingUpdate(userId, domain, before, after, { category, level, gameMode }, explanation, (err2) => {
      if (err2) return cb(err2);
      maybeUpdateSeasonPeak(userId, domain, after.displayRating);
      nrsUpdateVelocity(userId, domain, after.delta);
      syncCompetitiveMirror(userId, () => cb(null, after));
    });
  });
}

module.exports = {
  getRatingRow,
  persistRatingUpdate,
  maybeUpdateSeasonPeak,
  nrsUpdateVelocity,
  syncCompetitiveMirror,
  applyDuelResultToRatings,
};
