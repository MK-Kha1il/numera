// Learning plan: turns the learner's goal into an ordered, prerequisite-correct concept path with
// a single clear "next step" (audit #19 — goal actuation over the existing mastery model).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const plan = (token) => api(ctx.base, 'GET', '/api/engine/learning-plan', { token });

test('a fresh learner gets an ordered path with the root concept as the next step', async () => {
  const u = await registerUser(ctx.base);
  const res = await plan(u.token);
  assert.equal(res.status, 200);
  assert.ok(res.body.steps.length > 0);

  // Steps are sorted by curriculum level (a valid prerequisite order).
  const levels = res.body.steps.map((s) => s.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));

  // Nothing is mastered yet, so none are 'done' and exactly one step is the next step.
  assert.equal(res.body.done, 0);
  assert.equal(res.body.percent, 0);
  const nexts = res.body.steps.filter((s) => s.isNext);
  assert.equal(nexts.length, 1);
  assert.ok(res.body.nextStep && res.body.nextStep.isNext);

  // The next step must be actionable (no unmet prereqs).
  assert.ok(['available', 'in_progress'].includes(res.body.nextStep.status));
  // Every step carries a valid status.
  assert.ok(res.body.steps.every((s) => ['done', 'in_progress', 'available', 'locked'].includes(s.status)));
});

test('deeper concepts are locked behind prerequisites for a new learner', async () => {
  const u = await registerUser(ctx.base);
  const res = await plan(u.token);
  // The very first concept is reachable; at least one later concept is gated.
  assert.equal(res.body.steps[0].status, 'available');
  assert.ok(res.body.steps.some((s) => s.status === 'locked'), 'some concept is locked by prereqs');
});

test('a reach_level goal drives the target level of the plan', async () => {
  const u = await registerUser(ctx.base);
  // No goal → near-term horizon (default).
  const before = await plan(u.token);
  assert.equal(before.body.goalDriven, false);

  // Set a reach_level goal of 24 and the plan should target exactly that.
  const set = await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'reach_level', targetValue: 24 } });
  assert.equal(set.status, 200);
  const after = await plan(u.token);
  assert.equal(after.body.goalDriven, true);
  assert.equal(after.body.targetLevel, 24);
  assert.equal(after.body.goalType, 'reach_level');
  // Every step is within the target.
  assert.ok(after.body.steps.every((s) => s.level <= 24));
});

test('a non-level goal does not drive the target (falls back to the horizon)', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'daily_problems', targetValue: 10 } });
  const res = await plan(u.token);
  assert.equal(res.body.goalDriven, false);
  assert.equal(res.body.goalType, 'daily_problems');
});
