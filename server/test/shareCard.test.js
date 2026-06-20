// Shareable rank card (competitive audit #22 — the viral loop / reach gap). The server composes the
// boast text so the rank can't be spoofed client-side and the copy stays consistent.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('an unplaced player gets a "come compete" card with no spoofable rank', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/rating/share-card', { token: u.token });
  assert.equal(res.status, 200);
  assert.equal(res.body.placed, false);
  assert.equal(res.body.rank, null, 'no rank advertised before placement');
  assert.ok(/Numera/.test(res.body.text), 'the share text mentions the app');
});

test('a placed player gets a boast card naming their rank + rating', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  // Seed a placed global rating (display 1900 → Master).
  await dbRun(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, 'global', 2000, 50, 1900, 30, strftime('%s','now'))
     ON CONFLICT(user_id, domain) DO UPDATE SET mu=excluded.mu, sigma=excluded.sigma, display_rating=excluded.display_rating, sessions_count=excluded.sessions_count`,
    [uid]
  );
  const res = await api(ctx.base, 'GET', '/api/rating/share-card', { token: u.token });
  assert.equal(res.body.placed, true);
  assert.equal(res.body.rank, 'Master');
  assert.equal(res.body.displayRating, 1900);
  assert.ok(res.body.text.includes('Master') && res.body.text.includes('1900'), 'the boast names the rank + rating');
});
