# Spec — Rating Unification (Competitive Audit, Phase 0)

> Goal: end the competitive incoherence documented in `docs/CompetitiveEcosystemAudit.md` §1 by
> making **one `μ/σ` rating per domain** the single source of competitive truth, fed by **both** solo
> sessions and ranked duels. "Solo + duels move ONE number per domain." (Owner decision, 2026-06-19.)
>
> Status: **Phase 0 COMPLETE & verified**, and Phases 1–3 substantially shipped on
> `feat/competitive-rating-unification`. Increments 1–4 (keystone engine; server duels-feed-NRS +
> mirror + migration v47; Android debrief + per-domain `CompetitiveRankCard`; 2nd ladder unwired) are
> done. Since then: divisions/pips/promotion + seasonal reward track + Act-Rank peak badges
> (`afdd5cf`,`0d84242`); titles, match history, rivals, rating-history timeline, Reasoning Arena +
> replays (Phase 2/3); **hidden-MMR matchmaking + provisional `?`** (`1a61cf8`, closing the Increment-2c
> follow-up); **ranked-loss → SRS review** (`0070405`). Server `npm test` 985 pass / 0 lint errors;
> Android `assembleDebug` + `testDebugUnitTest` green. See `docs/CompetitiveEcosystemAudit.md` §0.5 for
> the full Top-25 status. Remaining work is the audit's Phase 4–5 (scale/social + deeper integrity).

## The decision

Three options were weighed (see audit §10 / the AskUserQuestion log). Chosen: **Unify into NRS.**
A ranked duel is *evidence about the same latent skill* as a solo session, so it updates the same
`(μ, σ)` belief — scored by **outcome-vs-expected** (head-to-head) instead of
**performance-vs-baseline** (solo). The separate K=32 duel-Elo (`lib/duelIntegrity.resolveDuel`) is
retired as a *rating* mechanism; its integrity/forfeit logic is kept.

## Source of truth vs. mirror — the core model

- **Authoritative store:** `user_ratings(user_id, domain, mu, sigma, display_rating, sessions_count,
  last_updated)`. This is already clean and per-domain. *Everything competitive derives from it.*
- **The bug today:** the denormalised `users.elo` / `users.rank` / `users.competitive_matches`
  columns are written *independently* by two systems in two scales (audit §1). Fix: they become a
  **derived mirror** of `user_ratings` where `domain='global'`, written **only** by one shared
  helper, never by feature code.

### Mirror contract (`syncCompetitiveMirror(userId)`)
After *any* rating change, recompute from `user_ratings` global:
| Column | Value | Read by |
|--------|-------|---------|
| `users.elo` | `round(global.mu)` | socket matchmaking, `publicProfile` |
| `users.competitive_matches` | `global.sessions_count` | matchmaking beginner-protection, placement |
| `users.competitive_rank` *(NEW, migration v47)* | `displayRatingToRank(global.display_rating, global.sessions_count)` | `publicProfile`, leaderboard chips |

### `users.rank` stays the *progression* rank — do not conflate
`users.rank` is currently the **level rank** (`calculateRank(level)`) written by
`math.js`/`quests.js`/`mistakes.js`/`onboarding.js`, and it is woven into shop gating and badges.
**Keep that meaning.** The duel path's clobbering of `users.rank` with an Elo rank is a *bug we
remove* (Increment 2). Competitive rank lives in the new `competitive_rank` mirror + the live
`/api/rating/profile`. (Follow-up, out of Phase 0: decide whether shop `required_rank` should gate on
`competitive_rank` — its comment says "competitive rank" but it has always read the level rank;
changing it could lock players out of owned-tier items, so it is deliberately deferred.)

## Increment 1 — Keystone engine fn ✅ SHIPPED
- `mathEngine/ratingEngine.js`: added pure `applyDuelOutcomeToRating(ratingRow, {outcome,
  opponentMu, opponentSigma})` and factored out shared `winProbability(...)` (also now used by
  `computeMatchQuality`). Returns the **same shape** as `applySessionToRating`, so the existing
  `persistRatingUpdate` path persists solo and duel evidence identically.
- `test/ratingDuelUpdate.test.js`: 9 tests (symmetry, draws, upsets, σ-scaling within the K band,
  shape compatibility, safe defaults). Full suite 953 pass / 0 fail, 0 lint errors.

## Increment 2 — Server: feed duels into NRS, derive the mirror, fix matchmaking

**2a. Extract `services/ratingService.js`** (CLAUDE.md: DB logic shared by ≥2 routes → `services/`).
Move from `routes/rating.js` (no behaviour change to the solo path): `getRatingRow`,
`persistRatingUpdate`, `maybeUpdateSeasonPeak`. Add:
- `syncCompetitiveMirror(userId, cb)` — the mirror contract above (one `UPDATE users SET elo=?,
  competitive_matches=?, competitive_rank=? WHERE id=?`).
- `applyDuelResultToRatings({ userId, opponentId|botElo, outcome, domain='global' }, cb)` — fetch the
  player's + opponent's global `user_ratings` row, call `applyDuelOutcomeToRating`, `persistRatingUpdate`
  (`game_mode='duel'`), `maybeUpdateSeasonPeak`, `nrsUpdateVelocity`, then `syncCompetitiveMirror`.
- Refactor `routes/rating.js`'s `/session` to call `syncCompetitiveMirror` instead of the ad-hoc
  `UPDATE users SET elo=round(mu)...` at `rating.js:289` (removes one half of the collision).

**2b. Rewrite the socket duel commit** (`server.js` `processPlayerDuelResult` / `finalizeDuel`):
- Replace the K=32 Elo write (`server.js:1184`) with `applyDuelResultToRatings` per human player.
  `outcome` = 1/0.5/0 from the resolved winner. Opponent rating = opponent's global `μ/σ`.
- **Bots do NOT move NRS rating** (decision): the bot-fallback path stays rating-neutral. This *also
  closes the bot-Elo-farm risk* (audit §3.9 / risk #3) for free — only human ranked duels move the
  number. Keep coins/quest/challenge-ticket effects as-is.
- Keep `resolveDuel`'s **integrity verdict + forfeit** (cheat → forfeit to clean opponent). The
  cheat penalty changes from "−15 Elo" to "withhold the gain + apply a fixed σ-scaled `μ` penalty";
  encode it as `outcome=0` against own rating with a small extra debit, or skip the gain entirely.
- `duel_end` payload: emit `{ domain, ratingDelta, newDisplayRating, newRank, mu }` instead of
  `{ eloChange, newElo, newRank }`. (Drives Increment 3.)

**2c. Matchmaking on the unified number** (`server.js` `matchmake`):
- It already pairs on `users.elo`, which now consistently equals `round(global μ)` for *all* play —
  so pairing quality is fixed simply by 2a/2b making `elo` coherent. No structural change required
  for Phase 0; wiring `computeMatchQuality`/σ into pairing is a Phase 1 item (audit opp #7/#11).
- `competitive_matches` is now the global session count → beginner-protection branch becomes reliable.

**2d. Migration v47** (`migrations.js`, append after v46):
1. `ALTER TABLE users ADD COLUMN competitive_rank TEXT DEFAULT 'Unranked (Placement: 0/5)'`.
2. **Backfill/reconcile** the mirror from `user_ratings` global for every user that has one:
   `UPDATE users SET elo = round(mu), competitive_matches = sessions_count` from their global row;
   set `competitive_rank` via the same threshold table (do it in JS in the migration `up`, reading
   `user_ratings`, since `displayRatingToRank` is JS — or inline the SQL CASE). Users with no
   `user_ratings` row keep defaults.
3. Note: existing `users.elo` values are currently corrupted (last-writer-wins); this backfill makes
   them consistent with the authoritative store. No data loss — `user_ratings` was always the truth.

## Increment 3 — Android client (`ui/feature/arena`, `ui/feature/profile`)
- **`data/network/Models.kt`:** `DuelEndPayload` (or socket DTO) — replace `eloChange/newElo` with
  `ratingDelta/newDisplayRating/newRank/domain/mu`. (Server is authoritative; client only displays.)
- **`DuelGameScreen` / `ArenaScreen` debrief:** show "Algebra rating +18 → Diamond II" instead of an
  Elo number; reuse the existing rank-up surfacing.
- **`ProfileScreen` / rating card:** lead with **per-domain ranks** ("Main: Algebra · Diamond II");
  the `/api/rating/profile` response already carries everything (mu/sigma/displayRating/rank per
  domain) — this is mostly presentation. (Sets up audit Top-25 #6, "surface the 9 domains.")
- `assembleDebug` + `testDebugUnitTest` (Robolectric) must stay green; extend `ArenaScreenTest` /
  add a duel-debrief render assertion for the new payload.

## Increment 4 — Retire the second rank ladder + docs
- `lib/progression.js`: deprecate `calculateRankFromElo` (the 1100–2700 ladder). Everything
  competitive uses `displayRatingToRank` (the NRS 450–2000 ladder) — **one published ladder**.
  Leave `calculateRank(level)` (progression/level rank) intact; it is a different, legitimate concept.
- Update `docs/CompetitiveEcosystemAudit.md` §1 table + the canonical memory once shipped.
- Add an in-app "How your rating works" blurb (audit opp #10/#13) — the per-session explanation
  already exists; just expose the model summary.

## Test plan
- **Pure (done):** `ratingDuelUpdate.test.js`.
- **Service:** unit-test `syncCompetitiveMirror` (mirror matches global) + `applyDuelResultToRatings`
  (human moves rating, bot does not; winner up / loser down; persists a `game_mode='duel'` history row).
- **Integration:** extend `test/duelEndToEnd.test.js` — assert post-duel that `user_ratings` global
  moved, `users.elo == round(mu)`, `users.competitive_matches` incremented, **bot duels leave rating
  unchanged**, and a cheat verdict still forfeits.
- **Migration:** a test that seeds a corrupted `users.elo` + a `user_ratings` global row, runs v47,
  and asserts the mirror is reconciled.
- **Regression:** full `npm test` + `npm run lint` (0 errors) after each increment; Android
  `assembleDebug` + `testDebugUnitTest` after Increment 3.

## Rollout & risk
- **Stage behind increments** — each lands green independently; no flag needed because the mirror is
  always derivable from the untouched authoritative store.
- **No data loss:** `user_ratings` was always authoritative; we are only fixing the denormalised
  cache + the duel update rule.
- **Player-visible change:** duel results now move the same number as solo (intended). Frame it in
  the debrief copy ("your Algebra rating") so it reads as a feature, not a reset.
- **Watch:** duels feeding `μ` could in theory be farmed via collusion (audit §3.9 #87) — Phase 0
  relies on the existing integrity verdict + conservative `μ−2σ` display; collusion detection is a
  separate audit item (opp #79), not a Phase 0 blocker.

## Traceability
Closes/advances audit items: §1 smoking gun (weaknesses #1–#7, #13, #16, #18), risk #1 & #3;
Top-25 #1, #2, #8; sets up #3, #6, #13. Companion: `docs/CompetitiveEcosystemAudit.md`,
`docs/specs/Spec-CompetitionExpansion.md`.
