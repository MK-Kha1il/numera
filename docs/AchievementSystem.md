# Achievement System

Achievements reward milestones (streaks, totals, mastery, competitive feats). Like all
progression, they are **server-authoritative**.

## Data model
- **`achievements`** — the *catalog* (definition rows: id, title, description, target,
  reward). Re-seeded on every server boot (`DELETE` + re-insert; safe because FKs are off
  during init). Treat it as code-defined, not user data.
- **`user_achievements`** — *per-user progress*: `progress`, `completed_at`, claim status.
  This table is **never dropped** on boot (a historical bug wiped it every restart; fixed —
  it is `CREATE TABLE IF NOT EXISTS` only). Indexed by `user_id` and a claimed-state index.

## Lifecycle
1. Gameplay updates progress through `updateAchievements(userId, …)` (called from
   `math/complete` and other reward paths).
2. When `progress` reaches the catalog `target`, the server stamps `completed_at`.
3. `GET /api/achievements` returns catalog + per-user progress + completion/claim state.
4. `POST /api/achievements/claim` (idempotent, transactional) grants the reward once and marks
   it claimed.

## Critical correctness rule (do not regress)
**Completion is `completed_at > 0`, not `progress >= target`.** For streak-type achievements,
`progress` resets to 0 when the streak breaks, but `completed_at` persists. The client must
treat an achievement as completed/claimable when `completed_at > 0` (the server's source of
truth) — computing completion purely from `progress` hides legitimately-earned, unclaimed
rewards. The Android model carries `completed_at: Long` for exactly this.

## Claiming integrity
`achievements/claim` runs in a `dbx.withTransaction` and behind `idempotency` middleware:
the reward is granted exactly once even on retry/replay.

## Extending
- Add a row to the catalog seed in `db.js` (id, title, target, reward).
- If it needs a new progress signal, update `updateAchievements` to increment it.
- The mission's roadmap calls for **progression chains** (e.g. 3-day → 7-day → 30-day streak
  tiers); today's catalog is mostly flat. Implementing chains is a catalog + `updateAchievements`
  change plus a client display of the tier ladder — no new architecture required.
