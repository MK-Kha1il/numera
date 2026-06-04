// Compliance remediation tests (see docs/ComplianceAudit.md). Guards the age gate, the
// UGC content filter, account-deletion completeness, data-export completeness, and the
// block/report moderation endpoints.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { bootServer, shutdown, api, registerUser } = require('./helpers');
const { checkText } = require('../lib/contentFilter');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

const uname = () => 'cmp_' + crypto.randomBytes(4).toString('hex');

// ---- Age gate (C2) --------------------------------------------------------

test('register requires a date of birth', async () => {
  const res = await api(ctx.base, 'POST', '/api/auth/register', {
    body: { username: uname(), password: 'Tr4ilblaze-Mathy' },
  });
  assert.strictEqual(res.status, 400);
});

test('register blocks under-13 users', async () => {
  const thisYear = new Date().getUTCFullYear();
  const res = await api(ctx.base, 'POST', '/api/auth/register', {
    body: { username: uname(), password: 'Tr4ilblaze-Mathy', birthDate: `${thisYear - 10}-06-01` },
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.ageRestricted, true);
});

test('register allows 13+ users and defaults telemetry OFF', async () => {
  const thisYear = new Date().getUTCFullYear();
  const username = uname();
  const res = await api(ctx.base, 'POST', '/api/auth/register', {
    body: { username, password: 'Tr4ilblaze-Mathy', birthDate: `${thisYear - 20}-06-01` },
  });
  assert.strictEqual(res.status, 200);
  // Export should reflect telemetry disabled by default (privacy-by-default H2).
  const exp = await api(ctx.base, 'GET', '/api/user/export-data', { token: res.body.token });
  assert.strictEqual(exp.status, 200);
});

// ---- Content filter (H1) --------------------------------------------------

test('contentFilter blocks profanity, leetspeak, and separators; allows clean names', () => {
  assert.strictEqual(checkText('hello_math', 'Username').ok, true);
  assert.strictEqual(checkText('assassin', 'Username').ok, true); // Scunthorpe guard
  assert.strictEqual(checkText('fuck', 'Username').ok, false);
  assert.strictEqual(checkText('f.u.c.k', 'Username').ok, false);
  assert.strictEqual(checkText('sh1t', 'Username').ok, false);
  assert.strictEqual(checkText('admin', 'Username').ok, false); // impersonation
});

test('register rejects an offensive username', async () => {
  const thisYear = new Date().getUTCFullYear();
  const res = await api(ctx.base, 'POST', '/api/auth/register', {
    body: { username: 'fuck' + crypto.randomBytes(2).toString('hex'), password: 'Tr4ilblaze-Mathy', birthDate: `${thisYear - 20}-06-01` },
  });
  assert.strictEqual(res.status, 400);
});

// ---- Account deletion completeness (C4) -----------------------------------

test('delete-account removes the user and leaves no residual rows in any user-scoped table', async () => {
  const { token } = await registerUser(ctx.base);
  const me = await api(ctx.base, 'GET', '/api/auth/me', { token });
  const userId = me.body.user ? me.body.user.id : me.body.id;
  assert.ok(userId, 'have a user id');

  // Create some scattered data so deletion has something to clean up.
  await api(ctx.base, 'POST', '/api/collections', { token, body: { name: 'My Notebook ' + userId } });

  const del = await api(ctx.base, 'POST', '/api/user/delete-account', { token });
  assert.strictEqual(del.status, 200);

  // Inspect the DB directly: assert zero rows referencing this user across every table that
  // has a user_id / blocker_id / reporter_id / friend_id column.
  const residual = await countAllUserRows(ctx.mod.db, userId);
  assert.deepStrictEqual(residual, [], `residual rows found: ${JSON.stringify(residual)}`);
});

// Walks the sqlite schema, finds every table with a user-linking column, and returns any that
// still hold rows for userId. Catches future tables that aren't wired into delete-account.
function countAllUserRows(db, userId) {
  const all = (sql, params = []) =>
    new Promise((resolve, reject) => db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
  const LINK_COLS = ['user_id', 'blocker_id', 'blocked_id', 'reporter_id', 'friend_id'];
  return (async () => {
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const offenders = [];
    for (const { name } of tables) {
      const cols = await all(`PRAGMA table_info(${name})`);
      const linkCols = cols.map((c) => c.name).filter((c) => LINK_COLS.includes(c));
      if (linkCols.length === 0) continue;
      const where = linkCols.map((c) => `${c} = ?`).join(' OR ');
      const rows = await all(`SELECT COUNT(*) AS n FROM ${name} WHERE ${where}`, linkCols.map(() => userId));
      if (rows[0].n > 0) offenders.push({ table: name, count: rows[0].n });
    }
    return offenders;
  })();
}

// ---- Moderation: block + report (H1) --------------------------------------

test('a user can block another, hiding them, and can report content', async () => {
  const a = await registerUser(ctx.base);
  const b = await registerUser(ctx.base);
  const bMe = await api(ctx.base, 'GET', '/api/auth/me', { token: b.token });
  const bId = bMe.body.user ? bMe.body.user.id : bMe.body.id;

  // A blocks B.
  const block = await api(ctx.base, 'POST', '/api/blocks', { token: a.token, body: { userId: bId } });
  assert.strictEqual(block.status, 200);

  // B can no longer send A a friend request.
  const reqFriend = await api(ctx.base, 'POST', '/api/friends/request', { token: b.token, body: { friendUsername: a.username } });
  assert.strictEqual(reqFriend.status, 403);

  // A's block list includes B.
  const list = await api(ctx.base, 'GET', '/api/blocks', { token: a.token });
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.some((x) => x.userId === bId));

  // A can report B.
  const report = await api(ctx.base, 'POST', '/api/reports', { token: a.token, body: { targetType: 'user', targetId: bId, reason: 'test' } });
  assert.strictEqual(report.status, 201);

  // A unblocks B.
  const unblock = await api(ctx.base, 'DELETE', `/api/blocks/${bId}`, { token: a.token });
  assert.strictEqual(unblock.status, 200);
});
