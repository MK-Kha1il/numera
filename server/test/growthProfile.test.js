// Growth Insights (ultra review edu#44): per-answer telemetry now revives the dormant
// misconception engine, and /api/engine/growth-profile turns that data into a learner-facing
// view — strengths (well-practiced concepts) + error "habits to watch". This guards the new
// data path end-to-end: a wrong answer becomes a named misconception; a correct answer becomes
// a strength.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The misconception recording runs in telemetry's fire-and-forget engine block, so poll the
// profile briefly until the asynchronous write lands.
async function waitForProfile(base, token, predicate, tries = 40) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await api(base, 'GET', '/api/engine/growth-profile', { token });
    if (last.status === 200 && predicate(last.body)) return last.body;
    await sleep(50);
  }
  return last.body;
}

test('a fresh learner has an empty growth profile', async () => {
  const u = await registerUser(ctx.base);
  const r = await api(ctx.base, 'GET', '/api/engine/growth-profile', { token: u.token });
  assert.equal(r.status, 200);
  assert.equal(r.body.practiced, 0);
  assert.deepEqual(r.body.strengths, []);
  assert.deepEqual(r.body.watchAreas, []);
});

test('a wrong answer is classified into a named misconception "habit to watch"', async () => {
  const u = await registerUser(ctx.base);
  // correct = 5, wrong = -5 → the global "Sign error" pattern fires regardless of concept.
  const tel = await api(ctx.base, 'POST', '/api/math/telemetry', {
    token: u.token,
    body: { concept: 'arithmetic_add', isCorrect: false, speed: 4, correctAnswer: '5', wrongAnswer: '-5' },
  });
  assert.equal(tel.status, 200);

  const body = await waitForProfile(ctx.base, u.token, (b) => b.watchAreas.length > 0);
  assert.ok(body.watchAreas.length >= 1, 'a watch area was recorded');
  const wa = body.watchAreas[0];
  assert.match(wa.label, /[Ss]ign/, 'classified as a sign error');
  assert.ok(wa.conceptName && wa.conceptName.length > 0, 'has a friendly concept name');
  assert.ok(['low', 'medium', 'high'].includes(wa.severity), 'has a severity');
});

test('a correct answer on a concept surfaces it as a strength', async () => {
  const u = await registerUser(ctx.base);
  const tel = await api(ctx.base, 'POST', '/api/math/telemetry', {
    token: u.token,
    body: { concept: 'arithmetic_mult', isCorrect: true, speed: 3, correctAnswer: '12' },
  });
  assert.equal(tel.status, 200);

  const body = await waitForProfile(ctx.base, u.token, (b) => b.strengths.length > 0);
  assert.ok(body.practiced >= 1, 'concept counted as practiced');
  assert.ok(body.strengths.length >= 1, 'a strength surfaced');
  assert.ok(body.strengths[0].successRate >= 80, 'strength is a high success rate');
  assert.ok(body.strengths[0].name && body.strengths[0].name.length > 0, 'has a friendly name');
});

test('answering correctly resolves a previously recorded misconception', async () => {
  const u = await registerUser(ctx.base);
  // Build a misconception, then answer the same concept correctly.
  await api(ctx.base, 'POST', '/api/math/telemetry', {
    token: u.token,
    body: { concept: 'arithmetic_sub', isCorrect: false, speed: 4, correctAnswer: '7', wrongAnswer: '-7' },
  });
  await waitForProfile(ctx.base, u.token, (b) => b.watchAreas.length > 0);

  await api(ctx.base, 'POST', '/api/math/telemetry', {
    token: u.token,
    body: { concept: 'arithmetic_sub', isCorrect: true, speed: 3, correctAnswer: '7' },
  });
  const body = await waitForProfile(ctx.base, u.token, (b) => b.watchAreas.length === 0);
  assert.equal(body.watchAreas.length, 0, 'the resolved misconception no longer shows');
});
