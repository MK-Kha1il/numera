// Club wars: an owner challenges a rival club, both sides' members race the same set once, and the
// higher combined score wins on lazy finalize (paying the winning side).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown, api, registerUser } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const dbGet = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, p = []) => new Promise((res, rej) => ctx.mod.db.run(sql, p, (e) => (e ? rej(e) : res())));
const idOf = (username) => new Promise((res, rej) => ctx.mod.db.get('SELECT id FROM users WHERE username = ?', [username], (e, r) => (e ? rej(e) : res(r.id))));
const uniqueName = () => `Warriors ${Math.random().toString(36).slice(2, 8)}`;

async function makeClub(owner) {
  return (await api(ctx.base, 'POST', '/api/clubs', { token: owner.token, body: { name: uniqueName() } })).body.clubId;
}
const join = (u, clubId) => api(ctx.base, 'POST', `/api/clubs/${clubId}/join`, { token: u.token });
const coins = async (username) => (await dbGet('SELECT coins FROM users WHERE id = ?', [await idOf(username)])).coins;

// Set up two clubs (A: owner a + member am, B: owner b + member bm) and a war A→B. Returns war id.
async function twoClubsAtWar() {
  const a = await registerUser(ctx.base);
  const am = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const bm = await registerUser(ctx.base);
  const clubA = await makeClub(a);
  await join(am, clubA);
  const clubB = await makeClub(b);
  await join(bm, clubB);

  const declare = await api(ctx.base, 'POST', '/api/clubs/wars/challenge', { token: a.token, body: { opponentClubId: clubB } });
  assert.equal(declare.status, 200);
  return { a, am, b, bm, clubA, clubB, warId: declare.body.warId };
}

const playCorrect = async (user, warId) => {
  const stored = JSON.parse((await dbGet('SELECT problems_json FROM club_wars WHERE id = ?', [warId])).problems_json);
  return api(ctx.base, 'POST', `/api/clubs/wars/${warId}/play`, { token: user.token, body: { answers: stored.map((p) => p.answer) } });
};
const playWrong = async (user, warId) => {
  const n = JSON.parse((await dbGet('SELECT problems_json FROM club_wars WHERE id = ?', [warId])).problems_json).length;
  return api(ctx.base, 'POST', `/api/clubs/wars/${warId}/play`, { token: user.token, body: { answers: Array(n).fill('nope') } });
};

test('only a club owner can declare war, and not on themselves', async () => {
  const owner = await registerUser(ctx.base);
  const member = await registerUser(ctx.base);
  const clubA = await makeClub(owner);
  await join(member, clubA);
  const clubB = await makeClub(await registerUser(ctx.base));

  // A member can't declare.
  assert.equal((await api(ctx.base, 'POST', '/api/clubs/wars/challenge', { token: member.token, body: { opponentClubId: clubB } })).status, 403);
  // Can't war your own club.
  assert.equal((await api(ctx.base, 'POST', '/api/clubs/wars/challenge', { token: owner.token, body: { opponentClubId: clubA } })).status, 400);
  // Owner declares on B → ok; a duplicate active war is rejected.
  assert.equal((await api(ctx.base, 'POST', '/api/clubs/wars/challenge', { token: owner.token, body: { opponentClubId: clubB } })).status, 200);
  assert.equal((await api(ctx.base, 'POST', '/api/clubs/wars/challenge', { token: owner.token, body: { opponentClubId: clubB } })).status, 409);
});

test('members play once; outsiders cannot', async () => {
  const { a, warId } = await twoClubsAtWar();
  const outsider = await registerUser(ctx.base); // in no club

  const first = await playCorrect(a, warId);
  assert.equal(first.status, 200);
  assert.equal(first.body.score, first.body.total);
  // No second attempt.
  assert.equal((await playCorrect(a, warId)).status, 400);
  // Outsiders are rejected.
  assert.equal((await api(ctx.base, 'POST', `/api/clubs/wars/${warId}/play`, { token: outsider.token, body: { answers: [] } })).status, 403);
});

test('the higher combined score wins and the winning side is paid on finalize', async () => {
  const { a, am, b, bm, clubA, warId } = await twoClubsAtWar();
  // Club A aces it; club B whiffs.
  await playCorrect(a, warId);
  await playCorrect(am, warId);
  await playWrong(b, warId);
  await playWrong(bm, warId);

  const aCoins0 = await coins(a.username);
  const amCoins0 = await coins(am.username);
  const bCoins0 = await coins(b.username);

  // End the window; a read settles the war.
  await dbRun('UPDATE club_wars SET ends_at = ? WHERE id = ?', [Date.now() - 1000, warId]);
  const wars = await api(ctx.base, 'GET', '/api/clubs/wars', { token: a.token });
  const war = wars.body.wars.find((w) => w.id === warId);
  assert.equal(war.status, 'finalized');
  assert.equal(war.winnerClubId, clubA, 'club A won');

  // A's players each earned the win reward; B's earned nothing.
  assert.equal(await coins(a.username), aCoins0 + 40);
  assert.equal(await coins(am.username), amCoins0 + 40);
  assert.equal(await coins(b.username), bCoins0);

  // Idempotent: reading again does not double-pay.
  await api(ctx.base, 'GET', '/api/clubs/wars', { token: am.token });
  assert.equal(await coins(am.username), amCoins0 + 40, 'no double payout');
});
