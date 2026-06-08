// Account management: password/username/email changes, privacy prefs, active sessions,
// per-user security logs, GDPR data export, account deletion, and the admin log view.
//
// NOTE: these specific /api/user/* routes are intentionally mounted BEFORE the
// /api/user/:userId public-profile route so they are not shadowed by the param route
// (which rejects non-numeric ids with 400). Keep this router mounted ahead of that route.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const { rateLimiter } = require('../middleware/rateLimit');
const { hashPassword, verifyPassword, validatePasswordStrength } = require('../lib/passwords');
const { checkText } = require('../lib/contentFilter');
const { sendMail } = require('../services/mailer');
const logger = require('../logger');

// Every table that holds rows keyed to a user. The single source of truth for "delete-account"
// and for the deletion-completeness test (test/account_deletion.test.js asserts no residual rows
// across all of these). Append here whenever a new user-scoped table is added. The `users` row
// itself is deleted last (after these) so FK references are cleared first.
const USER_SCOPED_TABLES = [
  'user_email_verifications',
  'password_reset_tokens',
  'user_mfa_recovery_codes',
  'refresh_tokens',
  'user_sessions',
  'user_utilities',
  'user_inventory',
  'srs_reviews',
  'user_mistakes',
  'user_quests',
  'user_mastery',
  'user_achievements',
  'user_calculator_analytics',
  'user_concept_analytics',
  'user_commitment_history',
  'user_commitment_relics',
  'saved_exercises',
  'saved_collections',
  'user_notifications',
  'security_audit_logs',
  'idempotency_keys',
  'user_ratings',
  'rating_history',
  'smurf_signals',
  'learning_velocity',
  'tilt_tracking',
  'season_ratings',
  'learner_profiles',
  'user_misconceptions',
  'retention_schedule',
  'learning_style_signals',
  'competitive_profiles',
  'notification_preferences',
  'notification_log',
  'push_tokens',
  'puzzle_rush_runs',
  'diagnostic_sessions',
  'user_goals',
  'concept_posts',
  'concept_post_votes',
  'bot_matches',
  'club_members',
  'challenge_attempts',
  'tournament_entries',
  'club_war_entries',
];

const router = express.Router();

// ── Learning goals (audit #2/#19) ───────────────────────────────────────────────
// One explicit, learner-CHOSEN goal — closing the personalization loop (the app measured plenty
// but let the learner set nothing). One active goal per user (PRIMARY KEY user_id = upsert).
// Progress is derived from existing stats ON READ, so there's no stored progress to keep in sync.
const GOAL_TYPES = {
  daily_problems: { label: 'Solve problems every day', unit: 'problems/day', min: 1, max: 100 },
  reach_level: { label: 'Reach a level', unit: 'level', min: 2, max: 50 },
  streak: { label: 'Build a daily streak', unit: 'days', min: 2, max: 365 },
};
const goalTypeMeta = () =>
  Object.entries(GOAL_TYPES).map(([key, m]) => ({ key, label: m.label, unit: m.unit, min: m.min, max: m.max }));
const todayStr = () => new Date().toISOString().slice(0, 10);

// Current progress value for a goal type (raw count; capping/percent is the client's concern).
function goalProgress(userId, goalType) {
  return new Promise((resolve) => {
    if (goalType === 'reach_level') {
      db.get('SELECT level FROM users WHERE id = ?', [userId], (e, r) => resolve(r ? r.level || 0 : 0));
    } else if (goalType === 'streak') {
      db.get('SELECT streak FROM users WHERE id = ?', [userId], (e, r) => resolve(r ? r.streak || 0 : 0));
    } else {
      // daily_problems — today's solved count from the daily commitment history.
      db.get(
        'SELECT solved_count FROM user_commitment_history WHERE user_id = ? AND date = ?',
        [userId, todayStr()],
        (e, r) => resolve(r ? r.solved_count || 0 : 0)
      );
    }
  });
}

router.get('/api/account/goal', authenticateToken, (req, res) => {
  db.get('SELECT goal_type, target_value, created_at FROM user_goals WHERE user_id = ?', [req.user.id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ goal: null, types: goalTypeMeta() });
    const current = await goalProgress(req.user.id, row.goal_type);
    res.json({
      goal: {
        goalType: row.goal_type,
        targetValue: row.target_value,
        current,
        completed: current >= row.target_value,
        createdAt: row.created_at,
      },
      types: goalTypeMeta(),
    });
  });
});

router.put('/api/account/goal', authenticateToken, (req, res) => {
  const { goalType, targetValue } = req.body || {};
  const meta = GOAL_TYPES[goalType];
  if (!meta) return res.status(400).json({ error: 'Invalid goal type' });
  const tv = parseInt(targetValue, 10);
  if (!Number.isFinite(tv) || tv < meta.min || tv > meta.max) {
    return res.status(400).json({ error: `Target must be between ${meta.min} and ${meta.max}` });
  }
  db.run(
    `INSERT INTO user_goals (user_id, goal_type, target_value, created_at) VALUES (?,?,?,?)
       ON CONFLICT(user_id) DO UPDATE SET goal_type = excluded.goal_type,
                                          target_value = excluded.target_value,
                                          created_at = excluded.created_at`,
    [req.user.id, goalType, tv, Math.floor(Date.now() / 1000)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

router.delete('/api/account/goal', authenticateToken, (req, res) => {
  db.run('DELETE FROM user_goals WHERE user_id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

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
      db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user.id]);
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
  const nameCheck = checkText(cleanUsername, 'Username');
  if (!nameCheck.ok) {
    return res.status(400).json({ error: nameCheck.error });
  }
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

    db.run('DELETE FROM refresh_tokens WHERE session_id = ?', [sessionId]);
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

              // Behavioral / psychometric data held about the user — included so the export is a
              // COMPLETE Art 15/20 copy, not just the obvious account fields (see ComplianceAudit M1).
              const behavioralQueries = [
                ['learner_profiles', 'SELECT * FROM learner_profiles WHERE user_id = ?'],
                ['misconceptions', 'SELECT concept_id, misconception_type, misconception_label, frequency, severity FROM user_misconceptions WHERE user_id = ?'],
                ['retention_schedule', 'SELECT concept_id, stability_days, next_review_ts, review_count, lapse_count FROM retention_schedule WHERE user_id = ?'],
                ['learning_style_signals', 'SELECT style_type, signal_weight, sample_count FROM learning_style_signals WHERE user_id = ?'],
                ['concept_analytics', 'SELECT concept, success_rate, average_speed, hesitation_index, streak FROM user_concept_analytics WHERE user_id = ?'],
                ['calculator_analytics', 'SELECT category, level, question, template_type, game_mode, used_at FROM user_calculator_analytics WHERE user_id = ?'],
                ['ratings', 'SELECT domain, mu, sigma, display_rating, sessions_count FROM user_ratings WHERE user_id = ?'],
                ['rating_history', 'SELECT domain, display_before, display_after, delta, session_category, session_level, game_mode, created_at FROM rating_history WHERE user_id = ?'],
                ['competitive_profiles', 'SELECT concept_id, skill_rating, consistency_rating, learning_velocity_rating, match_count FROM competitive_profiles WHERE user_id = ?'],
                ['mastery', 'SELECT * FROM user_mastery WHERE user_id = ?'],
                ['achievements', 'SELECT achievement_id, progress, claimed, completed_at FROM user_achievements WHERE user_id = ?'],
                ['quests', 'SELECT * FROM user_quests WHERE user_id = ?'],
                ['commitment_history', 'SELECT date, solved_count FROM user_commitment_history WHERE user_id = ?'],
                ['notifications', 'SELECT title, message, type, read_state, created_at FROM user_notifications WHERE user_id = ?'],
                ['sessions', 'SELECT user_agent, ip_address, created_at, expires_at FROM user_sessions WHERE user_id = ?'],
              ];

              let qi = 0;
              const runNext = () => {
                if (qi >= behavioralQueries.length) {
                  securityLog(userId, 'data_exported', req.ip, 'User requested GDPR-compliant account data export.');
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Content-Disposition', 'attachment; filename=numera_user_data.json');
                  return res.json(exportedData);
                }
                const [key, sql] = behavioralQueries[qi++];
                db.all(sql, [userId], (qErr, rows) => {
                  exportedData[key] = qErr ? [] : rows || [];
                  runNext();
                });
              };
              runNext();
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
    // Relationship tables keyed by two user columns (delete rows on either side).
    db.run('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);
    db.run('DELETE FROM user_blocks WHERE blocker_id = ? OR blocked_id = ?', [userId, userId]);
    db.run('DELETE FROM content_reports WHERE reporter_id = ?', [userId]);
    db.run('DELETE FROM async_matches WHERE challenger_id = ? OR opponent_id = ?', [userId, userId]);
    // Challenges I authored (keyed by creator_id, not user_id). Others' attempts on them are left
    // orphaned-but-unreachable (the challenge row is gone, so no board ever queries them).
    db.run('DELETE FROM custom_challenges WHERE creator_id = ?', [userId]);

    // Every single-user-column table (the canonical list). Driven off USER_SCOPED_TABLES so this
    // can never silently drift out of sync with the schema again.
    for (const table of USER_SCOPED_TABLES) {
      db.run(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }

    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Account deleted successfully. All personal data has been erased.' });
    });
  });
});

// -------------------------------------------------------------
// ADMIN
// -------------------------------------------------------------
router.get('/api/admin/security-logs', authenticateToken, requireAdmin, (req, res) => {
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
