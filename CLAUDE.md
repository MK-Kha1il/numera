# Numera — Project Guide for AI Assistants & Humans

Numera is a full-stack, gamified math-learning app: a **Jetpack Compose Android client**
talking to a **Node.js/Express + SQLite server** that owns all game logic and progression.
The server is authoritative; the client never computes rewards or touches the DB directly.

> New here? Read [docs/Architecture.md](docs/Architecture.md) first, then the domain docs
> linked below. This file is the fast index; the `docs/` folder has the depth.

## Repository layout

```
android/      Jetpack Compose client (Kotlin). Package com.example.numera
server/       Node.js/Express API + SQLite (authoritative backend)
docs/         Subsystem documentation (start with Architecture.md)
```

### Server (`server/`)
```
server.js            Bootstrap only: middleware wiring + 20 router mounts + DB init + the
                     Socket.IO matchmaking/duel logic. Exports { app, server, io, db, ready };
                     listens only when run directly. (~1.1k lines, was a 5k God file.)
config.js            Single source for env config (JWT_SECRET, PORT, CORS origins).
routes/              One express.Router per domain (20): auth, math, shop, quests, dailyPuzzle,
                     account, achievements, friends, leaderboard, league, library, mistakes,
                     srs, notifications, assessment, archive, engine, rating, publicProfile,
                     commitment. Each declares its own /api/... paths + imports its own deps.
services/            DB-touching business logic shared across routes: userService,
                     achievementService, commitmentService, tipService, rankRewardService.
lib/                 Pure, unit-tested utilities (progression.js: rank/level helpers).
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
ui/screens/                      Screens. NOTE: MainTabsScreen.kt and SoloGameScreen.kt
                                 are large "God files" pending decomposition.
ui/components/                   Reusable component library (primitives + composites).
theme/                           Color.kt, Type.kt (Typography), Theme.kt, DesignTokens.kt.
data/network/                    ApiService (Retrofit), Models (Gson), RetrofitClient, SocketClient.
sound/, haptic/                  Feedback managers.
```

## How to run

- **Server:** `cd server; npm start` (port 3000). Needs `server/.env` with `JWT_SECRET`
  (required in production; dev auto-generates an ephemeral one with a warning).
- **Android:** `Start_Numera_Server.bat` then `Launch Numera.lnk` (builds APK + installs in BlueStacks).
- **Build APK manually:**
  ```powershell
  $env:JAVA_HOME = "$env:APPDATA\.minecraft\runtime\java-runtime-gamma\windows\java-runtime-gamma"
  cd android; .\gradlew.bat assembleDebug
  ```

## How to verify changes

- **Server:** `cd server; npm test` (node:test — boots the real app on an ephemeral port
  against a throwaway DB) and `npm run lint` (ESLint v9, 0 errors expected). Tests set
  `NUMERA_DB_PATH` so they never touch the live `numera.db`.
- **Android:** `gradlew assembleDebug` must be green (the compile is the safety net — there
  is no UI test suite yet).
- **End-to-end:** start the server bat + launch the app in BlueStacks.

## Conventions & invariants (do not regress)

- **Server is authoritative.** All XP/coins/rating/progression is computed server-side.
- **Reward endpoints are idempotent.** They sit behind `idempotency` middleware; the client
  stamps an `Idempotency-Key` per POST. Never double-grant.
- **Money/balance mutations use transactions** (`dbx.withTransaction`) and conditional
  `WHERE coins >= ?` deductions; a DB trigger also blocks negative coins.
- **Schema changes go in `migrations.js`** (append a new version; never edit a shipped one).
  `db.js` is the idempotent baseline only.
- **Secrets** (`server/.env`, `numera.db`, backups) are gitignored — never commit them.
- **LaTeX in JS strings needs double backslashes** (`"\\frac"`). A single `\f`/`\p` is a
  silent control-char/escape bug (fixed a batch of these in db.js seed data).

## Architecture status (stabilization sprint, in progress)

The codebase is mid-decomposition. **Done:** Phase 0 test/lint net; the **server `server.js`
God file is fully split** — `config.js`, `middleware/`, `lib/`, 5 `services/`, and 20
`routes/*` routers (server.js 5,096 → ~1,100 lines, just bootstrap + Socket.IO). **Pending:**
the Android `MainTabsScreen.kt` (~9.9k) / `SoloGameScreen.kt` (~2.8k) God files into
`ui/feature/<domain>/` packages, plus the cross-cutting items in `docs/AUDIT.md`. See the
sprint plan and `docs/Architecture.md`.

## Subsystem docs
- [Architecture](docs/Architecture.md) · [DataFlow](docs/DataFlow.md) · [Security](docs/Security.md)
- [MathEngine](docs/MathEngine.md) · [ProgressionSystem](docs/ProgressionSystem.md) ·
  [AchievementSystem](docs/AchievementSystem.md) · [DesignSystem](docs/DesignSystem.md)
