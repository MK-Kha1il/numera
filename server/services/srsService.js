// Shared spaced-repetition enqueue (competitive audit #25 — "a ranked loss becomes learning").
//
// SRS reviews (routes/srs.js) are normally seeded when the learner records a review outcome. This
// helper lets the COMPETITIVE path push a concept the learner just missed straight into the review
// queue, due immediately, so the loss turns into a scheduled re-learn instead of a dead end. Used by
// the Reasoning Arena today; reusable by any mode that knows the concept key it missed (CLAUDE.md:
// DB logic shared by ≥2 routes → services/).
'use strict';

// Enqueue `topic` (a concept/template key) as a lapse: due now, repetitions reset, ease factor left
// intact (the next graded review adjusts it). If the topic is already queued sooner, we keep the
// earlier time (MIN) — we never push an already-due item further out. Best-effort + non-throwing so a
// failure here can never block a competitive result.
function enqueueMissedTopic(db, userId, topic, callback) {
  const cb = callback || (() => {});
  if (!topic || !userId) return cb(null);
  const now = Math.floor(Date.now() / 1000);
  db.run(
    `INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review)
     VALUES (?, ?, 2.5, 0, 0, ?)
     ON CONFLICT(user_id, topic) DO UPDATE SET
       interval     = 0,
       repetitions  = 0,
       next_review  = MIN(srs_reviews.next_review, excluded.next_review)`,
    [userId, topic, now],
    (err) => cb(err || null)
  );
}

module.exports = { enqueueMissedTopic };
