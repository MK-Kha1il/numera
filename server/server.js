require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { db, initDb } = require('./db');
const { generateProblem, generateArchiveProblem, getLessonAndExamples, getLessonForArchive } = require('./mathGenerator');
const { runIngestionPipeline } = require('./mathEngine/knowledgeIngestion');
const { tipsMap } = require('./mathEngine/tips');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Restrict JSON payloads to 10KB to protect against body overflow/DDoS
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Enforce HTTP Security Headers (defense-in-depth)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none';");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

// Security Audit logging utility
function securityLog(userId, eventType, ip, details) {
  const now = Math.floor(Date.now() / 1000);
  console.warn(`[SECURITY AUDIT] Event: ${eventType} | User: ${userId} | IP: ${ip} | Details: ${details}`);
  db.run(
    "INSERT INTO security_audit_logs (timestamp, user_id, event_type, ip_address, details) VALUES (?, ?, ?, ?, ?)",
    [now, userId, eventType, ip, details],
    (err) => {
      if (err) console.error("[SECURITY] Failed to write audit log:", err.message);
    }
  );
}

// Helper to identify local IP addresses (development, loopbacks, LANs)
function isLocalIp(ip) {
  if (!ip) return false;
  const cleanIp = ip.replace(/^::ffff:/, '');
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost') {
    return true;
  }
  // Check private IPv4 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (/^10\./.test(cleanIp)) return true;
  if (/^192\.168\./.test(cleanIp)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
  return false;
}

// Global API rate limits
const apiRateLimits = {}; // ip -> Array of timestamps
function globalRateLimiter(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip;
    if (isLocalIp(ip)) {
      return next();
    }
    const now = Date.now();
    if (!apiRateLimits[ip]) {
      apiRateLimits[ip] = [];
    }
    apiRateLimits[ip] = apiRateLimits[ip].filter(t => now - t < windowMs);
    if (apiRateLimits[ip].length >= limit) {
      securityLog(req.user ? req.user.id : null, 'rate_limit_triggered', ip, `Global rate limit exceeded (${limit} requests / ${windowMs}ms).`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    apiRateLimits[ip].push(now);
    next();
  };
}

// Apply global rate limiting to all endpoints (100 requests per minute)
app.use(globalRateLimiter(100, 60000));

// Stateful failed auth attempts tracker for brute-force protection
const failedLoginAttempts = {}; // ip -> Array of timestamps

function checkFailedLogins(req, res, next) {
  const ip = req.ip;
  if (isLocalIp(ip)) {
    return next();
  }
  const now = Date.now();
  const fifteenMins = 15 * 60 * 1000;
  
  if (failedLoginAttempts[ip]) {
    failedLoginAttempts[ip] = failedLoginAttempts[ip].filter(t => now - t < fifteenMins);
    if (failedLoginAttempts[ip].length >= 5) {
      const waitTime = Math.ceil((fifteenMins - (now - failedLoginAttempts[ip][0])) / 60000);
      securityLog(null, 'rate_limit_triggered', ip, `IP blocked from login due to brute-force protection. Waiting: ${waitTime}m.`);
      return res.status(429).json({ 
        error: `Too many failed login attempts. Please wait ${waitTime} minutes.` 
      });
    }
  }
  next();
}

function recordFailedLogin(ip) {
  if (isLocalIp(ip)) return;
  if (!failedLoginAttempts[ip]) {
    failedLoginAttempts[ip] = [];
  }
  failedLoginAttempts[ip].push(Date.now());
}

function clearFailedLogins(ip) {
  delete failedLoginAttempts[ip];
}

// Backwards-compatible router-specific rate-limiter middleware
const rateLimits = {};
function rateLimiter(limit, windowMs) {
  return (req, res, next) => {
    const ip = req.ip;
    if (isLocalIp(ip)) {
      return next();
    }
    const now = Date.now();
    if (!rateLimits[ip]) {
      rateLimits[ip] = [];
    }
    rateLimits[ip] = rateLimits[ip].filter(timestamp => now - timestamp < windowMs);
    if (rateLimits[ip].length >= limit) {
      securityLog(req.user ? req.user.id : null, 'rate_limit_triggered', ip, `Route-specific rate limit exceeded (${limit} requests / ${windowMs}ms).`);
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    rateLimits[ip].push(now);
    next();
  };
}

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

const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const PORT = process.env.PORT || 3000;

// Initialize Database
initDb().catch(err => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    
    // Enforce stateful session tracking to prevent token reuse after invalidation
    if (!decoded.sessionId) {
      securityLog(decoded.id || null, 'session_hijack_attempt', req.ip, 'Token does not contain a session ID.');
      return res.status(401).json({ error: 'Invalid token structure. Log in again.' });
    }

    db.get(
      "SELECT id, expires_at FROM user_sessions WHERE id = ? AND user_id = ?",
      [decoded.sessionId, decoded.id],
      (errSession, session) => {
        if (errSession || !session) {
          securityLog(decoded.id, 'session_hijack_attempt', req.ip, 'Attempted to use an invalidated or revoked session.');
          return res.status(401).json({ error: 'Session has been invalidated. Please log in again.' });
        }
        
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at < now) {
          db.run("DELETE FROM user_sessions WHERE id = ?", [decoded.sessionId]);
          securityLog(decoded.id, 'session_hijack_attempt', req.ip, 'Attempted to use an expired session.');
          return res.status(401).json({ error: 'Session has expired. Please log in again.' });
        }
        
        req.user = decoded;
        next();
      }
    );
  });
}

// Achievements Progression Calculation Helper
function updateAchievements(userId, callback) {
  db.get("SELECT * FROM users WHERE id = ?", [userId], (errUser, user) => {
    if (errUser || !user) return callback && callback();
    
    db.get("SELECT * FROM user_mastery WHERE user_id = ?", [userId], (errMastery, mastery) => {
      const masteryArithmetic = mastery ? (mastery.arithmetic_correct || 0) : 0;
      const masteryMental = mastery ? (mastery.mental_correct || 0) : 0;
      const masteryAlgebra = mastery ? (mastery.algebra_correct || 0) : 0;
      const masteryCalculus = mastery ? (mastery.calculus_correct || 0) : 0;
      const masteryCombinatorics = mastery ? (mastery.combinatorics_correct || 0) : 0;
      const masteryNumberTheory = mastery ? (mastery.number_theory_correct || 0) : 0;
      
      db.get("SELECT COUNT(*) AS count FROM friends WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'", [userId, userId], (errFriends, rowFriends) => {
        const friendsCount = rowFriends ? rowFriends.count : 0;
        
        db.get("SELECT COUNT(*) AS count FROM user_inventory WHERE user_id = ?", [userId], (errInv, rowInv) => {
          const shopCount = rowInv ? rowInv.count : 0;
          
          db.all("SELECT * FROM achievements", (errAchs, achs) => {
            if (errAchs || !achs) return callback && callback();
            
            let processedCount = 0;
            if (achs.length === 0) return callback && callback();
            
            achs.forEach(ach => {
              let progress = 0;
              const type = ach.target_type;
              
              if (type === 'solved_count') progress = user.solved_count || 0;
              else if (type === 'streak') progress = Math.max(user.streak || 0, user.max_streak || 0);
              else if (type === 'arena_wins') progress = user.arena_wins || 0;
              else if (type === 'level') progress = user.level || 1;
              else if (type === 'shop_count') progress = shopCount;
              else if (type === 'perfect_exercises_count') progress = user.perfect_exercises_count || 0;
              else if (type === 'perfect_levels_count') progress = user.perfect_levels_count || 0;
              else if (type === 'mastery_arithmetic') progress = masteryArithmetic;
              else if (type === 'mastery_mental') progress = masteryMental;
              else if (type === 'mastery_algebra') progress = masteryAlgebra;
              else if (type === 'mastery_calculus') progress = masteryCalculus;
              else if (type === 'mastery_combinatorics') progress = masteryCombinatorics;
              else if (type === 'mastery_number_theory') progress = masteryNumberTheory;
              else if (type === 'friends_count') progress = friendsCount;
              else if (type === 'daily_puzzles_solved') progress = user.daily_puzzles_solved || 0;
              else if (type === 'archive_solved') progress = user.archive_solved || 0;
              else if (type === 'seasonal_spring') progress = user.seasonal_spring_count || 0;
              else if (type === 'seasonal_summer') progress = user.seasonal_summer_count || 0;
              else if (type === 'calculator_sixseven') progress = user.calculator_sixseven_count || 0;
              else if (type === 'speed_demon') progress = user.speed_demon_count || 0;
              
              const finalProgress = Math.min(progress, ach.target_value);
              const isCompleted = finalProgress >= ach.target_value;
              const completedAt = isCompleted ? Math.floor(Date.now() / 1000) : 0;
              
              db.get("SELECT completed_at FROM user_achievements WHERE user_id = ? AND achievement_id = ?", [userId, ach.id], (errX, prevRow) => {
                const alreadyCompleted = prevRow && prevRow.completed_at > 0;
                
                db.run(`
                  INSERT INTO user_achievements (user_id, achievement_id, progress, completed_at)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(user_id, achievement_id) DO UPDATE SET
                    progress = excluded.progress,
                    completed_at = CASE WHEN user_achievements.completed_at = 0 THEN excluded.completed_at ELSE user_achievements.completed_at END
                  WHERE claimed = 0
                `, [userId, ach.id, finalProgress, completedAt], () => {
                  if (isCompleted && !alreadyCompleted) {
                    db.run(
                      `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
                       VALUES (?, 'Achievement Completed! 🏆', ?, 'achievement', 0, ?)`,
                      [userId, `You completed the achievement: ${ach.name}! Claim it for rewards.`, Math.floor(Date.now() / 1000)]
                    );
                  }
                  
                  processedCount++;
                  if (processedCount === achs.length) {
                    if (callback) callback();
                  }
                });
              });
            });
          });
        });
      });
    });
  });
}

function getArchiveTemplateType(title, category) {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();
  
  if (t.includes('totient')) return 'euler_totient';
  if (t.includes('gcd') || t.includes('greatest common divisor')) return 'gcd';
  if (t.includes('divisor')) return 'divisors';
  if (t.includes('pigeonhole')) return 'pigeonhole';
  if (t.includes('fermat')) return 'fermat_little';
  if (t.includes('euler\'s identity') || t.includes('euler\'s formula') || t.includes('euler identity')) return 'euler_identity';
  if (t.includes('limit')) return 'limit';
  if (t.includes('derivative') || t.includes('differentiation')) return 'derivative';
  if (t.includes('integral') || t.includes('integration')) return 'integral';
  if (t.includes('determinant')) return 'matrix_determinant';
  if (t.includes('trace')) return 'matrix_trace';
  if (t.includes('combination') || t.includes('stars and bars') || t.includes('catalan') || t.includes('handshaking') || t.includes('choose')) return 'combinations';
  if (t.includes('permutation') || t.includes('derangement') || t.includes('arrange')) return 'permutations';
  if (t.includes('probability') || t.includes('birthday paradox') || t.includes('gambler\'s ruin')) return 'probability';
  if (t.includes('congruence') || t.includes('chinese remainder') || t.includes('wilson\'s theorem') || t.includes('modulo') || t.includes('prime')) return 'modulo';
  if (t.includes('pythagorean') || t.includes('triangle')) return 'pythagorean';
  
  if (c.includes('number theory')) return 'modulo';
  if (c.includes('combinatorics')) return 'combinations';
  if (c.includes('calculus')) return 'limit';
  if (c.includes('algebra')) return 'linear_two_step';
  if (c.includes('mental')) return 'mental_add';
  if (c.includes('arithmetic')) return 'arithmetic_add';
  
  return 'arithmetic_add';
}

function checkTipSafety(tipText, correctAnswer) {
  if (!tipText || !correctAnswer) return true;
  
  const cleanAnswer = correctAnswer.toString().replace(/\$/g, '').trim().toLowerCase();
  const cleanTip = tipText.toString().replace(/\$/g, '').trim().toLowerCase();
  
  if (cleanAnswer.length === 0) return true;
  
  const index = cleanTip.indexOf(cleanAnswer);
  if (index !== -1) {
    if (cleanAnswer.length === 1) {
      const regex = new RegExp('\\b' + cleanAnswer + '\\b');
      if (regex.test(cleanTip)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

function attachTipToProblem(problem, isArchive) {
  if (!problem) return problem;
  const templateType = problem.templateType || getArchiveTemplateType(problem.title, problem.category);
  const tipData = tipsMap[templateType];
  
  if (!tipData) {
    problem.tip = "Focus on the core concepts shown in the lesson.";
    return problem;
  }
  
  const rawTip = tipData.tip || '';
  const correctAnswer = problem.correctAnswer || problem.correct_answer || '';
  
  const isSafe = checkTipSafety(rawTip, correctAnswer);
  
  if (isSafe) {
    problem.tip = rawTip;
  } else {
    if (isArchive) {
      problem.tip = tipData.conceptualReminder || "Remember the fundamental properties of this math topic.";
    } else {
      problem.tip = "Tip unavailable for this exercise.";
    }
  }
  
  problem.tipMetadata = {
    concept: tipData.concept,
    subskill: tipData.subskill,
    difficulty: tipData.difficulty,
    learningObjective: tipData.learningObjective,
    commonMistakes: tipData.commonMistakes
  };
  
  return problem;
}


function getUserWithMastery(userId, callback) {
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return callback(err || new Error("User not found"));
    
    db.get("SELECT * FROM user_mastery WHERE user_id = ?", [userId], (errM, mastery) => {
      const masteryObj = {
        arithmetic_correct: mastery ? mastery.arithmetic_correct : 0,
        mental_correct: mastery ? mastery.mental_correct : 0,
        algebra_correct: mastery ? mastery.algebra_correct : 0,
        calculus_correct: mastery ? mastery.calculus_correct : 0,
        combinatorics_correct: mastery ? mastery.combinatorics_correct : 0,
        number_theory_correct: mastery ? mastery.number_theory_correct : 0
      };
      
      const fullUser = {
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        rank: user.rank,
        streak: user.streak,
        active_badge: user.active_badge,
        theme: user.theme,
        avatar: user.avatar,
        active_banner: user.active_banner || 'banner_default',
        assessment_taken: user.assessment_taken || 0,
        league: user.league || 'Bronze',
        league_points: user.league_points || 0,
        solved_count: user.solved_count || 0,
        arena_wins: user.arena_wins || 0,
        elo: user.elo || 1000,
        competitive_matches: user.competitive_matches || 0,
        total_coins_earned: user.total_coins_earned !== undefined ? user.total_coins_earned : 100,
        total_coins_spent: user.total_coins_spent || 0,
        xp_booster_uses_left: user.xp_booster_uses_left || 0,
        max_streak: user.max_streak || 0,
        commitment_state: user.commitment_state || 'active',
        burnout_risk: user.burnout_risk || 'low',
        consistency_index: user.consistency_index || 0.0,
        burnout_counter: user.burnout_counter || 0,
        last_telemetry_check: user.last_telemetry_check || 0,
        mastery: masteryObj
      };
      callback(null, fullUser);
    });
  });
}

function checkAndResetQuestsAndLeagues(userId, callback) {
  const now = Math.floor(Date.now() / 1000);
  
  // 1. Ensure user_quests and user_mastery exist
  db.get("SELECT * FROM user_quests WHERE user_id = ?", [userId], (err, questRow) => {
    if (err) {
      console.error(err);
      return callback && callback();
    }
    
    const initQuestsAndMastery = (cb) => {
      db.run("INSERT OR IGNORE INTO user_quests (user_id, last_quest_reset) VALUES (?, ?)", [userId, now], () => {
        db.run("INSERT OR IGNORE INTO user_mastery (user_id) VALUES (?)", [userId], () => {
          cb();
        });
      });
    };
    
    const proceedWithResets = () => {
      db.get("SELECT * FROM user_quests WHERE user_id = ?", [userId], (errQ, qRow) => {
        if (errQ || !qRow) return callback && callback();
        
        let questPromise = Promise.resolve();
        // Check daily quest reset (86400 seconds)
        if (now - qRow.last_quest_reset >= 86400) {
          questPromise = new Promise((resolveQ) => {
            db.run(`
              UPDATE user_quests SET
                solved_today = 0,
                duels_today = 0,
                mistakes_today = 0,
                daily_puzzle_today = 0,
                solved_claimed = 0,
                duels_claimed = 0,
                mistakes_claimed = 0,
                daily_puzzle_claimed = 0,
                last_quest_reset = ?
              WHERE user_id = ?
            `, [now, userId], resolveQ);
          });
        }
        
        questPromise.then(() => {
          // Check weekly league reset (7 * 86400 seconds)
          db.get("SELECT league, league_points, last_league_reset FROM users WHERE id = ?", [userId], (errU, uRow) => {
            if (errU || !uRow) return callback && callback();
            
            let lastLeagueReset = uRow.last_league_reset || 0;
            if (lastLeagueReset === 0) {
              db.run("UPDATE users SET last_league_reset = ? WHERE id = ?", [now, userId], () => {
                callback && callback();
              });
              return;
            }
            
            if (now - lastLeagueReset >= 7 * 86400) {
              const currentLeague = uRow.league || 'Bronze';
              
              db.all(
                "SELECT id, league_points FROM users WHERE league = ? ORDER BY league_points DESC",
                [currentLeague],
                (errStand, standings) => {
                  if (errStand || !standings) return callback && callback();
                  
                  const rankIndex = standings.findIndex(s => s.id === userId);
                  const totalInLeague = standings.length;
                  
                  let newLeague = currentLeague;
                  const leaguesOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
                  const currentIdx = leaguesOrder.indexOf(currentLeague);
                  
                  if (rankIndex !== -1) {
                    const userPoints = standings[rankIndex].league_points;
                    const shouldPromote = (rankIndex < 3 && userPoints > 0) || (userPoints > 100);
                    const shouldDemote = (rankIndex >= totalInLeague - 3 && totalInLeague >= 5 && currentIdx > 0);
                    
                    if (shouldPromote && currentIdx < leaguesOrder.length - 1) {
                      newLeague = leaguesOrder[currentIdx + 1];
                    } else if (shouldDemote && currentIdx > 0) {
                      newLeague = leaguesOrder[currentIdx - 1];
                    }
                  }
                  
                  db.run(
                    "UPDATE users SET league = ?, league_points = 0, last_league_reset = ? WHERE id = ?",
                    [newLeague, now, userId],
                    () => {
                      callback && callback();
                    }
                  );
                }
              );
            } else {
              callback && callback();
            }
          });
        });
      });
    };
    
    if (!questRow) {
      initQuestsAndMastery(proceedWithResets);
    } else {
      proceedWithResets();
    }
  });
}

// -------------------------------------------------------------
// AUTH ENDPOINTS
// -------------------------------------------------------------

app.post('/api/auth/register', checkFailedLogins, rateLimiter(5, 60000), (req, res) => {
  const { username, password, avatar } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Strict alphanumeric/underscore regex validation & length check
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(400).json({ 
      error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores.' 
    });
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
    return res.status(400).json({ error: 'Password must be between 8 and 100 characters' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const chosenAvatar = avatar || 'avatar_pythagoras';
  const now = Math.floor(Date.now() / 1000);

  db.run(
    `INSERT INTO users (username, password_hash, last_active, avatar, last_league_reset) VALUES (?, ?, ?, ?, ?)`,
    [username, hash, now, chosenAvatar, now],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      
      const newUserId = this.lastID;
      // Initialize quests & mastery rows
      db.run("INSERT OR IGNORE INTO user_quests (user_id, last_quest_reset) VALUES (?, ?)", [newUserId, now], () => {
        db.run("INSERT OR IGNORE INTO user_mastery (user_id) VALUES (?)", [newUserId], () => {
          db.run(
            `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at) 
             VALUES (?, 'Welcome to Numera! 🚀', 'Start your math journey by taking the diagnostic placement test or jump straight into Level 1!', 'welcome', 0, ?)`,
            [newUserId, now],
            () => {
              sendLoginResponse(newUserId, username, req, res);
            }
          );
        });
      });
    }
  );
});

function sendLoginResponse(userId, username, req, res) {
  const sessionId = crypto.randomUUID();
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ipAddress = req.ip;
  const createdAt = Math.floor(Date.now() / 1000);
  const expiresAt = createdAt + (7 * 24 * 60 * 60); // 7 days session lifetime

  db.run(
    "INSERT INTO user_sessions (id, user_id, user_agent, ip_address, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [sessionId, userId, userAgent, ipAddress, createdAt, expiresAt],
    (errSession) => {
      if (errSession) {
        console.error("[SECURITY] Failed to write session to DB:", errSession.message);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      
      const token = jwt.sign({ id: userId, username, sessionId }, JWT_SECRET, { expiresIn: '7d' });
      clearFailedLogins(ipAddress);
      
      getUserWithMastery(userId, (errU, fullUser) => {
        if (errU) return res.status(500).json({ error: errU.message });
        res.json({ token, user: fullUser });
      });
    }
  );
}

app.post('/api/auth/login', checkFailedLogins, rateLimiter(10, 60000), (req, res) => {
  const { username, password } = req.body;
  const ipAddress = req.ip;
  if (!username || !password) {
    recordFailedLogin(ipAddress);
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      recordFailedLogin(ipAddress);
      securityLog(user ? user.id : null, 'auth_failure', ipAddress, `Failed login attempt for user: ${username}`);
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    checkAndResetQuestsAndLeagues(user.id, () => {
      const now = Math.floor(Date.now() / 1000);
      const dayInSecs = 86400;

      if (user.last_active > 0) {
        const elapsed = now - user.last_active;
        if (elapsed > 2 * dayInSecs) {
          // Missed a day! Check if they have a streak shield
          db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_streak_shield'", [user.id], (errShield, shieldRow) => {
            const hasShield = shieldRow && shieldRow.quantity > 0;
            if (hasShield) {
              // Consume 1 shield, keep streak, set state = 'protected'
              db.run("UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_streak_shield'", [user.id], () => {
                db.run(
                  "UPDATE users SET commitment_state = 'protected', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              });
            } else {
              // No shield! They enter fading state (preserve the climb count for recovery)
              // If they were already in fading state or too much time has passed (> 3 days), they finally reset to 0.
              if (user.commitment_state === 'fading' || elapsed > 3 * dayInSecs) {
                db.run(
                  "UPDATE users SET streak = 0, commitment_state = 'active', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              } else {
                db.run(
                  "UPDATE users SET commitment_state = 'fading', last_active = ?, max_streak = CASE WHEN streak > max_streak THEN streak ELSE max_streak END WHERE id = ?",
                  [now, user.id],
                  () => {
                    sendLoginResponse(user.id, username, req, res);
                  }
                );
              }
            }
          });
        } else if (elapsed > dayInSecs) {
          // Showed up next day!
          const newStreak = user.streak + 1;
          db.run(
            "UPDATE users SET streak = ?, commitment_state = 'active', last_active = ?, max_streak = CASE WHEN ? > max_streak THEN ? ELSE max_streak END WHERE id = ?",
            [newStreak, now, newStreak, newStreak, user.id],
            () => {
              sendLoginResponse(user.id, username, req, res);
            }
          );
        } else {
          // Logged in multiple times today
          db.run(
            "UPDATE users SET last_active = ? WHERE id = ?",
            [now, user.id],
            () => {
              sendLoginResponse(user.id, username, req, res);
            }
          );
        }
      } else {
        // First login
        db.run(
          "UPDATE users SET streak = 1, commitment_state = 'active', last_active = ?, max_streak = 1 WHERE id = ?",
          [now, user.id],
          () => {
            sendLoginResponse(user.id, username, req, res);
          }
        );
      }
    });
  });
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  db.run("DELETE FROM user_sessions WHERE id = ?", [req.user.sessionId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: 'Successfully logged out' });
  });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    getUserWithMastery(req.user.id, (err, fullUser) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(fullUser);
    });
  });
});

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

function calculateRank(level) {
  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
  const tierSize = 9; // 3 divisions * 3 levels per division = 9 levels per tier
  const tierIdx = Math.min(Math.floor((level - 1) / tierSize), ranks.length - 1);
  const currentTier = ranks[tierIdx];
  
  const subLevel = (level - 1) % tierSize;
  let divisionStr = 'III';
  if (subLevel >= 6) divisionStr = 'I';
  else if (subLevel >= 3) divisionStr = 'II';
  
  return `${currentTier} ${divisionStr}`;
}

function calculateRankFromElo(elo, matchesCount) {
  if (matchesCount === undefined || matchesCount === null || matchesCount < 5) {
    return `Unranked (Placement: ${matchesCount || 0}/5)`;
  }
  
  if (elo < 1100) return 'Bronze III';
  if (elo < 1200) return 'Bronze II';
  if (elo < 1300) return 'Bronze I';
  
  if (elo < 1400) return 'Silver III';
  if (elo < 1500) return 'Silver II';
  if (elo < 1600) return 'Silver I';
  
  if (elo < 1700) return 'Gold III';
  if (elo < 1800) return 'Gold II';
  if (elo < 1900) return 'Gold I';
  
  if (elo < 2000) return 'Platinum III';
  if (elo < 2100) return 'Platinum II';
  if (elo < 2200) return 'Platinum I';
  
  if (elo < 2300) return 'Diamond III';
  if (elo < 2400) return 'Diamond II';
  if (elo < 2500) return 'Diamond I';
  
  if (elo < 2700) return 'Master';
  return 'Grandmaster';
}


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

function normalizeLevelForGenerator(category, level) {
  const parsedLevel = parseInt(level, 10);
  if (isNaN(parsedLevel) || parsedLevel <= 0) return 1;
  if (parsedLevel === 10 || parsedLevel === 20 || parsedLevel === 30 || parsedLevel === 40 || parsedLevel === 50 || parsedLevel === 60) {
    return parsedLevel;
  }
  const cat = (category || 'arithmetic').toLowerCase();
  const index = Math.floor((parsedLevel - 1) / 6);
  if (cat === 'algebra') {
    return index >= 8 ? 19 : 11 + index;
  } else if (cat === 'combinatorics') {
    return index >= 8 ? 29 : 21 + index;
  } else if (cat === 'calculus') {
    return index >= 8 ? 39 : 31 + index;
  } else if (cat === 'number theory' || cat === 'number_theory') {
    return 41 + Math.min(8, index);
  } else if (cat === 'mental') {
    return 1 + index;
  } else {
    return 1 + index;
  }
}

// Procedural problems for specific category & level
app.get('/api/math/problems', authenticateToken, (req, res) => {
  const category = req.query.category || 'arithmetic';
  const level = parseInt(req.query.level) || 1;
  let count = parseInt(req.query.count) || 3;
  if (count === 5) {
    count = 3;
  }

  db.get("SELECT elo FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    const userElo = user ? (user.elo || 1000) : 1000;
    const normalizedLevel = normalizeLevelForGenerator(category, level);

    db.all("SELECT * FROM user_concept_analytics WHERE user_id = ?", [req.user.id], (err2, analyticsRows) => {
      const analyticsMap = {};
      if (!err2 && analyticsRows) {
        analyticsRows.forEach(row => {
          analyticsMap[row.concept] = row;
        });
      }

      const lessonData = getLessonAndExamples(category, normalizedLevel);
      const problems = [];
      for (let i = 0; i < count; i++) {
        const prob = generateProblem(category, normalizedLevel, i, userElo, analyticsMap);
        problems.push(attachTipToProblem(prob, false));
      }
      res.json({
        category,
        level,
        lessonTitle: lessonData.lessonTitle,
        lessonContent: lessonData.lessonContent,
        lessonFormula: lessonData.lessonFormula,
        examples: lessonData.examples,
        problems
      });
    });
  });
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
      .then(res => {
        if (res && res.ingestedCount > 0) {
          const { refreshIngestedTemplates } = require('./mathGenerator');
          refreshIngestedTemplates();
        }
      })
      .catch(err => console.error("[Telemetry-Ingestion] Ingestion pipeline failed:", err.message));
  }

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
app.post('/api/math/complete', authenticateToken, (req, res) => {
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

const assessmentQuestions = [
  {
    question: "What is 15% of 120?",
    correctAnswer: "18",
    options: ["12", "15", "18", "20"],
    explanation: "15% of 120 is 0.15 * 120 = 18."
  },
  {
    question: "Solve for x: 3x - 7 = 14",
    correctAnswer: "7",
    options: ["5", "6", "7", "8"],
    explanation: "Add 7 to both sides: 3x = 21. Divide by 3: x = 7."
  },
  {
    question: "If a right triangle has perpendicular sides of lengths 6 and 8, what is the length of the hypotenuse?",
    correctAnswer: "10",
    options: ["9", "10", "11", "12"],
    explanation: "Use Pythagorean theorem: 6^2 + 8^2 = 36 + 64 = 100. Sqrt(100) = 10."
  },
  {
    question: "What is the sum of the first 5 terms of the geometric sequence: 2, 4, 8, 16, 32?",
    correctAnswer: "62",
    options: ["60", "62", "64", "66"],
    explanation: "2 + 4 + 8 + 16 + 32 = 62."
  },
  {
    question: "If f(x) = 2x^2 - 3x + 5, what is the value of f(2)?",
    correctAnswer: "7",
    options: ["5", "7", "9", "11"],
    explanation: "f(2) = 2*(2^2) - 3*(2) + 5 = 2*4 - 6 + 5 = 8 - 6 + 5 = 7."
  },
  {
    question: "What is the area of a circle with a radius of 7? (Use pi ≈ 22/7)",
    correctAnswer: "154",
    options: ["44", "77", "154", "308"],
    explanation: "Area = pi * r^2 = (22/7) * 7 * 7 = 154."
  },
  {
    question: "Find the roots of x^2 - 5x + 6 = 0.",
    correctAnswer: "2 and 3",
    options: ["1 and 6", "2 and 3", "-2 and -3", "0 and 5"],
    explanation: "(x - 2)(x - 3) = 0. Roots: x = 2 and x = 3."
  },
  {
    question: "What is the limit of (x^2 - 4) / (x - 2) as x approaches 2?",
    correctAnswer: "4",
    options: ["0", "2", "4", "undefined"],
    explanation: "Factor: (x - 2)(x + 2) / (x - 2) = x + 2. Limit as x approaches 2 is 2 + 2 = 4."
  },
  {
    question: "How many edges does a regular dodecahedron (a 3D solid with 12 pentagonal faces) have?",
    correctAnswer: "30",
    options: ["12", "20", "30", "60"],
    explanation: "A dodecahedron has 12 faces, 20 vertices, and 30 edges."
  },
  {
    question: "Using Gauss's summation method, what is the sum of all integers from 1 to 50?",
    correctAnswer: "1275",
    options: ["1225", "1250", "1275", "1300"],
    explanation: "Sum = n(n+1)/2 = 50 * 51 / 2 = 1275."
  }
];

app.get('/api/assessment/questions', authenticateToken, (req, res) => {
  res.json(assessmentQuestions);
});

app.post('/api/assessment/submit', authenticateToken, (req, res) => {
  const { score } = req.body;
  if (score === undefined || score < 0 || score > 10) {
    return res.status(400).json({ error: 'Valid score (0-10) required' });
  }

  let assignedLevel = 1;
  let assignedRank = 'Bronze III';

  if (score >= 9) {
    assignedLevel = 13;
    assignedRank = 'Gold III';
  } else if (score >= 7) {
    assignedLevel = 10;
    assignedRank = 'Silver III';
  } else if (score >= 5) {
    assignedLevel = 7;
    assignedRank = 'Bronze I';
  } else if (score >= 3) {
    assignedLevel = 4;
    assignedRank = 'Bronze II';
  } else {
    assignedLevel = 1;
    assignedRank = 'Bronze III';
  }

  db.get("SELECT rank FROM users WHERE id = ?", [req.user.id], (errU, user) => {
    const currentRank = user ? user.rank : 'Unranked (Placement: 0/5)';
    db.run(
      `UPDATE users SET level = ?, assessment_taken = 1 WHERE id = ?`,
      [assignedLevel, req.user.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          success: true,
          assignedLevel,
          assignedRank: currentRank,
          rewardsUnlocked: []
        });
      }
    );
  });
});

app.post('/api/assessment/skip', authenticateToken, (req, res) => {
  db.run(`UPDATE users SET assessment_taken = 1 WHERE id = ?`, [req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get Spaced Repetition SRS due lists
app.get('/api/math/srs/due', authenticateToken, (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  db.all(
    `SELECT * FROM srs_reviews WHERE user_id = ? AND next_review <= ?`,
    [req.user.id, now],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Post SRS review feedback (SuperMemo SM-2 algorithm)
app.post('/api/math/srs/review', authenticateToken, (req, res) => {
  const { topic, quality } = req.body; // quality 0 to 5
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'Valid quality rating (0-5) required' });
  }

  db.get(
    `SELECT * FROM srs_reviews WHERE user_id = ? AND topic = ?`,
    [req.user.id, topic],
    (err, review) => {
      if (err) return res.status(500).json({ error: err.message });

      let ef = review ? review.ease_factor : 2.5;
      let interval = review ? review.interval : 0;
      let reps = review ? review.repetitions : 0;

      // SM-2 calculations
      if (quality >= 3) {
        if (reps === 0) {
          interval = 1; // 1 day
        } else if (reps === 1) {
          interval = 6; // 6 days
        } else {
          interval = Math.round(interval * ef);
        }
        reps += 1;
      } else {
        reps = 0;
        interval = 0; // Immediate review
      }

      // Update ease factor
      ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (ef < 1.3) ef = 1.3;

      // Set next review timestamp
      const nextReview = (quality < 3)
        ? Math.floor(Date.now() / 1000) - 5
        : Math.floor(Date.now() / 1000) + interval * 86400; // in seconds

      db.run(
        `INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, topic) DO UPDATE SET
           ease_factor = excluded.ease_factor,
           interval = excluded.interval,
           repetitions = excluded.repetitions,
           next_review = excluded.next_review`,
        [req.user.id, topic, ef, interval, reps, nextReview],
        (saveErr) => {
          if (saveErr) return res.status(500).json({ error: saveErr.message });
          res.json({ topic, ease_factor: ef, interval, next_review: nextReview });
        }
      );
    }
  );
});

// -------------------------------------------------------------
// LEGACY PUZZLES & PUBLIC USER ENDPOINTS
// -------------------------------------------------------------

app.get('/api/legacy/puzzles', authenticateToken, (req, res) => {
  db.all("SELECT id, title, story, question, correct_answer, options, explanation, difficulty, category, stars FROM archive_exercises LIMIT 10", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const formatted = rows.map(r => ({
      id: r.id,
      title: r.title,
      story: r.story,
      question: r.question,
      correct_answer: r.correct_answer,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      explanation: r.explanation,
      difficulty: r.difficulty,
      category: r.category || "arithmetic",
      stars: r.stars || 3
    }));
    res.json(formatted);
  });
});

app.get('/api/user/:userId', authenticateToken, (req, res) => {
  const targetId = parseInt(req.params.userId, 10);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID' });
  
  db.get(`
    SELECT id, username, xp, level, coins, rank, active_badge, theme, avatar, active_banner, solved_count, arena_wins, elo, competitive_matches
    FROM users
    WHERE id = ?
  `, [targetId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    db.get(`SELECT * FROM user_mastery WHERE user_id = ?`, [targetId], (errM, mastery) => {
      const mast = mastery || {
        arithmetic_correct: 0,
        mental_correct: 0,
        algebra_correct: 0,
        calculus_correct: 0,
        combinatorics_correct: 0,
        number_theory_correct: 0
      };
      res.json({
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level,
        coins: user.coins,
        rank: user.rank,
        active_badge: user.active_badge,
        theme: user.theme,
        avatar: user.avatar,
        active_banner: user.active_banner,
        solved_count: user.solved_count || 0,
        arena_wins: user.arena_wins || 0,
        elo: user.elo,
        competitive_matches: user.competitive_matches,
        mastery: {
          arithmetic_correct: mast.arithmetic_correct || 0,
          mental_correct: mast.mental_correct || 0,
          algebra_correct: mast.algebra_correct || 0,
          calculus_correct: mast.calculus_correct || 0,
          combinatorics_correct: mast.combinatorics_correct || 0,
          number_theory_correct: mast.number_theory_correct || 0
        }
      });
    });
  });
});
// -------------------------------------------------------------

// Search the archive (mixed static seeded challenges & dynamic infinite additions)
app.get('/api/archive/search', authenticateToken, (req, res) => {
  const category = req.query.category || '';
  const stars = req.query.stars ? parseInt(req.query.stars) : null;
  const query = req.query.q || '';
  
  let sql = "SELECT * FROM archive_exercises WHERE 1=1";
  const params = [];
  
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (stars) {
    sql += " AND stars = ?";
    params.push(stars);
  }
  if (query) {
    sql += " AND (title LIKE ? OR story LIKE ? OR question LIKE ?)";
    params.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let results = rows.map(r => {
      const lesson = getLessonForArchive(r.title, r.category, r.stars);
      const parsedOpts = typeof r.options === 'string' ? JSON.parse(r.options) : r.options;
      let normalizedAnswer = r.correct_answer;
      if (parsedOpts && parsedOpts.length > 0 && !parsedOpts.includes(normalizedAnswer)) {
        const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();
        const plainAnswer = stripLatex(normalizedAnswer);
        const match = parsedOpts.find(opt => stripLatex(opt) === plainAnswer);
        if (match) normalizedAnswer = match;
      }
      return {
        ...r,
        correct_answer: normalizedAnswer,
        options: parsedOpts,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples
      };
    });
    
    // Supplement with 10 procedurally generated problems to ensure it is always an infinite scrolling archive
    const countToGenerate = 10;
    const categoriesList = ['Number Theory', 'Combinatorics', 'Calculus', 'Algebra', 'Mental', 'Arithmetic'];
    const selectedCategory = category || categoriesList[Math.floor(Math.random() * categoriesList.length)];
    const selectedStars = stars || (Math.floor(Math.random() * 5) + 1);
    
    for (let i = 0; i < countToGenerate; i++) {
      const generated = generateArchiveProblem(selectedCategory, selectedStars);
      generated.id = 10000 + i + Math.floor(Math.random() * 90000);
      generated.options = typeof generated.options === 'string' ? JSON.parse(generated.options) : generated.options;
      
      const lesson = getLessonForArchive(generated.title, generated.category, generated.stars);
      results.push({
        ...generated,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples
      });
    }
    
    results = results.map(item => attachTipToProblem(item, true));
    res.json(results);
  });
});

// Mistakes Bank Endpoint: Get all current user errors
app.get('/api/mistakes', authenticateToken, (req, res) => {
  db.get("SELECT level, elo FROM users WHERE id = ?", [req.user.id], (errUser, userRow) => {
    if (errUser) return res.status(500).json({ error: errUser.message });
    const userLevel = userRow ? userRow.level : 1;
    const userElo = userRow ? (userRow.elo || 1000) : 1000;

    db.all("SELECT * FROM user_concept_analytics WHERE user_id = ?", [req.user.id], (err2, analyticsRows) => {
      const analyticsMap = {};
      if (!err2 && analyticsRows) {
        analyticsRows.forEach(row => {
          analyticsMap[row.concept] = row;
        });
      }

      db.all("SELECT * FROM user_mistakes WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsed = rows.map((r, index) => {
          const cat = r.category || 'Arithmetic';
          const normLevel = normalizeLevelForGenerator(cat, userLevel);
          const fresh = generateProblem(cat, normLevel, index, userElo, analyticsMap);
          return {
            ...r,
            question: fresh.question,
            correct_answer: fresh.correctAnswer,
            options: fresh.options,
            explanation: fresh.explanation
          };
        });
        res.json(parsed);
      });
    });
  });
});

// Post a new wrong answer to the Mistakes Bank
app.post('/api/mistakes', authenticateToken, (req, res) => {
  const { category, question, correct_answer, options, explanation } = req.body;
  if (!question || !correct_answer || !options) {
    return res.status(400).json({ error: 'Missing required mistake fields' });
  }
  
  const optionsStr = typeof options === 'string' ? options : JSON.stringify(options);
  const now = Math.floor(Date.now() / 1000);
  
  db.run(
    `INSERT INTO user_mistakes (user_id, category, question, correct_answer, options, explanation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, category || 'Arithmetic', question, correct_answer, optionsStr, explanation || '', now],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.run(
        "UPDATE user_quests SET mistakes_today = mistakes_today + 1 WHERE user_id = ?",
        [req.user.id],
        () => {
          res.json({ success: true, id: this.lastID });
        }
      );
    }
  );
});

// Resolve a logged mistake after answering it correctly
app.post('/api/mistakes/resolve', authenticateToken, (req, res) => {
  const { mistakeId } = req.body;
  if (!mistakeId) return res.status(400).json({ error: 'Mistake ID required' });
  
  db.get("SELECT * FROM user_mistakes WHERE id = ? AND user_id = ?", [mistakeId, req.user.id], (err, mistake) => {
    if (err || !mistake) return res.status(404).json({ error: 'Mistake not found' });
    
    db.run("DELETE FROM user_mistakes WHERE id = ? AND user_id = ?", [mistakeId, req.user.id], (errDel) => {
      if (errDel) return res.status(500).json({ error: errDel.message });
      
      const coinsGained = 10;
      const xpGained = 15;
      
      db.get("SELECT xp, level, coins, league_points, rank FROM users WHERE id = ?", [req.user.id], (errU, user) => {
        if (errU || !user) return res.status(500).json({ error: 'User details not found' });
        
        let newXp = user.xp + xpGained;
        let newLevel = user.level;
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel += 1;
        }
        
        const newCoins = user.coins + coinsGained;
        const newLeaguePoints = (user.league_points || 0) + xpGained;
        const currentRank = user.rank || 'Unranked (Placement: 0/5)';
        
        db.run(
          "UPDATE users SET xp = ?, level = ?, coins = ?, rank = ?, league_points = ? WHERE id = ?",
          [newXp, newLevel, newCoins, currentRank, newLeaguePoints, req.user.id],
          () => {
            res.json({
              success: true,
              coinsGained,
              xpGained,
              xp: newXp,
              level: newLevel,
              coins: newCoins,
              rank: currentRank
            });
          }
        );
      });
    });
  });
});

// Fetch user daily quests standings
app.get('/api/quests', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get("SELECT * FROM user_quests WHERE user_id = ?", [req.user.id], (err, q) => {
      if (err || !q) return res.status(500).json({ error: 'Quest data not found' });
      
      const quests = [
        {
          type: 'solved',
          name: 'Daily Solver',
          description: 'Solve 5 math problems to warm up.',
          target: 5,
          current: Math.min(5, q.solved_today || 0),
          claimed: q.solved_claimed,
          rewardCoins: 20,
          rewardXp: 30
        },
        {
          type: 'duels',
          name: 'Arena Duelist',
          description: 'Win or play 2 Arena duels.',
          target: 2,
          current: Math.min(2, q.duels_today || 0),
          claimed: q.duels_claimed,
          rewardCoins: 30,
          rewardXp: 50
        },
        {
          type: 'mistakes',
          name: 'Focus Practice',
          description: 'Solve or review 3 growth equations.',
          target: 3,
          current: Math.min(3, q.mistakes_today || 0),
          claimed: q.mistakes_claimed,
          rewardCoins: 25,
          rewardXp: 40
        },
        {
          type: 'daily_puzzle',
          name: 'Daily Puzzle Master',
          description: 'Solve the rotating Daily Puzzle.',
          target: 1,
          current: Math.min(1, q.daily_puzzle_today || 0),
          claimed: q.daily_puzzle_claimed,
          rewardCoins: 40,
          rewardXp: 60
        }
      ];
      
      res.json(quests);
    });
  });
});

// Claim a completed daily quest
app.post('/api/quests/claim', authenticateToken, (req, res) => {
  const { questType } = req.body;
  if (!questType) return res.status(400).json({ error: 'Quest type required' });
  
  db.get("SELECT * FROM user_quests WHERE user_id = ?", [req.user.id], (err, q) => {
    if (err || !q) return res.status(404).json({ error: 'Quest data not found' });
    
    let current = 0;
    let target = 0;
    let claimed = 0;
    let rewardCoins = 0;
    let rewardXp = 0;
    let claimColumn = '';
    
    if (questType === 'solved') {
      current = q.solved_today;
      target = 5;
      claimed = q.solved_claimed;
      rewardCoins = 20;
      rewardXp = 30;
      claimColumn = 'solved_claimed';
    } else if (questType === 'duels') {
      current = q.duels_today;
      target = 2;
      claimed = q.duels_claimed;
      rewardCoins = 30;
      rewardXp = 50;
      claimColumn = 'duels_claimed';
    } else if (questType === 'mistakes') {
      current = q.mistakes_today;
      target = 3;
      claimed = q.mistakes_claimed;
      rewardCoins = 25;
      rewardXp = 40;
      claimColumn = 'mistakes_claimed';
    } else if (questType === 'daily_puzzle') {
      current = q.daily_puzzle_today;
      target = 1;
      claimed = q.daily_puzzle_claimed;
      rewardCoins = 40;
      rewardXp = 60;
      claimColumn = 'daily_puzzle_claimed';
    } else {
      return res.status(400).json({ error: 'Invalid quest type' });
    }
    
    if (current < target) return res.status(400).json({ error: 'Quest target not met yet' });
    if (claimed === 1) return res.status(400).json({ error: 'Quest reward already claimed' });
    
    db.run(`UPDATE user_quests SET ${claimColumn} = 1 WHERE user_id = ? AND ${claimColumn} = 0`, [req.user.id], function(errClaim) {
      if (errClaim) return res.status(500).json({ error: errClaim.message });
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Quest reward already claimed' });
      }
      
      db.get("SELECT xp, level, coins, league_points, rank FROM users WHERE id = ?", [req.user.id], (errU, user) => {
        if (errU || !user) return res.status(500).json({ error: 'User not found' });
        
        let newXp = user.xp + rewardXp;
        let newLevel = user.level;
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel += 1;
        }
        
        const newCoins = user.coins + rewardCoins;
        const newLeaguePoints = (user.league_points || 0) + rewardXp;
        const currentRank = user.rank || 'Unranked (Placement: 0/5)';
        
        db.run(
          "UPDATE users SET xp = ?, level = ?, coins = ?, rank = ?, league_points = ? WHERE id = ?",
          [newXp, newLevel, newCoins, currentRank, newLeaguePoints, req.user.id],
          () => {
            res.json({
              success: true,
              rewardCoins,
              rewardXp,
              xp: newXp,
              level: newLevel,
              coins: newCoins,
              rank: currentRank
            });
          }
        );
      });
    });
  });
});

// Get the active calendar-day puzzle
app.get('/api/math/daily-puzzle', authenticateToken, (req, res) => {
  db.all("SELECT * FROM archive_exercises WHERE stars >= 3", (err, exercises) => {
    if (err) return res.status(500).json({ error: err.message });
    
    let puzzle;
    if (exercises && exercises.length > 0) {
      const dayIndex = Math.floor(Date.now() / 86400000) % exercises.length;
      puzzle = exercises[dayIndex];
    } else {
      puzzle = generateArchiveProblem('Number Theory', 4);
    }
    
    const lesson = getLessonForArchive(puzzle.title, puzzle.category, puzzle.stars);
    
    db.get("SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?", [req.user.id], (errQ, q) => {
      const solved = q ? q.daily_puzzle_today >= 1 : false;
      const parsedOptions = typeof puzzle.options === 'string' ? JSON.parse(puzzle.options) : puzzle.options;
      
      // Normalize correct_answer to exactly match one of the options
      // (some archive exercises store plain text answers while options have LaTeX formatting)
      let normalizedAnswer = puzzle.correct_answer;
      if (parsedOptions && parsedOptions.length > 0 && !parsedOptions.includes(normalizedAnswer)) {
        const stripLatex = (s) => s.replace(/\$/g, '').replace(/\\dots/g, '...').replace(/\\\\dots/g, '...').trim();
        const plainAnswer = stripLatex(normalizedAnswer);
        const matchingOption = parsedOptions.find(opt => stripLatex(opt) === plainAnswer);
        if (matchingOption) {
          normalizedAnswer = matchingOption;
        }
      }
      
      const puzzleResponse = {
        id: puzzle.id || 9999,
        title: puzzle.title,
        story: puzzle.story,
        question: puzzle.question,
        correct_answer: normalizedAnswer,
        options: parsedOptions,
        explanation: puzzle.explanation,
        category: puzzle.category,
        stars: puzzle.stars,
        source: puzzle.source,
        solved_today: solved,
        lessonTitle: lesson.lessonTitle,
        lessonContent: lesson.lessonContent,
        lessonFormula: lesson.lessonFormula,
        examples: lesson.examples
      };
      
      res.json(attachTipToProblem(puzzleResponse, true));
    });
  });
});

// Submit evaluation for the daily puzzle
app.post('/api/math/daily-puzzle/submit', authenticateToken, (req, res) => {
  const { correct } = req.body;
  if (correct === undefined) {
    return res.status(400).json({ error: 'Correctness boolean required' });
  }
  
  if (!correct) {
    return res.json({ success: false, message: 'Incorrect answer. Try again!' });
  }
  
  db.get("SELECT daily_puzzle_today FROM user_quests WHERE user_id = ?", [req.user.id], (errQ, q) => {
    if (errQ) return res.status(500).json({ error: errQ.message });
    
    const alreadySolved = q ? q.daily_puzzle_today >= 1 : false;
    if (alreadySolved) {
      return res.json({ success: true, message: 'Already solved today!', alreadySolved: true });
    }
    
    db.run("UPDATE user_quests SET daily_puzzle_today = 1 WHERE user_id = ?", [req.user.id], () => {
      db.get("SELECT xp, level, coins, rank, daily_puzzles_solved FROM users WHERE id = ?", [req.user.id], (errU, user) => {
        if (errU || !user) return res.status(500).json({ error: 'User details not found' });
        
        let newXp = user.xp + 50;
        let newLevel = user.level;
        while (newXp >= newLevel * 100) {
          newXp -= newLevel * 100;
          newLevel += 1;
        }
        
        const newCoins = user.coins + 30;
        const newSolvedCount = (user.daily_puzzles_solved || 0) + 1;
        
        db.run(
          "UPDATE users SET xp = ?, level = ?, coins = ?, daily_puzzles_solved = ? WHERE id = ?",
          [newXp, newLevel, newCoins, newSolvedCount, req.user.id],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: updateErr.message });
            
            updateAchievements(req.user.id, () => {
              res.json({
                success: true,
                message: 'Daily puzzle marked solved, rewards credited and achievements updated.',
                rewardCoins: 30,
                rewardXp: 50,
                xp: newXp,
                level: newLevel,
                coins: newCoins,
                rank: user.rank || 'Unranked (Placement: 0/5)'
              });
            });
          }
        );
      });
    });
  });
});

// Get league leaderboard details
app.get('/api/league/leaderboard', authenticateToken, (req, res) => {
  checkAndResetQuestsAndLeagues(req.user.id, () => {
    db.get("SELECT league, last_league_reset FROM users WHERE id = ?", [req.user.id], (err, currentUser) => {
      if (err || !currentUser) return res.status(500).json({ error: 'User not found' });
      
      const userLeague = currentUser.league || 'Bronze';
      const lastReset = currentUser.last_league_reset || 0;
      const now = Math.floor(Date.now() / 1000);
      const secondsRemaining = Math.max(0, (7 * 86400) - (now - lastReset));
      
      db.all(
        `SELECT id, username, league_points, avatar, active_badge, level 
         FROM users 
         WHERE league = ? 
         ORDER BY league_points DESC 
         LIMIT 30`,
        [userLeague],
        (errL, rows) => {
          if (errL) return res.status(500).json({ error: errL.message });
          
          res.json({
            league: userLeague,
            seconds_remaining: secondsRemaining,
            standings: rows
          });
        }
      );
    });
  });
});

// -------------------------------------------------------------
// SHOP & INVENTORY ENDPOINTS
// -------------------------------------------------------------

function getRankValue(rankStr) {
  if (!rankStr) return 0;
  const cleaned = rankStr.replace(/Unranked.*/i, '').trim();
  if (!cleaned) return 0;
  
  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster'];
  const divisions = ['III', 'II', 'I'];
  
  let tierVal = 0;
  for (let i = 0; i < ranks.length; i++) {
    if (cleaned.startsWith(ranks[i])) {
      tierVal = (i + 1) * 10;
      break;
    }
  }
  
  let divVal = 0;
  for (let j = 0; j < divisions.length; j++) {
    if (cleaned.endsWith(divisions[j])) {
      divVal = j + 1;
      break;
    }
  }
  
  return tierVal + divVal;
}

app.get('/api/shop', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM shop_items`, (err, allItems) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`SELECT item_id FROM user_inventory WHERE user_id = ?`, [req.user.id], (errInv, inventoryRows) => {
      if (errInv) return res.status(500).json({ error: errInv.message });
      const inventory = inventoryRows.map(i => i.item_id);

      db.all(`SELECT item_id, quantity FROM user_utilities WHERE user_id = ?`, [req.user.id], (errUtil, utilityRows) => {
        if (errUtil) return res.status(500).json({ error: errUtil.message });
        const utilities = utilityRows.map(u => ({ item_id: u.item_id, quantity: u.quantity }));

        db.get(`SELECT coins, total_coins_earned, solved_count, rank FROM users WHERE id = ?`, [req.user.id], (errUser, user) => {
          if (errUser || !user) return res.status(500).json({ error: 'User data not found' });

          const totalEarned = user.total_coins_earned || 100;
          const currentCoins = user.coins || 0;
          const saveRate = currentCoins / totalEarned;

          let discountFactor = 1.0;
          if (saveRate > 0.7 && currentCoins > 600) {
            discountFactor = 0.85;
          } else if (currentCoins < 200 && user.solved_count > 50) {
            discountFactor = 0.90;
          }

          const nowMs = Date.now();
          const todayStamp = Math.floor(nowMs / (86400 * 1000));
          const threeDayStamp = Math.floor(nowMs / (3 * 86400 * 1000));
          
          const secondsUntilMidnight = Math.ceil((new Date().setHours(24,0,0,0) - nowMs) / 1000);
          const secondsUntilThreeDays = Math.ceil((((threeDayStamp + 1) * 3 * 86400 * 1000) - nowMs) / 1000);

          const purchaseableItems = allItems.filter(item => item.cost > 0);
          
          const featuredPool = purchaseableItems.filter(item => !item.is_utility && (item.rarity === 'Epic' || item.rarity === 'Legendary' || item.rarity === 'Mythic'));
          const dailyPool = purchaseableItems.filter(item => !item.is_utility && (item.rarity === 'Common' || item.rarity === 'Rare' || item.rarity === 'Epic'));
          const utilityPool = purchaseableItems.filter(item => item.is_utility === 1);

          const featured = [];
          if (featuredPool.length > 0) {
            const idx1 = threeDayStamp % featuredPool.length;
            const idx2 = (threeDayStamp + 3) % featuredPool.length;
            featured.push(featuredPool[idx1]);
            if (featuredPool.length > 1 && idx1 !== idx2) {
              featured.push(featuredPool[idx2]);
            } else if (featuredPool.length > 1) {
              featured.push(featuredPool[(idx1 + 1) % featuredPool.length]);
            }
          }

          const daily = [];
          if (dailyPool.length > 0) {
            for (let i = 0; i < 4; i++) {
              const idx = (todayStamp + i * 13) % dailyPool.length;
              const selectedItem = dailyPool[idx];
              if (!featured.some(f => f.id === selectedItem.id)) {
                daily.push(selectedItem);
              }
            }
            let offset = 1;
            while (daily.length < 4 && dailyPool.length > daily.length) {
              const idx = (todayStamp + offset) % dailyPool.length;
              const selectedItem = dailyPool[idx];
              if (!featured.some(f => f.id === selectedItem.id) && !daily.some(d => d.id === selectedItem.id)) {
                daily.push(selectedItem);
              }
              offset++;
            }
          }

          const processRotatedItem = (item) => {
            if (item.is_utility) return { ...item, originalCost: item.cost, discountActive: false };

            const discountedCost = Math.round(item.cost * discountFactor);
            const hasDiscount = discountedCost < item.cost;
            return {
              ...item,
              cost: discountedCost,
              originalCost: item.cost,
              discountActive: hasDiscount
            };
          };

          const featuredItems = featured.map(item => processRotatedItem(item));
          const dailyItems = daily.map(item => processRotatedItem(item));
          const utilityItems = utilityPool.map(item => processRotatedItem(item));

          // Concatenate all active items for backward compatibility
          const items = [...featuredItems, ...dailyItems, ...utilityItems];

          res.json({
            items,
            featuredItems,
            dailyItems,
            utilityItems,
            inventory,
            utilities,
            expiresInSeconds: secondsUntilMidnight,
            featuredExpiresInSeconds: secondsUntilThreeDays,
            saveRate,
            discountApplied: discountFactor < 1.0
          });
        });
      });
    });
  });
});

app.post('/api/shop/purchase', authenticateToken, (req, res) => {
  const { itemId } = req.body;
  if (!itemId) return res.status(400).json({ error: 'Item ID required' });

  db.get(`SELECT * FROM shop_items WHERE id = ?`, [itemId], (err, item) => {
    if (err || !item) return res.status(404).json({ error: 'Item not found' });

    db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], (errUser, user) => {
      if (errUser || !user) return res.status(404).json({ error: 'User not found' });

      // Rank Locks check for prestigious cosmetic items
      const requiredRank = item.required_rank;
      if (requiredRank && getRankValue(user.rank) < getRankValue(requiredRank)) {
        return res.status(400).json({ error: `Locked: Requires competitive rank ${requiredRank}` });
      }

      // Calculate cost with potential dynamic spending discount
      const totalEarned = user.total_coins_earned || 100;
      const currentCoins = user.coins || 0;
      const saveRate = currentCoins / totalEarned;

      let discountFactor = 1.0;
      if (saveRate > 0.7 && currentCoins > 600) {
        discountFactor = 0.85;
      } else if (currentCoins < 200 && user.solved_count > 50) {
        discountFactor = 0.90;
      }

      const finalCost = item.is_utility ? item.cost : Math.round(item.cost * discountFactor);

      // Perform atomic conditional coins deduction to prevent concurrent double-spending exploits
      db.run(
        `UPDATE users SET coins = coins - ?, total_coins_spent = total_coins_spent + ? WHERE id = ? AND coins >= ?`,
        [finalCost, finalCost, req.user.id, finalCost],
        function(errDeduct) {
          if (errDeduct) return res.status(500).json({ error: errDeduct.message });
          if (this.changes === 0) {
            return res.status(400).json({ error: 'Insufficient coins or concurrent transaction conflict' });
          }

          // Coin deduction succeeded, now perform item grant
          if (item.is_utility === 1) {
            db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = ?", [req.user.id, itemId], (errUtil, utilRow) => {
              if (errUtil) {
                // Refund on database error
                db.run(`UPDATE users SET coins = coins + ?, total_coins_spent = total_coins_spent - ? WHERE id = ?`, [finalCost, finalCost, req.user.id]);
                return res.status(500).json({ error: errUtil.message });
              }
              
              const newQty = (utilRow ? utilRow.quantity : 0) + 1;
              const saveOrUpdate = () => {
                if (utilRow) {
                  db.run("UPDATE user_utilities SET quantity = ? WHERE user_id = ? AND item_id = ?", [newQty, req.user.id, itemId], finalizePurchase);
                } else {
                  db.run("INSERT INTO user_utilities (user_id, item_id, quantity) VALUES (?, ?, 1)", [req.user.id, itemId], finalizePurchase);
                }
              };
              
              const finalizePurchase = (errFinal) => {
                if (errFinal) {
                  // Refund on database error
                  db.run(`UPDATE users SET coins = coins + ?, total_coins_spent = total_coins_spent - ? WHERE id = ?`, [finalCost, finalCost, req.user.id]);
                  return res.status(500).json({ error: errFinal.message });
                }
                
                if (itemId === 'item_xp_booster') {
                  db.run("UPDATE users SET xp_booster_uses_left = xp_booster_uses_left + 3 WHERE id = ?", [req.user.id]);
                }
                res.json({ success: true, message: 'Booster purchased successfully', coinsLeft: user.coins - finalCost });
              };
              
              saveOrUpdate();
            });
          } else {
            db.run(
              `INSERT INTO user_inventory (user_id, item_id) VALUES (?, ?)`,
              [req.user.id, itemId],
              (errInv) => {
                if (errInv) {
                  // Refund the coins since the transaction is rolled back
                  db.run(`UPDATE users SET coins = coins + ?, total_coins_spent = total_coins_spent - ? WHERE id = ?`, [finalCost, finalCost, req.user.id]);
                  
                  if (errInv.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Item already purchased' });
                  }
                  return res.status(500).json({ error: errInv.message });
                }

                res.json({ success: true, message: 'Item purchased successfully', coinsLeft: user.coins - finalCost });
              }
            );
          }
        }
      );
    });
  });
});

app.post('/api/shop/equip', authenticateToken, (req, res) => {
  const { type, value } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'Type and value required' });

  let column = '';
  if (type === 'theme') column = 'theme';
  else if (type === 'avatar') column = 'avatar';
  else if (type === 'badge') column = 'active_badge';
  else if (type === 'banner') column = 'active_banner';
  else return res.status(400).json({ error: 'Invalid configuration type' });

  // Security: Allow equipping default starter items without ownership checks
  const isDefault = (type === 'theme') ||
                    (type === 'avatar' && value === 'avatar_pythagoras') ||
                    (type === 'badge' && value === 'Math Novice') ||
                    (type === 'banner' && value === 'banner_default');

  if (isDefault) {
    db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [value, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, equipped: column, value });
    });
  } else {
    // Verify user owns the item in user_inventory
    db.get(
      `SELECT 1 FROM user_inventory ui 
       JOIN shop_items s ON ui.item_id = s.id 
       WHERE ui.user_id = ? AND (s.value = ? OR s.id = ?)`,
      [req.user.id, value, value],
      (errInv, row) => {
        if (errInv) return res.status(500).json({ error: errInv.message });
        if (!row) {
          securityLog(req.user.id, 'economy_manipulation_attempt', req.ip, `Attempted to equip unowned item of type ${type} with value: ${value}`);
          return res.status(403).json({ error: 'You do not own this customization item.' });
        }
        
        db.run(`UPDATE users SET ${column} = ? WHERE id = ?`, [value, req.user.id], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, equipped: column, value });
        });
      }
    );
  }
});

app.post('/api/shop/consume-retry', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.get("SELECT quantity FROM user_utilities WHERE user_id = ? AND item_id = 'item_retry_token'", [userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row || row.quantity <= 0) {
      return res.status(400).json({ error: 'No Retry Tokens left' });
    }
    db.run(
      "UPDATE user_utilities SET quantity = quantity - 1 WHERE user_id = ? AND item_id = 'item_retry_token'",
      [userId],
      (errUpdate) => {
        if (errUpdate) return res.status(500).json({ error: errUpdate.message });
        res.json({ success: true, message: 'Retry token consumed successfully' });
      }
    );
  });
});

// -------------------------------------------------------------
// USER SETTINGS ENDPOINTS
// -------------------------------------------------------------

app.post('/api/user/settings', authenticateToken, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required' });
  }

  if (newPassword.length < 8 || newPassword.length > 100) {
    return res.status(400).json({ error: 'New password must be between 8 and 100 characters' });
  }

  db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!isMatch) {
      securityLog(req.user.id, 'auth_failure', req.ip, 'Invalid old password during password change attempt.');
      return res.status(401).json({ error: 'Invalid old password' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id], (errUpdate) => {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });
      
      // Stateful session invalidation: delete all active sessions for the user to force relogin
      db.run('DELETE FROM user_sessions WHERE user_id = ?', [req.user.id], (errSessions) => {
        if (errSessions) console.error("[SECURITY] Failed to invalidate sessions on password change:", errSessions.message);
        securityLog(req.user.id, 'password_changed', req.ip, 'Password changed successfully. All user sessions invalidated.');
        res.json({ success: true, message: 'Password updated successfully. All other sessions have been invalidated.' });
      });
    });
  });
});

app.post('/api/user/change-username', authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username || username.trim().length < 3 || username.trim().length > 25) {
    return res.status(400).json({ error: 'Username must be between 3 and 25 characters.' });
  }
  const cleanUsername = username.trim();
  db.get('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, req.user.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'Username is already taken.' });

    db.run('UPDATE users SET username = ? WHERE id = ?', [cleanUsername, req.user.id], (errUpdate) => {
      if (errUpdate) return res.status(500).json({ error: errUpdate.message });
      securityLog(req.user.id, 'username_changed', req.ip, `Username updated from ${req.user.username} to ${cleanUsername}`);
      res.json({ success: true, message: 'Username updated successfully!', username: cleanUsername });
    });
  });
});

app.post('/api/user/change-email/request', authenticateToken, (req, res) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Math.floor(Date.now() / 1000);
  
  db.run(
    `INSERT OR REPLACE INTO user_email_verifications (user_id, new_email, code, created_at)
     VALUES (?, ?, ?, ?)`,
    [req.user.id, cleanEmail, code, now],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      console.log(`[EMAIL VERIFICATION] Sent to user ${req.user.id} (${cleanEmail}): ${code}`);
      res.json({ success: true, message: 'Verification code sent!', code: code });
    }
  );
});

app.post('/api/user/change-email/verify', authenticateToken, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required.' });
  
  db.get('SELECT * FROM user_email_verifications WHERE user_id = ?', [req.user.id], (err, record) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!record) return res.status(400).json({ error: 'No verification request pending.' });
    
    if (record.code !== code.trim()) {
      securityLog(req.user.id, 'verification_failure', req.ip, 'Invalid email verification code entered.');
      return res.status(400).json({ error: 'Invalid verification code.' });
    }
    
    db.serialize(() => {
      db.run('UPDATE users SET email = ? WHERE id = ?', [record.new_email, req.user.id]);
      db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [req.user.id]);
      
      securityLog(req.user.id, 'email_changed', req.ip, `Email changed successfully to ${record.new_email}.`);
      res.json({ success: true, message: 'Email address updated successfully!', email: record.new_email });
    });
  });
});

app.post('/api/user/privacy', authenticateToken, (req, res) => {
  const { telemetryEnabled, profilePrivate } = req.body;
  const telVal = telemetryEnabled ? 1 : 0;
  const privVal = profilePrivate ? 1 : 0;
  
  db.run(
    'UPDATE users SET telemetry_enabled = ?, profile_private = ? WHERE id = ?',
    [telVal, privVal, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      securityLog(req.user.id, 'privacy_settings_updated', req.ip, `Telemetry: ${telemetryEnabled}, Private Profile: ${profilePrivate}`);
      res.json({ success: true, message: 'Privacy preferences saved successfully.' });
    }
  );
});

app.get('/api/user/sessions', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, user_id, user_agent, ip_address, created_at, expires_at 
     FROM user_sessions 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const currentSessionId = req.user.sessionId;
      const mapped = (rows || []).map(row => ({
        ...row,
        is_current: row.id === currentSessionId
      }));
      res.json(mapped);
    }
  );
});

app.post('/api/user/sessions/revoke', authenticateToken, (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required.' });
  
  db.run(
    'DELETE FROM user_sessions WHERE id = ? AND user_id = ?',
    [sessionId, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Session not found.' });
      
      securityLog(req.user.id, 'session_revoked', req.ip, `Session ${sessionId} was revoked by the user.`);
      res.json({ success: true, message: 'Session revoked successfully.' });
    }
  );
});

app.get('/api/user/security-logs', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, timestamp, event_type, ip_address, details 
     FROM security_audit_logs 
     WHERE user_id = ? 
     ORDER BY timestamp DESC 
     LIMIT 100`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.get('/api/user/export-data', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const exportedData = {};
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'User not found' });
    exportedData.profile = {
      username: user.username,
      email: user.email,
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      rank: user.rank,
      streak: user.streak,
      active_badge: user.active_badge,
      theme: user.theme,
      avatar: user.avatar,
      solved_count: user.solved_count,
      arena_wins: user.arena_wins,
      active_banner: user.active_banner
    };
    
    db.all('SELECT item_id FROM user_inventory WHERE user_id = ?', [userId], (errInv, inv) => {
      exportedData.inventory = (inv || []).map(i => i.item_id);
      
      db.all('SELECT topic, ease_factor, interval, repetitions FROM srs_reviews WHERE user_id = ?', [userId], (errSrs, srs) => {
        exportedData.srs_reviews = srs || [];
        
        db.all('SELECT category, question, correct_answer FROM user_mistakes WHERE user_id = ?', [userId], (errMist, mistakes) => {
          exportedData.mistakes = mistakes || [];
          
          db.all('SELECT title, category, question FROM saved_exercises WHERE user_id = ?', [userId], (errFav, favs) => {
            exportedData.favorites = favs || [];
            
            db.all('SELECT timestamp, event_type, details FROM security_audit_logs WHERE user_id = ?', [userId], (errLogs, logs) => {
              exportedData.security_logs = logs || [];
              
              securityLog(userId, 'data_exported', req.ip, 'User requested GDPR-compliant account data export.');
              
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Content-Disposition', 'attachment; filename=numera_user_data.json');
              res.json(exportedData);
            });
          });
        });
      });
    });
  });
});

app.post('/api/user/delete-account', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.serialize(() => {
    db.run('DELETE FROM user_email_verifications WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
    db.run('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);
    db.run('DELETE FROM user_utilities WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_inventory WHERE user_id = ?', [userId]);
    db.run('DELETE FROM srs_reviews WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_mistakes WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_quests WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_mastery WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_achievements WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_concept_analytics WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_commitment_history WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_commitment_relics WHERE user_id = ?', [userId]);
    db.run('DELETE FROM saved_exercises WHERE user_id = ?', [userId]);
    db.run('DELETE FROM user_notifications WHERE user_id = ?', [userId]);
    db.run('DELETE FROM security_audit_logs WHERE user_id = ?', [userId]);
    db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Account deleted successfully. All data wiped.' });
    });
  });
});

// -------------------------------------------------------------
// ADMIN ENDPOINTS
// -------------------------------------------------------------

app.get('/api/admin/security-logs', authenticateToken, (req, res) => {
  if (req.user.username !== 'admin') {
    securityLog(req.user.id, 'unauthorized_admin_access', req.ip, `Non-admin user attempted to access security logs.`);
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  db.all(
    `SELECT sl.id, sl.timestamp, sl.user_id, u.username, sl.event_type, sl.ip_address, sl.details
     FROM security_audit_logs sl
     LEFT JOIN users u ON sl.user_id = u.id
     ORDER BY sl.timestamp DESC
     LIMIT 500`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// -------------------------------------------------------------
// FRIENDS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/friends', authenticateToken, (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.xp, u.level, u.rank, u.active_badge, u.avatar, u.active_banner, f.status
     FROM friends f
     JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
     WHERE (f.user_id = ? OR f.friend_id = ?) AND u.id != ?`,
    [req.user.id, req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  if (!friendUsername) return res.status(400).json({ error: 'Username required' });

  db.get(`SELECT id FROM users WHERE username = ?`, [friendUsername], (err, target) => {
    if (err || !target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    db.get(
      `SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
      [req.user.id, target.id, target.id, req.user.id],
      (errConn, conn) => {
        if (errConn) return res.status(500).json({ error: errConn.message });
        if (conn) {
          if (conn.status === 'accepted') {
            return res.status(400).json({ error: 'Friend connection already exists' });
          }
          if (conn.user_id === req.user.id) {
            return res.status(400).json({ error: 'Friend request already sent' });
          }
          // Reverse pending request exists, so accept immediately
          db.run(
            `UPDATE friends SET status = 'accepted' WHERE id = ?`,
            [conn.id],
            (errUpdate) => {
              if (errUpdate) return res.status(500).json({ error: errUpdate.message });
              db.run(
                `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
                 VALUES (?, 'Friend Request Accepted 🤝', ?, 'social', 0, ?)`,
                [conn.user_id, `${req.user.username} accepted your friend request!`, Math.floor(Date.now() / 1000)]
              );
              return res.json({ success: true, message: 'Friend request accepted immediately' });
            }
          );
          return;
        }

        db.run(
          `INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
          [req.user.id, target.id],
          (err2) => {
            if (err2) {
              if (err2.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Friend connection already exists' });
              }
              return res.status(500).json({ error: err2.message });
            }
            db.run(
              `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
               VALUES (?, 'New Friend Request 👤', ?, 'social', 0, ?)`,
              [target.id, `${req.user.username} sent you a friend request.`, Math.floor(Date.now() / 1000)]
            );
            res.json({ success: true, message: 'Friend request sent' });
          }
        );
      }
    );
  });
});

app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  if (!friendId) return res.status(400).json({ error: 'Friend ID required' });

  db.run(
    `UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`,
    [friendId, req.user.id], // request was sent from friendId to current user
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Pending friend request not found' });
      db.run(
        `INSERT INTO user_notifications (user_id, title, message, type, read_state, created_at)
         VALUES (?, 'Friend Request Accepted 🤝', ?, 'social', 0, ?)`,
        [friendId, `${req.user.username} accepted your friend request!`, Math.floor(Date.now() / 1000)]
      );
      res.json({ success: true, message: 'Friend request accepted' });
    }
  );
});

// -------------------------------------------------------------
// LEADERBOARD ENDPOINT
// -------------------------------------------------------------

app.get('/api/leaderboard', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, username, xp, level, rank, active_badge, avatar, active_banner FROM users ORDER BY level DESC, xp DESC LIMIT 20`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// -------------------------------------------------------------
// ACHIEVEMENTS ENDPOINTS
// -------------------------------------------------------------

app.get('/api/achievements', authenticateToken, (req, res) => {
  updateAchievements(req.user.id, () => {
    db.all(`
      SELECT a.id, a.name, a.description, a.icon, a.target_value, a.reward_coins,
             a.category, a.chain_id, a.chain_order, a.is_hidden,
             COALESCE(ua.progress, 0) AS progress,
             COALESCE(ua.claimed, 0) AS claimed,
             COALESCE(ua.completed_at, 0) AS completed_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
    `, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      
      const processed = rows.map(r => {
        const isCompleted = r.completed_at > 0;
        if (r.is_hidden && !isCompleted) {
          return {
            ...r,
            name: "???",
            description: "A mysterious milestone..."
          };
        }
        return r;
      });
      res.json(processed);
    });
  });
});


app.post('/api/achievements/claim', authenticateToken, (req, res) => {
  const { achievementId } = req.body;
  if (!achievementId) return res.status(400).json({ error: 'Achievement ID required' });
  
  db.get(`
    SELECT ua.*, a.reward_coins
    FROM user_achievements ua
    JOIN achievements a ON ua.achievement_id = a.id
    WHERE ua.user_id = ? AND ua.achievement_id = ?
  `, [req.user.id, achievementId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Achievement progress not found' });
    if (row.completed_at === 0) return res.status(400).json({ error: 'Achievement not completed yet' });
    if (row.claimed === 1) return res.status(400).json({ error: 'Achievement already claimed' });
    
    // Atomic update check to prevent double-claiming concurrency exploits
    db.run(
      `UPDATE user_achievements SET claimed = 1 
       WHERE user_id = ? AND achievement_id = ? AND claimed = 0 AND completed_at > 0`,
      [req.user.id, achievementId],
      function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        if (this.changes === 0) {
          return res.status(400).json({ error: 'Achievement already claimed or not completed yet' });
        }
        
        db.run(`UPDATE users SET coins = coins + ? WHERE id = ?`, [row.reward_coins, req.user.id], (err3) => {
          if (err3) {
            // rollback claimed state on failure
            db.run(`UPDATE user_achievements SET claimed = 0 WHERE user_id = ? AND achievement_id = ?`, [req.user.id, achievementId]);
            return res.status(500).json({ error: err3.message });
          }
          
          const badgeId = "badge_" + achievementId;
          db.run(`INSERT OR IGNORE INTO user_inventory (user_id, item_id) VALUES (?, ?)`, [req.user.id, badgeId], (errInv) => {
            res.json({ success: true, rewardCoins: row.reward_coins, unlockedBadge: badgeId });
          });
        });
      }
    );
  });
});

// -------------------------------------------------------------
// FAVORITES / SAVED EXERCISES ENDPOINTS
// -------------------------------------------------------------
app.get('/api/favorites', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, title, category, question, correct_answer, options, explanation, collection_id 
     FROM saved_exercises 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const mapped = (rows || []).map(r => {
        let opts = [];
        try {
          opts = JSON.parse(r.options);
        } catch(e) {
          opts = [];
        }
        return {
          id: r.id,
          title: r.title || 'Saved Exercise',
          story: '',
          question: r.question,
          correct_answer: r.correct_answer,
          options: opts,
          explanation: r.explanation,
          category: r.category,
          stars: 3,
          source: 'Favorites',
          collection_id: r.collection_id
        };
      });
      res.json(mapped);
    }
  );
});

app.post('/api/favorites/toggle', authenticateToken, (req, res) => {
  const { title, category, question, correct_answer, options, explanation } = req.body;
  if (!category || !question || !correct_answer || !options || !explanation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  db.get(
    `SELECT id FROM saved_exercises WHERE user_id = ? AND question = ?`,
    [req.user.id, question],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(
          `DELETE FROM saved_exercises WHERE id = ?`,
          [row.id],
          (errDel) => {
            if (errDel) return res.status(500).json({ error: errDel.message });
            return res.json({ success: true, saved: false, message: 'Removed from favorites' });
          }
        );
      } else {
        const now = Math.floor(Date.now() / 1000);
        const optionsStr = JSON.stringify(options);
        db.run(
          `INSERT INTO saved_exercises (user_id, title, category, question, correct_answer, options, explanation, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.id, title || '', category, question, correct_answer, optionsStr, explanation, now],
          (errIns) => {
            if (errIns) return res.status(500).json({ error: errIns.message });
            return res.json({ success: true, saved: true, message: 'Added to favorites' });
          }
        );
      }
    }
  );
});

// -------------------------------------------------------------
// SAVED NOTEBOOK COLLECTIONS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/collections', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, user_id, name, is_public, created_at FROM saved_collections WHERE user_id = ? ORDER BY name ASC',
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/collections', authenticateToken, (req, res) => {
  const { name, is_public } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required.' });
  }
  const now = Math.floor(Date.now() / 1000);
  const isPub = is_public ? 1 : 0;
  
  db.run(
    'INSERT INTO saved_collections (user_id, name, is_public, created_at) VALUES (?, ?, ?, ?)',
    [req.user.id, name.trim(), isPub, now],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A collection with this name already exists.' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ success: true, id: this.lastID, name: name.trim(), is_public: isPub });
    }
  );
});

app.put('/api/collections/:id', authenticateToken, (req, res) => {
  const collectionId = parseInt(req.params.id, 10);
  if (isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });
  
  const { name, is_public } = req.body;
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Collection name is required.' });
  }
  const isPub = is_public ? 1 : 0;

  db.run(
    'UPDATE saved_collections SET name = ?, is_public = ? WHERE id = ? AND user_id = ?',
    [name.trim(), isPub, collectionId, req.user.id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'A collection with this name already exists.' });
        }
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) return res.status(404).json({ error: 'Collection not found.' });
      res.json({ success: true, message: 'Collection updated successfully.' });
    }
  );
});

app.delete('/api/collections/:id', authenticateToken, (req, res) => {
  const collectionId = parseInt(req.params.id, 10);
  if (isNaN(collectionId)) return res.status(400).json({ error: 'Invalid collection ID' });

  // Delete collection
  db.run(
    'DELETE FROM saved_collections WHERE id = ? AND user_id = ?',
    [collectionId, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Collection not found.' });
      
      // Clear associated collection_id references in saved_exercises
      db.run(
        'UPDATE saved_exercises SET collection_id = NULL WHERE collection_id = ? AND user_id = ?',
        [collectionId, req.user.id],
        (errUpdate) => {
          if (errUpdate) return res.status(500).json({ error: errUpdate.message });
          res.json({ success: true, message: 'Collection deleted successfully.' });
        }
      );
    }
  );
});

app.post('/api/favorites/assign-collection', authenticateToken, (req, res) => {
  const { exerciseId, collectionId } = req.body;
  if (!exerciseId) return res.status(400).json({ error: 'Exercise ID is required.' });
  
  // collectionId can be null to unassign
  const collId = collectionId ? parseInt(collectionId, 10) : null;
  
  const updateExercise = () => {
    db.run(
      'UPDATE saved_exercises SET collection_id = ? WHERE id = ? AND user_id = ?',
      [collId, req.user.id, exerciseId],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Exercise not found.' });
        res.json({ success: true, message: 'Collection assigned successfully.' });
      }
    );
  };

  if (collId !== null) {
    // Verify collection belongs to user
    db.get(
      'SELECT id FROM saved_collections WHERE id = ? AND user_id = ?',
      [collId, req.user.id],
      (errColl, row) => {
        if (errColl) return res.status(500).json({ error: errColl.message });
        if (!row) return res.status(404).json({ error: 'Collection not found or access denied.' });
        updateExercise();
      }
    );
  } else {
    updateExercise();
  }
});

app.get('/api/user/:userId/public-collections', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.userId, 10);
  if (isNaN(targetUserId)) return res.status(400).json({ error: 'Invalid user ID' });

  // Get public collections
  db.all(
    'SELECT id, name, created_at FROM saved_collections WHERE user_id = ? AND is_public = 1 ORDER BY name ASC',
    [targetUserId],
    (err, collections) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!collections || collections.length === 0) {
        return res.json([]);
      }

      // Fetch saved exercises for each public collection
      db.all(
        `SELECT id, title, category, question, correct_answer, options, explanation, collection_id 
         FROM saved_exercises 
         WHERE user_id = ? AND collection_id IN (
           SELECT id FROM saved_collections WHERE user_id = ? AND is_public = 1
         )`,
        [targetUserId, targetUserId],
        (errEx, exercises) => {
          if (errEx) return res.status(500).json({ error: errEx.message });

          const results = collections.map(col => {
            const colExercises = (exercises || [])
              .filter(ex => ex.collection_id === col.id)
              .map(ex => {
                let opts = [];
                try {
                  opts = JSON.parse(ex.options);
                } catch(e) {}
                return {
                  id: ex.id,
                  title: ex.title || 'Saved Exercise',
                  story: '',
                  question: ex.question,
                  correct_answer: ex.correct_answer,
                  options: opts,
                  explanation: ex.explanation,
                  category: ex.category,
                  stars: 3,
                  source: 'Favorites',
                  collection_id: ex.collection_id
                };
              });
            return {
              id: col.id,
              name: col.name,
              created_at: col.created_at,
              exercises: colExercises
            };
          });

          res.json(results);
        }
      );
    }
  );
});

// -------------------------------------------------------------
// NOTIFICATIONS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/notifications', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, title, message, type, read_state, created_at 
     FROM user_notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 50`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

app.post('/api/notifications/read', authenticateToken, (req, res) => {
  const { notificationId } = req.body;
  if (notificationId) {
    db.run(
      `UPDATE user_notifications SET read_state = 1 WHERE user_id = ? AND id = ?`,
      [req.user.id, notificationId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  } else {
    db.run(
      `UPDATE user_notifications SET read_state = 1 WHERE user_id = ?`,
      [req.user.id],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      }
    );
  }
});

// -------------------------------------------------------------

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

// Matchmaking intervals
setInterval(() => {
  matchmake(rankedQueue, true);
  matchmake(casualQueue, false);
}, 1500);

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

// Start Server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  setupAdbReverse();
  // Continuously attempt setup every 10 seconds in case the emulator is started after the server
  setInterval(setupAdbReverse, 10000);
});
