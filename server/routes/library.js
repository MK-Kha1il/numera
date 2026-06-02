// The learner's personal library: saved/favorited exercises and the collections
// (notebooks) they organize them into. All scoped to req.user.id.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// -------------------------------------------------------------
// FAVORITES / SAVED EXERCISES
// -------------------------------------------------------------
router.get('/api/favorites', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, title, category, question, correct_answer, options, explanation, collection_id
     FROM saved_exercises
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const mapped = (rows || []).map((r) => {
        let opts = [];
        try {
          opts = JSON.parse(r.options);
        } catch (e) {
          opts = [];
        }
        return {
          id: r.id,
          title: r.title || 'Saved Exercise',
          story: '',
          question: r.question,
          correct_answer: r.correct_answer,
          options: opts,
          explanation: r.explanation,
          category: r.category,
          stars: 3,
          source: 'Favorites',
          collection_id: r.collection_id,
        };
      });
      res.json(mapped);
    }
  );
});

router.post('/api/favorites/toggle', authenticateToken, (req, res) => {
  const { title, category, question, correct_answer, options, explanation } = req.body;
  if (!category || !question || !correct_answer || !options || !explanation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.get(
    `SELECT id FROM saved_exercises WHERE user_id = ? AND question = ?`,
    [req.user.id, question],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(`DELETE FROM saved_exercises WHERE id = ?`, [row.id], (errDel) => {
          if (errDel) return res.status(500).json({ error: errDel.message });
          return res.json({ success: true, saved: false, message: 'Removed from favorites' });
        });
      } else {
        const now = Math.floor(Date.now() / 1000);
        const optionsStr = JSON.stringify(options);
        db.run(
          `INSERT INTO saved_exercises (user_id, title, category, question, correct_answer, options, explanation, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.id, title || '', category, question, correct_answer, optionsStr, explanation, now],
          (errIns) => {
            if (errIns) return res.status(500).json({ error: errIns.message });
            return res.json({ success: true, saved: true, message: 'Added to favorites' });
          }
        );
      }
    }
  );
});

// -------------------------------------------------------------
// SAVED NOTEBOOK COLLECTIONS
// -------------------------------------------------------------
router.get('/api/collections', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, user_id, name, is_public, created_at FROM saved_collections WHERE user_id = ? ORDER BY name ASC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.post('/api/collections', authenticateToken, (req, res) => {
  const { name, is_public } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required.' });
  }
  const now = Math.floor(Date.now() / 1000);
  const isPub = is_public ? 1 : 0;

  db.run(
    'INSERT INTO saved_collections (user_id, name, is_public, created_at) VALUES (?, ?, ?, ?)',
    [req.user.id, name.trim(), isPub, now],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A collection with this name already exists.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID, name: name.trim(), is_public: isPub });
    }
  );
});

router.put('/api/collections/:id', authenticateToken, (req, res) => {
  const collectionId = parseInt(req.params.id, 10);
  if (isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });

  const { name, is_public } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required.' });
  }
  const isPub = is_public ? 1 : 0;

  db.run(
    'UPDATE saved_collections SET name = ?, is_public = ? WHERE id = ? AND user_id = ?',
    [name.trim(), isPub, collectionId, req.user.id],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A collection with this name already exists.' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Collection not found.' });
      res.json({ success: true, message: 'Collection updated successfully.' });
    }
  );
});

router.delete('/api/collections/:id', authenticateToken, (req, res) => {
  const collectionId = parseInt(req.params.id, 10);
  if (isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });

  // Delete collection
  db.run(
    'DELETE FROM saved_collections WHERE id = ? AND user_id = ?',
    [collectionId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Collection not found.' });

      // Clear associated collection_id references in saved_exercises
      db.run(
        'UPDATE saved_exercises SET collection_id = NULL WHERE collection_id = ? AND user_id = ?',
        [collectionId, req.user.id],
        (errUpdate) => {
          if (errUpdate) return res.status(500).json({ error: errUpdate.message });
          res.json({ success: true, message: 'Collection deleted successfully.' });
        }
      );
    }
  );
});

router.post('/api/favorites/assign-collection', authenticateToken, (req, res) => {
  const { exerciseId, collectionId } = req.body;
  if (!exerciseId) return res.status(400).json({ error: 'Exercise ID is required.' });

  // collectionId can be null to unassign
  const collId = collectionId ? parseInt(collectionId, 10) : null;

  const updateExercise = () => {
    db.run(
      'UPDATE saved_exercises SET collection_id = ? WHERE id = ? AND user_id = ?',
      [collId, exerciseId, req.user.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Exercise not found.' });
        res.json({ success: true, message: 'Collection assigned successfully.' });
      }
    );
  };

  if (collId !== null) {
    // Verify collection belongs to user
    db.get(
      'SELECT id FROM saved_collections WHERE id = ? AND user_id = ?',
      [collId, req.user.id],
      (errColl, row) => {
        if (errColl) return res.status(500).json({ error: errColl.message });
        if (!row) return res.status(404).json({ error: 'Collection not found or access denied.' });
        updateExercise();
      }
    );
  } else {
    updateExercise();
  }
});

module.exports = router;
