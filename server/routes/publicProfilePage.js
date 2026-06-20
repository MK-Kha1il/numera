// Public web competitive profile (competitive audit #75 / opp — the reach/SEO lever). A no-auth,
// crawlable page at /u/:username showing a player's competitive identity: rank, career peak, title,
// domain specialties, honor, and season medals — the shareable face of the ladder. Honors the
// profile_private setting. Pure read; follows the public-page pattern of routes/learn.js.
const express = require('express');
const { db } = require('../db');
const { titleName } = require('../lib/titles');
const NRS = require('../mathEngine/ratingEngine');

const router = express.Router();

const get = (sql, p = []) => new Promise((resolve, reject) => db.get(sql, p, (e, r) => (e ? reject(e) : resolve(r))));
const all = (sql, p = []) => new Promise((resolve, reject) => db.all(sql, p, (e, r) => (e ? reject(e) : resolve(r || []))));

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
  *{box-sizing:border-box}
  body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;max-width:680px;margin:0 auto;padding:26px 22px;line-height:1.55;background:#fbfafe}
  a{color:#5b2a86;text-decoration:none}
  header.site{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #eee;padding-bottom:10px;margin-bottom:18px}
  header.site .brand{font-weight:800;letter-spacing:1px;color:#5b2a86}
  .hero{background:linear-gradient(135deg,#7b2ff7,#f107a3);color:#fff;border-radius:16px;padding:22px;text-align:center}
  .hero h1{margin:.1em 0;font-size:1.7rem}
  .hero .rank{font-size:1.15rem;font-weight:700;opacity:.95}
  .hero .title{display:inline-block;margin-top:8px;background:rgba(255,255,255,.2);padding:4px 12px;border-radius:50px;font-weight:700;font-size:.9rem}
  .grid{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0}
  .stat{flex:1 1 30%;background:#fff;border:1px solid #eee;border-radius:10px;padding:12px;text-align:center}
  .stat .n{font-size:1.4rem;font-weight:800;color:#5b2a86}
  .stat .l{font-size:.78rem;color:#777}
  h2{font-size:1.1rem;margin-top:1.4em;border-bottom:1px solid #eee;padding-bottom:4px}
  .row{display:flex;justify-content:space-between;padding:8px 4px;border-bottom:1px solid #f1eef8}
  .row b{color:#3a2a5a}
  .medal{display:inline-block;background:#f0ecf7;color:#5b2a86;border-radius:50px;padding:5px 12px;margin:3px;font-size:.85rem;font-weight:600}
  .cta{display:block;background:linear-gradient(135deg,#7b2ff7,#f107a3);color:#fff;text-align:center;font-weight:700;padding:14px;border-radius:50px;margin:18px 0}
  footer{margin-top:30px;border-top:1px solid #eee;padding-top:14px;color:#888;font-size:.82rem;text-align:center}
`;

function shell({ title, description, body, image }) {
  const imageMeta = image
    ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">`
    : '';
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="profile">
${imageMeta}
<style>${CSS}</style>
</head><body>
<header class="site"><a class="brand" href="/">NUMERA</a><nav><a href="/learn">Lessons</a> · <a href="/worksheet">Worksheets</a></nav></header>
${body}
<footer>Free, private math learning from <a href="/">Numera</a> — the ranked ladder where understanding wins.</footer>
</body></html>`;
}

const DOMAIN_LABELS = {
  arithmetic: 'Arithmetic', algebra: 'Algebra', geometry: 'Geometry', calculus: 'Calculus',
  combinatorics: 'Combinatorics', number_theory: 'Number Theory', statistics: 'Statistics', probability: 'Probability',
};

// Tier → accent colour for the SVG rank card.
const TIER_COLOR = {
  Bronze: '#a86b3c', Silver: '#9fb1c4', Gold: '#e6b422', Platinum: '#5fd3c5',
  Diamond: '#5aa9ff', Master: '#b06bff', Grandmaster: '#ff5b7f',
};

// ── GET /u/:username/card.svg ──────────────────────────────────────────────────
// A shareable SVG rank card — the visual half of the share loop (audit #22). Used as the profile
// page's social/OG image and embeddable anywhere. Private profiles get a generic card (no rank).
router.get('/u/:username/card.svg', async (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  try {
    const user = await get(
      'SELECT id, username, competitive_rank, competitive_matches, profile_private FROM users WHERE username = ? COLLATE NOCASE',
      [String(req.params.username || '')]
    );
    const svg = (name, line, accent) => `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315" viewBox="0 0 600 315">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a0f4a"/><stop offset="1" stop-color="#14081f"/></linearGradient></defs>
  <rect width="600" height="315" fill="url(#g)"/>
  <rect x="0" y="0" width="600" height="8" fill="${accent}"/>
  <text x="40" y="70" fill="#b79bff" font-family="Segoe UI,Arial,sans-serif" font-size="22" font-weight="700" letter-spacing="3">NUMERA</text>
  <text x="40" y="160" fill="#ffffff" font-family="Segoe UI,Arial,sans-serif" font-size="46" font-weight="800">${esc(name)}</text>
  <text x="40" y="210" fill="${accent}" font-family="Segoe UI,Arial,sans-serif" font-size="30" font-weight="700">${esc(line)}</text>
  <text x="40" y="280" fill="#9b8bbf" font-family="Segoe UI,Arial,sans-serif" font-size="18">the ranked math ladder where understanding wins</text>
</svg>`;
    if (!user) return res.send(svg('Numera', 'Play the ranked math ladder', '#b06bff'));
    if (user.profile_private === 1) return res.send(svg(user.username, 'Competitor on Numera', '#b06bff'));
    const placed = (user.competitive_matches || 0) >= 5;
    const rank = placed ? (user.competitive_rank || 'Unranked') : 'Unranked — in placement';
    const tier = String(user.competitive_rank || '').split(' ')[0];
    return res.send(svg(user.username, `🏆 ${rank}`, TIER_COLOR[tier] || '#b06bff'));
  } catch {
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="315"><rect width="600" height="315" fill="#14081f"/></svg>`);
  }
});

router.get('/u/:username', async (req, res) => {
  try {
    const username = String(req.params.username || '');
    const user = await get(
      'SELECT id, username, competitive_rank, competitive_matches, elo, active_title, profile_private FROM users WHERE username = ? COLLATE NOCASE',
      [username]
    );
    if (!user) {
      return res.status(404).send(shell({ title: 'Profile not found · Numera', description: 'No such player.', body: '<div class="hero"><h1>Player not found</h1></div>' }));
    }
    if (user.profile_private === 1) {
      return res.send(shell({
        title: `${user.username} · Numera`,
        description: 'This Numera competitive profile is private.',
        body: `<div class="hero"><h1>${esc(user.username)}</h1><div class="rank">This profile is private.</div></div>`,
      }));
    }

    const ratings = await all('SELECT domain, display_rating, sessions_count FROM user_ratings WHERE user_id = ?', [user.id]);
    const global = ratings.find((r) => r.domain === 'global');
    const placed = (user.competitive_matches || 0) >= 5;
    const rank = user.competitive_rank || 'Unranked';
    const title = user.active_title ? titleName(user.active_title) : '';

    const specialties = ratings
      .filter((r) => r.domain !== 'global' && r.sessions_count >= 5)
      .sort((a, b) => b.display_rating - a.display_rating)
      .slice(0, 6);

    const honor = await get('SELECT COUNT(*) AS n FROM commendations WHERE to_user = ?', [user.id]);
    const medals = await all(
      'SELECT peak_rank, season_name FROM season_awards WHERE user_id = ? ORDER BY id DESC LIMIT 8',
      [user.id]
    ).catch(() => []);

    const heroRank = placed ? esc(rank) : 'Unranked — still in placement';
    const desc = placed
      ? `${user.username} is ${rank} on Numera, the ranked math ladder where understanding wins.`
      : `${user.username} is climbing the ranked math ladder on Numera.`;

    const specialtyRows = specialties.length
      ? specialties.map((s) => `<div class="row"><b>${esc(DOMAIN_LABELS[s.domain] || s.domain)}</b><span>${esc(NRS.displayRatingToRank(s.display_rating, s.sessions_count))} · ${s.display_rating}</span></div>`).join('')
      : '<div class="row"><span>No ranked specialties yet.</span></div>';

    const medalHtml = medals.length
      ? `<h2>Season medals</h2><div>${medals.map((m) => `<span class="medal">${esc(m.season_name || 'Season')}: ${esc(m.peak_rank)}</span>`).join('')}</div>`
      : '';

    const body = `
    <div class="hero">
      <h1>${esc(user.username)}</h1>
      <div class="rank">🏆 ${heroRank}</div>
      ${title ? `<div class="title">🎖️ ${esc(title)}</div>` : ''}
    </div>
    <div class="grid">
      <div class="stat"><div class="n">${placed && global ? global.display_rating : '—'}</div><div class="l">Rating</div></div>
      <div class="stat"><div class="n">${user.competitive_matches || 0}</div><div class="l">Rated games</div></div>
      <div class="stat"><div class="n">${(honor && honor.n) || 0}</div><div class="l">Honor</div></div>
    </div>
    <h2>Specialties</h2>
    ${specialtyRows}
    ${medalHtml}
    <a class="cta" href="/">Play Numera — climb your own ladder</a>`;

    // OG image = the SVG rank card (absolute URL when APP_BASE_URL is set, so social unfurls work).
    const base = (require('../config').APP_BASE_URL || '').replace(/\/$/, '');
    const cardUrl = `${base}/u/${encodeURIComponent(user.username)}/card.svg`;
    res.send(shell({ title: `${user.username} (${placed ? rank : 'Unranked'}) · Numera`, description: desc, body, image: cardUrl }));
  } catch {
    res.status(500).send(shell({ title: 'Error · Numera', description: 'Something went wrong.', body: '<div class="hero"><h1>Something went wrong</h1></div>' }));
  }
});

module.exports = router;
