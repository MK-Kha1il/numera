# Competitive system (Arena)

The Arena is the product's main stage: duels, matchmaking, rating, integrity, seasons, clubs.
Depth: [docs/CompetitiveArenaRedesign.md](../docs/CompetitiveArenaRedesign.md),
[docs/CompetitiveEcosystemAudit.md](../docs/CompetitiveEcosystemAudit.md),
[docs/specs/Spec-RatingUnification.md](../docs/specs/Spec-RatingUnification.md).

## Match types

| Type | Transport | Code |
|---|---|---|
| **Live ranked duel** | Socket.IO | matchmaking + room state in `server.js`; client `SocketClient.kt` + `DuelGameScreen.kt` |
| **Bot duel** | REST | `routes/botDuel.js` (queue fallback after ~10s, or chosen) |
| **Async duel** | REST | `routes/asyncDuel.js` (play your turn, opponent plays later) |
| **Reasoning duel** | REST | `routes/reasoningDuel.js` |
| **Tournaments / challenges / live rooms** | REST + socket push | `routes/{tournaments,challenges,liveRoom}.js` |

## Server-authoritative grading (critical invariant)

For the live socket duel: `buildDuelProblemSet` **strips the answer** from what the client sees;
`applyDuelAnswer` grades server-side and the **server owns the question index**. The client sends
`answer + ack`, never a verdict. This closes both fake-correctness and score-farming. All REST
competitive graders and the realtime duel use `mathEngine/answerEquivalence.js`, so equivalent
forms (½ vs 0.5 vs 50%) grade correct. **Never move grading or indexing to the client.**

## Rating

- **Engine**: `mathEngine/ratingEngine.js`; **service**: `services/ratingService.js`; **route**:
  `routes/rating.js`. Duels use Elo; solo progression uses an NRS (Numera Rating) scale.
- **Known substrate caveat**: historically `users.elo`/`rank`/`competitive_matches` were written
  by *both* solo-NRS and duel-Elo in incompatible scales (the headline finding in
  CompetitiveEcosystemAudit.md). The substrate **unification** is tracked in
  `Spec-RatingUnification.md` and lives on a **separate branch** from this experience-layer work —
  confirm which branch you're on before touching shared rating columns. When in doubt, read the
  audit + spec first.

## Integrity / anti-cheat

`services/integrityEngine.js` + `lib/{duelIntegrity,integritySignals}.js` guard ranked duels.
A cheat verdict forfeits the match and applies a rating penalty. **Ranked matchmaking requires
fair-play (telemetry) consent** — `join_queue` rejects telemetry-off players; the Arena consent
dialog enables it. Casual/friend/bot stay open. `services/matchLog.js` records matches;
`lib/duelMoments.js` + `ui/feature/arena/DuelMoments.kt` drive the "clutch moment" stingers.

## Progression around rating

- **Leagues / seasons** — `routes/league.js`, `services/rankRewardService.js`; stone ladder
  (Quartz→Obsidian) per BrandIdentity. Season reward track + sinks have tests (`seasonRewards`, `seasonSink`).
- **Clubs & club wars** — `routes/{clubs,clubWars}.js`, social-team competition.
- **Ranks** — Bronze→Grandmaster cosmetic crests (`theme/RankBadge`), kept across the redesign.

## Where the Arena UI lives
`ui/feature/arena/` (screens: arena home, season, tournaments, challenges, async/puzzle-rush,
duel moments) + `ui/screens/DuelGameScreen.kt` (the live match, rendered in `ArenaStadiumTheme`).
