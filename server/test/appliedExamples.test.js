// Applied Examples table (mathEngine/appliedExamples.js) — the authored transfer contexts
// that closed the transfer gap to 100%. Guards the authoring rules AND holds the 100% line.
const { test } = require('node:test');
const assert = require('node:assert');

const { APPLIED_EXAMPLES } = require('../mathEngine/appliedExamples');
const { concepts } = require('../mathEngine/knowledgeGraph');
const { isApplied } = require('../mathEngine/deriveActiveLearning');
const TE = require('../mathEngine/transferEngine');

const NUMERIC = /^-?\d+(\.\d+)?$/;
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

test('every applied example follows the authoring rules', () => {
  const ids = Object.keys(APPLIED_EXAMPLES);
  assert.ok(ids.length >= 80, `substantial coverage (got ${ids.length})`);
  for (const id of ids) {
    const e = APPLIED_EXAMPLES[id];
    assert.ok(concepts[id], `${id} is a real knowledge-graph concept`);
    assert.ok(NUMERIC.test(String(e.answer).trim()), `${id} answer "${e.answer}" is a plain number`);
    assert.ok(isApplied(e.question), `${id} question is applied, not a bare symbolic command`);
    assert.ok(e.question.length >= 40, `${id} question has real context`);
    assert.ok(e.explanation && e.explanation.length >= 20, `${id} has a worked explanation`);
    for (const s of [e.question, e.explanation]) {
      assert.ok(!hasControlChar(s), `${id} has no control-char LaTeX corruption`);
    }
    // The stem must not state its own answer as a completed equality or prose statement.
    const ans = String(e.answer).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.ok(
      !new RegExp(`(=\\s*\\$?\\s*${ans}\\s*\\$?\\s*([.?!,]|$))|((answer|result)\\s+(is|equals)\\s*${ans})`, 'i').test(e.question),
      `${id} question must not state its answer`
    );
  }
});

test('transfer coverage is 100% of the catalog — hold this line', () => {
  const missing = Object.keys(concepts).filter((id) => !TE.hasTransfer(id));
  assert.deepStrictEqual(missing, [], `concepts without transfer: ${missing.join(', ')}`);
});

test('every derived transfer problem is a well-formed MCQ', () => {
  for (const id of Object.keys(APPLIED_EXAMPLES)) {
    const p = TE.buildTransferProblem(id, 1, 0);
    assert.ok(p, `${id} builds a transfer problem`);
    assert.strictEqual(p.options.length, 4, `${id} has 4 options`);
    assert.ok(p.options.includes(p.correctAnswer), `${id} options include the answer`);
    assert.ok(p.isTransfer, `${id} is flagged as transfer`);
  }
});
