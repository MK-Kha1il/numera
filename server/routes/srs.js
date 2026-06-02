// Spaced-repetition review (SuperMemo SM-2): list due topics + record a review outcome.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get Spaced Repetition SRS due lists
router.get('/api/math/srs/due', authenticateToken, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  db.all(
    `SELECT * FROM srs_reviews WHERE user_id = ? AND next_review <= ?`,
    [req.user.id, now],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Post SRS review feedback (SuperMemo SM-2 algorithm)
router.post('/api/math/srs/review', authenticateToken, (req, res) => {
  const { topic, quality } = req.body; // quality 0 to 5
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Valid quality rating (0-5) required' });
  }

  db.get(
    `SELECT * FROM srs_reviews WHERE user_id = ? AND topic = ?`,
    [req.user.id, topic],
    (err, review) => {
      if (err) return res.status(500).json({ error: err.message });

      let ef = review ? review.ease_factor : 2.5;
      let interval = review ? review.interval : 0;
      let reps = review ? review.repetitions : 0;

      // SM-2 calculations
      if (quality >= 3) {
        if (reps === 0) {
          interval = 1; // 1 day
        } else if (reps === 1) {
          interval = 6; // 6 days
        } else {
          interval = Math.round(interval * ef);
        }
        reps += 1;
      } else {
        reps = 0;
        interval = 0; // Immediate review
      }

      // Update ease factor
      ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ef < 1.3) ef = 1.3;

      // Set next review timestamp
      const nextReview =
        quality < 3
          ? Math.floor(Date.now() / 1000) - 5
          : Math.floor(Date.now() / 1000) + interval * 86400; // in seconds

      db.run(
        `INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, topic) DO UPDATE SET
           ease_factor = excluded.ease_factor,
           interval = excluded.interval,
           repetitions = excluded.repetitions,
           next_review = excluded.next_review`,
        [req.user.id, topic, ef, interval, reps, nextReview],
        (saveErr) => {
          if (saveErr) return res.status(500).json({ error: saveErr.message });
          res.json({ topic, ease_factor: ef, interval, next_review: nextReview });
        }
      );
    }
  );
});

module.exports = router;
