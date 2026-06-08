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

// Friends leaderboard (audit #1.7 — make "social" more than a global number): the caller and their
// accepted friends, ranked by level then XP, with each row's position and an isMe flag so the
// learner sees exactly where they stand among people they know. Blocked users are already not
// friends (a block severs the friendship), so no extra filtering is needed.
router.get('/api/leaderboard/friends', authenticateToken, (req, res) => {
  const uid = req.user.id;
  db.all(
    `SELECT u.id, u.username, u.xp, u.level, u.rank, u.active_badge, u.avatar, u.active_banner
       FROM users u
      WHERE u.id = ?
         OR u.id IN (
            SELECT CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
              FROM friends f
             WHERE f.status = 'accepted' AND (f.user_id = ? OR f.friend_id = ?)
         )
      ORDER BY u.level DESC, u.xp DESC
      LIMIT 100`,
    [uid, uid, uid, uid],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json((rows || []).map((r, i) => ({ ...r, position: i + 1, isMe: r.id === uid })));
    }
  );
});

module.exports = router;
