// Per-concept discussion: post/list/delete, content-filter + unknown-concept guards, block-aware
// visibility, and reportability via the shared moderation endpoint.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const CONCEPT = 'arithmetic_add'; // a real curriculum concept (see knowledgeGraph)
const meId = async (token) => {
  const r = await api(ctx.base, 'GET', '/api/auth/me', { token });
  return r.body.user ? r.body.user.id : r.body.id;
};

test('a learner can post on a concept and read it back (marked as mine)', async () => {
  const u = await registerUser(ctx.base);
  const post = await api(ctx.base, 'POST', `/api/concepts/${CONCEPT}/posts`, { token: u.token, body: { body: 'Why is 0 the additive identity?' } });
  assert.equal(post.status, 201);

  const list = await api(ctx.base, 'GET', `/api/concepts/${CONCEPT}/posts`, { token: u.token });
  assert.equal(list.status, 200);
  assert.equal(list.body.name && typeof list.body.name === 'string', true, 'concept name returned');
  const mine = list.body.posts.find((p) => p.body.startsWith('Why is 0'));
  assert.ok(mine && mine.mine === true, 'own post is flagged mine');
});

test('posting rejects profanity, empty bodies, and unknown concepts', async () => {
  const u = await registerUser(ctx.base);
  const dirty = await api(ctx.base, 'POST', `/api/concepts/${CONCEPT}/posts`, { token: u.token, body: { body: 'this is shit' } });
  assert.equal(dirty.status, 400);
  const empty = await api(ctx.base, 'POST', `/api/concepts/${CONCEPT}/posts`, { token: u.token, body: { body: '   ' } });
  assert.equal(empty.status, 400);
  const unknown = await api(ctx.base, 'POST', '/api/concepts/not_a_real_concept/posts', { token: u.token, body: { body: 'hello' } });
  assert.equal(unknown.status, 404);
});

test('posts from a blocked user are hidden from the blocker', async () => {
  const a = await registerUser(ctx.base); // author
  const b = await registerUser(ctx.base); // blocker/reader
  const aId = await meId(a.token);

  await api(ctx.base, 'POST', `/api/concepts/${CONCEPT}/posts`, { token: a.token, body: { body: 'A unique post from A 12345' } });
  // B sees it before blocking…
  let bList = await api(ctx.base, 'GET', `/api/concepts/${CONCEPT}/posts`, { token: b.token });
  assert.ok(bList.body.posts.some((p) => p.userId === aId), 'visible before block');
  // …then blocks A and it disappears.
  await api(ctx.base, 'POST', '/api/blocks', { token: b.token, body: { userId: aId } });
  bList = await api(ctx.base, 'GET', `/api/concepts/${CONCEPT}/posts`, { token: b.token });
  assert.ok(!bList.body.posts.some((p) => p.userId === aId), 'blocked author hidden');
});

test('an author can delete their own post but not someone else\'s; a post is reportable', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const made = await api(ctx.base, 'POST', `/api/concepts/${CONCEPT}/posts`, { token: a.token, body: { body: 'Delete me please' } });
  const postId = made.body.id;

  // B cannot delete A's post.
  const wrong = await api(ctx.base, 'DELETE', `/api/concepts/posts/${postId}`, { token: b.token });
  assert.equal(wrong.status, 404);

  // B can report it through the shared moderation endpoint.
  const report = await api(ctx.base, 'POST', '/api/reports', { token: b.token, body: { targetType: 'concept_post', targetId: postId, reason: 'spam' } });
  assert.equal(report.status, 201);

  // A deletes their own post.
  const del = await api(ctx.base, 'DELETE', `/api/concepts/posts/${postId}`, { token: a.token });
  assert.equal(del.status, 200);
});
