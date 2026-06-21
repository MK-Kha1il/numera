// Living Arena read endpoints (docs/CompetitiveArenaRedesign.md): the social/identity surfaces the
// arena home pulls — your top rivals and the community feed of recent promotions/streaks/peaks.
// All writes happen in the duel socket lifecycle (server.js) via services/arenaService; this router
// is read-only.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const arena = require('../services/arenaService');

const router = express.Router();

// Your top rivals: most-played opponents with the head-to-head record. Powers the arena-home
// "Rivals" card and the "unfinished business" pull.
router.get('/api/arena/rivals', authenticateToken, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
  arena.getRivals(req.user.id, limit, (err, rivals) => {
    if (err) return res.status(500).json({ error: 'Failed to load rivals' });
    res.json({ rivals });
  });
});

// The community feed: recent notable arena events (promotions, peak ratings, win streaks, upsets).
// Makes the arena feel inhabited even when you're not queuing.
router.get('/api/arena/feed', authenticateToken, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
  arena.getFeed(limit, (err, events) => {
    if (err) return res.status(500).json({ error: 'Failed to load feed' });
    res.json({ events });
  });
});

// Your recent matches (competitive arc) — opponent, win/loss, rating delta — newest first.
router.get('/api/arena/history', authenticateToken, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 8, 30);
  arena.getMatchHistory(req.user.id, limit, (err, matches) => {
    if (err) return res.status(500).json({ error: 'Failed to load match history' });
    res.json({ matches });
  });
});

// Head-to-head against a specific player (e.g. peeking a rival's record before a rematch).
router.get('/api/arena/h2h/:opponentId', authenticateToken, (req, res) => {
  const oppId = parseInt(req.params.opponentId, 10);
  if (isNaN(oppId)) return res.status(400).json({ error: 'Invalid opponent id' });
  arena.getHeadToHead(req.user.id, oppId, (err, h2h) => {
    if (err) return res.status(500).json({ error: 'Failed to load head-to-head' });
    res.json(h2h);
  });
});

module.exports = router;
