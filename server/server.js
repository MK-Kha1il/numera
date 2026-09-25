require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { db, initDb } = require('./db');
const { runMigrations } = require('./migrations');

// Centralized config + extracted cross-cutting middleware (see config.js, middleware/).
// server.js is bootstrap only: app/middleware wiring, router mounts, DB init, and attaching the
// Socket.IO duel engine (socket/duels.js). ALL REST domains live under routes/*, their helpers
// under services/* and lib/*.
const { PORT, EXTRA_CORS_ORIGINS, TRUST_PROXY } = require('./config');
const { securityHeaders, sanitizeServerErrors } = require('./middleware/security');
const { globalRateLimiter } = require('./middleware/rateLimit');
const { attachDuels } = require('./socket/duels');

const app = express();

// Behind a reverse proxy, trust the configured number of forwarding hops so `req.ip` (and thus
// every per-IP rate limiter) sees the real client address rather than the proxy's. Off by
// default (see config.js / TRUST_PROXY) so dev keeps the raw socket IP.
if (TRUST_PROXY !== false) {
  app.set('trust proxy', TRUST_PROXY);
}

// CORS: same-origin + an env-configured allow-list. Requests with no Origin header
// (native mobile clients, server-to-server) are permitted; browser origins must match.
const allowedOrigins = new Set(EXTRA_CORS_ORIGINS);
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(null, false);
    },
  })
);
app.use(express.json({ limit: '10kb' })); // Restrict JSON payloads to 10KB to protect against body overflow/DDoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Defense-in-depth HTTP security headers (see middleware/security.js).
app.use(securityHeaders);

// Sanitize any 5xx error body so internal/DB details never reach the client (ultra review #71).
app.use(sanitizeServerErrors);

// Global per-IP API rate limiting (100 requests / minute). Loopback/LAN exempt.
app.use(globalRateLimiter(100, 60000));

// Feature routers extracted from this file (incremental decomposition — see docs/Architecture.md).
// Each router declares its own full /api/... paths and imports its own deps.
app.use(require('./routes/health'));
app.use(require('./routes/notifications'));
app.use(require('./routes/srs'));
app.use(require('./routes/library'));
app.use(require('./routes/mistakes'));
app.use(require('./routes/leaderboard'));
app.use(require('./routes/auth'));
app.use(require('./routes/quests'));
app.use(require('./routes/today'));
app.use(require('./routes/crash'));
app.use(require('./routes/feedback'));
app.use(require('./routes/analytics'));
app.use(require('./routes/classes'));
app.use(require('./routes/dailyPuzzle'));
app.use(require('./routes/shop'));
// account.js is mounted here (ahead of the inline /api/user/:userId route) so its specific
// /api/user/* paths win over the param route — fixes prior shadowing of sessions/security-logs.
app.use(require('./routes/account'));
app.use(require('./routes/friends'));
app.use(require('./routes/moderation'));
app.use(require('./routes/discussion'));
app.use(require('./routes/clubs'));
app.use(require('./routes/clubWars'));
app.use(require('./routes/achievements'));
const logger = require('./logger');
app.use(require('./routes/engine'));
app.use(require('./routes/masteryMap'));
app.use(require('./routes/assessment'));
app.use(require('./routes/onboarding'));
app.use(require('./routes/archive'));
app.use(require('./routes/league'));
app.use(require('./routes/commitment'));
app.use(require('./routes/math'));
app.use(require('./routes/levels'));
app.use(require('./routes/transfer'));
app.use(require('./routes/rating'));
app.use(require('./routes/puzzleRush'));
app.use(require('./routes/asyncDuel'));
app.use(require('./routes/botDuel'));
app.use(require('./routes/reasoningDuel'));
app.use(require('./routes/challenges'));
app.use(require('./routes/worksheet'));
app.use(require('./routes/learn'));
app.use(require('./routes/tournaments'));
app.use(require('./routes/liveRoom'));
app.use(require('./routes/publicProfilePage'));
app.use(require('./routes/cas'));
// publicProfile owns /api/user/:userId — mount LAST so it doesn't shadow account.js routes.
app.use(require('./routes/publicProfile'));

// Landing page + APK download (routes/landing.js). Its live-duel counter reads this getter.
app.use(require('./routes/landing'));

// Initialize Database, then apply any pending versioned migrations.
// `ready` resolves once the schema is initialized + migrated; tests await it before
// issuing requests. In standalone mode a failure is fatal.
const { startRetentionSweeper } = require('./services/retention');
const { startLifecycleSweeper } = require('./services/lifecycleJobs');
const ready = initDb()
  .then(() => runMigrations(db))
  .then(() => {
    // Background timers run only as a real server — tests use throwaway DBs and drive the
    // sweeps directly. Retention purges old IP-bearing logs; lifecycle re-engages lapsed users.
    if (require.main === module) {
      startRetentionSweeper(db);
      startLifecycleSweeper(db);
    }
  })
  .catch(err => {
    logger.error("Database initialization failed:", err);
    if (require.main === module) process.exit(1);
    throw err;
  });

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });
// Expose io to HTTP routes (read at request time via req.app.get('io')) so REST handlers can push
// lightweight "refetch" pings to socket rooms — e.g. live-room liveness (routes/liveRoom.js) — without
// the routes importing server.js (which would be a require cycle).
app.set('io', io);

// Live duels (Socket.IO auth, matchmaking, the duel lifecycle) live in socket/duels.js.
const { rooms, endDuel, forfeitDuel, applyDuelAnswer, buildDuelProblemSet, pickDuelConcepts, publicPlayer, rematchOfferAllowed } =
  attachDuels(io);
app.set('activeDuelRooms', () => Object.keys(rooms).length);

// Start Server — only when run directly (`node server.js`). When imported by tests the
// app/server/io/db are exported instead so the test harness controls the lifecycle.
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
  });
}

// `rooms` + `endDuel` are exported for the duel integration test (test/duelEndToEnd.test.js),
// which drives a finished duel through the real rating/reward commit without a live socket.
module.exports = { app, server, io, db, ready, rooms, endDuel, forfeitDuel, applyDuelAnswer, buildDuelProblemSet, pickDuelConcepts, publicPlayer, rematchOfferAllowed };
