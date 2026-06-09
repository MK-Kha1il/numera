// SymPy-backed CAS adapter. Proves the powerful end of the CAS layer works through the Node↔Python
// bridge — solving quadratics/fractions and deciding symbolic equivalence, which the hand-built JS
// primitives cannot do reliably. Tests SKIP (not fail) when SymPy/Python isn't installed, so the
// suite stays green on any machine; on a machine with SymPy they run for real.
const { test, before } = require('node:test');
const assert = require('node:assert');
const cas = require('../mathEngine/cas/sympyClient');

let available = false;
before(async () => { available = await cas.isAvailable(); });

test('ping reports SymPy availability and version', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const r = await cas.call({ op: 'ping' });
  assert.equal(r.ok, true);
  assert.ok(r.sympy && /^\d+\.\d+/.test(r.sympy), 'reports a sympy version');
});

test('solves a linear equation', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const r = await cas.solve('3x + 4 = 13');
  assert.equal(r.ok, true);
  assert.deepEqual(r.solutions, ['3']);
});

test('solves a QUADRATIC (beyond the JS linear solver)', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const r = await cas.solve('x^2 - 5x + 6 = 0');
  assert.equal(r.ok, true);
  assert.deepEqual([...r.solutions].sort(), ['2', '3']);
});

test('returns exact fractional solutions', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const r = await cas.solve('2x = 7');
  assert.equal(r.ok, true);
  assert.deepEqual(r.solutions, ['7/2']);
});

test('decides symbolic equivalence by simplification', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const same = await cas.equivalent('(x+1)^2', 'x^2 + 2x + 1');
  assert.equal(same.ok, true);
  assert.equal(same.equivalent, true, '(x+1)^2 ≡ x^2 + 2x + 1');
  const diff = await cas.equivalent('x + 1', 'x + 2');
  assert.equal(diff.equivalent, false);
});

test('malformed input fails soft (no crash)', async (t) => {
  if (!available) return t.skip('SymPy/Python not installed');
  const r = await cas.solve('@@@ not math @@@');
  assert.equal(r.ok, false, 'reports an error rather than throwing');
});
