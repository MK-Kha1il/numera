// Guards the mastery-up signal (ultra-review #20): /api/math/complete returns a
// `masteryMilestone` exactly when a category's lifetime-correct count CROSSES a milestone
// (10/25/50/...), and null otherwise. The client turns that signal into the celebration.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('masteryMilestone fires once, on the solve that crosses a threshold', async () => {
  const u = await registerUser(ctx.base);
  // A level session serves 3 problems (the solve cap per completion), and the /complete cooldown is
  // 5s, so pre-seed the strand to 7 correct: one full session crosses the first (10) milestone.
  const body = { solvedCount: 3, category: 'arithmetic', level: 1, gameMode: 'level', errorsCount: 0 };
  const serve = () => api(ctx.base, 'GET', '/api/math/problems?category=arithmetic&level=1&count=3', { token: u.token });
  const setCorrect = (n) =>
    new Promise((res, rej) => ctx.mod.db.run('UPDATE user_mastery SET arithmetic_correct = ? WHERE user_id = ?', [n, u.user.id], (e) => (e ? rej(e) : res())));

  // 3 → 6 correct: below the first milestone, no signal.
  await api(ctx.base, 'GET', '/api/auth/me', { token: u.token }); // lazily creates the mastery row
  await setCorrect(3);
  await serve();
  const r1 = await api(ctx.base, 'POST', '/api/math/complete', { token: u.token, body });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.masteryMilestone, null, 'no milestone before crossing 10');

  await sleep(5100); // clear the completion cooldown

  // 7 → 10 correct: crosses the first milestone, signal present.
  await setCorrect(7);
  await serve();
  const r2 = await api(ctx.base, 'POST', '/api/math/complete', { token: u.token, body });
  assert.equal(r2.status, 200);
  assert.ok(r2.body.masteryMilestone, 'milestone expected on crossing 10');
  assert.equal(r2.body.masteryMilestone.count, 10);
  assert.equal(r2.body.masteryMilestone.category, 'arithmetic');
  assert.equal(typeof r2.body.masteryMilestone.label, 'string');
});
