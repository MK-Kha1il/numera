# Project overview

**Numera** is a full-stack, gamified math-learning app positioned as *math-as-a-sport*: the
Arena (competitive duels) is the main stage; solo learning is "training." A Jetpack Compose
Android client talks to a Node.js/Express + SQLite server.

## The one big idea: the server is authoritative

Every rule that affects progression, economy, or rating runs on the server. The client renders
problems and captures input; it **never** computes XP, coins, rating, or mastery, and never
touches the DB. This keeps the game cheat-resistant and lets logic evolve without shipping a
new APK. Internalize this before changing anything — most "bugs" that look client-side are
really "the client displayed what the server returned."

## Stack

| Layer | Tech |
|---|---|
| Client | Kotlin, Jetpack Compose, **Navigation3**, Retrofit/Gson/OkHttp, Socket.IO client, Material3 |
| Server | Node.js, Express 4, **sqlite3@6** (WAL), Socket.IO, JWT (`jsonwebtoken`), argon2 |
| Auth | Argon2id hashing, stateful JWT (signature **and** live `user_sessions` row), rotating refresh tokens, TOTP MFA |
| Tests | Server: `node:test` (107 files). Android: Robolectric Compose UI tests (41 files). CI on every push/PR. |
| Tooling | ESLint v9 + Prettier (server); Gradle/AGP (Android, JDK 26 currently) |

## Scale (approximate)

- **508** tracked files. Server ~13k LOC of logic + large generated content; Android ~22k LOC.
- **151** math concepts across 8 strands (the catalog is data in `mathEngine/`, not code).
- **~43** Express routers, **17** services, **13** pure lib helpers, **~36** engine modules.
- Schema at migration **v63**; 0 `TODO`/`FIXME`/`HACK` markers in the tree.

## Maturity & what this means for changes

This codebase has been through multiple stabilization/hardening sprints (God-file splits, test
nets, ultra-reviews). It is **disciplined, not messy** — debt is near-zero. Therefore:

- Prefer **surgical, verified** changes over sweeping rewrites. The structure is intentional.
- Match the surrounding idiom (Express routers on the server; feature packages on Android).
- The biggest files are now **content/data** (`conceptLessons.js`, `templates.js`, `db.js`),
  not tangled logic. Treat them as data: edit the relevant record, don't "refactor" the file.

## Where to go next

- "Fix/extend feature X" → [`feature-map.md`](feature-map.md) (the lookup table).
- "How does a request flow / where does code go" → [`architecture.md`](architecture.md).
- Auth/token/session questions → [`state-management.md`](state-management.md).
