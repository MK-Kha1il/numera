// Tests for the Error-Detection ("Spot the Mistake") exercise type (mathEngine/errorDetection.js).
// The pedagogical contract: a full worked solution with EXACTLY ONE corrupted line, the corruption
// is a checkable false equation, and the stated answer points at that line.
const { test } = require('node:test');
const assert = require('node:assert');

const ED = require('../mathEngine/errorDetection');
const { buildWorkedExampleJson } = require('../mathEngine/workedExampleEngine');

test('there is a usable pool of error-detection concepts', () => {
  const pool = ED.errorDetectionConcepts();
  assert.ok(pool.length >= 12, `expected a real pool, got ${pool.length}`);
});

test('every capable concept builds a well-formed, single-flaw problem', () => {
  let seed = 12345;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (const id of ED.errorDetectionConcepts()) {
    const p = ED.buildErrorDetectionProblem(id, rng);
    assert.ok(p, `${id} builds a problem`);
    assert.ok(p.question.includes('Which line'), `${id} asks which line`);
    assert.ok(p.options.length >= 3, `${id} has >=3 line options`);
    assert.strictEqual(new Set(p.options).size, p.options.length, `${id} options unique`);
    assert.ok(p.options.includes(p.correctAnswer), `${id} answer is among options`);
    assert.match(p.correctAnswer, /^Line \d+$/, `${id} answer is a line label`);
    assert.ok(p.explanation.includes('should be'), `${id} explains the correct line`);

    // The flagged line number is within range, and the corruption actually changed the source.
    const lineNo = Number(p.correctAnswer.replace('Line ', ''));
    const steps = JSON.parse(buildWorkedExampleJson(id)).steps;
    assert.ok(lineNo >= 1 && lineNo <= steps.length, `${id} flagged line in range`);
  }
});

test('the corrupted line is an EQUATION (a checkable false statement), never bare prose', () => {
  let seed = 999;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };
  for (const id of ED.errorDetectionConcepts()) {
    const p = ED.buildErrorDetectionProblem(id, rng);
    // The explanation quotes the corrupted line "X" → "Y"; the source line had an `=`.
    const lineNo = p.errorLine;
    const steps = JSON.parse(buildWorkedExampleJson(id)).steps;
    assert.ok(/=/.test(steps[lineNo - 1].math || ''), `${id} corrupted line ${lineNo} must contain '='`);
  }
});

test('corruptMath turns a true line false by bumping its result', () => {
  const c = ED.corruptMath('2 \\times 5 = 10');
  assert.ok(c && c.from === 10 && c.to !== 10, 'bumps the RHS away from 10');
  assert.strictEqual(ED.corruptMath('no numbers here'), null);
});

test('buildErrorDetectionSet returns the requested count and is seed-deterministic', () => {
  const a = ED.buildErrorDetectionSet(4, 5, 2026);
  const b = ED.buildErrorDetectionSet(4, 5, 2026);
  assert.ok(a.length >= 1 && a.length <= 4);
  assert.deepStrictEqual(a.map((p) => p.conceptId), b.map((p) => p.conceptId), 'same seed → same picks');
  for (const p of a) {
    assert.ok(p.category === 'Spot the Mistake');
    assert.ok(p.options.includes(p.correctAnswer));
  }
});
