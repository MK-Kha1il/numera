// The daily puzzle: pinned per learner per local day, server-graded, rewarded once per day, and
// never paid a second time through /api/math/complete.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const getPuzzle = (token) => api(ctx.base, 'GET', '/api/math/daily-puzzle', { token });
const submit = (token, body) => api(ctx.base, 'POST', '/api/math/daily-puzzle/submit', { token, body });
const wrongOption = (p) => (p.options || []).find((o) => o !== p.correct_answer) || `${p.correct_answer} (not)`;

test('the puzzle is pinned for the day: refreshing returns the same variant', async () => {
  const u = await registerUser(ctx.base);
  const a = await getPuzzle(u.token);
  const b = await getPuzzle(u.token);
  assert.equal(a.status, 200);
  assert.equal(a.body.question, b.body.question);
  assert.equal(a.body.correct_answer, b.body.correct_answer);
  assert.equal(a.body.solved_today, false);
});

test('submit is server-graded: a wrong answer pays nothing, the right one pays once', async () => {
  const u = await registerUser(ctx.base);
  const p = (await getPuzzle(u.token)).body;
  const before = await dbGet('SELECT coins, daily_puzzles_solved FROM users WHERE id = ?', [u.user.id]);

  const wrong = await submit(u.token, { answer: wrongOption(p) });
  assert.equal(wrong.status, 200);
  assert.equal(wrong.body.success, false);
  assert.equal((await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins, before.coins);

  const right = await submit(u.token, { answer: p.correct_answer });
  assert.equal(right.body.success, true, JSON.stringify(right.body));
  assert.equal(right.body.rewardCoins, 30);
  const after = await dbGet('SELECT coins, daily_puzzles_solved FROM users WHERE id = ?', [u.user.id]);
  assert.equal(after.coins - before.coins, 30);
  assert.equal(after.daily_puzzles_solved - before.daily_puzzles_solved, 1);

  const again = await submit(u.token, { answer: p.correct_answer });
  assert.equal(again.body.alreadySolved, true);
  assert.equal((await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins, after.coins, 'paid once');
  assert.equal((await getPuzzle(u.token)).body.solved_today, true);
});

test('the old client-asserted { correct: true } no longer pays', async () => {
  const u = await registerUser(ctx.base);
  await getPuzzle(u.token);
  const r = await submit(u.token, { correct: true });
  assert.equal(r.status, 400);
});

test('once per day holds even without a quest row (the old infinite-reward path)', async () => {
  const u = await registerUser(ctx.base);
  const p = (await getPuzzle(u.token)).body;
  await dbRun('DELETE FROM user_quests WHERE user_id = ?', [u.user.id]);
  const before = (await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins;
  await submit(u.token, { answer: p.correct_answer });
  await submit(u.token, { answer: p.correct_answer });
  await submit(u.token, { answer: p.correct_answer });
  assert.equal((await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins - before, 30);
});

test('submitting before opening today\'s puzzle is refused', async () => {
  const u = await registerUser(ctx.base);
  const r = await submit(u.token, { answer: '42' });
  assert.equal(r.status, 409);
});

test('a solved daily puzzle credits the streak and the quest, and the recap echo is not a second grant', async () => {
  const u = await registerUser(ctx.base);
  const p = (await getPuzzle(u.token)).body;
  await submit(u.token, { answer: p.correct_answer });
  const row = await dbGet('SELECT streak, coins, xp, level FROM users WHERE id = ?', [u.user.id]);
  assert.equal(row.streak, 1, 'solving the daily puzzle keeps the streak alive');
  const q = await dbGet('SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?', [u.user.id]);
  assert.equal(q.daily_puzzle_today, 1);

  const recap = await api(ctx.base, 'POST', '/api/math/complete', {
    token: u.token,
    body: { gameMode: 'daily_puzzle', solvedCount: 1, errorsCount: 0 },
  });
  assert.equal(recap.status, 200);
  assert.equal(recap.body.coinsGained, 30, 'the recap shows what the submit paid');
  const after = await dbGet('SELECT coins, xp, level FROM users WHERE id = ?', [u.user.id]);
  assert.deepEqual(after, { coins: row.coins, xp: row.xp, level: row.level }, 'but nothing is granted twice');
});
