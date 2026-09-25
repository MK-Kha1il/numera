// Diagnostic placement assessment: a server-graded adaptive diagnostic that places the learner at a
// starting level (or skip). The old fixed 10-question set + POST /api/assessment/submit — which
// took a CLIENT-reported score and set users.level from it, callable at any time — was removed:
// the app only ever used the adaptive flow, and the legacy endpoint was a free level-setter.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateProblem } = require('../mathGenerator');

const router = express.Router();

// ---- Adaptive diagnostic (server-authoritative, branching difficulty) --------------
const DIAG_QUESTIONS = 7;
const DIAG_MAX_LEVEL = 50;
const DIAG_START_LEVEL = 8;
const DIAG_ELO = 1200; // fixed so difficulty depends on the question level, not the (new) user
const normalize = (s) => String(s == null ? '' : s).trim().toLowerCase();

function categoryForLevel(level) {
  if (level > 40) return 'number_theory';
  if (level > 30) return 'calculus';
  if (level > 17) return 'combinatorics';
  if (level > 10) return 'algebra';
  return 'arithmetic';
}

function genAt(level) {
  const category = categoryForLevel(level);
  const p = generateProblem(category, level, Math.floor(Math.random() * 100), DIAG_ELO);
  return { category, question: p.question, options: p.options, answer: p.correctAnswer };
}

// Binary-search the ability level from one response. Returns the new {low, high, level}.
function nextBounds(correct, low, high, level) {
  if (correct) {
    low = Math.min(DIAG_MAX_LEVEL, level + 1);
    level = Math.min(high, Math.ceil((level + high) / 2));
  } else {
    high = Math.max(1, level - 1);
    level = Math.max(low, Math.floor((level + low) / 2));
  }
  return { low, high, level: Math.max(1, Math.min(DIAG_MAX_LEVEL, level)) };
}

// Begin an adaptive diagnostic: create a session and serve the first question (no answer).
router.post('/api/assessment/adaptive/start', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  const q = genAt(DIAG_START_LEVEL);
  db.run(
    `INSERT INTO diagnostic_sessions
       (user_id, level, low, high, asked, correct, current_answer, current_category, current_level, status, created_at, category_log)
     VALUES (?, ?, 1, ?, 0, 0, ?, ?, ?, 'active', ?, '[]')`,
    [userId, DIAG_START_LEVEL, DIAG_MAX_LEVEL, q.answer, q.category, DIAG_START_LEVEL, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ sessionId: this.lastID, questionNumber: 1, totalQuestions: DIAG_QUESTIONS, question: q.question, options: q.options });
    }
  );
});

// Answer the outstanding question; the server scores it, adapts the difficulty, and either
// serves the next question or finalizes the placement (writing users.level authoritatively).
router.post('/api/assessment/adaptive/answer', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { sessionId, answer } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  db.get('SELECT * FROM diagnostic_sessions WHERE id = ? AND user_id = ?', [sessionId, userId], (err, s) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!s) return res.status(404).json({ error: 'Session not found' });
    if (s.status !== 'active') return res.status(400).json({ error: 'Diagnostic already complete' });

    const correct = normalize(answer) === normalize(s.current_answer);
    const correctCount = s.correct + (correct ? 1 : 0);
    const asked = s.asked + 1;
    const { low, high, level } = nextBounds(correct, s.low, s.high, s.level);

    // Append this question's outcome to the per-category trail (powers the onboarding roadmap).
    let categoryLog = [];
    try { categoryLog = JSON.parse(s.category_log || '[]'); } catch { categoryLog = []; }
    categoryLog.push({ category: s.current_category, level: s.current_level, correct });
    const categoryLogJson = JSON.stringify(categoryLog);

    if (asked >= DIAG_QUESTIONS) {
      const placedLevel = level;
      db.run("UPDATE diagnostic_sessions SET status = 'done', asked = ?, correct = ?, level = ?, category_log = ? WHERE id = ?", [asked, correctCount, placedLevel, categoryLogJson, sessionId]);
      // Placement can only move a learner FORWARD: a retake (or a bad day) never erases progress
      // they already earned on the map.
      db.run('UPDATE users SET level = MAX(level, ?), assessment_taken = 1 WHERE id = ?', [placedLevel, userId], (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        db.get('SELECT level FROM users WHERE id = ?', [userId], (lErr, row) => {
          const level = row ? row.level : placedLevel;
          res.json({ done: true, lastCorrect: correct, placedLevel, level, correct: correctCount, total: DIAG_QUESTIONS });
        });
      });
      return;
    }

    const q = genAt(level);
    db.run(
      `UPDATE diagnostic_sessions
         SET level = ?, low = ?, high = ?, asked = ?, correct = ?, current_answer = ?, current_category = ?, current_level = ?, category_log = ?
       WHERE id = ?`,
      [level, low, high, asked, correctCount, q.answer, q.category, level, categoryLogJson, sessionId],
      (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ done: false, lastCorrect: correct, questionNumber: asked + 1, totalQuestions: DIAG_QUESTIONS, question: q.question, options: q.options });
      }
    );
  });
});

router.post('/api/assessment/skip', authenticateToken, (req, res) => {
  db.run(`UPDATE users SET assessment_taken = 1 WHERE id = ?`, [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
