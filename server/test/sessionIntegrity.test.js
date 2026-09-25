// Internal-consistency validation of solo session metrics.
// Solo sessions now reach the rating only through POST /api/math/complete (ticket-anchored), which
// calls services/ratingService.applySoloSessionToRatings; that function still enforces, as defense
// in depth: you can't solve more than you attempted, and the perfect-combo bonus only counts on an
// actually-flawless run. These tests drive it directly, then prove the old client-asserted
// POST /api/rating/session is gone and that a real level session moves the rating end to end.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
// Apply a solo session straight through the rating service (what /complete calls).
const rateSession = (user, body) =>
  new Promise((res, rej) =>
    require('../services/ratingService').applySoloSessionToRatings(user.user.id, body, (e, r) => (e ? rej(e) : res(r)))
  );

// Read the components_json of the latest global rating-history row to see what the server actually scored.
async function lastGlobalComponents(username) {
  const row = await dbGet(
    `SELECT rh.components_json AS cj FROM rating_history rh
       JOIN users u ON u.id = rh.user_id
      WHERE u.username = ? AND rh.domain = 'global'
      ORDER BY rh.id DESC LIMIT 1`,
    [username]
  );
  return JSON.parse(row.cj);
}

test('a claimed perfect-combo on a session WITH errors is dropped (combo only on a flawless run)', async () => {
  const u = await registerUser(ctx.base);
  // Claim the max combo bonus but also report errors + an incomplete solve — not a real perfect run.
  await rateSession(u, { category: 'algebra', level: 10, solvedCount: 3, totalProblems: 5, errorsCount: 2, speedBonus: 20, comboBonus: 15, gameMode: 'level' });
  const comps = await lastGlobalComponents(u.username);
  assert.equal(comps.combo, 0, 'the perfect-combo bonus is zeroed on a non-perfect session');
});

test('a genuinely flawless full run keeps its combo bonus', async () => {
  const u = await registerUser(ctx.base);
  await rateSession(u, { category: 'algebra', level: 10, solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' });
  const comps = await lastGlobalComponents(u.username);
  assert.ok(comps.combo > 0, 'an honest perfect run still earns the combo bonus');
});

test('solvedCount cannot exceed totalProblems → a spoofed over-solve does not outscore an honest run', async () => {
  const cheater = await registerUser(ctx.base);
  const honest = await registerUser(ctx.base);
  // Cheater claims solving 20 of 5 (impossible); honest solves a real 5/5.
  await rateSession(cheater, { category: 'algebra', level: 10, solvedCount: 20, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' });
  await rateSession(honest, { category: 'algebra', level: 10, solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' });
  const cheat = await lastGlobalComponents(cheater.username);
  const fair = await lastGlobalComponents(honest.username);
  // Accuracy is solved/total — clamping solved to total makes both a clean 100%, so the cheat buys nothing.
  assert.ok(cheat.accuracy <= fair.accuracy + 1e-9, 'over-claiming solves cannot beat an honest perfect run');
});

test('the client-asserted POST /api/rating/session no longer exists', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/rating/session', {
    token: u.token,
    body: { category: 'algebra', level: 60, solvedCount: 20, totalProblems: 20, errorsCount: 0, speedBonus: 20, comboBonus: 15 },
  });
  assert.equal(r.status, 404);
});

test('a ticket-anchored level session moves the rating; a practice mode does not', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/math/problems?category=algebra&level=1&count=3', { token: u.token });
  const done = await api(ctx.base, 'POST', '/api/math/complete', {
    token: u.token,
    body: { gameMode: 'level', category: 'algebra', level: 1, solvedCount: 3, errorsCount: 0 },
  });
  assert.equal(done.status, 200);
  assert.ok(done.body.rating, 'the response carries the rating movement');
  assert.equal(done.body.rating.domain.name, 'algebra');
  const hist = await dbGet(
    "SELECT COUNT(*) AS n FROM rating_history rh JOIN users u ON u.id = rh.user_id WHERE u.username = ? AND rh.domain = 'global'",
    [u.username]
  );
  assert.equal(hist.n, 1, 'one rated session recorded');

  const other = await registerUser(ctx.base);
  await api(ctx.base, 'GET', '/api/math/word-problems?count=3', { token: other.token });
  const practice = await api(ctx.base, 'POST', '/api/math/complete', {
    token: other.token,
    body: { gameMode: 'word_problems', solvedCount: 3, errorsCount: 0 },
  });
  assert.equal(practice.body.rating, null, 'practice modes are rating-neutral');
});
