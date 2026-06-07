// Async (correspondence) duels: friend-gated challenge, identical shared problem set, both-played
// resolution with a transactional coin reward to the winner, and the guards (non-friend, self,
// double-play, non-participant).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const coinsOf = (id) => dbGet('SELECT coins FROM users WHERE id = ?', [id]).then((r) => r.coins);
const matchAnswers = (matchId) => dbGet('SELECT problems_json FROM async_matches WHERE id = ?', [matchId]).then((r) => JSON.parse(r.problems_json).map((p) => p.answer));

async function befriend(aId, bId) {
  await dbRun("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')", [aId, bId]);
}

test('challenge requires a friend; self-challenge is rejected', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u2Id = await idOf(u2.username);

  const stranger = await api(ctx.base, 'POST', '/api/duel/async/challenge', { token: u1.token, body: { opponentId: u2Id } });
  assert.equal(stranger.status, 403, 'cannot challenge a non-friend');

  const u1Id = await idOf(u1.username);
  const self = await api(ctx.base, 'POST', '/api/duel/async/challenge', { token: u1.token, body: { opponentId: u1Id } });
  assert.equal(self.status, 400, 'cannot challenge yourself');
});

test('full flow: identical set, both play, winner gets the coin reward', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await befriend(u1Id, u2Id);

  // u1 challenges u2.
  const challenge = await api(ctx.base, 'POST', '/api/duel/async/challenge', { token: u1.token, body: { opponentId: u2Id } });
  assert.equal(challenge.status, 200);
  const matchId = challenge.body.matchId;
  assert.equal(challenge.body.problemCount, 5);

  // u2 sees it as their turn, and the served set has no answers.
  const active = await api(ctx.base, 'GET', '/api/duel/async/active', { token: u2.token });
  const mine = active.body.find((x) => x.matchId === matchId);
  assert.ok(mine && mine.yourTurn === true && mine.played === false);
  const fetch2 = await api(ctx.base, 'GET', `/api/duel/async/${matchId}`, { token: u2.token });
  assert.equal(fetch2.body.problems.length, 5);
  assert.equal(fetch2.body.problems[0].answer, undefined, 'answers are not served');

  const answers = await matchAnswers(matchId);
  const coinsBefore = await coinsOf(u2Id);

  // u2 answers all correctly → not resolved yet (u1 hasn't played).
  const play2 = await api(ctx.base, 'POST', `/api/duel/async/${matchId}/play`, { token: u2.token, body: { answers } });
  assert.equal(play2.body.score, 5);
  assert.equal(play2.body.resolved, false);

  // u2 cannot play twice.
  const replay = await api(ctx.base, 'POST', `/api/duel/async/${matchId}/play`, { token: u2.token, body: { answers } });
  assert.equal(replay.status, 400);

  // u1 answers all wrong → match resolves, u2 wins, reward granted.
  const wrong = answers.map(() => '__wrong__');
  const play1 = await api(ctx.base, 'POST', `/api/duel/async/${matchId}/play`, { token: u1.token, body: { answers: wrong } });
  assert.equal(play1.body.score, 0);
  assert.equal(play1.body.resolved, true);
  assert.equal(play1.body.result.winnerId, u2Id);
  assert.equal(play1.body.result.reward, 25);

  const coinsAfter = await coinsOf(u2Id);
  assert.equal(coinsAfter - coinsBefore, 25, 'winner got the coin reward');

  const row = await dbGet('SELECT status, winner_id FROM async_matches WHERE id = ?', [matchId]);
  assert.equal(row.status, 'finished');
  assert.equal(row.winner_id, u2Id);
});

test('a non-participant cannot view a match', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const outsider = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await befriend(u1Id, u2Id);
  const challenge = await api(ctx.base, 'POST', '/api/duel/async/challenge', { token: u1.token, body: { opponentId: u2Id } });
  const res = await api(ctx.base, 'GET', `/api/duel/async/${challenge.body.matchId}`, { token: outsider.token });
  assert.equal(res.status, 404);
});
