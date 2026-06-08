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
    `SELECT p.id, p.parent_id AS parentId, p.user_id AS userId, u.username, p.body, p.created_at AS createdAt,
            (SELECT COUNT(*) FROM concept_post_votes v WHERE v.post_id = p.id) AS votes,
            EXISTS(SELECT 1 FROM concept_post_votes v WHERE v.post_id = p.id AND v.user_id = ?) AS voted
       FROM concept_posts p JOIN users u ON u.id = p.user_id
      WHERE p.concept_id = ? AND p.hidden = 0
        AND p.user_id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = ?)
        AND p.user_id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = ?)
      LIMIT 300`,
    [req.user.id, conceptId, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const all = (rows || []).map((r) => ({ ...r, voted: !!r.voted, mine: r.userId === req.user.id, replies: [] }));
      const byId = new Map(all.map((p) => [p.id, p]));

      // Nest one level: attach each reply under its (visible) parent; drop replies whose parent is
      // hidden/blocked (no context). Top-level sorted by votes (best answers first); replies read
      // chronologically within a thread.
      const top = [];
      for (const p of all) {
        if (p.parentId) {
          const parent = byId.get(p.parentId);
          if (parent) parent.replies.push(p);
        } else {
          top.push(p);
        }
      }
      top.sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt);
      for (const p of top) p.replies.sort((a, b) => a.createdAt - b.createdAt);
      res.json({ conceptId, name: concept.name, posts: top.slice(0, 100) });
    }
  );
});

// Toggle an upvote on a post. You can't upvote your own post. Returns the fresh state.
router.post('/api/concepts/posts/:postId/upvote', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  if (!Number.isFinite(postId)) return res.status(400).json({ error: 'Invalid post id' });

  db.get('SELECT user_id FROM concept_posts WHERE id = ? AND hidden = 0', [postId], (err, post) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id === req.user.id) return res.status(400).json({ error: 'You cannot upvote your own post' });

    const finish = (voted) =>
      db.get('SELECT COUNT(*) AS votes FROM concept_post_votes WHERE post_id = ?', [postId], (cErr, row) => {
        if (cErr) return res.status(500).json({ error: cErr.message });
        res.json({ postId, voted, votes: (row && row.votes) || 0 });
      });

    db.get('SELECT 1 FROM concept_post_votes WHERE post_id = ? AND user_id = ?', [postId, req.user.id], (vErr, existing) => {
      if (vErr) return res.status(500).json({ error: vErr.message });
      if (existing) {
        db.run('DELETE FROM concept_post_votes WHERE post_id = ? AND user_id = ?', [postId, req.user.id], (dErr) => {
          if (dErr) return res.status(500).json({ error: dErr.message });
          finish(false);
        });
      } else {
        db.run(
          'INSERT INTO concept_post_votes (post_id, user_id, created_at) VALUES (?, ?, ?)',
          [postId, req.user.id, Math.floor(Date.now() / 1000)],
          (iErr) => {
            if (iErr) return res.status(500).json({ error: iErr.message });
            finish(true);
          }
        );
      }
    });
  });
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
  const doInsert = (parentId) =>
    db.run(
      'INSERT INTO concept_posts (concept_id, user_id, body, hidden, parent_id, created_at) VALUES (?, ?, ?, 0, ?, ?)',
      [conceptId, req.user.id, body, parentId, now],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true, id: this.lastID, createdAt: now });
      }
    );

  const parentId = req.body && req.body.parentId ? parseInt(req.body.parentId, 10) : null;
  if (!parentId) return doInsert(null);

  // Reply: the parent must exist, be visible, in this concept, and itself be top-level (one level).
  db.get('SELECT concept_id, parent_id FROM concept_posts WHERE id = ? AND hidden = 0', [parentId], (pErr, parent) => {
    if (pErr) return res.status(500).json({ error: pErr.message });
    if (!parent) return res.status(404).json({ error: 'Parent post not found' });
    if (parent.concept_id !== conceptId) return res.status(400).json({ error: 'Parent belongs to a different concept' });
    if (parent.parent_id) return res.status(400).json({ error: 'Cannot reply to a reply' });
    doInsert(parentId);
  });
});

// Delete my own post (author-only hard delete; moderation uses hidden=1 instead).
router.delete('/api/concepts/posts/:postId', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.postId, 10);
  if (!Number.isFinite(postId)) return res.status(400).json({ error: 'Invalid post id' });
  db.run('DELETE FROM concept_posts WHERE id = ? AND user_id = ?', [postId, req.user.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Post not found' });
    // Clean up its votes so they don't dangle.
    db.run('DELETE FROM concept_post_votes WHERE post_id = ?', [postId], () => res.json({ success: true }));
  });
});

module.exports = router;
