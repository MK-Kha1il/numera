// Tests the params-echo loop that revives PARAM-AWARE misconception diagnosis for persisted
// telemetry. Before this, the generated problem never carried its params out to the client, so the
// classifier (engineFeed → classifyMisconception) only ever saw params={} and could not fire any
// concept-specific rule that needs a/b/etc. Now mathGenerator emits a client-safe params bag, the
// client echoes it back, and the rules diagnose precisely. See docs/ContentLearningScienceAudit §2 #4.
const { test } = require('node:test');
const assert = require('node:assert');

const G = require('../mathGenerator');
const { conceptFromType } = require('../mathEngine/problemOrchestrator');
const { classifyMisconception } = require('../mathEngine/misconceptionEngine');

test('generated problems carry a client-safe params bag (numeric only, never the answer)', () => {
  for (const [cat, lvl] of [['arithmetic', 3], ['algebra', 5], ['geometry', 2], ['algebra', 7]]) {
    const p = G.generateProblem(cat, lvl, 0, 1000, {});
    assert.ok(p.params && typeof p.params === 'object', `${cat}/${lvl} has a params object`);
    for (const [k, v] of Object.entries(p.params)) {
      assert.strictEqual(typeof v, 'number', `${cat}/${lvl} param ${k} is numeric`);
      assert.ok(Number.isFinite(v), `${cat}/${lvl} param ${k} is finite`);
    }
    assert.ok(!('answer' in p.params) && !('correctAnswer' in p.params), `${cat}/${lvl} params omit the answer`);
  }
});

test('with echoed params, a param-aware rule diagnoses the misconception (concept_specific)', () => {
  // The full loop: generation emits templateType "linear_one_step_add"; engineFeed maps it to the
  // graph concept "linear_one_step"; the classifier then needs {a,b} to predict the wrong answer.
  const conceptId = conceptFromType('linear_one_step_add') || 'linear_one_step';
  assert.strictEqual(conceptId, 'linear_one_step');
  const params = { a: 3, b: 10 }; // x + 3 = 10 → correct 7

  const inverse = classifyMisconception(conceptId, 7, 13, params); // 13 = b + a
  assert.strictEqual(inverse.source, 'concept_specific');
  assert.strictEqual(inverse.id, 'inverse_sign_slip');

  // The Build-2 second misconception is also reachable now.
  const reversed = classifyMisconception(conceptId, 7, -7, params); // -7 = a - b
  assert.strictEqual(reversed.id, 'reversed_subtraction');
});

test('without params, the same param-aware rule cannot fire (proves params are the fix)', () => {
  const conceptId = 'linear_one_step';
  const diag = classifyMisconception(conceptId, 7, 13, {});
  // No concept-specific rule can match without params; falls through to global/unclassified.
  assert.notStrictEqual(diag.source, 'concept_specific');
});
