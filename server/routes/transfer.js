// Transfer exercises (Sprint 4): serve "apply it in a new context" challenges and record their
// out-of-context outcome into the `transfer` mastery dimension. Thin HTTP layer over
// mathEngine/transferEngine.js + learnerModel/masteryEngine.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const TransferEngine = require('../mathEngine/transferEngine');
const MasteryEngine = require('../mathEngine/masteryEngine');
const LearnerModel = require('../mathEngine/learnerModel');
const { concepts } = require('../mathEngine/knowledgeGraph');
const logger = require('../logger');

const router = express.Router();

// Pick the best concept to offer a transfer challenge for: prefer one the learner is "ready" for
// (drilled in-context but never transferred), then any transfer concept with the least transfer
// practice, falling back to the first available.
function pickConcept(snapshot) {
  const byId = {};
  for (const row of snapshot) byId[row.concept_id] = row;

  let ready = null;
  let leastTransferred = null;
  for (const conceptId of TransferEngine.TRANSFER_CONCEPTS) {
    const profile = byId[conceptId];
    if (!profile) continue;
    const mp = MasteryEngine.computeMasteryProfile(profile);
    if (mp.transferReady && !ready) ready = conceptId;
    if (
      leastTransferred === null ||
      (profile.transfer_exposure || 0) < ((byId[leastTransferred] && byId[leastTransferred].transfer_exposure) || 0)
    ) {
      leastTransferred = conceptId;
    }
  }
  return ready || leastTransferred || TransferEngine.TRANSFER_CONCEPTS[0];
}

// GET /api/math/transfer/challenge?concept=<optional>
// Returns one transfer problem (novel-context framing of a concept).
router.get('/api/math/transfer/challenge', authenticateToken, async (req, res) => {
  try {
    const requested = req.query.concept;
    let conceptId = requested && TransferEngine.hasTransfer(requested) ? requested : null;

    const snapshot = await LearnerModel.getLearnerSnapshot(db, req.user.id);
    if (!conceptId) conceptId = pickConcept(snapshot);

    // Scale difficulty by how strong the learner already is in-context (harder if they've nailed it).
    const profile = snapshot.find((p) => p.concept_id === conceptId);
    const accuracy = profile ? profile.accuracy_rate : 0.5;
    const diffFactor = 0.9 + Math.max(0, Math.min(1, accuracy)) * 0.7;
    const idx = Math.floor(Math.random() * 6);

    const problem = TransferEngine.buildTransferProblem(conceptId, diffFactor, idx);
    if (!problem) return res.status(404).json({ error: 'No transfer challenge available for this concept' });

    res.json({
      conceptId,
      conceptName: (concepts[conceptId] && concepts[conceptId].name) || conceptId,
      transferContext: problem.transferContext,
      problem: {
        question: problem.question,
        correctAnswer: problem.correctAnswer,
        options: problem.options,
        explanation: problem.explanation,
        isTransfer: true,
      },
    });
  } catch (err) {
    logger.error('[Transfer/challenge]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/math/transfer/result   body: { conceptId, correct }
// Records the out-of-context outcome and returns the refreshed multi-dimensional mastery.
router.post('/api/math/transfer/result', authenticateToken, async (req, res) => {
  const { conceptId, correct } = req.body;
  if (!conceptId) return res.status(400).json({ error: 'conceptId required' });
  try {
    const updated = await LearnerModel.recordTransferAttempt(db, req.user.id, conceptId, !!correct);
    res.json({ success: true, masteryProfile: MasteryEngine.computeMasteryProfile(updated) });
  } catch (err) {
    logger.error('[Transfer/result]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
