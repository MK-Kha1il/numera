// User notifications: list (most recent 50) and mark-read (single or all).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

module.exports = router;
