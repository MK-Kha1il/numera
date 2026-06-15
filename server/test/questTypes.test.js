// Expanded daily quest pool (ultra review #63): new quests over Puzzle Rush and SRS, wired to
// real progress increments, claimable, and zeroed by the daily reset.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = (u) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [u], (e, r) => (e ? rej(e) : res(r.id))));

test('the quest list now includes the Puzzle Rush and SRS quests', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/quests', { token: u.token });
  assert.equal(r.status, 200);
  const types = r.body.map((q) => q.type);
  assert.ok(types.includes('puzzle_rush'), 'puzzle_rush quest present');
  assert.ok(types.includes('srs_review'), 'srs_review quest present');
  // Original quests still present.
  for (const t of ['solved', 'duels', 'mistakes', 'daily_puzzle']) assert.ok(types.includes(t), `${t} present`);
});

test('clearing an SRS review advances the Memory Tune-Up quest', async () => {
  const u = await registerUser(ctx.base);
  const before = await dbGet('SELECT srs_review_today FROM user_quests WHERE user_id = ?', [await idOf(u.username)]);
  assert.equal(before.srs_review_today, 0);

  const rev = await api(ctx.base, 'POST', '/api/math/srs/review', { token: u.token, body: { topic: 'arithmetic_3', quality: 5 } });
  assert.equal(rev.status, 200);

  const list = await api(ctx.base, 'GET', '/api/quests', { token: u.token });
  const srs = list.body.find((q) => q.type === 'srs_review');
  assert.equal(srs.current, 1, 'one review counted toward the quest');
});

test('a completed Puzzle Rush quest can be claimed once', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await dbRun('UPDATE user_quests SET puzzle_rush_today = 1 WHERE user_id = ?', [id]);

  const claim = await api(ctx.base, 'POST', '/api/quests/claim', { token: u.token, body: { questType: 'puzzle_rush' } });
  assert.equal(claim.status, 200, JSON.stringify(claim.body));
  assert.ok(claim.body.rewardCoins > 0);

  const again = await api(ctx.base, 'POST', '/api/quests/claim', { token: u.token, body: { questType: 'puzzle_rush' } });
  assert.equal(again.status, 400, 'cannot double-claim');
});

test('the daily reset zeroes the new quest columns', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  // Mark progress + claims and backdate the reset clock by > 1 day.
  await dbRun(
    'UPDATE user_quests SET puzzle_rush_today = 1, puzzle_rush_claimed = 1, srs_review_today = 3, srs_review_claimed = 1, last_quest_reset = ? WHERE user_id = ?',
    [Math.floor(Date.now() / 1000) - 90000, id]
  );
  // Any authed call routes through checkAndResetQuestsAndLeagues.
  await api(ctx.base, 'GET', '/api/quests', { token: u.token });

  const row = await dbGet('SELECT puzzle_rush_today, puzzle_rush_claimed, srs_review_today, srs_review_claimed FROM user_quests WHERE user_id = ?', [id]);
  assert.equal(row.puzzle_rush_today, 0);
  assert.equal(row.puzzle_rush_claimed, 0);
  assert.equal(row.srs_review_today, 0);
  assert.equal(row.srs_review_claimed, 0);
});
