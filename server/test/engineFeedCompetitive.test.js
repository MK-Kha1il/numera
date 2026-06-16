// Feed the learning engine from competitive play. Previously only solo telemetry fed the engine;
// bot duels and puzzle rush graded server-side but recorded nothing. These tests prove a graded
// competitive answer now reaches the per-user engine (user_concept_analytics is the canonical
// proof — it's what Growth Insights "strengths" read, and it was empty for competitive-only play).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The engine feed is fire-and-forget after the response; poll the analytics row count until it lands.
async function waitForAnalytics(userId, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const row = await dbGet('SELECT COUNT(*) AS n FROM user_concept_analytics WHERE user_id = ?', [userId]);
    if (row && row.n > 0) return row.n;
    await sleep(50);
  }
  return 0;
}

test('a bot duel feeds the learning engine (concept analytics populated)', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);
  // No engine data before any play.
  assert.equal((await dbGet('SELECT COUNT(*) AS n FROM user_concept_analytics WHERE user_id = ?', [userId])).n, 0);

  const start = await api(ctx.base, 'POST', '/api/duel/bot/start', { token: u.token, body: { tier: 'easy' } });
  assert.equal(start.status, 200);
  const matchId = start.body.matchId;
  // Play with the stored correct answers so the outcomes are well-defined.
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM bot_matches WHERE id = ?', [matchId])).problems_json);
  const answers = stored.map((p) => p.answer);
  const play = await api(ctx.base, 'POST', `/api/duel/bot/${matchId}/play`, { token: u.token, body: { answers } });
  assert.equal(play.status, 200);

  const n = await waitForAnalytics(userId);
  assert.ok(n > 0, 'bot-duel answers were recorded into the engine');
});

test('a puzzle-rush answer feeds the learning engine', async () => {
  const u = await registerUser(ctx.base);
  const userId = await idOf(u.username);

  const start = await api(ctx.base, 'POST', '/api/puzzle-rush/start', { token: u.token });
  assert.equal(start.status, 200);
  const runId = start.body.runId;
  // The run row stores the current problem's template type — that's what attributes the feed.
  const run = await dbGet('SELECT current_answer, current_template_type FROM puzzle_rush_runs WHERE id = ?', [runId]);
  assert.ok(run.current_template_type, 'the run persists the current template type for attribution');

  const submit = await api(ctx.base, 'POST', '/api/puzzle-rush/submit', {
    token: u.token,
    body: { runId, index: 0, answer: run.current_answer },
  });
  assert.equal(submit.status, 200);
  assert.equal(submit.body.correct, true);

  const n = await waitForAnalytics(userId);
  assert.ok(n > 0, 'the puzzle-rush answer was recorded into the engine');
});
