// Refresh-token rotation: login issues an access + refresh token; /api/auth/refresh rotates the
// refresh token (single-use) and mints a fresh access token; reusing a consumed refresh token is
// detected as theft and revokes the whole session.
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('login issues an access token and a refresh token', async () => {
  const reg = await registerUser(ctx.base);
  assert.ok(reg.token, 'access token (token alias) present');
  assert.ok(reg.accessToken, 'accessToken present');
  assert.ok(reg.refreshToken, 'refreshToken present');
});

test('refresh rotates the token and the new access token authenticates', async () => {
  const reg = await registerUser(ctx.base);

  const refreshed = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: reg.refreshToken } });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.accessToken && refreshed.body.refreshToken);
  assert.notEqual(refreshed.body.refreshToken, reg.refreshToken, 'refresh token must rotate');

  // The freshly-minted access token works on an authed route.
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: refreshed.body.accessToken });
  assert.equal(me.status, 200);
});

test('reusing a consumed refresh token is detected and revokes the session', async () => {
  const reg = await registerUser(ctx.base);

  const first = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: reg.refreshToken } });
  assert.equal(first.status, 200);
  const rotated = first.body.refreshToken;

  // Present the already-consumed original token again -> reuse detected.
  const reuse = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: reg.refreshToken } });
  assert.equal(reuse.status, 401);

  // The reuse revoked the whole session, so even the legitimately-rotated token is now dead.
  const after = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: rotated } });
  assert.equal(after.status, 401, 'session revoked on reuse — rotated token no longer valid');
});

test('an invalid refresh token is rejected', async () => {
  const res = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: 'not-a-real-token' } });
  assert.equal(res.status, 401);
});
