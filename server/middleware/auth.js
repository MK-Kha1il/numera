// JWT authentication middleware with stateful session enforcement: a valid signature is
// not enough — the embedded sessionId must still exist and be unexpired in user_sessions,
// so logout/revocation immediately invalidates outstanding tokens.
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../config');
const { securityLog } = require('./security');

// Idle-session ceiling: a token unused this long is invalidated regardless of its absolute
// expiry. Shorter than the 7-day session lifetime, so an abandoned device logs itself out.
const INACTIVITY_WINDOW_SECS = 3 * 24 * 60 * 60; // 3 days

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });

    if (!decoded.sessionId) {
      securityLog(decoded.id || null, 'session_hijack_attempt', req.ip, 'Token does not contain a session ID.');
      return res.status(401).json({ error: 'Invalid token structure. Log in again.' });
    }

    db.get(
      'SELECT id, expires_at, last_used_at FROM user_sessions WHERE id = ? AND user_id = ?',
      [decoded.sessionId, decoded.id],
      (errSession, session) => {
        if (errSession || !session) {
          securityLog(decoded.id, 'session_hijack_attempt', req.ip, 'Attempted to use an invalidated or revoked session.');
          return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
        }

        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at < now) {
          db.run('DELETE FROM user_sessions WHERE id = ?', [decoded.sessionId]);
          securityLog(decoded.id, 'session_hijack_attempt', req.ip, 'Attempted to use an expired session.');
          return res.status(401).json({ error: 'Session has expired. Please log in again.' });
        }

        // Inactivity timeout: a session unused for longer than INACTIVITY_WINDOW is killed even
        // if its absolute 7-day expiry hasn't elapsed. last_used_at == 0 means a pre-migration
        // session not yet tracked — adopt `now` instead of treating it as ancient.
        const lastUsed = session.last_used_at || now;
        if (now - lastUsed > INACTIVITY_WINDOW_SECS) {
          db.run('DELETE FROM user_sessions WHERE id = ?', [decoded.sessionId]);
          securityLog(decoded.id, 'session_expired_inactive', req.ip, 'Session invalidated after inactivity timeout.');
          return res.status(401).json({ error: 'Session timed out due to inactivity. Please log in again.' });
        }

        // Sliding activity: refresh last_used_at (throttled to once/minute to avoid a write per
        // request). Keeps an active user logged in; lets an idle session age out.
        if (now - lastUsed > 60) {
          db.run('UPDATE user_sessions SET last_used_at = ? WHERE id = ?', [now, decoded.sessionId]);
        }

        req.user = decoded;
        next();
      }
    );
  });
}

// Role gate — must run AFTER authenticateToken. Looks up the authoritative role from the DB
// (not the JWT, so a role change takes effect without re-login and a stale token can't claim
// admin). Replaces the former `req.user.username === 'admin'` string check.
function requireAdmin(req, res, next) {
  db.get('SELECT role FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.role !== 'admin') {
      securityLog(req.user.id, 'unauthorized_admin_access', req.ip, 'Non-admin attempted an admin-only action.');
      return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
    next();
  });
}

module.exports = { authenticateToken, requireAdmin };
