// GET / — a small public page: what Numera is, links to the no-login pages, and a one-line server
// status. GET /download-apk serves the locally built debug APK (dev convenience). The live-duel
// count reads the getter server.js registers as app.get('activeDuelRooms').
const express = require('express');
const path = require('path');
const { db } = require('../db');
const logger = require('../logger');

const router = express.Router();

const page = ({ userCount, roomsCount }) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Numera</title>
<meta name="description" content="A math practice game: levels, hints and worked examples, and ranked duels.">
<style>
  :root { color-scheme: light dark; --fg: #23262b; --muted: #6b6a66; --bg: #fbfaf8; --line: #e6e3de; --link: #4c5ba6; }
  @media (prefers-color-scheme: dark) { :root { --fg: #ecebe8; --muted: #9a988f; --bg: #16171a; --line: #2c2d31; --link: #9aa6e6; } }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 620px; margin: 0 auto; padding: 48px 20px; }
  h1 { font-size: 28px; margin: 0 0 4px; }
  p { margin: 0 0 16px; }
  a { color: var(--link); }
  ul { padding-left: 20px; margin: 0 0 16px; }
  .muted { color: var(--muted); font-size: 14px; }
  footer { border-top: 1px solid var(--line); margin-top: 32px; padding-top: 12px; }
</style>
</head>
<body>
<main>
  <h1>Numera</h1>
  <p class="muted">A math practice game for Android.</p>
  <p>Work through levels from arithmetic to calculus, with a short lesson for each concept and
  hints or a worked example when you get stuck. When you want a challenge, play other people in
  ranked duels, Puzzle Rush or the weekly tournament.</p>
  <p>No ads, no third-party trackers, and nothing to buy. You can export or delete your data from
  the app's settings.</p>
  <ul>
    <li><a href="/learn">Concept lessons</a> — readable without an account</li>
    <li><a href="/worksheet">Printable worksheets</a> with answer keys</li>
    <li><a href="/download-apk">Debug APK</a> (only if it has been built on this machine)</li>
  </ul>
  <footer class="muted">
    Server up · ${userCount} account${userCount === 1 ? '' : 's'} · ${roomsCount} live duel${roomsCount === 1 ? '' : 's'} ·
    <a href="/healthz">/healthz</a>
  </footer>
</main>
</body>
</html>`;

router.get('/', (req, res) => {
  db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
    const userCount = row ? row.count : 0;
    const activeRooms = req.app.get('activeDuelRooms');
    const roomsCount = typeof activeRooms === 'function' ? activeRooms() : 0;
    res.send(page({ userCount, roomsCount }));
  });
});

router.get('/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '../../android/app/build/outputs/apk/debug/app-debug.apk');
  res.download(apkPath, 'numera-debug.apk', (err) => {
    if (!err) return;
    if (!res.headersSent) {
      res.status(404).send('No APK found. Build it first with: cd android && gradlew assembleDebug');
    } else {
      logger.error('APK download interrupted:', err.message);
    }
  });
});

module.exports = router;
