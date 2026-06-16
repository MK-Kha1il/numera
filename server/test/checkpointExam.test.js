// Checkpoint exam: a mixed-strand cumulative test (ultra review #16). Verifies it assembles a
// well-formed, interleaved problem set and respects the count bounds.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));

test('a fresh user gets the foundational fallback exam, well-formed', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/math/checkpoint-exam', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.problems.length >= 5, 'at least the minimum number of questions');
  for (const p of r.body.problems) {
    assert.ok(p.question && p.question.length > 0, 'has a question');
    assert.ok(Array.isArray(p.options) && p.options.length >= 2, 'has options');
    assert.ok(p.options.includes(p.correctAnswer), 'the correct answer is among the options');
    assert.ok(p.category, 'carries its strand');
  }
  // Fallback uses the foundational core → more than one strand represented.
  assert.ok(new Set(r.body.problems.map((p) => p.category)).size >= 2, 'mixed strands');
});

test('count is clamped to the 5..12 range', async () => {
  const u = await registerUser(ctx.base);
  const tooMany = await api(ctx.base, 'GET', '/api/math/checkpoint-exam?count=50', { token: u.token });
  assert.equal(tooMany.body.problems.length, 12);
  const tooFew = await api(ctx.base, 'GET', '/api/math/checkpoint-exam?count=1', { token: u.token });
  assert.equal(tooFew.body.problems.length, 5);
});

test('the exam reflects the strands a learner has actually practiced', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  // Practiced only fractions + algebra → the exam should draw from those.
  await dbRun('UPDATE user_mastery SET fractions_correct = 8, algebra_correct = 5 WHERE user_id = ?', [id]);
  const r = await api(ctx.base, 'GET', '/api/math/checkpoint-exam?count=6', { token: u.token });
  const cats = new Set(r.body.problems.map((p) => p.category));
  assert.ok([...cats].every((c) => c === 'fractions' || c === 'algebra'), `only studied strands, got ${[...cats]}`);
  assert.deepEqual(r.body.strands.sort(), ['algebra', 'fractions']);
});
