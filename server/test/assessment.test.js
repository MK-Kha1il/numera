// Adaptive diagnostic: server-authoritative, branching difficulty. Drives full runs answering
// all-correct vs all-wrong and asserts the placement adapts (high vs low level), that the answer
// is never leaked, and the session/ownership guards. Reads the outstanding answer from the DB to
// simulate a correct response (the API never returns it).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const sessionAnswer = (id) => dbGet('SELECT current_answer FROM diagnostic_sessions WHERE id = ?', [id]).then((r) => r.current_answer);
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const levelOf = (uid) => dbGet('SELECT level FROM users WHERE id = ?', [uid]).then((r) => r.level);

// Plays a full diagnostic. answerFn(sessionId) resolves to the answer string to submit.
async function runDiagnostic(token, answerFn) {
  const start = await api(ctx.base, 'POST', '/api/assessment/adaptive/start', { token });
  const sessionId = start.body.sessionId;
  let last = start.body;
  for (let i = 0; i < start.body.totalQuestions; i++) {
    const answer = await answerFn(sessionId);
    last = (await api(ctx.base, 'POST', '/api/assessment/adaptive/answer', { token, body: { sessionId, answer } })).body;
  }
  return { sessionId, final: last };
}

test('start serves the first question without leaking its answer', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/assessment/adaptive/start', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.sessionId > 0);
  assert.equal(r.body.questionNumber, 1);
  assert.equal(r.body.totalQuestions, 7);
  assert.ok(r.body.question && Array.isArray(r.body.options));
  assert.equal(r.body.correctAnswer, undefined, 'the answer must not be served');
});

test('all-correct places high, all-wrong places low (server-authoritative)', async () => {
  const high = await registerUser(ctx.base);
  const highId = await idOf(high.username);
  const r1 = await runDiagnostic(high.token, (sid) => sessionAnswer(sid));
  assert.equal(r1.final.done, true);
  assert.equal(r1.final.correct, 7, 'all answered correctly');
  assert.ok(r1.final.placedLevel >= 40, `expected a high placement, got ${r1.final.placedLevel}`);
  assert.equal(await levelOf(highId), r1.final.placedLevel, 'users.level set authoritatively');

  const low = await registerUser(ctx.base);
  const lowId = await idOf(low.username);
  const r2 = await runDiagnostic(low.token, async () => '__wrong__');
  assert.equal(r2.final.done, true);
  assert.equal(r2.final.correct, 0);
  assert.ok(r2.final.placedLevel <= 3, `expected a low placement, got ${r2.final.placedLevel}`);
  assert.equal(await levelOf(lowId), r2.final.placedLevel);

  assert.ok(r1.final.placedLevel > r2.final.placedLevel, 'the diagnostic actually adapts');
});

test('guards: unknown session 404, and answering a finished diagnostic is rejected', async () => {
  const u = await registerUser(ctx.base);
  const missing = await api(ctx.base, 'POST', '/api/assessment/adaptive/answer', { token: u.token, body: { sessionId: 999999, answer: 'x' } });
  assert.equal(missing.status, 404);

  const { sessionId } = await runDiagnostic(u.token, async () => '__wrong__');
  const after = await api(ctx.base, 'POST', '/api/assessment/adaptive/answer', { token: u.token, body: { sessionId, answer: 'x' } });
  assert.equal(after.status, 400, 'cannot answer a completed diagnostic');
});

test('placement never demotes: an all-wrong retake keeps the level already earned', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await new Promise((res, rej) => ctx.mod.db.run('UPDATE users SET level = 25 WHERE id = ?', [uid], (e) => (e ? rej(e) : res())));
  const { final } = await runDiagnostic(u.token, async () => 'definitely-wrong');
  assert.equal(final.done, true);
  assert.ok(final.placedLevel < 25, 'the diagnostic itself placed low');
  assert.equal(await levelOf(uid), 25, 'but the learner keeps their progress');
  assert.equal(final.level, 25);
});

test('the legacy client-scored placement endpoint is gone', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/assessment/submit', { token: u.token, body: { score: 10 } });
  assert.equal(r.status, 404);
  assert.equal(await levelOf(await idOf(u.username)), 1, 'no free level-up');
});
