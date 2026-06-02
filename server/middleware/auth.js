// JWT authentication middleware with stateful session enforcement: a valid signature is
// not enough — the embedded sessionId must still exist and be unexpired in user_sessions,
// so logout/revocation immediately invalidates outstanding tokens.
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET } = require('../config');
const { securityLog } = require('./security');

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
      'SELECT id, expires_at FROM user_sessions WHERE id = ? AND user_id = ?',
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

        req.user = decoded;
        next();
      }
    );
  });
}

module.exports = { authenticateToken };
