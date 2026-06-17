// Weekly tournaments: a self-seeding global event, one server-timed attempt per player, a
// score-then-speed leaderboard, and lazy finalize that pays the top 3 on close.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

async function playPerfect(user, tournamentId) {
  const start = await api(ctx.base, 'POST', `/api/tournaments/${tournamentId}/start`, { token: user.token, body: {} });
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM tournaments WHERE id = ?', [tournamentId])).problems_json);
  return api(ctx.base, 'POST', `/api/tournaments/${tournamentId}/play`, { token: user.token, body: { answers: stored.map((p) => p.answer) } });
}

test('GET current self-seeds an active weekly event', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.tournament.id > 0);
  assert.equal(res.body.tournament.status, 'active');
  assert.ok(res.body.tournament.msRemaining > 0);
  assert.equal(res.body.yourEntry, null);
});

test('start serves answer-stripped problems and play scores them server-side', async () => {
  const u = await registerUser(ctx.base);
  const cur = await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token });
  const tid = cur.body.tournament.id;

  const start = await api(ctx.base, 'POST', `/api/tournaments/${tid}/start`, { token: u.token, body: {} });
  assert.equal(start.status, 200);
  assert.ok(start.body.problems.every((p) => p.answer === undefined && Array.isArray(p.options)));

  const play = await playPerfect(u, tid);
  assert.equal(play.status, 200);
  assert.equal(play.body.score, start.body.problemCount);
  assert.ok(play.body.leaderboard.some((r) => r.username === u.username && r.score === play.body.score));
});

test('the board is seeded with labeled pace-setter bots so it is never an empty room', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token });
  const board = res.body.leaderboard;
  const bots = board.filter((r) => r.isBot);
  assert.ok(bots.length >= 3, 'expected several pace-setter bots on the board');
  // Bots are labeled, never real users, and never carry a coin reward.
  assert.ok(bots.every((b) => b.userId === 0 && b.reward === 0));
  // Positions are contiguous across the merged (human + bot) board.
  board.forEach((r, i) => assert.equal(r.position, i + 1));

  // Deterministic per event: a second read yields the same bot scores/times (no flicker).
  const again = await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token });
  const botsAgain = again.body.leaderboard.filter((r) => r.isBot);
  assert.deepEqual(botsAgain.map((b) => [b.username, b.score, b.elapsedMs]),
                   bots.map((b) => [b.username, b.score, b.elapsedMs]));
});

test('a player gets only one attempt', async () => {
  const u = await registerUser(ctx.base);
  const tid = (await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token })).body.tournament.id;
  await playPerfect(u, tid);
  // A second start is rejected once finished.
  const reStart = await api(ctx.base, 'POST', `/api/tournaments/${tid}/start`, { token: u.token, body: {} });
  assert.equal(reStart.status, 400);
});

test('play before start is rejected', async () => {
  const u = await registerUser(ctx.base);
  const tid = (await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token })).body.tournament.id;
  const play = await api(ctx.base, 'POST', `/api/tournaments/${tid}/play`, { token: u.token, body: { answers: [] } });
  assert.equal(play.status, 400);
});

test('the leaderboard ranks by score then speed', async () => {
  const u = await registerUser(ctx.base);
  const tid = (await api(ctx.base, 'GET', '/api/tournaments/current', { token: u.token })).body.tournament.id;
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM tournaments WHERE id = ?', [tid])).problems_json);
  const allRight = stored.map((p) => p.answer);

  // Two perfect scorers; force different server-measured times via started_at, then submit.
  const slow = await registerUser(ctx.base);
  const fast = await registerUser(ctx.base);
  await api(ctx.base, 'POST', `/api/tournaments/${tid}/start`, { token: slow.token, body: {} });
  await api(ctx.base, 'POST', `/api/tournaments/${tid}/start`, { token: fast.token, body: {} });
  // The slow player "started" long ago → larger elapsed; the fast one just started.
  await dbRun('UPDATE tournament_entries SET started_at = started_at - 60000 WHERE user_id = ? AND tournament_id = ?', [await idOf(slow.username), tid]);
  await api(ctx.base, 'POST', `/api/tournaments/${tid}/play`, { token: slow.token, body: { answers: allRight } });
  const res = await api(ctx.base, 'POST', `/api/tournaments/${tid}/play`, { token: fast.token, body: { answers: allRight } });

  const board = res.body.leaderboard;
  const fastPos = board.find((r) => r.username === fast.username).position;
  const slowPos = board.find((r) => r.username === slow.username).position;
  assert.ok(fastPos < slowPos, 'faster perfect score ranks higher');
});

test('an ended event finalizes once, pays the top 3, and seeds the next week', async () => {
  const champ = await registerUser(ctx.base);
  // Isolate: insert a dedicated active event (reusing a real generated set) so the payout
  // assertion doesn't depend on other tests' entries on the shared weekly event. It has the
  // highest id, so GET current operates on it (ORDER BY id DESC).
  const sample = await dbGet('SELECT problems_json FROM tournaments ORDER BY id DESC LIMIT 1');
  const now = Date.now();
  await dbRun(
    `INSERT INTO tournaments (title, concept_id, category, level, problem_count, problems_json, starts_at, ends_at, status, created_at)
     VALUES ('Isolated Cup', 'arithmetic_add', 'arithmetic', 1, 10, ?, ?, ?, 'active', ?)`,
    [sample.problems_json, now, now + 60000, now]
  );
  const tid = (await dbGet('SELECT id FROM tournaments ORDER BY id DESC LIMIT 1')).id;

  await playPerfect(champ, tid);
  const champId = await idOf(champ.username);
  const coinsBefore = (await dbGet('SELECT coins FROM users WHERE id = ?', [champId])).coins;

  // Force the event over, then a fresh GET current should finalize + rotate.
  await dbRun('UPDATE tournaments SET ends_at = ? WHERE id = ?', [Date.now() - 1000, tid]);
  const next = await api(ctx.base, 'GET', '/api/tournaments/current', { token: champ.token });
  assert.equal(next.status, 200);
  assert.notEqual(next.body.tournament.id, tid, 'a new event was seeded');
  assert.equal(next.body.tournament.status, 'active');

  // The finished event is finalized and its sole entrant was paid the top prize (100).
  assert.equal((await dbGet('SELECT status FROM tournaments WHERE id = ?', [tid])).status, 'finalized');
  const coinsAfter = (await dbGet('SELECT coins FROM users WHERE id = ?', [champId])).coins;
  assert.equal(coinsAfter, coinsBefore + 100, 'winner paid the top-3 reward');

  // Finalize is idempotent — calling current again does not pay twice.
  await api(ctx.base, 'GET', '/api/tournaments/current', { token: champ.token });
  assert.equal((await dbGet('SELECT coins FROM users WHERE id = ?', [champId])).coins, coinsAfter, 'no double payout');
});
