// Expressions II + Powers II — depth on two strands (templates: expressions 19/21, powers 12/14/15):
//   expressions: factor_gcf, difference_of_squares
//   powers:      fractional_exponent, simplify_radical, scientific_notation_compute
// The catalog-wide sweeps (generationCorrectness / lessonCoverage / strandCoherence) prove these are
// wired and well-formed. This file pins the MATH: it re-derives each answer from the rendered problem
// (or, for fractional_exponent, from the emitted params + misconception rules) and checks all four
// options are distinct.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

const SEEDS = 25;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

function fourDistinct(idx, p, label) {
  const all = new Set([String(p.answer), ...p.distractors.map(String)]);
  assert.strictEqual(all.size, 1 + p.distractors.length, `${label}[#${idx}]: duplicate option ${JSON.stringify([p.answer, ...p.distractors])}`);
}

test('fractional_exponent: answer is root^m and distractors match the misconception rules', () => {
  const node = KnowledgeGraph.concepts.fractional_exponent;
  const rule = (id) => node.misconceptions.find((m) => m.id === id).rule;
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.powers[12](1, idx);
    const { b, m, n, root } = p;
    assert.strictEqual(root ** n, b, `idx ${idx}: root ${root} is not the ${n}-th root of ${b}`);
    assert.strictEqual(p.answer, root ** m, `idx ${idx}: answer is not root^m`);
    assert.notStrictEqual(m, n, `idx ${idx}: m===n would collapse a distractor`);
    assert.strictEqual(p.distractors[0], rule('forgot_the_power')(p.answer, p), `idx ${idx}: D0 != root`);
    assert.strictEqual(p.distractors[1], rule('forgot_the_root')(p.answer, p), `idx ${idx}: D1 != b^m`);
    assert.strictEqual(p.distractors[2], rule('wrong_exponent')(p.answer, p), `idx ${idx}: D2 != b`);
    fourDistinct(idx, p, 'fractional_exponent');
  }
});

test('factor_gcf: the factored answer distributes back to the stated expression with the GREATEST factor', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.expressions[19](1, idx);
    const q = p.question.match(/(\d+)x \+ (\d+)/);
    const a = Number(q[1]), c = Number(q[2]);
    const ans = String(p.answer).match(/(\d+)\((\d+)x \+ (\d+)\)/);
    assert.ok(ans, `idx ${idx}: answer not in g(px + q) form: ${p.answer}`);
    const g = Number(ans[1]), pp = Number(ans[2]), qq = Number(ans[3]);
    assert.strictEqual(g * pp, a, `idx ${idx}: g·p != coefficient`);
    assert.strictEqual(g * qq, c, `idx ${idx}: g·q != constant`);
    assert.strictEqual(g, gcd(a, c), `idx ${idx}: factored ${g}, but the GCF of ${a},${c} is ${gcd(a, c)}`);
    fourDistinct(idx, p, 'factor_gcf');
  }
});

test('difference_of_squares: the constant is a perfect square and the factors are conjugates', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.expressions[21](1, idx);
    const k = Number(p.question.match(/x\^2 - (\d+)/)[1]);
    const ans = String(p.answer).match(/\(x - (\d+)\)\(x \+ (\d+)\)/);
    assert.ok(ans, `idx ${idx}: answer not (x - c)(x + c): ${p.answer}`);
    const c1 = Number(ans[1]), c2 = Number(ans[2]);
    assert.strictEqual(c1, c2, `idx ${idx}: conjugate constants differ`);
    assert.strictEqual(c1 * c1, k, `idx ${idx}: ${c1}^2 != ${k}`);
    fourDistinct(idx, p, 'difference_of_squares');
  }
});

test('simplify_radical: a^2 · b equals the radicand and b is squarefree', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.powers[14](1, idx);
    const k = Number(p.question.match(/\\sqrt\{(\d+)\}/)[1]);
    const ans = String(p.answer).match(/(\d+)\\sqrt\{(\d+)\}/);
    assert.ok(ans, `idx ${idx}: answer not a√b: ${p.answer}`);
    const a = Number(ans[1]), b = Number(ans[2]);
    assert.strictEqual(a * a * b, k, `idx ${idx}: ${a}^2·${b} != ${k}`);
    // b squarefree: no perfect square > 1 divides it.
    for (let d = 2; d * d <= b; d++) assert.notStrictEqual(b % (d * d), 0, `idx ${idx}: radicand ${b} still has square factor ${d * d}`);
    fourDistinct(idx, p, 'simplify_radical');
  }
});

test('scientific_notation_compute: mantissas multiply, exponents add, mantissa stays < 10', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.powers[15](1, idx);
    const q = p.question.match(/\((\d+) × 10\^(\d+)\)\((\d+) × 10\^(\d+)\)/);
    const a = Number(q[1]), m = Number(q[2]), b = Number(q[3]), n = Number(q[4]);
    const ans = String(p.answer).match(/(\d+) × 10\^(\d+)/);
    assert.strictEqual(Number(ans[1]), a * b, `idx ${idx}: mantissa != a·b`);
    assert.strictEqual(Number(ans[2]), m + n, `idx ${idx}: exponent != m+n`);
    assert.ok(a * b < 10, `idx ${idx}: mantissa ${a * b} should stay < 10 (no re-normalization needed)`);
    fourDistinct(idx, p, 'scientific_notation_compute');
  }
});
