// Unit tests for lib/arenaDifficulty — the level-aware arena difficulty helpers.
const test = require('node:test');
const assert = require('node:assert');
const {
  categoryForLevel,
  clampLevel,
  rushLevel,
  personalLadder,
  MAX_LEVEL,
  MAX_RUSH_BASE,
} = require('../lib/arenaDifficulty');

test('categoryForLevel follows the generator bands', () => {
  assert.equal(categoryForLevel(1), 'arithmetic');
  assert.equal(categoryForLevel(10), 'arithmetic');
  assert.equal(categoryForLevel(11), 'algebra');
  assert.equal(categoryForLevel(17), 'algebra');
  assert.equal(categoryForLevel(18), 'combinatorics');
  assert.equal(categoryForLevel(31), 'calculus');
  assert.equal(categoryForLevel(41), 'number_theory');
});

test('clampLevel bounds and sanitizes', () => {
  assert.equal(clampLevel(0), 1);
  assert.equal(clampLevel(-5), 1);
  assert.equal(clampLevel(25), 25);
  assert.equal(clampLevel(999), MAX_LEVEL);
  assert.equal(clampLevel(undefined), 1);
  assert.equal(clampLevel('not a number'), 1);
});

test('rushLevel starts at the player level and climbs one per point', () => {
  assert.equal(rushLevel(12, 0), 12);
  assert.equal(rushLevel(12, 5), 17);
  // a brand-new player still starts at the bottom
  assert.equal(rushLevel(1, 0), 1);
  // never exceeds the generator ceiling
  assert.equal(rushLevel(45, 30), MAX_LEVEL);
  // the starting rung is capped so max-level players still have a climb
  assert.equal(rushLevel(49, 0), MAX_RUSH_BASE);
});

test('personalLadder centres on the player and ramps', () => {
  const ladder = personalLadder(12, 5);
  assert.equal(ladder.length, 5);
  const levels = ladder.map(([, l]) => l);
  assert.deepEqual(levels, [10, 12, 14, 16, 18]);
  // every entry carries the band category for its level
  for (const [cat, l] of ladder) assert.equal(cat, categoryForLevel(l));
});

test('personalLadder never goes trivial for high levels nor out of range for low ones', () => {
  const low = personalLadder(1, 5).map(([, l]) => l);
  assert.ok(low.every((l) => l >= 1 && l <= MAX_LEVEL));
  assert.equal(low[0], 1);
  const high = personalLadder(48, 5).map(([, l]) => l);
  assert.ok(high.every((l) => l >= 1 && l <= MAX_LEVEL));
  // a level-48 player should see nothing remotely easy
  assert.ok(high.every((l) => l >= 46));
});
