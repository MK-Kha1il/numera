// Unit tests for the pure progression/ranking helpers (lib/progression.js).
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('../lib/progression');

test('calculateRank maps levels to tier + division', () => {
  assert.strictEqual(P.calculateRank(1), 'Bronze III');
  assert.strictEqual(P.calculateRank(4), 'Bronze II');
  assert.strictEqual(P.calculateRank(7), 'Bronze I');
  assert.strictEqual(P.calculateRank(10), 'Silver III'); // level 10 starts the 2nd tier (tierSize 9)
});

test('calculateRankFromElo: placement under 5 games, then tiers', () => {
  assert.strictEqual(P.calculateRankFromElo(1500, 0), 'Unranked (Placement: 0/5)');
  assert.strictEqual(P.calculateRankFromElo(1500, 3), 'Unranked (Placement: 3/5)');
  assert.strictEqual(P.calculateRankFromElo(1050, 10), 'Bronze III');
  assert.strictEqual(P.calculateRankFromElo(1750, 10), 'Gold II');
  assert.strictEqual(P.calculateRankFromElo(3000, 10), 'Grandmaster');
});

test('getRankValue is monotonic across tiers', () => {
  assert.strictEqual(P.getRankValue(null), 0);
  assert.strictEqual(P.getRankValue('Unranked (Placement: 2/5)'), 0);
  assert.ok(P.getRankValue('Gold I') > P.getRankValue('Gold III'));
  assert.ok(P.getRankValue('Diamond III') > P.getRankValue('Gold I'));
});

test('normalizeLevelForGenerator passes milestones through and bands by category', () => {
  assert.strictEqual(P.normalizeLevelForGenerator('arithmetic', 0), 1); // invalid -> 1
  assert.strictEqual(P.normalizeLevelForGenerator('calculus', 10), 10); // milestone passthrough
  assert.strictEqual(P.normalizeLevelForGenerator('algebra', 1), 11); // algebra band base
  assert.strictEqual(P.normalizeLevelForGenerator('calculus', 1), 31); // calculus band base
});
