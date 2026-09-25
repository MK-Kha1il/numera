// Per-level stars — the level map's replay goal (lib/soloRewards.levelStars): computed from the
// ticket-anchored session, best result kept, never for locked levels; and the recap payload's
// streak + quest snapshot.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { levelStars } = require('../lib/soloRewards');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const serveLevel = (token, level) => api(ctx.base, 'GET', `/api/math/problems?category=arithmetic&level=${level}&count=3`, { token });
const complete = (token, body) =>
  api(ctx.base, 'POST', '/api/math/complete', { token, body: { gameMode: 'level', category: 'arithmetic', ...body } });

test('levelStars: cleared / complete / flawless', () => {
  assert.equal(levelStars({ solvedCount: 0, servedCount: 3, errorsCount: 3 }), 0);
  assert.equal(levelStars({ solvedCount: 2, servedCount: 3, errorsCount: 1 }), 1);
  assert.equal(levelStars({ solvedCount: 3, servedCount: 3, errorsCount: 1 }), 2);
  assert.equal(levelStars({ solvedCount: 3, servedCount: 3, errorsCount: 0 }), 3);
});

test('a level session returns its stars and keeps the best result', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 1);
  const first = await complete(u.token, { level: 1, solvedCount: 3, errorsCount: 1 });
  assert.equal(first.body.stars, 2);
  assert.equal(first.body.bestStars, 2);
  assert.equal(first.body.newBest, true);

  await sleep(5100); // completion cooldown
  await serveLevel(u.token, 1);
  const worse = await complete(u.token, { level: 1, solvedCount: 1, errorsCount: 2 });
  assert.equal(worse.body.stars, 1);
  assert.equal(worse.body.bestStars, 2, 'the best result is kept');
  assert.equal(worse.body.newBest, false);

  await sleep(5100);
  await serveLevel(u.token, 1);
  const flawless = await complete(u.token, { level: 1, solvedCount: 3, errorsCount: 0 });
  assert.equal(flawless.body.stars, 3);
  assert.equal(flawless.body.newBest, true);

  const map = await api(ctx.base, 'GET', '/api/levels/stars', { token: u.token });
  assert.equal(map.status, 200);
  assert.deepEqual(map.body.stars, { 1: 3 });
  assert.equal(map.body.total, 3);
  assert.equal(map.body.threeStarLevels, 1);
});

test('no stars for a locked level', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 30);
  const r = await complete(u.token, { level: 30, solvedCount: 3, errorsCount: 0 });
  assert.equal(r.body.levelLocked, true);
  assert.equal(r.body.stars, 0);
  const map = await api(ctx.base, 'GET', '/api/levels/stars', { token: u.token });
  assert.deepEqual(map.body.stars, {});
});

test('the recap payload reports the streak extension and quest progress', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 1);
  const r = await complete(u.token, { level: 1, solvedCount: 3, errorsCount: 0 });
  assert.deepEqual(r.body.streak, { days: 1, extendedToday: true, restored: false });
  const solver = r.body.questProgress.find((q) => q.type === 'solved');
  assert.deepEqual(solver, { type: 'solved', name: 'Daily Solver', current: 3, target: 5, claimed: false });
  assert.equal(r.body.claimableQuests, 0);

  // A second session the same day keeps the streak but is not what extended it.
  await dbRun('UPDATE user_quests SET solved_today = 4 WHERE user_id = ?', [u.user.id]);
  await sleep(5100);
  await serveLevel(u.token, 2);
  const again = await complete(u.token, { level: 2, solvedCount: 3, errorsCount: 0 });
  assert.equal(again.body.streak.days, 1);
  assert.equal(again.body.streak.extendedToday, false);
  assert.equal(again.body.claimableQuests, 1, 'Daily Solver (5/5) is ready to claim');
});
