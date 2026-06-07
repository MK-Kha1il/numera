// Puzzle Rush × integrityEngine integration: with the human floor set absurdly high, every
// fast (test-speed) correct answer is flagged. A run with >= cheatThreshold flags gets a 'cheat'
// verdict — reward withheld and excluded from the public leaderboard. Env must be set before
// server.js loads.
process.env.PUZZLE_RUSH_SUPERHUMAN_MS = '999999';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const currentAnswer = (runId) => dbGet('SELECT current_answer FROM puzzle_rush_runs WHERE id = ?', [runId]).then((r) => r.current_answer);

test('a run of superhuman-fast correct answers is flagged: reward withheld + off the board', async () => {
  const u = await registerUser(ctx.base);
  const userId = (await dbGet('SELECT id FROM users WHERE username = ?', [u.username])).id;
  const coinsBefore = (await dbGet('SELECT coins FROM users WHERE id = ?', [userId])).coins;

  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  const runId = start.body.runId;

  // 3 correct answers (each flagged as superhuman) so the run crosses the cheat threshold.
  let idx = 0;
  for (let i = 0; i < 3; i++) {
    const a = await currentAnswer(runId);
    const r = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: idx, answer: a } });
    idx = r.body.index;
  }
  // Then bust out with 3 wrong answers.
  let last;
  for (let i = 0; i < 3; i++) {
    last = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: idx, answer: '__wrong__' } });
    idx = last.body.index !== undefined ? last.body.index : idx + 1;
  }

  assert.equal(last.body.gameOver, true);
  assert.equal(last.body.finalScore, 3);
  assert.equal(last.body.flagged, true, 'run flagged for integrity');
  assert.equal(last.body.reward, 0, 'cheat verdict withholds the coin reward');

  const coinsAfter = (await dbGet('SELECT coins FROM users WHERE id = ?', [userId])).coins;
  assert.equal(coinsAfter, coinsBefore, 'no coins granted to a flagged run');

  const flag = (await dbGet('SELECT integrity_flag FROM puzzle_rush_runs WHERE id = ?', [runId])).integrity_flag;
  assert.equal(flag, 3, 'integrity_flag counts the 3 flagged answers');

  const board = await api(ctx.base, 'GET', '/api/puzzle-rush/leaderboard', { token: u.token });
  assert.ok(!board.body.leaderboard.some((e) => e.username === u.username), 'flagged run excluded from the public board');
});
