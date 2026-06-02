// Diagnostic placement assessment: serve the fixed question set, and place the user at a
// starting level from their score (or skip).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

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

router.post('/api/assessment/skip', authenticateToken, (req, res) => {
  db.run(`UPDATE users SET assessment_taken = 1 WHERE id = ?`, [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
