// Shared per-user data services (DB-touching, callback-style to match the rest of the
// codebase). Used by many routes, so they live here rather than in any single router.
const { db } = require('../db');
const logger = require('../logger');
const { localDayIndex } = require('../lib/streak');
const { getTzOffset } = require('./streakService');
const { ensureLeagueWeek } = require('./leagueService');

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
        sequences_correct: mastery ? mastery.sequences_correct || 0 : 0,
        equations_correct: mastery ? mastery.equations_correct || 0 : 0,
        rates_correct: mastery ? mastery.rates_correct || 0 : 0,
        factors_correct: mastery ? mastery.factors_correct || 0 : 0,
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
        // New cosmetic equip slots (docs/ShopOverhaul.md §8). Empty string = nothing equipped.
        active_title: user.active_title || '',
        active_effect: user.active_effect || '',
        active_victory: user.active_victory || '',
        active_tap: user.active_tap || '',
        active_frame: user.active_frame || '',
        assessment_taken: user.assessment_taken || 0,
        onboarding_complete: user.onboarding_complete || 0,
        is_guest: user.is_guest || 0,
        display_name: user.display_name || null,
        reminders_opt_in: user.reminders_opt_in || 0,
        league: user.league || 'Quartz',
        league_points: user.league_points || 0,
        solved_count: user.solved_count || 0,
        arena_wins: user.arena_wins || 0,
        elo: user.elo || 1000,
        competitive_matches: user.competitive_matches || 0,
        competitive_rank: user.competitive_rank || 'Unranked (Placement: 0/5)',
        rank_revealed: user.rank_revealed || 0,
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

// Lazily ensure quest/mastery rows exist, then apply the daily quest reset and make sure the global
// weekly league has rolled over. Always invokes callback when done.
//
// Daily quests reset when the learner's LOCAL calendar day changes (lib/streak.js day clock — the
// same one the streak and daily puzzle use). The old rule (`now - last_quest_reset >= 86400`) was
// a rolling window anchored to whenever the app was first opened after the last reset, so the
// reset time drifted later and later and a day's quests could bleed into the next.
function checkAndResetQuestsAndLeagues(userId, callback) {
  getTzOffset(userId).then((tz) => runResets(userId, tz, callback));
}

// Promise form, for routes that bump quest counters: run the reset FIRST so progress earned after
// midnight lands on today's row instead of being wiped by a later lazy reset.
const ensureDailyReset = (userId) => new Promise((resolve) => checkAndResetQuestsAndLeagues(userId, resolve));

function runResets(userId, tz, callback) {
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
        // Daily quest reset on a new local calendar day.
        if (!qRow.last_quest_reset || localDayIndex(now, tz) > localDayIndex(qRow.last_quest_reset, tz)) {
          questPromise = new Promise((resolveQ) => {
            db.run(
              `
              UPDATE user_quests SET
                solved_today = 0,
                duels_today = 0,
                mistakes_today = 0,
                daily_puzzle_today = 0,
                puzzle_rush_today = 0,
                srs_review_today = 0,
                solved_claimed = 0,
                duels_claimed = 0,
                mistakes_claimed = 0,
                daily_puzzle_claimed = 0,
                puzzle_rush_claimed = 0,
                srs_review_claimed = 0,
                solo_sessions_today = 0,
                mistake_rewards_today = 0,
                last_quest_reset = ?
              WHERE user_id = ?
            `,
              [now, userId],
              resolveQ
            );
          });
        }

        // The weekly league runs on one global week with a single rollover (services/leagueService.js)
        // — checked here so it always happens before any of this week's league points are earned.
        questPromise.then(() => ensureLeagueWeek()).then(() => callback && callback());
      });
    };

    if (!questRow) {
      initQuestsAndMastery(proceedWithResets);
    } else {
      proceedWithResets();
    }
  });
}

module.exports = { getUserWithMastery, checkAndResetQuestsAndLeagues, ensureDailyReset };
