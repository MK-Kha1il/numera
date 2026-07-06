// Unit tests for the derived active-learning layer (mathEngine/deriveActiveLearning.js) and its
// wiring into the self-explain / worked-example / transfer engines. The point of this layer is to
// lift active-recall coverage from the ~8–15 hand-authored concepts toward catalog-wide WITHOUT
// fabricating prose, so the tests assert both coverage floors and per-item well-formedness.
const { test } = require('node:test');
const assert = require('node:assert');

const D = require('../mathEngine/deriveActiveLearning');
const SE = require('../mathEngine/selfExplainEngine');
const WE = require('../mathEngine/workedExampleEngine');
const TE = require('../mathEngine/transferEngine');
const { concepts } = require('../mathEngine/knowledgeGraph');

test('coverage floors: derivation lifts the three layers well beyond the hand-authored seed', () => {
  const cov = D.listDerivable();
  assert.ok(cov.worked.length >= 150, `worked coverage ${cov.worked.length} should be >= 150`);
  assert.ok(cov.selfExplain.length >= 150, `self-explain coverage ${cov.selfExplain.length} should be >= 150`);
  assert.ok(cov.transfer.length >= 40, `transfer coverage ${cov.transfer.length} should be >= 40`);
});

test('derived worked examples are well-formed (problem + ordered steps with math)', () => {
  for (const id of D.listDerivable().worked) {
    const w = D.deriveWorkedExample(id);
    assert.ok(w && w.problem && w.problem.length > 0, `${id} worked has a problem`);
    assert.ok(Array.isArray(w.steps) && w.steps.length >= 1, `${id} worked has steps`);
    for (const s of w.steps) {
      assert.ok(typeof s.action === 'string', `${id} step has an action`);
      assert.ok(s.math && s.math.length > 0, `${id} step has math`);
    }
    // The reveal must resolve to the answer somewhere in the last couple of steps.
    const ex = require('../mathEngine/conceptLessons').CONCEPT_LESSONS[id].examples[0];
    const ans = String(ex.answer).trim();
    const tail = w.steps.slice(-2).map((s) => s.math).join(' ');
    assert.ok(tail.includes(ans), `${id} reveal ends on the answer (${ans})`);
  }
});

test('derived self-explain has exactly one correct option among four, none empty', () => {
  for (const id of D.listDerivable().selfExplain) {
    const json = SE.buildSelfExplainJson(id);
    assert.ok(json.length > 0, `${id} self-explain non-empty`);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.options.length, 4, `${id} has 4 options`);
    assert.strictEqual(parsed.options.filter((o) => o.correct).length, 1, `${id} exactly one correct`);
    assert.strictEqual(new Set(parsed.options.map((o) => o.text)).size, 4, `${id} options distinct`);
    for (const o of parsed.options) assert.ok(o.text && o.text.length > 0, `${id} option non-empty`);
  }
});

test('derived transfer items are well-formed MCQs that include the answer', () => {
  let derivedCount = 0;
  for (const id of TE.TRANSFER_CONCEPTS) {
    const p = TE.buildTransferProblem(id, 1, 0);
    assert.ok(p, `${id} produces a transfer problem`);
    assert.strictEqual(p.options.length, 4, `${id} has 4 options`);
    assert.ok(p.options.includes(p.correctAnswer), `${id} options include the answer`);
    if (p.derived) derivedCount++;
  }
  assert.ok(derivedCount >= 40, `at least 40 transfer concepts are derived (got ${derivedCount})`);
});

test('hand-authored content always takes precedence over derived', () => {
  // pemdas has an authored worked example, self-explain, AND is foundational.
  const worked = JSON.parse(WE.buildWorkedExampleJson('pemdas'));
  assert.match(worked.problem, /6 \+ 2/, 'authored pemdas worked example wins');
  const se = JSON.parse(SE.buildSelfExplainJson('pemdas'));
  assert.ok(se.options.some((o) => /strictly left to right/i.test(o.text)), 'authored pemdas self-explain wins');
});

test('every concept the orchestrator can offer transfer for actually builds one', () => {
  for (const id of Object.keys(concepts)) {
    if (!TE.hasTransfer(id)) continue;
    assert.ok(TE.buildTransferProblem(id, 1, 0), `${id} hasTransfer implies buildable`);
  }
});

test('derived self-explain phrasing varies across concepts (not one meta-gameable template)', () => {
  const D = require('../mathEngine/deriveActiveLearning');
  // Collect the distractor sets of many derived concepts; the archetype phrasings must not
  // be identical everywhere, or learners learn "pick the non-template option" instead of math.
  const ids = Object.keys(concepts).filter((id) => D.deriveSelfExplain(id)).slice(0, 40);
  const questions = new Set();
  const genericDistractors = new Set();
  for (const id of ids) {
    const e = D.deriveSelfExplain(id);
    questions.add(e.question);
    for (const d of e.distractors) {
      if (!d.startsWith('Because the natural move')) genericDistractors.add(d.replace(/for [a-z0-9 &()-]+,/, 'for X,'));
    }
  }
  assert.ok(questions.size >= 3, `question stems vary (got ${questions.size})`);
  assert.ok(genericDistractors.size >= 6, `generic distractor phrasings vary (got ${genericDistractors.size})`);
});

test('derived self-explain uses a real misconception as a distractor when one exists', () => {
  const D = require('../mathEngine/deriveActiveLearning');
  const e = D.deriveSelfExplain('stat_median');
  assert.ok(e.distractors.some((d) => /unsorted|smallest and largest/i.test(d)),
    'a stat_median distractor is built from its graph misconceptions');
});

test('derived worked examples end on a why line anchored to the principle', () => {
  const D = require('../mathEngine/deriveActiveLearning');
  let checked = 0;
  for (const id of Object.keys(concepts).slice(0, 60)) {
    const we = D.deriveWorkedExample(id);
    if (!we) continue;
    const last = we.steps[we.steps.length - 1];
    assert.ok(last.why && last.why.length > 0, `${id} final step carries a why`);
    checked++;
  }
  assert.ok(checked >= 30, `checked a meaningful sample (got ${checked})`);
});
