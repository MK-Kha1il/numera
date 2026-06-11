// Core learn/play loop: serve orchestrated problems, ingest cognitive + calculator
// telemetry, and finalize a level (APRA reward algorithm) — the last being idempotent and
// the busiest fan-out in the app (rewards, mastery, quests, commitment, achievements,
// competitive rating).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { idempotency } = require('../idempotency');
const { securityLog } = require('../middleware/security');
const { generateProblem, getLessonAndExamples } = require('../mathGenerator');
const { runIngestionPipeline } = require('../mathEngine/knowledgeIngestion');
const { normalizeLevelForGenerator } = require('../lib/progression');
const { notify } = require('../services/notificationService');
const { attachTipToProblem } = require('../services/tipService');
const { updateAchievements } = require('../services/achievementService');
const { updateCommitmentAndBurnout } = require('../services/commitmentService');
const { grantRankRewards } = require('../services/rankRewardService');

const LearnerModel = require('../mathEngine/learnerModel');
const RetentionEngine = require('../mathEngine/retentionEngine');
const TeachingEngine = require('../mathEngine/teachingEngine');
const AnalyticsEngine = require('../mathEngine/analyticsEngine');
const CompetitiveEngine = require('../mathEngine/competitiveEngine');
const Orchestrator = require('../mathEngine/problemOrchestrator');
const ExerciseMemory = require('../mathEngine/exerciseMemory');
const LessonSafety = require('../mathEngine/lessonSafety');
const { applyRemediation } = require('../mathEngine/remediationEngine');
const logger = require('../logger');

const router = express.Router();

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
  const { concept, isCorrect, speed, hesitation, retries, templateType } = req.body;
  if (!concept) {
    return res.status(400).json({ error: 'Missing concept parameter.' });
  }

  const userId = req.user.id;
  const isCorrectNumeric = isCorrect ? 1 : 0;
  const speedVal = parseFloat(speed) || 0;
  const hesitationVal = parseFloat(hesitation) || 0;
  const retriesVal = parseInt(retries, 10) || 0;
  const now = Math.floor(Date.now() / 1000);

  // 1. Update User Concept Analytics (moving averages)
  db.get('SELECT * FROM user_concept_analytics WHERE user_id = ? AND concept = ?', [userId, concept], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });

    if (row) {
      const newSuccessRate = row.success_rate * 0.7 + isCorrectNumeric * 0.3;
      const newSpeed = row.average_speed * 0.7 + speedVal * 0.3;
      const newHesitation = row.hesitation_index * 0.7 + hesitationVal * 0.3;
      const newStreak = isCorrectNumeric ? row.streak + 1 : 0;

      db.run(
        `UPDATE user_concept_analytics
           SET success_rate = ?, average_speed = ?, hesitation_index = ?, streak = ?, last_tested = ?
           WHERE user_id = ? AND concept = ?`,
        [newSuccessRate, newSpeed, newHesitation, newStreak, now, userId, concept]
      );
    } else {
      db.run(
        `INSERT INTO user_concept_analytics (user_id, concept, success_rate, average_speed, hesitation_index, streak, last_tested)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, concept, isCorrectNumeric, speedVal, hesitationVal, isCorrectNumeric ? 1 : 0, now]
      );
    }
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

  // 4. Feed the Intelligence Engine — fire-and-forget, never blocks the response
  (async () => {
    try {
      // Map old concept/template string → knowledge-graph conceptId
      const conceptId = Orchestrator.conceptFromType(concept) || concept;
      const retentionScore = await RetentionEngine.getRetentionForProfile(db, userId, conceptId);

      // Speed from legacy API arrives in seconds — convert to ms
      const responseMs = speedVal > 0 ? speedVal * 1000 : 0;
      const wasRetry = retriesVal > 0;
      const inferredHint = hesitationVal > 2.0;

      // Retention record (rating: 4=fast correct, 3=correct, 1=wrong)
      const rating = isCorrectNumeric ? (speedVal > 0 && speedVal < 8 ? 4 : 3) : 1;
      await RetentionEngine.recordReview(db, userId, conceptId, rating);

      // Learner profile update
      await LearnerModel.updateProfile(db, userId, conceptId, {
        correct: !!isCorrectNumeric,
        responseMs,
        usedHint: inferredHint,
        usedCalculator: false,
        wasRetry,
        retentionScore,
      });

      // Lesson analytics
      if (templateType) {
        await AnalyticsEngine.recordLessonEvent(db, templateType, {
          correct: !!isCorrectNumeric,
          timeTaken: responseMs,
          usedHint: inferredHint,
          abandoned: false,
        });
      }

      // Teaching style signals
      const signals = TeachingEngine.inferSignalFromResult({ correct: !!isCorrectNumeric, responseMs, usedHint: inferredHint, wasRetry }, conceptId);
      for (const signal of signals) {
        await TeachingEngine.recordStyleSignal(db, userId, signal.style, signal.outcome);
      }
    } catch (e) {
      logger.error('[Telemetry-Engine]', e.message);
    }
  })();

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

// Per-user cooldown guarding against rapid-fire completion replays.
const completionCooldowns = new Map();

// Update user stats after a successful game session
router.post('/api/math/complete', authenticateToken, idempotency, (req, res) => {
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

  const { xpGained, coinsGained, category, level, errorsCount, gameMode, totalTime } = req.body;
  let { solvedCount, speedBonus, comboBonus } = req.body;

  // Clamp incoming metrics bounds to prevent client spoofing
  solvedCount = Math.min(Math.max(parseInt(solvedCount, 10) || 5, 0), 5);
  speedBonus = Math.min(Math.max(parseInt(speedBonus, 10) || 0, 0), 20);
  comboBonus = Math.min(Math.max(parseInt(comboBonus, 10) || 0, 0), 15);

  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'User not found' });

    // APRA Algorithm calculations
    let baseXP = parseInt(xpGained, 10) || 20;
    let baseCoins = parseInt(coinsGained, 10) || 5;

    // Clamp to prevent user manipulation when level is absent
    if (baseXP < 0 || baseXP > 100) baseXP = 20;
    if (baseCoins < 0 || baseCoins > 50) baseCoins = 5;

    const parsedLevel = parseInt(level, 10);
    if (!isNaN(parsedLevel) && parsedLevel > 0) {
      // Logarithmic difficulty scaling
      baseXP = 15 + Math.round(5 * Math.log2(parsedLevel)) + speedBonus + comboBonus;
      baseCoins = 5 + Math.round(2 * Math.log2(parsedLevel)) + Math.round(speedBonus / 2) + Math.round(comboBonus / 3);

      // Milestone level double multiplier
      if (parsedLevel % 10 === 0) {
        baseXP = Math.round(baseXP * 2.0);
        baseCoins = Math.round(baseCoins * 2.0);
      }
    }

    // Accuracy Bonus (no errors/wrong answers)
    if (errorsCount !== undefined && errorsCount !== null && parseInt(errorsCount, 10) === 0) {
      baseXP = Math.round(baseXP * 1.2);
      baseCoins = Math.round(baseCoins * 1.2);
    }

    // Streak Multiplier: 1.5x XP if streak >= 3
    let streakBonusActive = false;
    if (user.streak >= 3) {
      baseXP = Math.round(baseXP * 1.5);
      streakBonusActive = true;
    }

    // Critical Bonus: 10% chance to double coins
    let criticalBonusActive = false;
    if (Math.random() < 0.1) {
      baseCoins = baseCoins * 2;
      criticalBonusActive = true;
    }

    let finalXpGained = baseXP;
    let xpBoosterActive = false;
    let newXpBoosterUses = user.xp_booster_uses_left || 0;
    if (newXpBoosterUses > 0) {
      finalXpGained = Math.round(baseXP * 2);
      xpBoosterActive = true;
      newXpBoosterUses -= 1;
    }

    const finalCoinsGained = baseCoins;

    let newXp = user.xp + finalXpGained;
    let newLevel = user.level;
    // XP equation for leveling up: level * 100
    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel += 1;
    }

    // Level progression node unlocking
    if (level !== undefined && level !== null) {
      if (!isNaN(parsedLevel) && parsedLevel >= user.level) {
        newLevel = Math.max(newLevel, parsedLevel + 1);
        if (newXp >= newLevel * 100) {
          newXp = newXp % (newLevel * 100);
        }
      }
    }

    const currentRank = user.rank || 'Unranked (Placement: 0/5)';
    const newCoins = user.coins + finalCoinsGained;
    const newSolvedCount = (user.solved_count || 0) + solvedCount;
    const newLeaguePoints = (user.league_points || 0) + finalXpGained;
    const now = Math.floor(Date.now() / 1000);

    let addPerfectLevels = 0;
    let addPerfectExercises = 0;
    if (errorsCount !== undefined && errorsCount !== null && parseInt(errorsCount, 10) === 0) {
      addPerfectLevels = 1;
      addPerfectExercises = solvedCount;
    }

    let addArchiveSolved = 0;
    let addSpringSolved = 0;
    let addSummerSolved = 0;

    if (gameMode === 'archive') {
      addArchiveSolved = solvedCount;
    } else if (gameMode === 'seasonal_spring') {
      addSpringSolved = solvedCount;
    } else if (gameMode === 'seasonal_summer') {
      addSummerSolved = solvedCount;
    }

    let setSpeedDemon = user.speed_demon_count || 0;
    if (totalTime !== undefined && totalTime !== null && parseInt(totalTime, 10) < 10 && parsedLevel >= 30 && errorsCount === 0) {
      setSpeedDemon = 1;
    }

    db.run(
      `UPDATE users SET
         xp = ?,
         level = ?,
         coins = ?,
         rank = ?,
         solved_count = ?,
         league_points = ?,
         xp_booster_uses_left = ?,
         perfect_levels_count = perfect_levels_count + ?,
         perfect_exercises_count = perfect_exercises_count + ?,
         archive_solved = archive_solved + ?,
         seasonal_spring_count = seasonal_spring_count + ?,
         seasonal_summer_count = seasonal_summer_count + ?,
         speed_demon_count = ?
       WHERE id = ?`,
      [
        newXp,
        newLevel,
        newCoins,
        currentRank,
        newSolvedCount,
        newLeaguePoints,
        newXpBoosterUses,
        addPerfectLevels,
        addPerfectExercises,
        addArchiveSolved,
        addSpringSolved,
        addSummerSolved,
        setSpeedDemon,
        req.user.id,
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        if (newLevel > user.level) {
          notify(req.user.id, {
            category: 'levelup',
            title: 'Level Up! 🌟',
            message: `Congratulations! You reached Level ${newLevel}. Keep climbing!`,
            type: 'levelup',
          });
        }

        updateCommitmentAndBurnout(req.user.id, solvedCount, () => {
          // Update user_quests and user_mastery
          db.run('UPDATE user_quests SET solved_today = solved_today + ? WHERE user_id = ?', [solvedCount, req.user.id], () => {
            let masteryCol = null;
            const normCat = (category || 'arithmetic').toLowerCase();
            if (normCat === 'arithmetic') masteryCol = 'arithmetic_correct';
            else if (normCat === 'mental') masteryCol = 'mental_correct';
            else if (normCat === 'algebra') masteryCol = 'algebra_correct';
            else if (normCat === 'calculus') masteryCol = 'calculus_correct';
            else if (normCat === 'combinatorics') masteryCol = 'combinatorics_correct';
            else if (normCat === 'number theory' || normCat === 'number_theory') masteryCol = 'number_theory_correct';
            // Curriculum strands (migration v27 columns) — without these, strand solves
            // were silently dropped from mastery tracking and their achievement chains.
            else if (normCat === 'geometry') masteryCol = 'geometry_correct';
            else if (normCat === 'integers') masteryCol = 'integers_correct';
            else if (normCat === 'decimals') masteryCol = 'decimals_correct';
            else if (normCat === 'fractions') masteryCol = 'fractions_correct';
            else if (normCat === 'number sense' || normCat === 'number_sense') masteryCol = 'number_sense_correct';
            else if (normCat === 'statistics') masteryCol = 'statistics_correct';
            else if (normCat === 'expressions') masteryCol = 'expressions_correct';
            else if (normCat === 'powers') masteryCol = 'powers_correct';
            else if (normCat === 'graphing') masteryCol = 'graphing_correct';
            else if (normCat === 'inequalities') masteryCol = 'inequalities_correct';

            const finalizeResponse = () => {
              // Fire-and-forget: update competitive skill profile for the concepts practised this level
              (async () => {
                try {
                  const conceptIds = Orchestrator.getCategoryConceptIds(category, parsedLevel);
                  const accuracy = solvedCount > 0 && errorsCount !== undefined ? Math.max(0, (solvedCount - parseInt(errorsCount, 10)) / solvedCount) : 0.5;
                  const outcome = accuracy >= 0.8 ? 1 : accuracy >= 0.5 ? 0.5 : 0;
                  for (const cId of conceptIds.slice(0, 2)) {
                    await CompetitiveEngine.updateCompetitiveRating(db, req.user.id, cId, outcome);
                  }
                } catch (e) {
                  logger.error('[Complete-CompetitiveEngine]', e.message);
                }
              })();

              grantRankRewards(req.user.id, currentRank, () => {
                updateAchievements(req.user.id, () => {
                  res.json({
                    xp: newXp,
                    level: newLevel,
                    coins: newCoins,
                    rank: currentRank,
                    levelUp: newLevel > user.level,
                    streakBonusActive,
                    xpGained: finalXpGained,
                    coinsGained: finalCoinsGained,
                    criticalBonusActive,
                    xpBoosterActive,
                    xpBoosterUsesLeft: newXpBoosterUses,
                  });
                });
              });
            };

            if (masteryCol) {
              db.run(`UPDATE user_mastery SET ${masteryCol} = ${masteryCol} + ? WHERE user_id = ?`, [solvedCount, req.user.id], () => {
                finalizeResponse();
              });
            } else {
              finalizeResponse();
            }
          });
        });
      }
    );
  });
});

module.exports = router;
