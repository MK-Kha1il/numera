// Pure calendar-day streak engine (lib/streak.js): day boundaries across timezones/DST, the
// settle rules (shield / fading grace / reset) and credit-once-per-day.
const { test } = require('node:test');
const assert = require('node:assert');
const { localDayIndex, clampTzOffset, stateFrom, settle, credit, DAY_SECS } = require('../lib/streak');

// 2026-03-10T00:00:00Z — an arbitrary UTC midnight to anchor day arithmetic.
const T0 = Date.UTC(2026, 2, 10) / 1000;
const D0 = T0 / DAY_SECS;
const at = (dayOffset, hour = 12) => T0 + dayOffset * DAY_SECS + hour * 3600;
const st = (streak, streakDay, commitmentState = 'active', maxStreak = streak) => ({ streak, streakDay, commitmentState, maxStreak });

test('localDayIndex honours the east-positive offset at the midnight boundary', () => {
  // 23:30 UTC on D0 is already the next day in UTC+1, still D0 in UTC, and D0 in UTC-5.
  const t = T0 + 23 * 3600 + 30 * 60;
  assert.equal(localDayIndex(t, 0), D0);
  assert.equal(localDayIndex(t, 60), D0 + 1);
  assert.equal(localDayIndex(t, -300), D0);
  // 01:00 UTC on D0 is still the previous day in UTC-5.
  assert.equal(localDayIndex(T0 + 3600, -300), D0 - 1);
  // Extremes of the real offset range.
  assert.equal(localDayIndex(T0 + 11 * 3600, 14 * 60), D0 + 1);
  assert.equal(localDayIndex(T0 + 11 * 3600, -12 * 60), D0 - 1);
});

test('clampTzOffset bounds garbage and out-of-range offsets', () => {
  assert.equal(clampTzOffset(undefined), 0);
  assert.equal(clampTzOffset('abc'), 0);
  assert.equal(clampTzOffset(9999), 14 * 60);
  assert.equal(clampTzOffset(-9999), -14 * 60);
  assert.equal(clampTzOffset(330.4), 330);
});

test('a DST shift (offset +60 → +120) never skips or double-counts a local day', () => {
  // Solve at 23:00 local on day A (UTC+1), then at 00:30 local the next day under UTC+2.
  const a = at(0, 22); // 22:00 UTC = 23:00 in UTC+1
  const b = at(0, 22) + 90 * 60; // 23:30 UTC = 01:30 next day in UTC+2
  const dayA = localDayIndex(a, 60);
  const dayB = localDayIndex(b, 120);
  assert.equal(dayB - dayA, 1, 'consecutive local days stay consecutive across the shift');
  const r = credit(st(4, dayA), dayB);
  assert.equal(r.state.streak, 5);
});

test('daily play at an EARLIER time each day still advances the streak (old >24h bug)', () => {
  let s = st(0, 0);
  // Day 0 at 20:00, day 1 at 09:00, day 2 at 07:00 — every gap < 24h.
  for (const [d, h] of [[0, 20], [1, 9], [2, 7]]) {
    s = credit(s, localDayIndex(at(d, h), 0)).state;
  }
  assert.equal(s.streak, 3);
  assert.equal(s.maxStreak, 3);
});

test('credit counts a day at most once', () => {
  const today = D0 + 5;
  const once = credit(st(2, today - 1), today);
  assert.equal(once.state.streak, 3);
  assert.equal(once.effects.credited, true);
  const twice = credit(once.state, today);
  assert.equal(twice.state.streak, 3);
  assert.equal(twice.effects.credited, false);
});

test('first ever solve starts a 1-day streak', () => {
  const r = credit(stateFrom({ streak: 0, max_streak: 0, streak_day: 0 }), D0);
  assert.equal(r.state.streak, 1);
  assert.equal(r.state.streakDay, D0);
});

test('settle: nothing to do when the last credit was today or yesterday', () => {
  for (const gap of [0, 1]) {
    const r = settle(st(6, D0 - gap), D0, 3);
    assert.equal(r.state.streak, 6);
    assert.equal(r.effects.shieldsUsed, 0);
  }
});

test('settle: one missed day is covered by a shield, and today then extends the run', () => {
  const r = settle(st(9, D0 - 2), D0, 1);
  assert.equal(r.effects.shieldsUsed, 1);
  assert.equal(r.effects.savedStreak, 9);
  assert.equal(r.state.commitmentState, 'protected');
  assert.equal(r.state.streakDay, D0 - 1);
  const c = credit(r.state, D0, 0);
  assert.equal(c.state.streak, 10);
  assert.equal(c.state.commitmentState, 'active');
});

test('settle: shields must cover EVERY missed day or none are spent', () => {
  const covered = settle(st(9, D0 - 3), D0, 2); // missed 2 days, 2 shields
  assert.equal(covered.effects.shieldsUsed, 2);
  assert.equal(covered.state.streak, 9);

  const short = settle(st(9, D0 - 4), D0, 2); // missed 3 days, only 2 shields
  assert.equal(short.effects.shieldsUsed, 0, 'a partial cover saves nothing, so nothing is spent');
  assert.equal(short.state.streak, 0);
  assert.equal(short.effects.lostStreak, 9);
});

test('settle: a shield is never spent when there is no streak to save', () => {
  const r = settle(st(0, D0 - 5), D0, 3);
  assert.equal(r.effects.shieldsUsed, 0);
});

test('settle: one uncovered missed day fades (idempotently); solving today restores it', () => {
  const f1 = settle(st(4, D0 - 2), D0, 0);
  assert.equal(f1.state.commitmentState, 'fading');
  assert.equal(f1.state.streak, 4);
  assert.equal(f1.effects.faded, true);
  const f2 = settle(f1.state, D0, 0);
  assert.equal(f2.state.commitmentState, 'fading', 'settling again the same day stays fading');
  assert.equal(f2.effects.faded, false);
  assert.equal(f2.state.streak, 4);

  const c = credit(f2.state, D0, 0);
  assert.equal(c.state.streak, 5);
  assert.equal(c.effects.restoredFromFading, true);
  assert.equal(c.state.commitmentState, 'active');
});

test('settle: missing another day while fading resets and stashes the run for repair', () => {
  const faded = settle(st(4, D0 - 2), D0, 0).state;
  const next = settle(faded, D0 + 1, 0);
  assert.equal(next.state.streak, 0);
  assert.equal(next.effects.lostStreak, 4);
  assert.equal(next.state.maxStreak, 4);
});

test('a week away through a still-valid token resets instead of adding a day (old bug)', () => {
  const r = credit(st(12, D0 - 7), D0, 0);
  assert.equal(r.effects.lostStreak, 12);
  assert.equal(r.state.streak, 1, 'today still counts as day one of the new run');
});

test('a lost 1-day streak is not offered for repair', () => {
  const r = settle(st(1, D0 - 3), D0, 0);
  assert.equal(r.state.streak, 0);
  assert.equal(r.effects.lostStreak, 0);
});
