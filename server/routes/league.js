// Weekly league standings for the current user's league (cached briefly; the per-user
// countdown stays live).
const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const cache = require('../cache');
const { checkAndResetQuestsAndLeagues } = require('../services/userService');

const router = express.Router();

router.get('/api/league/leaderboard', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get('SELECT league, last_league_reset FROM users WHERE id = ?', [req.user.id], (err, currentUser) => {
      if (err || !currentUser) return res.status(500).json({ error: 'User not found' });

      const userLeague = currentUser.league || 'Bronze';
      const lastReset = currentUser.last_league_reset || 0;
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = Math.max(0, 7 * 86400 - (now - lastReset));

      // seconds_remaining is per-request, but the standings list is shared by
      // everyone in the league and changes slowly — cache it briefly so a busy
      // league doesn't re-run the ORDER BY on every open.
      const sendStandings = (rows) => res.json({ league: userLeague, seconds_remaining: secondsRemaining, standings: rows });

      const cacheKey = `league:standings:${userLeague}`;
      const cachedStandings = cache.get(cacheKey);
      if (cachedStandings) return sendStandings(cachedStandings);

      db.all(
        `SELECT id, username, league_points, avatar, active_badge, level
         FROM users
         WHERE league = ?
         ORDER BY league_points DESC
         LIMIT 30`,
        [userLeague],
        (errL, rows) => {
          if (errL) return res.status(500).json({ error: errL.message });
          cache.set(cacheKey, rows, 30 * 1000); // 30s staleness is fine for a leaderboard
          sendStandings(rows);
        }
      );
    });
  });
});

module.exports = router;
