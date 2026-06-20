// Competitive titles (Phase 2 identity): an earned-on-the-fly title set (from rank/duels/reasoning/
// head-to-head); the player may select any earned title, and unearned ones are rejected server-side.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('a fresh player has Novice earned but not the milestone titles', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/rating/titles', { token: u.token });
  assert.equal(res.status, 200);
  assert.equal(res.body.active, '', 'no title set initially');
  const byId = Object.fromEntries(res.body.titles.map((t) => [t.id, t]));
  assert.equal(byId.novice.earned, true, 'Novice is always earned');
  assert.equal(byId.duelist.earned, false, 'Duelist needs 10 duels');
  assert.equal(byId.numerist.earned, false, 'Numerist needs Grandmaster');
});

test('selecting an earned title sets it; an unearned title is rejected', async () => {
  const u = await registerUser(ctx.base);

  const ok = await api(ctx.base, 'POST', '/api/rating/titles/select', { token: u.token, body: { title: 'novice' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.active, 'novice');

  const after = await api(ctx.base, 'GET', '/api/rating/titles', { token: u.token });
  assert.equal(after.body.active, 'novice', 'the chosen title persists');
  assert.equal(after.body.titles.find((t) => t.id === 'novice').active, true);

  const denied = await api(ctx.base, 'POST', '/api/rating/titles/select', { token: u.token, body: { title: 'numerist' } });
  assert.equal(denied.status, 400, "can't equip an unearned title");

  const cleared = await api(ctx.base, 'POST', '/api/rating/titles/select', { token: u.token, body: { title: '' } });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.active, '', 'a title can be cleared');
});

test('public profile exposes competitive rank + the active title name (prestige is visible to others)', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await dbRun("UPDATE users SET competitive_rank = 'Gold I', active_title = 'numerist' WHERE id = ?", [uid]);

  const res = await api(ctx.base, 'GET', `/api/user/${uid}`, { token: u.token });
  assert.equal(res.status, 200);
  assert.equal(res.body.competitive_rank, 'Gold I', 'competitive rank is shown');
  assert.equal(res.body.active_title, 'Numerist', 'the stored title id resolves to its display name');
});
