// School channel — the class-code join flow (ultra review #52/#86): "one teacher, 30 kids, zero
// infra beyond a group." Any user can create a class (becoming its teacher) and share the join
// code; students join with the code and the teacher sees a roster of plain-language progress
// (reusing services/progressReport). Students consent by joining; a teacher only ever sees the
// progress of members of a class they own.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');
const { checkText } = require('../lib/contentFilter');
const { buildProgressReport } = require('../services/progressReport');

const router = express.Router();

// Unambiguous alphabet (no 0/O/1/I) — a 6-char code is easy to read aloud to a class.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCode() {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  return c;
}

// Create a class. Retries a few times on the (rare) code collision before giving up.
router.post('/api/classes', authenticateToken, rateLimiter(10, 60 * 60 * 1000), (req, res) => {
  const name = (req.body && typeof req.body.name === 'string' ? req.body.name.trim() : '').slice(0, 60);
  if (!name) return res.status(400).json({ error: 'A class name is required.' });
  const nameCheck = checkText(name, 'Class name');
  if (!nameCheck.ok) return res.status(400).json({ error: nameCheck.error });

  const now = Math.floor(Date.now() / 1000);
  const attempt = (triesLeft) => {
    const code = generateCode();
    db.run(
      'INSERT INTO classes (code, name, teacher_id, created_at) VALUES (?, ?, ?, ?)',
      [code, name, req.user.id, now],
      function (err) {
        if (err) {
          if (/UNIQUE/.test(err.message) && triesLeft > 0) return attempt(triesLeft - 1);
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, code, name });
      }
    );
  };
  attempt(5);
});

// Join a class by code. Idempotent (re-joining is a no-op). Returns the class summary.
router.post('/api/classes/join', authenticateToken, rateLimiter(20, 60 * 60 * 1000), (req, res) => {
  const code = (req.body && typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '');
  if (!code) return res.status(400).json({ error: 'A class code is required.' });

  db.get('SELECT id, name, teacher_id FROM classes WHERE code = ?', [code], (err, cls) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!cls) return res.status(404).json({ error: 'No class found for that code.' });
    db.run(
      'INSERT OR IGNORE INTO class_members (class_id, user_id, joined_at) VALUES (?, ?, ?)',
      [cls.id, req.user.id, Math.floor(Date.now() / 1000)],
      (jErr) => {
        if (jErr) return res.status(500).json({ error: jErr.message });
        res.json({ id: cls.id, name: cls.name });
      }
    );
  });
});

// Classes I teach (with member counts) and classes I've joined.
router.get('/api/classes/mine', authenticateToken, (req, res) => {
  db.all(
    `SELECT c.id, c.code, c.name,
            (SELECT COUNT(*) FROM class_members m WHERE m.class_id = c.id) AS memberCount
       FROM classes c WHERE c.teacher_id = ? ORDER BY c.created_at DESC`,
    [req.user.id],
    (err, teaching) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(
        `SELECT c.id, c.name, u.username AS teacher
           FROM class_members m JOIN classes c ON c.id = m.class_id
           JOIN users u ON u.id = c.teacher_id
          WHERE m.user_id = ? ORDER BY m.joined_at DESC`,
        [req.user.id],
        (e2, joined) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.json({ teaching: teaching || [], joined: joined || [] });
        }
      );
    }
  );
});

// Teacher-only roster: each member with a plain-language progress summary. 403 unless the caller
// owns the class. Capped so a huge class can't fan out unboundedly.
router.get('/api/classes/:id/roster', authenticateToken, (req, res) => {
  const classId = Number(req.params.id);
  if (!Number.isInteger(classId)) return res.status(400).json({ error: 'Invalid class id.' });

  db.get('SELECT id, name, code, teacher_id FROM classes WHERE id = ?', [classId], (err, cls) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!cls) return res.status(404).json({ error: 'Class not found.' });
    if (cls.teacher_id !== req.user.id) return res.status(403).json({ error: 'Only the class teacher can view the roster.' });

    db.all(
      'SELECT user_id FROM class_members WHERE class_id = ? ORDER BY joined_at ASC LIMIT 60',
      [classId],
      async (mErr, rows) => {
        if (mErr) return res.status(500).json({ error: mErr.message });
        try {
          const members = await Promise.all(
            (rows || []).map(async (r) => {
              const report = await buildProgressReport(r.user_id);
              return {
                name: report.name,
                level: report.level,
                streak: report.streak,
                totalSolved: report.totalSolved,
                topStrength: report.strengths[0] ? report.strengths[0].label : null,
              };
            })
          );
          res.json({ id: cls.id, name: cls.name, code: cls.code, members });
        } catch (e) {
          res.status(500).json({ error: e.message });
        }
      }
    );
  });
});

module.exports = router;
