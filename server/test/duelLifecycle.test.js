// Duel lifecycle guarantees (multiplayer overhaul): a live duel must ALWAYS terminate exactly
// once, with an honest outcome. These drive the real endDuel/forfeitDuel commit path through the
// exported rooms map (no socket needed) and lock in:
//   - a forfeit overrides the score-based winner (leaver loses even while ahead),
//   - endDuel is re-entrant-safe (grace timer / deadline sweep / last answer can all race it),
//   - broadcast payloads are sanitized (publicPlayer never leaks anti-cheat/server state),
//   - a drawn duel credits neither player with a win.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const userRow = (id) => dbGet('SELECT elo, coins, arena_wins, solved_count FROM users WHERE id = ?', [id]);

async function twoPlayers() {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  for (const id of [u1Id, u2Id]) {
    await dbRun('UPDATE users SET coins = 100, arena_wins = 0, solved_count = 0, competitive_matches = 20 WHERE id = ?', [id]);
  }
  return { u1, u2, u1Id, u2Id };
}

function seedRoom(room) {
  const roomId = `test_lifecycle_${Math.random().toString(36).slice(2)}`;
  ctx.mod.rooms[roomId] = { roomId, problems: new Array(5), startTime: Date.now() - 60000, problemLevel: 5, ...room };
  return roomId;
}

const endDuelAsync = (roomId) => new Promise((resolve) => ctx.mod.endDuel(roomId, resolve));

test('a forfeit overrides the score: the leaver loses even while ahead', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers();
  const roomId = seedRoom({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700 }, // ahead...
    p2: { id: u2Id, username: u2.username, score: 20, progress: 1, elo: 700 },
    isCasual: true,
  });
  // ...but p1 walks out.
  ctx.mod.forfeitDuel(roomId, 'p1', 'left the match');
  // forfeitDuel triggers endDuel internally; wait for the room to be freed.
  for (let i = 0; i < 200 && ctx.mod.rooms[roomId]; i++) await new Promise((r) => setTimeout(r, 10));
  assert.equal(ctx.mod.rooms[roomId], undefined, 'room freed after the forfeit resolves');

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.arena_wins, 0, 'the leaver is not credited the win despite the higher score');
  assert.equal(p1.coins, 100, 'the leaver gets no reward');
  assert.equal(p2.arena_wins, 1, 'the remaining player takes the win');
  assert.equal(p2.coins, 150, 'the remaining player gets the winner reward');
});

test('endDuel is re-entrant-safe: racing terminators commit exactly once', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers();
  const roomId = seedRoom({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: true,
  });
  // Simulate the race: the final answer, the deadline sweep and a disconnect grace all firing.
  await Promise.all([endDuelAsync(roomId), endDuelAsync(roomId), endDuelAsync(roomId)]);

  const p1 = await userRow(u1Id);
  assert.equal(p1.coins, 150, 'winner coins granted exactly once (no double-commit)');
  assert.equal(p1.arena_wins, 1, 'exactly one win recorded');
});

test('a drawn duel credits neither player with a win, and both keep their coins', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers();
  const roomId = seedRoom({
    p1: { id: u1Id, username: u1.username, score: 60, progress: 5, elo: 700 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: true,
  });
  await endDuelAsync(roomId);

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.arena_wins, 0, 'no winner on a draw (p1)');
  assert.equal(p2.arena_wins, 0, 'no winner on a draw (p2)');
  assert.equal(p1.coins, 100, 'no winner coins on a draw');
  assert.equal(p2.coins, 100);
});

test('solved_count reflects the problems actually answered, not a flat 5', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers();
  const roomId = seedRoom({
    p1: { id: u1Id, username: u1.username, score: 40, progress: 2, elo: 700 },
    p2: { id: u2Id, username: u2.username, score: 100, progress: 5, elo: 700 },
    isCasual: true,
  });
  await endDuelAsync(roomId);

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.solved_count, 2, 'early-ended duel credits only the problems p1 answered');
  assert.equal(p2.solved_count, 5);
});

test('ranked rematch chains are capped; casual chains are not; bots never get offers', () => {
  const humans = { p1: { id: 1 }, p2: { id: 2 } };
  // Fresh ranked match → offer allowed; at the cap depth → blocked.
  assert.equal(ctx.mod.rematchOfferAllowed({ ...humans, isCasual: false }), true);
  assert.equal(ctx.mod.rematchOfferAllowed({ ...humans, isCasual: false, rematchDepth: 1 }), true);
  assert.equal(ctx.mod.rematchOfferAllowed({ ...humans, isCasual: false, rematchDepth: 2 }), false, 'ranked chains stop after 2 consecutive rematches');
  // Casual: nothing at stake, no cap.
  assert.equal(ctx.mod.rematchOfferAllowed({ ...humans, isCasual: true, rematchDepth: 9 }), true);
  // Bot opponents never get a rematch offer (the bot tile is always available anyway).
  assert.equal(ctx.mod.rematchOfferAllowed({ p1: { id: 1 }, p2: { id: 9999, isBot: true }, isCasual: true }), false);
});

test('publicPlayer strips every server-only field (anti-cheat state never leaves the server)', () => {
  const leakyPlayer = {
    id: 7, username: 'ada', rank: 'Silver II', score: 40, progress: 2, elo: 900,
    socketId: 'sock_abc', problemStartTime: 123456, integrityFlags: 2,
    integrityReason: 'answered in 5ms', disconnectTimer: { unref: () => {} }, connected: true,
  };
  const pub = ctx.mod.publicPlayer(leakyPlayer);
  assert.deepEqual(Object.keys(pub).sort(), ['connected', 'elo', 'id', 'isBot', 'matches', 'progress', 'rank', 'score', 'username', 'wins'].sort());
  assert.equal(pub.username, 'ada');
  assert.equal(pub.rank, 'Silver II');
  assert.equal(pub.connected, true);
});
