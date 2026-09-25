// Content Quality Gate — CI enforcement (mathEngine/contentQualityGate.js).
//
// Every lesson in CONCEPT_LESSONS and every exercise generator in templates.js is run
// through the gate on every `npm test`. A NEW lesson or generator that fails a checklist
// item therefore breaks the build (and the pre-commit quality-gate hook blocks the commit)
// — this is how the checklist in docs/ContentQualityGate.md is enforced, not just written
// down. If a failure fires here, fix the CONTENT (or, for a genuinely inherent case, add
// it to the documented allowlist in the gate module — never weaken a check to ship).
const { test } = require('node:test');
const assert = require('node:assert');

const G = require('../mathEngine/contentQualityGate');
const { CONCEPT_LESSONS } = require('../mathEngine/conceptLessons');
const { templates } = require('../mathEngine/templates');

function failText(r) {
  return r.checks.filter((c) => !c.pass).map((c) => `${c.id}: ${c.detail}`).join(' | ');
}

test('every concept lesson passes the content quality gate', () => {
  const failures = [];
  for (const id of Object.keys(CONCEPT_LESSONS)) {
    const r = G.gateLesson(id);
    if (!r.pass) failures.push(`${id} -> ${failText(r)}`);
  }
  assert.deepStrictEqual(failures, [], `lessons failing the gate:\n${failures.join('\n')}`);
});

test('every exercise generator passes the content quality gate', () => {
  const failures = [];
  for (const cat of Object.keys(templates)) {
    for (const lvl of Object.keys(templates[cat])) {
      const r = G.gateGenerator(templates[cat][lvl]);
      if (!r.pass) failures.push(`${cat} L${lvl} -> ${failText(r)}`);
    }
  }
  assert.deepStrictEqual(failures, [], `generators failing the gate:\n${failures.join('\n')}`);
});

test('the gate actually rejects bad content (negative controls)', () => {
  // A lesson with no objective, no WHY, no mistakes, one representation, an answer-stating
  // example, and no graph concept must fail on ALL of those checks.
  const badLesson = G.gateLesson('no_such_concept', {
    title: 'X',
    oneLineSummary: 'short',
    representations: [{ kind: 'symbolic', text: 'x' }],
    examples: [{ question: 'Compute 3 + 4 = 7.', answer: 7, explanation: 'because' }],
  });
  assert.strictEqual(badLesson.pass, false);
  const failedIds = badLesson.checks.filter((c) => !c.pass).map((c) => c.id);
  for (const expected of ['objective', 'concept_map', 'no_answer_leak', 'why', 'mistakes', 'representations']) {
    assert.ok(failedIds.includes(expected), `bad lesson fails "${expected}" (failed: ${failedIds})`);
  }

  // A constant generator with an unmapped type must fail concept_map + hint_ladder (+ variety
  // is unreachable because instance checks fail first — the gate reports the first blocker).
  const badGen = G.gateGenerator(() => ({
    question: 'Always the same question', answer: 1, explanation: 'same thing every time.', type: 'no_such_type',
  }));
  assert.strictEqual(badGen.pass, false);
  const genFailed = badGen.checks.filter((c) => !c.pass).map((c) => c.id);
  assert.ok(genFailed.includes('concept_map'), `unmapped type flagged (failed: ${genFailed})`);

  // A well-formed but REPETITIVE generator (mapped type, good instance hygiene, constant
  // surface) must fail the variety check specifically.
  const constantGen = G.gateGenerator(() => ({
    question: 'Add $2 + 3$', answer: 5, explanation: 'Count on from 2: three more is 5.', type: 'arithmetic_add',
  }));
  assert.strictEqual(constantGen.pass, false);
  assert.ok(
    constantGen.checks.some((c) => c.id === 'variety' && !c.pass),
    'constant generator fails the anti-repetition check'
  );
});

test('the answer-statement detector distinguishes solutions from constraints', () => {
  const gate = (q, ans) => G.gateExercise({
    question: q, answer: ans, explanation: 'a worked explanation here.', type: 'arithmetic_add',
  }).checks.find((c) => c.id === 'no_answer_leak');

  // Given constraints (variables on the left side) are NOT leaks.
  assert.ok(gate('Solve for $x$: $3x + 2y = 16$ and $2x - 2y = 4$.', 4).pass, 'constraint is not a leak');
  assert.ok(gate('Solve the two-step equation: $$2x + 2 = 6$$', 2).pass, 'coefficient coincidence is not a leak');
  // A completed computation IS a leak.
  assert.ok(!gate('Simplify: $3 + 4 = 7$.', 7).pass, 'completed equality is a leak');
  assert.ok(!gate('What is $2 + 2$? The answer is 4.', 4).pass, 'prose statement is a leak');
});

test('applied-mode generators (word / estimation / spot-the-mistake) pass the exercise gate', () => {
  const { buildWordProblemSet } = require('../mathEngine/wordProblems');
  const { buildEstimationSet } = require('../mathEngine/estimation');
  const { buildErrorDetectionSet } = require('../mathEngine/errorDetection');

  const failures = [];
  const families = [
    ['word', buildWordProblemSet(12, 5, 4242)],
    ['estimation', buildEstimationSet(12, 5, 4242)],
    ['spot_the_mistake', buildErrorDetectionSet(10, 5)],
  ];
  for (const [name, set] of families) {
    assert.ok(set.length >= 8, `${name} produces a full set`);
    // Variety: a session's set must not repeat itself.
    const distinct = new Set(set.map((p) => p.question));
    assert.strictEqual(distinct.size, set.length, `${name} set has no repeated questions`);
    for (const p of set) {
      const r = G.gateExercise(p);
      if (!r.pass) failures.push(`${name}: ${failText(r)} :: ${String(p.question).slice(0, 80)}`);
    }
  }
  assert.deepStrictEqual(failures, [], `applied problems failing the gate:\n${failures.join('\n')}`);
});

test('applied modes are served WITH hint ladders and active-learning attachments', () => {
  // These endpoints used to serve bare problems with no hints.
  const { buildWordProblemSet } = require('../mathEngine/wordProblems');
  const { buildErrorDetectionSet } = require('../mathEngine/errorDetection');
  const { attachTipToProblem } = require('../services/tipService');
  const wp = attachTipToProblem(buildWordProblemSet(1, 5, 7)[0], false);
  assert.ok(wp.hintLadder.length >= 3, 'word problem gets a real ladder via templateType');
  const sm = buildErrorDetectionSet(1, 5)[0];
  assert.strictEqual(sm.templateType, sm.conceptId, 'spot-the-mistake carries its concept as templateType');
});
