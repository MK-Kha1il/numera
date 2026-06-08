// Live-duel integrity integration: drives the REAL endDuel commit path (winner → Elo →
// rating/reward writes) without a socket, by seeding a finished room into the exported `rooms`
// map and calling the exported `endDuel`. This guards the rating/reward commit that wiring
// integrityEngine into duels touches — the part the task warns not to change untested.
//
// The cheat-decision branches themselves are unit-tested in duelIntegrity.test.js; here we prove
// the server actually wires flags → verdict → penalty → DB, and that telemetry_enabled gates it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const userRow = (id) => dbGet('SELECT elo, coins, arena_wins FROM users WHERE id = ?', [id]);

// Put a player out of placement and at a known rating/telemetry state.
async function setPlayer(id, { elo = 1000, telemetry = 0 } = {}) {
  await dbRun('UPDATE users SET elo = ?, competitive_matches = 20, coins = 100, arena_wins = 0, telemetry_enabled = ? WHERE id = ?', [elo, telemetry, id]);
}

// Seed a finished ranked room and run the real commit; resolves once endDuel calls back.
function runDuel(room) {
  const roomId = `test_duel_${Math.random().toString(36).slice(2)}`;
  ctx.mod.rooms[roomId] = { roomId, problems: new Array(5), startTime: Date.now(), problemLevel: 5, ...room };
  return new Promise((resolve) => ctx.mod.endDuel(roomId, () => resolve(roomId)));
}

test('clean ranked duel: higher score wins, Elo settles, winner gets coins', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { elo: 1000 });
  await setPlayer(u2Id, { elo: 1000 });

  const roomId = await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 1000 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 1000 },
    isCasual: false,
  });

  assert.equal(ctx.mod.rooms[roomId], undefined, 'room freed after the duel ends');
  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.elo, 1016, 'winner gains +16 at even ratings');
  assert.equal(p2.elo, 984, 'loser drops -16');
  assert.equal(p1.arena_wins, 1, 'winner credited a win');
  assert.equal(p1.coins, 150, 'winner gets +50 coins');
  assert.equal(p2.coins, 100, 'loser gets no coins');
});

test('cheating winner (telemetry ON, >=3 flags) forfeits: -15 Elo, no reward; clean opponent wins', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { elo: 1000, telemetry: 1 }); // consented → assessed
  await setPlayer(u2Id, { elo: 1000, telemetry: 1 });

  // p1 outscored p2 but was flagged superhuman 3x → cheat verdict.
  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 1000, integrityFlags: 3, integrityReason: 'answered in 5ms, below the 525ms human floor at level 5' },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 1000 },
    isCasual: false,
  });

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.elo, 985, 'cheater takes the fixed -15 penalty, not the +16 gain');
  assert.equal(p1.arena_wins, 0, 'cheater is not credited the win');
  assert.equal(p1.coins, 100, 'cheater gets no reward');
  assert.equal(p2.elo, 1016, 'clean opponent wins by default and gains Elo');
  assert.equal(p2.arena_wins, 1, 'clean opponent credited the win');
  assert.equal(p2.coins, 150, 'clean opponent gets the reward');

  // Ethics: the disqualification is recorded in the audit log (no silent shadow-ban).
  const audit = await dbGet("SELECT details FROM security_audit_logs WHERE user_id = ? AND event_type = 'ARENA_DUEL_CHEATING_DISQUALIFIED'", [u1Id]);
  assert.ok(audit && /human floor/.test(audit.details), 'audit row surfaces WHY the player was flagged');
});

test('telemetry OFF is not assessed: identical flags do not penalize (spec §5 privacy)', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { elo: 1000, telemetry: 0 }); // opted out → not profiled
  await setPlayer(u2Id, { elo: 1000, telemetry: 0 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 1000, integrityFlags: 9 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 1000 },
    isCasual: false,
  });

  const p1 = await userRow(u1Id);
  assert.equal(p1.elo, 1016, 'opted-out player wins normally; flags ignored');
  assert.equal(p1.arena_wins, 1);
  assert.equal(p1.coins, 150);
});

test('casual duel never moves Elo even with a flagged player', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { elo: 1000, telemetry: 1 });
  await setPlayer(u2Id, { elo: 1000, telemetry: 1 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 1000, integrityFlags: 5 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 1000 },
    isCasual: true,
  });

  const p1 = await userRow(u1Id);
  assert.equal(p1.elo, 1000, 'casual play leaves Elo untouched');
});
