// Server-authoritative solo economy: the pure reward table (lib/soloRewards.js), the XP helper,
// and POST /api/math/complete end to end — serve tickets, the solve cap, ignored client reward
// fields, the zero-solve fix, the level lock, the daily-puzzle no-double-pay rule and the taper.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { baseReward, faucetFactor, normalizeMode, FULL_REWARD_SESSIONS } = require('../lib/soloRewards');
const { applyXp } = require('../lib/progression');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const userRow = (id) => dbGet('SELECT xp, level, coins, solved_count, league_points FROM users WHERE id = ?', [id]);
const complete = (token, body) => api(ctx.base, 'POST', '/api/math/complete', { token, body });
const serveLevel = (token, level, category = 'arithmetic') =>
  api(ctx.base, 'GET', `/api/math/problems?category=${category}&level=${level}&count=3`, { token });

// ---- pure table -----------------------------------------------------------------------------

test('faucetFactor pays in full for the first sessions, then tapers to a floor', () => {
  assert.equal(faucetFactor(1), 1);
  assert.equal(faucetFactor(FULL_REWARD_SESSIONS), 1);
  assert.equal(faucetFactor(FULL_REWARD_SESSIONS + 1), 0.9);
  assert.equal(faucetFactor(FULL_REWARD_SESSIONS + 5), 0.5);
  assert.equal(faucetFactor(500), 0.2);
  assert.equal(faucetFactor(undefined), 1);
});

test('baseReward: zero solves pay nothing; per-solve modes scale; unknown modes are level mode', () => {
  assert.deepEqual(
    { xp: baseReward({ mode: 'word_problems', solvedCount: 0 }).xp, coins: baseReward({ mode: 'word_problems', solvedCount: 0 }).coins },
    { xp: 0, coins: 0 }
  );
  const two = baseReward({ mode: 'word_problems', solvedCount: 2, errorsCount: 1, servedCount: 5 });
  assert.equal(two.xp, 24);
  assert.equal(two.coins, 12);
  const clean = baseReward({ mode: 'word_problems', solvedCount: 2, errorsCount: 0, servedCount: 5 });
  assert.equal(clean.xp, Math.round(24 * 1.2), 'accuracy bonus with no wrong attempts');
  assert.equal(normalizeMode('bogus'), 'level');
  assert.equal(baseReward({ mode: 'transfer_challenge', solvedCount: 0 }).xp, 0, 'a wrong transfer answer is not paid');
});

test('baseReward: level mode uses APRA, doubles on milestones, and drops a spoofed combo', () => {
  const l1 = baseReward({ mode: 'level', level: 1, solvedCount: 3, errorsCount: 1, servedCount: 3 });
  assert.equal(l1.xp, 15);
  assert.equal(l1.coins, 5);
  const l10 = baseReward({ mode: 'level', level: 10, solvedCount: 3, errorsCount: 1, servedCount: 3 });
  assert.equal(l10.xp, (15 + Math.round(5 * Math.log2(10))) * 2);
  const spoof = baseReward({ mode: 'level', level: 1, solvedCount: 2, errorsCount: 1, servedCount: 3, comboBonus: 15 });
  assert.equal(spoof.comboBonus, 0, 'combo only on a flawless full run');
  const flawless = baseReward({ mode: 'level', level: 1, solvedCount: 3, errorsCount: 0, servedCount: 3, comboBonus: 99 });
  assert.equal(flawless.comboBonus, 15, 'bounded');
  assert.equal(baseReward({ mode: 'daily_puzzle', solvedCount: 1 }).paidElsewhere, true);
});

test('applyXp carries XP across level thresholds', () => {
  assert.deepEqual(applyXp(90, 1, 15), { xp: 5, level: 2 });
  assert.deepEqual(applyXp(0, 1, 350), { xp: 50, level: 3 }); // 100 (L1) + 200 (L2)
  assert.deepEqual(applyXp(10, 4, -50), { xp: 10, level: 4 }, 'negative gains are ignored');
});

// ---- /api/math/complete ---------------------------------------------------------------------

test('a completion with no prior serve is withheld and grants nothing', async () => {
  const u = await registerUser(ctx.base);
  const before = await userRow(u.user.id);
  const r = await complete(u.token, { gameMode: 'word_problems', solvedCount: 5, xpGained: 100, coinsGained: 50 });
  assert.equal(r.status, 200);
  assert.equal(r.body.rewardWithheld, true);
  assert.equal(r.body.xpGained, 0);
  assert.deepEqual(await userRow(u.user.id), before, 'no XP, coins or solves');
});

test('client reward fields are ignored and solves are capped at what was served', async () => {
  const u = await registerUser(ctx.base);
  const served = await api(ctx.base, 'GET', '/api/math/word-problems?count=3', { token: u.token });
  assert.equal(served.status, 200);
  const before = await userRow(u.user.id);
  const r = await complete(u.token, { gameMode: 'word_problems', solvedCount: 10, errorsCount: 1, xpGained: 100, coinsGained: 50 });
  assert.equal(r.status, 200);
  assert.equal(r.body.rewardWithheld, false);
  assert.equal(r.body.xpGained, 36, '3 served × 12 XP — not the claimed 100');
  assert.ok([18, 36].includes(r.body.coinsGained), `3 × 6 coins (×2 on a critical), got ${r.body.coinsGained}`);
  const after = await userRow(u.user.id);
  assert.equal(after.solved_count - before.solved_count, 3, 'solves capped at the 3 served');
  assert.equal(after.coins - before.coins, r.body.coinsGained);
});

test('a ticket pays once: a second completion of the same serve is withheld', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/math/estimation?count=3', { token: u.token });
  const first = await complete(u.token, { gameMode: 'estimation', solvedCount: 3, errorsCount: 1 });
  assert.equal(first.body.rewardWithheld, false);
  await sleep(5100); // clear the completion cooldown
  const second = await complete(u.token, { gameMode: 'estimation', solvedCount: 3, errorsCount: 1 });
  assert.equal(second.body.rewardWithheld, true);
});

test('a zero-solve session counts zero solves (not five) and pays nothing', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 1);
  const before = await userRow(u.user.id);
  const r = await complete(u.token, { gameMode: 'level', level: 1, category: 'arithmetic', solvedCount: 0, errorsCount: 3 });
  assert.equal(r.status, 200);
  assert.equal(r.body.xpGained, 0);
  assert.equal(r.body.coinsGained, 0);
  const after = await userRow(u.user.id);
  assert.equal(after.solved_count, before.solved_count);
  assert.equal(after.level, before.level, 'no progression without a solve');
  const q = await dbGet('SELECT solved_today FROM user_quests WHERE user_id = ?', [u.user.id]);
  assert.equal(q.solved_today, 0, 'the daily quest is not credited either');
});

test('clearing the frontier level unlocks the next one', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 1);
  const r = await complete(u.token, { gameMode: 'level', level: 1, category: 'arithmetic', solvedCount: 2, errorsCount: 1 });
  assert.equal(r.body.level, 2);
  assert.equal(r.body.levelUp, true);
  assert.equal((await userRow(u.user.id)).level, 2);
});

test('a locked level cannot be completed to jump progression', async () => {
  const u = await registerUser(ctx.base);
  await serveLevel(u.token, 40); // even with a genuine serve for level 40…
  const r = await complete(u.token, { gameMode: 'level', level: 40, category: 'arithmetic', solvedCount: 3, errorsCount: 0 });
  assert.equal(r.status, 200);
  assert.equal(r.body.levelLocked, true);
  assert.equal((await userRow(u.user.id)).level, 1, 'no jump to level 41');
  assert.ok(r.body.xpGained < 40, `paid at the learner's own level, got ${r.body.xpGained} XP`);
  const log = await dbGet("SELECT 1 AS ok FROM security_audit_logs WHERE user_id = ? AND event_type = 'LOCKED_LEVEL_COMPLETION'", [u.user.id]);
  assert.ok(log, 'the attempt is audit-logged');
});

test('a daily-puzzle completion never pays on top of the puzzle submit', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/math/daily-puzzle', { token: u.token });
  const before = await userRow(u.user.id);
  const r = await complete(u.token, { gameMode: 'daily_puzzle', solvedCount: 1, errorsCount: 0, xpGained: 50, coinsGained: 30 });
  assert.equal(r.status, 200);
  const after = await userRow(u.user.id);
  assert.equal(after.coins, before.coins, 'no coins from /complete for the daily puzzle');
  assert.equal(after.xp, before.xp);
  assert.equal(r.body.xpGained, 0, 'nothing to echo — the puzzle was never submitted');
});

test('coins and league points taper after the day\'s first sessions; XP does not', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/auth/me', { token: u.token }); // creates the quest row
  await dbRun('UPDATE user_quests SET solo_sessions_today = ? WHERE user_id = ?', [FULL_REWARD_SESSIONS + 4, u.user.id]);
  await api(ctx.base, 'GET', '/api/math/error-detection?count=5', { token: u.token });
  const before = await userRow(u.user.id);
  const r = await complete(u.token, { gameMode: 'error_detection', solvedCount: 5, errorsCount: 1 });
  assert.equal(r.body.faucetFactor, 0.5);
  assert.equal(r.body.xpGained, 60, 'XP untapered: 5 × 12');
  assert.ok([15, 30].includes(r.body.coinsGained), `30 × 0.5 (critical doubles first), got ${r.body.coinsGained}`);
  const after = await userRow(u.user.id);
  assert.equal(after.league_points - before.league_points, 30, 'league points tapered too');
});
