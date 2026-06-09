// Shared exact-rational helpers for the CAS layer (mathEngine/cas/). A rational is { n, d } kept in
// lowest terms with d > 0. Every op returns a fresh reduced rational, or null on an invalid result
// (non-finite, zero denominator, divide-by-zero) so callers can fail safely.
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

function make(n, d = 1) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

const add = (a, b) => make(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => make(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => make(a.n * b.n, a.d * b.d);
const div = (a, b) => (b.n === 0 ? null : make(a.n * b.d, a.d * b.n));
const eq = (a, b) => a.n === b.n && a.d === b.d;
const isZero = (a) => a.n === 0;
const str = (a) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

module.exports = { gcd, make, add, sub, mul, div, eq, isZero, str };
