// The "Today" session composer: one ordered plan (review → learn → puzzle → duel → growth)
// composed from the SRS queue + the four daily quests, with done-states and streak safety.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const run = (sql, params) =>
  new Promise((resolve, reject) => ctx.mod.db.run(sql, params, (e) => (e ? reject(e) : resolve())));

test('fresh user gets the ordered plan with nothing done and a streak warning', async () => {
  const { token } = await registerUser(ctx.base);
  const { status, body } = await api(ctx.base, 'GET', '/api/today', { token });
  assert.strictEqual(status, 200);

  // No SRS reviews yet → the review item is absent; the four quest-backed items remain, in order.
  assert.deepStrictEqual(body.items.map((i) => i.key), ['solved', 'daily_puzzle', 'duels', 'mistakes']);
  for (const item of body.items) {
    assert.strictEqual(item.done, false);
    assert.strictEqual(item.progress, 0);
    assert.ok(item.target > 0);
    assert.ok(item.title.length > 0);
  }
  assert.strictEqual(body.streakSafeToday, false);
  assert.strictEqual(body.claimableQuests, 0);
});

test('progress, done-states, claimable count and streak safety reflect the quest row', async () => {
  const { token, user } = await registerUser(ctx.base);
  await run(
    'UPDATE user_quests SET solved_today = 5, duels_today = 1, daily_puzzle_today = 1 WHERE user_id = ?',
    [user.id]
  );

  const { status, body } = await api(ctx.base, 'GET', '/api/today', { token });
  assert.strictEqual(status, 200);

  const byKey = Object.fromEntries(body.items.map((i) => [i.key, i]));
  assert.strictEqual(byKey.solved.done, true);
  assert.strictEqual(byKey.daily_puzzle.done, true);
  assert.strictEqual(byKey.duels.done, false);
  assert.strictEqual(byKey.duels.progress, 1);
  assert.strictEqual(byKey.mistakes.done, false);

  assert.strictEqual(body.streakSafeToday, true);
  // solved (5/5) and daily_puzzle (1/1) are complete and unclaimed.
  assert.strictEqual(body.claimableQuests, 2);
});

test('due SRS reviews lead the plan', async () => {
  const { token, user } = await registerUser(ctx.base);
  const past = Math.floor(Date.now() / 1000) - 60;
  await run(
    'INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review) VALUES (?, ?, 2.5, 1, 1, ?)',
    [user.id, 'fraction_add', past]
  );
  await run(
    'INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review) VALUES (?, ?, 2.5, 1, 1, ?)',
    [user.id, 'decimal_mult', past]
  );

  const { body } = await api(ctx.base, 'GET', '/api/today', { token });
  assert.strictEqual(body.items[0].key, 'review');
  assert.strictEqual(body.items[0].target, 2);
  assert.match(body.items[0].title, /2 fading concepts/);
});

test('a review mountain is capped to an achievable daily ask', async () => {
  const { token, user } = await registerUser(ctx.base);
  const past = Math.floor(Date.now() / 1000) - 60;
  for (let i = 0; i < 8; i++) {
    await run(
      'INSERT INTO srs_reviews (user_id, topic, ease_factor, interval, repetitions, next_review) VALUES (?, ?, 2.5, 1, 1, ?)',
      [user.id, `concept_${i}`, past]
    );
  }
  const { body } = await api(ctx.base, 'GET', '/api/today', { token });
  const review = body.items.find((i) => i.key === 'review');
  assert.strictEqual(review.target, 5, 'daily review ask is capped at 5');
  assert.match(review.subtitle, /8 due in total/);
});

test('a learner returning after a week away gets the comeback flag', async () => {
  const { token, user } = await registerUser(ctx.base);
  const tenDaysAgo = Math.floor(Date.now() / 1000) - 10 * 86400;
  await run('UPDATE users SET last_active = ? WHERE id = ?', [tenDaysAgo, user.id]);

  const { body } = await api(ctx.base, 'GET', '/api/today', { token });
  assert.ok(body.comeback, 'comeback object expected after 10 days away');
  assert.strictEqual(body.comeback.daysAway, 10);

  // An active user gets no comeback framing.
  const fresh = await registerUser(ctx.base);
  const active = await api(ctx.base, 'GET', '/api/today', { token: fresh.token });
  assert.strictEqual(active.body.comeback, null);
});
