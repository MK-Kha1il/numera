// Unified CAS "solve with worked steps" — the front door to the solving half of the CAS layer.
// One async entry point that routes by capability so callers (a REST route, a hint surface) don't
// have to know whether a problem is linear or needs the heavy backend:
//
//   1. LINEAR equations  → the exact, in-process JS solver (lib/cas/linear.js). No subprocess, exact
//      rational arithmetic, isolate-x steps. This is the fast path and works even without SymPy.
//   2. EVERYTHING ELSE   → SymPy (quadratics / higher degree / irrational + complex roots) via the
//      bridge, WITH a factoring / quadratic-formula derivation.
//
// FAILS SOFT throughout: malformed input, a non-linear equation with SymPy unavailable, or a bridge
// error all return { ok:false, ... } rather than throwing — the same posture as the rest of the CAS.
const linear = require('./linear');
const R = require('./rational');
const sympy = require('./sympyClient');

const MAX_LEN = 200;

// Solve `input` (an equation like "3x+4=13" or "x^2-5x+6=0", or a bare expression treated as "=0")
// and return a worked solution. Resolves to:
//   { ok:true, equation, variable, solutions:[str], steps:[str], source:'js-linear'|'sympy' }
//   { ok:false, error, equation }
async function solveWithSteps(input) {
  const equation = String(input == null ? '' : input).trim();
  if (!equation || equation.length > MAX_LEN) {
    return { ok: false, error: 'invalid_input', equation };
  }

  // 1. Exact in-process linear path (only meaningful for an actual equation with one '=').
  if ((equation.match(/=/g) || []).length === 1) {
    const lin = linear.solveLinearEquation(equation);
    if (lin.ok) {
      return {
        ok: true,
        equation,
        variable: 'x',
        solutions: [R.str(lin.solution)],
        steps: lin.steps,
        source: 'js-linear',
      };
    }
    // lin.ok === false can mean non-linear (→ try SymPy below) OR a genuine no-solution/identity.
    // Distinguish: a definitive linear verdict carries a human reason in steps; pass it through so
    // the caller doesn't get a misleading "unsolved" for "0 = 1".
    if (lin.steps && /No solution|Identity/.test(lin.steps[0] || '')) {
      return { ok: false, error: 'no_unique_solution', equation, detail: lin.steps[0] };
    }
  }

  // 2. Heavy path: SymPy. Only reachable when the linear solver couldn't handle it.
  if (await sympy.isAvailable()) {
    const r = await sympy.solveSteps(equation);
    if (r && r.ok && Array.isArray(r.solutions)) {
      return {
        ok: true,
        equation,
        variable: r.variable,
        solutions: r.solutions,
        steps: Array.isArray(r.steps) ? r.steps : [],
        source: 'sympy',
      };
    }
  }

  return { ok: false, error: 'unsolved', equation };
}

module.exports = { solveWithSteps };
