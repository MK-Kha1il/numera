// Global learning leaderboard (top 20 by level then XP).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/api/leaderboard', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, username, xp, level, rank, active_badge, avatar, active_banner FROM users ORDER BY level DESC, xp DESC LIMIT 20`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
