// Server-side validation of client-supplied solo session metrics (competitive audit #29/#95 / Top-25
// #8). The solo /api/rating/session is the last place the client asserts its own performance — duels
// are server-graded — so the server must enforce internal consistency: you can't solve more than you
// attempted, and the perfect-combo bonus only counts on an actually-flawless run. Otherwise a cheater
// could pump the unified rating with a spoofed "perfect" session.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));

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
  await api(ctx.base, 'POST', '/api/rating/session', {
    token: u.token,
    body: { category: 'algebra', level: 10, solvedCount: 3, totalProblems: 5, errorsCount: 2, speedBonus: 20, comboBonus: 15, gameMode: 'level' },
  });
  const comps = await lastGlobalComponents(u.username);
  assert.equal(comps.combo, 0, 'the perfect-combo bonus is zeroed on a non-perfect session');
});

test('a genuinely flawless full run keeps its combo bonus', async () => {
  const u = await registerUser(ctx.base);
  await api(ctx.base, 'POST', '/api/rating/session', {
    token: u.token,
    body: { category: 'algebra', level: 10, solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' },
  });
  const comps = await lastGlobalComponents(u.username);
  assert.ok(comps.combo > 0, 'an honest perfect run still earns the combo bonus');
});

test('solvedCount cannot exceed totalProblems → a spoofed over-solve does not outscore an honest run', async () => {
  const cheater = await registerUser(ctx.base);
  const honest = await registerUser(ctx.base);
  // Cheater claims solving 20 of 5 (impossible); honest solves a real 5/5.
  await api(ctx.base, 'POST', '/api/rating/session', {
    token: cheater.token,
    body: { category: 'algebra', level: 10, solvedCount: 20, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' },
  });
  await api(ctx.base, 'POST', '/api/rating/session', {
    token: honest.token,
    body: { category: 'algebra', level: 10, solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' },
  });
  const cheat = await lastGlobalComponents(cheater.username);
  const fair = await lastGlobalComponents(honest.username);
  // Accuracy is solved/total — clamping solved to total makes both a clean 100%, so the cheat buys nothing.
  assert.ok(cheat.accuracy <= fair.accuracy + 1e-9, 'over-claiming solves cannot beat an honest perfect run');
});
