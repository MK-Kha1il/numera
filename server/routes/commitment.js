// Commitment ("consistency climb") status + recommit-when-fading flow.
const express = require('express');
const { db } = require('../db');
const { withTransaction } = require('../dbx');
const { authenticateToken } = require('../middleware/auth');
const { getUserWithMastery } = require('../services/userService');
const { unlockRelic } = require('../services/commitmentService');

const router = express.Router();

// Streak repair (the second valve after the streak-freeze shield): after a full reset, the lost
// streak can be bought back for coins within this window. Cost scales with what was lost (so saving
// a long run is meaningful) but is capped to stay affordable.
const STREAK_REPAIR_WINDOW_SECS = 48 * 60 * 60;
const streakRepairCost = (lostStreak) => Math.min(500, 50 + lostStreak * 15);

// Returns the active repair offer for a user row, or null if none is available right now.
function repairOffer(user, now) {
  const lost = user.lost_streak || 0;
  const at = user.lost_streak_at || 0;
  if (lost <= 0 || at <= 0) return null;
  const expiresAt = at + STREAK_REPAIR_WINDOW_SECS;
  if (now >= expiresAt) return null;
  return { lostStreak: lost, cost: streakRepairCost(lost), expiresAt };
}

// Get commitment status, archives, and recommit requirement
router.get('/api/commitment/status', authenticateToken, (req, res) => {
  db.get('SELECT streak, max_streak, commitment_state, burnout_risk, consistency_index, coins, lost_streak, lost_streak_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
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
          // Non-null only when a just-lost streak is still inside the repair window.
          streakRepair: repairOffer(user, Math.floor(Date.now() / 1000)),
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

// Repair a fully-lost streak for coins, within the grace window. Distinct from /recommit, which
// rescues a streak that is merely *fading* (not yet reset). Done in one ACID transaction with a
// conditional `coins >= cost` deduction so it can't overdraw or double-spend on concurrent taps.
router.post('/api/commitment/streak-repair', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.get('SELECT streak, max_streak, coins, lost_streak, lost_streak_at FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'User not found' });

    const now = Math.floor(Date.now() / 1000);
    const offer = repairOffer(user, now);
    if (!offer) return res.status(400).json({ error: 'No streak is available to repair.' });
    if (user.coins < offer.cost) {
      return res.status(400).json({ error: `Not enough coins. Repair costs ${offer.cost}.` });
    }

    withTransaction(async (tx) => {
      const deducted = await tx.run('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?', [offer.cost, userId, offer.cost]);
      if (deducted.changes === 0) throw new Error('insufficient_coins');
      await tx.run(
        "UPDATE users SET streak = ?, commitment_state = 'active', last_active = ?, lost_streak = 0, lost_streak_at = 0, " +
          'max_streak = CASE WHEN ? > max_streak THEN ? ELSE max_streak END WHERE id = ?',
        [offer.lostStreak, now, offer.lostStreak, offer.lostStreak, userId]
      );
      return offer.lostStreak;
    })
      .then((restored) => {
        getUserWithMastery(userId, (errMe, fullUser) => {
          if (errMe) return res.status(500).json({ error: errMe.message });
          res.json({ success: true, message: `Streak restored to ${restored} days!`, restoredStreak: restored, user: fullUser });
        });
      })
      .catch((e) => {
        if (e.message === 'insufficient_coins') return res.status(400).json({ error: 'Not enough coins.' });
        res.status(500).json({ error: e.message });
      });
  });
});

module.exports = router;
