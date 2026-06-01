// Daily quests: list the four rotating quests with progress, and claim a completed one
// for an XP/coin reward. Claim is idempotent + uses a conditional UPDATE so a quest can
// only be claimed once.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { checkAndResetQuestsAndLeagues } = require('../services/userService');

const router = express.Router();

router.get('/api/quests', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get('SELECT * FROM user_quests WHERE user_id = ?', [req.user.id], (err, q) => {
      if (err || !q) return res.status(500).json({ error: 'Quest data not found' });

      const quests = [
        {
          type: 'solved',
          name: 'Daily Solver',
          description: 'Solve 5 math problems to warm up.',
          target: 5,
          current: Math.min(5, q.solved_today || 0),
          claimed: q.solved_claimed,
          rewardCoins: 20,
          rewardXp: 30,
        },
        {
          type: 'duels',
          name: 'Arena Duelist',
          description: 'Win or play 2 Arena duels.',
          target: 2,
          current: Math.min(2, q.duels_today || 0),
          claimed: q.duels_claimed,
          rewardCoins: 30,
          rewardXp: 50,
        },
        {
          type: 'mistakes',
          name: 'Focus Practice',
          description: 'Solve or review 3 growth equations.',
          target: 3,
          current: Math.min(3, q.mistakes_today || 0),
          claimed: q.mistakes_claimed,
          rewardCoins: 25,
          rewardXp: 40,
        },
        {
          type: 'daily_puzzle',
          name: 'Daily Puzzle Master',
          description: 'Solve the rotating Daily Puzzle.',
          target: 1,
          current: Math.min(1, q.daily_puzzle_today || 0),
          claimed: q.daily_puzzle_claimed,
          rewardCoins: 40,
          rewardXp: 60,
        },
      ];

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

    let current = 0;
    let target = 0;
    let claimed = 0;
    let rewardCoins = 0;
    let rewardXp = 0;
    let claimColumn = '';

    if (questType === 'solved') {
      current = q.solved_today;
      target = 5;
      claimed = q.solved_claimed;
      rewardCoins = 20;
      rewardXp = 30;
      claimColumn = 'solved_claimed';
    } else if (questType === 'duels') {
      current = q.duels_today;
      target = 2;
      claimed = q.duels_claimed;
      rewardCoins = 30;
      rewardXp = 50;
      claimColumn = 'duels_claimed';
    } else if (questType === 'mistakes') {
      current = q.mistakes_today;
      target = 3;
      claimed = q.mistakes_claimed;
      rewardCoins = 25;
      rewardXp = 40;
      claimColumn = 'mistakes_claimed';
    } else if (questType === 'daily_puzzle') {
      current = q.daily_puzzle_today;
      target = 1;
      claimed = q.daily_puzzle_claimed;
      rewardCoins = 40;
      rewardXp = 60;
      claimColumn = 'daily_puzzle_claimed';
    } else {
      return res.status(400).json({ error: 'Invalid quest type' });
    }

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
