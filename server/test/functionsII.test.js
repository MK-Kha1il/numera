// Functions II (non-linear evaluation + composition) — depth on the functions strand:
//   17 function_quad_eval  : evaluate f(x) = ax² + bx + c   (HSF-IF.A.2)
//   18 function_exp_eval   : evaluate f(x) = a·bˣ           (HSF-LE.A.2)
//   19 function_composition: evaluate f(g(n))               (HSF-BF.A.1c)
// The catalog-wide sweeps (generationCorrectness / optionEquivalence / lessonCoverage /
// strandCoherence) already prove these are wired and well-formed. This file pins the MATH and the
// misconception wiring: the reported answer equals the genuine computation, each distractor models
// the specific slip the knowledge graph attributes to it (so the param-aware diagnosis rules fire),
// and all four options are distinct — so a future edit can't silently break a value while still
// passing the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

const SEEDS = 25; // mirrors the generationCorrectness sweep depth
const fns = templates.functions;

// Pull the predict-rule for a concept's misconception by id (the param-aware diagnosis the
// classifier runs). Returns a function (ans, params) => predictedWrongAnswer.
function rule(conceptId, miscId) {
  const node = KnowledgeGraph.concepts[conceptId];
  const m = (node.misconceptions || []).find((x) => x.id === miscId);
  assert.ok(m && typeof m.rule === 'function', `${conceptId}: missing misconception rule ${miscId}`);
  return m.rule;
}

function assertFourDistinct(idx, p) {
  const all = new Set([String(p.answer), ...p.distractors.map(String)]);
  assert.strictEqual(all.size, 1 + p.distractors.length, `idx ${idx}: duplicate option in ${JSON.stringify([p.answer, ...p.distractors])}`);
}

test('function_quad_eval: answer is the genuine f(n), distractors model the named slips', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = fns[17](1, idx);
    const { a, b, c, n } = p;
    assert.strictEqual(p.answer, a * n * n + b * n + c, `idx ${idx}: answer is not a·n² + b·n + c`);
    // n ≥ 3 keeps x² distinct from 2x and x (the whole reason the distractors separate).
    assert.ok(n >= 3, `idx ${idx}: input ${n} < 3 risks colliding distractors`);
    // Each distractor equals what the matching knowledge-graph misconception predicts.
    assert.strictEqual(p.distractors[0], rule('function_quad_eval', 'squared_as_doubled')(p.answer, p), `idx ${idx}: D0 ≠ "x² as 2x"`);
    assert.strictEqual(p.distractors[1], rule('function_quad_eval', 'used_input_unsquared')(p.answer, p), `idx ${idx}: D1 ≠ "input unsquared"`);
    assert.strictEqual(p.distractors[2], rule('function_quad_eval', 'dropped_constant_term')(p.answer, p), `idx ${idx}: D2 ≠ "dropped constant"`);
    assertFourDistinct(idx, p);
  }
});

test('function_exp_eval: answer is a·bˣ, distractors model linear/added/dropped-coefficient slips', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = fns[18](1, idx);
    const { a, b, x } = p;
    assert.strictEqual(p.answer, a * b ** x, `idx ${idx}: answer is not a·bˣ`);
    assert.ok(a >= 2, `idx ${idx}: coefficient ${a} < 2 would collapse the dropped-coefficient distractor`);
    assert.strictEqual(p.distractors[0], rule('function_exp_eval', 'exponential_as_linear')(p.answer, p), `idx ${idx}: D0 ≠ "a·b·x"`);
    assert.strictEqual(p.distractors[1], rule('function_exp_eval', 'added_the_coefficient')(p.answer, p), `idx ${idx}: D1 ≠ "a + bˣ"`);
    assert.strictEqual(p.distractors[2], rule('function_exp_eval', 'dropped_the_coefficient')(p.answer, p), `idx ${idx}: D2 ≠ "bˣ"`);
    assertFourDistinct(idx, p);
  }
});

test('function_composition: answer is f(g(n)) inside-out, distractors model order/distribute/add slips', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = fns[19](1, idx);
    const { a, b, c, d, n } = p;
    assert.strictEqual(p.answer, a * (c * n + d) + b, `idx ${idx}: answer is not f(g(n)) = a(cn+d)+b`);
    assert.strictEqual(p.distractors[0], rule('function_composition', 'reversed_composition_order')(p.answer, p), `idx ${idx}: D0 ≠ g(f(n))`);
    assert.strictEqual(p.distractors[1], rule('function_composition', 'skipped_inner_distribution')(p.answer, p), `idx ${idx}: D1 ≠ "skipped inner distribute"`);
    assert.strictEqual(p.distractors[2], rule('function_composition', 'added_the_functions')(p.answer, p), `idx ${idx}: D2 ≠ f(n)+g(n)`);
    // Composition is generally non-commutative here: the reversed-order distractor differs.
    assert.notStrictEqual(p.answer, p.distractors[0], `idx ${idx}: f(g(n)) accidentally equals g(f(n))`);
    assertFourDistinct(idx, p);
  }
});
