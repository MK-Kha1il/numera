// Learner Model — per-concept cognitive profile for each user
// Tracks mastery, confidence, speed, retention, accuracy, hint/calc usage, retries

const { computeDimensions, computeOverall, hasTransferData } = require('./masteryEngine');

// Returns or initialises a per-concept profile row
function getProfile(db, userId, conceptId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM learner_profiles WHERE user_id = ? AND concept_id = ?`,
      [userId, conceptId],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);
        const now = Date.now();
        db.run(
          `INSERT OR IGNORE INTO learner_profiles
           (user_id, concept_id, mastery_score, confidence_score, avg_response_ms,
            retention_score, accuracy_rate, hint_usage_rate, calculator_usage_rate,
            retry_rate, exposure_count, correct_first_try, learning_velocity, last_seen)
           VALUES (?,?,0,0.5,0,1,0,0,0,0,0,0,0,?)`,
          [userId, conceptId, now],
          function (e2) {
            if (e2) return reject(e2);
            resolve({
              user_id: userId, concept_id: conceptId,
              mastery_score: 0, confidence_score: 0.5,
              avg_response_ms: 0, retention_score: 1,
              accuracy_rate: 0, hint_usage_rate: 0,
              calculator_usage_rate: 0, retry_rate: 0,
              exposure_count: 0, correct_first_try: 0,
              learning_velocity: 0, last_seen: now,
              transfer_exposure: 0, transfer_success: 0
            });
          }
        );
      }
    );
  });
}

// Recompute the scalar mastery_score from the named mastery dimensions (masteryEngine is the
// single source of truth for both the dimensions and how they blend into the overall score).
function computeMastery(profile) {
  return computeOverall(computeDimensions(profile), hasTransferData(profile));
}

// Called after every answer event
async function updateProfile(db, userId, conceptId, event) {
  // event: { correct, responseMs, usedHint, usedCalculator, wasRetry, retentionScore? }
  const profile = await getProfile(db, userId, conceptId);

  const n = profile.exposure_count + 1;
  const alpha = 1 / n;  // exponential moving average weight for early samples

  const newAccuracy = profile.accuracy_rate + alpha * ((event.correct ? 1 : 0) - profile.accuracy_rate);
  const newResponseMs = profile.avg_response_ms > 0
    ? profile.avg_response_ms + alpha * (event.responseMs - profile.avg_response_ms)
    : event.responseMs;
  const newHintRate = profile.hint_usage_rate + alpha * ((event.usedHint ? 1 : 0) - profile.hint_usage_rate);
  const newCalcRate = profile.calculator_usage_rate + alpha * ((event.usedCalculator ? 1 : 0) - profile.calculator_usage_rate);
  const newRetryRate = profile.retry_rate + alpha * ((event.wasRetry ? 1 : 0) - profile.retry_rate);
  const newRetention = event.retentionScore !== undefined ? event.retentionScore : profile.retention_score;
  const newFirstTry = profile.correct_first_try + (event.correct && !event.wasRetry ? 1 : 0);

  // Learning velocity: change in accuracy per exposure (positive = improving)
  const newVelocity = newAccuracy - profile.accuracy_rate;

  const updatedProfile = {
    ...profile,
    accuracy_rate: newAccuracy,
    avg_response_ms: newResponseMs,
    hint_usage_rate: newHintRate,
    calculator_usage_rate: newCalcRate,
    retry_rate: newRetryRate,
    retention_score: newRetention,
    correct_first_try: newFirstTry,
    learning_velocity: newVelocity,
    exposure_count: n,
    last_seen: Date.now()
  };

  updatedProfile.mastery_score = computeMastery(updatedProfile);

  // Confidence: rises with correct first-tries, falls with retries/hints
  let confidence = profile.confidence_score;
  if (event.correct && !event.wasRetry && !event.usedHint) confidence = Math.min(1, confidence + 0.05);
  else if (!event.correct) confidence = Math.max(0, confidence - 0.08);
  else if (event.usedHint) confidence = Math.max(0, confidence - 0.03);
  updatedProfile.confidence_score = confidence;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO learner_profiles
         (user_id, concept_id, mastery_score, confidence_score, avg_response_ms,
          retention_score, accuracy_rate, hint_usage_rate, calculator_usage_rate,
          retry_rate, exposure_count, correct_first_try, learning_velocity, last_seen)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id, concept_id) DO UPDATE SET
         mastery_score        = excluded.mastery_score,
         confidence_score     = excluded.confidence_score,
         avg_response_ms      = excluded.avg_response_ms,
         retention_score      = excluded.retention_score,
         accuracy_rate        = excluded.accuracy_rate,
         hint_usage_rate      = excluded.hint_usage_rate,
         calculator_usage_rate= excluded.calculator_usage_rate,
         retry_rate           = excluded.retry_rate,
         exposure_count       = excluded.exposure_count,
         correct_first_try    = excluded.correct_first_try,
         learning_velocity    = excluded.learning_velocity,
         last_seen            = excluded.last_seen`,
      [userId, conceptId,
       updatedProfile.mastery_score, updatedProfile.confidence_score,
       updatedProfile.avg_response_ms, updatedProfile.retention_score,
       updatedProfile.accuracy_rate, updatedProfile.hint_usage_rate,
       updatedProfile.calculator_usage_rate, updatedProfile.retry_rate,
       updatedProfile.exposure_count, updatedProfile.correct_first_try,
       updatedProfile.learning_velocity, updatedProfile.last_seen],
      (err) => err ? reject(err) : resolve(updatedProfile)
    );
  });
}

// Record the outcome of an out-of-context (transfer) attempt for a concept. Kept separate from
// updateProfile because transfer success is earned differently — it feeds the `transfer` mastery
// dimension and must not be conflated with ordinary in-context drill accuracy. Also recomputes
// mastery_score, since transfer now joins the blend once there is transfer data.
async function recordTransferAttempt(db, userId, conceptId, correct) {
  const profile = await getProfile(db, userId, conceptId);
  const updated = {
    ...profile,
    transfer_exposure: (profile.transfer_exposure || 0) + 1,
    transfer_success: (profile.transfer_success || 0) + (correct ? 1 : 0),
    last_seen: Date.now(),
  };
  updated.mastery_score = computeMastery(updated);

  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE learner_profiles
         SET transfer_exposure = ?, transfer_success = ?, mastery_score = ?, last_seen = ?
       WHERE user_id = ? AND concept_id = ?`,
      [updated.transfer_exposure, updated.transfer_success, updated.mastery_score, updated.last_seen, userId, conceptId],
      (err) => (err ? reject(err) : resolve(updated))
    );
  });
}

// Full snapshot across all concepts for a user
function getLearnerSnapshot(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM learner_profiles WHERE user_id = ? ORDER BY mastery_score DESC`,
      [userId],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Concepts where mastery < threshold (default 0.6) — needs work
function getWeakConcepts(db, userId, threshold = 0.6) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM learner_profiles
       WHERE user_id = ? AND mastery_score < ? AND exposure_count > 0
       ORDER BY mastery_score ASC`,
      [userId, threshold],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Concepts where mastery >= threshold — ready to advance
function getStrongConcepts(db, userId, threshold = 0.8) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM learner_profiles
       WHERE user_id = ? AND mastery_score >= ?
       ORDER BY mastery_score DESC`,
      [userId, threshold],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Concepts with falling learning velocity (user is plateauing or regressing)
function getStagnantConcepts(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM learner_profiles
       WHERE user_id = ? AND learning_velocity <= 0 AND exposure_count >= 3
       ORDER BY learning_velocity ASC`,
      [userId],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

module.exports = {
  getProfile,
  updateProfile,
  recordTransferAttempt,
  getLearnerSnapshot,
  getWeakConcepts,
  getStrongConcepts,
  getStagnantConcepts,
  computeMastery
};
