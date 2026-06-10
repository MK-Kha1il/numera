// Public read-only views of other users: profile snapshot and their public collections.
//
// NOTE: this router owns the /api/user/:userId PARAM routes and must be mounted AFTER the
// account router (which owns specific /api/user/* paths) so the param route does not shadow
// them. Keep it last among the /api/user mounts.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/api/user/:userId', authenticateToken, (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });

  db.get(
    `
    SELECT id, username, xp, level, coins, rank, active_badge, theme, avatar, active_banner, solved_count, arena_wins, elo, competitive_matches, profile_private
    FROM users
    WHERE id = ?
  `,
    [targetId],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: 'User not found' });

      // Honor the "private profile" setting: a user may always view their own profile,
      // but another user's profile is hidden when they have opted into privacy. Without
      // this check the profile_private toggle (set in account settings) did nothing.
      if (user.profile_private === 1 && targetId !== req.user.id) {
        return res.status(403).json({ error: 'This profile is private.', private: true });
      }

      db.get(`SELECT * FROM user_mastery WHERE user_id = ?`, [targetId], (errM, mastery) => {
        const mast = mastery || {
          arithmetic_correct: 0,
          mental_correct: 0,
          algebra_correct: 0,
          calculus_correct: 0,
          combinatorics_correct: 0,
          number_theory_correct: 0,
          geometry_correct: 0,
          integers_correct: 0,
          decimals_correct: 0,
          fractions_correct: 0,
          number_sense_correct: 0,
          statistics_correct: 0,
          expressions_correct: 0,
          powers_correct: 0,
        };
        res.json({
          id: user.id,
          username: user.username,
          xp: user.xp,
          level: user.level,
          coins: user.coins,
          rank: user.rank,
          active_badge: user.active_badge,
          theme: user.theme,
          avatar: user.avatar,
          active_banner: user.active_banner,
          solved_count: user.solved_count || 0,
          arena_wins: user.arena_wins || 0,
          elo: user.elo,
          competitive_matches: user.competitive_matches,
          mastery: {
            arithmetic_correct: mast.arithmetic_correct || 0,
            mental_correct: mast.mental_correct || 0,
            algebra_correct: mast.algebra_correct || 0,
            calculus_correct: mast.calculus_correct || 0,
            combinatorics_correct: mast.combinatorics_correct || 0,
            number_theory_correct: mast.number_theory_correct || 0,
            geometry_correct: mast.geometry_correct || 0,
            integers_correct: mast.integers_correct || 0,
            decimals_correct: mast.decimals_correct || 0,
            fractions_correct: mast.fractions_correct || 0,
            number_sense_correct: mast.number_sense_correct || 0,
            statistics_correct: mast.statistics_correct || 0,
            expressions_correct: mast.expressions_correct || 0,
            powers_correct: mast.powers_correct || 0,
          },
        });
      });
    }
  );
});

router.get('/api/user/:userId/public-collections', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(targetUserId)) return res.status(400).json({ error: 'Invalid user ID' });

  // Get public collections
  db.all(
    'SELECT id, name, created_at FROM saved_collections WHERE user_id = ? AND is_public = 1 ORDER BY name ASC',
    [targetUserId],
    (err, collections) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!collections || collections.length === 0) {
        return res.json([]);
      }

      // Fetch saved exercises for each public collection
      db.all(
        `SELECT id, title, category, question, correct_answer, options, explanation, collection_id
         FROM saved_exercises
         WHERE user_id = ? AND collection_id IN (
           SELECT id FROM saved_collections WHERE user_id = ? AND is_public = 1
         )`,
        [targetUserId, targetUserId],
        (errEx, exercises) => {
          if (errEx) return res.status(500).json({ error: errEx.message });

          const results = collections.map((col) => {
            const colExercises = (exercises || [])
              .filter((ex) => ex.collection_id === col.id)
              .map((ex) => {
                let opts = [];
                try {
                  opts = JSON.parse(ex.options);
                } catch (e) {
                  opts = [];
                }
                return {
                  id: ex.id,
                  title: ex.title || 'Saved Exercise',
                  story: '',
                  question: ex.question,
                  correct_answer: ex.correct_answer,
                  options: opts,
                  explanation: ex.explanation,
                  category: ex.category,
                  stars: 3,
                  source: 'Favorites',
                  collection_id: ex.collection_id,
                };
              });
            return {
              id: col.id,
              name: col.name,
              created_at: col.created_at,
              exercises: colExercises,
            };
          });

          res.json(results);
        }
      );
    }
  );
});

module.exports = router;
