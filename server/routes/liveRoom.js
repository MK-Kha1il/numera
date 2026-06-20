// Live group/class competitive rooms (competitive audit #19 — Kahoot-style live play). A host opens a
// room, players join by a short code (the class-code pattern), the host starts it, and everyone races
// the SAME server-generated set. Grading is server-authoritative — the answer key is kept server-side
// and stripped from every payload, like the duel/reasoning modes — and scores feed a live podium.
//
// REST-driven (pollable) so the core is fully testable; a socket "room updated" push can layer on for
// instant liveness without changing this contract.
const express = require('express');
const crypto = require('crypto');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem } = require('../mathGenerator');
const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { feedEngineOutcome } = require('../services/engineFeed');

const router = express.Router();

const PROBLEM_COUNT = 5;
const GEN_ELO = 1200;
const POINTS_PER_CORRECT = 10;
const MAX_PLAYERS = 40; // a classroom-sized cap

// Unambiguous 6-char code (no 0/O/1/I) — easy to read aloud to a room.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = () => Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)]).join('');

// Build the room's problem set (answer key included — server-only).
function buildProblems(category, level) {
  const cat = category || 'arithmetic';
  return Array.from({ length: PROBLEM_COUNT }, () => {
    const p = generateProblem(cat, level, Math.floor(Math.random() * 1e6), GEN_ELO, {}, {});
    return { question: p.question, options: p.options, answer: p.correctAnswer, templateType: p.templateType, category: cat };
  });
}

// Strip the answer key before any problem leaves the server.
const publicProblem = (p) => ({ question: p.question, options: p.options });

// ── POST /api/live-rooms ──────────────────────────────────────────────────────
// Host opens a room (auto-joins as a member). Optional category/level (defaults to the host's level).
router.post('/api/live-rooms', authenticateToken, (req, res) => {
  const category = (req.body && typeof req.body.category === 'string') ? req.body.category : null;
  db.get('SELECT level FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    const level = Math.max(1, parseInt((req.body && req.body.level), 10) || (u && u.level) || 1);
    const problems = buildProblems(category, level);
    const now = Math.floor(Date.now() / 1000);

    const attempt = (triesLeft) => {
      const code = generateCode();
      db.run(
        "INSERT INTO live_rooms (code, host_id, category, level, problems_json, problem_count, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'lobby', ?)",
        [code, req.user.id, category, level, JSON.stringify(problems), problems.length, now],
        function (e) {
          if (e) {
            if (/UNIQUE/.test(e.message) && triesLeft > 0) return attempt(triesLeft - 1);
            return res.status(500).json({ error: e.message });
          }
          const roomId = this.lastID;
          db.run('INSERT INTO live_room_members (room_id, user_id, score, answered_count, joined_at) VALUES (?, ?, 0, 0, ?)', [roomId, req.user.id, now], (e2) => {
            if (e2) return res.status(500).json({ error: e2.message });
            res.json({ roomId, code, problemCount: problems.length, status: 'lobby', isHost: true });
          });
        }
      );
    };
    attempt(5);
  });
});

// ── POST /api/live-rooms/:code/join ───────────────────────────────────────────
// Join an open room by code (only while in the lobby; capped; idempotent for an already-joined member).
router.post('/api/live-rooms/:code/join', authenticateToken, (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  withTransaction(async (tx) => {
    const room = await tx.get('SELECT * FROM live_rooms WHERE code = ?', [code]);
    if (!room) throw httpError(404, 'Room not found');
    if (room.status !== 'lobby') throw httpError(400, 'This room has already started');
    const already = await tx.get('SELECT 1 FROM live_room_members WHERE room_id = ? AND user_id = ?', [room.id, req.user.id]);
    if (!already) {
      const count = await tx.get('SELECT COUNT(*) AS n FROM live_room_members WHERE room_id = ?', [room.id]);
      if ((count.n || 0) >= MAX_PLAYERS) throw httpError(400, 'This room is full');
      await tx.run('INSERT INTO live_room_members (room_id, user_id, score, answered_count, joined_at) VALUES (?, ?, 0, 0, ?)', [room.id, req.user.id, Math.floor(Date.now() / 1000)]);
    }
    return { roomId: room.id, code, problemCount: room.problem_count, status: room.status, isHost: room.host_id === req.user.id };
  })
    .then((r) => res.json(r))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// ── POST /api/live-rooms/:id/start ────────────────────────────────────────────
// Host-only: lobby → active. Returns the problems (answer key stripped).
router.post('/api/live-rooms/:id/start', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  withTransaction(async (tx) => {
    const room = await tx.get('SELECT * FROM live_rooms WHERE id = ?', [id]);
    if (!room) throw httpError(404, 'Room not found');
    if (room.host_id !== req.user.id) throw httpError(403, 'Only the host can start the room');
    if (room.status !== 'lobby') throw httpError(400, 'Room already started');
    await tx.run("UPDATE live_rooms SET status = 'active' WHERE id = ?", [id]);
    return JSON.parse(room.problems_json);
  })
    .then((problems) => res.json({ status: 'active', problems: problems.map(publicProblem) }))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// ── GET /api/live-rooms/:id ───────────────────────────────────────────────────
// Current room state for a member: status, the live standings, your own progress, and (once active)
// the problems with the answer key stripped.
router.get('/api/live-rooms/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM live_rooms WHERE id = ?', [id], (err, room) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    db.get('SELECT * FROM live_room_members WHERE room_id = ? AND user_id = ?', [id, req.user.id], (e2, me) => {
      if (e2) return res.status(500).json({ error: e2.message });
      if (!me) return res.status(403).json({ error: 'Join the room first' });
      db.all(
        `SELECT m.user_id AS userId, u.username, m.score, m.answered_count AS answered
           FROM live_room_members m JOIN users u ON u.id = m.user_id
          WHERE m.room_id = ? ORDER BY m.score DESC, m.answered_count DESC, m.joined_at ASC`,
        [id],
        (e3, members) => {
          if (e3) return res.status(500).json({ error: e3.message });
          const standings = (members || []).map((m, i) => ({ position: i + 1, ...m }));
          const problems = room.status === 'active' || room.status === 'done'
            ? JSON.parse(room.problems_json).map(publicProblem) : [];
          res.json({
            roomId: id,
            code: room.code,
            status: room.status,
            isHost: room.host_id === req.user.id,
            problemCount: room.problem_count,
            problems,
            you: { score: me.score, answered: me.answered_count },
            standings,
          });
        }
      );
    });
  });
});

// ── POST /api/live-rooms/:id/answer ───────────────────────────────────────────
// Submit one answer. Server-graded; one submission per (member, problem); awards points for a correct
// answer and feeds the learning engine. Returns whether it was correct + your running score.
router.post('/api/live-rooms/:id/answer', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const problemIndex = parseInt(req.body && req.body.problemIndex, 10);
  const answer = req.body && req.body.answer;
  let feed = null;
  withTransaction(async (tx) => {
    const room = await tx.get('SELECT * FROM live_rooms WHERE id = ?', [id]);
    if (!room) throw httpError(404, 'Room not found');
    if (room.status !== 'active') throw httpError(400, 'Room is not active');
    const me = await tx.get('SELECT 1 FROM live_room_members WHERE room_id = ? AND user_id = ?', [id, req.user.id]);
    if (!me) throw httpError(403, 'Join the room first');
    const problems = JSON.parse(room.problems_json);
    if (!Number.isInteger(problemIndex) || problemIndex < 0 || problemIndex >= problems.length) throw httpError(400, 'Invalid problem index');
    const dup = await tx.get('SELECT 1 FROM live_room_answers WHERE room_id = ? AND user_id = ? AND problem_index = ?', [id, req.user.id, problemIndex]);
    if (dup) throw httpError(400, 'You already answered this problem');

    const correct = areEquivalent(answer, problems[problemIndex].answer);
    await tx.run('INSERT INTO live_room_answers (room_id, user_id, problem_index, correct) VALUES (?, ?, ?, ?)', [id, req.user.id, problemIndex, correct ? 1 : 0]);
    await tx.run('UPDATE live_room_members SET answered_count = answered_count + 1, score = score + ? WHERE room_id = ? AND user_id = ?', [correct ? POINTS_PER_CORRECT : 0, id, req.user.id]);
    const updated = await tx.get('SELECT score, answered_count FROM live_room_members WHERE room_id = ? AND user_id = ?', [id, req.user.id]);
    if (problems[problemIndex].templateType) {
      feed = { conceptKey: problems[problemIndex].templateType, correct, correctAnswer: problems[problemIndex].answer, wrongAnswer: correct ? null : (answer != null ? String(answer) : null) };
    }
    return { correct, score: updated.score, answered: updated.answered_count, total: problems.length };
  })
    .then(async (r) => {
      if (feed) { try { await feedEngineOutcome(db, req.user.id, feed.conceptKey, feed); } catch { /* best-effort */ } }
      res.json(r);
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// ── POST /api/live-rooms/:id/finish ───────────────────────────────────────────
// Host-only: end the room and return the final podium.
router.post('/api/live-rooms/:id/finish', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM live_rooms WHERE id = ?', [id], (err, room) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.host_id !== req.user.id) return res.status(403).json({ error: 'Only the host can end the room' });
    db.run("UPDATE live_rooms SET status = 'done' WHERE id = ?", [id], (e2) => {
      if (e2) return res.status(500).json({ error: e2.message });
      db.all(
        `SELECT m.user_id AS userId, u.username, m.score
           FROM live_room_members m JOIN users u ON u.id = m.user_id
          WHERE m.room_id = ? ORDER BY m.score DESC, m.answered_count DESC, m.joined_at ASC`,
        [id],
        (e3, rows) => {
          if (e3) return res.status(500).json({ error: e3.message });
          res.json({ status: 'done', podium: (rows || []).map((m, i) => ({ position: i + 1, ...m })) });
        }
      );
    });
  });
});

module.exports = router;
