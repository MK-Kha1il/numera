// Calendar-day streak engine (pure: no DB/IO; unit-tested in test/streak.test.js).
//
// A streak day is a LOCAL calendar day on which the learner actually solved something — the same
// definition the Today composer shows as "streak safe". Before this module the streak was driven
// by raw elapsed seconds since `last_active`, which broke both ways:
//   - a learner who played every day at a slightly EARLIER time than the day before never had a
//     >24h gap, so the streak never advanced;
//   - a learner who came back after a week through a still-valid token (no password login, so the
//     login-only missed-day check never ran) got +1 instead of a reset.
//
// Two events drive it:
//   settle — "we observed the learner today" (login, app open). Resolves any missed days: spends
//            Streak Shields if they cover every missed day, otherwise enters the one-day `fading`
//            grace, otherwise resets (stashing the lost run for the coins-paid repair valve).
//            Never credits today.
//   credit — "the learner solved something today". Settles first, then counts today exactly once.
//
// Day indices are floor((epochSec + tzOffsetMinutes*60) / 86400) — tz is the client-reported UTC
// offset in minutes, east-positive (local = UTC + offset), the same convention the notification
// funnel's quiet hours use.
'use strict';

const DAY_SECS = 86400;
const MAX_TZ_MINUTES = 14 * 60; // real offsets span UTC-12..UTC+14

function clampTzOffset(minutes) {
  const m = Math.round(Number(minutes) || 0);
  return Math.max(-MAX_TZ_MINUTES, Math.min(MAX_TZ_MINUTES, m));
}

function localDayIndex(epochSec, tzOffsetMinutes = 0) {
  return Math.floor((Number(epochSec) + clampTzOffset(tzOffsetMinutes) * 60) / DAY_SECS);
}

// Normalize a DB-ish row into the engine's state shape.
function stateFrom(row) {
  return {
    streak: Math.max(0, parseInt(row.streak, 10) || 0),
    maxStreak: Math.max(0, parseInt(row.max_streak ?? row.maxStreak, 10) || 0),
    commitmentState: row.commitment_state || row.commitmentState || 'active',
    streakDay: Math.max(0, parseInt(row.streak_day ?? row.streakDay, 10) || 0),
  };
}

/**
 * Resolve missed days. `today` is the learner's local day index; `shields` the Streak Shields
 * held. Returns { state, effects } where effects is
 *   { shieldsUsed, savedStreak, faded, lostStreak }  (lostStreak > 0 only on a real reset).
 */
function settle(prev, today, shields = 0) {
  const state = { ...prev };
  const effects = { shieldsUsed: 0, savedStreak: 0, faded: false, lostStreak: 0 };
  if (state.streak <= 0 || state.streakDay <= 0) return { state, effects };

  const gap = today - state.streakDay;
  if (gap <= 1) return { state, effects }; // credited today or yesterday — nothing missed

  const missedDays = gap - 1;
  if (shields >= missedDays) {
    // Every missed day is covered: spend one shield per day and move the chain's anchor to
    // yesterday, so today's solve simply continues it.
    effects.shieldsUsed = missedDays;
    effects.savedStreak = state.streak;
    state.streakDay = today - 1;
    state.commitmentState = 'protected';
    return { state, effects };
  }

  if (missedDays === 1) {
    // One uncovered missed day: the climb is held in a `fading` grace (idempotent — settling
    // twice on the same day stays fading). Solving today restores it (see credit); the anchor
    // doesn't move, so missing another day widens the gap and resets it below.
    effects.faded = state.commitmentState !== 'fading';
    state.commitmentState = 'fading';
    return { state, effects };
  }

  // Two+ uncovered days: the run is lost. Stash it for the repair valve (only worth offering
  // for a real run of 2+ days).
  effects.lostStreak = state.streak >= 2 ? state.streak : 0;
  state.maxStreak = Math.max(state.maxStreak, state.streak);
  state.streak = 0;
  state.commitmentState = 'active';
  return { state, effects };
}

/**
 * Count a solve on local day `today`. Settles first (so a stale run can't be extended), then
 * credits the day at most once. Returns { state, effects } with the settle effects plus
 *   { credited, restoredFromFading, newStreak }.
 */
function credit(prev, today, shields = 0) {
  const settled = settle(prev, today, shields);
  const state = settled.state;
  const effects = { ...settled.effects, credited: false, restoredFromFading: false, newStreak: state.streak };

  if (state.streak > 0 && state.streakDay === today) return { state, effects }; // already counted today

  const gap = today - state.streakDay;
  if (state.streak > 0 && state.commitmentState === 'fading' && gap === 2) {
    // Came back inside the grace window and solved: the climb survives and today counts.
    state.streak += 1;
    effects.restoredFromFading = true;
  } else if (state.streak > 0 && gap === 1) {
    state.streak += 1;
  } else {
    state.streak = 1; // first ever, after a reset, or anything non-contiguous
  }
  state.streakDay = today;
  state.commitmentState = 'active';
  state.maxStreak = Math.max(state.maxStreak, state.streak);
  effects.credited = true;
  effects.newStreak = state.streak;
  return { state, effects };
}

module.exports = { DAY_SECS, clampTzOffset, localDayIndex, stateFrom, settle, credit };
