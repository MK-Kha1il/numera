// Commitment relics: idempotent unlock of a relic (mirrored into the inventory so it can be
// shown/equipped). Shared by the streak engine (milestone relics), the commitment engine
// (burnout shield) and the recommit route (comeback medal).
const { db } = require('../db');

// callback(true) if newly unlocked, callback(false) if already owned or on error.
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
      } else if (callback) {
        callback(false);
      }
    }
  );
}

const unlockRelicAsync = (userId, relicId) => new Promise((resolve) => unlockRelic(userId, relicId, resolve));

// Streak-length milestone relics, lowest first.
const STREAK_RELICS = [
  { days: 3, relicId: 'relic_spark' },
  { days: 7, relicId: 'relic_rhythm' },
  { days: 30, relicId: 'relic_dedication' },
  { days: 100, relicId: 'relic_sage' },
];

module.exports = { unlockRelic, unlockRelicAsync, STREAK_RELICS };
