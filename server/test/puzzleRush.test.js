// Puzzle Rush: server-authoritative ladder — start, correct/wrong scoring, 3-strike game over
// with a transactional coin reward, the out-of-sync guard, and the leaderboard. The integrity
// superhuman-speed flag is disabled here (PUZZLE_RUSH_SUPERHUMAN_MS=0) since the harness submits
// answers in microseconds; it must be set before server.js loads.
process.env.PUZZLE_RUSH_SUPERHUMAN_MS = '0';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
// The server hides the answer; tests read it straight from the run row to submit correctly.
const currentAnswer = (runId) => dbGet('SELECT current_answer FROM puzzle_rush_runs WHERE id = ?', [runId]).then((r) => r.current_answer);
const coinsOf = (userId) => dbGet('SELECT coins FROM users WHERE id = ?', [userId]).then((r) => r.coins);

test('start serves a problem without leaking its answer', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.runId > 0);
  assert.equal(r.body.index, 0);
  assert.equal(r.body.lives, 3);
  assert.ok(r.body.problem && r.body.problem.question, 'a question is served');
  assert.ok(Array.isArray(r.body.problem.options) && r.body.problem.options.length >= 2);
  assert.equal(r.body.problem.correctAnswer, undefined, 'the answer must NOT be sent to the client');
});

test('a correct answer scores and advances; a wrong answer costs a life and reveals the answer', async () => {
  const u = await registerUser(ctx.base);
  const userId = (await dbGet('SELECT id FROM users WHERE username = ?', [u.username])).id;
  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  const runId = start.body.runId;

  // Correct submit at index 0.
  const ans0 = await currentAnswer(runId);
  const s1 = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: 0, answer: ans0 } });
  assert.equal(s1.body.correct, true);
  assert.equal(s1.body.score, 1);
  assert.equal(s1.body.lives, 3, 'a correct answer costs no life');
  assert.equal(s1.body.index, 1, 'advances to the next rung');
  assert.ok(s1.body.problem.question, 'serves the next problem');

  // Wrong submit at index 1 → reveals the missed answer, costs a life, still advances.
  const missed = await currentAnswer(runId);
  const s2 = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: 1, answer: '__definitely_wrong__' } });
  assert.equal(s2.body.correct, false);
  assert.equal(s2.body.lives, 2);
  assert.equal(s2.body.correctAnswer, missed, 'the missed answer is revealed on a wrong submit');
  assert.equal(s2.body.gameOver, false);

  assert.equal(userId > 0, true);
});

test('three strikes ends the run and grants a transactional coin reward', async () => {
  const u = await registerUser(ctx.base);
  const userId = (await dbGet('SELECT id FROM users WHERE username = ?', [u.username])).id;
  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  const runId = start.body.runId;

  // Bank one correct point so the finish reward is non-zero.
  const ans0 = await currentAnswer(runId);
  await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: 0, answer: ans0 } });
  const coinsBefore = await coinsOf(userId);

  // Three wrong answers → game over. Track the live index since wrong answers advance it.
  let idx = 1;
  let last;
  for (let i = 0; i < 3; i++) {
    last = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: idx, answer: '__wrong__' } });
    idx = last.body.index !== undefined ? last.body.index : idx + 1;
  }
  assert.equal(last.body.gameOver, true);
  assert.equal(last.body.finalScore, 1);
  assert.equal(last.body.reward, 1, 'reward = min(score, cap)');

  const coinsAfter = await coinsOf(userId);
  assert.equal(coinsAfter - coinsBefore, 1, 'coins increased by the reward');

  const row = await dbGet('SELECT status FROM puzzle_rush_runs WHERE id = ?', [runId]);
  assert.equal(row.status, 'finished');

  // A submit after the run is over is rejected.
  const post = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: idx, answer: 'x' } });
  assert.equal(post.status, 400);
});

test('an out-of-sync index is rejected', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  const r = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId: start.body.runId, index: 99, answer: 'x' } });
  assert.equal(r.status, 409);
});

test('leaderboard reports finished scores and the caller personal best', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  const runId = start.body.runId;
  // Score 2, then bust out.
  for (let i = 0; i < 2; i++) {
    const a = await currentAnswer(runId);
    await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: i, answer: a } });
  }
  let idx = 2;
  let last;
  for (let i = 0; i < 3; i++) {
    last = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', { token: u.token, body: { runId, index: idx, answer: '__wrong__' } });
    idx = last.body.index !== undefined ? last.body.index : idx + 1;
  }
  const board = await api(ctx.base, 'GET', '/api/puzzle-rush/leaderboard', { token: u.token });
  assert.equal(board.status, 200);
  assert.equal(board.body.personalBest, 2);
  assert.ok(board.body.leaderboard.some((e) => e.username === u.username && e.best === 2), 'caller appears on the board');
});
