// In-app Help & Support channel: the Settings "Contact Support" / "Report a Bug" / "Request a
// Feature" dialogs now persist a real ticket (they previously faked a success toast). Covers
// auth, kind validation, body requirement, persistence, and the admin triage queue + resolve.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
let user;
before(async () => {
  ctx = await bootServer();
  user = await registerUser(ctx.base);
});
after(async () => { await shutdown(ctx); });

test('feedback requires auth', async () => {
  const { status } = await api(ctx.base, 'POST', '/api/feedback', {
    body: { kind: 'support', body: 'hello' },
  });
  assert.strictEqual(status, 401);
});

test('a support ticket is accepted and persisted', async () => {
  const { status, body } = await api(ctx.base, 'POST', '/api/feedback', {
    token: user.token,
    body: { kind: 'support', subject: 'Cannot equip banner', body: 'My champion banner is missing.', appVersion: '1.0' },
  });
  assert.strictEqual(status, 201);
  assert.strictEqual(body.success, true);
  assert.ok(body.id > 0);

  const row = await new Promise((resolve, reject) => {
    ctx.mod.db.get('SELECT * FROM user_feedback WHERE id = ?', [body.id], (e, r) => (e ? reject(e) : resolve(r)));
  });
  assert.strictEqual(row.kind, 'support');
  assert.strictEqual(row.subject, 'Cannot equip banner');
  assert.strictEqual(row.status, 'open');
  assert.ok(row.user_id > 0, 'ticket is attributed to the submitter');
});

test('bug and feature kinds are accepted; unknown kinds and empty bodies rejected', async () => {
  for (const kind of ['bug', 'feature']) {
    const { status } = await api(ctx.base, 'POST', '/api/feedback', {
      token: user.token,
      body: { kind, body: `a ${kind} report` },
    });
    assert.strictEqual(status, 201, `${kind} should be accepted`);
  }
  const badKind = await api(ctx.base, 'POST', '/api/feedback', {
    token: user.token, body: { kind: 'spam', body: 'x' },
  });
  assert.strictEqual(badKind.status, 400);

  const emptyBody = await api(ctx.base, 'POST', '/api/feedback', {
    token: user.token, body: { kind: 'support', body: '   ' },
  });
  assert.strictEqual(emptyBody.status, 400);
});

test('non-admins cannot read the triage queue; admins can, and can resolve', async () => {
  const forbidden = await api(ctx.base, 'GET', '/api/admin/feedback', { token: user.token });
  assert.ok([401, 403].includes(forbidden.status), 'a normal user must not read the admin queue');

  // Promote a fresh user to admin in the DB. requireAdmin reads the role from the DB (not the
  // JWT), so the existing token is enough — no re-login needed.
  const admin = await registerUser(ctx.base);
  await new Promise((resolve, reject) => {
    ctx.mod.db.run("UPDATE users SET role = 'admin' WHERE username = ?", [admin.username], (e) => (e ? reject(e) : resolve()));
  });
  const adminToken = admin.token;

  const queue = await api(ctx.base, 'GET', '/api/admin/feedback', { token: adminToken });
  assert.strictEqual(queue.status, 200);
  assert.ok(Array.isArray(queue.body) && queue.body.length >= 1);

  const target = queue.body[0];
  const resolved = await api(ctx.base, 'POST', `/api/admin/feedback/${target.id}/resolve`, {
    token: adminToken, body: { status: 'resolved' },
  });
  assert.strictEqual(resolved.status, 200);

  const row = await new Promise((resolve, reject) => {
    ctx.mod.db.get('SELECT status FROM user_feedback WHERE id = ?', [target.id], (e, r) => (e ? reject(e) : resolve(r)));
  });
  assert.strictEqual(row.status, 'resolved');
});
