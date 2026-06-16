// Analytics Engine — self-improving lesson quality scoring and system recommendations
// Tracks completion/abandonment, error patterns, difficulty spikes, ineffective explanations

// Record a lesson interaction event (called on every problem answer or abandonment).
//
// Single atomic UPSERT: a fresh template_type is seeded by the INSERT; an existing one folds the
// event into the running EWMA in the ON CONFLICT branch. Doing it in one statement (rather than a
// get-then-insert/update) is what makes it race-safe — concurrent calls for the same template_type
// (e.g. several bot-duel answers feeding the engine in parallel) can no longer both find no row and
// both INSERT, which used to fail the second with a UNIQUE-constraint error and drop the increment.
//
// The ON CONFLICT expressions reference the table's columns (pre-update values) and `excluded.*`
// (the values this event proposed in VALUES), reproducing exactly the old JS EWMA/confusion math:
//   n              = attempt_count + 1
//   alpha          = 1/n
//   avg_time_ms   += alpha * (timeTaken      - avg_time_ms)
//   hint_rate     += alpha * (usedHint?1:0   - hint_rate)
//   confusion      = 0.4 * newHintRate + 0.6 * (newAbandonCount / n)
function recordLessonEvent(db, templateType, event) {
  // event: { correct, timeTaken, usedHint, abandoned }
  return new Promise((resolve, reject) => {
    const now = Date.now();
    db.run(
      `INSERT INTO lesson_analytics
         (template_type, attempt_count, success_count, abandon_count,
          avg_time_ms, hint_rate, confusion_score, last_updated)
       VALUES (?,1,?,?,?,?,?,?)
       ON CONFLICT(template_type) DO UPDATE SET
         attempt_count  = attempt_count + 1,
         success_count  = success_count + excluded.success_count,
         abandon_count  = abandon_count + excluded.abandon_count,
         avg_time_ms    = avg_time_ms + (1.0 / (attempt_count + 1)) * (excluded.avg_time_ms - avg_time_ms),
         hint_rate      = hint_rate   + (1.0 / (attempt_count + 1)) * (excluded.hint_rate   - hint_rate),
         confusion_score =
             0.4 * (hint_rate + (1.0 / (attempt_count + 1)) * (excluded.hint_rate - hint_rate))
           + 0.6 * ((abandon_count + excluded.abandon_count) * 1.0 / (attempt_count + 1)),
         last_updated   = excluded.last_updated`,
      [
        templateType,
        event.correct ? 1 : 0,
        event.abandoned ? 1 : 0,
        event.timeTaken || 0,
        event.usedHint ? 1 : 0,
        event.abandoned ? 1 : (event.usedHint ? 0.5 : 0),
        now
      ],
      (e) => e ? reject(e) : resolve()
    );
  });
}

// Health score 0-1 for a template type (higher = healthier lesson)
function getLessonHealth(db, templateType) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM lesson_analytics WHERE template_type=?`,
      [templateType],
      (err, row) => {
        if (err) return reject(err);
        if (!row || row.attempt_count < 5) return resolve({ score: null, reason: 'insufficient_data' });
        const successRate  = row.success_count / row.attempt_count;
        const abandonRate  = row.abandon_count / row.attempt_count;
        const health       = successRate * 0.5 + (1 - row.hint_rate) * 0.25 + (1 - abandonRate) * 0.25;
        resolve({
          score:       Math.max(0, Math.min(1, health)),
          successRate, abandonRate,
          hintRate:    row.hint_rate,
          avgTimeMs:   row.avg_time_ms,
          confusion:   row.confusion_score,
          attempts:    row.attempt_count
        });
      }
    );
  });
}

// System-level recommendations: identify worst-performing lessons
function getSystemRecommendations(db) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM lesson_analytics WHERE attempt_count >= 10 ORDER BY confusion_score DESC LIMIT 20`,
      [],
      (err, rows) => {
        if (err) return reject(err);
        const recommendations = (rows || []).map(r => {
          const successRate = r.success_count / r.attempt_count;
          const abandonRate = r.abandon_count / r.attempt_count;
          const issues = [];
          if (successRate < 0.5)    issues.push('low_success_rate');
          if (r.hint_rate > 0.4)    issues.push('high_hint_usage');
          if (abandonRate > 0.2)    issues.push('high_abandonment');
          if (r.avg_time_ms > 45000) issues.push('slow_completion');
          return {
            templateType: r.template_type,
            healthScore: Math.max(0, successRate * 0.5 + (1 - r.hint_rate) * 0.25 + (1 - abandonRate) * 0.25),
            issues,
            stats: { successRate, abandonRate, hintRate: r.hint_rate, attempts: r.attempt_count }
          };
        }).filter(r => r.issues.length > 0);
        resolve(recommendations);
      }
    );
  });
}

// Detect where a specific user is experiencing a difficulty spike
// (sudden accuracy drop across consecutive problems on a concept)
function detectDifficultySpikes(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT lp.concept_id, lp.accuracy_rate, lp.learning_velocity, lp.exposure_count,
              lp.retry_rate, lp.hint_usage_rate
       FROM learner_profiles lp
       WHERE lp.user_id=? AND lp.exposure_count >= 3
         AND (lp.learning_velocity < -0.1 OR lp.accuracy_rate < 0.4)
       ORDER BY lp.learning_velocity ASC LIMIT 10`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        const spikes = (rows || []).map(r => ({
          conceptId:       r.concept_id,
          accuracyRate:    r.accuracy_rate,
          learningVelocity: r.learning_velocity,
          severity:        r.learning_velocity < -0.2 ? 'high' : 'medium',
          signals:         {
            retryRate:   r.retry_rate,
            hintRate:    r.hint_usage_rate,
            exposures:   r.exposure_count
          }
        }));
        resolve(spikes);
      }
    );
  });
}

// Aggregate user-level session summary (for a recent window)
function getUserSessionSummary(db, userId, windowMs = 7 * 86400000) {
  const since = Date.now() - windowMs;
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM learner_profiles WHERE user_id=? AND last_seen >= ?`,
      [userId, since],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve(null);
        const avgMastery    = rows.reduce((s, r) => s + r.mastery_score, 0) / rows.length;
        const avgAccuracy   = rows.reduce((s, r) => s + r.accuracy_rate, 0) / rows.length;
        const avgVelocity   = rows.reduce((s, r) => s + r.learning_velocity, 0) / rows.length;
        const weakCount     = rows.filter(r => r.mastery_score < 0.5).length;
        const strongCount   = rows.filter(r => r.mastery_score >= 0.8).length;
        resolve({ avgMastery, avgAccuracy, avgVelocity, weakCount, strongCount, conceptCount: rows.length });
      }
    );
  });
}

module.exports = {
  recordLessonEvent,
  getLessonHealth,
  getSystemRecommendations,
  detectDifficultySpikes,
  getUserSessionSummary
};
