// Puzzle Rush — solo time-attack ladder (see docs/specs/Spec-CompetitionExpansion.md §4.1).
// Server-authoritative: the server generates each problem, holds the correct answer in the run
// row (the client never sees it before submitting), scores submissions, and ends the run on the
// 3rd strike. Difficulty climbs with score. A basic integrity seam flags superhuman-speed
// answers and excludes those runs from the leaderboard (the full integrityEngine is a later
// spec item). Reward grant on finish is transactional. Times here are epoch milliseconds.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem } = require('../mathGenerator');
const { assessAnswer, verdictForRun } = require('../services/integrityEngine');

const router = express.Router();

const STARTING_LIVES = 3;
const FIXED_ELO = 1200;          // standardized so the ladder is fair (difficulty ∝ score, not the player's profile)
const MAX_COIN_REWARD = 50;

const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { categoryForLevel, rushLevel } = require('../lib/arenaDifficulty');

// The difficulty ladder: one level per point, STARTING AT THE PLAYER'S OWN LEVEL (a level-30
// player no longer opens on "10 × 8"); the category follows the level band. Elo stays fixed
// so within a rung the problem flavor is standardized.
function nextProblem(baseLevel, score) {
  const level = rushLevel(baseLevel, score);
  const category = categoryForLevel(level);
  const prob = generateProblem(category, level, Math.floor(Math.random() * 100), FIXED_ELO);
  return { category, level, prob };
}

// Start a fresh run: create the row, serve the first problem (without its answer). The run's
// starting rung is the player's current level.
router.post('/api/puzzle-rush/start', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  db.get('SELECT level FROM users WHERE id = ?', [userId], (uErr, userRow) => {
    if (uErr) return res.status(500).json({ error: uErr.message });
    const { category, level, prob } = nextProblem((userRow && userRow.level) || 1, 0);
    db.run(
      `INSERT INTO puzzle_rush_runs
         (user_id, score, strikes, current_index, current_answer, current_category, current_level, status, started_at, last_action_at)
       VALUES (?, 0, 0, 0, ?, ?, ?, 'active', ?, ?)`,
      [userId, prob.correctAnswer, category, level, now, now],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({
          runId: this.lastID,
          index: 0,
          lives: STARTING_LIVES,
          score: 0,
          problem: { question: prob.question, options: prob.options },
        });
      }
    );
  });
});

// Submit an answer for the current problem. Advances the ladder, or ends the run on the 3rd
// strike (granting coins). Wrong-but-not-final answers reveal the missed answer and serve the
// next problem so the run keeps moving.
router.post('/api/puzzle-rush/submit', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  const { runId, index, answer } = req.body;
  if (runId === undefined || index === undefined) {
    return res.status(400).json({ error: 'runId and index are required' });
  }

  withTransaction(async (tx) => {
    const run = await tx.get('SELECT * FROM puzzle_rush_runs WHERE id = ? AND user_id = ?', [runId, userId]);
    if (!run) throw httpError(404, 'Run not found');
    if (run.status !== 'active') throw httpError(400, 'Run already finished');
    // Guard against replay / desync: a submission must target the current rung.
    if (Number(index) !== run.current_index) throw httpError(409, 'Out-of-sync submission');

    const now = Date.now();
    const elapsed = now - (run.last_action_at || now);
    const correct = areEquivalent(answer, run.current_answer);
    // Integrity: the difficulty-scaled timing scorer flags superhuman-fast correct answers.
    // integrity_flag holds the running COUNT of flagged answers (0 = clean → eligible for boards).
    const assessment = assessAnswer({ elapsedMs: elapsed, correct, level: run.current_level });
    const integrity = run.integrity_flag + (assessment.flagged ? 1 : 0);

    let score = run.score;
    let strikes = run.strikes;
    if (correct) score += 1;
    else strikes += 1;

    if (strikes >= STARTING_LIVES) {
      // A 'cheat' verdict (enough flagged answers) withholds the reward; any flag excludes the
      // run from the leaderboard (filtered on integrity_flag = 0).
      const verdict = verdictForRun({ flaggedFastCount: integrity, totalAnswers: score + strikes });
      const reward = verdict === 'cheat' ? 0 : Math.min(score, MAX_COIN_REWARD);
      await tx.run(
        `UPDATE puzzle_rush_runs SET score = ?, strikes = ?, status = 'finished', integrity_flag = ?, ended_at = ?, last_action_at = ? WHERE id = ?`,
        [score, strikes, integrity, now, now, runId]
      );
      if (reward > 0) {
        await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, userId]);
      }
      // Credit the "Rush Hour" daily quest for completing a run.
      await tx.run('UPDATE user_quests SET puzzle_rush_today = puzzle_rush_today + 1 WHERE user_id = ?', [userId]);
      return { correct, gameOver: true, finalScore: score, correctAnswer: run.current_answer, reward, flagged: integrity > 0 };
    }

    const nextIndex = run.current_index + 1;
    // Recover the run's starting rung from the stored state (level = base + score while below
    // the cap; once capped both stay capped), so no schema change is needed.
    const baseLevel = Math.max(1, run.current_level - run.score);
    const { category, level, prob } = nextProblem(baseLevel, score);
    await tx.run(
      `UPDATE puzzle_rush_runs
         SET score = ?, strikes = ?, current_index = ?, current_answer = ?, current_category = ?, current_level = ?, integrity_flag = ?, last_action_at = ?
       WHERE id = ?`,
      [score, strikes, nextIndex, prob.correctAnswer, category, level, integrity, now, runId]
    );
    return {
      correct,
      gameOver: false,
      score,
      lives: STARTING_LIVES - strikes,
      // reveal the missed answer only when they got it wrong
      correctAnswer: correct ? undefined : run.current_answer,
      index: nextIndex,
      problem: { question: prob.question, options: prob.options },
    };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Top scores (best finished run per user, integrity-clean) + the caller's personal best.
router.get('/api/puzzle-rush/leaderboard', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.username, MAX(r.score) AS best
       FROM puzzle_rush_runs r
       JOIN users u ON u.id = r.user_id
      WHERE r.status = 'finished' AND r.integrity_flag = 0
      GROUP BY r.user_id
      ORDER BY best DESC
      LIMIT 20`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        "SELECT MAX(score) AS best FROM puzzle_rush_runs WHERE user_id = ? AND status = 'finished'",
        [req.user.id],
        (e2, mine) => {
          res.json({ leaderboard: rows || [], personalBest: (mine && mine.best) || 0 });
        }
      );
    }
  );
});

module.exports = router;
