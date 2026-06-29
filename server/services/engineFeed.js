// engineFeed — the single "a learner answered a problem" recorder for the learning-intelligence
// engine, shared across every mode (solo telemetry, puzzle rush, bot duels). Before this existed,
// the whole engine (concept analytics, spaced retention, the learner/mastery model, teaching-style
// inference, and misconception tracking) was fed ONLY by solo play; competitive modes graded
// server-side but told the engine nothing. Routing every graded answer through here means mastery,
// retention, and Growth Insights learn from all of a learner's play, not a fraction of it.
//
// Fire-and-forget by contract: callers never await it on the request path, and it swallows its own
// errors — a hiccup recording analytics must never fail a duel result or a puzzle-rush submit.
const RetentionEngine = require('../mathEngine/retentionEngine');
const LearnerModel = require('../mathEngine/learnerModel');
const AnalyticsEngine = require('../mathEngine/analyticsEngine');
const TeachingEngine = require('../mathEngine/teachingEngine');
const MisconceptionEngine = require('../mathEngine/misconceptionEngine');
const Orchestrator = require('../mathEngine/problemOrchestrator');
const logger = require('../logger');

// Per-concept analytics moving average (the same EWMA the legacy telemetry endpoint used). Keyed
// by the template/concept string so it lines up with how problems are generated and read back.
function updateConceptAnalytics(db, userId, conceptKey, { correct, speedSec, hesitation }) {
  return new Promise((resolve) => {
    const isCorrect = correct ? 1 : 0;
    const now = Math.floor(Date.now() / 1000);
    db.get('SELECT * FROM user_concept_analytics WHERE user_id = ? AND concept = ?', [userId, conceptKey], (err, row) => {
      if (err) return resolve();
      if (row) {
        const newSuccess = row.success_rate * 0.7 + isCorrect * 0.3;
        const newSpeed = row.average_speed * 0.7 + speedSec * 0.3;
        const newHes = row.hesitation_index * 0.7 + hesitation * 0.3;
        const newStreak = isCorrect ? row.streak + 1 : 0;
        db.run(
          `UPDATE user_concept_analytics SET success_rate = ?, average_speed = ?, hesitation_index = ?, streak = ?, last_tested = ?
             WHERE user_id = ? AND concept = ?`,
          [newSuccess, newSpeed, newHes, newStreak, now, userId, conceptKey],
          () => resolve()
        );
      } else {
        db.run(
          `INSERT INTO user_concept_analytics (user_id, concept, success_rate, average_speed, hesitation_index, streak, last_tested)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, conceptKey, isCorrect, speedSec, hesitation, isCorrect ? 1 : 0, now],
          () => resolve()
        );
      }
    });
  });
}

// Record one graded answer into every per-user engine surface. `conceptKey` is the generator's
// template/concept string for the problem; `templateType` (defaults to conceptKey) feeds the
// system-level lesson analytics. Pass correctAnswer + wrongAnswer to enable misconception tracking.
async function feedEngineOutcome(db, userId, conceptKey, opts = {}) {
  const {
    correct,
    correctAnswer = null,
    wrongAnswer = null,
    speedSec = 0,
    hesitation = 0,
    retries = 0,
    usedCalculator = false,
    templateType = conceptKey,
    params = {},
    misconceptionTags = null,
  } = opts;
  try {
    if (!conceptKey) return;
    const isCorrect = !!correct;

    await updateConceptAnalytics(db, userId, conceptKey, { correct: isCorrect, speedSec, hesitation });

    const conceptId = Orchestrator.conceptFromType(conceptKey) || conceptKey;
    const responseMs = speedSec > 0 ? speedSec * 1000 : 0;
    const wasRetry = retries > 0;
    const inferredHint = hesitation > 2.0;

    const retentionScore = await RetentionEngine.getRetentionForProfile(db, userId, conceptId);
    const rating = isCorrect ? (speedSec > 0 && speedSec < 8 ? 4 : 3) : 1;
    await RetentionEngine.recordReview(db, userId, conceptId, rating);

    await LearnerModel.updateProfile(db, userId, conceptId, {
      correct: isCorrect,
      responseMs,
      usedHint: inferredHint,
      usedCalculator,
      wasRetry,
      retentionScore,
    });

    if (templateType) {
      await AnalyticsEngine.recordLessonEvent(db, templateType, {
        correct: isCorrect,
        timeTaken: responseMs,
        usedHint: inferredHint,
        abandoned: false,
      });
    }

    const signals = TeachingEngine.inferSignalFromResult({ correct: isCorrect, responseMs, usedHint: inferredHint, wasRetry }, conceptId);
    for (const signal of signals) {
      await TeachingEngine.recordStyleSignal(db, userId, signal.style, signal.outcome);
    }

    // Misconception tracking — classify a wrong answer into a named error pattern and persist it;
    // resolve known ones on a correct answer. Powers the learner-facing Growth Insights.
    if (!isCorrect && wrongAnswer != null && correctAnswer != null) {
      // Merge any echoed misconception tags into the params bag so the classifier's tagged-distractor
      // path can diagnose non-numeric answers (fractions, coordinates, inequalities, …).
      const classifyParams = misconceptionTags ? { ...(params || {}), misc: misconceptionTags } : (params || {});
      const m = MisconceptionEngine.classifyMisconception(conceptId, correctAnswer, wrongAnswer, classifyParams);
      if (m.id !== 'unclassified') {
        await MisconceptionEngine.recordMisconception(db, userId, conceptId, m.id, m.label);
      }
    } else if (isCorrect) {
      const active = await MisconceptionEngine.getConceptMisconceptions(db, userId, conceptId);
      for (const mm of active) {
        await MisconceptionEngine.resolveMisconception(db, userId, conceptId, mm.misconception_type);
      }
    }
  } catch (e) {
    logger.error('[engineFeed]', e.message);
  }
}

module.exports = { feedEngineOutcome };
