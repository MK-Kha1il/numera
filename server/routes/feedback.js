// In-app Help & Support channel (completion pass). Backs the Settings "Contact Support",
// "Report a Bug", and "Request a Feature" dialogs, which previously faked a success toast and
// persisted nothing. A ticket is a learner-initiated message reviewed via the admin queue —
// the human-in-the-loop sibling of content_reports (UGC) and crash_reports (anonymous crashes).
//
// Privacy: tickets are attributed to the authenticated user so we can follow up, but nothing here
// is shared externally (same posture as the rest of the app). kind = support | bug | feature.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { securityLog } = require('../middleware/security');
const { rateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const KINDS = ['support', 'bug', 'feature'];
const MAX_SUBJECT = 120;
const MAX_BODY = 2000;

// 5 tickets per 15 min — generous for genuine use, a speed bump against spam.
router.post('/api/feedback', authenticateToken, rateLimiter(5, 15 * 60 * 1000), (req, res) => {
  const { kind, subject, body, appVersion } = req.body || {};
  if (!KINDS.includes(kind)) {
    return res.status(400).json({ error: "kind must be 'support', 'bug', or 'feature'." });
  }
  const cleanBody = String(body || '').trim().slice(0, MAX_BODY);
  if (!cleanBody) {
    return res.status(400).json({ error: 'A message is required.' });
  }
  const cleanSubject = String(subject || '').trim().slice(0, MAX_SUBJECT) || null;
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO user_feedback (user_id, kind, subject, body, app_version, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    [req.user.id, kind, cleanSubject, cleanBody, String(appVersion || '').slice(0, 50) || null, now],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      securityLog(req.user.id, 'feedback_submitted', req.ip, `Submitted ${kind} feedback #${this.lastID}.`);
      res.status(201).json({ success: true, id: this.lastID, message: 'Thank you — your message has been received.' });
    }
  );
});

// ---- Admin triage queue ---------------------------------------------------

router.get('/api/admin/feedback', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT f.id, f.user_id, u.username, f.kind, f.subject, f.body, f.app_version,
            f.status, f.created_at, f.reviewed_at
     FROM user_feedback f
     LEFT JOIN users u ON u.id = f.user_id
     ORDER BY (f.status = 'open') DESC, f.created_at DESC
     LIMIT 500`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

router.post('/api/admin/feedback/:id/resolve', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid feedback ID.' });
  const { status } = req.body || {};
  if (!['reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: "status must be 'reviewed' or 'resolved'." });
  }
  const now = Math.floor(Date.now() / 1000);
  db.run(
    'UPDATE user_feedback SET status = ?, reviewed_at = ? WHERE id = ?',
    [status, now, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Feedback not found.' });
      securityLog(req.user.id, 'feedback_resolved', req.ip, `Feedback ${id} -> ${status}.`);
      res.json({ success: true });
    }
  );
});

module.exports = router;
