// Linear-equation CAS primitive (mathEngine/cas/). Parses a LINEAR expression/equation in one
// variable x and solves it EXACTLY (rational arithmetic) with human-readable worked steps. A
// hand-written recursive-descent parser over the linear ring — a value is { x, c } (the coefficient
// of x and the constant, both rationals); multiplying two x-terms is rejected as non-linear, so the
// parser only ever accepts genuine linear input. No eval / no injection surface.
//
// This is the "solving" half of the CAS the way you'd show your work: solveLinearEquation returns
// the exact solution plus the isolate-x steps, and generateLinearEquation pairs it with a generator
// so every produced problem carries a self-verified answer (generate → solve → check).
const R = require('./rational');

const ZERO = R.make(0, 1);
const ONE = R.make(1, 1);
const lin = (x, c) => ({ x, c });

function decToRat(num) {
  const [ip, fp] = num.split('.');
  return R.make(parseInt((ip || '0') + fp, 10), Math.pow(10, fp.length));
}

// Combine two linear values; multiplication/division require one side to be a constant (else the
// result would be non-linear, which we reject by returning null).
const addL = (a, b) => { const x = R.add(a.x, b.x), c = R.add(a.c, b.c); return x && c ? lin(x, c) : null; };
const subL = (a, b) => { const x = R.sub(a.x, b.x), c = R.sub(a.c, b.c); return x && c ? lin(x, c) : null; };
function mulL(a, b) {
  if (R.isZero(a.x)) { const x = R.mul(a.c, b.x), c = R.mul(a.c, b.c); return x && c ? lin(x, c) : null; }
  if (R.isZero(b.x)) { const x = R.mul(a.x, b.c), c = R.mul(a.c, b.c); return x && c ? lin(x, c) : null; }
  return null; // x * x ⇒ non-linear
}
function divL(a, b) {
  if (!R.isZero(b.x) || R.isZero(b.c)) return null; // divisor must be a non-zero constant
  const x = R.div(a.x, b.c), c = R.div(a.c, b.c);
  return x && c ? lin(x, c) : null;
}

// Parse a linear expression in x → { x, c } rationals, or null if malformed or non-linear.
function parseLinear(raw) {
  const s = String(raw == null ? '' : raw).toLowerCase().replace(/\s+/g, '');
  if (s === '' || !/^[0-9x+\-*/().]+$/.test(s)) return null;
  let i = 0;

  function parseExpr() {
    let left = parseTerm();
    if (!left) return null;
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const right = parseTerm();
      if (!right) return null;
      left = op === '+' ? addL(left, right) : subL(left, right);
      if (!left) return null;
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    if (!left) return null;
    while (i < s.length) {
      let op;
      if (s[i] === '*' || s[i] === '/') op = s[i++];
      else if (s[i] === 'x' || s[i] === '(') op = '*'; // implicit multiplication: 3x, 2(x+1)
      else break;
      const right = parseFactor();
      if (!right) return null;
      left = op === '*' ? mulL(left, right) : divL(left, right);
      if (!left) return null;
    }
    return left;
  }
  function parseFactor() {
    if (i >= s.length) return null;
    if (s[i] === '+') { i++; return parseFactor(); }
    if (s[i] === '-') { i++; const f = parseFactor(); return f ? lin(R.make(-f.x.n, f.x.d), R.make(-f.c.n, f.c.d)) : null; }
    if (s[i] === '(') { i++; const e = parseExpr(); if (s[i] !== ')') return null; i++; return e; }
    if (s[i] === 'x') { i++; return lin(ONE, ZERO); }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    const num = s.slice(start, i);
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(num)) return null;
    const r = num.includes('.') ? decToRat(num) : R.make(parseInt(num, 10), 1);
    return r ? lin(ZERO, r) : null;
  }

  const result = parseExpr();
  if (i !== s.length) return null; // unconsumed trailing characters ⇒ malformed
  return result;
}

// Solve "lhs = rhs" for x. Returns { ok, solution, steps } — ok=false for no-solution / identity /
// non-linear / malformed input (with a reason in `steps`).
function solveLinearEquation(raw) {
  const s = String(raw == null ? '' : raw);
  const sides = s.split('=');
  if (sides.length !== 2) return { ok: false, solution: null, steps: ['Not a single-variable equation.'] };
  const L = parseLinear(sides[0]);
  const Rr = parseLinear(sides[1]);
  if (!L || !Rr) return { ok: false, solution: null, steps: ['Could not parse a linear equation.'] };

  // Move x to the left and constants to the right: (Lx - Rx)·x = (Rc - Lc).
  const A = R.sub(L.x, Rr.x);
  const B = R.sub(Rr.c, L.c);
  if (!A || !B) return { ok: false, solution: null, steps: ['Arithmetic error.'] };

  if (R.isZero(A)) {
    return R.isZero(B)
      ? { ok: false, solution: null, steps: ['Identity — every value of x is a solution.'] }
      : { ok: false, solution: null, steps: ['No solution — the equation is contradictory.'] };
  }

  const solution = R.div(B, A);
  const steps = [
    `${sides[0].trim()} = ${sides[1].trim()}`,
    `Collect the x terms on one side and the constants on the other: ${R.str(A)}x = ${R.str(B)}`,
    `Divide both sides by ${R.str(A)}: x = ${R.str(solution)}`
  ];
  return { ok: true, solution, steps };
}

// Format a "ax + b" question string with tidy signs (b may be 0 / negative).
function formatEquation(a, b, c) {
  let q = `${a}x`;
  if (b > 0) q += ` + ${b}`;
  else if (b < 0) q += ` - ${-b}`;
  return `${q} = ${c}`;
}

// Generate a fresh linear equation with an integer solution and a SELF-VERIFIED answer: it solves
// its own output and confirms the solution matches before returning. Unbounded + always correct,
// which is exactly what free-response competitive modes need to resist farming.
function generateLinearEquation(seed = Math.floor(Math.random() * 1e6)) {
  const a = 2 + (seed % 8);            // coefficient 2..9
  const x0 = -4 + ((seed >> 3) % 13);  // integer solution -4..8
  const b = -6 + ((seed >> 7) % 13);   // constant -6..6
  const c = a * x0 + b;                // construct so x0 is exact
  const question = formatEquation(a, b, c);
  const solved = solveLinearEquation(question);
  const expected = R.make(x0, 1);
  if (!solved.ok || !R.eq(solved.solution, expected)) {
    throw new Error(`generateLinearEquation self-check failed for "${question}" (expected ${x0})`);
  }
  return { question, answer: R.str(expected), steps: solved.steps };
}

module.exports = { parseLinear, solveLinearEquation, generateLinearEquation };
