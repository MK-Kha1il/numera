// Lesson coverage (audit #1.1 — content as a product, lesson depth). The generated-practice strands
// must also carry VETTED, concept-first lessons, not the generic legacy fallback. This locks that:
// every concept in the foundational strands (geometry / number sense / statistics) resolves to a
// rich 5-part lesson (intuition → what → why → representations → mistakes → connections + worked
// examples), and NO served lesson contains the LaTeX-corruption fingerprint (a stray control char).
const { test } = require('node:test');
const assert = require('node:assert');
const { getLessonAndExamples } = require('../mathEngine/lessons');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');

// Strands that are foundational enough to deserve authored (not legacy) lessons.
const RICH_STRANDS = new Set(['integers', 'decimals', 'fractions', 'geometry', 'number_sense', 'statistics', 'expressions', 'powers', 'graphing', 'inequalities', 'functions']);

// Same control-char fingerprint as the generation sweep (tab/newline/CR are legitimate).
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function controlCharIn(value) {
  const str = JSON.stringify(value == null ? '' : value);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 && !ALLOWED_CONTROLS.has(code)) return code;
  }
  return null;
}

for (const [conceptId, meta] of Object.entries(CONCEPT_TO_LEVEL)) {
  if (!RICH_STRANDS.has(meta.category)) continue;
  test(`${conceptId} serves a complete, corruption-free concept-first lesson`, () => {
    const lesson = getLessonAndExamples(meta.category, meta.level);
    assert.ok(lesson && lesson.lessonTitle && lesson.lessonTitle.trim().length > 0, `${conceptId}: no lesson title`);
    assert.ok(lesson.lessonFormula && lesson.lessonFormula.trim().length > 0, `${conceptId}: no formula`);

    const s = lesson.sections;
    assert.ok(s, `${conceptId}: fell back to a legacy lesson with no concept-first sections`);
    assert.ok(s.intuitionHook && s.intuitionHook.length > 20, `${conceptId}: missing/short intuitionHook`);
    assert.ok(s.whyItWorks && s.whyItWorks.length > 20, `${conceptId}: missing/short whyItWorks`);
    assert.ok(Array.isArray(s.representations) && s.representations.length >= 2, `${conceptId}: needs >=2 representations`);
    assert.ok(Array.isArray(s.commonMistakes) && s.commonMistakes.length >= 1, `${conceptId}: needs >=1 common mistake`);
    assert.ok(Array.isArray(s.connections) && s.connections.length >= 1, `${conceptId}: needs >=1 connection`);
    assert.ok(Array.isArray(lesson.examples) && lesson.examples.length >= 2, `${conceptId}: needs >=2 worked examples`);
    for (const ex of lesson.examples) {
      assert.ok(ex.question && ex.answer != null && ex.explanation, `${conceptId}: a worked example is incomplete`);
    }

    const cc = controlCharIn(lesson);
    assert.equal(cc, null, `${conceptId}: lesson contains a control char (code ${cc}) — LaTeX-corruption fingerprint`);
  });
}
