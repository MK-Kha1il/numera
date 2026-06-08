// Calibrated bot duels (audit #1.8 / top-50 #30). Practice competition on demand against an AI
// opponent whose per-problem accuracy is fixed by tier — no matchmaking wait, no second human.
// Server-authoritative: the bot's score is rolled at /start and stored (never revealed), the
// player's problem set is stored with answers, and the match resolves the instant they submit.
// Coins-only and reward-capped per day so it can't be farmed; NRS/ranked stays human-only.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem } = require('../mathGenerator');

const router = express.Router();

const PROBLEM_COUNT = 5;
const FIXED_ELO = 1200;
const DAILY_REWARD_CAP = 10; // rewarded bot wins per UTC day (anti-farm; you can still play past it)

// Difficulty tiers: a displayed bot rating, the bot's per-problem accuracy, and the win reward.
const TIERS = {
  easy: { rating: 900, accuracy: 0.5, reward: 10 },
  medium: { rating: 1200, accuracy: 0.68, reward: 18 },
  hard: { rating: 1500, accuracy: 0.85, reward: 28 },
};

// A fixed, varied spread so a match isn't all one concept (difficulty comes from the bot, not the
// problems).
const LADDER = [
  ['arithmetic', 5],
  ['algebra', 11],
  ['arithmetic', 9],
  ['algebra', 13],
  ['combinatorics', 21],
];

const normalize = (s) => String(s == null ? '' : s).trim().toLowerCase();
const dayStart = () => Math.floor(Date.now() / 86400000) * 86400000;

function buildProblemSet() {
  return LADDER.slice(0, PROBLEM_COUNT).map(([category, level]) => {
    const p = generateProblem(category, level, Math.floor(Math.random() * 100), FIXED_ELO);
    return { question: p.question, options: p.options, answer: p.correctAnswer };
  });
}

// Roll the bot's score: each problem is a Bernoulli trial at the tier's accuracy.
function rollBotScore(accuracy, count) {
  let s = 0;
  for (let i = 0; i < count; i++) if (Math.random() < accuracy) s += 1;
  return s;
}

// Start a bot duel: pick a tier, generate the set, pre-roll the bot's score, return the problems
// (answers stripped).
router.post('/api/duel/bot/start', authenticateToken, (req, res) => {
  const tierKey = String((req.body && req.body.tier) || 'medium');
  const tier = TIERS[tierKey];
  if (!tier) return res.status(400).json({ error: 'tier must be easy, medium, or hard' });

  const problems = buildProblemSet();
  const botScore = rollBotScore(tier.accuracy, problems.length);
  const now = Date.now();
  db.run(
    `INSERT INTO bot_matches (user_id, tier, bot_rating, problems_json, problem_count, bot_score, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [req.user.id, tierKey, tier.rating, JSON.stringify(problems), problems.length, botScore, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        matchId: this.lastID,
        tier: tierKey,
        botRating: tier.rating,
        problemCount: problems.length,
        problems: problems.map((p) => ({ question: p.question, options: p.options })),
      });
    }
  );
});

// Submit answers, score against the pre-rolled bot, resolve, and award coins (capped per day).
router.post('/api/duel/bot/:id/play', authenticateToken, idempotency, (req, res) => {
  const uid = req.user.id;
  const id = parseInt(req.params.id, 10);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  if (!answers) return res.status(400).json({ error: 'answers array required' });

  withTransaction(async (tx) => {
    const m = await tx.get('SELECT * FROM bot_matches WHERE id = ? AND user_id = ?', [id, uid]);
    if (!m) throw httpError(404, 'Match not found');
    if (m.status !== 'pending') throw httpError(400, 'This match is already finished');

    const problems = JSON.parse(m.problems_json);
    let userScore = 0;
    for (let i = 0; i < problems.length; i++) {
      if (normalize(answers[i]) === normalize(problems[i].answer)) userScore += 1;
    }

    let winner = 'draw';
    if (userScore > m.bot_score) winner = 'user';
    else if (m.bot_score > userScore) winner = 'bot';

    // Anti-farm: only the first DAILY_REWARD_CAP bot wins each UTC day pay out.
    let reward = 0;
    if (winner === 'user') {
      const tier = TIERS[m.tier] || TIERS.medium;
      const row = await tx.get(
        "SELECT COUNT(*) AS wins FROM bot_matches WHERE user_id = ? AND winner = 'user' AND reward > 0 AND finished_at >= ?",
        [uid, dayStart()]
      );
      if ((row.wins || 0) < DAILY_REWARD_CAP) reward = tier.reward;
    }

    await tx.run('UPDATE bot_matches SET user_score = ?, winner = ?, reward = ?, status = \'finished\', finished_at = ? WHERE id = ?', [userScore, winner, reward, Date.now(), id]);
    if (reward > 0) await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, uid]);

    return { userScore, botScore: m.bot_score, winner, reward };
  })
    .then((payload) => res.json({ success: true, ...payload }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
