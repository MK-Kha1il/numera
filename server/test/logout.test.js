// Logout revokes the server session (stateful JWT: a revoked session kills its access token and
// every refresh token), by access token or — for a client whose access token already expired — by
// refresh token alone. Before this, the Android client only forgot its tokens locally.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('logout with the access token kills the session and its refresh token', async () => {
  const u = await registerUser(ctx.base);
  assert.ok(u.refreshToken, 'register issues a refresh token');
  const out = await api(ctx.base, 'POST', '/api/auth/logout', { token: u.token });
  assert.equal(out.status, 200);

  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.status, 401, 'the access token is dead');
  const refresh = await api(ctx.base, 'POST', '/api/auth/refresh', { body: { refreshToken: u.refreshToken } });
  assert.equal(refresh.status, 401, 'so is the refresh token');
});

test('logout by refresh token alone (no auth header) revokes the session', async () => {
  const u = await registerUser(ctx.base);
  const out = await api(ctx.base, 'POST', '/api/auth/logout', { body: { refreshToken: u.refreshToken } });
  assert.equal(out.status, 200);
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.status, 401);
});

test('logout is idempotent for an unknown refresh token, and needs some credential', async () => {
  const unknown = await api(ctx.base, 'POST', '/api/auth/logout', { body: { refreshToken: 'not-a-real-token' } });
  assert.equal(unknown.status, 200);
  const none = await api(ctx.base, 'POST', '/api/auth/logout', {});
  assert.equal(none.status, 401);
});

test('logging out one device leaves the other sessions alive', async () => {
  const u = await registerUser(ctx.base);
  const second = await api(ctx.base, 'POST', '/api/auth/login', { body: { username: u.username, password: u.password } });
  assert.equal(second.status, 200);
  await api(ctx.base, 'POST', '/api/auth/logout', { body: { refreshToken: u.refreshToken } });
  const other = await api(ctx.base, 'GET', '/api/auth/me', { token: second.body.token });
  assert.equal(other.status, 200, 'the other device stays signed in');
});
