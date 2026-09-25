// Core learn/play loop: serve orchestrated problems, ingest cognitive + calculator
// telemetry, and finalize a level (APRA reward algorithm) — the last being idempotent and
// the busiest fan-out in the app (rewards, mastery, quests, commitment, achievements,
// competitive rating).
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');
const { idempotency } = require('../idempotency');
const { securityLog } = require('../middleware/security');
const { generateProblem, getLessonAndExamples } = require('../mathGenerator');
const { runIngestionPipeline } = require('../mathEngine/knowledgeIngestion');
const { normalizeLevelForGenerator, applyXp } = require('../lib/progression');
const { SOLO_MODES, normalizeMode, faucetFactor, baseReward, levelStars } = require('../lib/soloRewards');
const { QUEST_DEFS } = require('../lib/questDefs');
const { withTransaction, httpError } = require('../dbx');
const { ensureDailyReset } = require('../services/userService');
const { notify } = require('../services/notificationService');
const { attachTipToProblem } = require('../services/tipService');
const { updateAchievements } = require('../services/achievementService');
const { updateCommitmentAndBurnout } = require('../services/commitmentService');
const { grantRankRewards } = require('../services/rankRewardService');
const { applySoloSessionToRatings } = require('../services/ratingService');
const { ACTIVATION_THRESHOLD, ACTIVATION_WINDOW_DAYS } = require('../lib/activation');

const LearnerModel = require('../mathEngine/learnerModel');
const CompetitiveEngine = require('../mathEngine/competitiveEngine');
const Orchestrator = require('../mathEngine/problemOrchestrator');
const ExerciseMemory = require('../mathEngine/exerciseMemory');
const LessonSafety = require('../mathEngine/lessonSafety');
const { applyRemediation } = require('../mathEngine/remediationEngine');
const { buildWordProblemSet } = require('../mathEngine/wordProblems');
const { buildEstimationSet } = require('../mathEngine/estimation');
const { buildErrorDetectionSet } = require('../mathEngine/errorDetection');
const { buildSelfExplainJson } = require('../mathEngine/selfExplainEngine');
const { buildWorkedExampleJson } = require('../mathEngine/workedExampleEngine');
const { feedEngineOutcome } = require('../services/engineFeed');
const { issueSoloTicket, consumeSoloTicket } = require('../services/soloSessionService');
const logger = require('../logger');

const { recordCoins } = require('../services/economyLedger');
const router = express.Router();

// Enrich an applied-mode problem (word problems / estimation / spot-the-mistake) with the
// same active-learning surface the main problem route serves: the escalating hint ladder +
// single tip (via templateType), a self-explanation prompt for after a CORRECT answer, and —
// except for spot-the-mistake — a worked example for after a WRONG one. Spot-the-mistake
// problems ARE the concept's worked example with one corrupted line, so attaching the clean
// version would hand over the answer (see errorDetection.js). Before 2026-07 these modes
// carried no hints at all.
function enrichAppliedProblem(p) {
  attachTipToProblem(p, false);
  const conceptId = p.conceptId || p.templateType || null;
  if (conceptId) {
    p.selfExplainJson = buildSelfExplainJson(conceptId);
    if (p.category !== 'Spot the Mistake') {
      p.workedExampleJson = buildWorkedExampleJson(conceptId);
    }
  }
  return p;
}

// Lifetime-correct counts at which a category earns a celebrated "mastery-up" (ultra-review #20).
// Crossing one of these on a level-complete returns a `masteryMilestone` the client celebrates.
const MASTERY_MILESTONES = [
  { count: 10, label: 'Apprentice' },
  { count: 25, label: 'Practitioner' },
  { count: 50, label: 'Skilled' },
  { count: 100, label: 'Mastered' },
  { count: 250, label: 'Virtuoso' },
];

// Earn-only Mastery Frames (docs/ShopOverhaul.md §8/§9): granted — never bought — when a strand's
// lifetime-correct count crosses the "Mastered" milestone (100). Keys are the normalized category;
// only strands with a seeded `frame_*` item appear here (the FK to shop_items requires it).
const MASTERY_FRAME_THRESHOLD = 100;
const MASTERY_FRAME_BY_CAT = {
  arithmetic: 'frame_arithmetic_master',
  algebra: 'frame_algebra_master',
  geometry: 'frame_geometry_master',
  fractions: 'frame_fractions_master',
  calculus: 'frame_calculus_master',
  'number theory': 'frame_number_theory_master',
  number_theory: 'frame_number_theory_master',
};

// Procedural problems for specific category & level — engine-integrated
router.get('/api/math/problems', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const category = req.query.category || 'arithmetic';
    const level = parseInt(req.query.level) || 1;
    let count = parseInt(req.query.count) || 3;
    if (count === 5) count = 3;

    // Fetch user ELO and concept analytics in parallel
    const [user, analyticsRows] = await Promise.all([
      new Promise((resolve, reject) => db.get('SELECT elo FROM users WHERE id = ?', [userId], (e, r) => (e ? reject(e) : resolve(r)))),
      new Promise((resolve, reject) =>
        db.all('SELECT * FROM user_concept_analytics WHERE user_id = ?', [userId], (e, r) => (e ? reject(e) : resolve(r || [])))
      ),
    ]);

    const userElo = user ? user.elo || 1000 : 1000;
    const normalizedLevel = normalizeLevelForGenerator(category, level);
    const analyticsMap = {};
    analyticsRows.forEach((row) => {
      analyticsMap[row.concept] = row;
    });

    // Ask the orchestrator: what is the best next concept for this learner?
    const orchestration = await Orchestrator.selectNextConcept(db, userId, category, level);

    // Get learner profile for adaptive difficulty (non-fatal if missing)
    let learnerProfile = null;
    try {
      if (orchestration.conceptId) {
        learnerProfile = await LearnerModel.getProfile(db, userId, orchestration.conceptId);
      }
    } catch (_) {
      /* non-fatal */
    }

    const lessonData = getLessonAndExamples(category, normalizedLevel);

    // Anti-repetition: pull this learner's recent exposure memory once, then have the
    // diversity engine pick the freshest of several candidates per slot (and keep the page
    // internally diverse via the shared batchSigs list).
    const recent = await ExerciseMemory.getRecentExposures(db, userId);
    const batchSigs = [];
    const rawProblems = [];
    const problems = [];
    for (let i = 0; i < count; i++) {
      const picked = await ExerciseMemory.pickFreshExercise(
        db,
        userId,
        (attempt) =>
          generateProblem(category, normalizedLevel, i * 10 + attempt, userElo, analyticsMap, {
            targetConceptId: orchestration.conceptId,
            learnerProfile,
          }),
        { recent, batchSigs, surface: 'problem' }
      );
      rawProblems.push(picked.problem);
      const enriched = await Orchestrator.enrichProblem(db, userId, picked.problem, orchestration);
      // Phase 10: never let an interactive visual carry the literal answer.
      if (enriched.interactiveVisualJson) {
        enriched.interactiveVisualJson = LessonSafety.sanitizeVisualJson(enriched.interactiveVisualJson);
      }
      enriched.diversityScore = Number((picked.diversity || 0).toFixed(3));
      const withTip = attachTipToProblem(enriched, false);
      // Phase 13: when this round is targeted remediation, confront the specific error —
      // surface the learner's own mistaken answer as a distractor + lead the hint ladder
      // with a focused coaching rung.
      if (orchestration.reason === 'misconception_remediation' && orchestration.meta && orchestration.meta.misconception) {
        applyRemediation(withTip, orchestration.meta.misconception);
      }
      problems.push(withTip);
    }

    // Phase 12: strip any worked example from the lesson that would hand over an answer to
    // (or merely restate) one of the problems being served this round.
    const { lesson: safeLesson } = LessonSafety.sanitizeLesson(
      { examples: lessonData.examples || [] },
      rawProblems
    );

    // Keep the memory table bounded (best-effort, fire-and-forget).
    ExerciseMemory.pruneExposures(db, userId).catch(() => {});

    // Serve ticket: a level-mode /complete for this level must follow a real serve.
    await issueSoloTicket(userId, { mode: 'level', level, servedCount: problems.length });

    res.json({
      category,
      level,
      lessonTitle: lessonData.lessonTitle,
      lessonContent: lessonData.lessonContent,
      lessonFormula: lessonData.lessonFormula,
      examples: safeLesson.examples,
      lessonSections: lessonData.sections || null,
      orchestration: {
        targetConcept: orchestration.conceptId,
        reason: orchestration.reason,
        priority: orchestration.priority,
        meta: orchestration.meta,
      },
      problems,
    });
  } catch (err) {
    logger.error('[/api/math/problems]', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit cognitive telemetry of player performance
router.post('/api/math/telemetry', authenticateToken, (req, res) => {
  const { concept, isCorrect, speed, hesitation, retries, templateType, wrongAnswer, correctAnswer, params, misconceptionTags } = req.body;
  if (!concept) {
    return res.status(400).json({ error: 'Missing concept parameter.' });
  }

  const userId = req.user.id;
  const isCorrectNumeric = isCorrect ? 1 : 0;
  const speedVal = parseFloat(speed) || 0;
  const hesitationVal = parseFloat(hesitation) || 0;
  const retriesVal = parseInt(retries, 10) || 0;

  // 1. Feed the learning-intelligence engine (concept analytics + retention + learner model +
  //    teaching style + misconceptions) via the shared recorder — fire-and-forget, never blocks the
  //    response, and identical to the path every other mode now uses (services/engineFeed).
  feedEngineOutcome(db, userId, concept, {
    correct: !!isCorrectNumeric,
    correctAnswer,
    wrongAnswer,
    speedSec: speedVal,
    hesitation: hesitationVal,
    retries: retriesVal,
    templateType,
    params,
    misconceptionTags,
  });

  // 2. Update Template Pedagogical Feedback
  if (templateType) {
    db.get('SELECT * FROM problem_pedagogical_feedback WHERE template_type = ?', [templateType], (err, row) => {
      if (!err) {
        if (row) {
          const total = row.total_attempts + 1;
          const success = row.successes + isCorrectNumeric;
          const newAvgTime = (row.average_time_taken * row.total_attempts + speedVal) / total;
          const newAvgHes = (row.average_hesitation * row.total_attempts + hesitationVal) / total;
          const newFrustration = row.frustration_index * 0.8 + ((1 - isCorrectNumeric) * 0.5 + (hesitationVal > 2.0 ? 0.3 : 0) + retriesVal * 0.2) * 0.2;

          db.run(
            `UPDATE problem_pedagogical_feedback
               SET total_attempts = ?, successes = ?, average_time_taken = ?, average_hesitation = ?, frustration_index = ?
               WHERE template_type = ?`,
            [total, success, newAvgTime, newAvgHes, newFrustration, templateType]
          );
        } else {
          const frustration = (1 - isCorrectNumeric) * 0.5 + (hesitationVal > 2.0 ? 0.3 : 0) + retriesVal * 0.2;
          db.run(
            `INSERT INTO problem_pedagogical_feedback (template_type, total_attempts, successes, average_time_taken, average_hesitation, frustration_index)
               VALUES (?, 1, ?, ?, ?, ?)`,
            [templateType, isCorrectNumeric, speedVal, hesitationVal, frustration]
          );
        }
      }
    });
  }

  // 3. Trigger Ingestion pipeline asynchronously in background (10% random chance to process)
  if (Math.random() < 0.1) {
    runIngestionPipeline(db)
      .then((r) => {
        if (r && r.ingestedCount > 0) {
          const { refreshIngestedTemplates } = require('../mathGenerator');
          refreshIngestedTemplates();
        }
      })
      .catch((err) => logger.error('[Telemetry-Ingestion] Ingestion pipeline failed:', err.message));
  }

  res.json({ success: true });
});

// Log calculator usage telemetry and check for easter egg
router.post('/api/math/calculator/log', authenticateToken, (req, res) => {
  const { category, level, question, template_type, game_mode, inputExpression } = req.body;
  const userId = req.user.id;
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `
    INSERT INTO user_calculator_analytics
    (user_id, category, level, question, template_type, game_mode, used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    [userId, category, level, question, template_type, game_mode, now],
    (err) => {
      if (err) {
        logger.error('Failed to log calculator analytics:', err.message);
      }

      if (inputExpression === '67') {
        db.run('UPDATE users SET calculator_sixseven_count = 1 WHERE id = ?', [userId], () => {
          updateAchievements(userId, () => {
            res.json({ success: true, easterEggUnlocked: true });
          });
        });
      } else {
        res.json({ success: true });
      }
    }
  );
});

// Daily-quest progress for the recap: every quest's current/target/claimed + how many are ready
// to claim. Best-effort (an empty snapshot never fails the response).
function questSnapshot(userId) {
  return new Promise((resolve) => {
    db.get('SELECT * FROM user_quests WHERE user_id = ?', [userId], (err, q) => {
      if (err || !q) return resolve({ progress: [], claimable: 0 });
      const progress = QUEST_DEFS.map((d) => ({
        type: d.type,
        name: d.name,
        current: Math.min(d.target, q[d.progressCol] || 0),
        target: d.target,
        claimed: q[d.claimCol] === 1,
      }));
      resolve({ progress, claimable: progress.filter((p) => p.current >= p.target && !p.claimed).length });
    });
  });
}

// Per-user cooldown guarding against rapid-fire completion replays.
const completionCooldowns = new Map();

// Normalized strand category → its lifetime-correct column in user_mastery (fixed allowlist, so
// interpolating the column name into SQL is safe). "mixed" sets credit no single strand.
const MASTERY_COL_BY_CAT = {
  arithmetic: 'arithmetic_correct',
  mental: 'mental_correct',
  algebra: 'algebra_correct',
  calculus: 'calculus_correct',
  combinatorics: 'combinatorics_correct',
  'number theory': 'number_theory_correct',
  number_theory: 'number_theory_correct',
  // Curriculum strands (migration v27 columns) — without these, strand solves were silently
  // dropped from mastery tracking and their achievement chains.
  geometry: 'geometry_correct',
  integers: 'integers_correct',
  decimals: 'decimals_correct',
  fractions: 'fractions_correct',
  'number sense': 'number_sense_correct',
  number_sense: 'number_sense_correct',
  statistics: 'statistics_correct',
  expressions: 'expressions_correct',
  powers: 'powers_correct',
  graphing: 'graphing_correct',
  inequalities: 'inequalities_correct',
  functions: 'functions_correct',
  sequences: 'sequences_correct',
  equations: 'equations_correct',
  rates: 'rates_correct',
  factors: 'factors_correct',
};

// Finalize a solo session. Server-authoritative (lib/soloRewards.js): the client reports only what
// happened (mode, level, solves, errors, bonuses) and the server decides what it is worth.
//   - The completion must consume a serve ticket for the same mode (+ level in level mode) issued
//     when the problems were served; without one nothing is granted (rewardWithheld).
//   - Solves are capped at the problems that ticket served (and a zero-solve session is zero —
//     the old `parseInt(x) || 5` turned 0 into 5).
//   - A level above the learner's unlocked level can't be "completed" (levelLocked): no
//     progression jump, rewards at their own level.
//   - Coins/league points taper after the day's first sessions (faucetFactor); XP never does.
// The grant, the ticket and the counters commit in ONE transaction; everything else (mastery,
// streak, achievements) fans out after the commit.
router.post('/api/math/complete', authenticateToken, idempotency, async (req, res) => {
  const userId = req.user.id;
  const nowMs = Date.now();
  if (completionCooldowns.has(userId)) {
    const lastTime = completionCooldowns.get(userId);
    if (nowMs - lastTime < 5000) {
      securityLog(userId, 'COMPLETION_REPLAY_ATTEMPT', req.ip, `User tried to submit level completion too quickly: ${nowMs - lastTime}ms since last completion.`);
      return res.status(429).json({ error: 'Too many requests. Please wait before submitting another level.' });
    }
  }
  completionCooldowns.set(userId, nowMs);

  const body = req.body || {};
  const mode = normalizeMode(body.gameMode);
  const rules = SOLO_MODES[mode];
  const category = body.category || 'arithmetic';
  const parsedLevel = mode === 'level' ? Math.max(1, parseInt(body.level, 10) || 1) : null;
  const errorsCount = Math.min(Math.max(parseInt(body.errorsCount, 10) || 0, 0), 1000);
  const claimedSolved = Math.min(Math.max(parseInt(body.solvedCount, 10) || 0, 0), rules.maxProblems);
  const totalTime = parseInt(body.totalTime, 10);

  // Progress earned after local midnight must land on today's quest row.
  await ensureDailyReset(userId);

  let r;
  try {
    r = await withTransaction(async (tx) => {
      const user = await tx.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) throw httpError(404, 'User not found');

      const ticket = await consumeSoloTicket(tx, userId, mode, parsedLevel);
      if (!ticket) return { withheld: true, user };

      const solved = Math.min(claimedSolved, ticket.servedCount);
      const levelLocked = mode === 'level' && parsedLevel > user.level;
      const rewardLevel = mode === 'level' ? Math.min(parsedLevel, user.level) : null;

      const q = await tx.get('SELECT solo_sessions_today, daily_puzzle_today FROM user_quests WHERE user_id = ?', [userId]);
      const factor = faucetFactor(((q && q.solo_sessions_today) || 0) + 1);

      const base = baseReward({
        mode,
        level: rewardLevel,
        solvedCount: solved,
        errorsCount,
        servedCount: ticket.servedCount,
        speedBonus: body.speedBonus,
        comboBonus: body.comboBonus,
      });

      // Modifiers: streak ×1.5 XP (3+ day streak), 10% critical ×2 coins, XP booster ×2 (only spent
      // when there is XP to boost), then the coin taper.
      let xpGained = base.xp;
      const streakBonusActive = xpGained > 0 && (user.streak || 0) >= 3;
      if (streakBonusActive) xpGained = Math.round(xpGained * 1.5);
      const criticalBonusActive = base.coins > 0 && Math.random() < 0.1;
      let coinsGained = criticalBonusActive ? base.coins * 2 : base.coins;
      let boosterUses = user.xp_booster_uses_left || 0;
      const xpBoosterActive = xpGained > 0 && boosterUses > 0;
      if (xpBoosterActive) {
        xpGained = Math.round(xpGained * 2);
        boosterUses -= 1;
      }
      coinsGained = Math.round(coinsGained * factor);
      const leaguePoints = Math.round(xpGained * factor);

      const progressed = applyXp(user.xp, user.level, xpGained);
      let newLevel = progressed.level;
      // Clearing the frontier level (with at least one solve) unlocks the next one.
      if (mode === 'level' && !levelLocked && solved > 0 && parsedLevel >= user.level) {
        newLevel = Math.max(newLevel, parsedLevel + 1);
      }

      const perfect = base.perfect;
      const speedDemon =
        mode === 'level' && !levelLocked && perfect && rewardLevel >= 30 && Number.isFinite(totalTime) && totalTime >= 0 && totalTime < 10;

      await tx.run(
        `UPDATE users SET
           xp = ?, level = ?, coins = coins + ?, league_points = league_points + ?,
           solved_count = solved_count + ?, xp_booster_uses_left = ?,
           perfect_levels_count = perfect_levels_count + ?, perfect_exercises_count = perfect_exercises_count + ?,
           archive_solved = archive_solved + ?, speed_demon_count = CASE WHEN ? THEN 1 ELSE speed_demon_count END
         WHERE id = ?`,
        [
          progressed.xp,
          newLevel,
          coinsGained,
          leaguePoints,
          solved,
          boosterUses,
          perfect ? 1 : 0,
          perfect ? solved : 0,
          mode === 'archive_puzzle' ? solved : 0,
          speedDemon ? 1 : 0,
          userId,
        ]
      );
      await tx.run('UPDATE user_quests SET solved_today = solved_today + ?, solo_sessions_today = solo_sessions_today + 1 WHERE user_id = ?', [
        solved,
        userId,
      ]);

      // Per-level stars (the map's replay goal): only for an unlocked level-map level; the best
      // result is kept.
      let stars = 0;
      let bestStars = 0;
      let newBest = false;
      if (mode === 'level' && !levelLocked) {
        stars = levelStars({ solvedCount: solved, servedCount: ticket.servedCount, errorsCount });
        const prev = await tx.get('SELECT stars FROM user_level_stars WHERE user_id = ? AND level = ?', [userId, parsedLevel]);
        const prevStars = prev ? prev.stars : 0;
        newBest = stars > prevStars;
        bestStars = Math.max(stars, prevStars);
        if (newBest) {
          await tx.run(
            `INSERT INTO user_level_stars (user_id, level, stars, best_at) VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, level) DO UPDATE SET stars = excluded.stars, best_at = excluded.best_at`,
            [userId, parsedLevel, stars, Math.floor(Date.now() / 1000)]
          );
        }
      }

      // The daily puzzle's reward was paid (once, server-graded) by its submit endpoint; echo it for
      // the recap without granting it again.
      const echo = base.paidElsewhere && solved > 0 && q && q.daily_puzzle_today >= 1 ? rules.echo : null;

      return {
        withheld: false,
        user,
        solved,
        stars,
        bestStars,
        newBest,
        servedCount: ticket.servedCount,
        rewardLevel,
        speedBonus: base.speedBonus,
        comboBonus: base.comboBonus,
        levelLocked,
        factor,
        xpGained,
        coinsGained,
        echo,
        streakBonusActive,
        criticalBonusActive,
        xpBoosterActive,
        boosterUses,
        newXp: progressed.xp,
        newLevel,
        newCoins: (user.coins || 0) + coinsGained,
      };
    });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save the session.' });
  }

  const currentRank = r.user.rank || 'Unranked (Placement: 0/5)';

  if (r.withheld) {
    securityLog(userId, 'COMPLETION_WITHOUT_SERVE', req.ip, `Solo completion (${mode}) with no matching serve ticket — reward withheld.`);
    return res.json({
      xp: r.user.xp,
      level: r.user.level,
      coins: r.user.coins,
      rank: currentRank,
      levelUp: false,
      streakBonusActive: false,
      xpGained: 0,
      coinsGained: 0,
      criticalBonusActive: false,
      xpBoosterActive: false,
      xpBoosterUsesLeft: r.user.xp_booster_uses_left || 0,
      masteryMilestone: null,
      rewardWithheld: true,
    });
  }

  recordCoins('solo_session', r.coinsGained);
  if (r.levelLocked) {
    securityLog(userId, 'LOCKED_LEVEL_COMPLETION', req.ip, `Claimed completion of level ${parsedLevel} while unlocked up to ${r.user.level}.`);
  }

  const now = Math.floor(Date.now() / 1000);
  // Activation marker (ultra review #23): stamp activated_at the first time the learner clears
  // the bar (N solves) inside the signup window. Conditional UPDATE so it fires at most once.
  db.run(
    'UPDATE users SET activated_at = ? WHERE id = ? AND activated_at = 0 AND created_at > 0 AND solved_count >= ? AND (? - created_at) <= ?',
    [now, userId, ACTIVATION_THRESHOLD, now, ACTIVATION_WINDOW_DAYS * 86400]
  );

  if (r.newLevel > r.user.level) {
    notify(userId, {
      category: 'levelup',
      title: 'Level Up! 🌟',
      message: `Congratulations! You reached Level ${r.newLevel}. Keep climbing!`,
      type: 'levelup',
    });
  }

  const solved = r.solved;

  // Solo + duels move ONE rating per domain (docs/specs/Spec-RatingUnification.md). A level session
  // is rating evidence at its (lock-checked) level; every input here is server-anchored by the
  // ticket. Other solo modes are practice and stay rating-neutral. Best-effort: a rating hiccup
  // never fails the reward.
  const rating =
    mode === 'level'
      ? await new Promise((resolve) =>
          applySoloSessionToRatings(
            userId,
            {
              category,
              level: r.rewardLevel,
              solvedCount: solved,
              totalProblems: r.servedCount,
              errorsCount,
              speedBonus: r.speedBonus,
              comboBonus: r.comboBonus,
              usedCalculator: !!body.usedCalculator,
              gameMode: 'level',
            },
            (err, result) => {
              if (err) logger.error('[Complete-Rating]', err.message);
              resolve(err ? null : result);
            }
          )
        )
      : null;

  updateCommitmentAndBurnout(userId, solved, (commitment) => {
    // Set when this session's solves push the category's lifetime-correct count across a mastery
    // milestone — the client turns it into the signature "mastery-up" moment (ultra-review #20).
    let masteryMilestone = null;
    const normCat = String(category).toLowerCase();
    const masteryCol = solved > 0 ? MASTERY_COL_BY_CAT[normCat] || null : null;

    const finalizeResponse = () => {
      // Fire-and-forget: update competitive skill profile for the concepts practised this level.
      if (mode === 'level' && solved > 0) {
        (async () => {
          try {
            const conceptIds = Orchestrator.getCategoryConceptIds(category, parsedLevel);
            const accuracy = Math.max(0, (solved - errorsCount) / solved);
            const outcome = accuracy >= 0.8 ? 1 : accuracy >= 0.5 ? 0.5 : 0;
            for (const cId of conceptIds.slice(0, 2)) {
              await CompetitiveEngine.updateCompetitiveRating(db, userId, cId, outcome);
            }
          } catch (e) {
            logger.error('[Complete-CompetitiveEngine]', e.message);
          }
        })();
      }

      grantRankRewards(userId, currentRank, () => {
        updateAchievements(userId, async () => {
          const quests = await questSnapshot(userId);
          res.json({
            xp: r.newXp,
            level: r.newLevel,
            coins: r.newCoins,
            rank: currentRank,
            levelUp: r.newLevel > r.user.level,
            streakBonusActive: r.streakBonusActive,
            xpGained: r.echo ? r.echo.xp : r.xpGained,
            coinsGained: r.echo ? r.echo.coins : r.coinsGained,
            criticalBonusActive: r.criticalBonusActive,
            xpBoosterActive: r.xpBoosterActive,
            xpBoosterUsesLeft: r.boosterUses,
            masteryMilestone,
            rewardWithheld: false,
            levelLocked: r.levelLocked,
            faucetFactor: r.factor,
            // The session's rating movement (level mode): domain + global display rating, delta and
            // the plain-language explanation — the post-session "why did my rating change" surface.
            rating,
            // The recap's payoff moments: this level's stars (+ best + whether it's a new best),
            // the streak (and whether THIS session is what kept it alive today), and daily-quest
            // progress so the next goal is one glance away.
            stars: r.stars,
            bestStars: r.bestStars,
            newBest: r.newBest,
            streak: {
              days: commitment && commitment.newStreak != null ? commitment.newStreak : r.user.streak || 0,
              extendedToday: !!(commitment && commitment.streakCredited),
              restored: !!(commitment && commitment.streakRestored),
            },
            questProgress: quests.progress,
            claimableQuests: quests.claimable,
          });
        });
      });
    };

    if (!masteryCol) return finalizeResponse();
    // Read the pre-solve count so we can detect a milestone *crossing* (not just a threshold being
    // met repeatedly).
    db.get(`SELECT ${masteryCol} AS c FROM user_mastery WHERE user_id = ?`, [userId], (selErr, mrow) => {
      const oldCount = (mrow && mrow.c) || 0;
      const newCount = oldCount + solved;
      for (let i = MASTERY_MILESTONES.length - 1; i >= 0; i--) {
        const m = MASTERY_MILESTONES[i];
        if (oldCount < m.count && newCount >= m.count) {
          masteryMilestone = { category: normCat, label: m.label, count: m.count };
          break;
        }
      }
      // Crossing "Mastered" (100) earns the strand's Mastery Frame — granted, never sold.
      const frameId = MASTERY_FRAME_BY_CAT[normCat];
      if (frameId && oldCount < MASTERY_FRAME_THRESHOLD && newCount >= MASTERY_FRAME_THRESHOLD) {
        db.run('INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)', [userId, frameId]);
      }
      db.run(`UPDATE user_mastery SET ${masteryCol} = ${masteryCol} + ? WHERE user_id = ?`, [solved, userId], () => finalizeResponse());
    });
  });
});

// ── Checkpoint exam ───────────────────────────────────────────────────────────────────────────
// A mixed-strand cumulative test for exam readiness (ultra review #16 / edu #46). It draws one
// problem from each of several strands the learner has practiced, cycling strands so concepts are
// INTERLEAVED (proven better for retention than blocked practice). Client-graded like other learn
// modes; finishing grants a flat reward via /complete with category "mixed" (no single strand gets
// mastery credit). Ordered by strand prominence so the foundational core leads.
const EXAM_STRANDS = [
  { col: 'arithmetic_correct', category: 'arithmetic' },
  { col: 'fractions_correct', category: 'fractions' },
  { col: 'decimals_correct', category: 'decimals' },
  { col: 'integers_correct', category: 'integers' },
  { col: 'algebra_correct', category: 'algebra' },
  { col: 'geometry_correct', category: 'geometry' },
  { col: 'number_theory_correct', category: 'number_theory' },
  { col: 'statistics_correct', category: 'statistics' },
];

router.get('/api/math/checkpoint-exam', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const count = Math.min(12, Math.max(5, parseInt(req.query.count, 10) || 8));

  db.get('SELECT level FROM users WHERE id = ?', [userId], (uErr, user) => {
    if (uErr) return res.status(500).json({ error: uErr.message });
    const level = user ? user.level || 1 : 1;

    db.get('SELECT * FROM user_mastery WHERE user_id = ?', [userId], (mErr, mastery) => {
      if (mErr) return res.status(500).json({ error: mErr.message });
      // Test what they've actually studied; if that's too thin (0–1 strands), fall back to the
      // foundational core so the exam still feels cumulative.
      let chosen = EXAM_STRANDS.filter((s) => mastery && (mastery[s.col] || 0) > 0);
      if (chosen.length < 2) chosen = EXAM_STRANDS.slice(0, 5);

      const problems = [];
      let i = 0;
      const guard = count * 5;
      while (problems.length < count && i < guard) {
        const strand = chosen[i % chosen.length];
        const lvl = normalizeLevelForGenerator(strand.category, level);
        const seed = (Date.now() % 100000) + i * 13 + problems.length * 7;
        const p = generateProblem(strand.category, lvl, seed, 1000);
        if (p && p.question && Array.isArray(p.options) && p.options.length) {
          // Keep the generator's active-learning surface (it was being stripped): the hint
          // ladder guides mid-exam thinking; self-explain / worked example fire only AFTER
          // an answer, so they teach without compromising the cumulative test.
          const slim = {
            question: p.question,
            correctAnswer: p.correctAnswer,
            options: p.options,
            explanation: p.explanation || '',
            category: strand.category,
            level: lvl,
            templateType: p.templateType,
            socraticJson: p.socraticJson || '',
            selfExplainJson: p.selfExplainJson || '',
            workedExampleJson: p.workedExampleJson || '',
          };
          problems.push(attachTipToProblem(slim, false));
        }
        i++;
      }

      issueSoloTicket(userId, { mode: 'checkpoint_exam', servedCount: problems.length }).then(() =>
        res.json({ count: problems.length, level, strands: chosen.map((s) => s.category), problems })
      );
    });
  });
});

// ── Word problems (ultra review #9 / edu#5) ───────────────────────────────────────────────────
// Applied, real-world contexts (shopping, change, discounts, rates, tips) — the catalog was
// entirely symbolic. The hard part is choosing the operation, so distractors are operation-choice
// slips. Difficulty (which contexts appear) scales with the learner's level; problems are MCQ and
// graded by the existing gameplay just like the checkpoint exam.
router.get('/api/math/word-problems', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const count = Math.min(10, Math.max(3, parseInt(req.query.count, 10) || 5));
  db.get('SELECT level FROM users WHERE id = ?', [userId], (uErr, user) => {
    if (uErr) return res.status(500).json({ error: uErr.message });
    const level = user ? user.level || 1 : 1;
    const problems = buildWordProblemSet(count, level).map(enrichAppliedProblem);
    issueSoloTicket(userId, { mode: 'word_problems', servedCount: problems.length }).then(() =>
      res.json({ count: problems.length, level, problems })
    );
  });
});

// ── Estimation / number sense (ultra review edu#16) ───────────────────────────────────────────
// "About how big should this be?" — the foundational skill the symbolic catalog never trained.
// MCQ, graded by the existing gameplay; difficulty (which estimation skills appear) scales with
// the learner's level.
router.get('/api/math/estimation', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const count = Math.min(10, Math.max(3, parseInt(req.query.count, 10) || 5));
  db.get('SELECT level FROM users WHERE id = ?', [userId], (uErr, user) => {
    if (uErr) return res.status(500).json({ error: uErr.message });
    const level = user ? user.level || 1 : 1;
    const problems = buildEstimationSet(count, level).map(enrichAppliedProblem);
    issueSoloTicket(userId, { mode: 'estimation', servedCount: problems.length }).then(() =>
      res.json({ count: problems.length, level, problems })
    );
  });
});

// ── Error detection / "Spot the Mistake" (audit gap #6 — exercise-type variety) ─────────────────
// A new exercise TYPE, not just new content: the learner is shown a full worked solution with ONE
// corrupted line and must find the flaw. Detecting errors is a distinct, high-transfer skill. Reuses
// the catalog-wide worked examples + arithmetic; rendered through the existing MCQ gameplay.
router.get('/api/math/error-detection', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const count = Math.min(10, Math.max(3, parseInt(req.query.count, 10) || 5));
  db.get('SELECT level FROM users WHERE id = ?', [userId], (uErr, user) => {
    if (uErr) return res.status(500).json({ error: uErr.message });
    const level = user ? user.level || 1 : 1;
    const problems = buildErrorDetectionSet(count, level).map(enrichAppliedProblem);
    issueSoloTicket(userId, { mode: 'error_detection', servedCount: problems.length }).then(() =>
      res.json({ count: problems.length, level, problems })
    );
  });
});

// ── Content-quality reports ───────────────────────────────────────────────────────────────────
// The catalog is generated and only ever checked at generation time (ultra review #17): this is the
// human-in-the-loop signal it was missing. A learner flags a specific exercise; we store the problem
// text + context for a later expert audit. Rate-limited so it can't be used to spam-write the table.
const REPORT_REASONS = new Set(['wrong_answer', 'typo', 'confusing', 'renders_wrong', 'too_easy', 'too_hard', 'other']);

router.post('/api/math/report', authenticateToken, rateLimiter(20, 15 * 60 * 1000), (req, res) => {
  const { question, correctAnswer, category, level, gameMode, reason, note } = req.body || {};
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'A question is required to report a problem.' });
  }
  if (!REPORT_REASONS.has(reason)) {
    return res.status(400).json({ error: 'A valid reason is required.' });
  }
  const lvl = Number.isInteger(level) ? level : null;
  db.run(
    `INSERT INTO problem_reports (user_id, question, correct_answer, category, level, game_mode, reason, note, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [
      req.user.id,
      String(question).slice(0, 2000),
      correctAnswer == null ? null : String(correctAnswer).slice(0, 500),
      category ? String(category).slice(0, 60) : null,
      lvl,
      gameMode ? String(gameMode).slice(0, 40) : null,
      reason,
      note ? String(note).slice(0, 500) : null,
      Math.floor(Date.now() / 1000),
    ],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      securityLog(req.user.id, 'problem_reported', req.ip, `Reported a ${category || '?'} problem: ${reason}.`);
      res.json({ success: true });
    }
  );
});

// Admin triage queue: open reports first, with a per-reason tally for spotting systemic generator
// bugs (e.g. a whole category reported "wrong_answer").
router.get('/api/math/reports', authenticateToken, requireAdmin, (req, res) => {
  db.all(
    `SELECT pr.id, pr.user_id, u.username, pr.question, pr.correct_answer, pr.category, pr.level,
            pr.game_mode, pr.reason, pr.note, pr.status, pr.created_at
     FROM problem_reports pr LEFT JOIN users u ON u.id = pr.user_id
     ORDER BY CASE pr.status WHEN 'open' THEN 0 ELSE 1 END, pr.created_at DESC
     LIMIT 500`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(
        "SELECT reason, COUNT(*) AS count FROM problem_reports WHERE status = 'open' GROUP BY reason",
        [],
        (e2, tally) => {
          if (e2) return res.status(500).json({ error: e2.message });
          res.json({ reports: rows || [], openByReason: tally || [] });
        }
      );
    }
  );
});

// Resolve (or dismiss) a report once it's been triaged.
router.post('/api/math/reports/:id/resolve', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = req.body && req.body.status === 'dismissed' ? 'dismissed' : 'resolved';
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid report id.' });
  db.run('UPDATE problem_reports SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Report not found.' });
    res.json({ success: true, status });
  });
});

module.exports = router;
