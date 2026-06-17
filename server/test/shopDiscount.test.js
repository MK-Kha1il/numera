// The shop's only discount is a gentle affordability help for low-coin, engaged players.
// The old "hoarder discount" (cheaper the richer you are) was removed — it accelerated coin
// inflation and was a dark pattern (ultra-review #10/#32 + docs/EconomyModel.md).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));

test('a coin-rich hoarder is NOT given a discount (old dark pattern removed)', async () => {
  const { token, user } = await registerUser(ctx.base);
  // High balance, high save-rate, few solves — the exact profile the old rule rewarded.
  await dbRun('UPDATE users SET coins = 2000, total_coins_earned = 2000, solved_count = 10 WHERE id = ?', [user.id]);

  const { status, body } = await api(ctx.base, 'GET', '/api/shop', { token });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.discountApplied, false, 'a hoarder must pay full price');
  for (const item of body.catalogItems || []) {
    assert.strictEqual(item.cost, item.originalCost, `item ${item.id} should be full price`);
  }
});

test('a low-coin, engaged player still gets the affordability discount', async () => {
  const { token, user } = await registerUser(ctx.base);
  // Low balance but clearly active — the kind, retained help we keep.
  await dbRun('UPDATE users SET coins = 150, total_coins_earned = 4000, solved_count = 60 WHERE id = ?', [user.id]);

  const { status, body } = await api(ctx.base, 'GET', '/api/shop', { token });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.discountApplied, true, 'an engaged low-coin player gets 10% off');
  const sample = (body.catalogItems || [])[0];
  assert.ok(sample, 'expected at least one catalog item');
  assert.strictEqual(sample.cost, Math.round(sample.originalCost * 0.9));
});
