// Printable worksheets (ultra review opp#40): a public, no-auth printable practice sheet for the
// parent/teacher persona. Guards that the page renders problems + an answer key, validates inputs,
// and never requires a login.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('a worksheet renders problems and an answer key, no auth required', async () => {
  const r = await api(ctx.base, 'GET', '/worksheet?category=arithmetic&level=4&count=8');
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /Arithmetic Practice/, 'titled by the chosen topic');
  assert.match(html, /Answer Key/, 'includes an answer key');
  assert.match(html, /MathJax/, 'loads MathJax so LaTeX problems render');
  // The requested number of problems are numbered 1..8.
  assert.match(html, /class="num">8\./, 'renders the requested count');
  assert.doesNotMatch(html, /class="num">9\./, 'does not exceed the requested count');
});

test('invalid params fall back to safe defaults', async () => {
  const r = await api(ctx.base, 'GET', '/worksheet?category=not_a_topic&level=-3&count=999');
  assert.equal(r.status, 200);
  const html = String(r.body);
  // Unknown category falls back to the first strand (Arithmetic).
  assert.match(html, /Arithmetic Practice/);
  // count is clamped to the 30 max (problem 30 exists, 31 does not).
  assert.match(html, /class="num">30\./, 'count clamped to the max');
  assert.doesNotMatch(html, /class="num">31\./);
});

test('every offered topic generates a worksheet', async () => {
  for (const cat of ['fractions', 'decimals', 'integers', 'algebra', 'geometry', 'number_theory', 'statistics']) {
    const r = await api(ctx.base, 'GET', `/worksheet?category=${cat}&level=6&count=6`);
    assert.equal(r.status, 200, `${cat} renders`);
    assert.match(String(r.body), /Answer Key/, `${cat} has an answer key`);
    assert.match(String(r.body), /class="num">6\./, `${cat} has the requested problems`);
  }
});
