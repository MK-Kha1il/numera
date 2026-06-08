// Custom Challenges: create a named challenge over a concept (server generates + stores a fixed
// set), play it for a scored one-shot attempt, and rank the per-challenge leaderboard.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));

async function createChallenge(token, body = {}) {
  return api(ctx.base, 'POST', '/api/challenges', {
    token,
    body: { title: 'Speedrun: Adding', conceptId: 'arithmetic_add', count: 5, ...body },
  });
}

test('the concept catalog only exposes playable curriculum concepts', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/challenges/concepts', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.concepts.length > 0);
  assert.ok(res.body.concepts.every((c) => c.conceptId && c.name && c.category && c.level));
});

test('create stores a fixed answer-bearing set; GET strips the answers', async () => {
  const u = await registerUser(ctx.base);
  const made = await createChallenge(u.token, { count: 7 });
  assert.equal(made.status, 200);
  assert.equal(made.body.problemCount, 7);
  assert.match(made.body.code, /^[A-Z2-9]{6}$/);

  // Answers are stored server-side...
  const row = await dbGet('SELECT problems_json, problem_count FROM custom_challenges WHERE code = ?', [made.body.code]);
  const stored = JSON.parse(row.problems_json);
  assert.equal(stored.length, 7);
  assert.ok(stored.every((p) => p.answer !== undefined && Array.isArray(p.options)));

  // ...but never served to the client.
  const got = await api(ctx.base, 'GET', `/api/challenges/${made.body.code}`, { token: u.token });
  assert.equal(got.status, 200);
  assert.ok(got.body.problems.every((p) => p.answer === undefined && Array.isArray(p.options)));
  assert.equal(got.body.isMine, true);
  assert.equal(got.body.yourAttempt, null);
});

test('create validates the title and the concept', async () => {
  const u = await registerUser(ctx.base);
  const shortTitle = await createChallenge(u.token, { title: 'x' });
  assert.equal(shortTitle.status, 400);
  const badConcept = await createChallenge(u.token, { conceptId: 'not_a_concept' });
  assert.equal(badConcept.status, 400);
});

test('count is clamped to the allowed band', async () => {
  const u = await registerUser(ctx.base);
  const huge = await createChallenge(u.token, { count: 999 });
  assert.equal(huge.body.problemCount, 15); // COUNT_MAX
  const tiny = await createChallenge(u.token, { count: 1 });
  assert.equal(tiny.body.problemCount, 5); // COUNT_MIN
});

test('a perfect attempt scores full marks and a replay is not re-scored', async () => {
  const author = await registerUser(ctx.base);
  const made = await createChallenge(author.token);
  const code = made.body.code;
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM custom_challenges WHERE code = ?', [code])).problems_json);

  const player = await registerUser(ctx.base);
  const answers = stored.map((p) => p.answer);
  const play = await api(ctx.base, 'POST', `/api/challenges/${code}/play`, { token: player.token, body: { answers, elapsedMs: 4200 } });
  assert.equal(play.status, 200);
  assert.equal(play.body.alreadyPlayed, false);
  assert.equal(play.body.score, stored.length);
  assert.ok(play.body.leaderboard.some((r) => r.username === player.username && r.score === stored.length));

  // A second submission returns the first result unchanged (no farming the board).
  const replay = await api(ctx.base, 'POST', `/api/challenges/${code}/play`, { token: player.token, body: { answers: stored.map(() => 'wrong') } });
  assert.equal(replay.body.alreadyPlayed, true);
  assert.equal(replay.body.score, stored.length);
  assert.equal(play.body.leaderboard.length, replay.body.leaderboard.length);
});

test('the leaderboard ranks by score then by speed', async () => {
  const author = await registerUser(ctx.base);
  const made = await createChallenge(author.token);
  const code = made.body.code;
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM custom_challenges WHERE code = ?', [code])).problems_json);
  const allRight = stored.map((p) => p.answer);

  // Two perfect scorers; the faster one should outrank the slower.
  const slow = await registerUser(ctx.base);
  const fast = await registerUser(ctx.base);
  await api(ctx.base, 'POST', `/api/challenges/${code}/play`, { token: slow.token, body: { answers: allRight, elapsedMs: 9000 } });
  const res = await api(ctx.base, 'POST', `/api/challenges/${code}/play`, { token: fast.token, body: { answers: allRight, elapsedMs: 3000 } });

  const board = res.body.leaderboard;
  const fastPos = board.find((r) => r.username === fast.username).position;
  const slowPos = board.find((r) => r.username === slow.username).position;
  assert.ok(fastPos < slowPos, 'faster perfect score ranks higher');
});

test('playing an unknown code 404s', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'POST', '/api/challenges/ZZZZZZ/play', { token: u.token, body: { answers: [] } });
  assert.equal(res.status, 404);
});
