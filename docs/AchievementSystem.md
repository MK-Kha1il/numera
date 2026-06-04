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
## Progression chains
Achievements form **tiered chains** (e.g. 1 → 3 → 7 → 30 → 100 → 365-day streak). Each catalog
row carries `chain_id` (the ladder it belongs to) and `chain_order` (its rung); both are returned
by `GET /api/achievements`. The Android Achievements tab (`ProfileScreen`) groups by `chain_id`,
sorts by `chain_order`, and renders each chain as a horizontal milestone timeline with per-rung
states: **claimed** (green check), **unclaimed** (completed, ready to claim), **active** (in
progress, shows `progress/target`), and **locked** (a still-unclaimed earlier rung gates it). Chain
header labels are mapped from `chain_id` in `ProfileScreen` — **keep that `when` in sync** when you
add a chain, or it falls back to a title-cased id.

To add/extend a chain: give the new catalog rows a shared `chain_id` and sequential `chain_order`,
ensure `updateAchievements` knows the `target_type`, and add the header label mapping.
