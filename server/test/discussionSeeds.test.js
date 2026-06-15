// Authored "common question" seed threads (ultra review #5): a learner opening a seeded concept's
// discussion for the first time finds a useful starter thread instead of an empty room.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const SEEDED = 'pemdas';     // present in lib/discussionSeeds.js
const UNSEEDED = 'quadratic'; // a real concept with no authored seed

test('a seeded concept shows an authored starter thread with a reply, by NumeraGuide', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', `/api/concepts/${SEEDED}/posts`, { token: u.token });
  assert.equal(r.status, 200);
  assert.ok(r.body.posts.length >= 1, 'a starter thread is present');
  const top = r.body.posts[0];
  assert.equal(top.username, 'NumeraGuide');
  assert.equal(top.mine, false);
  assert.ok(top.replies.length >= 1, 'the starter question has an answer');
  assert.equal(top.replies[0].username, 'NumeraGuide');
});

test('seeding is one-time: a real post does not trigger re-seeding', async () => {
  const u = await registerUser(ctx.base);
  // First read seeds it.
  const first = await api(ctx.base, 'GET', `/api/concepts/${SEEDED}/posts`, { token: u.token });
  const seededTopCount = first.body.posts.length;

  // A real post arrives, then we read again — counts grow by exactly the new post, no duplicate seeds.
  await api(ctx.base, 'POST', `/api/concepts/${SEEDED}/posts`, { token: u.token, body: { body: 'Does this apply to nested brackets too?' } });
  const second = await api(ctx.base, 'GET', `/api/concepts/${SEEDED}/posts`, { token: u.token });
  assert.equal(second.body.posts.length, seededTopCount + 1, 'no duplicate seeding');
});

test('an unseeded concept stays empty (no spurious threads)', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', `/api/concepts/${UNSEEDED}/posts`, { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.posts.length, 0);
});
