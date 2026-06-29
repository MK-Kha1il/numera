// Pure unit tests for the hidden-MMR matchmaking gate + provisional marker
// (mathEngine/ratingEngine.js: matchAcceptable, isProvisional). The socket matchmaker now pairs on
// the (μ, σ) belief via the win-probability match-quality gate rather than a raw rating-point window.
// See docs/CompetitiveEcosystemAudit.md Top-25 #11 / opp #7–#9.
const { test } = require('node:test');
const assert = require('node:assert');
const NRS = require('../mathEngine/ratingEngine');

test('matchAcceptable: evenly-rated players match immediately', () => {
  const a = { mu: 1500, sigma: 120 };
  const b = { mu: 1520, sigma: 120 };
  assert.ok(NRS.matchAcceptable(a, b, 0), 'near-equal ratings should pair with no wait');
});

test('matchAcceptable: a moderate skill gap is rejected with no wait but accepted after waiting', () => {
  const strong = { mu: 1650, sigma: 100 };
  const weak = { mu: 1400, sigma: 100 };
  assert.ok(!NRS.matchAcceptable(strong, weak, 0), 'a moderate gap should not pair instantly');
  assert.ok(NRS.matchAcceptable(strong, weak, 9), 'the floor relaxes so the match forms before the bot fallback');
});

test('matchAcceptable: an extreme gap never pairs as a human match (routes to the bot fallback)', () => {
  const strong = { mu: 1950, sigma: 100 };
  const weak = { mu: 1050, sigma: 100 };
  // Even at maximum relaxation the floor bottoms out at 0.2, so a near-certain blowout is never an
  // acceptable human pairing — it falls through to the level-matched bot at 10s instead.
  assert.ok(!NRS.matchAcceptable(strong, weak, 60), 'an extreme gap stays unmatched among humans');
});

test('matchAcceptable: the floor is monotonically looser with wait time', () => {
  const a = { mu: 1500, sigma: 100 };
  const b = { mu: 1720, sigma: 100 };
  // If it matches at some wait, it must also match at any longer wait (floor only relaxes).
  const t0 = NRS.matchAcceptable(a, b, 0);
  const t10 = NRS.matchAcceptable(a, b, 10);
  assert.ok(t10 || !t0, 'acceptance can only become more permissive as wait grows');
});

test('matchAcceptable: high-σ (provisional) players pair more permissively than calibrated ones', () => {
  const gapA = { mu: 1700, sigma: 80 };
  const gapB = { mu: 1500, sigma: 80 };
  const provA = { mu: 1700, sigma: 320 };
  const provB = { mu: 1500, sigma: 320 };
  // Same μ gap, but the wider belief makes the outcome less certain → higher match quality.
  assert.ok(
    NRS.computeMatchQuality(provA, provB) > NRS.computeMatchQuality(gapA, gapB),
    'wider uncertainty raises match quality for the same μ gap',
  );
});

test('isProvisional: wide σ is provisional, calibrated σ is not', () => {
  assert.ok(NRS.isProvisional(NRS.SIGMA_INIT), 'a brand-new player is provisional');
  assert.ok(NRS.isProvisional(NRS.SIGMA_ESTABLISHED + 1), 'just above the threshold is provisional');
  assert.ok(!NRS.isProvisional(NRS.SIGMA_ESTABLISHED - 1), 'just below the threshold is established');
  assert.ok(!NRS.isProvisional(60), 'a well-calibrated player is established');
  assert.ok(NRS.isProvisional(null), 'a missing σ defaults to provisional (treat as uncalibrated)');
});
