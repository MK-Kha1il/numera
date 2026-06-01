// Friends: list connections, send a request (auto-accepts a reciprocal pending request),
// and accept a pending request. Emits social notifications.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/api/friends', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.xp, u.level, u.rank, u.active_badge, u.avatar, u.active_banner, f.status
     FROM friends f
     JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
     WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?`,
    [req.user.id, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  if (!friendUsername) return res.status(400).json({ error: 'Username required' });

  db.get(`SELECT id FROM users WHERE username = ?`, [friendUsername], (err, target) => {
    if (err || !target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    db.get(
      `SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [req.user.id, target.id, target.id, req.user.id],
      (errConn, conn) => {
        if (errConn) return res.status(500).json({ error: errConn.message });
        if (conn) {
          if (conn.status === 'accepted') {
            return res.status(400).json({ error: 'Friend connection already exists' });
          }
          if (conn.user_id === req.user.id) {
            return res.status(400).json({ error: 'Friend request already sent' });
          }
          // Reverse pending request exists, so accept immediately
          db.run(`UPDATE friends SET status = 'accepted' WHERE id = ?`, [conn.id], (errUpdate) => {
            if (errUpdate) return res.status(500).json({ error: errUpdate.message });
            db.run(
              `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
                 VALUES (?, 'Friend Request Accepted 🤝', ?, 'social', 0, ?)`,
              [conn.user_id, `${req.user.username} accepted your friend request!`, Math.floor(Date.now() / 1000)]
            );
            return res.json({ success: true, message: 'Friend request accepted immediately' });
          });
          return;
        }

        db.run(`INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')`, [req.user.id, target.id], (err2) => {
          if (err2) {
            if (err2.message.includes('UNIQUE')) {
              return res.status(400).json({ error: 'Friend connection already exists' });
            }
            return res.status(500).json({ error: err2.message });
          }
          db.run(
            `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
               VALUES (?, 'New Friend Request 👤', ?, 'social', 0, ?)`,
            [target.id, `${req.user.username} sent you a friend request.`, Math.floor(Date.now() / 1000)]
          );
          res.json({ success: true, message: 'Friend request sent' });
        });
      }
    );
  });
});

router.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Friend ID required' });

  db.run(
    `UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`,
    [friendId, req.user.id], // request was sent from friendId to current user
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Pending friend request not found' });
      db.run(
        `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
         VALUES (?, 'Friend Request Accepted 🤝', ?, 'social', 0, ?)`,
        [friendId, `${req.user.username} accepted your friend request!`, Math.floor(Date.now() / 1000)]
      );
      res.json({ success: true, message: 'Friend request accepted' });
    }
  );
});

module.exports = router;
