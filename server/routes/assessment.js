// Diagnostic placement assessment: serve the fixed question set, and place the user at a
// starting level from their score (or skip).
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

const assessmentQuestions = [
  {
    question: 'What is 15% of 120?',
    correctAnswer: '18',
    options: ['12', '15', '18', '20'],
    explanation: '15% of 120 is 0.15 * 120 = 18.',
  },
  {
    question: 'Solve for x: 3x - 7 = 14',
    correctAnswer: '7',
    options: ['5', '6', '7', '8'],
    explanation: 'Add 7 to both sides: 3x = 21. Divide by 3: x = 7.',
  },
  {
    question: 'If a right triangle has perpendicular sides of lengths 6 and 8, what is the length of the hypotenuse?',
    correctAnswer: '10',
    options: ['9', '10', '11', '12'],
    explanation: 'Use Pythagorean theorem: 6^2 + 8^2 = 36 + 64 = 100. Sqrt(100) = 10.',
  },
  {
    question: 'What is the sum of the first 5 terms of the geometric sequence: 2, 4, 8, 16, 32?',
    correctAnswer: '62',
    options: ['60', '62', '64', '66'],
    explanation: '2 + 4 + 8 + 16 + 32 = 62.',
  },
  {
    question: 'If f(x) = 2x^2 - 3x + 5, what is the value of f(2)?',
    correctAnswer: '7',
    options: ['5', '7', '9', '11'],
    explanation: 'f(2) = 2*(2^2) - 3*(2) + 5 = 2*4 - 6 + 5 = 8 - 6 + 5 = 7.',
  },
  {
    question: 'What is the area of a circle with a radius of 7? (Use pi ≈ 22/7)',
    correctAnswer: '154',
    options: ['44', '77', '154', '308'],
    explanation: 'Area = pi * r^2 = (22/7) * 7 * 7 = 154.',
  },
  {
    question: 'Find the roots of x^2 - 5x + 6 = 0.',
    correctAnswer: '2 and 3',
    options: ['1 and 6', '2 and 3', '-2 and -3', '0 and 5'],
    explanation: '(x - 2)(x - 3) = 0. Roots: x = 2 and x = 3.',
  },
  {
    question: 'What is the limit of (x^2 - 4) / (x - 2) as x approaches 2?',
    correctAnswer: '4',
    options: ['0', '2', '4', 'undefined'],
    explanation: 'Factor: (x - 2)(x + 2) / (x - 2) = x + 2. Limit as x approaches 2 is 2 + 2 = 4.',
  },
  {
    question: 'How many edges does a regular dodecahedron (a 3D solid with 12 pentagonal faces) have?',
    correctAnswer: '30',
    options: ['12', '20', '30', '60'],
    explanation: 'A dodecahedron has 12 faces, 20 vertices, and 30 edges.',
  },
  {
    question: "Using Gauss's summation method, what is the sum of all integers from 1 to 50?",
    correctAnswer: '1275',
    options: ['1225', '1250', '1275', '1300'],
    explanation: 'Sum = n(n+1)/2 = 50 * 51 / 2 = 1275.',
  },
];

router.get('/api/assessment/questions', authenticateToken, (req, res) => {
  res.json(assessmentQuestions);
});

router.post('/api/assessment/submit', authenticateToken, (req, res) => {
  const { score } = req.body;
  if (score === undefined || score < 0 || score > 10) {
    return res.status(400).json({ error: 'Valid score (0-10) required' });
  }

  let assignedLevel = 1;
  if (score >= 9) {
    assignedLevel = 13;
  } else if (score >= 7) {
    assignedLevel = 10;
  } else if (score >= 5) {
    assignedLevel = 7;
  } else if (score >= 3) {
    assignedLevel = 4;
  } else {
    assignedLevel = 1;
  }

  db.get('SELECT rank FROM users WHERE id = ?', [req.user.id], (errU, user) => {
    const currentRank = user ? user.rank : 'Unranked (Placement: 0/5)';
    db.run(`UPDATE users SET level = ?, assessment_taken = 1 WHERE id = ?`, [assignedLevel, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        success: true,
        assignedLevel,
        assignedRank: currentRank,
        rewardsUnlocked: [],
      });
    });
  });
});

// Begin an adaptive diagnostic: create a session and serve the first question (no answer).
router.post('/api/assessment/adaptive/start', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const now = Date.now();
  const q = genAt(DIAG_START_LEVEL);
  db.run(
    `INSERT INTO diagnostic_sessions
       (user_id, level, low, high, asked, correct, current_answer, current_category, current_level, status, created_at)
     VALUES (?, ?, 1, ?, 0, 0, ?, ?, ?, 'active', ?)`,
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

    if (asked >= DIAG_QUESTIONS) {
      const placedLevel = level;
      db.run("UPDATE diagnostic_sessions SET status = 'done', asked = ?, correct = ?, level = ? WHERE id = ?", [asked, correctCount, placedLevel, sessionId]);
      db.run('UPDATE users SET level = ?, assessment_taken = 1 WHERE id = ?', [placedLevel, userId], (uErr) => {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({ done: true, lastCorrect: correct, placedLevel, correct: correctCount, total: DIAG_QUESTIONS });
      });
      return;
    }

    const q = genAt(level);
    db.run(
      `UPDATE diagnostic_sessions
         SET level = ?, low = ?, high = ?, asked = ?, correct = ?, current_answer = ?, current_category = ?, current_level = ?
       WHERE id = ?`,
      [level, low, high, asked, correctCount, q.answer, q.category, level, sessionId],
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
