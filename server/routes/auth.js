// Authentication: register, login (with streak/commitment + quest/league reset on entry),
// logout (session revocation), and the authenticated /me snapshot.
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { notify } = require('../services/notificationService');
const {
  checkFailedLogins,
  rateLimiter,
  recordFailedLogin,
  clearFailedLogins,
  checkAccountLockout,
  recordAccountFailure,
  clearAccountFailures,
} = require('../middleware/rateLimit');
const { securityLog } = require('../middleware/security');
const { hashPassword, verifyPassword, needsRehash, validatePasswordStrength } = require('../lib/passwords');
const totp = require('../lib/totp');
const { getUserWithMastery, checkAndResetQuestsAndLeagues } = require('../services/userService');
const { sendMail } = require('../services/mailer');
const { checkText } = require('../lib/contentFilter');
const logger = require('../logger');

const router = express.Router();

const ACCESS_TOKEN_TTL = '15m'; // short-lived; clients refresh with the rotating refresh token
const MIN_AGE_YEARS = 13; // neutral age gate floor (see docs/ComplianceAudit.md C2)

// Compute age in whole years from an ISO 'YYYY-MM-DD' birth date, or null if unparseable.
function ageFromBirthDate(birthDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(birthDate || '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dob = new Date(Date.UTC(y, mo - 1, d));
  if (dob.getUTCFullYear() !== y || dob.getUTCMonth() !== mo - 1 || dob.getUTCDate() !== d) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - y;
  const beforeBirthday =
    now.getUTCMonth() < mo - 1 || (now.getUTCMonth() === mo - 1 && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}
const SESSION_TTL_SECS = 7 * 24 * 60 * 60; // absolute session + refresh-token lifetime
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Signs a short-lived access token for an existing session.
function signAccessToken(userId, username, sessionId) {
  return jwt.sign({ id: userId, username, sessionId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

// Mints a new opaque refresh token for a session, stores only its hash, returns the raw value.
function issueRefreshToken(sessionId, userId, cb) {
  const raw = crypto.randomBytes(32).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  db.run(
    'INSERT INTO refresh_tokens (session_id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [sessionId, userId, sha256(raw), now + SESSION_TTL_SECS, now],
    (err) => cb(err, raw)
  );
}

// Issues a session + access token + refresh token and returns
// { token, accessToken, refreshToken, user }. `token` aliases accessToken for back-compat with
// older clients that only read `.token`. Shared by register, login, and the MFA second factor.
function sendLoginResponse(userId, username, req, res) {
  const sessionId = crypto.randomUUID();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip;
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + SESSION_TTL_SECS;

  db.run(
    'INSERT INTO user_sessions (id, user_id, user_agent, ip_address, created_at, expires_at, last_used_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, userId, userAgent, ipAddress, createdAt, expiresAt, createdAt],
    (errSession) => {
      if (errSession) {
        logger.error('[SECURITY] Failed to write session to DB:', errSession.message);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      const accessToken = signAccessToken(userId, username, sessionId);
      clearFailedLogins(ipAddress);

      issueRefreshToken(sessionId, userId, (errR, refreshToken) => {
        if (errR) {
          logger.error('[SECURITY] Failed to write refresh token:', errR.message);
          return res.status(500).json({ error: 'Session creation failed' });
        }
        getUserWithMastery(userId, (errU, fullUser) => {
          if (errU) return res.status(500).json({ error: errU.message });
          res.json({ token: accessToken, accessToken, refreshToken, user: fullUser });
        });
      });
    }
  );
}

router.post('/api/auth/register', checkFailedLogins, rateLimiter(5, 60000), async (req, res) => {
  const { username, password, avatar, birthDate } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Neutral age gate (COPPA / Children's Code — see docs/ComplianceAudit.md C2). A date of birth
  // is required; accounts under MIN_AGE_YEARS are refused. We persist only the birth year.
  const age = ageFromBirthDate(birthDate);
  if (age === null) {
    return res.status(400).json({ error: 'A valid date of birth (YYYY-MM-DD) is required.' });
  }
  if (age < MIN_AGE_YEARS) {
    securityLog(null, 'registration_blocked_age', req.ip, `Signup refused: under ${MIN_AGE_YEARS}.`);
    return res.status(403).json({
      error: `You must be at least ${MIN_AGE_YEARS} years old to create an account.`,
      ageRestricted: true,
    });
  }
  const birthYear = Number(birthDate.slice(0, 4));

  // Strict alphanumeric/underscore regex validation & length check
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
    });
  }
  // Block offensive/impersonating usernames (UGC moderation — first line; reports back it up).
  const nameCheck = checkText(username, 'Username');
  if (!nameCheck.ok) {
    return res.status(400).json({ error: nameCheck.error });
  }
  const strength = validatePasswordStrength(password, username);
  if (!strength.ok) {
    return res.status(400).json({ error: strength.error });
  }

  let hash;
  try {
    hash = await hashPassword(password);
  } catch {
    return res.status(500).json({ error: 'Failed to secure password.' });
  }
  const chosenAvatar = avatar || 'avatar_pythagoras';
  const now = Math.floor(Date.now() / 1000);

  // telemetry_enabled = 0: behavioral analytics are OFF by default (opt-in), per GDPR Art 25
  // privacy-by-default and the Children's Code. The user can enable it later in privacy settings.
  db.run(
    `INSERT INTO users (username, password_hash, last_active, avatar, last_league_reset, birth_year, telemetry_enabled)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [username, hash, now, chosenAvatar, now, birthYear],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      const newUserId = this.lastID;
      // Initialize quests & mastery rows
      db.run('INSERT OR IGNORE INTO user_quests (user_id, last_quest_reset) VALUES (?, ?)', [newUserId, now], () => {
        db.run('INSERT OR IGNORE INTO user_mastery (user_id) VALUES (?)', [newUserId], () => {
          notify(newUserId, {
            category: 'welcome',
            title: 'Welcome to Numera! 🚀',
            message: 'Start your math journey by taking the diagnostic placement test or jump straight into Level 1!',
            type: 'welcome',
          }).then(() => sendLoginResponse(newUserId, username, req, res));
        });
      });
    }
  );
});

router.post('/api/auth/login', checkFailedLogins, checkAccountLockout, rateLimiter(10, 60000), (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  if (!username || !password) {
    recordFailedLogin(ipAddress);
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const passwordOk = user ? await verifyPassword(user.password_hash, password) : false;
    if (!passwordOk) {
      recordFailedLogin(ipAddress);
      // Per-account adaptive lockout: key on the attempted username so credential-stuffing a
      // single account is throttled even across rotating IPs (returns lockout state for logging).
      const lock = recordAccountFailure(username);
      securityLog(
        user ? user.id : null,
        lock.locked ? 'account_locked' : 'auth_failure',
        ipAddress,
        lock.locked
          ? `Account temporarily locked after ${lock.count} failed attempts for user: ${username}`
          : `Failed login attempt for user: ${username}`
      );
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    clearAccountFailures(username);

    // Transparent hash upgrade: legacy bcrypt -> argon2id on the way in. Best-effort; a failed
    // rehash never blocks the login.
    if (needsRehash(user.password_hash)) {
      hashPassword(password)
        .then((fresh) => db.run('UPDATE users SET password_hash = ? WHERE id = ?', [fresh, user.id]))
        .catch(() => {});
    }

    // MFA gate: a confirmed TOTP enrollment means the password alone does NOT mint a session.
    // Issue a short-lived challenge the client exchanges (with a TOTP or recovery code) at
    // /api/auth/mfa/login. No streak/session side effects happen until the second factor passes.
    if (user.mfa_enabled) {
      const challenge = jwt.sign({ id: user.id, username, purpose: 'mfa' }, JWT_SECRET, { expiresIn: '5m' });
      securityLog(user.id, 'mfa_challenge_issued', ipAddress, 'Password verified; awaiting MFA second factor.');
      return res.json({ mfaRequired: true, challenge });
    }

    finalizeLogin(user, username, req, res);
  });
});

// Post-password login finalize: streak/commitment update + session issuance. Shared by the
// normal login path and the MFA second-factor exchange so both apply identical side effects.
function finalizeLogin(user, username, req, res) {
  checkAndResetQuestsAndLeagues(user.id, () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSecs = 86400;

      if (user.last_active > 0) {
        const elapsed = now - user.last_active;
        if (elapsed > 2 * dayInSecs) {
          // Missed a day! Check if they have a streak shield
          db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [user.id], (errShield, shieldRow) => {
            const hasShield = shieldRow && shieldRow.quantity > 0;
            if (hasShield) {
              // Consume 1 shield, keep streak, set state = 'protected'
              db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_streak_shield'", [user.id], () => {
                db.run(
                  "UPDATE users SET commitment_state = 'protected', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              });
            } else {
              // No shield! They enter fading state (preserve the climb count for recovery)
              // If they were already in fading state or too much time has passed (> 3 days), they finally reset to 0.
              if (user.commitment_state === 'fading' || elapsed > 3 * dayInSecs) {
                db.run(
                  "UPDATE users SET streak = 0, commitment_state = 'active', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              } else {
                db.run(
                  "UPDATE users SET commitment_state = 'fading', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              }
            }
          });
        } else if (elapsed > dayInSecs) {
          // Showed up next day!
          const newStreak = user.streak + 1;
          db.run(
            'UPDATE users SET streak = ?, commitment_state = \'active\', last_active = ?, max_streak = CASE WHEN ? > max_streak THEN ? ELSE max_streak END WHERE id = ?',
            [newStreak, now, newStreak, newStreak, user.id],
            () => {
              sendLoginResponse(user.id, username, req, res);
            }
          );
        } else {
          // Logged in multiple times today
          db.run('UPDATE users SET last_active = ? WHERE id = ?', [now, user.id], () => {
            sendLoginResponse(user.id, username, req, res);
          });
        }
      } else {
        // First login
        db.run(
          "UPDATE users SET streak = 1, commitment_state = 'active', last_active = ?, max_streak = 1 WHERE id = ?",
          [now, user.id],
          () => {
            sendLoginResponse(user.id, username, req, res);
          }
        );
      }
    });
}

router.post('/api/auth/logout', authenticateToken, (req, res) => {
  db.run('DELETE FROM refresh_tokens WHERE session_id = ?', [req.user.sessionId]);
  db.run('DELETE FROM user_sessions WHERE id = ?', [req.user.sessionId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Successfully logged out' });
  });
});

// Exchange a valid refresh token for a fresh access token + a NEW refresh token (rotation).
// The presented token is single-use; reusing a consumed one is treated as theft and revokes the
// entire session. No auth header needed — the refresh token IS the credential.
router.post('/api/auth/refresh', rateLimiter(30, 60000), (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const now = Math.floor(Date.now() / 1000);
  db.get('SELECT * FROM refresh_tokens WHERE token_hash = ?', [sha256(refreshToken)], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid refresh token.' });

    // Reuse detection: a token that was already rotated is being presented again.
    if (row.used_at && row.used_at > 0) {
      db.run('DELETE FROM refresh_tokens WHERE session_id = ?', [row.session_id]);
      db.run('DELETE FROM user_sessions WHERE id = ?', [row.session_id]);
      securityLog(row.user_id, 'refresh_token_reuse', req.ip, 'Reused refresh token detected; session revoked.');
      return res.status(401).json({ error: 'Refresh token reuse detected. Please log in again.' });
    }
    if (row.expires_at < now) return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });

    db.get('SELECT id, expires_at FROM user_sessions WHERE id = ?', [row.session_id], (sErr, session) => {
      if (sErr) return res.status(500).json({ error: sErr.message });
      if (!session || session.expires_at < now) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }
      db.get('SELECT username FROM users WHERE id = ?', [row.user_id], (uErr, user) => {
        if (uErr || !user) return res.status(401).json({ error: 'Account not found.' });

        // Rotate: consume the old token, mint a new access + refresh pair.
        db.run('UPDATE refresh_tokens SET used_at = ? WHERE id = ?', [now, row.id], () => {
          const accessToken = signAccessToken(row.user_id, user.username, row.session_id);
          issueRefreshToken(row.session_id, row.user_id, (rErr, newRefresh) => {
            if (rErr) return res.status(500).json({ error: 'Refresh failed.' });
            db.run('UPDATE user_sessions SET last_used_at = ? WHERE id = ?', [now, row.session_id]);
            res.json({ token: accessToken, accessToken, refreshToken: newRefresh });
          });
        });
      });
    });
  });
});

router.get('/api/auth/me', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    getUserWithMastery(req.user.id, (err, fullUser) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(fullUser);
    });
  });
});

// ============================================================================
// Password reset (email-delivered single-use code)
// ============================================================================
const RESET_CODE_TTL_SECS = 30 * 60; // 30 minutes
const RESET_MAX_ATTEMPTS = 5;
// Unambiguous alphabet (no 0/O/1/I) — 8 chars ≈ 40 bits, easy to type from an email.
const RESET_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateResetCode() {
  let code = '';
  for (let i = 0; i < 8; i++) code += RESET_ALPHABET[crypto.randomInt(0, RESET_ALPHABET.length)];
  return code;
}

// (sha256 helper defined near sendLoginResponse — shared by reset + refresh.)

// Request a reset. ALWAYS responds with the same generic message — it never reveals whether the
// username exists or has an email on file (no account enumeration). A code is only actually sent
// when the account exists AND has a registered email.
router.post('/api/auth/forgot-password', rateLimiter(5, 15 * 60 * 1000), (req, res) => {
  const username = (req.body.username || '').trim();
  const generic = { success: true, message: 'If an account with a registered email exists, a reset code has been sent.' };
  if (!username) return res.status(400).json({ error: 'Username is required.' });

  db.get('SELECT id, email FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !user.email) return res.json(generic); // generic — no enumeration

    const code = generateResetCode();
    const now = Math.floor(Date.now() / 1000);
    db.serialize(() => {
      db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)',
        [user.id, sha256(code), now + RESET_CODE_TTL_SECS, now],
        async (insErr) => {
          if (insErr) return res.status(500).json({ error: insErr.message });
          securityLog(user.id, 'password_reset_requested', req.ip, `Reset code issued for ${username}.`);
          await sendMail({
            to: user.email,
            subject: 'Your Numera password reset code',
            text:
              `Use this code to reset your Numera password:\n\n    ${code}\n\n` +
              `It expires in 30 minutes and can be used once. If you didn't request this, you can ignore this email.`,
          });
          res.json(generic);
        }
      );
    });
  });
});

// Complete a reset with the emailed code. Generic failures (never says which part was wrong).
router.post('/api/auth/reset-password', rateLimiter(10, 15 * 60 * 1000), (req, res) => {
  const username = (req.body.username || '').trim();
  const code = (req.body.code || '').trim().toUpperCase();
  const { newPassword } = req.body;
  if (!username || !code || !newPassword) {
    return res.status(400).json({ error: 'Username, code, and new password are required.' });
  }
  const strength = validatePasswordStrength(newPassword, username);
  if (!strength.ok) return res.status(400).json({ error: strength.error });

  db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    const invalid = () => res.status(400).json({ error: 'Invalid or expired reset code.' });
    if (!user) return invalid();

    db.get(
      'SELECT * FROM password_reset_tokens WHERE user_id = ? AND used_at = 0 ORDER BY created_at DESC LIMIT 1',
      [user.id],
      (tErr, token) => {
        if (tErr) return res.status(500).json({ error: tErr.message });
        const now = Math.floor(Date.now() / 1000);
        if (!token || token.expires_at < now) return invalid();
        if ((token.attempts || 0) >= RESET_MAX_ATTEMPTS) {
          db.run('DELETE FROM password_reset_tokens WHERE id = ?', [token.id]);
          securityLog(user.id, 'password_reset_failure', req.ip, 'Reset locked: too many invalid attempts.');
          return res.status(429).json({ error: 'Too many attempts. Request a new reset code.' });
        }

        const a = Buffer.from(sha256(code));
        const b = Buffer.from(token.token_hash);
        const matches = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (!matches) {
          db.run('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = ?', [token.id]);
          securityLog(user.id, 'password_reset_failure', req.ip, 'Invalid reset code entered.');
          return invalid();
        }

        hashPassword(newPassword)
          .then((hash) => {
            db.serialize(() => {
              db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
              db.run('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?', [now, token.id]);
              // Invalidate all sessions: a reset must log out any attacker holding a live session.
              db.run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id]);
              db.run('DELETE FROM user_sessions WHERE user_id = ?', [user.id], () => {
                securityLog(user.id, 'password_reset_completed', req.ip, 'Password reset; all sessions invalidated.');
                res.json({ success: true, message: 'Your password has been reset. Please log in.' });
              });
            });
          })
          .catch(() => res.status(500).json({ error: 'Failed to secure password.' }));
      }
    );
  });
});

// ============================================================================
// Multi-Factor Authentication (TOTP authenticator app + one-time recovery codes)
// ============================================================================
const RECOVERY_CODE_COUNT = 10;

// Returns N formatted one-time recovery codes (xxxxx-xxxxx). Plaintext is shown to the user
// exactly once here; only argon2 hashes are persisted.
function generateRecoveryCodes() {
  const codes = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(5).toString('hex'); // 10 hex chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function normalizeRecoveryCode(code) {
  return String(code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// GET enrollment status — lets the client show the right MFA toggle state.
router.get('/api/auth/mfa/status', authenticateToken, (req, res) => {
  db.get('SELECT mfa_enabled FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ enabled: !!(row && row.mfa_enabled) });
  });
});

// Step 1 of enrollment: mint a pending secret and return the otpauth URI for the QR code.
// mfa_enabled stays 0 until a code is confirmed, so an abandoned setup never half-locks login.
router.post('/api/auth/mfa/setup', authenticateToken, (req, res) => {
  db.get('SELECT mfa_enabled FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row && row.mfa_enabled) return res.status(400).json({ error: 'MFA is already enabled.' });

    const secret = totp.generateSecret();
    db.run('UPDATE users SET mfa_secret = ?, mfa_enabled = 0 WHERE id = ?', [secret, req.user.id], (errU) => {
      if (errU) return res.status(500).json({ error: errU.message });
      res.json({ secret, otpauthUri: totp.buildOtpAuthUri(secret, req.user.username) });
    });
  });
});

// Step 2 of enrollment: confirm a TOTP code against the pending secret, flip mfa_enabled,
// and issue the one-time recovery codes (shown once).
router.post('/api/auth/mfa/enable', authenticateToken, (req, res) => {
  const { token } = req.body;
  db.get('SELECT mfa_secret, mfa_enabled FROM users WHERE id = ?', [req.user.id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !row.mfa_secret) return res.status(400).json({ error: 'Start MFA setup first.' });
    if (row.mfa_enabled) return res.status(400).json({ error: 'MFA is already enabled.' });
    if (!totp.verifyToken(token, row.mfa_secret)) {
      securityLog(req.user.id, 'mfa_failure', req.ip, 'Invalid code during MFA enrollment.');
      return res.status(400).json({ error: 'Invalid verification code. Check your authenticator app.' });
    }

    const codes = generateRecoveryCodes();
    let hashes;
    try {
      hashes = await Promise.all(codes.map((c) => hashPassword(normalizeRecoveryCode(c))));
    } catch {
      return res.status(500).json({ error: 'Failed to generate recovery codes.' });
    }

    const now = Math.floor(Date.now() / 1000);
    db.serialize(() => {
      db.run('UPDATE users SET mfa_enabled = 1 WHERE id = ?', [req.user.id]);
      db.run('DELETE FROM user_mfa_recovery_codes WHERE user_id = ?', [req.user.id]);
      const stmt = db.prepare('INSERT INTO user_mfa_recovery_codes (user_id, code_hash, created_at) VALUES (?, ?, ?)');
      hashes.forEach((h) => stmt.run(req.user.id, h, now));
      stmt.finalize((errF) => {
        if (errF) return res.status(500).json({ error: errF.message });
        securityLog(req.user.id, 'mfa_enrolled', req.ip, 'TOTP MFA enabled; recovery codes issued.');
        res.json({ success: true, recoveryCodes: codes });
      });
    });
  });
});

// Disable MFA — requires the account password (re-auth) to prevent a hijacked session from
// silently stripping the second factor.
router.post('/api/auth/mfa/disable', authenticateToken, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required to disable MFA.' });
  db.get('SELECT password_hash, mfa_enabled FROM users WHERE id = ?', [req.user.id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || !row.mfa_enabled) return res.status(400).json({ error: 'MFA is not enabled.' });
    if (!(await verifyPassword(row.password_hash, password))) {
      securityLog(req.user.id, 'mfa_failure', req.ip, 'Invalid password during MFA disable attempt.');
      return res.status(401).json({ error: 'Invalid password.' });
    }
    db.serialize(() => {
      db.run('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', [req.user.id]);
      db.run('DELETE FROM user_mfa_recovery_codes WHERE user_id = ?', [req.user.id], (errD) => {
        if (errD) return res.status(500).json({ error: errD.message });
        securityLog(req.user.id, 'mfa_removed', req.ip, 'TOTP MFA disabled by user.');
        res.json({ success: true, message: 'MFA has been disabled.' });
      });
    });
  });
});

// Second factor at login: exchange the short-lived challenge (+ a TOTP or recovery code) for a
// real session. Rate-limited and brute-force tracked like the password step.
router.post('/api/auth/mfa/login', checkFailedLogins, rateLimiter(10, 60000), (req, res) => {
  const { challenge, token, recoveryCode } = req.body;
  const ipAddress = req.ip;
  if (!challenge) return res.status(400).json({ error: 'Missing MFA challenge.' });

  let payload;
  try {
    payload = jwt.verify(challenge, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'MFA challenge expired or invalid. Log in again.' });
  }
  if (payload.purpose !== 'mfa' || !payload.id) {
    return res.status(401).json({ error: 'Invalid MFA challenge.' });
  }

  db.get('SELECT * FROM users WHERE id = ?', [payload.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !user.mfa_enabled) return res.status(400).json({ error: 'MFA is not active for this account.' });

    // Path A: TOTP code.
    if (token) {
      if (totp.verifyToken(token, user.mfa_secret)) {
        securityLog(user.id, 'mfa_success', ipAddress, 'TOTP second factor accepted.');
        return finalizeLogin(user, user.username, req, res);
      }
      recordFailedLogin(ipAddress);
      securityLog(user.id, 'mfa_failure', ipAddress, 'Invalid TOTP at login.');
      return res.status(400).json({ error: 'Invalid authentication code.' });
    }

    // Path B: one-time recovery code. Verify against each unused hash; consume on match.
    if (recoveryCode) {
      const norm = normalizeRecoveryCode(recoveryCode);
      db.all('SELECT id, code_hash FROM user_mfa_recovery_codes WHERE user_id = ? AND used_at = 0', [user.id], async (errC, rows) => {
        if (errC) return res.status(500).json({ error: errC.message });
        for (const r of rows || []) {
          if (await verifyPassword(r.code_hash, norm)) {
            const now = Math.floor(Date.now() / 1000);
            db.run('UPDATE user_mfa_recovery_codes SET used_at = ? WHERE id = ?', [now, r.id]);
            securityLog(user.id, 'mfa_recovery_used', ipAddress, 'Recovery code consumed at login.');
            return finalizeLogin(user, user.username, req, res);
          }
        }
        recordFailedLogin(ipAddress);
        securityLog(user.id, 'mfa_failure', ipAddress, 'Invalid recovery code at login.');
        return res.status(400).json({ error: 'Invalid recovery code.' });
      });
      return;
    }

    return res.status(400).json({ error: 'Provide an authentication code or a recovery code.' });
  });
});

module.exports = router;
