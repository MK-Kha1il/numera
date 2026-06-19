// Competitive match history writer (Phase 2 identity). One best-effort row per competitive result
// from a player's point of view — written by the duel socket (server.js) and the Reasoning Arena
// (routes/reasoningDuel.js). Fire-and-forget: a match record must never block or fail a result.
'use strict';

// `result` is 'win' | 'loss' | 'draw'. `opponentId` is null for a bot / the reasoning benchmark.
function recordMatch(db, { userId, mode, opponentId = null, opponentName = null, myScore = 0, oppScore = 0, result = null, ratingDelta = 0 }) {
  if (!userId || typeof userId !== 'number') return;
  db.run(
    `INSERT INTO match_log (user_id, mode, opponent_id, opponent_name, my_score, opp_score, result, rating_delta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, mode, opponentId, opponentName, myScore, oppScore, result, ratingDelta, Math.floor(Date.now() / 1000)],
    () => {}
  );
}

module.exports = { recordMatch };
