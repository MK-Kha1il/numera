// Commitment ("consistency climb") status + recommit-when-fading flow.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { getUserWithMastery } = require('../services/userService');
const { unlockRelic } = require('../services/commitmentService');

const router = express.Router();

// Get commitment status, archives, and recommit requirement
router.get('/api/commitment/status', authenticateToken, (req, res) => {
  db.get('SELECT streak, max_streak, commitment_state, burnout_risk, consistency_index, coins FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'Failed to retrieve status' });

    db.all('SELECT relic_id, unlocked_at FROM user_commitment_relics WHERE user_id = ?', [req.user.id], (errRelics, relics) => {
      const relicList = relics || [];

      db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [req.user.id], (errUtil, util) => {
        const shieldsCount = util ? util.quantity : 0;

        let message = 'Honor your climb by showing up today.';
        let challengeQuestionsCount = 3;

        if (user.burnout_risk === 'high') {
          message = "You've been working incredibly hard! Remember to protect your peace. A single equation is enough to stay consistent today.";
          challengeQuestionsCount = 1;
        } else if (user.burnout_risk === 'medium') {
          message = 'Find your rhythm. Keep your promise to yourself today.';
          challengeQuestionsCount = 2;
        } else if (user.commitment_state === 'fading') {
          message = 'You slipped, but your progress is safe. Honor your run and keep going!';
        }

        const statusResponse = {
          streak: user.streak,
          maxStreak: user.max_streak,
          commitmentState: user.commitment_state,
          burnoutRisk: user.burnout_risk,
          consistencyIndex: user.consistency_index,
          shieldsCount: shieldsCount,
          coins: user.coins,
          message: message,
          challengeQuestionsCount: challengeQuestionsCount,
          relics: relicList,
        };

        db.all(
          `SELECT date, solved_count
           FROM user_commitment_history
           WHERE user_id = ?
           ORDER BY date DESC
           LIMIT 7`,
          [req.user.id],
          (errHist, history) => {
            const hist = history || [];
            // Send history in chronological order (oldest first)
            statusResponse.activityHistory = hist.reverse();
            res.json(statusResponse);
          }
        );
      });
    });
  });
});

// Recommit a fading consistency climb
router.post('/api/commitment/recommit', authenticateToken, (req, res) => {
  const { method } = req.body;
  const userId = req.user.id;

  db.get('SELECT * FROM users WHERE id = ?', [userId], (errUser, user) => {
    if (errUser || !user) return res.status(500).json({ error: 'User not found' });
    if (user.commitment_state !== 'fading') {
      return res.status(400).json({ error: 'Climb is not in a fading state.' });
    }

    const restoreClimb = (unlockComebackRelic = false) => {
      const now = Math.floor(Date.now() / 1000);
      db.run("UPDATE users SET commitment_state = 'active', last_active = ? WHERE id = ?", [now, userId], () => {
        if (unlockComebackRelic) {
          unlockRelic(userId, 'relic_comeback', () => {
            getUserWithMastery(userId, (errMe, fullUser) => {
              res.json({ success: true, message: 'Consistency climb restored! You unlocked the Resilience Medal.', user: fullUser });
            });
          });
        } else {
          getUserWithMastery(userId, (errMe, fullUser) => {
            res.json({ success: true, message: 'Consistency climb restored!', user: fullUser });
          });
        }
      });
    };

    if (method === 'shield') {
      db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [userId], (errUtil, util) => {
        if (errUtil || !util || util.quantity <= 0) {
          return res.status(400).json({ error: 'No Streak Shields available.' });
        }
        db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_streak_shield'", [userId], () => {
          restoreClimb(false);
        });
      });
    } else if (method === 'coins') {
      if (user.coins < 150) {
        return res.status(400).json({ error: 'Insufficient coins. Needs 150.' });
      }
      db.run('UPDATE users SET coins = coins - 150 WHERE id = ?', [userId], () => {
        restoreClimb(false);
      });
    } else if (method === 'challenge') {
      restoreClimb(true);
    } else {
      res.status(400).json({ error: 'Invalid recommit method.' });
    }
  });
});

module.exports = router;
