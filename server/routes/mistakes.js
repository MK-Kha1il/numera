// The Mistakes Bank: log wrong answers, list them (regenerated fresh from the same
// concept/level so the learner re-attempts an equivalent problem), and resolve them
// for a small XP/coin reward.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { normalizeLevelForGenerator } = require('../lib/progression');
const { generateProblem } = require('../mathGenerator');

const router = express.Router();

// Mistakes Bank Endpoint: Get all current user errors
router.get('/api/mistakes', authenticateToken, (req, res) => {
  db.get('SELECT level, elo FROM users WHERE id = ?', [req.user.id], (errUser, userRow) => {
    if (errUser) return res.status(500).json({ error: errUser.message });
    const userLevel = userRow ? userRow.level : 1;
    const userElo = userRow ? userRow.elo || 1000 : 1000;

    db.all('SELECT * FROM user_concept_analytics WHERE user_id = ?', [req.user.id], (err2, analyticsRows) => {
      const analyticsMap = {};
      if (!err2 && analyticsRows) {
        analyticsRows.forEach((row) => {
          analyticsMap[row.concept] = row;
        });
      }

      db.all('SELECT * FROM user_mistakes WHERE user_id = ? ORDER BY created_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsed = rows.map((r, index) => {
          const cat = r.category || 'Arithmetic';
          const normLevel = normalizeLevelForGenerator(cat, userLevel);
          const fresh = generateProblem(cat, normLevel, index, userElo, analyticsMap);
          return {
            ...r,
            question: fresh.question,
            correct_answer: fresh.correctAnswer,
            options: fresh.options,
            explanation: fresh.explanation,
          };
        });
        res.json(parsed);
      });
    });
  });
});

// Post a new wrong answer to the Mistakes Bank
router.post('/api/mistakes', authenticateToken, (req, res) => {
  const { category, question, correct_answer, options, explanation } = req.body;
  if (!question || !correct_answer || !options) {
    return res.status(400).json({ error: 'Missing required mistake fields' });
  }

  const optionsStr = typeof options === 'string' ? options : JSON.stringify(options);
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO user_mistakes (user_id, category, question, correct_answer, options, explanation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, category || 'Arithmetic', question, correct_answer, optionsStr, explanation || '', now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.run('UPDATE user_quests SET mistakes_today = mistakes_today + 1 WHERE user_id = ?', [req.user.id], () => {
        res.json({ success: true, id: this.lastID });
      });
    }
  );
});

// Resolve a logged mistake after answering it correctly
router.post('/api/mistakes/resolve', authenticateToken, (req, res) => {
  const { mistakeId } = req.body;
  if (!mistakeId) return res.status(400).json({ error: 'Mistake ID required' });

  db.get('SELECT * FROM user_mistakes WHERE id = ? AND user_id = ?', [mistakeId, req.user.id], (err, mistake) => {
    if (err || !mistake) return res.status(404).json({ error: 'Mistake not found' });

    db.run('DELETE FROM user_mistakes WHERE id = ? AND user_id = ?', [mistakeId, req.user.id], (errDel) => {
      if (errDel) return res.status(500).json({ error: errDel.message });

      const coinsGained = 10;
      const xpGained = 15;

      db.get('SELECT xp, level, coins, league_points, rank FROM users WHERE id = ?', [req.user.id], (errU, user) => {
        if (errU || !user) return res.status(500).json({ error: 'User details not found' });

        let newXp = user.xp + xpGained;
        let newLevel = user.level;
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel += 1;
        }

        const newCoins = user.coins + coinsGained;
        const newLeaguePoints = (user.league_points || 0) + xpGained;
        const currentRank = user.rank || 'Unranked (Placement: 0/5)';

        db.run(
          'UPDATE users SET xp = ?, level = ?, coins = ?, rank = ?, league_points = ? WHERE id = ?',
          [newXp, newLevel, newCoins, currentRank, newLeaguePoints, req.user.id],
          () => {
            res.json({
              success: true,
              coinsGained,
              xpGained,
              xp: newXp,
              level: newLevel,
              coins: newCoins,
              rank: currentRank,
            });
          }
        );
      });
    });
  });
});

module.exports = router;
