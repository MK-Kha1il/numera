// Answer-equivalence engine (the first slice of the "CAS" layer, scoped to what competitive
// grading needs). It decides whether a submitted answer means the SAME value as the canonical
// answer, even when written in a different but mathematically-equal form:
//   "1/2" ≡ "0.5" ≡ "2/4" ≡ "50%"      (rational forms)
//   "4x + 12" ≡ "4x+12" ≡ "12 + 4x"     (algebraic forms, checked by numeric probing)
//   "2\\pi" ≡ "2 pi" ≡ "2π"             (multiples of pi)
//
// DESIGN CONTRACT (Elo rides on this):
//  - ADDITIVE: areEquivalent() returns true for everything the old exact `normalize===normalize`
//    check returned true for, PLUS genuinely-equivalent forms. It can only ever turn a
//    "wrong-but-actually-correct" grade into correct — it never rejects a previously-accepted answer.
//  - SOUND (no false positives): every richer check uses exact rational arithmetic or many-point
//    numeric probing of low-degree expressions, so it does not accept a genuinely-wrong answer.
//  - SELF-CONTAINED: no third-party CAS dependency. Powerful enough for the current catalog
//    (integers, fractions, decimals, percents, linear/quadratic expressions, pi multiples). The
//    interface is the seam: a heavier symbolic backend can later answer the hard cases behind it.

const { evaluateRational } = require('./cas/rationalEval');

// Exact normalized form — identical to the per-route `normalize` graders use today (back-compat).
function normalizeAnswer(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

function makeRat(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Normalize the SURFACE form of a typed answer before parsing: unicode operators, a leading unary
// plus, and a leading "x =" / "=" the player may have typed (catalog answers are values, never
// equations). NOT applied to the exact-match fast path, so the additive contract is preserved, and
// it only ever cleans presentation — it never changes a value, so soundness is preserved too.
function cleanInput(raw) {
  let s = String(raw == null ? '' : raw).trim().toLowerCase();
  s = s.replace(/−/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/'); // − × · ÷
  s = s.replace(/^[a-z]\s*=\s*/, '').replace(/^=\s*/, '');                      // "x = 8" / "= 8" → "8"
  s = s.replace(/^\+/, '');                                                     // unary plus: "+5" → "5"
  return s.trim();
}

// Parse a scalar answer into an exact rational, or null if it isn't a plain number form.
// Handles integers, a/b fractions, decimals, a trailing percent (kept on the percent's own scale,
// matching how the catalog keys percent answers as a bare number), and \frac{a}{b}.
function parseRational(raw) {
  let s = cleanInput(raw);
  if (s === '') return null;
  // Mixed number "a b/c" (a SPACE between the whole part and the fraction) — handled before spaces
  // are collapsed, so "1 1/2" is 3/2, not the bare "11/2" (= eleven halves).
  const mm = s.match(/^(-?)(\d+)\s+(\d+)\/(\d+)$/);
  if (mm) {
    const sign = mm[1] === '-' ? -1 : 1;
    const d = parseInt(mm[4], 10);
    return makeRat(sign * (parseInt(mm[2], 10) * d + parseInt(mm[3], 10)), d);
  }
  s = s.replace(/\s+/g, '');
  if (s.endsWith('%')) s = s.slice(0, -1);           // "25%" → 25 (the displayed percent value)

  let m = s.match(/^(-?)\\?frac\{(-?\d+)\}\{(-?\d+)\}$/); // \frac{a}{b}
  if (m) {
    const sign = m[1] === '-' ? -1 : 1;
    return makeRat(sign * parseInt(m[2], 10), parseInt(m[3], 10));
  }
  m = s.match(/^(-?\d+)\/(-?\d+)$/);                  // a/b
  if (m) return makeRat(parseInt(m[1], 10), parseInt(m[2], 10));
  if (/^-?\d+$/.test(s)) return makeRat(parseInt(s, 10), 1); // integer
  if (/^-?\d*\.\d+$/.test(s)) {                       // decimal
    const neg = s.startsWith('-');
    const [ip, fp] = s.replace('-', '').split('.');
    const den = Math.pow(10, fp.length);
    const num = parseInt((ip || '0') + fp, 10) * (neg ? -1 : 1);
    return makeRat(num, den);
  }
  return null;
}

// Parse the numeric coefficient of a pi-multiple ("2pi", "2\\pi", "2π", "pi", "-pi/3", "2*pi"),
// or null if no pi token is present. Returns the coefficient as a number (e.g. 2, 1, -1/3),
// obtained by substituting pi→1 and evaluating — robust to pi in the numerator or denominator.
function parsePiMultiple(raw) {
  let s = cleanInput(raw).replace(/\s+/g, '');
  s = s.replace(/\\/g, '').replace(/π/g, 'pi');
  if (!s.includes('pi')) return null;
  s = s.replace(/(\d)(pi|\()/g, '$1*$2').replace(/(pi|\))(pi|\()/g, '$1*$2'); // explicit mult
  s = s.replace(/pi/g, '1');                          // pi → 1 to extract the coefficient
  if (!/^[0-9+\-*/().]+$/.test(s)) return null;       // nothing but arithmetic may remain
  try {
    const v = new Function(`"use strict"; return (${s});`)();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// Turn an algebraic answer into a safe, evaluable JS expression, or null if it contains anything
// outside the whitelist (variables x/y, digits, + - * / ( ) . ^). The hard whitelist is what makes
// the later `new Function` safe — no identifiers, no property access, nothing but arithmetic.
function toEvaluable(raw) {
  let s = cleanInput(raw).replace(/\s+/g, '');
  if (s === '' || !/[xy]/.test(s)) return null;       // must contain a variable to be "algebraic"
  if (!/^[0-9xy+\-*/().^]+$/.test(s)) return null;     // whitelist only
  s = s.replace(/(\d)([xy(])/g, '$1*$2');             // 4x → 4*x, 3( → 3*(
  s = s.replace(/([xy)])([xy(])/g, '$1*$2');          // x( → x*(, )x → )*x, xy → x*y, )( → )*(
  s = s.replace(/\^/g, '**');                          // exponent
  return s;
}

function evalExpr(js, x, y) {
  try {
    const f = new Function('x', 'y', `"use strict"; return (${js});`);
    const v = f(x, y);
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// Two expressions are equal iff they agree at enough distinct sample points. Low-degree rational
// functions that agree at many varied points are equal (a nonzero difference of bounded degree has
// only finitely many roots), so this is sound for the catalog's linear/quadratic answers.
const SAMPLE_POINTS = [2, 3, 5, 7, 11, 13, 4, 6, -3, 0.5];
function probeEquivalent(aJs, bJs) {
  let agreements = 0;
  for (let i = 0; i < SAMPLE_POINTS.length; i++) {
    const x = SAMPLE_POINTS[i];
    const y = SAMPLE_POINTS[(i + 3) % SAMPLE_POINTS.length];
    const va = evalExpr(aJs, x, y);
    const vb = evalExpr(bJs, x, y);
    if (va == null || vb == null) continue;            // skip points where either is undefined
    if (Math.abs(va - vb) > 1e-9) return false;        // disagree anywhere ⇒ not equal
    agreements++;
  }
  return agreements >= 4;                               // need enough corroborating points
}

// The public check: does `submitted` mean the same value as `canonical`?
function areEquivalent(submitted, canonical) {
  // 1. Exact normalized match — preserves the existing grader's behaviour exactly.
  if (normalizeAnswer(submitted) === normalizeAnswer(canonical)) return true;

  // 2. Rational equality: integers / fractions / decimals / percents / mixed numbers (parseRational),
  //    OR a full numeric arithmetic expression the player typed, e.g. "1/2 + 1/4" (evaluateRational —
  //    exact, so still sound). parseRational handles the special forms (%/mixed/\frac) the evaluator
  //    doesn't, so try it first and fall back to evaluating an arithmetic expression.
  const ra = parseRational(submitted) || evaluateRational(cleanInput(submitted));
  const rb = parseRational(canonical) || evaluateRational(cleanInput(canonical));
  if (ra && rb) return ra.n === rb.n && ra.d === rb.d;
  // If exactly one side is a plain number, they cannot be equal (don't fall through to pi/algebra).
  if (!!ra !== !!rb) return false;

  // 3. Rational multiples of pi (coefficients compared numerically).
  const pa = parsePiMultiple(submitted);
  const pb = parsePiMultiple(canonical);
  if (pa != null && pb != null) return Math.abs(pa - pb) < 1e-9;
  if ((pa != null) !== (pb != null)) return false;

  // 4. Algebraic expressions, compared by numeric probing.
  const ea = toEvaluable(submitted);
  const eb = toEvaluable(canonical);
  if (ea && eb) return probeEquivalent(ea, eb);

  return false;
}

module.exports = {
  areEquivalent,
  normalizeAnswer,
  parseRational,   // exported for targeted tests
  parsePiMultiple,
  toEvaluable
};
