// Apex tier (competitive audit #23): a leaderboard-only standing above the rank thresholds. Only
// placed Master+ players qualify, ordered by global display rating; the requester learns their own
// standing (null unless inside the apex). These tests seed global ratings directly.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

// Seed a placed global rating at a given display rating (mu/sigma chosen so display = mu−2σ).
async function seedRating(username, displayRating, sessions = 30) {
  const uid = await idOf(username);
  const sigma = 50; // established
  const mu = displayRating + 2 * sigma;
  await dbRun(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, 'global', ?, ?, ?, ?, strftime('%s','now'))
     ON CONFLICT(user_id, domain) DO UPDATE SET mu=excluded.mu, sigma=excluded.sigma, display_rating=excluded.display_rating, sessions_count=excluded.sessions_count`,
    [uid, mu, sigma, displayRating, sessions]
  );
  return uid;
}

test('only Master+ placed players are apex, ordered by rating, with positions and a cutoff', async () => {
  const top = await registerUser(ctx.base);   // Grandmaster (≥2000)
  const mid = await registerUser(ctx.base);   // Master (1850–1999)
  const low = await registerUser(ctx.base);   // Gold — NOT apex
  await seedRating(top.username, 2100);
  await seedRating(mid.username, 1900);
  await seedRating(low.username, 1000);

  const res = await api(ctx.base, 'GET', '/api/rating/apex', { token: low.token });
  assert.equal(res.status, 200);
  const names = res.body.leaders.map((l) => l.username);
  assert.ok(names.includes(top.username) && names.includes(mid.username), 'both Master+ players are apex');
  assert.ok(!names.includes(low.username), 'a Gold player is not apex');
  // Ordered by rating, positions are 1..N.
  const iTop = res.body.leaders.findIndex((l) => l.username === top.username);
  const iMid = res.body.leaders.findIndex((l) => l.username === mid.username);
  assert.ok(iTop < iMid, 'higher rating ranks first');
  assert.equal(res.body.leaders[iTop].position, iTop + 1, 'positions are 1-indexed');
  assert.equal(res.body.cutoffRating, res.body.leaders[res.body.leaders.length - 1].displayRating, 'cutoff = lowest apex rating');
});

test('the requester learns their own apex standing (null when not apex)', async () => {
  const gm = await registerUser(ctx.base);
  await seedRating(gm.username, 2200);
  const mine = await api(ctx.base, 'GET', '/api/rating/apex', { token: gm.token });
  assert.ok(mine.body.you && mine.body.you.position >= 1, 'a Grandmaster sees their apex standing');

  const nobody = await registerUser(ctx.base); // no rating at all
  const theirs = await api(ctx.base, 'GET', '/api/rating/apex', { token: nobody.token });
  assert.equal(theirs.body.you, null, 'an unplaced player has no apex standing');
});

test('limit caps the apex list size', async () => {
  const u = await registerUser(ctx.base);
  await seedRating(u.username, 2050);
  const res = await api(ctx.base, 'GET', '/api/rating/apex?limit=1', { token: u.token });
  assert.ok(res.body.leaders.length <= 1, 'limit is honoured');
});
