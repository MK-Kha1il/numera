// Lifecycle re-engagement sweeper (see docs/specs/Spec-LifecycleNotifications.md).
//
// The single biggest retention lever the product was missing: nobody was ever reminded to come
// back. This runs a periodic pass that finds lapsed/at-risk learners by their last_active day and
// pushes a notification through the funnel (in-app + email). Every trigger carries a date-stamped
// dedupKey, so the funnel's notification_log guarantees at-most-once-per-window even though the
// sweep runs hourly.
//
// Day math is in UTC days (floor(epoch/86400)); send-time refinement (local quiet hours) is a
// later phase — for now the cap is one-per-day via dedup, which is the safe default.
'use strict';

const logger = require('../logger');
const { notify } = require('./notificationService');

const DAY = 86400;
const nowSec = () => Math.floor(Date.now() / 1000);
const dayIndex = (sec) => Math.floor(sec / DAY);

// Half-open [start, end) epoch-second range for the UTC day that is `nBack` days before today.
function dayRange(nBack) {
  const target = dayIndex(nowSec()) - nBack;
  return [target * DAY, (target + 1) * DAY];
}
function isoStamp(sec) {
  return new Date(sec * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
}

function allUsersActiveOn(db, nBack, extraWhere = '') {
  const [start, end] = dayRange(nBack);
  return new Promise((resolve) => {
    db.all(
      `SELECT id, username, email, birth_year, telemetry_enabled, streak, level, xp,
              solved_count, coins, last_active, burnout_risk,
              COALESCE((SELECT quantity FROM user_utilities
                          WHERE user_id = users.id AND item_id = 'item_streak_shield'), 0)
                AS streak_shields
         FROM users
        WHERE last_active >= ? AND last_active < ? ${extraWhere}`,
      [start, end],
      (err, rows) => {
        if (err) {
          logger.warn(`[lifecycle] query failed (nBack=${nBack}): ${err.message}`);
          return resolve([]);
        }
        resolve(rows || []);
      }
    );
  });
}

// The trigger set. Each picks an audience by last-active day bucket; buckets are mutually
// exclusive so a user gets at most one lifecycle message per sweep.
const TRIGGERS = [
  {
    category: 'streak_risk',
    // Active yesterday, still has a streak — remind them before it breaks.
    audience: (db) => allUsersActiveOn(db, 1, 'AND streak > 0'),
    build: (u) => {
      // Wellbeing-aware nudge (audit #15 — close the personalization loop + dark-pattern ethics
      // pass). The engine already MEASURES burnout (commitmentService → users.burnout_risk); a
      // learner flagged 'high' should NOT get a loss-framed FOMO push. We still re-engage them
      // (retention), but swap to a supportive, low-pressure framing — honoring the measured
      // emotional state instead of exploiting it. Everyone else gets the standard streak reminder.
      const shields = u.streak_shields || 0;
      if (u.burnout_risk === 'high') {
        const gentleNet =
          shields > 0
            ? ` And you've got ${shields} Streak Shield${shields === 1 ? '' : 's'} in reserve, so there's truly no rush.`
            : '';
        return {
          title: 'No pressure — a quick visit keeps your streak 🌱',
          message: `You've been putting in real work lately. A short, easy session today is plenty to keep your ${u.streak}-day streak alive — be kind to yourself.${gentleNet}`,
          type: 'info',
        };
      }
      // Surface streak insurance: if they hold Streak Shield(s) (the streak-freeze utility),
      // reassure them it's a safety net — and still nudge them to keep the streak honestly.
      const safetyNet =
        shields > 0
          ? ` (You also have ${shields} Streak Shield${shields === 1 ? '' : 's'} as backup, but why spend one?)`
          : '';
      return {
        title: `Don't lose your ${u.streak}-day streak! 🔥`,
        message: `You're on a ${u.streak}-day streak. Solve a few problems today to keep it alive.${safetyNet}`,
        type: 'reward',
      };
    },
  },
  {
    category: 'winback_d1',
    // Active yesterday, no streak to protect — a gentle nudge back.
    audience: (db) => allUsersActiveOn(db, 1, 'AND (streak IS NULL OR streak = 0)'),
    build: () => ({
      title: 'Ready for today’s math? 🧠',
      message: 'A short session is all it takes to keep your skills sharp. Jump back in!',
      type: 'info',
    }),
  },
  {
    category: 'winback_d3',
    audience: (db) => allUsersActiveOn(db, 3),
    build: () => ({
      title: 'We miss you at Numera 👋',
      message: 'It’s been a few days. Come back and pick up right where you left off.',
      type: 'info',
    }),
  },
  {
    category: 'winback_d7',
    audience: (db) => allUsersActiveOn(db, 7),
    build: () => ({
      title: 'Your next level is waiting 🚀',
      message: 'A whole week off — let’s get back to it. One session restarts the momentum.',
      type: 'info',
    }),
  },
  {
    category: 'weekly_recap',
    // Surfaces learning state, so it’s gated on telemetry_enabled in the funnel. Fires Sundays.
    onlyOnSunday: true,
    requiresTelemetry: true,
    audience: (db) =>
      Promise.all([0, 1, 2, 3, 4, 5, 6].map((n) => allUsersActiveOn(db, n))).then((buckets) => {
        const seen = new Set();
        const out = [];
        for (const bucket of buckets)
          for (const u of bucket)
            if (!seen.has(u.id)) {
              seen.add(u.id);
              out.push(u);
            }
        return out;
      }),
    build: (u) => {
      // Milestone-style recap from current standings. NOTE: these are cumulative totals, not
      // true week-over-week deltas — real weekly deltas need a weekly snapshot table (a future
      // enhancement); until then we frame it as a "where you stand" summary, which is honest.
      const bits = [`level ${u.level}`];
      if (u.streak) bits.push(`a ${u.streak}-day streak`);
      if (u.solved_count) bits.push(`${u.solved_count} problems solved`);
      const standing = bits.join(', ');
      return {
        title: 'Your weekly Numera recap 📊',
        message: `Here's where you stand: ${standing}${u.coins ? ` and ${u.coins} coins` : ''}. Keep the momentum going next week!`,
        type: 'info',
      };
    },
  },
];

// One sweep pass. Best-effort: a failure in one trigger never blocks the others or throws.
async function sweepOnce(db) {
  const stamp = isoStamp(nowSec());
  const isSunday = new Date().getUTCDay() === 0;
  let sent = 0;

  for (const trig of TRIGGERS) {
    if (trig.onlyOnSunday && !isSunday) continue;
    try {
      const audience = await trig.audience(db);
      for (const user of audience) {
        const copy = trig.build(user);
        await notify(user.id, {
          category: trig.category,
          title: copy.title,
          message: copy.message,
          type: copy.type,
          channels: ['inapp', 'email'],
          dedupKey: stamp,
          requiresTelemetry: !!trig.requiresTelemetry,
          user, // preloaded — avoids a re-fetch in the funnel
        });
        sent += 1;
      }
    } catch (err) {
      logger.warn(`[lifecycle] trigger ${trig.category} failed: ${err.message}`);
    }
  }
  if (sent) logger.info(`[lifecycle] sweep dispatched ${sent} notification(s).`);
  return sent;
}

// Start a periodic sweep (hourly so day-bucket windows stay tight). Runs one pass immediately.
// The timer is unref'd so it never keeps the process alive on its own.
function startLifecycleSweeper(db, intervalMs = 60 * 60 * 1000) {
  sweepOnce(db).catch((err) => logger.warn(`[lifecycle] initial sweep failed: ${err.message}`));
  const timer = setInterval(() => {
    sweepOnce(db).catch((err) => logger.warn(`[lifecycle] sweep failed: ${err.message}`));
  }, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { sweepOnce, startLifecycleSweeper, TRIGGERS };
