// Unit tests for the transfer-problem generator (mathEngine/transferEngine.js).
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../mathEngine/transferEngine');

test('every transfer concept produces a well-formed problem', () => {
  for (const conceptId of T.TRANSFER_CONCEPTS) {
    const p = T.buildTransferProblem(conceptId, 1, 0);
    assert.ok(p, `${conceptId} should produce a problem`);
    assert.strictEqual(p.isTransfer, true);
    assert.ok(p.question && p.question.length > 0, `${conceptId} has a question`);
    assert.ok(p.explanation && p.explanation.length > 0, `${conceptId} has an explanation`);
    // Exactly 4 unique options, including the correct answer.
    assert.strictEqual(p.options.length, 4, `${conceptId} has 4 options`);
    assert.strictEqual(new Set(p.options).size, 4, `${conceptId} options are unique`);
    assert.ok(p.options.includes(p.correctAnswer), `${conceptId} options include the answer`);
  }
});

test('transfer problems are word/context framings, not bare equations', () => {
  // The whole point is a novel context — these should read as prose, not "$3 + 4$".
  const add = T.buildTransferProblem('arithmetic_add', 1, 0);
  assert.match(add.question, /library|books/i);
  assert.ok(!add.question.includes('$'), 'transfer framing should not be bare LaTeX');

  const pyth = T.buildTransferProblem('pythagorean', 1, 0);
  assert.match(pyth.question, /ladder|wall/i);
});

test('pythagorean transfer uses a clean triple (integer hypotenuse answer)', () => {
  const p = T.buildTransferProblem('pythagorean', 1, 0);
  assert.ok(Number.isInteger(Number(p.correctAnswer)), 'hypotenuse answer is a whole number');
});

test('unknown concepts have no transfer framing', () => {
  // Every REAL catalog concept now has transfer (appliedExamples.js closed the gap to 100%,
  // including totient) — only ids outside the catalog have none.
  assert.strictEqual(T.buildTransferProblem('no_such_concept', 1, 0), null);
  assert.strictEqual(T.hasTransfer('no_such_concept'), false);
  assert.strictEqual(T.hasTransfer('totient'), true);
  assert.strictEqual(T.hasTransfer('arithmetic_add'), true);
});
