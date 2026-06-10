// FCM push pipeline: device-token registration endpoints + the credential-gated sender. With no
// FCM_SERVICE_ACCOUNT configured (the test/dev default), push is a safe no-op so nothing breaks.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const pushSender = require('../services/pushSender');
const { notify } = require('../services/notificationService');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbAll = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('push is disabled and a safe no-op when FCM is not configured', async () => {
  assert.equal(pushSender.isPushConfigured(), false, 'no FCM_SERVICE_ACCOUNT in test env');
  const sent = await pushSender.sendPushToUser(1, { title: 'x', body: 'y' });
  assert.equal(sent, 0, 'sends nothing without credentials');
});

test('a device token can be registered (idempotently), validated, and cleared', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);

  const reg = await api(ctx.base, 'POST', '/api/notifications/push-token', { token: u.token, body: { token: 'devtok-123', platform: 'android' } });
  assert.equal(reg.status, 200);
  assert.equal((await dbAll('SELECT token FROM push_tokens WHERE user_id = ?', [userId])).length, 1);

  // Re-registering the same token does not duplicate.
  await api(ctx.base, 'POST', '/api/notifications/push-token', { token: u.token, body: { token: 'devtok-123', platform: 'android' } });
  assert.equal((await dbAll('SELECT token FROM push_tokens WHERE user_id = ?', [userId])).length, 1);

  // Missing token is rejected.
  const bad = await api(ctx.base, 'POST', '/api/notifications/push-token', { token: u.token, body: {} });
  assert.equal(bad.status, 400);

  // Clearing removes it.
  const del = await api(ctx.base, 'DELETE', '/api/notifications/push-token', { token: u.token, body: {} });
  assert.equal(del.status, 200);
  assert.equal((await dbAll('SELECT token FROM push_tokens WHERE user_id = ?', [userId])).length, 0);
});

test('notify() with a push channel stays safe (no throw) and still writes in-app', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  await dbRun('INSERT INTO push_tokens (user_id, token, platform, created_at) VALUES (?,?,?,?)', [userId, 'devtok-xyz', 'android', 1]);
  await dbRun('INSERT INTO notification_preferences (user_id, push_enabled, updated_at) VALUES (?,1,1)', [userId]);

  await notify(userId, { title: 'Hello', message: 'Body', type: 'info', channels: ['inapp', 'push'] });

  const notes = await dbAll('SELECT id FROM user_notifications WHERE user_id = ?', [userId]);
  assert.ok(notes.length >= 1, 'in-app still delivered even though push is a no-op');
});
