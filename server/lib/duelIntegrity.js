'use strict';
// Pure duel integrity + Elo resolution (see docs/specs/Spec-CompetitionExpansion.md §5).
//
// Extracted from server.js's untested `endDuel` socket code so the cheat-decision is
// unit-testable WITHOUT a live socket. This makes `integrityEngine` the shared scorer that ALL
// competitive modes call before committing rating/rewards (Puzzle Rush already does; live socket
// duels now do too). No DB/IO here — the socket layer accumulates per-answer flags in memory and
// looks up `telemetry_enabled`, then hands plain numbers/flags to `resolveDuel`.
//
// Mirrors the Puzzle Rush pattern: per-answer `assessAnswer` flags accumulate into a
// `verdictForRun`; a 'cheat' verdict (>= cheatThreshold fast-flagged answers) WITHHOLDS the
// rating gain and applies a fixed penalty instead, and forfeits the match to the clean opponent.
const { assessAnswer, verdictForRun } = require('../services/integrityEngine');

const K = 32; // Elo K-factor (matches the historical duel constant).
const CHEAT_ELO_PENALTY = -15; // fixed deduction applied to a 'cheat' verdict (was the ad-hoc -15).

// Per-answer hook the duel socket handler calls instead of reaching into integrityEngine.
// Returns { flagged, reason } — reason is surfaced to the player (spec ethics: no silent bans).
function flagAnswer({ elapsedMs, correct, level } = {}) {
  return assessAnswer({ elapsedMs, correct, level });
}

// Ranked play requires fair-play (behavioral telemetry) consent so the integrity scorer is
// allowed to run — otherwise anti-cheat could be sidestepped just by leaving telemetry off
// (it's opt-in by default). Returns an error object to emit, or null if the player may queue.
// Only RANKED is gated; casual/friend/bot duels don't move rating and stay open.
function rankedMatchmakingError(telemetryEnabled) {
  if (telemetryEnabled === 1 || telemetryEnabled === true) return null;
  return {
    code: 'FAIRPLAY_CONSENT_REQUIRED',
    message: 'Ranked play requires fair-play monitoring. Turn on Telemetry in Privacy settings to compete for rating — your answer timing is checked for cheating (see why any result was flagged; no silent bans).',
  };
}

function expectedScore(rating, oppRating) {
  return 1 / (1 + Math.pow(10, (oppRating - rating) / 400));
}

// Resolve a finished duel into { winner, Elo changes, per-player verdicts }. Pure: all inputs are
// plain values, so every branch is unit-testable. `winner` is 'p1' | 'p2' | null (tie/double-DQ).
//
// telemetry gating: integrity scoring is behavioral profiling, so a player who has opted out of
// telemetry (`pNIntegrityEnabled = false`) is not assessed — their flag count is ignored. This
// honors the spec's privacy note (§5: "honor telemetry_enabled"); the trade-off is that opting
// out also opts out of timing-based enforcement.
function resolveDuel({
  p1Score = 0,
  p2Score = 0,
  p1Rating = 1000,
  p2Rating = 1000,
  p1FlaggedCount = 0,
  p2FlaggedCount = 0,
  p1IntegrityEnabled = true,
  p2IntegrityEnabled = true,
  p2IsBot = false,
  isCasual = false,
  // Total time each player spent answering (ms). Used ONLY to break an equal-score tie — the duel is
  // billed as a race ("fastest correct answers win"), so equal accuracy is decided by who was faster.
  p1TimeMs = null,
  p2TimeMs = null,
} = {}) {
  // Raw outcome by score.
  let winner = null;
  if (p1Score > p2Score) winner = 'p1';
  else if (p2Score > p1Score) winner = 'p2';
  else if (
    p1Score === p2Score && p1Score > 0 &&
    p1TimeMs != null && p2TimeMs != null && p1TimeMs !== p2TimeMs
  ) {
    // Equal correct answers → the faster racer takes it. Without this, the speed-race framing was a
    // lie: every even match drew regardless of who answered quicker. A genuine dead heat (identical
    // time, or nobody scored) still draws.
    winner = p1TimeMs < p2TimeMs ? 'p1' : 'p2';
  }

  // Verdicts. Bots and telemetry-opted-out players are never flagged.
  const p1Effective = p1IntegrityEnabled ? p1FlaggedCount : 0;
  const p2Effective = p2IsBot || !p2IntegrityEnabled ? 0 : p2FlaggedCount;
  const p1Verdict = verdictForRun({ flaggedFastCount: p1Effective });
  const p2Verdict = verdictForRun({ flaggedFastCount: p2Effective });
  const p1Cheated = p1Verdict === 'cheat';
  const p2Cheated = p2Verdict === 'cheat';

  // A cheat verdict forfeits the match to the clean opponent (both DQ'd → no winner).
  if (p1Cheated && p2Cheated) winner = null;
  else if (p1Cheated) winner = 'p2';
  else if (p2Cheated) winner = 'p1';

  let p1EloChange = 0;
  let p2EloChange = 0;

  if (!isCasual) {
    const expP1 = expectedScore(p1Rating, p2Rating);
    const expP2 = expectedScore(p2Rating, p1Rating);

    let actualP1 = 0.5;
    let actualP2 = 0.5;
    if (winner === 'p1') { actualP1 = 1; actualP2 = 0; }
    else if (winner === 'p2') { actualP1 = 0; actualP2 = 1; }

    p1EloChange = Math.round(K * (actualP1 - expP1));
    p2EloChange = p2IsBot ? 0 : Math.round(K * (actualP2 - expP2));

    // Bot matches use fixed deltas (the bot has no real rating to settle).
    if (p2IsBot) {
      if (winner === 'p1') p1EloChange = 15;
      else if (winner === 'p2') p1EloChange = -10;
      else p1EloChange = 0;
    }

    // A cheat verdict withholds the gain and applies a fixed penalty (mirrors PR's reward = 0).
    if (p1Cheated) p1EloChange = CHEAT_ELO_PENALTY;
    if (p2Cheated && !p2IsBot) p2EloChange = CHEAT_ELO_PENALTY;
  }

  return {
    winner,
    p1EloChange,
    p2EloChange,
    p1Verdict,
    p2Verdict,
    p1Cheated,
    p2Cheated,
  };
}

module.exports = { flagAnswer, rankedMatchmakingError, resolveDuel, expectedScore, K, CHEAT_ELO_PENALTY };
