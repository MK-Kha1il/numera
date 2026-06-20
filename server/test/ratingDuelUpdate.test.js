// Pure unit tests for the rating-unification keystone: applyDuelOutcomeToRating +
// winProbability (mathEngine/ratingEngine.js). A ranked duel is evidence about the same
// latent skill as a solo session, so it updates the SAME (mu, sigma) belief via an
// outcome-vs-expected (head-to-head) update. See docs/specs/Spec-RatingUnification.md.
const { test } = require('node:test');
const assert = require('node:assert');
const NRS = require('../mathEngine/ratingEngine');

const row = (mu, sigma, sessions = 10) => ({
  mu,
  sigma,
  sessions_count: sessions,
  last_updated: Math.floor(Date.now() / 1000), // recent → no inactivity boost
});

test('winProbability: equal ratings → ~50%, and is symmetric', () => {
  const p = NRS.winProbability(1500, 200, 1500, 200);
  assert.ok(Math.abs(p - 0.5) < 1e-9, `expected ~0.5, got ${p}`);
  const a = NRS.winProbability(1700, 200, 1500, 200);
  const b = NRS.winProbability(1500, 200, 1700, 200);
  assert.ok(Math.abs(a + b - 1) < 1e-9, 'P(A>B) + P(B>A) must equal 1');
  assert.ok(a > 0.5, 'the higher-rated player is favoured');
});

test('beating an equal opponent raises mu; losing lowers it (symmetric)', () => {
  const win = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 1, opponentMu: 1500, opponentSigma: 200 });
  const loss = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 0, opponentMu: 1500, opponentSigma: 200 });
  assert.ok(win.delta > 0, 'a win against an even opponent is a gain');
  assert.ok(loss.delta < 0, 'a loss against an even opponent is a drop');
  assert.ok(Math.abs(win.delta + loss.delta) < 1e-6, 'even-opponent win/loss deltas are symmetric');
});

test('a draw against an even opponent is ~neutral', () => {
  const draw = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 0.5, opponentMu: 1500, opponentSigma: 200 });
  assert.ok(Math.abs(draw.delta) < 1e-6, `draw delta should be ~0, got ${draw.delta}`);
});

test('upset is rewarded: beating a much stronger opponent gains more than beating an equal one', () => {
  const evenWin = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 1, opponentMu: 1500, opponentSigma: 200 });
  const upsetWin = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 1, opponentMu: 2000, opponentSigma: 200 });
  assert.ok(upsetWin.delta > evenWin.delta, 'beating a favourite should gain more rating');
});

test('losing to a much weaker opponent is punished harder than losing to an equal one', () => {
  const evenLoss = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 0, opponentMu: 1500, opponentSigma: 200 });
  const badLoss = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 0, opponentMu: 1000, opponentSigma: 200 });
  assert.ok(badLoss.delta < evenLoss.delta, 'losing to a weaker player should cost more');
});

test('higher uncertainty (sigma) → larger swing for the same result (within the K band)', () => {
  // σ chosen so 2.5σ stays inside [K_MIN, K_MAX]=[8,120] — above ~48 the K-factor caps and the
  // swings converge (that cap is intended: a single result can never move a rating more than K_MAX).
  const confident = NRS.applyDuelOutcomeToRating(row(1500, 20), { outcome: 1, opponentMu: 1500, opponentSigma: 20 });
  const uncertain = NRS.applyDuelOutcomeToRating(row(1500, 45), { outcome: 1, opponentMu: 1500, opponentSigma: 45 });
  assert.ok(Math.abs(uncertain.delta) > Math.abs(confident.delta), 'a less-certain rating moves faster');
});

test('sigma shrinks and sessionsCount increments after a duel', () => {
  const r = NRS.applyDuelOutcomeToRating(row(1500, 200, 7), { outcome: 1, opponentMu: 1500, opponentSigma: 200 });
  assert.ok(r.sigma < 200, 'uncertainty decreases as we learn more');
  assert.equal(r.sessionsCount, 8, 'a duel counts as one more rated encounter');
});

test('returns the applySessionToRating shape so the shared persistence path is reusable', () => {
  const r = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 1, opponentMu: 1400, opponentSigma: 180 });
  for (const k of ['mu', 'sigma', 'displayRating', 'delta', 'performanceScore', 'expectedPerformance', 'components', 'sessionsCount']) {
    assert.ok(k in r, `result must carry "${k}" for persistRatingUpdate`);
  }
  assert.equal(r.performanceScore, 1, 'performanceScore mirrors the realised outcome');
  assert.ok(r.expectedPerformance > 0 && r.expectedPerformance < 1, 'expected is a probability');
  assert.equal(r.displayRating, Math.max(0, Math.floor(r.mu - 2 * r.sigma)), 'display is the conservative bound');
});

test('missing opponent rating falls back to defaults (no NaN)', () => {
  const r = NRS.applyDuelOutcomeToRating(row(1500, 200), { outcome: 1 });
  assert.ok(Number.isFinite(r.mu) && Number.isFinite(r.delta), 'no opponent → safe defaults, finite result');
});

// ─── rankProgress (divisions / pips) ───────────────────────────────────────────

test('rankProgress: unranked tracks placement progress', () => {
  const p = NRS.rankProgress(0, 3);
  assert.equal(p.placement, true);
  assert.equal(p.progress, 0.6, '3/5 sessions');
  assert.equal(p.sessionsToPlacement, 2);
  assert.equal(p.nextRank, null);
});

test('rankProgress: mid-division reports progress + points to the next division', () => {
  // Gold I is [1150, 1250); at 1200 you are halfway, 50 points from Platinum III.
  const p = NRS.rankProgress(1200, 20);
  assert.equal(p.rank, 'Gold I');
  assert.equal(p.nextRank, 'Platinum III');
  assert.equal(p.pointsToNext, 50);
  assert.ok(Math.abs(p.progress - 0.5) < 1e-9, 'halfway through the division');
});

test('rankProgress: division floor is 0% and just-below-ceiling is ~100%', () => {
  assert.ok(NRS.rankProgress(1150, 20).progress < 0.01, 'at the Gold I floor → ~0%');
  assert.ok(NRS.rankProgress(1249, 20).progress > 0.98, 'just under Platinum III → ~100%');
});

test('rankProgress: Grandmaster is the top — full bar, no next rank', () => {
  const p = NRS.rankProgress(2200, 30);
  assert.equal(p.rank, 'Grandmaster');
  assert.equal(p.progress, 1);
  assert.equal(p.nextRank, null);
  assert.equal(p.pointsToNext, null);
});

test('rankProgress stays consistent with displayRatingToRank across the ladder', () => {
  for (const r of [0, 449, 450, 700, 1199, 1850, 1999, 2000, 2500]) {
    assert.equal(NRS.rankProgress(r, 20).rank, NRS.displayRatingToRank(r, 20), `mismatch at ${r}`);
  }
});

// ─── computePerformanceScore weighting (understanding > speed, audit #28) ───────

test('accuracy dominates speed: a careful accurate solver outranks a fast guesser', () => {
  const careful = NRS.computePerformanceScore({ solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 0, comboBonus: 0, level: 10 });
  const fastGuesser = NRS.computePerformanceScore({ solvedCount: 3, totalProblems: 5, errorsCount: 2, speedBonus: 20, comboBonus: 0, level: 10 });
  assert.ok(careful.performanceScore > fastGuesser.performanceScore, 'slow-but-right beats fast-but-wrong');
});

test('weights are accuracy 0.65 / speed 0.10', () => {
  const c = NRS.computePerformanceScore({ solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 20, comboBonus: 0, level: 15 });
  assert.ok(Math.abs(c.components.accuracy - 0.65) < 1e-9, 'full accuracy → 0.65 component');
  assert.ok(Math.abs(c.components.speed - 0.10) < 1e-9, 'max speed → 0.10 component');
});
