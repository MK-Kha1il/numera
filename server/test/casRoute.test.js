// CAS solve endpoint (routes/cas.js) over the REAL route stack: auth gating, input validation, and
// the linear worked-solution response. The linear case needs no SymPy, so it runs everywhere; the
// quadratic assertion runs only when SymPy is installed.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const sympy = require('../mathEngine/cas/sympyClient');

let ctx;
let hasSympy = false;
before(async () => { ctx = await bootServer(); hasSympy = await sympy.isAvailable(); });
after(async () => { await shutdown(ctx); });

test('rejects an unauthenticated request', async () => {
  const r = await api(ctx.base, 'POST', '/api/cas/solve', { body: { equation: '2x = 8' } });
  assert.equal(r.status, 401);
});

test('400 on a missing/oversized equation', async () => {
  const u = await registerUser(ctx.base);
  assert.equal((await api(ctx.base, 'POST', '/api/cas/solve', { token: u.token, body: {} })).status, 400);
  assert.equal((await api(ctx.base, 'POST', '/api/cas/solve', { token: u.token, body: { equation: 'x'.repeat(500) } })).status, 400);
});

test('solves a linear equation with worked steps', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/cas/solve', { token: u.token, body: { equation: '3x + 4 = 13' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.source, 'js-linear');
  assert.deepEqual(r.body.solutions, ['3']);
  assert.ok(Array.isArray(r.body.steps) && r.body.steps.length >= 2);
});

test('solves a quadratic via SymPy when available', async (t) => {
  if (!hasSympy) return t.skip('SymPy/Python not installed');
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'POST', '/api/cas/solve', { token: u.token, body: { equation: 'x^2 - 5x + 6 = 0' } });
  assert.equal(r.status, 200);
  assert.equal(r.body.source, 'sympy');
  assert.deepEqual([...r.body.solutions].sort(), ['2', '3']);
});
