// Recomputes a user's progress against every achievement in the catalog and writes it to
// user_achievements (without ever un-completing or un-claiming a row), emitting a
// notification the first time one is completed. Called from every reward path.
const { db } = require('../db');
const { notify } = require('./notificationService');

function updateAchievements(userId, callback) {
  db.get('SELECT * FROM users WHERE id = ?', [userId], (errUser, user) => {
    if (errUser || !user) return callback && callback();

    db.get('SELECT * FROM user_mastery WHERE user_id = ?', [userId], (errMastery, mastery) => {
      const masteryArithmetic = mastery ? mastery.arithmetic_correct || 0 : 0;
      const masteryMental = mastery ? mastery.mental_correct || 0 : 0;
      const masteryAlgebra = mastery ? mastery.algebra_correct || 0 : 0;
      const masteryCalculus = mastery ? mastery.calculus_correct || 0 : 0;
      const masteryCombinatorics = mastery ? mastery.combinatorics_correct || 0 : 0;
      const masteryNumberTheory = mastery ? mastery.number_theory_correct || 0 : 0;
      // Curriculum-strand counters (migration v27).
      const masteryGeometry = mastery ? mastery.geometry_correct || 0 : 0;
      const masteryIntegers = mastery ? mastery.integers_correct || 0 : 0;
      const masteryDecimals = mastery ? mastery.decimals_correct || 0 : 0;
      const masteryFractions = mastery ? mastery.fractions_correct || 0 : 0;
      const masteryNumberSense = mastery ? mastery.number_sense_correct || 0 : 0;
      const masteryStatistics = mastery ? mastery.statistics_correct || 0 : 0;
      const masteryExpressions = mastery ? mastery.expressions_correct || 0 : 0;
      const masteryPowers = mastery ? mastery.powers_correct || 0 : 0;

      db.get(
        "SELECT COUNT(*) AS count FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'",
        [userId, userId],
        (errFriends, rowFriends) => {
          const friendsCount = rowFriends ? rowFriends.count : 0;

          db.get('SELECT COUNT(*) AS count FROM user_inventory WHERE user_id = ?', [userId], (errInv, rowInv) => {
            const shopCount = rowInv ? rowInv.count : 0;

            db.all('SELECT * FROM achievements', (errAchs, achs) => {
              if (errAchs || !achs) return callback && callback();

              let processedCount = 0;
              if (achs.length === 0) return callback && callback();

              achs.forEach((ach) => {
                let progress = 0;
                const type = ach.target_type;

                if (type === 'solved_count') progress = user.solved_count || 0;
                else if (type === 'streak') progress = Math.max(user.streak || 0, user.max_streak || 0);
                else if (type === 'arena_wins') progress = user.arena_wins || 0;
                else if (type === 'level') progress = user.level || 1;
                else if (type === 'shop_count') progress = shopCount;
                else if (type === 'perfect_exercises_count') progress = user.perfect_exercises_count || 0;
                else if (type === 'perfect_levels_count') progress = user.perfect_levels_count || 0;
                else if (type === 'mastery_arithmetic') progress = masteryArithmetic;
                else if (type === 'mastery_mental') progress = masteryMental;
                else if (type === 'mastery_algebra') progress = masteryAlgebra;
                else if (type === 'mastery_calculus') progress = masteryCalculus;
                else if (type === 'mastery_combinatorics') progress = masteryCombinatorics;
                else if (type === 'mastery_number_theory') progress = masteryNumberTheory;
                else if (type === 'mastery_geometry') progress = masteryGeometry;
                else if (type === 'mastery_integers') progress = masteryIntegers;
                else if (type === 'mastery_decimals') progress = masteryDecimals;
                else if (type === 'mastery_fractions') progress = masteryFractions;
                else if (type === 'mastery_number_sense') progress = masteryNumberSense;
                else if (type === 'mastery_statistics') progress = masteryStatistics;
                else if (type === 'mastery_expressions') progress = masteryExpressions;
                else if (type === 'mastery_powers') progress = masteryPowers;
                else if (type === 'friends_count') progress = friendsCount;
                else if (type === 'daily_puzzles_solved') progress = user.daily_puzzles_solved || 0;
                else if (type === 'archive_solved') progress = user.archive_solved || 0;
                else if (type === 'seasonal_spring') progress = user.seasonal_spring_count || 0;
                else if (type === 'seasonal_summer') progress = user.seasonal_summer_count || 0;
                else if (type === 'calculator_sixseven') progress = user.calculator_sixseven_count || 0;
                else if (type === 'speed_demon') progress = user.speed_demon_count || 0;

                const finalProgress = Math.min(progress, ach.target_value);
                const isCompleted = finalProgress >= ach.target_value;
                const completedAt = isCompleted ? Math.floor(Date.now() / 1000) : 0;

                db.get(
                  'SELECT completed_at FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
                  [userId, ach.id],
                  (errX, prevRow) => {
                    const alreadyCompleted = prevRow && prevRow.completed_at > 0;

                    db.run(
                      `
                  INSERT INTO user_achievements (user_id, achievement_id, progress, completed_at)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(user_id, achievement_id) DO UPDATE SET
                    progress = excluded.progress,
                    completed_at = CASE WHEN user_achievements.completed_at = 0 THEN excluded.completed_at ELSE user_achievements.completed_at END
                  WHERE claimed = 0
                `,
                      [userId, ach.id, finalProgress, completedAt],
                      () => {
                        if (isCompleted && !alreadyCompleted) {
                          notify(userId, {
                            category: 'achievement',
                            title: 'Achievement Completed! 🏆',
                            message: `You completed the achievement: ${ach.name}! Claim it for rewards.`,
                            type: 'achievement',
                          });
                        }

                        processedCount++;
                        if (processedCount === achs.length) {
                          if (callback) callback();
                        }
                      }
                    );
                  }
                );
              });
            });
          });
        }
      );
    });
  });
}

module.exports = { updateAchievements };
