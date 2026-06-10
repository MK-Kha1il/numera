// Async (correspondence) duels (see docs/specs/Spec-CompetitionExpansion.md §4.2).
// Two friends solve the SAME server-generated problem set within 24h; the match resolves the
// moment both have played. The set (questions + answers) is generated once and stored, so both
// players get identical problems and scoring is fully server-authoritative. v1 awards coins to
// the winner (transactional); NRS/ranked async is a later item. Reuses the lifecycle notifier
// for "your turn" / result nudges.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem } = require('../mathGenerator');
const { notify } = require('../services/notificationService');

const router = express.Router();

const PROBLEM_COUNT = 5;
const WINNER_REWARD = 25;
const EXPIRY_MS = 24 * 60 * 60 * 1000;
const FIXED_ELO = 1200;

const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { personalLadder } = require('../lib/arenaDifficulty');

// Both players race the SAME set (fair), but its difficulty centres on the average of their
// two levels instead of the old fixed level-5 spread that bored anyone past beginner.
function buildProblemSet(challengerLevel, opponentLevel) {
  const mid = Math.round(((challengerLevel || 1) + (opponentLevel || 1)) / 2);
  return personalLadder(mid, PROBLEM_COUNT).map(([category, level]) => {
    const p = generateProblem(category, level, Math.floor(Math.random() * 100), FIXED_ELO);
    return { question: p.question, options: p.options, answer: p.correctAnswer };
  });
}

function areFriends(a, b) {
  return new Promise((resolve) => {
    db.get(
      `SELECT 1 FROM friends
        WHERE status = 'accepted'
          AND ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?))`,
      [a, b, b, a],
      (err, row) => resolve(!!row)
    );
  });
}

// Result nudge to both players once a match resolves.
function notifyResult(match, winnerId) {
  const msgFor = (uid) =>
    winnerId == null
      ? 'Your async duel ended in a draw!'
      : winnerId === uid
        ? 'You won your async duel! 🏆'
        : 'You lost your async duel. Rematch?';
  notify(match.challenger_id, { category: 'async_result', title: 'Duel Result ⚔️', message: msgFor(match.challenger_id), type: 'social' });
  notify(match.opponent_id, { category: 'async_result', title: 'Duel Result ⚔️', message: msgFor(match.opponent_id), type: 'social' });
}

// Challenge a friend to an async duel.
router.post('/api/duel/async/challenge', authenticateToken, idempotency, async (req, res) => {
  const challengerId = req.user.id;
  const opponentId = parseInt(req.body.opponentId, 10);
  if (!opponentId) return res.status(400).json({ error: 'opponentId required' });
  if (opponentId === challengerId) return res.status(400).json({ error: 'You cannot challenge yourself' });
  if (!(await areFriends(challengerId, opponentId))) {
    return res.status(403).json({ error: 'You can only challenge friends' });
  }

  const now = Date.now();
  const levels = await new Promise((resolve) => {
    db.all('SELECT id, level FROM users WHERE id IN (?, ?)', [challengerId, opponentId], (err, rows) =>
      resolve(err ? [] : rows || [])
    );
  });
  const levelOf = (id) => {
    const row = levels.find((r) => r.id === id);
    return (row && row.level) || 1;
  };
  const problems = buildProblemSet(levelOf(challengerId), levelOf(opponentId));
  db.run(
    `INSERT INTO async_matches (challenger_id, opponent_id, problems_json, problem_count, status, created_at, expires_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
    [challengerId, opponentId, JSON.stringify(problems), problems.length, now, now + EXPIRY_MS],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      notify(opponentId, {
        category: 'async_challenge',
        title: 'New Duel Challenge ⚔️',
        message: `${req.user.username} challenged you to an async duel — you have 24h to answer!`,
        type: 'social',
      });
      res.json({ matchId: this.lastID, problemCount: problems.length });
    }
  );
});

// List the caller's async matches with their per-match state.
router.get('/api/duel/async/active', authenticateToken, (req, res) => {
  const uid = req.user.id;
  const now = Date.now();
  db.all(
    `SELECT m.*, cu.username AS challenger_name, ou.username AS opponent_name
       FROM async_matches m
       JOIN users cu ON cu.id = m.challenger_id
       JOIN users ou ON ou.id = m.opponent_id
      WHERE m.challenger_id = ? OR m.opponent_id = ?
      ORDER BY m.created_at DESC
      LIMIT 50`,
    [uid, uid],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const matches = (rows || []).map((m) => {
        const isChallenger = m.challenger_id === uid;
        const myScore = isChallenger ? m.challenger_score : m.opponent_score;
        const theirScore = isChallenger ? m.opponent_score : m.challenger_score;
        const iPlayed = myScore !== null;
        let status = m.status;
        if (status === 'pending' && now > m.expires_at) status = 'expired';
        return {
          matchId: m.id,
          opponentName: isChallenger ? m.opponent_name : m.challenger_name,
          status,
          yourTurn: status === 'pending' && !iPlayed,
          played: iPlayed,
          myScore,
          theirScore,
          winnerId: m.winner_id,
          won: m.winner_id === uid,
          reward: m.reward,
          problemCount: m.problem_count,
        };
      });
      res.json(matches);
    }
  );
});

// Fetch the problem set to play (answers stripped). Only the caller, only once.
router.get('/api/duel/async/:id', authenticateToken, (req, res) => {
  const uid = req.user.id;
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM async_matches WHERE id = ?', [id], (err, m) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!m || (m.challenger_id !== uid && m.opponent_id !== uid)) return res.status(404).json({ error: 'Match not found' });
    if (m.status === 'pending' && Date.now() > m.expires_at) return res.status(410).json({ error: 'This challenge has expired' });
    if (m.status !== 'pending') return res.status(400).json({ error: 'This match is already resolved' });
    const myScore = m.challenger_id === uid ? m.challenger_score : m.opponent_score;
    if (myScore !== null) return res.status(400).json({ error: 'You already played this match' });
    const problems = JSON.parse(m.problems_json).map((p) => ({ question: p.question, options: p.options }));
    res.json({ matchId: m.id, problems, problemCount: m.problem_count });
  });
});

// Submit answers, score them, and resolve the match if both players are now done.
router.post('/api/duel/async/:id/play', authenticateToken, idempotency, (req, res) => {
  const uid = req.user.id;
  const id = parseInt(req.params.id, 10);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  if (!answers) return res.status(400).json({ error: 'answers array required' });

  withTransaction(async (tx) => {
    const m = await tx.get('SELECT * FROM async_matches WHERE id = ?', [id]);
    if (!m || (m.challenger_id !== uid && m.opponent_id !== uid)) throw httpError(404, 'Match not found');
    if (m.status !== 'pending') throw httpError(400, 'This match is already resolved');
    if (Date.now() > m.expires_at) throw httpError(410, 'This challenge has expired');
    const isChallenger = m.challenger_id === uid;
    const myExisting = isChallenger ? m.challenger_score : m.opponent_score;
    if (myExisting !== null) throw httpError(400, 'You already played this match');

    const problems = JSON.parse(m.problems_json);
    let score = 0;
    for (let i = 0; i < problems.length; i++) {
      if (areEquivalent(answers[i], problems[i].answer)) score += 1;
    }

    const myCol = isChallenger ? 'challenger_score' : 'opponent_score';
    await tx.run(`UPDATE async_matches SET ${myCol} = ? WHERE id = ?`, [score, id]);

    const otherScore = isChallenger ? m.opponent_score : m.challenger_score;
    if (otherScore === null) {
      return { score, resolved: false, match: m };
    }

    // Both done → resolve.
    const challengerScore = isChallenger ? score : m.challenger_score;
    const opponentScore = isChallenger ? m.opponent_score : score;
    let winnerId = null;
    if (challengerScore > opponentScore) winnerId = m.challenger_id;
    else if (opponentScore > challengerScore) winnerId = m.opponent_id;
    const reward = winnerId ? WINNER_REWARD : 0;
    await tx.run(
      `UPDATE async_matches SET status = 'finished', winner_id = ?, reward = ?, finished_at = ? WHERE id = ?`,
      [winnerId, reward, Date.now(), id]
    );
    if (winnerId) await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [reward, winnerId]);
    return { score, resolved: true, match: m, result: { winnerId, challengerScore, opponentScore, reward } };
  })
    .then((payload) => {
      // Notifications outside the transaction (fire-and-forget).
      if (payload.resolved) {
        notifyResult(payload.match, payload.result.winnerId);
      } else {
        const m = payload.match;
        const otherId = m.challenger_id === uid ? m.opponent_id : m.challenger_id;
        notify(otherId, { category: 'async_turn', title: 'Your move ⚔️', message: `${req.user.username} played their round — your turn!`, type: 'social' });
      }
      res.json({ success: true, score: payload.score, resolved: payload.resolved, result: payload.result || null });
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
