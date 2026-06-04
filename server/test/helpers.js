// Shared test harness: boots the real Express app against a throwaway SQLite DB on an
// ephemeral port, so smoke tests exercise the full middleware + route stack without
// touching the live numera.db. Env must be set BEFORE requiring server.js because db.js
// reads NUMERA_DB_PATH and server.js reads JWT_SECRET at module load.
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

async function bootServer() {
  const dbFile = path.join(os.tmpdir(), `numera-test-${crypto.randomUUID()}.db`);
  process.env.NUMERA_DB_PATH = dbFile;
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
  process.env.NODE_ENV = 'test';

  const mod = require('../server.js');
  await mod.ready; // schema initialized + migrated
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
