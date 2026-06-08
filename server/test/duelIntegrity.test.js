// Pure unit tests for the extracted duel cheat-decision (lib/duelIntegrity.resolveDuel) — the
// safety net for wiring integrityEngine into the untested live-duel socket code. Env-independent:
// flag COUNTS are passed directly so verdicts don't depend on PUZZLE_RUSH_SUPERHUMAN_MS.
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveDuel, flagAnswer, rankedMatchmakingError, CHEAT_ELO_PENALTY } = require('../lib/duelIntegrity');

const cfg = { superhumanBaseMs: 400, perLevelMs: 25, cheatThreshold: 3 };

test('flagAnswer delegates to integrityEngine.assessAnswer (fast correct only)', () => {
  assert.equal(flagAnswer({ elapsedMs: 50, correct: true, level: 0 }).flagged, true);
  assert.equal(flagAnswer({ elapsedMs: 50, correct: false, level: 0 }).flagged, false, 'fast wrong = misclick');
  assert.equal(flagAnswer({ elapsedMs: 5000, correct: true, level: 0 }).flagged, false, 'human-paced');
});

test('clean ranked duel: higher score wins, Elo settles symmetrically', () => {
  const r = resolveDuel({ p1Score: 100, p2Score: 60, p1Rating: 1000, p2Rating: 1000 });
  assert.equal(r.winner, 'p1');
  assert.equal(r.p1Verdict, 'clean');
  assert.equal(r.p2Verdict, 'clean');
  assert.equal(r.p1EloChange, 16, 'even ratings, K=32 → +16 for the winner');
  assert.equal(r.p2EloChange, -16);
});

test('casual duel never moves Elo', () => {
  const r = resolveDuel({ p1Score: 100, p2Score: 60, isCasual: true });
  assert.equal(r.winner, 'p1');
  assert.equal(r.p1EloChange, 0);
  assert.equal(r.p2EloChange, 0);
});

test('a cheat verdict (>=3 flags) forfeits to the clean opponent and applies the fixed penalty', () => {
  // p1 outscored p2 but is flagged as a cheat → p2 wins by default, p1 is penalized.
  const r = resolveDuel({
    p1Score: 100, p2Score: 60,
    p1Rating: 1000, p2Rating: 1000,
    p1FlaggedCount: 3,
  });
  assert.equal(r.p1Cheated, true);
  assert.equal(r.p1Verdict, 'cheat');
  assert.equal(r.winner, 'p2', 'cheater forfeits to the clean opponent');
  assert.equal(r.p1EloChange, CHEAT_ELO_PENALTY, 'cheat withholds the gain, applies -15');
  assert.ok(r.p2EloChange > 0, 'clean opponent still gains for the win');
});

test('one or two flags is a review (benefit of the doubt), not a cheat — rating unaffected', () => {
  const r = resolveDuel({ p1Score: 100, p2Score: 60, p1FlaggedCount: 2 });
  assert.equal(r.p1Verdict, 'review');
  assert.equal(r.p1Cheated, false);
  assert.equal(r.winner, 'p1', 'review still counts the win');
  assert.equal(r.p1EloChange, 16);
});

test('both players cheat → no winner, both penalized', () => {
  const r = resolveDuel({ p1Score: 100, p2Score: 60, p1FlaggedCount: 3, p2FlaggedCount: 4 });
  assert.equal(r.winner, null);
  assert.equal(r.p1EloChange, CHEAT_ELO_PENALTY);
  assert.equal(r.p2EloChange, CHEAT_ELO_PENALTY);
});

test('telemetry opt-out is not assessed: flags are ignored (spec §5 privacy)', () => {
  const r = resolveDuel({
    p1Score: 100, p2Score: 60,
    p1FlaggedCount: 9, // would be a cheat verdict if assessed
    p1IntegrityEnabled: false,
  });
  assert.equal(r.p1Verdict, 'clean', 'opted-out player is not behaviorally profiled');
  assert.equal(r.p1Cheated, false);
  assert.equal(r.winner, 'p1');
  assert.equal(r.p1EloChange, 16);
});

test('bot opponent: fixed deltas, bot never flagged, human cheat still penalized', () => {
  const win = resolveDuel({ p1Score: 100, p2Score: 0, p2IsBot: true, p2FlaggedCount: 5 });
  assert.equal(win.winner, 'p1');
  assert.equal(win.p1EloChange, 15, 'bot win → fixed +15');
  assert.equal(win.p2EloChange, 0, 'bot rating never moves');
  assert.equal(win.p2Cheated, false, 'a bot is never flagged');

  const loss = resolveDuel({ p1Score: 0, p2Score: 100, p2IsBot: true });
  assert.equal(loss.p1EloChange, -10, 'bot loss → fixed -10');

  const cheat = resolveDuel({ p1Score: 100, p2Score: 0, p2IsBot: true, p1FlaggedCount: 3 });
  assert.equal(cheat.winner, 'p2', 'cheating human forfeits even to a bot');
  assert.equal(cheat.p1EloChange, CHEAT_ELO_PENALTY);
});

test('rankedMatchmakingError: ranked needs fair-play consent; only telemetry-on may queue', () => {
  assert.equal(rankedMatchmakingError(1), null, 'consented player may queue ranked');
  assert.equal(rankedMatchmakingError(true), null);
  const off = rankedMatchmakingError(0);
  assert.ok(off && off.code === 'FAIRPLAY_CONSENT_REQUIRED', 'opted-out player is blocked with a reason');
  assert.equal(rankedMatchmakingError(undefined).code, 'FAIRPLAY_CONSENT_REQUIRED', 'missing flag → blocked');
});

test('cheatThreshold boundary matches integrityEngine config (3 flags)', () => {
  assert.equal(resolveDuel({ p1Score: 1, p2Score: 0, p1FlaggedCount: cfg.cheatThreshold - 1 }).p1Cheated, false);
  assert.equal(resolveDuel({ p1Score: 1, p2Score: 0, p1FlaggedCount: cfg.cheatThreshold }).p1Cheated, true);
});
