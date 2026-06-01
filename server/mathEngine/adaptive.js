// Adaptive Difficulty & User Profiling Engine

function calculateDifficultyProfile(elo, options = {}) {
  const eloVal = elo !== undefined ? elo : 1000;

  let diffFactor = 0.5 + (eloVal - 500) / 1000;

  if (options.streak !== undefined && options.streak > 0) {
    diffFactor += Math.min(0.3, options.streak * 0.05);
  }

  if (options.accuracy !== undefined && options.accuracy < 0.6) {
    diffFactor -= 0.15;
  }

  diffFactor = Math.min(2.5, Math.max(0.6, diffFactor));

  let tier = "Apprentice";
  if (eloVal >= 1700) tier = "Sage";
  else if (eloVal >= 1300) tier = "Scholar";

  return { diffFactor, tier, elo: eloVal };
}

// Learner-model-aware difficulty calibration.
// learnerProfile: row from learner_profiles (mastery_score, confidence_score,
//                 learning_velocity, retention_score, accuracy_rate)
function calculateAdaptiveDifficulty(elo, learnerProfile = {}) {
  let { diffFactor, tier } = calculateDifficultyProfile(elo);

  if (learnerProfile.mastery_score !== undefined) {
    // High mastery → push harder; low mastery → ease off
    diffFactor += (learnerProfile.mastery_score - 0.5) * 0.4;
  }

  if (learnerProfile.confidence_score !== undefined && learnerProfile.confidence_score < 0.3) {
    diffFactor -= 0.2;  // learner is anxious — reduce pressure
  }

  if (learnerProfile.learning_velocity !== undefined && learnerProfile.learning_velocity < -0.05) {
    diffFactor -= 0.15; // regressing — ease off to rebuild momentum
  }

  if (learnerProfile.retention_score !== undefined && learnerProfile.retention_score < 0.7) {
    diffFactor -= 0.1;  // decayed retention — gentle review mode
  }

  if (learnerProfile.hint_usage_rate !== undefined && learnerProfile.hint_usage_rate > 0.5) {
    diffFactor -= 0.1;  // frequent hint usage — reduce cognitive load
  }

  diffFactor = Math.min(2.5, Math.max(0.3, diffFactor));

  // Recalibrate tier based on effective difficulty
  const effectiveElo = elo + (diffFactor - 1) * 200;
  if (effectiveElo >= 1700)      tier = "Sage";
  else if (effectiveElo >= 1300) tier = "Scholar";
  else                           tier = "Apprentice";

  return { diffFactor, tier, elo, learnerAdjusted: true };
}

module.exports = {
  calculateDifficultyProfile,
  calculateAdaptiveDifficulty
};
