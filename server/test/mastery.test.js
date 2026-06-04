// Unit tests for the multi-dimensional mastery model (mathEngine/masteryEngine.js).
// Locks the dimension decomposition, the weakest-dimension/focus logic, and the aggregate.
const { test } = require('node:test');
const assert = require('node:assert');
const M = require('../mathEngine/masteryEngine');

// A fully-mastered profile: accurate, fast, retained, independent.
const strong = {
  accuracy_rate: 0.95, avg_response_ms: 4000, retention_score: 0.9,
  calculator_usage_rate: 0, hint_usage_rate: 0, retry_rate: 0,
  exposure_count: 20, correct_first_try: 19,
};

test('computeDimensions returns all four dimensions in 0..1', () => {
  const d = M.computeDimensions(strong);
  for (const { key } of M.MASTERY_DIMENSIONS) {
    assert.ok(key in d, `missing dimension ${key}`);
    assert.ok(d[key] >= 0 && d[key] <= 1, `${key}=${d[key]} out of range`);
  }
  assert.ok(d.accuracy > 0.9 && d.fluency > 0.8 && d.retention > 0.8 && d.independence > 0.8);
});

test('a slow-but-accurate learner is flagged as fluency-weak, not accuracy-weak', () => {
  // High accuracy, but ~25s per problem → low fluency.
  const slow = { ...strong, avg_response_ms: 25000 };
  const mp = M.computeMasteryProfile(slow);
  assert.strictEqual(mp.weakest, 'fluency');
  assert.strictEqual(mp.focus.dimension, 'fluency');
  assert.strictEqual(mp.focus.action, 'timed_practice');
  // The probe/focus must not claim the concept itself is the problem.
  assert.notStrictEqual(mp.focus.action, 'review_concept');
});

test('a hint-reliant learner is flagged as independence-weak', () => {
  const reliant = {
    ...strong, hint_usage_rate: 0.9, correct_first_try: 4, exposure_count: 20,
  };
  const mp = M.computeMasteryProfile(reliant);
  assert.strictEqual(mp.weakest, 'independence');
  assert.strictEqual(mp.focus.action, 'unaided_practice');
});

test('a forgetful learner is flagged as retention-weak', () => {
  const forgetful = { ...strong, retention_score: 0.2 };
  const mp = M.computeMasteryProfile(forgetful);
  assert.strictEqual(mp.weakest, 'retention');
  assert.strictEqual(mp.focus.action, 'spaced_review');
});

test('a fully-mastered learner has no weak dimension and a Mastered stage', () => {
  const mp = M.computeMasteryProfile(strong);
  assert.strictEqual(mp.weakest, null);
  assert.strictEqual(mp.focus, null);
  assert.ok(mp.overall >= 0.8);
  assert.strictEqual(mp.stage, 'Mastered');
});

test('overall mastery is a weighted blend bounded to 0..1 and stage labels are ordered', () => {
  const empty = M.computeMasteryProfile({});
  assert.strictEqual(empty.overall, 0);
  assert.strictEqual(empty.stage, 'Novice');
  assert.ok(M.computeOverall({ accuracy: 1, fluency: 1, retention: 1, independence: 1 }) === 1);
  assert.strictEqual(M.masteryStage(0.5), 'Developing');
  assert.strictEqual(M.masteryStage(0.7), 'Proficient');
});

test('transfer dimension is dormant until attempted, then counts toward mastery', () => {
  // No transfer attempts yet: transfer is 0, not active, never flagged as weakest, and overall
  // uses the base 4-way weights so the learner is not penalised for the untested dimension.
  const before = M.computeMasteryProfile(strong);
  assert.strictEqual(before.dimensions.transfer, 0);
  assert.strictEqual(before.transferActive, false);
  assert.notStrictEqual(before.weakest, 'transfer');
  // Strong in-context with no transfer history → ready to be offered a transfer challenge.
  assert.strictEqual(before.transferReady, true);

  // Now they've attempted transfer and mostly failed (1/4): transfer becomes active, is the
  // weakest dimension, and drags the overall down below the no-transfer score.
  const attempted = { ...strong, transfer_exposure: 4, transfer_success: 1 };
  const after = M.computeMasteryProfile(attempted);
  assert.strictEqual(after.transferActive, true);
  assert.strictEqual(after.transferReady, false);
  assert.ok(Math.abs(after.dimensions.transfer - 0.25) < 1e-9);
  assert.strictEqual(after.weakest, 'transfer');
  assert.strictEqual(after.focus.action, 'transfer_challenge');
  assert.ok(after.overall < before.overall, 'failed transfer should lower overall mastery');
});

test('aggregateDimensions weights by exposure and returns null for no data', () => {
  assert.strictEqual(M.aggregateDimensions([]), null);
  const agg = M.aggregateDimensions([
    strong,
    { ...strong, accuracy_rate: 0.1, avg_response_ms: 28000, retention_score: 0.2, correct_first_try: 1, exposure_count: 1 },
  ]);
  assert.ok(agg && agg.dimensions);
  // The strong profile has 20 exposures vs 1, so the aggregate stays high.
  assert.ok(agg.dimensions.accuracy > 0.7, `expected exposure-weighted accuracy high, got ${agg.dimensions.accuracy}`);
  assert.strictEqual(agg.conceptCount, 2);
});
