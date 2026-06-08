// Friends leaderboard: the caller + their accepted friends only, ranked by level/xp, with
// position + isMe. Non-friends and pending requests are excluded.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const befriend = async (a, b) => dbRun("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')", [a, b]);

test('friends leaderboard ranks the caller + accepted friends, with position and isMe', async () => {
  const me = await registerUser(ctx.base);
  const fr = await registerUser(ctx.base);
  const stranger = await registerUser(ctx.base);
  const meId = await idOf(me.username);
  const frId = await idOf(fr.username);

  await befriend(meId, frId);
  // Make the friend clearly higher-ranked so ordering is deterministic.
  await dbRun('UPDATE users SET level = 20, xp = 5000 WHERE id = ?', [frId]);
  await dbRun('UPDATE users SET level = 5, xp = 100 WHERE id = ?', [meId]);

  const r = await api(ctx.base, 'GET', '/api/leaderboard/friends', { token: me.token });
  assert.equal(r.status, 200);
  const ids = r.body.map((x) => x.username);
  assert.ok(ids.includes(me.username) && ids.includes(fr.username), 'me + friend present');
  assert.ok(!ids.includes(stranger.username), 'a non-friend is excluded');

  // Ranked by level desc: the friend is first, me second; positions + isMe set.
  assert.equal(r.body[0].username, fr.username);
  assert.equal(r.body[0].position, 1);
  assert.equal(r.body[0].isMe, false);
  const mine = r.body.find((x) => x.username === me.username);
  assert.equal(mine.isMe, true);
  assert.equal(mine.position, 2);
});

test('a pending (not accepted) friend is not on the leaderboard', async () => {
  const me = await registerUser(ctx.base);
  const other = await registerUser(ctx.base);
  const meId = await idOf(me.username);
  const otherId = await idOf(other.username);
  await dbRun("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')", [otherId, meId]);

  const r = await api(ctx.base, 'GET', '/api/leaderboard/friends', { token: me.token });
  assert.ok(!r.body.some((x) => x.username === other.username), 'pending request is not a friend yet');
  // I always see myself.
  assert.ok(r.body.some((x) => x.username === me.username && x.isMe));
});
