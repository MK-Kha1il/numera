// Notification funnel (see docs/specs/Spec-LifecycleNotifications.md).
//
// A single `notify()` entry point so any notification can fan out to multiple channels while
// honoring user preferences, consent, minor-safety defaults, and idempotency:
//   - in-app  : always available (writes the existing user_notifications row).
//   - email   : gated by prefs + a non-empty address + adult + (for analytics-bearing
//               categories) telemetry_enabled. Sent via services/mailer.js.
//   - push    : no-op interface for now; the push phase fills pushChannel.send().
//
// Idempotency: when a caller passes `dedupKey`, every channel send is recorded in
// notification_log under UNIQUE(user_id, dedup_key); a second attempt in the same window is
// skipped. Event notifications (friend request, level-up, …) pass no dedupKey and always write.
//
// This module is callback-DB based like the rest of the routes/services, wrapped in small
// promise helpers so notify() can be awaited from the lifecycle sweeper.
'use strict';

const crypto = require('crypto');
const { db } = require('../db');
const logger = require('../logger');
const { sendMail } = require('./mailer');
const { JWT_SECRET, APP_BASE_URL } = require('../config');

const nowSec = () => Math.floor(Date.now() / 1000);

// Defaults applied when a user has no notification_preferences row yet. Privacy-respecting:
// lifecycle email is on for adults (legitimate service reminder) but blocked for minors below.
const DEFAULT_PREFS = {
  email_enabled: 1,
  email_lifecycle: 1,
  push_enabled: 0,
  quiet_hours_start: 21,
  quiet_hours_end: 8,
  tz_offset_minutes: 0,
};

// ── small promise helpers ────────────────────────────────────────────────────
function getPrefs(userId) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM notification_preferences WHERE user_id = ?', [userId], (err, row) => {
      resolve(row || { user_id: userId, ...DEFAULT_PREFS });
    });
  });
}

function getUser(userId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT id, username, email, birth_year, telemetry_enabled FROM users WHERE id = ?',
      [userId],
      (err, row) => resolve(row || null)
    );
  });
}

function writeInApp(userId, { title, message, type }) {
  return new Promise((resolve) => {
    db.run(
      `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
      [userId, title, message, type || 'info', nowSec()],
      () => resolve()
    );
  });
}

// Claim a one-shot send slot. Resolves true if this (user, dedupKey) was newly inserted,
// false if it already existed (UNIQUE) or on any error — in both failure cases we skip sending.
function claimDedup(userId, category, channel, dedupKey) {
  return new Promise((resolve) => {
    db.run(
      'INSERT INTO notification_log (user_id, category, channel, dedup_key, sent_at) VALUES (?, ?, ?, ?, ?)',
      [userId, category, channel, dedupKey, nowSec()],
      (err) => resolve(!err)
    );
  });
}

// ── consent / eligibility ────────────────────────────────────────────────────
function isMinor(user) {
  // birth_year is the year-only age signal from the registration age gate. Unknown (legacy
  // accounts) is treated as adult — the signup gate already blocks under-13, and gating all
  // birth-year-less accounts out of lifecycle email would gut the feature for existing users.
  if (!user || !user.birth_year) return false;
  const age = new Date().getUTCFullYear() - user.birth_year;
  return age < 18;
}

// True if the user's local time is inside their quiet-hours window. Used to suppress push
// (the only interruptive channel) — email/in-app are not time-sensitive. Window may wrap
// midnight (e.g. start 21, end 8). tz_offset_minutes is the client-reported UTC offset.
function isQuietHours(prefs) {
  if (!prefs) return false;
  const { quiet_hours_start: start, quiet_hours_end: end, tz_offset_minutes: tz } = prefs;
  if (start == null || end == null || start === end) return false;
  const localHour = Math.floor(((Date.now() / 3600000 + (tz || 0) / 60) % 24 + 24) % 24);
  return start < end ? localHour >= start && localHour < end : localHour >= start || localHour < end;
}

function emailAllowed(user, prefs, requiresTelemetry) {
  if (!user || !user.email) return false;
  if (prefs.email_enabled !== 1) return false;
  if (prefs.email_lifecycle !== 1) return false;
  if (isMinor(user)) return false; // high-privacy default for minors (Children's Code)
  if (requiresTelemetry && user.telemetry_enabled !== 1) return false;
  return true;
}

// ── email channel ────────────────────────────────────────────────────────────
function buildEmail(user, { title, message }) {
  const unsub = unsubscribeUrl(user.id);
  const footer = unsub
    ? `\n\n—\nYou're receiving Numera reminders. Turn them off any time: ${unsub}`
    : `\n\n—\nYou can turn off Numera reminders in Settings → Notifications.`;
  return {
    to: user.email,
    subject: title,
    text: `Hi ${user.username},\n\n${message}${footer}`,
  };
}

async function emailSend(user, payload) {
  const msg = buildEmail(user, payload);
  await sendMail(msg); // never throws (mailer logs delivery failures)
}

// ── the funnel ───────────────────────────────────────────────────────────────
/**
 * @param {number} userId
 * @param {object} opts
 * @param {string} [opts.category]    grouping key for dedup/log (e.g. 'streak_risk').
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {string} [opts.type]        in-app type tag (levelup, social, reward, info, …).
 * @param {string[]} [opts.channels]  subset of ['inapp','email','push'].
 * @param {string} [opts.dedupKey]    when set, each channel sends at most once per (user,key).
 * @param {boolean} [opts.requiresTelemetry] gate email on telemetry_enabled (analytics-bearing copy).
 * @param {object} [opts.user]        preloaded user row (avoids a re-fetch from the sweeper).
 */
async function notify(userId, opts) {
  const {
    category = 'general',
    title,
    message,
    type = 'info',
    channels = ['inapp'],
    dedupKey = null,
    requiresTelemetry = false,
  } = opts;

  const needsUser = channels.some((c) => c !== 'inapp');
  const user = needsUser ? opts.user || (await getUser(userId)) : null;
  const prefs = needsUser ? await getPrefs(userId) : null;

  for (const channel of channels) {
    try {
      if (channel === 'email' && !emailAllowed(user, prefs, requiresTelemetry)) continue;
      if (channel === 'push' && (!prefs || prefs.push_enabled !== 1 || isQuietHours(prefs))) continue;

      if (dedupKey) {
        const claimed = await claimDedup(userId, category, channel, `${category}:${channel}:${dedupKey}`);
        if (!claimed) continue;
      }

      if (channel === 'inapp') await writeInApp(userId, { title, message, type });
      else if (channel === 'email') await emailSend(user, { title, message, category });
      // 'push' is intentionally a no-op until the push phase wires pushChannel.send().
    } catch (err) {
      logger.warn(`[notify] channel=${channel} user=${userId} failed: ${err.message}`);
    }
  }
}

// ── unsubscribe token (one-click, no auth) ───────────────────────────────────
// Stateless signed token: base64url(userId).hmac. Lets an email footer link flip
// email_lifecycle off without a login. Not security-sensitive beyond "can disable my own
// reminders", so a short HMAC over JWT_SECRET is sufficient.
function signUnsub(userId) {
  const body = Buffer.from(String(userId)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url').slice(0, 24);
  return `${body}.${sig}`;
}

function verifyUnsub(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(body).digest('base64url').slice(0, 24);
  if (sig !== expected) return null;
  const userId = parseInt(Buffer.from(body, 'base64url').toString('utf8'), 10);
  return Number.isInteger(userId) ? userId : null;
}

function unsubscribeUrl(userId) {
  if (!APP_BASE_URL) return null;
  return `${APP_BASE_URL.replace(/\/$/, '')}/api/notifications/unsubscribe?token=${signUnsub(userId)}`;
}

module.exports = {
  notify,
  getPrefs,
  DEFAULT_PREFS,
  isMinor,
  isQuietHours,
  signUnsub,
  verifyUnsub,
  unsubscribeUrl,
};
