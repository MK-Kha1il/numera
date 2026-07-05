// End-to-end SOCKET tests for the live duel: real socket.io clients against the real server —
// authentication, matchmaking pairing, the sanitized duel_start/room_status payloads, the synced
// countdown fields, server-side grading acks, the draw flag, leave_duel forfeit, and the rematch
// handshake. This is the integration layer the exported-function unit tests can't reach.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, registerUser } = require('./helpers');
const { io: ioc } = require('socket.io-client');

let ctx;
const openSockets = [];
before(async () => { ctx = await bootServer(); });
after(async () => {
  for (const s of openSockets) { try { s.disconnect(); } catch { /* ignore */ } }
  await shutdown(ctx);
});

function connectSocket(token) {
  const socket = ioc(ctx.base, { auth: { token }, transports: ['websocket'], reconnection: false });
  openSockets.push(socket);
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('socket connect timeout')), 5000);
    socket.on('connect', () => { clearTimeout(t); resolve(socket); });
    socket.on('connect_error', (e) => { clearTimeout(t); reject(e); });
  });
}

const waitFor = (socket, event, ms = 15000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (data) => { clearTimeout(t); resolve(data); });
  });

const submit = (socket, roomId, answer) =>
  new Promise((resolve) => socket.emit('submit_answer', { roomId, answer }, resolve));

// Queue two fresh users into the casual queue and wait for the matchmaker tick to pair them.
async function pairTwo() {
  const u1 = await registerUser(ctx.base);
  const u2 = await registerUser(ctx.base);
  const s1 = await connectSocket(u1.token);
  const s2 = await connectSocket(u2.token);
  const started1 = waitFor(s1, 'duel_start');
  const started2 = waitFor(s2, 'duel_start');
  s1.emit('join_queue', { mode: 'casual' });
  s2.emit('join_queue', { mode: 'casual' });
  const [d1, d2] = await Promise.all([started1, started2]);
  return { u1, u2, s1, s2, d1, d2 };
}

test('socket auth: a token without a live session is rejected', async () => {
  await assert.rejects(connectSocket('not-a-real-token'), /Authentication error/);
});

test('two humans pair; duel_start is sanitized and carries the synced countdown', async () => {
  const { s1, s2, d1, d2 } = await pairTwo();
  assert.equal(d1.roomId, d2.roomId, 'both players land in the same room');
  assert.ok(d1.countdownMs > 0, 'duel_start carries the shared countdown');
  assert.ok(d1.matchMs > 0, 'duel_start carries the match budget');
  assert.equal(d1.ranked, false, 'casual queue produces a casual match');
  for (const key of ['p1', 'p2']) {
    const p = d1.opponent[key];
    assert.equal(p.integrityFlags, undefined, 'no anti-cheat state in the payload');
    assert.equal(p.socketId, undefined, 'no socket ids in the payload');
    assert.ok(typeof p.username === 'string' && p.username.length > 0);
  }

  // join_duel_room returns the answer-stripped problems + relative clocks.
  const statusP = waitFor(s1, 'room_status');
  s1.emit('join_duel_room', { roomId: d1.roomId });
  const status = await statusP;
  assert.equal(status.problems.length, 5, 'five problems per duel');
  for (const p of status.problems) {
    assert.equal(p.correctAnswer, undefined, 'answers never ship with live problems');
    assert.equal(p.explanation, undefined, 'worked solutions never ship with live problems');
  }
  assert.ok(status.startsInMs >= 0, 'relative countdown offset present');
  assert.ok(status.remainingMs > 0, 'relative deadline offset present');

  // Finish the duel so it doesn't linger for later tests: everyone answers everything wrong.
  const end1 = waitFor(s1, 'duel_end');
  for (let i = 0; i < 5; i++) {
    const ack = await submit(s1, d1.roomId, 'definitely-wrong');
    assert.equal(ack.correct, false, 'server grades the submission');
    assert.ok(typeof ack.correctAnswer === 'string' && ack.correctAnswer.length > 0, 'ack reveals the canonical answer post-submission');
  }
  for (let i = 0; i < 5; i++) await submit(s2, d1.roomId, 'definitely-wrong');
  const end = await end1;

  // 0-0 is a DRAW: explicit flag, null winner, and the rematch window is open.
  assert.equal(end.draw, true, 'equal scores resolve as an explicit draw');
  assert.equal(end.winnerId, null, 'no winner on a draw');
  assert.equal(end.rematchAvailable, true, 'human-vs-human opens the rematch window');
});

test('leave_duel forfeits immediately: the remaining player wins', async () => {
  const { u2, s1, s2, d1 } = await pairTwo();
  const endP = waitFor(s2, 'duel_end');
  s1.emit('leave_duel', { roomId: d1.roomId });
  const end = await endP;
  assert.ok(end.forfeit, 'duel_end names the forfeit');
  assert.equal(end.draw, false, 'a forfeit is not a draw');
  const winner = end.p1.username === u2.username ? end.p1 : end.p2;
  assert.equal(end.winnerId, winner.id, 'the remaining player takes the win');
});

test('rematch handshake: both accept → a fresh duel on a new room, same casual stakes', async () => {
  const { s1, s2, d1 } = await pairTwo();

  // Finish the first duel quickly (all wrong on both sides).
  const endP = waitFor(s1, 'duel_end');
  for (let i = 0; i < 5; i++) await submit(s1, d1.roomId, 'x');
  for (let i = 0; i < 5; i++) await submit(s2, d1.roomId, 'x');
  const end = await endP;
  assert.equal(end.rematchAvailable, true);

  // First accepter waits; the other side is notified.
  const pendingP = waitFor(s1, 'rematch_pending');
  const requestedP = waitFor(s2, 'rematch_requested');
  s1.emit('request_rematch', { roomId: d1.roomId });
  await Promise.all([pendingP, requestedP]);

  // Second accepter triggers the fresh duel for both.
  const re1 = waitFor(s1, 'duel_start');
  const re2 = waitFor(s2, 'duel_start');
  s2.emit('request_rematch', { roomId: d1.roomId });
  const [r1, r2] = await Promise.all([re1, re2]);
  assert.equal(r1.roomId, r2.roomId, 'both land in the same rematch room');
  assert.notEqual(r1.roomId, d1.roomId, 'the rematch is a NEW room');
  assert.equal(r1.ranked, false, 'stakes carry over (casual stays casual)');

  // Clean up: leave so the room resolves instead of waiting out its deadline.
  s1.emit('leave_duel', { roomId: r1.roomId });
  await waitFor(s2, 'duel_end');
});

test('find_my_duel: a live match is discoverable for rejoin, and null once it ends', async () => {
  const { s1, s2, d1 } = await pairTwo();
  const findDuel = (s) => new Promise((resolve) => s.emit('find_my_duel', resolve));

  const active = await findDuel(s1);
  assert.equal(active.roomId, d1.roomId, 'the live room is returned for the resume prompt');
  assert.ok(typeof active.opponentName === 'string' && active.opponentName.length > 0);
  assert.equal(active.ranked, false);

  // Finish the duel; the same query must then come back empty.
  const endP = waitFor(s1, 'duel_end');
  for (let i = 0; i < 5; i++) await submit(s1, d1.roomId, 'x');
  for (let i = 0; i < 5; i++) await submit(s2, d1.roomId, 'x');
  await endP;
  const gone = await findDuel(s1);
  assert.equal(gone.roomId, null, 'no live match after the duel resolves');
});

test('duel emotes: allowlisted emotes relay to the opponent only; junk and spam are dropped', async () => {
  const { s1, s2, d1 } = await pairTwo();

  // Allowlisted emote reaches the opponent.
  const got = waitFor(s2, 'opponent_emote');
  s1.emit('duel_emote', { roomId: d1.roomId, emote: '🔥' });
  assert.equal((await got).emote, '🔥');

  // Junk (free text) and rate-limited spam are silently dropped.
  let extra = 0;
  s2.on('opponent_emote', () => { extra++; });
  s1.emit('duel_emote', { roomId: d1.roomId, emote: 'you suck' }); // not in the allowlist
  s1.emit('duel_emote', { roomId: d1.roomId, emote: '👏' });       // inside the rate-limit window
  await new Promise((r) => setTimeout(r, 500));
  assert.equal(extra, 0, 'no junk, no spam');

  // Clean up the room.
  s1.emit('leave_duel', { roomId: d1.roomId });
  await waitFor(s2, 'duel_end');
});

test('a stale rematch request is answered with rematch_unavailable', async () => {
  const u = await registerUser(ctx.base);
  const s = await connectSocket(u.token);
  const unavailableP = waitFor(s, 'rematch_unavailable');
  s.emit('request_rematch', { roomId: 'duel_never_existed' });
  await unavailableP;
});
