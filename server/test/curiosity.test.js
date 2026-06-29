// Tests for the curiosity "spark" layer (mathEngine/curiosityEngine.js) and its attachment to
// lesson sections. Curiosity is selective and authored — so the bar is correctness, not coverage:
// every spark must point at a real concept, carry a known type, and contain no LaTeX-corrupting
// control characters.
const { test } = require('node:test');
const assert = require('node:assert');

const { CURIOSITY, getCuriosity, hasCuriosity, getRandomCuriosity } = require('../mathEngine/curiosityEngine');
const { concepts } = require('../mathEngine/knowledgeGraph');
const { CONCEPT_LESSONS, buildSections, getConceptLesson } = require('../mathEngine/conceptLessons');

const TYPES = new Set(['pattern', 'shortcut', 'counterintuitive', 'wonder']);
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

test('every spark points at a real concept that has a lesson', () => {
  for (const id of Object.keys(CURIOSITY)) {
    assert.ok(concepts[id], `${id} curiosity references an unknown concept`);
    assert.ok(CONCEPT_LESSONS[id], `${id} curiosity has no lesson to attach to`);
  }
});

test('every spark is well-formed (known type, title+body, no control chars)', () => {
  for (const [id, c] of Object.entries(CURIOSITY)) {
    assert.ok(TYPES.has(c.type), `${id} has an unknown spark type: ${c.type}`);
    assert.ok(c.title && c.title.length > 3, `${id} needs a title`);
    assert.ok(c.body && c.body.length > 20, `${id} needs a substantive body`);
    assert.ok(!hasControlChar(c.title + c.body), `${id} has a LaTeX/control-char corruption`);
  }
});

test('getCuriosity / hasCuriosity behave', () => {
  assert.ok(hasCuriosity('pythagorean'));
  assert.strictEqual(hasCuriosity('arithmetic_add'), false);
  assert.strictEqual(getCuriosity('arithmetic_add'), null);
  assert.ok(getCuriosity('combinations').title.length > 0);
  assert.strictEqual(getCuriosity(undefined), null);
});

test('buildSections attaches the spark only when the concept has one', () => {
  const withSpark = buildSections(getConceptLesson('pythagorean'), 'pythagorean');
  assert.ok(withSpark.spark && withSpark.spark.title, 'pythagorean section carries a spark');

  const withoutSpark = buildSections(getConceptLesson('arithmetic_add'), 'arithmetic_add');
  assert.strictEqual(withoutSpark.spark, null, 'arithmetic_add section has no spark');

  // Backward-compatible: omitting conceptId must not throw and yields no spark.
  const legacy = buildSections(getConceptLesson('arithmetic_add'));
  assert.strictEqual(legacy.spark, null);
});

test('getRandomCuriosity returns a tagged spark and can exclude one', () => {
  const r = getRandomCuriosity();
  assert.ok(r && r.conceptId && TYPES.has(r.type));
  for (let i = 0; i < 20; i++) {
    assert.notStrictEqual(getRandomCuriosity('pythagorean').conceptId, 'pythagorean');
  }
});
