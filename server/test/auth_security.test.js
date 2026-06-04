// Authentication-hardening tests: password hashing/strength (unit), TOTP (unit), and the
// integration surface — weak-password rejection, the email-code-leak fix, account lockout,
// and the full MFA challenge/verify + recovery-code login flow.
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { hashPassword, verifyPassword, needsRehash, validatePasswordStrength, usingArgon2 } = require('../lib/passwords');
const totp = require('../lib/totp');

// ---- Unit: password hashing ------------------------------------------------------
test('argon2id hash verifies and is the default algorithm', async () => {
  const hash = await hashPassword('a-Str0ng-Passphrase');
  assert.ok(hash.startsWith('$argon2'), 'new hashes should be argon2');
  assert.equal(usingArgon2, true);
  assert.equal(await verifyPassword(hash, 'a-Str0ng-Passphrase'), true);
  assert.equal(await verifyPassword(hash, 'wrong-password'), false);
});

test('legacy bcrypt hashes still verify and are flagged for rehash', async () => {
  const bcrypt = require('bcryptjs');
  const legacy = bcrypt.hashSync('a-Str0ng-Passphrase', 10);
  assert.equal(await verifyPassword(legacy, 'a-Str0ng-Passphrase'), true, 'must verify old bcrypt hashes');
  assert.equal(needsRehash(legacy), true, 'legacy bcrypt should be upgraded on next login');
  assert.equal(needsRehash(await hashPassword('x-Str0ng-Passphrase')), false, 'fresh argon2 needs no rehash');
});

test('a malformed/corrupt hash never throws — returns false', async () => {
  assert.equal(await verifyPassword('not-a-real-hash', 'whatever'), false);
  assert.equal(await verifyPassword(null, 'whatever'), false);
});

// ---- Unit: password strength -----------------------------------------------------
test('strength policy rejects short, common, and username-containing passwords', () => {
  assert.equal(validatePasswordStrength('short1', 'alice').ok, false, 'too short');
  assert.equal(validatePasswordStrength('password123', 'alice').ok, false, 'common blocklist');
  assert.equal(validatePasswordStrength('Password123', 'alice').ok, false, 'common is case-insensitive');
  assert.equal(validatePasswordStrength('alice-supersecret', 'alice').ok, false, 'contains username');
  assert.equal(validatePasswordStrength('Tr4ilblaze-Mathy', 'alice').ok, true, 'a strong unique password passes');
});

// ---- Unit: TOTP ------------------------------------------------------------------
test('TOTP round-trips and rejects a wrong code', () => {
  const secret = totp.generateSecret();
  const code = totp.generateToken(secret);
  assert.match(code, /^\d{6}$/);
  assert.equal(totp.verifyToken(code, secret), true);
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal(totp.verifyToken(wrong, secret), false);
  assert.ok(totp.buildOtpAuthUri(secret, 'alice').startsWith('otpauth://totp/'));
});

// ---- Integration -----------------------------------------------------------------
let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('registration rejects a weak/common password', async () => {
  const res = await api(ctx.base, 'POST', '/api/auth/register', {
    body: { username: 'weakpw_' + Date.now().toString(36).slice(-5), password: 'password123' },
  });
  assert.equal(res.status, 400);
  assert.match(JSON.stringify(res.body), /common|breach|predictable/i);
});

test('admin-only routes reject a normal user with 403 (role gate)', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/admin/security-logs', { token });
  assert.equal(res.status, 403);
  const rating = await api(ctx.base, 'GET', '/api/rating/analytics', { token });
  assert.equal(rating.status, 403);
});

test('email verification request does NOT leak the code in the response', async () => {
  const { token } = await registerUser(ctx.base);
  const res = await api(ctx.base, 'POST', '/api/user/change-email/request', {
    token,
    body: { email: 'someone@example.com' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.code, undefined, 'the verification code must never be returned to the client');
});

test('account lockout triggers after repeated failed logins for one account', async () => {
  const { username } = await registerUser(ctx.base);
  let sawLockout = false;
  for (let i = 0; i < 7; i++) {
    const res = await api(ctx.base, 'POST', '/api/auth/login', {
      body: { username, password: 'definitely-the-wrong-password' },
    });
    if (res.status === 429) { sawLockout = true; break; }
  }
  assert.ok(sawLockout, 'the account should be temporarily locked (429) after 5 failures');
});

test('full MFA flow: setup -> enable -> login challenge -> TOTP, then recovery code (single-use)', async () => {
  const { token, username, password } = await registerUser(ctx.base);

  // Setup + enable.
  const setup = await api(ctx.base, 'POST', '/api/auth/mfa/setup', { token, body: {} });
  assert.equal(setup.status, 200);
  assert.ok(setup.body.secret && setup.body.otpauthUri);

  const enable = await api(ctx.base, 'POST', '/api/auth/mfa/enable', {
    token,
    body: { token: totp.generateToken(setup.body.secret) },
  });
  assert.equal(enable.status, 200);
  assert.equal(enable.body.recoveryCodes.length, 10);
  const recoveryCode = enable.body.recoveryCodes[0];

  // Login now requires the second factor.
  const challengeRes = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password } });
  assert.equal(challengeRes.body.mfaRequired, true);
  assert.ok(challengeRes.body.challenge);
  assert.equal(challengeRes.body.token, undefined, 'no session token before MFA passes');

  // Wrong TOTP is rejected.
  const badMfa = await api(ctx.base, 'POST', '/api/auth/mfa/login', {
    body: { challenge: challengeRes.body.challenge, token: '000000' },
  });
  assert.equal(badMfa.status, 400);

  // Correct TOTP mints a session.
  const goodMfa = await api(ctx.base, 'POST', '/api/auth/mfa/login', {
    body: { challenge: challengeRes.body.challenge, token: totp.generateToken(setup.body.secret) },
  });
  assert.equal(goodMfa.status, 200);
  assert.ok(goodMfa.body.token, 'a real session token is issued after MFA');

  // Recovery code works once...
  const chal2 = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password } });
  const rec1 = await api(ctx.base, 'POST', '/api/auth/mfa/login', {
    body: { challenge: chal2.body.challenge, recoveryCode },
  });
  assert.equal(rec1.status, 200, 'first use of a recovery code succeeds');

  // ...and is single-use (reuse rejected).
  const chal3 = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password } });
  const rec2 = await api(ctx.base, 'POST', '/api/auth/mfa/login', {
    body: { challenge: chal3.body.challenge, recoveryCode },
  });
  assert.equal(rec2.status, 400, 'a consumed recovery code cannot be reused');
});
