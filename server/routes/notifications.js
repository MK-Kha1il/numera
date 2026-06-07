// User notifications: list (most recent 50), mark-read (single or all), per-user channel
// preferences, and a one-click email unsubscribe (no auth — signed token).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { getPrefs, DEFAULT_PREFS, verifyUnsub } = require('../services/notificationService');

const router = express.Router();

const nowSec = () => Math.floor(Date.now() / 1000);

router.get('/api/notifications', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, title, message, type, read_state, created_at
     FROM user_notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.post('/api/notifications/read', authenticateToken, (req, res) => {
  const { notificationId } = req.body;
  if (notificationId) {
    db.run(
      `UPDATE user_notifications SET read_state = 1 WHERE user_id = ? AND id = ?`,
      [req.user.id, notificationId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  } else {
    db.run(
      `UPDATE user_notifications SET read_state = 1 WHERE user_id = ?`,
      [req.user.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// Per-user notification preferences (channels, quiet hours, timezone). Lazy-defaulted.
router.get('/api/notifications/preferences', authenticateToken, async (req, res) => {
  try {
    const prefs = await getPrefs(req.user.id);
    res.json(prefs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/notifications/preferences', authenticateToken, async (req, res) => {
  // Partial updates are safe: merge the provided whitelisted fields onto the user's CURRENT
  // prefs (not the defaults), so a single-field update (e.g. tz-only on app load, or toggling
  // one switch) never clobbers the others.
  const allowed = ['email_enabled', 'email_lifecycle', 'push_enabled', 'quiet_hours_start', 'quiet_hours_end', 'tz_offset_minutes'];
  const current = await getPrefs(req.user.id);
  const merged = { ...DEFAULT_PREFS, ...current };
  for (const k of allowed) {
    if (req.body[k] !== undefined) merged[k] = parseInt(req.body[k], 10) || 0;
  }
  db.run(
    `INSERT INTO notification_preferences
       (user_id, email_enabled, email_lifecycle, push_enabled, quiet_hours_start, quiet_hours_end, tz_offset_minutes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       email_enabled = excluded.email_enabled,
       email_lifecycle = excluded.email_lifecycle,
       push_enabled = excluded.push_enabled,
       quiet_hours_start = excluded.quiet_hours_start,
       quiet_hours_end = excluded.quiet_hours_end,
       tz_offset_minutes = excluded.tz_offset_minutes,
       updated_at = excluded.updated_at`,
    [req.user.id, merged.email_enabled, merged.email_lifecycle, merged.push_enabled, merged.quiet_hours_start, merged.quiet_hours_end, merged.tz_offset_minutes, nowSec()],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, preferences: { user_id: req.user.id, ...merged } });
    }
  );
});

// One-click email unsubscribe. No auth: authorization is the signed token in the link. Turns off
// lifecycle email only (transactional mail is unaffected). Returns a tiny HTML confirmation.
router.get('/api/notifications/unsubscribe', (req, res) => {
  const userId = verifyUnsub(req.query.token);
  if (!userId) return res.status(400).send('Invalid or expired unsubscribe link.');
  db.run(
    `INSERT INTO notification_preferences (user_id, email_lifecycle, updated_at)
     VALUES (?, 0, ?)
     ON CONFLICT(user_id) DO UPDATE SET email_lifecycle = 0, updated_at = excluded.updated_at`,
    [userId, nowSec()],
    (err) => {
      if (err) return res.status(500).send('Could not update your preferences. Please try again.');
      res.set('Content-Type', 'text/html').send(
        '<html><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>You\'re unsubscribed</h2><p>You will no longer receive Numera reminder emails. You can re-enable them any time in Settings.</p></body></html>'
      );
    }
  );
});

module.exports = router;
