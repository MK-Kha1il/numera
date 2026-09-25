// Landing page + status dashboard (GET /) and the dev APK download (GET /download-apk). Moved out of
// server.js, which is bootstrap only. The live-duel counter reads the getter server.js registers as
// app.get('activeDuelRooms') (the duel engine's state lives in socket/duels.js).
const express = require('express');
const path = require('path');
const { db } = require('../db');
const logger = require('../logger');

const router = express.Router();

router.get('/', (req, res) => {
  db.get("SELECT COUNT(*) AS count FROM users", (err, rowUsers) => {
    const userCount = rowUsers ? rowUsers.count : 0;
    db.get("SELECT COUNT(*) AS count FROM archive_exercises", (err2, rowPuzzles) => {
      const puzzleCount = rowPuzzles ? rowPuzzles.count : 0;
      const activeRooms = req.app.get('activeDuelRooms');
      const roomsCount = typeof activeRooms === 'function' ? activeRooms() : 0;
      
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

// Download APK route (dev convenience: serves the locally built debug APK).
router.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../android/app/build/outputs/apk/debug/app-debug.apk');
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

module.exports = router;
