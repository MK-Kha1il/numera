# Architecture

Numera is a **client–server** system with a deliberately **thin, authoritative server**:
the Android client renders and captures input; the Node server owns every rule that affects
progression, economy, or rating. This keeps the game cheat-resistant and lets logic evolve
without shipping a new APK.

```
┌─────────────────────────┐         HTTPS / JSON (Retrofit + Gson)      ┌──────────────────────────┐
│   Android (Compose)     │  ───────────────────────────────────────▶  │   Express API (server.js) │
│                         │         WebSocket (Socket.IO, JWT auth)     │                          │
│  ui/screens, components │  ◀───────────────────────────────────────  │  middleware → routes →   │
│  data/network (ApiSvc)  │                                             │  mathEngine + services   │
└─────────────────────────┘                                             └────────────┬─────────────┘
                                                                                       │
                                                                          ┌────────────▼─────────────┐
                                                                          │  SQLite (numera.db, WAL) │
                                                                          │  db.js schema + migrations│
                                                                          └──────────────────────────┘
```

## Server layers

1. **Bootstrap (`server.js`)** — creates the Express `app`, wires global middleware
   (CORS allow-list, security headers, global rate limit), initializes the DB + runs
   migrations (`ready` promise), registers routes, and attaches Socket.IO for real-time
   duels. It exports `{ app, server, io, db, ready }` and only calls `listen()` when run
   directly (`require.main === module`) so tests can drive it in-process.
2. **Middleware (`middleware/`)** — `auth.js` (stateful JWT: a valid signature must also map
   to a live row in `user_sessions`), `rateLimit.js` (global + per-route + brute-force),
   `security.js` (hardening headers, audit logging, private-IP detection).
3. **Routes (`routes/`)** — ~75+ endpoints grouped into **43 domain routers**, each an
   `express.Router()` mounted in `server.js` (auth, math, assessment, srs, archive, mistakes,
   quests, dailyPuzzle, league, shop, account, achievements, friends, leaderboard, library,
   notifications, engine, rating, publicProfile, commitment, arena, botDuel, asyncDuel,
   reasoningDuel, tournaments, challenges, liveRoom, clubs, clubWars, classes, discussion,
   moderation, feedback, crash, analytics, today, learn, worksheet, transfer, cas, onboarding,
   puzzleRush, publicProfilePage). DB-touching logic shared across routers lives in `services/`;
   pure helpers in `lib/`. For the feature→file lookup table, see [../ai/feature-map.md](../ai/feature-map.md).
4. **Math/learning engine (`mathEngine/`)** — see [MathEngine.md](MathEngine.md). Pure-ish
   modules: generation, validation, adaptivity, rating, retention, misconceptions, lessons.
5. **Data access** — `db.js` (the main read connection + schema baseline), `dbx.js` (a
   dedicated serialized write connection exposing `withTransaction`), `migrations.js`,
   `cache.js`, `idempotency.js`.

### Why two DB connections
node-sqlite3 has a single-connection autocommit footgun. `dbx.js` holds a **dedicated write
connection** with a promise-chain mutex so transactional work (purchases, claims) is isolated
from the main connection's autocommit reads/writes. Reward routes use `withTransaction(work)`
(`work` throws → ROLLBACK, resolves → COMMIT) and `httpError(status,msg)` for control flow.

## Client layers

- **`data/network/`** — `ApiService` (Retrofit interface), `RetrofitClient` (OkHttp:
  base URL, auth header, an application interceptor that stamps `Idempotency-Key` on POSTs),
  `Models` (Gson-deserialized DTOs; nested objects OK, but heterogeneous maps ride as JSON
  strings — see the interactive-visual note in MathEngine.md), `SocketClient` (duels).
- **`ui/screens/`** — top-level screens. `MainTabsScreen` hosts the bottom-nav tabs
  (Dashboard, Archive, Arena, Social, Shop, Profile, Settings); `SoloGameScreen` is the core
  learn/play loop (lesson → gameplay → recap, with calculator/tip/whiteboard overlays).
- **`ui/components/`** — a token-driven component library: primitives (`DuoButton`,
  `GlassCard`, `NumeraIcon`), feedback (toasts, skeletons, empty states), and premium
  interaction pieces (command palette, bottom sheet, breadcrumbs, slide-over). Mounted once
  via CompositionLocals (`LocalToast`, `LocalCommandPalette`) in `MainTabsScreen`.
- **`theme/`** — design tokens + Material3 theme. See [DesignSystem.md](DesignSystem.md).

## Architectural status (God-file splits complete)

- **God files fully decomposed.** Server `server.js`: 5k → ~1.85k lines (`config.js`,
  `middleware/`, `lib/`, `services/`, 43 `routes/*` routers; what remains is bootstrap + the
  Socket.IO duel logic). Android `MainTabsScreen.kt`: ~9.9k → ~865 lines (shell only), screens
  moved into `ui/feature/<domain>/`. `SoloGameScreen.kt`: ~2.8k → ~1k, with `GameplayScreen`,
  `RecapScreen`, lesson/overlay helpers carved out.
- **Test nets in place both sides.** Server: 107 `node:test` files. Android: a 41-file
  Robolectric Compose UI net (`gradlew testDebugUnitTest`, no device).
- **Largest remaining files are content/data**, not tangled logic (`mathEngine/conceptLessons.js`,
  `templates.js`, `db.js`) — treat them as data; a few Android screens
  (`SettingsScreen`, `ProfileScreen`) are the main UI-split candidates left.

## Quality gates

`server/`: `npm test` (107 files) and `npm run lint` (ESLint v9, 0 errors). `android/`:
`gradlew assembleDebug` and `gradlew testDebugUnitTest` (Robolectric). All must be green before
a change is considered done. CI (`.github/workflows/ci.yml`) runs both suites on push to `main`
and on PRs.
