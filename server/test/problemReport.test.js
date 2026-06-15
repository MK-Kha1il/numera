// Content-quality feedback loop: a learner flags a generated exercise; admins triage it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));

test('a learner can report a problem and it lands in the queue', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/math/report', {
    token: u.token,
    body: { question: '2 + 2 = ?', correctAnswer: '4', category: 'arithmetic', level: 3, gameMode: 'level', reason: 'wrong_answer', note: 'options are off' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
});

test('report rejects a missing question or an invalid reason', async () => {
  const u = await registerUser(ctx.base);
  const noQ = await api(ctx.base, 'POST', '/api/math/report', { token: u.token, body: { reason: 'typo' } });
  assert.equal(noQ.status, 400);
  const badReason = await api(ctx.base, 'POST', '/api/math/report', { token: u.token, body: { question: 'x', reason: 'banana' } });
  assert.equal(badReason.status, 400);
});

test('the report queue is admin-only and supports resolve', async () => {
  const normal = await registerUser(ctx.base);
  await api(ctx.base, 'POST', '/api/math/report', {
    token: normal.token,
    body: { question: '5 * 5 = ?', reason: 'confusing' },
  });

  const denied = await api(ctx.base, 'GET', '/api/math/reports', { token: normal.token });
  assert.equal(denied.status, 403, 'non-admins are denied');

  const admin = await registerUser(ctx.base);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [await idOf(admin.username)]);

  const list = await api(ctx.base, 'GET', '/api/math/reports', { token: admin.token });
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.body.reports));
  assert.ok(list.body.reports.length >= 1, 'the report is in the queue');
  assert.ok(Array.isArray(list.body.openByReason), 'per-reason tally present');

  const target = list.body.reports[0];
  const resolved = await api(ctx.base, 'POST', `/api/math/reports/${target.id}/resolve`, {
    token: admin.token,
    body: { status: 'resolved' },
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.status, 'resolved');
});
