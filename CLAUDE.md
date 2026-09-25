# Numera — project guide

Numera is a full-stack, gamified math-learning app: a **Jetpack Compose Android client**
talking to a **Node.js/Express + SQLite server** that owns all game logic and progression.
The server is authoritative; the client never computes rewards or touches the DB directly.

> New here? Read [docs/Systems.md](docs/Systems.md) (every system, its files and status) and
> [docs/Architecture.md](docs/Architecture.md) first, then the domain docs linked below. This file
> is the fast index; the `docs/` folder has the depth.

## Repository layout

```
android/      Jetpack Compose client (Kotlin). Package com.example.numera
server/       Node.js/Express API + SQLite (authoritative backend)
docs/         Subsystem documentation (start with Architecture.md)
```

### Server (`server/`)
```
server.js            Bootstrap only (~150 lines): middleware wiring + router mounts + DB init +
                     attaching the duel engine. Exports { app, server, io, db, ready, … };
                     listens only when run directly.
socket/duels.js      The Socket.IO duel engine: socket auth, matchmaking, the duel lifecycle,
                     rating/reward commit (attachDuels(io)).
routes/landing.js    Plain public root page + dev APK download.
config.js            Single source for env config (JWT_SECRET, PORT, CORS origins).
routes/              One express.Router per domain (45): auth, math, dailyPuzzle, archive, mistakes,
                     srs, transfer, assessment, onboarding, quests, today, commitment, shop,
                     achievements, rating, league, leaderboard, puzzleRush, botDuel, asyncDuel,
                     reasoningDuel, tournaments, challenges, liveRoom, friends, clubs, clubWars,
                     discussion, moderation, classes, notifications, account, engine, masteryMap,
                     learn, worksheet, publicProfile(+Page), cas, analytics, crash, feedback, health,
                     landing.
                     Each declares its own paths + imports its own deps.
services/            DB-touching business logic shared across routes (userService, streakService,
                     soloSessionService, leagueService, economyLedger, ratingService,
                     achievementService, commitmentService, notificationService, …).
lib/                 Pure, unit-tested utilities (progression, streak, soloRewards, leagueWeeks,
                     questDefs, titles, duelIntegrity, …).
middleware/          auth.js (stateful JWT), rateLimit.js, security.js (headers/audit log).
db.js                SQLite schema (CREATE IF NOT EXISTS baseline) + initDb().
migrations.js        Versioned, run-once migrations layered on top of db.js.
dbx.js               Promisified write connection + withTransaction() (ACID).
cache.js             In-process TTL cache (Redis-shaped for a future swap).
idempotency.js       Stripe-style Idempotency-Key middleware for reward endpoints.
backup.js            VACUUM INTO snapshot tool (npm run backup).
mathEngine/          The learning-intelligence engine (see docs/MathEngine.md).
mathGenerator.js     Problem-generation facade over mathEngine.
test/                node:test smoke (real route stack) + unit tests.
```

### Android (`android/app/src/main/java/com/example/numera/`)
```
MainActivity.kt, Navigation.kt   Entry + nav graph.
ui/screens/                      Standalone screens: AuthScreens, DuelGameScreen,
                                 PlacementTestScreen, + the MainTabsScreen "shell" (Scaffold,
                                 bottom nav, top bar and host wiring).
ui/feature/<domain>/             Decomposed top-level screens (dashboard, archive, arena,
                                 social, shop, profile, settings, game). One domain per package.
ui/dialogs/                      LevelDebrief / CommitmentStatus / Notifications dialogs.
ui/components/                   Reusable component library (primitives + composites).
theme/                           Color.kt, Type.kt (Typography), Theme.kt, DesignTokens.kt.
data/network/                    ApiService (Retrofit), Models (Gson), RetrofitClient, SocketClient.
sound/, haptic/                  Feedback managers.
```

## How to run

- **Server:** `cd server; npm start` (port 3000). Needs `server/.env` with `JWT_SECRET`
  (required in production; dev auto-generates an ephemeral one with a warning).
- **Android:** `Start_Numera_Server.bat`, then `launch-numera.ps1` (builds the APK and installs it in
  BlueStacks). The app reaches the server at `10.0.2.2:3000`.
- **Build APK manually:** the system `JAVA_HOME` (Program Files JDK) is what the launcher
  (`launch-numera.ps1`) and Gradle use — no override needed:
  ```powershell
  cd android; .\gradlew.bat assembleDebug
  ```
  (Currently JDK 26; builds green. It's non-LTS, so if a future Gradle/AGP upgrade complains,
  install an LTS Temurin 17/21 and point `JAVA_HOME` there.)

## How to verify changes

- **Server:** `cd server; npm test` (node:test — boots the real app on an ephemeral port
  against a throwaway DB) and `npm run lint` (ESLint v9, 0 errors expected). Tests set
  `NUMERA_DB_PATH` so they never touch the live `numera.db`.
- **Android:** `gradlew assembleDebug` must be green, and `gradlew testDebugUnitTest` runs the
  **JVM Compose UI test net** (Robolectric — no device/emulator). Tests live in
  `app/src/test/`; render screens/components with `createComposeRule()` and inject a mocked
  `ApiService` via `RetrofitClient.setApiServiceForTest(...)` for network-driven screens
  (see `ui/feature/social/SocialScreenTest.kt`). First run downloads the Robolectric SDK jar.
- **End-to-end:** start the server bat + launch the app in BlueStacks.
- **CI:** `.github/workflows/ci.yml` runs both suites on every push and on PRs
  (server: lint + node:test with SymPy installed; Android: assembleDebug + Robolectric).

## Conventions & invariants (do not regress)

- **Server is authoritative.** All XP/coins/rating/progression is computed server-side.
- **Reward endpoints are idempotent.** They sit behind `idempotency` middleware; the client
  stamps an `Idempotency-Key` per POST. Never double-grant.
- **Never trust client reward fields.** Solo play is graded on the device, so `/api/math/complete`
  must consume a serve ticket (`services/soloSessionService.js`, issued by every problem-serving
  endpoint) and takes XP/coins only from `lib/soloRewards.js`. A new solo mode = a ticket issue at
  its serve endpoint + a row in `SOLO_MODES`. Level progression only unlocks from the frontier.
- **Streaks are local calendar days** (`lib/streak.js`). Anything the learner *solves* calls
  `creditStreak(userId)` (after its transaction commits — never inside one); login/app-open only
  `settleStreak`. Don't reintroduce elapsed-seconds streak logic.
- **Daily/weekly clocks:** quest counters are bumped only after `ensureDailyReset(userId)` (local-day
  reset + global league rollover). The weekly league rolls over once, globally
  (`services/leagueService.js`) — never per player.
- **Every coin faucet/sink calls `recordCoins(source, ±amount)`** (`services/economyLedger.js`) after
  its transaction commits (add new sources to its allow-list).
- **Money/balance mutations use transactions** (`dbx.withTransaction`) and conditional
  `WHERE coins >= ?` deductions; a DB trigger also blocks negative coins.
- **Schema changes go in `migrations.js`** (append a new version; never edit a shipped one).
  `db.js` is the idempotent baseline only.
- **New lessons/exercises must pass the Content Quality Gate** (`mathEngine/contentQualityGate.js`,
  enforced on every `npm test` by `test/contentQualityGate.test.js`). Checklist + authoring
  workflow: [docs/ContentQualityGate.md](docs/ContentQualityGate.md). Never weaken a check or
  grow an allowlist to ship content — fix the content instead.
- **Secrets** (`server/.env`, `numera.db`, backups) are gitignored — never commit them.
- **LaTeX in JS strings needs double backslashes** (`"\\frac"`). A single `\f`/`\p` is a
  silent control-char/escape bug (fixed a batch of these in db.js seed data).

## Where new code goes (keep the structure — don't regrow God files)

Building something new? Put it in the right place from the start:

- **New server endpoint** → add it to the matching `routes/<domain>.js` router (or create a new
  one and mount it in `server.js`). **Never** add routes back into `server.js` — that file is
  bootstrap only. Socket.IO duel events belong in `socket/duels.js`.
- **DB-touching logic shared by ≥2 routes** → a function in `services/` (e.g. `userService`).
  Import it into the routers that need it. **Pure** helpers (no DB/IO) → `lib/`, with a unit test.
- **New Android screen / feature** → its own file under `ui/feature/<domain>/` (not appended to
  `MainTabsScreen.kt`). Reusable widgets → `ui/components/`; dialogs → `ui/dialogs/`.
- **Design values** (spacing, radius, color, type) → use the tokens in `theme/` — no raw
  `16.dp` / `Color(0x…)` / `RoundedCornerShape(…)` literals in new code.
- **Schema change** → append a new version to `migrations.js` (never edit a shipped one).
- **A file is getting big (>~600 lines)?** Stop and split it by responsibility *before* it
  becomes the next God file. Verify with the commands above after each extraction.

## Architecture status

[docs/Systems.md](docs/Systems.md) lists every system with its known gaps; its Backlog section is
the current to-do list. `server.js` is bootstrap only and the old `MainTabsScreen` God file is
split into `ui/feature/<domain>/`. Still too big: `SoloGameScreen` (~1.1k lines), Settings,
Profile, `Models.kt`, DuelGame, LevelMap, Gameplay and Arena — split them before adding to them,
and move raw `dp`/`sp`/color literals to tokens as you touch those screens.

## Subsystem docs
- [Systems catalog](docs/Systems.md) — every system, its files and known gaps (start here)
- [Architecture](docs/Architecture.md) · [DataFlow](docs/DataFlow.md) · [Security](docs/Security.md) ·
  [Compliance](docs/Compliance.md) · [Rating](docs/Rating.md) · [EconomyModel](docs/EconomyModel.md)
- [MathEngine](docs/MathEngine.md) · [MasteryProfile](docs/MasteryProfile.md) ·
  [ProgressionSystem](docs/ProgressionSystem.md) ·
  [AchievementSystem](docs/AchievementSystem.md) · [DesignSystem](docs/DesignSystem.md) ·
  [SoundDesign](docs/SoundDesign.md)
- [BrandIdentity](docs/BrandIdentity.md) — the world/voice/visual/motion identity system (what the
  app should *feel* like); DesignSystem.md is the tokens that implement it.
