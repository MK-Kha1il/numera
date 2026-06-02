# Stabilization Audit — Findings & Status

Full-codebase audit from the stabilization/optimization sprint. Status legend:
**✅ done** (implemented + verified) · **🟢 verified-ok** (audited, already healthy, no change
needed) · **🟡 partial** (started, foundation laid) · **⬜ pending** (planned, not yet done).

Scope at audit time: Android client ~22.5k LOC, Node server ~13.4k LOC. No prior test net.

## 1. Architecture & separation of concerns
- ✅ **`server.js` God file fully decomposed** (5,096 → ~1,100 lines): `config.js`,
  `middleware/{auth,rateLimit,security}.js`, `lib/progression.js`, 5 `services/*`, and **20
  `routes/<domain>` routers**. What remains in server.js is bootstrap + the Socket.IO duel
  logic. Each move was verbatim, guarded by `npm test` (22) + `eslint` (0 errors).
- ✅ **`MainTabsScreen.kt` God file fully decomposed** (9,933 → **606 lines**, −94%): now just
  the Scaffold + bottom-nav + host wiring + `NavigationItem` + the `LocalToast`/
  `LocalCommandPalette` mounts. Its 7 screens, shop sub-composables, dialogs and helpers were
  moved **verbatim** into `ui/feature/{dashboard,archive,arena,social,shop,profile,settings}/`
  + `ui/dialogs/`, one screen per commit, each gated by a green `assembleDebug`.
- 🟡 **`SoloGameScreen.kt` relocated to `ui/feature/game/`** and its self-contained helpers
  extracted (`CalcEngine.kt`, `ExerciseType.kt`, `LessonComponents.kt`; 2,806 → 2,657 lines).
  The main `SoloGameScreen` composable itself is still a single ~2,600-line function with ~30
  intertwined hoisted state vars + inline calculator/whiteboard/tip overlays — carving it into
  `LessonScreen`/`GameplayScreen`/`RecapScreen` is a **behavior-changing** refactor deferred
  until there is a UI/Compose test net (too risky to do blind under the compiler alone).

## 2. Folder structure
- ✅ Server: `config.js`, `middleware/`, `lib/`, `services/`, `routes/`, `test/` — clear
  ownership boundaries, one domain per router.
- ✅ Android `ui/feature/<domain>/` reorg **done**: `feature/{dashboard,archive,arena,social,
  shop,profile,settings,game}/`, `ui/dialogs/`, with `ui/screens/` now holding only the
  remaining standalone screens (Auth, Duel, Placement) + the thin `MainTabsScreen` shell.

## 3. Duplicate logic
- ✅ Earlier work removed a duplicated expression parser; the calculator engine is now its own
  `ui/feature/game/CalcEngine.kt` (`evaluateExpression`/`CalcParser`, pure, unit-testable).
- 🟢 Rate limiters consolidated into one module. ⬜ Client answer-handling still duplicated 3×
  in `SoloGameScreen` — deferred with the in-function split (needs a Compose test net first).

## 4. Component audit (Android)
- 🟢 Component library is already well-classified (primitives / feedback / premium
  interaction / domain). Documented in DesignSystem.md.

## 5. Design system
- ✅ Removed duplicate unused `AppTypography`; typography now single-sourced in `Type.kt`.
- ✅ **Migrated raw `dp`/shape literals → `theme/` tokens** across the 19 split feature/dialog/
  shell screens via a context-aware, **value-exact** codemod (~555 swaps): `padding/size/
  height/spacedBy(N.dp)` → `Spacing.*`, `RoundedCornerShape(N.dp)` → `CornerRadius.*`,
  `.size(N.dp)` → `IconSize.*`, only where the value exactly equals a token, so rendering is
  unchanged (guarded by `assembleDebug`). Non-token values (1.dp borders, 6/10/14.dp) and
  `Color(0x…)` literals (mostly medal/brand colors w/o a token; the rest already use
  `MaterialTheme.colorScheme`/named theme colors) were left as-is. One exception: `SoloGameScreen`
  keeps literal corners (its `androidx.compose.ui.geometry.CornerRadius` drawing import shadows
  the token). ⬜ Remaining: optional `Color`-token pass + recomposition hygiene.

## 6. State management (Android)
- 🟡 The God-file split (prerequisite) is **done** — each screen's `remember`/`mutableStateOf`
  hoisting and CompositionLocal use (`LocalToast`, `LocalCommandPalette`) is now isolated and
  legible per file. ⬜ A focused recomposition-hygiene pass (hoist, `key` lazy items, avoid
  brush/lambda allocation in hot paths) per feature screen is the remaining follow-up.

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
1. ✅ Split `server.js` routes into `routes/<domain>` (test net guarded each move).
2. ✅ Split `MainTabsScreen.kt` into `ui/feature/<domain>/` + `ui/dialogs/` (606-line shell
   remains); `SoloGameScreen.kt` relocated to `feature/game/` with helpers extracted.
3. **Add a Compose/UI test net (Robolectric or instrumented), then** carve the ~2,600-line
   `SoloGameScreen` composable into `LessonScreen`/`GameplayScreen`/`RecapScreen` + overlay
   composables and de-dup the 3× `handleAnswer` — deferred until tests exist (state-hoisting
   refactor the compiler can't fully guard).
4. ✅ Design-token migration (raw `dp`/shape → `theme/` tokens) DONE across the split screens.
   ⬜ Remaining: optional `Color`-literal → token pass + recomposition-hygiene pass.
5. Structured logger; client fetch parallelization; ownership-check pass; achievement chains.
