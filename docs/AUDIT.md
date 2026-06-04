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
- ✅ **`SoloGameScreen.kt` fully decomposed** (2,806 → **890 lines**, −68%): self-contained
  helpers (`CalcEngine.kt`, `ExerciseType.kt`, `LessonComponents.kt`); the overlays
  `CalculatorOverlay.kt` + `TipOverlay.kt`; `LessonScreen.kt` (concept-first lesson block); and
  now the hard, intertwined remainder — **`GameplayScreen.kt`** (the ~870-line per-problem
  MCQ/typed/timed UI: header, equation card, save/tooltip, tool buttons, answer interface,
  feedback banner, slide-up overlays), **`RecapScreen.kt`** (the `isGameOver` end screen),
  **`ReviewSolutionDialog.kt`** and **`OutOfHeartsDialog.kt`**. What remains in SoloGameScreen is
  the data-load `LaunchedEffect`s, the per-question state, `handleAnswer`/`isCurrentAnswerCorrect`/
  `continueOrFinish`, the timer/hearts effects, and the early-return wiring to the carved screens.
  **Every gameplay carve was verified, not blind:** the prerequisite was solving a Robolectric
  reliability problem (the gameplay semantics tree settled unreliably — the async-measured KaTeX
  `MathText` WebView was the main culprit). Fix = a **`MathText` test seam** (renders a plain
  `Text` with the same string under test) + plain-text test problems (no `$`/`\`, so the gameplay
  path never touches `MathText`) + a tall viewport + `waitForIdle` before tapping animated
  banners. `GameplayScreenTest`/`RecapScreenTest` then drive the real answer flow (correct/wrong
  banner, advance, review dialog, out-of-hearts, finish→recap), verified stable across 3+ reruns.
  Parent keeps owning state — written states pass as `MutableState` (re-delegated with `by` so the
  body moves verbatim), logic passes as callbacks.

## 2. Folder structure
- ✅ Server: `config.js`, `middleware/`, `lib/`, `services/`, `routes/`, `test/` — clear
  ownership boundaries, one domain per router.
- ✅ Android `ui/feature/<domain>/` reorg **done**: `feature/{dashboard,archive,arena,social,
  shop,profile,settings,game}/`, `ui/dialogs/`, with `ui/screens/` now holding only the
  remaining standalone screens (Auth, Duel, Placement) + the thin `MainTabsScreen` shell.

## 3. Duplicate logic
- ✅ Earlier work removed a duplicated expression parser; the calculator engine is now its own
  `ui/feature/game/CalcEngine.kt` (`evaluateExpression`/`CalcParser`, pure, unit-testable).
- 🟢 Rate limiters consolidated into one module. ✅ **Client answer-handling de-duplicated**: the
  "is the current answer correct?" branch (TYPED → trimmed case-insensitive equals; MCQ/TIMED →
  selectedAnswer == correctAnswer), previously inlined 3–4× (card border, feedback banner,
  typed-submit paths), is now one `isCurrentAnswerCorrect()` helper. Guarded by `GameplayScreenTest`.

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
  the token). ✅ **Color-literal pass done**: added the missing semantic gold tokens — `MedalGold`
  (0xFFFFD700) and reused existing `MilestoneGold` (0xFFD4AF37) — and migrated all 15 inline gold
  `Color(0x..)` call-sites (RecapScreen, ShopScreen/shopUtils, PremiumIcons, DashboardScreen,
  MainTabsScreen). Value-identical (constants), so rendering is unchanged. Remaining `Color(0x..)`
  literals are intentional one-off gradient stops / per-theme surface definitions with no shared
  semantic — left as-is by design.

## 6. State management (Android)
- 🟡 The God-file split (prerequisite) is **done** — each screen's `remember`/`mutableStateOf`
  hoisting and CompositionLocal use (`LocalToast`, `LocalCommandPalette`) is now isolated and
  legible per file. ✅ **Lazy-list keys added** — every keyless `LazyColumn` `items(...)` (8 sites:
  notifications, friends, shop daily/utility/catalog, level map, SRS-due, archive results) now has
  a verified-unique `key` (shop sections prefixed since they share one list; the sealed
  `LearnMapItem` keyed by type+number), so Compose matches items across data changes instead of by
  index. ✅ **Deeper hoisting done on the genuinely-hot paths** — brushes that were reallocated
  every animation frame are now `remember`ed (keyed on their stable inputs): `LevelNode`'s node-fill
  + START-badge gradients (per-frame pulse animation, per list item), `RarityCardFrame`'s radial
  glow (per-frame shimmer; the shimmer brush itself genuinely varies per frame and stays inline),
  and `WeeklyActivityChart`'s per-bar fills (allocated *inside* the `Canvas` draw scope → two
  brushes/bar/frame during the 900ms grow-in). Non-animated brushes (StageHeaderCard, chart
  container) deliberately left inline — they recompose only on data change, so hoisting is churn for
  no gain. Verified green: `assembleDebug` + `testDebugUnitTest`.

## 7. API layer
- 🟢 Client API access already centralized (`ApiService`/`RetrofitClient`), with idempotency
  interceptor and standardized error handling. Server responses are consistent JSON.

## 8. Type safety
- 🟢 Kotlin client is statically typed; Models use Gson with a documented JSON-string escape
  hatch for heterogeneous specs. ✅ **`!!`/unsafe-cast audit done**: hardened the 5 genuinely-unsafe
  Socket.IO payload casts (`args[0] as JSONObject` → `args.getOrNull(0) as? JSONObject ?: return@on`
  in ArenaScreen + DuelGameScreen, which would have crashed on a malformed/empty payload). The ~30
  `!!` sites are all guarded (inside an `if (x != null)`/`isNullOrEmpty` check in the same
  composition, or a dialog gated on non-null state) — none dangerous, left as-is. Server is JS —
  ESLint added as the guardrail (full TS migration intentionally out of scope).

## 9. Debugging / bug hunt
- ✅ **Fixed real bug:** 3 archive seed puzzles had single-backslash LaTeX in their MC options
  (`"$\frac{\pi}{4}$"` → `\f` became a form-feed control char), rendering choices as garbage.
  Now escaped. Surfaced by the new ESLint `no-useless-escape` rule.
- ✅ Earlier fixes (documented in memory): boot-time wipe of `user_achievements`; archive
  load deadlock; achievement claimability using `completed_at`.

## 10. Dead code
- ✅ Deleted scratch scripts `scratch_register_and_test.js`, `test_dp.js`, `test_generator.js`.
- ✅ **Android dead-code sweep done**: removed the unmodified Compose project template that the
  split surfaced — `ui/main/` (`MainScreen` + `Greeting` "Hello $name!" + `MainScreenViewModel`)
  and `data/DataRepository.kt` (`DefaultDataRepository` emitting `listOf("Android")`), plus their
  template tests. Grep-confirmed unreferenced by `MainActivity`/`Navigation`/any real screen.

## 11. Naming
- 🟢 Generally descriptive. New modules named by responsibility — the game-module split produced
  intent-revealing names (`GameplayScreen`, `RecapScreen`, `ReviewSolutionDialog`,
  `OutOfHeartsDialog`, `SaveOptionsDialog`) and the de-duped `isCurrentAnswerCorrect()` /
  `continueOrFinish()` helpers. No remaining ambiguous identifiers warrant a risky blanket rename
  on untested screens; treated as addressed-during-split.

## 12. Database
- 🟢 **Schema is comprehensively indexed** — every hot per-user table has a `user_id` index or
  a `user_id`-leftmost PRIMARY KEY (`user_quests`/`user_mastery` PK, `user_utilities`
  composite PK), plus `username`/`league`/`elo`/`xp`/session-expiry/SRS composite indexes.
  No missing indexes found. WAL mode, busy_timeout, FK enforcement, versioned migrations,
  verified backups all in place. No action needed.

## 13. Performance
- 🟢 Hot reads cached (`cache.js`); economy paths transactional.
- ✅ **Client game-load fetches parallelized**: SoloGameScreen already fanned out its 3 loads
  (favorites/profile/shop) via `coroutineScope { async }`; DuelGameScreen's independent
  profile+favorites loads were sequential and are now concurrent too (join waits on max, not
  sum). ✅ Lazy-list `key`s added (see #6). ✅ Per-frame brush hoisting done on the hot paths
  (LevelNode / RarityCardFrame / WeeklyActivityChart — see #6).

## 14. Security
- ✅ `JWT_SECRET` now **required in production** (was silently ephemeral). ✅ CORS locked to an
  allow-list (was wide open). 🟢 Already strong: bcrypt, stateful JWT sessions, layered rate
  limiting + brute-force protection, 10KB body cap, parameterized SQL, security headers,
  audit logging, idempotent transactional economy. Full picture in Security.md.
- ✅ **Per-route ownership audit DONE.** Every `:userId`/resource-id route scopes its SQL to
  `req.user.id` (library collections/favorites, rating explanation, engine concept, friends
  accept, shop, account, …) — no IDOR. The one gap found + fixed: `profile_private` was
  settable but enforced nowhere, so `GET /api/user/:userId` exposed a user's profile even
  after they went private. Now own-profile is always viewable; others' private profiles return
  403 `{ private: true }`. Smoke test added (`npm test` 22 → 23).

## 15. Logging & observability
- 🟢 Security events go to `security_audit_logs`.
- ✅ **Structured leveled logger added** (`server/logger.js`): console-compatible, `LOG_LEVEL`
  gating (error<warn<info<debug; JSON lines in prod, readable in dev; Error args expanded;
  error/warn→stderr). Replaced ~53 runtime `console.*` sites across server.js, config, db,
  migrations, idempotency, middleware/security, userService, routes/{engine,math,account,auth},
  and knowledgeIngestion. CLI tools (`backup.js`, `seed_users.js`) keep `console` by design.

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
- ✅ **Android JVM Compose UI test net** (Robolectric, `gradlew testDebugUnitTest`, no device) —
  the client's missing Phase-0 net. **16 tests**: a harness smoke test; the carved-out overlays
  (`CalculatorOverlay` render + a key-press→CalcEngine **interaction** test, `TipOverlay`) and
  `MasteryBar` (pure composables); a screen-level `SocialScreenTest` that injects a **MockK**
  `ApiService` via the new `RetrofitClient.setApiServiceForTest()` seam and asserts fetched data
  renders; `SoloGameScreenTest` (mock `getProblems` → the fetched lesson renders, guarded the
  LessonScreen carve); and the **gameplay-interaction** net — `GameplayScreenTest` (correct MCQ →
  success banner, wrong MCQ → mistake banner + correct answer, Review Solution → solution dialog,
  Continue → advance, three mistakes → out-of-hearts, favorite → save-options dialog) and
  `RecapScreenTest` (finish a session →
  recap) — which guarded the `GameplayScreen`/`RecapScreen`/dialog carves. **Robolectric
  reliability** (the gameplay tree settled unreliably, mainly the async-measured KaTeX `MathText`
  WebView) is solved primarily by using **plain-text test problems** (no `$`/`\`, so the gameplay
  path never instantiates `MathText`), a tall `@Config(qualifiers="w411dp-h2000dp")` viewport, and
  `waitForIdle()` before tapping animated banners. A `MathText` test seam (internal renderer
  override → plain `Text` with the same string) is also in place as defensive infra for any future
  test that must render math. The pattern (mock ApiService → render → drive → assert) extends to
  any screen.

## Recommended next steps (in order)
1. ✅ Split `server.js` routes into `routes/<domain>` (test net guarded each move).
2. ✅ Split `MainTabsScreen.kt` into `ui/feature/<domain>/` + `ui/dialogs/` (606-line shell
   remains); `SoloGameScreen.kt` relocated to `feature/game/` with helpers extracted.
3. ✅ **SoloGameScreen carve-up COMPLETE** (2,806 → 890): overlays (CalculatorOverlay, TipOverlay),
   the Compose/Robolectric test net + injectable `ApiService`, `LessonScreen`, and — once the
   gameplay-interaction net made it verifiable — `GameplayScreen`, `RecapScreen`,
   `ReviewSolutionDialog`, `OutOfHeartsDialog` + the `handleAnswer` de-dup. ✅ Further split:
   `SaveOptionsDialog` carved out of `GameplayScreen.kt` (now ~960 lines), guarded by a new
   favorite-button test. ⬜ Optional: the answer-interface sub-block could still be split later.
4. ✅ Design-token migration (raw `dp`/shape → `theme/` tokens) DONE across the split screens.
   ✅ `Color`-literal → token pass DONE (gold tokens). ✅ Lazy-list keys DONE.
5. ✅ Structured logger DONE; ✅ ownership-check pass DONE (profile_private fix); ✅ client
   game-load fetch parallelization DONE (Solo already fanned out; Duel now concurrent).
   ✅ Dead-code sweep DONE (template scaffold removed); ✅ unsafe-cast audit DONE (socket payloads).
   ⬜ Remaining (deliberately deferred): deeper recomposition hoisting (marginal gain vs. risk on
   untested screens) and achievement chains (a feature, out of stabilization scope).
