// End-to-end revival test for the PERCENT FAMILY misconception diagnosis. These four concepts had
// dead `(ans)=>ans` placeholder rules; their generators now expose the underlying numbers and the
// rules compute the real wrong value. This test proves the WHOLE loop on real generated problems:
// generate → read the echoed params → the rule's prediction is diagnosed concept_specific (and is a
// genuine distractor a learner could actually pick).
const { test } = require('node:test');
const assert = require('node:assert');

const G = require('../mathGenerator');
const { concepts } = require('../mathEngine/knowledgeGraph');
const { conceptFromType } = require('../mathEngine/problemOrchestrator');
const { classifyMisconception } = require('../mathEngine/misconceptionEngine');

const PERCENT_FAMILY = ['percent_change', 'percent_discount', 'percent_markup', 'percent_error'];

test('percent-family generators expose params and their misconception rules diagnose on real problems', () => {
  let fired = 0;
  for (const id of PERCENT_FAMILY) {
    let firedForConcept = 0;
    for (let idx = 0; idx < 6; idx++) {
      // targetConceptId overrides category/level via the generator's internal CONCEPT_TO_LEVEL map.
      // 'mental' is the generator's wildcard category that honours targetConceptId for any concept.
      const p = G.generateProblem('mental', 1, idx, 1000, {}, { targetConceptId: id });
      if ((conceptFromType(p.templateType) || p.templateType) !== id) continue;
      assert.ok(p.params && Object.keys(p.params).length > 0, `${id} exposes params`);
      const correct = Number(p.correctAnswer);
      const distractors = (p.options || []).map(Number);

      for (const mis of concepts[id].misconceptions) {
        let predicted;
        try { predicted = mis.rule(correct, p.params); } catch { predicted = NaN; }
        if (!Number.isFinite(predicted) || Math.abs(predicted - correct) < 0.01) continue; // inert here
        const diag = classifyMisconception(id, correct, predicted, p.params);
        assert.strictEqual(diag.source, 'concept_specific', `${id}.${mis.id} should diagnose concept_specific`);
        assert.strictEqual(diag.id, mis.id, `${id} predicted value diagnoses as ${mis.id}`);
        // The predicted wrong value should be an option the learner could actually choose.
        assert.ok(distractors.includes(predicted), `${id}.${mis.id} prediction ${predicted} is a real option`);
        fired++;
        firedForConcept++;
      }
    }
    assert.ok(firedForConcept >= 1, `${id} fired at least one diagnosis across generated problems`);
  }
  assert.ok(fired >= 8, `expected the family to fire many diagnoses, got ${fired}`);
});

test('no percent-family rule is a dead identity placeholder', () => {
  for (const id of PERCENT_FAMILY) {
    for (const mis of concepts[id].misconceptions) {
      const vals = [3, 7, 12, 40].map((v) => {
        try { return mis.rule(v, { N: 40, P: 10, P_: 40, pct: 20, T: 50, measured: 55 }); } catch { return NaN; }
      });
      assert.ok(vals.some((v, i) => Number.isFinite(v) && v !== [3, 7, 12, 40][i]), `${id}.${mis.id} is not identity`);
    }
  }
});
