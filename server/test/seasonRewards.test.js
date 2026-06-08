// Ranked seasons with rewards (audit #4): a visible season leaderboard + automatic rollover that
// pays the top finishers when a season expires (idempotent), then opens the next season.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const seedPeak = (uid, seasonId, peak) =>
  dbRun('INSERT INTO season_ratings (user_id, season_id, domain, peak_display, final_display) VALUES (?, ?, ?, ?, ?)', [uid, seasonId, 'global', peak, peak]);

// Replace any active season with a fresh isolated one so a test's assertions don't depend on rows
// other tests seeded into the shared seasons table. Returns the new season id.
async function isolatedSeason(spanSeconds = 1000) {
  await dbRun('UPDATE seasons SET is_active = 0');
  const now = Math.floor(Date.now() / 1000);
  await dbRun("INSERT INTO seasons (name, start_at, end_at, is_active, rewards_finalized) VALUES ('Iso Season', ?, ?, 1, 0)", [now - 100, now + spanSeconds]);
  return (await dbGet('SELECT id FROM seasons WHERE is_active = 1 ORDER BY id DESC LIMIT 1')).id;
}

test('GET season always returns an active season (auto-seeds if none)', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/rating/season', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.season && res.body.season.id > 0);
  assert.ok(res.body.season.daysRemaining >= 0);
});

test('season leaderboard ranks players by their best peak + reports your rank', async () => {
  const hi = await registerUser(ctx.base);
  const lo = await registerUser(ctx.base);
  const seasonId = await isolatedSeason();
  await seedPeak(await idOf(hi.username), seasonId, 2000);
  await seedPeak(await idOf(lo.username), seasonId, 1200);

  const res = await api(ctx.base, 'GET', '/api/rating/season/leaderboard', { token: hi.token });
  assert.equal(res.status, 200);
  const hiPos = res.body.leaderboard.find((r) => r.username === hi.username).position;
  const loPos = res.body.leaderboard.find((r) => r.username === lo.username).position;
  assert.ok(hiPos < loPos, 'higher peak ranks first');
  assert.equal(res.body.yourRank, hiPos);
  assert.equal(res.body.leaderboard.find((r) => r.username === hi.username).isMe, true);
});

test('an expired season auto-rolls over, pays the top 3, and opens a new season (idempotently)', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const c = await registerUser(ctx.base);
  const seasonId = await isolatedSeason();
  const [aId, bId, cId] = [await idOf(a.username), await idOf(b.username), await idOf(c.username)];
  await seedPeak(aId, seasonId, 1900);
  await seedPeak(bId, seasonId, 1600);
  await seedPeak(cId, seasonId, 1300);
  const coins0 = async (id) => (await dbGet('SELECT coins FROM users WHERE id = ?', [id])).coins;
  const [a0, b0, c0] = [await coins0(aId), await coins0(bId), await coins0(cId)];

  // Force the season over; the next read triggers the rollover.
  await dbRun('UPDATE seasons SET end_at = ? WHERE id = ?', [Math.floor(Date.now() / 1000) - 10, seasonId]);
  const res = await api(ctx.base, 'GET', '/api/rating/season', { token: a.token });
  assert.equal(res.status, 200);
  assert.notEqual(res.body.season.id, seasonId, 'a new season opened');

  // Top-3 by peak got 500 / 300 / 150.
  assert.equal(await coins0(aId), a0 + 500);
  assert.equal(await coins0(bId), b0 + 300);
  assert.equal(await coins0(cId), c0 + 150);
  assert.equal((await dbGet('SELECT rewards_finalized FROM seasons WHERE id = ?', [seasonId])).rewards_finalized, 1);

  // Idempotent: reading again does not pay the winners twice.
  await api(ctx.base, 'GET', '/api/rating/season', { token: b.token });
  assert.equal(await coins0(aId), a0 + 500, 'no double payout');
});
