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

test('a classified misconception with no authored template gets a DERIVED probe, not the generic one', () => {
  // decimal_mult's place_count_slip (ans × 10) has no authored Socratic template; the derived
  // path must name the slip and pull the lesson's authored fix for the hint.
  const json = buildSocraticJson('decimal_mult', '1.2', ['1.2', '12'], {});
  const entry = JSON.parse(json).byOption['12'];
  assert.ok(entry);
  assert.strictEqual(entry.misconception, 'place_count_slip');
  assert.match(entry.probe, /decimal places/i, 'probe names the actual slip');
  assert.ok(!/walk back through your steps/i.test(entry.probe), 'not the generic fallback probe');
});

test('a derived hint that would leak the live answer is swapped for the generic one', () => {
  // The decimal_mult lesson fix text contains the worked value 0.12 — when the LIVE answer
  // is 0.12 that hint must not be served.
  const json = buildSocraticJson('decimal_mult', '0.12', ['0.12', '1.2'], {});
  const entry = JSON.parse(json).byOption['1.2'];
  assert.ok(entry);
  assert.ok(!entry.hint.includes('0.12'), 'leaking hint replaced');
  assert.ok(!entry.probe.includes('0.12'), 'probe clean too');
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
