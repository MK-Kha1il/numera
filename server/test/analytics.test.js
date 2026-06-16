// Privacy-first product analytics: allowlisted aggregate event counts, admin-only rollup.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));
const today = () => new Date().toISOString().slice(0, 10);

test('allowlisted events accumulate a daily count; the row carries no user linkage', async () => {
  const u = await registerUser(ctx.base);
  await dbRun("DELETE FROM analytics_daily");
  for (let i = 0; i < 3; i++) {
    const r = await api(ctx.base, 'POST', '/api/analytics/event', { token: u.token, body: { event: 'screen_shop' } });
    assert.equal(r.status, 200);
    assert.equal(r.body.recorded, true);
  }
  const row = await dbGet("SELECT day, event, count FROM analytics_daily WHERE event = 'screen_shop'");
  assert.equal(row.count, 3);
  assert.equal(row.day, today());
  // PII-free by construction: the table has no user/device columns at all.
  const cols = await new Promise((res, rej) => ctx.mod.db.all('PRAGMA table_info(analytics_daily)', [], (e, r) => (e ? rej(e) : res(r))));
  assert.deepEqual(cols.map((c) => c.name).sort(), ['count', 'day', 'event']);
});

test('unknown events are accepted but not recorded', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/analytics/event', { token: u.token, body: { event: 'evil; DROP TABLE users; user_email=x' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.recorded, false);
});

test('the summary rollup is admin-only and aggregates totals', async () => {
  const normal = await registerUser(ctx.base);
  await dbRun("DELETE FROM analytics_daily");
  await api(ctx.base, 'POST', '/api/analytics/event', { token: normal.token, body: { event: 'game_start' } });
  await api(ctx.base, 'POST', '/api/analytics/event', { token: normal.token, body: { event: 'game_start' } });
  await api(ctx.base, 'POST', '/api/analytics/event', { token: normal.token, body: { event: 'game_finish' } });

  const denied = await api(ctx.base, 'GET', '/api/analytics/summary', { token: normal.token });
  assert.equal(denied.status, 403);

  const admin = await registerUser(ctx.base);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [await idOf(admin.username)]);
  const sum = await api(ctx.base, 'GET', '/api/analytics/summary', { token: admin.token });
  assert.equal(sum.status, 200);
  const start = sum.body.totals.find((t) => t.event === 'game_start');
  assert.equal(start.total, 2);
  assert.ok(sum.body.totals.find((t) => t.event === 'game_finish').total === 1);
});

// /complete clamps solvedCount to 5, so pre-seed solved_count to cross the threshold in one call.
const complete = (token, body) => api(ctx.base, 'POST', '/api/math/complete', { token, body: { solvedCount: 5, category: 'arithmetic', level: 1, gameMode: 'level', xpGained: 0, coinsGained: 0, errorsCount: 1, ...body } });

test('a learner who clears the bar within the window is marked activated', async () => {
  const u = await registerUser(ctx.base); // registration stamps created_at = now
  const id = await idOf(u.username);
  await dbRun('UPDATE users SET solved_count = 9 WHERE id = ?', [id]); // +5 from one complete → 14 ≥ 10

  const r = await complete(u.token);
  assert.equal(r.status, 200);

  const row = await dbGet('SELECT activated_at FROM users WHERE id = ?', [id]);
  assert.ok(row.activated_at > 0, 'activated_at stamped');
});

test('clearing the bar outside the signup window does NOT activate', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  const tenDaysAgo = Math.floor(Date.now() / 1000) - 10 * 86400;
  await dbRun('UPDATE users SET solved_count = 50, created_at = ? WHERE id = ?', [tenDaysAgo, id]);

  await complete(u.token);
  const row = await dbGet('SELECT activated_at FROM users WHERE id = ?', [id]);
  assert.equal(row.activated_at, 0, 'too late to count as activation');
});

test('the activation funnel is admin-only and reports a rate', async () => {
  const normal = await registerUser(ctx.base);
  const denied = await api(ctx.base, 'GET', '/api/analytics/activation', { token: normal.token });
  assert.equal(denied.status, 403);

  const admin = await registerUser(ctx.base);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [await idOf(admin.username)]);
  const r = await api(ctx.base, 'GET', '/api/analytics/activation', { token: admin.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.definition.threshold, 10);
  assert.ok(typeof r.body.cohort === 'number' && r.body.cohort >= 1);
  assert.ok(r.body.activationRate >= 0 && r.body.activationRate <= 100);
});
