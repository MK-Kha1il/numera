// The weekly league on ONE global week (lib/leagueWeeks.js + services/leagueService.js): the pure
// week clock and promotion rules, and the single transactional rollover that ranks everyone at
// once — including players who stopped playing (they no longer keep stale points forever).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { weekIndex, weekStartsAt, weekEndsAt, computeLeagueMoves, WEEK_SECS } = require('../lib/leagueWeeks');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));

test('weeks start on Monday 00:00 UTC and are contiguous', () => {
  const monday = Date.UTC(2026, 8, 21) / 1000; // 2026-09-21 was a Monday
  const w = weekIndex(monday);
  assert.equal(weekStartsAt(w), monday);
  assert.equal(weekIndex(monday - 1), w - 1, 'Sunday 23:59:59 belongs to the previous week');
  assert.equal(weekEndsAt(w) - weekStartsAt(w), WEEK_SECS);
});

test('computeLeagueMoves: top 3 with points (or 100+) promote, bottom 3 of 5+ demote', () => {
  const members = [
    { id: 1, league: 'Onyx', points: 90 },
    { id: 2, league: 'Onyx', points: 80 },
    { id: 3, league: 'Onyx', points: 70 },
    { id: 4, league: 'Onyx', points: 60 },
    { id: 5, league: 'Onyx', points: 5 },
    { id: 6, league: 'Onyx', points: 0 },
    { id: 7, league: 'Onyx', points: 0 },
    { id: 8, league: 'Quartz', points: 0 }, // bottom league: never demotes, 0 points never promotes
    { id: 9, league: 'Obsidian', points: 500 }, // top league: nowhere to go
    { id: 10, league: 'Jade', points: 150 },
  ];
  const moves = Object.fromEntries(computeLeagueMoves(members).map((m) => [m.id, m.to]));
  assert.deepEqual(moves, { 1: 'Jade', 2: 'Jade', 3: 'Jade', 5: 'Quartz', 6: 'Quartz', 7: 'Quartz', 10: 'Topaz' });
});

test('computeLeagueMoves: ties break deterministically and unknown leagues count as Quartz', () => {
  const moves = computeLeagueMoves([
    { id: 2, league: 'Bronze', points: 10 },
    { id: 1, league: null, points: 10 },
  ]);
  assert.deepEqual(moves.map((m) => [m.id, m.from, m.to, m.position]), [[1, 'Quartz', 'Onyx', 1], [2, 'Quartz', 'Onyx', 2]]);
});

test('the rollover runs once per week for everyone, and zeroes stale points of inactive players', async () => {
  const leagueService = require('../services/leagueService');
  const active = await registerUser(ctx.base);
  const inactive = await registerUser(ctx.base);
  // An account that stopped playing long ago still holds last month's points.
  await dbRun("UPDATE users SET league = 'Quartz', league_points = 40 WHERE id = ?", [active.user.id]);
  await dbRun("UPDATE users SET league = 'Quartz', league_points = 999 WHERE id = ?", [inactive.user.id]);

  // Simulate the Monday boundary: pretend the last rolled week was two weeks ago.
  const current = weekIndex(Math.floor(Date.now() / 1000));
  await dbRun('DELETE FROM league_rollovers WHERE week >= ?', [current - 1]);
  leagueService._resetMemo();
  await leagueService.ensureLeagueWeek();

  const a = await dbGet('SELECT league, league_points FROM users WHERE id = ?', [active.user.id]);
  const b = await dbGet('SELECT league, league_points FROM users WHERE id = ?', [inactive.user.id]);
  assert.equal(a.league_points, 0, 'everyone starts the new week at zero');
  assert.equal(b.league_points, 0, 'including players who never came back');
  assert.equal(a.league, 'Onyx', 'a top-3 finisher with points is promoted');
  const roll = await dbGet('SELECT week, promoted FROM league_rollovers WHERE week = ?', [current]);
  assert.ok(roll && roll.promoted >= 1, 'the rollover is recorded');

  // A second check in the same week is a no-op.
  await dbRun('UPDATE users SET league_points = 7 WHERE id = ?', [active.user.id]);
  leagueService._resetMemo();
  await leagueService.ensureLeagueWeek();
  assert.equal((await dbGet('SELECT league_points FROM users WHERE id = ?', [active.user.id])).league_points, 7);
});

test('the standings countdown points at the shared weekly boundary', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/league/leaderboard', { token: u.token });
  assert.equal(r.status, 200);
  const now = Math.floor(Date.now() / 1000);
  const expected = weekEndsAt(weekIndex(now)) - now;
  assert.ok(Math.abs(r.body.seconds_remaining - expected) <= 5, `${r.body.seconds_remaining} vs ${expected}`);
});
