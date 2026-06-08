// Learner-set goals (audit #2/#19): set/get/replace/clear one explicit goal, with progress
// computed from existing stats on read, and input validation on type + target range.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const today = () => new Date().toISOString().slice(0, 10);

test('a fresh user has no goal but is offered the goal types', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/account/goal', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.goal, null);
  assert.ok(Array.isArray(r.body.types) && r.body.types.length >= 3, 'goal types are offered');
  assert.ok(r.body.types.every((t) => t.key && t.label && typeof t.min === 'number' && typeof t.max === 'number'));
});

test('a daily-problems goal tracks progress from today\'s solved count and flips to completed', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);

  const set = await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'daily_problems', targetValue: 5 } });
  assert.equal(set.status, 200);

  // Solved 3 today → 3/5, not complete.
  await dbRun('INSERT INTO user_commitment_history (user_id, date, solved_count) VALUES (?,?,?)', [userId, today(), 3]);
  let g = await api(ctx.base, 'GET', '/api/account/goal', { token: u.token });
  assert.equal(g.body.goal.goalType, 'daily_problems');
  assert.equal(g.body.goal.current, 3);
  assert.equal(g.body.goal.completed, false);

  // Now 6 today → meets the target of 5.
  await dbRun('UPDATE user_commitment_history SET solved_count = 6 WHERE user_id = ? AND date = ?', [userId, today()]);
  g = await api(ctx.base, 'GET', '/api/account/goal', { token: u.token });
  assert.equal(g.body.goal.current, 6);
  assert.equal(g.body.goal.completed, true);
});

test('setting a goal again replaces the previous one (one active goal per user)', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  await dbRun('UPDATE users SET level = 8 WHERE id = ?', [userId]);

  await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'daily_problems', targetValue: 10 } });
  await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'reach_level', targetValue: 20 } });

  const g = await api(ctx.base, 'GET', '/api/account/goal', { token: u.token });
  assert.equal(g.body.goal.goalType, 'reach_level', 'the goal was replaced, not duplicated');
  assert.equal(g.body.goal.current, 8, 'reach_level progress reads the live user level');
  assert.equal(g.body.goal.targetValue, 20);
});

test('invalid goal type or out-of-range target is rejected; delete clears the goal', async () => {
  const u = await registerUser(ctx.base);
  const bad = await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'nonsense', targetValue: 5 } });
  assert.equal(bad.status, 400);
  const tooBig = await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'streak', targetValue: 99999 } });
  assert.equal(tooBig.status, 400);

  await api(ctx.base, 'PUT', '/api/account/goal', { token: u.token, body: { goalType: 'streak', targetValue: 7 } });
  const del = await api(ctx.base, 'DELETE', '/api/account/goal', { token: u.token });
  assert.equal(del.status, 200);
  const after = await api(ctx.base, 'GET', '/api/account/goal', { token: u.token });
  assert.equal(after.body.goal, null, 'goal is cleared after delete');
});
