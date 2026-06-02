// Commitment / anti-burnout engine: records daily solve volume, derives a consistency
// index + burnout risk, advances or restores the streak, and unlocks milestone relics.
// Used by math/complete (per session) and the commitment routes.
const { db } = require('../db');

// Idempotently unlock a relic (and mirror it into inventory). callback(true) if newly unlocked.
function unlockRelic(userId, relicId, callback) {
  const now = Math.floor(Date.now() / 1000);
  db.run(
    'INSERT OR IGNORE INTO user_commitment_relics (user_id, relic_id, unlocked_at) VALUES (?, ?, ?)',
    [userId, relicId, now],
    function (err) {
      if (!err && this.changes > 0) {
        db.run('INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)', [userId, relicId], () => {
          if (callback) callback(true);
        });
      } else {
        if (callback) callback(false);
      }
    }
  );
}

function updateCommitmentAndBurnout(userId, solvedCountThisSession, callback) {
  const now = Math.floor(Date.now() / 1000);
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
            let unlockBurnoutShield = false;
            if (user.burnout_risk === 'high' && todaySolved <= 5 && todaySolved > 0) {
              unlockBurnoutShield = true;
            }

            // Determine state and streak updates
            let newStreak = user.streak;
            let newState = user.commitment_state;

            const elapsed = now - (user.last_active || 0);

            if (user.commitment_state === 'fading') {
              // Restored climb!
              newState = 'active';
              if (elapsed > 86400) {
                newStreak = user.streak + 1;
              }
            } else if (elapsed > 86400) {
              newStreak = user.streak + 1;
              newState = 'active';
            }

            const newMaxStreak = Math.max(user.max_streak || 0, newStreak);

            db.run(
              `UPDATE users SET
                 streak = ?,
                 max_streak = ?,
                 commitment_state = ?,
                 burnout_risk = ?,
                 consistency_index = ?,
                 burnout_counter = ?,
                 last_active = ?
               WHERE id = ?`,
              [newStreak, newMaxStreak, newState, burnoutRisk, consistencyIndex, newBurnoutCounter, now, userId],
              () => {
                // Check relic unlocks
                const unlockPromises = [];

                if (newStreak >= 3) {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_spark', resolve)));
                }
                if (newStreak >= 7) {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_rhythm', resolve)));
                }
                if (newStreak >= 30) {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_dedication', resolve)));
                }
                if (newStreak >= 100) {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_sage', resolve)));
                }
                if (user.commitment_state === 'fading' && newState === 'active') {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_comeback', resolve)));
                }
                if (unlockBurnoutShield) {
                  unlockPromises.push(new Promise((resolve) => unlockRelic(userId, 'relic_burnout_shield', resolve)));
                }

                Promise.all(unlockPromises).then(() => {
                  if (callback) callback({ newStreak, newState, burnoutRisk, consistencyIndex });
                });
              }
            );
          });
        }
      );
    }
  );
}

module.exports = { updateCommitmentAndBurnout, unlockRelic };
