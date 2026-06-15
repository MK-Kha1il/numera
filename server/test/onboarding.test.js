// First-launch onboarding flow: catalogs + state, multi-select motivations/interests, profile,
// a roadmap derived from the diagnostic's per-category trail, the achievable "aha" problem (graded
// server-side), habit schedule, notification opt-in, the completion gate, and funnel analytics.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbAll = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('a fresh user is not onboarded and is offered all catalogs', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/onboarding/state', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.onboardingComplete, false);
  const c = r.body.catalogs;
  assert.ok(c.motivations.length >= 10, 'motivations catalog present');
  assert.ok(c.interests.length >= 5, 'interests catalog present');
  assert.ok(c.profileStyles.length >= 3, 'profile styles present');
  assert.ok(c.avatars.length >= 8, 'expanded avatar set present');
  assert.ok(c.motivations.every((m) => m.key && m.label && m.emoji), 'motivations are well-formed');
});

test('motivations are multi-select and a later save replaces the earlier one', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);

  let r = await api(ctx.base, 'POST', '/api/onboarding/motivations', { token: u.token, body: { keys: ['improve_grades', 'compete', 'mental_math'] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 3);
  let rows = await dbAll('SELECT motivation_key FROM user_motivations WHERE user_id = ?', [userId]);
  assert.equal(rows.length, 3);

  // Replace (not append), and drop an invalid key.
  r = await api(ctx.base, 'POST', '/api/onboarding/motivations', { token: u.token, body: { keys: ['challenge_myself', 'not_a_real_goal'] } });
  assert.equal(r.body.count, 1, 'invalid keys are filtered out');
  rows = await dbAll('SELECT motivation_key FROM user_motivations WHERE user_id = ?', [userId]);
  assert.deepEqual(rows.map((x) => x.motivation_key), ['challenge_myself'], 'previous selection was replaced');
});

test('profile saves display name, avatar and interests', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  const r = await api(ctx.base, 'POST', '/api/onboarding/profile', {
    token: u.token,
    body: { displayName: '  Ada  ', profileStyle: 'scholar', avatar: 'avatar_dragon', interests: ['coding', 'space', 'bogus'] },
  });
  assert.equal(r.status, 200);
  const user = await dbGet('SELECT display_name, profile_style, avatar FROM users WHERE id = ?', [userId]);
  assert.equal(user.display_name, 'Ada', 'display name trimmed');
  assert.equal(user.profile_style, 'scholar');
  assert.equal(user.avatar, 'avatar_dragon');
  const interests = await dbAll('SELECT interest_key FROM user_interests WHERE user_id = ?', [userId]);
  assert.deepEqual(interests.map((x) => x.interest_key).sort(), ['coding', 'space'], 'only valid interests stored');
});

test('roadmap derives strengths and growth from the completed diagnostic trail', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  await dbRun('UPDATE users SET level = 12 WHERE id = ?', [userId]);
  // Strong arithmetic, weak algebra.
  const log = JSON.stringify([
    { category: 'arithmetic', level: 5, correct: true },
    { category: 'arithmetic', level: 6, correct: true },
    { category: 'algebra', level: 12, correct: false },
    { category: 'algebra', level: 11, correct: false },
    { category: 'algebra', level: 13, correct: true },
  ]);
  await dbRun(
    "INSERT INTO diagnostic_sessions (user_id, level, low, high, asked, correct, status, created_at, category_log) VALUES (?, 12, 1, 50, 7, 3, 'done', ?, ?)",
    [userId, Date.now(), log]
  );

  const r = await api(ctx.base, 'GET', '/api/onboarding/roadmap', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.placedLevel, 12);
  assert.ok(r.body.strengths.some((s) => s.key === 'arithmetic'), 'arithmetic is a strength');
  assert.ok(r.body.growth.some((g) => g.key === 'algebra'), 'algebra is a growth area');
  assert.equal(r.body.milestones.length, 3, 'three milestone estimates');
  assert.ok(typeof r.body.recommendedFocus === 'string' && r.body.recommendedFocus.length > 0);
});

test('roadmap falls back gracefully when the diagnostic was skipped', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/onboarding/roadmap', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.growth.length >= 1, 'still offers a focus area without diagnostic data');
  assert.equal(r.body.milestones.length, 3);
});

test('the aha problem is graded server-side and exactly one option is correct', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/onboarding/aha/start', { token: u.token });
  assert.equal(start.status, 200);
  assert.ok(start.body.question, 'a question is served');
  assert.ok(Array.isArray(start.body.options) && start.body.options.length >= 2, 'options served');
  assert.equal(start.body.answer, undefined, 'the answer is never sent to the client');

  // Black-box: a miss keeps the problem pending, so we can walk the options until one grades
  // correct — proving one of the served options really is the (server-held) answer.
  let foundCorrect = false;
  for (const opt of start.body.options) {
    const ans = await api(ctx.base, 'POST', '/api/onboarding/aha/answer', { token: u.token, body: { answer: opt } });
    assert.equal(ans.status, 200);
    if (ans.body.correct) { foundCorrect = true; break; }
  }
  assert.ok(foundCorrect, 'one of the served options is the correct answer');

  // After a correct answer the problem is consumed.
  const again = await api(ctx.base, 'POST', '/api/onboarding/aha/answer', { token: u.token, body: { answer: '0' } });
  assert.equal(again.status, 400, 'no pending problem after success');
});

test('habit schedule and notification opt-in persist', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);

  const c = await api(ctx.base, 'POST', '/api/onboarding/commitment', { token: u.token, body: { frequency: 'custom', days: [1, 3, 5, 9] } });
  assert.equal(c.status, 200);
  assert.deepEqual(c.body.schedule.days, [1, 3, 5], 'out-of-range days are filtered');
  const user = await dbGet('SELECT practice_schedule, reminders_opt_in FROM users WHERE id = ?', [userId]);
  assert.equal(JSON.parse(user.practice_schedule).frequency, 'custom');

  const n = await api(ctx.base, 'POST', '/api/onboarding/notifications', { token: u.token, body: { optIn: true } });
  assert.equal(n.body.optIn, true);
  const after = await dbGet('SELECT reminders_opt_in FROM users WHERE id = ?', [userId]);
  assert.equal(after.reminders_opt_in, 1);
  // Opting in actually enables push delivery (the lifecycle funnel gates on this; it defaults OFF).
  const prefs = await dbGet('SELECT push_enabled FROM notification_preferences WHERE user_id = ?', [userId]);
  assert.ok(prefs && prefs.push_enabled === 1, 'opt-in enables push in notification_preferences');
});

test('declining notifications never clobbers existing reminder preferences', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  const declined = await api(ctx.base, 'POST', '/api/onboarding/notifications', { token: u.token, body: { optIn: false } });
  assert.equal(declined.body.optIn, false);
  assert.equal((await dbGet('SELECT reminders_opt_in FROM users WHERE id = ?', [userId])).reminders_opt_in, 0);
  // "Maybe later" must not force-write a prefs row that could disable the adult email-lifecycle default.
  const prefs = await dbGet('SELECT user_id FROM notification_preferences WHERE user_id = ?', [userId]);
  assert.ok(!prefs, 'declining leaves preferences at their (Settings-managed) defaults');
});

test('completing onboarding flips the gate everywhere it is read', async () => {
  const u = await registerUser(ctx.base);
  const done = await api(ctx.base, 'POST', '/api/onboarding/complete', { token: u.token });
  assert.equal(done.status, 200);

  const state = await api(ctx.base, 'GET', '/api/onboarding/state', { token: u.token });
  assert.equal(state.body.onboardingComplete, true);
  // The flag is also exposed on the shared user object the client gates navigation on.
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token: u.token });
  assert.equal(me.body.onboarding_complete, 1);
});

test('analytics events are recorded and require step + event', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  const ok = await api(ctx.base, 'POST', '/api/onboarding/event', { token: u.token, body: { step: 'goals', event: 'enter', ms: 1200 } });
  assert.equal(ok.status, 200);
  const bad = await api(ctx.base, 'POST', '/api/onboarding/event', { token: u.token, body: { event: 'enter' } });
  assert.equal(bad.status, 400, 'step is required');
  const rows = await dbAll('SELECT step, event, ms FROM onboarding_events WHERE user_id = ?', [userId]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].step, 'goals');
  assert.equal(rows[0].ms, 1200);
});

test('feature spotlights (progressive disclosure) are tracked once and idempotently', async () => {
  const u = await registerUser(ctx.base);
  let r = await api(ctx.base, 'GET', '/api/onboarding/spotlights', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.catalog.length >= 4, 'a spotlight catalog is offered');
  assert.deepEqual(r.body.seen, [], 'a fresh user has seen none');

  const bad = await api(ctx.base, 'POST', '/api/onboarding/spotlights/seen', { token: u.token, body: { key: 'not_a_feature' } });
  assert.equal(bad.status, 400, 'unknown spotlight keys are rejected');

  await api(ctx.base, 'POST', '/api/onboarding/spotlights/seen', { token: u.token, body: { key: 'arena' } });
  await api(ctx.base, 'POST', '/api/onboarding/spotlights/seen', { token: u.token, body: { key: 'arena' } }); // idempotent
  r = await api(ctx.base, 'GET', '/api/onboarding/spotlights', { token: u.token });
  assert.deepEqual(r.body.seen, ['arena'], 'seen once, recorded once');
});

test('onboarding analytics is admin-only and builds a per-step funnel', async () => {
  const normal = await registerUser(ctx.base);
  const denied = await api(ctx.base, 'GET', '/api/onboarding/analytics', { token: normal.token });
  assert.equal(denied.status, 403, 'non-admins are denied');

  // Deterministic funnel: clear events, then seed 2 starters where only 1 finishes.
  await dbRun('DELETE FROM onboarding_events');
  const admin = await registerUser(ctx.base);
  const adminId = await idOf(admin.username);
  await dbRun("UPDATE users SET role = 'admin' WHERE id = ?", [adminId]);
  const uid1 = await idOf(normal.username);
  const ins = (uid, step, event, at) =>
    dbRun('INSERT INTO onboarding_events (user_id, step, event, ms, created_at) VALUES (?,?,?,?,?)', [uid, step, event, null, at]);
  await ins(uid1, 'welcome', 'enter', 1000);
  await ins(uid1, 'aha', 'enter', 1030); // 30s on welcome, then dropped before finishing
  await ins(adminId, 'welcome', 'enter', 2000);
  await ins(adminId, 'celebrate', 'complete', 2500);

  const r = await api(ctx.base, 'GET', '/api/onboarding/analytics', { token: admin.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.totalStarted, 2);
  assert.equal(r.body.totalCompleted, 1);
  assert.equal(r.body.completionRate, 50);
  const welcome = r.body.steps.find((s) => s.step === 'welcome');
  assert.equal(welcome.entered, 2);
  assert.equal(welcome.droppedAfter, 1, 'one of two who entered welcome did not reach aha');
  assert.equal(welcome.medianSeconds, 30, 'median time on welcome derived from enter timestamps');
});
