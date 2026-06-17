// Statistics III — probability foundations (7.SP.C). The catalog-wide sweeps
// (generationCorrectness / optionEquivalence / lessonCoverage / strandCoherence) already prove
// these concepts are wired and well-formed. This file pins the *math* itself: that theoretical
// probability is favorable/total reduced, experimental probability is successes/trials, and the
// sample-space count is the PRODUCT of the stages — so a future edit can't silently break a value
// while still passing the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const { gcd } = require('../mathEngine/symbolic');
const { areEquivalent, normalizeAnswer } = require('../mathEngine/answerEquivalence');

const SEEDS = 25;
const stat = templates.statistics;

// Parse "a/b" -> [a, b]; throw on anything else so a non-fraction answer is caught.
function parseFrac(s) {
  const m = String(s).trim().match(/^(-?\d+)\/(-?\d+)$/);
  assert.ok(m, `expected an "a/b" fraction, got ${JSON.stringify(s)}`);
  return [Number(m[1]), Number(m[2])];
}

test('stat_theoretical_prob: answer is favorable/total in lowest terms', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = stat[21](1, idx);
    // Recover favorable/total from the question text and check the answer reduces to it.
    const m = p.question.match(/has \$(\d+)\$ equal sections, \$(\d+)\$ of them winning/);
    assert.ok(m, `idx ${idx}: could not read the spinner setup from "${p.question}"`);
    const total = Number(m[1]), fav = Number(m[2]);
    const g = gcd(fav, total);
    assert.strictEqual(p.answer, `${fav / g}/${total / g}`, `idx ${idx}: wrong theoretical probability`);
    const [n, d] = parseFrac(p.answer);
    assert.strictEqual(gcd(Math.abs(n), Math.abs(d)), 1, `idx ${idx}: answer ${p.answer} not in lowest terms`);
    assert.ok(n > 0 && n < d, `idx ${idx}: probability ${p.answer} must be strictly between 0 and 1`);
  }
});

test('stat_experimental_prob: answer is successes/trials in lowest terms', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = stat[22](1, idx);
    const m = p.question.match(/flipped \$(\d+)\$ times and landed heads \$(\d+)\$ times/);
    assert.ok(m, `idx ${idx}: could not read the flip data from "${p.question}"`);
    const trials = Number(m[1]), succ = Number(m[2]);
    const g = gcd(succ, trials);
    assert.strictEqual(p.answer, `${succ / g}/${trials / g}`, `idx ${idx}: wrong experimental probability`);
    const [n, d] = parseFrac(p.answer);
    assert.strictEqual(gcd(Math.abs(n), Math.abs(d)), 1, `idx ${idx}: answer ${p.answer} not in lowest terms`);
  }
});

test('stat_sample_space: answer is the PRODUCT of the three stages', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = stat[23](1, idx);
    const m = p.question.match(/one of \$(\d+)\$ shirts, one of \$(\d+)\$ pairs of pants, and one of \$(\d+)\$ hats/);
    assert.ok(m, `idx ${idx}: could not read the outfit stages from "${p.question}"`);
    const [a, b, c] = [Number(m[1]), Number(m[2]), Number(m[3])];
    assert.strictEqual(p.answer, a * b * c, `idx ${idx}: sample space must be the product`);
    // The "added the stages" distractor must really be the sum, and never equal the product.
    assert.ok(p.distractors.includes(a + b + c), `idx ${idx}: missing the add-the-stages distractor`);
    assert.notStrictEqual(a * b * c, a + b + c, `idx ${idx}: product collides with sum`);
  }
});

// Every probability distractor must be a genuinely DIFFERENT VALUE from the answer — an unreduced
// form (2/6 for 1/3) would grade as a second correct option under the equivalence-aware grader.
// This is the bug the optionEquivalence sweep first caught; lock it here at the template level too.
test('no probability distractor is value-equivalent to its answer', () => {
  for (const key of [21, 22]) {
    for (let idx = 0; idx < SEEDS; idx++) {
      const p = stat[key](1, idx);
      const ans = String(p.answer);
      for (const d of p.distractors.map(String)) {
        if (normalizeAnswer(d) === normalizeAnswer(ans)) continue;
        assert.ok(!areEquivalent(d, ans), `key ${key} idx ${idx}: distractor ${d} equals answer ${ans}`);
      }
    }
  }
});
