# Progression System

Numera has several intertwined progression tracks, all computed **server-side**. This doc maps
each track to its source of truth so exact constants are read from the code rather than
duplicated here. The system-by-system status lives in [Systems.md](Systems.md).

## Tracks

### 1. XP & levels (the learning ladder)
- `users.xp` (XP into the current level) and `users.level`. Each level costs `level × 100` XP —
  `lib/progression.applyXp` is the only implementation of that carry-over loop.
- `users.level` is also the level-map frontier: levels up to it are playable. A level session only
  unlocks the next level when it is the **frontier** level and has at least one solve; a claimed
  completion of a locked level is refused (`levelLocked`, audit-logged).
- The **Archive** (`/api/archive/search`, `/api/legacy/puzzles`) is an effectively infinite bank of
  standalone exercises, difficulty-tagged by stars (1–5★).

### 2. Solo sessions & rewards (the hub)
- `POST /api/math/complete` finalizes every solo mode. Solo answers are graded on the device, so the
  server anchors the session: each problem-serving endpoint issues a **serve ticket**
  (`services/soloSessionService.js`); `/complete` must consume one for the same mode (+ level) and
  caps solves at the problems that ticket served. No ticket → nothing granted (`rewardWithheld`).
- XP and coins come only from `lib/soloRewards.js` (per-mode table + the level-mode APRA formula,
  accuracy bonus); then the streak ×1.5 XP, 10% critical ×2 coins, XP-booster ×2 modifiers.
  Coins and league points taper after the day's first 15 solo sessions (XP never tapers).
- The grant, the ticket and the quest counters commit in **one transaction**; mastery, streak,
  competitive profile, rating, rank rewards and achievements fan out after the commit.
- The daily puzzle's reward is paid (once, server-graded) by `POST /api/math/daily-puzzle/submit`;
  `/complete` only echoes it for the recap.

### 3. Mastery (per-concept skill)
- `user_mastery` counts lifetime correct solves per strand (milestones → mastery-up celebration,
  100 → earned Mastery Frame); the learner model (`learnerModel.js`, `masteryEngine.js`) turns
  per-concept evidence into a multi-dimensional mastery profile that drives the orchestrator, the
  skill tree and the Mastery Map. Distinct from XP ("how much have they done").

### 4. Coins & economy
- `users.coins`, earned-only. Every faucet and sink is transactional with conditional deductions
  (plus a DB trigger against negative balances) and records into the aggregate economy ledger
  (`services/economyLedger.js`, `GET /api/analytics/economy`). See [EconomyModel.md](EconomyModel.md).

### 5. Streak & daily engagement
- The streak counts **local calendar days on which the learner solved something**
  (`lib/streak.js`; the day uses the client-reported timezone offset). `users.streak_day` is the
  last credited day.
  - Any solve path calls `creditStreak` → settles missed days, then credits today once.
  - Login and app-open (`/api/auth/me`) call `settleStreak` → missed days only: Streak Shields cover
    them (only if they cover every missed day); one uncovered day → `fading` (solving today
    restores it); more → reset, with the lost run stashed for the 48 h coins-paid repair.
  - Milestone relics at 3/7/30/100 days, plus the comeback medal.
- Daily quests (`lib/questDefs.js`) reset on the learner's **local calendar day**; any route that
  bumps a quest counter first calls `ensureDailyReset`. The Today composer (`/api/today`) orders the
  day and reports streak safety from `streak_day`.

### 6. Weekly league (cohort competition)
- `users.league` (Quartz → Onyx → Jade → Topaz → Obsidian) and `users.league_points` (XP earned
  this week, tapered like coins). One **global** week (Monday 00:00 UTC — `lib/leagueWeeks.js`);
  the first request after the boundary performs a single transactional rollover
  (`services/leagueService.js`): top 3 with points (or 100+) promote, bottom 3 of a 5+ league
  demote, everyone's points reset. `GET /api/league/leaderboard` shows standings + the countdown.

### 7. NRS — Numera Rating System (competitive)
- `mathEngine/ratingEngine.js`, `services/ratingService.js`, `/api/rating/*`. One μ/σ rating per
  domain + global; display rating = μ − 2σ. **Solo level sessions and ranked duels move the same
  number**: `/complete` applies a ticket-anchored level session
  (`applySoloSessionToRatings`), duels apply outcome-vs-expected. Also velocity, tilt, smurf
  signals, seasons (peaks, soft reset, reward track), Apex, titles, honor. Persisted in
  `user_ratings`, `rating_history`, `season_ratings`; `users.elo/competitive_rank` are a mirror.

### 8. Commitment & relics (long-term motivation)
- `user_commitment_history` (daily solve volume → consistency index + burnout risk),
  `user_commitment_relics`; `/api/commitment/*` (status, recommit a fading climb, streak repair).

## Adding/altering progression
- Reward math lives in `lib/` (pure, unit-tested) and the relevant `routes/` + `services/`.
- A new solo mode needs a serve ticket at its serve endpoint and a `SOLO_MODES` row.
- Anything persisted needs a schema change via `migrations.js` (never edit a shipped migration).
- Keep the client display-only — it must read rewards from the server response.
