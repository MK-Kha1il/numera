// Weekly async tournaments (audit #21 / #1.8 / #1.19). One global event runs per week: the server
// generates a FIXED problem set everyone races on the same terms, each player gets ONE timed
// attempt (start records started_at server-side; play measures elapsed server-side, so the speed
// tiebreak can't be faked), and the top 3 win coins. The event is self-perpetuating: GET current
// lazily finalizes an ended event (ranks done entries, pays the top 3) and seeds the next week's,
// rotating the concept by week index. No Socket.IO arena required — this is the correspondence
// path to "tournaments" that the real-time arena work was blocking. Server-authoritative throughout.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');
const { notify } = require('../services/notificationService');

const router = express.Router();

const PROBLEM_COUNT = 10;
const FIXED_ELO = 1200;          // standardized so difficulty is the concept's, not the player's
const WEEK_MS = 7 * 86400000;
const REWARDS = [100, 60, 40];   // top-3 coin prizes paid on finalize

const normalize = (s) => String(s == null ? '' : s).trim().toLowerCase();
const conceptName = (id) => (KnowledgeGraph.concepts[id] && KnowledgeGraph.concepts[id].name) || id;

function buildSet(category, level, count) {
  const set = [];
  for (let i = 0; i < count; i++) {
    const p = generateProblem(category, level, Math.floor(Math.random() * 1000), FIXED_ELO);
    set.push({ question: p.question, options: p.options, answer: p.correctAnswer });
  }
  return set;
}

// Finalize an ended event: rank the completed entries, pay the top 3, mark it finalized. Returns
// the rewarded winners (notified AFTER commit). Idempotent — the status guard makes a second call
// a no-op, so two racing reads can't double-pay.
async function finalizeIfEnded(tx, t, now) {
  if (!t || t.status !== 'active' || t.ends_at > now) return [];
  const entries = await tx.all(
    "SELECT id, user_id FROM tournament_entries WHERE tournament_id = ? AND status = 'done' ORDER BY score DESC, elapsed_ms ASC",
    [t.id]
  );
  const winners = [];
  for (let i = 0; i < entries.length && i < REWARDS.length; i++) {
    const reward = REWARDS[i];
    await tx.run('UPDATE tournament_entries SET reward = ? WHERE id = ?', [reward, entries[i].id]);
    await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, entries[i].user_id]);
    winners.push({ userId: entries[i].user_id, reward, position: i + 1, tournamentId: t.id, title: t.title });
  }
  await tx.run("UPDATE tournaments SET status = 'finalized' WHERE id = ?", [t.id]);
  return winners;
}

// Seed a fresh weekly event. The concept rotates by week index so topics vary over time.
async function seedTournament(tx, now) {
  const ids = Object.keys(CONCEPT_TO_LEVEL);
  const conceptId = ids[Math.floor(now / WEEK_MS) % ids.length];
  const c = CONCEPT_TO_LEVEL[conceptId];
  const problems = buildSet(c.category, c.level, PROBLEM_COUNT);
  const ins = await tx.run(
    `INSERT INTO tournaments (title, concept_id, category, level, problem_count, problems_json, starts_at, ends_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [`Weekly ${conceptName(conceptId)} Cup`, conceptId, c.category, c.level, problems.length, JSON.stringify(problems), now, now + WEEK_MS, now]
  );
  return tx.get('SELECT * FROM tournaments WHERE id = ?', [ins.lastID]);
}

// Ensure a current active event exists, finalizing + rotating as needed.
async function ensureCurrent(tx, now) {
  let active = await tx.get("SELECT * FROM tournaments WHERE status = 'active' ORDER BY id DESC LIMIT 1");
  let winners = [];
  if (active && active.ends_at <= now) {
    winners = await finalizeIfEnded(tx, active, now);
    active = null;
  }
  if (!active) active = await seedTournament(tx, now);
  return { tournament: active, winners };
}

// Top finished entries for the board, ranked score DESC then fastest.
function leaderboard(tournamentId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.username, e.user_id, e.score, e.elapsed_ms, e.reward
         FROM tournament_entries e JOIN users u ON u.id = e.user_id
        WHERE e.tournament_id = ? AND e.status = 'done'
        ORDER BY e.score DESC, e.elapsed_ms ASC
        LIMIT 50`,
      [tournamentId],
      (err, rows) =>
        err
          ? reject(err)
          : resolve((rows || []).map((r, i) => ({ position: i + 1, username: r.username, userId: r.user_id, score: r.score, elapsedMs: r.elapsed_ms, reward: r.reward })))
    );
  });
}

// The current event: metadata + your entry + your rank + the leaderboard (problems are NOT served
// here — fetch them via /start so the attempt is timed).
router.get('/api/tournaments/current', authenticateToken, async (req, res) => {
  try {
    const now = Date.now();
    const { tournament: t, winners } = await withTransaction((tx) => ensureCurrent(tx, now));
    // Notify the just-crowned winners (post-commit; deduped per event so it fires once).
    for (const w of winners) {
      notify(w.userId, {
        category: 'tournament_result',
        title: '🏆 Tournament Result',
        message: `You placed #${w.position} in the ${w.title} and won ${w.reward} coins!`,
        type: 'social',
        dedupKey: `tournament:${w.tournamentId}`,
      });
    }
    const board = await leaderboard(t.id);
    const mine = await new Promise((resolve, reject) =>
      db.get('SELECT status, score, elapsed_ms, reward FROM tournament_entries WHERE tournament_id = ? AND user_id = ?', [t.id, req.user.id], (e, r) => (e ? reject(e) : resolve(r)))
    );
    const yourRank = mine && mine.status === 'done' ? (board.find((b) => b.userId === req.user.id) || {}).position || null : null;
    res.json({
      tournament: {
        id: t.id,
        title: t.title,
        conceptName: conceptName(t.concept_id),
        problemCount: t.problem_count,
        startsAt: t.starts_at,
        endsAt: t.ends_at,
        msRemaining: Math.max(0, t.ends_at - now),
        status: t.status,
      },
      yourEntry: mine ? { status: mine.status, score: mine.score, elapsedMs: mine.elapsed_ms, reward: mine.reward } : null,
      yourRank,
      leaderboard: board,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Start your one timed attempt: stamp started_at server-side and serve the answer-stripped set.
// Re-calling while pending resumes the same attempt; calling after you've finished is rejected.
router.post('/api/tournaments/:id/start', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  withTransaction(async (tx) => {
    const t = await tx.get('SELECT * FROM tournaments WHERE id = ?', [id]);
    if (!t) throw httpError(404, 'Tournament not found');
    if (t.status !== 'active' || t.ends_at <= Date.now()) throw httpError(400, 'This tournament is not running');
    const entry = await tx.get('SELECT status FROM tournament_entries WHERE tournament_id = ? AND user_id = ?', [id, req.user.id]);
    if (entry && entry.status === 'done') throw httpError(400, "You've already played this tournament");
    const now = Date.now();
    if (!entry) {
      await tx.run('INSERT INTO tournament_entries (tournament_id, user_id, started_at, status, created_at) VALUES (?, ?, ?, \'pending\', ?)', [id, req.user.id, now, now]);
    }
    const problems = JSON.parse(t.problems_json).map((p) => ({ question: p.question, options: p.options }));
    return { tournamentId: id, problemCount: t.problem_count, problems };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Submit the attempt: score it, record the server-measured elapsed time, mark it done.
router.post('/api/tournaments/:id/play', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  if (!answers) return res.status(400).json({ error: 'answers array required' });

  withTransaction(async (tx) => {
    const t = await tx.get('SELECT * FROM tournaments WHERE id = ?', [id]);
    if (!t) throw httpError(404, 'Tournament not found');
    const entry = await tx.get('SELECT id, started_at, status FROM tournament_entries WHERE tournament_id = ? AND user_id = ?', [id, req.user.id]);
    if (!entry) throw httpError(400, 'Start the tournament before submitting');
    if (entry.status === 'done') throw httpError(400, "You've already played this tournament");
    if (t.ends_at <= Date.now()) throw httpError(400, 'This tournament has ended');

    const problems = JSON.parse(t.problems_json);
    let score = 0;
    for (let i = 0; i < problems.length; i++) {
      if (normalize(answers[i]) === normalize(problems[i].answer)) score += 1;
    }
    const elapsedMs = Math.max(0, Date.now() - entry.started_at);
    await tx.run("UPDATE tournament_entries SET score = ?, elapsed_ms = ?, status = 'done' WHERE id = ?", [score, elapsedMs, entry.id]);
    return { tournamentId: id, score, elapsedMs, total: problems.length };
  })
    .then(async (payload) => {
      const board = await leaderboard(payload.tournamentId);
      const yourRank = (board.find((b) => b.userId === req.user.id) || {}).position || null;
      const { tournamentId, ...rest } = payload;
      res.json({ ...rest, yourRank, leaderboard: board });
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
