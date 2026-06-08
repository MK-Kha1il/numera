// Curriculum coverage (audit #1.1 — content as a first-class product). Every playable concept must
// be a fully-authored catalog entry: a knowledge-graph node with a human-readable name, valid
// prerequisites that themselves exist, and a standards-alignment tag (the school-market unlock).
// This is the QA gate the authoring pipeline writes against — adding a concept to CONCEPT_TO_LEVEL
// without naming/tagging it, or pointing a prereq at a non-existent concept, fails the build.
const { test } = require('node:test');
const assert = require('node:assert');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

test('every playable concept has a named, standards-tagged knowledge-graph entry', () => {
  for (const conceptId of Object.keys(CONCEPT_TO_LEVEL)) {
    const node = KnowledgeGraph.concepts[conceptId];
    assert.ok(node, `${conceptId} is in CONCEPT_TO_LEVEL but missing from the knowledge graph`);
    assert.ok(typeof node.name === 'string' && node.name.trim().length > 0, `${conceptId} has no name`);
    assert.ok(typeof node.standard === 'string' && node.standard.trim().length > 0 && node.standard !== 'Unmapped', `${conceptId} has no standards tag`);
    assert.ok(Array.isArray(node.prereqs), `${conceptId} has no prereqs array`);
  }
});

test('every prerequisite references a real concept (no dangling edges in the graph)', () => {
  for (const [conceptId, node] of Object.entries(KnowledgeGraph.concepts)) {
    for (const prereq of node.prereqs || []) {
      assert.ok(KnowledgeGraph.concepts[prereq], `${conceptId} lists prereq "${prereq}" which does not exist`);
    }
  }
});

test('the geometry strand is present and routed as its own category', () => {
  const geo = Object.entries(CONCEPT_TO_LEVEL).filter(([, m]) => m.category === 'geometry');
  assert.ok(geo.length >= 5, 'expected at least 5 geometry concepts');
  for (const [id] of geo) {
    assert.ok(KnowledgeGraph.concepts[id].standard.startsWith('') && KnowledgeGraph.concepts[id].standard !== 'Unmapped', `${id} should be standards-tagged`);
  }
});
