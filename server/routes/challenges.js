// User-created Custom Challenges (audit #10 / top-50 #23 / missing-system #6 — community gravity
// + a content treadmill). A learner AUTHORS a named challenge over one curriculum concept; the
// server generates the fixed problem set ONCE at creation and stores it, so everyone who plays a
// given code gets the SAME problems and the per-challenge leaderboard is fair. A short share code
// lets friends play it; each user gets one scored attempt (replays return the existing result, so
// the board can't be farmed by retrying); the board ranks by score, then by fastest time. Only the
// TITLE is user-supplied text (content-filtered) — problems are server-generated — so there's no
// wrong-math or moderation hole. Glory-only (no coins) so trivial challenges can't be farmed.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { checkText } = require('../lib/contentFilter');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');

const router = express.Router();

const TITLE_MIN = 3;
const TITLE_MAX = 40;
const COUNT_MIN = 5;
const COUNT_MAX = 15;
const FIXED_ELO = 1200; // standardized so difficulty is set by the concept, not the author's profile

const { areEquivalent } = require('../mathEngine/answerEquivalence');
const conceptName = (id) => (KnowledgeGraph.concepts[id] && KnowledgeGraph.concepts[id].name) || id;

// A 6-char unambiguous share code (no 0/O/1/I/L so it reads/types cleanly).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function makeCode() {
  const bytes = crypto.randomBytes(6);
  let c = '';
  for (let i = 0; i < 6; i++) c += ALPHABET[bytes[i] % ALPHABET.length];
  return c;
}

function buildProblemSet(category, level, count) {
  const set = [];
  for (let i = 0; i < count; i++) {
    const p = generateProblem(category, level, Math.floor(Math.random() * 1000), FIXED_ELO);
    set.push({ question: p.question, options: p.options, answer: p.correctAnswer });
  }
  return set;
}

// Top scores for one challenge (best attempt per user; one row per user by construction), ranked
// score DESC then fastest.
function leaderboard(challengeId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.username, a.user_id, a.score, a.elapsed_ms
         FROM challenge_attempts a JOIN users u ON u.id = a.user_id
        WHERE a.challenge_id = ?
        ORDER BY a.score DESC, a.elapsed_ms ASC
        LIMIT 20`,
      [challengeId],
      (err, rows) =>
        err
          ? reject(err)
          : resolve((rows || []).map((r, i) => ({ position: i + 1, username: r.username, userId: r.user_id, score: r.score, elapsedMs: r.elapsed_ms })))
    );
  });
}

// The catalog a challenge can be built from (drives the client's create picker). Concepts come
// straight from the playable CONCEPT_TO_LEVEL curriculum so every choice has real templates.
router.get('/api/challenges/concepts', authenticateToken, (req, res) => {
  const concepts = Object.keys(CONCEPT_TO_LEVEL)
    .map((id) => ({ conceptId: id, name: conceptName(id), category: CONCEPT_TO_LEVEL[id].category, level: CONCEPT_TO_LEVEL[id].level }))
    .sort((a, b) => a.level - b.level);
  res.json({ concepts, countMin: COUNT_MIN, countMax: COUNT_MAX });
});

// My challenges: ones I created OR ones I've played, newest first.
router.get('/api/challenges', authenticateToken, (req, res) => {
  const uid = req.user.id;
  db.all(
    `SELECT c.code, c.title, c.concept_id, c.problem_count, c.play_count, c.creator_id, c.created_at,
            a.score AS my_score
       FROM custom_challenges c
       LEFT JOIN challenge_attempts a ON a.challenge_id = c.id AND a.user_id = ?
      WHERE c.creator_id = ? OR a.user_id IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 50`,
    [uid, uid],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        challenges: (rows || []).map((r) => ({
          code: r.code,
          title: r.title,
          conceptName: conceptName(r.concept_id),
          problemCount: r.problem_count,
          playCount: r.play_count,
          isMine: r.creator_id === uid,
          yourScore: r.my_score == null ? null : r.my_score,
        })),
      });
    }
  );
});

// Create a challenge: generate + store the fixed set, return the share code.
router.post('/api/challenges', authenticateToken, (req, res) => {
  const title = String((req.body && req.body.title) || '').trim();
  const conceptId = String((req.body && req.body.conceptId) || '');
  let count = parseInt(req.body && req.body.count, 10);
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return res.status(400).json({ error: `Title must be ${TITLE_MIN}-${TITLE_MAX} characters` });
  }
  const clean = checkText(title, 'Title');
  if (!clean.ok) return res.status(400).json({ error: clean.error });
  const concept = CONCEPT_TO_LEVEL[conceptId];
  if (!concept) return res.status(400).json({ error: 'Unknown concept' });
  if (!Number.isFinite(count)) count = COUNT_MIN;
  count = Math.max(COUNT_MIN, Math.min(COUNT_MAX, count));

  const problems = buildProblemSet(concept.category, concept.level, count);
  const now = Date.now();
  // Retry on the (astronomically unlikely) share-code collision.
  const tryInsert = (attempt) => {
    const code = makeCode();
    db.run(
      `INSERT INTO custom_challenges (code, creator_id, title, concept_id, category, level, problem_count, problems_json, play_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [code, req.user.id, title, conceptId, concept.category, concept.level, problems.length, JSON.stringify(problems), now],
      function (err) {
        if (err) {
          if (/UNIQUE/.test(err.message) && attempt < 5) return tryInsert(attempt + 1);
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, code, title, conceptName: conceptName(conceptId), problemCount: problems.length });
      }
    );
  };
  tryInsert(0);
});

// Look up a challenge by code: metadata + answer-stripped problems + your attempt (if any) + board.
router.get('/api/challenges/:code', authenticateToken, async (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  try {
    const ch = await new Promise((resolve, reject) => db.get('SELECT * FROM custom_challenges WHERE code = ?', [code], (e, r) => (e ? reject(e) : resolve(r))));
    if (!ch) return res.status(404).json({ error: 'Challenge not found' });
    const creator = await new Promise((resolve, reject) => db.get('SELECT username FROM users WHERE id = ?', [ch.creator_id], (e, r) => (e ? reject(e) : resolve(r))));
    const mine = await new Promise((resolve, reject) => db.get('SELECT score, elapsed_ms FROM challenge_attempts WHERE challenge_id = ? AND user_id = ?', [ch.id, req.user.id], (e, r) => (e ? reject(e) : resolve(r))));
    const problems = JSON.parse(ch.problems_json).map((p) => ({ question: p.question, options: p.options }));
    const board = await leaderboard(ch.id);
    res.json({
      code: ch.code,
      title: ch.title,
      conceptName: conceptName(ch.concept_id),
      creator: creator ? creator.username : 'Unknown',
      isMine: ch.creator_id === req.user.id,
      problemCount: ch.problem_count,
      playCount: ch.play_count,
      problems,
      yourAttempt: mine ? { score: mine.score, elapsedMs: mine.elapsed_ms } : null,
      leaderboard: board,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit a one-shot attempt: score it, record it, bump play_count. One attempt per user — a replay
// returns the existing result without re-scoring, so the board can't be gamed by retrying.
router.post('/api/challenges/:code/play', authenticateToken, (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  const elapsedMs = Math.max(0, parseInt(req.body.elapsedMs, 10) || 0);
  if (!answers) return res.status(400).json({ error: 'answers array required' });

  withTransaction(async (tx) => {
    const ch = await tx.get('SELECT * FROM custom_challenges WHERE code = ?', [code]);
    if (!ch) throw httpError(404, 'Challenge not found');
    const existing = await tx.get('SELECT score, elapsed_ms FROM challenge_attempts WHERE challenge_id = ? AND user_id = ?', [ch.id, req.user.id]);
    if (existing) {
      return { challengeId: ch.id, alreadyPlayed: true, score: existing.score, elapsedMs: existing.elapsed_ms, total: ch.problem_count };
    }
    const problems = JSON.parse(ch.problems_json);
    let score = 0;
    for (let i = 0; i < problems.length; i++) {
      if (areEquivalent(answers[i], problems[i].answer)) score += 1;
    }
    const now = Date.now();
    await tx.run('INSERT INTO challenge_attempts (challenge_id, user_id, score, elapsed_ms, created_at) VALUES (?, ?, ?, ?, ?)', [ch.id, req.user.id, score, elapsedMs, now]);
    await tx.run('UPDATE custom_challenges SET play_count = play_count + 1 WHERE id = ?', [ch.id]);
    return { challengeId: ch.id, alreadyPlayed: false, score, elapsedMs, total: problems.length };
  })
    .then(async (payload) => {
      const board = await leaderboard(payload.challengeId);
      const { challengeId, ...rest } = payload;
      res.json({ ...rest, leaderboard: board });
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
