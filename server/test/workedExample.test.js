// Worked-example engine tripwire. Every authored example must produce a well-formed step-by-step
// model: a problem statement and an ordered list of steps, each with a non-empty action, math, and
// why, free of LaTeX-corruption control characters. Unauthored concepts must yield '' (so the
// client shows nothing). Guards the same bug class as the generation, lesson, and self-explanation
// coverage sweeps.
const { test } = require('node:test');
const assert = require('node:assert');
const { buildWorkedExampleJson, WORKED_EXAMPLES, hasControlChar } = require('../mathEngine/workedExampleEngine');

test('unauthored concepts produce an empty worked example (client shows nothing)', () => {
  assert.strictEqual(buildWorkedExampleJson('definitely_not_a_concept'), '');
  assert.strictEqual(buildWorkedExampleJson(undefined), '');
  assert.strictEqual(buildWorkedExampleJson(null), '');
});

for (const conceptId of Object.keys(WORKED_EXAMPLES)) {
  test(`${conceptId} builds a well-formed worked example`, () => {
    const json = buildWorkedExampleJson(conceptId);
    assert.ok(json && json.length > 0, `${conceptId}: empty worked example`);

    const parsed = JSON.parse(json);
    assert.ok(parsed.problem && parsed.problem.trim().length > 0, `${conceptId}: no problem statement`);
    assert.ok(!hasControlChar(parsed.problem), `${conceptId}: problem contains a control char (LaTeX-corruption fingerprint)`);

    assert.ok(Array.isArray(parsed.steps) && parsed.steps.length >= 2, `${conceptId}: needs >=2 steps`);
    for (const step of parsed.steps) {
      for (const field of ['action', 'math', 'why']) {
        assert.ok(
          typeof step[field] === 'string' && step[field].trim().length > 0,
          `${conceptId}: a step is missing ${field}`,
        );
        assert.ok(!hasControlChar(step[field]), `${conceptId}: a step's ${field} contains a control char`);
      }
    }
  });
}
