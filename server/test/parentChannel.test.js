// Parent channel: a learner-set guardian email + a plain-language progress report they can preview
// and send (ultra review #51/#78). The mailer's log transport records would-be sends for assertion.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { sentMessages } = require('../services/mailer');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));

test('the progress report is built in plain concept language from real data', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await dbRun('UPDATE users SET level = 7, streak = 4, solved_count = 120 WHERE id = ?', [id]);
  await dbRun('UPDATE user_mastery SET fractions_correct = 30, algebra_correct = 12 WHERE user_id = ?', [id]);

  const r = await api(ctx.base, 'GET', '/api/account/progress-report', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.report.level, 7);
  assert.equal(r.body.report.totalSolved, 120);
  // Strengths are ordered by practice and use friendly labels.
  assert.equal(r.body.report.strengths[0].label, 'Fractions');
  assert.equal(r.body.report.strengths[0].solved, 30);
  assert.equal(r.body.guardianEmail, '');
});

test('setting a guardian email validates and persists; empty clears it', async () => {
  const u = await registerUser(ctx.base);
  const bad = await api(ctx.base, 'POST', '/api/account/guardian', { token: u.token, body: { email: 'not-an-email' } });
  assert.equal(bad.status, 400);

  const ok = await api(ctx.base, 'POST', '/api/account/guardian', { token: u.token, body: { email: 'Parent@Example.com' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.sharing, true);
  const preview = await api(ctx.base, 'GET', '/api/account/progress-report', { token: u.token });
  assert.equal(preview.body.guardianEmail, 'parent@example.com'); // normalized lower-case

  const cleared = await api(ctx.base, 'POST', '/api/account/guardian', { token: u.token, body: { email: '' } });
  assert.equal(cleared.body.sharing, false);
});

test('sending requires a guardian email and then delivers the report', async () => {
  const u = await registerUser(ctx.base);
  const noGuardian = await api(ctx.base, 'POST', '/api/account/progress-report/send', { token: u.token });
  assert.equal(noGuardian.status, 400);

  await api(ctx.base, 'POST', '/api/account/guardian', { token: u.token, body: { email: 'guardian@example.com' } });
  const sent = await api(ctx.base, 'POST', '/api/account/progress-report/send', { token: u.token });
  assert.equal(sent.status, 200);

  const msg = sentMessages.find((m) => m.to === 'guardian@example.com');
  assert.ok(msg, 'an email was queued to the guardian');
  assert.ok(/progress on Numera/i.test(msg.subject));
  assert.ok(/problems solved/i.test(msg.text), 'the body reads in plain language');
});
