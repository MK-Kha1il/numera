// Unified CAS solver service (mathEngine/cas/solver.js). The LINEAR path is exact and in-process,
// so it runs everywhere; the SymPy path (quadratics / irrational roots) runs for real when SymPy is
// installed and SKIPs otherwise, keeping the suite green on any machine.
const { test, before } = require('node:test');
const assert = require('node:assert');
const { solveWithSteps } = require('../mathEngine/cas/solver');
const sympy = require('../mathEngine/cas/sympyClient');

let hasSympy = false;
before(async () => { hasSympy = await sympy.isAvailable(); });

test('linear: exact in-process solve with isolate-x steps (no SymPy needed)', async () => {
  const r = await solveWithSteps('3x + 4 = 13');
  assert.equal(r.ok, true);
  assert.equal(r.source, 'js-linear', 'linear takes the fast in-process path');
  assert.deepEqual(r.solutions, ['3']);
  assert.ok(r.steps.length >= 2 && r.steps.some((s) => s.includes('x = 3')), 'shows worked steps');
});

test('linear: exact fractional solution', async () => {
  const r = await solveWithSteps('2x = 7');
  assert.equal(r.ok, true);
  assert.equal(r.source, 'js-linear');
  assert.deepEqual(r.solutions, ['7/2']);
});

test('no unique solution is reported, not silently "unsolved"', async () => {
  const r = await solveWithSteps('2x + 1 = 2x + 5'); // contradiction
  assert.equal(r.ok, false);
  assert.equal(r.error, 'no_unique_solution');
});

test('malformed / oversized input fails soft', async () => {
  assert.equal((await solveWithSteps('')).ok, false);
  assert.equal((await solveWithSteps('x'.repeat(500))).ok, false);
});

test('quadratic: SymPy path with a factoring derivation', async (t) => {
  if (!hasSympy) return t.skip('SymPy/Python not installed');
  const r = await solveWithSteps('x^2 - 5x + 6 = 0');
  assert.equal(r.ok, true);
  assert.equal(r.source, 'sympy', 'non-linear falls through to SymPy');
  assert.deepEqual([...r.solutions].sort(), ['2', '3']);
  assert.ok(r.steps.some((s) => /[Ff]actor/.test(s)), 'shows a factoring step');
});

test('quadratic: irrational roots via the quadratic formula', async (t) => {
  if (!hasSympy) return t.skip('SymPy/Python not installed');
  const r = await solveWithSteps('x^2 - 2 = 0');
  assert.equal(r.ok, true);
  assert.equal(r.source, 'sympy');
  assert.deepEqual([...r.solutions].sort(), ['-sqrt(2)', 'sqrt(2)']);
  assert.ok(r.steps.some((s) => /quadratic formula|[Dd]iscriminant/.test(s)), 'shows the formula path');
});
