// categoryToDomain must spread the generator's ~20 fine-grained categories across the 8 competitive
// domains, not collapse everything but a handful into 'arithmetic'. This is what makes the per-domain
// rating ladders real (competitive audit #16/#45). Guards the mapping against regressing to the old
// arithmetic-fallback behaviour.
const { test } = require('node:test');
const assert = require('node:assert');
const NRS = require('../mathEngine/ratingEngine');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');

test('fine-grained categories map to their real domain, not arithmetic', () => {
  assert.equal(NRS.categoryToDomain('graphing'), 'algebra');
  assert.equal(NRS.categoryToDomain('expressions'), 'algebra');
  assert.equal(NRS.categoryToDomain('equations'), 'algebra');
  assert.equal(NRS.categoryToDomain('inequalities'), 'algebra');
  assert.equal(NRS.categoryToDomain('functions'), 'algebra');
  assert.equal(NRS.categoryToDomain('sequences'), 'algebra');
  assert.equal(NRS.categoryToDomain('factors'), 'number_theory');
  assert.equal(NRS.categoryToDomain('geometry'), 'geometry');
  assert.equal(NRS.categoryToDomain('statistics'), 'statistics');
});

test('pure number work still maps to arithmetic; unknown + empty fall back safely', () => {
  for (const c of ['arithmetic', 'fractions', 'decimals', 'integers', 'number_sense', 'rates']) {
    assert.equal(NRS.categoryToDomain(c), 'arithmetic', `${c} → arithmetic`);
  }
  assert.equal(NRS.categoryToDomain('totally_made_up'), 'arithmetic');
  assert.equal(NRS.categoryToDomain(''), 'arithmetic');
  assert.equal(NRS.categoryToDomain(null), 'arithmetic');
});

test('every category in the live concept catalog maps to a known domain', () => {
  const cats = new Set(Object.values(CONCEPT_TO_LEVEL).map((c) => c.category));
  for (const cat of cats) {
    assert.ok(NRS.KNOWN_DOMAINS.includes(NRS.categoryToDomain(cat)), `${cat} → a known domain`);
  }
});

test('the catalog now spans at least 4 distinct competitive domains', () => {
  const domains = new Set(Object.values(CONCEPT_TO_LEVEL).map((c) => NRS.categoryToDomain(c.category)));
  assert.ok(domains.size >= 4, `expected ≥4 domains, got ${[...domains].join(', ')}`);
  assert.ok(domains.has('algebra') && domains.has('geometry'), 'algebra and geometry are populated');
});
