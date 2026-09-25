// The calendar-day streak end to end (services/streakService.js over lib/streak.js): a solve
// credits today once, app-open/login only settles, returning players via a stored token are
// settled on /api/auth/me, the learner's timezone decides the day, and the recommit paths.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
let streakService;
before(async () => {
  ctx = await bootServer();
  streakService = require('../services/streakService');
});
after(async () => { await shutdown(ctx); });

const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);
const utcToday = () => Math.floor(nowSec() / DAY);
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const userRow = (id) => dbGet('SELECT streak, max_streak, streak_day, commitment_state, lost_streak, coins FROM users WHERE id = ?', [id]);
const complete = (id, solved) =>
  new Promise((res) => require('../services/commitmentService').updateCommitmentAndBurnout(id, solved, res));

test('a solve credits today exactly once; a zero-solve session credits nothing', async () => {
  const u = await registerUser(ctx.base);
  await complete(u.user.id, 0);
  assert.equal((await userRow(u.user.id)).streak, 0, 'no solve, no streak day');

  await complete(u.user.id, 3);
  await complete(u.user.id, 2);
  const row = await userRow(u.user.id);
  assert.equal(row.streak, 1);
  assert.equal(row.streak_day, utcToday());
});

test('solving yesterday then today advances the streak even with a <24h gap', async () => {
  const u = await registerUser(ctx.base);
  // Credited yesterday, and last seen only an hour ago (the old elapsed-seconds logic stalled here).
  await dbRun('UPDATE users SET streak = 6, max_streak = 6, streak_day = ?, last_active = ? WHERE id = ?', [utcToday() - 1, nowSec() - 3600, u.user.id]);
  await complete(u.user.id, 1);
  const row = await userRow(u.user.id);
  assert.equal(row.streak, 7);
  assert.equal(row.max_streak, 7);
});

test('a returning player on a stored token is settled by /api/auth/me (reset + repair offer)', async () => {
  const u = await registerUser(ctx.base);
  await dbRun('UPDATE users SET streak = 12, max_streak = 12, streak_day = ? WHERE id = ?', [utcToday() - 7, u.user.id]);
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.streak, 0, '/me shows the truth, not a stale 12');
  const row = await userRow(u.user.id);
  assert.equal(row.lost_streak, 12, 'the lost run is stashed for the repair valve');

  const status = await api(ctx.base, 'GET', '/api/commitment/status', { token: u.token });
  assert.ok(status.body.streakRepair, 'a repair is offered');
  assert.equal(status.body.streakRepair.lostStreak, 12);
});

test('logging in or opening the app never credits a streak day on its own', async () => {
  const u = await registerUser(ctx.base);
  await dbRun('UPDATE users SET streak = 3, max_streak = 3, streak_day = ? WHERE id = ?', [utcToday() - 1, u.user.id]);
  await api(ctx.base, 'POST', '/api/auth/login', { body: { username: u.username, password: u.password } });
  await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  const row = await userRow(u.user.id);
  assert.equal(row.streak, 3, 'still 3 — only a solve counts today');
  assert.equal(row.streak_day, utcToday() - 1);
});

test('the learner\'s reported timezone decides which day a solve lands on', async () => {
  const u = await registerUser(ctx.base);
  const setTz = (tz) =>
    api(ctx.base, 'POST', '/api/notifications/preferences', { token: u.token, body: { tz_offset_minutes: tz } });
  // Pick an offset whose local day differs from UTC's right now (east of UTC late in the UTC day,
  // otherwise west of it), so the assertion is meaningful at any wall-clock time.
  const utcHour = new Date().getUTCHours();
  const tz = utcHour >= 12 ? 14 * 60 : -12 * 60;
  const res = await setTz(tz);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const local = await streakService.localToday(u.user.id);
  assert.notEqual(local, utcToday(), 'sanity: the chosen offset lands on a different local day');

  await complete(u.user.id, 1);
  assert.equal((await userRow(u.user.id)).streak_day, local);
});

test('recommit by challenge credits today and unlocks the comeback medal', async () => {
  const u = await registerUser(ctx.base);
  await dbRun("UPDATE users SET streak = 5, max_streak = 5, streak_day = ?, commitment_state = 'active' WHERE id = ?", [utcToday() - 2, u.user.id]);
  await api(ctx.base, 'GET', '/api/auth/me', { token: u.token }); // settles into fading
  assert.equal((await userRow(u.user.id)).commitment_state, 'fading');

  const r = await api(ctx.base, 'POST', '/api/commitment/recommit', { token: u.token, body: { method: 'challenge' } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const row = await userRow(u.user.id);
  assert.equal(row.streak, 6);
  assert.equal(row.commitment_state, 'active');
  const relic = await dbGet("SELECT 1 AS ok FROM user_commitment_relics WHERE user_id = ? AND relic_id = 'relic_comeback'", [u.user.id]);
  assert.ok(relic, 'comeback medal unlocked');
});

test('recommit by coins is conditional: short on coins changes nothing', async () => {
  const u = await registerUser(ctx.base);
  await dbRun("UPDATE users SET streak = 5, streak_day = ?, commitment_state = 'active', coins = 100 WHERE id = ?", [utcToday() - 2, u.user.id]);
  const poor = await api(ctx.base, 'POST', '/api/commitment/recommit', { token: u.token, body: { method: 'coins' } });
  assert.equal(poor.status, 400);
  let row = await userRow(u.user.id);
  assert.equal(row.coins, 100, 'no partial deduction');
  assert.equal(row.commitment_state, 'fading');

  await dbRun('UPDATE users SET coins = 200 WHERE id = ?', [u.user.id]);
  const paid = await api(ctx.base, 'POST', '/api/commitment/recommit', { token: u.token, body: { method: 'coins' } });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  row = await userRow(u.user.id);
  assert.equal(row.coins, 50);
  assert.equal(row.commitment_state, 'protected');
  assert.equal(row.streak_day, utcToday() - 1, 'the missed day is bridged');

  await complete(u.user.id, 1);
  assert.equal((await userRow(u.user.id)).streak, 6, "today's solve continues the bought-back run");
});

test('recommit is refused when the climb is not fading', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/commitment/recommit', { token: u.token, body: { method: 'challenge' } });
  assert.equal(r.status, 400);
  const bad = await api(ctx.base, 'POST', '/api/commitment/recommit', { token: u.token, body: { method: 'bribe' } });
  assert.equal(bad.status, 400);
});
