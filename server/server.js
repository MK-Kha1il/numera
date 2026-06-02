require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, initDb } = require('./db');
const { runMigrations } = require('./migrations');
const { generateProblem } = require('./mathGenerator'); // used by the duel/bot socket logic

// Centralized config + extracted cross-cutting middleware (see config.js, middleware/).
// NOTE: server.js is now just bootstrap (app/middleware wiring + router mounts) and the
// Socket.IO duel/matchmaking logic; ALL REST domains live under routes/*, their helpers
// under services/* and lib/*.
const { JWT_SECRET, PORT, EXTRA_CORS_ORIGINS } = require('./config');
const { securityHeaders, securityLog } = require('./middleware/security');
const { globalRateLimiter } = require('./middleware/rateLimit');
const { calculateRankFromElo } = require('./lib/progression');
const { updateAchievements } = require('./services/achievementService');
const { grantRankRewards } = require('./services/rankRewardService');

const app = express();

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
app.use(require('./routes/dailyPuzzle'));
app.use(require('./routes/shop'));
// account.js is mounted here (ahead of the inline /api/user/:userId route) so its specific
// /api/user/* paths win over the param route — fixes prior shadowing of sessions/security-logs.
app.use(require('./routes/account'));
app.use(require('./routes/friends'));
app.use(require('./routes/achievements'));
app.use(require('./routes/engine'));
app.use(require('./routes/assessment'));
app.use(require('./routes/archive'));
app.use(require('./routes/league'));
app.use(require('./routes/commitment'));
app.use(require('./routes/math'));
app.use(require('./routes/rating'));
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
    <title>Numera - Math Quest Arena Backend</title>
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
            <p class="subtitle">Math Quest Arena Backend Services</p>
            <div class="pulse-badge">
                <div class="pulse-dot"></div>
                LIVE DEPLOYMENT ACTIVE
            </div>
        </header>

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
            <h2 style="font-weight: 600; margin-bottom: 5px;">Download Android Client</h2>
            <p style="color: var(--text-muted); text-align: center; max-width: 500px; font-size: 0.95rem;">
                Get the premium native Android client. Install the APK to start playing, solving mathematical equations using spaced repetition, and competing in the live arena.
            </p>
            <a href="/download-apk" class="download-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                DOWNLOAD CLIENT APK
            </a>
        </section>

        <section class="glass-card">
            <h2 style="font-weight: 600; margin-bottom: 15px; color: var(--text);">API Specifications</h2>
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
        console.error('Download interrupted or aborted by client:', err.message);
      }
    }
  });
});

// Initialize Database, then apply any pending versioned migrations.
// `ready` resolves once the schema is initialized + migrated; tests await it before
// issuing requests. In standalone mode a failure is fatal.
const ready = initDb()
  .then(() => runMigrations(db))
  .catch(err => {
    console.error("Database initialization failed:", err);
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
const rooms = {}; // active rooms: { roomId: { p1, p2, problems, isCasual, startTime } }
const friendRooms = {}; // code lobby rooms: { code: { creatorSocketId, userId, username, rank, elo } }

function matchmake(queueArray, isRanked) {
  for (let i = 0; i < queueArray.length; i++) {
    const p1 = queueArray[i];
    const elapsed = (Date.now() - p1.joinTime) / 1000;
    
    // Elo delta search window starts at 100 and expands by 15 per second
    const delta = 100 + Math.floor(elapsed) * 15;
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
      const eloDiff = Math.abs(p1.elo - p2.elo);
      const p2IsBeginner = p2.competitiveMatches < 5;
      
      const elapsed2 = (Date.now() - p2.joinTime) / 1000;
      const delta2 = 100 + Math.floor(elapsed2) * 15;

      let isMatchOk = eloDiff <= delta && eloDiff <= delta2;

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
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_queue', (data) => {
    const userId = socket.userId;
    const username = socket.username;
    const mode = (data && data.mode) === 'casual' ? 'casual' : 'ranked';

    db.get("SELECT elo, rank, competitive_matches FROM users WHERE id = ?", [userId], (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
      const competitiveMatches = row ? (row.competitive_matches || 0) : 0;

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
        competitiveMatches,
        joinTime: Date.now()
      };

      if (mode === 'casual') {
        casualQueue.push(playerInfo);
        console.log(`User ${username} joined CASUAL Arena queue. Elo: ${elo}`);
      } else {
        rankedQueue.push(playerInfo);
        console.log(`User ${username} joined RANKED Arena queue. Elo: ${elo}`);
      }
    });
  });

  socket.on('leave_queue', () => {
    const cleanQueue = (q) => {
      const idx = q.findIndex(item => item.socketId === socket.id);
      if (idx !== -1) {
        console.log(`User ${q[idx].username} left Arena queue.`);
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
      console.log(`Socket ${socket.id} joined duel room ${roomId}`);
    }
  });

  // Create lobby code for friend battle
  socket.on('create_friend_room', (data) => {
    const userId = socket.userId;
    const username = socket.username;
    
    db.get("SELECT elo, rank FROM users WHERE id = ?", [userId], (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';
      
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      friendRooms[code] = {
        creatorSocketId: socket.id,
        userId,
        username,
        rank,
        elo
      };
      
      socket.join(code);
      socket.emit('friend_room_created', { roomCode: code });
      console.log(`Friend Room ${code} created by ${username}`);
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

    db.get("SELECT elo, rank FROM users WHERE id = ?", [userId], (err, row) => {
      const elo = row ? (row.elo || 1000) : 1000;
      const rank = row ? row.rank : 'Unranked (Placement: 0/5)';

      socket.join(roomCode);
      console.log(`Friend Room ${roomCode} joined by ${username}`);

      // Start friend duel immediately (which is treated as casual, no Elo cost)
      const problems = [];
      for (let i = 0; i < 5; i++) {
        problems.push(generateProblem('arithmetic', 5));
      }

      const roomId = `friend_duel_${roomCode}_${Date.now()}`;
      rooms[roomId] = {
        roomId,
        p1: { id: lobby.userId, username: lobby.username, score: 0, progress: 0, elo: lobby.elo },
        p2: { id: userId, username: username, score: 0, progress: 0, elo: elo },
        problems,
        isCasual: true,
        startTime: Date.now()
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

  socket.on('submit_answer', (data) => {
    const { roomId, isCorrect, nextIndex } = data;
    const userId = socket.userId;
    const room = rooms[roomId];
    if (!room) return;

    let playerKey = null;
    if (room.p1.id === userId) playerKey = 'p1';
    else if (room.p2.id === userId) playerKey = 'p2';

    if (playerKey) {
      // Anti-Cheat: Validate Timing Pattern
      const now = Date.now();
      const startTime = room[playerKey].problemStartTime || room.startTime || now;
      const elapsed = now - startTime;

      // If correct solution submitted in <350ms, flag as suspicious timing
      if (isCorrect && elapsed < 350) {
        room[playerKey].suspiciousTimingFlags = (room[playerKey].suspiciousTimingFlags || 0) + 1;
        console.warn(`[Anti-Cheat] Suspicious solver timing detected for ${room[playerKey].username}: ${elapsed}ms. Flags: ${room[playerKey].suspiciousTimingFlags}`);
      }

      room[playerKey].problemStartTime = now;
      room[playerKey].progress = nextIndex;
      if (isCorrect) room[playerKey].score += 20;

      // Broadcast update
      io.to(roomId).emit('room_status', {
        p1: room.p1,
        p2: room.p2
      });

      // Check game end
      const maxProblems = room.problems.length;
      if (room.p1.progress >= maxProblems && room.p2.progress >= maxProblems) {
        endDuel(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
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

function startDuel(p1, p2, isRanked) {
  const roomId = `duel_${p1.userId}_${p2.userId}_${Date.now()}`;
  const problems = [];
  for (let i = 0; i < 5; i++) {
    problems.push(generateProblem('arithmetic', 5));
  }

  rooms[roomId] = {
    roomId,
    p1: { id: p1.userId, username: p1.username, score: 0, progress: 0, elo: p1.elo },
    p2: { id: p2.userId, username: p2.username, score: 0, progress: 0, elo: p2.elo },
    problems,
    isCasual: !isRanked,
    startTime: Date.now()
  };

  io.sockets.sockets.get(p1.socketId)?.join(roomId);
  io.sockets.sockets.get(p2.socketId)?.join(roomId);

  io.to(roomId).emit('duel_start', {
    roomId,
    opponent: { p1: rooms[roomId].p1, p2: rooms[roomId].p2 },
    problems
  });
  console.log(`Duel started between ${p1.username} and ${p2.username}. Ranked: ${isRanked}`);
}

function startDuelWithBot(player, isRanked) {
  const roomId = `duel_bot_${player.userId}_${Date.now()}`;
  const problems = [];
  for (let i = 0; i < 5; i++) {
    problems.push(generateProblem('arithmetic', 5));
  }

  // Create Bot with rating close to user
  const botElo = Math.max(100, player.elo - 50 + Math.floor(Math.random() * 100));

  rooms[roomId] = {
    roomId,
    p1: { id: player.userId, username: player.username, score: 0, progress: 0, elo: player.elo },
    p2: { id: 9999, username: 'MathBot', score: 0, progress: 0, elo: botElo, isBot: true },
    problems,
    isCasual: !isRanked,
    startTime: Date.now()
  };

  const socket = io.sockets.sockets.get(player.socketId);
  socket?.join(roomId);

  socket?.emit('duel_start', {
    roomId,
    opponent: { p1: rooms[roomId].p1, p2: rooms[roomId].p2 },
    problems
  });

  simulateBot(roomId);
  console.log(`Duel started with Bot for user ${player.username}. Ranked: ${isRanked}`);
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

function processPlayerDuelResult(userId, eloChange, isWinner, callback) {
  if (!userId || typeof userId !== 'number' || userId === 9999) {
    return callback(null, { eloChange: 0, newElo: 0, newRank: 'MathBot' });
  }

  db.get("SELECT elo, competitive_matches, coins, arena_wins FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) {
      return callback(null, { eloChange: 0, newElo: 1000, newRank: 'Unranked (Placement: 0/5)' });
    }

    const currentElo = user.elo !== undefined && user.elo !== null ? user.elo : 1000;
    const currentMatches = user.competitive_matches || 0;
    
    const newElo = Math.max(100, currentElo + eloChange);
    const newMatches = currentMatches + 1;
    const newRank = calculateRankFromElo(newElo, newMatches);
    
    const newCoins = user.coins + (isWinner ? 50 : 0);
    const newWins = user.arena_wins + (isWinner ? 1 : 0);

    db.run(
      "UPDATE users SET elo = ?, competitive_matches = ?, rank = ?, coins = ?, arena_wins = ?, solved_count = solved_count + 5 WHERE id = ?",
      [newElo, newMatches, newRank, newCoins, newWins, userId],
      (errUpdate) => {
        updateAchievements(userId, () => {
          grantRankRewards(userId, newRank, () => {
            callback(null, {
              eloChange,
              newElo,
              newRank
            });
          });
        });
      }
    );
  });
}

function endDuel(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const p1Score = room.p1.score;
  const p2Score = room.p2.score;
  
  let winner = null;
  if (p1Score > p2Score) winner = room.p1.id;
  else if (p2Score > p1Score) winner = room.p2.id;

  const p2IsBot = room.p2.id === 9999 || room.p2.isBot;

  const p1Cheated = (room.p1.suspiciousTimingFlags || 0) >= 3;
  const p2Cheated = !p2IsBot && (room.p2.suspiciousTimingFlags || 0) >= 3;

  if (p1Cheated) {
    room.p1.cheated = true;
    securityLog(room.p1.id, 'ARENA_DUEL_CHEATING_DISQUALIFIED', null, `Player 1 (${room.p1.username}) disqualified for suspicious timing flags (${room.p1.suspiciousTimingFlags}).`);
  }
  if (p2Cheated) {
    room.p2.cheated = true;
    securityLog(room.p2.id, 'ARENA_DUEL_CHEATING_DISQUALIFIED', null, `Player 2 (${room.p2.username}) disqualified for suspicious timing flags (${room.p2.suspiciousTimingFlags}).`);
  }

  // Adjust winner based on cheating disqualification
  if (p1Cheated && p2Cheated) {
    winner = null; // Both disqualified
  } else if (p1Cheated) {
    winner = room.p2.id; // P2 wins by default
  } else if (p2Cheated) {
    winner = room.p1.id; // P1 wins by default
  }

  let p1EloChange = 0;
  let p2EloChange = 0;

  if (room.isCasual) {
    p1EloChange = 0;
    p2EloChange = 0;
  } else {
    // REAL MATHEMATICAL ELO CALCULATION
    const p1Rating = room.p1.elo || 1000;
    const p2Rating = room.p2.elo || 1000;

    const expectedP1 = 1 / (1 + Math.pow(10, (p2Rating - p1Rating) / 400));
    const expectedP2 = 1 / (1 + Math.pow(10, (p1Rating - p2Rating) / 400));

    let actualP1 = 0.5;
    let actualP2 = 0.5;
    if (winner === room.p1.id) {
      actualP1 = 1;
      actualP2 = 0;
    } else if (winner === room.p2.id) {
      actualP1 = 0;
      actualP2 = 1;
    }

    const K = 32;
    p1EloChange = Math.round(K * (actualP1 - expectedP1));
    p2EloChange = p2IsBot ? 0 : Math.round(K * (actualP2 - expectedP2));

    // Bot match specific override fallback
    if (p2IsBot) {
      if (winner === room.p1.id) p1EloChange = 15;
      else if (winner === room.p2.id) p1EloChange = -10;
      else p1EloChange = 0;
    }

    // Anti-Cheat timing validation overrides: deduct ELO if cheated
    if (p1Cheated) {
      p1EloChange = -15;
    }
    if (p2Cheated) {
      p2EloChange = -15;
    }
  }

  // Increment duels_today in user_quests for human players
  if (room.p1.id && typeof room.p1.id === 'number') {
    db.run("UPDATE user_quests SET duels_today = duels_today + 1 WHERE user_id = ?", [room.p1.id]);
  }
  if (room.p2.id && typeof room.p2.id === 'number' && room.p2.id !== 9999) {
    db.run("UPDATE user_quests SET duels_today = duels_today + 1 WHERE user_id = ?", [room.p2.id]);
  }

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

      let p1EloMod = p1EloChange;
      let p2EloMod = p2EloChange;

      const proceed = () => {
        processPlayerDuelResult(room.p1.id, p1EloMod, winner === room.p1.id, (err1, p1Res) => {
          processPlayerDuelResult(room.p2.id, p2EloMod, winner === room.p2.id, (err2, p2Res) => {
            const p1Data = {
              ...room.p1,
              eloChange: p1EloMod,
              newElo: p1Res.newElo,
              newRank: p1Res.newRank,
              cheated: room.p1.cheated || false,
              ticketUsed: p1HasTicket && !room.isCasual
            };

            const p2Data = {
              ...room.p2,
              eloChange: p2EloMod,
              newElo: p2IsBot ? 0 : p2Res.newElo,
              newRank: p2IsBot ? 'MathBot' : p2Res.newRank,
              cheated: room.p2.cheated || false,
              ticketUsed: p2HasTicket && !room.isCasual && !p2IsBot
            };

            io.to(roomId).emit('duel_end', {
              winnerId: winner,
              winner,
              p1: p1Data,
              p2: p2Data,
              isCasual: room.isCasual || false
            });
            delete rooms[roomId];
          });
        });
      };

      let pendingTasks = 0;
      if (p1HasTicket && !room.isCasual) {
        p1EloMod = p1EloChange * 2;
        pendingTasks++;
        db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_challenge_ticket'", [room.p1.id], () => {
          pendingTasks--;
          if (pendingTasks === 0) proceed();
        });
      }
      if (p2HasTicket && !room.isCasual && !p2IsBot) {
        p2EloMod = p2EloChange * 2;
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
    console.log(`Server listening on port ${PORT}`);
    setupAdbReverse();
    // Continuously attempt setup every 10 seconds in case the emulator is started after the server
    setInterval(setupAdbReverse, 10000);
  });
}

module.exports = { app, server, io, db, ready };
