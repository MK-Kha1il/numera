// Strand-coherence tripwires. The curriculum strands (audit #1.1) once shipped with three
// silent gaps: the orchestrator's category→concept map didn't know them (so misconception/
// SRS/weak-concept targeting fell back to arithmetic), user_mastery had no counters for them
// (so solves were dropped), and the achievement catalog had no chains for them. These tests
// pin all three layers to the single source of truth (CONCEPT_TO_LEVEL) so the next strand
// can't ship half-wired.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

// Categories that exist outside CONCEPT_TO_LEVEL's strand routing on purpose.
const SYNTHETIC_CATEGORIES = ['mental', 'milestone'];

test('orchestrator category map covers every CONCEPT_TO_LEVEL category with matching concepts', () => {
  const { CONCEPT_TO_LEVEL } = require('../mathGenerator');
  const { getCategoryConceptIds } = require('../mathEngine/problemOrchestrator');

  const byCategory = {};
  for (const [conceptId, meta] of Object.entries(CONCEPT_TO_LEVEL)) {
    const key = meta.category.toLowerCase().replace(' ', '_');
    (byCategory[key] = byCategory[key] || []).push(conceptId);
  }

  // Milestone concepts are deliberately routed via the synthetic 'milestone' category, not
  // their home category's practice rotation.
  const milestoneConcepts = new Set(getCategoryConceptIds('milestone', 1));

  for (const [category, conceptIds] of Object.entries(byCategory)) {
    const mapped = getCategoryConceptIds(category, 1);
    // The fallback returns the arithmetic list — a non-arithmetic category resolving to it
    // means the category is missing from the orchestrator map.
    if (category !== 'arithmetic') {
      assert.notDeepStrictEqual(
        mapped,
        getCategoryConceptIds('arithmetic', 1),
        `category '${category}' falls back to arithmetic in getCategoryConceptIds`
      );
    }
    for (const conceptId of conceptIds) {
      if (milestoneConcepts.has(conceptId)) continue;
      assert.ok(
        mapped.includes(conceptId),
        `concept '${conceptId}' (category '${category}') missing from getCategoryConceptIds('${category}')`
      );
    }
  }
});

test('every concept the orchestrator maps belongs to that category in CONCEPT_TO_LEVEL', () => {
  const { CONCEPT_TO_LEVEL } = require('../mathGenerator');
  const { getCategoryConceptIds } = require('../mathEngine/problemOrchestrator');

  const categories = [...new Set(
    Object.values(CONCEPT_TO_LEVEL).map((m) => m.category.toLowerCase().replace(' ', '_'))
  )];
  for (const category of categories) {
    for (const conceptId of getCategoryConceptIds(category, 1)) {
      const meta = CONCEPT_TO_LEVEL[conceptId];
      assert.ok(meta, `orchestrator maps unknown concept '${conceptId}' for '${category}'`);
      assert.strictEqual(
        meta.category.toLowerCase().replace(' ', '_'),
        category,
        `concept '${conceptId}' mapped under '${category}' but belongs to '${meta.category}'`
      );
    }
  }
  // Synthetic categories must still resolve to real concepts.
  for (const category of SYNTHETIC_CATEGORIES) {
    for (const conceptId of getCategoryConceptIds(category, 1)) {
      assert.ok(CONCEPT_TO_LEVEL[conceptId], `synthetic '${category}' maps unknown concept '${conceptId}'`);
    }
  }
});

test('every strand category has a user_mastery counter column', async () => {
  const { CONCEPT_TO_LEVEL } = require('../mathGenerator');
  const { db } = ctx.mod;
  const columns = await new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(user_mastery)', (err, rows) =>
      err ? reject(err) : resolve(rows.map((r) => r.name))
    );
  });
  const categories = [...new Set(
    Object.values(CONCEPT_TO_LEVEL).map((m) => m.category.toLowerCase().replace(' ', '_'))
  )];
  for (const category of categories) {
    assert.ok(
      columns.includes(`${category}_correct`),
      `user_mastery has no '${category}_correct' column — strand solves would be dropped`
    );
  }
});

test('every seeded achievement target_type is one achievementService computes', async () => {
  const { db } = ctx.mod;
  // Mirror of the dispatch in services/achievementService.js. If this list and the service
  // drift, a seeded achievement silently never progresses — exactly the bug class this guards.
  const SUPPORTED = new Set([
    'solved_count', 'streak', 'arena_wins', 'level', 'shop_count',
    'perfect_exercises_count', 'perfect_levels_count',
    'mastery_arithmetic', 'mastery_mental', 'mastery_algebra', 'mastery_calculus',
    'mastery_combinatorics', 'mastery_number_theory',
    'mastery_geometry', 'mastery_integers', 'mastery_decimals', 'mastery_fractions',
    'mastery_number_sense', 'mastery_statistics', 'mastery_expressions', 'mastery_powers',
    'mastery_graphing',
    'friends_count', 'daily_puzzles_solved', 'archive_solved',
    'seasonal_spring', 'seasonal_summer', 'calculator_sixseven', 'speed_demon',
  ]);
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT target_type FROM achievements', (err, r) => (err ? reject(err) : resolve(r)));
  });
  assert.ok(rows.length > 0, 'achievement catalog is empty');
  for (const { target_type } of rows) {
    assert.ok(SUPPORTED.has(target_type), `achievement target_type '${target_type}' is not computed by achievementService`);
  }
});

test('a strand mastery counter completes its achievement chain end-to-end', async () => {
  const { db } = ctx.mod;
  const { updateAchievements } = require('../services/achievementService');
  const { user } = await registerUser(ctx.base);

  await new Promise((resolve, reject) => {
    db.run('UPDATE user_mastery SET fractions_correct = 150 WHERE user_id = ?', [user.id], (err) =>
      err ? reject(err) : resolve()
    );
  });
  await new Promise((resolve) => updateAchievements(user.id, resolve));

  const rows = await new Promise((resolve, reject) => {
    db.all(
      `SELECT achievement_id, progress, completed_at FROM user_achievements
       WHERE user_id = ? AND achievement_id LIKE 'mastery_fractions_%'`,
      [user.id],
      (err, r) => (err ? reject(err) : resolve(r))
    );
  });
  assert.strictEqual(rows.length, 4, 'expected the full 4-tier fractions chain');
  for (const row of rows) {
    assert.ok(row.completed_at > 0, `${row.achievement_id} should be completed at 150 solves`);
  }
});
