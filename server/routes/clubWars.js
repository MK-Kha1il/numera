// Club wars (audit #1.7 — team competition). A club owner challenges another club to a head-to-head:
// both clubs' members race the SAME server-generated set once, and the club with the higher combined
// score wins. Server-authoritative (answers never leave the server; one attempt per player). The war
// resolves lazily — when its window has passed, the next read finalizes it: sum each side's scores,
// crown the higher total, and pay the winning side's participants (idempotent via the status guard).
// No real-time arena needed — this is the async/correspondence path to team competition.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');
const { notify } = require('../services/notificationService');

const router = express.Router();

const PROBLEM_COUNT = 7;
const FIXED_ELO = 1200;
const WAR_MS = 3 * 86400000;     // a war runs for 3 days
const WIN_REWARD = 40;           // coins per winning participant

const normalize = (s) => String(s == null ? '' : s).trim().toLowerCase();
const conceptName = (id) => (KnowledgeGraph.concepts[id] && KnowledgeGraph.concepts[id].name) || id;
const clubIdOf = (tx, userId) => tx.get('SELECT club_id FROM club_members WHERE user_id = ?', [userId]).then((r) => (r ? r.club_id : null));

function buildSet(category, level, count) {
  const set = [];
  for (let i = 0; i < count; i++) {
    const p = generateProblem(category, level, Math.floor(Math.random() * 1000), FIXED_ELO);
    set.push({ question: p.question, options: p.options, answer: p.correctAnswer });
  }
  return set;
}

// Per-club score totals + player counts for one war.
async function tallies(tx, warId) {
  const rows = await tx.all(
    "SELECT club_id, COALESCE(SUM(score), 0) AS total, COUNT(*) AS players FROM club_war_entries WHERE war_id = ? GROUP BY club_id",
    [warId]
  );
  const by = {};
  for (const r of rows) by[r.club_id] = { total: r.total, players: r.players };
  return by;
}

// Finalize a war whose window has closed: crown the higher combined score and pay that side's
// participants. Idempotent — the status guard means a second call is a no-op. Returns rewarded users.
async function finalizeIfEnded(tx, war, now) {
  if (!war || war.status !== 'active' || war.ends_at > now) return [];
  const by = await tallies(tx, war.id);
  const cTotal = (by[war.challenger_club_id] || {}).total || 0;
  const oTotal = (by[war.opponent_club_id] || {}).total || 0;
  let winner = 0; // 0 = draw
  if (cTotal > oTotal) winner = war.challenger_club_id;
  else if (oTotal > cTotal) winner = war.opponent_club_id;

  const rewarded = [];
  if (winner) {
    const members = await tx.all("SELECT user_id FROM club_war_entries WHERE war_id = ? AND club_id = ?", [war.id, winner]);
    for (const m of members) {
      await tx.run('UPDATE users SET coins = coins + ? WHERE id = ?', [WIN_REWARD, m.user_id]);
      rewarded.push({ userId: m.user_id, reward: WIN_REWARD, warId: war.id });
    }
  }
  await tx.run("UPDATE club_wars SET status = 'finalized', winner_club_id = ? WHERE id = ?", [winner, war.id]);
  return rewarded;
}

function notifyWarWinners(rewarded) {
  for (const w of rewarded) {
    notify(w.userId, {
      category: 'club_war_result',
      title: '⚔️ Club War Won!',
      message: `Your club won its war — you earned ${w.reward} coins!`,
      type: 'social',
      dedupKey: `clubwar:${w.warId}`,
    });
  }
}

// Finalize any of my club's expired-but-active wars (lazy housekeeping before a read).
async function settleMyWars(tx, clubId, now) {
  const open = await tx.all(
    "SELECT * FROM club_wars WHERE status = 'active' AND ends_at <= ? AND (challenger_club_id = ? OR opponent_club_id = ?)",
    [now, clubId, clubId]
  );
  let rewarded = [];
  for (const war of open) rewarded = rewarded.concat(await finalizeIfEnded(tx, war, now));
  return rewarded;
}

// Shape a war row for the client, relative to the caller's club.
async function presentWar(tx, war, myClubId, userId) {
  const by = await tallies(tx, war.id);
  const names = await tx.all('SELECT id, name FROM clubs WHERE id IN (?, ?)', [war.challenger_club_id, war.opponent_club_id]);
  const nameOf = (id) => (names.find((n) => n.id === id) || {}).name || 'Disbanded club';
  const mine = await tx.get('SELECT score FROM club_war_entries WHERE war_id = ? AND user_id = ?', [war.id, userId]);
  return {
    id: war.id,
    concept: conceptName(war.concept_id),
    problemCount: war.problem_count,
    endsAt: war.ends_at,
    msRemaining: Math.max(0, war.ends_at - Date.now()),
    status: war.status,
    challenger: { clubId: war.challenger_club_id, name: nameOf(war.challenger_club_id), total: (by[war.challenger_club_id] || {}).total || 0, players: (by[war.challenger_club_id] || {}).players || 0 },
    opponent: { clubId: war.opponent_club_id, name: nameOf(war.opponent_club_id), total: (by[war.opponent_club_id] || {}).total || 0, players: (by[war.opponent_club_id] || {}).players || 0 },
    myClubId,
    winnerClubId: war.winner_club_id,
    youPlayed: !!mine,
    yourScore: mine ? mine.score : null,
  };
}

// My club's wars (active first, then recent), settling any that have ended.
router.get('/api/clubs/wars', authenticateToken, (req, res) => {
  const now = Date.now();
  withTransaction(async (tx) => {
    const myClubId = await clubIdOf(tx, req.user.id);
    if (!myClubId) return { wars: [], rewarded: [], myClubId: null };
    const rewarded = await settleMyWars(tx, myClubId, now);
    const rows = await tx.all(
      `SELECT * FROM club_wars WHERE challenger_club_id = ? OR opponent_club_id = ?
        ORDER BY (status = 'active') DESC, id DESC LIMIT 20`,
      [myClubId, myClubId]
    );
    const wars = [];
    for (const w of rows) wars.push(await presentWar(tx, w, myClubId, req.user.id));
    return { wars, rewarded, myClubId };
  })
    .then((out) => {
      notifyWarWinners(out.rewarded);
      res.json({ wars: out.wars, myClubId: out.myClubId });
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Challenge another club. Owner-only; both clubs must exist and differ; no active war already
// running between the pair. The war is immediately live (no accept handshake).
router.post('/api/clubs/wars/challenge', authenticateToken, (req, res) => {
  const opponentClubId = parseInt(req.body && req.body.opponentClubId, 10);
  if (!Number.isFinite(opponentClubId)) return res.status(400).json({ error: 'Invalid opponent club' });

  withTransaction(async (tx) => {
    const myClubId = await clubIdOf(tx, req.user.id);
    if (!myClubId) throw httpError(400, 'Join a club before starting a war');
    const club = await tx.get('SELECT owner_id FROM clubs WHERE id = ?', [myClubId]);
    if (!club || club.owner_id !== req.user.id) throw httpError(403, 'Only your club owner can declare a war');
    if (opponentClubId === myClubId) throw httpError(400, 'Pick a different club');
    const opponent = await tx.get('SELECT id FROM clubs WHERE id = ?', [opponentClubId]);
    if (!opponent) throw httpError(404, 'Opponent club not found');
    const existing = await tx.get(
      `SELECT 1 FROM club_wars WHERE status = 'active'
         AND ((challenger_club_id = ? AND opponent_club_id = ?) OR (challenger_club_id = ? AND opponent_club_id = ?))`,
      [myClubId, opponentClubId, opponentClubId, myClubId]
    );
    if (existing) throw httpError(409, 'A war between these clubs is already running');

    // Pick a concept (varies over time) and freeze the shared set.
    const ids = Object.keys(CONCEPT_TO_LEVEL);
    const conceptId = ids[Math.floor(Date.now() / WAR_MS) % ids.length];
    const c = CONCEPT_TO_LEVEL[conceptId];
    const problems = buildSet(c.category, c.level, PROBLEM_COUNT);
    const now = Date.now();
    const ins = await tx.run(
      `INSERT INTO club_wars (challenger_club_id, opponent_club_id, concept_id, category, level, problem_count, problems_json, starts_at, ends_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [myClubId, opponentClubId, conceptId, c.category, c.level, problems.length, JSON.stringify(problems), now, now + WAR_MS, now]
    );
    return { warId: ins.lastID, opponentClubId };
  })
    .then((out) => {
      // Rally the opponent's members.
      db.all('SELECT user_id FROM club_members WHERE club_id = ?', [out.opponentClubId], (e, rows) => {
        if (!e && rows) for (const r of rows) notify(r.user_id, { category: 'club_war_challenge', title: '⚔️ Your club was challenged!', message: 'A rival club declared war — play to defend your team.', type: 'social', dedupKey: `clubwar-new:${out.warId}` });
      });
      res.json({ success: true, warId: out.warId });
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// War detail: standings + answer-stripped problems for playing.
router.get('/api/clubs/wars/:id', authenticateToken, (req, res) => {
  const warId = parseInt(req.params.id, 10);
  withTransaction(async (tx) => {
    const war = await tx.get('SELECT * FROM club_wars WHERE id = ?', [warId]);
    if (!war) throw httpError(404, 'War not found');
    if (war.status === 'active' && war.ends_at <= Date.now()) await finalizeIfEnded(tx, war, Date.now());
    const fresh = await tx.get('SELECT * FROM club_wars WHERE id = ?', [warId]);
    const myClubId = await clubIdOf(tx, req.user.id);
    const view = await presentWar(tx, fresh, myClubId, req.user.id);
    const problems = JSON.parse(fresh.problems_json).map((p) => ({ question: p.question, options: p.options }));
    return { ...view, problems };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// Play your one attempt for your club. Must be a member of one of the two clubs and not have played.
router.post('/api/clubs/wars/:id/play', authenticateToken, (req, res) => {
  const warId = parseInt(req.params.id, 10);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  if (!answers) return res.status(400).json({ error: 'answers array required' });

  withTransaction(async (tx) => {
    const war = await tx.get('SELECT * FROM club_wars WHERE id = ?', [warId]);
    if (!war) throw httpError(404, 'War not found');
    if (war.status !== 'active' || war.ends_at <= Date.now()) throw httpError(400, 'This war has ended');
    const myClubId = await clubIdOf(tx, req.user.id);
    if (myClubId !== war.challenger_club_id && myClubId !== war.opponent_club_id) {
      throw httpError(403, 'Only members of the warring clubs can play');
    }
    const existing = await tx.get('SELECT 1 FROM club_war_entries WHERE war_id = ? AND user_id = ?', [warId, req.user.id]);
    if (existing) throw httpError(400, "You've already played this war");

    const problems = JSON.parse(war.problems_json);
    let score = 0;
    for (let i = 0; i < problems.length; i++) {
      if (normalize(answers[i]) === normalize(problems[i].answer)) score += 1;
    }
    await tx.run('INSERT INTO club_war_entries (war_id, user_id, club_id, score, created_at) VALUES (?, ?, ?, ?, ?)', [warId, req.user.id, myClubId, score, Date.now()]);
    const view = await presentWar(tx, war, myClubId, req.user.id);
    return { score, total: problems.length, war: view };
  })
    .then((payload) => res.json(payload))
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
