// Account management: password/username/email changes, privacy prefs, active sessions,
// per-user security logs, GDPR data export, account deletion, and the admin log view.
//
// NOTE: these specific /api/user/* routes are intentionally mounted BEFORE the
// /api/user/:userId public-profile route so they are not shadowed by the param route
// (which rejects non-numeric ids with 400). Keep this router mounted ahead of that route.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const { rateLimiter } = require('../middleware/rateLimit');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../lib/passwords');
const { sendMail } = require('../services/mailer');
const logger = require('../logger');

const router = express.Router();

router.post('/api/user/settings', authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  const strength = validatePasswordStrength(newPassword, req.user.username);
  if (!strength.ok) {
    return res.status(400).json({ error: strength.error });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await verifyPassword(user.password_hash, oldPassword);
    if (!isMatch) {
      securityLog(req.user.id, 'auth_failure', req.ip, 'Invalid old password during password change attempt.');
      return res.status(401).json({ error: 'Invalid old password' });
    }

    let newHash;
    try {
      newHash = await hashPassword(newPassword);
    } catch {
      return res.status(500).json({ error: 'Failed to secure password.' });
    }

    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id], (errUpdate) => {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });

      // Stateful session invalidation: delete all active sessions for the user to force relogin
      db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id], (errSessions) => {
        if (errSessions) logger.error('[SECURITY] Failed to invalidate sessions on password change:', errSessions.message);
        securityLog(req.user.id, 'password_changed', req.ip, 'Password changed successfully. All user sessions invalidated.');
        res.json({ success: true, message: 'Password updated successfully. All other sessions have been invalidated.' });
      });
    });
  });
});

router.post('/api/user/change-username', authenticateToken, (req, res) => {
  const { username } = req.body;
  // Same strict charset rule as registration — previously this accepted any characters and a
  // looser length, an inconsistency that let a username bypass the signup validation.
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!username || !usernameRegex.test(username.trim())) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
    });
  }
  const cleanUsername = username.trim();
  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Username is already taken.' });

    db.run('UPDATE users SET username = ? WHERE id = ?', [cleanUsername, req.user.id], (errUpdate) => {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });
      securityLog(req.user.id, 'username_changed', req.ip, `Username updated from ${req.user.username} to ${cleanUsername}`);
      res.json({ success: true, message: 'Username updated successfully!', username: cleanUsername });
    });
  });
});

// Verification window + brute-force ceiling for the 6-digit code. 10 min expiry + a hard
// 5-attempt cap makes the 10^6 space infeasible to grind before the code rotates/locks.
const EMAIL_CODE_TTL_SECS = 10 * 60;
const EMAIL_CODE_MAX_ATTEMPTS = 5;

router.post('/api/user/change-email/request', authenticateToken, rateLimiter(5, 15 * 60 * 1000), (req, res) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const cleanEmail = email.trim().toLowerCase();

  // Cryptographically-random 6-digit code (crypto.randomInt, not Math.random which is not
  // unpredictable). attempts reset to 0 on each new request.
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT OR REPLACE INTO user_email_verifications (user_id, new_email, code, created_at, attempts)
     VALUES (?, ?, ?, ?, 0)`,
    [req.user.id, cleanEmail, code, now],
    async (err) => {
      if (err) return res.status(500).json({ error: err.message });

      // Delivered via the mailer (real SMTP in prod, logged in dev) — NEVER returned in the
      // response. Returning it previously made the whole verification step a no-op.
      await sendMail({
        to: cleanEmail,
        subject: 'Verify your Numera email address',
        text: `Your Numera email verification code is:\n\n    ${code}\n\nIt expires in 10 minutes.`,
      });
      securityLog(req.user.id, 'email_verification_requested', req.ip, `Verification requested for ${cleanEmail}.`);
      res.json({ success: true, message: 'A verification code has been sent to your email address.' });
    }
  );
});

router.post('/api/user/change-email/verify', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required.' });

  db.get('SELECT * FROM user_email_verifications WHERE user_id = ?', [req.user.id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(400).json({ error: 'No verification request pending.' });

    const now = Math.floor(Date.now() / 1000);
    if (now - record.created_at > EMAIL_CODE_TTL_SECS) {
      db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [req.user.id]);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }
    if ((record.attempts || 0) >= EMAIL_CODE_MAX_ATTEMPTS) {
      db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [req.user.id]);
      securityLog(req.user.id, 'verification_failure', req.ip, 'Email verification locked: too many invalid attempts.');
      return res.status(429).json({ error: 'Too many invalid attempts. Please request a new code.' });
    }

    // Constant-time compare to avoid leaking how many leading digits matched.
    const provided = Buffer.from(code.trim().padStart(6, '0'));
    const expected = Buffer.from(String(record.code).padStart(6, '0'));
    const matches = provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
    if (!matches) {
      db.run('UPDATE user_email_verifications SET attempts = attempts + 1 WHERE user_id = ?', [req.user.id]);
      securityLog(req.user.id, 'verification_failure', req.ip, 'Invalid email verification code entered.');
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    db.serialize(() => {
      db.run('UPDATE users SET email = ? WHERE id = ?', [record.new_email, req.user.id]);
      db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [req.user.id]);

      securityLog(req.user.id, 'email_changed', req.ip, `Email changed successfully to ${record.new_email}.`);
      res.json({ success: true, message: 'Email address updated successfully!', email: record.new_email });
    });
  });
});

router.post('/api/user/privacy', authenticateToken, (req, res) => {
  const { telemetryEnabled, profilePrivate } = req.body;
  const telVal = telemetryEnabled ? 1 : 0;
  const privVal = profilePrivate ? 1 : 0;

  db.run(
    'UPDATE users SET telemetry_enabled = ?, profile_private = ? WHERE id = ?',
    [telVal, privVal, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      securityLog(req.user.id, 'privacy_settings_updated', req.ip, `Telemetry: ${telemetryEnabled}, Private Profile: ${profilePrivate}`);
      res.json({ success: true, message: 'Privacy preferences saved successfully.' });
    }
  );
});

router.get('/api/user/sessions', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, user_id, user_agent, ip_address, created_at, expires_at
     FROM user_sessions
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const currentSessionId = req.user.sessionId;
      const mapped = (rows || []).map((row) => ({
        ...row,
        is_current: row.id === currentSessionId,
      }));
      res.json(mapped);
    }
  );
});

router.post('/api/user/sessions/revoke', authenticateToken, (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required.' });

  db.run('DELETE FROM user_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Session not found.' });

    securityLog(req.user.id, 'session_revoked', req.ip, `Session ${sessionId} was revoked by the user.`);
    res.json({ success: true, message: 'Session revoked successfully.' });
  });
});

router.get('/api/user/security-logs', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, timestamp, event_type, ip_address, details
     FROM security_audit_logs
     WHERE user_id = ?
     ORDER BY timestamp DESC
     LIMIT 100`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.get('/api/user/export-data', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const exportedData = {};

  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    exportedData.profile = {
      username: user.username,
      email: user.email,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      rank: user.rank,
      streak: user.streak,
      active_badge: user.active_badge,
      theme: user.theme,
      avatar: user.avatar,
      solved_count: user.solved_count,
      arena_wins: user.arena_wins,
      active_banner: user.active_banner,
    };

    db.all('SELECT item_id FROM user_inventory WHERE user_id = ?', [userId], (errInv, inv) => {
      exportedData.inventory = (inv || []).map((i) => i.item_id);

      db.all('SELECT topic, ease_factor, interval, repetitions FROM srs_reviews WHERE user_id = ?', [userId], (errSrs, srs) => {
        exportedData.srs_reviews = srs || [];

        db.all('SELECT category, question, correct_answer FROM user_mistakes WHERE user_id = ?', [userId], (errMist, mistakes) => {
          exportedData.mistakes = mistakes || [];

          db.all('SELECT title, category, question FROM saved_exercises WHERE user_id = ?', [userId], (errFav, favs) => {
            exportedData.favorites = favs || [];

            db.all('SELECT timestamp, event_type, details FROM security_audit_logs WHERE user_id = ?', [userId], (errLogs, logs) => {
              exportedData.security_logs = logs || [];

              securityLog(userId, 'data_exported', req.ip, 'User requested GDPR-compliant account data export.');

              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Content-Disposition', 'attachment; filename=numera_user_data.json');
              res.json(exportedData);
            });
          });
        });
      });
    });
  });
});

router.post('/api/user/delete-account', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.serialize(() => {
    db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    db.run('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);
    db.run('DELETE FROM user_utilities WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_inventory WHERE user_id = ?', [userId]);
    db.run('DELETE FROM srs_reviews WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_mistakes WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_quests WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_mastery WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_concept_analytics WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_commitment_history WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_commitment_relics WHERE user_id = ?', [userId]);
    db.run('DELETE FROM saved_exercises WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_notifications WHERE user_id = ?', [userId]);
    db.run('DELETE FROM security_audit_logs WHERE user_id = ?', [userId]);
    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Account deleted successfully. All data wiped.' });
    });
  });
});

// -------------------------------------------------------------
// ADMIN
// -------------------------------------------------------------
router.get('/api/admin/security-logs', authenticateToken, (req, res) => {
  if (req.user.username !== 'admin') {
    securityLog(req.user.id, 'unauthorized_admin_access', req.ip, `Non-admin user attempted to access security logs.`);
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  db.all(
    `SELECT sl.id, sl.timestamp, sl.user_id, u.username, sl.event_type, sl.ip_address, sl.details
     FROM security_audit_logs sl
     LEFT JOIN users u ON sl.user_id = u.id
     ORDER BY sl.timestamp DESC
     LIMIT 500`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
