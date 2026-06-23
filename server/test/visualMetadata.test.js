// visualMetadata — the concept→visualization registry that drives the engine.
// Contract: every model declares the mission's required fields; primitives stay
// within the canonical vocabulary; concepts inherit rich metadata by family.
const test = require('node:test');
const assert = require('node:assert');
const M = require('../mathEngine/visualMetadata');

test('every model declares the mandated metadata fields', () => {
  for (const [name, meta] of Object.entries(M.MODEL_META)) {
    assert.ok(Array.isArray(meta.representations) && meta.representations.length, `${name} representations`);
    assert.ok(Array.isArray(meta.primitives) && meta.primitives.length, `${name} primitives`);
    assert.ok(typeof meta.benefit === 'number' && meta.benefit >= 0 && meta.benefit <= 1, `${name} benefit 0..1`);
    assert.ok(typeof meta.learningGoal === 'string' && meta.learningGoal.length, `${name} learningGoal`);
    assert.ok(typeof meta.reflectionPrompt === 'string' && meta.reflectionPrompt.length, `${name} reflectionPrompt`);
    assert.ok(Array.isArray(meta.loop) && meta.loop.includes('explain'), `${name} loop closes with explain`);
    assert.ok(Array.isArray(meta.feedbackRules), `${name} feedbackRules`);
  }
});

test('primitives are all from the canonical vocabulary', () => {
  const vocab = new Set(M.PRIMITIVES);
  for (const [name, meta] of Object.entries(M.MODEL_META)) {
    for (const p of meta.primitives) {
      assert.ok(vocab.has(p), `${name} uses non-canonical primitive "${p}"`);
    }
  }
});

test('every served concept resolves to a model that has metadata', () => {
  for (const [model, concepts] of Object.entries(M.MODEL_CONCEPTS)) {
    assert.ok(M.MODEL_META[model], `model ${model} has metadata`);
    for (const c of concepts) {
      assert.equal(M.modelFor(c), model);
      assert.ok(M.isVisualConcept(c));
      assert.ok(M.metadataFor(c), `${c} has full metadata`);
    }
  }
});

test('metadataFor pulls the concept real misconceptions from the graph', () => {
  const meta = M.metadataFor('linear_two_step');
  assert.ok(meta);
  assert.ok(Array.isArray(meta.misconceptions) && meta.misconceptions.length > 0,
    'two-step linear has a known misconception to target');
  assert.ok(meta.misconceptions[0].id && meta.misconceptions[0].label);
});

test('benefitFor distinguishes model / no-model / unknown', () => {
  assert.ok(M.benefitFor('fraction_compare') > 0, 'a visual concept has positive benefit');
  assert.equal(M.benefitFor('pemdas'), null, 'unrecognized concept → null (fall back to pattern match)');
  assert.equal(M.benefitFor(null), null);
});

test('enrichSpec adds answer-free guidance, never a numeric answer', () => {
  const spec = { type: 'balance_scale', params: { a: 2, b: 4, c: 10, solution: 3 }, prompt: 'p', goal: 'g' };
  M.enrichSpec(spec, 'linear_two_step');
  assert.ok(spec.learningGoal && spec.reflectionPrompt);
  assert.ok(Array.isArray(spec.primitives) && Array.isArray(spec.feedbackRules));
  assert.ok(Array.isArray(spec.loop) && spec.loop.includes('explain'));
  const visible = `${spec.learningGoal} ${spec.reflectionPrompt}`;
  assert.ok(!/\b3\b/.test(visible), 'enrichment text must not state the solution (3)');
});
