// Shared test harness: boots the real Express app against a throwaway SQLite DB on an
// ephemeral port, so smoke tests exercise the full middleware + route stack without
// touching the live numera.db.
//
// Env is set at MODULE LOAD, not inside bootServer(): db.js resolves NUMERA_DB_PATH (and
// config.js resolves JWT_SECRET) the moment they are first required, and test files often
// top-level-require services (which require ../db) before the `before()` hook runs. Setting
// env in bootServer() was too late for those files — they silently bound to the live
// numera.db, and concurrent full-suite processes then contended on it (SQLITE_BUSY made
// best-effort writes like notification dedup claims drop sends intermittently). Requiring
// helpers first — which every test file does — now pins the throwaway DB before any app
// module can load.
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const dbFile = path.join(os.tmpdir(), `numera-test-${crypto.randomUUID()}.db`);
process.env.NUMERA_DB_PATH = dbFile;
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.NODE_ENV = 'test';

async function bootServer() {
  const mod = require('../server.js');
  await mod.ready; // schema initialized + migrated
  // Tripwire for the require-order trap above: if an app module loaded db.js before this
  // file set NUMERA_DB_PATH (e.g. a test file requiring a service above './helpers'), the
  // process is bound to the wrong database. Fail loudly instead of corrupting the live DB.
  if (mod.db.filename !== dbFile) {
    throw new Error(
      `Test DB misbound: expected ${dbFile} but db.js opened ${mod.db.filename}. ` +
        "Require './helpers' before any server module in the test file."
    );
  }
  await new Promise((resolve) => mod.server.listen(0, resolve));
  const { port } = mod.server.address();
  return { mod, base: `http://127.0.0.1:${port}`, dbFile };
}

async function shutdown(ctx) {
  if (!ctx) return;
  await new Promise((resolve) => ctx.mod.server.close(resolve));
  await new Promise((resolve) => ctx.mod.db.close(() => resolve()));
  for (const suffix of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(ctx.dbFile + suffix); } catch { /* ignore */ }
  }
}

// Convenience JSON fetch wrapper returning { status, body }.
async function api(base, method, route, { token, body, headers } = {}) {
  const res = await fetch(base + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed = null;
  const text = await res.text();
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

// Registers a fresh unique user and returns { token, user }.
async function registerUser(base) {
  const username = 'smoke_' + crypto.randomBytes(4).toString('hex'); // <= 20 chars
  const { status, body } = await api(base, 'POST', '/api/auth/register', {
    body: { username, password: 'Tr4ilblaze-Mathy', birthDate: '2000-01-01' }, // adult: passes age gate
  });
  if (status !== 200 || !body || !body.token) {
    throw new Error(`register failed: ${status} ${JSON.stringify(body)}`);
  }
  return { ...body, username, password: 'Tr4ilblaze-Mathy' };
}

module.exports = { bootServer, shutdown, api, registerUser };
