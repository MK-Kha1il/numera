// Tripwire for misconception-DIAGNOSIS depth (mission: "diagnose misunderstanding, not merely
// detect wrong answers"). A misconception rule earns its keep only if, given a real problem's
// (correctAnswer, params), it predicts a DISTINCT wrong value — otherwise it can never match a
// learner's wrong answer and is a dead placeholder. The audit found a large population of
// `(ans) => ans` identity placeholders; these CORE foundational concepts have been revived with a
// second, competing, param-aware misconception so the engine can triangulate "misconception vs.
// slip." This test pins that and fails if any core rule regresses to a placeholder or collides.
const { test } = require('node:test');
const assert = require('node:assert');
const { concepts } = require('../mathEngine/knowledgeGraph');

// (conceptId, trueAnswer, params) — params consistent with the answer, mirroring a real problem.
const CORE_DIAGNOSABLE = [
  ['pemdas', 14, { a: 2, b: 3, c: 4 }],
  ['linear_one_step', 7, { a: 3, b: 10 }],
  ['linear_two_step', 5, { a: 3, b: 4, c: 19 }],
  ['matrix_trace', 5, { a: 1, b: 2, c: 3, d: 4 }],
  ['matrix_determinant', -2, { a: 1, b: 2, c: 3, d: 4 }],
  ['pigeonhole', 6, {}],
  ['permutations', 720, {}],
  ['gcd_lcm', 6, { a: 12, b: 18 }],
  ['modular_arithmetic', 2, { mod: 5 }],
];

test('core concepts each carry >= 2 competing misconceptions', () => {
  for (const [id] of CORE_DIAGNOSABLE) {
    const ms = (concepts[id] && concepts[id].misconceptions) || [];
    assert.ok(ms.length >= 2, `${id} should have >= 2 misconceptions (has ${ms.length})`);
  }
});

test('every core misconception predicts a DISTINCT wrong value (not the answer, not a sibling)', () => {
  for (const [id, ans, params] of CORE_DIAGNOSABLE) {
    const ms = concepts[id].misconceptions;
    const values = ms.map((m) => m.rule(ans, params));
    for (let i = 0; i < ms.length; i++) {
      assert.ok(
        Math.abs(values[i] - ans) >= 0.01,
        `${id}.${ms[i].id} predicts the correct answer (${values[i]}) — a dead placeholder`
      );
    }
    assert.strictEqual(
      new Set(values).size,
      values.length,
      `${id} misconceptions collide on the same predicted value: ${values.join(',')}`
    );
  }
});

test('every core misconception carries a human-readable diagnostic label', () => {
  for (const [id] of CORE_DIAGNOSABLE) {
    for (const m of concepts[id].misconceptions) {
      assert.ok(m.id && m.label && m.label.length > 8, `${id}.${m.id} needs a descriptive label`);
    }
  }
});
