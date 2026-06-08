// Clubs: create (auto-join, name validation/uniqueness, one-club rule), browse with counts,
// join/leave, member ranking, and auto-delete of an emptied club.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const uniqueName = () => `Mathletes ${Math.random().toString(36).slice(2, 8)}`;

test('create a club: creator auto-joins as owner and shows in their "mine"', async () => {
  const u = await registerUser(ctx.base);
  const name = uniqueName();
  const create = await api(ctx.base, 'POST', '/api/clubs', { token: u.token, body: { name, description: 'We love math' } });
  assert.equal(create.status, 201);

  const mine = await api(ctx.base, 'GET', '/api/clubs/mine', { token: u.token });
  assert.ok(mine.body.club, 'in a club now');
  assert.equal(mine.body.club.name, name);
  assert.equal(mine.body.club.isOwner, true);
  assert.ok(mine.body.members.some((m) => m.username === u.username));
});

test('club name is validated, content-filtered, unique, and one-per-user', async () => {
  const u = await registerUser(ctx.base);
  const tooShort = await api(ctx.base, 'POST', '/api/clubs', { token: u.token, body: { name: 'ab' } });
  assert.equal(tooShort.status, 400);
  const dirty = await api(ctx.base, 'POST', '/api/clubs', { token: u.token, body: { name: 'shit squad' } });
  assert.equal(dirty.status, 400);

  const name = uniqueName();
  const ok = await api(ctx.base, 'POST', '/api/clubs', { token: u.token, body: { name } });
  assert.equal(ok.status, 201);
  // Already in a club → can't create another.
  const second = await api(ctx.base, 'POST', '/api/clubs', { token: u.token, body: { name: uniqueName() } });
  assert.equal(second.status, 400);

  // A different user can't take the same name.
  const v = await registerUser(ctx.base);
  const dup = await api(ctx.base, 'POST', '/api/clubs', { token: v.token, body: { name } });
  assert.equal(dup.status, 409);
});

test('browse, join (one-club rule), member ranking, leave, and auto-delete when empty', async () => {
  const owner = await registerUser(ctx.base);
  const joiner = await registerUser(ctx.base);
  const name = uniqueName();
  const create = await api(ctx.base, 'POST', '/api/clubs', { token: owner.token, body: { name } });
  const clubId = create.body.clubId;

  // Browse shows the club with a member count; the owner is flagged joined.
  const browse = await api(ctx.base, 'GET', '/api/clubs', { token: owner.token });
  const listed = browse.body.find((c) => c.id === clubId);
  assert.ok(listed && listed.memberCount === 1 && listed.joined === true);

  // Joiner joins.
  const join = await api(ctx.base, 'POST', `/api/clubs/${clubId}/join`, { token: joiner.token });
  assert.equal(join.status, 200);
  // Joining a second club is blocked.
  const otherClub = await api(ctx.base, 'POST', '/api/clubs', { token: (await registerUser(ctx.base)).token, body: { name: uniqueName() } });
  const blocked = await api(ctx.base, 'POST', `/api/clubs/${otherClub.body.clubId}/join`, { token: joiner.token });
  assert.equal(blocked.status, 400);

  // Member ranking includes both, ordered by level/xp.
  const mine = await api(ctx.base, 'GET', '/api/clubs/mine', { token: joiner.token });
  assert.equal(mine.body.members.length, 2);
  assert.equal(mine.body.members[0].position, 1);

  // Both leave → the club is deleted.
  await api(ctx.base, 'POST', `/api/clubs/${clubId}/leave`, { token: joiner.token });
  await api(ctx.base, 'POST', `/api/clubs/${clubId}/leave`, { token: owner.token });
  const after = await api(ctx.base, 'GET', '/api/clubs', { token: owner.token });
  assert.ok(!after.body.some((c) => c.id === clubId), 'empty club was deleted');
  const ownerMine = await api(ctx.base, 'GET', '/api/clubs/mine', { token: owner.token });
  assert.equal(ownerMine.body.club, null);
});

test('club leaderboard ranks clubs by their members\' combined level', async () => {
  // Two clubs; the second gets a high-level member so it should outrank the first.
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const nameA = uniqueName();
  const nameB = uniqueName();
  const ca = await api(ctx.base, 'POST', '/api/clubs', { token: a.token, body: { name: nameA } });
  const cb = await api(ctx.base, 'POST', '/api/clubs', { token: b.token, body: { name: nameB } });
  await dbRun('UPDATE users SET level = 2, xp = 10 WHERE id = ?', [await idOf(a.username)]);
  await dbRun('UPDATE users SET level = 40, xp = 9000 WHERE id = ?', [await idOf(b.username)]);

  const lb = await api(ctx.base, 'GET', '/api/clubs/leaderboard', { token: a.token });
  assert.equal(lb.status, 200);
  const ia = lb.body.findIndex((c) => c.id === ca.body.clubId);
  const ib = lb.body.findIndex((c) => c.id === cb.body.clubId);
  assert.ok(ib >= 0 && ia >= 0);
  assert.ok(ib < ia, 'the club with the higher-level member ranks first');
  assert.equal(lb.body[ib].totalLevel, 40);
  assert.equal(lb.body[ib].position, ib + 1);
});
