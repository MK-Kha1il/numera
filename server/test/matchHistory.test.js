// Competitive match history (Phase 2 identity): every duel and reasoning round is recorded from the
// player's POV (opponent, scoreline, result, rating delta), exposed via GET /api/rating/matches.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const keyOf = async (roundId) => JSON.parse((await dbGet('SELECT problems_json FROM reasoning_rounds WHERE id = ?', [roundId])).problems_json);

function runDuel(room) {
  const roomId = `mh_duel_${Math.random().toString(36).slice(2)}`;
  ctx.mod.rooms[roomId] = { roomId, problems: new Array(5), startTime: Date.now(), problemLevel: 5, ...room };
  return new Promise((resolve) => ctx.mod.endDuel(roomId, () => resolve(roomId)));
}

test('a reasoning round is recorded in match history', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, {
    token: u.token,
    body: { answers: probs.map((p) => p.answer), reasons: probs.map((p) => p.reasonCorrectIndex) },
  });

  const res = await api(ctx.base, 'GET', '/api/rating/matches', { token: u.token });
  assert.equal(res.status, 200);
  const m = res.body.find((x) => x.mode === 'reasoning');
  assert.ok(m, 'reasoning round recorded');
  assert.equal(m.opponentName, 'Reasoning Benchmark');
  assert.equal(m.myScore, 5, 'a perfect round banks 5');
  assert.equal(m.result, 'win', 'rating went up → a win');
});

test('a ranked duel is recorded for both players with the right scoreline and result', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const aId = await idOf(a.username);
  const bId = await idOf(b.username);

  await runDuel({
    p1: { id: aId, username: a.username, score: 100, progress: 5, elo: 1000 },
    p2: { id: bId, username: b.username, score: 60, progress: 5, elo: 1000 },
    isCasual: false,
  });

  const aRes = await api(ctx.base, 'GET', '/api/rating/matches', { token: a.token });
  const am = aRes.body.find((m) => m.mode === 'duel');
  assert.ok(am, 'winner has a duel match row');
  assert.equal(am.result, 'win');
  assert.equal(am.myScore, 100);
  assert.equal(am.oppScore, 60);
  assert.equal(am.opponentName, b.username);
  assert.equal(am.opponentId, bId);

  const bRes = await api(ctx.base, 'GET', '/api/rating/matches', { token: b.token });
  const bm = bRes.body.find((m) => m.mode === 'duel');
  assert.equal(bm.result, 'loss', 'the loser sees a loss from their POV');
  assert.equal(bm.opponentName, a.username);

  // Head-to-head filter returns only matches vs that opponent.
  const h2h = await api(ctx.base, 'GET', `/api/rating/matches?vs=${bId}`, { token: a.token });
  assert.ok(h2h.body.length >= 1 && h2h.body.every((m) => m.opponentId === bId), 'vs filter is head-to-head');
});

test('rivals aggregates the head-to-head record against each opponent', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const aId = await idOf(a.username);
  const bId = await idOf(b.username);

  // a beats b twice, then loses once.
  const duel = (s1, s2) => runDuel({
    p1: { id: aId, username: a.username, score: s1, progress: 5, elo: 1000 },
    p2: { id: bId, username: b.username, score: s2, progress: 5, elo: 1000 },
    isCasual: false,
  });
  await duel(100, 40);
  await duel(80, 60);
  await duel(20, 100);

  const res = await api(ctx.base, 'GET', '/api/rating/rivals', { token: a.token });
  assert.equal(res.status, 200);
  const rival = res.body.find((r) => r.opponentId === bId);
  assert.ok(rival, 'b appears as a rival');
  assert.equal(rival.wins, 2, 'two wins vs b');
  assert.equal(rival.losses, 1, 'one loss vs b');
  assert.equal(rival.total, 3);
  assert.equal(rival.opponentName, b.username);

  // From b's POV the record is mirrored.
  const bRes = await api(ctx.base, 'GET', '/api/rating/rivals', { token: b.token });
  const bRival = bRes.body.find((r) => r.opponentId === aId);
  assert.equal(bRival.wins, 1);
  assert.equal(bRival.losses, 2);
});
