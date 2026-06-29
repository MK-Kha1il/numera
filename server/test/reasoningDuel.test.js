// Reasoning Arena (competitive audit Phase 3): a ranked round where a point is BANKED only if BOTH
// the answer AND the chosen reason are correct — understanding is the win condition, with no speed
// signal, feeding the unified NRS rating. These tests read the server-side answer key directly to
// construct correct/incorrect submissions (the client never receives it).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbAll = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.all(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => dbGet('SELECT id FROM users WHERE username = ?', [username]).then((r) => r.id);
const keyOf = async (roundId) => JSON.parse((await dbGet('SELECT problems_json FROM reasoning_rounds WHERE id = ?', [roundId])).problems_json);

test('start returns a level round of problems + reason options, with the answer key stripped', async () => {
  const u = await registerUser(ctx.base);
  const res = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(res.body.roundId > 0);
  assert.equal(res.body.problems.length, 5);
  assert.ok(res.body.problems.every((p) => p.answer === undefined && p.reasonCorrectIndex === undefined), 'no answer key leaks to the client');
  assert.ok(res.body.problems.every((p) => Array.isArray(p.reasonOptions) && p.reasonOptions.length >= 2 && p.reasonQuestion), 'each item carries a reason-MCQ');
});

test('banking a point requires BOTH a correct answer AND the correct reason; rating rises on a perfect round', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const answers = probs.map((p) => p.answer);
  const reasons = probs.map((p) => p.reasonCorrectIndex);

  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.total, 5);
  assert.equal(sub.body.answerCorrect, 5);
  assert.equal(sub.body.banked, 5, 'correct answer + correct reason banks every point');
  assert.ok(sub.body.ratingDelta > 0, 'a perfect understanding round raises the unified rating');
  assert.ok(sub.body.newRank, 'a new rank is reported');

  const again = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(again.status, 400, 'a round cannot be submitted twice');
});

test('a correct answer with the WRONG reason banks nothing (the understanding gate)', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const answers = probs.map((p) => p.answer); // every answer correct
  const reasons = probs.map((p) => (p.reasonCorrectIndex + 1) % p.reasonOptions.length); // every reason wrong

  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.answerCorrect, 5, 'all answers were correct');
  assert.equal(sub.body.banked, 0, 'but no reasons correct → nothing banked: speed/recall alone cannot climb');
});

test('daily rated cap: rounds past the cap are playable but rating-neutral (anti-farm)', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  // Seed the day's rated-round cap (10) as already used.
  const now = Date.now();
  for (let i = 0; i < 10; i++) {
    await dbRun(
      "INSERT INTO reasoning_rounds (user_id, level, problems_json, problem_count, status, score, rated, created_at, finished_at) VALUES (?, 5, '[]', 0, 'done', 0, 1, ?, ?)",
      [uid, now, now]
    );
  }

  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, {
    token: u.token,
    body: { answers: probs.map((p) => p.answer), reasons: probs.map((p) => p.reasonCorrectIndex) },
  });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.banked, 5, 'the round is still played and scored');
  assert.equal(sub.body.ratingCounted, false, 'past the daily cap the rating does not move');
  assert.equal(sub.body.ratingDelta, 0, 'no rating delta when capped');
});

test('a rated reasoning round credits the contested per-domain rating, not only global', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, {
    token: u.token,
    body: { answers: probs.map((p) => p.answer), reasons: probs.map((p) => p.reasonCorrectIndex) },
  });

  const rows = await dbAll('SELECT domain, sessions_count FROM user_ratings WHERE user_id = ?', [uid]);
  const domains = rows.map((r) => r.domain);
  assert.ok(domains.includes('global'), 'global rating updated');
  assert.ok(domains.some((d) => d !== 'global'), 'the contested domain rating was created too — per-domain ladders climb from ranked play');
});

test('missed concepts are queued into SRS, due now — a ranked loss becomes learning (audit #25)', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  // Every answer correct but every reason wrong → nothing banks → all 5 distinct concepts are "missed".
  const answers = probs.map((p) => p.answer);
  const reasons = probs.map((p) => (p.reasonCorrectIndex + 1) % p.reasonOptions.length);

  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });
  assert.equal(sub.status, 200);
  assert.equal(sub.body.banked, 0, 'nothing banked');
  assert.ok(sub.body.reviewQueued >= 1, 'the response reports concepts queued for review');

  const now = Math.floor(Date.now() / 1000);
  const due = await dbAll('SELECT topic, next_review, repetitions FROM srs_reviews WHERE user_id = ?', [uid]);
  assert.equal(due.length, sub.body.reviewQueued, 'one SRS row per missed concept');
  assert.ok(due.every((r) => r.next_review <= now), 'every queued review is due immediately');
  assert.ok(due.every((r) => r.repetitions === 0), 'queued as a fresh lapse (reps reset)');
  // The topics are the round's concept keys.
  const missedKeys = new Set(probs.map((p) => p.conceptId));
  assert.ok(due.every((r) => missedKeys.has(r.topic)), 'queued topics are the round concepts');
});

test('a fully-understood round queues nothing for review', async () => {
  const u = await registerUser(ctx.base);
  const uid = await idOf(u.username);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const sub = await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, {
    token: u.token,
    body: { answers: probs.map((p) => p.answer), reasons: probs.map((p) => p.reasonCorrectIndex) },
  });
  assert.equal(sub.body.banked, 5);
  assert.equal(sub.body.reviewQueued, 0, 'nothing missed → nothing queued');
  const due = await dbAll('SELECT topic FROM srs_reviews WHERE user_id = ?', [uid]);
  assert.equal(due.length, 0, 'no SRS rows created from a perfect round');
});

test('focus domains are offered, and a focused round is dominated by that domain (audit #15)', async () => {
  const u = await registerUser(ctx.base);
  const doms = await api(ctx.base, 'GET', '/api/reasoning-duel/domains', { token: u.token });
  assert.equal(doms.status, 200);
  assert.ok(Array.isArray(doms.body.domains) && doms.body.domains.length >= 1, 'at least one focus domain is offered');
  assert.ok(doms.body.domains.includes('algebra'), 'algebra has enough reason-sets to be a focus ladder');

  const focus = 'algebra';
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token, body: { domain: focus } });
  assert.equal(start.status, 200);
  assert.equal(start.body.domain, focus, 'the round reports the focused domain as its dominant one');

  // Verify server-side: the stored round is mostly the focused domain (the credited ladder).
  const round = await dbGet('SELECT domain FROM reasoning_rounds WHERE id = ?', [start.body.roundId]);
  assert.equal(round.domain, focus, 'the stored round domain is the chosen focus → that ladder is credited');
});

test('an unoffered/invalid focus domain falls back to a mixed round (not an error)', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token, body: { domain: 'underwater_basket_weaving' } });
  assert.equal(start.status, 200, 'an invalid focus is ignored, not rejected');
  assert.equal(start.body.problems.length, 5, 'a full mixed round is still served');
});

test('a finished round can be replayed problem-by-problem (review)', async () => {
  const u = await registerUser(ctx.base);
  const start = await api(ctx.base, 'POST', '/api/reasoning-duel/start', { token: u.token });
  const probs = await keyOf(start.body.roundId);
  const answers = probs.map((p) => p.answer); // every answer correct
  const reasons = probs.map((p, i) => (i === 0 ? (p.reasonCorrectIndex + 1) % p.reasonOptions.length : p.reasonCorrectIndex)); // first reason wrong

  await api(ctx.base, 'POST', `/api/reasoning-duel/${start.body.roundId}/submit`, { token: u.token, body: { answers, reasons } });

  const rev = await api(ctx.base, 'GET', `/api/reasoning-duel/${start.body.roundId}/review`, { token: u.token });
  assert.equal(rev.status, 200);
  assert.equal(rev.body.items.length, 5);
  const first = rev.body.items[0];
  assert.equal(first.answerCorrect, true, 'answer was right');
  assert.equal(first.reasonCorrect, false, 'the first reason was wrong');
  assert.equal(first.banked, false, 'so the point did not bank');
  assert.equal(rev.body.items[1].banked, true, 'second problem fully correct');
  assert.ok(first.correctAnswer != null && first.reasonExplanation, 'the review reveals the correct answer + reasoning');

  // The match row links back to the round for replay.
  const matches = await api(ctx.base, 'GET', '/api/rating/matches', { token: u.token });
  const m = matches.body.find((x) => x.mode === 'reasoning');
  assert.equal(m.refId, start.body.roundId, 'the reasoning match links to its replayable round');
});
