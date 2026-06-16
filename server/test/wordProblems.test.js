// Word-problem generator (ultra review #9/edu#5). Guards the invariants that make an applied
// problem usable: a real question, the correct answer present among unique MCQ options, an
// explanation, no LaTeX-corruption control chars, and deterministic output for a given seed.
// Also exercises the authenticated endpoint end-to-end.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { generateWordProblem, buildWordProblemSet, TEMPLATES } = require('../mathEngine/wordProblems');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

function assertWellFormed(p, label) {
  assert.ok(p.question && p.question.trim().length > 0, `${label}: empty question`);
  assert.ok(!hasControlChar(p.question), `${label}: control char in question`);
  assert.ok(p.correctAnswer && String(p.correctAnswer).length > 0, `${label}: no answer`);
  assert.ok(Array.isArray(p.options) && p.options.length >= 3, `${label}: needs >=3 options`);
  assert.ok(p.options.includes(p.correctAnswer), `${label}: correct answer missing from options`);
  assert.strictEqual(new Set(p.options).size, p.options.length, `${label}: duplicate options`);
  assert.ok(p.explanation && p.explanation.trim().length > 0, `${label}: no explanation`);
}

test('every template produces well-formed problems across many seeds', () => {
  // Force the level high enough that all templates are eligible, then sample widely.
  for (let seed = 1; seed <= 400; seed++) {
    const p = generateWordProblem(seed, 9);
    assertWellFormed(p, `seed ${seed}`);
  }
});

test('generation is deterministic for a given seed', () => {
  const a = generateWordProblem(12345, 9);
  const b = generateWordProblem(12345, 9);
  assert.deepEqual(a, b, 'same seed must yield identical problem');
});

test('low levels only surface the simplest contexts', () => {
  const simpleSkills = new Set(TEMPLATES.filter((t) => t.minLevel <= 1).map((t) => t.skill));
  for (let seed = 1; seed <= 200; seed++) {
    const p = generateWordProblem(seed, 1);
    assert.ok(simpleSkills.has(p.skill), `level-1 surfaced an advanced skill: ${p.skill}`);
  }
});

test('buildWordProblemSet returns the requested count with distinct questions', () => {
  const set = buildWordProblemSet(5, 9, 777);
  assert.equal(set.length, 5);
  assert.strictEqual(new Set(set.map((p) => p.question)).size, 5, 'questions must be distinct');
  set.forEach((p, i) => assertWellFormed(p, `set[${i}]`));
});

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('GET /api/math/word-problems serves a playable set', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/math/word-problems?count=5', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 5);
  assert.equal(r.body.problems.length, 5);
  r.body.problems.forEach((p, i) => assertWellFormed(p, `api[${i}]`));
});
