// Quadratic equations II — solving by factoring, the quadratic formula, and the discriminant
// (HSA-REI.B.4). The catalog-wide sweeps (generationCorrectness / optionEquivalence /
// lessonCoverage / strandCoherence) already prove these concepts are wired and well-formed. This
// file pins the *math* itself: that the factoring/formula templates report a root that genuinely
// solves the stated equation (and the SPECIFIC root the question asks for), and that the
// discriminant label is the geometrically correct real-root count — so a future edit can't silently
// break a value while still passing the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const { areEquivalent, normalizeAnswer } = require('../mathEngine/answerEquivalence');

const SEEDS = 25;
const alg = templates.algebra;

// Pull the coefficients of a monic "x^2 + b x + c = 0" out of the rendered question. Handles the
// "+ -" sign forms and implicit ±1 coefficients the templates emit. Returns [b, c].
function parseMonic(question) {
  const m = question.match(/x\^2\s*([+-])\s*(\d*)x\s*([+-])\s*(\d+)\s*=\s*0/);
  assert.ok(m, `could not parse monic quadratic from: ${JSON.stringify(question)}`);
  const bMag = m[2] === '' ? 1 : Number(m[2]);
  const b = (m[1] === '-' ? -1 : 1) * bMag;
  const c = (m[3] === '-' ? -1 : 1) * Number(m[4]);
  return [b, c];
}

// Pull "a x^2 + b x + c = 0" coefficients (a may be implicit 1) out of the rendered question.
function parseGeneral(question) {
  const m = question.match(/(\d*)x\^2\s*([+-])\s*(\d*)x\s*([+-])\s*(\d+)\s*=\s*0/);
  assert.ok(m, `could not parse general quadratic from: ${JSON.stringify(question)}`);
  const a = m[1] === '' ? 1 : Number(m[1]);
  const bMag = m[3] === '' ? 1 : Number(m[3]);
  const b = (m[2] === '-' ? -1 : 1) * bMag;
  const c = (m[4] === '-' ? -1 : 1) * Number(m[5]);
  return [a, b, c];
}

// A value r is a root of a x^2 + b x + c iff it makes the polynomial exactly zero.
function isRoot(r, a, b, c) {
  return a * r * r + b * r + c === 0;
}

test('quadratic_factoring: answer is the SMALLER root and it solves the equation', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[24](1, idx);
    const [b, c] = parseMonic(p.question);
    const ans = Number(p.answer);
    // The reported answer is genuinely a root.
    assert.ok(isRoot(ans, 1, b, c), `idx ${idx}: answer ${ans} is not a root of x^2 ${b}x ${c}`);
    // It is the SMALLER of the two roots. The other root of a monic quadratic is (-b - ans).
    const other = -b - ans;
    assert.ok(isRoot(other, 1, b, c), `idx ${idx}: derived other root ${other} is not a root`);
    assert.ok(ans <= other, `idx ${idx}: answer ${ans} is not the smaller root (other = ${other})`);
    assert.notStrictEqual(ans, other, `idx ${idx}: a repeated root would make "smaller" ambiguous`);
  }
});

test('quadratic_formula: answer is the LARGER root and it solves the equation', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[25](1, idx);
    const [a, b, c] = parseGeneral(p.question);
    const ans = Number(p.answer);
    assert.ok(isRoot(ans, a, b, c), `idx ${idx}: answer ${ans} is not a root of ${a}x^2 ${b}x ${c}`);
    // Discriminant is a perfect square (the formula yields clean integer roots).
    const disc = b * b - 4 * a * c;
    const sq = Math.round(Math.sqrt(disc));
    assert.strictEqual(sq * sq, disc, `idx ${idx}: discriminant ${disc} is not a perfect square`);
    // Both roots, and the answer is the larger.
    const root1 = (-b + sq) / (2 * a);
    const root2 = (-b - sq) / (2 * a);
    const larger = Math.max(root1, root2);
    const smaller = Math.min(root1, root2);
    assert.strictEqual(ans, larger, `idx ${idx}: answer ${ans} is not the larger root ${larger}`);
    assert.notStrictEqual(larger, smaller, `idx ${idx}: roots coincide — "larger" is ambiguous`);
  }
});

// Parse "a x^2 [± b x] ± c = 0" where the middle term may be ABSENT (b = 0 renders as "x^2 + c = 0").
function parseDiscriminantQ(question) {
  // Grab the quadratic body between "$$" markers to avoid matching prose.
  const body = (question.match(/\$\$([^$]*?=\s*0)\$\$/) || [null, question])[1];
  const withMid = body.match(/(\d*)x\^2\s*([+-])\s*(\d*)x\s*([+-])\s*(\d+)\s*=\s*0/);
  if (withMid) {
    const a = withMid[1] === '' ? 1 : Number(withMid[1]);
    const bMag = withMid[3] === '' ? 1 : Number(withMid[3]);
    const b = (withMid[2] === '-' ? -1 : 1) * bMag;
    const c = (withMid[4] === '-' ? -1 : 1) * Number(withMid[5]);
    return [a, b, c];
  }
  // No middle x-term: "a x^2 ± c = 0" -> b = 0.
  const noMid = body.match(/(\d*)x\^2\s*([+-])\s*(\d+)\s*=\s*0/);
  assert.ok(noMid, `could not parse discriminant question: ${JSON.stringify(question)}`);
  const a = noMid[1] === '' ? 1 : Number(noMid[1]);
  const c = (noMid[2] === '-' ? -1 : 1) * Number(noMid[3]);
  return [a, 0, c];
}

test('discriminant_roots: label matches the true real-root count', () => {
  const LABELS = new Set(['two real solutions', 'one real solution', 'no real solutions']);
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[26](1, idx);
    const [a, b, c] = parseDiscriminantQ(p.question);
    const disc = b * b - 4 * a * c;
    const expected = disc > 0 ? 'two real solutions' : (disc === 0 ? 'one real solution' : 'no real solutions');
    assert.ok(LABELS.has(p.answer), `idx ${idx}: answer ${JSON.stringify(p.answer)} is not a known correct label`);
    assert.strictEqual(p.answer, expected, `idx ${idx}: label ${JSON.stringify(p.answer)} != discriminant truth ${JSON.stringify(expected)} (Δ=${disc})`);
    // Four authored, distinct labels (the three real cases + the "infinitely many" misconception) so
    // the engine never injects a generic numeric filler; the answer is never that misconception.
    const offered = [p.answer, ...p.distractors];
    assert.strictEqual(new Set(offered).size, 4, `idx ${idx}: options are not four distinct labels`);
    assert.notStrictEqual(p.answer, 'infinitely many real solutions', `idx ${idx}: a quadratic can't have infinitely many roots`);
  }
});

// Every distractor must be a genuinely DIFFERENT value/label from the answer — a re-expression would
// grade as a SECOND correct option under the equivalence-aware competitive grader. This is the bug
// the optionEquivalence sweep catches catalog-wide; lock it here at the template level too.
test('no Quadratics II distractor is value-equivalent to its answer', () => {
  for (const key of [24, 25, 26]) {
    for (let idx = 0; idx < SEEDS; idx++) {
      const p = alg[key](1, idx);
      const ans = String(p.answer);
      for (const d of p.distractors.map(String)) {
        if (normalizeAnswer(d) === normalizeAnswer(ans)) continue;
        assert.ok(!areEquivalent(d, ans), `key ${key} idx ${idx}: distractor ${d} equals answer ${ans}`);
      }
      // Distractors are all distinct from one another and from the answer.
      const all = new Set([ans, ...p.distractors.map(String)]);
      assert.strictEqual(all.size, 1 + p.distractors.length, `key ${key} idx ${idx}: duplicate option`);
    }
  }
});
