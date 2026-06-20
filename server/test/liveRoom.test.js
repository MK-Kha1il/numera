// Live group/class competitive rooms (competitive audit #19). Kahoot-style: host opens a room, players
// join by code, the host starts it, everyone races the same server-graded set, scores feed a podium.
// Grading is server-authoritative — the answer key is never sent — so these tests read it from the DB
// to build correct/incorrect submissions.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const keyOf = async (roomId) => JSON.parse((await dbGet('SELECT problems_json FROM live_rooms WHERE id = ?', [roomId])).problems_json);

test('full lifecycle: create → join → start (answers stripped) → answer → podium', async () => {
  const host = await registerUser(ctx.base);
  const player = await registerUser(ctx.base);

  const create = await api(ctx.base, 'POST', '/api/live-rooms', { token: host.token, body: { category: 'arithmetic', level: 5 } });
  assert.equal(create.status, 200);
  assert.ok(create.body.code && create.body.roomId, 'a room + join code are returned');
  assert.equal(create.body.isHost, true);
  const { roomId, code } = create.body;

  const join = await api(ctx.base, 'POST', `/api/live-rooms/${code}/join`, { token: player.token });
  assert.equal(join.status, 200);
  assert.equal(join.body.isHost, false);

  // A non-host cannot start.
  const badStart = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/start`, { token: player.token });
  assert.equal(badStart.status, 403, 'only the host can start');

  const start = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/start`, { token: host.token });
  assert.equal(start.status, 200);
  assert.equal(start.body.status, 'active');
  assert.ok(start.body.problems.every((p) => p.answer === undefined), 'the answer key never leaves the server');

  // The player answers every problem correctly (reading the key from the DB).
  const probs = await keyOf(roomId);
  for (let i = 0; i < probs.length; i++) {
    const r = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: player.token, body: { problemIndex: i, answer: probs[i].answer } });
    assert.equal(r.status, 200);
    assert.equal(r.body.correct, true);
  }
  // The host answers only the first, wrong.
  await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: host.token, body: { problemIndex: 0, answer: '±definitely-wrong±' } });

  const finish = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/finish`, { token: host.token });
  assert.equal(finish.status, 200);
  assert.equal(finish.body.status, 'done');
  assert.equal(finish.body.podium[0].username, player.username, 'the all-correct player tops the podium');
  assert.ok(finish.body.podium[0].score > finish.body.podium[1].score, 'score reflects correct answers');
});

test('you cannot answer the same problem twice (no point farming)', async () => {
  const host = await registerUser(ctx.base);
  const create = await api(ctx.base, 'POST', '/api/live-rooms', { token: host.token, body: { category: 'arithmetic', level: 3 } });
  const roomId = create.body.roomId;
  await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/start`, { token: host.token });
  const probs = await keyOf(roomId);

  const first = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: host.token, body: { problemIndex: 0, answer: probs[0].answer } });
  assert.equal(first.body.correct, true);
  const second = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: host.token, body: { problemIndex: 0, answer: probs[0].answer } });
  assert.equal(second.status, 400, 'a repeat answer to the same problem is rejected');
});

test('you cannot join a room that already started, and must join before viewing', async () => {
  const host = await registerUser(ctx.base);
  const latecomer = await registerUser(ctx.base);
  const create = await api(ctx.base, 'POST', '/api/live-rooms', { token: host.token, body: {} });
  const { roomId, code } = create.body;
  await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/start`, { token: host.token });

  const join = await api(ctx.base, 'POST', `/api/live-rooms/${code}/join`, { token: latecomer.token });
  assert.equal(join.status, 400, 'cannot join after the room has started');

  const peek = await api(ctx.base, 'GET', `/api/live-rooms/${roomId}`, { token: latecomer.token });
  assert.equal(peek.status, 403, 'a non-member cannot read room state');
});

test('answering is blocked until the host starts the room', async () => {
  const host = await registerUser(ctx.base);
  const create = await api(ctx.base, 'POST', '/api/live-rooms', { token: host.token, body: {} });
  const roomId = create.body.roomId;
  const probs = await keyOf(roomId);
  const r = await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: host.token, body: { problemIndex: 0, answer: probs[0].answer } });
  assert.equal(r.status, 400, 'no answers accepted while still in the lobby');
});

test('socket liveness: state-changing routes push a live_room_update to the room channel', async () => {
  // The socket push is a best-effort "refetch" ping (no game state in the payload — clients re-GET).
  // Rather than spin up a socket.io-client, spy on the in-process io: capture every (channel, event)
  // emitted, and assert each lifecycle step pings the right 'live:<roomId>' channel.
  const io = ctx.mod.app.get('io');
  assert.ok(io, "io must be exposed to routes via app.get('io')");
  const emits = [];
  const realTo = io.to.bind(io);
  io.to = (channel) => ({ emit: (event, payload) => { emits.push({ channel, event, payload }); } });
  try {
    const host = await registerUser(ctx.base);
    const player = await registerUser(ctx.base);
    const create = await api(ctx.base, 'POST', '/api/live-rooms', { token: host.token, body: { category: 'arithmetic', level: 3 } });
    const { roomId, code } = create.body;
    const ch = `live:${roomId}`;

    await api(ctx.base, 'POST', `/api/live-rooms/${code}/join`, { token: player.token });
    await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/start`, { token: host.token });
    const probs = await keyOf(roomId);
    await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/answer`, { token: player.token, body: { problemIndex: 0, answer: probs[0].answer } });
    await api(ctx.base, 'POST', `/api/live-rooms/${roomId}/finish`, { token: host.token });

    const onChannel = emits.filter((e) => e.channel === ch && e.event === 'live_room_update');
    assert.ok(onChannel.length >= 4, `join/start/answer/finish each ping the room channel (got ${onChannel.length})`);
    assert.ok(onChannel.every((e) => e.payload && e.payload.roomId === roomId), 'every ping names its room');
    assert.equal(onChannel[onChannel.length - 1].payload.status, 'done', 'the finish ping reports the done status');
    // The contract: the ping carries no problems / answer key.
    assert.ok(onChannel.every((e) => !('problems' in e.payload) && !('answer' in e.payload)), 'ping carries no game state');
  } finally {
    io.to = realTo; // restore so later tests/sockets are unaffected
  }
});
