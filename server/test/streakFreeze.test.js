// Streak insurance (the "streak freeze" = item_streak_shield). Boots the real app against a
// throwaway DB and drives the actual /api/auth/login path: a learner who missed a day keeps their
// streak iff they hold a shield (consumed transactionally), and resets normally when they don't.
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

// ---- tiny promisified DB helpers over the test connection -------------------------
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = async (username) => (await dbGet('SELECT id FROM users WHERE username = ?', [username])).id;

const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);

// Poll until `fn()` returns truthy (the save notification is sent fire-and-forget after login).
async function waitFor(fn, tries = 60, delay = 20) {
  for (let i = 0; i < tries; i++) {
    const r = await fn();
    if (r) return r;
    await new Promise((res) => setTimeout(res, delay));
  }
  return null;
}

const login = (u) => api(ctx.base, 'POST', '/api/auth/login', { body: { username: u.username, password: u.password } });
const giveShields = (id, qty) =>
  dbRun("INSERT INTO user_utilities (user_id, item_id, quantity) VALUES (?, 'item_streak_shield', ?)", [id, qty]);
// Make the user look like they missed `days` days, with the given streak/state.
const setStale = (id, streak, days, state = 'active') =>
  dbRun('UPDATE users SET streak = ?, commitment_state = ?, last_active = ? WHERE id = ?',
    [streak, state, nowSec() - Math.round(days * DAY), id]);

// ---- A held shield preserves the streak and is consumed transactionally ----------
test('missed day + a shield held: streak is preserved, shield consumed, save notified', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await setStale(id, 5, 2.5);     // missed a day (>2d, <3d)
  await giveShields(id, 1);

  const res = await login(u);
  assert.equal(res.status, 200, 'login should succeed');

  const after = await dbGet('SELECT streak, commitment_state FROM users WHERE id = ?', [id]);
  assert.equal(after.streak, 5, 'streak must be preserved by the shield');
  assert.equal(after.commitment_state, 'protected', 'state should flip to protected');

  const util = await dbGet("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [id]);
  assert.equal(util.quantity, 0, 'exactly one shield should be consumed');

  // The save notification (in-app) is dispatched fire-and-forget after the response.
  const log = await waitFor(() =>
    dbGet("SELECT * FROM notification_log WHERE user_id = ? AND category = 'streak_freeze_used' AND channel = 'inapp'", [id]));
  assert.ok(log, 'a streak_freeze_used notification should be recorded');
  const note = await dbGet("SELECT * FROM user_notifications WHERE user_id = ? AND title LIKE '%saved%'", [id]);
  assert.ok(note, 'an in-app "streak saved" note should exist');
  assert.ok(note.message.includes('5-day'), 'the message names the preserved streak length');
});

// ---- No shield, well past the grace window: the streak resets to 0 ----------------
test('missed several days with no shield: streak resets to 0', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await setStale(id, 7, 4);       // >3d gap, no shield -> hard reset

  const res = await login(u);
  assert.equal(res.status, 200);

  const after = await dbGet('SELECT streak, commitment_state FROM users WHERE id = ?', [id]);
  assert.equal(after.streak, 0, 'streak must reset to 0 with no shield past the grace window');
  assert.equal(after.commitment_state, 'active');
});

// ---- No shield, inside the grace window: streak is held but enters "fading" -------
test('missed a day with no shield (within grace): streak survives as fading', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await setStale(id, 4, 2.5);     // >2d, <3d, no shield -> fading (climb preserved for recovery)

  await login(u);

  const after = await dbGet('SELECT streak, commitment_state FROM users WHERE id = ?', [id]);
  assert.equal(after.streak, 4, 'the climb count is preserved while fading');
  assert.equal(after.commitment_state, 'fading');
});

// ---- A shield is not wasted when there is no streak to save -----------------------
test('missed day with a shield but zero streak: the shield is NOT spent', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  await setStale(id, 0, 2.5);
  await giveShields(id, 1);

  await login(u);

  const util = await dbGet("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [id]);
  assert.equal(util.quantity, 1, 'no streak worth saving -> keep the shield');
});
