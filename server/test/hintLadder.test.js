// Unit tests for the multi-stage hint ladder (mathEngine/hintLadder.js).
const { test } = require('node:test');
const assert = require('node:assert');
const { buildHintLadder, leaksAnswer } = require('../mathEngine/hintLadder');

test('builds an escalating, sequentially-numbered ladder for a known concept', () => {
  const ladder = buildHintLadder('linear_two_step', '4');
  assert.ok(ladder.length >= 3, 'multiple rungs');
  assert.deepStrictEqual(
    ladder.map((r) => r.stage),
    ladder.map((_, i) => i + 1),
    'stages are 1..n with no gaps'
  );
  // Escalation order: nudge -> concept -> method -> guided.
  const levels = ladder.map((r) => r.level);
  assert.strictEqual(levels[0], 'nudge', 'first rung is the smallest nudge');
  assert.ok(levels.indexOf('concept') < levels.indexOf('method'), 'concept comes before method');
  assert.ok(levels.indexOf('method') < levels.indexOf('guided'), 'method comes before guided');
});

test('no rung in the ladder reveals the answer', () => {
  // gcd tip mentions "Euclidean algorithm" etc. Use a contrived single-char answer that
  // also appears as a standalone token risk; the guard must drop any leaking rung.
  for (const type of ['gcd', 'combinations', 'derivative', 'percentage', 'pythagorean']) {
    const ladder = buildHintLadder(type, '12');
    for (const rung of ladder) {
      assert.ok(!leaksAnswer(rung.text, '12'), `${type} rung "${rung.level}" must not leak 12`);
    }
  }
});

test('a leaking rung is dropped and the ladder is re-numbered contiguously', () => {
  // The percentage method tip contains "100"; if the answer were "100" that rung must drop.
  const ladder = buildHintLadder('percentage', '100');
  assert.ok(ladder.every((r) => !leaksAnswer(r.text, '100')));
  assert.deepStrictEqual(ladder.map((r) => r.stage), ladder.map((_, i) => i + 1));
});

test('unknown template type falls back to a single nudge', () => {
  const ladder = buildHintLadder('does_not_exist', '5');
  assert.strictEqual(ladder.length, 1);
  assert.strictEqual(ladder[0].level, 'nudge');
});

test('a type with no authored tip derives a full ladder from its concept lesson', () => {
  // fraction_add / geo_circle_area post-date tips.js; before the derivation they collapsed
  // to the single generic nudge.
  for (const type of ['fraction_add', 'geo_circle_area', 'inequality_flip_negative']) {
    const ladder = buildHintLadder(type, ' no-collision ');
    assert.ok(ladder.length >= 3, `${type} gets a real ladder, not the generic nudge`);
    const levels = ladder.map((r) => r.level);
    assert.strictEqual(levels[0], 'nudge');
    assert.ok(levels.includes('concept'), `${type} has a concept rung`);
    assert.ok(levels.includes('method'), `${type} has a method rung`);
  }
});

test('derived rungs pass the answer-leak guard too', () => {
  // The fraction_add lesson formula/mistake text mentions specific fractions; a colliding
  // answer must drop that rung, and the ladder must stay contiguous.
  const ladder = buildHintLadder('fraction_add', '5/6');
  for (const rung of ladder) {
    assert.ok(!leaksAnswer(rung.text, '5/6'), `rung "${rung.level}" must not leak 5/6`);
  }
  assert.deepStrictEqual(ladder.map((r) => r.stage), ladder.map((_, i) => i + 1));
});

test('leaksAnswer respects word boundaries for single-character answers', () => {
  assert.strictEqual(leaksAnswer('the value 1 is the result', '1'), true);
  assert.strictEqual(leaksAnswer('multiply by 100 then divide', '1'), false, 'the 1 inside 100 is not a leak');
  assert.strictEqual(leaksAnswer('subtract the constant first', '7'), false);
});
