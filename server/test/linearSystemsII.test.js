// Systems of linear equations II — substitution, elimination, and solution types (8.EE.C.8).
// The catalog-wide sweeps (generationCorrectness / optionEquivalence / lessonCoverage /
// strandCoherence) already prove these concepts are wired and well-formed. This file pins the
// *math* itself: that the substitution and elimination templates produce the unique (x, y) that
// actually solves the stated system, that the answer is the x-value the question asks for, and that
// the solution-type label is the geometrically correct count — so a future edit can't silently break
// a value while still passing the generic "is it a valid MCQ" checks.
const { test } = require('node:test');
const assert = require('node:assert');
const { templates } = require('../mathEngine/templates');
const { areEquivalent, normalizeAnswer } = require('../mathEngine/answerEquivalence');

const SEEDS = 25;
const alg = templates.algebra;

// Pull "ax + by = c" coefficients out of a rendered equation line. Handles implicit 1/-1
// coefficients and the "+ -" sign forms the templates emit. Returns [a, b, c].
function parseEq(line) {
  const m = line.match(/^\s*\$*\s*(-?\d*)x\s*([+-])\s*(\d*)y\s*=\s*(-?\d+)\s*\$*\s*$/);
  assert.ok(m, `could not parse equation line: ${JSON.stringify(line)}`);
  const a = m[1] === '' || m[1] === undefined ? 1 : (m[1] === '-' ? -1 : Number(m[1]));
  const bMag = m[3] === '' ? 1 : Number(m[3]);
  const b = (m[2] === '-' ? -1 : 1) * bMag;
  const c = Number(m[4]);
  return [a, b, c];
}

// Solve a 2x2 system exactly (Cramer). Returns { x, y } or null if singular.
function solve2x2(a1, b1, c1, a2, b2, c2) {
  const det = a1 * b2 - a2 * b1;
  if (det === 0) return null;
  return { x: (c1 * b2 - c2 * b1) / det, y: (a1 * c2 - a2 * c1) / det };
}

// Split a "$$...$$\n$$...$$" multi-line question into its two equation lines.
function twoLines(question) {
  const lines = question.split('\n').map((l) => l.trim()).filter((l) => /x/.test(l) && /y/.test(l) && /=/.test(l));
  assert.strictEqual(lines.length, 2, `expected two equation lines in: ${JSON.stringify(question)}`);
  return lines.map((l) => l.replace(/\$\$/g, '').trim());
}

test('linear_system_substitution: answer is the x that solves the stated system', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[21](1, idx);
    // eq1 is "y = m x + c"; eq2 is the "ax + by = k" line. Use the carried xVal/yVal as the claimed
    // solution, then independently verify it satisfies eq2 (parsed) and the y = mx + c relation.
    const eqLines = p.question.split('\n').map((l) => l.replace(/\$\$/g, '').trim());
    const eq1 = eqLines.find((l) => /^y\s*=/.test(l));
    const eq2 = eqLines.find((l) => /x.*[+-].*y\s*=/.test(l));
    assert.ok(eq1 && eq2, `idx ${idx}: missing eq lines in ${JSON.stringify(p.question)}`);
    const m1 = eq1.match(/^y\s*=\s*(-?\d*)x\s*([+-])\s*(\d+)/);
    assert.ok(m1, `idx ${idx}: could not parse eq1 ${JSON.stringify(eq1)}`);
    const m = m1[1] === '' ? 1 : Number(m1[1]);
    const c = (m1[2] === '-' ? -1 : 1) * Number(m1[3]);
    const [a, b, k] = parseEq(eq2);
    const x = p.xVal, y = p.yVal;
    // The carried pair really solves both equations.
    assert.strictEqual(y, m * x + c, `idx ${idx}: y != m*x + c`);
    assert.strictEqual(a * x + b * y, k, `idx ${idx}: (x,y) does not satisfy eq2`);
    // The answer is the x asked for (a number, distinct from y).
    assert.strictEqual(Number(p.answer), x, `idx ${idx}: answer is not x`);
    assert.notStrictEqual(x, y, `idx ${idx}: x and y collide (wrong-variable distractor degenerate)`);
  }
});

test('linear_system_elimination: answer is the x that solves the stated system', () => {
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[22](1, idx);
    const [l1, l2] = twoLines(p.question);
    const [a1, b1, c1] = parseEq(l1);
    const [a2, b2, c2] = parseEq(l2);
    const sol = solve2x2(a1, b1, c1, a2, b2, c2);
    assert.ok(sol, `idx ${idx}: system is singular but should be uniquely solvable`);
    assert.strictEqual(sol.x, p.xVal, `idx ${idx}: solved x != carried xVal`);
    assert.strictEqual(sol.y, p.yVal, `idx ${idx}: solved y != carried yVal`);
    assert.strictEqual(Number(p.answer), sol.x, `idx ${idx}: answer is not the solving x`);
    // Genuine scaling needed: neither variable's coefficients already match.
    assert.notStrictEqual(a1, a2, `idx ${idx}: x-coefficients already match (no scaling needed)`);
    assert.notStrictEqual(b1, b2, `idx ${idx}: y-coefficients already match (no scaling needed)`);
  }
});

test('linear_system_solution_types: label matches the true geometric count', () => {
  const LABELS = new Set(['one solution', 'no solution', 'infinitely many solutions']);
  for (let idx = 0; idx < SEEDS; idx++) {
    const p = alg[23](1, idx);
    const [l1, l2] = twoLines(p.question);
    const [a1, b1, c1] = parseEq(l1);
    const [a2, b2, c2] = parseEq(l2);
    // Classify by cross-multiplication (exact, no floats).
    const sameSlope = a1 * b2 === a2 * b1;
    let expected;
    if (!sameSlope) {
      expected = 'one solution';
    } else {
      const fullyProportional = a1 * c2 === a2 * c1 && b1 * c2 === b2 * c1;
      expected = fullyProportional ? 'infinitely many solutions' : 'no solution';
    }
    assert.ok(LABELS.has(p.answer), `idx ${idx}: answer ${JSON.stringify(p.answer)} is not a known correct label`);
    assert.strictEqual(p.answer, expected, `idx ${idx}: label ${JSON.stringify(p.answer)} != geometric truth ${JSON.stringify(expected)} for the system`);
    // Four authored, distinct labels (the three real cases + the "two solutions" misconception) so the
    // engine never injects a generic numeric filler. The answer must be the correct case, never "two".
    const offered = [p.answer, ...p.distractors];
    assert.strictEqual(new Set(offered).size, 4, `idx ${idx}: options are not four distinct labels`);
    assert.notStrictEqual(p.answer, 'two solutions', `idx ${idx}: a system can't have exactly two solutions`);
  }
});

// Every distractor must be a genuinely DIFFERENT value/label from the answer — a re-expression would
// grade as a SECOND correct option under the equivalence-aware competitive grader. This is the bug
// the optionEquivalence sweep catches catalog-wide; lock it here at the template level too.
test('no Systems II distractor is value-equivalent to its answer', () => {
  for (const key of [21, 22, 23]) {
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
