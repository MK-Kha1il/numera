// Achievements: list catalog + this user's progress (recomputed first; hidden ones are
// masked until completed), and claim a completed achievement's reward (idempotent + ACID).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const { updateAchievements } = require('../services/achievementService');

const router = express.Router();

router.get('/api/achievements', authenticateToken, (req, res) => {
  updateAchievements(req.user.id, () => {
    db.all(
      `
      SELECT a.id, a.name, a.description, a.icon, a.target_value, a.reward_coins,
             a.category, a.chain_id, a.chain_order, a.is_hidden,
             COALESCE(ua.progress, 0) AS progress,
             COALESCE(ua.claimed, 0) AS claimed,
             COALESCE(ua.completed_at, 0) AS completed_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
    `,
      [req.user.id],
      (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const processed = rows.map((r) => {
          const isCompleted = r.completed_at > 0;
          if (r.is_hidden && !isCompleted) {
            return {
              ...r,
              name: '???',
              description: 'A mysterious milestone...',
            };
          }
          return r;
        });
        res.json(processed);
      }
    );
  });
});

router.post('/api/achievements/claim', authenticateToken, idempotency, (req, res) => {
  const { achievementId } = req.body;
  if (!achievementId) return res.status(400).json({ error: 'Achievement ID required' });
  const userId = req.user.id;

  // Claim the reward atomically: flip `claimed`, credit coins, grant badge — all
  // or nothing. The compare-and-set on `claimed = 0` makes the claim idempotent
  // against concurrent requests; the transaction makes the coin credit safe.
  withTransaction(async (tx) => {
    const row = await tx.get(
      `SELECT ua.*, a.reward_coins
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = ? AND ua.achievement_id = ?`,
      [userId, achievementId]
    );
    if (!row) throw httpError(404, 'Achievement progress not found');
    if (row.completed_at === 0) throw httpError(400, 'Achievement not completed yet');
    if (row.claimed === 1) throw httpError(400, 'Achievement already claimed');

    const flip = await tx.run(
      `UPDATE user_achievements SET claimed = 1
        WHERE user_id = ? AND achievement_id = ? AND claimed = 0 AND completed_at > 0`,
      [userId, achievementId]
    );
    if (flip.changes === 0) {
      throw httpError(400, 'Achievement already claimed or not completed yet');
    }

    await tx.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [row.reward_coins, userId]);

    const badgeId = 'badge_' + achievementId;
    await tx.run(`INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [userId, badgeId]);

    return { success: true, rewardCoins: row.reward_coins, unlockedBadge: badgeId };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
