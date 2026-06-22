// The rotating calendar-day puzzle: serve the puzzle of the day (with lesson + safe tip),
// and accept a solve submission (idempotent reward, once per day).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { generateArchiveProblem, getLessonForArchiveProblem } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const { updateAchievements } = require('../services/achievementService');
const ExerciseMemory = require('../mathEngine/exerciseMemory');
const LessonSafety = require('../mathEngine/lessonSafety');
const { buildVisualSpecJson } = require('../mathEngine/visualEngine');

const router = express.Router();

// The "theme of the day": a deterministic category + difficulty rotation so the puzzle
// concept changes every day (and cycles difficulty across the week) instead of pulling
// from a tiny fixed pool that repeats. The *concept* is the shared daily theme; the
// concrete variant is then freshened per-learner via the diversity engine below.
const DAILY_CATEGORIES = ['Number Theory', 'Combinatorics', 'Calculus', 'Algebra', 'Mental', 'Arithmetic'];
const DAILY_STAR_TIERS = [3, 4, 5];

function themeForDay(dayNumber) {
  const category = DAILY_CATEGORIES[dayNumber % DAILY_CATEGORIES.length];
  const stars = DAILY_STAR_TIERS[Math.floor(dayNumber / DAILY_CATEGORIES.length) % DAILY_STAR_TIERS.length];
  return { category, stars };
}

// Get the active calendar-day puzzle
router.get('/api/math/daily-puzzle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dayNumber = Math.floor(Date.now() / 86400000);
    const { category, stars } = themeForDay(dayNumber);

    // Pick a variant of today's concept this learner has not recently seen.
    const recent = await ExerciseMemory.getRecentExposures(db, userId);
    const picked = await ExerciseMemory.pickFreshExercise(
      db,
      userId,
      () => generateArchiveProblem(category, stars),
      { recent, surface: 'daily', attempts: 8 }
    );
    const puzzle = picked.problem;

    // Concept-anchored: the lesson resolves from the puzzle's own conceptKey (no fuzzy title match).
    const baseLesson = getLessonForArchiveProblem(puzzle);
    // Phase 8: the lesson teaches the concept — it must not contain a worked example that
    // solves (or merely restates) today's puzzle.
    const { lesson } = LessonSafety.sanitizeLesson(baseLesson, puzzle);

    // Concept-anchored visual: build a manipulative from the puzzle's OWN concept (not a regex guess),
    // answer-stripped. Most advanced daily concepts yield none; the ones that do (e.g. expected value)
    // get a coherent, on-concept manipulative. See docs/ContentEngineAudit-2026-06.md §4 (Phase 2).
    let interactiveVisualJson = null;
    try {
      interactiveVisualJson = buildVisualSpecJson(puzzle, puzzle.conceptKey, null);
      if (interactiveVisualJson) interactiveVisualJson = LessonSafety.sanitizeVisualJson(interactiveVisualJson);
    } catch (_) {
      interactiveVisualJson = null;
    }

    const q = await new Promise((resolve) =>
      db.get('SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?', [userId], (e, r) => resolve(r))
    );
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
      conceptKey: puzzle.conceptKey,
      interactiveVisualJson,
      solved_today: solved,
      lessonTitle: lesson.lessonTitle,
      lessonContent: lesson.lessonContent,
      lessonFormula: lesson.lessonFormula,
      examples: lesson.examples,
      lessonSections: lesson.sections || null,
    };

    res.json(attachTipToProblem(puzzleResponse, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
