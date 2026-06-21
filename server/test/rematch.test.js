// Guards the socket-independent parts of the rematch ("run it back") flow: the eligibility gate
// (who becomes rematch-able after a duel) and the post-duel reasoning prompt. The full
// offer/accept handshake is a live socket interaction (verified in-app); here we lock down the
// pure decision logic so a regression in the gate is caught.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown } = require('./helpers');

let mod;
before(async () => { const ctx = await bootServer(); mod = ctx.mod; global.__ctx = ctx; });
after(async () => { await shutdown(global.__ctx); });

function freshRoom(overrides) {
  return {
    p1: { id: 101, username: 'Ada', score: 100, elo: 1000 },
    p2: { id: 202, username: 'Tess', score: 60, elo: 1000 },
    isCasual: false,
    problems: [{ question: '2+2' }],
    templateTypes: [null],
    ...overrides,
  };
}

test('a human-vs-human duel makes BOTH players rematch-eligible, mirrored, with the mode carried', () => {
  // Clear any prior state for these ids.
  delete mod.lastDuelByUser[101];
  delete mod.lastDuelByUser[202];

  mod.recordRematchEligibility(freshRoom({ isCasual: true }), false);

  assert.deepStrictEqual(
    { opp: mod.lastDuelByUser[101].opponentId, name: mod.lastDuelByUser[101].opponentUsername, casual: mod.lastDuelByUser[101].isCasual },
    { opp: 202, name: 'Tess', casual: true }
  );
  assert.deepStrictEqual(
    { opp: mod.lastDuelByUser[202].opponentId, name: mod.lastDuelByUser[202].opponentUsername, casual: mod.lastDuelByUser[202].isCasual },
    { opp: 101, name: 'Ada', casual: true }
  );
});

test('a bot opponent is never rematch-eligible (no fake "run it back" vs the bot)', () => {
  delete mod.lastDuelByUser[303];
  const room = freshRoom({ p1: { id: 303, username: 'Ben', score: 80, elo: 1000 }, p2: { id: 9999, username: 'MathBot', score: 40, elo: 1000, isBot: true } });
  mod.recordRematchEligibility(room, true);
  assert.strictEqual(mod.lastDuelByUser[303], undefined, 'no eligibility recorded against a bot');
  assert.strictEqual(mod.lastDuelByUser[9999], undefined);
});

test('buildDuelReasoning is null when no problem carries a concept key (e.g. a CAS set)', () => {
  const room = freshRoom({ templateTypes: [null, null], problems: [{ question: 'x' }, { question: 'y' }] });
  assert.strictEqual(mod.buildDuelReasoning(room), null);
});

test('buildDuelReasoning is null for a malformed/empty room (never throws)', () => {
  assert.strictEqual(mod.buildDuelReasoning(null), null);
  assert.strictEqual(mod.buildDuelReasoning({}), null);
});
