// Reasoning Arena (competitive audit Phase 3): a ranked round where a point is BANKED only if BOTH
// the answer AND the chosen reason are correct — understanding is the win condition, with no speed
// signal, feeding the unified NRS rating. These tests read the server-side answer key directly to
// construct correct/incorrect submissions (the client never receives it).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const keyOf = async (roundId) => JSON.parse((await dbGet('SELECT problems_json FROM reasoning_rounds WHERE id = ?', [roundId])).problems_json);

test('start returns a level round of problems + reason options, with the answer key stripped', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.roundId > 0);
  assert.equal(res.body.problems.length, 5);
  assert.ok(res.body.problems.every((p) => p.answer === undefined && p.reasonCorrectIndex === undefined), 'no answer key leaks to the client');
  assert.ok(res.body.problems.every((p) => Array.isArray(p.reasonOptions) && p.reasonOptions.length >= 2 && p.reasonQuestion), 'each item carries a reason-MCQ');
});

test('banking a point requires BOTH a correct answer AND the correct reason; rating rises on a perfect round', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const answers = probs.map((p) => p.answer);
  const reasons = probs.map((p) => p.reasonCorrectIndex);

  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.total, 5);
  assert.equal(sub.body.answerCorrect, 5);
  assert.equal(sub.body.banked, 5, 'correct answer + correct reason banks every point');
  assert.ok(sub.body.ratingDelta > 0, 'a perfect understanding round raises the unified rating');
  assert.ok(sub.body.newRank, 'a new rank is reported');

  const again = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(again.status, 400, 'a round cannot be submitted twice');
});

test('a correct answer with the WRONG reason banks nothing (the understanding gate)', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const answers = probs.map((p) => p.answer); // every answer correct
  const reasons = probs.map((p) => (p.reasonCorrectIndex + 1) % p.reasonOptions.length); // every reason wrong

  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.answerCorrect, 5, 'all answers were correct');
  assert.equal(sub.body.banked, 0, 'but no reasons correct → nothing banked: speed/recall alone cannot climb');
});

test('daily rated cap: rounds past the cap are playable but rating-neutral (anti-farm)', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  // Seed the day's rated-round cap (10) as already used.
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    await dbRun(
      "INSERT INTO reasoning_rounds (user_id, level, problems_json, problem_count, status, score, rated, created_at, finished_at) VALUES (?, 5, '[]', 0, 'done', 0, 1, ?, ?)",
      [uid, now, now]
    );
  }

  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, {
    token: u.token,
    body: { answers: probs.map((p) => p.answer), reasons: probs.map((p) => p.reasonCorrectIndex) },
  });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.banked, 5, 'the round is still played and scored');
  assert.equal(sub.body.ratingCounted, false, 'past the daily cap the rating does not move');
  assert.equal(sub.body.ratingDelta, 0, 'no rating delta when capped');
});
