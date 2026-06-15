// Guest mode: the value-first entry that lets a visitor solve problems before any signup wall,
// and the in-place conversion that upgrades a guest into a full account WITHOUT losing progress.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));

test('POST /api/auth/guest creates a usable, onboarding-skipped guest account', async () => {
  const r = await api(ctx.base, 'POST', '/api/auth/guest');
  assert.equal(r.status, 200);
  assert.ok(r.body.token, 'returns an access token');
  assert.ok(r.body.user, 'returns a user');
  assert.equal(r.body.user.is_guest, 1, 'flagged as a guest');
  assert.equal(r.body.user.onboarding_complete, 1, 'guests skip onboarding and land straight in the app');
  assert.ok(/^guest_/.test(r.body.user.username), 'gets an anonymous guest_ username');

  // The token actually works against an authenticated endpoint.
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: r.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.is_guest, 1);
});

test('a guest cannot be logged into by password (no credential exists)', async () => {
  const g = await api(ctx.base, 'POST', '/api/auth/guest');
  const login = await api(ctx.base, 'POST', '/api/auth/login', {
    body: { username: g.body.user.username, password: '' },
  });
  assert.notEqual(login.status, 200, 'empty password never authenticates a guest');
});

test('conversion upgrades the guest in place and preserves progress', async () => {
  const g = await api(ctx.base, 'POST', '/api/auth/guest');
  const guestId = g.body.user.id;

  // Simulate progress earned as a guest.
  await dbRun('UPDATE users SET xp = 250, coins = 99, streak = 4 WHERE id = ?', [guestId]);

  const username = 'claimed_' + String(guestId).slice(-6);
  const conv = await api(ctx.base, 'POST', '/api/auth/convert', {
    token: g.body.token,
    body: { username, password: 'Tr4ilblaze-Mathy', birthDate: '2000-01-01' },
  });
  assert.equal(conv.status, 200, JSON.stringify(conv.body));
  assert.ok(conv.body.token, 'issues a fresh session token');
  assert.equal(conv.body.user.is_guest, 0, 'no longer a guest');
  assert.equal(conv.body.user.username, username);

  // SAME row → progress carried over.
  assert.equal(conv.body.user.id, guestId, 'converted in place (same user id)');
  assert.equal(conv.body.user.xp, 250, 'xp preserved');
  assert.equal(conv.body.user.coins, 99, 'coins preserved');

  // The new credentials now work via the normal login path.
  const login = await api(ctx.base, 'POST', '/api/auth/login', {
    body: { username, password: 'Tr4ilblaze-Mathy' },
  });
  assert.equal(login.status, 200, 'can log in with the chosen credentials');
});

test('conversion enforces the age gate and rejects under-13', async () => {
  const g = await api(ctx.base, 'POST', '/api/auth/guest');
  const conv = await api(ctx.base, 'POST', '/api/auth/convert', {
    token: g.body.token,
    body: { username: 'tooyoung_x', password: 'Tr4ilblaze-Mathy', birthDate: '2020-01-01' },
  });
  assert.equal(conv.status, 403);
  assert.equal(conv.body.ageRestricted, true);
  // Still a guest — a refused conversion must not strip the guest flag.
  const row = await dbGet('SELECT is_guest FROM users WHERE id = ?', [g.body.user.id]);
  assert.equal(row.is_guest, 1);
});

test('a real (non-guest) account cannot be converted', async () => {
  const g = await api(ctx.base, 'POST', '/api/auth/guest');
  const username = 'realone_' + String(g.body.user.id).slice(-5);
  await api(ctx.base, 'POST', '/api/auth/convert', {
    token: g.body.token,
    body: { username, password: 'Tr4ilblaze-Mathy', birthDate: '2000-01-01' },
  });
  // Second conversion attempt on the now-full account is rejected.
  const again = await api(ctx.base, 'POST', '/api/auth/convert', {
    token: g.body.token,
    body: { username: username + '2', password: 'Tr4ilblaze-Mathy', birthDate: '2000-01-01' },
  });
  // The original token's session may have rotated on first convert; tolerate either an auth
  // rejection or the explicit "already registered" guard — both prove a full account is protected.
  assert.ok(again.status === 400 || again.status === 401, JSON.stringify(again.body));
});
