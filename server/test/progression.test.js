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

test('strand categories band into their own template key ranges', () => {
  // Each strand's templates define keys only inside [min, max] (CONCEPT_TO_LEVEL); the band
  // must start there and climb with UI level, never escaping the range.
  assert.strictEqual(P.normalizeLevelForGenerator('fractions', 1), 3);   // band base
  assert.strictEqual(P.normalizeLevelForGenerator('fractions', 13), 5);  // climbs with UI level
  assert.strictEqual(P.normalizeLevelForGenerator('fractions', 59), 11); // capped at band max (now [3,11])
  assert.strictEqual(P.normalizeLevelForGenerator('expressions', 1), 11); // starts at 11, not 1
  assert.strictEqual(P.normalizeLevelForGenerator('expressions', 59), 18); // cap follows the polynomial keys
  assert.strictEqual(P.normalizeLevelForGenerator('geometry', 7), 3);
  assert.strictEqual(P.normalizeLevelForGenerator('number_sense', 1), 6);
  assert.strictEqual(P.normalizeLevelForGenerator('number sense', 1), 6); // space form too
  assert.strictEqual(P.normalizeLevelForGenerator('statistics', 25), 11);
  assert.strictEqual(P.normalizeLevelForGenerator('integers', 59), 11); // cap follows integer_ops
  // Milestones still pass through untouched for strands.
  assert.strictEqual(P.normalizeLevelForGenerator('fractions', 20), 20);
});

test('strand bands never normalize onto a milestone template key', () => {
  // generateProblemInstance force-routes internal level 10 to the arithmetic boss template,
  // so a strand band landing on a multiple of 10 serves the WRONG category (statistics at UI
  // levels 21–24 used to get a pythagorean problem) and miscounts mastery.
  const strands = ['geometry', 'integers', 'decimals', 'fractions', 'number_sense',
    'statistics', 'expressions', 'powers', 'graphing', 'inequalities', 'functions', 'sequences', 'equations', 'rates', 'factors'];
  for (const cat of strands) {
    for (let lvl = 1; lvl <= 60; lvl++) {
      if (lvl % 10 === 0) continue; // real milestones pass through by design
      const n = P.normalizeLevelForGenerator(cat, lvl);
      assert.notStrictEqual(n % 10, 0, `${cat} UI level ${lvl} normalized to milestone key ${n}`);
    }
  }
  // The collision band now lands one key above instead.
  assert.strictEqual(P.normalizeLevelForGenerator('statistics', 21), 11);
});
