# State management

The golden rule: **authoritative state lives on the server.** The client holds only
session/auth state and ephemeral UI state. There is no client-side store of truth for
coins/XP/rating/mastery — those are fetched and displayed, never computed.

## Auth & session (the most important state)

- **Token storage** — `RetrofitClient` keeps the access token in **EncryptedSharedPreferences**
  (AES-256-GCM, Keystore-backed), with a one-time migration from the old plaintext prefs and a
  plaintext fallback only if the Keystore store can't be created.
- **Stateful JWT** — a valid signature is not enough; `middleware/auth.js` also requires a live
  row in `user_sessions`. Deleting the session (logout/admin) invalidates the token server-side.
- **Refresh & rotation** — an OkHttp `authenticator` catches 401, calls `/api/auth/refresh` with
  the rotating refresh token, retries once. Concurrent 401s are serialized under `refreshLock` so
  only one refresh happens (avoids tripping the server's refresh-reuse detection). Refresh failure
  → `forceLogout()`.
- **Never log out on a network blip** — only a definite 401/403 (`Navigation.isAuthRejection`)
  clears the token. IOException/timeout/5xx keep the token and proceed optimistically. This is a
  deliberate invariant; do not "simplify" it into a logout-on-any-error.

## Client cross-cutting state

| State | Mechanism |
|---|---|
| Profile refresh signal | `RetrofitClient.profileRefreshFlow` (`MutableSharedFlow`) → `triggerProfileRefresh()` |
| Global logout signal | `RetrofitClient.logoutEventFlow` → collected in `Navigation.kt`, clears stack to Login |
| Equipped victory/tap cosmetics | `RetrofitClient.equippedVictoryKey` / `equippedTapKey` (`@Volatile`), refreshed by `MainTabsScreen` so the socket `DuelGameScreen` (no `User` object) can play them |
| Toasts / command palette | CompositionLocals (`LocalToast`, `LocalCommandPalette`) mounted once in `MainTabsScreen` |
| Per-screen UI state | Compose `remember`/`mutableStateOf`; data via `LaunchedEffect` → `ApiService` |
| Navigation | Navigation3 `rememberNavBackStack` in `Navigation.kt` |

## Server↔client contracts

- **DTOs** — `data/network/Models.kt` (Gson). Nested objects are fine, but **heterogeneous maps
  ride as JSON strings** (e.g. `interactiveVisualJson`, `socraticJson`, `lessonSections`) and are
  parsed on the client. When adding a field, update both `Models.kt` and the server response shape.
- **Idempotency** — `RetrofitClient` stamps a fresh `Idempotency-Key: <UUID>` on every POST lacking
  one (an *application* interceptor, so the key survives transport retries). Reward routes
  (`/complete`, `/purchase`, `/claim`, …) replay the stored result instead of double-granting.
- **Money path** — purchase/claim go through `dbx.withTransaction`: re-read price, conditional
  `WHERE coins >= ?` deduct, insert inventory; throw `httpError(400)` → ROLLBACK. A DB trigger
  blocks negative coins as a backstop.

## Server state & caching

- **Source of truth** — SQLite (`numera.db`, WAL). Reads via `db.js`; writes/economy via `dbx.js`.
- **Cache** (`cache.js`, in-process TTL, Redis-shaped) — only stable shared reads (shop catalog
  ~5min, league standings ~30s). **Never** cache balances or anything just mutated; per-user
  coins/inventory and live timers stay uncached.
- **Real-time** — Socket.IO duel state lives in `server.js` (matchmaking queue, room state); the
  server owns the question index and grades answers (clients send answer + ack, never the verdict).
