// Password-reset + email-verification flow: generic (non-enumerating) request responses, and a
// full round-trip — set an email, request a reset, reset with the emailed code, log in with the
// new password, and confirm the code is single-use. Codes are read from the mailer's in-process
// outbox (never returned over HTTP).
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { sentMessages } = require('../services/mailer');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

// Pulls the indented 6-8 char code out of the latest email to `to` whose subject matches.
function lastCode(to, subjectIncludes) {
  const msg = [...sentMessages].reverse().find((m) => m.to === to && m.subject.includes(subjectIncludes));
  if (!msg) return null;
  const line = msg.text.split('\n').map((l) => l.trim()).find((l) => /^[A-Z0-9]{6,8}$/.test(l));
  return line || null;
}

async function giveUserEmail(token, email) {
  await api(ctx.base, 'POST', '/api/user/change-email/request', { token, body: { email } });
  const code = lastCode(email, 'Verify');
  const res = await api(ctx.base, 'POST', '/api/user/change-email/verify', { token, body: { code } });
  assert.equal(res.status, 200, 'email verification should succeed');
}

test('forgot-password gives an identical generic response whether or not the account exists', async () => {
  const { username } = await registerUser(ctx.base); // no email on file
  const real = await api(ctx.base, 'POST', '/api/auth/forgot-password', { body: { username } });
  const fake = await api(ctx.base, 'POST', '/api/auth/forgot-password', { body: { username: 'nobody_' + Date.now().toString(36) } });
  assert.equal(real.status, 200);
  assert.equal(fake.status, 200);
  assert.equal(real.body.message, fake.body.message, 'responses must be indistinguishable (no enumeration)');
});

test('full reset: request -> reset with emailed code -> login with new password; code is single-use', async () => {
  const { token, username } = await registerUser(ctx.base);
  const email = `reset_${Date.now().toString(36)}@example.com`;
  await giveUserEmail(token, email);

  // Request a reset; a code is emailed.
  await api(ctx.base, 'POST', '/api/auth/forgot-password', { body: { username } });
  const code = lastCode(email, 'reset');
  assert.ok(code, 'a reset code should have been emailed');

  const NEW = 'Reset-Str0ng-Pass';

  // Wrong code is rejected generically (and counts as an attempt).
  const bad = await api(ctx.base, 'POST', '/api/auth/reset-password', {
    body: { username, code: 'WRONGXYZ', newPassword: NEW },
  });
  assert.equal(bad.status, 400);

  // A weak new password is rejected BEFORE the code is consumed.
  const weak = await api(ctx.base, 'POST', '/api/auth/reset-password', {
    body: { username, code, newPassword: 'password123' },
  });
  assert.equal(weak.status, 400);

  // Correct code + strong password resets.
  const ok = await api(ctx.base, 'POST', '/api/auth/reset-password', {
    body: { username, code, newPassword: NEW },
  });
  assert.equal(ok.status, 200);

  // The new password works...
  const login = await api(ctx.base, 'POST', '/api/auth/login', { body: { username, password: NEW } });
  assert.ok(login.body.token, 'login with the new password should issue a session');

  // ...and the reset code cannot be reused.
  const reuse = await api(ctx.base, 'POST', '/api/auth/reset-password', {
    body: { username, code, newPassword: 'Another-Str0ng-9' },
  });
  assert.equal(reuse.status, 400, 'a consumed reset code must not work again');
});
