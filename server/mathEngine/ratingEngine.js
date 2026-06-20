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
// Maps a generator/session category to one of the 8 competitive domains. The generator uses ~20
// fine-grained category names (graphing, expressions, equations, factors, …); without this table they
// all fell back to 'arithmetic', silently collapsing the per-domain rating ladders into one (every
// algebra/geometry concept credited arithmetic). The grouping keeps the buckets pedagogically honest:
// symbolic manipulation / equations / functions / coordinate work → algebra; factor/divisor work →
// number_theory; pure number/fraction/decimal work → arithmetic.
const CATEGORY_DOMAIN = {
  // arithmetic & number sense
  arithmetic: 'arithmetic', mental: 'arithmetic', mental_math: 'arithmetic',
  number_sense: 'arithmetic', fractions: 'arithmetic', decimals: 'arithmetic',
  integers: 'arithmetic', rates: 'arithmetic',
  // algebra (symbolic manipulation, equations, functions, coordinate work)
  algebra: 'algebra', expressions: 'algebra', equations: 'algebra', inequalities: 'algebra',
  functions: 'algebra', graphing: 'algebra', sequences: 'algebra', powers: 'algebra',
  // the rest map by name
  geometry: 'geometry', calculus: 'calculus', combinatorics: 'combinatorics',
  number_theory: 'number_theory', factors: 'number_theory',
  statistics: 'statistics', probability: 'probability',
};

function categoryToDomain(category) {
  if (!category) return 'arithmetic';
  const c = category.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_DOMAIN[c] || 'arithmetic'; // safe fallback for any unknown category
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
 * Weights (rebalanced to reward UNDERSTANDING over speed — competitive audit #28: a fast guesser must
 * not outrate a careful solver; the ceiling is unchanged at 0.85, weight just shifted from speed to
 * accuracy):
 *   Accuracy    65%  — primary; correctness is the dominant signal
 *   Speed       10%  — a minor fluency factor; never near accuracy's weight
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

  const accuracyScore = (correct / total) * 0.65;

  const normalizedSpeed  = Math.min((speedBonus || 0) / 20.0, 1.0);
  const speedScore       = normalizedSpeed * 0.10;

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
  const { mu, sessions_count, last_updated } = ratingRow;
  let { sigma } = ratingRow;

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

// ─── Head-to-Head Duel Update ─────────────────────────────────────────────────

/**
 * Applies one head-to-head duel result to a (mu, sigma) rating pair.
 *
 * This is the unification keystone (docs/specs/Spec-RatingUnification.md): a ranked
 * duel is evidence about the SAME latent skill as a solo session, so it updates the
 * SAME (mu, sigma) belief — just scored by OUTCOME-vs-EXPECTED instead of
 * performance-vs-baseline. Solo and duels therefore move ONE number per domain.
 *
 *   outcome   ∈ {1 win, 0.5 draw, 0 loss}
 *   expected  = P(player beats opponent)        [the Gaussian win-prob model below]
 *   K         = clamp(2.5σ, K_MIN, K_MAX)        [same uncertainty-scaled K as sessions]
 *   delta     = K * (outcome − expected)
 *
 * Returns the SAME shape as applySessionToRating so the shared persistence path
 * (rating_history, season peak, users.* mirror sync) treats both kinds of evidence
 * identically. Pure: no DB/IO — callers fetch the two rating rows and persist the result.
 */
function applyDuelOutcomeToRating(ratingRow, { outcome, opponentMu, opponentSigma } = {}) {
  const { mu, sessions_count, last_updated } = ratingRow;
  let { sigma } = ratingRow;

  // Re-widen uncertainty for a returning player before incorporating the result.
  sigma = applyInactivityBoost(sigma, last_updated, sessions_count);

  const oppMu = Number.isFinite(opponentMu) ? opponentMu : MU_INIT;
  const oppSigma = Number.isFinite(opponentSigma) ? opponentSigma : SIGMA_INIT;
  const expected = winProbability(mu, sigma, oppMu, oppSigma);

  const clampedOutcome = Math.max(0, Math.min(Number(outcome), 1));
  const K = Math.max(K_MIN, Math.min(2.5 * sigma, K_MAX));
  const delta = K * (clampedOutcome - expected);

  const newMu = mu + delta;
  const newSigma = updateSigma(sigma);
  const displayRating = Math.max(0, Math.floor(newMu - 2 * newSigma));

  return {
    mu: newMu,
    sigma: newSigma,
    displayRating,
    delta,
    // For the rating_history row: the realised outcome and the win probability we expected.
    performanceScore: clampedOutcome,
    expectedPerformance: expected,
    components: {
      outcome: clampedOutcome,
      winProbability: +expected.toFixed(3),
      opponentMu: +oppMu.toFixed(1),
    },
    sessionsCount: (sessions_count || 0) + 1,
  };
}

// ─── Rank Name from Display Rating ───────────────────────────────────────────

// Single source of truth for the display-rating → division ladder. Each entry is the EXCLUSIVE upper
// bound and the label for ratings below it (and ≥ the previous entry's bound). The last entry
// (Grandmaster) is unbounded. displayRatingToRank AND rankProgress both read this, so the ladder and
// the "pips" progress bar can never drift apart.
const RANK_LADDER = [
  { below: 450, name: 'Bronze III' },
  { below: 550, name: 'Bronze II' },
  { below: 650, name: 'Bronze I' },
  { below: 750, name: 'Silver III' },
  { below: 850, name: 'Silver II' },
  { below: 950, name: 'Silver I' },
  { below: 1050, name: 'Gold III' },
  { below: 1150, name: 'Gold II' },
  { below: 1250, name: 'Gold I' },
  { below: 1350, name: 'Platinum III' },
  { below: 1450, name: 'Platinum II' },
  { below: 1550, name: 'Platinum I' },
  { below: 1650, name: 'Diamond III' },
  { below: 1750, name: 'Diamond II' },
  { below: 1850, name: 'Diamond I' },
  { below: 2000, name: 'Master' },
  { below: Infinity, name: 'Grandmaster' },
];

/**
 * Maps a display rating to a human-readable competitive rank.
 * Requires at least 5 sessions before being assigned a real rank.
 */
function displayRatingToRank(displayRating, sessionsCount) {
  if (sessionsCount < 5) {
    return `Unranked (Placement: ${sessionsCount}/5)`;
  }
  for (const band of RANK_LADDER) {
    if (displayRating < band.below) return band.name;
  }
  return 'Grandmaster';
}

/**
 * Progression detail for the divisions/pips UI (competitive audit Top-25 #7): where the player sits
 * WITHIN their current division and how far to the next one. Pure; derived from RANK_LADDER so it
 * always matches displayRatingToRank.
 *
 * Returns { rank, placement, progress (0..1 through the current division), pointsToNext, nextRank }.
 * For an unranked player, `progress` tracks placement (sessions/5). For Grandmaster (no ceiling),
 * progress is 1 and there is no next rank.
 */
function rankProgress(displayRating, sessionsCount) {
  const sessions = sessionsCount || 0;
  if (sessions < 5) {
    return {
      rank: `Unranked (Placement: ${sessions}/5)`,
      placement: true,
      progress: Math.max(0, Math.min(sessions / 5, 1)),
      pointsToNext: null,
      nextRank: null,
      sessionsToPlacement: 5 - sessions,
    };
  }
  const r = displayRating;
  let floor = 0;
  for (let i = 0; i < RANK_LADDER.length; i++) {
    const band = RANK_LADDER[i];
    if (r < band.below) {
      const isTop = band.below === Infinity;
      const ceil = band.below;
      const width = isTop ? 0 : ceil - floor;
      const next = RANK_LADDER[i + 1];
      return {
        rank: band.name,
        placement: false,
        progress: isTop ? 1 : Math.max(0, Math.min((r - floor) / width, 1)),
        pointsToNext: isTop ? null : Math.max(0, Math.ceil(ceil - r)),
        nextRank: isTop ? null : (next ? next.name : null),
      };
    }
    floor = band.below;
  }
  return { rank: 'Grandmaster', placement: false, progress: 1, pointsToNext: null, nextRank: null };
}

// ─── Rank Tiers (metal only) ──────────────────────────────────────────────────

// The 7 metal tiers, coarser than the 21 divisions. Used by the seasonal Rank Reward track.
const RANK_TIERS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];

/**
 * Maps a rank label (e.g. "Gold II", "Master", "Unranked (…)") to its metal-tier index 0..6, or −1
 * if unranked. Derived from the rank label's first word so the tier ladder can NEVER drift from
 * displayRatingToRank — there is one source of truth for the ladder.
 */
function rankToTierIndex(rankLabel) {
  const metal = String(rankLabel || '').split(' ')[0];
  return RANK_TIERS.indexOf(metal);
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

  const accuracyPct = Math.round((components.accuracy / 0.65) * 100);
  const reasons = [];

  if (accuracyPct >= 85) reasons.push(`high accuracy (${accuracyPct}%)`);
  else if (accuracyPct <= 50) reasons.push(`low accuracy (${accuracyPct}%)`);

  if (components.speed >= 0.08) reasons.push('fast response times');
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
  const winProbA = winProbability(ratingA.mu, ratingA.sigma, ratingB.mu, ratingB.sigma);
  // Quality is maximized when win probability is 50% (perfectly balanced)
  const quality = 1.0 - 4.0 * (winProbA - 0.5) * (winProbA - 0.5);
  return Math.max(0, quality);
}

// σ below which a rating is "established" — above it the player is still in calibration and the
// display rating (μ−2σ) is wide of the true skill. Surfaced as a provisional `?` marker (audit opp #9)
// and used to loosen matchmaking for not-yet-calibrated players. SIGMA_INIT 350 → established ~150.
const SIGMA_ESTABLISHED = 150;

/** A rating is provisional (show `?`, match loosely) while its uncertainty is still high. */
function isProvisional(sigma) {
  return (sigma == null ? SIGMA_INIT : sigma) > SIGMA_ESTABLISHED;
}

/**
 * Hidden-MMR pairing gate (audit Top-25 #11 / opp #7,#8): accept a ranked pairing when the
 * win-probability-based match quality clears a floor that *relaxes with wait time*, so a fair match
 * forms quickly and a looser one still forms eventually (the 10s bot fallback is the final backstop).
 * Pairs on (μ, σ) — the real belief — not a raw rating-point window, so high-σ provisional players,
 * whose win-prob denom is naturally wider, are matched more permissively. Pure + testable.
 */
function matchAcceptable(ratingA, ratingB, waitSeconds) {
  const quality = computeMatchQuality(ratingA, ratingB);
  // Floor starts strict (0.65 ≈ 40/60 win-prob) and relaxes toward 0.2 as the wait grows.
  const floor = Math.max(0.2, 0.65 - 0.04 * Math.max(0, waitSeconds || 0));
  return quality >= floor;
}

/**
 * Probability that player A beats player B under the NRS belief model.
 *   p(A beats B) ≈ Φ((muA − muB) / sqrt(sigmaA² + sigmaB² + β²))
 * β = 150 is the natural per-session performance variance. Shared by match-quality
 * scoring and the head-to-head duel update so both speak the same win-probability language.
 */
function winProbability(muA, sigmaA, muB, sigmaB) {
  const BETA = 150;
  const denom = Math.sqrt(sigmaA * sigmaA + sigmaB * sigmaB + BETA * BETA);
  return normalCDF((muA - muB) / denom);
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
  applyDuelOutcomeToRating,
  winProbability,
  displayRatingToRank,
  rankProgress,
  RANK_TIERS,
  rankToTierIndex,
  buildRatingExplanation,
  evaluateSmurfSignals,
  updateLearningVelocity,
  updateTiltState,
  computeMatchQuality,
  matchAcceptable,
  isProvisional,
  SIGMA_ESTABLISHED,
  applySeasonReset,
  domainInfluenceWeight,
};
