// Honor / commendation system (competitive audit #24): peer sportsmanship recognition, never
// punitive. One commendation per (giver, match); the receiver's honor is the count they've been given.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, function (e) { return e ? rej(e) : res(this.lastID); }));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

// Log a match from `userId`'s POV against `opponentId` (null = bot/benchmark). Returns the match_log id.
const logMatch = (userId, opponentId, result = 'win') =>
  dbRun(
    "INSERT INTO match_log (user_id, mode, opponent_id, opponent_name, my_score, opp_score, result, rating_delta, created_at) VALUES (?, 'duel', ?, ?, 3, 2, ?, 10, strftime('%s','now'))",
    [userId, opponentId, opponentId ? 'Foe' : 'Bot', result]
  );

test('commending an opponent raises THEIR honor; the match is then marked commended', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const bId = await idOf(b.username);
  const matchId = await logMatch(await idOf(a.username), bId);

  const before = await api(ctx.base, 'GET', '/api/rating/honor', { token: b.token });
  assert.equal(before.body.total, 0, 'b starts with no honor');

  const res = await api(ctx.base, 'POST', '/api/rating/commend', { token: a.token, body: { matchId, type: 'good_game' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.commended, true);
  assert.equal(res.body.toUserId, bId, 'the opponent receives the commendation');

  const afterHonor = await api(ctx.base, 'GET', '/api/rating/honor', { token: b.token });
  assert.equal(afterHonor.body.total, 1, 'b now has 1 commendation');
  assert.equal(afterHonor.body.byType.good_game, 1, 'broken down by type');

  // The match now reads back as commended (and no longer commendable).
  const matches = await api(ctx.base, 'GET', '/api/rating/matches', { token: a.token });
  const m = matches.body.find((x) => x.id === matchId);
  assert.equal(m.commended, true);
  assert.equal(m.commendable, false);
});

test('a second commend on the same match is idempotent (no farming)', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const matchId = await logMatch(await idOf(a.username), await idOf(b.username));

  await api(ctx.base, 'POST', '/api/rating/commend', { token: a.token, body: { matchId, type: 'good_sport' } });
  const again = await api(ctx.base, 'POST', '/api/rating/commend', { token: a.token, body: { matchId, type: 'tough_opponent' } });
  assert.equal(again.status, 200);
  assert.equal(again.body.alreadyCommended, true, 'the repeat is a no-op');

  const honor = await api(ctx.base, 'GET', '/api/rating/honor', { token: b.token });
  assert.equal(honor.body.total, 1, 'still only one commendation counted');
});

test('cannot commend a bot match, and invalid types are rejected', async () => {
  const a = await registerUser(ctx.base);
  const botMatch = await logMatch(await idOf(a.username), null);
  const bot = await api(ctx.base, 'POST', '/api/rating/commend', { token: a.token, body: { matchId: botMatch, type: 'good_game' } });
  assert.equal(bot.status, 400, 'no human opponent to commend');

  const b = await registerUser(ctx.base);
  const realMatch = await logMatch(await idOf(a.username), await idOf(b.username));
  const bad = await api(ctx.base, 'POST', '/api/rating/commend', { token: a.token, body: { matchId: realMatch, type: 'cheater' } });
  assert.equal(bad.status, 400, 'commendations are positive-only — no punitive types');
});

test('honor level rises past thresholds', async () => {
  const star = await registerUser(ctx.base);
  const starId = await idOf(star.username);
  // 3 distinct givers each commend `star` once → total 3 → level 1.
  for (let i = 0; i < 3; i++) {
    const giver = await registerUser(ctx.base);
    const matchId = await logMatch(await idOf(giver.username), starId);
    await api(ctx.base, 'POST', '/api/rating/commend', { token: giver.token, body: { matchId, type: 'good_game' } });
  }
  const honor = await api(ctx.base, 'GET', '/api/rating/honor', { token: star.token });
  assert.equal(honor.body.total, 3);
  assert.ok(honor.body.level >= 1, 'crossing the first threshold raises the honor level');
});
