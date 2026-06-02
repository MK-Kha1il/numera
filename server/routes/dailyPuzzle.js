// The rotating calendar-day puzzle: serve the puzzle of the day (with lesson + safe tip),
// and accept a solve submission (idempotent reward, once per day).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { generateArchiveProblem, getLessonForArchive } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const { updateAchievements } = require('../services/achievementService');

const router = express.Router();

// Get the active calendar-day puzzle
router.get('/api/math/daily-puzzle', authenticateToken, (req, res) => {
  db.all('SELECT * FROM archive_exercises WHERE stars >= 3', (err, exercises) => {
    if (err) return res.status(500).json({ error: err.message });

    let puzzle;
    if (exercises && exercises.length > 0) {
      const dayIndex = Math.floor(Date.now() / 86400000) % exercises.length;
      puzzle = exercises[dayIndex];
    } else {
      puzzle = generateArchiveProblem('Number Theory', 4);
    }

    const lesson = getLessonForArchive(puzzle.title, puzzle.category, puzzle.stars);

    db.get('SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?', [req.user.id], (errQ, q) => {
      const solved = q ? q.daily_puzzle_today >= 1 : false;
      const parsedOptions = typeof puzzle.options === 'string' ? JSON.parse(puzzle.options) : puzzle.options;

      // Normalize correct_answer to exactly match one of the options
      // (some archive exercises store plain text answers while options have LaTeX formatting)
      let normalizedAnswer = puzzle.correct_answer;
      if (parsedOptions && parsedOptions.length > 0 && !parsedOptions.includes(normalizedAnswer)) {
        const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();
        const plainAnswer = stripLatex(normalizedAnswer);
        const matchingOption = parsedOptions.find((opt) => stripLatex(opt) === plainAnswer);
        if (matchingOption) {
          normalizedAnswer = matchingOption;
        }
      }

      const puzzleResponse = {
        id: puzzle.id || 9999,
        title: puzzle.title,
        story: puzzle.story,
        question: puzzle.question,
        correct_answer: normalizedAnswer,
        options: parsedOptions,
        explanation: puzzle.explanation,
        category: puzzle.category,
        stars: puzzle.stars,
        source: puzzle.source,
        solved_today: solved,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples,
        lessonSections: lesson.sections || null,
      };

      res.json(attachTipToProblem(puzzleResponse, true));
    });
  });
});

// Submit evaluation for the daily puzzle
router.post('/api/math/daily-puzzle/submit', authenticateToken, idempotency, (req, res) => {
  const { correct } = req.body;
  if (correct === undefined) {
    return res.status(400).json({ error: 'Correctness boolean required' });
  }

  if (!correct) {
    return res.json({ success: false, message: 'Incorrect answer. Try again!' });
  }

  db.get('SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?', [req.user.id], (errQ, q) => {
    if (errQ) return res.status(500).json({ error: errQ.message });

    const alreadySolved = q ? q.daily_puzzle_today >= 1 : false;
    if (alreadySolved) {
      return res.json({ success: true, message: 'Already solved today!', alreadySolved: true });
    }

    db.run('UPDATE user_quests SET daily_puzzle_today = 1 WHERE user_id = ?', [req.user.id], () => {
      db.get('SELECT xp, level, coins, rank, daily_puzzles_solved FROM users WHERE id = ?', [req.user.id], (errU, user) => {
        if (errU || !user) return res.status(500).json({ error: 'User details not found' });

        let newXp = user.xp + 50;
        let newLevel = user.level;
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel += 1;
        }

        const newCoins = user.coins + 30;
        const newSolvedCount = (user.daily_puzzles_solved || 0) + 1;

        db.run(
          'UPDATE users SET xp = ?, level = ?, coins = ?, daily_puzzles_solved = ? WHERE id = ?',
          [newXp, newLevel, newCoins, newSolvedCount, req.user.id],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });

            updateAchievements(req.user.id, () => {
              res.json({
                success: true,
                message: 'Daily puzzle marked solved, rewards credited and achievements updated.',
                rewardCoins: 30,
                rewardXp: 50,
                xp: newXp,
                level: newLevel,
                coins: newCoins,
                rank: user.rank || 'Unranked (Placement: 0/5)',
              });
            });
          }
        );
      });
    });
  });
});

module.exports = router;
