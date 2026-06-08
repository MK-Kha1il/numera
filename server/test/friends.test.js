// Friends: a pending request is now DECLINABLE by its recipient (audit top-50 #19 — requests used
// to be un-declinable, only acceptable). Also locks the `incoming` direction flag the client uses
// to decide whether to show accept/decline vs. an outgoing "Requested" label.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const meId = async (token) => {
  const r = await api(ctx.base, 'GET', '/api/auth/me', { token });
  return r.body.user ? r.body.user.id : r.body.id;
};

test('a pending friend request is declinable by the recipient and clears for both sides', async () => {
  const a = await registerUser(ctx.base); // requester
  const b = await registerUser(ctx.base); // recipient
  const aId = await meId(a.token);

  const reqRes = await api(ctx.base, 'POST', '/api/friends/request', { token: a.token, body: { friendUsername: b.username } });
  assert.strictEqual(reqRes.status, 200);

  // The recipient sees an INCOMING pending request; the requester sees the same row as OUTGOING.
  const bList = await api(ctx.base, 'GET', '/api/friends', { token: b.token });
  const fromA = bList.body.find((f) => f.username === a.username);
  assert.ok(fromA && fromA.status === 'pending' && fromA.incoming === true, 'recipient sees an incoming pending request');

  const aList = await api(ctx.base, 'GET', '/api/friends', { token: a.token });
  const toB = aList.body.find((f) => f.username === b.username);
  assert.ok(toB && toB.status === 'pending' && toB.incoming === false, 'requester sees it as outgoing, not accept-able');

  // Decline removes the connection entirely (for both users).
  const decline = await api(ctx.base, 'POST', '/api/friends/decline', { token: b.token, body: { friendId: aId } });
  assert.strictEqual(decline.status, 200);

  const bAfter = await api(ctx.base, 'GET', '/api/friends', { token: b.token });
  assert.ok(!bAfter.body.some((f) => f.username === a.username), 'declined request is gone for the recipient');
  const aAfter = await api(ctx.base, 'GET', '/api/friends', { token: a.token });
  assert.ok(!aAfter.body.some((f) => f.username === b.username), 'and gone for the requester too');
});

test('only the recipient of a pending request can decline it; missing requests 404', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const aId = await meId(a.token);
  const bId = await meId(b.token);

  await api(ctx.base, 'POST', '/api/friends/request', { token: a.token, body: { friendUsername: b.username } });

  // The requester cannot decline via the recipient path (no pending request was sent TO them).
  const wrong = await api(ctx.base, 'POST', '/api/friends/decline', { token: a.token, body: { friendId: bId } });
  assert.strictEqual(wrong.status, 404);

  // A bogus friendId 404s too.
  const none = await api(ctx.base, 'POST', '/api/friends/decline', { token: b.token, body: { friendId: 999999 } });
  assert.strictEqual(none.status, 404);

  // The legitimate recipient decline succeeds.
  const ok = await api(ctx.base, 'POST', '/api/friends/decline', { token: b.token, body: { friendId: aId } });
  assert.strictEqual(ok.status, 200);
});

test('unfriend removes an accepted connection for both users', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const aId = await meId(a.token);
  const bId = await meId(b.token);

  await api(ctx.base, 'POST', '/api/friends/request', { token: a.token, body: { friendUsername: b.username } });
  await api(ctx.base, 'POST', '/api/friends/accept', { token: b.token, body: { friendId: aId } });

  // Either side can sever the tie; here B unfriends A.
  const removed = await api(ctx.base, 'DELETE', `/api/friends/${aId}`, { token: b.token });
  assert.strictEqual(removed.status, 200);

  const aList = await api(ctx.base, 'GET', '/api/friends', { token: a.token });
  assert.ok(!aList.body.some((f) => f.id === bId), 'gone from the remover-target side');
  const bList = await api(ctx.base, 'GET', '/api/friends', { token: b.token });
  assert.ok(!bList.body.some((f) => f.id === aId), 'gone from the remover side');

  // A second removal finds nothing.
  const again = await api(ctx.base, 'DELETE', `/api/friends/${aId}`, { token: b.token });
  assert.strictEqual(again.status, 404);
});

test('a sender can cancel their own outgoing pending request', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const aId = await meId(a.token);
  const bId = await meId(b.token);

  await api(ctx.base, 'POST', '/api/friends/request', { token: a.token, body: { friendUsername: b.username } });
  // A cancels the request it sent.
  const cancel = await api(ctx.base, 'DELETE', `/api/friends/${bId}`, { token: a.token });
  assert.strictEqual(cancel.status, 200);

  const bList = await api(ctx.base, 'GET', '/api/friends', { token: b.token });
  assert.ok(!bList.body.some((f) => f.id === aId), 'the recipient no longer sees the canceled request');
});
