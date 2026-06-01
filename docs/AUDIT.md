# Stabilization Audit — Findings & Status

Full-codebase audit from the stabilization/optimization sprint. Status legend:
**✅ done** (implemented + verified) · **🟢 verified-ok** (audited, already healthy, no change
needed) · **🟡 partial** (started, foundation laid) · **⬜ pending** (planned, not yet done).

Scope at audit time: Android client ~22.5k LOC, Node server ~13.4k LOC. No prior test net.

## 1. Architecture & separation of concerns
- 🟡 Server cross-cutting layer extracted from the 5k-line `server.js` into `config.js` +
  `middleware/{auth,rateLimit,security}.js`. Routes (~75) still inline → **⬜ split into
  `routes/<domain>` + `services/`** (target documented in Architecture.md).
- ⬜ Android God files (`MainTabsScreen.kt` ~9.9k, `SoloGameScreen.kt` ~2.8k) → `ui/feature/
  <domain>/` packages. Highest-value remaining refactor; gated behind the now-existing
  server test net + the gradle compile check.

## 2. Folder structure
- 🟡 Server now has `config.js`, `middleware/`, `test/`. Target `routes/`, `services/` pending.
- ⬜ Android `ui/feature/<domain>/` reorg pending (paired with the God-file split).

## 3. Duplicate logic
- ✅ Earlier work removed a duplicated expression parser (`evaluateExpression`/`CalcParser`).
- 🟢 Rate limiters consolidated into one module. ⬜ Client answer-handling still duplicated 3×
  in `SoloGameScreen` (extract `handleAnswer()` during the split).

## 4. Component audit (Android)
- 🟢 Component library is already well-classified (primitives / feedback / premium
  interaction / domain). Documented in DesignSystem.md.

## 5. Design system
- ✅ Removed duplicate unused `AppTypography`; typography now single-sourced in `Type.kt`.
- ⬜ Migrate raw `16.dp`/`Color(0x…)` literals in the big screens to tokens (do during split).

## 6. State management (Android)
- ⬜ Not deeply audited this pass; the God-file split is a prerequisite to meaningfully
  improve hoisting/recomposition. Flagged for the split phase.

## 7. API layer
- 🟢 Client API access already centralized (`ApiService`/`RetrofitClient`), with idempotency
  interceptor and standardized error handling. Server responses are consistent JSON.

## 8. Type safety
- 🟢 Kotlin client is statically typed; Models use Gson with a documented JSON-string escape
  hatch for heterogeneous specs. ⬜ Audit `!!`/unsafe casts during the split. Server is JS —
  ESLint added as the guardrail (full TS migration intentionally out of scope).

## 9. Debugging / bug hunt
- ✅ **Fixed real bug:** 3 archive seed puzzles had single-backslash LaTeX in their MC options
  (`"$\frac{\pi}{4}$"` → `\f` became a form-feed control char), rendering choices as garbage.
  Now escaped. Surfaced by the new ESLint `no-useless-escape` rule.
- ✅ Earlier fixes (documented in memory): boot-time wipe of `user_achievements`; archive
  load deadlock; achievement claimability using `completed_at`.

## 10. Dead code
- ✅ Deleted scratch scripts `scratch_register_and_test.js`, `test_dp.js`, `test_generator.js`.
- ⬜ Android dead-code sweep best done after the split surfaces unreferenced composables.

## 11. Naming
- 🟢 Generally descriptive. New modules named by responsibility. ⬜ Ambiguous-name pass folded
  into the split (rename as files move).

## 12. Database
- 🟢 **Schema is comprehensively indexed** — every hot per-user table has a `user_id` index or
  a `user_id`-leftmost PRIMARY KEY (`user_quests`/`user_mastery` PK, `user_utilities`
  composite PK), plus `username`/`league`/`elo`/`xp`/session-expiry/SRS composite indexes.
  No missing indexes found. WAL mode, busy_timeout, FK enforcement, versioned migrations,
  verified backups all in place. No action needed.

## 13. Performance
- 🟢 Hot reads cached (`cache.js`); economy paths transactional. ⬜ Parallelize the 3
  sequential client fetches on game load (`async`); recomposition hygiene during the split.

## 14. Security
- ✅ `JWT_SECRET` now **required in production** (was silently ephemeral). ✅ CORS locked to an
  allow-list (was wide open). 🟢 Already strong: bcrypt, stateful JWT sessions, layered rate
  limiting + brute-force protection, 10KB body cap, parameterized SQL, security headers,
  audit logging, idempotent transactional economy. Full picture in Security.md.
- ⬜ Per-route ownership-check audit for any `:userId`/resource-id routes (spot-check during
  the route split).

## 15. Logging & observability
- 🟢 Security events go to `security_audit_logs`. ⬜ Replace ad-hoc `console.*` (~40 sites)
  with a structured leveled logger (`server/logger.js`) — deferred (churny, low risk, low
  verification value until routes are split).

## 16. Documentation
- ✅ Created `CLAUDE.md` + `docs/{Architecture,Security,DataFlow,MathEngine,ProgressionSystem,
  AchievementSystem,DesignSystem}.md` + this audit. Written for humans **and** AI assistants.

## 17. AI/Claude optimization
- ✅ `CLAUDE.md` gives a fast index, folder map, verify commands, and invariants; docs reduce
  the tokens needed to understand each subsystem. Further reduced once God files are split.

## Test & lint net (foundation for everything above)
- ✅ `server/test/` (node:test): smoke tests over the real route stack (auth, math, shop,
  leaderboard, idempotency replay) + `symbolic.js` unit tests. `npm test` = 14 passing.
- ✅ ESLint v9 + Prettier (`npm run lint`/`format`), 0 errors. `db.js` made env-overridable so
  tests use a throwaway DB; `server.js` exports the app and only listens when run directly.

## Recommended next steps (in order)
1. Split `server.js` routes into `routes/<domain>` (test net guards each move).
2. Split `MainTabsScreen.kt`/`SoloGameScreen.kt` into `ui/feature/<domain>/`, migrating raw
   design values to tokens and de-duplicating `handleAnswer` as you go.
3. Structured logger; client fetch parallelization; ownership-check pass; achievement chains.
