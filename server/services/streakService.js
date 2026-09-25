// Streak persistence over the pure calendar-day engine (lib/streak.js).
//
//   settleStreak(userId) — call when the learner is SEEN (login, app open via /api/auth/me): spends
//                          shields / fades / resets for missed days so the displayed streak is true.
//   creditStreak(userId) — call when the learner SOLVES something (solo session, duel, puzzle rush…):
//                          settles, then counts today once and unlocks streak-milestone relics.
//
// Both run in one ACID transaction on the write connection, so the shield spend (conditional
// `quantity >= n`) and the users update commit together — two concurrent requests can't
// double-spend a shield or double-credit a day. Every call also bumps last_active ("last seen").
'use strict';

const { db } = require('../db');
const { withTransaction } = require('../dbx');
const logger = require('../logger');
const Streak = require('../lib/streak');
const { notify } = require('./notificationService');
const { unlockRelicAsync, STREAK_RELICS } = require('./relicService');

const nowSec = () => Math.floor(Date.now() / 1000);

// The learner's client-reported UTC offset (minutes, east-positive); 0 (UTC) when never reported.
function getTzOffset(userId) {
  return new Promise((resolve) => {
    db.get('SELECT tz_offset_minutes FROM notification_preferences WHERE user_id = ?', [userId], (err, row) => {
      resolve(err || !row ? 0 : Streak.clampTzOffset(row.tz_offset_minutes));
    });
  });
}

// The learner's current local day index (shared with the quest reset + daily puzzle clocks).
async function localToday(userId, atSec = nowSec()) {
  return Streak.localDayIndex(atSec, await getTzOffset(userId));
}

async function applyStreakEvent(userId, kind) {
  const now = nowSec();
  const today = Streak.localDayIndex(now, await getTzOffset(userId));

  const result = await withTransaction(async (tx) => {
    const row = await tx.get('SELECT streak, max_streak, commitment_state, streak_day FROM users WHERE id = ?', [userId]);
    if (!row) return null;
    const shieldRow = await tx.get(
      "SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'",
      [userId]
    );
    const shields = shieldRow ? Math.max(0, shieldRow.quantity || 0) : 0;

    const prev = Streak.stateFrom(row);
    const { state, effects } = kind === 'credit' ? Streak.credit(prev, today, shields) : Streak.settle(prev, today, shields);

    if (effects.shieldsUsed > 0) {
      const spent = await tx.run(
        "UPDATE user_utilities SET quantity = quantity - ? WHERE user_id = ? AND item_id = 'item_streak_shield' AND quantity >= ?",
        [effects.shieldsUsed, userId, effects.shieldsUsed]
      );
      if (spent.changes === 0) throw new Error('streak shield spend raced');
    }

    const reset = prev.streak > 0 && state.streak === 0;
    await tx.run(
      `UPDATE users SET streak = ?, max_streak = ?, commitment_state = ?, streak_day = ?, last_active = ?
         ${reset ? ', lost_streak = ?, lost_streak_at = ?' : ''}
       WHERE id = ?`,
      [
        state.streak,
        state.maxStreak,
        state.commitmentState,
        state.streakDay,
        now,
        ...(reset ? [effects.lostStreak, effects.lostStreak > 0 ? now : 0] : []),
        userId,
      ]
    );
    return { prev, state, effects, today };
  });

  if (!result) return null;
  const { effects, state } = result;

  if (effects.savedStreak > 0) {
    // Fire-and-forget; the date-stamped dedupKey makes it at-most-once per day.
    notify(userId, {
      category: 'streak_freeze_used',
      title: 'Your Streak Shield saved your streak! 🛡️',
      message: `You missed ${effects.shieldsUsed === 1 ? 'a day' : `${effects.shieldsUsed} days`}, but ${
        effects.shieldsUsed === 1 ? 'a Streak Shield' : 'your Streak Shields'
      } kept your ${effects.savedStreak}-day streak alive. Welcome back — keep it going!`,
      type: 'reward',
      channels: ['inapp', 'email'],
      dedupKey: new Date(now * 1000).toISOString().slice(0, 10),
    }).catch(() => {});
  }

  if (kind === 'credit' && effects.credited) {
    const unlocks = STREAK_RELICS.filter((r) => state.streak >= r.days).map((r) => unlockRelicAsync(userId, r.relicId));
    if (effects.restoredFromFading) unlocks.push(unlockRelicAsync(userId, 'relic_comeback'));
    await Promise.all(unlocks);
  }
  return result;
}

// Per-process memo of "already credited on local day D", so a burst of solves (a Puzzle Rush run
// submits dozens of answers) doesn't open a transaction per answer. Purely an optimization: a miss
// just falls through to the idempotent DB path. Bounded by clearing when it grows large.
const creditedOn = new Map();
const MEMO_LIMIT = 50000;

// Never throw into a request path: a streak hiccup must not fail a login or a reward.
async function settleStreak(userId) {
  try {
    return await applyStreakEvent(userId, 'settle');
  } catch (err) {
    logger.error(`[streak] settle failed for user ${userId}: ${err.message}`);
    return null;
  }
}

async function creditStreak(userId) {
  try {
    const today = await localToday(userId);
    if (creditedOn.get(userId) === today) return null;
    const result = await applyStreakEvent(userId, 'credit');
    if (result && result.state.streakDay === result.today) {
      if (creditedOn.size >= MEMO_LIMIT) creditedOn.clear();
      creditedOn.set(userId, result.today);
    }
    return result;
  } catch (err) {
    logger.error(`[streak] credit failed for user ${userId}: ${err.message}`);
    return null;
  }
}

module.exports = {
  settleStreak,
  creditStreak,
  getTzOffset,
  localToday,
};
