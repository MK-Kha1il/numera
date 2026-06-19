// Live-duel integration: drives the REAL endDuel commit path WITHOUT a socket, by seeding a finished
// room into the exported `rooms` map and calling the exported `endDuel`. This guards the unified
// rating commit (docs/specs/Spec-RatingUnification.md): a ranked duel now updates the SAME per-domain
// NRS rating (user_ratings) as solo play, and the users.elo / competitive_matches / competitive_rank
// columns are a DERIVED MIRROR of it. The old K=32 duel-Elo is retired.
//
// Determinism: both players are seeded at mu=700, sigma=200, sessions=20. Equal ratings → win
// probability is exactly 0.5; sigma=200 caps the K-factor at K_MAX=120 → the winner gains exactly
// +60 mu and the loser −60 (so elo, which mirrors round(mu), moves to 760 / 640). mu=700 keeps the
// display rating in the Bronze band so rank-badge coin bonuses don't confound the duel-reward checks.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const userRow = (id) => dbGet('SELECT elo, competitive_matches, competitive_rank, coins, arena_wins FROM users WHERE id = ?', [id]);
const ratingRow = (id) => dbGet("SELECT mu, sigma, sessions_count FROM user_ratings WHERE user_id = ? AND domain = 'global'", [id]);

// Put a player out of placement at a known coin/telemetry state.
async function setPlayer(id, { elo = 1000, telemetry = 0 } = {}) {
  await dbRun('UPDATE users SET elo = ?, competitive_matches = 20, coins = 100, arena_wins = 0, telemetry_enabled = ? WHERE id = ?', [elo, telemetry, id]);
}

// Seed an authoritative global rating row so a duel produces a deterministic result.
async function seedRating(id, { mu = 700, sigma = 200, sessions = 20 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const display = Math.max(0, Math.floor(mu - 2 * sigma));
  await dbRun(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, 'global', ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, domain) DO UPDATE SET
       mu = excluded.mu, sigma = excluded.sigma, display_rating = excluded.display_rating,
       sessions_count = excluded.sessions_count, last_updated = excluded.last_updated`,
    [id, mu, sigma, display, sessions, now]
  );
}

// Seed a finished room and run the real commit; resolves once endDuel calls back.
function runDuel(room) {
  const roomId = `test_duel_${Math.random().toString(36).slice(2)}`;
  ctx.mod.rooms[roomId] = { roomId, problems: new Array(5), startTime: Date.now(), problemLevel: 5, ...room };
  return new Promise((resolve) => ctx.mod.endDuel(roomId, () => resolve(roomId)));
}

async function twoPlayers({ telemetry = 0 } = {}) {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { telemetry });
  await setPlayer(u2Id, { telemetry });
  await seedRating(u1Id);
  await seedRating(u2Id);
  return { u1, u2, u1Id, u2Id };
}

test('clean ranked duel: winner gains rating into user_ratings + the mirror, plus coins', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers();

  const roomId = await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: false,
  });

  assert.equal(ctx.mod.rooms[roomId], undefined, 'room freed after the duel ends');
  const p1r = await ratingRow(u1Id);
  const p2r = await ratingRow(u2Id);
  assert.equal(Math.round(p1r.mu), 760, 'winner gains +60 mu vs an equal-rated opponent (K capped at 120)');
  assert.equal(Math.round(p2r.mu), 640, 'loser drops -60 mu (symmetric)');
  assert.equal(p1r.sessions_count, 21, 'a duel counts as one more rated encounter');

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.elo, 760, 'users.elo mirrors round(global mu)');
  assert.equal(p2.elo, 640);
  assert.equal(p1.competitive_matches, 21, 'mirror tracks the global session count');
  assert.ok(!/Unranked/.test(p1.competitive_rank), 'out of placement → a real competitive rank');
  assert.equal(p1.arena_wins, 1, 'winner credited a win');
  assert.equal(p1.coins, 150, 'winner gets +50 coins');
  assert.equal(p2.coins, 100, 'loser gets no coins');
});

test('cheating winner (telemetry ON, >=3 flags) forfeits: takes a rating LOSS, no reward; clean opponent wins', async () => {
  const { u1, u2, u1Id, u2Id } = await twoPlayers({ telemetry: 1 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700, integrityFlags: 3, integrityReason: 'answered in 5ms, below the 525ms human floor at level 5' },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: false,
  });

  const p1 = await userRow(u1Id);
  const p2 = await userRow(u2Id);
  assert.equal(p1.elo, 640, 'cheater is scored as a loss (forfeit), not the win');
  assert.equal(p1.arena_wins, 0, 'cheater is not credited the win');
  assert.equal(p1.coins, 100, 'cheater gets no reward');
  assert.equal(p2.elo, 760, 'clean opponent wins by default and gains rating');
  assert.equal(p2.arena_wins, 1, 'clean opponent credited the win');
  assert.equal(p2.coins, 150, 'clean opponent gets the reward');

  // Ethics: the disqualification is recorded in the audit log (no silent shadow-ban).
  const audit = await dbGet("SELECT details FROM security_audit_logs WHERE user_id = ? AND event_type = 'ARENA_DUEL_CHEATING_DISQUALIFIED'", [u1Id]);
  assert.ok(audit && /human floor/.test(audit.details), 'audit row surfaces WHY the player was flagged');
});

test('telemetry OFF is not assessed: identical flags do not penalize (spec §5 privacy)', async () => {
  const { u1, u2, u1Id } = await twoPlayers({ telemetry: 0 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700, integrityFlags: 9 },
    p2: { id: await idOf(u2.username), username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: false,
  });

  const p1 = await userRow(u1Id);
  assert.equal(p1.elo, 760, 'opted-out player wins normally; flags ignored');
  assert.equal(p1.arena_wins, 1);
  assert.equal(p1.coins, 150);
});

test('casual duel never moves rating, but still pays the winner coins', async () => {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  const u2Id = await idOf(u2.username);
  await setPlayer(u1Id, { elo: 700, telemetry: 1 });
  await setPlayer(u2Id, { elo: 700, telemetry: 1 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700 },
    p2: { id: u2Id, username: u2.username, score: 60, progress: 5, elo: 700 },
    isCasual: true,
  });

  const p1 = await userRow(u1Id);
  assert.equal(p1.elo, 700, 'casual play leaves the rating mirror untouched');
  assert.equal(await ratingRow(u1Id), undefined, 'casual play writes no user_ratings row');
  assert.equal(p1.coins, 150, 'casual winner still earns coins');
});

test('bot duel is rating-neutral (closes the bot-farm), but still pays coins', async () => {
  const u1 = await registerUser(ctx.base);
  const u1Id = await idOf(u1.username);
  await setPlayer(u1Id, { elo: 700, telemetry: 1 });
  await seedRating(u1Id, { mu: 700, sigma: 200, sessions: 20 });

  await runDuel({
    p1: { id: u1Id, username: u1.username, score: 100, progress: 5, elo: 700 },
    p2: { id: 9999, username: 'MathBot', score: 60, progress: 5, elo: 650, isBot: true },
    isCasual: false,
  });

  const p1r = await ratingRow(u1Id);
  assert.equal(Math.round(p1r.mu), 700, 'beating a bot does NOT move the competitive rating');
  assert.equal(p1r.sessions_count, 20, 'no rated encounter is recorded for a bot duel');
  const p1 = await userRow(u1Id);
  assert.equal(p1.elo, 700, 'mirror unchanged after a bot duel');
  assert.equal(p1.coins, 150, 'beating the bot still pays coins');
});
