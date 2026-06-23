// Self-hosted, privacy-first product analytics (ultra review #39). The app previously flew blind on
// what's actually used. This records AGGREGATE daily counts per event only — no user id, device id,
// session, IP, or timestamp beyond the day bucket — so the data is not personal data and cannot be
// attributed to anyone. That's a deliberate design: it answers "what features get used?" while
// staying consistent with the app's no-tracking-SDK privacy posture. For per-user funnels see
// routes/onboarding.js (a separate, consented surface).
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');
const { ACTIVATION_THRESHOLD, ACTIVATION_WINDOW_DAYS } = require('../lib/activation');

const router = express.Router();

// Allowlist of event keys the client may report. An allowlist (rather than free-form strings) keeps
// the table bounded, prevents junk/PII from ever being written, and documents what we measure.
const ALLOWED_EVENTS = new Set([
  'screen_learn', 'screen_arena', 'screen_quests', 'screen_shop', 'screen_profile', 'screen_settings',
  'game_start', 'game_finish',
  'duel_start', 'puzzle_rush_start', 'checkpoint_exam_start', 'transfer_challenge_start',
  'daily_puzzle_open', 'mistakes_practice_open',
  'shop_purchase', 'quest_claim', 'lesson_open', 'discussion_open', 'problem_reported',
  'command_palette_open', 'skill_tree_open', 'weekly_recap_open',
  // Interactive-visual discovery signals: a learner reached an insight by manipulating
  // ('visual_discover') or answered the post-verify "why?" reflection ('visual_reflect').
  'visual_discover', 'visual_reflect',
]);

const today = () => new Date().toISOString().slice(0, 10);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// Fire-and-forget ingest. Unknown events are accepted with 200 (so the client never errors or
// retries) but silently dropped — only allowlisted keys are persisted. Rate-limited per client.
router.post('/api/analytics/event', authenticateToken, rateLimiter(120, 60000), (req, res) => {
  const event = req.body && typeof req.body.event === 'string' ? req.body.event : null;
  if (!event || !ALLOWED_EVENTS.has(event)) return res.json({ success: true, recorded: false });

  db.run(
    `INSERT INTO analytics_daily (day, event, count) VALUES (?, ?, 1)
     ON CONFLICT(day, event) DO UPDATE SET count = count + 1`,
    [today(), event],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, recorded: true });
    }
  );
});

// Admin rollup. Optional ?since=YYYY-MM-DD&until=YYYY-MM-DD window (defaults: all time). Returns
// per-event totals (desc) + a per-day breakdown. ?format=html renders a quick eyeball table.
router.get('/api/analytics/summary', authenticateToken, requireAdmin, (req, res) => {
  const since = ISO_DAY.test(req.query.since || '') ? req.query.since : '0000-00-00';
  const until = ISO_DAY.test(req.query.until || '') ? req.query.until : '9999-99-99';

  db.all(
    'SELECT event, SUM(count) AS total FROM analytics_daily WHERE day >= ? AND day <= ? GROUP BY event ORDER BY total DESC',
    [since, until],
    (err, totals) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(
        'SELECT day, event, count FROM analytics_daily WHERE day >= ? AND day <= ? ORDER BY day DESC, count DESC',
        [since, until],
        (e2, rows) => {
          if (e2) return res.status(500).json({ error: e2.message });
          const result = { since, until, totals: totals || [], rows: rows || [] };

          if (req.query.format === 'html') {
            const body = (result.totals || [])
              .map((t) => `<tr><td>${t.event}</td><td>${t.total}</td></tr>`)
              .join('');
            return res
              .set('Content-Type', 'text/html')
              .send(
                `<!doctype html><html><head><meta charset="utf-8"><title>Product Analytics</title>` +
                  `<style>body{font-family:system-ui,sans-serif;background:#0f1020;color:#eee;padding:2rem}` +
                  `h1{margin:0 0 1rem}table{border-collapse:collapse;width:100%;max-width:560px}` +
                  `th,td{padding:.5rem .8rem;text-align:left;border-bottom:1px solid #2a2c44}` +
                  `th{color:#9aa}td:first-child{font-weight:600}</style></head><body>` +
                  `<h1>Product Analytics</h1><div style="color:#9aa;margin-bottom:1rem">${since} → ${until}</div>` +
                  `<table><thead><tr><th>Event</th><th>Count</th></tr></thead><tbody>${body}</tbody></table></body></html>`
              );
          }
          res.json(result);
        }
      );
    }
  );
});

// Activation funnel (ultra review #23): of real (non-guest, non-system) accounts in the cohort,
// how many cleared the activation bar (N solves within the signup window), and how fast. Admin-only.
router.get('/api/analytics/activation', authenticateToken, requireAdmin, (req, res) => {
  // Cohort = real signups with a known creation time. Exclude guests and the password-less system
  // account so the rate reflects genuine new users.
  const cohortWhere = "created_at > 0 AND is_guest = 0 AND password_hash != ''";
  db.get(
    `SELECT
        COUNT(*) AS cohort,
        SUM(CASE WHEN activated_at > 0 THEN 1 ELSE 0 END) AS activated,
        AVG(CASE WHEN activated_at > 0 THEN activated_at - created_at END) AS avgSecondsToActivate
     FROM users WHERE ${cohortWhere}`,
    [],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      const cohort = (row && row.cohort) || 0;
      const activated = (row && row.activated) || 0;
      res.json({
        definition: { threshold: ACTIVATION_THRESHOLD, windowDays: ACTIVATION_WINDOW_DAYS },
        cohort,
        activated,
        activationRate: cohort ? Math.round((activated / cohort) * 100) : 0,
        avgSecondsToActivate: row && row.avgSecondsToActivate != null ? Math.round(row.avgSecondsToActivate) : null,
      });
    }
  );
});

module.exports = router;
