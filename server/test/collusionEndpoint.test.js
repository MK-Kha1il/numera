// Admin collusion-review endpoint (audit #18): read-only, admin-gated, surfaces pumped pairs from the
// match log. Seeds a win-trade pattern and asserts it is flagged for review.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

const logDuel = (userId, opponentId, result, delta) =>
  dbRun(
    "INSERT INTO match_log (user_id, mode, opponent_id, opponent_name, my_score, opp_score, result, rating_delta, created_at) VALUES (?, 'duel', ?, 'Foe', 3, 2, ?, ?, strftime('%s','now'))",
    [userId, opponentId, result, delta]
  );

test('the collusion review endpoint is admin-only', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'GET', '/api/rating/admin/collusion', { token: u.token });
  assert.equal(res.status, 403, 'a normal user cannot read the integrity queue');
});

test('a pumped pair is surfaced for admin review', async () => {
  const pumper = await registerUser(ctx.base);
  const partner = await registerUser(ctx.base);
  const pumperId = await idOf(pumper.username);
  const partnerId = await idOf(partner.username);
  // 8 duels vs the same partner, almost all wins with positive rating — the pump signature.
  for (let i = 0; i < 8; i++) await logDuel(pumperId, partnerId, 'win', 15);

  const admin = await registerUser(ctx.base);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [await idOf(admin.username)]);

  const res = await api(ctx.base, 'GET', '/api/rating/admin/collusion', { token: admin.token });
  assert.equal(res.status, 200);
  const hit = res.body.flagged.find((f) => f.userId === pumperId && f.opponentId === partnerId);
  assert.ok(hit, 'the pumped pair is flagged');
  assert.equal(hit.username, pumper.username, 'usernames are attached for review');
  assert.ok(hit.reasons.length >= 1, 'a reason is given');
});
