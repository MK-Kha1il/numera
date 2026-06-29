// End-to-end revival test for misconception diagnosis on concepts whose rules were dead
// `(ans)=>ans` placeholders. The recipe: the generator now exposes the numbers it already computes,
// and the rule turns them into the real wrong value — which is exactly the generator's own
// distractor, so a learner's actual wrong choice is diagnosed. This test proves the WHOLE loop on
// real generated problems for every revived family. Add a concept here as it gets revived.
const { test } = require('node:test');
const assert = require('node:assert');

const G = require('../mathGenerator');
const { concepts } = require('../mathEngine/knowledgeGraph');
const { conceptFromType } = require('../mathEngine/problemOrchestrator');
const { classifyMisconception } = require('../mathEngine/misconceptionEngine');

// Families whose dead identity rules have been revived with param-aware formulas.
const REVIVED = [
  'percent_change', 'percent_discount', 'percent_markup', 'percent_error',
  'stat_mean', 'stat_median', 'stat_range', 'mean_missing_value',
  'geo_area_parallelogram', 'geo_area_trapezoid',
];

test('revived rules diagnose concept_specific on real generated problems, predicting a real option', () => {
  let totalFired = 0;
  for (const id of REVIVED) {
    let firedForConcept = 0;
    for (let idx = 0; idx < 8; idx++) {
      // 'mental' is the generator's wildcard category that honours targetConceptId for any concept.
      const p = G.generateProblem('mental', 1, idx, 1000, {}, { targetConceptId: id });
      if ((conceptFromType(p.templateType) || p.templateType) !== id) continue;
      assert.ok(p.params && Object.keys(p.params).length > 0, `${id} exposes params`);
      const correct = Number(p.correctAnswer);
      const options = (p.options || []).map(Number);

      for (const mis of concepts[id].misconceptions) {
        let predicted;
        try { predicted = mis.rule(correct, p.params); } catch { predicted = NaN; }
        // Skip rules that are inert for THIS instance (predict the answer / a non-finite value).
        if (!Number.isFinite(predicted) || Math.abs(predicted - correct) < 0.01) continue;
        const diag = classifyMisconception(id, correct, predicted, p.params);
        assert.strictEqual(diag.source, 'concept_specific', `${id}.${mis.id} diagnoses concept_specific`);
        assert.strictEqual(diag.id, mis.id, `${id} prediction diagnoses as ${mis.id}`);
        assert.ok(options.includes(predicted), `${id}.${mis.id} prediction ${predicted} is a real option`);
        firedForConcept++;
        totalFired++;
      }
    }
    assert.ok(firedForConcept >= 1, `${id} fired at least one diagnosis`);
  }
  assert.ok(totalFired >= 16, `expected many diagnoses across the revived families, got ${totalFired}`);
});

test('no revived rule is a dead identity placeholder', () => {
  const sample = {
    N: 40, P: 10, pct: 20, T: 50, measured: 55, sum: 20, unsortedMid: 8, max: 10, min: 4, M: 10,
    base: 5, slant: 7, h: 3, b1: 3, b2: 5,
  };
  for (const id of REVIVED) {
    for (const mis of concepts[id].misconceptions) {
      const probes = [3, 7, 12, 40];
      const vals = probes.map((v) => { try { return mis.rule(v, sample); } catch { return NaN; } });
      assert.ok(
        vals.some((v, i) => Number.isFinite(v) && v !== probes[i]),
        `${id}.${mis.id} must not be an identity placeholder`
      );
    }
  }
});
