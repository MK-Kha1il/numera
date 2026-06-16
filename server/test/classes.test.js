// School channel: class-code create/join + teacher roster with per-student progress.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));

test('a teacher creates a class and a student joins by code; the roster shows progress', async () => {
  const teacher = await registerUser(ctx.base);
  const student = await registerUser(ctx.base);
  await dbRun('UPDATE users SET level = 5, solved_count = 40 WHERE id = ?', [await idOf(student.username)]);
  await dbRun('UPDATE user_mastery SET decimals_correct = 22 WHERE user_id = ?', [await idOf(student.username)]);

  const created = await api(ctx.base, 'POST', '/api/classes', { token: teacher.token, body: { name: 'Period 3 Math' } });
  assert.equal(created.status, 200);
  assert.match(created.body.code, /^[A-Z2-9]{6}$/);

  const joined = await api(ctx.base, 'POST', '/api/classes/join', { token: student.token, body: { code: created.body.code.toLowerCase() } });
  assert.equal(joined.status, 200, JSON.stringify(joined.body));
  assert.equal(joined.body.id, created.body.id);

  // Teacher sees it under "teaching" with a member; student sees it under "joined".
  const tMine = await api(ctx.base, 'GET', '/api/classes/mine', { token: teacher.token });
  assert.equal(tMine.body.teaching[0].memberCount, 1);
  const sMine = await api(ctx.base, 'GET', '/api/classes/mine', { token: student.token });
  assert.equal(sMine.body.joined[0].name, 'Period 3 Math');

  const roster = await api(ctx.base, 'GET', `/api/classes/${created.body.id}/roster`, { token: teacher.token });
  assert.equal(roster.status, 200);
  assert.equal(roster.body.members.length, 1);
  assert.equal(roster.body.members[0].level, 5);
  assert.equal(roster.body.members[0].topStrength, 'Decimals');
});

test('joining is idempotent and a bad code 404s', async () => {
  const teacher = await registerUser(ctx.base);
  const student = await registerUser(ctx.base);
  const created = await api(ctx.base, 'POST', '/api/classes', { token: teacher.token, body: { name: 'Algebra I' } });

  await api(ctx.base, 'POST', '/api/classes/join', { token: student.token, body: { code: created.body.code } });
  await api(ctx.base, 'POST', '/api/classes/join', { token: student.token, body: { code: created.body.code } });
  const roster = await api(ctx.base, 'GET', `/api/classes/${created.body.id}/roster`, { token: teacher.token });
  assert.equal(roster.body.members.length, 1, 'no duplicate membership');

  const bad = await api(ctx.base, 'POST', '/api/classes/join', { token: student.token, body: { code: 'ZZZZZZ' } });
  assert.equal(bad.status, 404);
});

test('only the owning teacher can view the roster', async () => {
  const teacher = await registerUser(ctx.base);
  const outsider = await registerUser(ctx.base);
  const created = await api(ctx.base, 'POST', '/api/classes', { token: teacher.token, body: { name: 'Geometry' } });

  const denied = await api(ctx.base, 'GET', `/api/classes/${created.body.id}/roster`, { token: outsider.token });
  assert.equal(denied.status, 403);
});

test('creating a class requires a name', async () => {
  const teacher = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/classes', { token: teacher.token, body: { name: '   ' } });
  assert.equal(r.status, 400);
});
