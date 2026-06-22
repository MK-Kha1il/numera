# Architecture

Client–server with a **thin, authoritative server**. Depth: [docs/Architecture.md](../docs/Architecture.md),
[docs/DataFlow.md](../docs/DataFlow.md).

```
┌──────────────────────┐   HTTPS/JSON (Retrofit+Gson)   ┌─────────────────────────┐
│  Android (Compose)   │ ─────────────────────────────▶ │  Express API (server.js)│
│  ui/ · data/network  │   WebSocket (Socket.IO, JWT)    │  middleware→routes→     │
│                      │ ◀───────────────────────────── │  mathEngine + services  │
└──────────────────────┘                                 └───────────┬─────────────┘
                                                          ┌──────────▼──────────────┐
                                                          │ SQLite (numera.db, WAL) │
                                                          │ db.js + migrations.js   │
                                                          └─────────────────────────┘
```

## Server layers (request travels top→down)

1. **Bootstrap — `server.js`** (~1.85k lines, was 5k). Builds Express `app`, wires global
   middleware, runs DB init + migrations (`ready` promise), mounts all 43 routers, attaches
   Socket.IO for real-time duels. Exports `{ app, server, io, db, ready }`; only `listen()`s
   when run directly so tests drive it in-process. **This file is bootstrap + Socket.IO only —
   never add routes here.**
2. **Middleware — `middleware/`**: `auth.js` (stateful JWT: valid signature **must** map to a
   live `user_sessions` row → `req.user`), `rateLimit.js` (global + per-route + brute-force),
   `security.js` (hardening headers, audit log, `sanitizeServerErrors` that scrubs all 5xx bodies).
3. **Routes — `routes/<domain>.js`**: one `express.Router` per domain, ~75+ endpoints. DB logic
   shared by ≥2 routers → `services/`; pure helpers → `lib/`.
4. **Engine — `mathEngine/`**: generation, validation, adaptivity, rating, retention,
   misconceptions, lessons. See [`math-engine.md`](math-engine.md).
5. **Data access**: `db.js` (main read connection + schema baseline), `dbx.js` (dedicated
   serialized **write** connection + `withTransaction`), `migrations.js`, `cache.js`, `idempotency.js`.

### Why two DB connections
node-sqlite3 has a single-connection autocommit footgun. `dbx.js` holds a dedicated write
connection with a promise-chain mutex, so transactional work (purchases, claims) is isolated
from the main connection's autocommit reads. Reward routes use `withTransaction(work)` (`work`
throws → ROLLBACK; resolves → COMMIT) and `httpError(status, msg)` for control flow.

## Request lifecycle
```
CORS allow-list → security headers → express.json (10KB cap) → global rate limit (100/min, LAN-exempt)
→ [route rate limit] → authenticateToken (JWT sig + live session → req.user)
→ [idempotency middleware on reward routes] → handler
     ├─ reads: db.js (cached where hot via cache.js)
     ├─ writes/economy: dbx.withTransaction (ACID)
     └─ engine: mathEngine/*
→ JSON response (5xx bodies sanitized)
```

## Client layers

- **`data/network/`** — `ApiService` (Retrofit interface), `RetrofitClient` (OkHttp: base URL,
  auth-header interceptor, Idempotency-Key interceptor, 401→refresh authenticator; token in
  EncryptedSharedPreferences), `Models` (Gson DTOs), `SocketClient` (duels).
- **`Navigation.kt`** — Navigation3 graph: `Login → Register → Onboarding → MainTabs → {SoloGame, DuelGame, LegacyGame}`.
  Live duels render inside `ArenaStadiumTheme` (forced dark "stadium" surface).
- **`ui/screens/`** — `MainTabsScreen` (bottom-nav shell + CompositionLocal mounts), `DuelGameScreen`, `AuthScreens`.
- **`ui/feature/<domain>/`** — decomposed screens, one domain per package (9 packages).
- **`ui/components/`** — token-driven library (`DuoButton`, `GlassCard`, `NumeraIcon`, toasts,
  command palette, bottom sheet…), mounted once via CompositionLocals (`LocalToast`, `LocalCommandPalette`).
- **`theme/`** — design tokens + Material3. See [`design-system.md`](design-system.md).

## Where new code goes (the decision table)

| Adding… | Put it in |
|---|---|
| A server endpoint | `routes/<domain>.js` (new domain → new file + mount in `server.js`) |
| DB logic used by ≥2 routes | `services/<name>Service.js` |
| A pure helper (no DB/IO) | `lib/<name>.js` + a `test/<name>.test.js` |
| Schema change | a new version appended to `migrations.js` |
| An Android screen/feature | `ui/feature/<domain>/` |
| A reusable widget / dialog | `ui/components/` / `ui/dialogs/` |
| A design value | a token in `theme/` (never a raw literal) |

## Module boundaries
No feature reaches into another feature's internals. Server features talk through `services/`
and the DB; Android features are independent packages communicating via navigation callbacks
(`Navigation.kt`) and shared `data/network` DTOs. Cross-cutting client state rides on
CompositionLocals and `RetrofitClient` SharedFlows — see [`state-management.md`](state-management.md).
