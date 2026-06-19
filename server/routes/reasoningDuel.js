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

const router = express.Router();

const PROBLEM_COUNT = 5;
const GEN_ELO = 1200; // representative difficulty for generation (the concept, not the player, sets it)

// The eligible concepts = those with an authored reason-set AND a generatable problem.
const REASONING_POOL = Object.keys(SELF_EXPLAIN)
  .filter((id) => CONCEPT_TO_LEVEL[id])
  .map((id) => ({ id, category: CONCEPT_TO_LEVEL[id].category, level: CONCEPT_TO_LEVEL[id].level }));

// Pick `count` reason-set concepts nearest the player's level, lightly shuffled for variety.
function pickReasoningConcepts(playerLevel, count) {
  const sorted = [...REASONING_POOL].sort((a, b) => Math.abs(a.level - playerLevel) - Math.abs(b.level - playerLevel));
  const pool = sorted.slice(0, Math.max(count + 3, 6));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── POST /api/reasoning-duel/start ────────────────────────────────────────────
// Build a round at the player's level: each item is a problem + its reason-MCQ. The answer key and
// correct-reason index are stored server-side; only the questions + options are returned.
router.post('/api/reasoning-duel/start', authenticateToken, (req, res) => {
  db.get('SELECT level FROM users WHERE id = ?', [req.user.id], (err, u) => {
    if (err) return res.status(500).json({ error: err.message });
    const playerLevel = (u && u.level) || 1;
    const concepts = pickReasoningConcepts(playerLevel, PROBLEM_COUNT);

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
    db.run(
      "INSERT INTO reasoning_rounds (user_id, level, problems_json, problem_count, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
      [req.user.id, level, JSON.stringify(problems), problems.length, Date.now()],
      function (e2) {
        if (e2) return res.status(500).json({ error: e2.message });
        res.json({
          roundId: this.lastID,
          problemCount: problems.length,
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
    feeds = [];
    for (let i = 0; i < problems.length; i++) {
      const answerCorrect = areEquivalent(answers[i], problems[i].answer);
      const reasonCorrect = Number(reasons[i]) === problems[i].reasonCorrectIndex;
      const bankedThis = answerCorrect && reasonCorrect;
      if (answerCorrect) answerCorrectCount++;
      if (bankedThis) banked++;
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

    await tx.run("UPDATE reasoning_rounds SET status = 'done', score = ?, finished_at = ? WHERE id = ?", [banked, Date.now(), id]);
    return { level: round.level, total: problems.length, banked, answerCorrectCount, perProblem };
  })
    .then(async (r) => {
      // Feed the learning engine (answer correctness), awaited + sequential so the engine is fed
      // before we respond (no detached writes racing teardown; mastery/retention stay attributed).
      for (const f of feeds) {
        try {
          await feedEngineOutcome(db, req.user.id, f.conceptKey, { correct: f.correct, correctAnswer: f.correctAnswer, wrongAnswer: f.wrongAnswer });
        } catch { /* engine feed is best-effort; never block the result on it */ }
      }

      // Understanding-only outcome (banked/total) moves the unified rating vs a level benchmark.
      const outcome = r.total ? r.banked / r.total : 0;
      const benchmarkMu = 1300 + (r.level || 5) * 20; // harder rounds → stronger benchmark
      applyDuelResultToRatings(
        { userId: req.user.id, opponentMu: benchmarkMu, opponentSigma: 200, outcome, gameMode: 'reasoning' },
        (_e, after) => {
          res.json({
            success: true,
            banked: r.banked,
            answerCorrect: r.answerCorrectCount,
            total: r.total,
            ratingDelta: after ? +after.delta.toFixed(1) : 0,
            newDisplayRating: after ? after.displayRating : null,
            newRank: after ? NRS.displayRatingToRank(after.displayRating, after.sessionsCount) : null,
            promoted: after ? !!after.promoted : false,
            perProblem: r.perProblem,
          });
        }
      );
    })
    .catch((err) => res.status(err.status || 500).json({ error: err.message }));
});

module.exports = router;
