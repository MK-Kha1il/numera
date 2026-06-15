// Streak repair: the coins-paid "second valve" after a full streak reset, available for a short
// grace window. Complements the auto-deploying Streak Shield (freeze) and the fading recommit.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));
const now = () => Math.floor(Date.now() / 1000);

test('status offers a repair when a streak was just lost, and repair restores it for coins', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  // Simulate a fully-lost 10-day streak moments ago, with coins to spare.
  await dbRun('UPDATE users SET streak = 0, lost_streak = 10, lost_streak_at = ?, coins = 300 WHERE id = ?', [now(), id]);

  const status = await api(ctx.base, 'GET', '/api/commitment/status', { token: u.token });
  assert.equal(status.status, 200);
  assert.ok(status.body.streakRepair, 'an offer is present');
  assert.equal(status.body.streakRepair.lostStreak, 10);
  assert.equal(status.body.streakRepair.cost, 200); // 50 + 10*15

  const repair = await api(ctx.base, 'POST', '/api/commitment/streak-repair', { token: u.token });
  assert.equal(repair.status, 200, JSON.stringify(repair.body));
  assert.equal(repair.body.restoredStreak, 10);
  assert.equal(repair.body.user.streak, 10);
  assert.equal(repair.body.user.coins, 100); // 300 - 200

  // The offer is consumed (can't repair twice).
  const row = await dbGet('SELECT streak, lost_streak FROM users WHERE id = ?', [id]);
  assert.equal(row.streak, 10);
  assert.equal(row.lost_streak, 0);
});

test('repair is rejected once the grace window has passed', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  // Lost 49 hours ago — outside the 48h window.
  await dbRun('UPDATE users SET streak = 0, lost_streak = 7, lost_streak_at = ?, coins = 999 WHERE id = ?', [now() - 49 * 3600, id]);

  const status = await api(ctx.base, 'GET', '/api/commitment/status', { token: u.token });
  assert.equal(status.body.streakRepair, null, 'no offer past the window');

  const repair = await api(ctx.base, 'POST', '/api/commitment/streak-repair', { token: u.token });
  assert.equal(repair.status, 400);
});

test('repair is rejected with no lost streak and when coins are short', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);

  // No lost streak at all.
  const none = await api(ctx.base, 'POST', '/api/commitment/streak-repair', { token: u.token });
  assert.equal(none.status, 400);

  // Lost streak present but not enough coins (cost = 50 + 20*15 = 350).
  await dbRun('UPDATE users SET lost_streak = 20, lost_streak_at = ?, coins = 10 WHERE id = ?', [now(), id]);
  const broke = await api(ctx.base, 'POST', '/api/commitment/streak-repair', { token: u.token });
  assert.equal(broke.status, 400);
  // Coins untouched on a failed repair.
  const row = await dbGet('SELECT coins, streak FROM users WHERE id = ?', [id]);
  assert.equal(row.coins, 10);
  assert.equal(row.streak, 0);
});
