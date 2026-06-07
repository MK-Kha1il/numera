// Lifecycle & notification system: the funnel (dedup + consent/minor gating), the preference
// + unsubscribe routes, and the lifecycle sweep (streak/winback triggers). Boots the real app
// against a throwaway DB and drives the sweep directly (the background timer is server-only).
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { notify, signUnsub, verifyUnsub, isQuietHours } = require('../services/notificationService');
const { sweepOnce } = require('../services/lifecycleJobs');
const mailer = require('../services/mailer');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

// ---- tiny promisified DB helpers over the test connection -------------------------
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbAll = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const idOf = async (username) => (await dbGet('SELECT id FROM users WHERE username = ?', [username])).id;

const DAY = 86400;
const yesterdayStart = () => (Math.floor(Date.now() / 1000 / DAY) - 1) * DAY + 100;
const daysAgoStart = (n) => (Math.floor(Date.now() / 1000 / DAY) - n) * DAY + 100;

// ---- Unit: unsubscribe token round-trips and rejects tampering --------------------
test('unsubscribe token signs and verifies; tamper is rejected', () => {
  const token = signUnsub(4242);
  assert.equal(verifyUnsub(token), 4242);
  assert.equal(verifyUnsub(token + 'x'), null, 'tampered signature must fail');
  assert.equal(verifyUnsub('garbage'), null);
  assert.equal(verifyUnsub(null), null);
});

// ---- Unit: quiet-hours window (incl. midnight wrap) ------------------------------
test('isQuietHours respects a midnight-wrapping window and the local offset', () => {
  // Pick a tz offset that puts local time at ~02:00 (inside a 21:00–08:00 window).
  const utcHour = new Date().getUTCHours();
  const offsetToLocal2am = (2 - utcHour) * 60; // minutes to shift UTC -> 02:00 local
  const night = { quiet_hours_start: 21, quiet_hours_end: 8, tz_offset_minutes: offsetToLocal2am };
  assert.equal(isQuietHours(night), true, '02:00 is inside 21:00–08:00');
  const offsetToLocal1pm = (13 - utcHour) * 60;
  const day = { quiet_hours_start: 21, quiet_hours_end: 8, tz_offset_minutes: offsetToLocal1pm };
  assert.equal(isQuietHours(day), false, '13:00 is outside 21:00–08:00');
  assert.equal(isQuietHours({ quiet_hours_start: 9, quiet_hours_end: 9 }), false, 'empty window');
  assert.equal(isQuietHours(null), false);
});

// ---- Funnel: dedupKey makes a notification at-most-once per window ----------------
test('notify() with a dedupKey writes the in-app row only once', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  const opts = { category: 'unit_dedup', title: 'Once', message: 'Only once', channels: ['inapp'], dedupKey: '2026-01-01' };
  await notify(id, opts);
  await notify(id, opts); // replay — should be suppressed by notification_log UNIQUE
  const rows = await dbAll('SELECT * FROM user_notifications WHERE user_id = ? AND title = ?', [id, 'Once']);
  assert.equal(rows.length, 1, 'second identical notify must be deduped');
});

// ---- Funnel: email is gated on having an address + adult --------------------------
test('notify() email goes to an adult with an address, and is skipped for a minor', async () => {
  // Adult with email -> email is attempted.
  const adult = await registerUser(ctx.base);
  const adultId = await idOf(adult.username);
  const adultEmail = `adult_${adultId}@example.test`;
  await dbRun('UPDATE users SET email = ?, birth_year = 1995 WHERE id = ?', [adultEmail, adultId]);
  await notify(adultId, { category: 'unit_email', title: 'Hi adult', message: 'body', channels: ['email'], dedupKey: 'e1' });
  assert.ok(mailer.sentMessages.some((m) => m.to === adultEmail), 'adult with email should receive lifecycle email');

  // Minor with email -> blocked (high-privacy default).
  const minor = await registerUser(ctx.base);
  const minorId = await idOf(minor.username);
  const minorEmail = `minor_${minorId}@example.test`;
  await dbRun('UPDATE users SET email = ?, birth_year = ? WHERE id = ?', [minorEmail, new Date().getUTCFullYear() - 10, minorId]);
  await notify(minorId, { category: 'unit_email', title: 'Hi minor', message: 'body', channels: ['email'], dedupKey: 'e2' });
  assert.ok(!mailer.sentMessages.some((m) => m.to === minorEmail), 'minor must not receive lifecycle email');
});

// ---- Sweep: a streak-at-risk user gets an in-app + email reminder -----------------
test('lifecycle sweep fires streak_risk for a user active yesterday with a streak', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  const email = `streak_${id}@example.test`;
  await dbRun('UPDATE users SET email = ?, birth_year = 1990, streak = 5, last_active = ? WHERE id = ?', [email, yesterdayStart(), id]);

  await sweepOnce(ctx.mod.db);

  // Query the streak note specifically (other triggers, e.g. the Sunday weekly recap, may also fire).
  const note = await dbGet("SELECT * FROM user_notifications WHERE user_id = ? AND title LIKE '%streak%'", [id]);
  assert.ok(note, 'expected a streak reminder in-app');
  const log = await dbGet("SELECT * FROM notification_log WHERE user_id = ? AND category = 'streak_risk' AND channel = 'inapp'", [id]);
  assert.ok(log, 'streak_risk should be recorded in notification_log');
  assert.ok(mailer.sentMessages.some((m) => m.to === email), 'streak reminder should also email an adult');

  // Re-running the sweep must not double-send (same-day dedup).
  const before = (await dbAll('SELECT id FROM user_notifications WHERE user_id = ?', [id])).length;
  await sweepOnce(ctx.mod.db);
  const after = (await dbAll('SELECT id FROM user_notifications WHERE user_id = ?', [id])).length;
  assert.equal(after, before, 'a second sweep on the same day must be deduped');
});

// ---- Sweep: a lapsed minor gets the in-app nudge but no email --------------------
test('lifecycle sweep nudges a lapsed minor in-app but never emails them', async () => {
  const u = await registerUser(ctx.base);
  const id = await idOf(u.username);
  const email = `lapsedminor_${id}@example.test`;
  await dbRun('UPDATE users SET email = ?, birth_year = ?, streak = 0, last_active = ? WHERE id = ?', [email, new Date().getUTCFullYear() - 11, daysAgoStart(3), id]);

  await sweepOnce(ctx.mod.db);

  const log = await dbGet("SELECT * FROM notification_log WHERE user_id = ? AND category = 'winback_d3' AND channel = 'inapp'", [id]);
  assert.ok(log, 'winback_d3 in-app should fire for a 3-day-lapsed user');
  assert.ok(!mailer.sentMessages.some((m) => m.to === email), 'a minor must not be emailed');
});

// ---- Routes: preferences round-trip and unsubscribe turns lifecycle email off ----
test('preferences GET/POST round-trip, and unsubscribe disables lifecycle email', async () => {
  const u = await registerUser(ctx.base);

  const initial = await api(ctx.base, 'GET', '/api/notifications/preferences', { token: u.token });
  assert.equal(initial.status, 200);
  assert.equal(initial.body.email_lifecycle, 1, 'defaults to lifecycle-on');

  const upd = await api(ctx.base, 'POST', '/api/notifications/preferences', { token: u.token, body: { email_lifecycle: 0, quiet_hours_start: 22 } });
  assert.equal(upd.status, 200);
  const after = await api(ctx.base, 'GET', '/api/notifications/preferences', { token: u.token });
  assert.equal(after.body.email_lifecycle, 0);
  assert.equal(after.body.quiet_hours_start, 22);

  // Partial update must not clobber other fields: toggling email_lifecycle leaves quiet hours at 22.
  await api(ctx.base, 'POST', '/api/notifications/preferences', { token: u.token, body: { email_lifecycle: 1 } });
  const partial = await api(ctx.base, 'GET', '/api/notifications/preferences', { token: u.token });
  assert.equal(partial.body.quiet_hours_start, 22, 'a single-field update must preserve the others');
  const id = await idOf(u.username);
  const unsub = await api(ctx.base, 'GET', `/api/notifications/unsubscribe?token=${signUnsub(id)}`);
  assert.equal(unsub.status, 200);
  const final = await api(ctx.base, 'GET', '/api/notifications/preferences', { token: u.token });
  assert.equal(final.body.email_lifecycle, 0, 'unsubscribe link must disable lifecycle email');
});
