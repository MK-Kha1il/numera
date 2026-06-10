// Self-hosted crash reporting (ultra review #12). The app was blind to field crashes, and a
// third-party SDK would break the no-tracking privacy posture — so the client posts crashes
// here. Privacy contract: ANONYMOUS by design. No auth, no user id, no device id — a report
// is a stack trace + app version + Android API level. Hard-capped, rate-limited, and grouped
// by stack fingerprint for triage.
const crypto = require('crypto');
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const MAX_STACK_CHARS = 8000;
const MAX_STORED_REPORTS = 5000; // ring-buffer: keep triage data without unbounded growth

// The fingerprint is computed SERVER-side from the normalized top of the stack (exception
// type + first frames, line numbers stripped) so identical crashes group across versions.
function fingerprintOf(stack) {
  const head = String(stack)
    .split('\n')
    .slice(0, 6)
    .map((l) => l.replace(/:\d+\)/g, ')').trim())
    .join('\n');
  return crypto.createHash('sha256').update(head).digest('hex').slice(0, 16);
}

router.post('/api/crash', rateLimiter(5, 60 * 60 * 1000), (req, res) => {
  const { stack, appVersion, sdkInt } = req.body || {};
  if (!stack || typeof stack !== 'string') {
    return res.status(400).json({ error: 'stack required' });
  }
  const trimmed = stack.slice(0, MAX_STACK_CHARS);
  const now = Math.floor(Date.now() / 1000);

  db.run(
    'INSERT INTO crash_reports (fingerprint, app_version, sdk_int, stack, created_at) VALUES (?, ?, ?, ?, ?)',
    [fingerprintOf(trimmed), String(appVersion || 'unknown').slice(0, 50), parseInt(sdkInt, 10) || null, trimmed, now],
    (err) => {
      if (err) return res.status(500).json({ error: 'Failed to record crash' });
      // Opportunistic ring-buffer trim; losing the oldest reports is fine.
      db.run(
        'DELETE FROM crash_reports WHERE id NOT IN (SELECT id FROM crash_reports ORDER BY id DESC LIMIT ?)',
        [MAX_STORED_REPORTS],
        () => res.json({ success: true })
      );
    }
  );
});

// Triage view: crash groups by fingerprint, newest first, with one sample stack each.
router.get('/api/crash/reports', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT fingerprint,
            COUNT(*) AS occurrences,
            MAX(created_at) AS last_seen,
            MIN(created_at) AS first_seen,
            MAX(app_version) AS latest_version,
            (SELECT stack FROM crash_reports c2 WHERE c2.fingerprint = c1.fingerprint ORDER BY id DESC LIMIT 1) AS sample_stack
     FROM crash_reports c1
     GROUP BY fingerprint
     ORDER BY last_seen DESC
     LIMIT 100`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ groups: rows });
    }
  );
});

module.exports = router;
