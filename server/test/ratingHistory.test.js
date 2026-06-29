// Competitive history (Phase 2 identity): GET /api/rating/history is the rating timeline that powers
// the "rating over time" card. It must return camelCase fields, newest first. A rated session is
// produced through the real /api/rating/session path so this is an end-to-end contract check.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

test('rating history returns camelCase rated results, newest first', async () => {
  const u = await registerUser(ctx.base);
  const sessionBody = { category: 'algebra', level: 12, solvedCount: 5, totalProblems: 5, errorsCount: 0, speedBonus: 10, comboBonus: 15, gameMode: 'level' };
  await api(ctx.base, 'POST', '/api/rating/session', { token: u.token, body: sessionBody });
  await api(ctx.base, 'POST', '/api/rating/session', { token: u.token, body: { ...sessionBody, level: 13 } });

  const res = await api(ctx.base, 'GET', '/api/rating/history?domain=global&limit=5', { token: u.token });
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body) && res.body.length >= 2, 'two rated sessions are recorded');

  const row = res.body[0];
  for (const k of ['domain', 'displayBefore', 'displayAfter', 'delta', 'gameMode', 'createdAt']) {
    assert.ok(k in row, `history row must expose camelCase "${k}"`);
  }
  assert.equal(row.domain, 'global');
  // Newest first: created_at descending.
  assert.ok(res.body[0].createdAt >= res.body[res.body.length - 1].createdAt, 'ordered newest first');
});
