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
  {
    version: 13,
    name: 'async_duels',
    // Correspondence duels (see docs/specs/Spec-CompetitionExpansion.md §4.2): two friends solve
    // the SAME server-generated problem set within 24h; resolved when both have played. The set
    // (incl. answers) is stored once so both get identical problems and scoring is authoritative.
    // Two user columns (challenger/opponent) -> custom cleanup in the account-deletion handler.
    // v1 awards coins only; NRS/ranked async is a later item.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS async_matches (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          challenger_id    INTEGER NOT NULL,
          opponent_id      INTEGER NOT NULL,
          problems_json    TEXT NOT NULL,
          problem_count    INTEGER NOT NULL,
          challenger_score INTEGER,           -- NULL until that player has played
          opponent_score   INTEGER,
          status           TEXT DEFAULT 'pending',  -- pending | finished | expired
          winner_id        INTEGER,           -- NULL = draw / unresolved
          reward           INTEGER DEFAULT 0,
          created_at       INTEGER NOT NULL,
          expires_at       INTEGER NOT NULL,
          finished_at      INTEGER
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_async_challenger ON async_matches(challenger_id, status)');
      await run('CREATE INDEX IF NOT EXISTS idx_async_opponent ON async_matches(opponent_id, status)');
    },
  },
  {
    version: 14,
    name: 'adaptive_diagnostic',
    // Server-authoritative adaptive placement (replaces the static, client-scored quiz). One row
    // per in-progress diagnostic: the server holds the outstanding question's answer and the
    // binary-search bounds, so difficulty adapts per response and scoring can't be spoofed.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS diagnostic_sessions (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id          INTEGER NOT NULL,
          level            INTEGER NOT NULL,   -- current ability estimate / next question level
          low              INTEGER NOT NULL,   -- binary-search lower bound
          high             INTEGER NOT NULL,   -- binary-search upper bound
          asked            INTEGER DEFAULT 0,
          correct          INTEGER DEFAULT 0,
          current_answer   TEXT,               -- answer to the outstanding question (never sent to client)
          current_category TEXT,
          current_level    INTEGER,
          status           TEXT DEFAULT 'active',  -- active | done
          created_at       INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_diag_user ON diagnostic_sessions(user_id, status)');
    },
  },
  {
    version: 15,
    name: 'learning_goals',
    // Learner-set goals (audit #2/#19 — close the personalization loop with an explicit target the
    // learner chooses). One ACTIVE goal per user (PRIMARY KEY user_id = upsert-in-place). Progress
    // is computed on read from existing stats, so no progress column to keep in sync. goal_type is
    // one of: daily_problems | reach_level | streak.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS user_goals (
          user_id      INTEGER PRIMARY KEY,
          goal_type    TEXT NOT NULL,
          target_value INTEGER NOT NULL,
          created_at   INTEGER NOT NULL
        )
      `);
    },
  },
  {
    version: 16,
    name: 'concept_discussion',
    // Per-concept discussion (audit #1.7/#1.18 — community). A flat, newest-first message list
    // attached to a curriculum concept. `hidden` is the moderation soft-delete (set when a report
    // is actioned) so a removed post leaves the thread intact. Reportable via /api/reports.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS concept_posts (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          concept_id TEXT NOT NULL,
          user_id    INTEGER NOT NULL,
          body       TEXT NOT NULL,
          hidden     INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_concept_posts ON concept_posts(concept_id, created_at)');
    },
  },
  {
    version: 17,
    name: 'concept_post_votes',
    // Upvotes on discussion posts (audit #1.18 — let the best answers rise). One vote per
    // (post, user); the list sorts by vote count so quality surfaces. PK enforces at-most-one.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS concept_post_votes (
          post_id    INTEGER NOT NULL,
          user_id    INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (post_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_post_votes_user ON concept_post_votes(user_id)');
    },
  },
  {
    version: 18,
    name: 'concept_post_replies',
    // One level of threading on discussion posts: a reply carries parent_id = the top-level post
    // it answers (NULL = top-level). Kept to a single level (no reply-to-a-reply) for a clean,
    // readable thread. Backfills as NULL on the existing rows.
    up: async (run) => {
      await run('ALTER TABLE concept_posts ADD COLUMN parent_id INTEGER');
      await run('CREATE INDEX IF NOT EXISTS idx_concept_posts_parent ON concept_posts(parent_id)');
    },
  },
  {
    version: 19,
    name: 'bot_duels',
    // Calibrated bot opponents (audit #1.8 / top-50 #30 — practice competition anytime, no
    // matchmaking wait). Single-player vs an AI whose per-problem accuracy is fixed by tier; the
    // bot's score is rolled at start and stored (server-authoritative, invisible to the player)
    // and the match resolves the instant the player submits.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS bot_matches (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id       INTEGER NOT NULL,
          tier          TEXT NOT NULL,
          bot_rating    INTEGER NOT NULL,
          problems_json TEXT NOT NULL,
          problem_count INTEGER NOT NULL,
          bot_score     INTEGER NOT NULL,
          user_score    INTEGER,
          winner        TEXT,
          reward        INTEGER DEFAULT 0,
          status        TEXT DEFAULT 'pending',
          created_at    INTEGER NOT NULL,
          finished_at   INTEGER
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_bot_matches_user ON bot_matches(user_id, status)');
    },
  },
  {
    version: 20,
    name: 'clubs',
    // Clubs/teams (audit #1.7 — the community spine beyond a friend list). A learner belongs to at
    // most one club at a time. owner_id is the creator (informational in v1 — no special powers); a
    // club is deleted when its last member leaves.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS clubs (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          name        TEXT NOT NULL UNIQUE,
          description TEXT,
          owner_id    INTEGER NOT NULL,
          created_at  INTEGER NOT NULL
        )
      `);
      await run(`
        CREATE TABLE IF NOT EXISTS club_members (
          club_id   INTEGER NOT NULL,
          user_id   INTEGER NOT NULL,
          joined_at INTEGER NOT NULL,
          PRIMARY KEY (club_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members(user_id)');
    },
  },
  {
    version: 21,
    name: 'custom_challenges',
    // User-created Custom Challenges (audit #10 / top-50 #23 — UGC community gravity + a content
    // treadmill). A learner authors a NAMED challenge over one curriculum concept; the server
    // generates a FIXED problem set once and stores it (everyone plays the SAME problems → a fair
    // per-challenge leaderboard). One scored attempt per user; ranked score-then-speed. Only the
    // title is user text (content-filtered) — problems are server-generated, so there's no
    // wrong-math/moderation hole. custom_challenges (keyed by creator_id) gets an explicit
    // deletion line in account.js; challenge_attempts (keyed by user_id) joins USER_SCOPED_TABLES.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS custom_challenges (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          code          TEXT NOT NULL UNIQUE,
          creator_id    INTEGER NOT NULL,
          title         TEXT NOT NULL,
          concept_id    TEXT NOT NULL,
          category      TEXT NOT NULL,
          level         INTEGER NOT NULL,
          problem_count INTEGER NOT NULL,
          problems_json TEXT NOT NULL,
          play_count    INTEGER NOT NULL DEFAULT 0,
          created_at    INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_custom_challenges_creator ON custom_challenges(creator_id)');
      await run(`
        CREATE TABLE IF NOT EXISTS challenge_attempts (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          challenge_id INTEGER NOT NULL,
          user_id      INTEGER NOT NULL,
          score        INTEGER NOT NULL,
          elapsed_ms   INTEGER NOT NULL DEFAULT 0,
          created_at   INTEGER NOT NULL,
          UNIQUE (challenge_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge ON challenge_attempts(challenge_id, score)');
    },
  },
  {
    version: 22,
    name: 'tournaments',
    // Weekly async tournaments (audit #21 / #1.8 / #1.19 — recurring re-engagement + an endless
    // competitive ladder, WITHOUT the real-time Socket.IO arena). One global event runs per week:
    // a server-generated FIXED problem set everyone races on the same terms, one timed attempt per
    // player (started_at/elapsed are server-measured so the speed tiebreak can't be faked). The
    // event self-perpetuates (lazy seed) and pays the top 3 on lazy finalize after it ends.
    // tournament_entries (keyed by user_id) joins USER_SCOPED_TABLES; tournaments is global.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS tournaments (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          title         TEXT NOT NULL,
          concept_id    TEXT NOT NULL,
          category      TEXT NOT NULL,
          level         INTEGER NOT NULL,
          problem_count INTEGER NOT NULL,
          problems_json TEXT NOT NULL,
          starts_at     INTEGER NOT NULL,
          ends_at       INTEGER NOT NULL,
          status        TEXT NOT NULL DEFAULT 'active',
          created_at    INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status, ends_at)');
      await run(`
        CREATE TABLE IF NOT EXISTS tournament_entries (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL,
          user_id       INTEGER NOT NULL,
          started_at    INTEGER NOT NULL,
          score         INTEGER,
          elapsed_ms    INTEGER,
          reward        INTEGER NOT NULL DEFAULT 0,
          status        TEXT NOT NULL DEFAULT 'pending',
          created_at    INTEGER NOT NULL,
          UNIQUE (tournament_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_tournament_entries_board ON tournament_entries(tournament_id, status, score)');
    },
  },
  {
    version: 23,
    name: 'season_rewards_finalized',
    // Ranked seasons with rewards (audit #4 — "daily ranked seasons with rewards"). The seasons
    // table already tracks peak ratings; this flag makes the end-of-season payout idempotent so a
    // season can only ever reward its top finishers ONCE, whether the rollover is triggered by the
    // admin endpoint or lazily when an expired season is next read.
    up: async (run) => {
      await run('ALTER TABLE seasons ADD COLUMN rewards_finalized INTEGER NOT NULL DEFAULT 0');
    },
  },
  {
    version: 24,
    name: 'club_wars',
    // Club wars (audit #1.7 — team competition; ties the community moat to the async-event infra).
    // An owner challenges another club to a head-to-head over a window: both clubs' members race the
    // SAME server-generated set once, and the club with the higher combined score wins (lazy
    // finalize pays the winning side). club_war_entries (keyed by user_id) joins USER_SCOPED_TABLES;
    // club_wars is keyed by club ids.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS club_wars (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          challenger_club_id  INTEGER NOT NULL,
          opponent_club_id    INTEGER NOT NULL,
          concept_id          TEXT NOT NULL,
          category            TEXT NOT NULL,
          level               INTEGER NOT NULL,
          problem_count       INTEGER NOT NULL,
          problems_json       TEXT NOT NULL,
          starts_at           INTEGER NOT NULL,
          ends_at             INTEGER NOT NULL,
          status              TEXT NOT NULL DEFAULT 'active',
          winner_club_id      INTEGER,
          created_at          INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_club_wars_clubs ON club_wars(challenger_club_id, opponent_club_id, status)');
      await run(`
        CREATE TABLE IF NOT EXISTS club_war_entries (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          war_id     INTEGER NOT NULL,
          user_id    INTEGER NOT NULL,
          club_id    INTEGER NOT NULL,
          score      INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE (war_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_club_war_entries_war ON club_war_entries(war_id, club_id)');
    },
  },
  {
    version: 25,
    name: 'onboarding',
    // First-launch → habit onboarding (the app dropped new users straight into MainTabs after
    // signup; the adaptive diagnostic was orphaned). State is server-owned so it survives reinstall
    // and gates navigation. `motivational` goals (multi-select, aspirational) are SEPARATE from the
    // quantitative user_goals (reach_level/streak) — additive, not a replacement. category_log lets
    // the diagnostic feed a per-strength/growth roadmap; onboarding_events instruments drop-off.
    up: async (run) => {
      await run('ALTER TABLE users ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0');
      await run('ALTER TABLE users ADD COLUMN display_name TEXT');
      await run('ALTER TABLE users ADD COLUMN profile_style TEXT');
      await run('ALTER TABLE users ADD COLUMN practice_schedule TEXT'); // JSON {frequency, days[]}
      await run('ALTER TABLE users ADD COLUMN reminders_opt_in INTEGER NOT NULL DEFAULT 0');

      await run(`
        CREATE TABLE IF NOT EXISTS user_motivations (
          user_id        INTEGER NOT NULL,
          motivation_key TEXT NOT NULL,
          PRIMARY KEY (user_id, motivation_key)
        )
      `);
      await run(`
        CREATE TABLE IF NOT EXISTS user_interests (
          user_id      INTEGER NOT NULL,
          interest_key TEXT NOT NULL,
          PRIMARY KEY (user_id, interest_key)
        )
      `);

      // Per-question diagnostic trail: JSON array of {category, level, correct}. Powers the roadmap's
      // strengths/growth (the table otherwise only held the CURRENT question's category).
      await run('ALTER TABLE diagnostic_sessions ADD COLUMN category_log TEXT');

      await run(`
        CREATE TABLE IF NOT EXISTS onboarding_events (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id    INTEGER NOT NULL,
          step       TEXT NOT NULL,
          event      TEXT NOT NULL,
          ms         INTEGER,
          created_at INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON onboarding_events(user_id, step)');
    },
  },
  {
    version: 26,
    name: 'progressive_disclosure',
    // One-time feature spotlights (Phase 11): record which feature intros a user has already seen,
    // so the gradual reveal persists across devices/relaunch and never re-shows.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS user_feature_spotlights (
          user_id     INTEGER NOT NULL,
          feature_key TEXT NOT NULL,
          seen_at     INTEGER NOT NULL,
          PRIMARY KEY (user_id, feature_key)
        )
      `);
    },
  },
  {
    version: 27,
    name: 'strand_mastery_columns',
    // Curriculum strands (audit #1.1) shipped 7 new problem categories, but user_mastery only
    // counted the 6 original ones — strand solves were never tracked, so their achievement
    // chains couldn't exist. One counter column per strand, mirroring the original layout.
    up: async (run) => {
      const addColumn = async (sql) => {
        try {
          await run(sql);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      };
      await addColumn('ALTER TABLE user_mastery ADD COLUMN geometry_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN integers_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN decimals_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN fractions_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN number_sense_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN statistics_correct INTEGER DEFAULT 0');
      await addColumn('ALTER TABLE user_mastery ADD COLUMN expressions_correct INTEGER DEFAULT 0');
    },
  },
  {
    version: 28,
    name: 'crash_reports',
    // Self-hosted, privacy-first crash reporting (ultra review #12): no third-party SDK, and
    // deliberately NO user id / device id — a crash report is a stack trace + app version +
    // Android API level, nothing else. `fingerprint` groups identical crashes for triage.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS crash_reports (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fingerprint TEXT NOT NULL,
          app_version TEXT,
          sdk_int INTEGER,
          stack TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_crash_fingerprint ON crash_reports(fingerprint)');
    },
  },
  {
    version: 29,
    name: 'powers_strand_mastery',
    // Powers strand (exponents & roots, 8.EE band) — its mastery counter, mirroring v27.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN powers_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 30,
    name: 'graphing_strand_mastery',
    // Graphing strand (linear graphing & the coordinate plane, 8.EE/8.F/8.G) — its mastery
    // counter, mirroring v29.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN graphing_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 31,
    name: 'inequalities_strand_mastery',
    // Inequalities strand (order reasoning, 6.EE/7.EE) — its mastery counter, mirroring v30.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN inequalities_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 32,
    name: 'functions_strand_mastery',
    // Functions strand (8.F — notation, tables, rate of change) — its mastery counter.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN functions_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 33,
    name: 'sequences_strand_mastery',
    // Sequences strand (arithmetic & geometric patterns) — its mastery counter.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN sequences_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 34,
    name: 'equations_strand_mastery',
    // Equations strand (solving equations with fractions) — its mastery counter.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN equations_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 35,
    name: 'rates_strand_mastery',
    // Ratios & rates strand (applied proportional reasoning) — its mastery counter.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN rates_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 36,
    name: 'factors_strand_mastery',
    // Factors & multiples strand (middle-school number theory) — its mastery counter.
    up: async (run) => {
      try {
        await run('ALTER TABLE user_mastery ADD COLUMN factors_correct INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 37,
    name: 'guest_accounts',
    // Guest mode: a value-first path that lets a learner try Numera before any signup wall.
    // A guest is a real (ephemeral) user row with is_guest=1, no password, and no PII; it is
    // upgraded in place into a full account by /api/auth/convert (which keeps all progress).
    up: async (run) => {
      try {
        await run('ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 38,
    name: 'problem_reports',
    // Content-quality feedback loop (ultra review #17/#90): let a learner flag a *generated*
    // exercise as wrong/typo/confusing. Distinct from content_reports (UGC safety) — this captures
    // the problem text + context so the catalog gets a human-review signal it never had before.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS problem_reports (
          id           INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id      INTEGER,
          question     TEXT NOT NULL,
          correct_answer TEXT,
          category     TEXT,
          level        INTEGER,
          game_mode    TEXT,
          reason       TEXT NOT NULL,
          note         TEXT,
          status       TEXT NOT NULL DEFAULT 'open',
          created_at   INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_problem_reports_status ON problem_reports(status)');
    },
  },
  {
    version: 39,
    name: 'streak_repair',
    // Streak repair (ultra review #29): the "second valve" after the streak-freeze shield. When a
    // streak fully resets, we stash what was lost + when, so the learner can pay coins to restore it
    // within a short grace window instead of losing weeks of momentum to one bad day.
    up: async (run) => {
      for (const col of [
        'ALTER TABLE users ADD COLUMN lost_streak INTEGER DEFAULT 0',
        'ALTER TABLE users ADD COLUMN lost_streak_at INTEGER DEFAULT 0',
      ]) {
        try {
          await run(col);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      }
    },
  },
  {
    version: 40,
    name: 'more_quest_types',
    // Expand the daily quest pool beyond the original 4 (ultra review #63): add quests over the
    // newer systems — a Puzzle Rush run and clearing spaced-review (SRS) items.
    up: async (run) => {
      for (const col of [
        'ALTER TABLE user_quests ADD COLUMN puzzle_rush_today INTEGER DEFAULT 0',
        'ALTER TABLE user_quests ADD COLUMN puzzle_rush_claimed INTEGER DEFAULT 0',
        'ALTER TABLE user_quests ADD COLUMN srs_review_today INTEGER DEFAULT 0',
        'ALTER TABLE user_quests ADD COLUMN srs_review_claimed INTEGER DEFAULT 0',
      ]) {
        try {
          await run(col);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      }
    },
  },
  {
    version: 41,
    name: 'analytics_daily',
    // Self-hosted, privacy-first product analytics (ultra review #39): aggregate daily counts per
    // event, with NO user/device/session linkage — the rows are not personal data and cannot be
    // attributed to anyone, so they answer "what's used?" without the privacy cost of an SDK.
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS analytics_daily (
          day   TEXT NOT NULL,
          event TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (day, event)
        )
      `);
    },
  },
  {
    version: 42,
    name: 'activation_tracking',
    // Activation metric (ultra review #23): define + log whether a new account reaches the
    // activation bar (N problems within the first few days). created_at anchors the window;
    // activated_at is stamped once when the bar is cleared. Existing rows backfill created_at from
    // last_active (best available signal) so they're not all excluded from the cohort.
    up: async (run) => {
      for (const col of [
        'ALTER TABLE users ADD COLUMN created_at INTEGER DEFAULT 0',
        'ALTER TABLE users ADD COLUMN activated_at INTEGER DEFAULT 0',
      ]) {
        try {
          await run(col);
        } catch (e) {
          if (!/duplicate column name/i.test(e.message)) throw e;
        }
      }
      await run('UPDATE users SET created_at = last_active WHERE (created_at = 0 OR created_at IS NULL) AND last_active > 0');
    },
  },
  {
    version: 43,
    name: 'guardian_email',
    // Parent channel (ultra review #51/#78): a learner-set guardian/parent address to receive
    // progress summaries. Learner-initiated and opt-in (no covert parent account); cleared with the
    // account on deletion since it lives on the user row.
    up: async (run) => {
      try {
        await run("ALTER TABLE users ADD COLUMN guardian_email TEXT DEFAULT ''");
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 44,
    name: 'classes',
    // School channel (ultra review #52/#86): the class-code join flow. Any user can create a class
    // (becoming its teacher) and share the join code; students join with the code and the teacher
    // sees a roster of plain-language progress (reusing services/progressReport). No new role —
    // "teacher" just means "created this class".
    up: async (run) => {
      await run(`
        CREATE TABLE IF NOT EXISTS classes (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          code       TEXT NOT NULL UNIQUE,
          name       TEXT NOT NULL,
          teacher_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL
        )
      `);
      await run(`
        CREATE TABLE IF NOT EXISTS class_members (
          class_id  INTEGER NOT NULL,
          user_id   INTEGER NOT NULL,
          joined_at INTEGER NOT NULL,
          PRIMARY KEY (class_id, user_id)
        )
      `);
      await run('CREATE INDEX IF NOT EXISTS idx_class_members_user ON class_members(user_id)');
    },
  },
  {
    version: 45,
    name: 'puzzle_rush_template_type',
    // Feed the learning engine from competitive play: persist the current problem's template/concept
    // on the run row so a graded puzzle-rush answer can be attributed to the right concept (mastery,
    // retention, misconceptions) via services/engineFeed — previously only solo play fed the engine.
    up: async (run) => {
      try {
        await run('ALTER TABLE puzzle_rush_runs ADD COLUMN current_template_type TEXT');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
    },
  },
  {
    version: 46,
    name: 'season_tokens',
    // Prestige currency for the seasonal cosmetic sink: surplus coins convert into season tokens
    // (a deep, recurring sink that keeps coins meaningful past the one-time cosmetic catalog),
    // and tokens buy token-only prestige cosmetics. (ultra-review #66/#75 / docs/EconomyModel.md.)
    up: async (run) => {
      try {
        await run('ALTER TABLE users ADD COLUMN season_tokens INTEGER DEFAULT 0');
      } catch (e) {
        if (!/duplicate column name/i.test(e.message)) throw e;
      }
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
