# Progression System

Numera has several intertwined progression tracks, all computed **server-side**. This doc maps
each track to where it lives so the exact constants can be read from the source of truth
(`server.js` handlers + `mathEngine/`), rather than duplicating numbers that may drift.

## Tracks

### 1. XP & levels (the learning ladder)
- `users.xp`, `users.level`. XP is granted on `POST /api/math/complete`; levels gate the
  curriculum (which concepts/templates appear). Level→concept mapping lives in
  `mathEngine/lessons.js` (`levelToConceptId`) and `normalizeLevelForGenerator`.
- The **Archive** (`/api/archive/search`, `/api/legacy/puzzles`) is an effectively infinite
  bank of past/standalone exercises, difficulty-tagged by stars (1–5★).

### 2. Mastery (per-concept skill)
- `user_mastery` (one row per user) tracks correct counts per concept family; the
  `learnerModel`/`adaptive` modules turn this into an ability estimate that drives difficulty
  and whether interactive scaffolding is shown. This is the "are they actually learning"
  signal, distinct from XP (which is "how much have they done").

### 3. Coins & economy
- `users.coins`. Earned via completion/quests; spent in the shop. All spends are transactional
  with a non-negative guard (see [Security.md](Security.md)). See the shop loop in
  [DataFlow.md](DataFlow.md).

### 4. Streak & daily engagement
- `users.streak`, `users.last_active`; daily puzzle (`/api/math/daily-puzzle`) and quests
  (`/api/quests`, reset daily) drive habit. Streak resets are handled in
  `checkAndResetQuestsAndLeagues`.

### 5. Leagues (cohort competition)
- `users.league`; `GET /api/league/leaderboard` ranks players within a league (standings
  cached ~30s, per-user timer live). Periodic resets rotate cohorts.

### 6. NRS — Numera Rating System (competitive Elo+)
- `mathEngine/ratingEngine.js` + the `/api/rating/*` and `/api/engine/competitive/*` routes.
  Beyond raw Elo (`users.elo`, `users.rank`), NRS models **velocity** (rating momentum),
  **tilt** (recent volatility), **smurf signals**, and **seasons** (peak tracking, season
  end). Used by duels (Socket.IO matchmaking) and ranked play. Persisted in `user_ratings`,
  `rating_history`, `season_ratings`, `competitive_profiles`.

### 7. Commitment & relics (long-term motivation)
- `user_commitment_history`, `user_commitment_relics`; `/api/commitment/*`.
  `updateCommitmentAndBurnout` balances pushing the learner vs. burnout; relics are unlocked
  milestones (`unlockRelic`).

## Where rewards are computed
`POST /api/math/complete` is the hub: it fans out to XP, coins, mastery, quests, streak,
league, achievements, mistakes/SRS, and the learner model. It is **idempotent** (replay-safe)
rather than transactional (it's a large fan-out of fire-and-forget updates; idempotency covers
its real failure mode — double-grant on retry).

## Adding/altering progression
- Reward math lives in the relevant `server.js` handler (moving to `routes/` + `services/`).
- Anything persisted needs a schema change via `migrations.js` (never edit a shipped
  migration). Keep the client display-only — it must read rewards from the server response.
