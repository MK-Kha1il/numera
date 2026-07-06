// Mastery Map — the Mathematical Mastery Profile endpoint (domains × competencies, growth,
// records, milestones, titles, recommendations). Read-only: the profile is derived entirely
// from play recorded elsewhere (engine events, commitment history), never granted here.
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const MasteryMapService = require('../services/masteryMapService');
const logger = require('../logger');

const router = express.Router();

router.get('/api/mastery/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await MasteryMapService.getMasteryMap(db, req.user.id);
    res.json(profile);
  } catch (err) {
    logger.error('[/api/mastery/profile]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
