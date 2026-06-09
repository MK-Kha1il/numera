// Exact rational arithmetic evaluator — the first primitive of the CAS layer (mathEngine/cas/).
// Parses and evaluates a NUMERIC arithmetic expression (+ - * / parentheses, unary sign,
// integers/decimals) into an EXACT reduced rational { n, d }, or null if the string isn't a pure
// numeric expression. A hand-written recursive-descent parser — NO eval, no injection surface — and
// exact rational math throughout, so it is sound to use for grading (it can only compute the true
// value). Anything non-numeric (a variable, pi, a letter, stray symbol, trailing garbage) ⇒ null,
// so it composes cleanly with the rest of the equivalence engine (those cases fall to other paths).

const { make: rat, add, sub, mul, div } = require('./rational');

// Evaluate `raw` to a reduced rational, or null. Grammar:
//   expr   := term (('+'|'-') term)*
//   term   := factor (('*'|'/') factor)*
//   factor := ('+'|'-') factor | '(' expr ')' | number
function evaluateRational(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (s === '' || !/^[0-9+\-*/().\s]+$/.test(s)) return null; // numeric arithmetic characters only
  let i = 0;
  const skip = () => { while (i < s.length && s[i] === ' ') i++; };

  function parseExpr() {
    let left = parseTerm();
    if (left === null) return null;
    skip();
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? add(left, right) : sub(left, right);
      if (left === null) return null;
      skip();
    }
    return left;
  }
  function parseTerm() {
    let left = parseFactor();
    if (left === null) return null;
    skip();
    while (i < s.length && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++];
      const right = parseFactor();
      if (right === null) return null;
      left = op === '*' ? mul(left, right) : div(left, right);
      if (left === null) return null;
      skip();
    }
    return left;
  }
  function parseFactor() {
    skip();
    if (i >= s.length) return null;
    if (s[i] === '+') { i++; return parseFactor(); }
    if (s[i] === '-') { i++; const f = parseFactor(); return f === null ? null : rat(-f.n, f.d); }
    if (s[i] === '(') {
      i++;
      const e = parseExpr();
      skip();
      if (s[i] !== ')') return null;
      i++;
      return e;
    }
    const start = i;
    while (i < s.length && /[0-9.]/.test(s[i])) i++;
    const num = s.slice(start, i);
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(num)) return null;
    if (num.includes('.')) {
      const [ip, fp] = num.split('.');
      return rat(parseInt((ip || '0') + fp, 10), Math.pow(10, fp.length));
    }
    return rat(parseInt(num, 10), 1);
  }

  const result = parseExpr();
  skip();
  if (i !== s.length) return null; // trailing characters the grammar didn't consume ⇒ not clean
  return result;
}

module.exports = { evaluateRational };
