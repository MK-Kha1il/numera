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

test('extracted routers are mounted (notifications, srs, library)', async () => {
  const { token } = await registerUser(ctx.base);
  for (const route of [
    '/api/notifications',
    '/api/math/srs/due',
    '/api/favorites',
    '/api/collections',
    '/api/mistakes',
    '/api/leaderboard',
    '/api/achievements',
    '/api/friends',
  ]) {
    const res = await api(ctx.base, 'GET', route, { token });
    assert.strictEqual(res.status, 200, `${route} should respond 200`);
    assert.ok(Array.isArray(res.body), `${route} should return an array`);
  }
});

test('account routes are reachable (not shadowed by /api/user/:userId)', async () => {
  const { token } = await registerUser(ctx.base);
  // These GETs share the /api/user/* prefix with the :userId param route; the account
  // router must be matched first so they are not rejected as an "invalid user ID".
  for (const route of ['/api/user/sessions', '/api/user/security-logs']) {
    const res = await api(ctx.base, 'GET', route, { token });
    assert.strictEqual(res.status, 200, `${route} should respond 200, not be shadowed`);
    assert.ok(Array.isArray(res.body), `${route} returns an array`);
  }
});

test('archive search supplement returns a spread of distinct titles (no all-identical wall)', async () => {
  const { token } = await registerUser(ctx.base);
  // Unfiltered search (the command-palette path) appends procedurally-generated exercises.
  // They must vary in title — historically all 10 shared one title, which crashed the client
  // command palette via duplicate list keys.
  const res = await api(ctx.base, 'GET', '/api/archive/search?q=zzzznomatch&limit=1', { token });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body), 'search returns an array');
  const titles = res.body.map((r) => r.title).filter(Boolean);
  const distinct = new Set(titles);
  assert.ok(titles.length >= 5, 'generated supplement present');
  assert.ok(distinct.size >= 5, `expected diverse titles, got ${distinct.size} distinct of ${titles.length}`);
});

test('engine event returns a multi-dimensional mastery breakdown', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'POST', '/api/engine/event', {
    token,
    body: { conceptId: 'arithmetic_add', correct: true, responseMs: 3000 },
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.masteryProfile, 'masteryProfile present in event response');
  const dims = res.body.masteryProfile.dimensions;
  for (const k of ['accuracy', 'fluency', 'retention', 'independence']) {
    assert.strictEqual(typeof dims[k], 'number', `dimension ${k} present and numeric`);
  }
  assert.ok(typeof res.body.masteryProfile.stage === 'string', 'stage label present');
});

test('transfer challenge serves a novel-context problem and records the out-of-context outcome', async () => {
  const { token } = await registerUser(ctx.base);

  const challenge = await api(ctx.base, 'GET', '/api/math/transfer/challenge', { token });
  assert.strictEqual(challenge.status, 200);
  assert.ok(challenge.body.conceptId, 'challenge has a conceptId');
  assert.ok(challenge.body.problem && challenge.body.problem.question, 'challenge has a problem');
  assert.ok(Array.isArray(challenge.body.problem.options), 'problem has options');
  assert.strictEqual(challenge.body.problem.isTransfer, true);

  // Recording a transfer result activates the transfer dimension in the mastery breakdown.
  const result = await api(ctx.base, 'POST', '/api/math/transfer/result', {
    token,
    body: { conceptId: challenge.body.conceptId, correct: true },
  });
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.masteryProfile.transferActive, true);
  assert.strictEqual(typeof result.body.masteryProfile.dimensions.transfer, 'number');
});

test('daily puzzle endpoint responds with a puzzle', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/math/daily-puzzle', { token });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body && res.body.question, 'puzzle has a question');
});

test('commitment status responds for an authed user', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/commitment/status', { token });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body && typeof res.body.commitmentState === 'string', 'has commitmentState');
});

test('GET /api/user/:id honors the profile_private setting (authz/privacy)', async () => {
  const alice = await registerUser(ctx.base);
  const bob = await registerUser(ctx.base);

  // By default Bob can view Alice's public profile.
  const open = await api(ctx.base, 'GET', `/api/user/${alice.user.id}`, { token: bob.token });
  assert.strictEqual(open.status, 200);
  assert.strictEqual(open.body.username, alice.username);

  // Alice opts into a private profile.
  const setPriv = await api(ctx.base, 'POST', '/api/user/privacy', {
    token: alice.token,
    body: { telemetryEnabled: true, profilePrivate: true },
  });
  assert.strictEqual(setPriv.status, 200);

  // Now another user is blocked with 403 + { private: true }...
  const blocked = await api(ctx.base, 'GET', `/api/user/${alice.user.id}`, { token: bob.token });
  assert.strictEqual(blocked.status, 403, 'private profile is hidden from others');
  assert.strictEqual(blocked.body.private, true);

  // ...but Alice can always view her own profile.
  const own = await api(ctx.base, 'GET', `/api/user/${alice.user.id}`, { token: alice.token });
  assert.strictEqual(own.status, 200, 'owner can always view their own profile');
  assert.strictEqual(own.body.username, alice.username);
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
