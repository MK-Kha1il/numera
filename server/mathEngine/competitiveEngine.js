// Competitive Engine — per-topic skill ratings for skill-based matchmaking
// Replaces simple XP/ELO matching with a multi-dimensional math profile

const K_FACTOR = 32;  // ELO K-factor for competitive updates

// Compute expected score in a head-to-head match given ratings
function expectedScore(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// New ELO after a match
function newElo(currentElo, actualScore, opponentElo) {
  const expected = expectedScore(currentElo, opponentElo);
  return Math.round(currentElo + K_FACTOR * (actualScore - expected));
}

// Get or create competitive profile for a user-concept pair
function getConceptRating(db, userId, conceptId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM competitive_profiles WHERE user_id=? AND concept_id=?`,
      [userId, conceptId],
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);
        db.run(
          `INSERT OR IGNORE INTO competitive_profiles
             (user_id, concept_id, skill_rating, consistency_rating,
              learning_velocity_rating, match_count, last_match_ts)
           VALUES (?,?,1000,1000,1000,0,?)`,
          [userId, conceptId, Date.now()],
          function (e) {
            e ? reject(e) : resolve({
              user_id: userId, concept_id: conceptId,
              skill_rating: 1000, consistency_rating: 1000,
              learning_velocity_rating: 1000, match_count: 0
            });
          }
        );
      }
    );
  });
}

// Update competitive profile after a match
// outcome: 1 = win, 0.5 = draw, 0 = loss
async function updateCompetitiveRating(db, userId, conceptId, outcome, opponentRating = 1000) {
  const profile = await getConceptRating(db, userId, conceptId);
  const updatedSkill = newElo(profile.skill_rating, outcome, opponentRating);

  // Consistency: penalised for losses (negative outcome), rewarded for wins
  const consistencyDelta = outcome > 0.5 ? 8 : -12;
  const updatedConsistency = Math.max(0, Math.min(3000, profile.consistency_rating + consistencyDelta));

  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO competitive_profiles
         (user_id, concept_id, skill_rating, consistency_rating, learning_velocity_rating,
          match_count, last_match_ts)
       VALUES (?,?,?,?,?,1,?)
       ON CONFLICT(user_id, concept_id) DO UPDATE SET
         skill_rating              = excluded.skill_rating,
         consistency_rating        = excluded.consistency_rating,
         match_count               = match_count + 1,
         last_match_ts             = excluded.last_match_ts`,
      [userId, conceptId, updatedSkill, updatedConsistency,
       profile.learning_velocity_rating, Date.now()],
      (err) => err ? reject(err) : resolve({ updatedSkill, updatedConsistency })
    );
  });
}

// Get full competitive profile for a user (all concepts)
function getCompetitiveProfile(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT cp.*, lp.mastery_score, lp.accuracy_rate
       FROM competitive_profiles cp
       LEFT JOIN learner_profiles lp ON lp.user_id=cp.user_id AND lp.concept_id=cp.concept_id
       WHERE cp.user_id=?
       ORDER BY cp.skill_rating DESC`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) return resolve({ concepts: [], overallRating: 1000, tier: 'Unranked' });

        const overallRating = Math.round(
          rows.reduce((s, r) => s + r.skill_rating, 0) / rows.length
        );
        const tier = ratingToTier(overallRating);
        resolve({ concepts: rows, overallRating, tier });
      }
    );
  });
}

function ratingToTier(rating) {
  if (rating >= 2000) return 'Grandmaster';
  if (rating >= 1700) return 'Master';
  if (rating >= 1500) return 'Diamond';
  if (rating >= 1300) return 'Platinum';
  if (rating >= 1100) return 'Gold';
  if (rating >= 900)  return 'Silver';
  return 'Bronze';
}

// Find a well-matched opponent — returns the userId closest in overall rating
function findMatch(db, userId, userOverallRating) {
  return new Promise((resolve, reject) => {
    // Compute average skill rating per user, find closest
    db.all(
      `SELECT user_id, AVG(skill_rating) as avg_rating
       FROM competitive_profiles
       WHERE user_id != ?
       GROUP BY user_id
       ORDER BY ABS(AVG(skill_rating) - ?) ASC
       LIMIT 5`,
      [userId, userOverallRating],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      }
    );
  });
}

module.exports = {
  getConceptRating,
  updateCompetitiveRating,
  getCompetitiveProfile,
  findMatch,
  ratingToTier,
  newElo
};
