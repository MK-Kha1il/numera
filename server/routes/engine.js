// Mathematical Learning Intelligence Engine API: records answer events and exposes the
// learner model, misconceptions, spaced-retention, analytics recommendations, and the
// skill-based competitive profile. Thin HTTP layer over the mathEngine/* modules.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const LearnerModel = require('../mathEngine/learnerModel');
const MisconceptionEngine = require('../mathEngine/misconceptionEngine');
const RetentionEngine = require('../mathEngine/retentionEngine');
const TeachingEngine = require('../mathEngine/teachingEngine');
const AnalyticsEngine = require('../mathEngine/analyticsEngine');
const CompetitiveEngine = require('../mathEngine/competitiveEngine');
const Orchestrator = require('../mathEngine/problemOrchestrator');

const router = express.Router();

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

    res.json({
      success: true,
      mastery: updatedProfile.mastery_score,
      retention: retentionScore,
      nextReview: retResult.nextReview,
      misconception: misconception && misconception.id !== 'unclassified' ? misconception : null,
    });
  } catch (err) {
    console.error('[Engine/event]', err);
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
    console.error('[Engine/next]', err);
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
    res.json({ concepts: snapshot, learningStyle: style, difficultySpikes: spikes, summary });
  } catch (err) {
    console.error('[Engine/learner]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/engine/learner/concept/:conceptId
// Single-concept deep profile
router.get('/api/engine/learner/concept/:conceptId', authenticateToken, async (req, res) => {
  try {
    const profile = await LearnerModel.getProfile(db, req.user.id, req.params.conceptId);
    const misconceptions = await MisconceptionEngine.getConceptMisconceptions(db, req.user.id, req.params.conceptId);
    const retention = await RetentionEngine.getSchedule(db, req.user.id, req.params.conceptId);
    const liveRetention = await RetentionEngine.getLiveRetention(db, req.user.id, req.params.conceptId);
    res.json({ profile, misconceptions, retention, liveRetention });
  } catch (err) {
    console.error('[Engine/learner/concept]', err);
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
    console.error('[Engine/misconceptions]', err);
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
    console.error('[Engine/retention/due]', err);
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
    console.error('[Engine/retention/review]', err);
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
    console.error('[Engine/analytics/recommendations]', err);
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
    console.error('[Engine/competitive/profile]', err);
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
    console.error('[Engine/competitive/update]', err);
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
    console.error('[Engine/competitive/matchpool]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
