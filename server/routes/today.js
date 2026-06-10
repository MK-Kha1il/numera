// The "Today" session composer. The dashboard, quests, SRS, learning plan and commitment all
// answer "what should I do now?" separately; this endpoint composes them into ONE ordered
// plan (review → learn → puzzle → duel → growth) so the client can render a single Today
// card instead of four competing surfaces. Read-only: it never mutates progress — every item
// is completed through its own existing flow.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { checkAndResetQuestsAndLeagues } = require('../services/userService');
const { QUEST_DEFS } = require('../lib/questDefs');

const router = express.Router();

// Pedagogical order: retention first (reviews fade fastest), then new learning, then the
// daily ritual, then competition, then error remediation. Each key maps to a quest type
// (or the SRS queue) and a client navigation target.
const PLAN_ORDER = ['review', 'solved', 'daily_puzzle', 'duels', 'mistakes'];

const ITEM_COPY = {
  review: (n) => ({ title: n === 1 ? 'Rescue 1 fading concept' : `Rescue ${n} fading concepts`, subtitle: 'A quick review locks them back in' }),
  solved: () => ({ title: 'Solve 5 problems', subtitle: 'Your daily practice core' }),
  daily_puzzle: () => ({ title: "Crack today's puzzle", subtitle: 'One fresh challenge, once a day' }),
  duels: () => ({ title: 'Play 2 arena rounds', subtitle: 'Put your skills under pressure' }),
  mistakes: () => ({ title: 'Revisit 3 growth equations', subtitle: 'Old mistakes are the fastest wins' }),
};

router.get('/api/today', authenticateToken, (req, res) => {
  // The reset pass first, so a stale user_quests row from yesterday never leaks into the plan.
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get('SELECT streak, last_active FROM users WHERE id = ?', [req.user.id], (errU, user) => {
      if (errU || !user) return res.status(500).json({ error: 'User not found' });

      db.get('SELECT * FROM user_quests WHERE user_id = ?', [req.user.id], (errQ, q) => {
        if (errQ || !q) return res.status(500).json({ error: 'Quest data not found' });

        const now = Math.floor(Date.now() / 1000);
        db.get(
          'SELECT COUNT(*) AS due FROM srs_reviews WHERE user_id = ? AND next_review <= ?',
          [req.user.id, now],
          (errS, srs) => {
            const dueCount = errS || !srs ? 0 : srs.due;

            const items = [];
            for (const key of PLAN_ORDER) {
              if (key === 'review') {
                // Only present when something is actually due — an empty review queue is
                // not a task. The daily ask is CAPPED at 5: a lapsed user returning to a
                // 200-review mountain gets an achievable step, not a guilt wall.
                if (dueCount > 0) {
                  const ask = Math.min(dueCount, 5);
                  const copy = ITEM_COPY.review(ask);
                  if (dueCount > ask) copy.subtitle = `${dueCount} due in total — start with ${ask}`;
                  items.push({ key, ...copy, progress: 0, target: ask, done: false });
                }
                continue;
              }
              const def = QUEST_DEFS.find((d) => d.type === key);
              const progress = Math.min(def.target, q[def.progressCol] || 0);
              const copy = ITEM_COPY[key]();
              items.push({ key, ...copy, progress, target: def.target, done: progress >= def.target });
            }

            const claimableQuests = QUEST_DEFS.filter(
              (d) => (q[d.progressCol] || 0) >= d.target && q[d.claimCol] !== 1
            ).length;

            // Streak safety: solving anything today is what keeps the flame alive.
            const streakSafeToday = (q.solved_today || 0) > 0;

            // Comeback framing (ultra review #22): a learner returning after a week away
            // should be welcomed back with an achievable re-entry, not greeted by the same
            // home screen (and the review cap above already shrinks any decay mountain).
            const daysAway = user.last_active
              ? Math.floor((now - user.last_active) / 86400)
              : 0;
            const comeback = daysAway >= 7 ? { daysAway, dueReviews: dueCount } : null;

            res.json({
              streak: user.streak || 0,
              streakSafeToday,
              claimableQuests,
              comeback,
              items,
            });
          }
        );
      });
    });
  });
});

module.exports = router;
