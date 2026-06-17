// Completing the square (HSA-REI.B.4a) — the canonical quadratic-solving method that completes the
// strand's toolkit (factoring / formula / discriminant already shipped in quadraticsII). The
// catalog-wide sweeps (generationCorrectness / optionEquivalence / lessonCoverage / strandCoherence)
// already prove the concept is wired and well-formed; this file pins the *math* itself: that the
// reported answer is the LARGER root and genuinely solves the parsed equation, that the equation is
// built so the completed square is a perfect square (clean integer roots), and that no distractor is
// value-equivalent to its answer — so a future edit can't silently break a value while still passing
// the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const { areEquivalent, normalizeAnswer } = require('../mathEngine/answerEquivalence');

const SEEDS = 24; // covers all 12 curated cases twice (idx % 12)
const alg = templates.algebra;

// Pull the coefficients of a monic "x^2 + b x + c = 0" out of the rendered question. Handles the
// "+ -" sign forms and implicit ±1 coefficients the template emits. Returns [b, c].
function parseMonic(question) {
  const m = question.match(/x\^2\s*([+-])\s*(\d*)x\s*([+-])\s*(\d+)\s*=\s*0/);
  assert.ok(m, `could not parse monic quadratic from: ${JSON.stringify(question)}`);
  const bMag = m[2] === '' ? 1 : Number(m[2]);
  const b = (m[1] === '-' ? -1 : 1) * bMag;
  const c = (m[3] === '-' ? -1 : 1) * Number(m[4]);
  return [b, c];
}

// A value r is a root of x^2 + b x + c iff it makes the polynomial exactly zero.
function isRoot(r, b, c) {
  return r * r + b * r + c === 0;
}

test('complete_the_square: answer is the LARGER root and it solves the equation', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[27](1, idx);
    const [b, c] = parseMonic(p.question);
    const ans = Number(p.answer);
    // The reported answer is genuinely a root.
    assert.ok(isRoot(ans, b, c), `idx ${idx}: answer ${ans} is not a root of x^2 ${b}x ${c}`);
    // It is the LARGER of the two roots. The other root of a monic quadratic is (-b - ans).
    const other = -b - ans;
    assert.ok(isRoot(other, b, c), `idx ${idx}: derived other root ${other} is not a root`);
    assert.ok(ans >= other, `idx ${idx}: answer ${ans} is not the larger root (other = ${other})`);
    assert.notStrictEqual(ans, other, `idx ${idx}: a repeated root would make "larger" ambiguous`);
  }
});

test('complete_the_square: the completed square is a perfect square (clean integer roots)', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[27](1, idx);
    const [b, c] = parseMonic(p.question);
    // b must be even so b/2 is an integer (the whole point of the curated cases).
    assert.ok(Number.isInteger(b / 2), `idx ${idx}: middle coefficient ${b} is not even`);
    // (x + b/2)^2 = (b/2)^2 - c, and the right side must be a positive perfect square so the
    // ±sqrt step yields two distinct clean integer roots.
    const rhs = (b / 2) * (b / 2) - c;
    assert.ok(rhs > 0, `idx ${idx}: completed-square RHS ${rhs} is not positive (need two real roots)`);
    const k = Math.round(Math.sqrt(rhs));
    assert.strictEqual(k * k, rhs, `idx ${idx}: completed-square RHS ${rhs} is not a perfect square`);
    assert.ok(k >= 1, `idx ${idx}: k=${k} would collapse the two roots`);
  }
});

// Every distractor must be a genuinely DIFFERENT value from the answer — a re-expression would grade
// as a SECOND correct option under the equivalence-aware competitive grader. This is the bug the
// optionEquivalence sweep catches catalog-wide; lock it here at the template level too.
test('no complete_the_square distractor is value-equivalent to its answer', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[27](1, idx);
    const ans = String(p.answer);
    for (const d of p.distractors.map(String)) {
      if (normalizeAnswer(d) === normalizeAnswer(ans)) continue;
      assert.ok(!areEquivalent(d, ans), `idx ${idx}: distractor ${d} equals answer ${ans}`);
    }
    // All four options (answer + three distractors) are distinct integers.
    const all = new Set([ans, ...p.distractors.map(String)]);
    assert.strictEqual(all.size, 1 + p.distractors.length, `idx ${idx}: duplicate option`);
  }
});
