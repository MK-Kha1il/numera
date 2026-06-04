// Unit tests for the Socratic feedback engine (mathEngine/socraticEngine.js).
//
// Guards two invariants of the Sprint-2 feedback redesign:
//  1. A wrong option whose value matches a known misconception gets a TARGETED probe
//     (not the generic fallback) — i.e. the misconception classifier is actually wired in.
//  2. No probe or hint EVER leaks the correct answer (productive struggle: the answer
//     stays behind "Review Solution", not in the guiding question).
const { test } = require('node:test');
const assert = require('node:assert');
const { buildSocraticJson } = require('../mathEngine/socraticEngine');

test('builds a targeted probe for a known misconception (pythagorean a+b slip)', () => {
  // Right triangle 3-4-5: the classic slip is adding the legs (3 + 4 = 7) instead of
  // squaring them. The knowledge graph maps that to the `linear_sum` misconception.
  const json = buildSocraticJson('pythagorean', '5', ['5', '7', '6', '4'], { a: 3, b: 4, c: 5 });
  const data = JSON.parse(json);

  const entry = data.byOption['7'];
  assert.ok(entry, 'expected feedback for the wrong option "7"');
  assert.strictEqual(entry.misconception, 'linear_sum');
  assert.match(entry.probe, /a²\s*\+\s*b²|squares/i, 'probe should redirect to squaring the sides');
  assert.ok(entry.probe.length > 0 && entry.hint.length > 0);

  // The correct answer is never in byOption, and there is always a generic fallback.
  assert.strictEqual(data.byOption['5'], undefined, 'correct answer must not get a probe');
  assert.ok(data.generic && data.generic.probe && data.generic.hint);
});

test('falls back to a concept-generic probe for unclassified wrong options', () => {
  // 999 matches no misconception rule for addition → concept-generic fallback.
  const json = buildSocraticJson('arithmetic_add', '8', ['8', '999'], { a: 5, b: 3 });
  const data = JSON.parse(json);
  const entry = data.byOption['999'];
  assert.ok(entry);
  assert.strictEqual(entry.misconception, 'unclassified');
  assert.ok(entry.probe.length > 0 && entry.hint.length > 0);
});

test('no probe or hint leaks the correct answer', () => {
  // Exercise several concepts and assert the answer string is absent from every probe/hint.
  const cases = [
    { concept: 'pythagorean',     correct: '5',  options: ['5', '7', '1', '25'], params: { a: 3, b: 4, c: 5 } },
    { concept: 'linear_one_step', correct: '6',  options: ['6', '14', '2'],      params: { a: 8, b: 14 } },
    { concept: 'arithmetic_mult', correct: '12', options: ['12', '7', '13'],     params: { a: 3, b: 4 } },
    { concept: 'pemdas',          correct: '17', options: ['17', '35', '20'],    params: { a: 3, b: 4, c: 5 } }
  ];

  for (const c of cases) {
    const data = JSON.parse(buildSocraticJson(c.concept, c.correct, c.options, c.params));
    const texts = [data.generic.probe, data.generic.hint];
    for (const k of Object.keys(data.byOption)) {
      texts.push(data.byOption[k].probe, data.byOption[k].hint);
    }
    for (const t of texts) {
      assert.ok(
        !t.includes(c.correct),
        `feedback for concept ${c.concept} leaked the answer "${c.correct}": ${t}`
      );
    }
  }
});
