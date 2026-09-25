// Economy ledger (docs/EconomyModel.md follow-up): every coin faucet/sink lands in the aggregate
// economy_daily table (no user ids), the admin rollup reports faucets, sinks and net flow, quest
// claims are transactional, and /healthz answers for uptime monitors.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const ledger = (source, flow) =>
  dbGet('SELECT coins, events FROM economy_daily WHERE day = ? AND source = ? AND flow = ?', [today(), source, flow]);
// Ledger writes are fire-and-forget after the reward commits; poll briefly.
async function waitLedger(source, flow, minCoins) {
  for (let i = 0; i < 50; i++) {
    const row = await ledger(source, flow);
    if (row && row.coins >= minCoins) return row;
    await sleep(20);
  }
  return ledger(source, flow);
}

test('recordCoins aggregates by day/source/flow and ignores junk', async () => {
  const { recordCoins } = require('../services/economyLedger');
  recordCoins('bot_duel', 12);
  recordCoins('bot_duel', 8);
  recordCoins('not_a_source', 999);
  recordCoins('bot_duel', 0);
  const row = await waitLedger('bot_duel', 'in', 20);
  assert.ok(row.coins >= 20 && row.events >= 2);
  const junk = await dbGet("SELECT COUNT(*) AS n FROM economy_daily WHERE source = 'not_a_source'");
  assert.equal(junk.n, 0);
});

test('a quest claim pays once, transactionally, and is recorded as a faucet', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/quests', { token: u.token });
  await dbRun('UPDATE user_quests SET solved_today = 5 WHERE user_id = ?', [u.user.id]);
  const before = (await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins;
  const baseline = ((await ledger('quest_claim', 'in')) || { coins: 0 }).coins;

  const first = await api(ctx.base, 'POST', '/api/quests/claim', { token: u.token, body: { questType: 'solved' } });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const second = await api(ctx.base, 'POST', '/api/quests/claim', { token: u.token, body: { questType: 'solved' } });
  assert.equal(second.status, 400);
  const after = (await dbGet('SELECT coins FROM users WHERE id = ?', [u.user.id])).coins;
  assert.equal(after - before, first.body.rewardCoins);
  const row = await waitLedger('quest_claim', 'in', baseline + first.body.rewardCoins);
  assert.equal(row.coins - baseline, first.body.rewardCoins);
});

test('a finished quest from yesterday cannot be cashed after the daily reset', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/quests', { token: u.token });
  const yesterday = Math.floor(Date.now() / 86400000) * 86400 - 3600;
  await dbRun('UPDATE user_quests SET solved_today = 5, last_quest_reset = ? WHERE user_id = ?', [yesterday, u.user.id]);
  const r = await api(ctx.base, 'POST', '/api/quests/claim', { token: u.token, body: { questType: 'solved' } });
  assert.equal(r.status, 400, 'the reset zeroed yesterday\'s progress first');
});

test('shop purchases are recorded as a sink, and the admin rollup reports net flow', async () => {
  const u = await registerUser(ctx.base);
  await dbRun('UPDATE users SET coins = 5000 WHERE id = ?', [u.user.id]);
  const shop = await api(ctx.base, 'GET', '/api/shop', { token: u.token });
  const items = (shop.body.catalog || shop.body.items || []).filter((i) => i.cost > 0 && !i.required_rank && i.season_slot == null && !i.token_cost);
  assert.ok(items.length > 0, 'a buyable item exists');
  const buy = await api(ctx.base, 'POST', '/api/shop/purchase', { token: u.token, body: { itemId: items[0].id } });
  assert.equal(buy.status, 200, JSON.stringify(buy.body));
  await waitLedger('shop_purchase', 'out', buy.body.coinsSpent);

  const denied = await api(ctx.base, 'GET', '/api/analytics/economy', { token: u.token });
  assert.equal(denied.status, 403);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [u.user.id]);
  const roll = await api(ctx.base, 'GET', '/api/analytics/economy', { token: u.token });
  assert.equal(roll.status, 200);
  assert.ok(roll.body.sinks.find((s) => s.source === 'shop_purchase'), 'the purchase shows as a sink');
  assert.equal(roll.body.totals.net, roll.body.totals.coinsIn - roll.body.totals.coinsOut);
  assert.ok(Array.isArray(roll.body.days) && roll.body.days.length >= 1);
});

test('/healthz reports a live database and the schema version without auth', async () => {
  const r = await api(ctx.base, 'GET', '/healthz');
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.db, 'ok');
  assert.ok(r.body.schemaVersion >= 68);
  assert.ok(r.body.uptimeSec >= 0);
});
