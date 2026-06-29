// Competitive onboarding (audit #20): the user object carries placement state (competitive_matches)
// + competitive_rank + a one-time rank_revealed flag, and POST /api/rating/reveal-seen flips it so the
// placement rank-reveal ceremony fires exactly once.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('a new player is unplaced and not yet revealed', async () => {
  const u = await registerUser(ctx.base);
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.competitive_matches, 0, 'no rated games yet');
  assert.equal(me.body.rank_revealed, 0, 'reveal has not fired');
  assert.ok(String(me.body.competitive_rank).startsWith('Unranked'), 'unplaced rank label');
});

test('reveal-seen flips the one-time flag', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  // Simulate finishing placement: 5 rated games on the global mirror.
  await dbRun('UPDATE users SET competitive_matches = 5, competitive_rank = ? WHERE id = ?', ['Gold II', uid]);

  let me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.body.competitive_matches, 5);
  assert.equal(me.body.rank_revealed, 0, 'placed but reveal not yet seen → ceremony is due');
  assert.equal(me.body.competitive_rank, 'Gold II');

  const seen = await api(ctx.base, 'POST', '/api/rating/reveal-seen', { token: u.token });
  assert.equal(seen.status, 200);

  me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.body.rank_revealed, 1, 'the reveal fires exactly once');
});
