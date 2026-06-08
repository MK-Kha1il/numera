// Mathematical Learning Intelligence Engine API: records answer events and exposes the
// learner model, misconceptions, spaced-retention, analytics recommendations, and the
// skill-based competitive profile. Thin HTTP layer over the mathEngine/* modules.
const express = require('express');
const { db } = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { runSelfAudit } = require('../mathEngine/contentAudit');

const LearnerModel = require('../mathEngine/learnerModel');
const MasteryEngine = require('../mathEngine/masteryEngine');
const MisconceptionEngine = require('../mathEngine/misconceptionEngine');
const RetentionEngine = require('../mathEngine/retentionEngine');
const TeachingEngine = require('../mathEngine/teachingEngine');
const AnalyticsEngine = require('../mathEngine/analyticsEngine');
const CompetitiveEngine = require('../mathEngine/competitiveEngine');
const Orchestrator = require('../mathEngine/problemOrchestrator');
const KnowledgeGraph = require('../mathEngine/knowledgeGraph');
const { CONCEPT_TO_LEVEL } = require('../mathGenerator');
const logger = require('../logger');

const router = express.Router();

// Phase 15 — self-auditing engine. Admin-only content health report that fuses pedagogical
// feedback, lesson analytics, and the anti-repetition exposure memory to auto-flag weak and
// repetitive content (the latter pinpoints which slots still need more representations).
router.get('/api/engine/content-audit', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const report = await runSelfAudit(db);
    res.json(report);
  } catch (err) {
    logger.error('[/api/engine/content-audit]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/engine/event', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    conceptId,
    templateType,
    correct,
    responseMs = 0,
    usedHint = false,
    usedCalculator = false,
    wasRetry = false,
    abandoned = false,
    wrongAnswer = null,
    correctAnswer = null,
    params = {},
  } = req.body;

  if (!conceptId) return res.status(400).json({ error: 'conceptId required' });

  try {
    // 1. Update retention schedule and get current retention score
    const rating = correct ? (responseMs < 8000 ? 4 : 3) : 1;
    const retResult = await RetentionEngine.recordReview(db, userId, conceptId, rating);
    const retentionScore = await RetentionEngine.getRetentionForProfile(db, userId, conceptId);

    // 2. Update learner profile
    const profileEvent = { correct, responseMs, usedHint, usedCalculator, wasRetry, retentionScore };
    const updatedProfile = await LearnerModel.updateProfile(db, userId, conceptId, profileEvent);

    // 3. Classify and record misconception on wrong answer
    let misconception = null;
    if (!correct && wrongAnswer !== null && correctAnswer !== null) {
      misconception = MisconceptionEngine.classifyMisconception(conceptId, correctAnswer, wrongAnswer, params);
      await MisconceptionEngine.recordMisconception(db, userId, conceptId, misconception.id, misconception.label);
    } else if (correct) {
      // Attempt to resolve any known misconceptions for this concept on correct answer
      const activeMisconceptions = await MisconceptionEngine.getConceptMisconceptions(db, userId, conceptId);
      for (const m of activeMisconceptions) {
        await MisconceptionEngine.resolveMisconception(db, userId, conceptId, m.misconception_type);
      }
    }

    // 4. Record lesson analytics (system-level, not per-user)
    if (templateType) {
      await AnalyticsEngine.recordLessonEvent(db, templateType, { correct, timeTaken: responseMs, usedHint, abandoned });
    }

    // 5. Infer and record teaching style signals
    if (templateType || conceptId) {
      const signals = TeachingEngine.inferSignalFromResult({ correct, responseMs, usedHint, wasRetry }, conceptId);
      for (const signal of signals) {
        await TeachingEngine.recordStyleSignal(db, userId, signal.style, signal.outcome);
      }
    }

    // Multi-dimensional mastery breakdown for this concept (accuracy/fluency/retention/independence)
    const masteryProfile = MasteryEngine.computeMasteryProfile(updatedProfile);

    res.json({
      success: true,
      mastery: updatedProfile.mastery_score,
      masteryProfile,
      retention: retentionScore,
      nextReview: retResult.nextReview,
      misconception: misconception && misconception.id !== 'unclassified' ? misconception : null,
    });
  } catch (err) {
    logger.error('[Engine/event]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/next?category=X&level=Y
// Return the orchestrated "best next concept" for this learner
router.get('/api/engine/next', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const category = req.query.category || 'arithmetic';
  const level = parseInt(req.query.level) || 1;

  try {
    const selection = await Orchestrator.selectNextConcept(db, userId, category, level);
    const styleProfile = await TeachingEngine.getLearningStyle(db, userId);

    res.json({
      conceptId: selection.conceptId,
      reason: selection.reason,
      priority: selection.priority,
      meta: selection.meta,
      learningStyle: styleProfile.dominant,
    });
  } catch (err) {
    logger.error('[Engine/next]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/learner
// Full learner snapshot — all concept profiles for the current user
router.get('/api/engine/learner', authenticateToken, async (req, res) => {
  try {
    const snapshot = await LearnerModel.getLearnerSnapshot(db, req.user.id);
    const style = await TeachingEngine.getLearningStyle(db, req.user.id);
    const spikes = await AnalyticsEngine.detectDifficultySpikes(db, req.user.id);
    const summary = await AnalyticsEngine.getUserSessionSummary(db, req.user.id);
    // Attach the per-concept dimension breakdown + a learner-wide aggregate mastery vector.
    const concepts = snapshot.map((c) => ({ ...c, dimensions: MasteryEngine.computeDimensions(c) }));
    const masteryProfile = MasteryEngine.aggregateDimensions(snapshot);
    res.json({ concepts, masteryProfile, learningStyle: style, difficultySpikes: spikes, summary });
  } catch (err) {
    logger.error('[Engine/learner]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/learner/concept/:conceptId
// Single-concept deep profile
router.get('/api/engine/learner/concept/:conceptId', authenticateToken, async (req, res) => {
  try {
    const profile = await LearnerModel.getProfile(db, req.user.id, req.params.conceptId);
    const masteryProfile = MasteryEngine.computeMasteryProfile(profile);
    const misconceptions = await MisconceptionEngine.getConceptMisconceptions(db, req.user.id, req.params.conceptId);
    const retention = await RetentionEngine.getSchedule(db, req.user.id, req.params.conceptId);
    const liveRetention = await RetentionEngine.getLiveRetention(db, req.user.id, req.params.conceptId);
    res.json({ profile, masteryProfile, misconceptions, retention, liveRetention });
  } catch (err) {
    logger.error('[Engine/learner/concept]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/skill-tree
// The full curriculum as a mastery skill tree: every playable concept (from the knowledge graph,
// ordered by its curriculum level) merged with the learner's per-concept mastery dimensions.
// Unstarted concepts come back with started=false / null dimensions so the client can show the
// whole map (locked vs. in-progress vs. mastered), not just what's been attempted.
router.get('/api/engine/skill-tree', authenticateToken, async (req, res) => {
  try {
    const snapshot = await LearnerModel.getLearnerSnapshot(db, req.user.id);
    const byConcept = {};
    for (const c of snapshot) byConcept[c.concept_id] = c;

    const nodes = Object.keys(KnowledgeGraph.concepts)
      .filter((conceptId) => CONCEPT_TO_LEVEL[conceptId]) // only the playable curriculum
      .map((conceptId) => {
        const meta = CONCEPT_TO_LEVEL[conceptId];
        const profile = byConcept[conceptId];
        const started = !!profile && (profile.exposure_count || 0) > 0;
        let dimensions = null;
        let overall = 0;
        let stage = 'Locked';
        let needsReview = false;
        if (started) {
          const mp = MasteryEngine.computeMasteryProfile(profile);
          dimensions = mp.dimensions;
          overall = mp.overall;
          stage = mp.stage;
          // Mastery-decay signal: learned-but-fading concepts the learner should revisit.
          needsReview = MasteryEngine.needsRetentionReview(profile);
        }
        return {
          conceptId,
          name: KnowledgeGraph.concepts[conceptId].name,
          standard: KnowledgeGraph.concepts[conceptId].standard || null,
          category: meta.category,
          level: meta.level,
          prereqs: KnowledgeGraph.concepts[conceptId].prereqs || [],
          started,
          dimensions,
          overall,
          stage,
          needsReview,
        };
      })
      .sort((a, b) => a.level - b.level);

    const masteryProfile = MasteryEngine.aggregateDimensions(snapshot);
    res.json({ nodes, masteryProfile, dimensions: MasteryEngine.MASTERY_DIMENSIONS });
  } catch (err) {
    logger.error('[Engine/skill-tree]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/learning-plan
// Goal actuation (audit #19): turn the learner's goal into an ORDERED, prerequisite-correct path of
// concepts with a single clear "next step" — the audit's "measures like a pro, acts like a beginner"
// gap. Unlike the skill tree (the whole map), this is a focused sequence toward a target: an explicit
// reach_level goal if set, else a near-term horizon from where the learner is now. Each step's status
// is derived from the SAME mastery the rest of the engine computes, so the path stays honest.
const PLAN_PROFICIENT = 0.6; // "you've learned this" bar — both marks a step done and gates prereqs

router.get('/api/engine/learning-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbGet = (sql, p) => new Promise((resolve, reject) => db.get(sql, p, (e, r) => (e ? reject(e) : resolve(r))));

    const userRow = await dbGet('SELECT level FROM users WHERE id = ?', [userId]);
    const currentLevel = (userRow && userRow.level) || 1;
    const goal = await dbGet('SELECT goal_type, target_value FROM user_goals WHERE user_id = ?', [userId]);

    // Target: an explicit reach_level goal, else a near-term horizon ahead of the learner.
    let targetLevel;
    let goalDriven = false;
    if (goal && goal.goal_type === 'reach_level') {
      targetLevel = goal.target_value;
      goalDriven = true;
    } else {
      targetLevel = Math.min(50, currentLevel + 12);
    }

    const snapshot = await LearnerModel.getLearnerSnapshot(db, userId);
    const byConcept = {};
    for (const c of snapshot) byConcept[c.concept_id] = c;
    const overallOf = (conceptId) => {
      const p = byConcept[conceptId];
      if (!p || (p.exposure_count || 0) === 0) return { started: false, overall: 0 };
      return { started: true, overall: MasteryEngine.computeMasteryProfile(p).overall };
    };
    const isSatisfied = (conceptId) => {
      const o = overallOf(conceptId);
      return o.started && o.overall >= PLAN_PROFICIENT;
    };

    // Curriculum level already follows prerequisite order (a prereq always sits at a lower level),
    // so a level sort is a valid topological order for the path.
    const ordered = Object.keys(KnowledgeGraph.concepts)
      .filter((id) => CONCEPT_TO_LEVEL[id] && CONCEPT_TO_LEVEL[id].level <= targetLevel)
      .sort((a, b) => CONCEPT_TO_LEVEL[a].level - CONCEPT_TO_LEVEL[b].level);

    let nextStepId = null;
    const steps = ordered.map((id) => {
      const meta = CONCEPT_TO_LEVEL[id];
      const o = overallOf(id);
      // Ignore prereqs that aren't in the playable curriculum (can't be practiced anyway).
      const prereqsMet = (KnowledgeGraph.concepts[id].prereqs || []).every((p) => !CONCEPT_TO_LEVEL[p] || isSatisfied(p));
      let status;
      if (o.started && o.overall >= PLAN_PROFICIENT) status = 'done';
      else if (!prereqsMet) status = 'locked';
      else if (o.started) status = 'in_progress';
      else status = 'available';
      if (!nextStepId && (status === 'in_progress' || status === 'available')) nextStepId = id;
      return { conceptId: id, name: KnowledgeGraph.concepts[id].name, category: meta.category, level: meta.level, status, overall: Math.round(o.overall * 100) / 100, isNext: false };
    });
    for (const s of steps) s.isNext = s.conceptId === nextStepId;

    const done = steps.filter((s) => s.status === 'done').length;
    res.json({
      currentLevel,
      targetLevel,
      goalDriven,
      goalType: goal ? goal.goal_type : null,
      total: steps.length,
      done,
      percent: steps.length ? Math.round((done / steps.length) * 100) : 0,
      nextStep: steps.find((s) => s.isNext) || null,
      steps,
    });
  } catch (err) {
    logger.error('[Engine/learning-plan]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/weekly-recap
// A "Your Week" snapshot for an in-app, shareable recap (Wrapped-style). Unlike the lifecycle
// recap EMAIL (cumulative totals), this reports a REAL last-7-days figure from the daily
// user_commitment_history, plus current standing + the learner-wide mastery aggregate and the
// strongest concept. Honest framing: weekly = activity (problems/active days); the rest is "where
// you stand now" (no fake week-over-week deltas — that needs a weekly snapshot table).
router.get('/api/engine/weekly-recap', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const dbGet = (sql, p) => new Promise((resolve, reject) => db.get(sql, p, (e, r) => (e ? reject(e) : resolve(r))));
    // Last 7 UTC days inclusive of today.
    const since = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);

    const week = await dbGet(
      `SELECT COALESCE(SUM(solved_count), 0) AS weekProblems, COUNT(DISTINCT date) AS activeDays
         FROM user_commitment_history WHERE user_id = ? AND date >= ?`,
      [userId, since]
    );
    const user = await dbGet('SELECT streak, level, coins FROM users WHERE id = ?', [userId]);

    const snapshot = await LearnerModel.getLearnerSnapshot(db, userId);
    const agg = MasteryEngine.aggregateDimensions(snapshot);
    let topConcept = null;
    let topOverall = -1;
    for (const c of snapshot) {
      const meta = KnowledgeGraph.concepts[c.concept_id];
      if (!meta) continue;
      const mp = MasteryEngine.computeMasteryProfile(c);
      if (mp.overall > topOverall) {
        topOverall = mp.overall;
        topConcept = { name: meta.name, overall: mp.overall };
      }
    }

    res.json({
      weekProblems: (week && week.weekProblems) || 0,
      activeDays: (week && week.activeDays) || 0,
      streak: (user && user.streak) || 0,
      level: (user && user.level) || 1,
      coins: (user && user.coins) || 0,
      conceptsPracticed: snapshot.length,
      overallMastery: agg ? agg.overall : 0,
      masteryStage: agg ? agg.stage : 'Novice',
      topConcept,
    });
  } catch (err) {
    logger.error('[Engine/weekly-recap]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/misconceptions
// Active (unresolved) misconceptions for the current user
router.get('/api/engine/misconceptions', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const misconceptions = await MisconceptionEngine.getActiveMisconceptions(db, req.user.id, limit);
    res.json({ misconceptions });
  } catch (err) {
    logger.error('[Engine/misconceptions]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/retention/due
// Concepts due for review right now (overdue + decaying)
router.get('/api/engine/retention/due', authenticateToken, async (req, res) => {
  try {
    const overdue = await RetentionEngine.getOverdueReviews(db, req.user.id);
    const decaying = await RetentionEngine.getDecayingConcepts(db, req.user.id);
    res.json({ overdue, decaying, totalDue: overdue.length + decaying.length });
  } catch (err) {
    logger.error('[Engine/retention/due]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/retention/review
// Submit a review result for a concept
router.post('/api/engine/retention/review', authenticateToken, async (req, res) => {
  const { conceptId, rating } = req.body;
  if (!conceptId || !rating) return res.status(400).json({ error: 'conceptId and rating (1-4) required' });
  const clampedRating = Math.min(4, Math.max(1, parseInt(rating)));
  try {
    const result = await RetentionEngine.recordReview(db, req.user.id, conceptId, clampedRating);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[Engine/retention/review]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/analytics/recommendations
// System-level lesson quality and personalised learning recommendations
router.get('/api/engine/analytics/recommendations', authenticateToken, async (req, res) => {
  try {
    const systemRecs = await AnalyticsEngine.getSystemRecommendations(db);
    const spikes = await AnalyticsEngine.detectDifficultySpikes(db, req.user.id);
    const weak = await LearnerModel.getWeakConcepts(db, req.user.id, 0.6);
    const stagnant = await LearnerModel.getStagnantConcepts(db, req.user.id);
    res.json({
      systemRecommendations: systemRecs,
      personalDifficultySpikes: spikes,
      weakConcepts: weak.map((w) => ({ conceptId: w.concept_id, mastery: w.mastery_score })),
      stagnantConcepts: stagnant.map((s) => ({ conceptId: s.concept_id, velocity: s.learning_velocity })),
    });
  } catch (err) {
    logger.error('[Engine/analytics/recommendations]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/competitive/profile
// Skill-based competitive profile for the current user
router.get('/api/engine/competitive/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await CompetitiveEngine.getCompetitiveProfile(db, req.user.id);
    res.json(profile);
  } catch (err) {
    logger.error('[Engine/competitive/profile]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/engine/competitive/update
// Update competitive rating after a match result
router.post('/api/engine/competitive/update', authenticateToken, async (req, res) => {
  const { conceptId, outcome, opponentRating = 1000 } = req.body;
  if (!conceptId || outcome === undefined) return res.status(400).json({ error: 'conceptId and outcome required' });
  const clampedOutcome = Math.min(1, Math.max(0, parseFloat(outcome)));
  try {
    const result = await CompetitiveEngine.updateCompetitiveRating(db, req.user.id, conceptId, clampedOutcome, opponentRating);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error('[Engine/competitive/update]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/competitive/matchpool
// Find skill-matched opponents for the current user
router.get('/api/engine/competitive/matchpool', authenticateToken, async (req, res) => {
  try {
    const profile = await CompetitiveEngine.getCompetitiveProfile(db, req.user.id);
    const candidates = await CompetitiveEngine.findMatch(db, req.user.id, profile.overallRating);
    res.json({ candidates, userRating: profile.overallRating, userTier: profile.tier });
  } catch (err) {
    logger.error('[Engine/competitive/matchpool]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
