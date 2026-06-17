// Advanced-concept lesson coverage (audit #1.1 — upgrading the ORIGINAL advanced concepts from the
// generic legacy lessons to the rich, concept-first shape). Unlike the foundational strands, the
// advanced catalog is only PARTLY concept-first: a concept earns a rich lesson only when its
// canonical-level template actually generates that concept. (matrix_trace/matrix_determinant/
// combinations were repointed to their matching template levels — 17/18/25 — so they now qualify.)
// This locks the concepts we HAVE upgraded so a future edit can't silently drop them back to the
// legacy fallback.
const { test } = require('node:test');
const assert = require('node:assert');
const { getLessonAndExamples } = require('../mathEngine/lessons');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');

// The advanced concepts upgraded to concept-first lessons (canonical-level template matches).
const UPGRADED = [
  'quadratic', 'matrix_trace', 'matrix_determinant', 'pigeonhole',
  'permutations', 'combinations', 'derivative',
  'integral', 'gcd_lcm', 'modular_arithmetic', 'totient',
  // Algebra promotions (variety templates 14/16 raised to first-class concepts).
  'linear_variable_both_sides', 'linear_system',
  // Systems II — solving methods + solution types (templates 21/22/23).
  'linear_system_substitution', 'linear_system_elimination', 'linear_system_solution_types',
  // Quadratics II — solving methods (templates 24/25/26/27).
  'quadratic_factoring', 'quadratic_formula', 'discriminant_roots', 'complete_the_square',
  // Advanced promotions (calculus limit, number-theory divisor count).
  'limit', 'divisor_count'
];

// Same control-char fingerprint guard as the other content gates (tab/newline/CR are legitimate).
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function controlCharIn(value) {
  const str = JSON.stringify(value == null ? '' : value);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 && !ALLOWED_CONTROLS.has(code)) return code;
  }
  return null;
}

for (const conceptId of UPGRADED) {
  test(`${conceptId} serves a complete, corruption-free concept-first lesson`, () => {
    const meta = CONCEPT_TO_LEVEL[conceptId];
    assert.ok(meta, `${conceptId} is missing from CONCEPT_TO_LEVEL`);

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
