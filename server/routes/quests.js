// Daily quests: list the four rotating quests with progress, and claim a completed one
// for an XP/coin reward. Claim is idempotent + uses a conditional UPDATE so a quest can
// only be claimed once.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { checkAndResetQuestsAndLeagues } = require('../services/userService');
const { QUEST_DEFS } = require('../lib/questDefs');

const router = express.Router();

router.get('/api/quests', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get('SELECT * FROM user_quests WHERE user_id = ?', [req.user.id], (err, q) => {
      if (err || !q) return res.status(500).json({ error: 'Quest data not found' });

      const quests = QUEST_DEFS.map((d) => ({
        type: d.type,
        name: d.name,
        description: d.description,
        target: d.target,
        current: Math.min(d.target, q[d.progressCol] || 0),
        claimed: q[d.claimCol],
        rewardCoins: d.rewardCoins,
        rewardXp: d.rewardXp,
      }));

      res.json(quests);
    });
  });
});

// Claim a completed daily quest
router.post('/api/quests/claim', authenticateToken, idempotency, (req, res) => {
  const { questType } = req.body;
  if (!questType) return res.status(400).json({ error: 'Quest type required' });

  db.get('SELECT * FROM user_quests WHERE user_id = ?', [req.user.id], (err, q) => {
    if (err || !q) return res.status(404).json({ error: 'Quest data not found' });

    const def = QUEST_DEFS.find((d) => d.type === questType);
    if (!def) return res.status(400).json({ error: 'Invalid quest type' });

    const current = q[def.progressCol];
    const target = def.target;
    const claimed = q[def.claimCol];
    const rewardCoins = def.rewardCoins;
    const rewardXp = def.rewardXp;
    const claimColumn = def.claimCol;

    if (current < target) return res.status(400).json({ error: 'Quest target not met yet' });
    if (claimed === 1) return res.status(400).json({ error: 'Quest reward already claimed' });

    db.run(
      `UPDATE user_quests SET ${claimColumn} = 1 WHERE user_id = ? AND ${claimColumn} = 0`,
      [req.user.id],
      function (errClaim) {
        if (errClaim) return res.status(500).json({ error: errClaim.message });
        if (this.changes === 0) {
          return res.status(400).json({ error: 'Quest reward already claimed' });
        }

        db.get('SELECT xp, level, coins, league_points, rank FROM users WHERE id = ?', [req.user.id], (errU, user) => {
          if (errU || !user) return res.status(500).json({ error: 'User not found' });

          let newXp = user.xp + rewardXp;
          let newLevel = user.level;
          while (newXp >= newLevel * 100) {
            newXp -= newLevel * 100;
            newLevel += 1;
          }

          const newCoins = user.coins + rewardCoins;
          const newLeaguePoints = (user.league_points || 0) + rewardXp;
          const currentRank = user.rank || 'Unranked (Placement: 0/5)';

          db.run(
            'UPDATE users SET xp = ?, level = ?, coins = ?, rank = ?, league_points = ? WHERE id = ?',
            [newXp, newLevel, newCoins, currentRank, newLeaguePoints, req.user.id],
            () => {
              res.json({
                success: true,
                rewardCoins,
                rewardXp,
                xp: newXp,
                level: newLevel,
                coins: newCoins,
                rank: currentRank,
              });
            }
          );
        });
      }
    );
  });
});

module.exports = router;
