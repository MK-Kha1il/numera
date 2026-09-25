// Weekly league clock + promotion rules (pure: no DB/IO; unit-tested in test/leagueWeeks.test.js).
//
// The weekly league used to anchor each player's "week" to their OWN last reset (whenever they
// happened to open the app 7+ days after the previous one), resetting only that player's points and
// ranking them against a league where some rivals had already been zeroed and others hadn't. Players
// who stopped playing were never reset at all, so a long-gone account could top a league forever and
// block the top-3 promotions. Now every league runs on ONE global week (Monday 00:00 UTC → next
// Monday) and a single rollover ranks everyone at once.
'use strict';

const WEEK_SECS = 7 * 86400;
// 1970-01-05T00:00:00Z was a Monday — the anchor for week numbering.
const EPOCH_MONDAY = 4 * 86400;

// The weekly league's own "stone" ladder (docs/BrandIdentity.md §8), lowest first.
const LEAGUE_ORDER = ['Quartz', 'Onyx', 'Jade', 'Topaz', 'Obsidian'];

// Promotion/demotion rules (unchanged from the per-user version): the top 3 of a league with any
// points — or anyone past PROMOTE_POINTS — moves up; the bottom 3 of a league of 5+ moves down.
const PROMOTE_TOP = 3;
const PROMOTE_POINTS = 100;
const DEMOTE_BOTTOM = 3;
const DEMOTE_MIN_MEMBERS = 5;

const weekIndex = (epochSec) => Math.floor((Number(epochSec) - EPOCH_MONDAY) / WEEK_SECS);
const weekStartsAt = (week) => EPOCH_MONDAY + week * WEEK_SECS;
const weekEndsAt = (week) => weekStartsAt(week + 1);

const normalizeLeague = (l) => (LEAGUE_ORDER.includes(l) ? l : LEAGUE_ORDER[0]);

/**
 * Rank every league's members by the points they earned in the finished week and decide who moves.
 * members: [{ id, league, points }]. Returns [{ id, from, to, direction: 'up'|'down', position }]
 * for movers only. Ties break by id (earlier account first) so the result is deterministic.
 */
function computeLeagueMoves(members) {
  const byLeague = new Map();
  for (const m of members || []) {
    const league = normalizeLeague(m.league);
    if (!byLeague.has(league)) byLeague.set(league, []);
    byLeague.get(league).push({ id: m.id, points: Math.max(0, parseInt(m.points, 10) || 0) });
  }

  const moves = [];
  for (const [league, list] of byLeague) {
    list.sort((a, b) => b.points - a.points || a.id - b.id);
    const idx = LEAGUE_ORDER.indexOf(league);
    const n = list.length;
    list.forEach((m, i) => {
      const promote = idx < LEAGUE_ORDER.length - 1 && ((i < PROMOTE_TOP && m.points > 0) || m.points > PROMOTE_POINTS);
      const demote = !promote && idx > 0 && n >= DEMOTE_MIN_MEMBERS && i >= n - DEMOTE_BOTTOM;
      if (promote) moves.push({ id: m.id, from: league, to: LEAGUE_ORDER[idx + 1], direction: 'up', position: i + 1, points: m.points });
      else if (demote) moves.push({ id: m.id, from: league, to: LEAGUE_ORDER[idx - 1], direction: 'down', position: i + 1, points: m.points });
    });
  }
  return moves;
}

module.exports = { WEEK_SECS, LEAGUE_ORDER, weekIndex, weekStartsAt, weekEndsAt, normalizeLeague, computeLeagueMoves };
