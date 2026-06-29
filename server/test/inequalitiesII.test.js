// Inequalities II (variables both sides, distribution, word problems) — depth on the
// inequalities strand:
//   17 inequality_var_both_sides : ax + b < cx + d        (HSA-REI.B.3)
//   18 inequality_distribute     : a(x + b) ≤ c           (HSA-REI.B.3)
//   19 inequality_word           : budget → ax ≤ B        (7.EE.B.4b)
// The catalog-wide sweeps (generationCorrectness / lessonCoverage / strandCoherence) prove these
// are wired and well-formed. This file pins the MATH: it re-parses each rendered problem and checks
// the reported boundary genuinely solves the stated inequality, the direction is right, and all four
// string options are distinct — so a future edit can't silently break a value while still passing
// the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');

const SEEDS = 25;
const ineq = templates.inequalities;

function fourDistinct(idx, p) {
  const all = new Set([String(p.answer), ...p.distractors.map(String)]);
  assert.strictEqual(all.size, 1 + p.distractors.length, `idx ${idx}: duplicate option ${JSON.stringify([p.answer, ...p.distractors])}`);
}

// "x < 3" / "x ≤ 7" → { op, q }
function parseSolution(s) {
  const m = String(s).match(/x\s*(<=|>=|<|>|≤|≥)\s*(-?\d+)/);
  assert.ok(m, `cannot parse solution from ${JSON.stringify(s)}`);
  return { op: m[1], q: Number(m[2]) };
}

test('inequality_var_both_sides: the boundary solves ax + b < cx + d, direction is <', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = ineq[17](1, idx);
    const m = p.question.match(/(\d+)x\s*\+\s*(\d+)\s*<\s*(\d+)x\s*\+\s*(\d+)/);
    assert.ok(m, `idx ${idx}: cannot parse question ${JSON.stringify(p.question)}`);
    const [a, b, c, d] = m.slice(1).map(Number);
    assert.ok(a - c >= 2, `idx ${idx}: coefficient a-c=${a - c} should be ≥ 2 (positive, no flip, distinct distractor)`);
    const { op, q } = parseSolution(p.answer);
    assert.strictEqual(op, '<', `idx ${idx}: a positive divisor must keep the < direction`);
    // The boundary q is where the two sides are equal: a·q + b = c·q + d.
    assert.strictEqual(a * q + b, c * q + d, `idx ${idx}: x=${q} is not the equality boundary`);
    // A test point below the boundary genuinely satisfies the strict inequality.
    assert.ok(a * (q - 1) + b < c * (q - 1) + d, `idx ${idx}: x=${q - 1} should satisfy the inequality`);
    fourDistinct(idx, p);
  }
});

test('inequality_distribute: the boundary solves a(x + b) ≤ c, direction is ≤', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = ineq[18](1, idx);
    const m = p.question.match(/(\d+)\(x\s*\+\s*(\d+)\)\s*\\le\s*(\d+)/);
    assert.ok(m, `idx ${idx}: cannot parse question ${JSON.stringify(p.question)}`);
    const [a, b, c] = m.slice(1).map(Number);
    const { op, q } = parseSolution(p.answer);
    assert.strictEqual(op, '≤', `idx ${idx}: a positive divisor must keep the ≤ direction`);
    // Boundary: a(q + b) = c exactly.
    assert.strictEqual(a * (q + b), c, `idx ${idx}: x=${q} is not the boundary of a(x+b) ≤ c`);
    assert.ok(a * ((q - 1) + b) <= c, `idx ${idx}: x=${q - 1} should satisfy the inequality`);
    fourDistinct(idx, p);
  }
});

test('inequality_word: the boundary solves ax ≤ B, answer is the item count not the budget', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = ineq[19](1, idx);
    const m = p.question.match(/costs \$\\\$(\d+)\$.*?has \$\\\$(\d+)\$/);
    assert.ok(m, `idx ${idx}: cannot parse question ${JSON.stringify(p.question)}`);
    const a = Number(m[1]); // unit cost
    const B = Number(m[2]); // budget
    const { op, q } = parseSolution(p.answer);
    assert.strictEqual(op, '≤', `idx ${idx}: "can afford / at most" must be ≤`);
    assert.strictEqual(a * q, B, `idx ${idx}: x=${q} should be exactly the budget B/a`);
    assert.notStrictEqual(q, B, `idx ${idx}: the answer is the item count, not the budget`);
    fourDistinct(idx, p);
  }
});
