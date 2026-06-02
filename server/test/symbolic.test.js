// Unit tests for the deterministic number-theory helpers in mathEngine/symbolic.js.
// These underpin problem generation, so locking their behavior down protects every
// generated problem against silent regressions during consolidation.
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../mathEngine/symbolic');

test('factorial', () => {
  assert.strictEqual(S.factorial(0), 1);
  assert.strictEqual(S.factorial(1), 1);
  assert.strictEqual(S.factorial(5), 120);
});

test('gcd / lcm', () => {
  assert.strictEqual(S.gcd(12, 18), 6);
  assert.strictEqual(S.gcd(17, 5), 1);
  assert.strictEqual(S.lcm(4, 6), 12);
});

test('isPrime', () => {
  assert.strictEqual(S.isPrime(2), true);
  assert.strictEqual(S.isPrime(13), true);
  assert.strictEqual(S.isPrime(1), false);
  assert.strictEqual(S.isPrime(15), false);
});

test('getPrimeFactors returns a {prime: exponent} map', () => {
  assert.deepStrictEqual(S.getPrimeFactors(12), { 2: 2, 3: 1 });
  assert.deepStrictEqual(S.getPrimeFactors(13), { 13: 1 });
});

test('getDivisors are sorted and complete', () => {
  assert.deepStrictEqual(S.getDivisors(12), [1, 2, 3, 4, 6, 12]);
});

test('generatePythagoreanTriple satisfies a^2 + b^2 = c^2 for any difficulty', () => {
  for (let i = 0; i < 30; i++) {
    const { a, b, c } = S.generatePythagoreanTriple(1 + (i % 4));
    assert.strictEqual(a * a + b * b, c * c, `triple ${a},${b},${c} is valid`);
  }
});

test('derangement', () => {
  assert.strictEqual(S.derangement(0), 1);
  assert.strictEqual(S.derangement(1), 0);
  assert.strictEqual(S.derangement(2), 1);
  assert.strictEqual(S.derangement(4), 9);
});
