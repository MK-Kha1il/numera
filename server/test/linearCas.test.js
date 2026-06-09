// Linear-equation CAS: parse + exact solve-with-steps, and a self-verifying generator. The solver
// must get the exact rational solution for every linear form (one/two-step, x on both sides, parens,
// fractional solutions) and must REFUSE non-linear / no-solution / identity / malformed input. The
// generator must only ever emit problems whose stated answer it can re-derive (generate→solve→check).
const { test } = require('node:test');
const assert = require('node:assert');
const { parseLinear, solveLinearEquation, generateLinearEquation } = require('../mathEngine/cas/linear');

function solveStr(eq) {
  const r = solveLinearEquation(eq);
  return r.ok ? r.solution.d === 1 ? String(r.solution.n) : `${r.solution.n}/${r.solution.d}` : null;
}

test('parses linear expressions to {x, c}', () => {
  const p = parseLinear('3x + 4');
  assert.deepEqual({ x: p.x.n / p.x.d, c: p.c.n / p.c.d }, { x: 3, c: 4 });
  const q = parseLinear('2(x + 1) - x'); // = x + 2
  assert.deepEqual({ x: q.x.n / q.x.d, c: q.c.n / q.c.d }, { x: 1, c: 2 });
  assert.equal(parseLinear('x*x'), null, 'x·x is non-linear ⇒ rejected');
});

test('solves one-step, two-step, and x-on-both-sides equations exactly', () => {
  assert.equal(solveStr('x + 5 = 12'), '7');
  assert.equal(solveStr('3x + 4 = 13'), '3');
  assert.equal(solveStr('2x - 7 = 9'), '8');
  assert.equal(solveStr('5x + 2 = 2x + 14'), '4'); // 3x = 12
  assert.equal(solveStr('2(x + 1) = 10'), '4');
  assert.equal(solveStr('2x + 1 = 4'), '3/2', 'fractional solutions stay exact');
});

test('produces sensible isolate-x steps', () => {
  const r = solveLinearEquation('3x + 4 = 13');
  assert.equal(r.ok, true);
  assert.equal(r.steps[0], '3x + 4 = 13');
  assert.match(r.steps[1], /3x = 9/);
  assert.match(r.steps[2], /x = 3/);
});

test('refuses non-linear, no-solution, identity, and malformed input', () => {
  assert.equal(solveLinearEquation('x*x = 4').ok, false, 'non-linear');
  assert.equal(solveLinearEquation('x + 1 = x + 2').ok, false, 'no solution');
  assert.equal(solveLinearEquation('2x + 2 = 2(x + 1)').ok, false, 'identity');
  assert.equal(solveLinearEquation('3x + 4').ok, false, 'missing =');
  assert.equal(solveLinearEquation('= 5').ok, false, 'empty side');
});

test('the generator only emits self-verified problems', () => {
  for (let seed = 0; seed < 500; seed++) {
    const g = generateLinearEquation(seed);
    assert.ok(g.question.includes('=') && g.answer, `well-formed at seed ${seed}`);
    // Independently re-solve and confirm the stated answer.
    assert.equal(solveStr(g.question), g.answer, `self-consistent at seed ${seed}: ${g.question}`);
  }
});
