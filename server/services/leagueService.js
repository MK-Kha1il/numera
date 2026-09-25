// Global weekly league rollover (lib/leagueWeeks.js).
//
// ensureLeagueWeek() is called on the hot path (the daily-reset hook that runs before any league
// points are earned, and the league standings route). It is a no-op except for the first call after
// a Monday-00:00-UTC boundary, which — in ONE transaction — claims the new week in league_rollovers
// (PRIMARY KEY: a second process/request finds it taken and does nothing), ranks every league by the
// points earned in the finished week, applies promotions/demotions, and zeroes everyone's points.
// Notifications go out after the commit.
'use strict';

const { db } = require('../db');
const { withTransaction } = require('../dbx');
const logger = require('../logger');
const cache = require('../cache');
const { weekIndex, LEAGUE_ORDER, computeLeagueMoves } = require('../lib/leagueWeeks');
const { notify } = require('./notificationService');

let rolledWeek = null; // per-process memo: the week already confirmed rolled
let inFlight = null;

async function rollover(current) {
  const result = await withTransaction(async (tx) => {
    const claimed = await tx.run('INSERT OR IGNORE INTO league_rollovers (week, rolled_at) VALUES (?, ?)', [
      current,
      Math.floor(Date.now() / 1000),
    ]);
    if (claimed.changes === 0) return null; // someone else already rolled this week

    const members = await tx.all('SELECT id, league, league_points AS points FROM users');
    const moves = computeLeagueMoves(members);
    for (const m of moves) {
      await tx.run('UPDATE users SET league = ? WHERE id = ?', [m.to, m.id]);
    }
    // Normalize any legacy/unknown league names, then start everyone's new week at zero.
    await tx.run(`UPDATE users SET league = ? WHERE league IS NULL OR league NOT IN (${LEAGUE_ORDER.map(() => '?').join(',')})`, [
      LEAGUE_ORDER[0],
      ...LEAGUE_ORDER,
    ]);
    await tx.run('UPDATE users SET league_points = 0 WHERE league_points != 0');
    await tx.run('UPDATE league_rollovers SET promoted = ?, demoted = ? WHERE week = ?', [
      moves.filter((m) => m.direction === 'up').length,
      moves.filter((m) => m.direction === 'down').length,
      current,
    ]);
    return moves;
  });

  if (!result) return;
  for (const league of LEAGUE_ORDER) cache.del(`league:standings:${league}`);
  logger.info(`[league] week ${current} rolled: ${result.length} movers`);
  for (const m of result) {
    // Promotions always; demotions only for players who actually played last week (an inactive
    // account doesn't need a ping). Gentle copy — a new week is a fresh climb, not a failure.
    if (m.direction === 'down' && m.points === 0) continue;
    notify(m.id, {
      category: 'league_result',
      title: m.direction === 'up' ? `🏆 Promoted to ${m.to} League!` : `A fresh climb in ${m.to} League`,
      message:
        m.direction === 'up'
          ? `You finished #${m.position} in ${m.from} last week. Welcome to ${m.to}!`
          : `New week, new start: you'll climb from ${m.to} League this week. Every problem counts.`,
      type: 'reward',
      dedupKey: `league:${current}`,
    }).catch(() => {});
  }
}

/** Make sure the current global league week has been rolled. Never rejects. */
async function ensureLeagueWeek(atSec = Math.floor(Date.now() / 1000)) {
  const current = weekIndex(atSec);
  if (rolledWeek === current) return;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const row = await new Promise((resolve, reject) =>
        db.get('SELECT MAX(week) AS w FROM league_rollovers', [], (e, r) => (e ? reject(e) : resolve(r)))
      );
      if (!row || row.w == null || row.w < current) await rollover(current);
      rolledWeek = current;
    } catch (err) {
      logger.error(`[league] rollover check failed: ${err.message}`);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// Test seam: forget the per-process memo so a test can simulate a new week.
function _resetMemo() {
  rolledWeek = null;
}

module.exports = { ensureLeagueWeek, _resetMemo };
