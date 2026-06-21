// Integration test for the Living Arena substrate (services/arenaService + the duel-end wiring):
// proves a finished ranked duel is recorded to duel_history, that head-to-head + rivals read it
// back correctly, and that reputation (peak rating + win streak) updates. The trickiest part is
// the rivals subquery (opponent normalized across p1/p2), so it gets explicit coverage here.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');
const arena = require('../services/arenaService');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const h2h = (a, b) => new Promise((res) => arena.getHeadToHead(a, b, (e, r) => res(r)));
const rivals = (id) => new Promise((res) => arena.getRivals(id, 5, (e, r) => res(r)));
const history = (id) => new Promise((res) => arena.getMatchHistory(id, 10, (e, r) => res(r)));

async function setPlayer(id, elo = 1000) {
  await dbRun('UPDATE users SET elo = ?, peak_elo = ?, competitive_matches = 20, current_win_streak = 0, best_win_streak = 0 WHERE id = ?', [elo, elo, id]);
}

function runDuel(room) {
  const roomId = `arena_test_${Math.random().toString(36).slice(2)}`;
  ctx.mod.rooms[roomId] = { roomId, problems: new Array(5), startTime: Date.now(), problemLevel: 5, ...room };
  return new Promise((resolve) => ctx.mod.endDuel(roomId, () => resolve(roomId)));
}

test('a finished ranked duel is recorded and head-to-head reflects it', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const a = await idOf(u1.username);
  const b = await idOf(u2.username);
  await setPlayer(a); await setPlayer(b);

  // a beats b twice, b beats a once.
  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1000 }, p2: { id: b, username: u2.username, score: 60, progress: 5, elo: 1000 }, isCasual: false });
  await runDuel({ p1: { id: a, username: u1.username, score: 80, progress: 5, elo: 1016 }, p2: { id: b, username: u2.username, score: 40, progress: 5, elo: 984 }, isCasual: false });
  await runDuel({ p1: { id: b, username: u2.username, score: 100, progress: 5, elo: 968 }, p2: { id: a, username: u1.username, score: 20, progress: 5, elo: 1031 }, isCasual: false });

  const fromA = await h2h(a, b);
  assert.equal(fromA.total, 3, 'three meetings recorded');
  assert.equal(fromA.myWins, 2, 'a leads the rivalry 2');
  assert.equal(fromA.theirWins, 1, 'b has 1');

  // Perspective flips for b.
  const fromB = await h2h(b, a);
  assert.equal(fromB.myWins, 1);
  assert.equal(fromB.theirWins, 2);
});

test('rivals lists the most-played opponent with the correct record regardless of p1/p2 slot', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const a = await idOf(u1.username);
  const b = await idOf(u2.username);
  await setPlayer(a); await setPlayer(b);

  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1000 }, p2: { id: b, username: u2.username, score: 60, progress: 5, elo: 1000 }, isCasual: false });
  // a is in the p2 slot here — the rivals subquery must still attribute the opponent as b.
  await runDuel({ p1: { id: b, username: u2.username, score: 100, progress: 5, elo: 984 }, p2: { id: a, username: u1.username, score: 60, progress: 5, elo: 1016 }, isCasual: false });

  const list = await rivals(a);
  const rival = list.find((r) => r.opponentId === b);
  assert.ok(rival, 'b appears in a\'s rivals');
  assert.equal(rival.total, 2, 'both meetings counted across slots');
  assert.equal(rival.myWins, 1);
  assert.equal(rival.theirWins, 1);
  assert.equal(rival.username, u2.username, 'opponent username resolved');
});

test('bot duels are excluded from rivalries (no fake rivals)', async () => {
  const u1 = await registerUser(ctx.base);
  const a = await idOf(u1.username);
  await setPlayer(a);

  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1000 }, p2: { id: 9999, username: 'MathBot', score: 40, progress: 5, elo: 1000, isBot: true }, isCasual: false });

  const list = await rivals(a);
  assert.ok(!list.some((r) => r.opponentId === 9999), 'the bot is never a rival');
  const rows = await dbGet('SELECT COUNT(*) AS c FROM duel_history WHERE p1_id = ? OR p2_id = ?', [a, a]);
  assert.equal(rows.c, 0, 'no history row written for a bot match');
});

test('match history reads each result + rating delta from the player\'s own perspective', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const a = await idOf(u1.username);
  const b = await idOf(u2.username);
  await setPlayer(a); await setPlayer(b);

  // a wins (as p1), then a loses (as p2). History is newest-first.
  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1000 }, p2: { id: b, username: u2.username, score: 60, progress: 5, elo: 1000 }, isCasual: false });
  await runDuel({ p1: { id: b, username: u2.username, score: 100, progress: 5, elo: 984 }, p2: { id: a, username: u1.username, score: 20, progress: 5, elo: 1016 }, isCasual: false });

  const list = await history(a);
  assert.equal(list.length, 2);
  assert.equal(list[0].result, 'loss', 'newest first: the loss');
  assert.equal(list[0].opponent, u2.username);
  assert.ok(list[0].eloChange < 0, 'loss shows a negative delta from a\'s perspective');
  assert.equal(list[1].result, 'win');
  assert.ok(list[1].eloChange > 0, 'the win shows a positive delta');
});

test('ranked win raises peak rating and extends the win streak; a loss resets the streak', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const a = await idOf(u1.username);
  const b = await idOf(u2.username);
  await setPlayer(a); await setPlayer(b);

  // a wins twice → streak 2, peak rises above 1000.
  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1000 }, p2: { id: b, username: u2.username, score: 60, progress: 5, elo: 1000 }, isCasual: false });
  await runDuel({ p1: { id: a, username: u1.username, score: 100, progress: 5, elo: 1016 }, p2: { id: b, username: u2.username, score: 60, progress: 5, elo: 984 }, isCasual: false });

  let arow = await dbGet('SELECT elo, peak_elo, current_win_streak, best_win_streak FROM users WHERE id = ?', [a]);
  assert.equal(arow.current_win_streak, 2, 'two-win streak');
  assert.ok(arow.peak_elo >= arow.elo && arow.peak_elo > 1000, 'peak tracks the new high');

  // a loses → streak resets but best_win_streak is preserved, peak does not drop.
  const peakBefore = arow.peak_elo;
  await runDuel({ p1: { id: b, username: u2.username, score: 100, progress: 5, elo: 968 }, p2: { id: a, username: u1.username, score: 20, progress: 5, elo: arow.elo }, isCasual: false });
  arow = await dbGet('SELECT peak_elo, current_win_streak, best_win_streak FROM users WHERE id = ?', [a]);
  assert.equal(arow.current_win_streak, 0, 'loss resets the active streak');
  assert.equal(arow.best_win_streak, 2, 'best streak is a permanent record');
  assert.equal(arow.peak_elo, peakBefore, 'peak never decreases');
});
