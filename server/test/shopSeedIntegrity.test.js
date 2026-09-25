// The shop_items type CHECK constraint silently ate an entire cosmetic generation once:
// title/effect/victory/tap/frame items were added to the db.js seed, but the CHECK still listed
// only the original five types — and because the seed uses INSERT OR IGNORE, every new-type row
// was dropped without an error. This test pins every seeded cosmetic family
// to the actual table so a CHECK/seed mismatch fails loudly instead of silently.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const EXPECTED_FAMILIES = ['avatar', 'theme', 'badge', 'banner', 'utility', 'title', 'effect', 'victory', 'tap', 'frame'];

test('every seeded cosmetic family survives into shop_items (CHECK matches the seed)', async () => {
  const rows = await new Promise((resolve, reject) => {
    ctx.mod.db.all('SELECT type, COUNT(*) AS n FROM shop_items GROUP BY type', (err, r) =>
      err ? reject(err) : resolve(r)
    );
  });
  const byType = Object.fromEntries(rows.map((r) => [r.type, r.n]));
  for (const family of EXPECTED_FAMILIES) {
    assert.ok(
      (byType[family] || 0) > 0,
      `seeded '${family}' items are missing from shop_items — the type CHECK constraint ` +
        `probably doesn't list '${family}' and INSERT OR IGNORE swallowed the rows`
    );
  }
});

test('the shop catalog serves purchasable titles and effects to the client', async () => {
  const { token } = await registerUser(ctx.base);
  const { status, body } = await api(ctx.base, 'GET', '/api/shop', { token });
  assert.strictEqual(status, 200);
  const catalog = body.catalogItems || [];
  for (const family of ['title', 'effect', 'victory', 'tap']) {
    assert.ok(
      catalog.some((i) => i.type === family && (i.originalCost ?? i.cost) > 0),
      `catalogItems has no purchasable '${family}' item — the Cosmetics ${family} filter renders empty`
    );
  }
});
