// Skill-tree endpoint: merges the full playable curriculum (knowledge graph + levels) with the
// learner's per-concept mastery. Fresh learner → every node unstarted; after seeding a profile
// → that node is started with computed dimensions. Ordered by curriculum level.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('skill tree returns the full curriculum, all unstarted for a fresh learner, level-ordered', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/engine/skill-tree', { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.nodes) && r.body.nodes.length > 5, 'curriculum nodes returned');
  assert.equal(r.body.dimensions.length, 5, 'five named mastery dimensions');

  // Every node well-formed and unstarted; levels non-decreasing.
  let prevLevel = -1;
  for (const n of r.body.nodes) {
    assert.ok(n.conceptId && n.name && n.category && typeof n.level === 'number');
    assert.ok(Array.isArray(n.prereqs));
    assert.equal(n.started, false);
    assert.equal(n.dimensions, null);
    assert.ok(n.level >= prevLevel, 'nodes are sorted by level');
    prevLevel = n.level;
  }
});

test('a seeded concept profile shows up as started with computed dimensions', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  await dbRun(
    `INSERT INTO learner_profiles
       (user_id, concept_id, mastery_score, confidence_score, avg_response_ms, retention_score,
        accuracy_rate, hint_usage_rate, calculator_usage_rate, retry_rate, exposure_count,
        correct_first_try, learning_velocity, last_seen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [userId, 'arithmetic_add', 0.85, 0.8, 5000, 0.8, 0.9, 0.1, 0.0, 0.1, 10, 8, 0.5, Math.floor(Date.now() / 1000)]
  );

  const r = await api(ctx.base, 'GET', '/api/engine/skill-tree', { token: u.token });
  const node = r.body.nodes.find((n) => n.conceptId === 'arithmetic_add');
  assert.ok(node, 'arithmetic_add is in the tree');
  assert.equal(node.started, true);
  assert.ok(node.dimensions && typeof node.dimensions.accuracy === 'number');
  assert.ok(node.overall > 0.5, `expected a solid overall mastery, got ${node.overall}`);
  assert.ok(['Developing', 'Proficient', 'Mastered'].includes(node.stage));

  // The learner-wide aggregate is now populated too.
  assert.ok(r.body.masteryProfile && r.body.masteryProfile.conceptCount >= 1);
  // A solidly-retained concept is not flagged for review.
  assert.equal(node.needsReview, false);
});

test('a learned-but-fading concept is flagged needsReview; a strong one is not', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  // Learned (accuracy 0.9) but memory fading (retention 0.25) → should surface for review.
  await dbRun(
    `INSERT INTO learner_profiles
       (user_id, concept_id, mastery_score, confidence_score, avg_response_ms, retention_score,
        accuracy_rate, hint_usage_rate, calculator_usage_rate, retry_rate, exposure_count,
        correct_first_try, learning_velocity, last_seen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [userId, 'arithmetic_add', 0.6, 0.6, 5000, 0.25, 0.9, 0.1, 0.0, 0.1, 12, 10, 0.5, Math.floor(Date.now() / 1000)]
  );

  const r = await api(ctx.base, 'GET', '/api/engine/skill-tree', { token: u.token });
  const fading = r.body.nodes.find((n) => n.conceptId === 'arithmetic_add');
  assert.ok(fading && fading.started);
  assert.equal(fading.needsReview, true, 'fading concept should be flagged for review');
  // Every unstarted node stays false.
  assert.ok(r.body.nodes.filter((n) => !n.started).every((n) => n.needsReview === false));
});

test('weekly-recap counts only the last 7 days of activity, plus standing + mastery', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  const dayStr = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);

  // Two days within the window contribute; a 30-day-old day must NOT count.
  await dbRun('INSERT INTO user_commitment_history (user_id, date, solved_count) VALUES (?,?,?)', [userId, dayStr(0), 5]);
  await dbRun('INSERT INTO user_commitment_history (user_id, date, solved_count) VALUES (?,?,?)', [userId, dayStr(2), 3]);
  await dbRun('INSERT INTO user_commitment_history (user_id, date, solved_count) VALUES (?,?,?)', [userId, dayStr(30), 100]);
  await dbRun('UPDATE users SET streak = 4, level = 6, coins = 120 WHERE id = ?', [userId]);

  // A solid concept so mastery + topConcept populate.
  await dbRun(
    `INSERT INTO learner_profiles
       (user_id, concept_id, mastery_score, confidence_score, avg_response_ms, retention_score,
        accuracy_rate, hint_usage_rate, calculator_usage_rate, retry_rate, exposure_count,
        correct_first_try, learning_velocity, last_seen)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [userId, 'arithmetic_add', 0.85, 0.8, 5000, 0.8, 0.9, 0.1, 0.0, 0.1, 10, 8, 0.5, Math.floor(Date.now() / 1000)]
  );

  const r = await api(ctx.base, 'GET', '/api/engine/weekly-recap', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.weekProblems, 8, 'only the last 7 days count (5 + 3, not the old 100)');
  assert.equal(r.body.activeDays, 2);
  assert.equal(r.body.streak, 4);
  assert.equal(r.body.level, 6);
  assert.equal(r.body.coins, 120);
  assert.ok(r.body.conceptsPracticed >= 1);
  assert.ok(r.body.overallMastery > 0.5, `expected solid mastery, got ${r.body.overallMastery}`);
  assert.ok(r.body.topConcept && r.body.topConcept.name, 'a strongest concept is surfaced');
});
