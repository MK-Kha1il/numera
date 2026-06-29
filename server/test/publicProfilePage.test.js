// Public web competitive profile (audit #75): a no-auth, crawlable /u/:username page showing a
// player's competitive identity — the shareable face of the ladder. Honors the private-profile flag.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));

test('a public profile renders the competitive rank, title, and an app CTA', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await dbRun("UPDATE users SET competitive_rank = 'Diamond II', competitive_matches = 30, active_title = 'numerist' WHERE id = ?", [uid]);
  await dbRun(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, 'global', 2000, 50, 1700, 30, strftime('%s','now'))
     ON CONFLICT(user_id, domain) DO UPDATE SET display_rating = excluded.display_rating, sessions_count = excluded.sessions_count`,
    [uid]
  );
  await dbRun(
    `INSERT INTO user_ratings (user_id, domain, mu, sigma, display_rating, sessions_count, last_updated)
     VALUES (?, 'algebra', 1900, 60, 1600, 20, strftime('%s','now'))
     ON CONFLICT(user_id, domain) DO UPDATE SET display_rating = excluded.display_rating, sessions_count = excluded.sessions_count`,
    [uid]
  );

  const r = await api(ctx.base, 'GET', `/u/${u.username}`);
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /Diamond II/, 'shows the competitive rank');
  assert.match(html, /Numerist/, 'shows the equipped title');
  assert.match(html, /1700/, 'shows the rating');
  assert.match(html, /Algebra/, 'lists a domain specialty');
  assert.match(html, /Play Numera/i, 'has an app call-to-action');
  assert.match(html, /og:title/, 'carries SEO/social meta tags');
});

test('a private profile is hidden (no rank leaked), but still resolves', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await dbRun("UPDATE users SET competitive_rank = 'Master', competitive_matches = 40, profile_private = 1 WHERE id = ?", [uid]);

  const r = await api(ctx.base, 'GET', `/u/${u.username}`);
  assert.equal(r.status, 200);
  const html = String(r.body);
  assert.match(html, /private/i, 'states the profile is private');
  assert.doesNotMatch(html, /Master/, 'does not leak the private rank');
});

test('an unknown username 404s with a friendly page', async () => {
  const r = await api(ctx.base, 'GET', '/u/no_such_player_xyz');
  assert.equal(r.status, 404);
  assert.match(String(r.body), /not found/i);
});

test('the SVG rank card renders the rank (and the profile references it as its OG image)', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await dbRun("UPDATE users SET competitive_rank = 'Platinum I', competitive_matches = 25 WHERE id = ?", [uid]);

  const card = await api(ctx.base, 'GET', `/u/${u.username}/card.svg`);
  assert.equal(card.status, 200);
  const svg = String(card.body);
  assert.match(svg, /<svg/, 'is an SVG document');
  assert.match(svg, /Platinum I/, 'the card shows the rank');
  assert.match(svg, new RegExp(u.username), 'the card shows the username');

  const page = await api(ctx.base, 'GET', `/u/${u.username}`);
  assert.match(String(page.body), /og:image/, 'the profile page advertises the card as its social image');
  assert.match(String(page.body), /card\.svg/, 'og:image points at the SVG card');
});

test("a private player's card shows no rank", async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  await dbRun("UPDATE users SET competitive_rank = 'Grandmaster', competitive_matches = 50, profile_private = 1 WHERE id = ?", [uid]);
  const card = await api(ctx.base, 'GET', `/u/${u.username}/card.svg`);
  assert.equal(card.status, 200);
  assert.doesNotMatch(String(card.body), /Grandmaster/, 'a private card never leaks the rank');
});
