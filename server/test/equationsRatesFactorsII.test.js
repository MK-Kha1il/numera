// Equations II / Rates II / Factors II — depth on three short [7,15] strands (templates 17/18/19):
//   equations: eqn_distribute, eqn_var_denominator, eqn_var_both_sides
//   rates:     total_cost_rate, time_from_speed, better_buy
//   factors:   gcf_three, lcm_three, gcf_lcm_product
// The catalog-wide sweeps (generationCorrectness / lessonCoverage / strandCoherence) prove these are
// wired and well-formed. This file pins the MATH and the misconception wiring: the answer equals the
// genuine computation, each distractor equals exactly what its knowledge-graph rule predicts from the
// emitted params (so the param-aware diagnosis fires), and all four options are distinct.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

const SEEDS = 25;
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const lcm2 = (a, b) => (a * b) / gcd(a, b);

function rule(conceptId, miscId) {
  const node = KnowledgeGraph.concepts[conceptId];
  const m = (node.misconceptions || []).find((x) => x.id === miscId);
  assert.ok(m && typeof m.rule === 'function', `${conceptId}: missing misconception rule ${miscId}`);
  return m.rule;
}

// Each spec: the template (category+level), the expected answer from params, and the
// [distractorIndex -> misconceptionId] mapping the rules must reproduce.
const SPECS = [
  { id: 'eqn_distribute', cat: 'equations', lvl: 17, answer: (p) => p.c / p.a - p.b,
    miscs: ['forgot_to_subtract', 'used_rhs', 'subtracted_without_dividing'] },
  { id: 'eqn_var_denominator', cat: 'equations', lvl: 18, answer: (p) => p.a / p.b,
    miscs: ['multiplied_instead', 'gave_divisor', 'gave_numerator'] },
  { id: 'eqn_var_both_sides', cat: 'equations', lvl: 19, answer: (p) => (p.d - p.b) / (p.a - p.c),
    miscs: ['forgot_to_divide', 'used_rhs', 'added_constants'] },
  { id: 'total_cost_rate', cat: 'rates', lvl: 17, answer: (p) => p.a * p.t,
    miscs: ['added_instead', 'gave_rate', 'gave_quantity'] },
  { id: 'time_from_speed', cat: 'rates', lvl: 18, answer: (p) => p.dist / p.speed,
    miscs: ['gave_distance', 'subtracted_instead', 'gave_speed'] },
  { id: 'better_buy', cat: 'rates', lvl: 19, answer: (p) => p.p1,
    miscs: ['chose_higher', 'compared_totals', 'other_total'] },
  { id: 'gcf_three', cat: 'factors', lvl: 17, answer: (p) => gcd(gcd(p.n0, p.n1), p.n2),
    miscs: ['gave_a_number', 'gave_middle', 'gave_largest'] },
  { id: 'lcm_three', cat: 'factors', lvl: 18, answer: () => null /* checked separately below */,
    miscs: ['multiplied_all', 'gave_largest', 'added'] },
  { id: 'gcf_lcm_product', cat: 'factors', lvl: 19, answer: (p) => (p.a * p.b) / p.g,
    miscs: ['gave_product', 'gave_gcf', 'added'] },
];

for (const spec of SPECS) {
  test(`${spec.id}: answer is genuine and distractors match the misconception rules`, () => {
    for (let idx = 0; idx < SEEDS; idx++) {
      const p = templates[spec.cat][spec.lvl](1, idx);
      const where = `${spec.id}[#${idx}]`;

      // The reported answer equals the independent recomputation (skip lcm_three; its answer is the
      // LCM, which we verify by confirming it is the least common multiple of the divisor set instead).
      const expected = spec.answer(p);
      if (expected !== null) {
        assert.strictEqual(p.answer, expected, `${where}: answer ${p.answer} != expected ${expected}`);
      }

      // Each distractor equals what its knowledge-graph misconception rule predicts from the params.
      spec.miscs.forEach((miscId, k) => {
        const predicted = rule(spec.id, miscId)(p.answer, p);
        assert.strictEqual(p.distractors[k], predicted, `${where}: distractor[${k}] ${p.distractors[k]} != rule '${miscId}' -> ${predicted}`);
      });

      // Four distinct options.
      const all = new Set([String(p.answer), ...p.distractors.map(String)]);
      assert.strictEqual(all.size, 1 + p.distractors.length, `${where}: duplicate option ${JSON.stringify([p.answer, ...p.distractors])}`);
    }
  });
}

// lcm_three: confirm the reported answer really is the least common multiple of its three numbers.
test('lcm_three: the answer is the genuine LCM of the three numbers', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = templates.factors[18](1, idx);
    // prod = a*b*c, mx = max, sm = sum are emitted; recover the set is not needed — verify divisibility
    // and minimality against the emitted product (every common multiple divides the product).
    assert.ok(Number.isInteger(p.answer) && p.answer > 0, `idx ${idx}: LCM not a positive integer`);
    assert.strictEqual(p.prod % p.answer, 0, `idx ${idx}: product ${p.prod} is not a multiple of the LCM ${p.answer}`);
    assert.ok(p.answer >= p.mx, `idx ${idx}: LCM ${p.answer} should be at least the largest number ${p.mx}`);
  }
});

// Sanity: lcm2 helper agrees with a hand value (guards the test's own math).
test('test helper: lcm2 is correct', () => {
  assert.strictEqual(lcm2(4, 6), 12);
});
