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

const router = express.Router();

const STARTING_LIVES = 3;
const FIXED_ELO = 1200;          // standardized so the ladder is fair (difficulty ∝ score, not the player's profile)
// A correct answer faster than this (ms) is flagged for integrity review. Env-tunable so tests
// can disable it (the test harness submits answers in microseconds).
const SUPERHUMAN_MS = Number(process.env.PUZZLE_RUSH_SUPERHUMAN_MS || 350);
const MAX_COIN_REWARD = 50;

const normalize = (s) => String(s == null ? '' : s).trim().toLowerCase();

// The difficulty ladder: level rises with score; category follows the level band (mirrors the
// generator's CONCEPT_TO_LEVEL bands so every rung has real templates).
function ladderFor(score) {
  const level = Math.min(49, 1 + score);
  let category = 'arithmetic';
  if (level > 40) category = 'number_theory';
  else if (level > 30) category = 'calculus';
  else if (level > 17) category = 'combinatorics';
  else if (level > 10) category = 'algebra';
  return { category, level };
}

function nextProblem(score) {
  const { category, level } = ladderFor(score);
  const prob = generateProblem(category, level, Math.floor(Math.random() * 100), FIXED_ELO);
  return { category, level, prob };
}

// Start a fresh run: create the row, serve the first problem (without its answer).
router.post('/api/puzzle-rush/start', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  const { category, level, prob } = nextProblem(0);
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
    const correct = normalize(answer) === normalize(run.current_answer);
    // Integrity seam: a correct answer faster than humanly possible flags the run.
    const integrity = correct && elapsed < SUPERHUMAN_MS ? 1 : run.integrity_flag;

    let score = run.score;
    let strikes = run.strikes;
    if (correct) score += 1;
    else strikes += 1;

    if (strikes >= STARTING_LIVES) {
      const reward = Math.min(score, MAX_COIN_REWARD);
      await tx.run(
        `UPDATE puzzle_rush_runs SET score = ?, strikes = ?, status = 'finished', integrity_flag = ?, ended_at = ?, last_action_at = ? WHERE id = ?`,
        [score, strikes, integrity, now, now, runId]
      );
      if (reward > 0) {
        await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, userId]);
      }
      return { correct, gameOver: true, finalScore: score, correctAnswer: run.current_answer, reward };
    }

    const nextIndex = run.current_index + 1;
    const { category, level, prob } = nextProblem(score);
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
