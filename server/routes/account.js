// Account management: password/username/email changes, privacy prefs, active sessions,
// per-user security logs, GDPR data export, account deletion, and the admin log view.
//
// NOTE: these specific /api/user/* routes are intentionally mounted BEFORE the
// /api/user/:userId public-profile route so they are not shadowed by the param route
// (which rejects non-numeric ids with 400). Keep this router mounted ahead of that route.
const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');

const router = express.Router();

router.post('/api/user/settings', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (newPassword.length < 8 || newPassword.length > 100) {
    return res.status(400).json({ error: 'New password must be between 8 and 100 characters' });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isMatch) {
      securityLog(req.user.id, 'auth_failure', req.ip, 'Invalid old password during password change attempt.');
      return res.status(401).json({ error: 'Invalid old password' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id], (errUpdate) => {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });

      // Stateful session invalidation: delete all active sessions for the user to force relogin
      db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id], (errSessions) => {
        if (errSessions) console.error('[SECURITY] Failed to invalidate sessions on password change:', errSessions.message);
        securityLog(req.user.id, 'password_changed', req.ip, 'Password changed successfully. All user sessions invalidated.');
        res.json({ success: true, message: 'Password updated successfully. All other sessions have been invalidated.' });
      });
    });
  });
});

router.post('/api/user/change-username', authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 3 || username.trim().length > 25) {
    return res.status(400).json({ error: 'Username must be between 3 and 25 characters.' });
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

router.post('/api/user/change-email/request', authenticateToken, (req, res) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const cleanEmail = email.trim().toLowerCase();

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT OR REPLACE INTO user_email_verifications (user_id, new_email, code, created_at)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, cleanEmail, code, now],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });

      console.log(`[EMAIL VERIFICATION] Sent to user ${req.user.id} (${cleanEmail}): ${code}`);
      res.json({ success: true, message: 'Verification code sent!', code: code });
    }
  );
});

router.post('/api/user/change-email/verify', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required.' });

  db.get('SELECT * FROM user_email_verifications WHERE user_id = ?', [req.user.id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(400).json({ error: 'No verification request pending.' });

    if (record.code !== code.trim()) {
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
