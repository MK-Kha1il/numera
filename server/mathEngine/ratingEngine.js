/**
 * NumeraRating System (NRS)
 *
 * A Gaussian-belief rating engine built for mathematics skill assessment.
 * Each player carries a (mu, sigma) pair per domain — mu is the skill estimate,
 * sigma is the uncertainty. Display rating = floor(mu - 2*sigma), so a player
 * only "earns" a rating once they've proven it across many sessions, not just got
 * lucky once.
 *
 * Why not Elo:
 *   - Elo treats every win/loss as binary. Math sessions are nuanced: accuracy,
 *     difficulty, speed, and assist usage all carry signal.
 *   - A single K-factor cannot model the wide uncertainty gap between a player's
 *     5th session and 500th session.
 *   - Elo has no concept of domain-specific weakness, learning velocity, or tilt.
 *
 * Core model: Bayesian skill update similar in spirit to TrueSkill, but adapted
 * for solo performance sessions (no head-to-head match required).
 */

'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────

const MU_INIT        = 1500;   // starting skill estimate
const SIGMA_INIT     = 350;    // starting uncertainty (wide for new players)
const SIGMA_MIN      = 50;     // floor — prevents sigma collapsing to 0
const SIGMA_DECAY    = 0.12;   // fraction of variance removed per session
const SIGMA_NOISE    = 20;     // system noise injected each session (prevents stagnation)
const K_MIN          = 8;      // minimum rating change per session
const K_MAX          = 120;    // maximum rating change per session
const INACTIVITY_DAYS = 30;    // days before returning-player sigma boost
const SIGMA_RETURN_BOOST = 60; // sigma increase after long inactivity
const SMURF_EXCESS_THRESHOLD = 0.28; // avg(actual−expected) to flag for review
const SMURF_SESSIONS_NEEDED  = 5;   // consecutive sessions above threshold
const VELOCITY_ALPHA = 0.30;   // EMA alpha for learning velocity
const TILT_LOSS_THRESHOLD    = 0.45; // performance below this counts as a "tilt loss"
const GLOBAL_DOMAIN_WEIGHT   = 0.50; // fraction of domain delta applied to global

// ─── Domain Mapping ───────────────────────────────────────────────────────────

const KNOWN_DOMAINS = [
  'global', 'arithmetic', 'algebra', 'geometry',
  'calculus', 'combinatorics', 'number_theory', 'statistics', 'probability',
];

/**
 * Maps a category string from the game to a canonical domain name.
 * Returns 'arithmetic' as the safe fallback.
 */
function categoryToDomain(category) {
  if (!category) return 'arithmetic';
  const c = category.toLowerCase().replace(/\s+/g, '_');
  if (c === 'arithmetic' || c === 'mental' || c === 'mental_math') return 'arithmetic';
  if (c === 'algebra')       return 'algebra';
  if (c === 'geometry')      return 'geometry';
  if (c === 'calculus')      return 'calculus';
  if (c === 'combinatorics') return 'combinatorics';
  if (c === 'number_theory' || c === 'number theory') return 'number_theory';
  if (c === 'statistics')    return 'statistics';
  if (c === 'probability')   return 'probability';
  return 'arithmetic'; // safe fallback
}

// ─── Difficulty Scaling ───────────────────────────────────────────────────────

/**
 * Maps a problem level to a difficulty multiplier.
 * Higher levels amplify both gains and losses — expert-level accuracy signals more.
 */
function levelToDifficultyMultiplier(level) {
  const l = Math.max(1, parseInt(level, 10) || 1);
  if (l <= 10)  return 0.80;
  if (l <= 20)  return 1.00;
  if (l <= 35)  return 1.25;
  if (l <= 50)  return 1.55;
  return 1.85; // level 50+
}

/**
 * Expected performance for an average player (mu=1500) at a given level.
 * Used as the baseline in the performance delta calculation.
 */
function levelToExpectedBaseline(level) {
  const l = Math.max(1, parseInt(level, 10) || 1);
  if (l <= 10)  return 0.82;
  if (l <= 20)  return 0.72;
  if (l <= 35)  return 0.60;
  if (l <= 50)  return 0.50;
  return 0.40;
}

// ─── Performance Score ────────────────────────────────────────────────────────

/**
 * Converts a session's raw metrics into a single performance score [0, 1].
 *
 * Weights:
 *   Accuracy    55%  — primary; correctness is the main signal
 *   Speed       20%  — meaningful but bounded; never outweighs accuracy
 *   Combo       10%  — rewarded for clean perfect runs
 *   Errors      −5%  per error, up to −15%
 *   Calculator  −10% (ranked sessions only; tool assistance reduces signal strength)
 *
 * The score is then amplified by a difficulty multiplier so that high-level
 * performance carries more rating signal than easy-level performance.
 */
function computePerformanceScore({
  solvedCount,
  totalProblems,
  errorsCount,
  speedBonus,       // seconds remaining, 0-20
  comboBonus,       // 15 if perfect combo, 0 otherwise
  level,
  usedCalculator,   // boolean
  gameMode,
}) {
  const total = Math.max(1, totalProblems || solvedCount || 1);
  const correct = Math.max(0, Math.min(solvedCount || 0, total));
  const errors  = Math.max(0, errorsCount || 0);

  const accuracyScore = (correct / total) * 0.55;

  const normalizedSpeed  = Math.min((speedBonus || 0) / 20.0, 1.0);
  const speedScore       = normalizedSpeed * 0.20;

  const comboScore = (comboBonus > 0) ? 0.10 : 0;

  const errorPenalty    = Math.min(errors * 0.05, 0.15);
  const calcPenalty     = (usedCalculator && gameMode !== 'practice') ? 0.10 : 0;
  const totalPenalty    = errorPenalty + calcPenalty;

  const rawScore = Math.max(0, Math.min(
    accuracyScore + speedScore + comboScore - totalPenalty,
    1.0
  ));

  // Amplify by difficulty: harder levels make the score matter more
  const diffMultiplier = levelToDifficultyMultiplier(level);
  // We scale around 0.5 so that difficulty amplifies deviation from average.
  // A score of 0.5 stays 0.5 regardless of difficulty; above/below it diverges.
  const amplified = 0.5 + (rawScore - 0.5) * diffMultiplier;

  return {
    performanceScore: Math.max(0, Math.min(amplified, 1.0)),
    components: {
      accuracy: +(accuracyScore.toFixed(3)),
      speed: +(speedScore.toFixed(3)),
      combo: +(comboScore.toFixed(3)),
      errorPenalty: +(errorPenalty.toFixed(3)),
      calcPenalty: +(calcPenalty.toFixed(3)),
      rawScore: +(rawScore.toFixed(3)),
      diffMultiplier: +(diffMultiplier.toFixed(3)),
    },
  };
}

// ─── Expected Performance ─────────────────────────────────────────────────────

/**
 * Computes what performance score we "expect" this player to achieve.
 *
 * The expected score is the average-player baseline adjusted by how much better
 * or worse this player is than average. A 1500-rated player faces no adjustment;
 * a 2000-rated player is expected to outperform the baseline.
 */
function computeExpectedPerformance(mu, level) {
  const baseline = levelToExpectedBaseline(level);
  // Each 500 rating points above/below 1500 shifts expected by ±0.12
  const ratingAdjustment = ((mu - MU_INIT) / 500) * 0.12;
  return Math.max(0.1, Math.min(baseline + ratingAdjustment, 0.95));
}

// ─── Sigma Dynamics ───────────────────────────────────────────────────────────

/**
 * Updates sigma after one session.
 * Sigma decreases as sessions accumulate (growing certainty), but never
 * collapses completely thanks to injected system noise.
 */
function updateSigma(sigma) {
  const variance = sigma * sigma;
  const decayed  = variance * (1 - SIGMA_DECAY);
  const noisy    = decayed + SIGMA_NOISE * SIGMA_NOISE;
  return Math.max(SIGMA_MIN, Math.sqrt(noisy));
}

/**
 * Applies a temporary sigma boost when a player returns after inactivity.
 * This widens their uncertainty so the system re-calibrates faster.
 */
function applyInactivityBoost(sigma, lastUpdatedTs, sessionsCount) {
  // Brand-new players (0 sessions) don't need a returning-player boost —
  // their sigma is already at SIGMA_INIT which is wide enough.
  if (!lastUpdatedTs || sessionsCount === 0) return sigma;
  const now = Math.floor(Date.now() / 1000);
  const daysSince = (now - lastUpdatedTs) / 86400;
  if (daysSince >= INACTIVITY_DAYS) {
    const boost = Math.min(SIGMA_RETURN_BOOST * (daysSince / INACTIVITY_DAYS), SIGMA_RETURN_BOOST * 2);
    return Math.min(sigma + boost, SIGMA_INIT);
  }
  return sigma;
}

// ─── Core Rating Update ───────────────────────────────────────────────────────

/**
 * Applies one session of evidence to a (mu, sigma) rating pair.
 *
 * Returns the updated pair plus metadata for the history record.
 */
function applySessionToRating(ratingRow, sessionData) {
  let { mu, sigma, sessions_count, last_updated } = ratingRow;

  // Step 1: Apply inactivity boost before update (skip for brand-new accounts)
  sigma = applyInactivityBoost(sigma, last_updated, sessions_count);

  // Step 2: Compute performance and expected
  const { performanceScore, components } = computePerformanceScore(sessionData);
  const expected = computeExpectedPerformance(mu, sessionData.level);

  // Step 3: K-factor proportional to remaining uncertainty
  const K = Math.max(K_MIN, Math.min(2.5 * sigma, K_MAX));

  // Step 4: Delta
  const delta = K * (performanceScore - expected);

  // Step 5: Update mu
  const newMu = mu + delta;

  // Step 6: Shrink sigma (we've learned more about this player)
  const newSigma = updateSigma(sigma);

  // Step 7: Display rating (conservative lower bound, floored at 0)
  const displayRating = Math.max(0, Math.floor(newMu - 2 * newSigma));

  return {
    mu: newMu,
    sigma: newSigma,
    displayRating,
    delta,
    performanceScore,
    expectedPerformance: expected,
    components,
    sessionsCount: (sessions_count || 0) + 1,
  };
}

// ─── Rank Name from Display Rating ───────────────────────────────────────────

/**
 * Maps a display rating to a human-readable competitive rank.
 * Requires at least 5 sessions before being assigned a real rank.
 */
function displayRatingToRank(displayRating, sessionsCount) {
  if (sessionsCount < 5) {
    return `Unranked (Placement: ${sessionsCount}/5)`;
  }
  const r = displayRating;
  if (r < 450)  return 'Bronze III';
  if (r < 550)  return 'Bronze II';
  if (r < 650)  return 'Bronze I';
  if (r < 750)  return 'Silver III';
  if (r < 850)  return 'Silver II';
  if (r < 950)  return 'Silver I';
  if (r < 1050) return 'Gold III';
  if (r < 1150) return 'Gold II';
  if (r < 1250) return 'Gold I';
  if (r < 1350) return 'Platinum III';
  if (r < 1450) return 'Platinum II';
  if (r < 1550) return 'Platinum I';
  if (r < 1650) return 'Diamond III';
  if (r < 1750) return 'Diamond II';
  if (r < 1850) return 'Diamond I';
  if (r < 2000) return 'Master';
  return 'Grandmaster';
}

// ─── Rating Explanation ───────────────────────────────────────────────────────

/**
 * Generates a human-readable explanation of why the rating changed.
 * This is the "transparency" requirement: players must understand their results.
 */
function buildRatingExplanation(domain, sessionData, result) {
  const { delta, performanceScore, expectedPerformance, components } = result;
  const domainLabel = domain === 'global' ? 'Overall' : capitalize(domain.replace('_', ' '));
  const direction = delta >= 0 ? 'increased' : 'decreased';
  const magnitude = Math.abs(Math.round(delta));

  const accuracyPct = Math.round((components.accuracy / 0.55) * 100);
  const reasons = [];

  if (accuracyPct >= 85) reasons.push(`high accuracy (${accuracyPct}%)`);
  else if (accuracyPct <= 50) reasons.push(`low accuracy (${accuracyPct}%)`);

  if (components.speed >= 0.12) reasons.push('fast response times');
  if (components.combo > 0) reasons.push('perfect combo');
  if (components.calcPenalty > 0) reasons.push('calculator used (ranked penalty)');
  if (components.errorPenalty > 0) reasons.push(`${Math.round(components.errorPenalty / 0.05)} error(s)`);

  const reasonStr = reasons.length > 0 ? ` due to ${reasons.join(', ')}` : '';
  const perfVsExpected = performanceScore > expectedPerformance
    ? 'outperformed expectations'
    : 'below expectations';

  return `Your ${domainLabel} Rating ${direction} by ${magnitude} points${reasonStr}. You ${perfVsExpected} for this difficulty level.`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── Smurf Detection ─────────────────────────────────────────────────────────

/**
 * Analyzes a player's recent excess performance to detect potential smurfing.
 * Returns an updated anomaly score and whether to flag the account.
 *
 * Logic: if a player consistently outperforms their expected score by a large
 * margin across multiple early sessions, they are likely under-ranked.
 */
function evaluateSmurfSignals(currentSignals, newExcess, sessionsCount) {
  const { anomaly_score = 0, consecutive_high = 0 } = currentSignals || {};

  const isHighExcess = newExcess > SMURF_EXCESS_THRESHOLD;
  const newConsecutive = isHighExcess ? consecutive_high + 1 : 0;

  // EMA of anomaly score
  const newAnomalyScore = anomaly_score * 0.7 + (isHighExcess ? newExcess : 0) * 0.3;
  const flagged = newConsecutive >= SMURF_SESSIONS_NEEDED && sessionsCount < 30;

  return {
    anomaly_score: newAnomalyScore,
    consecutive_high: newConsecutive,
    flagged,
  };
}

// ─── Learning Velocity ────────────────────────────────────────────────────────

/**
 * Computes an EMA of rating deltas to track improvement speed.
 * Positive velocity = player is rapidly improving.
 * Near-zero velocity = player has reached their current ceiling.
 */
function updateLearningVelocity(currentVelocity, delta) {
  return currentVelocity * (1 - VELOCITY_ALPHA) + delta * VELOCITY_ALPHA;
}

// ─── Anti-Tilt Detection ──────────────────────────────────────────────────────

/**
 * Tracks frustration/fatigue signals across recent sessions.
 * Returns a tilt score [0..1] and a description.
 *
 * The tilt score is used to widen matchmaking tolerance (give the player a
 * better-matched opponent) but never to manipulate game outcomes.
 */
function updateTiltState(currentTilt, performanceScore, sessionData) {
  const { loss_streak = 0, tilt_score = 0 } = currentTilt || {};

  const isLoss = performanceScore < TILT_LOSS_THRESHOLD;
  const newStreak = isLoss ? loss_streak + 1 : 0;

  let newTilt = tilt_score;
  if (newStreak >= 3) newTilt = Math.min(newTilt + 0.25, 1.0);
  else if (!isLoss)  newTilt = Math.max(newTilt - 0.15, 0.0);

  // Speed decay signal: if session was very fast and inaccurate, fatigue likely
  const fastAndWrong = (sessionData.speedBonus > 10) && (performanceScore < 0.45);
  if (fastAndWrong) newTilt = Math.min(newTilt + 0.10, 1.0);

  return {
    loss_streak: newStreak,
    tilt_score: newTilt,
    tilted: newTilt >= 0.5,
  };
}

// ─── Matchmaking Score ────────────────────────────────────────────────────────

/**
 * Computes how well two players are matched for a ranked duel.
 * Returns a value in [0, 1]: 1 = perfect match, 0 = terrible mismatch.
 *
 * Uses a modified Win-Probability model:
 *   p(A beats B) ≈ Φ((mu_A - mu_B) / sqrt(sigma_A² + sigma_B² + β²))
 *
 * β = 150 represents "natural performance variance" per session.
 * Match quality is highest when win probability is close to 50%.
 */
function computeMatchQuality(ratingA, ratingB) {
  const BETA = 150;
  const { mu: muA, sigma: sigmaA } = ratingA;
  const { mu: muB, sigma: sigmaB } = ratingB;

  const denom = Math.sqrt(sigmaA * sigmaA + sigmaB * sigmaB + BETA * BETA);
  const z = (muA - muB) / denom;
  const winProbA = normalCDF(z);

  // Quality is maximized when win probability is 50% (perfectly balanced)
  const quality = 1.0 - 4.0 * (winProbA - 0.5) * (winProbA - 0.5);
  return Math.max(0, quality);
}

/**
 * Standard normal cumulative distribution function (approximation).
 * Used for match quality calculation.
 */
function normalCDF(z) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ─── Season Soft Reset ────────────────────────────────────────────────────────

/**
 * Applies an end-of-season soft reset to a rating.
 *
 * Rating is compressed toward the center (1500), preserving ~70% of
 * earned skill. Sigma is increased to allow faster re-calibration.
 * This keeps experienced players near their true level while giving
 * everyone a chance to re-earn their rank each season.
 */
function applySeasonReset(mu, sigma) {
  const newMu    = mu * 0.70 + MU_INIT * 0.30;
  const newSigma = Math.min(sigma * 1.60, SIGMA_INIT);
  return { mu: newMu, sigma: newSigma };
}

// ─── Domain Impact Weights ────────────────────────────────────────────────────

/**
 * Returns how much a domain session should influence the global rating.
 * Domains the player is weak in (low sessions_count or low relative mu)
 * get a slightly higher weight so skill holes are addressed faster.
 */
function domainInfluenceWeight(domainRating, globalRating) {
  const domainSessions = domainRating.sessions_count || 0;
  const globalMu = globalRating.mu || MU_INIT;
  const domainMu = domainRating.mu || MU_INIT;

  // Weak domain (less visited or lower rating than global) gets more weight
  const sessionsPenalty = domainSessions < 10 ? 1.2 : 1.0;
  const weaknessBonus   = domainMu < globalMu - 100 ? 1.15 : 1.0;

  return Math.min(GLOBAL_DOMAIN_WEIGHT * sessionsPenalty * weaknessBonus, 0.80);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  MU_INIT,
  SIGMA_INIT,
  KNOWN_DOMAINS,
  categoryToDomain,
  computePerformanceScore,
  computeExpectedPerformance,
  applySessionToRating,
  displayRatingToRank,
  buildRatingExplanation,
  evaluateSmurfSignals,
  updateLearningVelocity,
  updateTiltState,
  computeMatchQuality,
  applySeasonReset,
  domainInfluenceWeight,
};
