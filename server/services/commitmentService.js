// Commitment / anti-burnout engine: records daily solve volume, derives a consistency
// index + burnout risk, and credits today's streak day (services/streakService.js).
// Used by math/complete (per session) and the commitment routes.
const { db } = require('../db');
const { notify } = require('./notificationService');
const { unlockRelic } = require('./relicService');
const { creditStreak } = require('./streakService');

// Celebrate the moment a learner crosses their self-set daily-problems goal (audit #2/#19 — the
// positive-reinforcement half of the goal loop). Fires only when THIS session is the one that
// pushed today's total across the target (so it doesn't re-congratulate on every later session),
// and the date-stamped dedupKey makes it at-most-once-per-day regardless. Fire-and-forget.
function maybeCelebrateDailyGoal(user, todaySolved, solvedThisSession) {
  db.get(
    "SELECT target_value FROM user_goals WHERE user_id = ? AND goal_type = 'daily_problems'",
    [user.id],
    (err, goal) => {
      if (err || !goal) return;
      const target = goal.target_value;
      const before = todaySolved - solvedThisSession;
      if (todaySolved >= target && before < target) {
        notify(user.id, {
          category: 'daily_goal_reached',
          title: 'Daily goal smashed! 🎯',
          message: `You hit your goal of ${target} problems today. Great work — see you tomorrow!`,
          type: 'reward',
          channels: ['inapp', 'email'],
          dedupKey: new Date().toISOString().slice(0, 10),
          user,
        }).catch(() => {});
      }
    }
  );
}

function updateCommitmentAndBurnout(userId, solvedCountThisSession, callback) {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Record solved count in commitment history
  db.run(
    `INSERT INTO user_commitment_history (user_id, date, solved_count)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET solved_count = solved_count + excluded.solved_count`,
    [userId, dateStr, solvedCountThisSession],
    () => {
      // 2. Query history to compute Consistency Index and Burnout Risk
      db.all(
        'SELECT date, solved_count FROM user_commitment_history WHERE user_id = ? ORDER BY date DESC LIMIT 14',
        [userId],
        (errHistory, rows) => {
          const activeDaysCount = rows ? rows.length : 0;
          const consistencyIndex = Math.min(1.0, activeDaysCount / 14);

          // Get today's total solved count
          const todayRow = rows ? rows.find((r) => r.date === dateStr) : null;
          const todaySolved = todayRow ? todayRow.solved_count : 0;

          db.get('SELECT * FROM users WHERE id = ?', [userId], (errUser, user) => {
            if (errUser || !user) return callback && callback();

            // Positive reinforcement: did this session just complete the learner's daily goal?
            maybeCelebrateDailyGoal(user, todaySolved, solvedCountThisSession);

            let burnoutRisk = 'low';
            let newBurnoutCounter = user.burnout_counter || 0;

            if (todaySolved >= 40) {
              burnoutRisk = 'high';
              newBurnoutCounter++;
            } else if (todaySolved >= 25) {
              burnoutRisk = 'medium';
            }

            // If user's burnout risk was high, and they completed today with <= 5 solved questions,
            // they successfully balanced their session intensity.
            const unlockBurnoutShield = user.burnout_risk === 'high' && todaySolved <= 5 && todaySolved > 0;

            // 3. The streak is a calendar-day count of days the learner SOLVED something
            // (lib/streak.js): only a session with at least one solve credits today. The engine
            // also settles missed days (shield / fading grace / reset) and unlocks the streak
            // milestone relics, transactionally.
            const streakStep = solvedCountThisSession > 0 ? creditStreak(userId) : Promise.resolve(null);
            streakStep.then((streakResult) => {
              db.run(
                'UPDATE users SET burnout_risk = ?, consistency_index = ?, burnout_counter = ? WHERE id = ?',
                [burnoutRisk, consistencyIndex, newBurnoutCounter, userId],
                () => {
                  const done = () => {
                    const state = streakResult ? streakResult.state : null;
                    if (callback) {
                      callback({
                        newStreak: state ? state.streak : user.streak,
                        newState: state ? state.commitmentState : user.commitment_state,
                        burnoutRisk,
                        consistencyIndex,
                      });
                    }
                  };
                  if (unlockBurnoutShield) unlockRelic(userId, 'relic_burnout_shield', done);
                  else done();
                }
              );
            });
          });
        }
      );
    }
  );
}

module.exports = { updateCommitmentAndBurnout, unlockRelic };
