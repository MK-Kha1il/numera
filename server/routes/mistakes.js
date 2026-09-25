// The Mistakes Bank: log wrong answers, list them (regenerated fresh from the same
// concept/level so the learner re-attempts an equivalent problem), and resolve them
// for a small XP/coin reward.
const express = require('express');
const { db } = require('../db');
const { withTransaction, httpError } = require('../dbx');
const { authenticateToken } = require('../middleware/auth');
const { normalizeLevelForGenerator, applyXp } = require('../lib/progression');
const { generateProblem } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const { ensureDailyReset } = require('../services/userService');
const { creditStreak } = require('../services/streakService');

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
          // Re-attempting a missed concept is the remediation moment — keep the full
          // active-learning surface (ladder/tip via templateType, socratic probe for a
          // repeat slip, self-explain for a redeemed one, worked example as the scaffold).
          return attachTipToProblem({
            ...r,
            question: fresh.question,
            correct_answer: fresh.correctAnswer,
            options: fresh.options,
            explanation: fresh.explanation,
            templateType: fresh.templateType,
            socraticJson: fresh.socraticJson || '',
            selfExplainJson: fresh.selfExplainJson || '',
            workedExampleJson: fresh.workedExampleJson || '',
          }, false);
        });
        res.json(parsed);
      });
    });
  });
});

// Economy guards (docs/EconomyModel.md): logging a mistake is free and client-reported, so a
// resolve can only be PAID a few times a day — otherwise "log a mistake, resolve it" was an
// unlimited scripted coin faucet — and the bank itself is bounded.
const MISTAKE_RESOLVE_XP = 15;
const MISTAKE_RESOLVE_COINS = 10;
const PAID_RESOLVES_PER_DAY = 10;
const MAX_BANK_SIZE = 200;

// Post a new wrong answer to the Mistakes Bank. Logging a mistake no longer advances the "Focus
// Practice" quest ("solve or review 3 growth equations") — getting answers WRONG used to complete
// it; resolving one does now.
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
    [
      req.user.id,
      String(category || 'Arithmetic').slice(0, 64),
      String(question).slice(0, 2000),
      String(correct_answer).slice(0, 500),
      optionsStr.slice(0, 4000),
      String(explanation || '').slice(0, 4000),
      now,
    ],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const id = this.lastID;
      // Keep only the newest MAX_BANK_SIZE entries (best-effort).
      db.run(
        `DELETE FROM user_mistakes WHERE user_id = ? AND id NOT IN (
           SELECT id FROM user_mistakes WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
         )`,
        [req.user.id, req.user.id, MAX_BANK_SIZE],
        () => res.json({ success: true, id })
      );
    }
  );
});

// Resolve a logged mistake after answering it correctly. One transaction: the delete (owned by the
// caller — a second resolve of the same id finds nothing), the quest credit, and — while under the
// daily cap — the XP/coin reward with relative writes (no read-modify-write lost updates).
router.post('/api/mistakes/resolve', authenticateToken, async (req, res) => {
  const { mistakeId } = req.body || {};
  if (!mistakeId) return res.status(400).json({ error: 'Mistake ID required' });
  const userId = req.user.id;

  try {
    await ensureDailyReset(userId);
    const r = await withTransaction(async (tx) => {
      const del = await tx.run('DELETE FROM user_mistakes WHERE id = ? AND user_id = ?', [mistakeId, userId]);
      if (del.changes === 0) throw httpError(404, 'Mistake not found');

      await tx.run('UPDATE user_quests SET mistakes_today = mistakes_today + 1 WHERE user_id = ?', [userId]);
      const q = await tx.get('SELECT mistake_rewards_today FROM user_quests WHERE user_id = ?', [userId]);
      const paid = !q || (q.mistake_rewards_today || 0) < PAID_RESOLVES_PER_DAY;

      const user = await tx.get('SELECT xp, level, coins, rank FROM users WHERE id = ?', [userId]);
      if (!user) throw httpError(404, 'User details not found');
      const xpGained = paid ? MISTAKE_RESOLVE_XP : 0;
      const coinsGained = paid ? MISTAKE_RESOLVE_COINS : 0;
      const progressed = applyXp(user.xp, user.level, xpGained);
      if (paid) {
        await tx.run('UPDATE users SET xp = ?, level = ?, coins = coins + ?, league_points = league_points + ? WHERE id = ?', [
          progressed.xp,
          progressed.level,
          coinsGained,
          xpGained,
          userId,
        ]);
        await tx.run('UPDATE user_quests SET mistake_rewards_today = mistake_rewards_today + 1 WHERE user_id = ?', [userId]);
      }
      return { user, progressed, xpGained, coinsGained, paid };
    });

    await creditStreak(userId); // solving a problem keeps today's streak alive
    res.json({
      success: true,
      coinsGained: r.coinsGained,
      xpGained: r.xpGained,
      rewardCapped: !r.paid,
      xp: r.progressed.xp,
      level: r.progressed.level,
      coins: (r.user.coins || 0) + r.coinsGained,
      rank: r.user.rank || 'Unranked (Placement: 0/5)',
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not resolve the mistake.' });
  }
});

module.exports = router;
