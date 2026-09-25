// Per-socket event budget: a flood of socket events is dropped before any
// handler runs, while normal play (a handful of events) is untouched, and the budget refills.
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fire `n` ack-probing events at once and count how many were answered within a window.
async function burst(socket, n) {
  let answered = 0;
  for (let i = 0; i < n; i++) socket.emit('find_my_duel', () => { answered += 1; });
  await sleep(500);
  return answered;
}

test('a burst beyond the budget is dropped; normal traffic is served; the budget refills', async () => {
  const u = await registerUser(ctx.base);
  const s = await connectSocket(u.token);

  const first = await burst(s, 60);
  assert.ok(first >= 20, `the first ~20 events are served (got ${first})`);
  assert.ok(first < 60, `a 60-event flood is not fully served (got ${first})`);

  await sleep(2000); // ~10 tokens refill
  const later = await burst(s, 5);
  assert.equal(later, 5, 'after a pause, normal traffic flows again');
});
