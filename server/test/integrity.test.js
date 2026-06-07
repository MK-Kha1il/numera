// integrityEngine: difficulty-scaled timing floor, single-answer assessment, and run verdict.
// Pure unit tests with an explicit config (env-independent).
const { test } = require('node:test');
const assert = require('node:assert');
const { humanFloorMs, assessAnswer, verdictForRun } = require('../services/integrityEngine');

const cfg = { superhumanBaseMs: 400, perLevelMs: 25, cheatThreshold: 3 };

test('humanFloorMs scales with level and disables at a non-positive base', () => {
  assert.equal(humanFloorMs(0, cfg), 400);
  assert.equal(humanFloorMs(10, cfg), 650, 'harder problems need more time');
  assert.equal(humanFloorMs(10, { superhumanBaseMs: 0, perLevelMs: 25 }), 0, 'base <= 0 disables');
});

test('assessAnswer flags only fast CORRECT answers', () => {
  assert.equal(assessAnswer({ elapsedMs: 50, correct: true, level: 0 }, cfg).flagged, true, 'superhuman-fast correct');
  assert.equal(assessAnswer({ elapsedMs: 5000, correct: true, level: 0 }, cfg).flagged, false, 'human-paced correct');
  assert.equal(assessAnswer({ elapsedMs: 50, correct: false, level: 0 }, cfg).flagged, false, 'fast wrong = misclick, not cheating');
  assert.equal(assessAnswer({ elapsedMs: 50, correct: true, level: 0 }, { superhumanBaseMs: 0 }).flagged, false, 'disabled config never flags');
  // The floor rises with level, so a time that is fine at level 0 can be suspicious at a high level.
  assert.equal(assessAnswer({ elapsedMs: 500, correct: true, level: 0 }, cfg).flagged, false);
  assert.equal(assessAnswer({ elapsedMs: 500, correct: true, level: 8 }, cfg).flagged, true, '500ms < 600ms floor at level 8');
});

test('verdictForRun: clean / review / cheat thresholds', () => {
  assert.equal(verdictForRun({ flaggedFastCount: 0 }, cfg), 'clean');
  assert.equal(verdictForRun({ flaggedFastCount: 1 }, cfg), 'review', 'one fluke-fast answer → review, not cheat');
  assert.equal(verdictForRun({ flaggedFastCount: 2 }, cfg), 'review');
  assert.equal(verdictForRun({ flaggedFastCount: 3 }, cfg), 'cheat', 'systematic → cheat');
  assert.equal(verdictForRun({ flaggedFastCount: 9 }, cfg), 'cheat');
});
