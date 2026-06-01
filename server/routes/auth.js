// Authentication: register, login (with streak/commitment + quest/league reset on entry),
// logout (session revocation), and the authenticated /me snapshot.
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { checkFailedLogins, rateLimiter, recordFailedLogin, clearFailedLogins } = require('../middleware/rateLimit');
const { securityLog } = require('../middleware/security');
const { getUserWithMastery, checkAndResetQuestsAndLeagues } = require('../services/userService');

const router = express.Router();

// Issues a session row + JWT and returns { token, user }. Shared by register and login.
function sendLoginResponse(userId, username, req, res) {
  const sessionId = crypto.randomUUID();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip;
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + 7 * 24 * 60 * 60; // 7 days session lifetime

  db.run(
    'INSERT INTO user_sessions (id, user_id, user_agent, ip_address, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    [sessionId, userId, userAgent, ipAddress, createdAt, expiresAt],
    (errSession) => {
      if (errSession) {
        console.error('[SECURITY] Failed to write session to DB:', errSession.message);
        return res.status(500).json({ error: 'Session creation failed' });
      }

      const token = jwt.sign({ id: userId, username, sessionId }, JWT_SECRET, { expiresIn: '7d' });
      clearFailedLogins(ipAddress);

      getUserWithMastery(userId, (errU, fullUser) => {
        if (errU) return res.status(500).json({ error: errU.message });
        res.json({ token, user: fullUser });
      });
    }
  );
}

router.post('/api/auth/register', checkFailedLogins, rateLimiter(5, 60000), (req, res) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Strict alphanumeric/underscore regex validation & length check
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.',
    });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
    return res.status(400).json({ error: 'Password must be between 8 and 100 characters' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const chosenAvatar = avatar || 'avatar_pythagoras';
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO users (username, password_hash, last_active, avatar, last_league_reset) VALUES (?, ?, ?, ?, ?)`,
    [username, hash, now, chosenAvatar, now],
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
          db.run(
            `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
             VALUES (?, 'Welcome to Numera! 🚀', 'Start your math journey by taking the diagnostic placement test or jump straight into Level 1!', 'welcome', 0, ?)`,
            [newUserId, now],
            () => {
              sendLoginResponse(newUserId, username, req, res);
            }
          );
        });
      });
    }
  );
});

router.post('/api/auth/login', checkFailedLogins, rateLimiter(10, 60000), (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  if (!username || !password) {
    recordFailedLogin(ipAddress);
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      recordFailedLogin(ipAddress);
      securityLog(user ? user.id : null, 'auth_failure', ipAddress, `Failed login attempt for user: ${username}`);
      return res.status(400).json({ error: 'Invalid username or password' });
    }

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
  });
});

router.post('/api/auth/logout', authenticateToken, (req, res) => {
  db.run('DELETE FROM user_sessions WHERE id = ?', [req.user.sessionId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Successfully logged out' });
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

module.exports = router;
