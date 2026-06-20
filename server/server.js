require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, initDb } = require('./db');
const { runMigrations } = require('./migrations');
const { generateProblem, CONCEPT_TO_LEVEL } = require('./mathGenerator'); // duel/bot socket problem generation
const { feedEngineOutcome } = require('./services/engineFeed'); // feed graded duel answers into the learning engine
const { areEquivalent } = require('./mathEngine/answerEquivalence'); // server-authoritative duel grading
const sympyCas = require('./mathEngine/cas/sympyClient'); // optional SymPy CAS for high-level duel problems

// Centralized config + extracted cross-cutting middleware (see config.js, middleware/).
// NOTE: server.js is now just bootstrap (app/middleware wiring + router mounts) and the
// Socket.IO duel/matchmaking logic; ALL REST domains live under routes/*, their helpers
// under services/* and lib/*.
const { JWT_SECRET, PORT, EXTRA_CORS_ORIGINS, TRUST_PROXY } = require('./config');
const { securityHeaders, sanitizeServerErrors, securityLog } = require('./middleware/security');
const { globalRateLimiter } = require('./middleware/rateLimit');
// Rating unification: ranked duels feed the SAME per-domain NRS rating as solo play, via the shared
// service (the old K=32 duel-Elo that independently wrote users.elo is retired). See
// docs/specs/Spec-RatingUnification.md.
const { applyDuelResultToRatings, getRatingRow } = require('./services/ratingService');
const { recordMatch } = require('./services/matchLog');
const { categoryToDomain, matchAcceptable, SIGMA_INIT: NRS_SIGMA_INIT } = require('./mathEngine/ratingEngine'); // attribute a duel to its dominant domain; hidden-MMR pairing gate
const { updateAchievements } = require('./services/achievementService');
const { grantRankRewards } = require('./services/rankRewardService');
const { flagAnswer, resolveDuel, rankedMatchmakingError } = require('./lib/duelIntegrity');

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
app.use(require('./routes/notifications'));
app.use(require('./routes/srs'));
app.use(require('./routes/library'));
app.use(require('./routes/mistakes'));
app.use(require('./routes/leaderboard'));
app.use(require('./routes/auth'));
app.use(require('./routes/quests'));
app.use(require('./routes/today'));
app.use(require('./routes/crash'));
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
app.use(require('./routes/assessment'));
app.use(require('./routes/onboarding'));
app.use(require('./routes/archive'));
app.use(require('./routes/league'));
app.use(require('./routes/commitment'));
app.use(require('./routes/math'));
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
app.use(require('./routes/cas'));
// publicProfile owns /api/user/:userId — mount LAST so it doesn't shadow account.js routes.
app.use(require('./routes/publicProfile'));

// Landing Page & Status Dashboard
app.get('/', (req, res) => {
  db.get("SELECT COUNT(*) AS count FROM users", (err, rowUsers) => {
    const userCount = rowUsers ? rowUsers.count : 0;
    db.get("SELECT COUNT(*) AS count FROM archive_exercises", (err2, rowPuzzles) => {
      const puzzleCount = rowPuzzles ? rowPuzzles.count : 0;
      const roomsCount = Object.keys(rooms).length;
      
      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Numera — The competitive home of math</title>
    <meta name="description" content="Numera is a competitive math platform with a tutor's brain — it adapts to how you think, teaches the why behind every concept, and is private by design: no ads, no trackers, no data sold.">
    <meta property="og:title" content="Numera — The competitive home of math">
    <meta property="og:description" content="Adaptive math practice that watches how you think. Concept-first lessons, live duels, and privacy by design.">
    <meta property="og:type" content="website">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #090a15;
            --card-bg: rgba(25, 27, 54, 0.45);
            --primary: #c72cff;
            --secondary: #00f0ff;
            --accent: #ff007f;
            --text: #ffffff;
            --text-muted: #8b8ea8;
            --border: rgba(199, 44, 255, 0.25);
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Outfit', sans-serif;
            background: radial-gradient(circle at 50% 0%, #15103a 0%, var(--bg) 70%);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow-x: hidden;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 30px;
        }
        header {
            text-align: center;
            position: relative;
        }
        .glow-title {
            font-size: 3.5rem;
            font-weight: 800;
            letter-spacing: 2px;
            background: linear-gradient(135deg, var(--secondary) 0%, var(--primary) 50%, var(--accent) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            filter: drop-shadow(0 2px 20px rgba(199, 44, 255, 0.4));
            margin-bottom: 5px;
        }
        .subtitle {
            font-size: 1.2rem;
            color: var(--text-muted);
            font-weight: 300;
        }
        .pulse-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(0, 240, 255, 0.1);
            border: 1px solid rgba(0, 240, 255, 0.3);
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--secondary);
            margin-top: 15px;
        }
        .pulse-dot {
            width: 8px;
            height: 8px;
            background-color: var(--secondary);
            border-radius: 50%;
            box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.7);
            animation: pulse 1.6s infinite;
        }
        @keyframes pulse {
            0% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.7);
            }
            70% {
                transform: scale(1);
                box-shadow: 0 0 0 10px rgba(0, 240, 255, 0);
            }
            100% {
                transform: scale(0.95);
                box-shadow: 0 0 0 0 rgba(0, 240, 255, 0);
            }
        }
        .glass-card {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 24px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        }
        .glass-card:hover {
            border-color: rgba(0, 240, 255, 0.4);
            box-shadow: 0 25px 50px rgba(0, 240, 255, 0.1);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .stat-box {
            text-align: center;
            padding: 20px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
        }
        .stat-value {
            font-size: 2.2rem;
            font-weight: 800;
            color: var(--secondary);
            font-family: 'JetBrains Mono', monospace;
            margin-bottom: 5px;
        }
        .stat-label {
            font-size: 0.9rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .action-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
        }
        .download-btn {
            background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
            border: none;
            color: white;
            padding: 16px 36px;
            font-size: 1.1rem;
            font-weight: 700;
            border-radius: 50px;
            cursor: pointer;
            box-shadow: 0 10px 25px rgba(255, 0, 127, 0.35);
            transition: all 0.25s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 12px;
        }
        .download-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 30px rgba(255, 0, 127, 0.5);
        }
        .download-btn:active {
            transform: translateY(-1px);
        }
        .endpoints-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
        }
        .endpoints-table th {
            text-align: left;
            padding: 12px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.1);
            color: var(--secondary);
        }
        .endpoints-table td {
            padding: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .method-tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
            color: white;
        }
        .method-get { background: #00cd66; }
        .method-post { background: #ff8c00; }
        footer {
            text-align: center;
            font-size: 0.85rem;
            color: var(--text-muted);
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1 class="glow-title">NUMERA</h1>
            <p class="subtitle">Where math becomes a sport you actually want to practice.</p>
            <div class="pulse-badge">
                <div class="pulse-dot"></div>
                PRIVACY-FIRST · FREE TO LEARN
            </div>
        </header>

        <section style="text-align: center; max-width: 720px; margin: 0 auto;">
            <p style="font-size: 1.15rem; color: var(--text); line-height: 1.65;">
                Numera is a competitive math platform with a tutor's brain. It watches <em>how</em> you
                think &mdash; not just whether you're right &mdash; and adapts every problem, lesson, and
                hint to you. Then it lets you put those skills to the test in the arena.
            </p>
        </section>

        <section class="stats-grid">
            <div class="glass-card">
                <h3 style="color: var(--secondary); margin-bottom: 8px;">🧠 An engine that learns you</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
                    Adaptive difficulty, misconception diagnosis, Socratic hints, and spaced review &mdash;
                    it pinpoints <em>why</em> you slipped and targets the fix.
                </p>
            </div>
            <div class="glass-card">
                <h3 style="color: var(--secondary); margin-bottom: 8px;">💡 Understand, don't just drill</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
                    Concept-first lessons, faded worked examples, and interactive manipulatives build the
                    intuition behind every rule &mdash; not just the steps.
                </p>
            </div>
            <div class="glass-card">
                <h3 style="color: var(--secondary); margin-bottom: 8px;">⚔️ Compete for real</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
                    Live duels, tournaments, puzzle rush, and a real skill rating &mdash; the thrill that
                    keeps you coming back, with anti-cheat built in.
                </p>
            </div>
            <div class="glass-card">
                <h3 style="color: var(--secondary); margin-bottom: 8px;">🔒 Private by design</h3>
                <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
                    No ads. No third-party trackers. No data sold. The math runs on our own servers, never
                    shared with any AI or advertiser.
                </p>
            </div>
        </section>

        <section class="glass-card" style="border-color: rgba(0, 240, 255, 0.4); text-align: center;">
            <h2 style="font-weight: 700; margin-bottom: 12px;">🛡️ A learning app parents can actually trust</h2>
            <p style="color: var(--text-muted); max-width: 640px; margin: 0 auto; font-size: 1rem; line-height: 1.6;">
                Most "free" kids' apps pay the bills by harvesting data. Numera doesn't. There are no ad SDKs,
                no analytics trackers, and nothing about your child is sold or handed to a third party. You can
                export everything we hold &mdash; or delete the account and erase all of it &mdash; at any time.
            </p>
            <p style="margin-top: 16px; font-size: 0.95rem;">
                <a href="/learn" style="color: var(--secondary); font-weight: 600; text-decoration: none;">
                    📚 Browse free concept lessons &rarr;
                </a>
                <span style="color: var(--text-muted); font-size: 0.85rem;"> &middot; </span>
                <a href="/worksheet" style="color: var(--secondary); font-weight: 600; text-decoration: none;">
                    🖨️ Print practice worksheets &rarr;
                </a>
                <span style="color: var(--text-muted); font-size: 0.85rem;"> &mdash; no sign-up needed</span>
            </p>
        </section>

        <main class="glass-card">
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">${userCount}</div>
                    <div class="stat-label">Active Learners</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${puzzleCount}</div>
                    <div class="stat-label">Famous Puzzles</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${roomsCount}</div>
                    <div class="stat-label">Live Duels</div>
                </div>
            </div>
        </main>

        <section class="glass-card action-area">
            <h2 style="font-weight: 700; margin-bottom: 5px;">Start learning &mdash; free</h2>
            <p style="color: var(--text-muted); text-align: center; max-width: 500px; font-size: 0.95rem;">
                Install the Android app and solve your first problem in under a minute. No account required to
                try it &mdash; jump straight in as a guest and save your progress whenever you're ready.
            </p>
            <a href="/download-apk" class="download-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                DOWNLOAD CLIENT APK
            </a>
        </section>

        <section class="glass-card">
            <h2 style="font-weight: 600; margin-bottom: 15px; color: var(--text);">For developers · API</h2>
            <div style="overflow-x: auto;">
                <table class="endpoints-table">
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="method-tag method-post">POST</span></td>
                            <td>/api/auth/register</td>
                            <td>Create a new user account & acquire JWT token</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-post">POST</span></td>
                            <td>/api/auth/login</td>
                            <td>Sign in to account & check daily streak</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/auth/me</td>
                            <td>Get active user stats (XP, level, coins, badge)</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/math/problems</td>
                            <td>Fetch procedurally generated math problems</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/math/srs/due</td>
                            <td>List active Spaced Repetition (SRS) items</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-post">POST</span></td>
                            <td>/api/math/srs/review</td>
                            <td>Submit SuperMemo SM-2 SRS rating reviews</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/legacy/puzzles</td>
                            <td>Fetch preloaded historical math exercise inventory</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/shop</td>
                            <td>Fetch items in store and ownership list</td>
                        </tr>
                        <tr>
                            <td><span class="method-tag method-get">GET</span></td>
                            <td>/api/leaderboard</td>
                            <td>Fetch global top 20 rank ladder board</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <footer>
            <p>Numera © 2026 · Built with Jetpack Compose & Node.js WebSockets</p>
        </footer>
    </div>
</body>
</html>
      `);
    });
  });
});

// Download APK route
app.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk');
  res.download(apkPath, 'numera-quest.apk', (err) => {
    if (err) {
      if (!res.headersSent) {
        res.status(404).send('APK is still compiling or not found. Please compile using Gradle first.');
      } else {
        logger.error('Download interrupted or aborted by client:', err.message);
      }
    }
  });
});

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

// authenticateToken is imported from ./middleware/auth (stateful JWT + session check).

// Achievements Progression Calculation Helper
// updateAchievements imported from ./services/achievementService

// getArchiveTemplateType, checkTipSafety, attachTipToProblem imported from ./services/tipService


// getUserWithMastery + checkAndResetQuestsAndLeagues imported from ./services/userService

// AUTH endpoints (/api/auth/*) + sendLoginResponse moved to routes/auth.js

// Helper to update consistency climb, max climb, burnout risk, and index
// updateCommitmentAndBurnout + unlockRelic moved to services/commitmentService.js
// Commitment endpoints (/api/commitment/*) moved to routes/commitment.js

// calculateRank, calculateRankFromElo, getRankValue, normalizeLevelForGenerator
// are imported from ./lib/progression (pure utilities).

// grantRankRewards moved to services/rankRewardService.js

// Math endpoints (/api/math/problems, /telemetry, /calculator/log, /complete) moved to routes/math.js

// assessmentQuestions + /api/assessment/* moved to routes/assessment.js


// SRS endpoints (/api/math/srs/*) moved to routes/srs.js

// -------------------------------------------------------------
// LEGACY PUZZLES & PUBLIC USER ENDPOINTS
// -------------------------------------------------------------

// Legacy puzzles + /api/user/:userId + archive/search moved to
// routes/{archive,publicProfile}.js

// Mistakes Bank endpoints (/api/mistakes*) moved to routes/mistakes.js

// Fetch user daily quests standings
// Quests endpoints (/api/quests*) moved to routes/quests.js

// Daily puzzle endpoints (/api/math/daily-puzzle*) moved to routes/dailyPuzzle.js

// League leaderboard (/api/league/leaderboard) moved to routes/league.js

// -------------------------------------------------------------
// SHOP & INVENTORY ENDPOINTS
// -------------------------------------------------------------

// Shop & inventory endpoints (/api/shop*) moved to routes/shop.js

// -------------------------------------------------------------
// USER SETTINGS ENDPOINTS
// -------------------------------------------------------------

// Account endpoints (/api/user/settings|change-*|privacy|sessions|security-logs|
// export-data|delete-account) + /api/admin/security-logs moved to routes/account.js
// (mounted ahead of /api/user/:userId so they are not shadowed).

// -------------------------------------------------------------
// FRIENDS ENDPOINTS
// -------------------------------------------------------------

// Friends endpoints (/api/friends*) moved to routes/friends.js
// Achievements endpoints (/api/achievements*) moved to routes/achievements.js

// Favorites + collections endpoints (/api/favorites*, /api/collections*) moved to routes/library.js

// /api/user/:userId/public-collections moved to routes/publicProfile.js

// Notifications endpoints (/api/notifications*) moved to routes/notifications.js

// =====================================================================
// MATHEMATICAL LEARNING INTELLIGENCE ENGINE — API Endpoints
// =====================================================================

// POST /api/engine/event
// Core telemetry hook: record every answer event and update all engine models
// Intelligence Engine endpoints (/api/engine/*) moved to routes/engine.js


// =====================================================================
// END INTELLIGENCE ENGINE
// =====================================================================

// =============================================================
// NumeraRating System (NRS) endpoints (/api/rating/*) + their internal helpers moved to
// routes/rating.js

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// JWT middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.userId = decoded.id;
    socket.username = decoded.username;
    next();
  });
});

const rankedQueue = []; // ranked matchmaking queue: [{ socketId, userId, username, rank, elo, competitiveMatches, joinTime }]
const casualQueue = []; // casual matchmaking queue
const rooms = {}; // active rooms: { roomId: { p1, p2, problems, isCasual, startTime, problemLevel } }
const friendRooms = {}; // code lobby rooms: { code: { creatorSocketId, userId, username, rank, elo } }

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
  const elapsed = now - startTime;

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

    // Bot fallback: after 10 seconds of queuing, match with a bot
    if (elapsed >= 10.0) {
      queueArray.splice(i, 1);
      startDuelWithBot(p1, isRanked);
      i--;
      continue;
    }

    // Try to find a matched human player
    for (let j = i + 1; j < queueArray.length; j++) {
      const p2 = queueArray[j];
      const p2IsBeginner = p2.competitiveMatches < 5;

      const elapsed2 = (Date.now() - p2.joinTime) / 1000;

      // Hidden-MMR pairing (audit Top-25 #11): pair on the (μ, σ) belief via the win-probability
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

// Matchmaking intervals. unref() so this timer never keeps the process alive on its
// own (the http server owns process lifetime); also lets test imports exit cleanly.
setInterval(() => {
  matchmake(rankedQueue, true);
  matchmake(casualQueue, false);
}, 1500).unref();

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_queue', (data) => {
    const userId = socket.userId;
    const username = socket.username;
    const mode = (data && data.mode) === 'casual' ? 'casual' : 'ranked';

    // LEFT JOIN the authoritative global rating so we can pair on the (μ, σ) belief (hidden MMR), not
    // just the denormalised users.elo mirror. `sigma` defaults wide for players with no rating row yet.
    db.get(
      `SELECT u.elo, u.rank, u.competitive_matches, u.telemetry_enabled, u.level, r.sigma
         FROM users u
         LEFT JOIN user_ratings r ON r.user_id = u.id AND r.domain = 'global'
        WHERE u.id = ?`,
      [userId],
      (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
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

  // Client requests current status + problems when loading DuelGameScreen
  socket.on('join_duel_room', (data) => {
    const { roomId } = data;
    const room = rooms[roomId];
    if (room) {
      socket.join(roomId);
      socket.emit('room_status', {
        p1: room.p1,
        p2: room.p2,
        problems: room.problems
      });
      logger.info(`Socket ${socket.id} joined duel room ${roomId}`);
    }
  });

  // Create lobby code for friend battle
  socket.on('create_friend_room', (data) => {
    const userId = socket.userId;
    const username = socket.username;
    
    db.get("SELECT elo, rank, level FROM users WHERE id = ?", [userId], (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
      const level = row ? (row.level || DUEL_PROBLEM_LEVEL) : DUEL_PROBLEM_LEVEL;

      const code = Math.floor(1000 + Math.random() * 9000).toString();
      friendRooms[code] = {
        creatorSocketId: socket.id,
        userId,
        username,
        rank,
        elo,
        level
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

    db.get("SELECT elo, rank, level FROM users WHERE id = ?", [userId], async (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
      const level = row ? (row.level || DUEL_PROBLEM_LEVEL) : DUEL_PROBLEM_LEVEL;

      socket.join(roomCode);
      logger.info(`Friend Room ${roomCode} joined by ${username}`);

      // Start friend duel immediately (treated as casual, no Elo cost), at the two friends' shared level.
      const duelLevel = clampLevel(((lobby.level || DUEL_PROBLEM_LEVEL) + level) / 2);
      let problems, answers, explanations, templateTypes;
      try {
        ({ problems, answers, explanations, templateTypes } = await buildDuelProblemSet(duelLevel));
      } catch (e) {
        logger.error(`friend duel: failed to build problem set: ${e.message}`);
        return;
      }

      const roomId = `friend_duel_${roomCode}_${Date.now()}`;
      rooms[roomId] = {
        roomId,
        p1: { id: lobby.userId, username: lobby.username, score: 0, progress: 0, elo: lobby.elo },
        p2: { id: userId, username: username, score: 0, progress: 0, elo: elo },
        problems,
        answers,
        explanations,
        templateTypes,
        isCasual: true,
        startTime: Date.now(),
        problemLevel: duelLevel
      };

      // Join both sockets to the real gameplay roomId
      const creatorSocket = io.sockets.sockets.get(lobby.creatorSocketId);
      creatorSocket?.join(roomId);
      socket.join(roomId);

      // Trigger match start
      io.to(roomId).emit('duel_start', {
        roomId,
        opponent: { p1: rooms[roomId].p1, p2: rooms[roomId].p2 },
        problems
      });

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

    // Broadcast update
    io.to(roomId).emit('room_status', {
      p1: room.p1,
      p2: room.p2
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
  });
});

async function startDuel(p1, p2, isRanked) {
  const roomId = `duel_${p1.userId}_${p2.userId}_${Date.now()}`;
  // The shared duel level: the average of the two (matchmaking-paired, so already close) levels.
  const duelLevel = clampLevel(((p1.level || DUEL_PROBLEM_LEVEL) + (p2.level || DUEL_PROBLEM_LEVEL)) / 2);
  let problems, answers, explanations, templateTypes;
  try {
    ({ problems, answers, explanations, templateTypes } = await buildDuelProblemSet(duelLevel));
  } catch (e) {
    logger.error(`startDuel: failed to build problem set: ${e.message}`);
    return;
  }

  rooms[roomId] = {
    roomId,
    p1: { id: p1.userId, username: p1.username, score: 0, progress: 0, elo: p1.elo },
    p2: { id: p2.userId, username: p2.username, score: 0, progress: 0, elo: p2.elo },
    problems,
    answers,
    explanations,
    templateTypes,
    isCasual: !isRanked,
    startTime: Date.now(),
    problemLevel: duelLevel
  };

  io.sockets.sockets.get(p1.socketId)?.join(roomId);
  io.sockets.sockets.get(p2.socketId)?.join(roomId);

  io.to(roomId).emit('duel_start', {
    roomId,
    opponent: { p1: rooms[roomId].p1, p2: rooms[roomId].p2 },
    problems
  });
  logger.info(`Duel started: ${p1.username} (L${p1.level}) vs ${p2.username} (L${p2.level}) at level ${duelLevel}. Ranked: ${isRanked}`);
}

async function startDuelWithBot(player, isRanked) {
  const roomId = `duel_bot_${player.userId}_${Date.now()}`;
  const duelLevel = clampLevel(player.level || DUEL_PROBLEM_LEVEL); // bot problems match the player's level
  let problems, answers, explanations, templateTypes;
  try {
    ({ problems, answers, explanations, templateTypes } = await buildDuelProblemSet(duelLevel));
  } catch (e) {
    logger.error(`startDuelWithBot: failed to build problem set: ${e.message}`);
    return;
  }

  // Create Bot with rating close to user
  const botElo = Math.max(100, player.elo - 50 + Math.floor(Math.random() * 100));

  rooms[roomId] = {
    roomId,
    p1: { id: player.userId, username: player.username, score: 0, progress: 0, elo: player.elo },
    p2: { id: 9999, username: 'MathBot', score: 0, progress: 0, elo: botElo, isBot: true },
    problems,
    answers,
    explanations,
    templateTypes,
    isCasual: !isRanked,
    startTime: Date.now(),
    problemLevel: duelLevel
  };

  const socket = io.sockets.sockets.get(player.socketId);
  socket?.join(roomId);

  socket?.emit('duel_start', {
    roomId,
    opponent: { p1: rooms[roomId].p1, p2: rooms[roomId].p2 },
    problems
  });

  simulateBot(roomId);
  logger.info(`Duel started with Bot for user ${player.username}. Ranked: ${isRanked}`);
}

function simulateBot(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  let currentProblem = 0;
  const timer = setInterval(() => {
    const activeRoom = rooms[roomId];
    if (!activeRoom) {
      clearInterval(timer);
      return;
    }

    currentProblem += 1;
    activeRoom.p2.progress = currentProblem;
    // 80% accuracy
    if (Math.random() < 0.8) {
      activeRoom.p2.score += 20;
    }

    io.to(roomId).emit('room_status', {
      p1: activeRoom.p1,
      p2: activeRoom.p2
    });

    if (currentProblem >= activeRoom.problems.length) {
      clearInterval(timer);
      if (activeRoom.p1.progress >= activeRoom.problems.length) {
        endDuel(roomId);
      }
    }
  }, 3000 + Math.random() * 2000);
}

// Commit one player's duel result. RATING is updated through the unified NRS path
// (applyDuelResultToRatings → user_ratings + the users.* mirror) and ONLY when `ratingMoves` (ranked
// human-vs-human). Coins/wins/solved_count are independent of rating. Note: this no longer writes
// users.rank — that stays the level/progression rank; competitive rank lives in competitive_rank,
// refreshed by the mirror. (docs/specs/Spec-RatingUnification.md)
// The duel's dominant math domain, from its concept mix — so a ranked duel credits the contested
// per-domain rating (audit #16/#45), not just global. Returns null for an unattributable set (e.g.
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
  const { isWinner, ratingMoves, outcome, opponentMu, opponentSigma, domain = null, coinMultiplier = 1 } = opts;
  if (!userId || typeof userId !== 'number' || userId === 9999) {
    return callback(null, { ratingDelta: 0, newElo: 0, newDisplayRating: 0, newRank: 'MathBot' });
  }

  const finishWrites = (after) => {
    const coinGain = isWinner ? 50 * coinMultiplier : 0;
    db.run(
      "UPDATE users SET coins = coins + ?, arena_wins = arena_wins + ?, solved_count = solved_count + 5 WHERE id = ?",
      [coinGain, isWinner ? 1 : 0, userId],
      () => {
        // Read the (possibly just-synced) mirror so the debrief shows the unified competitive rank.
        db.get('SELECT elo, competitive_rank FROM users WHERE id = ?', [userId], (e, row) => {
          const newRank = (row && row.competitive_rank) || 'Unranked (Placement: 0/5)';
          const newElo = row && row.elo != null ? row.elo : 1000;
          updateAchievements(userId, () => {
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
          });
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
// human-vs-human duel — bots and casual stay rating-neutral. See docs/specs/Spec-RatingUnification.md.
function finalizeDuel(roomId, room, winner, p2IsBot, done) {
  // Increment duels_today in user_quests for human players
  if (room.p1.id && typeof room.p1.id === 'number') {
    db.run("UPDATE user_quests SET duels_today = duels_today + 1 WHERE user_id = ?", [room.p1.id]);
  }
  if (room.p2.id && typeof room.p2.id === 'number' && room.p2.id !== 9999) {
    db.run("UPDATE user_quests SET duels_today = duels_today + 1 WHERE user_id = ?", [room.p2.id]);
  }

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
          }, (err1, p1Res) => {
            processPlayerDuelResult(room.p2.id, {
              isWinner: winner === room.p2.id,
              ratingMoves,
              outcome: p2Outcome,
              opponentMu: r1 ? r1.mu : undefined,
              opponentSigma: r1 ? r1.sigma : undefined,
              domain: contestedDomain,
              coinMultiplier: p2CoinMult,
            }, (err2, p2Res) => {
              const p1Data = {
                ...room.p1,
                ratingMoved: ratingMoves,
                ratingDelta: p1Res.ratingDelta,
                newElo: p1Res.newElo,
                newDisplayRating: p1Res.newDisplayRating,
                newRank: p1Res.newRank,
                promoted: p1Res.promoted || false,
                cheated: room.p1.cheated || false,
                ticketUsed: p1HasTicket && !room.isCasual,
              };

              const p2Data = {
                ...room.p2,
                ratingMoved: ratingMoves,
                ratingDelta: p2IsBot ? 0 : p2Res.ratingDelta,
                newElo: p2IsBot ? 0 : p2Res.newElo,
                newDisplayRating: p2IsBot ? null : p2Res.newDisplayRating,
                newRank: p2IsBot ? 'MathBot' : p2Res.newRank,
                promoted: p2IsBot ? false : (p2Res.promoted || false),
                cheated: room.p2.cheated || false,
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

              io.to(roomId).emit('duel_end', {
                winnerId: winner,
                winner,
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

// Set up adb reverse port forwarding for Android emulators (including BlueStacks)
function setupAdbReverse() {
  const { exec } = require('child_process');
  
  // Try standard adb from PATH first, fallback to default Windows Android SDK location
  const sdkAdbPath = 'C:\\Users\\khali\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe';
  
  const cmd = `adb reverse tcp:3000 tcp:3000`;
  const fallbackCmd = `"${sdkAdbPath}" reverse tcp:3000 tcp:3000`;
  
  exec(cmd, (err) => {
    if (err) {
      exec(fallbackCmd, (fallbackErr) => {
        // Fail silently to avoid cluttering logs
      });
    }
  });
}

// Start Server — only when run directly (`node server.js`). When imported by tests the
// app/server/io/db are exported instead so the test harness controls the lifecycle.
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Server listening on port ${PORT}`);
    setupAdbReverse();
    // Continuously attempt setup every 10 seconds in case the emulator is started after the server
    setInterval(setupAdbReverse, 10000);
  });
}

// `rooms` + `endDuel` are exported for the duel integration test (test/duelEndToEnd.test.js),
// which drives a finished duel through the real rating/reward commit without a live socket.
module.exports = { app, server, io, db, ready, rooms, endDuel, applyDuelAnswer, buildDuelProblemSet, pickDuelConcepts };
