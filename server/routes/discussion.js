// Per-concept discussion (audit #1.7 social / #1.18 community). A lightweight, flat message list
// attached to each curriculum concept so learners can ask/answer "how does this work?" right where
// they study it. Safety: bodies pass the first-line contentFilter blocklist, posts from users in a
// block relationship (either direction) are hidden, moderated posts (hidden=1) drop out, and any
// post is reportable via /api/reports (targetType 'concept_post'). Rate-limited to deter spam.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');
const { checkText } = require('../lib/contentFilter');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

const router = express.Router();
const MAX_BODY = 500;

// List recent posts for a concept, hiding moderated posts and anyone in a block relationship.
router.get('/api/concepts/:conceptId/posts', authenticateToken, (req, res) => {
  const conceptId = req.params.conceptId;
  const concept = KnowledgeGraph.concepts[conceptId];
  if (!concept) return res.status(404).json({ error: 'Unknown concept' });

  db.all(
    `SELECT p.id, p.user_id AS userId, u.username, p.body, p.created_at AS createdAt
       FROM concept_posts p JOIN users u ON u.id = p.user_id
      WHERE p.concept_id = ? AND p.hidden = 0
        AND p.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
        AND p.user_id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
      ORDER BY p.created_at DESC
      LIMIT 100`,
    [conceptId, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const posts = (rows || []).map((r) => ({ ...r, mine: r.userId === req.user.id }));
      res.json({ conceptId, name: concept.name, posts });
    }
  );
});

// Create a post on a concept.
router.post('/api/concepts/:conceptId/posts', authenticateToken, rateLimiter(20, 15 * 60 * 1000), (req, res) => {
  const conceptId = req.params.conceptId;
  if (!KnowledgeGraph.concepts[conceptId]) return res.status(404).json({ error: 'Unknown concept' });

  const body = String((req.body && req.body.body) || '').trim();
  if (!body) return res.status(400).json({ error: 'Message required' });
  if (body.length > MAX_BODY) return res.status(400).json({ error: `Message must be ${MAX_BODY} characters or fewer` });
  const clean = checkText(body, 'Message');
  if (!clean.ok) return res.status(400).json({ error: clean.error });

  const now = Math.floor(Date.now() / 1000);
  db.run(
    'INSERT INTO concept_posts (concept_id, user_id, body, hidden, created_at) VALUES (?, ?, ?, 0, ?)',
    [conceptId, req.user.id, body, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ success: true, id: this.lastID, createdAt: now });
    }
  );
});

// Delete my own post (author-only hard delete; moderation uses hidden=1 instead).
router.delete('/api/concepts/posts/:postId', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  if (!Number.isFinite(postId)) return res.status(400).json({ error: 'Invalid post id' });
  db.run('DELETE FROM concept_posts WHERE id = ? AND user_id = ?', [postId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Post not found' });
    res.json({ success: true });
  });
});

module.exports = router;
