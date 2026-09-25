// Level-map progress: the learner's best star rating (0–3) per level, earned by POST
// /api/math/complete (lib/soloRewards.levelStars). The map renders these under each node and a
// running total in its header — the replay goal.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/api/levels/stars', authenticateToken, (req, res) => {
  db.all('SELECT level, stars FROM user_level_stars WHERE user_id = ? AND stars > 0', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const stars = {};
    let total = 0;
    for (const r of rows || []) {
      stars[String(r.level)] = r.stars;
      total += r.stars;
    }
    res.json({ stars, total, threeStarLevels: (rows || []).filter((r) => r.stars === 3).length });
  });
});

module.exports = router;
