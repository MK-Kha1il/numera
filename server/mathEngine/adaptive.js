// Adaptive Difficulty & User Profiling Engine

function calculateDifficultyProfile(elo, options = {}) {
  const eloVal = elo !== undefined ? elo : 1000;
  
  // Base difficulty factor derived from Elo
  let diffFactor = 0.5 + (eloVal - 500) / 1000;
  
  // Personalization adjustments
  if (options.streak !== undefined && options.streak > 0) {
    // Elevate difficulty slightly for players on winning streaks
    const streakBonus = Math.min(0.3, options.streak * 0.05);
    diffFactor += streakBonus;
  }
  
  if (options.accuracy !== undefined && options.accuracy < 0.6) {
    // Dampen difficulty if player's current session accuracy is low
    diffFactor -= 0.15;
  }

  // Constrain difficulty factor bounds to keep exercises reasonable
  diffFactor = Math.min(2.5, Math.max(0.6, diffFactor));

  // Determine complexity tier
  let tier = "Apprentice";
  if (eloVal >= 1700) {
    tier = "Sage";
  } else if (eloVal >= 1300) {
    tier = "Scholar";
  }

  return {
    diffFactor,
    tier,
    elo: eloVal
  };
}

module.exports = {
  calculateDifficultyProfile
};
