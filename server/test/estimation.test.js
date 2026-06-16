// Estimation / number-sense generator (ultra review edu#16). The defining invariant of an
// estimation MCQ is that the "best estimate" really IS the closest option to the true value —
// otherwise the answer key is wrong. These tests assert that across many seeds, plus the usual
// well-formed / deterministic / level-gating guards.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { generateEstimationProblem, buildEstimationSet, TEMPLATES } = require('../mathEngine/estimation');
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

test('the stated answer is the option closest to the true value (across many seeds)', () => {
  for (let seed = 1; seed <= 600; seed++) {
    const p = generateEstimationProblem(seed, 9);
    assertWellFormed(p, `seed ${seed}`);
    const actual = p._actual;
    const distToAnswer = Math.abs(parseFloat(p.correctAnswer) - actual);
    for (const opt of p.options) {
      if (opt === p.correctAnswer) continue;
      const d = Math.abs(parseFloat(opt) - actual);
      assert.ok(
        d > distToAnswer,
        `seed ${seed}: option "${opt}" (d=${d}) is not farther from ${actual} than the answer "${p.correctAnswer}" (d=${distToAnswer})`,
      );
    }
  }
});

test('generation is deterministic for a given seed', () => {
  assert.deepEqual(generateEstimationProblem(4242, 9), generateEstimationProblem(4242, 9));
});

test('low levels only surface the simplest estimation skills', () => {
  const simple = new Set(TEMPLATES.filter((t) => t.minLevel <= 1).map((t) => t.skill));
  for (let seed = 1; seed <= 200; seed++) {
    assert.ok(simple.has(generateEstimationProblem(seed, 1).skill), `seed ${seed}: advanced skill at level 1`);
  }
});

test('buildEstimationSet returns the requested count, distinct, with no internal field leaked', () => {
  const set = buildEstimationSet(5, 9, 99);
  assert.equal(set.length, 5);
  assert.strictEqual(new Set(set.map((p) => p.question)).size, 5);
  set.forEach((p, i) => {
    assertWellFormed(p, `set[${i}]`);
    assert.ok(!('_actual' in p), `set[${i}]: the test-only _actual field leaked into the payload`);
  });
});

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('GET /api/math/estimation serves a playable set', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/math/estimation?count=5', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 5);
  r.body.problems.forEach((p, i) => assertWellFormed(p, `api[${i}]`));
});
