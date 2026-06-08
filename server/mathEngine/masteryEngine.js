// Mastery Engine — multi-dimensional mastery model.
//
// "Mastery" is not one number. A learner who is accurate but slow, fast but reliant on hints,
// strong today but forgetting next week, or fluent at drills but unable to apply the idea in a
// new context are all very different situations that a single scalar hides. This module
// decomposes a learner_profiles row into NAMED, interpretable dimensions (each 0..1), a blended
// overall score, a stage label, the weakest dimension, and a concrete focus recommendation.
//
// Pure & deterministic (no DB / IO) — unit-tested in test/mastery.test.js. The raw metrics it
// reads are persisted by learnerModel; dimensions are computed on read.
//
// TRANSFER (Sprint 4): the fifth dimension — applying a concept in a novel framing — is only
// EARNED out-of-context (transfer_exposure/transfer_success), and only counts toward the overall
// score once the learner has actually attempted a transfer problem. A learner is never penalised
// for a dimension they've had no chance to try.

const clamp01 = (x) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

// The mastery dimensions, with learner-facing copy. Order is the display order.
const MASTERY_DIMENSIONS = [
  { key: 'accuracy',     label: 'Accuracy',     blurb: 'Getting the right answer' },
  { key: 'fluency',      label: 'Fluency',      blurb: 'Solving quickly and automatically' },
  { key: 'retention',    label: 'Retention',    blurb: 'Remembering it over time' },
  { key: 'independence', label: 'Independence', blurb: 'Solving it unaided, first try' },
  { key: 'transfer',     label: 'Transfer',     blurb: 'Applying it in a new context' },
];

// Blend weights. Without any transfer attempts we use the original 4-way split (transfer
// excluded — no retroactive penalty). Once transfer is active it joins the blend and the others
// make room for it.
const BASE_WEIGHTS = { accuracy: 0.40, fluency: 0.20, retention: 0.20, independence: 0.20 };
const TRANSFER_WEIGHTS = { accuracy: 0.30, fluency: 0.175, retention: 0.175, independence: 0.175, transfer: 0.175 };

// A dimension at/above this is solid; below it is "weak" and eligible for focus.
const WEAK_THRESHOLD = 0.6;

// Concrete next-step focus for each dimension's weakness — the "what do I do about it" copy.
const DIMENSION_FOCUS = {
  accuracy: {
    action: 'review_concept',
    message: 'Revisit the concept itself — accuracy is the foundation everything else builds on.',
  },
  fluency: {
    action: 'timed_practice',
    message: 'You understand it — now build speed. Try timed drills to make it automatic.',
  },
  retention: {
    action: 'spaced_review',
    message: 'It is fading between sessions. Come back to this after a short break to lock it in.',
  },
  independence: {
    action: 'unaided_practice',
    message: 'Try a few without hints or the calculator to turn understanding into confidence.',
  },
  transfer: {
    action: 'transfer_challenge',
    message: 'You can solve the standard form — now prove you understand it by applying it in a new, unfamiliar context.',
  },
};

// Has the learner actually attempted this concept out-of-context yet?
function hasTransferData(profile) {
  return (profile && profile.transfer_exposure > 0) || false;
}

// A concept only counts as "learned" (and therefore reviewable) once accuracy is established —
// below this it's still in the learning phase, which is "keep going", not "review".
const REVIEW_MIN_ACCURACY = 0.6;

// Does this concept need a spaced review? True only when the learner GENUINELY LEARNED it
// (accuracy established) but the memory is now FADING (retention dimension decayed below the weak
// threshold). This is the mastery-decay signal surfaced across the whole skill tree, so a learner
// sees *what to revisit*, not just what they've mastered. Brand-new or never-learned-yet concepts
// are deliberately excluded — those are "keep learning", a different prompt. Pure (no DB/IO).
function needsRetentionReview(profile) {
  const p = profile || {};
  if (!(p.exposure_count > 0)) return false; // never started
  if (clamp01(p.accuracy_rate) < REVIEW_MIN_ACCURACY) return false; // not learned yet
  return clamp01(p.retention_score) < WEAK_THRESHOLD; // it's fading
}

// Decompose a learner_profiles row into the five mastery dimensions (each 0..1).
function computeDimensions(profile = {}) {
  const p = profile || {};

  // Accuracy — share of correct answers.
  const accuracy = clamp01(p.accuracy_rate);

  // Fluency — speed + automaticity. 30s+ per problem reads as "not yet fluent"; leaning on the
  // calculator discounts it (the procedure isn't internalised yet).
  const speedScore = p.avg_response_ms > 0 ? clamp01(1 - p.avg_response_ms / 30000) : 0;
  const fluency = clamp01(speedScore * (1 - 0.25 * clamp01(p.calculator_usage_rate)));

  // Retention — durability of the memory (spaced-repetition signal).
  const retention = clamp01(p.retention_score);

  // Independence — can they do it unaided, first try? First-try success rate, tempered by hint
  // usage. Zero until there's exposure, so a never-attempted concept doesn't read as "independent".
  const independence = p.exposure_count > 0
    ? clamp01(0.7 * clamp01(p.correct_first_try / p.exposure_count) + 0.3 * (1 - clamp01(p.hint_usage_rate)))
    : 0;

  // Transfer — success applying the concept in a novel framing. Earned only out-of-context; zero
  // until at least one transfer problem has been attempted.
  const transfer = p.transfer_exposure > 0
    ? clamp01(p.transfer_success / p.transfer_exposure)
    : 0;

  return { accuracy, fluency, retention, independence, transfer };
}

// Weighted blend of the dimensions → the single overall mastery score. Transfer joins the blend
// only when active (otherwise the original 4-way weighting is used, so existing scores are stable).
function computeOverall(dimensions, transferActive = false) {
  const d = dimensions || {};
  const w = transferActive ? TRANSFER_WEIGHTS : BASE_WEIGHTS;
  let sum = 0;
  for (const key of Object.keys(w)) sum += (d[key] || 0) * w[key];
  return clamp01(sum);
}

// Coarse learner-facing stage label for an overall score.
function masteryStage(overall) {
  if (overall < 0.4) return 'Novice';
  if (overall < 0.6) return 'Developing';
  if (overall < 0.8) return 'Proficient';
  return 'Mastered';
}

// The single weakest dimension worth targeting, or null when everything is already solid. Transfer
// is only a candidate once it's active (otherwise it would always read 0 and nag learners who
// haven't unlocked it — that case is surfaced separately as `transferReady`).
function weakestDimension(dimensions, transferActive = false) {
  const d = dimensions || {};
  let weakest = null;
  let lowest = Infinity;
  for (const { key } of MASTERY_DIMENSIONS) {
    if (key === 'transfer' && !transferActive) continue;
    const v = d[key] || 0;
    if (v < lowest) { lowest = v; weakest = key; }
  }
  return lowest < WEAK_THRESHOLD ? weakest : null;
}

// Is the learner ready to be offered a transfer challenge? They've drilled the concept (accurate +
// fairly independent) but haven't yet proven they can apply it in a new context.
function isTransferReady(profile, dimensions) {
  if (hasTransferData(profile)) return false;
  const d = dimensions || {};
  return d.accuracy >= 0.7 && d.independence >= 0.6;
}

// Full mastery picture for a single profile.
function computeMasteryProfile(profile) {
  const dimensions = computeDimensions(profile);
  const transferActive = hasTransferData(profile);
  const overall = computeOverall(dimensions, transferActive);
  const weakest = weakestDimension(dimensions, transferActive);
  const transferReady = isTransferReady(profile, dimensions);
  return {
    dimensions,
    overall,
    stage: masteryStage(overall),
    weakest,
    focus: weakest ? { dimension: weakest, ...DIMENSION_FOCUS[weakest] } : null,
    transferActive,
    transferReady,
  };
}

// Aggregate dimensions across many concept profiles into one learner-wide vector, weighted by
// exposure so a single noisy first attempt doesn't dominate. Returns null when there's no data.
function aggregateDimensions(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) return null;
  const totals = { accuracy: 0, fluency: 0, retention: 0, independence: 0, transfer: 0 };
  let weightSum = 0;
  let anyTransfer = false;
  for (const profile of profiles) {
    const w = Math.max(1, profile.exposure_count || 1);
    const d = computeDimensions(profile);
    for (const { key } of MASTERY_DIMENSIONS) totals[key] += d[key] * w;
    weightSum += w;
    if (hasTransferData(profile)) anyTransfer = true;
  }
  if (weightSum === 0) return null;
  const dimensions = {};
  for (const { key } of MASTERY_DIMENSIONS) dimensions[key] = clamp01(totals[key] / weightSum);
  const overall = computeOverall(dimensions, anyTransfer);
  return {
    dimensions,
    overall,
    stage: masteryStage(overall),
    weakest: weakestDimension(dimensions, anyTransfer),
    transferActive: anyTransfer,
    conceptCount: profiles.length,
  };
}

module.exports = {
  MASTERY_DIMENSIONS,
  BASE_WEIGHTS,
  TRANSFER_WEIGHTS,
  WEAK_THRESHOLD,
  REVIEW_MIN_ACCURACY,
  DIMENSION_FOCUS,
  hasTransferData,
  needsRetentionReview,
  computeDimensions,
  computeOverall,
  masteryStage,
  weakestDimension,
  isTransferReady,
  computeMasteryProfile,
  aggregateDimensions,
};
