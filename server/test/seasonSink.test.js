// The seasonal cosmetic sink (ultra-review #66/#75 / docs/EconomyModel.md): a rotating pool of
// season-exclusive cosmetics (buyable only in their slot's active season) plus a coin->season-token
// conversion that funds token-only prestige items. Keeps coins meaningful past the one-time catalog.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, function (e) { return e ? rej(e) : res(this); }));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));

const SLOTS = 3;
// Make exactly one active season and return its slot (= id % SLOTS).
async function activateSeason() {
  await dbRun('UPDATE seasons SET is_active = 0');
  const now = Math.floor(Date.now() / 1000);
  const ins = await dbRun('INSERT INTO seasons (name, start_at, end_at, is_active) VALUES (?, ?, ?, 1)', ['Test Season', now, now + 86400]);
  return ins.lastID % SLOTS;
}

test('the shop surfaces only the active slot\'s season cosmetics + token-only prestige items', async () => {
  const slot = await activateSeason();
  const { token } = await registerUser(ctx.base);
  const { status, body } = await api(ctx.base, 'GET', '/api/shop', { token });

  assert.strictEqual(status, 200);
  assert.strictEqual(body.seasonInfo.slot, slot);
  assert.ok(body.seasonItems.length >= 1, 'expected at least one season cosmetic on sale');
  assert.ok(body.seasonItems.every((i) => i.season_slot === slot), 'only the active slot is sold');
  assert.ok(body.tokenItems.length >= 1 && body.tokenItems.every((i) => i.token_cost > 0));
  // Season + token items must NOT leak into the normal coin catalog.
  assert.ok((body.catalogItems || []).every((i) => i.season_slot == null && !(i.token_cost > 0)));
});

test('convert surplus coins into tokens, then claim a token-only prestige item', async () => {
  const slot = await activateSeason(); void slot;
  const { token, user } = await registerUser(ctx.base);
  await dbRun('UPDATE users SET coins = 5000 WHERE id = ?', [user.id]);

  const conv = await api(ctx.base, 'POST', '/api/shop/convert-coins', {
    token, body: { tokens: 3 }, headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  assert.strictEqual(conv.status, 200);
  assert.strictEqual(conv.body.coinsSpent, 1500); // 3 * 500
  assert.strictEqual(conv.body.seasonTokens, 3);
  assert.strictEqual(conv.body.coins, 3500);

  // avatar_celestial costs 3 tokens.
  const buy = await api(ctx.base, 'POST', '/api/shop/purchase', {
    token, body: { itemId: 'avatar_celestial' }, headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  assert.strictEqual(buy.status, 200, JSON.stringify(buy.body));
  assert.strictEqual(buy.body.tokensLeft, 0);

  // Owned now, and no tokens left to buy another.
  const owned = await dbGet('SELECT COUNT(*) AS n FROM user_inventory WHERE user_id = ? AND item_id = ?', [user.id, 'avatar_celestial']);
  assert.strictEqual(owned.n, 1);
  const broke = await api(ctx.base, 'POST', '/api/shop/purchase', {
    token, body: { itemId: 'banner_eternal' }, headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  assert.strictEqual(broke.status, 400);
  assert.match(broke.body.error, /Season Tokens/);
});

test('a season cosmetic outside the active slot cannot be purchased', async () => {
  const slot = await activateSeason();
  const { token, user } = await registerUser(ctx.base);
  await dbRun('UPDATE users SET coins = 5000 WHERE id = ?', [user.id]);

  // An item in a DIFFERENT slot than the active one.
  const offSlot = (slot + 1) % SLOTS;
  const item = await dbGet('SELECT id FROM shop_items WHERE season_slot = ? LIMIT 1', [offSlot]);
  assert.ok(item, 'expected a seeded season item in the off-slot');

  const res = await api(ctx.base, 'POST', '/api/shop/purchase', {
    token, body: { itemId: item.id }, headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /not available/);
});
