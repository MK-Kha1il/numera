// Unit tests for the lesson/visual answer-leak guard (mathEngine/lessonSafety.js).
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../mathEngine/lessonSafety');

test('sanitizeLesson removes a worked example whose answer matches the exercise answer', () => {
  const lesson = {
    lessonTitle: 'Chinese Remainder Theorem',
    examples: [
      { question: 'Solve x = 1 (mod 3), x = 2 (mod 5).', answer: '7', explanation: '...' },
      { question: 'A safe teaching example with no overlap.', answer: '23', explanation: '...' },
    ],
  };
  // The exercise being served has answer 7 — the first example would hand it over.
  const { lesson: clean, leaks } = S.sanitizeLesson(lesson, { question: 'x = 2 (mod 3), x = 4 (mod 5)?', correct_answer: '7' });
  assert.strictEqual(clean.examples.length, 1, 'the answer-leaking example is dropped');
  assert.strictEqual(clean.examples[0].answer, '23');
  assert.strictEqual(leaks.length, 1);
  assert.strictEqual(leaks[0].reason, 'answer_match');
});

test('sanitizeLesson removes an example that merely restates the exercise structure', () => {
  const lesson = {
    examples: [
      { question: 'Solve $$3x + 7 = 19$$', answer: '999', explanation: '...' }, // same skeleton as exercise
    ],
  };
  const { lesson: clean, leaks } = S.sanitizeLesson(lesson, { question: 'Solve $$5x + 2 = 42$$', correctAnswer: '8' });
  assert.strictEqual(clean.examples.length, 0, 'restating the exercise structure is a leak');
  assert.strictEqual(leaks[0].reason, 'structure_match');
});

test('sanitizeLesson keeps genuinely educational examples untouched', () => {
  const lesson = {
    examples: [{ question: 'Why does dividing last work?', answer: 'understanding', explanation: '...' }],
  };
  const { lesson: clean, leaks } = S.sanitizeLesson(lesson, { question: 'Solve $$5x + 2 = 42$$', correctAnswer: '8' });
  assert.strictEqual(clean.examples.length, 1);
  assert.strictEqual(leaks.length, 0);
  assert.strictEqual(clean, lesson, 'unchanged lesson is returned by reference (no needless clone)');
});

test('sanitizeVisualSpec strips embedded answer/solution keys at any depth', () => {
  const spec = {
    type: 'balance',
    params: { left: 3, right: 10, answer: 7 },
    solution: 7,
    nested: [{ correctAnswer: 7, label: 'x' }],
  };
  const clean = S.sanitizeVisualSpec(spec);
  assert.strictEqual(clean.solution, undefined);
  assert.strictEqual(clean.params.answer, undefined);
  assert.strictEqual(clean.params.left, 3, 'structural values are preserved');
  assert.strictEqual(clean.nested[0].correctAnswer, undefined);
  assert.strictEqual(clean.nested[0].label, 'x');
});

test('sanitizeVisualJson round-trips a JSON string and strips leaks', () => {
  const json = JSON.stringify({ type: 'fraction', answer: '3/4', parts: 4 });
  const cleaned = JSON.parse(S.sanitizeVisualJson(json));
  assert.strictEqual(cleaned.answer, undefined);
  assert.strictEqual(cleaned.parts, 4);
});
