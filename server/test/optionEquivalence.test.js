// Option-equivalence guard (pairs with the competitive-grading upgrade). Now that ranked/duel
// grading accepts any answer that is mathematically EQUIVALENT to the canonical one, a multiple-
// choice distractor that merely LOOKS different but has the same value (e.g. answer "1/2" with a
// "0.5" distractor) would silently become a second correct option. This locks the invariant that
// no generated distractor is value-equivalent to its answer across the whole catalog.
const { test } = require('node:test');
const assert = require('node:assert');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');
const { areEquivalent, normalizeAnswer } = require('../mathEngine/answerEquivalence');

const INSTANCES_PER_CONCEPT = 25;
const ELO = 1200;

for (const [conceptId, meta] of Object.entries(CONCEPT_TO_LEVEL)) {
  test(`no ${conceptId} distractor is value-equivalent to its answer`, () => {
    for (let i = 0; i < INSTANCES_PER_CONCEPT; i++) {
      const p = generateProblem(meta.category, meta.level, i, ELO);
      if (!Array.isArray(p.options)) continue;
      const ans = p.correctAnswer;
      for (const opt of p.options) {
        // A genuine distractor differs in normalized string AND must not be value-equivalent.
        if (normalizeAnswer(opt) === normalizeAnswer(ans)) continue; // the correct option itself
        assert.ok(
          !areEquivalent(opt, ans),
          `${conceptId}[#${i}]: distractor ${JSON.stringify(opt)} is value-equivalent to answer ${JSON.stringify(ans)} (would grade as a second correct option) — Q: ${p.question}`
        );
      }
    }
  });
}
