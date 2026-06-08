// Friends: list connections, send a request (auto-accepts a reciprocal pending request),
// accept a pending request, decline a pending request, and remove a connection (unfriend / cancel
// an outgoing request). Emits social notifications.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { notify } = require('../services/notificationService');

const router = express.Router();

router.get('/api/friends', authenticateToken, (req, res) => {
  db.all(
    // `incoming` distinguishes a request someone sent TO me (I can accept/decline it) from one I
    // sent OUT (still pending on their side). I'm the recipient exactly when f.friend_id is me.
    `SELECT u.id, u.username, u.xp, u.level, u.rank, u.active_badge, u.avatar, u.active_banner,
            f.status, CASE WHEN f.friend_id = ? THEN 1 ELSE 0 END AS incoming
     FROM friends f
     JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
     WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?
       AND u.id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
       AND u.id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)`,
    [req.user.id, req.user.id, req.user.id, req.user.id, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      // Coerce the SQLite 1/0 into a real JSON boolean for the client.
      res.json((rows || []).map((r) => ({ ...r, incoming: !!r.incoming })));
    }
  );
});

router.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  if (!friendUsername) return res.status(400).json({ error: 'Username required' });

  db.get(`SELECT id FROM users WHERE username = ?`, [friendUsername], (err, target) => {
    if (err || !target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    // A block in either direction prevents a friend request (don't reveal which direction).
    db.get(
      'SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
      [req.user.id, target.id, target.id, req.user.id],
      (blockErr, blocked) => {
        if (blockErr) return res.status(500).json({ error: blockErr.message });
        if (blocked) return res.status(403).json({ error: 'Unable to send a friend request to this user.' });
        proceedWithRequest(target);
      }
    );

    function proceedWithRequest(target) {
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
            notify(conn.user_id, {
              category: 'friend_accept',
              title: 'Friend Request Accepted 🤝',
              message: `${req.user.username} accepted your friend request!`,
              type: 'social',
            });
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
          notify(target.id, {
            category: 'friend_request',
            title: 'New Friend Request 👤',
            message: `${req.user.username} sent you a friend request.`,
            type: 'social',
          });
          res.json({ success: true, message: 'Friend request sent' });
        });
      }
    );
    }
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
      notify(friendId, {
        category: 'friend_accept',
        title: 'Friend Request Accepted 🤝',
        message: `${req.user.username} accepted your friend request!`,
        type: 'social',
      });
      res.json({ success: true, message: 'Friend request accepted' });
    }
  );
});

// Decline a pending INCOMING request. We silently remove the row rather than ping the requester —
// a "X declined you" notification creates social pressure/friction (and a safety vector), so the
// quiet default is the kind one; the requester simply sees the request never accepted and may
// re-send later. Only the recipient (friend_id = me) of a still-pending request can decline it.
router.post('/api/friends/decline', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Friend ID required' });

  db.run(
    `DELETE FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'pending'`,
    [friendId, req.user.id], // request was sent FROM friendId TO the current user
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Pending friend request not found' });
      res.json({ success: true, message: 'Friend request declined' });
    }
  );
});

// Remove a connection with another user ENTIRELY — unfriend an accepted friend, cancel a request
// you sent, or drop a pending incoming one. Deletes any friends row in either direction. Silent
// (no notification): severing a tie shouldn't ping the other person. Idempotent-ish: 404 only when
// there was nothing to remove.
router.delete('/api/friends/:friendId', authenticateToken, (req, res) => {
  const friendId = parseInt(req.params.friendId, 10);
  if (!Number.isFinite(friendId)) return res.status(400).json({ error: 'Invalid friend id' });

  db.run(
    `DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
    [req.user.id, friendId, friendId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'No connection found' });
      res.json({ success: true, message: 'Connection removed' });
    }
  );
});

module.exports = router;
