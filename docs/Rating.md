# Competitive rating

One rating per domain (plus a global one), moved by both ranked duels and solo level sessions.

## The model

Each player has a `(μ, σ)` pair per domain in `user_ratings`: μ is the skill estimate (starts at
1500), σ the uncertainty (starts at 350, floor 50). The number players see is the conservative
display rating `floor(μ − 2σ)`, so it only climbs once the system is confident. Rank comes from
`displayRatingToRank` in `mathEngine/ratingEngine.js`; the first 5 sessions are placement.

Two kinds of evidence update the same belief:

- **Solo level sessions** — performance against the expected result for that level
  (`applySessionToRating`). This runs inside `POST /api/math/complete`, using the solves recorded on
  the serve ticket rather than anything the client reports.
- **Ranked duels** — outcome against the win probability for the two ratings
  (`applyDuelOutcomeToRating`), committed in `socket/duels.js`. Bot and casual matches don't touch
  the rating.

Both go through `services/ratingService.js`, which persists the new row, updates the season peak and
history, and then calls `syncCompetitiveMirror`.

## The mirror on `users`

A few columns on `users` are a cache of the global `user_ratings` row, written only by
`syncCompetitiveMirror`:

| Column | Value |
|---|---|
| `elo` | `round(global μ)` — used by matchmaking |
| `competitive_matches` | global session count — placement and beginner protection |
| `competitive_rank` | `displayRatingToRank(display, sessions)` |

`users.rank` is something else: the learning-level rank from `calculateRank(level)`, used by shop
gating and badges. Don't write competitive ranks into it.

## Integrity

A duel flagged by the timing checks (`lib/duelIntegrity.js`) is forfeited to the clean opponent.
The `μ − 2σ` display damps short streaks. Collusion between two accounts isn't detected yet
(see [Systems.md](Systems.md) §38).
