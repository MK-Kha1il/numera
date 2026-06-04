// Archive: paginated search over seeded exercises (always topped up with freshly generated
// problems so it scrolls infinitely), each enriched with its lesson + a safe tip; plus the
// small legacy puzzle list.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateArchiveProblem, getLessonForArchive } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const ExerciseMemory = require('../mathEngine/exerciseMemory');
const LessonSafety = require('../mathEngine/lessonSafety');

const router = express.Router();

const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();

// Attach the (answer-leak-sanitized) lesson + normalized answer to a row.
function decorate(row, parsedOpts) {
  const baseLesson = getLessonForArchive(row.title, row.category, row.stars);
  const { lesson } = LessonSafety.sanitizeLesson(baseLesson, row);
  let normalizedAnswer = row.correct_answer;
  if (parsedOpts && parsedOpts.length > 0 && !parsedOpts.includes(normalizedAnswer)) {
    const plainAnswer = stripLatex(normalizedAnswer);
    const match = parsedOpts.find((opt) => stripLatex(opt) === plainAnswer);
    if (match) normalizedAnswer = match;
  }
  return {
    ...row,
    correct_answer: normalizedAnswer,
    options: parsedOpts,
    lessonTitle: lesson.lessonTitle,
    lessonContent: lesson.lessonContent,
    lessonFormula: lesson.lessonFormula,
    examples: lesson.examples,
    lessonSections: lesson.sections || null,
  };
}

// Search the archive (mixed static seeded challenges & dynamic infinite additions)
router.get('/api/archive/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const category = req.query.category || '';
    const stars = req.query.stars ? parseInt(req.query.stars) : null;
    const query = req.query.q || '';
    // Pagination: clients request fixed-size pages and append them for infinite scroll.
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let sql = 'SELECT * FROM archive_exercises WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (stars) {
      sql += ' AND stars = ?';
      params.push(stars);
    }
    if (query) {
      sql += ' AND (title LIKE ? OR story LIKE ? OR question LIKE ?)';
      params.push(`%${query}%`, `%${query}%`, `%${query}%`);
    }
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await new Promise((resolve, reject) =>
      db.all(sql, params, (err, r) => (err ? reject(err) : resolve(r || [])))
    );

    let results = rows.map((r) => {
      const parsedOpts = typeof r.options === 'string' ? JSON.parse(r.options) : r.options;
      return decorate(r, parsedOpts);
    });

    // Supplement with procedurally generated problems so the archive scrolls infinitely.
    // Each item is run through the diversity engine so a page is a spread of distinct
    // structures rather than a wall of near-identical rows, and so it avoids what THIS
    // learner has recently seen elsewhere in the app.
    const countToGenerate = 10;
    const categoriesList = ['Number Theory', 'Combinatorics', 'Calculus', 'Algebra', 'Mental', 'Arithmetic'];
    const starTiers = [2, 3, 5];
    const recent = await ExerciseMemory.getRecentExposures(db, userId);
    const batchSigs = [];

    for (let i = 0; i < countToGenerate; i++) {
      const genCategory = category || categoriesList[i % categoriesList.length];
      const genStars = stars || starTiers[Math.floor(i / categoriesList.length) % starTiers.length];
      const picked = await ExerciseMemory.pickFreshExercise(
        db,
        userId,
        () => generateArchiveProblem(genCategory, genStars),
        { recent, batchSigs, surface: 'archive', attempts: 5 }
      );
      const generated = picked.problem;
      generated.id = 10000 + i + Math.floor(Math.random() * 90000);
      const parsedOpts = typeof generated.options === 'string' ? JSON.parse(generated.options) : generated.options;
      results.push(decorate(generated, parsedOpts));
    }

    ExerciseMemory.pruneExposures(db, userId).catch(() => {});

    results = results.map((item) => attachTipToProblem(item, true));
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/legacy/puzzles', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, title, story, question, correct_answer, options, explanation, difficulty, category, stars FROM archive_exercises LIMIT 10',
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const formatted = rows.map((r) => ({
        id: r.id,
        title: r.title,
        story: r.story,
        question: r.question,
        correct_answer: r.correct_answer,
        options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
        explanation: r.explanation,
        difficulty: r.difficulty,
        category: r.category || 'arithmetic',
        stars: r.stars || 3,
      }));
      res.json(formatted);
    }
  );
});

module.exports = router;
