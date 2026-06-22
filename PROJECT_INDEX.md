# PROJECT_INDEX — Numera

> **Single entry point into the codebase.** Read this first. It is a map, not a manual —
> each row points you at the file or doc that holds the depth. For AI assistants, the
> token-efficient briefs live in [`ai/`](ai/README.md); the human deep-dives live in [`docs/`](docs/Architecture.md).

Numera is a gamified math-learning app: a **Jetpack Compose Android client** talking to a
**Node.js/Express + SQLite server** that owns all game logic. The server is authoritative;
the client renders and captures input but never computes rewards or touches the DB.

---

## 30-second orientation

| You want to… | Go to |
|---|---|
| Understand the whole system fast | [`ai/project-overview.md`](ai/project-overview.md) |
| Know where a feature's code lives | [`ai/feature-map.md`](ai/feature-map.md) |
| Understand request/data flow & layering | [`ai/architecture.md`](ai/architecture.md) · [docs/DataFlow.md](docs/DataFlow.md) |
| Touch math generation / adaptivity | [`ai/math-engine.md`](ai/math-engine.md) · [docs/MathEngine.md](docs/MathEngine.md) |
| Touch duels / Elo / rating | [`ai/competitive-system.md`](ai/competitive-system.md) |
| Touch colors / spacing / motion | [`ai/design-system.md`](ai/design-system.md) · [docs/DesignSystem.md](docs/DesignSystem.md) |
| Understand auth/token/state | [`ai/state-management.md`](ai/state-management.md) |
| Know what you must **never** break | [Invariants](#invariants-do-not-regress) below |

---

## Repository map

```
android/      Jetpack Compose client (Kotlin). Package com.example.numera
server/       Node.js/Express API + SQLite (authoritative backend)
docs/         Human subsystem deep-dives (22 docs + specs/). Start: docs/Architecture.md
ai/           Token-efficient AI briefs (this layer). Start: ai/README.md
scripts/      Repo tooling (server-quality-gate.cjs)
wolfram-mcp-server/   Standalone MCP helper (TypeScript) — not part of the app runtime
```

### Server (`server/`) — 43 routers, 17 services, 13 lib utils, ~36 engine modules
```
server.js          Bootstrap: middleware wiring + 43 router mounts + DB init + Socket.IO duels.
                   Exports { app, server, io, db, ready }; listens only when run directly.
config.js          Env config (JWT_SECRET, PORT, CORS origins) — single source.
routes/<domain>.js One express.Router per domain. New endpoint? It goes HERE, never in server.js.
services/          DB-touching logic shared by ≥2 routes (userService, ratingService, …).
lib/               Pure, unit-tested helpers (no DB/IO): progression, titles, questDefs, totp…
mathEngine/        The learning-intelligence engine (see ai/math-engine.md).
middleware/        auth.js (stateful JWT), rateLimit.js, security.js (headers/audit/sanitize).
db.js              SQLite schema baseline (CREATE IF NOT EXISTS) + initDb().
migrations.js      Versioned, run-once migrations (currently v63). Append; never edit a shipped one.
dbx.js             Serialized write connection + withTransaction() (ACID).
test/              107 node:test files (real route stack + unit). `npm test`.
```

### Android (`android/app/src/main/java/com/example/numera/`)
```
MainActivity.kt, Navigation.kt   Entry + Navigation3 graph (Login→Onboarding→MainTabs→games).
ui/screens/                      MainTabsScreen shell, DuelGameScreen, AuthScreens, PlacementTest.
ui/feature/<domain>/             Decomposed screens, one domain per package (9 packages).
ui/components/                   Token-driven reusable component library.
ui/dialogs/                      Cross-cutting dialogs.
data/network/                    ApiService (Retrofit), Models (Gson DTOs), RetrofitClient, SocketClient.
theme/                           Color, Type, Theme, DesignTokens (the design system).
```

---

## How to run & verify

| | Run | Verify |
|---|---|---|
| **Server** | `cd server; npm start` (port 3000; needs `.env` w/ `JWT_SECRET`) | `npm test` (107 files) · `npm run lint` (0 errors) |
| **Android** | `Start_Numera_Server.bat` + `Launch Numera.lnk` (BlueStacks) | `gradlew assembleDebug` · `gradlew testDebugUnitTest` (Robolectric) |
| **CI** | — | `.github/workflows/ci.yml` runs both suites on push to `main` + PRs |

A change is "done" only when its side's gates are green.

---

## Invariants (do not regress)

1. **Server is authoritative.** All XP/coins/rating/progression/mastery computed server-side. The client never computes rewards.
2. **Reward endpoints are idempotent.** They sit behind `idempotency` middleware; the client stamps an `Idempotency-Key` per POST (`RetrofitClient` application interceptor). Never double-grant.
3. **Money mutations are transactional.** `dbx.withTransaction` + conditional `WHERE coins >= ?` + a DB trigger that blocks negative coins.
4. **Schema changes append to `migrations.js`.** Never edit a shipped migration. `db.js` is the idempotent baseline only.
5. **New server endpoint → `routes/<domain>.js`.** Never add routes back into `server.js` (bootstrap + Socket.IO only). Shared DB logic → `services/`; pure helpers → `lib/` + a unit test.
6. **New Android screen → `ui/feature/<domain>/`.** Use `theme/` tokens — no raw `16.dp` / `Color(0x…)` / `RoundedCornerShape(…)` literals in new code.
7. **Split before God: a file >~600 lines** gets split by responsibility before it grows further.
8. **Never log out on a network blip.** Only a 401/403 drops the stored token (`Navigation.isAuthRejection`); IOException/timeout/5xx keep it.
9. **LaTeX in JS strings needs double backslashes** (`"\\frac"`). A single `\f`/`\p` is a silent control-char bug.
10. **Secrets** (`server/.env`, `numera.db`, backups) are gitignored — never commit them.

---

## Documentation index

**AI briefs** (`ai/`): project-overview · architecture · feature-map · math-engine · competitive-system · design-system · state-management
**Human docs** (`docs/`): Architecture · DataFlow · Security · MathEngine · ProgressionSystem · AchievementSystem · DesignSystem · BrandIdentity · EconomyModel + audits & `specs/`
