// Earn-only items (cost-0 badges/relics granted by achievement, rank, and commitment
// services) must be invisible to the shop catalog AND rejected by the purchase route.
// Without the purchase guard, a direct API call could acquire a Legendary relic for 0 coins.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('shop catalog never lists earn-only (cost-0) items', async () => {
  const { token } = await registerUser(ctx.base);
  const { status, body } = await api(ctx.base, 'GET', '/api/shop', { token });
  assert.strictEqual(status, 200);
  const listed = [
    ...(body.dailyItems || []),
    ...(body.featuredItems || []),
    ...(body.utilities || []),
    ...(body.items || []),
    ...(body.catalog || []),
  ];
  for (const item of listed) {
    assert.ok(
      (item.originalCost ?? item.cost) > 0,
      `earn-only item '${item.id}' leaked into the shop catalog`
    );
  }
});

test('purchasing an earn-only relic is rejected (and grants nothing)', async () => {
  const { token, user } = await registerUser(ctx.base);
  const { status, body } = await api(ctx.base, 'POST', '/api/shop/purchase', {
    token,
    body: { itemId: 'relic_sage' },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  assert.strictEqual(status, 400, `expected rejection, got ${status}: ${JSON.stringify(body)}`);

  const owned = await new Promise((resolve, reject) => {
    ctx.mod.db.get(
      'SELECT COUNT(*) AS n FROM user_inventory WHERE user_id = ? AND item_id = ?',
      [user.id, 'relic_sage'],
      (err, row) => (err ? reject(err) : resolve(row.n))
    );
  });
  assert.strictEqual(owned, 0, 'earn-only relic must not be granted by a purchase attempt');
});

test('a normal priced item still purchases correctly', async () => {
  const { token } = await registerUser(ctx.base);
  // Find the cheapest priced cosmetic so a fresh user's starting coins may cover it; if they
  // can't afford anything, "Insufficient coins" (not a guard error) is the correct outcome.
  const cheapest = await new Promise((resolve, reject) => {
    ctx.mod.db.get(
      'SELECT id, cost FROM shop_items WHERE cost > 0 AND is_utility = 0 ORDER BY cost ASC LIMIT 1',
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
  assert.ok(cheapest, 'expected at least one priced cosmetic in the catalog');
  const { status, body } = await api(ctx.base, 'POST', '/api/shop/purchase', {
    token,
    body: { itemId: cheapest.id },
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  if (status === 200) {
    assert.strictEqual(body.success, true);
  } else {
    assert.strictEqual(status, 400);
    assert.match(body.error || '', /Insufficient coins/);
  }
});
