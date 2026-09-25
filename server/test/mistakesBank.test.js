// The Mistakes Bank economy: the "Focus Practice" quest counts RESOLVED mistakes (not logged ones),
// a resolve pays once per mistake and only up to a daily cap (no add→resolve coin loop), and the
// bank is bounded.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const addMistake = (token) =>
  api(ctx.base, 'POST', '/api/mistakes', {
    token,
    body: { category: 'arithmetic', question: '2 + 2 = ?', correct_answer: '4', options: ['3', '4', '5', '6'], explanation: 'Add.' },
  });
const resolve = (token, mistakeId) => api(ctx.base, 'POST', '/api/mistakes/resolve', { token, body: { mistakeId } });
const quest = (id) => dbGet('SELECT mistakes_today FROM user_quests WHERE user_id = ?', [id]);
const coins = async (id) => (await dbGet('SELECT coins FROM users WHERE id = ?', [id])).coins;

test('logging a mistake does not advance the quest; resolving it does', async () => {
  const u = await registerUser(ctx.base);
  const added = await addMistake(u.token);
  assert.equal(added.status, 200);
  assert.equal((await quest(u.user.id)).mistakes_today, 0, 'a wrong answer is not quest progress');

  const before = await coins(u.user.id);
  const r = await resolve(u.token, added.body.id);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.coinsGained, 10);
  assert.equal((await coins(u.user.id)) - before, 10);
  assert.equal((await quest(u.user.id)).mistakes_today, 1);

  const again = await resolve(u.token, added.body.id);
  assert.equal(again.status, 404, 'a mistake resolves (and pays) once');
});

test('paid resolves are capped per day; later resolves still count for the quest', async () => {
  const u = await registerUser(ctx.base);
  const before = await coins(u.user.id);
  for (let i = 0; i < 12; i++) {
    const added = await addMistake(u.token);
    const r = await resolve(u.token, added.body.id);
    assert.equal(r.status, 200);
    assert.equal(r.body.rewardCapped, i >= 10, `resolve #${i + 1}`);
  }
  assert.equal((await coins(u.user.id)) - before, 100, 'only the first 10 resolves pay');
  assert.equal((await quest(u.user.id)).mistakes_today, 12);
});

test('another learner cannot resolve my mistake', async () => {
  const owner = await registerUser(ctx.base);
  const other = await registerUser(ctx.base);
  const added = await addMistake(owner.token);
  const r = await resolve(other.token, added.body.id);
  assert.equal(r.status, 404);
});
