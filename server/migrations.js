const logger = require('./logger');
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
  {
    version: 4,
    name: 'learner_profile_transfer_columns',
    // Sprint 4 (transfer exercises): track out-of-context attempts separately from in-context
    // practice. These feed the new `transfer` mastery dimension — true depth is only earned by
    // applying a concept in a novel framing, so it must be counted apart from drill success.
    up: async (run) => {
      // SQLite can't "ADD COLUMN IF NOT EXISTS"; tolerate a duplicate-column error so this
      // migration is safe on DBs that were hand-patched earlier.
      const addColumn = async (sql) => {
        try {
          await run(sql);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      };
      await addColumn('ALTER TABLE learner_profiles ADD COLUMN transfer_exposure INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE learner_profiles ADD COLUMN transfer_success INTEGER DEFAULT 0');
    },
  },
  {
    version: 5,
    name: 'auth_hardening_mfa_and_session_columns',
    // Authentication overhaul: brute-force ceiling on email codes, TOTP MFA enrollment, and
    // session inactivity tracking. All additive/idempotent.
    up: async (run) => {
      const addColumn = async (sql) => {
        try {
          await run(sql);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      };

      // Email verification: cap invalid guesses (see routes/account.js).
      await addColumn('ALTER TABLE user_email_verifications ADD COLUMN attempts INTEGER DEFAULT 0');

      // TOTP MFA: secret is held until the first valid code confirms enrollment (mfa_enabled=1).
      // A pending secret with mfa_enabled=0 is an un-confirmed setup.
      await addColumn('ALTER TABLE users ADD COLUMN mfa_secret TEXT');
      await addColumn('ALTER TABLE users ADD COLUMN mfa_enabled INTEGER DEFAULT 0');

      // Session inactivity timeout: last time a token tied to this session was used.
      await addColumn('ALTER TABLE user_sessions ADD COLUMN last_used_at INTEGER DEFAULT 0');

      // One-time MFA recovery codes (hashed at rest — never stored in plaintext). `used_at`
      // makes each strictly single-use.
      await run(`
        CREATE TABLE IF NOT EXISTS user_mfa_recovery_codes (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL,
          code_hash  TEXT    NOT NULL,
          used_at    INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_mfa_recovery_user ON user_mfa_recovery_codes(user_id)');
    },
  },
  {
    version: 6,
    name: 'password_reset_tokens',
    // Password reset: a high-entropy code is emailed; only its SHA-256 hash is stored, with a
    // short expiry, an attempt cap, and single-use enforcement (used_at). Never store the raw code.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL,
          token_hash TEXT    NOT NULL,
          attempts   INTEGER DEFAULT 0,
          expires_at INTEGER NOT NULL,
          used_at    INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)');
    },
  },
  {
    version: 7,
    name: 'user_roles',
    // Replace the string-matched `username === 'admin'` authz with a real role column.
    // Existing 'admin' username (seed/legacy) is promoted so behavior is unchanged.
    up: async (run) => {
      try {
        await run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
      await run("UPDATE users SET role = 'admin' WHERE username = 'admin'");
    },
  },
  {
    version: 8,
    name: 'refresh_tokens',
    // Short-lived access tokens + rotating refresh tokens. Each refresh token is single-use and
    // tied to a session; only its SHA-256 hash is stored. `used_at` enables reuse detection
    // (a consumed token presented again => theft => revoke the whole session).
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id  TEXT    NOT NULL,
          user_id     INTEGER NOT NULL,
          token_hash  TEXT    NOT NULL,
          expires_at  INTEGER NOT NULL,
          used_at     INTEGER DEFAULT 0,
          created_at  INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash)');
      await run('CREATE INDEX IF NOT EXISTS idx_refresh_session ON refresh_tokens(session_id)');
    },
  },
  {
    version: 9,
    name: 'compliance_age_gate_and_moderation',
    // Compliance remediation (see docs/ComplianceAudit.md):
    //  - birth_year: minimal age signal for the 13+ neutral age gate. We store the YEAR ONLY
    //    (data minimization) — enough to enforce the floor, not a full DOB.
    //  - user_blocks: a user can block another; blocks suppress friend requests + social visibility.
    //  - content_reports: user-submitted reports of inappropriate usernames/collections for
    //    human review (the moderation queue admins read).
    up: async (run) => {
      const addColumn = async (sql) => {
        try {
          await run(sql);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      };

      await addColumn('ALTER TABLE users ADD COLUMN birth_year INTEGER');

      await run(`
        CREATE TABLE IF NOT EXISTS user_blocks (
          blocker_id  INTEGER NOT NULL,
          blocked_id  INTEGER NOT NULL,
          created_at  INTEGER NOT NULL,
          PRIMARY KEY (blocker_id, blocked_id),
          FOREIGN KEY (blocker_id) REFERENCES users(id),
          FOREIGN KEY (blocked_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id)');
      await run('CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id)');

      await run(`
        CREATE TABLE IF NOT EXISTS content_reports (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          reporter_id   INTEGER NOT NULL,
          target_type   TEXT    NOT NULL,   -- 'user' | 'collection'
          target_id     INTEGER NOT NULL,
          reason        TEXT,
          status        TEXT    DEFAULT 'open' CHECK(status IN ('open','reviewed','actioned','dismissed')),
          created_at    INTEGER NOT NULL,
          reviewed_at   INTEGER DEFAULT 0,
          FOREIGN KEY (reporter_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status)');
    },
  },
  {
    version: 10,
    name: 'exercise_exposure_memory',
    // Anti-repetition keystone (see docs/MathEngineRepetitionAudit.md). Per-user memory of
    // which problems a learner has recently experienced, fingerprinted along orthogonal
    // dimensions so the diversity engine can detect not just exact duplicates but template,
    // structural, and context near-duplicates. One row per (user, signature); seen_count
    // and last_seen drive recency-weighted novelty scoring. Bounded by periodic pruning.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS exercise_exposure (
          user_id       INTEGER NOT NULL,
          signature     TEXT    NOT NULL,   -- concept + structure (primary near-dup key)
          concept_sig   TEXT,               -- concept / template family
          structure_sig TEXT,               -- question skeleton (numbers blanked)
          context_sig   TEXT,               -- non-numeric story/framing words
          answer_sig    TEXT,               -- normalized answer (catches fixed-answer reuse)
          surface       TEXT DEFAULT 'problem', -- problem | archive | daily
          seen_count    INTEGER DEFAULT 1,
          first_seen    INTEGER NOT NULL,
          last_seen     INTEGER NOT NULL,
          PRIMARY KEY (user_id, signature)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_exposure_user_seen ON exercise_exposure(user_id, last_seen)');
    },
  },
  {
    version: 11,
    name: 'lifecycle_notifications',
    // Multi-channel lifecycle/notification system (see docs/specs/Spec-LifecycleNotifications.md).
    // - notification_preferences: per-user channel/category opt-in + quiet hours + timezone.
    //   Rows are created lazily; absence means the privacy-respecting defaults in
    //   notificationService.DEFAULT_PREFS apply.
    // - notification_log: idempotent send ledger. UNIQUE(user_id, dedup_key) makes every
    //   lifecycle trigger fire at most once per window even if the hourly sweep re-runs.
    // - push_tokens: exists now (so account-deletion covers it) though push is a later phase.
    // All three are added to USER_SCOPED_TABLES in routes/account.js (deletion completeness, C4).
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          user_id           INTEGER PRIMARY KEY,
          email_enabled     INTEGER NOT NULL DEFAULT 1,  -- master email switch (transactional always allowed)
          email_lifecycle   INTEGER NOT NULL DEFAULT 1,  -- streak/winback/recap nudges
          push_enabled      INTEGER NOT NULL DEFAULT 0,  -- opt-in; reserved for the push phase
          quiet_hours_start INTEGER DEFAULT 21,          -- local hour [0-23], no push during quiet window
          quiet_hours_end   INTEGER DEFAULT 8,
          tz_offset_minutes INTEGER DEFAULT 0,           -- client-reported offset for send timing
          updated_at        INTEGER
        )
      `);
      await run(`
        CREATE TABLE IF NOT EXISTS notification_log (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id   INTEGER NOT NULL,
          category  TEXT NOT NULL,    -- 'streak_risk' | 'winback_d1' | 'weekly_recap' | ...
          channel   TEXT NOT NULL,    -- 'inapp' | 'email' | 'push'
          dedup_key TEXT NOT NULL,    -- e.g. 'streak_risk:email:2026-06-07'
          sent_at   INTEGER NOT NULL,
          UNIQUE(user_id, dedup_key)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_notiflog_user_cat ON notification_log(user_id, category, sent_at)');
      await run(`
        CREATE TABLE IF NOT EXISTS push_tokens (
          user_id    INTEGER NOT NULL,
          token      TEXT NOT NULL,
          platform   TEXT,            -- 'android' | 'web'
          created_at INTEGER,
          PRIMARY KEY(user_id, token)
        )
      `);
    },
  },
  {
    version: 12,
    name: 'puzzle_rush',
    // Solo time-attack ladder (see docs/specs/Spec-CompetitionExpansion.md §4.1). One row per
    // run. The server holds the current problem's answer (current_answer) so the client never
    // sees it before submitting — server-authoritative scoring. integrity_flag is the seam for
    // the future integrityEngine (superhuman-speed answers are flagged + excluded from boards).
    // Times are epoch MILLISECONDS here (run duration + per-answer timing both matter).
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS puzzle_rush_runs (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER NOT NULL,
          score            INTEGER DEFAULT 0,
          strikes          INTEGER DEFAULT 0,
          current_index    INTEGER DEFAULT 0,
          current_answer   TEXT,
          current_category TEXT,
          current_level    INTEGER,
          status           TEXT DEFAULT 'active',   -- active | finished | abandoned
          integrity_flag   INTEGER DEFAULT 0,
          started_at       INTEGER,
          ended_at         INTEGER,
          last_action_at   INTEGER
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_pr_user_score ON puzzle_rush_runs(user_id, score)');
      await run('CREATE INDEX IF NOT EXISTS idx_pr_board ON puzzle_rush_runs(status, integrity_flag, score)');
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
      logger.info(`[migrations] schema up to date (v${current}).`);
      return;
    }

    for (const m of pending) {
      logger.info(`[migrations] applying v${m.version}: ${m.name}`);
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
        logger.error(
          `[migrations] FAILED at v${m.version} (${m.name}):`,
          err.message
        );
        throw err; // abort startup — a half-applied schema is worse than a clear crash
      }
    }

    logger.info(
      `[migrations] done. schema now at v${pending[pending.length - 1].version}.`
    );
  })();
}

module.exports = { runMigrations, migrations };
