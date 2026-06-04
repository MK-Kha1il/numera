// Archive: paginated search over seeded exercises (always topped up with freshly generated
// problems so it scrolls infinitely), each enriched with its lesson + a safe tip; plus the
// small legacy puzzle list.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { generateArchiveProblem, getLessonForArchive } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');

const router = express.Router();

// Search the archive (mixed static seeded challenges & dynamic infinite additions)
router.get('/api/archive/search', authenticateToken, (req, res) => {
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

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    let results = rows.map((r) => {
      const lesson = getLessonForArchive(r.title, r.category, r.stars);
      const parsedOpts = typeof r.options === 'string' ? JSON.parse(r.options) : r.options;
      let normalizedAnswer = r.correct_answer;
      if (parsedOpts && parsedOpts.length > 0 && !parsedOpts.includes(normalizedAnswer)) {
        const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();
        const plainAnswer = stripLatex(normalizedAnswer);
        const match = parsedOpts.find((opt) => stripLatex(opt) === plainAnswer);
        if (match) normalizedAnswer = match;
      }
      return {
        ...r,
        correct_answer: normalizedAnswer,
        options: parsedOpts,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples,
        lessonSections: lesson.sections || null,
      };
    });

    // Supplement with 10 procedurally generated problems to ensure it is always an infinite scrolling archive
    const countToGenerate = 10;
    const categoriesList = ['Number Theory', 'Combinatorics', 'Calculus', 'Algebra', 'Mental', 'Arithmetic'];
    // Star tiers that map to the generator's distinct title variants (low ≤2, mid =3, high ≥4).
    const starTiers = [2, 3, 5];

    for (let i = 0; i < countToGenerate; i++) {
      // Vary the category each item (and bump the star tier each full pass) so the generated
      // supplement is a spread of distinct titles instead of 10 copies of one — otherwise a
      // search returns a wall of identical-looking rows. Honor explicit category/stars filters.
      const genCategory = category || categoriesList[i % categoriesList.length];
      const genStars = stars || starTiers[Math.floor(i / categoriesList.length) % starTiers.length];
      const generated = generateArchiveProblem(genCategory, genStars);
      generated.id = 10000 + i + Math.floor(Math.random() * 90000);
      generated.options = typeof generated.options === 'string' ? JSON.parse(generated.options) : generated.options;

      const lesson = getLessonForArchive(generated.title, generated.category, generated.stars);
      results.push({
        ...generated,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples,
        lessonSections: lesson.sections || null,
      });
    }

    results = results.map((item) => attachTipToProblem(item, true));
    res.json(results);
  });
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
