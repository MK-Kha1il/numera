// Self-explanation engine tripwire. Every authored reason-set must produce a well-formed
// "why is that right?" MCQ: a question, several options with EXACTLY one correct, distinct
// non-empty option texts, and no LaTeX-corruption control characters. Unauthored concepts
// must yield '' (so the client shows nothing). Guards the same bug class as the generation
// and lesson coverage sweeps.
const { test } = require('node:test');
const assert = require('node:assert');
const { buildSelfExplainJson, SELF_EXPLAIN, hasControlChar } = require('../mathEngine/selfExplainEngine');

test('unauthored concepts produce an empty self-explanation (client shows nothing)', () => {
  assert.strictEqual(buildSelfExplainJson('definitely_not_a_concept'), '');
  assert.strictEqual(buildSelfExplainJson(undefined), '');
  assert.strictEqual(buildSelfExplainJson(null), '');
});

for (const conceptId of Object.keys(SELF_EXPLAIN)) {
  test(`${conceptId} builds a well-formed self-explanation prompt`, () => {
    const json = buildSelfExplainJson(conceptId);
    assert.ok(json && json.length > 0, `${conceptId}: empty self-explanation`);

    const parsed = JSON.parse(json);
    assert.ok(parsed.question && parsed.question.trim().length > 0, `${conceptId}: no question`);
    assert.ok(Array.isArray(parsed.options) && parsed.options.length >= 3, `${conceptId}: needs >=3 options`);

    const correct = parsed.options.filter((o) => o.correct === true);
    assert.strictEqual(correct.length, 1, `${conceptId}: must have exactly one correct option`);

    const texts = parsed.options.map((o) => o.text);
    for (const t of texts) {
      assert.ok(typeof t === 'string' && t.trim().length > 0, `${conceptId}: an option has no text`);
      assert.ok(!hasControlChar(t), `${conceptId}: an option contains a control char (LaTeX-corruption fingerprint)`);
    }
    const uniq = new Set(texts.map((t) => t.trim()));
    assert.strictEqual(uniq.size, texts.length, `${conceptId}: duplicate option texts`);

    assert.ok(parsed.explanation && parsed.explanation.trim().length > 0, `${conceptId}: no explanation`);
    assert.ok(!hasControlChar(parsed.question), `${conceptId}: question contains a control char`);
  });
}
