// Shared per-user data services (DB-touching, callback-style to match the rest of the
// codebase). Used by many routes, so they live here rather than in any single router.
const { db } = require('../db');
const logger = require('../logger');

// Load a user joined with their mastery row, shaped into the full client-facing user object.
function getUserWithMastery(userId, callback) {
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return callback(err || new Error('User not found'));

    db.get('SELECT * FROM user_mastery WHERE user_id = ?', [userId], (errM, mastery) => {
      const masteryObj = {
        arithmetic_correct: mastery ? mastery.arithmetic_correct : 0,
        mental_correct: mastery ? mastery.mental_correct : 0,
        algebra_correct: mastery ? mastery.algebra_correct : 0,
        calculus_correct: mastery ? mastery.calculus_correct : 0,
        combinatorics_correct: mastery ? mastery.combinatorics_correct : 0,
        number_theory_correct: mastery ? mastery.number_theory_correct : 0,
        geometry_correct: mastery ? mastery.geometry_correct || 0 : 0,
        integers_correct: mastery ? mastery.integers_correct || 0 : 0,
        decimals_correct: mastery ? mastery.decimals_correct || 0 : 0,
        fractions_correct: mastery ? mastery.fractions_correct || 0 : 0,
        number_sense_correct: mastery ? mastery.number_sense_correct || 0 : 0,
        statistics_correct: mastery ? mastery.statistics_correct || 0 : 0,
        expressions_correct: mastery ? mastery.expressions_correct || 0 : 0,
        powers_correct: mastery ? mastery.powers_correct || 0 : 0,
        graphing_correct: mastery ? mastery.graphing_correct || 0 : 0,
        inequalities_correct: mastery ? mastery.inequalities_correct || 0 : 0,
        functions_correct: mastery ? mastery.functions_correct || 0 : 0,
      };

      const fullUser = {
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        rank: user.rank,
        streak: user.streak,
        active_badge: user.active_badge,
        theme: user.theme,
        avatar: user.avatar,
        active_banner: user.active_banner || 'banner_default',
        assessment_taken: user.assessment_taken || 0,
        onboarding_complete: user.onboarding_complete || 0,
        display_name: user.display_name || null,
        reminders_opt_in: user.reminders_opt_in || 0,
        league: user.league || 'Bronze',
        league_points: user.league_points || 0,
        solved_count: user.solved_count || 0,
        arena_wins: user.arena_wins || 0,
        elo: user.elo || 1000,
        competitive_matches: user.competitive_matches || 0,
        total_coins_earned: user.total_coins_earned !== undefined ? user.total_coins_earned : 100,
        total_coins_spent: user.total_coins_spent || 0,
        xp_booster_uses_left: user.xp_booster_uses_left || 0,
        max_streak: user.max_streak || 0,
        commitment_state: user.commitment_state || 'active',
        burnout_risk: user.burnout_risk || 'low',
        consistency_index: user.consistency_index || 0.0,
        burnout_counter: user.burnout_counter || 0,
        last_telemetry_check: user.last_telemetry_check || 0,
        mastery: masteryObj,
      };
      callback(null, fullUser);
    });
  });
}

// Lazily ensure quest/mastery rows exist, then apply daily quest resets and weekly league
// promotion/demotion if their windows have elapsed. Always invokes callback when done.
function checkAndResetQuestsAndLeagues(userId, callback) {
  const now = Math.floor(Date.now() / 1000);

  // 1. Ensure user_quests and user_mastery exist
  db.get('SELECT * FROM user_quests WHERE user_id = ?', [userId], (err, questRow) => {
    if (err) {
      logger.error(err);
      return callback && callback();
    }

    const initQuestsAndMastery = (cb) => {
      db.run('INSERT OR IGNORE INTO user_quests (user_id, last_quest_reset) VALUES (?, ?)', [userId, now], () => {
        db.run('INSERT OR IGNORE INTO user_mastery (user_id) VALUES (?)', [userId], () => {
          cb();
        });
      });
    };

    const proceedWithResets = () => {
      db.get('SELECT * FROM user_quests WHERE user_id = ?', [userId], (errQ, qRow) => {
        if (errQ || !qRow) return callback && callback();

        let questPromise = Promise.resolve();
        // Check daily quest reset (86400 seconds)
        if (now - qRow.last_quest_reset >= 86400) {
          questPromise = new Promise((resolveQ) => {
            db.run(
              `
              UPDATE user_quests SET
                solved_today = 0,
                duels_today = 0,
                mistakes_today = 0,
                daily_puzzle_today = 0,
                solved_claimed = 0,
                duels_claimed = 0,
                mistakes_claimed = 0,
                daily_puzzle_claimed = 0,
                last_quest_reset = ?
              WHERE user_id = ?
            `,
              [now, userId],
              resolveQ
            );
          });
        }

        questPromise.then(() => {
          // Check weekly league reset (7 * 86400 seconds)
          db.get('SELECT league, league_points, last_league_reset FROM users WHERE id = ?', [userId], (errU, uRow) => {
            if (errU || !uRow) return callback && callback();

            const lastLeagueReset = uRow.last_league_reset || 0;
            if (lastLeagueReset === 0) {
              db.run('UPDATE users SET last_league_reset = ? WHERE id = ?', [now, userId], () => {
                callback && callback();
              });
              return;
            }

            if (now - lastLeagueReset >= 7 * 86400) {
              const currentLeague = uRow.league || 'Bronze';

              db.all(
                'SELECT id, league_points FROM users WHERE league = ? ORDER BY league_points DESC',
                [currentLeague],
                (errStand, standings) => {
                  if (errStand || !standings) return callback && callback();

                  const rankIndex = standings.findIndex((s) => s.id === userId);
                  const totalInLeague = standings.length;

                  let newLeague = currentLeague;
                  const leaguesOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
                  const currentIdx = leaguesOrder.indexOf(currentLeague);

                  if (rankIndex !== -1) {
                    const userPoints = standings[rankIndex].league_points;
                    const shouldPromote = (rankIndex < 3 && userPoints > 0) || userPoints > 100;
                    const shouldDemote = rankIndex >= totalInLeague - 3 && totalInLeague >= 5 && currentIdx > 0;

                    if (shouldPromote && currentIdx < leaguesOrder.length - 1) {
                      newLeague = leaguesOrder[currentIdx + 1];
                    } else if (shouldDemote && currentIdx > 0) {
                      newLeague = leaguesOrder[currentIdx - 1];
                    }
                  }

                  db.run(
                    'UPDATE users SET league = ?, league_points = 0, last_league_reset = ? WHERE id = ?',
                    [newLeague, now, userId],
                    () => {
                      callback && callback();
                    }
                  );
                }
              );
            } else {
              callback && callback();
            }
          });
        });
      });
    };

    if (!questRow) {
      initQuestsAndMastery(proceedWithResets);
    } else {
      proceedWithResets();
    }
  });
}

module.exports = { getUserWithMastery, checkAndResetQuestsAndLeagues };
