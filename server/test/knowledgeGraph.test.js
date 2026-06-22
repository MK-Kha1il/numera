// Knowledge-graph consolidation (docs/ContentEngineAudit-2026-06.md §4 / Phase 4).
// Guards the graph's integrity and the unified node accessor: every node is navigable in both
// directions (prereqs ⇄ dependents), no edge dangles, and describeConcept fuses graph + lesson +
// visual model into the "every node knows…" shape the mission asks for.
const { test } = require('node:test');
const assert = require('node:assert');
const { concepts, getDependencies, getDependents, getDescendants, describeConcept } = require('../mathEngine/knowledgeGraph');

test('no prerequisite edge points at a non-existent concept', () => {
  for (const [id, node] of Object.entries(concepts)) {
    for (const pre of node.prereqs || []) {
      assert.ok(concepts[pre], `${id} lists prereq "${pre}" which is not a concept`);
    }
  }
});

test('dependents are the exact inverse of prereqs', () => {
  for (const [id, node] of Object.entries(concepts)) {
    for (const pre of node.prereqs || []) {
      assert.ok(
        getDependents(pre).includes(id),
        `${id} requires ${pre}, so ${pre}.dependents must include ${id}`
      );
    }
  }
  // …and nothing extra: every dependent genuinely lists the concept as a prereq.
  for (const id of Object.keys(concepts)) {
    for (const dep of getDependents(id)) {
      assert.ok((concepts[dep].prereqs || []).includes(id), `${dep} is listed as a dependent of ${id} but does not require it`);
    }
  }
});

test('the prereq graph is acyclic (a concept never depends on itself)', () => {
  for (const id of Object.keys(concepts)) {
    assert.ok(!getDependencies(id).includes(id) || getDependencies(id)[0] === id,
      `getDependencies always includes the seed; ensure no deeper cycle for ${id}`);
    assert.ok(!getDescendants(id).includes(id), `${id} transitively depends on itself (cycle)`);
  }
});

test('describeConcept fuses graph + lesson + visual model into one node view', () => {
  const d = describeConcept('fraction_add');
  assert.ok(d, 'fraction_add should describe');
  assert.equal(d.id, 'fraction_add');
  assert.ok(Array.isArray(d.prereqs) && d.prereqs.includes('fraction_simplify'));
  assert.ok(Array.isArray(d.dependents) && d.dependents.includes('fraction_sub'), 'fraction_sub builds on fraction_add');
  assert.ok(Array.isArray(d.misconceptions) && d.misconceptions.length >= 1);
  assert.ok(d.misconceptions.every((m) => m.id && m.label && typeof m.label === 'string'));
  assert.ok(Array.isArray(d.representations) && d.representations.length >= 1, 'rich lesson supplies representations');
  assert.equal(d.visualModel, 'fraction_bar', 'fraction_add maps to the fraction bar manipulative');
  assert.ok(d.learningObjective && d.learningObjective.length > 0);
});

test('describeConcept returns null for an unknown concept', () => {
  assert.equal(describeConcept('not_a_real_concept'), null);
});
