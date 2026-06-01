'use strict';

/**
 * Versioned schema migrations for Numera.
 *
 * WHY THIS EXISTS
 * ----------------
 * `db.js > initDb()` builds the *baseline* schema idempotently (CREATE TABLE
 * IF NOT EXISTS + a pile of `safeAlter()` ADD COLUMN calls). That works, but it
 * is unversioned: there is no record of which structural changes have been
 * applied, and one-time data fix-ups have nowhere clean to live.
 *
 * This module adds a tiny, dependency-free migration runner on top of that
 * baseline. Each migration runs exactly once, in order, and is recorded in the
 * `schema_version` table. From now on, prefer adding a migration here over
 * adding another ad-hoc `safeAlter()` in db.js — it is ordered, recorded, and
 * portable if we ever move SQLite -> Postgres.
 *
 * HOW TO ADD A MIGRATION
 * ----------------------
 * Append an object to the `migrations` array with the next integer `version`,
 * a short `name`, and an `up(run)` function. `run(sql)` returns a Promise that
 * resolves when the statement finishes. Never edit or renumber an existing
 * migration that has shipped — only append.
 */

/**
 * Ordered list of migrations. version numbers must be unique and ascending.
 * Each `up` receives a promisified `run(sql, params?)` helper.
 */
const migrations = [
  {
    version: 1,
    name: 'index_user_achievements_claimed',
    // Speeds up "unclaimed achievements for this user" lookups. IF NOT EXISTS
    // keeps it safe even on databases that were hand-patched earlier.
    up: (run) =>
      run(
        'CREATE INDEX IF NOT EXISTS idx_user_achievements_claimed ' +
          'ON user_achievements(user_id, claimed)'
      ),
  },
  {
    version: 2,
    name: 'guard_non_negative_coins',
    // Last line of defense: the DB itself refuses to drive a user's coin
    // balance below zero, no matter what application bug might try. The
    // conditional `WHERE coins >= ?` deductions should already prevent this;
    // this trigger guarantees it. Inside a transaction the RAISE(ABORT) rolls
    // the whole unit back.
    up: (run) =>
      run(`
        CREATE TRIGGER IF NOT EXISTS trg_users_coins_nonneg
        BEFORE UPDATE OF coins ON users
        FOR EACH ROW WHEN NEW.coins < 0
        BEGIN
          SELECT RAISE(ABORT, 'coins cannot be negative');
        END
      `),
  },
  {
    version: 3,
    name: 'idempotency_keys',
    // Stores the result of a completed mutating request keyed by a
    // client-supplied Idempotency-Key (scoped per user). On a retry the server
    // replays the stored response instead of granting rewards twice.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS idempotency_keys (
          idem_key        TEXT    NOT NULL,
          user_id         INTEGER NOT NULL,
          endpoint        TEXT,
          response_status INTEGER,
          response_json   TEXT,
          created_at      INTEGER,
          PRIMARY KEY (user_id, idem_key)
        )
      `);
      // Supports periodic pruning of old keys (e.g. WHERE created_at < cutoff).
      await run(
        'CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ' +
          'ON idempotency_keys(created_at)'
      );
    },
  },
];

/**
 * Run all migrations newer than the version currently stored in the DB.
 *
 * @param {import('sqlite3').Database} db an open sqlite3 database
 * @returns {Promise<void>}
 */
function runMigrations(db) {
  // Promisified single-statement runner bound to this db.
  const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, (err) => (err ? reject(err) : resolve()));
    });

  const get = (sql) =>
    new Promise((resolve, reject) => {
      db.get(sql, (err, row) => (err ? reject(err) : resolve(row)));
    });

  return (async () => {
    await run(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version    INTEGER PRIMARY KEY,
        name       TEXT,
        applied_at INTEGER
      )
    `);

    const row = await get('SELECT MAX(version) AS v FROM schema_version');
    const current = (row && row.v) || 0;

    const pending = migrations
      .filter((m) => m.version > current)
      .sort((a, b) => a.version - b.version);

    if (pending.length === 0) {
      console.log(`[migrations] schema up to date (v${current}).`);
      return;
    }

    for (const m of pending) {
      console.log(`[migrations] applying v${m.version}: ${m.name}`);
      await run('BEGIN');
      try {
        await m.up(run);
        await run(
          'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
          [m.version, m.name, Math.floor(Date.now() / 1000)]
        );
        await run('COMMIT');
      } catch (err) {
        await run('ROLLBACK').catch(() => {});
        console.error(
          `[migrations] FAILED at v${m.version} (${m.name}):`,
          err.message
        );
        throw err; // abort startup — a half-applied schema is worse than a clear crash
      }
    }

    console.log(
      `[migrations] done. schema now at v${pending[pending.length - 1].version}.`
    );
  })();
}

module.exports = { runMigrations, migrations };
