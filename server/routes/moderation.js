// UGC safety: user blocking and content reporting (see docs/ComplianceAudit.md H1).
//
//  - Blocking is symmetric in effect: a block hides both users from each other's social surfaces
//    (friends list, new friend requests) and removes any existing friend connection.
//  - Reports go into content_reports for human review via the admin queue. Reporting is the
//    human-in-the-loop backstop to the automated contentFilter blocklist.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const { rateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// ---- Blocking -------------------------------------------------------------

router.post('/api/blocks', authenticateToken, (req, res) => {
  const { userId } = req.body;
  const targetId = parseInt(userId, 10);
  if (isNaN(targetId)) return res.status(400).json({ error: 'A valid userId is required.' });
  if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot block yourself.' });

  db.get('SELECT id FROM users WHERE id = ?', [targetId], (err, target) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const now = Math.floor(Date.now() / 1000);
    db.run(
      'INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)',
      [req.user.id, targetId, now],
      (insErr) => {
        if (insErr) return res.status(500).json({ error: insErr.message });
        // Sever any existing friendship in either direction so a blocked user can't keep seeing them.
        db.run(
          'DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
          [req.user.id, targetId, targetId, req.user.id],
          () => {
            securityLog(req.user.id, 'user_blocked', req.ip, `Blocked user ${targetId}.`);
            res.json({ success: true, message: 'User blocked.' });
          }
        );
      }
    );
  });
});

router.delete('/api/blocks/:userId', authenticateToken, (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID.' });
  db.run(
    'DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?',
    [req.user.id, targetId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Block not found.' });
      res.json({ success: true, message: 'User unblocked.' });
    }
  );
});

router.get('/api/blocks', authenticateToken, (req, res) => {
  db.all(
    `SELECT b.blocked_id AS userId, u.username, b.created_at
     FROM user_blocks b JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = ? ORDER BY b.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ---- Reporting ------------------------------------------------------------

router.post('/api/reports', authenticateToken, rateLimiter(10, 15 * 60 * 1000), (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (targetType !== 'user' && targetType !== 'collection') {
    return res.status(400).json({ error: "targetType must be 'user' or 'collection'." });
  }
  const tid = parseInt(targetId, 10);
  if (isNaN(tid)) return res.status(400).json({ error: 'A valid targetId is required.' });
  const cleanReason = String(reason || '').slice(0, 500);

  const now = Math.floor(Date.now() / 1000);
  db.run(
    `INSERT INTO content_reports (reporter_id, target_type, target_id, reason, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
    [req.user.id, targetType, tid, cleanReason, now],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      securityLog(req.user.id, 'content_reported', req.ip, `Reported ${targetType} ${tid}.`);
      res.status(201).json({ success: true, message: 'Report submitted. Thank you — our team will review it.' });
    }
  );
});

// ---- Admin moderation queue ----------------------------------------------

router.get('/api/admin/reports', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT cr.id, cr.reporter_id, ru.username AS reporter_username, cr.target_type, cr.target_id,
            cr.reason, cr.status, cr.created_at, cr.reviewed_at
     FROM content_reports cr
     LEFT JOIN users ru ON ru.id = cr.reporter_id
     ORDER BY (cr.status = 'open') DESC, cr.created_at DESC
     LIMIT 500`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.post('/api/admin/reports/:id/resolve', authenticateToken, requireAdmin, (req, res) => {
  const reportId = parseInt(req.params.id, 10);
  if (isNaN(reportId)) return res.status(400).json({ error: 'Invalid report ID.' });
  const { status } = req.body;
  if (!['reviewed', 'actioned', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: "status must be 'reviewed', 'actioned', or 'dismissed'." });
  }
  const now = Math.floor(Date.now() / 1000);
  db.run(
    'UPDATE content_reports SET status = ?, reviewed_at = ? WHERE id = ?',
    [status, now, reportId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Report not found.' });
      securityLog(req.user.id, 'report_resolved', req.ip, `Report ${reportId} -> ${status}.`);
      res.json({ success: true });
    }
  );
});

module.exports = router;
