const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

// DB location is env-overridable so tests (and alternate deployments) can point at a
// throwaway database instead of the live numera.db. Defaults to the canonical file.
const dbPath = process.env.NUMERA_DB_PATH || path.join(__dirname, 'numera.db');
const db = new sqlite3.Database(dbPath);
// WAL mode: allows concurrent reads during writes — critical for a live game server
db.run("PRAGMA journal_mode=WAL;");
db.run("PRAGMA foreign_keys = ON;");
db.run("PRAGMA synchronous = NORMAL;"); // Safe with WAL; faster than FULL
db.run("PRAGMA busy_timeout = 5000;");  // Wait up to 5s for a lock instead of throwing SQLITE_BUSY

// Safe ALTER helper — silently ignores "duplicate column" errors from re-runs
function safeAlter(sql) {
  db.run(sql, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      logger.error('[DB] Migration error:', err.message, '|', sql);
    }
  });
}

function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("PRAGMA foreign_keys = OFF;");
      // 1. Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          xp INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          coins INTEGER DEFAULT 100,
          rank TEXT DEFAULT 'Unranked (Placement: 0/5)',
          streak INTEGER DEFAULT 0,
          last_active INTEGER DEFAULT 0,
          active_badge TEXT DEFAULT 'Novice',
          theme TEXT DEFAULT 'duolingo',
          avatar TEXT DEFAULT 'avatar_pythagoras',
          solved_count INTEGER DEFAULT 0,
          arena_wins INTEGER DEFAULT 0,
          active_banner TEXT DEFAULT 'banner_default',
          assessment_taken INTEGER DEFAULT 0,
          league TEXT DEFAULT 'Bronze',
          league_points INTEGER DEFAULT 0,
          last_league_reset INTEGER DEFAULT 0,
          elo INTEGER DEFAULT 1000,
          competitive_matches INTEGER DEFAULT 0,
          total_coins_earned INTEGER DEFAULT 100,
          total_coins_spent INTEGER DEFAULT 0,
          xp_booster_uses_left INTEGER DEFAULT 0,
          max_streak INTEGER DEFAULT 0,
          commitment_state TEXT DEFAULT 'active',
          burnout_risk TEXT DEFAULT 'low',
          consistency_index REAL DEFAULT 0.0,
          burnout_counter INTEGER DEFAULT 0,
          last_telemetry_check INTEGER DEFAULT 0,
          email TEXT DEFAULT '',
          telemetry_enabled INTEGER DEFAULT 1,
          profile_private INTEGER DEFAULT 0
        )
      `);

      // Run ALTER migration for existing DB
      safeAlter("ALTER TABLE users ADD COLUMN solved_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN arena_wins INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN active_banner TEXT DEFAULT 'banner_default'");
      safeAlter("ALTER TABLE users ADD COLUMN assessment_taken INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN league TEXT DEFAULT 'Bronze'");
      safeAlter("ALTER TABLE users ADD COLUMN league_points INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN last_league_reset INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN elo INTEGER DEFAULT 1000");
      safeAlter("ALTER TABLE users ADD COLUMN competitive_matches INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN total_coins_earned INTEGER DEFAULT 100");
      safeAlter("ALTER TABLE users ADD COLUMN total_coins_spent INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN xp_booster_uses_left INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN max_streak INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN commitment_state TEXT DEFAULT 'active'");
      safeAlter("ALTER TABLE users ADD COLUMN burnout_risk TEXT DEFAULT 'low'");
      safeAlter("ALTER TABLE users ADD COLUMN consistency_index REAL DEFAULT 0.0");
      safeAlter("ALTER TABLE users ADD COLUMN burnout_counter INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN last_telemetry_check INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
      safeAlter("ALTER TABLE users ADD COLUMN telemetry_enabled INTEGER DEFAULT 1");
      safeAlter("ALTER TABLE users ADD COLUMN profile_private INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN perfect_exercises_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN perfect_levels_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN daily_puzzles_solved INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN archive_solved INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN seasonal_spring_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN seasonal_summer_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN calculator_sixseven_count INTEGER DEFAULT 0");
      safeAlter("ALTER TABLE users ADD COLUMN speed_demon_count INTEGER DEFAULT 0");
      db.run("UPDATE users SET rank = 'Unranked (Placement: 0/5)' WHERE competitive_matches IS NULL OR competitive_matches < 5", () => {});

      // 2. Friends table
      db.run(`
        CREATE TABLE IF NOT EXISTS friends (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          friend_id INTEGER,
          status TEXT CHECK(status IN ('pending', 'accepted')),
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(friend_id) REFERENCES users(id),
          UNIQUE(user_id, friend_id)
        )
      `);

      // 3. Shop items table
      db.run(`DROP TABLE IF EXISTS shop_items`);
      db.run(`
        CREATE TABLE shop_items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          cost INTEGER NOT NULL,
          type TEXT CHECK(type IN ('avatar', 'theme', 'badge', 'banner', 'utility')),
          value TEXT NOT NULL,
          rarity TEXT DEFAULT 'Common' CHECK(rarity IN ('Common', 'Rare', 'Epic', 'Legendary', 'Mythic')),
          description TEXT DEFAULT '',
          required_rank TEXT DEFAULT NULL,
          is_animated INTEGER DEFAULT 0,
          particle_effect TEXT DEFAULT NULL,
          is_utility INTEGER DEFAULT 0
        )
      `);

      // 3b. User Utilities table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_utilities (
          user_id INTEGER,
          item_id TEXT,
          quantity INTEGER DEFAULT 0,
          PRIMARY KEY(user_id, item_id),
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(item_id) REFERENCES shop_items(id)
        )
      `);

      // 4. User Inventory table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          item_id TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(item_id) REFERENCES shop_items(id),
          UNIQUE(user_id, item_id)
        )
      `);

      // 5. Spaced Repetition (SRS) Reviews table
      db.run(`
        CREATE TABLE IF NOT EXISTS srs_reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          topic TEXT NOT NULL,
          ease_factor REAL DEFAULT 2.5,
          interval INTEGER DEFAULT 0,
          repetitions INTEGER DEFAULT 0,
          next_review INTEGER DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id),
          UNIQUE(user_id, topic)
        )
      `);

      // 6. Archive Exercises table
      db.run(`
        CREATE TABLE IF NOT EXISTS archive_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          story TEXT NOT NULL,
          question TEXT NOT NULL,
          correct_answer TEXT NOT NULL,
          options TEXT NOT NULL, -- JSON array of strings
          explanation TEXT NOT NULL,
          difficulty TEXT NOT NULL,
          category TEXT NOT NULL,
          stars INTEGER NOT NULL,
          source TEXT NOT NULL
        )
      `);

      // 6b. User Mistakes table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_mistakes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          category TEXT NOT NULL,
          question TEXT NOT NULL,
          correct_answer TEXT NOT NULL,
          options TEXT NOT NULL, -- JSON array of strings
          explanation TEXT NOT NULL,
          created_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 6c. User Quests table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_quests (
          user_id INTEGER PRIMARY KEY,
          solved_today INTEGER DEFAULT 0,
          duels_today INTEGER DEFAULT 0,
          mistakes_today INTEGER DEFAULT 0,
          daily_puzzle_today INTEGER DEFAULT 0,
          last_quest_reset INTEGER DEFAULT 0,
          solved_claimed INTEGER DEFAULT 0,
          duels_claimed INTEGER DEFAULT 0,
          mistakes_claimed INTEGER DEFAULT 0,
          daily_puzzle_claimed INTEGER DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 6d. User Mastery table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_mastery (
          user_id INTEGER PRIMARY KEY,
          arithmetic_correct INTEGER DEFAULT 0,
          mental_correct INTEGER DEFAULT 0,
          algebra_correct INTEGER DEFAULT 0,
          calculus_correct INTEGER DEFAULT 0,
          combinatorics_correct INTEGER DEFAULT 0,
          number_theory_correct INTEGER DEFAULT 0,
          geometry_correct INTEGER DEFAULT 0,
          integers_correct INTEGER DEFAULT 0,
          decimals_correct INTEGER DEFAULT 0,
          fractions_correct INTEGER DEFAULT 0,
          number_sense_correct INTEGER DEFAULT 0,
          statistics_correct INTEGER DEFAULT 0,
          expressions_correct INTEGER DEFAULT 0,
          powers_correct INTEGER DEFAULT 0,
          graphing_correct INTEGER DEFAULT 0,
          inequalities_correct INTEGER DEFAULT 0,
          functions_correct INTEGER DEFAULT 0,
          sequences_correct INTEGER DEFAULT 0,
          equations_correct INTEGER DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 7. Achievements table
      // NOTE: `achievements` is a CATALOG table (definitions). It is refreshed
      // every boot via `DELETE FROM achievements` + re-seed below, so its rows
      // always match the latest achievementsList. We intentionally do NOT drop
      // `user_achievements` here — that table holds per-user progress/claims and
      // dropping it on every restart wiped all players' achievement state.
      db.run(`
        CREATE TABLE IF NOT EXISTS achievements (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          icon TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_value INTEGER NOT NULL,
          reward_coins INTEGER NOT NULL,
          category TEXT NOT NULL,
          chain_id TEXT NOT NULL,
          chain_order INTEGER NOT NULL,
          is_hidden INTEGER DEFAULT 0
        )
      `);

      // 8. User achievements mapping table (per-user progress — never dropped)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          user_id INTEGER,
          achievement_id TEXT,
          progress INTEGER DEFAULT 0,
          claimed INTEGER DEFAULT 0, -- 0 = not claimed, 1 = claimed
          completed_at INTEGER DEFAULT 0, -- 0 = not completed, timestamp if completed
          PRIMARY KEY(user_id, achievement_id),
          FOREIGN KEY(user_id) REFERENCES users(id),
          FOREIGN KEY(achievement_id) REFERENCES achievements(id)
        )
      `);

      // 8b. User Calculator Analytics table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_calculator_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          category TEXT,
          level INTEGER,
          question TEXT,
          template_type TEXT,
          game_mode TEXT,
          used_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 9. User Concept Analytics Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_concept_analytics (
          user_id INTEGER,
          concept TEXT,
          success_rate REAL DEFAULT 0,
          average_speed REAL DEFAULT 0,
          hesitation_index REAL DEFAULT 0,
          streak INTEGER DEFAULT 0,
          last_tested INTEGER DEFAULT 0,
          PRIMARY KEY(user_id, concept),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 10. Problem Pedagogical Feedback Table
      db.run(`
        CREATE TABLE IF NOT EXISTS problem_pedagogical_feedback (
          template_type TEXT PRIMARY KEY,
          total_attempts INTEGER DEFAULT 0,
          successes INTEGER DEFAULT 0,
          average_time_taken REAL DEFAULT 0,
          average_hesitation REAL DEFAULT 0,
          frustration_index REAL DEFAULT 0
        )
      `);

      // 11. Ingested Knowledge Templates Table
      db.run(`
        CREATE TABLE IF NOT EXISTS ingested_knowledge_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          level_range TEXT NOT NULL, -- e.g. "11-20" or "41-50"
          type TEXT NOT NULL,
          question_pattern TEXT NOT NULL,
          solve_params_json TEXT NOT NULL, -- JSON rules for parameter boundaries
          explanation_pattern TEXT NOT NULL,
          base_difficulty_elo INTEGER DEFAULT 1000,
          created_at INTEGER
        )
      `);

      // 12. Commitment History Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_commitment_history (
          user_id INTEGER,
          date TEXT, -- YYYY-MM-DD
          solved_count INTEGER DEFAULT 0,
          PRIMARY KEY(user_id, date),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 13. Commitment Relics Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_commitment_relics (
          user_id INTEGER,
          relic_id TEXT,
          unlocked_at INTEGER,
          PRIMARY KEY(user_id, relic_id),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 14. User Sessions Table (for security device/session tracking and invalidation)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          user_agent TEXT DEFAULT '',
          ip_address TEXT DEFAULT '',
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 15. Security Audit Logs Table
      db.run(`
        CREATE TABLE IF NOT EXISTS security_audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          user_id INTEGER,
          event_type TEXT NOT NULL,
          ip_address TEXT,
          details TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);
      // 16. Saved Exercises Table
      db.run(`
        CREATE TABLE IF NOT EXISTS saved_exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT,
          category TEXT NOT NULL,
          question TEXT NOT NULL,
          correct_answer TEXT NOT NULL,
          options TEXT NOT NULL, -- JSON array of strings
          explanation TEXT NOT NULL,
          created_at INTEGER,
          collection_id INTEGER REFERENCES saved_collections(id) ON DELETE SET NULL,
          FOREIGN KEY(user_id) REFERENCES users(id),
          UNIQUE(user_id, question)
        )
      `);

      // 19. Saved Notebook Collections Table
      db.run(`
        CREATE TABLE IF NOT EXISTS saved_collections (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name TEXT NOT NULL,
          is_public INTEGER DEFAULT 0,
          created_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id),
          UNIQUE(user_id, name)
        )
      `);

      // Alter saved_exercises to add collection_id if not exists
      db.all("PRAGMA table_info(saved_exercises)", (err, info) => {
        if (!err && info) {
          const hasCollectionId = info.some(col => col.name === 'collection_id');
          if (!hasCollectionId) {
            db.run("ALTER TABLE saved_exercises ADD COLUMN collection_id INTEGER REFERENCES saved_collections(id) ON DELETE SET NULL", () => {
              db.run("CREATE INDEX IF NOT EXISTS idx_saved_exercises_collection_id ON saved_exercises(collection_id)");
            });
          } else {
            db.run("CREATE INDEX IF NOT EXISTS idx_saved_exercises_collection_id ON saved_exercises(collection_id)");
          }
        }
      });


      // 17. User Notifications Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL, -- levelup, achievement, welcome, social, reward
          read_state INTEGER DEFAULT 0, -- 0 = unread, 1 = read
          created_at INTEGER,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // 18. User Email Verifications Table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_email_verifications (
          user_id INTEGER PRIMARY KEY,
          new_email TEXT NOT NULL,
          code TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )
      `);

      // ── NumeraRating System Tables ────────────────────────────────────────

      // 20. Per-player, per-domain skill rating (mu/sigma Bayesian model)
      db.run(`
        CREATE TABLE IF NOT EXISTS user_ratings (
          user_id        INTEGER NOT NULL,
          domain         TEXT    NOT NULL,
          mu             REAL    DEFAULT 1500,
          sigma          REAL    DEFAULT 350,
          display_rating INTEGER DEFAULT 0,
          sessions_count INTEGER DEFAULT 0,
          last_updated   INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, domain),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 21. Full session-by-session rating history for transparency + analytics
      db.run(`
        CREATE TABLE IF NOT EXISTS rating_history (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id             INTEGER NOT NULL,
          domain              TEXT    NOT NULL,
          mu_before           REAL,
          sigma_before        REAL,
          mu_after            REAL,
          sigma_after         REAL,
          display_before      INTEGER,
          display_after       INTEGER,
          delta               REAL,
          performance_score   REAL,
          expected_score      REAL,
          components_json     TEXT,
          explanation         TEXT,
          session_category    TEXT,
          session_level       INTEGER,
          game_mode           TEXT,
          created_at          INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 22. Smurf / anomaly detection signals
      db.run(`
        CREATE TABLE IF NOT EXISTS smurf_signals (
          user_id          INTEGER PRIMARY KEY,
          anomaly_score    REAL    DEFAULT 0,
          consecutive_high INTEGER DEFAULT 0,
          flagged          INTEGER DEFAULT 0,
          review_count     INTEGER DEFAULT 0,
          last_checked     INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 23. Per-domain learning velocity (EMA of rating delta per session)
      db.run(`
        CREATE TABLE IF NOT EXISTS learning_velocity (
          user_id    INTEGER NOT NULL,
          domain     TEXT    NOT NULL,
          velocity   REAL    DEFAULT 0,
          updated_at INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, domain),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 24. Anti-tilt session tracking
      db.run(`
        CREATE TABLE IF NOT EXISTS tilt_tracking (
          user_id      INTEGER PRIMARY KEY,
          loss_streak  INTEGER DEFAULT 0,
          tilt_score   REAL    DEFAULT 0,
          tilted       INTEGER DEFAULT 0,
          last_session INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // 25. Season definitions
      db.run(`
        CREATE TABLE IF NOT EXISTS seasons (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          name      TEXT    NOT NULL,
          start_at  INTEGER NOT NULL,
          end_at    INTEGER NOT NULL,
          is_active INTEGER DEFAULT 0
        )
      `);

      // 26. Season peak/final ratings per player per domain
      db.run(`
        CREATE TABLE IF NOT EXISTS season_ratings (
          user_id       INTEGER NOT NULL,
          season_id     INTEGER NOT NULL,
          domain        TEXT    NOT NULL,
          peak_display  INTEGER DEFAULT 0,
          final_display INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, season_id, domain),
          FOREIGN KEY (user_id)   REFERENCES users(id),
          FOREIGN KEY (season_id) REFERENCES seasons(id)
        )
      `);

      // Seed the first season if none exist
      db.get("SELECT COUNT(*) AS cnt FROM seasons", (errS, row) => {
        if (!errS && row && row.cnt === 0) {
          const now = Math.floor(Date.now() / 1000);
          const ninetyDays = 90 * 24 * 3600;
          db.run(
            "INSERT INTO seasons (name, start_at, end_at, is_active) VALUES (?, ?, ?, 1)",
            ['Season 1: The First Theorem', now, now + ninetyDays]
          );
        }
      });

      // Indexes for rating system
      db.run("CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_rating_history_user_id ON rating_history(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_rating_history_domain ON rating_history(domain)");
      db.run("CREATE INDEX IF NOT EXISTS idx_season_ratings_season ON season_ratings(season_id)");

      // ── End NumeraRating Tables ───────────────────────────────────────────

      // ── Mathematical Learning Intelligence Engine Tables ─────────────────

      // LIE-1. Per-user, per-concept learner profile (mastery, confidence, speed, etc.)
      db.run(`
        CREATE TABLE IF NOT EXISTS learner_profiles (
          user_id               INTEGER NOT NULL,
          concept_id            TEXT    NOT NULL,
          mastery_score         REAL    DEFAULT 0,
          confidence_score      REAL    DEFAULT 0.5,
          avg_response_ms       REAL    DEFAULT 0,
          retention_score       REAL    DEFAULT 1.0,
          accuracy_rate         REAL    DEFAULT 0,
          hint_usage_rate       REAL    DEFAULT 0,
          calculator_usage_rate REAL    DEFAULT 0,
          retry_rate            REAL    DEFAULT 0,
          exposure_count        INTEGER DEFAULT 0,
          correct_first_try     INTEGER DEFAULT 0,
          learning_velocity     REAL    DEFAULT 0,
          last_seen             INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, concept_id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // LIE-2. Misconception instances — named error patterns per user per concept
      db.run(`
        CREATE TABLE IF NOT EXISTS user_misconceptions (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id             INTEGER NOT NULL,
          concept_id          TEXT    NOT NULL,
          misconception_type  TEXT    NOT NULL,
          misconception_label TEXT    NOT NULL,
          frequency           INTEGER DEFAULT 1,
          last_occurred       INTEGER DEFAULT 0,
          severity            TEXT    DEFAULT 'low' CHECK(severity IN ('low','medium','high')),
          persistence         REAL    DEFAULT 0.1,
          resolved            INTEGER DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE (user_id, concept_id, misconception_type)
        )
      `);

      // LIE-3. Retention schedule — FSRS-style spaced repetition per concept
      db.run(`
        CREATE TABLE IF NOT EXISTS retention_schedule (
          user_id             INTEGER NOT NULL,
          concept_id          TEXT    NOT NULL,
          stability_days      REAL    DEFAULT 1,
          last_review_ts      INTEGER DEFAULT 0,
          next_review_ts      INTEGER DEFAULT 0,
          review_count        INTEGER DEFAULT 0,
          lapse_count         INTEGER DEFAULT 0,
          retention_at_review REAL    DEFAULT 1.0,
          PRIMARY KEY (user_id, concept_id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // LIE-4. Learning style signals — inferred explanation preferences
      db.run(`
        CREATE TABLE IF NOT EXISTS learning_style_signals (
          user_id      INTEGER NOT NULL,
          style_type   TEXT    NOT NULL,
          signal_weight REAL   DEFAULT 0,
          sample_count INTEGER DEFAULT 0,
          last_updated INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, style_type),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // LIE-5. Lesson analytics — system-level quality scores per template type
      db.run(`
        CREATE TABLE IF NOT EXISTS lesson_analytics (
          template_type  TEXT PRIMARY KEY,
          attempt_count  INTEGER DEFAULT 0,
          success_count  INTEGER DEFAULT 0,
          abandon_count  INTEGER DEFAULT 0,
          avg_time_ms    REAL    DEFAULT 0,
          hint_rate      REAL    DEFAULT 0,
          confusion_score REAL   DEFAULT 0,
          last_updated   INTEGER DEFAULT 0
        )
      `);

      // LIE-6. Competitive skill profiles — per-concept ELO ratings for matchmaking
      db.run(`
        CREATE TABLE IF NOT EXISTS competitive_profiles (
          user_id                  INTEGER NOT NULL,
          concept_id               TEXT    NOT NULL,
          skill_rating             INTEGER DEFAULT 1000,
          consistency_rating       INTEGER DEFAULT 1000,
          learning_velocity_rating INTEGER DEFAULT 1000,
          match_count              INTEGER DEFAULT 0,
          last_match_ts            INTEGER DEFAULT 0,
          PRIMARY KEY (user_id, concept_id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // ── End Intelligence Engine Tables ────────────────────────────────────

      // Create indexes to optimize foreign key lookups
      db.run("CREATE INDEX IF NOT EXISTS idx_user_mistakes_user_id ON user_mistakes(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_user_concept_analytics_user_id ON user_concept_analytics(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_commitment_history_user_id ON user_commitment_history(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_commitment_relics_user_id ON user_commitment_relics(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_audit_logs(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_saved_exercises_user_id ON saved_exercises(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_learner_profiles_user_id ON learner_profiles(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_user_misconceptions_user_id ON user_misconceptions(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_retention_schedule_user_id ON retention_schedule(user_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_retention_schedule_next_review ON retention_schedule(next_review_ts)");
      db.run("CREATE INDEX IF NOT EXISTS idx_competitive_profiles_user_id ON competitive_profiles(user_id)");



      // Seed Shop Items
      const shopItems = [
        // Avatars (Common)
        { id: 'avatar_pythagoras', name: 'Pythagoras Avatar', cost: 100, type: 'avatar', value: 'avatar_pythagoras', rarity: 'Common', description: 'The father of geometry himself. Every right triangle you will ever meet pays him tribute.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_sigma', name: 'Sigma Avatar', cost: 100, type: 'avatar', value: 'avatar_sigma', rarity: 'Common', description: 'Σ — the sum of everything you have practiced. A clean mark for serious counters.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },

        // Avatars (Rare)
        { id: 'avatar_hypatia', name: 'Hypatia Avatar', cost: 150, type: 'avatar', value: 'avatar_hypatia', rarity: 'Rare', description: 'Alexandria\'s star astronomer and the first great woman of mathematics. Carries a library\'s worth of wisdom.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_lovelace', name: 'Lovelace Avatar', cost: 150, type: 'avatar', value: 'avatar_lovelace', rarity: 'Rare', description: 'Ada Lovelace wrote the first program before computers existed. For those who see ahead of their time.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_owl', name: 'Owl Avatar', cost: 120, type: 'avatar', value: 'avatar_owl', rarity: 'Rare', description: 'Sees the pattern in the dark long before anyone else does. Patient, precise, unblinking.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_fox', name: 'Fox Avatar', cost: 120, type: 'avatar', value: 'avatar_fox', rarity: 'Rare', description: 'Takes the clever route to every answer. Never solves anything the long way twice.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_koala', name: 'Koala Avatar', cost: 150, type: 'avatar', value: 'avatar_koala', rarity: 'Rare', description: 'Unhurried and unbothered. Solves at its own pace — and still finishes the lesson.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_panda', name: 'Panda Avatar', cost: 180, type: 'avatar', value: 'avatar_panda', rarity: 'Rare', description: 'A gentle giant who crunches arithmetic like bamboo. Calm outside, calculating inside.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_fibonacci', name: 'Fibonacci Avatar', cost: 200, type: 'avatar', value: 'avatar_fibonacci', rarity: 'Rare', description: 'Brought modern numerals to Europe — and left a spiral hiding in every sunflower.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_archimedes', name: 'Archimedes Avatar', cost: 250, type: 'avatar', value: 'avatar_archimedes', rarity: 'Rare', description: 'Eureka! The original moment of discovery — he ran through the streets for mathematics.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },

        // Avatars (Epic)
        { id: 'avatar_newton', name: 'Newton Avatar', cost: 300, type: 'avatar', value: 'avatar_newton', rarity: 'Epic', description: 'Invented calculus during a plague year. Gravity was the side quest. For Gold-tier minds.', required_rank: 'Gold III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_euler', name: 'Euler Avatar', cost: 400, type: 'avatar', value: 'avatar_euler', rarity: 'Epic', description: 'Published more mathematics than anyone in history — even after losing his sight. Diamond rank earns his company.', required_rank: 'Diamond III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_gauss', name: 'Gauss Avatar', cost: 400, type: 'avatar', value: 'avatar_gauss', rarity: 'Epic', description: 'The Prince of Mathematicians. Summed 1 to 100 at age seven and never slowed down.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_noether', name: 'Emmy Noether Avatar', cost: 350, type: 'avatar', value: 'avatar_noether', rarity: 'Epic', description: 'Rewrote the laws of symmetry. Einstein called her a genius; algebra calls her its architect.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },

        // Avatars (Legendary / Mythic)
        { id: 'avatar_einstein', name: 'Einstein Avatar', cost: 1200, type: 'avatar', value: 'avatar_einstein', rarity: 'Legendary', description: 'The face of genius itself, trailed by cosmic sparks. Reserved for Masters of the craft.', required_rank: 'Master III', is_animated: 1, particle_effect: 'cosmic_sparkle', is_utility: 0 },
        { id: 'avatar_ramanujan', name: 'Ramanujan Avatar', cost: 1000, type: 'avatar', value: 'avatar_ramanujan', rarity: 'Legendary', description: 'Saw infinity in his dreams and wrote it down by morning. His formulas are still being proven a century later.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_turing', name: 'Turing Avatar', cost: 1200, type: 'avatar', value: 'avatar_turing', rarity: 'Legendary', description: 'Broke the unbreakable code and imagined the machine you are holding. The founder of computation.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'avatar_phoenix', name: 'Phoenix Avatar', cost: 1500, type: 'avatar', value: 'avatar_phoenix', rarity: 'Legendary', description: 'Born from every failed attempt that came before it. Burns brighter with each retry. Radiant animated aura.', required_rank: null, is_animated: 1, particle_effect: 'fire_sparkle', is_utility: 0 },
        { id: 'avatar_dragon', name: 'Dragon Avatar', cost: 3500, type: 'avatar', value: 'avatar_dragon', rarity: 'Mythic', description: 'The rarest creature in the realm of numbers. Its living glow marks a collector at the summit.', required_rank: null, is_animated: 1, particle_effect: 'dragon_fire', is_utility: 0 },
        
        // Banners
        { id: 'banner_default', name: 'Default Banner', cost: 50, type: 'banner', value: 'banner_default', rarity: 'Common', description: 'Clean grid paper — where every great proof begins.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_geometry', name: 'Geometry Banner', cost: 200, type: 'banner', value: 'banner_geometry', rarity: 'Rare', description: 'Compass-and-straightedge linework, drafted to perfection behind your name.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_fibonacci', name: 'Fibonacci Banner', cost: 200, type: 'banner', value: 'banner_fibonacci', rarity: 'Rare', description: 'The golden spiral, unwinding quietly behind your profile.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_calculus', name: 'Calculus Banner', cost: 500, type: 'banner', value: 'banner_calculus', rarity: 'Epic', description: 'Integrals and limits in elegant typeset — the language of change, worn as a backdrop.', required_rank: 'Gold III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_matrix', name: 'Matrix Banner', cost: 600, type: 'banner', value: 'banner_matrix', rarity: 'Epic', description: 'Green rain of linear transformations cascading behind your profile. Animated.', required_rank: 'Platinum III', is_animated: 1, particle_effect: 'matrix_rain', is_utility: 0 },
        { id: 'banner_cosmos', name: 'Cosmos Banner', cost: 1000, type: 'banner', value: 'banner_cosmos', rarity: 'Legendary', description: 'A star map plotted on geometric coordinates — the night sky, but with axes. Animated star drift.', required_rank: 'Master III', is_animated: 1, particle_effect: 'star_drift', is_utility: 0 },
        { id: 'banner_infinity', name: 'Infinity Banner', cost: 3000, type: 'banner', value: 'banner_infinity', rarity: 'Mythic', description: 'An endless loop folding through itself forever. The collector\'s horizon. Animated glow.', required_rank: null, is_animated: 1, particle_effect: 'infinity_glow', is_utility: 0 },
        { id: 'banner_fractal', name: 'Fractal Banner', cost: 300, type: 'banner', value: 'banner_fractal', rarity: 'Rare', description: 'Self-similar at every scale. Zoom in as far as you like — it is still there.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_relativity', name: 'Relativity Banner', cost: 350, type: 'banner', value: 'banner_relativity', rarity: 'Rare', description: 'Spacetime curving politely around your profile.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_topology', name: 'Topology Banner', cost: 400, type: 'banner', value: 'banner_topology', rarity: 'Rare', description: 'Möbius strips and manifold projections — one-sided elegance.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_logic', name: 'Logic Gates Banner', cost: 250, type: 'banner', value: 'banner_logic', rarity: 'Rare', description: 'Boolean circuits humming beneath the surface. Evaluates to true, always.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'banner_prime', name: 'Prime Numbers Banner', cost: 200, type: 'banner', value: 'banner_prime', rarity: 'Rare', description: 'The Ulam spiral — primes falling into diagonals nobody has fully explained.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },

        // Badges
        { id: 'badge_novice', name: 'Math Novice Badge', cost: 50, type: 'badge', value: 'Math Novice', rarity: 'Common', description: 'Where every journey starts. Wear it proudly — everyone legendary once held one.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_speed_demon', name: 'Speed Demon Badge', cost: 200, type: 'badge', value: 'Speed Demon', rarity: 'Rare', description: 'For solvers whose answers arrive before doubt does.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arithmetic_champ', name: 'Arithmetic Champion Badge', cost: 150, type: 'badge', value: 'Arithmetic Champion', rarity: 'Rare', description: 'Add, subtract, multiply — the fundamentals, mastered cold.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_problem_solver', name: 'Problem Solver Badge', cost: 500, type: 'badge', value: 'Problem Solver', rarity: 'Epic', description: 'One hundred problems down. The grind, certified.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_perfectionist', name: 'Perfectionist Badge', cost: 500, type: 'badge', value: 'Perfectionist', rarity: 'Epic', description: 'Flawless runs only. Zero mistakes, zero excuses.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_math_genius', name: 'Math Genius Badge', cost: 600, type: 'badge', value: 'Math Genius', rarity: 'Epic', description: 'A rating most players only ever see from below.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_streak_master', name: 'Streak Master Badge', cost: 1000, type: 'badge', value: 'Streak Master', rarity: 'Legendary', description: 'Proof of showing up. Day after day after day.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arena_king', name: 'Arena King Badge', cost: 1200, type: 'badge', value: 'Arena King', rarity: 'Legendary', description: 'The crown of the ranked arena, with sparkle to match. Animated.', required_rank: null, is_animated: 1, particle_effect: 'crown_sparkle', is_utility: 0 },
        { id: 'badge_math_legend', name: 'Math Legend Badge', cost: 4000, type: 'badge', value: 'Math Legend', rarity: 'Mythic', description: 'The single most prestigious mark in Numera. If you know, you know.', required_rank: null, is_animated: 1, particle_effect: 'gold_halos', is_utility: 0 },

        // Themes
        { id: 'theme_duolingo', name: 'Duolingo Theme', cost: 50, type: 'theme', value: 'duolingo', rarity: 'Common', description: 'The classic. Bright, friendly, and impossible to dislike.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_neon_eclipse', name: 'Neon Eclipse Theme', cost: 150, type: 'theme', value: 'neon_eclipse', rarity: 'Rare', description: 'Warm amber light with teal undertones — golden hour, all day.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_emerald_abyss', name: 'Emerald Abyss Theme', cost: 200, type: 'theme', value: 'emerald_abyss', rarity: 'Rare', description: 'Deep-sea greens with bioluminescent accents. Calm pressure.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_sunset', name: 'Sunset Horizon Theme', cost: 250, type: 'theme', value: 'sunset', rarity: 'Rare', description: 'Coral pink fading into amber — the last good light of the day.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_ocean', name: 'Deep Ocean Theme', cost: 300, type: 'theme', value: 'ocean', rarity: 'Rare', description: 'Calm navy depths and clear-water blues. Built for deep focus.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_crimson_nebula', name: 'Crimson Nebula Theme', cost: 500, type: 'theme', value: 'crimson_nebula', rarity: 'Epic', description: 'A star nursery in reds. Intense, for intense sessions.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_aurora', name: 'Aurora Borealis Theme', cost: 500, type: 'theme', value: 'aurora', rarity: 'Epic', description: 'Northern lights over a quiet teal sky. Rare conditions, captured.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'theme_cyberpunk', name: 'Cyberpunk Theme', cost: 600, type: 'theme', value: 'cyberpunk', rarity: 'Epic', description: 'Electric magenta on chrome. The future, slightly overclocked. Animated glitch accents.', required_rank: null, is_animated: 1, particle_effect: 'cyber_glitch', is_utility: 0 },
        { id: 'theme_midnight', name: 'Midnight Galaxy Theme', cost: 1000, type: 'theme', value: 'midnight', rarity: 'Legendary', description: 'Obsidian dark with starlight gold. The legendary night shift. Animated star drift.', required_rank: null, is_animated: 1, particle_effect: 'star_drift', is_utility: 0 },

        // Utilities
        { id: 'item_streak_shield', name: 'Streak Shield', cost: 300, type: 'utility', value: 'streak_shield', rarity: 'Epic', description: 'Auto-deploys if you miss a day, freezing your streak instead of breaking it. One day, one shield, zero regrets.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 1 },
        { id: 'item_retry_token', name: 'Retry Token', cost: 150, type: 'utility', value: 'retry_token', rarity: 'Rare', description: 'Rewind a failed level and walk back in like nothing happened. No penalty, no judgment.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 1 },
        { id: 'item_xp_booster', name: 'XP Booster (2x)', cost: 200, type: 'utility', value: 'xp_booster', rarity: 'Rare', description: 'Doubles all XP for your next 3 sessions. Turn a good day into a great one.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 1 },
        { id: 'item_challenge_ticket', name: 'Arena Gold Ticket', cost: 100, type: 'utility', value: 'challenge_ticket', rarity: 'Rare', description: 'Doubles the Elo stakes of your next Ranked Duel — for days when you feel sharp.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 1 }
      ];

      // Insert/ignore badges that are unlocked dynamically by achievements, ranks, etc.
      const rawBadges = [
        { id: 'badge_solver_1', name: 'Math Solver I Badge', cost: 0, type: 'badge', value: 'Math Solver I', rarity: 'Common', description: 'Solve 10 problems', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_solver_2', name: 'Math Solver II Badge', cost: 0, type: 'badge', value: 'Math Solver II', rarity: 'Rare', description: 'Solve 30 problems', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_solver_3', name: 'Math Solver III Badge', cost: 0, type: 'badge', value: 'Math Solver III', rarity: 'Epic', description: 'Solve 100 problems', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_solver_4', name: 'Math Solver IV Badge', cost: 0, type: 'badge', value: 'Math Solver IV', rarity: 'Legendary', description: 'Solve 250 problems', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_streak_1', name: 'Daily Habit I Badge', cost: 0, type: 'badge', value: 'Daily Habit I', rarity: 'Common', description: 'Maintain a 3-day daily streak', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_streak_2', name: 'Daily Habit II Badge', cost: 0, type: 'badge', value: 'Daily Habit II', rarity: 'Rare', description: 'Maintain a 7-day daily streak', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_streak_3', name: 'Daily Habit III Badge', cost: 0, type: 'badge', value: 'Daily Habit III', rarity: 'Epic', description: 'Maintain a 14-day daily streak', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_streak_4', name: 'Daily Habit IV Badge', cost: 0, type: 'badge', value: 'Daily Habit IV', rarity: 'Legendary', description: 'Maintain a 30-day daily streak', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arena_1', name: 'Gladiator I Badge', cost: 0, type: 'badge', value: 'Gladiator I', rarity: 'Common', description: 'Win 5 arena duels', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arena_2', name: 'Gladiator II Badge', cost: 0, type: 'badge', value: 'Gladiator II', rarity: 'Rare', description: 'Win 15 arena duels', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arena_3', name: 'Gladiator III Badge', cost: 0, type: 'badge', value: 'Gladiator III', rarity: 'Epic', description: 'Win 50 arena duels', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_arena_4', name: 'Gladiator IV Badge', cost: 0, type: 'badge', value: 'Gladiator IV', rarity: 'Legendary', description: 'Win 100 arena duels', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_shop_1', name: 'Collector I Badge', cost: 0, type: 'badge', value: 'Collector I', rarity: 'Common', description: 'Purchase 3 items from shop', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_shop_2', name: 'Collector II Badge', cost: 0, type: 'badge', value: 'Collector II', rarity: 'Rare', description: 'Purchase 7 items from shop', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_shop_3', name: 'Collector III Badge', cost: 0, type: 'badge', value: 'Collector III', rarity: 'Epic', description: 'Purchase 15 items from shop', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_shop_4', name: 'Collector IV Badge', cost: 0, type: 'badge', value: 'Collector IV', rarity: 'Legendary', description: 'Purchase 30 items from shop', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },

        // Competitive Rank Badges
        { id: 'badge_rank_silver', name: 'Silver Solver Badge', cost: 0, type: 'badge', value: 'Silver Solver', rarity: 'Rare', description: 'Reach Silver tier in competitive mode.', required_rank: 'Silver III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_rank_gold', name: 'Gold Gladiator Badge', cost: 0, type: 'badge', value: 'Gold Gladiator', rarity: 'Epic', description: 'Reach Gold tier in competitive mode.', required_rank: 'Gold III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_rank_platinum', name: 'Platinum Prodigy Badge', cost: 0, type: 'badge', value: 'Platinum Prodigy', rarity: 'Epic', description: 'Reach Platinum tier in competitive mode.', required_rank: 'Platinum III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_rank_diamond', name: 'Diamond Master Badge', cost: 0, type: 'badge', value: 'Diamond Master', rarity: 'Legendary', description: 'Reach Diamond tier in competitive mode.', required_rank: 'Diamond III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_rank_master', name: 'Master of Math Badge', cost: 0, type: 'badge', value: 'Master of Math', rarity: 'Legendary', description: 'Reach Master tier in competitive mode.', required_rank: 'Master III', is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'badge_rank_grandmaster', name: 'Transcendental Badge', cost: 0, type: 'badge', value: 'Transcendental', rarity: 'Mythic', description: 'Reach Grandmaster tier in competitive mode.', required_rank: 'Grandmaster III', is_animated: 1, particle_effect: 'cosmic_sparkle', is_utility: 0 },

        // Commitment Sigils and Relics
        { id: 'relic_spark', name: 'Spark Sigil', cost: 0, type: 'badge', value: 'Spark Sigil', rarity: 'Common', description: 'Unlocked by keeping your promise for 3 consecutive days.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'relic_rhythm', name: 'Rhythm Emblem', cost: 0, type: 'badge', value: 'Rhythm Emblem', rarity: 'Rare', description: 'Unlocked by keeping your promise for 7 consecutive days.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'relic_dedication', name: 'Dedication Relic', cost: 0, type: 'badge', value: 'Dedication Relic', rarity: 'Epic', description: 'Unlocked by keeping your promise for 30 consecutive days.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'relic_sage', name: 'Sage Sigil', cost: 0, type: 'badge', value: 'Sage Sigil', rarity: 'Legendary', description: 'Unlocked by keeping your promise for 100 consecutive days.', required_rank: null, is_animated: 1, particle_effect: 'gold_halos', is_utility: 0 },
        { id: 'relic_comeback', name: 'Resilience Medal', cost: 0, type: 'badge', value: 'Resilience Medal', rarity: 'Epic', description: 'Unlocked by successfully recovering your climb through a Recommit Challenge.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 },
        { id: 'relic_burnout_shield', name: 'Calm Balance Emblem', cost: 0, type: 'badge', value: 'Calm Balance Emblem', rarity: 'Epic', description: 'Unlocked by balancing your session intensity and preventing burnout.', required_rank: null, is_animated: 0, particle_effect: null, is_utility: 0 }
      ];

      const allInitialItems = [...shopItems, ...rawBadges];

      const stmtShop = db.prepare(`INSERT OR IGNORE INTO shop_items (id, name, cost, type, value, rarity, description, required_rank, is_animated, particle_effect, is_utility) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      allInitialItems.forEach(item => {
        stmtShop.run(item.id, item.name, item.cost, item.type, item.value, item.rarity, item.description, item.required_rank, item.is_animated, item.particle_effect, item.is_utility);
      });
      stmtShop.finalize();

      // Seed Achievements (Clear old first to support tiered schema)
      db.run("DELETE FROM achievements");

      const achievementsList = [
        // 1. Persistence Chain
        { id: 'streak_1', name: 'First Commitment', description: 'Maintain a 1-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 1, reward_coins: 10, category: 'Persistence', chain_id: 'consistency_path', chain_order: 1, is_hidden: 0 },
        { id: 'streak_2', name: '3-Day Commitment', description: 'Maintain a 3-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 3, reward_coins: 50, category: 'Persistence', chain_id: 'consistency_path', chain_order: 2, is_hidden: 0 },
        { id: 'streak_3', name: '7-Day Commitment', description: 'Maintain a 7-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 7, reward_coins: 150, category: 'Persistence', chain_id: 'consistency_path', chain_order: 3, is_hidden: 0 },
        { id: 'streak_4', name: '14-Day Commitment', description: 'Maintain a 14-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 14, reward_coins: 300, category: 'Persistence', chain_id: 'consistency_path', chain_order: 4, is_hidden: 0 },
        { id: 'streak_5', name: '30-Day Commitment', description: 'Maintain a 30-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 30, reward_coins: 600, category: 'Persistence', chain_id: 'consistency_path', chain_order: 5, is_hidden: 0 },
        { id: 'streak_6', name: '100-Day Commitment', description: 'Maintain a 100-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 100, reward_coins: 1500, category: 'Persistence', chain_id: 'consistency_path', chain_order: 6, is_hidden: 0 },
        { id: 'streak_7', name: 'Year of Consistency', description: 'Maintain a 365-day daily streak', icon: 'local_fire_department', target_type: 'streak', target_value: 365, reward_coins: 5000, category: 'Persistence', chain_id: 'consistency_path', chain_order: 7, is_hidden: 0 },

        // 2. Learning Chain
        { id: 'learn_1', name: 'First Lesson', description: 'Solve 1 math problem successfully', icon: 'school', target_type: 'solved_count', target_value: 1, reward_coins: 10, category: 'Learning', chain_id: 'learning_path', chain_order: 1, is_hidden: 0 },
        { id: 'learn_2', name: '10 Lessons', description: 'Solve 10 math problems successfully', icon: 'school', target_type: 'solved_count', target_value: 10, reward_coins: 50, category: 'Learning', chain_id: 'learning_path', chain_order: 2, is_hidden: 0 },
        { id: 'learn_3', name: '100 Lessons', description: 'Solve 100 math problems successfully', icon: 'school', target_type: 'solved_count', target_value: 100, reward_coins: 250, category: 'Learning', chain_id: 'learning_path', chain_order: 3, is_hidden: 0 },
        { id: 'learn_4', name: '500 Lessons', description: 'Solve 500 math problems successfully', icon: 'school', target_type: 'solved_count', target_value: 500, reward_coins: 1000, category: 'Learning', chain_id: 'learning_path', chain_order: 4, is_hidden: 0 },
        { id: 'learn_5', name: '1000 Lessons', description: 'Solve 1000 math problems successfully', icon: 'school', target_type: 'solved_count', target_value: 1000, reward_coins: 2500, category: 'Learning', chain_id: 'learning_path', chain_order: 5, is_hidden: 0 },

        // 3. Accuracy Chain
        { id: 'accuracy_1', name: 'First Perfect Exercise', description: 'Solve a problem with 0 retries', icon: 'check_circle', target_type: 'perfect_exercises_count', target_value: 1, reward_coins: 15, category: 'Accuracy', chain_id: 'perfect_exercise_path', chain_order: 1, is_hidden: 0 },
        { id: 'accuracy_2', name: 'First Perfect Level', description: 'Complete a level with 0 errors', icon: 'check_circle', target_type: 'perfect_levels_count', target_value: 1, reward_coins: 50, category: 'Accuracy', chain_id: 'perfect_level_path', chain_order: 1, is_hidden: 0 },
        { id: 'accuracy_3', name: '10 Perfect Levels', description: 'Complete 10 levels with 0 errors', icon: 'check_circle', target_type: 'perfect_levels_count', target_value: 10, reward_coins: 300, category: 'Accuracy', chain_id: 'perfect_level_path', chain_order: 2, is_hidden: 0 },
        { id: 'accuracy_4', name: '100 Perfect Levels', description: 'Complete 100 levels with 0 errors', icon: 'check_circle', target_type: 'perfect_levels_count', target_value: 100, reward_coins: 2000, category: 'Accuracy', chain_id: 'perfect_level_path', chain_order: 3, is_hidden: 0 },

        // 4. Mastery Chains
        { id: 'mastery_arithmetic_1', name: 'Arithmetic Apprentice', description: 'Solve 5 Arithmetic problems', icon: 'school', target_type: 'mastery_arithmetic', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_arithmetic', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_arithmetic_2', name: 'Arithmetic Adept', description: 'Solve 20 Arithmetic problems', icon: 'school', target_type: 'mastery_arithmetic', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_arithmetic', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_arithmetic_3', name: 'Arithmetic Expert', description: 'Solve 50 Arithmetic problems', icon: 'school', target_type: 'mastery_arithmetic', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_arithmetic', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_arithmetic_4', name: 'Arithmetic Master', description: 'Solve 150 Arithmetic problems', icon: 'school', target_type: 'mastery_arithmetic', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_arithmetic', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_algebra_1', name: 'Equations Apprentice', description: 'Solve 5 Algebra problems', icon: 'school', target_type: 'mastery_algebra', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_algebra', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_algebra_2', name: 'Equations Adept', description: 'Solve 20 Algebra problems', icon: 'school', target_type: 'mastery_algebra', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_algebra', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_algebra_3', name: 'Equations Expert', description: 'Solve 50 Algebra problems', icon: 'school', target_type: 'mastery_algebra', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_algebra', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_algebra_4', name: 'Equations Master', description: 'Solve 150 Algebra problems', icon: 'school', target_type: 'mastery_algebra', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_algebra', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_calculus_1', name: 'Calculus Apprentice', description: 'Solve 5 Calculus problems', icon: 'school', target_type: 'mastery_calculus', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_calculus', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_calculus_2', name: 'Calculus Adept', description: 'Solve 20 Calculus problems', icon: 'school', target_type: 'mastery_calculus', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_calculus', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_calculus_3', name: 'Calculus Expert', description: 'Solve 50 Calculus problems', icon: 'school', target_type: 'mastery_calculus', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_calculus', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_calculus_4', name: 'Calculus Master', description: 'Solve 150 Calculus problems', icon: 'school', target_type: 'mastery_calculus', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_calculus', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_combinatorics_1', name: 'Combinatorics Apprentice', description: 'Solve 5 Combinatorics problems', icon: 'school', target_type: 'mastery_combinatorics', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_combinatorics', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_combinatorics_2', name: 'Combinatorics Adept', description: 'Solve 20 Combinatorics problems', icon: 'school', target_type: 'mastery_combinatorics', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_combinatorics', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_combinatorics_3', name: 'Combinatorics Expert', description: 'Solve 50 Combinatorics problems', icon: 'school', target_type: 'mastery_combinatorics', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_combinatorics', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_combinatorics_4', name: 'Combinatorics Master', description: 'Solve 150 Combinatorics problems', icon: 'school', target_type: 'mastery_combinatorics', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_combinatorics', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_number_theory_1', name: 'Number Theory Apprentice', description: 'Solve 5 Number Theory problems', icon: 'school', target_type: 'mastery_number_theory', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_number_theory', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_number_theory_2', name: 'Number Theory Adept', description: 'Solve 20 Number Theory problems', icon: 'school', target_type: 'mastery_number_theory', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_number_theory', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_number_theory_3', name: 'Number Theory Expert', description: 'Solve 50 Number Theory problems', icon: 'school', target_type: 'mastery_number_theory', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_number_theory', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_number_theory_4', name: 'Number Theory Master', description: 'Solve 150 Number Theory problems', icon: 'school', target_type: 'mastery_number_theory', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_number_theory', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_mental_1', name: 'Mental Apprentice', description: 'Solve 5 Mental Math problems', icon: 'school', target_type: 'mastery_mental', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_mental', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_mental_2', name: 'Mental Adept', description: 'Solve 20 Mental Math problems', icon: 'school', target_type: 'mastery_mental', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_mental', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_mental_3', name: 'Mental Expert', description: 'Solve 50 Mental Math problems', icon: 'school', target_type: 'mastery_mental', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_mental', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_mental_4', name: 'Mental Master', description: 'Solve 150 Mental Math problems', icon: 'school', target_type: 'mastery_mental', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_mental', chain_order: 4, is_hidden: 0 },

        // Curriculum-strand mastery chains (audit #1.1 strands; counted via the
        // strand columns added to user_mastery in migration v27).
        { id: 'mastery_geometry_1', name: 'Geometry Apprentice', description: 'Solve 5 Geometry problems', icon: 'school', target_type: 'mastery_geometry', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_geometry', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_geometry_2', name: 'Geometry Adept', description: 'Solve 20 Geometry problems', icon: 'school', target_type: 'mastery_geometry', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_geometry', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_geometry_3', name: 'Geometry Expert', description: 'Solve 50 Geometry problems', icon: 'school', target_type: 'mastery_geometry', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_geometry', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_geometry_4', name: 'Geometry Master', description: 'Solve 150 Geometry problems', icon: 'school', target_type: 'mastery_geometry', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_geometry', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_integers_1', name: 'Integers Apprentice', description: 'Solve 5 Integers problems', icon: 'school', target_type: 'mastery_integers', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_integers', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_integers_2', name: 'Integers Adept', description: 'Solve 20 Integers problems', icon: 'school', target_type: 'mastery_integers', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_integers', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_integers_3', name: 'Integers Expert', description: 'Solve 50 Integers problems', icon: 'school', target_type: 'mastery_integers', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_integers', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_integers_4', name: 'Integers Master', description: 'Solve 150 Integers problems', icon: 'school', target_type: 'mastery_integers', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_integers', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_decimals_1', name: 'Decimals Apprentice', description: 'Solve 5 Decimals problems', icon: 'school', target_type: 'mastery_decimals', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_decimals', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_decimals_2', name: 'Decimals Adept', description: 'Solve 20 Decimals problems', icon: 'school', target_type: 'mastery_decimals', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_decimals', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_decimals_3', name: 'Decimals Expert', description: 'Solve 50 Decimals problems', icon: 'school', target_type: 'mastery_decimals', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_decimals', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_decimals_4', name: 'Decimals Master', description: 'Solve 150 Decimals problems', icon: 'school', target_type: 'mastery_decimals', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_decimals', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_fractions_1', name: 'Fractions Apprentice', description: 'Solve 5 Fractions problems', icon: 'school', target_type: 'mastery_fractions', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_fractions', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_fractions_2', name: 'Fractions Adept', description: 'Solve 20 Fractions problems', icon: 'school', target_type: 'mastery_fractions', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_fractions', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_fractions_3', name: 'Fractions Expert', description: 'Solve 50 Fractions problems', icon: 'school', target_type: 'mastery_fractions', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_fractions', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_fractions_4', name: 'Fractions Master', description: 'Solve 150 Fractions problems', icon: 'school', target_type: 'mastery_fractions', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_fractions', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_number_sense_1', name: 'Number Sense Apprentice', description: 'Solve 5 Number Sense problems', icon: 'school', target_type: 'mastery_number_sense', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_number_sense', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_number_sense_2', name: 'Number Sense Adept', description: 'Solve 20 Number Sense problems', icon: 'school', target_type: 'mastery_number_sense', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_number_sense', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_number_sense_3', name: 'Number Sense Expert', description: 'Solve 50 Number Sense problems', icon: 'school', target_type: 'mastery_number_sense', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_number_sense', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_number_sense_4', name: 'Number Sense Master', description: 'Solve 150 Number Sense problems', icon: 'school', target_type: 'mastery_number_sense', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_number_sense', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_statistics_1', name: 'Statistics Apprentice', description: 'Solve 5 Statistics problems', icon: 'school', target_type: 'mastery_statistics', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_statistics', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_statistics_2', name: 'Statistics Adept', description: 'Solve 20 Statistics problems', icon: 'school', target_type: 'mastery_statistics', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_statistics', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_statistics_3', name: 'Statistics Expert', description: 'Solve 50 Statistics problems', icon: 'school', target_type: 'mastery_statistics', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_statistics', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_statistics_4', name: 'Statistics Master', description: 'Solve 150 Statistics problems', icon: 'school', target_type: 'mastery_statistics', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_statistics', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_expressions_1', name: 'Expressions Apprentice', description: 'Solve 5 Algebraic Expressions problems', icon: 'school', target_type: 'mastery_expressions', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_expressions', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_expressions_2', name: 'Expressions Adept', description: 'Solve 20 Algebraic Expressions problems', icon: 'school', target_type: 'mastery_expressions', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_expressions', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_expressions_3', name: 'Expressions Expert', description: 'Solve 50 Algebraic Expressions problems', icon: 'school', target_type: 'mastery_expressions', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_expressions', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_expressions_4', name: 'Expressions Master', description: 'Solve 150 Algebraic Expressions problems', icon: 'school', target_type: 'mastery_expressions', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_expressions', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_powers_1', name: 'Powers Apprentice', description: 'Solve 5 Exponents & Roots problems', icon: 'school', target_type: 'mastery_powers', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_powers', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_powers_2', name: 'Powers Adept', description: 'Solve 20 Exponents & Roots problems', icon: 'school', target_type: 'mastery_powers', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_powers', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_powers_3', name: 'Powers Expert', description: 'Solve 50 Exponents & Roots problems', icon: 'school', target_type: 'mastery_powers', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_powers', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_powers_4', name: 'Powers Master', description: 'Solve 150 Exponents & Roots problems', icon: 'school', target_type: 'mastery_powers', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_powers', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_graphing_1', name: 'Graphing Apprentice', description: 'Solve 5 Linear Graphing problems', icon: 'school', target_type: 'mastery_graphing', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_graphing', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_graphing_2', name: 'Graphing Adept', description: 'Solve 20 Linear Graphing problems', icon: 'school', target_type: 'mastery_graphing', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_graphing', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_graphing_3', name: 'Graphing Expert', description: 'Solve 50 Linear Graphing problems', icon: 'school', target_type: 'mastery_graphing', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_graphing', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_graphing_4', name: 'Graphing Master', description: 'Solve 150 Linear Graphing problems', icon: 'school', target_type: 'mastery_graphing', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_graphing', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_inequalities_1', name: 'Inequality Apprentice', description: 'Solve 5 Inequalities problems', icon: 'school', target_type: 'mastery_inequalities', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_inequalities', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_inequalities_2', name: 'Inequality Adept', description: 'Solve 20 Inequalities problems', icon: 'school', target_type: 'mastery_inequalities', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_inequalities', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_inequalities_3', name: 'Inequality Expert', description: 'Solve 50 Inequalities problems', icon: 'school', target_type: 'mastery_inequalities', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_inequalities', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_inequalities_4', name: 'Inequality Master', description: 'Solve 150 Inequalities problems', icon: 'school', target_type: 'mastery_inequalities', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_inequalities', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_functions_1', name: 'Function Apprentice', description: 'Solve 5 Functions problems', icon: 'school', target_type: 'mastery_functions', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_functions', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_functions_2', name: 'Function Adept', description: 'Solve 20 Functions problems', icon: 'school', target_type: 'mastery_functions', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_functions', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_functions_3', name: 'Function Expert', description: 'Solve 50 Functions problems', icon: 'school', target_type: 'mastery_functions', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_functions', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_functions_4', name: 'Function Master', description: 'Solve 150 Functions problems', icon: 'school', target_type: 'mastery_functions', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_functions', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_sequences_1', name: 'Sequence Apprentice', description: 'Solve 5 Sequences problems', icon: 'school', target_type: 'mastery_sequences', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_sequences', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_sequences_2', name: 'Sequence Adept', description: 'Solve 20 Sequences problems', icon: 'school', target_type: 'mastery_sequences', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_sequences', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_sequences_3', name: 'Sequence Expert', description: 'Solve 50 Sequences problems', icon: 'school', target_type: 'mastery_sequences', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_sequences', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_sequences_4', name: 'Sequence Master', description: 'Solve 150 Sequences problems', icon: 'school', target_type: 'mastery_sequences', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_sequences', chain_order: 4, is_hidden: 0 },

        { id: 'mastery_equations_1', name: 'Equation Apprentice', description: 'Solve 5 Equations problems', icon: 'school', target_type: 'mastery_equations', target_value: 5, reward_coins: 50, category: 'Mastery', chain_id: 'mastery_equations', chain_order: 1, is_hidden: 0 },
        { id: 'mastery_equations_2', name: 'Equation Adept', description: 'Solve 20 Equations problems', icon: 'school', target_type: 'mastery_equations', target_value: 20, reward_coins: 150, category: 'Mastery', chain_id: 'mastery_equations', chain_order: 2, is_hidden: 0 },
        { id: 'mastery_equations_3', name: 'Equation Expert', description: 'Solve 50 Equations problems', icon: 'school', target_type: 'mastery_equations', target_value: 50, reward_coins: 350, category: 'Mastery', chain_id: 'mastery_equations', chain_order: 3, is_hidden: 0 },
        { id: 'mastery_equations_4', name: 'Equation Master', description: 'Solve 150 Equations problems', icon: 'school', target_type: 'mastery_equations', target_value: 150, reward_coins: 800, category: 'Mastery', chain_id: 'mastery_equations', chain_order: 4, is_hidden: 0 },

        // 5. Social Chain
        { id: 'social_1', name: 'Friendly Greeting', description: 'Add your first friend', icon: 'group', target_type: 'friends_count', target_value: 1, reward_coins: 30, category: 'Social', chain_id: 'social_path', chain_order: 1, is_hidden: 0 },
        { id: 'social_2', name: 'Circle of Thinkers', description: 'Add 5 friends to your friends list', icon: 'group', target_type: 'friends_count', target_value: 5, reward_coins: 100, category: 'Social', chain_id: 'social_path', chain_order: 2, is_hidden: 0 },
        { id: 'social_3', name: 'Math Club', description: 'Add 15 friends to your friends list', icon: 'group', target_type: 'friends_count', target_value: 15, reward_coins: 300, category: 'Social', chain_id: 'social_path', chain_order: 3, is_hidden: 0 },

        // 6. Competitive Chain
        { id: 'arena_1', name: 'Gladiator I', description: 'Win 1 Arena Duel', icon: 'sports_mma', target_type: 'arena_wins', target_value: 1, reward_coins: 50, category: 'Competitive', chain_id: 'gladiator_path', chain_order: 1, is_hidden: 0 },
        { id: 'arena_2', name: 'Gladiator II', description: 'Win 5 Arena Duels', icon: 'sports_mma', target_type: 'arena_wins', target_value: 5, reward_coins: 150, category: 'Competitive', chain_id: 'gladiator_path', chain_order: 2, is_hidden: 0 },
        { id: 'arena_3', name: 'Gladiator III', description: 'Win 15 Arena Duels', icon: 'sports_mma', target_type: 'arena_wins', target_value: 15, reward_coins: 300, category: 'Competitive', chain_id: 'gladiator_path', chain_order: 3, is_hidden: 0 },
        { id: 'arena_4', name: 'Gladiator IV', description: 'Win 40 Arena Duels', icon: 'sports_mma', target_type: 'arena_wins', target_value: 40, reward_coins: 600, category: 'Competitive', chain_id: 'gladiator_path', chain_order: 4, is_hidden: 0 },
        { id: 'arena_5', name: 'Arena Champion', description: 'Win 100 Arena Duels', icon: 'sports_mma', target_type: 'arena_wins', target_value: 100, reward_coins: 1500, category: 'Competitive', chain_id: 'gladiator_path', chain_order: 5, is_hidden: 0 },

        // 7. Exploration Chain
        { id: 'explore_1', name: 'Daily Puzzler', description: 'Solve your first Daily Puzzle', icon: 'explore', target_type: 'daily_puzzles_solved', target_value: 1, reward_coins: 30, category: 'Exploration', chain_id: 'exploration_path', chain_order: 1, is_hidden: 0 },
        { id: 'explore_2', name: 'Puzzle Scholar', description: 'Solve 10 Daily Puzzles', icon: 'explore', target_type: 'daily_puzzles_solved', target_value: 10, reward_coins: 150, category: 'Exploration', chain_id: 'exploration_path', chain_order: 2, is_hidden: 0 },
        { id: 'explore_3', name: 'Infinite Archivist', description: 'Solve 20 unique exercises in the Archive', icon: 'explore', target_type: 'archive_solved', target_value: 20, reward_coins: 300, category: 'Exploration', chain_id: 'exploration_path', chain_order: 3, is_hidden: 0 },

        // 8. Collection Chain
        { id: 'shop_1', name: 'Collector I', description: 'Acquire 2 items from the shop', icon: 'shopping_bag', target_type: 'shop_count', target_value: 2, reward_coins: 50, category: 'Collection', chain_id: 'collection_path', chain_order: 1, is_hidden: 0 },
        { id: 'shop_2', name: 'Collector II', description: 'Acquire 5 items from the shop', icon: 'shopping_bag', target_type: 'shop_count', target_value: 5, reward_coins: 150, category: 'Collection', chain_id: 'collection_path', chain_order: 2, is_hidden: 0 },
        { id: 'shop_3', name: 'Collector III', description: 'Acquire 10 items from the shop', icon: 'shopping_bag', target_type: 'shop_count', target_value: 10, reward_coins: 300, category: 'Collection', chain_id: 'collection_path', chain_order: 3, is_hidden: 0 },
        { id: 'shop_4', name: 'Collector IV', description: 'Acquire 20 items from the shop', icon: 'shopping_bag', target_type: 'shop_count', target_value: 20, reward_coins: 600, category: 'Collection', chain_id: 'collection_path', chain_order: 4, is_hidden: 0 },

        // 9. Seasonal Chain
        { id: 'seasonal_1', name: 'Spring Blossom', description: 'Complete 3 exercises in Spring mode', icon: 'celebration', target_type: 'seasonal_spring', target_value: 3, reward_coins: 50, category: 'Seasonal', chain_id: 'seasonal_path', chain_order: 1, is_hidden: 0 },
        { id: 'seasonal_2', name: 'Summer Spark', description: 'Complete 10 exercises in Summer mode', icon: 'celebration', target_type: 'seasonal_summer', target_value: 10, reward_coins: 150, category: 'Seasonal', chain_id: 'seasonal_path', chain_order: 2, is_hidden: 0 },

        // 10. Hidden Achievements
        { id: 'hidden_ultimate', name: 'The Ultimate Answer', description: 'Evaluate the magic number 67 in the calculator', icon: 'help', target_type: 'calculator_sixseven', target_value: 1, reward_coins: 670, category: 'Exploration', chain_id: 'hidden_path', chain_order: 1, is_hidden: 1 },
        { id: 'hidden_speed', name: 'Speed Demon', description: 'Solve a level of difficulty 30+ in under 10 seconds', icon: 'bolt', target_type: 'speed_demon', target_value: 1, reward_coins: 200, category: 'Accuracy', chain_id: 'hidden_path', chain_order: 2, is_hidden: 1 }
      ];

      const stmtAchievements = db.prepare(`INSERT OR IGNORE INTO achievements (id, name, description, icon, target_type, target_value, reward_coins, category, chain_id, chain_order, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      achievementsList.forEach(ach => {
        stmtAchievements.run(ach.id, ach.name, ach.description, ach.icon, ach.target_type, ach.target_value, ach.reward_coins, ach.category, ach.chain_id, ach.chain_order, ach.is_hidden);
      });
      stmtAchievements.finalize();

      // Seed Archive Exercises (Clear old first to support clean updates and avoid duplication)
      db.run("DELETE FROM archive_exercises");

      const archiveExercises = [
        {
          title: "Euclid's Proof of Infinitude of Primes",
          story: "Around $300$ BC, Euclid proved that there are infinitely many prime numbers using a brilliant proof by contradiction. He assumed a finite set of primes, multiplied them, and added $1$.",
          question: "If the only primes in existence were $2$, $3$, and $5$, what prime or compound number is generated by Euclid's construction: $$p = (2 \\times 3 \\times 5) + 1$$?",
          correct_answer: "31",
          options: JSON.stringify(["17", "29", "31", "33"]),
          explanation: "Euclid's formula multiplies the finite set of primes and adds $1$. Here, $$(2 \\times 3 \\times 5) + 1 = 30 + 1 = 31$$ Since $31$ is prime and not in our starting set, it proves the set was incomplete.",
          difficulty: "Sage",
          category: "Number Theory",
          stars: 3,
          source: "MathOverflow Thread #1034"
        },
        {
          title: "Fermat's Last Theorem for n=4",
          story: "Pierre de Fermat wrote in the margin of his Arithmetica that he had a marvelous proof that $$x^n + y^n = z^n$$ has no non-zero integer solutions for $n > 2$. The only case Fermat actually wrote a proof for was $n=4$.",
          question: "Which of the following describes Fermat's method of proof for the case $n=4$?",
          correct_answer: "Infinite descent",
          options: JSON.stringify(["Mathematical induction", "Infinite descent", "Proof by construction", "Modular forms"]),
          explanation: "Fermat developed the method of infinite descent (a form of induction in reverse) to show that if a solution existed, a strictly smaller positive integer solution would also exist, which is impossible.",
          difficulty: "Master",
          category: "Number Theory",
          stars: 5,
          source: "Mathematics Stack Exchange #4812"
        },
        {
          title: "Euler's Totient of 100",
          story: "Leonhard Euler introduced the totient function $\\phi(n)$, which counts the positive integers up to $n$ that are relatively prime to $n$ (i.e. share no common factors other than $1$).",
          question: "What is the value of Euler's totient function $\\phi(100)$?",
          correct_answer: "40",
          options: JSON.stringify(["30", "40", "50", "60"]),
          explanation: "$$\\phi(100) = 100 \\times \\left(1 - \\frac{1}{2}\\right) \\times \\left(1 - \\frac{1}{5}\\right) = 100 \\times \\frac{1}{2} \\times \\frac{4}{5} = 40$$ There are $40$ numbers less than $100$ that share no common factors with $100$.",
          difficulty: "Scholar",
          category: "Number Theory",
          stars: 2,
          source: "Bibmath Arithmetic Archives"
        },
        {
          title: "GCD and Bezout Coefficients",
          story: "Bezout's Identity states that for non-zero integers $a$ and $b$, there exist integers $x$ and $y$ such that $$ax + by = \\gcd(a, b)$$ These coefficients are found using the Extended Euclidean Algorithm.",
          question: "For $a = 12$ and $b = 15$, which integers $(x, y)$ satisfy the Bezout identity: $$12x + 15y = \\gcd(12, 15)$$?",
          correct_answer: "(-1, 1)",
          options: JSON.stringify(["$(2, -1)$", "$(-1, 1)$", "$(-2, 2)$", "$(3, -2)$"]),
          explanation: "$$\\gcd(12, 15) = 3$$ Checking the options: $$12(-1) + 15(1) = -12 + 15 = 3$$ Thus, $x = -1, y = 1$ is a valid solution.",
          difficulty: "Novice",
          category: "Number Theory",
          stars: 1,
          source: "Mathematics Stack Exchange #3201"
        },
        {
          title: "Goldbach's Weak Conjecture",
          story: "Goldbach's weak conjecture asserts that every odd number greater than $5$ can be expressed as the sum of three prime numbers. It was finally fully proven by Harald Helfgott in $2013$.",
          question: "Which of the following prime triples sums to the odd number $21$, demonstrating Goldbach's weak conjecture?",
          correct_answer: "3, 7, 11",
          options: JSON.stringify(["$2, 5, 14$", "$3, 5, 13$", "$3, 7, 11$", "$5, 7, 11$"]),
          explanation: "$21$ can be written as $$3 + 7 + 11 = 21$$ All three are prime numbers.",
          difficulty: "Master",
          category: "Number Theory",
          stars: 5,
          source: "MathOverflow Thread #4401"
        },
        {
          title: "Wilson's Theorem for p=7",
          story: "Wilson's theorem states that a natural number $p > 1$ is a prime number if and only if the product of all positive integers less than $p$ is one less than a multiple of $p$. That is, $$(p-1)! \\equiv -1 \\pmod{p}$$",
          question: "For the prime $p = 7$, what is the value of $(7-1)! \\pmod{7}$?",
          correct_answer: "6",
          options: JSON.stringify(["1", "3", "5", "6"]),
          explanation: "$$(7-1)! = 6! = 720$$ $$720 \\equiv 6 \\equiv -1 \\pmod{7}$$ This matches Wilson's theorem.",
          difficulty: "Scholar",
          category: "Number Theory",
          stars: 2,
          source: "Bibmath Arithmetic Archives"
        },
        {
          title: "Chinese Remainder Theorem System",
          story: "The Chinese Remainder Theorem (CRT) states that if one knows the remainders of the Euclidean division of an integer $n$ by several pairwise coprime integers, then one can determine uniquely the remainder of the division of $n$ by the product of these integers.",
          question: "Find the smallest positive integer $x$ such that: $$x \\equiv 2 \\pmod{3}$$ and $$x \\equiv 3 \\pmod{5}$$",
          correct_answer: "8",
          options: JSON.stringify(["8", "11", "13", "23"]),
          explanation: "We search for $x$: $x \\in \\{2, 5, 8, 11, \\dots\\}$. Checking modulo $5$: $$8 \\equiv 3 \\pmod{5}$$ Thus, $x = 8$ is the smallest positive solution.",
          difficulty: "Sage",
          category: "Number Theory",
          stars: 3,
          source: "Mathematics Stack Exchange #7890"
        },
        {
          title: "Mersenne Primes M_7",
          story: "A Mersenne prime is a prime number of the form $$M_n = 2^n - 1$$ If $2^n - 1$ is prime, then $n$ itself must be prime.",
          question: "For the prime exponent $n = 7$, what is the value of the Mersenne number $M_7$, and is it prime?",
          correct_answer: "127 (Prime)",
          options: JSON.stringify(["$63$ (Composite)", "$127$ (Prime)", "$255$ (Composite)", "$511$ (Prime)"]),
          explanation: "$$M_7 = 2^7 - 1 = 128 - 1 = 127$$ $127$ is indeed a prime number, making it the 4th Mersenne prime.",
          difficulty: "Master",
          category: "Number Theory",
          stars: 4,
          source: "MathOverflow Thread #1123"
        },
        {
          title: "Catalan Numbers and Dyck Paths",
          story: "The Catalan numbers form a sequence of natural numbers that occur in various counting problems. The $n$-th Catalan number $C_n$ counts the number of Dyck paths of length $2n$, or binary trees with $n$ internal nodes.",
          question: "The formula for Catalan numbers is: $$C_n = \\frac{1}{n+1} \\binom{2n}{n}$$ What is the 4th Catalan number $C_4$?",
          correct_answer: "14",
          options: JSON.stringify(["5", "14", "42", "132"]),
          explanation: "$$C_4 = \\frac{1}{5} \\binom{8}{4} = \\frac{1}{5} \\times 70 = 14$$ The sequence starts: $C_0=1, C_1=1, C_2=2, C_3=5, C_4=14$.",
          difficulty: "Sage",
          category: "Combinatorics",
          stars: 4,
          source: "Bibmath Combinatorics"
        },
        {
          title: "Stars and Bars Distribution",
          story: "In combinatorics, stars and bars is a graphical method to derive theorems for distributing indistinguishable objects into distinguishable bins.",
          question: "How many ways can we distribute $7$ identical coins among $3$ children such that each child gets at least $1$ coin?",
          correct_answer: "15",
          options: JSON.stringify(["10", "15", "21", "36"]),
          explanation: "Give $1$ coin to each child first, leaving $4$ coins. The formula to distribute $k$ indistinguishable items in $n$ bins is: $$\\binom{k + n - 1}{n - 1}$$ Here, $$\\binom{4 + 3 - 1}{3 - 1} = \\binom{6}{2} = 15$$",
          difficulty: "Sage",
          category: "Combinatorics",
          stars: 3,
          source: "Mathematics Stack Exchange #1029"
        },
        {
          title: "Derangements of Four Items",
          story: "A derangement is a permutation of the elements of a set, such that no element appears in its original position. The number of derangements of $n$ elements is denoted subfactorial $!n$.",
          question: "Four people leave their coats in a checkroom. If they receive coats back completely at random, what is the number of possible outcomes where NO ONE gets their own coat?",
          correct_answer: "9",
          options: JSON.stringify(["6", "9", "12", "24"]),
          explanation: "The subfactorial: $$!4 = 4! \\times \\left(\\frac{1}{2!} - \\frac{1}{3!} + \\frac{1}{4!}\\right) = 24 \\times \\left(\\frac{1}{2} - \\frac{1}{6} + \\frac{1}{24}\\right) = 9$$",
          difficulty: "Sage",
          category: "Combinatorics",
          stars: 3,
          source: "Bibmath Combinatorics"
        },
        {
          title: "Pigeonhole Principle Selection",
          story: "The pigeonhole principle states that if $n$ items are put into $m$ containers, with $n > m$, then at least one container must contain more than one item.",
          question: "A drawer contains $10$ black socks and $10$ blue socks. What is the minimum number of socks you must pull out in the dark to guarantee you have at least one matching pair?",
          correct_answer: "3",
          options: JSON.stringify(["2", "3", "11", "20"]),
          explanation: "There are $2$ categories (colors): black and blue. By the pigeonhole principle, if you select $3$ socks (items) of $2$ possible colors (containers), at least $2$ socks must share the same color.",
          difficulty: "Novice",
          category: "Combinatorics",
          stars: 2,
          source: "Mathematics Stack Exchange #5920"
        },
        {
          title: "The Handshaking Lemma",
          story: "The Handshaking Lemma states that in every finite undirected graph, the sum of degrees of all vertices is exactly twice the number of edges. Consequently, there is an even number of vertices of odd degree.",
          question: "If a network has $6$ computers, and each computer is connected to exactly $3$ other computers, how many total network cables (edges) exist?",
          correct_answer: "9",
          options: JSON.stringify(["6", "9", "12", "18"]),
          explanation: "Sum of degrees: $$6 \\text{ vertices} \\times \\text{degree } 3 = 18$$ By the Handshaking Lemma, sum of degrees = $2 \\times \\text{edges}$. Therefore: $$18 = 2E \\implies E = 9$$",
          difficulty: "Apprentice",
          category: "Combinatorics",
          stars: 1,
          source: "Mathematics Stack Exchange #12"
        },
        {
          title: "Ramsey Number R(3,3)",
          story: "Ramsey's Theorem states that in any coloring of the edges of a sufficiently large complete graph, monochromatic cliques must exist. $R(s, t)$ is the minimum vertices required.",
          question: "What is the value of the Ramsey number $R(3,3)$ - the minimum number of guests at a party to guarantee that either three know each other, or three are mutual strangers?",
          correct_answer: "6",
          options: JSON.stringify(["5", "6", "8", "9"]),
          explanation: "$R(3,3) = 6$. A complete graph on $5$ vertices can be colored without monochromatic triangles (a pentagon and a star), but on $6$ vertices it is mathematically impossible.",
          difficulty: "Master",
          category: "Combinatorics",
          stars: 5,
          source: "MathOverflow Thread #8821"
        },
        {
          title: "Inclusion-Exclusion Principle",
          story: "The principle of inclusion-exclusion is a counting technique which computes the size of the union of multiple sets by adding and subtracting cardinalities of intersections.",
          question: "In a class of $30$ students, $15$ play soccer, $12$ play basketball, and $5$ play both. How many students play NEITHER sport?",
          correct_answer: "8",
          options: JSON.stringify(["5", "8", "13", "18"]),
          explanation: "By inclusion-exclusion: $$\\text{Soccer} \\cup \\text{Basketball} = |S| + |B| - |S \\cap B| = 15 + 12 - 5 = 22$$ Students playing neither: $$30 - 22 = 8$$",
          difficulty: "Novice",
          category: "Combinatorics",
          stars: 2,
          source: "Bibmath Combinatorics"
        },
        {
          title: "Binomial Expansion Coefficient",
          story: "The Binomial Theorem describes the algebraic expansion of powers of a binomial. The coefficients of terms are binomial coefficients $\\binom{n}{k}$.",
          question: "What is the coefficient of the $x^2$ term in the expansion of $(x + 3)^4$?",
          correct_answer: "54",
          options: JSON.stringify(["6", "24", "54", "108"]),
          explanation: "The term is given by: $$\\binom{4}{2} \\cdot x^2 \\cdot 3^2 = 6 \\cdot x^2 \\cdot 9 = 54x^2$$ The coefficient is $54$.",
          difficulty: "Apprentice",
          category: "Combinatorics",
          stars: 1,
          source: "Mathematics Stack Exchange #2045"
        },
        {
          title: "The Basel Problem Summation",
          story: "First posed in $1644$, the Basel Problem asked for the exact sum of the reciprocals of the squares of the natural numbers. Euler shocked the math world by finding the sum in $1734$.",
          question: "What is the exact sum of the infinite series: $$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{1}{1^2} + \\frac{1}{2^2} + \\frac{1}{3^2} + \\dots$$?",
          correct_answer: "pi^2 / 6",
          options: JSON.stringify(["$\\frac{\\pi}{4}$", "$\\frac{\\pi^2}{8}$", "$\\frac{\\pi^2}{6}$", "$2$"]),
          explanation: "Euler showed that the sum converges to: $$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$ using the Taylor expansion of $\\frac{\\sin(x)}{x}$.",
          difficulty: "Master",
          category: "Calculus",
          stars: 5,
          source: "MathOverflow Thread #2938"
        },
        {
          title: "The Gaussian Integral",
          story: "The Gaussian integral, also known as the Euler-Poisson integral, is the integral of the Gaussian function $e^{-x^2}$ over the entire real line. It is central to probability theory.",
          question: "What is the value of the definite integral: $$\\int_{-\\infty}^{+\\infty} e^{-x^2} \\, dx$$?",
          correct_answer: "sqrt(pi)",
          options: JSON.stringify(["$\\pi$", "$\\sqrt{\\pi}$", "$\\frac{1}{2}\\sqrt{\\pi}$", "$1$"]),
          explanation: "This is solved by converting to polar coordinates: $$\\left(\\int_{-\\infty}^{+\\infty} e^{-x^2}\\,dx\\right)^2 = \\int_0^{2\\pi}\\int_0^{\\infty} r e^{-r^2} \\, dr \\, d\\theta = \\pi \\implies \\text{Integral} = \\sqrt{\\pi}$$",
          difficulty: "Master",
          category: "Calculus",
          stars: 4,
          source: "Bibmath Analysis"
        },
        {
          title: "Stirling's Approximation Factorial",
          story: "Stirling's approximation is a mathematical formula that provides a high-quality approximation for factorials of large numbers. It shows the asymptotic behavior of $n!$.",
          question: "Stirling's formula states that for large $n$, $n!$ is asymptotic to which function?",
          correct_answer: "sqrt(2 * pi * n) * (n/e)^n",
          options: JSON.stringify(["$n^n$", "$e^n\\sqrt{n}$", "$\\sqrt{2\\pi n}\\left(\\frac{n}{e}\\right)^n$", "$\\left(\\frac{n}{e}\\right)^n$"]),
          explanation: "The asymptotic formula is: $$n! \\sim \\sqrt{2\\pi n} \\left(\\frac{n}{e}\\right)^n$$",
          difficulty: "Master",
          category: "Calculus",
          stars: 4,
          source: "Bibmath Analysis"
        },
        {
          title: "Taylor Series for ln(2)",
          story: "The natural logarithm can be represented by the Taylor series of $\\ln(1+x)$ centered at $x=0$. Evaluating this series at $x=1$ yields an alternating sum for $\\ln(2)$.",
          question: "Which of the following infinite series represents the value of $\\ln(2)$?",
          correct_answer: "1 - 1/2 + 1/3 - 1/4 + ...",
          options: JSON.stringify(["$1 + 1/2 + 1/4 + 1/8 + \\dots$", "$1 - 1/2 + 1/3 - 1/4 + \\dots$", "$1 - 1/3 + 1/5 - 1/7 + \\dots$", "$1/2 + 1/6 + 1/12 + \\dots$"]),
          explanation: "$$\\ln(1+x) = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\frac{x^4}{4} + \\dots$$ Substituting $x = 1$ gives the alternating harmonic series: $$\\ln(2) = 1 - \\frac{1}{2} + \\frac{1}{3} - \\frac{1}{4} + \\dots$$",
          difficulty: "Sage",
          category: "Calculus",
          stars: 3,
          source: "Mathematics Stack Exchange #3021"
        },
        {
          title: "Dirichlet Integral of sin(x)/x",
          story: "The Dirichlet integral is the improper integral of the sinc function $\\frac{\\sin(x)}{x}$ over the positive real line. It cannot be integrated using standard elementary antiderivatives.",
          question: "What is the value of the integral: $$\\int_0^{\\infty} \\frac{\\sin(x)}{x} \\, dx$$?",
          correct_answer: "pi / 2",
          options: JSON.stringify(["$\\frac{\\pi}{4}$", "$\\frac{\\pi}{2}$", "$\\pi$", "$\\infty$"]),
          explanation: "Using Laplace transforms or contour integration, the integral is shown to equal $\\frac{\\pi}{2}$. This is known as the Dirichlet integral.",
          difficulty: "Master",
          category: "Calculus",
          stars: 5,
          source: "MathOverflow Thread #9983"
        },
        {
          title: "Derivative of Exponential Functions",
          story: "Finding the derivative of composite exponential functions requires the chain rule and the derivative of the exponential function $e^u$.",
          question: "What is the first derivative of the function $f(x) = e^{x^2}$ with respect to $x$?",
          correct_answer: "2x * e^(x^2)",
          options: JSON.stringify(["$e^{x^2}$", "$2x e^{x^2}$", "$x^2 e^{x^2 - 1}$", "$2 e^{x^2}$"]),
          explanation: "By the chain rule, $$\\frac{d}{dx}(e^u) = e^u \\frac{du}{dx}$$ For $u = x^2$, $\\frac{du}{dx} = 2x$. Thus, the derivative is $2x e^{x^2}$.",
          difficulty: "Apprentice",
          category: "Calculus",
          stars: 1,
          source: "Bibmath Analysis"
        },
        {
          title: "Maclaurin Series for sin(x)",
          story: "A Maclaurin series is a Taylor series expansion of a function about $0$. The expansion of $\\sin(x)$ uses its alternating derivatives at $0$.",
          question: "What is the general term for the Maclaurin series of $\\sin(x)$?",
          correct_answer: "(-1)^n * x^(2n+1) / (2n+1)!",
          options: JSON.stringify(["$\frac{x^n}{n!}$", "$(-1)^n \\frac{x^{2n}}{(2n)!}$", "$(-1)^n \\frac{x^{2n+1}}{(2n+1)!}$", "$\\frac{x^{2n+1}}{(2n+1)!}$"]),
          explanation: "The derivatives of $\\sin(x)$ at $x=0$ alternate: $0, 1, 0, -1, \\dots$, leaving only odd powers: $$\\sin(x) = \\sum_{n=0}^{\\infty} (-1)^n \\frac{x^{2n+1}}{(2n+1)!}$$",
          difficulty: "Scholar",
          category: "Calculus",
          stars: 2,
          source: "Mathematics Stack Exchange #4010"
        },
        {
          title: "Divergence of the Harmonic Series",
          story: "The harmonic series is the infinite sum of the reciprocals of the positive integers. Although the terms shrink to $0$, the sum itself does not converge.",
          question: "Nicole Oresme proved the divergence of the harmonic series in the 14th century. What is the limit of the sum: $$1 + \\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} + \\dots$$?",
          correct_answer: "Infinity",
          options: JSON.stringify(["2", "pi^2 / 6", "Euler-Mascheroni constant", "Infinity"]),
          explanation: "Oresme grouped terms: $$\\frac{1}{3}+\\frac{1}{4} > \\frac{1}{2}$$, $$\\frac{1}{5}+\\frac{1}{6}+\\frac{1}{7}+\\frac{1}{8} > \\frac{1}{2}$$, etc. Since we can add infinitely many blocks of size greater than $\\frac{1}{2}$, the sum diverges to $\\infty$.",
          difficulty: "Scholar",
          category: "Calculus",
          stars: 2,
          source: "Mathematics Stack Exchange #5567"
        },
        {
          title: "Eigenvalues of a 2x2 Matrix",
          story: "Eigenvalues are scalars $\\lambda$ associated with a linear system of equations, satisfying $Av = \\lambda v$. They are roots of the characteristic polynomial $\\det(A - \\lambda I) = 0$.",
          question: "Find the eigenvalues of the matrix: $$A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$$",
          correct_answer: "1 and 3",
          options: JSON.stringify(["$0$ and $4$", "$1$ and $3$", "$2$ and $2$", "$-1$ and $5$"]),
          explanation: "$$\\det(A - \\lambda I) = (2-\\lambda)^2 - 1 = \\lambda^2 - 4\\lambda + 3 = 0$$ Factoring gives $(\\lambda-1)(\\lambda-3) = 0$, so eigenvalues are $1$ and $3$.",
          difficulty: "Sage",
          category: "Algebra",
          stars: 3,
          source: "Mathematics Stack Exchange #884"
        },
        {
          title: "Determinant of a 3x3 Matrix",
          story: "The determinant of a $3 \\times 3$ matrix can be calculated using the rule of Sarrus or expansion by cofactors along a row or column.",
          question: "What is the determinant of the matrix: $$A = \\begin{pmatrix} 1 & 0 & 3 \\\\ 2 & 1 & 2 \\\\ 1 & 0 & 2 \\end{pmatrix}$$?",
          correct_answer: "-1",
          options: JSON.stringify(["-1", "0", "1", "5"]),
          explanation: "Expand along the second column: $$\\det(A) = 1 \\cdot \\det\\begin{pmatrix} 1 & 3 \\\\ 1 & 2 \\end{pmatrix} = 1 \\cdot (2 - 3) = -1$$",
          difficulty: "Scholar",
          category: "Algebra",
          stars: 2,
          source: "Bibmath Algebra"
        },
        {
          title: "Fibonacci Calculation via Matrices",
          story: "The Fibonacci sequence can be generated by powers of a $2 \\times 2$ transition matrix. The eigenvalues of this matrix correspond to the Golden Ratio.",
          question: "If $$M = \\begin{pmatrix} 1 & 1 \\\\ 1 & 0 \\end{pmatrix}$$ then $$M^2 = \\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix}$$. What is the top-left element of the matrix $M^4$?",
          correct_answer: "5",
          options: JSON.stringify(["3", "5", "8", "13"]),
          explanation: "$$M^4 = M^2 \\cdot M^2 = \\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix} \\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix} = \\begin{pmatrix} 5 & 3 \\\\ 3 & 2 \\end{pmatrix}$$ The top-left element is $5$.",
          difficulty: "Master",
          category: "Algebra",
          stars: 4,
          source: "Mathematics Stack Exchange #7781"
        },
        {
          title: "Cayley-Hamilton Theorem Application",
          story: "The Cayley-Hamilton theorem states that every square matrix satisfies its own characteristic equation.",
          question: "For a matrix $A$ with characteristic polynomial $$p(\\lambda) = \\lambda^2 - 5\\lambda + 6$$ which matrix equation is guaranteed to be true?",
          correct_answer: "A^2 - 5A + 6I = 0",
          options: JSON.stringify(["$A^2 - 5A + 6 = 0$", "$A^2 - 5A + 6I = 0$", "$A^2 + 5A + 6I = 0$", "$A - 5I = 0$"]),
          explanation: "Cayley-Hamilton replaces the scalar $\\lambda$ with the matrix $A$, and the constant term with a multiple of the identity matrix $I$. Thus, $$A^2 - 5A + 6I = 0$$",
          difficulty: "Master",
          category: "Algebra",
          stars: 4,
          source: "MathOverflow Thread #5021"
        },
        {
          title: "Vector Dot and Cross Products",
          story: "For vectors in $\\mathbb{R}^3$, the dot product yields a scalar and measures alignment, while the cross product yields a vector perpendicular to both.",
          question: "What is the dot product of vectors $\\mathbf{u} = [1, 2, -1]$ and $\\mathbf{v} = [3, -1, 2]$?",
          correct_answer: "-1",
          options: JSON.stringify(["-1", "0", "1", "3"]),
          explanation: "$$\\mathbf{u} \\cdot \\mathbf{v} = (1 \\times 3) + (2 \\times -1) + (-1 \\times 2) = 3 - 2 - 2 = -1$$",
          difficulty: "Novice",
          category: "Algebra",
          stars: 1,
          source: "Mathematics Stack Exchange #991"
        },
        {
          title: "The Rank-Nullity Theorem",
          story: "The rank-nullity theorem is a fundamental theorem in linear algebra, relating the dimensions of a linear map's kernel and image.",
          question: "If a linear transformation $T$ maps $\\mathbb{R}^5$ to $\\mathbb{R}^3$, and the dimension of the kernel of $T$ is $2$, what is the rank (dimension of the image) of $T$?",
          correct_answer: "3",
          options: JSON.stringify(["1", "2", "3", "5"]),
          explanation: "Rank-Nullity states: $$\\dim(\\text{Domain}) = \\text{rank}(T) + \\text{nullity}(T)$$ Here, $5 = \\text{rank}(T) + 2 \\implies \\text{rank}(T) = 3$.",
          difficulty: "Sage",
          category: "Algebra",
          stars: 3,
          source: "Bibmath Algebra"
        },
        {
          title: "Orthogonal Diagonalization",
          story: "A real matrix is orthogonally diagonalizable if and only if it is symmetric. This is the Spectral Theorem for symmetric matrices.",
          question: "Which of the following matrices is orthogonally diagonalizable?",
          correct_answer: "[[1, 2], [2, 3]]",
          options: JSON.stringify(["$$\\begin{pmatrix} 1 & 2 \\\\ 0 & 3 \\end{pmatrix}$$", "$$\\begin{pmatrix} 1 & 2 \\\\ 2 & 3 \\end{pmatrix}$$", "$$\\begin{pmatrix} 1 & 2 \\\\ -2 & 1 \\end{pmatrix}$$", "$$\\begin{pmatrix} 1 & 1 \\\\ 0 & 0 \\end{pmatrix}$$"]),
          explanation: "By the spectral theorem, a real matrix is orthogonally diagonalizable if and only if it is symmetric ($A = A^T$). Only $$\\begin{pmatrix} 1 & 2 \\\\ 2 & 3 \\end{pmatrix}$$ is symmetric.",
          difficulty: "Master",
          category: "Algebra",
          stars: 4,
          source: "Mathematics Stack Exchange #4321"
        },
        {
          title: "Trace of a Matrix Product",
          story: "The trace of a square matrix is the sum of its diagonal elements. A key algebraic property of the trace is its cyclic commutativity.",
          question: "If $\\text{Tr}(AB) = 8$, what is the value of $\\text{Tr}(BA)$ for square matrices $A$ and $B$?",
          correct_answer: "8",
          options: JSON.stringify(["-8", "0", "8", "Undefined without dimensions"]),
          explanation: "The trace is cyclic: $\\text{Tr}(AB) = \\text{Tr}(BA)$ for any matrices $A$ and $B$ where the products are square. Thus, $\\text{Tr}(BA)$ is also $8$.",
          difficulty: "Scholar",
          category: "Algebra",
          stars: 2,
          source: "Mathematics Stack Exchange #1021"
        },
        {
          title: "Prisoner's Dilemma Nash Equilibrium",
          story: "In game theory, the Prisoner's Dilemma illustrates why two rational individuals might not cooperate, even if it appears in their best interest.",
          question: "In the standard Prisoner's Dilemma game where players choose to Cooperate or Defect, what is the unique Nash Equilibrium?",
          correct_answer: "Both Defect",
          options: JSON.stringify(["Both Cooperate", "Both Defect", "One Cooperates, One Defects", "No pure strategy equilibrium"]),
          explanation: "Defecting is a dominant strategy for both players. No matter what the other player does, each player gets a better payoff by defecting, leading to the Nash equilibrium (Defect, Defect).",
          difficulty: "Novice",
          category: "Mental",
          stars: 2,
          source: "Mathematics Stack Exchange #190"
        },
        {
          title: "Bayes Theorem False Positive Rate",
          story: "Bayes' theorem calculates the probability of an event based on prior knowledge of conditions that might be related to the event.",
          question: "A disease affects $1\\%$ of a population. A test is $90\\%$ accurate (true positive) and has a $10\\%$ false positive rate. If someone tests positive, what is the approximate probability that they actually have the disease?",
          correct_answer: "8.3%",
          options: JSON.stringify(["1.0%", "8.3%", "50.0%", "90.0%"]),
          explanation: "$$P(D \\mid +) = \\frac{P(+ \\mid D)P(D)}{P(+ \\mid D)P(D) + P(+ \\mid \\text{no } D)P(\\text{no } D)} = \\frac{0.90 \\times 0.01}{(0.90 \\times 0.01) + (0.10 \\times 0.99)} \\approx 8.3\\%$$",
          difficulty: "Sage",
          category: "Mental",
          stars: 3,
          source: "Mathematics Stack Exchange #889"
        },
        {
          title: "The Monty Hall Dilemma",
          story: "A game show features $3$ doors. Behind one is a car; behind the others, goats. You choose Door $1$. The host opens Door $3$, revealing a goat. Should you switch to Door $2$?",
          question: "What is your mathematical probability of winning the car if you switch?",
          correct_answer: "2/3",
          options: JSON.stringify(["$1/3$", "$1/2$", "$2/3$", "$3/4$"]),
          explanation: "Initially, your door has a $1/3$ chance. The remaining doors have a $2/3$ chance. Once the host eliminates a goat door from the remaining set, that entire $2/3$ chance transfers to the other unopened door.",
          difficulty: "Sage",
          category: "Mental",
          stars: 3,
          source: "Mathematics Stack Exchange #5544"
        },
        {
          title: "Expected Value of a Standard Die",
          story: "The expected value of a random variable is the long-run average value of repetitions of the experiment.",
          question: "What is the expected value of a single roll of a fair six-sided die?",
          correct_answer: "3.5",
          options: JSON.stringify(["3.0", "3.5", "4.0", "4.5"]),
          explanation: "$$\\text{Expected Value} = \\frac{1+2+3+4+5+6}{6} = 3.5$$",
          difficulty: "Novice",
          category: "Mental",
          stars: 1,
          source: "Bibmath Probability"
        },
        {
          title: "Buffon's Needle Problem",
          story: "In $1777$, Georges-Louis Leclerc, Comte de Buffon, posed a question: drop a needle of length $l$ on a floor with parallel strips of width $d$. What is the probability that the needle crosses a line?",
          question: "If the needle length $l$ equals the strip width $d$, what is the probability of the needle crossing a line?",
          correct_answer: "2 / pi",
          options: JSON.stringify(["$1/2$", "$1/\\pi$", "$2/\\pi$", "$\\pi/4$"]),
          explanation: "For $l = d$, the probability is $$\\frac{2}{\\pi}$$. This is one of the earliest examples of geometric probability.",
          difficulty: "Master",
          category: "Mental",
          stars: 5,
          source: "MathOverflow Thread #7789"
        },
        {
          title: "Gambler's Ruin Probability",
          story: "In the Gambler's Ruin problem, a gambler starts with coins and plays a fair game, winning or losing $1$ coin per round. The game ends when they reach a target amount or go broke.",
          question: "A gambler starts with $10$ coins. They play a fair game ($50\\%$ win/loss) until they either have $30$ coins or go broke. What is the probability that they go broke?",
          correct_answer: "2/3",
          options: JSON.stringify(["$1/3$", "$1/2$", "$2/3$", "$3/4$"]),
          explanation: "For a fair game, the probability of reaching the target $T$ starting from $S$ is $\\frac{S}{T}$. Here $S=10, T=30$. Probability of success is $10/30 = 1/3$. Probability of ruin is $$1 - 1/3 = 2/3$$.",
          difficulty: "Master",
          category: "Mental",
          stars: 4,
          source: "Mathematics Stack Exchange #9901"
        },
        {
          title: "The Birthday Paradox",
          story: "The birthday paradox describes the counter-intuitive probability that in a group of people, some pair will share a birthday.",
          question: "What is the minimum number of people required in a room to make the probability of at least two sharing a birthday exceed $50\\%$?",
          correct_answer: "23",
          options: JSON.stringify(["23", "50", "183", "366"]),
          explanation: "With $23$ people, the number of pairs is $$\\binom{23}{2} = 253$$. The probability of no matches is $$\\prod_{i=0}^{22} \\frac{365-i}{365} \\approx 49.3\\%$$. Thus, the chance of a match is $50.7\\%$.",
          difficulty: "Sage",
          category: "Mental",
          stars: 3,
          source: "Mathematics Stack Exchange #1122"
        },
        {
          title: "Markov Chain Steady State",
          story: "A Markov chain is a stochastic model describing a sequence of possible events in which the probability of each event depends only on the state attained in the previous event.",
          question: "A Markov chain has transition matrix: $$P = \\begin{pmatrix} 0.8 & 0.2 \\\\ 0.3 & 0.7 \\end{pmatrix}$$ What is the steady state probability of being in State 1?",
          correct_answer: "0.6",
          options: JSON.stringify(["0.4", "0.5", "0.6", "0.8"]),
          explanation: "Steady state equations: $$x = 0.8x + 0.3y$$ and $$x + y = 1$$. Simplifying: $$0.2x = 0.3y \\implies 2x = 3(1 - x) \\implies 5x = 3 \\implies x = 0.6$$",
          difficulty: "Master",
          category: "Mental",
          stars: 4,
          source: "Bibmath Probability"
        },
        {
          title: "Gauss's Summation",
          story: "In the late $1700$s, an $8$-year-old Carl Friedrich Gauss astounded his school teacher by summing all integers from $1$ to $100$ in seconds. He paired the numbers ($1+100$, $2+99$, $\\dots$) to find a constant sum.",
          question: "Using Gauss's method of pairing numbers, what is the sum of all integers from $1$ to $100$?",
          correct_answer: "5050",
          options: JSON.stringify(["4950", "5000", "5050", "5100"]),
          explanation: "Gauss realized that $$1 + 100 = 101$$, $$2 + 99 = 101$$, etc. Since there are $50$ pairs of $101$, the sum is $$50 \\times 101 = 5050$$. The general formula is $$\\frac{n(n + 1)}{2}$$.",
          difficulty: "Apprentice",
          category: "Arithmetic",
          stars: 1,
          source: "Mathematics Stack Exchange #990"
        },
        {
          title: "Diophantus's Epitaph",
          story: "Diophantus, the father of algebra, had a riddle carved on his tombstone: 'His boyhood lasted 1/6 of his life; his beard grew after 1/12 more; after 1/7 more he married, and 5 years later a son was born. The son lived half as long as his father, and the father died 4 years after his son.'",
          question: "Based on his epitaph, how old was Diophantus when he died?",
          correct_answer: "84",
          options: JSON.stringify(["60", "72", "80", "84"]),
          explanation: "Set $x$ as Diophantus's age. The equation is: $$\\frac{x}{6} + \\frac{x}{12} + \\frac{x}{7} + 5 + \\frac{x}{2} + 4 = x$$ Summing the fractions yields $$\\frac{25}{28} x + 9 = x \\implies \\frac{3}{28} x = 9 \\implies x = 84$$ years.",
          difficulty: "Scholar",
          category: "Arithmetic",
          stars: 3,
          source: "Mathematics Stack Exchange #103"
        }
      ];

      const stmtArchive = db.prepare(`
        INSERT OR IGNORE INTO archive_exercises 
        (title, story, question, correct_answer, options, explanation, difficulty, category, stars, source) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      archiveExercises.forEach(ex => {
        stmtArchive.run(ex.title, ex.story, ex.question, ex.correct_answer, ex.options, ex.explanation, ex.difficulty, ex.category, ex.stars, ex.source);
      });
      stmtArchive.finalize((err) => {
        db.run("PRAGMA foreign_keys = ON;");
        // Performance indexes — silently ignored if they already exist
        db.run("CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_league      ON users(league)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_elo         ON users(elo)");
        db.run("CREATE INDEX IF NOT EXISTS idx_users_xp          ON users(xp DESC)");
        db.run("CREATE INDEX IF NOT EXISTS idx_srs_user_next     ON srs_reviews(user_id, next_review)");
        db.run("CREATE INDEX IF NOT EXISTS idx_inventory_user    ON user_inventory(user_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_friends_user      ON friends(user_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_sessions_user     ON user_sessions(user_id)");
        db.run("CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON user_sessions(expires_at)");
        if (err) {
          logger.error("Error seeding archive exercises:", err);
          reject(err);
        } else {
          // Seed default developer/test users so the app always works out of the box
          const defaultUsers = [
            { username: 'mk',    password: '123456', avatar: 'avatar_pythagoras' },
            { username: 'mk1',   password: '123456', avatar: 'avatar_owl' },
            { username: 'admin', password: '123456', avatar: 'avatar_euler' },
          ];
          let seeded = 0;
          const now = Math.floor(Date.now() / 1000);
          defaultUsers.forEach(u => {
            const hash = bcrypt.hashSync(u.password, 10);
            db.run(
              'INSERT OR IGNORE INTO users (username, password_hash, last_active, avatar, last_league_reset) VALUES (?, ?, ?, ?, ?)',
              [u.username, hash, now, u.avatar, now],
              (seedErr) => {
                if (seedErr) logger.warn(`Default user '${u.username}' seed skip:`, seedErr.message);
                seeded++;
                if (seeded === defaultUsers.length) {
                  logger.info('Database initialized and seeded successfully.');
                  resolve();
                }
              }
            );
          });
        }
      });
    });
  });
}

module.exports = {
  db,
  initDb
};
