// Daily quests: list the rotating quests with progress, and claim a completed one for an XP/coin
// reward. A claim is idempotent (Idempotency-Key) and transactional with a conditional claim flag,
// so a quest can only be claimed once.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const { checkAndResetQuestsAndLeagues, ensureDailyReset } = require('../services/userService');
const { recordCoins } = require('../services/economyLedger');
const { applyXp } = require('../lib/progression');
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

// Claim a completed daily quest. The daily reset runs first (so yesterday's finished-but-unclaimed
// quest can't be cashed after midnight), then ONE transaction flips the claim flag conditionally
// (`claimCol = 0`, so a quest pays once) and grants the reward with relative writes — no
// read-modify-write window for a concurrent reward to be overwritten.
router.post('/api/quests/claim', authenticateToken, idempotency, async (req, res) => {
  const { questType } = req.body || {};
  if (!questType) return res.status(400).json({ error: 'Quest type required' });
  const def = QUEST_DEFS.find((d) => d.type === questType);
  if (!def) return res.status(400).json({ error: 'Invalid quest type' });
  const userId = req.user.id;

  try {
    await ensureDailyReset(userId);
    const r = await withTransaction(async (tx) => {
      const q = await tx.get('SELECT * FROM user_quests WHERE user_id = ?', [userId]);
      if (!q) throw httpError(404, 'Quest data not found');
      if ((q[def.progressCol] || 0) < def.target) throw httpError(400, 'Quest target not met yet');
      // progressCol/claimCol come from the fixed QUEST_DEFS table, never user input.
      const flip = await tx.run(`UPDATE user_quests SET ${def.claimCol} = 1 WHERE user_id = ? AND ${def.claimCol} = 0`, [userId]);
      if (flip.changes === 0) throw httpError(400, 'Quest reward already claimed');

      const user = await tx.get('SELECT xp, level, coins, rank FROM users WHERE id = ?', [userId]);
      if (!user) throw httpError(404, 'User not found');
      const progressed = applyXp(user.xp, user.level, def.rewardXp);
      await tx.run('UPDATE users SET xp = ?, level = ?, coins = coins + ?, league_points = league_points + ? WHERE id = ?', [
        progressed.xp,
        progressed.level,
        def.rewardCoins,
        def.rewardXp,
        userId,
      ]);
      return { user, progressed };
    });

    recordCoins('quest_claim', def.rewardCoins);
    res.json({
      success: true,
      rewardCoins: def.rewardCoins,
      rewardXp: def.rewardXp,
      xp: r.progressed.xp,
      level: r.progressed.level,
      coins: (r.user.coins || 0) + def.rewardCoins,
      rank: r.user.rank || 'Unranked (Placement: 0/5)',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not claim the quest.' });
  }
});

module.exports = router;
