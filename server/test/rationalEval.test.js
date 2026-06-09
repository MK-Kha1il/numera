// Exact rational arithmetic evaluator (the first CAS primitive). It must compute the TRUE value of a
// numeric expression exactly (so grading stays sound) and return null for anything that isn't a pure
// numeric expression (variables, letters, garbage) so it composes safely with the equivalence engine.
const { test } = require('node:test');
const assert = require('node:assert');
const { evaluateRational } = require('../mathEngine/cas/rationalEval');

const eq = (s, n, d) => {
  const r = evaluateRational(s);
  assert.ok(r, `${s} should evaluate`);
  assert.deepEqual({ n: r.n, d: r.d }, { n, d }, `${s} = ${n}/${d}`);
};

test('evaluates integer arithmetic exactly', () => {
  eq('2+3', 5, 1);
  eq('10 - 2*3', 4, 1);
  eq('-5 + 8', 3, 1);
  eq('2*(3+1)', 8, 1);
  eq('(7 - 1) / 3', 2, 1);
});

test('evaluates fractions and decimals as exact rationals', () => {
  eq('1/2 + 1/4', 3, 4);
  eq('3/4', 3, 4);
  eq('2.5', 5, 2);
  eq('0.5 + 0.25', 3, 4);
  eq('(1/2) / (1/4)', 2, 1);
  eq('1/3', 1, 3);
});

test('respects operator precedence and parentheses', () => {
  eq('2 + 3 * 4', 14, 1);
  eq('(2 + 3) * 4', 20, 1);
  eq('-(2 + 3)', -5, 1);
});

test('returns null for non-numeric or malformed input', () => {
  assert.equal(evaluateRational('2x'), null, 'variables are not numeric');
  assert.equal(evaluateRational('abc'), null);
  assert.equal(evaluateRational('2 +'), null, 'dangling operator');
  assert.equal(evaluateRational('(2+3'), null, 'unbalanced paren');
  assert.equal(evaluateRational('1/0'), null, 'division by zero');
  assert.equal(evaluateRational(''), null);
  assert.equal(evaluateRational('2;return 1'), null, 'no injection surface');
  assert.equal(evaluateRational('pi'), null, 'pi is not handled here');
});
