// Visualization Benefit Engine
// =============================================================================
// "Only attach a manipulative when it improves learning." This module turns that
// mandate into a transparent score + decision, replacing the old mastery-only,
// context-blind gate (decideComplexity).
//
// It combines four signals:
//   1. concept benefit  — does a visual help THIS idea at all? (from visualMetadata)
//   2. mastery          — high mastery lowers benefit (don't breed dependence on
//                         supports; fade scaffolding as competence grows)
//   3. novelty          — the first exposures benefit most
//   4. context          — lesson (teach: high guidance, always offer the tool),
//                         exercise (optional, minimal guidance),
//                         competitive (no guidance under competition)
//
// Returns { score, attach, scaffold, collapsed, reason }. `scaffold` is one of
// 'guided' | 'explore' | 'ondemand' (the in-canvas guidance level). Pure module.

const { benefitFor } = require('./visualMetadata');

const CONTEXTS = new Set(['lesson', 'exercise', 'competitive']);

function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

// Mastery → scaffold, by context. Lessons keep the tool available longer and with
// more guidance (the learner is being taught); exercises fade it toward
// independence and eventually withhold it from experts.
function scaffoldFor(context, mastery, exposure) {
  if (context === 'lesson') {
    if (mastery < 0.6) return 'guided';
    if (mastery < 0.85) return 'explore';
    return 'ondemand'; // still offered, minimal — lessons never withhold the tool
  }
  // exercise (and any non-lesson, non-competitive default): mirrors the original
  // decideComplexity ladder so existing behavior is preserved exactly.
  if (exposure < 3 || mastery < 0.45) return 'guided';
  if (mastery < 0.75) return 'explore';
  if (mastery < 0.92) return 'ondemand';
  return null; // expert — avoid dependence on visual supports
}

// noveltyFactor: 1.0 for a brand-new concept, easing to a 0.45 floor by ~12 reps.
function noveltyFactor(exposure) {
  return Math.max(0.45, 1 - num(exposure, 0) / 12);
}

// masteryFactor: a visual is most valuable while the idea is still forming.
function masteryFactor(mastery) {
  return 1 - 0.55 * Math.max(0, Math.min(1, num(mastery, 0)));
}

function contextFactor(context) {
  if (context === 'lesson') return 1.15;
  if (context === 'competitive') return 0;
  return 1.0;
}

// Score a visual's benefit and decide whether/how to attach it.
//   conceptId      : knowledge-graph concept id (may be null/unknown)
//   context        : 'lesson' | 'exercise' | 'competitive'  (default 'exercise')
//   learnerProfile : { mastery_score, exposure_count } | null
//   exposure       : optional override for exposure count
//   hasModelHint   : optional bool, true if a pattern-matched model is available
//                    even when conceptId is unknown (lets unrecognized concepts
//                    still earn a visual via the legacy try-all path)
function scoreVisualBenefit(opts) {
  const o = opts || {};
  const context = CONTEXTS.has(o.context) ? o.context : 'exercise';
  const profile = o.learnerProfile || null;
  const mastery = profile ? num(profile.mastery_score, 0) : 0;
  const exposure = num(o.exposure, profile ? num(profile.exposure_count, 0) : 0);

  // Competition is unguided by design.
  if (context === 'competitive') {
    return { score: 0, attach: false, scaffold: null, collapsed: false, reason: 'competitive_no_guidance' };
  }

  // Concept benefit. null => unrecognized concept: fall back to "maybe beneficial"
  // so pattern-matched models on unknown concepts still attach (legacy behavior).
  const base = benefitFor(o.conceptId);
  const known = base !== null;
  if (known && base <= 0 && !o.hasModelHint) {
    return { score: 0, attach: false, scaffold: null, collapsed: false, reason: 'concept_has_no_visual_model' };
  }
  const effectiveBase = base === null ? 0.7 : base; // unknown → neutral-positive

  const score = Math.round(
    1000 * effectiveBase * noveltyFactor(exposure) * masteryFactor(mastery) * contextFactor(context)
  ) / 1000;

  const scaffold = scaffoldFor(context, mastery, exposure);
  if (!scaffold) {
    return { score, attach: false, scaffold: null, collapsed: false, reason: 'mastered_no_dependence' };
  }

  return {
    score,
    attach: true,
    scaffold,
    collapsed: scaffold === 'ondemand',
    reason: context === 'lesson' ? 'lesson_teach' : 'exercise_support'
  };
}

module.exports = { scoreVisualBenefit, scaffoldFor, noveltyFactor };
