# Spec — Competition & Tournament Expansion

> Goal: turn Numera's single best moat — a serious math rating system (NRS) with real-time
> duels — into a full **competitive platform** ("the Chess.com of math"). Roadmap items #4/#14/#21.
> Status: design — **except Puzzle Rush (§4.1), whose server is implemented** (migration **v12**,
> `routes/puzzleRush.js`, tests). See "Implementation status" below.

## Implementation status (Puzzle Rush server — shipped on `feat/lifecycle-notifications`)
- ✅ Migration **v12** `puzzle_rush_runs` (server holds `current_answer`; `integrity_flag` seam;
  ms timestamps). Added to `USER_SCOPED_TABLES`.
- ✅ **`routes/puzzleRush.js`** mounted in `server.js`: `POST /api/puzzle-rush/start` (serves a
  problem, never its answer), `POST /api/puzzle-rush/submit` (server-authoritative scoring,
  difficulty ladder rising with score, 3-strike game-over with a **transactional coin reward**,
  out-of-sync guard, idempotency middleware), `GET /api/puzzle-rush/leaderboard` (best finished
  integrity-clean run per user + caller's personal best). Basic integrity seam flags
  superhuman-speed correct answers (`PUZZLE_RUSH_SUPERHUMAN_MS`, default 350) and excludes them
  from the board — the full `integrityEngine` (§5) is still TODO.
- ✅ **Client** fully wired: ApiService `startPuzzleRush`/`submitPuzzleRush`/`puzzleRushLeaderboard`
  + `PuzzleRush*` DTOs, and a playable **`PuzzleRushScreen`** (idle → leaderboard + personal best;
  playing → escalating MCQ with lives/score, MathText-rendered; over → score + coin reward +
  play-again) launched from a card in `ArenaScreen`. `assembleDebug` + `testDebugUnitTest` green.
- ✅ **Fixed a latent bug along the way:** `dbx.js` (the transaction connection) hardcoded
  `numera.db` and ignored `NUMERA_DB_PATH`, so every transactional write (shop, economy, this
  feature) hit the **dev** DB even under tests. Now honors `NUMERA_DB_PATH` like `db.js` — tests
  are properly isolated. `npm test` 111 pass / 0 lint errors.
- ✅ **`integrityEngine` v1** (`services/integrityEngine.js`, §5): difficulty-scaled timing floor
  (`humanFloorMs(level)`), per-answer `assessAnswer`, and a run `verdictForRun` (clean/review/
  cheat). Wired into Puzzle Rush: `integrity_flag` now holds the running fast-flag **count**;
  any flag excludes the run from the board, a **cheat verdict (≥3 flags) withholds the coin
  reward**. The client transparently tells the player when a run wasn't counted (spec ethics:
  no silent shadow-bans). Unit + integration tested. `npm test` 115 pass / 0 lint errors.
- ✅ **Async duels server** (§4.2, migration **v13** `async_matches`): `routes/asyncDuel.js` —
  friend-gated `POST /challenge` (generates one shared problem set, stored with answers, notifies
  the opponent), `GET /active`, `GET /:id` (answers stripped, once per player), `POST /:id/play`
  (server-scored; resolves the moment both have played; **transactional coin reward to the
  winner**; "your turn"/result nudges via the lifecycle notifier). Two-party deletion wired into
  account deletion (C4). Friend-gate / self / double-play / non-participant guards tested.
  `npm test` 118 pass / 0 lint errors. **v1 is coins-only — NRS/ranked async is a later item.**
- ⬜ **Next:** async-duel **client** (challenge-from-friends + matches list + play screen); wire
  `integrityEngine` into ranked **socket duels**; then the `server.js` arena extraction →
  tournaments. `integrityEngine` is the shared scorer those modes should call before committing
  rating/rewards.

## 1. What exists today
- **1v1 duels** over Socket.IO in `server.js` (lines ~539–1050): `rankedQueue`/`casualQueue`
  arrays, `matchmake(queueArray, isRanked)`, friend rooms (codes), **bot duels**, `submit_answer`,
  `duel_start`/`duel_end`, quest increment on duels.
- **NRS rating engine** (`mathEngine/ratingEngine.js`): Elo + velocity + tilt + **smurf signals** +
  seasons; persisted in `user_ratings`, `rating_history`, `season_ratings`, `competitive_profiles`.
- Seeded `generateProblem` (deterministic-capable) — the key enabler for fair shared problem sets.

## 2. What's missing
1. **Only 1v1.** No tournaments, no time-attack ladder, no async, no spectating, no team play.
2. **No real anti-cheat.** Math is *uniquely* cheatable (2nd device, calculator, Wolfram). Today
   only `smurf_signals` exists. Ranked integrity is the precondition for everything else.
3. The competition logic is **stuck in `server.js`** — the one remaining God-ish region. It must
   come out into a module before it can grow, or we regrow the God file (CLAUDE.md invariant).

## 3. Prerequisite refactor — extract the arena out of `server.js`
Move the queue/room/duel logic to `server/socket/arena.js` (or `services/arena/`), exporting an
`attachArena(io, deps)` that `server.js` calls during bootstrap. This:
- keeps `server.js` to bootstrap-only (the stated architecture goal),
- gives tournaments/async a home that isn't the bootstrap file,
- and is the natural seam to add the **Redis Socket.IO adapter** later for multi-node scale.
Do this **first**, guarded by a smoke test that a duel still starts/ends.

## 4. The four new modes (ship in this order — cheapest, highest-retention first)

### 4.1 Puzzle Rush — solo time-attack ladder  *(build first)*
Why first: **no opponent needed**, so it works async/offline-ish, scales infinitely, retains like
crazy (Chess.com's most-played mode), and reuses the generator + anti-cheat with zero matchmaking.
- Flow: client requests a run → server returns a **seeded stream** of increasing-difficulty items
  → client submits answers with timestamps → server scores (3 strikes ends the run) → leaderboard.
- Server-authoritative scoring (never trust client). Daily/weekly/all-time boards; daily seed is
  shared so everyone races the *same* ladder (fair, social).
- Schema (v12): `puzzle_rush_runs(id, user_id, seed, score, max_streak, duration_ms, started_at,
  ended_at, integrity_flag)`. Index `(user_id, score)`, `(seed, score)` for boards.
- Routes: `POST /api/puzzle-rush/start` → `{ runId, seed }`; `POST /api/puzzle-rush/submit`
  (idempotent per item index); `POST /api/puzzle-rush/finish`; `GET /api/puzzle-rush/leaderboard`.

### 4.2 Async / correspondence duels  *(build second)*
Why: removes the "both must be online" constraint — the biggest throughput limiter on a thin user
base. Challenge a friend → both solve the **same seeded set** within 24 h → resolve when both done
(or on expiry). Reuses ranking via NRS.
- Schema: `async_matches(id, seed, p1_id, p2_id, p1_score, p2_score, p1_done, p2_done, status,
  expires_at, created_at)`. Notify via the lifecycle system ("your turn", "result in").
- Routes: `POST /api/duel/async/challenge`, `GET /api/duel/async/active`, `POST /api/duel/async/play`.
- Resolution + rating update runs in `withTransaction` (idempotent), same as live duels.

### 4.3 Tournaments / Arenas  *(build third — the marquee feature)*
Lichess-style scheduled events: join window → automated pairing → score points → live standings →
rewards. Two pairing modes:
- **Arena** (continuous, re-pair-on-finish, score-streak bonuses) — best for many players, few rounds.
- **Swiss** (fixed rounds, pair on equal score) — best for structured/club events.
- Schema (v12): `tournaments(id, name, format, status, starts_at, ends_at, concept_filter,
  rating_floor/ceiling, reward_spec)`, `tournament_participants(tournament_id, user_id, score,
  performance, joined_at)`, `tournament_games(tournament_id, round, p1_id, p2_id, result, ...)`.
- A **pairing engine** module (`socket/pairing.js`, pure + unit-tested — fits the `lib/`/pure
  pattern): given standings, emit next pairings. Reuses the duel room machinery per game.
- Orchestration lives in `socket/arena.js`: a tournament is a state machine driving rounds, each
  round spinning up duel rooms, collecting results, re-pairing.
- Routes: `GET /api/tournaments` (upcoming/live), `POST /api/tournaments/:id/join`,
  `GET /api/tournaments/:id/standings` (cache ~5–10s like the league board).
- Rewards via the existing economy (coins/cosmetics, transactional). **No real-money entry/prizes**
  (keeps the gambling-regulation door shut — see ComplianceAudit's "keep it that way").

### 4.4 Spectating + replay  *(build fourth)*
- Spectators join the duel room read-only; server broadcasts sanitized state (no answer leak until
  reveal). Store a compact **transcript** (`duel_replays(duel_id, transcript_json, created_at)`) for
  later playback. Drives tournaments (watch the final) and social proof.

### 4.5 Team / club matches  *(depends on the Community spec's clubs)*
Club-vs-club aggregate scoring. Defer until clubs exist; schema slots into `tournament_*` with a
`team_id`.

## 5. Anti-cheat — `services/integrityEngine.js`  *(build in parallel from day one)*
**This gates ranked rewards for every mode above. Without it, the rating system is meaningless.**
Math is cheatable in ways chess isn't (instant external solver), so lean on behavioral signals:

| Signal | Source (much already exists) | Flag when |
|---|---|---|
| Superhuman speed | per-item `response_ms` (already tracked) | correct on a hard item faster than human floor |
| Accuracy vs. mastery | `user_mastery` + `smurf_signals` | near-perfect on items far above estimated ability |
| Consistency break | `tilt_tracking`, history | sudden step-change in performance distribution |
| Focus loss (web) | client `visibilitychange`/blur, paste events | tab-switch or paste mid-item |
| Input fingerprint | answer timing/keystroke cadence | bot-like uniformity |

- Output: a per-run/per-duel `integrity_score` + flags → (a) **withhold/adjust rating + rewards**
  for high-confidence cheats, (b) feed a **review queue** (reuse the moderation-queue pattern from
  H1) for borderline, (c) shadow-pool repeat offenders in matchmaking.
- Extend, don't reinvent: `ratingEngine` already models smurf signals — make `integrityEngine` the
  shared scorer all modes call before committing rating/rewards (inside the same transaction).
- **Honesty + ethics:** integrity scoring is behavioral profiling → honor `telemetry_enabled`,
  document in the policy, and surface *why* a result was flagged (no silent shadow-bans of minors).

## 6. Client (Android)
- Arena screen gains **mode tabs**: Live Duel · Puzzle Rush · Async · Tournaments.
- New screens under `ui/feature/arena/`: `PuzzleRushScreen`, `TournamentLobbyScreen` +
  `TournamentStandings`, `AsyncDuelScreen`, `SpectatorScreen`. Each is its own file (don't regrow
  `MainTabsScreen`/`ArenaScreen`).
- Reuse the duel UI + the gameplay components already carved out (`GameplayScreen` et al.).
- Web client (roadmap #17) is the natural home for spectating + tournament viewing at scale.

## 7. Scale note
Multi-node Socket.IO needs the **Redis adapter** (cache.js is already "Redis-shaped for a future
swap"). Do the `socket/arena.js` extraction now so the adapter is a config change, not a rewrite.
Not urgent until concurrent duels strain one node — but tournaments concentrate load (everyone at
once), so load-test before a big event.

## 8. Test plan
- `pairing.js` pure unit tests (arena + Swiss edge cases: byes, odd counts, equal scores).
- `integrityEngine`: seeded histories → expected flags; no false-positive on a fast-but-legit
  high-mastery user.
- Puzzle Rush scoring (server-authoritative), async resolution idempotency, rating commit in a
  transaction (rollback on integrity reject).
- Smoke: duel still starts/ends after the `server.js` extraction (regression guard).

## 9. Build order
1. **Extract arena** out of `server.js` (regression-guarded). 2. **Puzzle Rush** (solo, big win).
3. **`integrityEngine`** gating ranked rewards. 4. **Async duels**. 5. **Tournaments** (+ pairing
   engine). 6. **Spectating/replay**. 7. Team matches (after Community clubs). Redis adapter when
   scale demands.
