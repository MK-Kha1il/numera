// Live duels over Socket.IO — authentication, ranked/casual matchmaking, friend lobbies, the
// server-authoritative duel lifecycle (countdown, grading, deadlines, disconnect forfeits,
// reconnects, rematches, emotes, bot opponents) and the rating/reward commit at the end.
//
// State (queues, rooms, lobbies, rematch offers) is module-level; attachDuels(io) wires the socket
// middleware, the connection handlers and the matchmaking/deadline sweep onto a Socket.IO server
// exactly once, and returns the functions the tests drive directly.
'use strict';

const jwt = require('jsonwebtoken');
const { db } = require('../db');
const logger = require('../logger');
const { JWT_SECRET } = require('../config');
const { securityLog } = require('../middleware/security');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator'); // duel/bot problem generation
const { feedEngineOutcome } = require('../services/engineFeed'); // feed graded duel answers into the learning engine
const { areEquivalent } = require('../mathEngine/answerEquivalence'); // server-authoritative duel grading
const sympyCas = require('../mathEngine/cas/sympyClient'); // optional SymPy CAS for high-level duel problems
const { applyDuelResultToRatings, getRatingRow } = require('../services/ratingService');
const { recordMatch } = require('../services/matchLog');
const { categoryToDomain, matchAcceptable, SIGMA_INIT: NRS_SIGMA_INIT } = require('../mathEngine/ratingEngine'); // attribute a duel to its dominant domain; hidden-MMR pairing gate
const { updateAchievements } = require('../services/achievementService');
const { grantRankRewards } = require('../services/rankRewardService');
const { creditStreak } = require('../services/streakService');
const { recordCoins } = require('../services/economyLedger');
const { bumpArenaQuest } = require('../services/userService');
const { flagAnswer, resolveDuel, rankedMatchmakingError } = require('../lib/duelIntegrity');

// The Socket.IO server, set once by attachDuels().
let io = null;

// JWT middleware for Socket.io — with the SAME stateful session check the REST middleware
// enforces (middleware/auth.js): a valid signature is not enough, the embedded sessionId must
// still exist and be unexpired. Before this, a revoked/logged-out token kept working on the
// socket path, so "log out everywhere" didn't cover live duels.
function registerSocketAuth() {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
      if (!decoded.sessionId) {
        return next(new Error('Authentication error: Invalid token structure'));
      }
      db.get(
        'SELECT id, expires_at FROM user_sessions WHERE id = ? AND user_id = ?',
        [decoded.sessionId, decoded.id],
        (errSession, session) => {
          if (errSession || !session || session.expires_at < Math.floor(Date.now() / 1000)) {
            return next(new Error('Authentication error: Session invalidated'));
          }
          socket.userId = decoded.id;
          socket.username = decoded.username;
          next();
        }
      );
    });
  });
}

const rankedQueue = []; // ranked matchmaking queue: [{ socketId, userId, username, rank, elo, competitiveMatches, joinTime }]
const casualQueue = []; // casual matchmaking queue
const rooms = {}; // active rooms: { roomId: { p1, p2, problems, isCasual, startTime, problemLevel } }
const friendRooms = {}; // code lobby rooms: { code: { creatorSocketId, userId, username, rank, elo } }
// Post-match rematch offers, keyed by the FINISHED room's id: "run it back" is one tap on the
// result screen while both players are still there. Human-vs-human only; same stakes, fresh set.
const rematchOffers = {}; // { oldRoomId: { p1, p2, isCasual, level, accepted: {p1?,p2?}, expiresAt } }
const REMATCH_WINDOW_MS = 30000;

// Live duels serve problems at the DUELLISTS' shared math level — beginners get beginner problems,
// advanced players get advanced ones — so a duel is always level-fair. DUEL_PROBLEM_LEVEL is only the
// fallback when a player's level is unknown; the integrity scorer's human-timing floor scales with the
// room's level (room.problemLevel).
const DUEL_PROBLEM_LEVEL = 5;
const MIN_DUEL_LEVEL = 1;
const MAX_DUEL_LEVEL = 50;
const clampLevel = (l) => {
  const n = Math.round(Number(l));
  return Number.isFinite(n) ? Math.max(MIN_DUEL_LEVEL, Math.min(MAX_DUEL_LEVEL, n)) : DUEL_PROBLEM_LEVEL;
};

// ── Duel lifecycle budgets ─────────────────────────────────────────────────────
// A live duel must ALWAYS terminate: every room carries a hard deadline enforced by the sweeper
// below, a mid-duel disconnect starts a forfeit grace timer, and an explicit leave forfeits
// immediately. Before these, a stalled/abandoned duel left the opponent waiting forever and the
// room leaked in `rooms` for the life of the process.
const DUEL_COUNTDOWN_MS = 3000;            // synced pre-match countdown (both clients count from duel_start)
const DUEL_PER_PROBLEM_MS = 45000;         // per-problem share of the match budget
const DUEL_DEADLINE_GRACE_MS = 15000;      // slack on top of the per-problem budget
const DUEL_DISCONNECT_FORFEIT_MS = 30000;  // grace to reconnect before a drop forfeits the match
const FRIEND_LOBBY_TTL_MS = 10 * 60 * 1000; // a never-joined lobby code expires after 10 minutes
const BOT_OFFER_SECONDS = 10;              // offer (never force) a practice bot after this wait

// The client-facing view of a room player. room.pN also carries server-only state — socketId,
// problemStartTime, integrityFlags/integrityReason, disconnect timers — which must NEVER ride
// along on a broadcast (the old code emitted the raw objects, leaking anti-cheat state a
// tampering client could use to calibrate against the scorer).
function publicPlayer(p) {
  return {
    id: p.id,
    username: p.username,
    rank: p.rank || null,
    score: p.score,
    progress: p.progress,
    elo: p.elo,
    // Career record for the VS player card (social presence): W-L over rated matches.
    wins: p.wins != null ? p.wins : null,
    matches: p.matches != null ? p.matches : null,
    isBot: !!p.isBot,
    connected: p.connected !== false,
  };
}

// Which side of a room this socket currently drives, or null.
function playerKeyForSocket(room, socket) {
  if (room.p1.socketId === socket.id || (room.p1.id === socket.userId && !room.p1.isBot)) return 'p1';
  if (room.p2.socketId === socket.id || (room.p2.id === socket.userId && !room.p2.isBot)) return 'p2';
  return null;
}

// Positive-only emotes for live duels (presence without toxicity). A fixed allowlist —
// no free text, nothing to moderate — rate-limited per player server-side.
const DUEL_EMOTES = new Set(['👏', '🔥', '🤝', '😅', '🤯']);
const EMOTE_MIN_INTERVAL_MS = 2500;

// Consecutive RANKED rematches are capped so an evenly-matched pair can't sit in a private
// rating-exchange loop all night (the collusion detector watches repeat-pair pumping too — this
// is the polite front door). Casual rematches are uncapped: nothing at stake but pride.
const RANKED_REMATCH_CAP = 2;
function rematchOfferAllowed(room) {
  const p1Human = typeof room.p1.id === 'number' && room.p1.id !== 9999 && !room.p1.isBot;
  const p2Human = typeof room.p2.id === 'number' && room.p2.id !== 9999 && !room.p2.isBot;
  if (!p1Human || !p2Human) return false;
  if (room.isCasual) return true;
  return (room.rematchDepth || 0) < RANKED_REMATCH_CAP;
}

// Forfeit a live duel: the named player takes the loss regardless of score (leaving, or not
// coming back within the disconnect grace). endDuel reads room.forfeitBy to override the
// score-based winner; a cheat verdict on the remaining player still voids their win.
function forfeitDuel(roomId, loserKey, reason) {
  const room = rooms[roomId];
  if (!room || room.finishing) return;
  room.forfeitBy = loserKey;
  room.forfeitReason = reason;
  logger.info(`Duel ${roomId}: ${room[loserKey].username} forfeits (${reason}).`);
  endDuel(roomId);
}

// Pick `count` concepts whose canonical level sits closest to `targetLevel`, favouring a spread of
// categories so a duel isn't all one topic. Drawn from the live catalog (CONCEPT_TO_LEVEL), so every
// strand added to the curriculum automatically widens the level-appropriate pool.
function pickDuelConcepts(targetLevel, count) {
  const all = Object.values(CONCEPT_TO_LEVEL).map((m) => ({ category: m.category, level: m.level }));
  all.sort((a, b) => Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel));
  const pool = all.slice(0, Math.max(count + 3, 6)); // a tight band of the nearest concepts
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const picked = [];
  const usedCats = new Set();
  for (const c of pool) { if (picked.length >= count) break; if (!usedCats.has(c.category)) { picked.push(c); usedCats.add(c.category); } }
  for (const c of pool) { if (picked.length >= count) break; picked.push(c); }
  while (picked.length < count && all.length) picked.push(all[picked.length % all.length]);
  return picked.slice(0, count);
}

// Calculus band and up: prefer the SymPy CAS, which generates UNBOUNDED, verified problems beyond the
// hand-authored catalog's thin upper end (and resists farming). Below this, the catalog's curated
// problems (with vetted distractors) are better.
const CAS_MIN_LEVEL = 31;

// Build a duel room's problem set AT a target level: the FULL problems minus their canonical answers
// for the client to render, plus the answer key kept server-side. The server is the only authority on
// correctness (CLAUDE.md: the client never computes rewards), so answers never leave the server.
// Async because high-level sets come from the SymPy subprocess; it FAILS SOFT to the catalog if the
// CAS is unavailable or returns anything malformed, so a duel always gets a valid set.
async function buildDuelProblemSet(targetLevel = DUEL_PROBLEM_LEVEL, count = 5) {
  const level = clampLevel(targetLevel);

  if (level >= CAS_MIN_LEVEL) {
    try {
      if (await sympyCas.isAvailable()) {
        const r = await sympyCas.generate(level, count);
        const ok = r && r.ok && Array.isArray(r.problems) && r.problems.length === count &&
          r.problems.every((p) => p && typeof p.question === 'string' && p.question.length > 0 &&
            Array.isArray(p.options) && p.options.length >= 2 && p.answer != null);
        if (ok) {
          return {
            // Client-facing problems carry ONLY what's needed to render the question — never the
            // worked solution. The SymPy `explanation` spells the answer in plaintext ("The larger
            // root is -1"), so shipping it with the live problem would defeat the server-authoritative
            // grading a ranked CAS duel exists to enforce. It's kept server-side here and disclosed
            // post-answer (see applyDuelAnswer + the submit_answer ack).
            problems: r.problems.map((p) => ({ question: p.question, options: p.options })),
            answers: r.problems.map((p) => String(p.answer)),
            explanations: r.problems.map((p) => p.explanation || ''),
            // CAS problems are generated beyond the catalog, so they carry no template/concept key
            // to attribute to the learning engine — nulls mean "don't feed" for these rungs.
            templateTypes: r.problems.map(() => null),
            level,
            source: 'cas'
          };
        }
      }
    } catch (e) {
      logger.warn(`[CAS] duel generation failed at level ${level}, falling back to catalog: ${e.message}`);
    }
  }

  // Catalog path (low/mid levels, or CAS fallback).
  const concepts = pickDuelConcepts(level, count);
  const elo = 800 + level * 20; // representative rating so template difficulty tracks the level band
  const full = concepts.map((c, idx) => generateProblem(c.category, c.level, idx, elo));
  // Sent to clients with EVERY answer-leaking field stripped: not just `correctAnswer`, but also
  // `explanation` and `socraticJson` — both contain the answer in plaintext ("= 32", probe text),
  // so leaving them in the live payload would let a tampering client read the answer before
  // submitting. The worked solution is delivered post-answer instead (via the submit_answer ack).
  // eslint-disable-next-line no-unused-vars
  const problems = full.map(({ correctAnswer, explanation, socraticJson, ...rest }) => rest);
  const answers = full.map((p) => p.correctAnswer);       // server-only answer key
  const explanations = full.map((p) => p.explanation || ''); // server-only; revealed post-answer
  const templateTypes = full.map((p) => p.templateType);  // server-only; attributes each answer to the engine
  return { problems, answers, explanations, templateTypes, level, source: 'catalog' };
}

// Grade + record one submitted duel answer SERVER-SIDE and advance the player. Exposed as a named
// function (and exported) so the socket handler stays thin and this — the last formerly
// client-trusted scoring path — is unit-testable without a live socket. Mutates room[playerKey].
// `submitted` is the player's actual answer (selected option / typed value), NOT a self-judged
// boolean: correctness is decided here against the stored canonical answer using the same
// equivalence engine the REST competitive graders use (areEquivalent). Returns { isCorrect, ended }.
function applyDuelAnswer(room, playerKey, { answer }) {
  const now = Date.now();
  const startTime = room[playerKey].problemStartTime || room.startTime || now;
  // room.startTime sits DUEL_COUNTDOWN_MS in the future at match open; clamp so an answer sent
  // during (or "before") the countdown reads as 0ms — i.e. superhuman — instead of a negative
  // elapsed that would slip past the integrity floor.
  const elapsed = Math.max(0, now - startTime);

  // The problem being answered is the one at the player's CURRENT progress (server-tracked), so a
  // client cannot pick which answer key it is graded against, nor replay an earlier problem.
  const maxProblems = room.problems.length;
  const currentIndex = room[playerKey].progress;
  if (currentIndex >= maxProblems) {
    // This player already finished; ignore any further/duplicate submissions (no extra scoring).
    const done = room.p1.progress >= maxProblems && room.p2.progress >= maxProblems;
    return { isCorrect: false, ended: done, correctAnswer: null, explanation: '' };
  }
  const canonical = room.answers ? room.answers[currentIndex] : undefined;
  // The worked solution for THIS problem, kept server-side (never shipped with the live problem).
  const explanation = (room.explanations && room.explanations[currentIndex]) || '';
  const isCorrect = canonical != null && areEquivalent(answer, canonical);

  // Anti-cheat: the SHARED integrityEngine scorer (the same one Puzzle Rush uses) flags a correct
  // answer returned faster than a human could plausibly read + solve at this difficulty. Flags
  // accumulate per player and become a verdict at duel end (resolveDuel).
  const assessment = flagAnswer({ elapsedMs: elapsed, correct: isCorrect, level: room.problemLevel || DUEL_PROBLEM_LEVEL });
  if (assessment.flagged) {
    room[playerKey].integrityFlags = (room[playerKey].integrityFlags || 0) + 1;
    // Surface the first reason so the debrief can tell the player WHY (spec §5: no silent bans).
    if (!room[playerKey].integrityReason) room[playerKey].integrityReason = assessment.reason;
    logger.warn(`[Anti-Cheat] ${room[playerKey].username}: ${assessment.reason}. Flags: ${room[playerKey].integrityFlags}`);
  }

  room[playerKey].problemStartTime = now;
  room[playerKey].progress = currentIndex + 1; // server advances the index; the client's value is ignored
  if (isCorrect) room[playerKey].score += 20;

  const ended = room.p1.progress >= maxProblems && room.p2.progress >= maxProblems;
  // correctAnswer AND the worked `explanation` are returned for the submitting client's post-answer
  // reveal ONLY — sent back after the (now-irreversible) submission, never bundled with the
  // unanswered problem, so neither can be used to cheat the grade. The client uses `explanation`
  // for the reveal + the favorite/archive payload.
  return { isCorrect, ended, correctAnswer: canonical == null ? null : canonical, explanation };
}

function matchmake(queueArray, isRanked) {
  for (let i = 0; i < queueArray.length; i++) {
    const p1 = queueArray[i];
    const elapsed = (Date.now() - p1.joinTime) / 1000;
    const p1IsBeginner = p1.competitiveMatches < 5;

    // Bot fallback is an OFFER, never a force. The old code silently converted the queue into a
    // bot duel at 10s — a player who asked for a human got a practice match without consenting,
    // and two humans joining >10s apart could never pair. Now the server pushes a clearly-labeled
    // offer; the client renders a "face the training bot" button that emits accept_bot.
    if (elapsed >= BOT_OFFER_SECONDS && !p1.botOffered) {
      p1.botOffered = true;
      io.sockets.sockets.get(p1.socketId)?.emit('bot_offer', {
        waitedSeconds: Math.round(elapsed),
        message: 'No opponent yet — face the training bot while you wait? (practice match, rating unchanged)',
      });
    }

    // Try to find a matched human player
    for (let j = i + 1; j < queueArray.length; j++) {
      const p2 = queueArray[j];
      const p2IsBeginner = p2.competitiveMatches < 5;

      const elapsed2 = (Date.now() - p2.joinTime) / 1000;

      // Hidden-MMR pairing: pair on the (μ, σ) belief via the win-probability
      // match-quality gate, not a raw rating-point window. The acceptance floor relaxes with wait time
      // (the longer-waiting of the two drives it) so a fair match forms fast and a looser one still
      // forms before the 10s bot fallback. `elo` is the unified mirror = round(global μ); `sigma` is
      // the global belief uncertainty loaded at queue time.
      const wait = Math.max(elapsed, elapsed2);
      const ratingA = { mu: p1.elo, sigma: p1.sigma != null ? p1.sigma : NRS_SIGMA_INIT };
      const ratingB = { mu: p2.elo, sigma: p2.sigma != null ? p2.sigma : NRS_SIGMA_INIT };

      // Level-fair matchmaking (the core of the duel feature): only pair players whose MATH level is
      // close, so middle-schoolers meet middle-schoolers and advanced students meet advanced ones. The
      // window widens with wait time so a match still forms; the bot fallback is level-matched too.
      const levelWindow = 3 + Math.floor(Math.min(elapsed, elapsed2) / 3) * 2;
      const levelOk = Math.abs((p1.level || DUEL_PROBLEM_LEVEL) - (p2.level || DUEL_PROBLEM_LEVEL)) <= levelWindow;

      let isMatchOk = matchAcceptable(ratingA, ratingB, wait) && levelOk;

      // Beginner protection logic: placement match beginners don't match with veterans unless wait is > 8s
      if (p1IsBeginner !== p2IsBeginner && elapsed < 8 && elapsed2 < 8) {
        isMatchOk = false;
      }

      if (isMatchOk) {
        // Match found!
        queueArray.splice(j, 1); // remove p2
        queueArray.splice(i, 1); // remove p1
        startDuel(p1, p2, isRanked);
        i--;
        break;
      }
    }
  }
}

// Matchmaking + duel-lifecycle sweep. unref() so this timer never keeps the process alive on its
// own (the http server owns process lifetime); also lets test imports exit cleanly.
function startDuelSweeper() {
  setInterval(() => {
    matchmake(rankedQueue, true);
    matchmake(casualQueue, false);

    const now = Date.now();
    // Hard match deadline: a room past its budget is resolved with the scores as they stand.
    // This is the backstop that guarantees no duel (and no `rooms` entry) can live forever.
    for (const roomId of Object.keys(rooms)) {
      const room = rooms[roomId];
      if (room.deadline && now > room.deadline && !room.finishing) {
        logger.info(`Duel ${roomId} hit its match deadline — resolving with current scores.`);
        io.to(roomId).emit('duel_timeout', { message: "Time's up — resolving the match." });
        endDuel(roomId);
      }
    }
    // Expire never-joined friend lobbies so stale 4-digit codes don't accumulate (and can't be
    // squatted): the creator gets a clear expiry event instead of a code that silently rots.
    for (const code of Object.keys(friendRooms)) {
      const lobby = friendRooms[code];
      if (lobby.createdAt && now - lobby.createdAt > FRIEND_LOBBY_TTL_MS) {
        io.sockets.sockets.get(lobby.creatorSocketId)?.emit('friend_room_expired', { roomCode: code });
        delete friendRooms[code];
      }
    }
    // Expire open rematch offers; anyone left waiting hears it explicitly.
    for (const roomId of Object.keys(rematchOffers)) {
      const offer = rematchOffers[roomId];
      if (now > offer.expiresAt) {
        for (const k of ['p1', 'p2']) {
          if (offer.accepted[k]) io.sockets.sockets.get(offer[k].socketId)?.emit('rematch_unavailable', { roomId });
        }
        delete rematchOffers[roomId];
      }
    }
  }, 1500).unref();
}

// Per-socket event budget. Every inbound event spends a token from a small
// bucket that refills continuously; a flood — answer spam, queue join/leave flapping, ack-probe
// loops — is dropped before any handler runs (no DB work, no matchmaking churn). Generous for real
// play: a whole duel is a handful of events.
const SOCKET_EVENT_CAPACITY = 20;
const SOCKET_EVENT_REFILL_PER_SEC = 5;
function spendSocketToken(socket) {
  const now = Date.now();
  const bucket = socket.data.eventBucket || (socket.data.eventBucket = { tokens: SOCKET_EVENT_CAPACITY, at: now });
  bucket.tokens = Math.min(SOCKET_EVENT_CAPACITY, bucket.tokens + ((now - bucket.at) / 1000) * SOCKET_EVENT_REFILL_PER_SEC);
  bucket.at = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function registerConnectionHandlers() {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Drop over-budget packets (not calling next() discards the event). Logged once per burst.
    socket.use((packet, next) => {
      if (spendSocketToken(socket)) {
        socket.data.rateLimited = false;
        return next();
      }
      if (!socket.data.rateLimited) {
        socket.data.rateLimited = true;
        logger.warn(`[socket] event flood from user ${socket.userId} (${socket.id}); dropping '${packet && packet[0]}'`);
      }
    });

    // Live-room liveness: a member subscribes to its room channel so REST state changes (a player
    // joined, the host started, someone scored, the host ended it) push an instant "refetch" ping.
    // The ping carries no game state — clients re-GET /api/live-rooms/:id — so there's no answer-key
    // leak or trust surface; sockets only collapse poll latency.
    socket.on('join_live_room', (data) => {
      const roomId = data && (data.roomId != null ? data.roomId : data.room);
      if (roomId != null) socket.join('live:' + roomId);
    });
    socket.on('leave_live_room', (data) => {
      const roomId = data && (data.roomId != null ? data.roomId : data.room);
      if (roomId != null) socket.leave('live:' + roomId);
    });

    socket.on('join_queue', (data) => {
      const userId = socket.userId;
      const username = socket.username;
      const mode = (data && data.mode) === 'casual' ? 'casual' : 'ranked';

      // LEFT JOIN the authoritative global rating so we can pair on the (μ, σ) belief (hidden MMR), not
      // just the denormalised users.elo mirror. `sigma` defaults wide for players with no rating row yet.
      db.get(
        `SELECT u.elo, u.competitive_rank, u.arena_wins, u.competitive_matches, u.telemetry_enabled, u.level, r.sigma
           FROM users u
           LEFT JOIN user_ratings r ON r.user_id = u.id AND r.domain = 'global'
          WHERE u.id = ?`,
        [userId],
        (err, row) => {
        const elo = row ? (row.elo || 1000) : 1000;
        // The COMPETITIVE rank (what a duel opponent should see), not the level/progression rank.
        const rank = row ? (row.competitive_rank || 'Unranked (Placement: 0/5)') : 'Unranked (Placement: 0/5)';
        const wins = row ? (row.arena_wins || 0) : 0;
        const competitiveMatches = row ? (row.competitive_matches || 0) : 0;
        const level = row ? (row.level || DUEL_PROBLEM_LEVEL) : DUEL_PROBLEM_LEVEL;
        const sigma = row && row.sigma != null ? row.sigma : NRS_SIGMA_INIT;

        // Ranked requires fair-play consent so the integrity scorer may run (no opt-out cheating).
        if (mode === 'ranked') {
          const gateError = rankedMatchmakingError(row ? row.telemetry_enabled : 0);
          if (gateError) {
            socket.emit('matchmaking_error', gateError);
            logger.info(`User ${username} blocked from RANKED queue: no fair-play consent.`);
            return;
          }
        }

        // A player already in a live duel can't queue for another — finish or forfeit first.
        // (Without this, a second match could start against a player mid-game, corrupting both.)
        // If their side of that room is DISCONNECTED (they bailed and came back to the arena),
        // queueing is an implicit walk-away: forfeit the old match and let them queue fresh.
        const activeRoom = Object.values(rooms).find(
          (r) => (r.p1.id === userId && !r.p1.isBot) || (r.p2.id === userId && !r.p2.isBot)
        );
        if (activeRoom) {
          const key = activeRoom.p1.id === userId ? 'p1' : 'p2';
          if (activeRoom[key].connected === false) {
            forfeitDuel(activeRoom.roomId, key, 'abandoned for a new queue');
          } else {
            socket.emit('matchmaking_error', {
              code: 'ALREADY_IN_MATCH',
              message: 'You are already in a live match. Finish it (or leave it) before queueing again.',
            });
            return;
          }
        }

        // remove duplicates from both queues
        const cleanQueue = (q) => {
          const idx = q.findIndex(item => item.userId === userId);
          if (idx !== -1) q.splice(idx, 1);
        };
        cleanQueue(rankedQueue);
        cleanQueue(casualQueue);

        const playerInfo = {
          socketId: socket.id,
          userId,
          username,
          rank,
          elo,
          sigma,
          wins,
          competitiveMatches,
          level,
          joinTime: Date.now()
        };

        if (mode === 'casual') {
          casualQueue.push(playerInfo);
          logger.info(`User ${username} joined CASUAL Arena queue. Elo: ${elo}`);
        } else {
          rankedQueue.push(playerInfo);
          logger.info(`User ${username} joined RANKED Arena queue. Elo: ${elo}`);
        }
      });
    });

    socket.on('leave_queue', () => {
      const cleanQueue = (q) => {
        const idx = q.findIndex(item => item.socketId === socket.id);
        if (idx !== -1) {
          logger.info(`User ${q[idx].username} left Arena queue.`);
          q.splice(idx, 1);
        }
      };
      cleanQueue(rankedQueue);
      cleanQueue(casualQueue);
    });

    // Client requests current status + problems when loading DuelGameScreen. Also the RECONNECT
    // path: a player whose socket dropped mid-duel re-emits this on reconnect — we re-bind their
    // (new) socket id to their side of the room, cancel the forfeit grace timer, and tell the
    // opponent they're back. Payloads are sanitized via publicPlayer (no anti-cheat state leaks).
    socket.on('join_duel_room', (data) => {
      const { roomId } = data || {};
      const room = rooms[roomId];
      if (!room) {
        // The duel is gone (already resolved, or expired). Tell the client instead of leaving it
        // on an infinite "waiting for the arena" spinner.
        socket.emit('duel_room_gone', { roomId: roomId || null });
        return;
      }

      socket.join(roomId);
      const key = playerKeyForSocket(room, socket);
      if (key) {
        const wasDisconnected = room[key].connected === false;
        room[key].socketId = socket.id;
        room[key].connected = true;
        if (room[key].disconnectTimer) {
          clearTimeout(room[key].disconnectTimer);
          room[key].disconnectTimer = null;
        }
        if (wasDisconnected) {
          socket.to(roomId).emit('opponent_reconnected', { userId: room[key].id });
          logger.info(`${room[key].username} reconnected to duel ${roomId}`);
        }
      }

      socket.emit('room_status', {
        p1: publicPlayer(room.p1),
        p2: publicPlayer(room.p2),
        problems: room.problems,
        // Countdown/deadline sync: relative offsets, so client clock skew doesn't matter.
        startsInMs: Math.max(0, (room.startTime || 0) - Date.now()),
        remainingMs: room.deadline ? Math.max(0, room.deadline - Date.now()) : null,
        ranked: !room.isCasual,
      });
      logger.info(`Socket ${socket.id} joined duel room ${roomId}`);
    });

    // Explicit mid-duel exit (back button / "leave match"): an immediate forfeit, so the opponent
    // gets the win right away instead of waiting out a disconnect grace or the match deadline.
    socket.on('leave_duel', (data) => {
      const { roomId } = data || {};
      const room = rooms[roomId];
      if (!room) return;
      const key = playerKeyForSocket(room, socket);
      if (key) forfeitDuel(roomId, key, 'left the match');
    });

    // Process-death rejoin: "do I have a live match?" — asked by the arena on entry so a player
    // whose app died mid-duel gets a "return to your match" prompt instead of losing it blind
    // (the disconnect grace is still ticking; rejoining cancels the forfeit).
    socket.on('find_my_duel', (ack) => {
      if (typeof ack !== 'function') return;
      const room = Object.values(rooms).find(
        (r) => !r.finishing && ((r.p1.id === socket.userId && !r.p1.isBot) || (r.p2.id === socket.userId && !r.p2.isBot))
      );
      if (!room) return ack({ roomId: null });
      const meIsP1 = room.p1.id === socket.userId;
      const opp = meIsP1 ? room.p2 : room.p1;
      ack({
        roomId: room.roomId,
        opponentName: opp.username,
        opponentRank: opp.rank || null,
        ranked: !room.isCasual,
      });
    });

    // Positive-only duel emotes: fixed allowlist (nothing to moderate), server-side rate limit,
    // relayed only to the opponent (the sender renders their own locally).
    socket.on('duel_emote', (data) => {
      const { roomId, emote } = data || {};
      const room = rooms[roomId];
      if (!room || room.finishing || !DUEL_EMOTES.has(emote)) return;
      const key = playerKeyForSocket(room, socket);
      if (!key) return;
      const now = Date.now();
      if (room[key].lastEmoteAt && now - room[key].lastEmoteAt < EMOTE_MIN_INTERVAL_MS) return;
      room[key].lastEmoteAt = now;
      socket.to(roomId).emit('opponent_emote', { emote });
    });

    // Rematch: one tap on the result screen. First accepter notifies the other side; when both
    // have accepted (within the window) a fresh duel starts — same pairing, same stakes, new set.
    socket.on('request_rematch', (data) => {
      const { roomId } = data || {};
      const offer = rematchOffers[roomId];
      if (!offer || Date.now() > offer.expiresAt) {
        socket.emit('rematch_unavailable', { roomId: roomId || null });
        return;
      }
      const meKey = offer.p1.userId === socket.userId ? 'p1' : offer.p2.userId === socket.userId ? 'p2' : null;
      if (!meKey) return;
      const otherKey = meKey === 'p1' ? 'p2' : 'p1';
      offer[meKey].socketId = socket.id; // rebind in case this socket reconnected since the match
      offer.accepted[meKey] = true;

      if (offer.accepted[otherKey]) {
        delete rematchOffers[roomId];
        startRematch(offer);
      } else {
        socket.emit('rematch_pending', { roomId });
        io.sockets.sockets.get(offer[otherKey].socketId)?.emit('rematch_requested', {
          roomId,
          byUsername: offer[meKey].username,
        });
      }
    });

    // Accept the matchmaking bot offer: leave the queue and start a clearly-labeled practice duel
    // (rating-neutral — finalizeDuel only moves rating for human-vs-human ranked).
    socket.on('accept_bot', () => {
      const take = (q, isRanked) => {
        const idx = q.findIndex((item) => item.socketId === socket.id);
        if (idx === -1) return false;
        const [player] = q.splice(idx, 1);
        startDuelWithBot(player, isRanked);
        return true;
      };
      if (!take(rankedQueue, true)) take(casualQueue, false);
    });

    // Create lobby code for friend battle
    socket.on('create_friend_room', (data) => {
      const userId = socket.userId;
      const username = socket.username;
    
      db.get("SELECT elo, rank, level FROM users WHERE id = ?", [userId], (err, row) => {
        const elo = row ? (row.elo || 1000) : 1000;
        const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
        const level = row ? (row.level || DUEL_PROBLEM_LEVEL) : DUEL_PROBLEM_LEVEL;

        // Pick a code not currently in use (a blind 4-digit draw could silently overwrite — and
        // orphan — someone else's open lobby).
        let code;
        do {
          code = Math.floor(1000 + Math.random() * 9000).toString();
        } while (friendRooms[code]);
        friendRooms[code] = {
          creatorSocketId: socket.id,
          userId,
          username,
          rank,
          elo,
          level,
          createdAt: Date.now()
        };
      
        socket.join(code);
        socket.emit('friend_room_created', { roomCode: code });
        logger.info(`Friend Room ${code} created by ${username}`);
      });
    });

    // Join friend battle code lobby
    socket.on('join_friend_room', (data) => {
      const { roomCode } = data;
      const userId = socket.userId;
      const username = socket.username;
    
      const lobby = friendRooms[roomCode];
      if (!lobby) {
        socket.emit('friend_room_error', { message: 'Room code not found or expired.' });
        return;
      }
      if (lobby.userId === userId) {
        socket.emit('friend_room_error', { message: "That's your own lobby code — share it with a friend instead." });
        return;
      }

      db.get("SELECT elo, rank, level FROM users WHERE id = ?", [userId], async (err, row) => {
        const elo = row ? (row.elo || 1000) : 1000;
        const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
        const level = row ? (row.level || DUEL_PROBLEM_LEVEL) : DUEL_PROBLEM_LEVEL;

        socket.join(roomCode);
        logger.info(`Friend Room ${roomCode} joined by ${username}`);

        // Start friend duel immediately (treated as casual, no Elo cost), at the two friends' shared level.
        const duelLevel = clampLevel(((lobby.level || DUEL_PROBLEM_LEVEL) + level) / 2);
        let set;
        try {
          set = await buildDuelProblemSet(duelLevel);
        } catch (e) {
          logger.error(`friend duel: failed to build problem set: ${e.message}`);
          socket.emit('friend_room_error', { message: 'Could not start the duel — please try again.' });
          return;
        }

        const roomId = `friend_duel_${roomCode}_${Date.now()}`;
        openDuelRoom(
          roomId,
          { id: lobby.userId, username: lobby.username, rank: lobby.rank, score: 0, progress: 0, elo: lobby.elo, socketId: lobby.creatorSocketId },
          { id: userId, username, rank, score: 0, progress: 0, elo, socketId: socket.id },
          set,
          true // friend duels are casual: no rating at stake
        );

        delete friendRooms[roomCode];
      });
    });

    socket.on('submit_answer', (data, ack) => {
      // The client now sends its ACTUAL answer (selected option / typed value), not a self-judged
      // boolean — the server grades it against the canonical answer it kept (see applyDuelAnswer).
      const { roomId, answer } = data || {};
      const userId = socket.userId;
      const room = rooms[roomId];
      if (!room) { if (typeof ack === 'function') ack({ error: 'room_not_found' }); return; }

      let playerKey = null;
      if (room.p1.id === userId) playerKey = 'p1';
      else if (room.p2.id === userId) playerKey = 'p2';
      if (!playerKey) { if (typeof ack === 'function') ack({ error: 'not_a_player' }); return; }

      // The index of the problem being graded — captured BEFORE applyDuelAnswer advances progress.
      const answeredIndex = room[playerKey].progress;
      const { isCorrect, ended, correctAnswer, explanation } = applyDuelAnswer(room, playerKey, { answer });

      // Feed the graded answer into the learning engine (fire-and-forget) so realtime duels now
      // strengthen mastery/retention/Growth Insights too. Catalog rungs carry a template type;
      // CAS-generated high-level rungs are null and skipped. Never for the bot (id 9999).
      const conceptKey = room.templateTypes && room.templateTypes[answeredIndex];
      if (conceptKey && userId !== 9999) {
        feedEngineOutcome(db, userId, conceptKey, {
          correct: isCorrect,
          correctAnswer,
          wrongAnswer: isCorrect ? null : answer,
        });
      }

      // Tell the submitting client the server's verdict + the canonical answer + the worked solution
      // so it can drive its reveal animation and its favorite/archive payload (safe: all disclosed
      // only AFTER the irreversible submission, never bundled with the unanswered problem).
      if (typeof ack === 'function') ack({ correct: isCorrect, correctAnswer, explanation });

      // Broadcast update (sanitized: never the raw room objects — they carry anti-cheat state).
      io.to(roomId).emit('room_status', {
        p1: publicPlayer(room.p1),
        p2: publicPlayer(room.p2)
      });

      if (ended) endDuel(roomId);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      const cleanQueue = (q) => {
        const idx = q.findIndex(item => item.socketId === socket.id);
        if (idx !== -1) q.splice(idx, 1);
      };
      cleanQueue(rankedQueue);
      cleanQueue(casualQueue);

      // Clean up friend codes creator lobbies
      for (const code in friendRooms) {
        if (friendRooms[code].creatorSocketId === socket.id) {
          delete friendRooms[code];
        }
      }

      // A player leaving the result screen kills any open rematch offer they were part of — the
      // other side hears it immediately instead of waiting out the window.
      for (const roomId of Object.keys(rematchOffers)) {
        const offer = rematchOffers[roomId];
        const key = offer.p1.socketId === socket.id ? 'p1' : offer.p2.socketId === socket.id ? 'p2' : null;
        if (key) {
          const other = key === 'p1' ? offer.p2 : offer.p1;
          io.sockets.sockets.get(other.socketId)?.emit('rematch_unavailable', { roomId });
          delete rematchOffers[roomId];
        }
      }

      // Mid-duel drop: mark the player disconnected, tell the opponent, and start the forfeit
      // grace timer. Reconnecting (join_duel_room) within the grace re-binds and cancels it.
      // Before this, a drop left the opponent staring at a frozen match forever and leaked the room.
      for (const roomId of Object.keys(rooms)) {
        const room = rooms[roomId];
        if (room.finishing) continue;
        const key = room.p1.socketId === socket.id ? 'p1' : room.p2.socketId === socket.id ? 'p2' : null;
        if (!key) continue;
        const player = room[key];
        player.connected = false;
        socket.to(roomId).emit('opponent_disconnected', {
          userId: player.id,
          graceMs: DUEL_DISCONNECT_FORFEIT_MS,
        });
        logger.info(`${player.username} disconnected mid-duel ${roomId}; forfeit in ${DUEL_DISCONNECT_FORFEIT_MS / 1000}s unless they return.`);
        if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
        player.disconnectTimer = setTimeout(() => {
          player.disconnectTimer = null;
          forfeitDuel(roomId, key, 'connection lost');
        }, DUEL_DISCONNECT_FORFEIT_MS);
        player.disconnectTimer.unref?.();
      }
    });
  });
}

// Register a live room — synced countdown, hard deadline, socket binding — and emit the
// sanitized duel_start. The single construction path for matchmade, bot, and friend duels, so
// every duel gets the same lifecycle guarantees (deadline sweep, disconnect forfeit, reconnect).
function openDuelRoom(roomId, p1, p2, set, isCasual) {
  const startTime = Date.now() + DUEL_COUNTDOWN_MS;
  const matchMs = set.problems.length * DUEL_PER_PROBLEM_MS + DUEL_DEADLINE_GRACE_MS;
  rooms[roomId] = {
    roomId,
    p1,
    p2,
    problems: set.problems,
    answers: set.answers,
    explanations: set.explanations,
    templateTypes: set.templateTypes,
    isCasual,
    startTime,
    deadline: startTime + matchMs,
    problemLevel: set.level,
  };
  if (p1.socketId) io.sockets.sockets.get(p1.socketId)?.join(roomId);
  if (p2.socketId) io.sockets.sockets.get(p2.socketId)?.join(roomId);
  io.to(roomId).emit('duel_start', {
    roomId,
    opponent: { p1: publicPlayer(p1), p2: publicPlayer(p2) },
    problems: set.problems,
    countdownMs: DUEL_COUNTDOWN_MS,
    matchMs,
    ranked: !isCasual,
  });
  return rooms[roomId];
}

async function startDuel(p1, p2, isRanked) {
  const roomId = `duel_${p1.userId}_${p2.userId}_${Date.now()}`;
  // The shared duel level: the average of the two (matchmaking-paired, so already close) levels.
  const duelLevel = clampLevel(((p1.level || DUEL_PROBLEM_LEVEL) + (p2.level || DUEL_PROBLEM_LEVEL)) / 2);
  let set;
  try {
    set = await buildDuelProblemSet(duelLevel);
  } catch (e) {
    logger.error(`startDuel: failed to build problem set: ${e.message}`);
    const err = { code: 'MATCH_START_FAILED', message: 'Could not start the match — please queue again.' };
    io.sockets.sockets.get(p1.socketId)?.emit('matchmaking_error', err);
    io.sockets.sockets.get(p2.socketId)?.emit('matchmaking_error', err);
    return;
  }

  openDuelRoom(
    roomId,
    { id: p1.userId, username: p1.username, rank: p1.rank, score: 0, progress: 0, elo: p1.elo, wins: p1.wins, matches: p1.competitiveMatches, socketId: p1.socketId },
    { id: p2.userId, username: p2.username, rank: p2.rank, score: 0, progress: 0, elo: p2.elo, wins: p2.wins, matches: p2.competitiveMatches, socketId: p2.socketId },
    set,
    !isRanked
  );
  logger.info(`Duel started: ${p1.username} (L${p1.level}) vs ${p2.username} (L${p2.level}) at level ${duelLevel}. Ranked: ${isRanked}`);
}

// Start the agreed rematch: same two players, same casual/ranked stakes, fresh problem set at the
// same level. Rating (if ranked) settles against each side's CURRENT post-match belief — the
// commit path always reads fresh rating rows, so nothing stale carries over.
async function startRematch(offer) {
  // Guard: if either player slipped into another live match meanwhile, don't double-book them.
  const busy = Object.values(rooms).find((r) =>
    [offer.p1.userId, offer.p2.userId].some((id) => (r.p1.id === id && !r.p1.isBot) || (r.p2.id === id && !r.p2.isBot))
  );
  const notifyBoth = (event, payload) => {
    io.sockets.sockets.get(offer.p1.socketId)?.emit(event, payload);
    io.sockets.sockets.get(offer.p2.socketId)?.emit(event, payload);
  };
  if (busy) {
    notifyBoth('rematch_unavailable', { reason: 'opponent already in another match' });
    return;
  }

  const roomId = `duel_${offer.p1.userId}_${offer.p2.userId}_${Date.now()}`;
  let set;
  try {
    set = await buildDuelProblemSet(offer.level || DUEL_PROBLEM_LEVEL);
  } catch (e) {
    logger.error(`startRematch: failed to build problem set: ${e.message}`);
    notifyBoth('matchmaking_error', { code: 'MATCH_START_FAILED', message: 'Could not start the rematch — please queue again.' });
    return;
  }

  const room = openDuelRoom(
    roomId,
    { id: offer.p1.userId, username: offer.p1.username, rank: offer.p1.rank, score: 0, progress: 0, elo: offer.p1.elo, socketId: offer.p1.socketId },
    { id: offer.p2.userId, username: offer.p2.username, rank: offer.p2.rank, score: 0, progress: 0, elo: offer.p2.elo, socketId: offer.p2.socketId },
    set,
    offer.isCasual
  );
  // Chain depth feeds the ranked-rematch cap (rematchOfferAllowed) when THIS match ends.
  room.rematchDepth = (offer.rematchDepth || 0) + 1;
  logger.info(`Rematch started: ${offer.p1.username} vs ${offer.p2.username}. Casual: ${offer.isCasual}, depth: ${room.rematchDepth}`);
}

async function startDuelWithBot(player, isRanked) {
  const roomId = `duel_bot_${player.userId}_${Date.now()}`;
  const duelLevel = clampLevel(player.level || DUEL_PROBLEM_LEVEL); // bot problems match the player's level
  let set;
  try {
    set = await buildDuelProblemSet(duelLevel);
  } catch (e) {
    logger.error(`startDuelWithBot: failed to build problem set: ${e.message}`);
    io.sockets.sockets.get(player.socketId)?.emit('matchmaking_error', { code: 'MATCH_START_FAILED', message: 'Could not start the match — please queue again.' });
    return;
  }

  // Create Bot with rating close to user
  const botElo = Math.max(100, player.elo - 50 + Math.floor(Math.random() * 100));

  openDuelRoom(
    roomId,
    { id: player.userId, username: player.username, rank: player.rank, score: 0, progress: 0, elo: player.elo, wins: player.wins, matches: player.competitiveMatches, socketId: player.socketId },
    { id: 9999, username: 'MathBot', rank: 'MathBot', score: 0, progress: 0, elo: botElo, isBot: true },
    set,
    !isRanked
  );

  simulateBot(roomId);
  logger.info(`Duel started with Bot for user ${player.username}. Ranked: ${isRanked}`);
}

function simulateBot(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  let currentProblem = 0;
  let timer = null;
  const tick = () => {
    const activeRoom = rooms[roomId];
    if (!activeRoom || activeRoom.finishing) {
      if (timer) clearInterval(timer);
      return;
    }

    currentProblem += 1;
    activeRoom.p2.progress = currentProblem;
    // Accuracy scales with the duel's level (≈65% at beginner rungs up to 90% at the top), so a
    // high-level "calibrated AI" doesn't quietly play like a coin-flipping beginner.
    const accuracy = Math.min(0.9, 0.62 + (activeRoom.problemLevel || DUEL_PROBLEM_LEVEL) * 0.006);
    if (Math.random() < accuracy) {
      activeRoom.p2.score += 20;
    }

    io.to(roomId).emit('room_status', {
      p1: publicPlayer(activeRoom.p1),
      p2: publicPlayer(activeRoom.p2)
    });

    if (currentProblem >= activeRoom.problems.length) {
      clearInterval(timer);
      if (activeRoom.p1.progress >= activeRoom.problems.length) {
        endDuel(roomId);
      }
    }
  };
  // The bot respects the pre-match countdown (it used to start solving during the intro,
  // giving it a head start no human could have). Its thinking time also scales with the duel's
  // difficulty — a flat 3–5s "solve" at calculus level read as obviously fake (and unfair).
  const thinkMs = 2500 + (room.problemLevel || DUEL_PROBLEM_LEVEL) * 250;
  setTimeout(() => {
    if (!rooms[roomId] || rooms[roomId].finishing) return;
    timer = setInterval(tick, thinkMs + Math.random() * 2000);
    timer.unref?.();
  }, DUEL_COUNTDOWN_MS).unref?.();
}

// Commit one player's duel result. RATING is updated through the unified NRS path
// (applyDuelResultToRatings → user_ratings + the users.* mirror) and ONLY when `ratingMoves` (ranked
// human-vs-human). Coins/wins/solved_count are independent of rating. Note: this no longer writes
// users.rank — that stays the level/progression rank; competitive rank lives in competitive_rank,
// refreshed by the mirror. (docs/Rating.md)
// The duel's dominant math domain, from its concept mix — so a ranked duel credits the contested
// per-domain rating, not just global. Returns null for an unattributable set (e.g.
// CAS-generated rungs carry no concept key).
function duelDomain(templateTypes) {
  if (!Array.isArray(templateTypes)) return null;
  const counts = {};
  for (const t of templateTypes) {
    const meta = t && CONCEPT_TO_LEVEL[t];
    if (!meta || !meta.category) continue;
    const d = categoryToDomain(meta.category);
    counts[d] = (counts[d] || 0) + 1;
  }
  let best = null;
  let bestN = 0;
  for (const [d, n] of Object.entries(counts)) if (n > bestN) { best = d; bestN = n; }
  return best;
}

function processPlayerDuelResult(userId, opts, callback) {
  const { isWinner, ratingMoves, outcome, opponentMu, opponentSigma, domain = null, coinMultiplier = 1, solvedCount = 5 } = opts;
  if (!userId || typeof userId !== 'number' || userId === 9999) {
    return callback(null, { ratingDelta: 0, newElo: 0, newDisplayRating: 0, newRank: 'MathBot' });
  }

  const finishWrites = (after) => {
    const coinGain = isWinner ? 50 * coinMultiplier : 0;
    db.run(
      "UPDATE users SET coins = coins + ?, arena_wins = arena_wins + ?, solved_count = solved_count + ? WHERE id = ?",
      [coinGain, isWinner ? 1 : 0, solvedCount, userId],
      (coinErr) => {
        if (!coinErr) recordCoins('live_duel', coinGain);
        // Read the (possibly just-synced) mirror so the debrief shows the unified competitive rank.
        db.get('SELECT elo, competitive_rank FROM users WHERE id = ?', [userId], (e, row) => {
          const newRank = (row && row.competitive_rank) || 'Unranked (Placement: 0/5)';
          const newElo = row && row.elo != null ? row.elo : 1000;
          // Any solve in the match keeps today's streak alive (idempotent per local day).
          (solvedCount > 0 ? creditStreak(userId) : Promise.resolve()).then(() => updateAchievements(userId, () => {
            grantRankRewards(userId, newRank, () => {
              callback(null, {
                ratingDelta: after ? +after.delta.toFixed(1) : 0,
                newElo,
                newDisplayRating: after ? after.displayRating : null,
                newRank,
                promoted: after ? !!after.promoted : false,
                previousRank: after ? after.previousRank : null,
              });
            });
          }));
        });
      }
    );
  };

  if (ratingMoves) {
    applyDuelResultToRatings({ userId, opponentMu, opponentSigma, outcome, domain }, (err, after) => finishWrites(err ? null : after));
  } else {
    finishWrites(null);
  }
}

// Look up a player's behavioral-telemetry opt-in. Integrity scoring is behavioral profiling, so
// per spec §5 it only runs for players who have enabled telemetry. Returns false for a null/bot
// id (never assessed); a real user's stored flag otherwise. NOTE: telemetry is opt-in (off by
// default), so timing enforcement only kicks in for players who have turned it on — ranked play
// should nudge competitors to enable it (see the spec's ethics note).
function getTelemetryEnabled(userId, cb) {
  if (!userId || typeof userId !== 'number' || userId === 9999) return cb(false);
  db.get('SELECT telemetry_enabled FROM users WHERE id = ?', [userId], (err, row) => {
    if (err || !row) return cb(false);
    cb(row.telemetry_enabled === 1);
  });
}

// Finish a duel: resolve winner + Elo + integrity verdicts via the SHARED integrityEngine scorer
// (lib/duelIntegrity.resolveDuel — the same scorer Puzzle Rush uses), then commit. `done` is an
// optional completion callback (used by tests; production socket callers omit it).
function endDuel(roomId, done) {
  const room = rooms[roomId];
  if (!room) { if (done) done(); return; }
  // Re-entrancy guard: the last answer, a forfeit, the disconnect grace and the deadline sweep
  // can all race to end the same room — only the first one commits (no double rating/rewards).
  if (room.finishing) { if (done) done(); return; }
  room.finishing = true;
  for (const k of ['p1', 'p2']) {
    if (room[k].disconnectTimer) {
      clearTimeout(room[k].disconnectTimer);
      room[k].disconnectTimer = null;
    }
  }

  const p2IsBot = room.p2.id === 9999 || room.p2.isBot;
  const p1IsHuman = typeof room.p1.id === 'number' && room.p1.id !== 9999;
  const p2IsHuman = typeof room.p2.id === 'number' && !p2IsBot;

  getTelemetryEnabled(p1IsHuman ? room.p1.id : null, (p1IntegrityEnabled) => {
    getTelemetryEnabled(p2IsHuman ? room.p2.id : null, (p2IntegrityEnabled) => {
      const resolution = resolveDuel({
        p1Score: room.p1.score,
        p2Score: room.p2.score,
        p1Rating: room.p1.elo || 1000,
        p2Rating: room.p2.elo || 1000,
        p1FlaggedCount: room.p1.integrityFlags || 0,
        p2FlaggedCount: room.p2.integrityFlags || 0,
        p1IntegrityEnabled,
        p2IntegrityEnabled,
        p2IsBot,
        isCasual: !!room.isCasual,
      });

      // Map the pure 'p1'/'p2'/null winner back to a userId for the emit + DB commit.
      let winner = null;
      if (resolution.winner === 'p1') winner = room.p1.id;
      else if (resolution.winner === 'p2') winner = room.p2.id;

      // A forfeit (explicit leave / unreturned disconnect) overrides the score-based outcome:
      // the remaining player takes the win — unless their own cheat verdict voids it.
      if (room.forfeitBy) {
        const stayKey = room.forfeitBy === 'p1' ? 'p2' : 'p1';
        const stayerCheated = stayKey === 'p1' ? resolution.p1Cheated : resolution.p2Cheated;
        winner = stayerCheated ? null : room[stayKey].id;
      }

      // Surface WHY a flagged player was disqualified (spec §5: no silent shadow-bans). The
      // reason rides along on room.pN (spread into the duel_end payload) for the client debrief.
      if (resolution.p1Cheated) {
        room.p1.cheated = true;
        room.p1.integrityReason = room.p1.integrityReason || 'superhuman answer timing';
        securityLog(room.p1.id, 'ARENA_DUEL_CHEATING_DISQUALIFIED', null, `${room.p1.username} disqualified: ${room.p1.integrityReason} (${room.p1.integrityFlags || 0} flags).`);
      }
      if (resolution.p2Cheated) {
        room.p2.cheated = true;
        room.p2.integrityReason = room.p2.integrityReason || 'superhuman answer timing';
        securityLog(room.p2.id, 'ARENA_DUEL_CHEATING_DISQUALIFIED', null, `${room.p2.username} disqualified: ${room.p2.integrityReason} (${room.p2.integrityFlags || 0} flags).`);
      }

      // Rating is now resolved inside finalizeDuel via the unified NRS path (resolveDuel still owns
      // the winner + integrity verdict + forfeit; its Elo numbers are no longer used).
      finalizeDuel(roomId, room, winner, p2IsBot, done);
    });
  });
}

// Commit a resolved duel: quest increment, challenge tickets, the unified rating + reward writes
// (processPlayerDuelResult), then emit duel_end and free the room. Rating moves ONLY for a ranked
// human-vs-human duel — bots and casual stay rating-neutral. See docs/Rating.md.
function finalizeDuel(roomId, room, winner, p2IsBot, done) {
  // Increment duels_today in user_quests for human players — after the daily reset check, so a duel
  // finished just past local midnight counts toward today's quest instead of being wiped.
  if (room.p1.id && typeof room.p1.id === 'number') bumpArenaQuest(room.p1.id);
  if (room.p2.id && typeof room.p2.id === 'number' && room.p2.id !== 9999) bumpArenaQuest(room.p2.id);

  const p1IsHuman = typeof room.p1.id === 'number' && room.p1.id !== 9999;
  const p2IsHuman = typeof room.p2.id === 'number' && !p2IsBot;
  // Only a ranked human-vs-human duel moves the competitive rating (this also closes the bot-Elo-farm
  // — practising against a bot can no longer inflate your number).
  const ratingMoves = !room.isCasual && p1IsHuman && p2IsHuman;

  // Outcome per player (1 win / 0.5 draw / 0 loss). A cheat verdict forces a loss (resolveDuel has
  // already flipped `winner` to the clean opponent; this also covers a double-DQ → both lose).
  const outcomeFor = (id, cheated) => (cheated ? 0 : winner === id ? 1 : winner === null ? 0.5 : 0);
  const p1Outcome = outcomeFor(room.p1.id, room.p1.cheated);
  const p2Outcome = outcomeFor(room.p2.id, room.p2.cheated);

  // The contested domain (from the duel's concept mix) — credited alongside global so per-domain
  // ranks climb from real competition, not only solo play.
  const contestedDomain = duelDomain(room.templateTypes);

  let p1HasTicket = false;
  let p2HasTicket = false;

  db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_challenge_ticket'", [room.p1.id], (errT1, rowT1) => {
    if (!errT1 && rowT1 && rowT1.quantity > 0) {
      p1HasTicket = true;
    }

    db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_challenge_ticket'", [room.p2.id], (errT2, rowT2) => {
      if (!errT2 && rowT2 && rowT2.quantity > 0) {
        p2HasTicket = true;
      }

      // Challenge tickets used to double the Elo swing; under the unified rating they double the
      // WINNER's coin reward instead (doubling a mu delta is ill-defined). Consumed on a ranked duel.
      const p1CoinMult = p1HasTicket && !room.isCasual ? 2 : 1;
      const p2CoinMult = p2HasTicket && !room.isCasual && !p2IsBot ? 2 : 1;

      // Fetch BOTH players' pre-duel global ratings up front, so each is scored against the other's
      // rating as it stood before the match (one simultaneous update, no order dependence).
      const withRatings = (cb) => {
        if (!ratingMoves) return cb(undefined, undefined);
        getRatingRow(room.p1.id, 'global', (e1, r1) => {
          getRatingRow(room.p2.id, 'global', (e2, r2) => cb(r1, r2));
        });
      };

      withRatings((r1, r2) => {
        const proceed = () => {
          processPlayerDuelResult(room.p1.id, {
            isWinner: winner === room.p1.id,
            ratingMoves,
            outcome: p1Outcome,
            opponentMu: r2 ? r2.mu : undefined,
            opponentSigma: r2 ? r2.sigma : undefined,
            domain: contestedDomain,
            coinMultiplier: p1CoinMult,
            solvedCount: room.p1.progress || 0,
          }, (err1, p1Res) => {
            processPlayerDuelResult(room.p2.id, {
              isWinner: winner === room.p2.id,
              ratingMoves,
              outcome: p2Outcome,
              opponentMu: r1 ? r1.mu : undefined,
              opponentSigma: r1 ? r1.sigma : undefined,
              domain: contestedDomain,
              coinMultiplier: p2CoinMult,
              solvedCount: room.p2.progress || 0,
            }, (err2, p2Res) => {
              // duel_end payloads start from the SANITIZED player view (publicPlayer) — the raw
              // room objects carry integrity flags, socket ids and timers that never leave the server.
              const p1Data = {
                ...publicPlayer(room.p1),
                ratingMoved: ratingMoves,
                ratingDelta: p1Res.ratingDelta,
                newElo: p1Res.newElo,
                newDisplayRating: p1Res.newDisplayRating,
                newRank: p1Res.newRank,
                promoted: p1Res.promoted || false,
                cheated: room.p1.cheated || false,
                // Ethics (spec §5, no silent bans): a disqualified player is told WHY.
                integrityReason: room.p1.cheated ? room.p1.integrityReason || null : null,
                ticketUsed: p1HasTicket && !room.isCasual,
              };

              const p2Data = {
                ...publicPlayer(room.p2),
                ratingMoved: ratingMoves,
                ratingDelta: p2IsBot ? 0 : p2Res.ratingDelta,
                newElo: p2IsBot ? 0 : p2Res.newElo,
                newDisplayRating: p2IsBot ? null : p2Res.newDisplayRating,
                newRank: p2IsBot ? 'MathBot' : p2Res.newRank,
                promoted: p2IsBot ? false : (p2Res.promoted || false),
                cheated: room.p2.cheated || false,
                integrityReason: room.p2.cheated ? room.p2.integrityReason || null : null,
                ticketUsed: p2HasTicket && !room.isCasual && !p2IsBot,
              };

              // Record the match for each human player's history (best-effort; never blocks the end).
              if (p1IsHuman) {
                recordMatch(db, {
                  userId: room.p1.id, mode: 'duel',
                  opponentId: p2IsHuman ? room.p2.id : null, opponentName: room.p2.username,
                  myScore: room.p1.score, oppScore: room.p2.score,
                  result: winner === room.p1.id ? 'win' : winner === null ? 'draw' : 'loss',
                  ratingDelta: p1Res.ratingDelta || 0,
                });
              }
              if (p2IsHuman) {
                recordMatch(db, {
                  userId: room.p2.id, mode: 'duel',
                  opponentId: room.p1.id, opponentName: room.p1.username,
                  myScore: room.p2.score, oppScore: room.p1.score,
                  result: winner === room.p2.id ? 'win' : winner === null ? 'draw' : 'loss',
                  ratingDelta: p2Res.ratingDelta || 0,
                });
              }

              // Open the rematch window (human-vs-human; ranked chains capped): both players are
              // on the result screen right now — "run it back" should be one tap, not a re-queue.
              const rematchAvailable = rematchOfferAllowed(room);
              if (rematchAvailable) {
                rematchOffers[roomId] = {
                  p1: { userId: room.p1.id, username: room.p1.username, rank: p1Res.newRank, elo: p1Res.newElo, socketId: room.p1.socketId },
                  p2: { userId: room.p2.id, username: room.p2.username, rank: p2Res.newRank, elo: p2Res.newElo, socketId: room.p2.socketId },
                  isCasual: !!room.isCasual,
                  level: room.problemLevel,
                  rematchDepth: room.rematchDepth || 0,
                  accepted: {},
                  expiresAt: Date.now() + REMATCH_WINDOW_MS,
                };
              }

              io.to(roomId).emit('duel_end', {
                winnerId: winner,
                winner,
                // Explicit draw flag: winnerId is null on a draw, and JSON null is easy to
                // mis-parse client-side (it hung the old result screen). `draw` is unambiguous.
                draw: winner === null,
                forfeit: room.forfeitBy
                  ? { userId: room[room.forfeitBy].id, reason: room.forfeitReason || 'left the match' }
                  : null,
                rematchAvailable,
                rematchWindowMs: rematchAvailable ? REMATCH_WINDOW_MS : 0,
                p1: p1Data,
                p2: p2Data,
                isCasual: room.isCasual || false,
              });
              delete rooms[roomId];
              if (done) done();
            });
          });
        };

        // Consume tickets (ranked only), then commit.
        let pendingTasks = 0;
        if (p1HasTicket && !room.isCasual) {
          pendingTasks++;
          db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_challenge_ticket'", [room.p1.id], () => {
            pendingTasks--;
            if (pendingTasks === 0) proceed();
          });
        }
        if (p2HasTicket && !room.isCasual && !p2IsBot) {
          pendingTasks++;
          db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_challenge_ticket'", [room.p2.id], () => {
            pendingTasks--;
            if (pendingTasks === 0) proceed();
          });
        }

        if (pendingTasks === 0) {
          proceed();
        }
      });
    });
  });
}

let attached = false;

/**
 * Wire the duel engine onto a Socket.IO server (idempotent). Returns the engine functions the
 * integration tests drive directly (server.js re-exports them).
 */
function attachDuels(ioInstance) {
  if (!attached) {
    io = ioInstance;
    registerSocketAuth();
    registerConnectionHandlers();
    startDuelSweeper();
    attached = true;
  }
  return { rooms, endDuel, forfeitDuel, applyDuelAnswer, buildDuelProblemSet, pickDuelConcepts, publicPlayer, rematchOfferAllowed };
}

module.exports = { attachDuels };
