// End-to-end smoke tests over the real route stack. These are the safety net that guards
// the server.js -> routers refactor (Phase 1a): if a route stops being reachable or its
// auth/response contract changes, one of these fails.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('register -> returns token and user', async () => {
  const { token, user } = await registerUser(ctx.base);
  assert.ok(token, 'token present');
  assert.ok(user && user.username, 'user present');
});

test('login with correct credentials succeeds; wrong password is rejected', async () => {
  const { username, password } = await registerUser(ctx.base);

  const ok = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password } });
  assert.strictEqual(ok.status, 200);
  assert.ok(ok.body.token);

  const bad = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password: 'wrongwrong1' } });
  assert.strictEqual(bad.status, 400);
});

test('GET /api/auth/me requires a valid token', async () => {
  const { token, username } = await registerUser(ctx.base);

  const noAuth = await api(ctx.base, 'GET', '/api/auth/me');
  assert.strictEqual(noAuth.status, 401);

  const badAuth = await api(ctx.base, 'GET', '/api/auth/me', { token: 'garbage.token.value' });
  assert.strictEqual(badAuth.status, 403);

  const me = await api(ctx.base, 'GET', '/api/auth/me', { token });
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user ? me.body.user.username : me.body.username, username);
});

test('GET /api/math/problems returns problems for an authed user', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/math/problems?level=1', { token });
  assert.strictEqual(res.status, 200);
});

test('GET /api/shop responds for an authed user', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/shop', { token });
  assert.strictEqual(res.status, 200);
});

test('GET /api/leaderboard responds for an authed user', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/leaderboard', { token });
  assert.strictEqual(res.status, 200);
});

test('idempotency: same Idempotency-Key replays the identical response', async () => {
  const { token } = await registerUser(ctx.base);
  const key = require('crypto').randomUUID();
  const opts = { token, headers: { 'Idempotency-Key': key }, body: {} };

  // Regardless of business outcome, the second call with the same key must replay byte-for-byte.
  const first = await api(ctx.base, 'POST', '/api/quests/claim', opts);
  const second = await api(ctx.base, 'POST', '/api/quests/claim', opts);
  assert.strictEqual(first.status, second.status, 'replayed status matches');
  assert.deepStrictEqual(first.body, second.body, 'replayed body matches');
});
