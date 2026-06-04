// Misconception-Targeted Remediation Engine (Phase 13)
// ------------------------------------------------------------------------------------
// The misconception engine classifies *why* an answer was wrong and the orchestrator
// already routes a critical misconception to the top of the queue (priority 1). But until
// now the problem it served was just an ordinary problem of that concept — nothing actually
// confronted the specific error. This module makes remediation targeted:
//
//   1. It reconstructs the exact wrong answer the learner's error would produce for THIS
//      problem (the "tempting answer"), using the concept-specific rule from the knowledge
//      graph or a global structural predictor.
//   2. It guarantees that tempting answer is one of the multiple-choice options, so the
//      learner must consciously reject their own mistake instead of never meeting it.
//   3. It attaches a focused remediation note + a preventive "watch for" coaching line, and
//      prepends a remediation rung to the hint ladder.
//
// No remediation artifact reveals the correct answer (the tempting answer is a *wrong*
// option; the coaching is about the error, not the solution).

const { concepts } = require('./knowledgeGraph');

// Global structural predictors: given the correct answer, what would this error produce?
// Only those computable from the answer alone live here; others (order-of-operations,
// fraction-addition) need context we don't reconstruct and simply yield no tempting answer.
const GLOBAL_PREDICTORS = {
  sign_error: (c) => (c !== 0 ? -c : null),
  forgot_negative: (c) => (c < 0 ? -c : null),
  off_by_one: (c) => c + 1,
};

// Reconstruct the wrong answer this misconception would yield for the given problem.
// Returns a number, or null if it can't be computed (e.g. params not available).
function predictedWrongAnswer(misconceptionType, conceptId, correctAnswer, problem) {
  const c = parseFloat(correctAnswer);
  if (Number.isNaN(c)) return null;

  // 1. Concept-specific rule from the knowledge graph. Many rules need only the answer
  //    (e.g. sign_flip_roots: -ans); those that need params gracefully yield NaN -> skip.
  const concept = concepts[conceptId];
  if (concept && Array.isArray(concept.misconceptions)) {
    const m = concept.misconceptions.find((x) => x.id === misconceptionType);
    if (m) {
      try {
        const w = m.rule(c, problem || {});
        if (typeof w === 'number' && Number.isFinite(w) && w !== c) return w;
      } catch (_) { /* missing params — fall through */ }
    }
  }

  // 2. Global predictor.
  const g = GLOBAL_PREDICTORS[misconceptionType];
  if (g) {
    const w = g(c);
    if (typeof w === 'number' && Number.isFinite(w) && w !== c) return w;
  }
  return null;
}

// Normalize the misconception object (orchestrator passes a DB row; tests may pass {id,label}).
function readMisconception(m) {
  return {
    type: m.misconception_type || m.type || 'unclassified',
    label: m.misconception_label || m.label || 'a recurring error',
    severity: m.severity || null,
    frequency: m.frequency || null,
    conceptId: m.concept_id || m.conceptId || null,
  };
}

// Apply targeted remediation to a problem in place. Safe to call on any problem shape.
function applyRemediation(problem, misconception) {
  if (!problem || !misconception) return problem;
  const mc = readMisconception(misconception);
  const conceptId = problem.conceptId || mc.conceptId;
  const correct = problem.correctAnswer != null ? problem.correctAnswer
    : problem.correct_answer != null ? problem.correct_answer : problem.answer;

  // Ensure the learner's own error appears as a distractor they must reject.
  let temptingStr = null;
  const tempting = predictedWrongAnswer(mc.type, conceptId, correct, problem);
  if (tempting != null && Array.isArray(problem.options)) {
    temptingStr = tempting.toString();
    const correctStr = String(correct);
    if (!problem.options.includes(temptingStr) && temptingStr !== correctStr) {
      const idx = problem.options.findIndex((o) => String(o) !== correctStr);
      if (idx !== -1) problem.options[idx] = temptingStr;
    } else if (!problem.options.includes(temptingStr)) {
      temptingStr = null; // equals the correct answer — don't surface
    }
  }

  const watchFor = `Slow down at the one step where "${mc.label}" usually sneaks in — that's exactly what this problem is checking.`;
  problem.remediation = {
    misconceptionType: mc.type,
    label: mc.label,
    severity: mc.severity,
    frequency: mc.frequency,
    temptingAnswer: temptingStr,
    focus: `🎯 Targeted practice for a slip you've made before: "${mc.label}". One of the wrong options is the answer that mistake produces — make sure you don't pick it.`,
    watchFor,
  };

  // Prepend a remediation rung so the very first hint addresses the error pattern.
  if (Array.isArray(problem.hintLadder)) {
    problem.hintLadder = [{ level: 'remediation', label: 'Focus', text: watchFor }, ...problem.hintLadder]
      .map((r, i) => ({ ...r, stage: i + 1 }));
  }

  return problem;
}

module.exports = { predictedWrongAnswer, applyRemediation };
