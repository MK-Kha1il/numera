// First-launch → habit onboarding. Owns the post-signup sequence: motivational goals, learner
// profile, a personalized roadmap derived from the adaptive diagnostic, an achievable "aha" first
// problem, a practice-schedule commitment, and a value-first notification opt-in. State is
// server-owned (users.onboarding_complete) so it gates navigation and survives reinstall.
//
// The motivational goals here are SEPARATE from the quantitative user_goals (reach_level/streak) in
// routes/account.js — these are aspirational ("why are you here"), multi-select, additive.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { generateProblem } = require('../mathGenerator');
const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { calculateRank } = require('../lib/progression');
const { getPrefs, DEFAULT_PREFS } = require('../services/notificationService');
const { isPushConfigured } = require('../services/pushSender');

const router = express.Router();

// ── Catalogs (single source of truth; the client renders whatever the server lists) ─────────────
const MOTIVATIONS = [
  { key: 'improve_grades', label: 'Improve my grades', emoji: '📈' },
  { key: 'prepare_exams', label: 'Prepare for exams', emoji: '📝' },
  { key: 'build_confidence', label: 'Build math confidence', emoji: '💪' },
  { key: 'learn_faster', label: 'Learn faster', emoji: '⚡' },
  { key: 'compete', label: 'Compete with others', emoji: '🏆' },
  { key: 'master_fundamentals', label: 'Master the fundamentals', emoji: '🧱' },
  { key: 'challenge_myself', label: 'Challenge myself', emoji: '🔥' },
  { key: 'problem_solving', label: 'Develop problem-solving skills', emoji: '🧩' },
  { key: 'mental_math', label: 'Improve mental math', emoji: '🧠' },
  { key: 'advanced_math', label: 'Prepare for advanced math', emoji: '🚀' },
];

const INTERESTS = [
  { key: 'gaming', label: 'Gaming', emoji: '🎮' },
  { key: 'sports', label: 'Sports', emoji: '⚽' },
  { key: 'music', label: 'Music', emoji: '🎵' },
  { key: 'science', label: 'Science', emoji: '🔬' },
  { key: 'space', label: 'Space', emoji: '🪐' },
  { key: 'money', label: 'Money & finance', emoji: '💰' },
  { key: 'art', label: 'Art & design', emoji: '🎨' },
  { key: 'coding', label: 'Coding', emoji: '💻' },
  { key: 'puzzles', label: 'Puzzles', emoji: '🧩' },
  { key: 'nature', label: 'Nature', emoji: '🌿' },
];

const PROFILE_STYLES = [
  { key: 'explorer', label: 'Explorer', emoji: '🧭', blurb: 'Curious and always discovering.' },
  { key: 'scholar', label: 'Scholar', emoji: '📚', blurb: 'Deep, careful, thorough.' },
  { key: 'competitor', label: 'Competitor', emoji: '⚔️', blurb: 'Here to win and climb.' },
  { key: 'sage', label: 'Sage', emoji: '🦉', blurb: 'Calm mastery, one step at a time.' },
  { key: 'maverick', label: 'Maverick', emoji: '✨', blurb: 'Fast, bold, unconventional.' },
];

// Expanded from the original 4 (owl/fox/koala/panda) so the profile feels personal.
const AVATARS = [
  { key: 'avatar_owl', emoji: '🦉' }, { key: 'avatar_fox', emoji: '🦊' },
  { key: 'avatar_koala', emoji: '🐨' }, { key: 'avatar_panda', emoji: '🐼' },
  { key: 'avatar_cat', emoji: '🐱' }, { key: 'avatar_penguin', emoji: '🐧' },
  { key: 'avatar_dragon', emoji: '🐲' }, { key: 'avatar_robot', emoji: '🤖' },
  { key: 'avatar_axolotl', emoji: '🦎' }, { key: 'avatar_tiger', emoji: '🐯' },
  { key: 'avatar_dolphin', emoji: '🐬' }, { key: 'avatar_unicorn', emoji: '🦄' },
];

// Phase 11 — progressive disclosure. One-time intros for major surfaces, revealed the first time a
// learner reaches each (not all dumped at signup). The client shows these by key; the server only
// records which have been seen.
// Keyed 1:1 with the app's main tabs, shown the first time the learner opens each.
const SPOTLIGHTS = [
  { key: 'archive', title: 'The Learning Map', body: 'Every concept you can master, mapped as a path. Jump in wherever you\'re ready.', emoji: '🗺️' },
  { key: 'arena', title: 'The Arena', body: 'Race real people (or a friendly bot) in live math duels, and climb the ranks.', emoji: '⚔️' },
  { key: 'dashboard', title: 'Your home base', body: 'Your daily plan, streak, and what to practice next all live here.', emoji: '🏠' },
  { key: 'shop', title: 'The Shop', body: 'Spend the coins you earn on themes, avatars, and helpful boosts.', emoji: '🛍️' },
  { key: 'profile', title: 'Your Profile', body: 'Your stats, badges, collections, and skill mastery — all in one place.', emoji: '🧑‍🚀' },
];
const VALID_SPOTLIGHTS = new Set(SPOTLIGHTS.map((s) => s.key));

const VALID_MOTIVATIONS = new Set(MOTIVATIONS.map((m) => m.key));
const VALID_INTERESTS = new Set(INTERESTS.map((i) => i.key));
const VALID_STYLES = new Set(PROFILE_STYLES.map((s) => s.key));
const VALID_AVATARS = new Set(AVATARS.map((a) => a.key));

const CATEGORY_LABEL = {
  arithmetic: 'Arithmetic',
  algebra: 'Algebra',
  calculus: 'Calculus',
  combinatorics: 'Combinatorics',
  number_theory: 'Number Theory',
};

// Mirror of the diagnostic's level→category banding (routes/assessment.js) so the aha problem is
// drawn from the right domain for the learner's placement.
function categoryForLevel(level) {
  if (level > 40) return 'number_theory';
  if (level > 30) return 'calculus';
  if (level > 17) return 'combinatorics';
  if (level > 10) return 'algebra';
  return 'arithmetic';
}

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────────

// Replace the full set of a user's rows in a (user_id, key) join table with `keys` (filtered to
// `valid`). Used for the multi-select motivations and interests.
function replaceRows(table, col, userId, keys, valid, done) {
  db.serialize(() => {
    db.run(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    const stmt = db.prepare(`INSERT OR IGNORE INTO ${table} (user_id, ${col}) VALUES (?, ?)`);
    for (const k of keys) {
      if (valid.has(k)) stmt.run(userId, k);
    }
    stmt.finalize(done);
  });
}

// Turn the diagnostic's per-question trail + placed level into an honest, optimistic roadmap.
// Strengths/growth are accuracy buckets; milestones are soft estimates ("could", "approximately").
function buildRoadmap(level, categoryLog) {
  const byCat = {};
  for (const e of categoryLog) {
    const c = e && e.category;
    if (!c) continue;
    if (!byCat[c]) byCat[c] = { correct: 0, total: 0 };
    byCat[c].total += 1;
    if (e.correct) byCat[c].correct += 1;
  }

  const strengths = [];
  const growth = [];
  for (const [cat, s] of Object.entries(byCat)) {
    const label = CATEGORY_LABEL[cat] || cat;
    const accuracy = s.total ? Math.round((s.correct / s.total) * 100) : 0;
    (accuracy >= 60 ? strengths : growth).push({ key: cat, label, accuracy });
  }
  strengths.sort((a, b) => b.accuracy - a.accuracy);
  growth.sort((a, b) => a.accuracy - b.accuracy);

  // Diagnostic skipped / too sparse — still give a forward-looking focus.
  if (strengths.length === 0 && growth.length === 0) {
    growth.push({ key: 'fundamentals', label: 'Core fundamentals', accuracy: null });
  }
  const recommendedFocus = (growth[0] && growth[0].label) || (strengths[0] && strengths[0].label) || 'the fundamentals';

  const milestones = [
    { weeks: 2, label: `Reach Level ${level + 3}` },
    { weeks: 6, label: `Build real fluency in ${recommendedFocus}` },
    { weeks: 8, label: `Climb toward ${calculateRank(level + 6)}` },
  ];

  return {
    placedLevel: level,
    rank: calculateRank(level),
    strengths,
    growth,
    milestones,
    recommendedFocus,
  };
}

// In-memory pending "aha" problem per user (ephemeral by nature — a server bounce just restarts the
// one-problem moment). Mirrors how the Socket.IO duel holds room state in memory. The answer never
// reaches the client, so the first success can't be spoofed.
const ahaPending = new Map(); // userId -> { answer, level, category }

// ── Routes ──────────────────────────────────────────────────────────────────────────────────────

// State + catalogs the client needs to render the whole flow. `pushAvailable` lets the client
// hide the notification opt-in step entirely while FCM isn't credentialed — asking a brand-new
// user to opt into notifications the server cannot deliver is a first-session broken promise.
router.get('/api/onboarding/state', authenticateToken, (req, res) => {
  db.get('SELECT onboarding_complete FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      onboardingComplete: u ? !!u.onboarding_complete : false,
      pushAvailable: isPushConfigured(),
      catalogs: { motivations: MOTIVATIONS, interests: INTERESTS, profileStyles: PROFILE_STYLES, avatars: AVATARS },
    });
  });
});

// Phase 2 — multi-select motivational goals.
router.post('/api/onboarding/motivations', authenticateToken, (req, res) => {
  const keys = Array.isArray(req.body && req.body.keys) ? req.body.keys : [];
  replaceRows('user_motivations', 'motivation_key', req.user.id, keys, VALID_MOTIVATIONS, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, count: keys.filter((k) => VALID_MOTIVATIONS.has(k)).length });
  });
});

// Phase 3 — learner profile (display name, style, avatar, interests). Each field is optional;
// only provided + valid fields are written.
router.post('/api/onboarding/profile', authenticateToken, (req, res) => {
  const { displayName, profileStyle, avatar, interests } = req.body || {};
  const dn = (typeof displayName === 'string' ? displayName.trim() : '').slice(0, 30) || null;
  const style = VALID_STYLES.has(profileStyle) ? profileStyle : null;
  const av = VALID_AVATARS.has(avatar) ? avatar : null;
  const list = Array.isArray(interests) ? interests : [];

  const applyInterests = () =>
    replaceRows('user_interests', 'interest_key', req.user.id, list, VALID_INTERESTS, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });

  const sets = [];
  const params = [];
  if (dn !== null) { sets.push('display_name = ?'); params.push(dn); }
  if (style) { sets.push('profile_style = ?'); params.push(style); }
  if (av) { sets.push('avatar = ?'); params.push(av); }

  if (sets.length === 0) return applyInterests();
  params.push(req.user.id);
  db.run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    applyInterests();
  });
});

// Phase 5 — personalized roadmap from the latest completed diagnostic + placed level.
router.get('/api/onboarding/roadmap', authenticateToken, (req, res) => {
  db.get('SELECT level FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    const level = u ? u.level || 1 : 1;
    db.get(
      "SELECT category_log FROM diagnostic_sessions WHERE user_id = ? AND status = 'done' ORDER BY id DESC LIMIT 1",
      [req.user.id],
      (e2, sess) => {
        let log = [];
        if (sess && sess.category_log) {
          try { log = JSON.parse(sess.category_log); } catch { log = []; }
        }
        res.json(buildRoadmap(level, log));
      }
    );
  });
});

// Phase 6 — serve ONE deliberately achievable problem (a couple levels below placement). The
// answer is held server-side; the client only gets the question + options.
router.post('/api/onboarding/aha/start', authenticateToken, (req, res) => {
  db.get('SELECT level FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    const placed = u ? u.level || 1 : 1;
    const level = Math.max(1, placed - 2);
    const category = categoryForLevel(level);
    const p = generateProblem(category, level, Math.floor(Math.random() * 100), 1200);
    ahaPending.set(req.user.id, { answer: p.correctAnswer, level, category });
    res.json({ question: p.question, options: p.options });
  });
});

// Grade the aha answer server-side (equivalence-aware). On a miss we keep the problem pending so
// the learner can retry — this moment is meant to end in success.
router.post('/api/onboarding/aha/answer', authenticateToken, (req, res) => {
  const pending = ahaPending.get(req.user.id);
  if (!pending) return res.status(400).json({ error: 'No active problem. Start one first.' });
  const submitted = String((req.body && req.body.answer) == null ? '' : req.body.answer);
  const correct = areEquivalent(submitted, String(pending.answer));
  if (correct) ahaPending.delete(req.user.id);
  res.json({ correct });
});

// Phase 8 — practice-schedule commitment.
router.post('/api/onboarding/commitment', authenticateToken, (req, res) => {
  const { frequency, days } = req.body || {};
  const freq = ['daily', 'weekdays', 'weekends', 'custom'].includes(frequency) ? frequency : 'daily';
  const dayList = Array.isArray(days)
    ? days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    : [];
  const schedule = { frequency: freq, days: dayList };
  db.run('UPDATE users SET practice_schedule = ? WHERE id = ?', [JSON.stringify(schedule), req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, schedule });
  });
});

// Phase 9 — record the value-first notification opt-in (the OS permission itself is handled
// client-side). Opting in ALSO enables push delivery: the lifecycle funnel gates on
// notification_preferences.push_enabled, which defaults OFF — so without this the granted OS
// permission would never actually deliver. "Maybe later" only records the coarse flag and never
// clobbers existing prefs (e.g. the legitimate adult email-lifecycle default); granular control
// lives in Settings.
router.post('/api/onboarding/notifications', authenticateToken, async (req, res) => {
  const optIn = req.body && req.body.optIn ? 1 : 0;
  db.run('UPDATE users SET reminders_opt_in = ? WHERE id = ?', [optIn, req.user.id], async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!optIn) return res.json({ success: true, optIn: false });

    try {
      const current = await getPrefs(req.user.id);
      const merged = { ...DEFAULT_PREFS, ...current, push_enabled: 1 };
      db.run(
        `INSERT INTO notification_preferences
           (user_id, email_enabled, email_lifecycle, push_enabled, quiet_hours_start, quiet_hours_end, tz_offset_minutes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET push_enabled = 1, updated_at = excluded.updated_at`,
        [req.user.id, merged.email_enabled, merged.email_lifecycle, merged.push_enabled, merged.quiet_hours_start, merged.quiet_hours_end, merged.tz_offset_minutes, Math.floor(Date.now() / 1000)],
        () => res.json({ success: true, optIn: true })
      );
    } catch {
      // The coarse opt-in flag is saved regardless; the pref upsert is best-effort.
      res.json({ success: true, optIn: true });
    }
  });
});

// Finish onboarding — flips the navigation gate.
router.post('/api/onboarding/complete', authenticateToken, (req, res) => {
  db.run('UPDATE users SET onboarding_complete = 1 WHERE id = ?', [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Phase 14 — lightweight funnel analytics (fire-and-forget from the client).
router.post('/api/onboarding/event', authenticateToken, (req, res) => {
  const { step, event, ms } = req.body || {};
  if (!step || !event) return res.status(400).json({ error: 'step and event are required' });
  const msVal = Number.isFinite(ms) ? Math.floor(ms) : null;
  db.run(
    'INSERT INTO onboarding_events (user_id, step, event, ms, created_at) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, String(step).slice(0, 40), String(event).slice(0, 40), msVal, Math.floor(Date.now() / 1000)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Phase 11 — which feature intros the learner has already seen (+ the catalog to render them).
router.get('/api/onboarding/spotlights', authenticateToken, (req, res) => {
  db.all('SELECT feature_key FROM user_feature_spotlights WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ seen: (rows || []).map((r) => r.feature_key), catalog: SPOTLIGHTS });
  });
});

// Mark a feature spotlight as seen (idempotent). Unknown keys are rejected so the table stays clean.
router.post('/api/onboarding/spotlights/seen', authenticateToken, (req, res) => {
  const key = req.body && req.body.key;
  if (!VALID_SPOTLIGHTS.has(key)) return res.status(400).json({ error: 'Unknown spotlight key' });
  db.run(
    'INSERT OR IGNORE INTO user_feature_spotlights (user_id, feature_key, seen_at) VALUES (?, ?, ?)',
    [req.user.id, key, Math.floor(Date.now() / 1000)],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Phase 14 — onboarding funnel analytics (admin only). Aggregates onboarding_events into a per-step
// funnel: how many entered/completed each step, where people drop off, and median time per step
// (derived from the gap between consecutive step-enter timestamps).
const ONB_STEP_ORDER = ['welcome', 'goals', 'profile', 'diagnostic', 'roadmap', 'aha', 'celebrate', 'habit', 'notifications'];

router.get('/api/onboarding/analytics', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT user_id, step, event, created_at FROM onboarding_events ORDER BY user_id, created_at', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const enterUsers = {};
    const completeUsers = {};
    ONB_STEP_ORDER.forEach((s) => { enterUsers[s] = new Set(); completeUsers[s] = new Set(); });
    const enterTimeByUser = {}; // userId -> { step: created_at }

    for (const r of rows) {
      if (!ONB_STEP_ORDER.includes(r.step)) continue;
      if (r.event === 'enter') {
        enterUsers[r.step].add(r.user_id);
        (enterTimeByUser[r.user_id] = enterTimeByUser[r.user_id] || {})[r.step] = r.created_at;
      } else if (r.event === 'complete') {
        completeUsers[r.step].add(r.user_id);
      }
    }

    // Per-step durations: time from entering this step to entering the next one.
    const durations = {};
    ONB_STEP_ORDER.forEach((s) => { durations[s] = []; });
    for (const times of Object.values(enterTimeByUser)) {
      for (let i = 0; i < ONB_STEP_ORDER.length - 1; i++) {
        const a = times[ONB_STEP_ORDER[i]];
        const b = times[ONB_STEP_ORDER[i + 1]];
        if (a != null && b != null && b >= a) durations[ONB_STEP_ORDER[i]].push(b - a);
      }
    }
    const median = (arr) => {
      if (!arr.length) return null;
      const s = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
    };

    const totalStarted = enterUsers.welcome.size;
    const totalCompleted = completeUsers.notifications.size;
    const steps = ONB_STEP_ORDER.map((s, i) => {
      const entered = enterUsers[s].size;
      const nextEntered =
        i < ONB_STEP_ORDER.length - 1 ? enterUsers[ONB_STEP_ORDER[i + 1]].size : completeUsers.notifications.size;
      return {
        step: s,
        entered,
        completed: completeUsers[s].size,
        droppedAfter: Math.max(0, entered - nextEntered),
        medianSeconds: median(durations[s]),
      };
    });

    const result = {
      totalStarted,
      totalCompleted,
      completionRate: totalStarted ? Math.round((totalCompleted / totalStarted) * 100) : 0,
      steps,
    };

    // A compact human-readable funnel view (?format=html) for eyeballing drop-off; still
    // admin-gated (this handler runs behind requireAdmin), so fetch it with the admin bearer token.
    if (req.query.format === 'html') {
      const rowsHtml = result.steps
        .map((s) => {
          const pct = totalStarted ? Math.round((s.entered / totalStarted) * 100) : 0;
          return `<tr><td>${s.step}</td><td>${s.entered}</td><td>${pct}%</td><td>${s.completed}</td><td>${s.droppedAfter}</td><td>${s.medianSeconds == null ? '—' : s.medianSeconds + 's'}</td></tr>`;
        })
        .join('');
      return res
        .set('Content-Type', 'text/html')
        .send(
          `<!doctype html><html><head><meta charset="utf-8"><title>Onboarding Funnel</title>` +
            `<style>body{font-family:system-ui,sans-serif;background:#0f1020;color:#eee;padding:2rem}h1{margin:0 0 .25rem}` +
            `.sub{color:#9aa;margin-bottom:1.5rem}table{border-collapse:collapse;width:100%;max-width:760px}` +
            `th,td{padding:.6rem .8rem;text-align:left;border-bottom:1px solid #2a2c44}th{color:#9aa;font-weight:600}` +
            `td:first-child{text-transform:capitalize;font-weight:600}.big{font-size:2rem;font-weight:800;color:#7c4dff}</style></head><body>` +
            `<h1>Onboarding Funnel</h1><div class="sub">${totalStarted} started · ${totalCompleted} completed · ` +
            `<span class="big">${result.completionRate}%</span> completion</div>` +
            `<table><thead><tr><th>Step</th><th>Entered</th><th>of starters</th><th>Completed</th><th>Dropped after</th><th>Median time</th></tr></thead>` +
            `<tbody>${rowsHtml}</tbody></table></body></html>`
        );
    }

    res.json(result);
  });
});

module.exports = router;
