# Data Flow

How a request travels through Numera, and the two canonical loops (solving a problem,
buying from the shop).

## Request lifecycle (server)

```
client request
  → CORS (allow-list)
  → security headers
  → express.json (10KB cap)
  → global rate limiter (100/min, LAN-exempt)
  → [route-specific rate limiter, e.g. login 10/min]
  → authenticateToken (verify JWT signature + live session row → req.user)
  → [idempotency middleware on reward routes]
  → route handler
       ├─ reads: db.js main connection (cached where hot — cache.js)
       ├─ writes/economy: dbx.withTransaction (dedicated write connection, ACID)
       └─ engine calls: mathEngine/* (generation, validation, rating, retention…)
  → JSON response
```

## Loop 1 — Solve a problem (the core learn/play loop)

1. **Client** opens a level → `GET /api/math/problems?level=N`.
2. **Server** generates problems via `mathGenerator` → `mathEngine` (templates, distractors,
   difficulty by mastery/Elo), enriches each with a tip, a concept lesson (`lessonSections`),
   and optionally an `interactiveVisualJson` spec (adaptive — see MathEngine.md). Returns
   problems + lesson.
3. **Client** (`SoloGameScreen`) renders the lesson, then the problem + answer options +
   (when appropriate) an interactive manipulative (WebView canvas).
4. On answer, the client may post telemetry (`/api/math/telemetry`, calculator usage), and on
   level completion posts `POST /api/math/complete` **with an `Idempotency-Key`**.
5. **Server** (`math/complete`) computes XP/coins, updates mastery, quests, streak, league,
   achievements, and the learner model — all server-authoritative. Wrong answers are saved as
   mistakes (`user_mistakes`) and scheduled for spaced repetition (`srs_reviews`).
6. **Client** shows the recap (rewards, mastery delta) from the server response.

## Loop 2 — Shop purchase (economy integrity)

1. `GET /api/shop` → catalog (cached `shop:catalog`, 5 min) + this user's coins/inventory.
2. `POST /api/shop/purchase` with `Idempotency-Key`.
3. Server runs a **transaction**: re-read price, check `coins >= price`, deduct conditionally,
   insert inventory. Throws `httpError(400,...)` on insufficient funds → ROLLBACK. A replayed
   key returns the original response (no double-spend). A DB trigger blocks negative coins.

## Real-time duels (Socket.IO)

`SocketClient` connects with the JWT in the handshake (`io.use` verifies it). Players
`join_queue`; a matchmaking interval pairs by Elo (expanding window) or falls back to a bot
after ~10s. Duel results feed the rating system (Elo + NRS) and persist server-side.

## Idempotency end-to-end

`RetrofitClient` installs an **application** OkHttp interceptor that stamps a fresh
`Idempotency-Key: <UUID>` on every POST without one. Because it's an application interceptor,
the key survives OkHttp's transport-level retries, so a dropped-connection retry dedupes
server-side. (A user manually re-issuing a call after a timeout makes a new request → new key;
to dedupe that, pass an explicit reused key from the call site.)

## Caching rules (`cache.js`)
- Cache only stable, shared reads (shop catalog, league standings ~30s).
- **Never** cache balances or anything just mutated transactionally; per-user coins/inventory
  and live timers stay uncached.
