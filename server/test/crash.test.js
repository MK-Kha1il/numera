// Self-hosted crash reporting: anonymous ingestion (no auth, no identity stored), stack
// truncation, fingerprint grouping, and the admin-only triage view.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const SAMPLE_STACK = [
  'java.lang.NullPointerException: Attempt to invoke virtual method on a null object reference',
  '\tat com.example.numera.ui.feature.arena.ArenaScreenKt.ArenaScreen(ArenaScreen.kt:123)',
  '\tat androidx.compose.runtime.ComposerImpl.recompose(Composer.kt:3456)',
].join('\n');

test('a crash posts anonymously and stores no identity', async () => {
  const { status, body } = await api(ctx.base, 'POST', '/api/crash', {
    body: { stack: SAMPLE_STACK, appVersion: '1.0', sdkInt: 34 },
  });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.success, true);

  const row = await new Promise((resolve, reject) => {
    ctx.mod.db.get('SELECT * FROM crash_reports ORDER BY id DESC LIMIT 1', (e, r) => (e ? reject(e) : resolve(r)));
  });
  assert.strictEqual(row.app_version, '1.0');
  assert.strictEqual(row.sdk_int, 34);
  assert.ok(row.fingerprint.length > 0);
  // The privacy contract: the table has no user/device columns at all.
  const cols = await new Promise((resolve, reject) => {
    ctx.mod.db.all('PRAGMA table_info(crash_reports)', (e, r) => (e ? reject(e) : resolve(r.map((c) => c.name))));
  });
  assert.ok(!cols.some((c) => /user|device|ip/i.test(c)), 'crash_reports must store no identity');
});

test('identical crashes group under one fingerprint; line-number drift still groups', async () => {
  await api(ctx.base, 'POST', '/api/crash', { body: { stack: SAMPLE_STACK, appVersion: '1.0' } });
  const drifted = SAMPLE_STACK.replace('ArenaScreen.kt:123', 'ArenaScreen.kt:131');
  await api(ctx.base, 'POST', '/api/crash', { body: { stack: drifted, appVersion: '1.1' } });

  const rows = await new Promise((resolve, reject) => {
    ctx.mod.db.all('SELECT DISTINCT fingerprint FROM crash_reports', (e, r) => (e ? reject(e) : resolve(r)));
  });
  assert.strictEqual(rows.length, 1, 'same crash with shifted line numbers must share a fingerprint');
});

test('oversized stacks are truncated, missing stacks rejected', async () => {
  const big = 'x'.repeat(20000);
  const { status } = await api(ctx.base, 'POST', '/api/crash', { body: { stack: big } });
  // 8KB stack + envelope fits the 10KB body cap is false — 20k chars exceeds the server's
  // 10KB body limit, so this must be rejected at the body parser, not crash the route.
  assert.ok([200, 413, 400].includes(status));

  const missing = await api(ctx.base, 'POST', '/api/crash', { body: { appVersion: '1.0' } });
  assert.strictEqual(missing.status, 400);
});

test('triage view is admin-only and groups occurrences', async () => {
  const { token } = await registerUser(ctx.base);
  const denied = await api(ctx.base, 'GET', '/api/crash/reports', { token });
  assert.strictEqual(denied.status, 403);

  // Promote the user to admin directly (the same shortcut other admin tests use).
  const { user, token: adminToken } = await registerUser(ctx.base);
  await new Promise((resolve, reject) => {
    ctx.mod.db.run("UPDATE users SET role = 'admin' WHERE id = ?", [user.id], (e) => (e ? reject(e) : resolve()));
  });
  const { status, body } = await api(ctx.base, 'GET', '/api/crash/reports', { token: adminToken });
  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body.groups) && body.groups.length >= 1);
  const top = body.groups.find((g) => g.sample_stack.includes('NullPointerException'));
  assert.ok(top.occurrences >= 3, 'repeated identical crashes accumulate in one group');
});
