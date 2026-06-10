// Level-matched duels: a duel serves problems adequate to the duellists' shared math level (so
// middle-schoolers face middle-school problems and advanced students face advanced ones). This locks
// that buildDuelProblemSet picks LEVEL-APPROPRIATE concepts, returns well-formed answer-stripped
// problems with a server-side answer key, and clamps out-of-range levels.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('buildDuelProblemSet returns well-formed, answer-stripped problems with a server-only key', async () => {
  for (const target of [3, 8, 15, 24, 40, 49]) {
    const set = await ctx.mod.buildDuelProblemSet(target);
    assert.equal(set.level, target, `level passes through for ${target}`);
    assert.equal(set.problems.length, 5);
    assert.equal(set.answers.length, 5);
    assert.ok(Array.isArray(set.explanations) && set.explanations.length === 5, 'worked solutions kept server-side');
    for (const p of set.problems) {
      assert.ok(p.question && p.question.length > 0, 'has a question');
      assert.ok(Array.isArray(p.options) && p.options.length >= 2, 'has options');
      assert.equal(p.correctAnswer, undefined, 'the answer is stripped from client problems');
      // The worked solution and Socratic feedback both spell the answer in plaintext, so neither
      // may ride along with the live problem — that would defeat server-authoritative grading.
      assert.equal(p.explanation, undefined, 'the explanation is NOT shipped with the live problem');
      assert.equal(p.socraticJson, undefined, 'the socratic feedback is NOT shipped with the live problem');
    }
    for (const a of set.answers) assert.ok(a != null && String(a).trim().length > 0, 'server keeps the answer');
  }
});

test('high-level duels use the SymPy CAS when available, else fall back to the catalog', async () => {
  const available = await require('../mathEngine/cas/sympyClient').isAvailable();
  const set = await ctx.mod.buildDuelProblemSet(45);
  assert.equal(set.problems.length, 5);
  assert.equal(set.answers.length, 5);
  assert.equal(set.source, available ? 'cas' : 'catalog');
  for (const p of set.problems) {
    assert.ok(p.question && p.question.length > 0);
    assert.ok(Array.isArray(p.options) && p.options.length >= 2);
    assert.equal(p.correctAnswer, undefined);
    // Same anti-leak guarantee on the CAS path: the SymPy worked solution is held back, not shipped.
    assert.equal(p.explanation, undefined, 'CAS duel problems do not ship the worked solution');
    assert.equal(p.socraticJson, undefined);
  }
  assert.ok(Array.isArray(set.explanations) && set.explanations.length === 5, 'worked solutions kept server-side');
});

test('out-of-range levels are clamped to 1..50', async () => {
  assert.equal((await ctx.mod.buildDuelProblemSet(0)).level, 1);
  assert.equal((await ctx.mod.buildDuelProblemSet(999)).level, 50);
  assert.equal((await ctx.mod.buildDuelProblemSet(undefined)).level, 5); // fallback DUEL_PROBLEM_LEVEL
});

test('pickDuelConcepts clusters near the target level (beginner vs advanced get different problems)', () => {
  for (const target of [5, 20, 45]) {
    const picks = ctx.mod.pickDuelConcepts(target, 5);
    assert.equal(picks.length, 5);
    const avgDist = picks.reduce((s, c) => s + Math.abs(c.level - target), 0) / picks.length;
    assert.ok(avgDist <= 16, `concepts for L${target} should cluster near it (avg dist ${avgDist})`);
  }

  // A beginner duel and an advanced duel must draw from clearly different parts of the curriculum.
  const beginnerAvg = ctx.mod.pickDuelConcepts(4, 5).reduce((s, c) => s + c.level, 0) / 5;
  const advancedAvg = ctx.mod.pickDuelConcepts(45, 5).reduce((s, c) => s + c.level, 0) / 5;
  assert.ok(advancedAvg - beginnerAvg > 15, `advanced duels should be much higher level (got ${beginnerAvg} vs ${advancedAvg})`);
});
