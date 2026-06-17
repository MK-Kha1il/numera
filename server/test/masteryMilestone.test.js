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
  // solvedCount is clamped to 5 server-side, so reaching the first (10) milestone takes two
  // completes; the /complete cooldown is 5s, so we space the second call past it.
  const body = { xpGained: 20, coinsGained: 5, solvedCount: 5, category: 'arithmetic', level: 1, errorsCount: 0 };

  // 0 → 5 correct: below the first milestone, no signal.
  const r1 = await api(ctx.base, 'POST', '/api/math/complete', { token: u.token, body });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.masteryMilestone, null, 'no milestone before crossing 10');

  await sleep(5100); // clear the completion cooldown

  // 5 → 10 correct: crosses the first milestone, signal present.
  const r2 = await api(ctx.base, 'POST', '/api/math/complete', { token: u.token, body });
  assert.equal(r2.status, 200);
  assert.ok(r2.body.masteryMilestone, 'milestone expected on crossing 10');
  assert.equal(r2.body.masteryMilestone.count, 10);
  assert.equal(r2.body.masteryMilestone.category, 'arithmetic');
  assert.equal(typeof r2.body.masteryMilestone.label, 'string');
});
