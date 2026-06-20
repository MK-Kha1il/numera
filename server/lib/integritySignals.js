'use strict';
// Competitive-integrity signals (audit #18, §3.9): detect the rating-pump signature shared by
// win-trading and boosting — a player drawing an outsized share of their ranked rating gains from a
// single opponent over many matches, and/or beating one opponent almost every time. Pure + unit-tested
// (CLAUDE.md). This produces a REVIEW signal only — the app's ethic is "flag for a human, never
// silently punish" — so nothing here mutates ratings or bans; it ranks pairs for an admin to inspect.

const MIN_MATCHES = 6;            // need a real sample before a pair is suspicious
const CONCENTRATION_THRESHOLD = 0.6; // ≥60% of a player's positive rating gain from ONE opponent
const LOPSIDED_WINRATE = 0.85;   // beating one opponent ≥85% of the time (boosting signature)

/**
 * Flag suspicious (player → opponent) pairs from match aggregates.
 *
 * @param {Array<{userId:number, opponentId:number, matches:number, posDelta:number, wins:number}>} pairRows
 *   one row per (player, opponent) pair: match count, the player's summed POSITIVE rating delta vs that
 *   opponent, and the player's win count vs them.
 * @param {object} [opts] override thresholds (minMatches, concentrationThreshold, lopsidedWinrate).
 * @returns {Array} flagged pairs, highest score first, each with the reasons it tripped.
 */
function detectRatingPump(pairRows, opts = {}) {
  const minMatches = opts.minMatches || MIN_MATCHES;
  const concThreshold = opts.concentrationThreshold || CONCENTRATION_THRESHOLD;
  const lopsidedWinrate = opts.lopsidedWinrate || LOPSIDED_WINRATE;

  // Each player's total positive ranked rating gain, to measure how concentrated it is.
  const totalPosByUser = {};
  for (const r of pairRows) {
    totalPosByUser[r.userId] = (totalPosByUser[r.userId] || 0) + Math.max(0, r.posDelta || 0);
  }

  const flagged = [];
  for (const r of pairRows) {
    const matches = r.matches || 0;
    if (matches < minMatches) continue;

    const userTotal = totalPosByUser[r.userId] || 0;
    const concentration = userTotal > 0 ? Math.max(0, r.posDelta || 0) / userTotal : 0;
    const winRate = matches ? (r.wins || 0) / matches : 0;
    const concentrated = concentration >= concThreshold;
    const lopsided = winRate >= lopsidedWinrate;
    if (!concentrated && !lopsided) continue;

    const reasons = [];
    if (concentrated) reasons.push('rating_concentration');
    if (lopsided) reasons.push('lopsided_winrate');
    flagged.push({
      userId: r.userId,
      opponentId: r.opponentId,
      matches,
      posDelta: +(Math.max(0, r.posDelta || 0)).toFixed(1),
      concentration: +concentration.toFixed(3),
      winRate: +winRate.toFixed(2),
      reasons,
      // Severity: more matches × how extreme the worst signal is.
      score: +(matches * Math.max(concentrated ? concentration : 0, lopsided ? winRate : 0)).toFixed(2),
    });
  }

  flagged.sort((a, b) => b.score - a.score);
  return flagged;
}

module.exports = { detectRatingPump, MIN_MATCHES, CONCENTRATION_THRESHOLD, LOPSIDED_WINRATE };
