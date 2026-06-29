// Reasoning Arena (competitive audit Phase 3 — "make understanding the win condition"). A ranked
// mode where a correct ANSWER only banks a point if you ALSO pick the correct REASON it's right
// (reusing the authored self-explanation reason-sets). Scored purely on understanding — ZERO speed
// signal — and it moves the SAME unified NRS rating as duels/solo, via the head-to-head update vs a
// level benchmark. This is the differentiator vs speed-MCQ quiz games: you can't fake your way up.
//
// Server-authoritative throughout: the answer key and the correct-reason index are kept server-side;
// the client gets only the question, the answer options, and the reason options.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { withTransaction, httpError } = require('../dbx');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');
const { areEquivalent } = require('../mathEngine/answerEquivalence');
const { buildSelfExplainJson, SELF_EXPLAIN } = require('../mathEngine/selfExplainEngine');
const NRS = require('../mathEngine/ratingEngine');
const { applyDuelResultToRatings } = require('../services/ratingService');
const { feedEngineOutcome } = require('../services/engineFeed');
const { recordMatch } = require('../services/matchLog');
const { enqueueMissedTopic } = require('../services/srsService');

const router = express.Router();

const PROBLEM_COUNT = 5;
const GEN_ELO = 1200; // representative difficulty for generation (the concept, not the player, sets it)
const DAILY_RATED_CAP = 10; // rating-moving rounds per UTC day (anti-farm; play past it for practice)
const dayStart = () => Math.floor(Date.now() / 86400000) * 86400000;

// The eligible concepts = those with an authored reason-set AND a generatable problem. Each carries
// its competitive domain so a player can choose to climb a specific ladder (audit #15).
const REASONING_POOL = Object.keys(SELF_EXPLAIN)
  .filter((id) => CONCEPT_TO_LEVEL[id])
  .map((id) => ({ id, category: CONCEPT_TO_LEVEL[id].category, level: CONCEPT_TO_LEVEL[id].level, domain: NRS.categoryToDomain(CONCEPT_TO_LEVEL[id].category) }));

// A domain is offerable as a focus only if it has enough reason-sets to fill most of a round, so a
// "focus" round is genuinely mostly that domain (the rest backfills from nearest-level concepts).
const MIN_FOCUS_CONCEPTS = Math.ceil(PROBLEM_COUNT * 0.6); // 3 of 5
const FOCUS_DOMAINS = (() => {
  const counts = {};
  for (const c of REASONING_POOL) counts[c.domain] = (counts[c.domain] || 0) + 1;
  return Object.keys(counts).filter((d) => counts[d] >= MIN_FOCUS_CONCEPTS).sort();
})();

// Pick `count` reason-set concepts nearest the player's level, lightly shuffled for variety. When a
// `focusDomain` is given (and offerable), its concepts are prioritised and the rest backfills so the
// round always has `count` items but is dominated by the chosen domain.
function pickReasoningConcepts(playerLevel, count, focusDomain = null) {
  const byProximity = (a, b) => Math.abs(a.level - playerLevel) - Math.abs(b.level - playerLevel);
  const ranked = [...REASONING_POOL].sort(byProximity);

  let pool;
  if (focusDomain && FOCUS_DOMAINS.includes(focusDomain)) {
    const inDomain = ranked.filter((c) => c.domain === focusDomain);
    const rest = ranked.filter((c) => c.domain !== focusDomain);
    // Take a domain-heavy candidate set: a few extra in-domain for variety, then nearest others.
    pool = inDomain.slice(0, count + 2);
    if (pool.length < count) pool = pool.concat(rest.slice(0, count - pool.length + 2));
  } else {
    pool = ranked.slice(0, Math.max(count + 3, 6));
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── POST /api/reasoning-duel/start ────────────────────────────────────────────
// Build a round at the player's level: each item is a problem + its reason-MCQ. The answer key and
// correct-reason index are stored server-side; only the questions + options are returned.
// ── GET /api/reasoning-duel/domains ───────────────────────────────────────────
// The domains a player can choose to focus a round on (each has enough reason-sets to fill one).
// Drives the Arena's "climb a specific ladder" chooser (audit #15).
router.get('/api/reasoning-duel/domains', authenticateToken, (req, res) => {
  res.json({ domains: FOCUS_DOMAINS });
});

router.post('/api/reasoning-duel/start', authenticateToken, (req, res) => {
  // Optional: focus the round on one domain to climb that ladder ("rank up my Algebra"). Ignored
  // unless it is an offerable focus domain — otherwise the round is mixed ("Any").
  const focusDomain = FOCUS_DOMAINS.includes(req.body && req.body.domain) ? req.body.domain : null;
  db.get('SELECT level FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    const playerLevel = (u && u.level) || 1;
    const concepts = pickReasoningConcepts(playerLevel, PROBLEM_COUNT, focusDomain);

    const problems = concepts.map((c) => {
      const p = generateProblem(c.category, c.level, Math.floor(Math.random() * 1000), GEN_ELO, {}, { targetConceptId: c.id });
      const reason = JSON.parse(buildSelfExplainJson(c.id)); // { question, options:[{text,correct}], explanation }
      return {
        conceptId: c.id,
        templateType: p.templateType,
        question: p.question,
        options: p.options,
        answer: p.correctAnswer, // server-only
        reasonQuestion: reason.question,
        reasonOptions: reason.options.map((o) => o.text),
        reasonCorrectIndex: reason.options.findIndex((o) => o.correct), // server-only
        reasonExplanation: reason.explanation,
      };
    });

    const level = Math.max(1, Math.round(concepts.reduce((s, c) => s + c.level, 0) / Math.max(1, concepts.length)));
    // The round's dominant domain → credited (alongside global) so per-domain ranks climb here too.
    const domainCounts = {};
    for (const c of concepts) {
      const d = NRS.categoryToDomain(c.category);
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    let roundDomain = null;
    let bestN = 0;
    for (const [d, n] of Object.entries(domainCounts)) if (n > bestN) { roundDomain = d; bestN = n; }

    db.run(
      "INSERT INTO reasoning_rounds (user_id, level, domain, problems_json, problem_count, status, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
      [req.user.id, level, roundDomain, JSON.stringify(problems), problems.length, Date.now()],
      function (e2) {
        if (e2) return res.status(500).json({ error: e2.message });
        res.json({
          roundId: this.lastID,
          problemCount: problems.length,
          domain: roundDomain, // the round's dominant domain (the focused ladder, when chosen)
          // Answer key + correct-reason index intentionally stripped.
          problems: problems.map((p) => ({
            question: p.question,
            options: p.options,
            reasonQuestion: p.reasonQuestion,
            reasonOptions: p.reasonOptions,
          })),
        });
      }
    );
  });
});

// ── POST /api/reasoning-duel/:id/submit ───────────────────────────────────────
// Grade each item: a point is BANKED only if BOTH the answer AND the chosen reason are correct.
// banked/total then moves the unified rating (head-to-head vs a level benchmark, no speed term).
router.post('/api/reasoning-duel/:id/submit', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const answers = Array.isArray(req.body.answers) ? req.body.answers : null;
  const reasons = Array.isArray(req.body.reasons) ? req.body.reasons : null;
  if (!answers || !reasons) return res.status(400).json({ error: 'answers and reasons arrays are required' });

  let feeds = [];
  withTransaction(async (tx) => {
    const round = await tx.get('SELECT * FROM reasoning_rounds WHERE id = ? AND user_id = ?', [id, req.user.id]);
    if (!round) throw httpError(404, 'Round not found');
    if (round.status !== 'pending') throw httpError(400, 'This round is already finished');

    const problems = JSON.parse(round.problems_json);
    let banked = 0;
    let answerCorrectCount = 0;
    const perProblem = [];
    const missedConcepts = [];
    feeds = [];
    for (let i = 0; i < problems.length; i++) {
      const answerCorrect = areEquivalent(answers[i], problems[i].answer);
      const reasonCorrect = Number(reasons[i]) === problems[i].reasonCorrectIndex;
      const bankedThis = answerCorrect && reasonCorrect;
      if (answerCorrect) answerCorrectCount++;
      if (bankedThis) banked++;
      // Not banked = the answer OR the reason was wrong → didn't fully understand it. Queue the
      // concept for spaced review (audit #25: a ranked loss becomes learning).
      else if (problems[i].conceptId && !missedConcepts.includes(problems[i].conceptId)) missedConcepts.push(problems[i].conceptId);
      perProblem.push({
        answerCorrect,
        reasonCorrect,
        banked: bankedThis,
        correctAnswer: problems[i].answer,
        reasonCorrectIndex: problems[i].reasonCorrectIndex,
        reasonExplanation: problems[i].reasonExplanation,
      });
      if (problems[i].templateType) {
        feeds.push({ conceptKey: problems[i].templateType, correct: answerCorrect, correctAnswer: problems[i].answer, wrongAnswer: answerCorrect ? null : (answers[i] != null ? String(answers[i]) : null) });
      }
    }

    // Anti-farm: only the first DAILY_RATED_CAP rounds each UTC day move the rating; the rest are
    // playable for practice but rating-neutral. The cap is judged off rounds that actually counted.
    const ratedToday = await tx.get("SELECT COUNT(*) AS n FROM reasoning_rounds WHERE user_id = ? AND rated = 1 AND finished_at >= ?", [req.user.id, dayStart()]);
    const willRate = (ratedToday.n || 0) < DAILY_RATED_CAP;

    const submissionJson = JSON.stringify({ answers, reasons });
    await tx.run("UPDATE reasoning_rounds SET status = 'done', score = ?, rated = ?, submission_json = ?, finished_at = ? WHERE id = ?", [banked, willRate ? 1 : 0, submissionJson, Date.now(), id]);
    return { level: round.level, domain: round.domain, total: problems.length, banked, answerCorrectCount, perProblem, missedConcepts, willRate };
  })
    .then(async (r) => {
      // Feed the learning engine (answer correctness), awaited + sequential so the engine is fed
      // before we respond (no detached writes racing teardown; mastery/retention stay attributed).
      for (const f of feeds) {
        try {
          await feedEngineOutcome(db, req.user.id, f.conceptKey, { correct: f.correct, correctAnswer: f.correctAnswer, wrongAnswer: f.wrongAnswer });
        } catch { /* engine feed is best-effort; never block the result on it */ }
      }

      // Queue every not-fully-understood concept for spaced review, due now (audit #25). Best-effort,
      // awaited so the review queue is populated before the client navigates to it.
      for (const topic of r.missedConcepts) {
        try { await new Promise((resolve) => enqueueMissedTopic(db, req.user.id, topic, resolve)); } catch { /* never block the result */ }
      }

      // Record the match + send the result. `after` is the rating update (null when the daily rated
      // cap is hit — the round was still played, just rating-neutral practice).
      const respond = (after) => {
        const result = after
          ? (after.delta > 0 ? 'win' : after.delta < 0 ? 'loss' : 'draw')
          : (r.banked * 2 >= r.total ? 'win' : 'loss');
        recordMatch(db, {
          userId: req.user.id,
          mode: 'reasoning',
          opponentId: null,
          opponentName: 'Reasoning Benchmark',
          myScore: r.banked,
          oppScore: r.total - r.banked,
          result,
          ratingDelta: after ? after.delta : 0,
          refId: id, // link the match to this round so it can be replayed
        });
        res.json({
          success: true,
          banked: r.banked,
          answerCorrect: r.answerCorrectCount,
          total: r.total,
          ratingCounted: !!after,
          ratingDelta: after ? +after.delta.toFixed(1) : 0,
          newDisplayRating: after ? after.displayRating : null,
          newRank: after ? NRS.displayRatingToRank(after.displayRating, after.sessionsCount) : null,
          promoted: after ? !!after.promoted : false,
          perProblem: r.perProblem,
          reviewQueued: r.missedConcepts.length, // concepts pushed into SRS for spaced review (audit #25)
        });
      };

      if (!r.willRate) { respond(null); return; }

      // Understanding-only outcome (banked/total) moves the unified rating vs a level benchmark.
      const outcome = r.total ? r.banked / r.total : 0;
      const benchmarkMu = 1300 + (r.level || 5) * 20; // harder rounds → stronger benchmark
      applyDuelResultToRatings(
        { userId: req.user.id, opponentMu: benchmarkMu, opponentSigma: 200, outcome, gameMode: 'reasoning', domain: r.domain },
        (_e, after) => respond(after)
      );
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

// ── GET /api/reasoning-duel/:id/review ────────────────────────────────────────
// Replay a FINISHED round problem-by-problem: the question, your answer vs the correct one, and the
// reason you picked vs the correct reason (audit #70 — turn a competitive result into learning).
router.get('/api/reasoning-duel/:id/review', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM reasoning_rounds WHERE id = ? AND user_id = ?', [id, req.user.id], (err, round) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!round) return res.status(404).json({ error: 'Round not found' });
    if (round.status !== 'done') return res.status(400).json({ error: 'This round is not finished' });

    let problems = [];
    let submission = { answers: [], reasons: [] };
    try { problems = JSON.parse(round.problems_json); } catch { problems = []; }
    try { submission = JSON.parse(round.submission_json || '{}'); } catch { submission = {}; }
    const answers = submission.answers || [];
    const reasons = submission.reasons || [];

    const items = problems.map((p, i) => {
      const yourReason = Number(reasons[i]);
      const answerCorrect = areEquivalent(answers[i], p.answer);
      const reasonCorrect = yourReason === p.reasonCorrectIndex;
      return {
        question: p.question,
        options: p.options,
        yourAnswer: answers[i] != null ? String(answers[i]) : null,
        correctAnswer: p.answer,
        answerCorrect,
        reasonQuestion: p.reasonQuestion,
        reasonOptions: p.reasonOptions,
        yourReasonIndex: Number.isInteger(yourReason) ? yourReason : null,
        reasonCorrectIndex: p.reasonCorrectIndex,
        reasonCorrect,
        reasonExplanation: p.reasonExplanation,
        banked: answerCorrect && reasonCorrect,
      };
    });

    res.json({ roundId: id, total: problems.length, banked: round.score, items });
  });
});

module.exports = router;
