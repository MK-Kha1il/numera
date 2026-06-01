require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { db, initDb } = require('./db');
const { runMigrations } = require('./migrations');
const { idempotency } = require('./idempotency');
const { generateProblem, getLessonAndExamples } = require('./mathGenerator');
const { runIngestionPipeline } = require('./mathEngine/knowledgeIngestion');
const NRS = require('./mathEngine/ratingEngine');

// Mathematical Learning Intelligence Engine modules (engine HTTP routes live in routes/engine.js;
// these remain for the math/complete + math/problems paths that still live in this file).
const LearnerModel       = require('./mathEngine/learnerModel');
const RetentionEngine    = require('./mathEngine/retentionEngine');
const TeachingEngine     = require('./mathEngine/teachingEngine');
const AnalyticsEngine    = require('./mathEngine/analyticsEngine');
const CompetitiveEngine  = require('./mathEngine/competitiveEngine');
const Orchestrator       = require('./mathEngine/problemOrchestrator');

// Centralized config + extracted cross-cutting middleware (see config.js, middleware/).
const { JWT_SECRET, PORT, EXTRA_CORS_ORIGINS } = require('./config');
const { securityHeaders, securityLog } = require('./middleware/security');
const { globalRateLimiter } = require('./middleware/rateLimit');
const { authenticateToken } = require('./middleware/auth');
const { calculateRankFromElo, normalizeLevelForGenerator } = require('./lib/progression');
const { getUserWithMastery } = require('./services/userService');
const { updateAchievements } = require('./services/achievementService');
const { attachTipToProblem } = require('./services/tipService');

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
function updateCommitmentAndBurnout(userId, solvedCountThisSession, callback) {
  const now = Math.floor(Date.now() / 1000);
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 1. Record solved count in commitment history
  db.run(
    `INSERT INTO user_commitment_history (user_id, date, solved_count)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET solved_count = solved_count + excluded.solved_count`,
    [userId, dateStr, solvedCountThisSession],
    () => {
      // 2. Query history to compute Consistency Index and Burnout Risk
      db.all(
        "SELECT date, solved_count FROM user_commitment_history WHERE user_id = ? ORDER BY date DESC LIMIT 14",
        [userId],
        (errHistory, rows) => {
          const activeDaysCount = rows ? rows.length : 0;
          const consistencyIndex = Math.min(1.0, activeDaysCount / 14);
          
          // Get today's total solved count
          const todayRow = rows ? rows.find(r => r.date === dateStr) : null;
          const todaySolved = todayRow ? todayRow.solved_count : 0;
          
          db.get("SELECT * FROM users WHERE id = ?", [userId], (errUser, user) => {
            if (errUser || !user) return callback && callback();
            
            let burnoutRisk = 'low';
            let newBurnoutCounter = user.burnout_counter || 0;
            
            if (todaySolved >= 40) {
              burnoutRisk = 'high';
              newBurnoutCounter++;
            } else if (todaySolved >= 25) {
              burnoutRisk = 'medium';
            }
            
            // If user's burnout risk was high, and they completed today with <= 5 solved questions,
            // they successfully balanced their session intensity.
            let unlockBurnoutShield = false;
            if (user.burnout_risk === 'high' && todaySolved <= 5 && todaySolved > 0) {
              unlockBurnoutShield = true;
            }
            
            // Determine state and streak updates
            let newStreak = user.streak;
            let newState = user.commitment_state;
            
            const elapsed = now - (user.last_active || 0);
            
            if (user.commitment_state === 'fading') {
              // Restored climb!
              newState = 'active';
              if (elapsed > 86400) {
                newStreak = user.streak + 1;
              }
            } else if (elapsed > 86400) {
              newStreak = user.streak + 1;
              newState = 'active';
            }
            
            const newMaxStreak = Math.max(user.max_streak || 0, newStreak);
            
            db.run(
              `UPDATE users SET
                 streak = ?,
                 max_streak = ?,
                 commitment_state = ?,
                 burnout_risk = ?,
                 consistency_index = ?,
                 burnout_counter = ?,
                 last_active = ?
               WHERE id = ?`,
              [newStreak, newMaxStreak, newState, burnoutRisk, consistencyIndex, newBurnoutCounter, now, userId],
              () => {
                // Check relic unlocks
                const unlockPromises = [];
                
                if (newStreak >= 3) {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_spark', resolve)));
                }
                if (newStreak >= 7) {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_rhythm', resolve)));
                }
                if (newStreak >= 30) {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_dedication', resolve)));
                }
                if (newStreak >= 100) {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_sage', resolve)));
                }
                if (user.commitment_state === 'fading' && newState === 'active') {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_comeback', resolve)));
                }
                if (unlockBurnoutShield) {
                  unlockPromises.push(new Promise(resolve => unlockRelic(userId, 'relic_burnout_shield', resolve)));
                }
                
                Promise.all(unlockPromises).then(() => {
                  if (callback) callback({ newStreak, newState, burnoutRisk, consistencyIndex });
                });
              }
            );
          });
        }
      );
    }
  );
}

function unlockRelic(userId, relicId, callback) {
  const now = Math.floor(Date.now() / 1000);
  db.run(
    "INSERT OR IGNORE INTO user_commitment_relics (user_id, relic_id, unlocked_at) VALUES (?, ?, ?)",
    [userId, relicId, now],
    function(err) {
      if (!err && this.changes > 0) {
        db.run("INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)", [userId, relicId], () => {
          if (callback) callback(true);
        });
      } else {
        if (callback) callback(false);
      }
    }
  );
}

// Get commitment status, archives, and recommit requirement
app.get('/api/commitment/status', authenticateToken, (req, res) => {
  db.get("SELECT streak, max_streak, commitment_state, burnout_risk, consistency_index, coins FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'Failed to retrieve status' });
    
    db.all("SELECT relic_id, unlocked_at FROM user_commitment_relics WHERE user_id = ?", [req.user.id], (errRelics, relics) => {
      const relicList = relics || [];
      
      db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [req.user.id], (errUtil, util) => {
        const shieldsCount = util ? util.quantity : 0;
        
        let message = "Honor your climb by showing up today.";
        let challengeQuestionsCount = 3;
        
        if (user.burnout_risk === 'high') {
          message = "You've been working incredibly hard! Remember to protect your peace. A single equation is enough to stay consistent today.";
          challengeQuestionsCount = 1;
        } else if (user.burnout_risk === 'medium') {
          message = "Find your rhythm. Keep your promise to yourself today.";
          challengeQuestionsCount = 2;
        } else if (user.commitment_state === 'fading') {
          message = "You slipped, but your progress is safe. Honor your run and keep going!";
        }
        
        const statusResponse = {
          streak: user.streak,
          maxStreak: user.max_streak,
          commitmentState: user.commitment_state,
          burnoutRisk: user.burnout_risk,
          consistencyIndex: user.consistency_index,
          shieldsCount: shieldsCount,
          coins: user.coins,
          message: message,
          challengeQuestionsCount: challengeQuestionsCount,
          relics: relicList
        };

        db.all(
          `SELECT date, solved_count 
           FROM user_commitment_history 
           WHERE user_id = ? 
           ORDER BY date DESC 
           LIMIT 7`,
          [req.user.id],
          (errHist, history) => {
            const hist = history || [];
            // Send history in chronological order (oldest first)
            statusResponse.activityHistory = hist.reverse();
            res.json(statusResponse);
          }
        );
      });
    });
  });
});

// Recommit a fading consistency climb
app.post('/api/commitment/recommit', authenticateToken, (req, res) => {
  const { method } = req.body;
  const userId = req.user.id;
  
  db.get("SELECT * FROM users WHERE id = ?", [userId], (errUser, user) => {
    if (errUser || !user) return res.status(500).json({ error: 'User not found' });
    if (user.commitment_state !== 'fading') {
      return res.status(400).json({ error: 'Climb is not in a fading state.' });
    }
    
    const restoreClimb = (unlockComebackRelic = false) => {
      const now = Math.floor(Date.now() / 1000);
      db.run(
        "UPDATE users SET commitment_state = 'active', last_active = ? WHERE id = ?",
        [now, userId],
        () => {
          if (unlockComebackRelic) {
            unlockRelic(userId, 'relic_comeback', () => {
              getUserWithMastery(userId, (errMe, fullUser) => {
                res.json({ success: true, message: 'Consistency climb restored! You unlocked the Resilience Medal.', user: fullUser });
              });
            });
          } else {
            getUserWithMastery(userId, (errMe, fullUser) => {
              res.json({ success: true, message: 'Consistency climb restored!', user: fullUser });
            });
          }
        }
      );
    };
    
    if (method === 'shield') {
      db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [userId], (errUtil, util) => {
        if (errUtil || !util || util.quantity <= 0) {
          return res.status(400).json({ error: 'No Streak Shields available.' });
        }
        db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_streak_shield'", [userId], () => {
          restoreClimb(false);
        });
      });
    } else if (method === 'coins') {
      if (user.coins < 150) {
        return res.status(400).json({ error: 'Insufficient coins. Needs 150.' });
      }
      db.run("UPDATE users SET coins = coins - 150 WHERE id = ?", [userId], () => {
        restoreClimb(false);
      });
    } else if (method === 'challenge') {
      restoreClimb(true);
    } else {
      res.status(400).json({ error: 'Invalid recommit method.' });
    }
  });
});

// calculateRank, calculateRankFromElo, getRankValue, normalizeLevelForGenerator
// are imported from ./lib/progression (pure utilities).

function grantRankRewards(userId, rank, callback) {
  const rewards = [];
  const badgesWithCoins = [];
  
  if (rank.includes('Silver')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
  }
  if (rank.includes('Gold')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
  }
  if (rank.includes('Platinum')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
  }
  if (rank.includes('Diamond')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
  }
  if (rank.includes('Master')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry', 'avatar_einstein', 'banner_cosmos');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
    badgesWithCoins.push({ id: 'badge_rank_master', coins: 500 });
  }
  if (rank.includes('Grandmaster')) {
    rewards.push('avatar_hypatia', 'banner_fibonacci', 'avatar_newton', 'banner_calculus', 'avatar_lovelace', 'banner_matrix', 'avatar_euler', 'banner_geometry', 'avatar_einstein', 'banner_cosmos');
    badgesWithCoins.push({ id: 'badge_rank_silver', coins: 100 });
    badgesWithCoins.push({ id: 'badge_rank_gold', coins: 200 });
    badgesWithCoins.push({ id: 'badge_rank_platinum', coins: 300 });
    badgesWithCoins.push({ id: 'badge_rank_diamond', coins: 400 });
    badgesWithCoins.push({ id: 'badge_rank_master', coins: 500 });
    badgesWithCoins.push({ id: 'badge_rank_grandmaster', coins: 600 });
  }

  badgesWithCoins.forEach(b => {
    if (!rewards.includes(b.id)) {
      rewards.push(b.id);
    }
  });

  if (rewards.length === 0) {
    if (callback) callback();
    return;
  }

  let completed = 0;
  rewards.forEach(itemId => {
    db.run(`INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [userId, itemId], function(errRun) {
      if (!errRun && this.changes > 0) {
        const badgeMatch = badgesWithCoins.find(b => b.id === itemId);
        if (badgeMatch) {
          db.run("UPDATE users SET coins = coins + ? WHERE id = ?", [badgeMatch.coins, userId]);
        }
      }
      completed++;
      if (completed === rewards.length && callback) {
        callback();
      }
    });
  });
}
// -------------------------------------------------------------

// normalizeLevelForGenerator imported from ./lib/progression

// Procedural problems for specific category & level — engine-integrated
app.get('/api/math/problems', authenticateToken, async (req, res) => {
  try {
    const userId   = req.user.id;
    const category = req.query.category || 'arithmetic';
    const level    = parseInt(req.query.level) || 1;
    let count      = parseInt(req.query.count) || 3;
    if (count === 5) count = 3;

    // Fetch user ELO and concept analytics in parallel
    const [user, analyticsRows] = await Promise.all([
      new Promise((resolve, reject) =>
        db.get("SELECT elo FROM users WHERE id = ?", [userId], (e, r) => e ? reject(e) : resolve(r))
      ),
      new Promise((resolve, reject) =>
        db.all("SELECT * FROM user_concept_analytics WHERE user_id = ?", [userId], (e, r) => e ? reject(e) : resolve(r || []))
      )
    ]);

    const userElo       = user ? (user.elo || 1000) : 1000;
    const normalizedLevel = normalizeLevelForGenerator(category, level);
    const analyticsMap  = {};
    analyticsRows.forEach(row => { analyticsMap[row.concept] = row; });

    // Ask the orchestrator: what is the best next concept for this learner?
    const orchestration = await Orchestrator.selectNextConcept(db, userId, category, level);

    // Get learner profile for adaptive difficulty (non-fatal if missing)
    let learnerProfile = null;
    try {
      if (orchestration.conceptId) {
        learnerProfile = await LearnerModel.getProfile(db, userId, orchestration.conceptId);
      }
    } catch (_) {}

    const lessonData = getLessonAndExamples(category, normalizedLevel);
    const problems   = [];
    for (let i = 0; i < count; i++) {
      const prob    = generateProblem(category, normalizedLevel, i, userElo, analyticsMap,
                        { targetConceptId: orchestration.conceptId, learnerProfile });
      const enriched = await Orchestrator.enrichProblem(db, userId, prob, orchestration);
      problems.push(attachTipToProblem(enriched, false));
    }

    res.json({
      category,
      level,
      lessonTitle:   lessonData.lessonTitle,
      lessonContent: lessonData.lessonContent,
      lessonFormula: lessonData.lessonFormula,
      examples:      lessonData.examples,
      lessonSections: lessonData.sections || null,
      orchestration: {
        targetConcept: orchestration.conceptId,
        reason:        orchestration.reason,
        priority:      orchestration.priority,
        meta:          orchestration.meta
      },
      problems
    });
  } catch (err) {
    console.error('[/api/math/problems]', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit cognitive telemetry of player performance
app.post('/api/math/telemetry', authenticateToken, (req, res) => {
  const { concept, isCorrect, speed, hesitation, retries, templateType } = req.body;
  if (!concept) {
    return res.status(400).json({ error: "Missing concept parameter." });
  }

  const userId = req.user.id;
  const isCorrectNumeric = isCorrect ? 1 : 0;
  const speedVal = parseFloat(speed) || 0;
  const hesitationVal = parseFloat(hesitation) || 0;
  const retriesVal = parseInt(retries, 10) || 0;
  const now = Math.floor(Date.now() / 1000);

  // 1. Update User Concept Analytics (moving averages)
  db.get(
    "SELECT * FROM user_concept_analytics WHERE user_id = ? AND concept = ?",
    [userId, concept],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });

      if (row) {
        const newSuccessRate = row.success_rate * 0.7 + isCorrectNumeric * 0.3;
        const newSpeed = row.average_speed * 0.7 + speedVal * 0.3;
        const newHesitation = row.hesitation_index * 0.7 + hesitationVal * 0.3;
        const newStreak = isCorrectNumeric ? row.streak + 1 : 0;

        db.run(
          `UPDATE user_concept_analytics 
           SET success_rate = ?, average_speed = ?, hesitation_index = ?, streak = ?, last_tested = ?
           WHERE user_id = ? AND concept = ?`,
          [newSuccessRate, newSpeed, newHesitation, newStreak, now, userId, concept]
        );
      } else {
        db.run(
          `INSERT INTO user_concept_analytics (user_id, concept, success_rate, average_speed, hesitation_index, streak, last_tested)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [userId, concept, isCorrectNumeric, speedVal, hesitationVal, isCorrectNumeric ? 1 : 0, now]
        );
      }
    }
  );

  // 2. Update Template Pedagogical Feedback
  if (templateType) {
    db.get(
      "SELECT * FROM problem_pedagogical_feedback WHERE template_type = ?",
      [templateType],
      (err, row) => {
        if (!err) {
          if (row) {
            const total = row.total_attempts + 1;
            const success = row.successes + isCorrectNumeric;
            const newAvgTime = (row.average_time_taken * row.total_attempts + speedVal) / total;
            const newAvgHes = (row.average_hesitation * row.total_attempts + hesitationVal) / total;
            const newFrustration = row.frustration_index * 0.8 + ((1 - isCorrectNumeric) * 0.5 + (hesitationVal > 2.0 ? 0.3 : 0) + retriesVal * 0.2) * 0.2;

            db.run(
              `UPDATE problem_pedagogical_feedback
               SET total_attempts = ?, successes = ?, average_time_taken = ?, average_hesitation = ?, frustration_index = ?
               WHERE template_type = ?`,
              [total, success, newAvgTime, newAvgHes, newFrustration, templateType]
            );
          } else {
            const frustration = (1 - isCorrectNumeric) * 0.5 + (hesitationVal > 2.0 ? 0.3 : 0) + retriesVal * 0.2;
            db.run(
              `INSERT INTO problem_pedagogical_feedback (template_type, total_attempts, successes, average_time_taken, average_hesitation, frustration_index)
               VALUES (?, 1, ?, ?, ?, ?)`,
              [templateType, isCorrectNumeric, speedVal, hesitationVal, frustration]
            );
          }
        }
      }
    );
  }

  // 3. Trigger Ingestion pipeline asynchronously in background (10% random chance to process)
  if (Math.random() < 0.1) {
    runIngestionPipeline(db)
      .then(r => {
        if (r && r.ingestedCount > 0) {
          const { refreshIngestedTemplates } = require('./mathGenerator');
          refreshIngestedTemplates();
        }
      })
      .catch(err => console.error("[Telemetry-Ingestion] Ingestion pipeline failed:", err.message));
  }

  // 4. Feed the Intelligence Engine — fire-and-forget, never blocks the response
  ;(async () => {
    try {
      // Map old concept/template string → knowledge-graph conceptId
      const conceptId = Orchestrator.conceptFromType(concept) || concept;
      const retentionScore = await RetentionEngine.getRetentionForProfile(db, userId, conceptId);

      // Speed from legacy API arrives in seconds — convert to ms
      const responseMs = speedVal > 0 ? speedVal * 1000 : 0;
      const wasRetry   = retriesVal > 0;
      const inferredHint = hesitationVal > 2.0;

      // Retention record (rating: 4=fast correct, 3=correct, 1=wrong)
      const rating = isCorrectNumeric ? (speedVal > 0 && speedVal < 8 ? 4 : 3) : 1;
      await RetentionEngine.recordReview(db, userId, conceptId, rating);

      // Learner profile update
      await LearnerModel.updateProfile(db, userId, conceptId, {
        correct:        !!isCorrectNumeric,
        responseMs,
        usedHint:       inferredHint,
        usedCalculator: false,
        wasRetry,
        retentionScore
      });

      // Lesson analytics
      if (templateType) {
        await AnalyticsEngine.recordLessonEvent(db, templateType, {
          correct: !!isCorrectNumeric,
          timeTaken: responseMs,
          usedHint: inferredHint,
          abandoned: false
        });
      }

      // Teaching style signals
      const signals = TeachingEngine.inferSignalFromResult(
        { correct: !!isCorrectNumeric, responseMs, usedHint: inferredHint, wasRetry },
        conceptId
      );
      for (const signal of signals) {
        await TeachingEngine.recordStyleSignal(db, userId, signal.style, signal.outcome);
      }
    } catch (e) {
      console.error('[Telemetry-Engine]', e.message);
    }
  })();

  res.json({ success: true });
});

// Log calculator usage telemetry and check for easter egg
app.post('/api/math/calculator/log', authenticateToken, (req, res) => {
  const { category, level, question, template_type, game_mode, inputExpression } = req.body;
  const userId = req.user.id;
  const now = Math.floor(Date.now() / 1000);
  
  db.run(`
    INSERT INTO user_calculator_analytics 
    (user_id, category, level, question, template_type, game_mode, used_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [userId, category, level, question, template_type, game_mode, now], (err) => {
    if (err) {
      console.error("Failed to log calculator analytics:", err.message);
    }
    
    if (inputExpression === "67") {
      db.run("UPDATE users SET calculator_sixseven_count = 1 WHERE id = ?", [userId], () => {
        updateAchievements(userId, () => {
          res.json({ success: true, easterEggUnlocked: true });
        });
      });
    } else {
      res.json({ success: true });
    }
  });
});

const completionCooldowns = new Map();

// Update user stats after a successful game session
app.post('/api/math/complete', authenticateToken, idempotency, (req, res) => {
  const userId = req.user.id;
  const nowMs = Date.now();
  if (completionCooldowns.has(userId)) {
    const lastTime = completionCooldowns.get(userId);
    if (nowMs - lastTime < 5000) {
      securityLog(userId, 'COMPLETION_REPLAY_ATTEMPT', req.ip, `User tried to submit level completion too quickly: ${nowMs - lastTime}ms since last completion.`);
      return res.status(429).json({ error: 'Too many requests. Please wait before submitting another level.' });
    }
  }
  completionCooldowns.set(userId, nowMs);

  let { xpGained, coinsGained, solvedCount, category, level, errorsCount, speedBonus, comboBonus, gameMode, totalTime } = req.body;
  
  // Clamp incoming metrics bounds to prevent client spoofing
  solvedCount = Math.min(Math.max(parseInt(solvedCount, 10) || 5, 0), 5);
  speedBonus = Math.min(Math.max(parseInt(speedBonus, 10) || 0, 0), 20);
  comboBonus = Math.min(Math.max(parseInt(comboBonus, 10) || 0, 0), 15);
  
  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (err, user) => {
    if (err || !user) return res.status(500).json({ error: 'User not found' });

    // APRA Algorithm calculations
    let baseXP = parseInt(xpGained, 10) || 20;
    let baseCoins = parseInt(coinsGained, 10) || 5;

    // Clamp to prevent user manipulation when level is absent
    if (baseXP < 0 || baseXP > 100) baseXP = 20;
    if (baseCoins < 0 || baseCoins > 50) baseCoins = 5;

    const parsedLevel = parseInt(level, 10);
    if (!isNaN(parsedLevel) && parsedLevel > 0) {
      // Logarithmic difficulty scaling
      baseXP = 15 + Math.round(5 * Math.log2(parsedLevel)) + speedBonus + comboBonus;
      baseCoins = 5 + Math.round(2 * Math.log2(parsedLevel)) + Math.round(speedBonus / 2) + Math.round(comboBonus / 3);
      
      // Milestone level double multiplier
      if (parsedLevel % 10 === 0) {
        baseXP = Math.round(baseXP * 2.0);
        baseCoins = Math.round(baseCoins * 2.0);
      }
    }

    // Accuracy Bonus (no errors/wrong answers)
    if (errorsCount !== undefined && errorsCount !== null && parseInt(errorsCount, 10) === 0) {
      baseXP = Math.round(baseXP * 1.20);
      baseCoins = Math.round(baseCoins * 1.20);
    }

    // Streak Multiplier: 1.5x XP if streak >= 3
    let streakBonusActive = false;
    if (user.streak >= 3) {
      baseXP = Math.round(baseXP * 1.5);
      streakBonusActive = true;
    }

    // Critical Bonus: 10% chance to double coins
    let criticalBonusActive = false;
    if (Math.random() < 0.10) {
      baseCoins = baseCoins * 2;
      criticalBonusActive = true;
    }

    let finalXpGained = baseXP;
    let xpBoosterActive = false;
    let newXpBoosterUses = user.xp_booster_uses_left || 0;
    if (newXpBoosterUses > 0) {
      finalXpGained = Math.round(baseXP * 2);
      xpBoosterActive = true;
      newXpBoosterUses -= 1;
    }

    const finalCoinsGained = baseCoins;

    let newXp = user.xp + finalXpGained;
    let newLevel = user.level;
    // XP equation for leveling up: level * 100
    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel += 1;
    }

    // Level progression node unlocking
    if (level !== undefined && level !== null) {
      if (!isNaN(parsedLevel) && parsedLevel >= user.level) {
        newLevel = Math.max(newLevel, parsedLevel + 1);
        if (newXp >= newLevel * 100) {
          newXp = newXp % (newLevel * 100);
        }
      }
    }

    const currentRank = user.rank || 'Unranked (Placement: 0/5)';
    const newCoins = user.coins + finalCoinsGained;
    const newSolvedCount = (user.solved_count || 0) + solvedCount;
    const newLeaguePoints = (user.league_points || 0) + finalXpGained;
    const now = Math.floor(Date.now() / 1000);

    let addPerfectLevels = 0;
    let addPerfectExercises = 0;
    if (errorsCount !== undefined && errorsCount !== null && parseInt(errorsCount, 10) === 0) {
      addPerfectLevels = 1;
      addPerfectExercises = solvedCount;
    }
    
    let addArchiveSolved = 0;
    let addSpringSolved = 0;
    let addSummerSolved = 0;
    
    if (gameMode === 'archive') {
      addArchiveSolved = solvedCount;
    } else if (gameMode === 'seasonal_spring') {
      addSpringSolved = solvedCount;
    } else if (gameMode === 'seasonal_summer') {
      addSummerSolved = solvedCount;
    }
    
    let setSpeedDemon = user.speed_demon_count || 0;
    if (totalTime !== undefined && totalTime !== null && parseInt(totalTime, 10) < 10 && parsedLevel >= 30 && errorsCount === 0) {
      setSpeedDemon = 1;
    }

    db.run(
      `UPDATE users SET 
         xp = ?, 
         level = ?, 
         coins = ?, 
         rank = ?, 
         solved_count = ?, 
         league_points = ?, 
         xp_booster_uses_left = ?,
         perfect_levels_count = perfect_levels_count + ?,
         perfect_exercises_count = perfect_exercises_count + ?,
         archive_solved = archive_solved + ?,
         seasonal_spring_count = seasonal_spring_count + ?,
         seasonal_summer_count = seasonal_summer_count + ?,
         speed_demon_count = ?
       WHERE id = ?`,
      [
        newXp, 
        newLevel, 
        newCoins, 
        currentRank, 
        newSolvedCount, 
        newLeaguePoints, 
        newXpBoosterUses,
        addPerfectLevels,
        addPerfectExercises,
        addArchiveSolved,
        addSpringSolved,
        addSummerSolved,
        setSpeedDemon,
        req.user.id
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });
        
        if (newLevel > user.level) {
          db.run(
            `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at) 
             VALUES (?, 'Level Up! 🌟', ?, 'levelup', 0, ?)`,
            [req.user.id, `Congratulations! You reached Level ${newLevel}. Keep climbing!`, now]
          );
        }
        
        updateCommitmentAndBurnout(req.user.id, solvedCount, () => {
          // Update user_quests and user_mastery
          db.run(
            "UPDATE user_quests SET solved_today = solved_today + ? WHERE user_id = ?",
            [solvedCount, req.user.id],
            () => {
            let masteryCol = null;
            const normCat = (category || 'arithmetic').toLowerCase();
            if (normCat === 'arithmetic') masteryCol = 'arithmetic_correct';
            else if (normCat === 'mental') masteryCol = 'mental_correct';
            else if (normCat === 'algebra') masteryCol = 'algebra_correct';
            else if (normCat === 'calculus') masteryCol = 'calculus_correct';
            else if (normCat === 'combinatorics') masteryCol = 'combinatorics_correct';
            else if (normCat === 'number theory' || normCat === 'number_theory') masteryCol = 'number_theory_correct';

            const finalizeResponse = () => {
              // Fire-and-forget: update competitive skill profile for the concepts practised this level
              ;(async () => {
                try {
                  const conceptIds = Orchestrator.getCategoryConceptIds(category, parsedLevel);
                  const accuracy   = (solvedCount > 0 && errorsCount !== undefined)
                    ? Math.max(0, (solvedCount - parseInt(errorsCount, 10)) / solvedCount)
                    : 0.5;
                  const outcome = accuracy >= 0.8 ? 1 : accuracy >= 0.5 ? 0.5 : 0;
                  for (const cId of conceptIds.slice(0, 2)) {
                    await CompetitiveEngine.updateCompetitiveRating(db, req.user.id, cId, outcome);
                  }
                } catch (e) {
                  console.error('[Complete-CompetitiveEngine]', e.message);
                }
              })();

              grantRankRewards(req.user.id, currentRank, () => {
                updateAchievements(req.user.id, () => {
                  res.json({
                    xp: newXp,
                    level: newLevel,
                    coins: newCoins,
                    rank: currentRank,
                    levelUp: newLevel > user.level,
                    streakBonusActive,
                    xpGained: finalXpGained,
                    coinsGained: finalCoinsGained,
                    criticalBonusActive,
                    xpBoosterActive,
                    xpBoosterUsesLeft: newXpBoosterUses
                  });
                });
              });
            };

            if (masteryCol) {
              db.run(`UPDATE user_mastery SET ${masteryCol} = ${masteryCol} + ? WHERE user_id = ?`, [solvedCount, req.user.id], () => {
                finalizeResponse();
              });
            } else {
              finalizeResponse();
            }
          }
        );
        });
      }
    );
  });
});

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
// NumeraRating System (NRS) — Rating API
// =============================================================

// ── Internal helpers ──────────────────────────────────────────────────────────

function getRatingRow(userId, domain, callback) {
  db.get(
    'SELECT * FROM user_ratings WHERE user_id = ? AND domain = ?',
    [userId, domain],
    (err, row) => {
      if (err) return callback(err);
      if (row) return callback(null, row);
      callback(null, {
        user_id: userId, domain,
        mu: NRS.MU_INIT, sigma: NRS.SIGMA_INIT,
        display_rating: 0, sessions_count: 0, last_updated: 0,
      });
    }
  );
}

function persistRatingUpdate(userId, domain, before, after, sessionMeta, explanation, callback) {
  const now = Math.floor(Date.now() / 1000);
  db.run(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, domain) DO UPDATE SET
       mu             = excluded.mu,
       sigma          = excluded.sigma,
       display_rating = excluded.display_rating,
       sessions_count = excluded.sessions_count,
       last_updated   = excluded.last_updated`,
    [userId, domain, after.mu, after.sigma, after.displayRating, after.sessionsCount, now],
    (errUpsert) => {
      if (errUpsert) return callback(errUpsert);
      db.run(
        `INSERT INTO rating_history
           (user_id, domain, mu_before, sigma_before, mu_after, sigma_after,
            display_before, display_after, delta, performance_score, expected_score,
            components_json, explanation, session_category, session_level, game_mode, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, domain,
          before.mu, before.sigma, after.mu, after.sigma,
          before.display_rating, after.displayRating,
          after.delta, after.performanceScore, after.expectedPerformance,
          JSON.stringify(after.components),
          explanation,
          sessionMeta.category, sessionMeta.level, sessionMeta.gameMode,
          now,
        ],
        (errHist) => callback(errHist)
      );
    }
  );
}

function maybeUpdateSeasonPeak(userId, domain, displayRating) {
  db.get('SELECT id FROM seasons WHERE is_active = 1 LIMIT 1', (errS, season) => {
    if (errS || !season) return;
    db.run(
      `INSERT INTO season_ratings (user_id, season_id, domain, peak_display, final_display)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, season_id, domain) DO UPDATE SET
         peak_display  = MAX(peak_display, excluded.peak_display),
         final_display = excluded.final_display`,
      [userId, season.id, domain, displayRating, displayRating]
    );
  });
}

function nrsUpdateVelocity(userId, domain, delta) {
  db.get(
    'SELECT velocity FROM learning_velocity WHERE user_id = ? AND domain = ?',
    [userId, domain],
    (err, row) => {
      const newVel = NRS.updateLearningVelocity(row ? row.velocity : 0, delta);
      const now = Math.floor(Date.now() / 1000);
      db.run(
        `INSERT INTO learning_velocity (user_id, domain, velocity, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_id, domain) DO UPDATE SET velocity = excluded.velocity, updated_at = excluded.updated_at`,
        [userId, domain, newVel, now]
      );
    }
  );
}

function checkSmurfSignals(userId, excess, sessionsCount) {
  db.get('SELECT * FROM smurf_signals WHERE user_id = ?', [userId], (err, row) => {
    const updated = NRS.evaluateSmurfSignals(row || {}, excess, sessionsCount);
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO smurf_signals (user_id, anomaly_score, consecutive_high, flagged, last_checked)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         anomaly_score    = excluded.anomaly_score,
         consecutive_high = excluded.consecutive_high,
         flagged          = MAX(flagged, excluded.flagged),
         last_checked     = excluded.last_checked`,
      [userId, updated.anomaly_score, updated.consecutive_high, updated.flagged ? 1 : 0, now]
    );
    if (updated.flagged) {
      securityLog(userId, 'SMURF_FLAG', 'system',
        `anomaly_score=${updated.anomaly_score.toFixed(3)}, consecutive=${updated.consecutive_high}`);
    }
  });
}

function nrsUpdateTilt(userId, performanceScore, sessionData) {
  db.get('SELECT * FROM tilt_tracking WHERE user_id = ?', [userId], (err, row) => {
    const updated = NRS.updateTiltState(row || {}, performanceScore, sessionData);
    const now = Math.floor(Date.now() / 1000);
    db.run(
      `INSERT INTO tilt_tracking (user_id, loss_streak, tilt_score, tilted, last_session)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         loss_streak  = excluded.loss_streak,
         tilt_score   = excluded.tilt_score,
         tilted       = excluded.tilted,
         last_session = excluded.last_session`,
      [userId, updated.loss_streak, updated.tilt_score, updated.tilted ? 1 : 0, now]
    );
    if (updated.tilted && (!row || !row.tilted)) {
      db.run(
        `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
         VALUES (?, 'Take a Break 🧘', ?, 'system', 0, ?)`,
        [userId,
         "You've had a tough session run. Taking a short break often improves performance. Your matchmaking will be adjusted to find you better-suited opponents.",
         now]
      );
    }
  });
}

// ── POST /api/rating/session ──────────────────────────────────────────────────
app.post('/api/rating/session', authenticateToken, (req, res) => {
  const userId = req.user.id;
  let {
    category, level, solvedCount, totalProblems, errorsCount,
    speedBonus, comboBonus, usedCalculator, gameMode,
  } = req.body;

  solvedCount   = Math.min(Math.max(parseInt(solvedCount,   10) || 0, 0), 20);
  totalProblems = Math.min(Math.max(parseInt(totalProblems, 10) || 3, 1), 20);
  errorsCount   = Math.min(Math.max(parseInt(errorsCount,   10) || 0, 0), 20);
  speedBonus    = Math.min(Math.max(parseInt(speedBonus,    10) || 0, 0), 20);
  comboBonus    = Math.min(Math.max(parseInt(comboBonus,    10) || 0, 0), 15);
  const lv      = Math.max(1, parseInt(level, 10) || 1);
  const gMode   = gameMode || 'level';
  const domain  = NRS.categoryToDomain(category);

  const sessionData = {
    solvedCount, totalProblems, errorsCount,
    speedBonus, comboBonus, level: lv,
    usedCalculator: Boolean(usedCalculator), gameMode: gMode,
  };

  getRatingRow(userId, 'global', (errG, globalRow) => {
    if (errG) return res.status(500).json({ error: 'Rating fetch failed' });
    getRatingRow(userId, domain, (errD, domainRow) => {
      if (errD) return res.status(500).json({ error: 'Rating fetch failed' });

      const domainResult = NRS.applySessionToRating(domainRow, sessionData);
      const domainExplanation = NRS.buildRatingExplanation(domain, sessionData, domainResult);

      const globalInfluence = NRS.domainInfluenceWeight(domainRow, globalRow);
      const scaledDelta = domainResult.delta * globalInfluence;
      const globalAfter = NRS.applySessionToRating(globalRow, sessionData);
      globalAfter.mu = globalRow.mu + scaledDelta;
      globalAfter.displayRating = Math.max(0, Math.floor(globalAfter.mu - 2 * globalAfter.sigma));
      const globalExplanation = NRS.buildRatingExplanation('global', sessionData, {
        ...globalAfter, delta: scaledDelta,
      });

      persistRatingUpdate(userId, domain, domainRow, domainResult,
        { category, level: lv, gameMode: gMode }, domainExplanation,
        (errPD) => {
          if (errPD) return res.status(500).json({ error: 'Domain rating save failed' });

          persistRatingUpdate(userId, 'global', globalRow, globalAfter,
            { category, level: lv, gameMode: gMode }, globalExplanation,
            (errPG) => {
              if (errPG) return res.status(500).json({ error: 'Global rating save failed' });

              maybeUpdateSeasonPeak(userId, domain, domainResult.displayRating);
              maybeUpdateSeasonPeak(userId, 'global', globalAfter.displayRating);
              nrsUpdateVelocity(userId, domain, domainResult.delta);
              nrsUpdateVelocity(userId, 'global', scaledDelta);

              const excess = domainResult.performanceScore - domainResult.expectedPerformance;
              checkSmurfSignals(userId, excess, domainResult.sessionsCount);
              nrsUpdateTilt(userId, domainResult.performanceScore, sessionData);

              const newRank = NRS.displayRatingToRank(globalAfter.displayRating, globalAfter.sessionsCount);
              db.run('UPDATE users SET elo = ?, competitive_matches = ? WHERE id = ?',
                [Math.round(globalAfter.mu), globalAfter.sessionsCount, userId]);

              res.json({
                success: true,
                domain: {
                  name: domain,
                  displayRating: domainResult.displayRating,
                  mu: +domainResult.mu.toFixed(1),
                  sigma: +domainResult.sigma.toFixed(1),
                  delta: +domainResult.delta.toFixed(1),
                  performanceScore: +domainResult.performanceScore.toFixed(3),
                  explanation: domainExplanation,
                },
                global: {
                  displayRating: globalAfter.displayRating,
                  mu: +globalAfter.mu.toFixed(1),
                  sigma: +globalAfter.sigma.toFixed(1),
                  delta: +scaledDelta.toFixed(1),
                  rank: newRank,
                  explanation: globalExplanation,
                },
              });
            }
          );
        }
      );
    });
  });
});

// ── GET /api/rating/profile ───────────────────────────────────────────────────
app.get('/api/rating/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.all(
    `SELECT r.domain, r.mu, r.sigma, r.display_rating, r.sessions_count, r.last_updated,
            COALESCE(v.velocity, 0) AS velocity,
            COALESCE(t.tilt_score, 0) AS tilt_score,
            COALESCE(t.tilted, 0) AS tilted
     FROM user_ratings r
     LEFT JOIN learning_velocity v ON v.user_id = r.user_id AND v.domain = r.domain
     LEFT JOIN tilt_tracking t ON t.user_id = r.user_id
     WHERE r.user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const profile = {};
      (rows || []).forEach(row => {
        profile[row.domain] = {
          mu: +row.mu.toFixed(1),
          sigma: +row.sigma.toFixed(1),
          displayRating: row.display_rating,
          rank: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
          sessionsCount: row.sessions_count,
          lastUpdated: row.last_updated,
          velocity: +row.velocity.toFixed(2),
          tiltScore: +row.tilt_score.toFixed(2),
          tilted: !!row.tilted,
        };
      });

      NRS.KNOWN_DOMAINS.forEach(d => {
        if (!profile[d]) {
          profile[d] = {
            mu: NRS.MU_INIT, sigma: NRS.SIGMA_INIT,
            displayRating: 0,
            rank: 'Unranked (Placement: 0/5)',
            sessionsCount: 0, lastUpdated: 0,
            velocity: 0, tiltScore: 0, tilted: false,
          };
        }
      });

      db.get('SELECT id, name, start_at, end_at FROM seasons WHERE is_active = 1 LIMIT 1', (errSe, season) => {
        if (season) {
          db.all(
            'SELECT domain, peak_display FROM season_ratings WHERE user_id = ? AND season_id = ?',
            [userId, season.id],
            (errPk, peaks) => {
              const seasonPeaks = {};
              (peaks || []).forEach(p => { seasonPeaks[p.domain] = p.peak_display; });
              res.json({ profile, season: { ...season, peaks: seasonPeaks } });
            }
          );
        } else {
          res.json({ profile, season: null });
        }
      });
    }
  );
});

// ── GET /api/rating/history ───────────────────────────────────────────────────
app.get('/api/rating/history', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const domain = req.query.domain || null;
  const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const where  = domain ? 'WHERE user_id = ? AND domain = ?' : 'WHERE user_id = ?';
  const params = domain ? [userId, domain, limit] : [userId, limit];

  db.all(
    `SELECT id, domain, display_before, display_after, delta, performance_score,
            expected_score, explanation, session_category, session_level, game_mode, created_at
     FROM rating_history ${where}
     ORDER BY created_at DESC LIMIT ?`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// ── GET /api/rating/leaderboard ───────────────────────────────────────────────
app.get('/api/rating/leaderboard', authenticateToken, (req, res) => {
  const domain = NRS.KNOWN_DOMAINS.includes(req.query.domain) ? req.query.domain : 'global';
  const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  db.all(
    `SELECT u.username, u.avatar, u.active_badge,
            r.display_rating, r.sessions_count
     FROM user_ratings r
     JOIN users u ON u.id = r.user_id
     WHERE r.domain = ? AND r.sessions_count >= 5
     ORDER BY r.display_rating DESC LIMIT ?`,
    [domain, limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(
        (rows || []).map((row, i) => ({
          rank: i + 1,
          username: row.username,
          avatar: row.avatar,
          badge: row.active_badge,
          displayRating: row.display_rating,
          rankName: NRS.displayRatingToRank(row.display_rating, row.sessions_count),
          sessionsCount: row.sessions_count,
        }))
      );
    }
  );
});

// ── GET /api/rating/matchmaking ───────────────────────────────────────────────
app.get('/api/rating/matchmaking', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const domain = NRS.KNOWN_DOMAINS.includes(req.query.domain) ? req.query.domain : 'global';
  const limit  = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  getRatingRow(userId, domain, (errMe, myRow) => {
    if (errMe) return res.status(500).json({ error: 'Rating lookup failed' });

    db.all(
      `SELECT u.id, u.username, u.avatar, r.mu, r.sigma, r.display_rating, r.sessions_count,
              COALESCE(t.tilt_score, 0) AS tilt_score
       FROM user_ratings r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN tilt_tracking t ON t.user_id = r.user_id
       WHERE r.domain = ? AND r.user_id != ? AND r.sessions_count >= 3`,
      [domain, userId],
      (err, candidates) => {
        if (err) return res.status(500).json({ error: err.message });

        db.get('SELECT tilt_score FROM tilt_tracking WHERE user_id = ?', [userId], (_, tiltRow) => {
          const myTilt = tiltRow ? tiltRow.tilt_score : 0;

          const scored = (candidates || []).map(c => {
            let quality = NRS.computeMatchQuality(myRow, c);
            if (c.tilt_score > 0.5 && myTilt > 0.5) quality *= 0.6;
            return { ...c, matchQuality: quality };
          });
          scored.sort((a, b) => b.matchQuality - a.matchQuality);

          res.json(
            scored.slice(0, limit).map(c => ({
              userId: c.id,
              username: c.username,
              avatar: c.avatar,
              displayRating: c.display_rating,
              rankName: NRS.displayRatingToRank(c.display_rating, c.sessions_count),
              matchQuality: +c.matchQuality.toFixed(3),
              sessionsCount: c.sessions_count,
            }))
          );
        });
      }
    );
  });
});

// ── GET /api/rating/season ────────────────────────────────────────────────────
app.get('/api/rating/season', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1', (errSe, season) => {
    if (errSe || !season) return res.json({ season: null });
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.max(0, Math.ceil((season.end_at - now) / 86400));

    db.all(
      `SELECT sr.domain, sr.peak_display, sr.final_display, r.display_rating
       FROM season_ratings sr
       LEFT JOIN user_ratings r ON r.user_id = sr.user_id AND r.domain = sr.domain
       WHERE sr.user_id = ? AND sr.season_id = ?`,
      [userId, season.id],
      (errPk, peaks) => {
        res.json({
          season: { id: season.id, name: season.name, startAt: season.start_at, endAt: season.end_at, daysRemaining },
          myPeaks: (peaks || []).map(p => ({
            domain: p.domain, peakDisplay: p.peak_display,
            finalDisplay: p.final_display, currentDisplay: p.display_rating,
          })),
        });
      }
    );
  });
});

// ── POST /api/rating/season/end — admin only ──────────────────────────────────
app.post('/api/rating/season/end', authenticateToken, (req, res) => {
  if (!['admin'].includes(req.user.username)) return res.status(403).json({ error: 'Admin only' });

  const now = Math.floor(Date.now() / 1000);
  const newSeasonName   = req.body.newSeasonName || `Season (${new Date().toLocaleDateString()})`;
  const newDurationDays = Math.min(Math.max(parseInt(req.body.durationDays, 10) || 90, 30), 365);

  db.get('SELECT * FROM seasons WHERE is_active = 1 LIMIT 1', (errS, oldSeason) => {
    if (errS || !oldSeason) return res.status(400).json({ error: 'No active season found' });

    db.run('UPDATE seasons SET is_active = 0, end_at = ? WHERE id = ?', [now, oldSeason.id], (errEnd) => {
      if (errEnd) return res.status(500).json({ error: errEnd.message });

      const newEnd = now + newDurationDays * 86400;
      db.run(
        'INSERT INTO seasons (name, start_at, end_at, is_active) VALUES (?, ?, ?, 1)',
        [newSeasonName, now, newEnd],
        function(errNew) {
          if (errNew) return res.status(500).json({ error: errNew.message });

          db.all('SELECT user_id, domain, mu, sigma FROM user_ratings', (errAll, allRatings) => {
            if (errAll || !allRatings || allRatings.length === 0) {
              return res.json({ success: true, playersReset: 0 });
            }
            let pending = allRatings.length;
            allRatings.forEach(row => {
              const { mu: newMu, sigma: newSigma } = NRS.applySeasonReset(row.mu, row.sigma);
              const newDisplay = Math.max(0, Math.floor(newMu - 2 * newSigma));
              db.run(
                'UPDATE user_ratings SET mu = ?, sigma = ?, display_rating = ? WHERE user_id = ? AND domain = ?',
                [newMu, newSigma, newDisplay, row.user_id, row.domain],
                () => {
                  if (--pending === 0) res.json({ success: true, playersReset: allRatings.length });
                }
              );
            });
          });
        }
      );
    });
  });
});

// ── GET /api/rating/analytics — admin only ────────────────────────────────────
app.get('/api/rating/analytics', authenticateToken, (req, res) => {
  if (!['admin'].includes(req.user.username)) return res.status(403).json({ error: 'Admin only' });

  const since = Math.floor(Date.now() / 1000) - 30 * 86400;

  db.all(
    `SELECT domain,
            COUNT(*) AS total_sessions,
            AVG(delta) AS avg_delta,
            AVG(performance_score) AS avg_performance,
            AVG(expected_score) AS avg_expected,
            AVG(ABS(performance_score - expected_score)) AS avg_prediction_error
     FROM rating_history WHERE created_at >= ?
     GROUP BY domain`,
    [since],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      db.get('SELECT COUNT(*) AS n FROM smurf_signals WHERE flagged = 1', (_, sm) => {
        db.get('SELECT COUNT(*) AS n, AVG(tilt_score) AS avg FROM tilt_tracking WHERE tilted = 1', (_, tl) => {
          res.json({
            domainStats: (rows || []).map(r => ({
              domain: r.domain,
              totalSessions: r.total_sessions,
              avgRatingDelta: +(r.avg_delta || 0).toFixed(2),
              avgPerformance: +(r.avg_performance || 0).toFixed(3),
              avgExpected: +(r.avg_expected || 0).toFixed(3),
              avgPredictionError: +(r.avg_prediction_error || 0).toFixed(3),
              inflationSignal: (r.avg_delta || 0) > 5 ? 'inflation' :
                               (r.avg_delta || 0) < -5 ? 'deflation' : 'stable',
            })),
            integrity: {
              flaggedSmurfAccounts: sm ? sm.n : 0,
              tiltedPlayersNow: tl ? tl.n : 0,
              avgTiltScore: tl ? +(tl.avg || 0).toFixed(3) : 0,
            },
          });
        });
      });
    }
  );
});

// ── GET /api/rating/explanation/:sessionId ────────────────────────────────────
app.get('/api/rating/explanation/:sessionId', authenticateToken, (req, res) => {
  const id = parseInt(req.params.sessionId, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid session ID' });

  db.get(
    'SELECT * FROM rating_history WHERE id = ? AND user_id = ?',
    [id, req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      let components = {};
      try { components = JSON.parse(row.components_json); } catch(e) {}
      res.json({
        domain: row.domain, category: row.session_category,
        level: row.session_level, gameMode: row.game_mode,
        displayBefore: row.display_before, displayAfter: row.display_after,
        delta: +row.delta.toFixed(1),
        performanceScore: +row.performance_score.toFixed(3),
        expectedScore: +row.expected_score.toFixed(3),
        components, explanation: row.explanation, date: row.created_at,
      });
    }
  );
});

// =============================================================
// END NumeraRating System
// =============================================================

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
