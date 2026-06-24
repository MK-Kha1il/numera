// Tests the TAGGED-DISTRACTOR diagnosis mechanism — the only path that can diagnose NON-NUMERIC
// wrong answers (fractions, coordinates, inequalities, LaTeX). A generator tags each distractor with
// the misconception it encodes (`misc: { id: exactOptionValue }`); mathGenerator surfaces that as
// `misconceptionTags`; the classifier matches the learner's wrong answer to a tag by value. This
// test is DATA-DRIVEN: it auto-discovers every concept that emits tags, so it covers new tags as
// they are added. It checks both the persisted path (classifier) and the real-time path (socratic).
const { test } = require('node:test');
const assert = require('node:assert');

const G = require('../mathGenerator');
const { concepts } = require('../mathEngine/knowledgeGraph');
const { classifyMisconception } = require('../mathEngine/misconceptionEngine');

test('every tagged distractor is a real option, classifies tagged, and matches socratic', () => {
  const taggedConcepts = new Set();
  let exercised = 0;

  for (const id of Object.keys(concepts)) {
    for (let idx = 0; idx < 8; idx++) {
      let p;
      try { p = G.generateProblem('mental', 1, idx, 1000, {}, { targetConceptId: id }); } catch { continue; }
      const tags = p.misconceptionTags;
      if (!tags || Object.keys(tags).length === 0) continue;
      taggedConcepts.add(id);

      const optionStrs = (p.options || []).map((o) => String(o).trim());
      const sj = JSON.parse(p.socraticJson || '{}');

      for (const [miscId, rawVal] of Object.entries(tags)) {
        const val = String(rawVal).trim();
        // A tag must name a misconception that exists in the graph (no typos).
        assert.ok(
          (concepts[id].misconceptions || []).some((m) => m.id === miscId),
          `${id} tags unknown misconception "${miscId}"`
        );
        // Tags are best-effort: when the tagged value is one of the shown options it MUST diagnose
        // correctly; when it isn't shown (e.g. a fraction answer that reduced to a whole number, so
        // the options became integers) the tag is simply inert — it can never match a real wrong
        // answer, so it never mis-diagnoses.
        if (!optionStrs.includes(val)) continue;
        // Persisted path: the classifier diagnoses it via the tag.
        const diag = classifyMisconception(id, p.correctAnswer, val, { misc: tags });
        assert.strictEqual(diag.source, 'tagged', `${id}.${miscId} should classify via tag`);
        assert.strictEqual(diag.id, miscId, `${id} tag "${val}" diagnoses as ${miscId}`);
        // Real-time path: socratic attributes the same option to the same misconception.
        assert.strictEqual((sj.byOption[val] || {}).misconception, miscId, `${id} socratic attributes "${val}" to ${miscId}`);
        exercised++;
      }
    }
  }

  assert.ok(taggedConcepts.size >= 5, `expected several tagged concepts, found ${taggedConcepts.size}`);
  assert.ok(exercised >= 10, `expected many tag firings, got ${exercised}`);
});
