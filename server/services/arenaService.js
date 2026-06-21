// Living Arena data services (docs/CompetitiveArenaRedesign.md): the DB-touching layer behind
// rivalries, player identity, reputation (peak/streak), and the social feed. Callback-style to
// match the rest of the server. The pure clutch math lives in lib/duelMoments; this file only
// reads/writes. Used by the duel socket lifecycle (server.js) and routes/arena.js.
const { db } = require('../db');
const { calculateRankFromElo } = require('../lib/progression');

const BOT_ID = 9999;

// Each mastery column → the human-facing strand label used for a player's "specialty" chip.
const SPECIALTY_LABELS = {
  arithmetic_correct: 'Arithmetic',
  mental_correct: 'Mental Math',
  algebra_correct: 'Algebra',
  calculus_correct: 'Calculus',
  combinatorics_correct: 'Combinatorics',
  number_theory_correct: 'Number Theory',
  geometry_correct: 'Geometry',
  integers_correct: 'Integers',
  decimals_correct: 'Decimals',
  fractions_correct: 'Fractions',
  number_sense_correct: 'Number Sense',
  statistics_correct: 'Statistics',
  expressions_correct: 'Expressions',
  powers_correct: 'Powers',
  graphing_correct: 'Graphing',
  inequalities_correct: 'Inequalities',
  functions_correct: 'Functions',
  sequences_correct: 'Sequences',
  equations_correct: 'Equations',
  rates_correct: 'Rates',
  factors_correct: 'Factors',
};

// Pick the strongest strand (max *_correct) as the player's signature. Null until they've solved
// something — no fake personality for brand-new accounts.
function specialtyFromMastery(mastery) {
  if (!mastery) return null;
  let best = null;
  let bestVal = 0;
  for (const col of Object.keys(SPECIALTY_LABELS)) {
    const v = mastery[col] || 0;
    if (v > bestVal) { bestVal = v; best = SPECIALTY_LABELS[col]; }
  }
  return bestVal > 0 ? best : null;
}

// Load a compact "arena identity" for the pre-match player card: the reputation a competitor
// carries into the fight. Returns a plain object (never errors out the caller — falls back to a
// fresh-account shape). For the bot, returns a clearly-labeled synthetic identity.
function loadArenaIdentity(userId, cb) {
  if (!userId || userId === BOT_ID) {
    return cb(null, {
      id: BOT_ID,
      username: 'MathBot',
      isBot: true,
      rank: 'Training Bot',
      elo: 1000,
      peak_elo: 1000,
      current_win_streak: 0,
      best_win_streak: 0,
      competitive_matches: 0,
      specialty: 'Calibrated AI',
    });
  }
  db.get(
    `SELECT id, username, elo, rank, peak_elo, current_win_streak, best_win_streak, competitive_matches
     FROM users WHERE id = ?`,
    [userId],
    (err, u) => {
      if (err || !u) {
        return cb(null, {
          id: userId, username: 'Challenger', isBot: false, rank: 'Unranked',
          elo: 1000, peak_elo: 1000, current_win_streak: 0, best_win_streak: 0,
          competitive_matches: 0, specialty: null,
        });
      }
      db.get('SELECT * FROM user_mastery WHERE user_id = ?', [userId], (errM, mastery) => {
        cb(null, {
          id: u.id,
          username: u.username,
          isBot: false,
          rank: u.rank || 'Unranked',
          elo: u.elo || 1000,
          peak_elo: u.peak_elo || u.elo || 1000,
          current_win_streak: u.current_win_streak || 0,
          best_win_streak: u.best_win_streak || 0,
          competitive_matches: u.competitive_matches || 0,
          specialty: specialtyFromMastery(mastery),
        });
      });
    }
  );
}

// Head-to-head record between two players, from a's perspective: { total, myWins, theirWins, draws }.
function getHeadToHead(aId, bId, cb) {
  if (!aId || !bId || aId === BOT_ID || bId === BOT_ID) {
    return cb(null, { total: 0, myWins: 0, theirWins: 0, draws: 0 });
  }
  db.get(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS myWins,
       SUM(CASE WHEN winner_id = ? THEN 1 ELSE 0 END) AS theirWins,
       SUM(CASE WHEN winner_id IS NULL THEN 1 ELSE 0 END) AS draws
     FROM duel_history
     WHERE (p1_id = ? AND p2_id = ?) OR (p1_id = ? AND p2_id = ?)`,
    [aId, bId, aId, bId, bId, aId],
    (err, row) => {
      if (err || !row) return cb(null, { total: 0, myWins: 0, theirWins: 0, draws: 0 });
      cb(null, {
        total: row.total || 0,
        myWins: row.myWins || 0,
        theirWins: row.theirWins || 0,
        draws: row.draws || 0,
      });
    }
  );
}

// Record a finalized duel into the rivalry substrate. HUMAN-vs-HUMAN only — bot matches are
// excluded so rivalries and rivals stay real (and can't be farmed). Fire-and-forget; never throws.
function recordDuelResult({ p1Id, p2Id, winnerId, p1Score, p2Score, p1EloChange, p2EloChange, mode }, cb) {
  const done = cb || (() => {});
  if (!p1Id || !p2Id || p1Id === BOT_ID || p2Id === BOT_ID) return done();
  db.run(
    `INSERT INTO duel_history
       (p1_id, p2_id, winner_id, p1_score, p2_score, p1_elo_change, p2_elo_change, mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p1Id, p2Id, winnerId || null, p1Score || 0, p2Score || 0,
      p1EloChange || 0, p2EloChange || 0, mode || 'ranked', Math.floor(Date.now() / 1000)],
    () => done()
  );
}

// Update a player's reputation after a duel and report what changed for the post-match moments.
// Streak + peak only move on RANKED outcomes (casual is practice). Returns via callback:
//   { winStreak, bestStreak, newPeak } — newPeak = true if this match set a new peak rating.
function updateReputation(userId, { didWin, newElo, isCasual }, cb) {
  const done = cb || (() => {});
  if (!userId || userId === BOT_ID) return done(null, { winStreak: 0, bestStreak: 0, newPeak: false });
  const now = Math.floor(Date.now() / 1000);

  if (isCasual) {
    db.run('UPDATE users SET last_duel_at = ? WHERE id = ?', [now, userId],
      () => done(null, { winStreak: 0, bestStreak: 0, newPeak: false, peakElo: null }));
    return;
  }

  db.get('SELECT peak_elo, current_win_streak, best_win_streak FROM users WHERE id = ?', [userId], (err, row) => {
    const prevPeak = row ? (row.peak_elo || 0) : 0;
    const prevStreak = row ? (row.current_win_streak || 0) : 0;
    const prevBest = row ? (row.best_win_streak || 0) : 0;

    const winStreak = didWin ? prevStreak + 1 : 0;
    const bestStreak = Math.max(prevBest, winStreak);
    const newPeakVal = Math.max(prevPeak, newElo || 0);
    const newPeak = didWin && newPeakVal > prevPeak;

    db.run(
      'UPDATE users SET peak_elo = ?, current_win_streak = ?, best_win_streak = ?, last_duel_at = ? WHERE id = ?',
      [newPeakVal, winStreak, bestStreak, now, userId],
      () => done(null, { winStreak, bestStreak, newPeak, peakElo: newPeakVal })
    );
  });
}

// Append a social-feed event (promotion / peak / streak / upset). Denormalizes the username so the
// feed query is a single table read. Fire-and-forget.
function addArenaEvent(userId, username, type, detail) {
  if (!userId || userId === BOT_ID) return;
  db.run(
    'INSERT INTO arena_events (user_id, username, type, detail, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, username || 'A competitor', type, detail || null, Math.floor(Date.now() / 1000)],
    () => {}
  );
}

// The player's top rivals: most-played opponents with the H2H record, recent first as a tiebreak.
function getRivals(userId, limit, cb) {
  if (!userId) return cb(null, []);
  db.all(
    `SELECT opp AS opponent_id, u.username AS username,
            COUNT(*) AS total,
            SUM(CASE WHEN dh.winner_id = ? THEN 1 ELSE 0 END) AS myWins,
            SUM(CASE WHEN dh.winner_id = opp THEN 1 ELSE 0 END) AS theirWins,
            MAX(dh.created_at) AS last_played
     FROM (
       SELECT id, created_at, winner_id, CASE WHEN p1_id = ? THEN p2_id ELSE p1_id END AS opp
       FROM duel_history WHERE p1_id = ? OR p2_id = ?
     ) dh
     LEFT JOIN users u ON u.id = dh.opp
     GROUP BY opp
     ORDER BY total DESC, last_played DESC
     LIMIT ?`,
    [userId, userId, userId, userId, limit || 5],
    (err, rows) => {
      if (err || !rows) return cb(null, []);
      cb(null, rows.map((r) => ({
        opponentId: r.opponent_id,
        username: r.username || 'Unknown',
        total: r.total || 0,
        myWins: r.myWins || 0,
        theirWins: r.theirWins || 0,
        lastPlayed: r.last_played || 0,
      })));
    }
  );
}

// Your own recent matches (competitive arc), newest first — each from YOUR perspective:
// opponent, win/loss/draw, and the rating you gained/lost.
function getMatchHistory(userId, limit, cb) {
  if (!userId) return cb(null, []);
  db.all(
    `SELECT dh.created_at AS created_at, dh.mode AS mode,
            CASE WHEN dh.p1_id = ? THEN dh.p2_id ELSE dh.p1_id END AS opponent_id,
            u.username AS opponent,
            CASE WHEN dh.winner_id IS NULL THEN 'draw'
                 WHEN dh.winner_id = ? THEN 'win' ELSE 'loss' END AS result,
            CASE WHEN dh.p1_id = ? THEN dh.p1_elo_change ELSE dh.p2_elo_change END AS elo_change
     FROM duel_history dh
     LEFT JOIN users u ON u.id = (CASE WHEN dh.p1_id = ? THEN dh.p2_id ELSE dh.p1_id END)
     WHERE dh.p1_id = ? OR dh.p2_id = ?
     ORDER BY dh.created_at DESC, dh.id DESC
     LIMIT ?`,
    [userId, userId, userId, userId, userId, userId, limit || 8],
    (err, rows) => {
      if (err || !rows) return cb(null, []);
      cb(null, rows.map((r) => ({
        opponent: r.opponent || 'Unknown',
        result: r.result,
        eloChange: r.elo_change || 0,
        mode: r.mode,
        createdAt: r.created_at || 0,
      })));
    }
  );
}

// The community feed for the arena home: recent notable events, newest first.
function getFeed(limit, cb) {
  db.all(
    'SELECT username, type, detail, created_at FROM arena_events ORDER BY created_at DESC LIMIT ?',
    [limit || 15],
    (err, rows) => cb(null, err || !rows ? [] : rows)
  );
}

module.exports = {
  BOT_ID,
  specialtyFromMastery,
  loadArenaIdentity,
  getHeadToHead,
  recordDuelResult,
  updateReputation,
  addArenaEvent,
  getRivals,
  getFeed,
  getMatchHistory,
  calculateRankFromElo,
};
