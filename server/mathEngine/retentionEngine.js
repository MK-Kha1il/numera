// Retention Engine — Ebbinghaus forgetting curve + FSRS-inspired stability tracking
// Models long-term memory, schedules reviews, detects mastery decay

// FSRS constants (simplified)
const DECAY        = -0.5;        // forgetting curve exponent constant
const FACTOR       = 0.9 ** (1 / DECAY) - 1;  // ≈ 19 — scaling factor
const RETENTION_TARGET = 0.80;   // desired retention at review time (80%)

// Days at which a new concept is scheduled for first review by default
const INITIAL_STABILITY_DAYS = 1;

// Compute retrievability R = (1 + t / (FACTOR * S))^DECAY
// S = stability in days, t = elapsed days since last review
function getRetentionScore(stabilityDays, elapsedDays) {
  if (elapsedDays <= 0) return 1.0;
  const r = Math.pow(1 + elapsedDays / (FACTOR * stabilityDays), DECAY);
  return Math.max(0, Math.min(1, r));
}

// Days until retention would drop to target from now
function daysUntilReview(stabilityDays) {
  // Solve for t: target = (1 + t/(F*S))^D  => t = F*S * (target^(1/D) - 1)
  return FACTOR * stabilityDays * (Math.pow(RETENTION_TARGET, 1 / DECAY) - 1);
}

// New stability after a successful review (higher difficulty → slower forgetting)
// rating: 1=Again, 2=Hard, 3=Good, 4=Easy
function newStability(oldStability, rating, lapses) {
  const STABILITY_MULTIPLIERS = { 1: 0.2, 2: 0.8, 3: 1.4, 4: 2.5 };
  const lapsePenalty = Math.pow(0.85, lapses);
  return Math.max(1, oldStability * (STABILITY_MULTIPLIERS[rating] || 1.4) * lapsePenalty);
}

// Get or initialise a retention schedule row
function getSchedule(db, userId, conceptId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM retention_schedule WHERE user_id=? AND concept_id=?`,
      [userId, conceptId],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);
        const now = Date.now();
        const nextReview = now + INITIAL_STABILITY_DAYS * 86400000;
        db.run(
          `INSERT OR IGNORE INTO retention_schedule
             (user_id, concept_id, stability_days, last_review_ts, next_review_ts,
              review_count, lapse_count, retention_at_review)
           VALUES (?,?,?,?,?,0,0,1.0)`,
          [userId, conceptId, INITIAL_STABILITY_DAYS, now, nextReview],
          function (e) {
            if (e) return reject(e);
            resolve({
              user_id: userId, concept_id: conceptId,
              stability_days: INITIAL_STABILITY_DAYS,
              last_review_ts: now, next_review_ts: nextReview,
              review_count: 0, lapse_count: 0, retention_at_review: 1.0
            });
          }
        );
      }
    );
  });
}

// Called after user answers a review item
// rating: 1 (Again/wrong) | 2 (Hard) | 3 (Good/correct) | 4 (Easy/fast+correct)
async function recordReview(db, userId, conceptId, rating) {
  const schedule = await getSchedule(db, userId, conceptId);
  const now      = Date.now();
  const elapsedDays = (now - schedule.last_review_ts) / 86400000;
  const currentRetention = getRetentionScore(schedule.stability_days, elapsedDays);

  const isLapse     = rating <= 1;
  const newLapses   = schedule.lapse_count + (isLapse ? 1 : 0);
  const newReviews  = schedule.review_count + 1;
  const stability   = newStability(schedule.stability_days, rating, newLapses);
  const daysToNext  = daysUntilReview(stability);
  const nextReview  = now + daysToNext * 86400000;

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO retention_schedule
         (user_id, concept_id, stability_days, last_review_ts, next_review_ts,
          review_count, lapse_count, retention_at_review)
       VALUES (?,?,?,?,?,?,?,?)
       ON CONFLICT(user_id, concept_id) DO UPDATE SET
         stability_days     = excluded.stability_days,
         last_review_ts     = excluded.last_review_ts,
         next_review_ts     = excluded.next_review_ts,
         review_count       = excluded.review_count,
         lapse_count        = excluded.lapse_count,
         retention_at_review= excluded.retention_at_review`,
      [userId, conceptId, stability, now, nextReview,
       newReviews, newLapses, currentRetention],
      (err) => {
        if (err) return reject(err);
        resolve({ stability, nextReview, daysToNext, currentRetention, lapse: isLapse });
      }
    );
  });
}

// Compute live retention score for a user-concept pair right now
async function getLiveRetention(db, userId, conceptId) {
  const schedule = await getSchedule(db, userId, conceptId);
  const elapsedDays = (Date.now() - schedule.last_review_ts) / 86400000;
  return getRetentionScore(schedule.stability_days, elapsedDays);
}

// All concepts due for review (next_review_ts <= now)
function getOverdueReviews(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT rs.*, lp.mastery_score, lp.accuracy_rate
       FROM retention_schedule rs
       LEFT JOIN learner_profiles lp ON lp.user_id=rs.user_id AND lp.concept_id=rs.concept_id
       WHERE rs.user_id=? AND rs.next_review_ts <= ?
       ORDER BY rs.next_review_ts ASC`,
      [userId, Date.now()],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Concepts where computed live retention has dropped below threshold
async function getDecayingConcepts(db, userId, threshold = 0.75) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM retention_schedule WHERE user_id=?`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        const now = Date.now();
        const decaying = (rows || []).filter(r => {
          const elapsed = (now - r.last_review_ts) / 86400000;
          return getRetentionScore(r.stability_days, elapsed) < threshold;
        });
        resolve(decaying);
      }
    );
  });
}

// Return the retention score to attach to a learner profile update
async function getRetentionForProfile(db, userId, conceptId) {
  try {
    return await getLiveRetention(db, userId, conceptId);
  } catch (_) {
    return 1.0;
  }
}

module.exports = {
  getRetentionScore,
  daysUntilReview,
  getSchedule,
  recordReview,
  getLiveRetention,
  getOverdueReviews,
  getDecayingConcepts,
  getRetentionForProfile,
  RETENTION_TARGET
};
