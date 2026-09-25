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

1. **Bootstrap (`server.js`, ~170 lines)** — creates the Express `app`, wires global middleware
   (CORS allow-list, security headers, global rate limit), initializes the DB + runs
   migrations (`ready` promise), registers routes, and attaches the Socket.IO duel engine
   (`socket/duels.js` → `attachDuels(io)`). It exports `{ app, server, io, db, ready }` and only calls `listen()` when run
   directly (`require.main === module`) so tests can drive it in-process.
2. **Middleware (`middleware/`)** — `auth.js` (stateful JWT: a valid signature must also map
   to a live row in `user_sessions`), `rateLimit.js` (global + per-route + brute-force),
   `security.js` (hardening headers, audit logging, private-IP detection).
3. **Routes (`routes/`)** — ~220 endpoints grouped into **44 domain routers** (see
   [Systems.md](Systems.md) for the full map), each an `express.Router()` mounted in `server.js`. DB-touching logic shared
   across routers lives in `services/`; pure helpers in `lib/`.
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

## Known architectural debt

The live list is the "Open work" section of [Systems.md](Systems.md). Structurally:

- **Oversized Android screens** (Settings, Profile, `Models.kt`, DuelGame, LevelMap, Gameplay,
  SoloGame, Arena all exceed the 600-line rule). `MainTabsScreen.kt` itself was split (9.9k → a
  thin shell) and has a Robolectric Compose test net.

## Quality gates

`server/`: `npm test` (smoke + unit) and `npm run lint` (ESLint v9). `android/`:
`gradlew assembleDebug`. All three must be green before a change is considered done.
