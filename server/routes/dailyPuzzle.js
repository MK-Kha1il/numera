// The rotating calendar-day puzzle: serve the puzzle of the day (with lesson + safe tip), and
// accept a solve submission (server-graded, rewarded once per local day).
//
// The day is the learner's LOCAL calendar day (lib/streak.js day clock — the same one the streak
// and the daily quest reset use). The first fetch of a day generates the learner's variant and
// pins it (daily_puzzle_serves), so refreshing never changes the numbers mid-day, and the submit
// grades the submitted answer against that pinned variant.
const express = require('express');
const { db } = require('../db');
const { withTransaction, httpError } = require('../dbx');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { generateArchiveProblem, getLessonForArchive } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const { updateAchievements } = require('../services/achievementService');
const { ensureDailyReset } = require('../services/userService');
const { creditStreak, localToday } = require('../services/streakService');
const { issueSoloTicket } = require('../services/soloSessionService');
const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { applyXp } = require('../lib/progression');
const ExerciseMemory = require('../mathEngine/exerciseMemory');
const LessonSafety = require('../mathEngine/lessonSafety');

const { recordCoins } = require('../services/economyLedger');
const router = express.Router();

const DAILY_REWARD_XP = 50;
const DAILY_REWARD_COINS = 30;

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

const dbGet = (sql, params) => new Promise((resolve, reject) => db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
const dbRun = (sql, params) => new Promise((resolve, reject) => db.run(sql, params, (e) => (e ? reject(e) : resolve())));

// Build today's puzzle payload for a learner (everything except the per-request solved flag).
async function buildPuzzle(userId, day) {
  const { category, stars } = themeForDay(day);

  // Pick a variant of today's concept this learner has not recently seen.
  const recent = await ExerciseMemory.getRecentExposures(db, userId);
  const picked = await ExerciseMemory.pickFreshExercise(db, userId, () => generateArchiveProblem(category, stars), {
    recent,
    surface: 'daily',
    attempts: 8,
  });
  const puzzle = picked.problem;

  const baseLesson = getLessonForArchive(puzzle.title, puzzle.category, puzzle.stars);
  // The lesson teaches the concept — it must not contain a worked example that
  // solves (or merely restates) today's puzzle.
  const { lesson } = LessonSafety.sanitizeLesson(baseLesson, puzzle);
  const parsedOptions = typeof puzzle.options === 'string' ? JSON.parse(puzzle.options) : puzzle.options;

  // Normalize correct_answer to exactly match one of the options
  // (some archive exercises store plain text answers while options have LaTeX formatting)
  let normalizedAnswer = puzzle.correct_answer;
  if (parsedOptions && parsedOptions.length > 0 && !parsedOptions.includes(normalizedAnswer)) {
    const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();
    const plainAnswer = stripLatex(normalizedAnswer);
    const matchingOption = parsedOptions.find((opt) => stripLatex(opt) === plainAnswer);
    if (matchingOption) normalizedAnswer = matchingOption;
  }

  return attachTipToProblem(
    {
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
      lessonTitle: lesson.lessonTitle,
      lessonContent: lesson.lessonContent,
      lessonFormula: lesson.lessonFormula,
      examples: lesson.examples,
      lessonSections: lesson.sections || null,
    },
    true
  );
}

// Get the active calendar-day puzzle (pinned per learner per local day).
router.get('/api/math/daily-puzzle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureDailyReset(userId);
    const day = await localToday(userId);

    let row = await dbGet('SELECT payload, solved_at FROM daily_puzzle_serves WHERE user_id = ? AND day = ?', [userId, day]);
    let payload;
    if (row) {
      payload = JSON.parse(row.payload);
    } else {
      payload = await buildPuzzle(userId, day);
      // INSERT OR IGNORE + re-read: two concurrent first fetches settle on one pinned variant.
      await dbRun('INSERT OR IGNORE INTO daily_puzzle_serves (user_id, day, payload, answer, created_at) VALUES (?, ?, ?, ?, ?)', [
        userId,
        day,
        JSON.stringify(payload),
        String(payload.correct_answer),
        Math.floor(Date.now() / 1000),
      ]);
      row = await dbGet('SELECT payload, solved_at FROM daily_puzzle_serves WHERE user_id = ? AND day = ?', [userId, day]);
      payload = JSON.parse(row.payload);
    }

    // Serve ticket for the session recap (/complete never pays for the daily puzzle itself).
    await issueSoloTicket(userId, { mode: 'daily_puzzle', servedCount: 1 });
    res.json({ ...payload, solved_today: !!row.solved_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// A submitted answer matches the pinned one exactly (the tapped option / typed value, trimmed and
// case-insensitive — what the gameplay screen checks) or mathematically (answerEquivalence).
function isCorrectAnswer(submitted, expected) {
  const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();
  if (!norm(submitted)) return false;
  return norm(submitted) === norm(expected) || areEquivalent(submitted, expected);
}

// Submit today's answer. Server-graded against the pinned variant; the reward (XP + coins + the
// daily-puzzle quest + streak day) is granted at most once per local day via the conditional
// `solved_at IS NULL` update, inside one transaction with the grant.
router.post('/api/math/daily-puzzle/submit', authenticateToken, idempotency, async (req, res) => {
  const userId = req.user.id;
  const { answer } = req.body || {};
  if (answer === undefined || answer === null || String(answer).trim() === '') {
    return res.status(400).json({ error: 'answer required' });
  }

  try {
    await ensureDailyReset(userId);
    const day = await localToday(userId);
    const pinned = await dbGet('SELECT answer, solved_at FROM daily_puzzle_serves WHERE user_id = ? AND day = ?', [userId, day]);
    if (!pinned) return res.status(409).json({ error: "Open today's puzzle before submitting." });
    if (pinned.solved_at) return res.json({ success: true, message: 'Already solved today!', alreadySolved: true });
    if (!isCorrectAnswer(answer, pinned.answer)) {
      return res.json({ success: false, correct: false, message: 'Incorrect answer. Try again!' });
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await withTransaction(async (tx) => {
      const claimed = await tx.run('UPDATE daily_puzzle_serves SET solved_at = ? WHERE user_id = ? AND day = ? AND solved_at IS NULL', [
        now,
        userId,
        day,
      ]);
      if (claimed.changes === 0) return { alreadySolved: true };

      const user = await tx.get('SELECT xp, level, coins, rank FROM users WHERE id = ?', [userId]);
      if (!user) throw httpError(404, 'User details not found');
      const progressed = applyXp(user.xp, user.level, DAILY_REWARD_XP);
      await tx.run(
        'UPDATE users SET xp = ?, level = ?, coins = coins + ?, daily_puzzles_solved = daily_puzzles_solved + 1 WHERE id = ?',
        [progressed.xp, progressed.level, DAILY_REWARD_COINS, userId]
      );
      await tx.run('UPDATE user_quests SET daily_puzzle_today = 1 WHERE user_id = ?', [userId]);
      return { alreadySolved: false, user, progressed };
    });

    if (result.alreadySolved) return res.json({ success: true, message: 'Already solved today!', alreadySolved: true });

    recordCoins('daily_puzzle', DAILY_REWARD_COINS);
    await creditStreak(userId);
    updateAchievements(userId, () => {
      res.json({
        success: true,
        correct: true,
        message: 'Daily puzzle marked solved, rewards credited and achievements updated.',
        rewardCoins: DAILY_REWARD_COINS,
        rewardXp: DAILY_REWARD_XP,
        xp: result.progressed.xp,
        level: result.progressed.level,
        coins: (result.user.coins || 0) + DAILY_REWARD_COINS,
        rank: result.user.rank || 'Unranked (Placement: 0/5)',
      });
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not submit the puzzle.' });
  }
});

module.exports = router;
