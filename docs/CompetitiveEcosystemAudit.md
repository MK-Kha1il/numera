# Numera — Competitive Ecosystem Audit

> Mission: turn Numera's competitive layer into one of the best competitive *learning* systems
> ever built — the progression clarity of Rocket League, the prestige/identity of Chess.com, the
> engagement of top ranked games — **without sacrificing learning quality**.
>
> Scope: a full, code-grounded audit of every competitive subsystem (matchmaking, rating, ranks,
> seasons, rewards, identity, social, integrity, retention, onboarding), benchmarked against
> Chess.com, Lichess, Rocket League, League of Legends, VALORANT, Overwatch 2, Kahoot!, Prodigy.
>
> Date: 2026-06-19. Canonical artifact; supersedes the competitive sections of prior reviews.
> Companion specs: `docs/specs/Spec-CompetitionExpansion.md`, `docs/EconomyModel.md`.

---

## 0. How to read this

Every item is tagged so you can sort by what matters:

- **Impact** — H/M/L: how much it moves competitive quality + learning.
- **Effort** — S/M/L: engineering cost.
- **Edu** — ★ if it materially improves *learning* (not just engagement).
- **Ret** — ☆ if it materially improves *retention*.

The headline lists (Top 25 / Top 10s / roadmap) are at the end; the subsystem analysis and the
weakness/opportunity catalogs come first so the rankings are defensible.

---

## 0.5. Implementation status (last updated 2026-06-20)

> The audit below is the original 2026-06-19 analysis, preserved as written. This section tracks what
> has since been **built** on `feat/competitive-rating-unification`. **Phases 0–3 of the roadmap are
> substantially shipped; the §1 "smoking gun" is fixed.**

**The rating incoherence (§1 / risk #1) is resolved.** `user_ratings` (per-domain `μ/σ`) is now the
single source of truth; `users.elo`/`competitive_matches`/`competitive_rank` are a derived mirror
written only by `services/ratingService.syncCompetitiveMirror`; duels update the *same* NRS belief via
`applyDuelOutcomeToRating`; the second Elo rank ladder is retired. The bot Elo farm (risk #3) is closed
— **only human ranked results move the rating**. See `docs/specs/Spec-RatingUnification.md`.

**Top-25 status:**

| # | Item | Status | Anchor |
|---|------|--------|--------|
| 1 | Unify the rating substrate | ✅ Shipped | `afdd5cf` |
| 2 | Duels update the canonical rating | ✅ Shipped | `afdd5cf`,`e5dfe92` |
| 3 | Reduce speed weight; reward accuracy/depth | ✅ Shipped | `8cf9687` |
| 4 | Seasonal Rank Reward track | ✅ Shipped | `afdd5cf` |
| 5 | Act-Rank seasonal peak badge | ✅ Shipped | `afdd5cf` (Past-Seasons card) |
| 6 | Surface 9 domains as specialties/"main" | ✅ Shipped | `e5dfe92` (`CompetitiveRankCard`) |
| 7 | Divisions + pips + promotion + rank-up moment | ✅ Shipped | `0d84242` |
| 8 | Plug bot Elo farm + server-validate metrics | 🟡 Partial | bot farm closed (`afdd5cf`); broad metric-validation still open (#29/#95) |
| 9 | Competitive profile showcase | ✅ Shipped | `8552cff` + profile cards |
| 10 | Reasoning/self-explanation ranked mode | ✅ Shipped | `d76813f` (Reasoning Arena) |
| 11 | Hidden-MMR matchmaking + provisional marker | ✅ Shipped | `1a61cf8` |
| 12 | Titles system | ✅ Shipped | `737877f`,`10cc189` |
| 13 | One published rank ladder | ✅ Shipped | `afdd5cf` (RANK_LADDER) |
| 16 | Match history + duel replays | ✅ Shipped | `c079993`,`7c50add` |
| 21 | Seasonal history timeline + career peak | ✅ Shipped | `5519cd4` |
| 25 | Mistake-review-into-SRS after ranked losses | ✅ Shipped | `0070405` |

**Remaining (Phase 4–5 — larger, multi-session product systems, not yet built):**
- #14 Seasonal-exclusive (scarce) cosmetics · #15 Per-domain ranked queue · #17 Club rating + club
  seasons/ladder · #18 Calculator/collusion/multi-account integrity layer · #19 Live class/group
  competitive rooms · #20 Competitive onboarding (placement narrative + rank reveal) · #22 Shareable
  rank/result cards · #23 Apex (leaderboard-only) tier above Grandmaster · #24 Honor/commendation
  system. These are the §9 Phase 4 (Scale & social) and Phase 5 (Integrity) tracks.

---

## 1. Executive summary — the one thing to fix first

**Numera does not have a competitive system. It has five overlapping ones that contradict each
other, and three of them write the same database columns in incompatible units.**

The competitive surface is, in reality:

| # | System | Rating unit | Rank ladder | Mechanic | Where |
|---|--------|------------|-------------|----------|-------|
| 1 | **NRS** (NumeraRating) | Bayesian `mu/σ`, display `= μ−2σ` | Bronze III @450 → Grandmaster @2000 | solo session vs absolute difficulty curve, 9 domains | `mathEngine/ratingEngine.js`, `routes/rating.js` |
| 2 | **Duel Elo** | classic Elo, K=32, base 1000 | Bronze III @1100 → Grandmaster @2700 | real-time 1v1 head-to-head MCQ race | `server.js` Socket.IO |
| 3 | **Level rank** | learning level 1..N | Bronze..Grandmaster by level | XP/progression | `lib/progression.js calculateRank` |
| 4 | **Weekly Leagues** | `league_points` (= XP earned) | Bronze/Silver/Gold | Duolingo-style weekly bracket, top-30 reset | `routes/league.js`, `userService` |
| 5 | **Event ladders** | per-event score | none (coins only) | weekly tournaments, club wars, puzzle rush, async duels, bot duels | `routes/tournaments.js`, `clubWars.js`, `puzzleRush.js`, `asyncDuel.js`, `botDuel.js` |

### The smoking gun (a real, shipping bug, not a design opinion)

Three `users` columns are written by **two different systems in two different scales**:

- `users.elo`
  - Duel commit (`server.js:1184`): `SET elo = <Elo ± 32>` (1000-base classic Elo).
  - NRS solo commit (`routes/rating.js:289`): `SET elo = Math.round(globalAfter.mu)` (~1500-base belief mean).
  - **Every solo session overwrites the duel Elo with `μ`; every duel overwrites `μ` with an Elo
    delta.** Matchmaking reads `users.elo`, so the queue is pairing on a number that flip-flops
    between two unrelated scales depending on what the player last did.
- `users.competitive_matches`
  - Duel: `+1` per duel. NRS: `= sessionsCount` (solo session count).
  - These stomp each other, so the **placement counter ("Placement: x/5") is meaningless** and the
    "beginner protection" branch in `matchmake()` keys off a corrupted value.
- `users.rank`
  - Duel: `calculateRankFromElo` (ladder 2). `math.js`/`quests.js`/`mistakes.js`: level rank (ladder 3).
  - So the rank *string shown on the profile* is whichever system wrote last — it can disagree with
    the rank the rating screen computes from NRS display rating (ladder 1).

A player can therefore be **"Silver" (profile), "Platinum I" (rating screen), "Gold" (league), and
matched as if 1500-rated** — all at once, from the same data. No competitive system survives this.
**Everything else in this audit is secondary to unifying the rating substrate.**

### The second structural problem: competition currently optimizes the *wrong* learning behavior

Every competitive mode (duels, tournaments, puzzle rush, club wars) is a **speed race over 4-option
MCQs**. That format rewards fast recall and 25%-baseline guessing — the *opposite* of the
concept-first / Socratic / transfer pedagogy that is the app's genuine moat. The learning engine is
fed in the background (good), but the *player-facing incentive* in competition is "answer fast,"
which trains memorization. A world-class competitive *learning* system must make **understanding the
thing that wins**, not typing speed.

### What is genuinely excellent and must be protected

- **NRS conservative display (`μ−2σ`)** is the best smurf-resistance primitive in the whole app and
  is more sophisticated than raw Elo. Keep it.
- **Per-domain ratings (9 domains)** are a real differentiator chess can't match: a player can be
  "Diamond in Algebra, Gold in Geometry." This is the seed of an identity system nobody else has.
- **Per-session rating explanations** (`buildRatingExplanation`) — transparency most ranked games
  refuse to give. Keep and expand.
- **Server-authoritative grading everywhere** (answers never leave the server, `areEquivalent`
  equivalence engine) — the integrity foundation is sound.
- **Telemetry-gated ranked + no-silent-bans ethic** — the right posture.
- **Lazy self-perpetuating seasons/tournaments/wars** — operationally clean, no cron needed.

---

## 2. Benchmark comparison

For each benchmark: **(a) what they do better, (b) what we already do better, (c) the transferable
idea, (d) what NOT to copy.**

### Chess.com
- **Better than us:** one rating per time-control that *everyone trusts*; titled players (GM/IM/FM)
  as aspirational apex identity; deep game history + analysis/replay of every game; puzzle rating
  (Puzzle Rush/Battle) as a *separate respected ladder*; clean "rating graph over time"; bots with
  named personalities and rating; massive content→rating loop (lessons raise play strength).
- **We do better:** **per-domain skill** (chess has one number); **uncertainty-aware** display
  (chess uses Glicko but hides σ); **transparent per-result explanations**; learning is the point,
  not a side mode.
- **Transfer:** titled-player apex tier (leaderboard-only, e.g. "Numerist"/"Math Master" earned, not
  bought); replayable match history; a *trusted single* competitive number per domain; puzzle ladder
  as first-class.
- **Don't copy:** rating obsession that makes losing feel catastrophic; pay-to-see-your-own-stats.

### Lichess
- **Better than us:** instant, frictionless matchmaking (seek graph); fully transparent open rating
  (Glicko-2 with rating deviation shown); zero-cost everything; arena & swiss tournaments that scale
  from 5 to 50,000 players; rating *floors* and provisional `?` marker.
- **We do better:** structured curriculum-linked rating; reward/identity layer; mobile-native.
- **Transfer:** **provisional-rating marker** (`?` until σ is low) — we already have σ, just surface
  it; **Glicko-2-style RD decay**; arena format (continuous re-pairing for a fixed window) is a
  perfect fit for our async tournaments.
- **Don't copy:** bare-bones identity/cosmetics (we want more prestige than Lichess).

### Rocket League
- **Better than us:** the gold standard of **progression clarity** — visible divisions with pips,
  explicit **promotion/demotion** moments, distinct rank tiers per playlist, **seasonal Rank Rewards
  track** (reach a rank → earn that tier's exclusive item, locked to that season), MMR decay only for
  top ranks, clear "you're close to ranking up."
- **We do better:** richer skill model; educational substance; per-domain skill is our "playlists."
- **Transfer (high value):** **divisions with pips + promotion/demotion series**; **seasonal reward
  track keyed to peak rank** (the single biggest reward gap we have); per-domain "playlists" with
  independent ranks; "placement matches" at season start.
- **Don't copy:** opaque MMR (RL hides it and players hate it — we should *show* μ−2σ).

### League of Legends
- **Better than us:** LP/promo tension; apex tiers (Master/GM/Challenger) that are leaderboard-ladder,
  not threshold; ranked splits with split rewards; honor system; clash (team tournaments); hard
  anti-smurf + ranked restrictions for new accounts; end-of-season rewards gated on rank.
- **We do better:** transparency; learning value; no toxic team-dependency.
- **Transfer:** apex ladder tiers; **honor/sportsmanship system** (peer commendations → cosmetic
  rewards, fits our "no silent bans" ethic); split rewards; new-account ranked restriction (play N
  games before ranked) as a smurf/boost speed bump.
- **Don't copy:** demotion shields/complexity overload; toxicity-prone team ranked; grindy.

### VALORANT
- **Better than us:** **Act Rank** (a season-history badge that immortalizes your *peak* that act —
  pure identity gold); RR (rank rating) with clear gain/loss preview; "you need to win more
  decisively" performance-aware adjustments for new players.
- **We do better:** transparency; we already store season peak per domain (just don't surface it).
- **Transfer:** **Act-Rank-style seasonal peak badge** — we already persist `season_ratings.peak_display`,
  we just need to mint a permanent badge from it. Lowest-effort identity win in the whole audit.
- **Don't copy:** convergence pain (smurf-heavy early seasons).

### Overwatch 2
- **Better than us:** rank updates in *batches* with a clear summary ("you went up a division");
  per-role ranks (maps to per-domain); end-of-match cards/commends.
- **We do better:** per-result transparency (OW2 hides MMR aggressively — a community sore point).
- **Transfer:** **batched rank-up *ceremony*** (a designed moment, not a silent threshold cross);
  role/domain ranks; commendation cards.
- **Don't copy:** hidden MMR + "competitive update every 5 games" opacity.

### Kahoot!
- **Better than us:** electric *live* group competition; instant social fun; teacher-driven
  classroom mode; streak/podium drama; speed-scoring that feels exciting.
- **We do better:** durable rating, depth, individual progression, integrity.
- **Transfer:** **live class/group rooms** (we have club infrastructure + class codes already);
  podium/celebration drama; teacher-hosted live events.
- **Don't copy (critical):** **speed-points-as-the-score trains guessing over understanding** — this
  is exactly the trap our duels already fell into. Kahoot is fun but pedagogically shallow; we must
  *not* let speed dominate the competitive score.

### Prodigy
- **Better than us:** kid-facing meta-game wrapper (pets/battles) that drives huge engagement; strong
  parent/teacher dashboards; curriculum-aligned, grade-mapped.
- **We do better:** real skill rating; integrity; not pay-to-win; honest pedagogy.
- **Transfer:** light **narrative/meta wrapper** for younger learners (optional skin over duels);
  teacher assignment of competitive events.
- **Don't copy (critical):** Prodigy's monetization gates *power/engagement* behind a membership and
  the "math" is often a thin gate between game rewards — it's the cautionary tale of competition
  *undermining* learning. Keep math the point.

### Cross-benchmark synthesis — the five principles that transfer
1. **One trusted number per ladder, shown honestly** (Chess/Lichess) → unify our rating substrate.
2. **Visible progression with promotion moments** (RL/LoL) → divisions, pips, promo, ceremonies.
3. **Seasonal scarcity creates the chase** (RL/VALORANT/LoL) → reward track + Act-Rank peak badges.
4. **Identity is the long-term retention engine** (Chess titles, VALORANT peaks) → surface our 9
   domains, peaks, history, replays.
5. **Make the *skill* win, not the *speed*** (anti-Kahoot/Prodigy) → competition must reward
   understanding, or it corrodes the product's reason to exist.

---

## 3. Subsystem deep-dive

### 3.1 Matchmaking
- Two matchmakers exist. The **real** one is the in-memory `matchmake(queueArray, isRanked)` in
  `server.js`: pairs on `|elo diff|` (window 100, +15/s) AND a level window (3, +2 per 3s), with a
  beginner-protection branch and a **10-second bot fallback**. The **good** one —
  `GET /api/rating/matchmaking` with `computeMatchQuality` (win-prob model, tilt-aware) — is a
  *display-only suggested-opponents list* that never creates a match. The sophisticated matchmaker is
  unused for actual pairing.
- It pairs on `users.elo`, which (see §1) is corrupted by NRS overwrites → skill estimate feeding
  the queue is unreliable.
- **10s → bot** means at low population almost every ranked match is a bot, and (see Integrity) bot
  wins grant **+15 Elo** → the queue is simultaneously fake competition *and* an Elo faucet.
- No separate hidden MMR; no provisional handling in the queue (σ ignored by `matchmake`); no decay;
  no dodge/leave penalty; no re-queue protection.

### 3.2 Rating system
- **NRS is strong but mis-framed.** It is a *performance-vs-absolute-difficulty* model (compare your
  session to `levelToExpectedBaseline`), not a *relative-skill* model. It answers "did you beat the
  curve," not "are you better than your opponent." Branding it as the competitive rating while a
  *separate* Elo runs the duels means the number players grind in solo has no defined relationship to
  the number that moves when they actually compete.
- **Conservative display (`μ−2σ`)**: excellent for smurf resistance and "earn your rank," but it
  means a returning player's **inactivity σ-boost lowers their visible rank** (μ−2σ drops as σ rises)
  — re-calibration is sensible but reads as a punishing demotion if unexplained.
- **Duel Elo**: vanilla K=32, base 1000, floored at 100. No placement calibration (new duelist
  starts at flat 1000 with full K), no decay, no provisional. Farmable via bots.
- **Global = domain-influence-weighted blend** (`domainInfluenceWeight`, weak domains weighted up to
  0.80). Reasonable design, but it means the headline number is a derived blend users can't intuit.
- **Understandability:** per-session explanation is great; the *system-level* story is incoherent
  because of the 4-ladder problem.

### 3.3 Ranks & divisions
- **Three rank ladders share the same tier names** (Bronze..Grandmaster) with **different
  thresholds** (`displayRatingToRank` @450–2000 vs `calculateRankFromElo` @1100–2700 vs
  `calculateRank` by level). Same word, three meanings.
- Divisions exist (III/II/I) but are **cosmetic thresholds**, not LP/pips with promotion series.
  Rank changes happen silently mid-result — no RL/LoL "promotion match," no rank-up moment.
- No apex/leaderboard tier above Grandmaster (no Challenger/titled equivalent).
- Pacing: NRS bands are 100 display points each; with K up to 120 early, a new player can cross
  several bands in a session (whiplash), then crawl once σ shrinks (stall). Not a tuned ladder curve.

### 3.4 Seasons
- NRS seasons: 90 days, soft reset `μ' = 0.7μ + 0.3·1500`, σ inflated ×1.6 (good shape). Auto-rollover
  is clean. **But duel Elo (`users.elo`) is *not* season-reset** by `rolloverSeason` — and is anyway
  overwritten by NRS — so "seasons" only half-apply.
- **Season rewards are top-3 coins only.** No reward *track* (reach-a-rank → earn this season's
  item), no seasonal-exclusive cosmetics, no end-of-season rank badge, no placement matches at start.
  This is the single largest reward gap measured against RL/VALORANT/LoL.
- Season peak per domain *is stored* (`season_ratings.peak_display`) but never minted into a
  permanent identity artifact (the VALORANT Act-Rank pattern is right there, unused).

### 3.5 Promotions / demotions
- None as *events*. No promo series, no demotion shield, no "you're 1 win from ranking up," no
  protection on first loss after promotion. Rank is a silent function of a number.

### 3.6 Rewards
- Rank rewards (`rankRewardService`) = cumulative avatars/banners + badges + coins, keyed off the
  **duel** rank string. Issues:
  - **Grandmaster grants the same avatars as Master** (no GM-exclusive cosmetic) — the apex feels
    identical to the tier below it.
  - Permanent + account-bound → no scarcity, no seasonal chase, nothing to *re-earn*.
  - Keyed on `rank.includes('Silver')` substring of the *duel* ladder — so NRS rank, the more
    sophisticated number, grants no cosmetics at all.
  - Not tied to **specialty** (no "Geometry Diamond" exclusive) despite per-domain ratings existing.
- No **titles** system (Chess.com's most prestigious identity layer). Badges exist but aren't
  displayed *as* a flexible title next to the name.
- Event rewards (tournaments/wars) are coins only — no trophies, no event badges, no streak rewards.

### 3.7 Player identity
- Rich latent material, badly under-surfaced:
  - **Specialties** (9 domain ratings) — the best identity hook in the app — are buried in a profile
    card, not expressed as "Main: Algebra · Diamond II."
  - **Peak ratings** stored per domain per season but no **career peak**, no peak badge, no "best
    ever" trophy.
  - **No seasonal history** timeline ("S1: Gold · S2: Platinum · S3: Diamond").
  - **No match history / replays / head-to-head records** — you can't review a duel, see who you've
    played, or build rivalries.
  - **No competitive showcase** on the public profile (titles, peak, mains, season medals).

### 3.8 Social systems
- Clubs (teams, owner governance, leaderboard by summed level) + Club Wars (3-day async head-to-head)
  + friends leaderboard + async/friend duels. Solid foundation.
- **But club competition ranks by summed *level/XP*** (grindable, not skill) — a club of grinders
  beats a club of strong mathematicians. No club *rating*, no club seasons, no club-vs-club ladder
  standings, no recurring league.
- No rivalries, no spectating, no friend-challenge ladder, no shareable results, no chat in duels.

### 3.9 Anti-cheat & competitive integrity
- The only cheat signal is **superhuman speed** (`integrityEngine.assessAnswer`, timing floor by
  level). This catches bots/scripts. It does **not** catch the most likely real cheating:
  - **External calculator / solver / answer-sharing** makes you *slower*, not faster → invisible.
  - **MCQ format** gives a 25% guess floor → a colluder/guesser is hard to distinguish from a
    struggling learner.
  - **Win-trading / collusion** between two accounts → undetected.
  - **Multiple accounts / boosting / smurfing** → no device fingerprint, no IP heuristic, and
    **guest mode makes alt creation free** → trivial.
  - **Intentional derank** → tilt is tracked but deliberate losing isn't.
- Smurf detection (`evaluateSmurfSignals`) only *logs a flag* (`SMURF_FLAG`), takes **no action** (no
  σ widening, no rating acceleration, no review queue), and only within `sessionsCount < 30`.
- Telemetry opt-out (default off) ⇒ no behavioral enforcement at all; **casual duels are never
  assessed**, so a cheater simply plays casual or opts out.
- **Bot Elo farm** (confirmed): ranked queue → 10s → bot (`isCasual:false`) → `resolveDuel` with
  `p2IsBot` grants **+15 Elo on win / −10 on loss**, bot is 80% accuracy and beatable → net-positive
  ranked Elo by grinding bots. (The REST `botDuel.js` is correctly coins-only + daily-capped; the
  *socket* bot path is the hole.)

### 3.10 Learning impact
- As shipped, competition **promotes memorization and guessing**: speed-MCQ scoring (`score += 20`,
  speed bonus), 5 problems, ~20s each, 4 options. None of the app's signature pedagogy (Socratic
  probes, self-explanation, worked examples, transfer contexts) is present in competitive modes.
- The learning engine *is* fed (`engineFeed`, telemetry) so mastery tracking still benefits — but the
  *incentive the player optimizes* is speed, which is pedagogically backwards.
- There is no competitive mode where **explaining / reasoning / showing understanding** is how you
  win. This is the biggest missed opportunity to make competition *reinforce* education.

### 3.11 Onboarding into competition
- No competitive onboarding: no first-duel tutorial, no "we're calibrating your rating" framing, no
  placement-match narrative, no rank-reveal ceremony, no explanation of which of the 4 ladders is
  "your rank." Tilt-break nudge exists (good). No ranked new-account restriction.

---

## 4. Top 100 competitive weaknesses

> Ranked roughly by severity within themed blocks. Tag = Impact/Effort.

### A. Rating substrate & coherence (the foundation)
1. `users.elo` written by both NRS (`μ`) and duels (Elo) in incompatible scales — mutual corruption. **H/M**
2. `users.competitive_matches` stomped by both → placement counter meaningless. **H/S**
3. `users.rank` written by both duel-Elo and level-rank → profile rank is last-writer-wins. **H/S**
4. Four rank ladders share Bronze..Grandmaster names with different thresholds. **H/M**
5. NRS rank and duel rank have no defined relationship. **H/M**
6. Matchmaking pairs on the corrupted `users.elo`. **H/M**
7. The good matchmaker (`computeMatchQuality`) is display-only; never makes matches. **H/M**
8. NRS is performance-vs-curve, not relative-skill, yet branded as *the* competitive rating. **M/L**
9. Global rating is a hidden domain-weighted blend users can't intuit. **M/M**
10. Duel Elo has no placement calibration (flat 1000, full K from game 1). **M/S**
11. Duel Elo has no decay, no provisional, no floor logic beyond `max(100,…)`. **M/S**
12. σ exists but the queue (`matchmake`) ignores it entirely. **M/S**
13. No single "this is your competitive rank" source of truth surfaced to the user. **H/S**
14. Season reset doesn't touch duel Elo. **M/S**
15. Inactivity σ-boost silently lowers visible rank with no explanation. **M/S**

### B. Matchmaking
16. 10s bot fallback ⇒ most low-pop ranked matches are bots. **H/S**
17. No hidden MMR distinct from displayed rank. **M/M**
18. Beginner protection keys off corrupted `competitive_matches`. **M/S**
19. Level window + Elo window can pair very different *skill* at same level. **M/M**
20. No dodge/leave/AFK penalty. **M/S**
21. No re-queue or repeat-opponent avoidance. **L/S**
22. No queue for specific domains (can't choose "rank up my Geometry"). **M/M**
23. No party/duo or team queue. **M/L**
24. Matchmaking quality never measured/logged for tuning. **M/S**
25. Bot difficulty (`player.elo − 50 + rand·100`) tracks the corrupted Elo. **M/S**

### C. Rating quality & fairness
26. Calculator penalty (−10%) exists in NRS but duels can't detect calculators at all. **M/M**
27. MCQ 25% guess floor inflates performance scores. **M/M**
28. Speed weighting (20%) lets fast guessers outrate careful solvers. **H/M ★**
29. `comboBonus`/`speedBonus` are client-supplied to `/api/rating/session` (trust surface). **H/S**
30. No anti-inflation/deflation control loop (only an admin read-only signal). **M/M**
31. Domain→global blend can be farmed via easy domains (partially mitigated by baselines). **L/M**
32. No rating floors per rank (can fall infinitely). **M/S**
33. K-factor whiplash early (up to 120) then stall (min 8). **M/M**
34. No "rating uncertainty" (`?`) marker shown despite σ being available. **M/S**
35. Tilt widens MM tolerance but only when *both* players are tilted (`*0.6`). **L/S**

### D. Ranks, divisions, pacing
36. Divisions are thresholds, not LP/pips. **H/M ☆**
37. No promotion series / rank-up moment. **H/M ☆**
38. No demotion protection/shield. **M/M**
39. No apex (leaderboard-only) tier above Grandmaster. **M/M**
40. Grandmaster threshold (display ≥2000) likely unreachable given μ−2σ math. **M/S**
41. Generic LoL-clone tier names; no math identity. **M/M**
42. No "you're close to ranking up" signal. **M/S ☆**
43. Rank changes aren't batched into a digestible summary. **M/S**
44. Band widths uneven across the curve. **L/M**
45. No per-domain rank surfaced as a ladder. **M/M ★**

### E. Seasons
46. Season rewards = top-3 coins only; no reward track. **H/M ☆**
47. No seasonal-exclusive cosmetics. **H/M ☆**
48. No end-of-season rank badge (despite stored peaks). **H/S ☆**
49. No placement matches at season start. **M/M**
50. No mid-season splits/acts. **M/M**
51. Season peak never minted into identity. **H/S ☆**
52. 90-day seasons may be too long for retention cadence. **M/S**
53. No season-end ceremony/recap. **M/S ☆**
54. No "season story" (rank graph, biggest win). **M/M**
55. Duel ladder has no season concept at all. **M/M**

### F. Rewards
56. Grandmaster gives same cosmetics as Master. **M/S**
57. Rewards permanent → no scarcity/chase. **M/M ☆**
58. Reward track keyed to duel ladder; NRS rank rewards nothing. **M/S**
59. No titles system. **H/M ☆**
60. Rewards not tied to specialty/domain. **M/M ★**
61. No event trophies (tournaments/wars pay coins only). **M/S**
62. No win-streak / milestone competitive rewards. **M/S ☆**
63. No prestige/"re-earn" loop for maxed players. **M/M ☆**
64. Cosmetics roster is tiny (a handful of avatars/banners). **M/L**
65. No animated/rarity-tiered apex cosmetics. **L/M**

### G. Player identity
66. 9 domains not expressed as specialties/"main." **H/S ★☆**
67. No career peak rating. **M/S ☆**
68. No seasonal history timeline. **H/M ☆**
69. No match history. **H/M**
70. No replays. **M/L ★**
71. No head-to-head records / rivalries. **M/M ☆**
72. No competitive profile showcase. **H/M ☆**
73. Titles/badges not shown as a flexible name title. **M/S**
74. No "verified strength" framing (provisional vs established). **M/S**
75. No public competitive profile page (web reach). **M/M**

### H. Social
76. Club competition ranks by summed level/XP, not skill. **M/M**
77. No club rating / club seasons / club ladder standings. **M/M ☆**
78. No rivalries or recurring head-to-head. **M/M ☆**
79. No spectating. **L/L**
80. No live group/class competitive rooms (despite class codes). **M/L ☆**
81. No in-duel chat / emotes / GG. **L/M**
82. No shareable result cards (viral loop). **M/S ☆**
83. No leaderboard brackets (friends/club/region) beyond top-N global. **M/M ☆**
84. Global leaderboard ranks by level/XP (grindable), not skill. **M/S**
85. No "challenge a specific rank/friend in ranked." **M/M**

### I. Integrity
86. Anti-cheat only catches speed; calculators/solvers undetected. **H/M**
87. Answer-sharing / collusion / win-trading undetected. **H/M**
88. No multi-account/device/IP detection; guest mode trivializes alts. **H/M**
89. Smurf detection only logs; takes no action. **M/S**
90. Smurf check disabled after 30 sessions. **L/S**
91. Casual duels never integrity-assessed. **M/S**
92. Telemetry opt-out ⇒ zero enforcement. **M/M**
93. Bot Elo farm via ranked-queue fallback (+15/win). **H/S**
94. No intentional-derank detection. **M/M**
95. Client-supplied session metrics to `/rating/session`. **H/S**

### J. Learning impact & onboarding
96. Competition is speed-MCQ → trains memorization/guessing. **H/L ★**
97. No reasoning/explanation-based competitive mode. **H/L ★☆**
98. No competitive onboarding / placement narrative / rank reveal. **M/M ☆**
99. No ranked new-account restriction (smurf/boost speed bump). **M/S**
100. No competitive daily/weekly objectives beyond a generic "duels" quest. **M/S ☆**

---

## 5. Top 100 improvement opportunities

> The constructive mirror of §4. Tag = Impact/Effort; ★ Edu, ☆ Retention.

### A. Unify the substrate (do these first)
1. Pick **one canonical competitive rating per domain** = NRS `μ/σ`; retire duel Elo as a separate column. **H/M**
2. Make duels *update NRS* (treat a duel as a session with a relative-skill term) instead of a parallel Elo. **H/M ★**
3. Stop NRS writing `users.elo`; give duels their own column or fold both into `user_ratings`. **H/S**
4. Separate `competitive_matches` for placement from solo session count. **H/S**
5. Single `rank` source of truth derived from canonical rating; stop level/duel both writing it. **H/S**
6. One published rank ladder + thresholds, reused everywhere. **H/S**
7. Wire `computeMatchQuality` into actual pairing. **H/M**
8. Add hidden MMR = `μ`; display = `μ−2σ`. **M/M**
9. Show provisional `?` until σ < threshold. **M/S**
10. Document the unified model in `docs/` + an in-app "how rating works" page. **M/S ★**

### B. Progression clarity (the Rocket League layer)
11. Divisions with **pips/LP** and visible gain/loss preview. **H/M ☆**
12. **Promotion series** at division boundaries. **H/M ☆**
13. **Demotion shield** (one grace loss). **M/M**
14. "You're 1 win from ranking up" signal. **M/S ☆**
15. Batched **rank-up ceremony** moment. **M/S ☆**
16. Per-domain rank as a first-class ladder ("rank up your Geometry"). **H/M ★☆**
17. Apex leaderboard tier ("Numerist"/"Math Master", top-N only). **M/M ☆**
18. Tuned band curve (even pacing, reachable apex). **M/M**
19. Rank-progress widget on the home/arena screen. **M/S ☆**
20. Math-flavored tier names/iconography (keep tiers, reskin identity). **M/M**

### C. Seasons & rewards (the chase)
21. **Seasonal Rank Reward track** (reach rank X this season → exclusive item). **H/M ☆**
22. **Act-Rank-style peak badge** minted from `season_ratings.peak_display`. **H/S ☆**
23. Seasonal-exclusive, never-returning cosmetics. **H/M ☆**
24. End-of-season **rank badge + recap card**. **M/S ☆**
25. Placement matches at season start. **M/M**
26. Splits/acts within a season (shorter cadence). **M/M ☆**
27. Prestige loop for maxed players (re-earn with a marker). **M/M ☆**
28. Domain-specialty exclusive cosmetics ("Algebra Diamond" frame). **M/M ★**
29. Event trophies + permanent event badges. **M/S ☆**
30. Win-streak / milestone competitive rewards. **M/S ☆**
31. Season leaderboard rewards beyond top-3 (top-1% tiers). **M/S ☆**
32. "Season story" rank graph + biggest win. **M/M ☆**
33. Unique animated apex cosmetic per season. **L/M**
34. Coin rewards rebalanced to not inflate economy (see `EconomyModel`). **M/S**
35. Reward preview gallery (show what's chase-able). **M/S ☆**

### D. Identity (the long-term engine)
36. "**Main domain**" + per-domain rank row on profile. **H/S ★☆**
37. Career peak rating + peak badge. **M/S ☆**
38. Seasonal history timeline. **H/M ☆**
39. Match history list. **H/M**
40. Duel replays (we store problems + answers already). **M/L ★**
41. Head-to-head records + rivalry tracking. **M/M ☆**
42. Competitive profile showcase (titles, peaks, mains, medals). **H/M ☆**
43. Flexible **title** next to username. **M/S ☆**
44. Provisional/established "verified strength" framing. **M/S**
45. Public web competitive profile (SEO + reach). **M/M ☆**

### E. Make competition *educational* (the differentiator)
46. **Reduce speed weight; reward accuracy/depth** in competitive scoring. **H/S ★**
47. **Reasoning duels**: win by selecting the correct *justification*, not just the answer. **H/L ★☆**
48. **Self-explanation rounds** in ranked (we have `selfExplainEngine`). **H/M ★**
49. **No-MCQ / typed-answer** competitive mode (we have `areEquivalent`). **M/M ★**
50. **Transfer-context** competitive problems (we have `transferEngine`). **M/M ★**
51. Per-domain competitive ladders that *teach* the domain as you climb. **H/M ★☆**
52. "Explain to win" co-op-vs-ladder mode (peer-rated explanations). **M/L ★**
53. Difficulty-honest scoring: harder problems worth more (partly via `diffMultiplier`). **M/S ★**
54. Competitive results feed mastery/retention visibly ("this duel raised your Algebra retention"). **M/S ★☆**
55. Mistake-review after ranked losses tied to SRS. **M/S ★☆**

### F. Matchmaking & modes
56. Domain-selectable ranked queue. **M/M ★**
57. Real-time **arena** (continuous re-pairing, Lichess-style) for events. **M/L ☆**
58. Swiss/bracket tournaments at scale. **M/L ☆**
59. Party/duo & team ranked. **M/L ☆**
60. Dodge/leave penalties + reconnection grace. **M/S**
61. Repeat-opponent avoidance. **L/S**
62. Ranked vs casual cleanly separated everywhere. **M/S**
63. Seek-graph-style "open challenge" board. **M/M ☆**
64. Asynchronous **ladder** (climb at your own pace). **M/M ☆**
65. Matchmaking-quality telemetry for tuning. **M/S**

### G. Social & community
66. **Club rating + club seasons + club ladder**. **M/M ☆**
67. Recurring club leagues with promotion/relegation. **M/L ☆**
68. **Live class/group competitive rooms** (Kahoot-style, using class codes). **M/L ★☆**
69. Rivalries & rematch prompts. **M/S ☆**
70. Shareable result/rank cards (viral). **M/S ☆**
71. In-duel GG/emotes (bounded, safe). **L/M**
72. Spectating featured matches. **L/L**
73. Friend-challenge ranked invites. **M/S ☆**
74. Leaderboard brackets: friends/club/percentile, not just top-N. **M/M ☆**
75. Honor/commendation system (peer sportsmanship → cosmetics). **M/M ☆**

### H. Integrity (raise the cost of cheating)
76. Plug the **bot Elo farm** (bot wins grant 0 rating, or remove ranked bot fallback). **H/S**
77. Server-validate all session metrics; stop trusting client combo/speed. **H/S**
78. Detect calculator/solver via answer-pattern + impossible-accuracy-at-speed-floor *both ends*. **M/M**
79. Collusion/win-trade detection (repeat-pairing + lopsided outcomes). **M/M**
80. Device/IP heuristics + ranked gate for guests/new accounts. **M/M**
81. Smurf flag → *action* (σ widening, accelerated K, review queue). **M/S**
82. Intentional-derank detection (sudden performance collapse). **M/M**
83. Statistical "too good for rank" review queue (admin). **M/S**
84. Optional proctored/high-stakes mode (typed answers, time-boxed). **M/L ★**
85. Make integrity enforcement apply in casual too (lightweight). **M/S**

### I. Onboarding & retention into competition
86. Competitive onboarding: first-duel tutorial + rank reveal. **M/M ☆**
87. Placement-match narrative ("calibrating your rating"). **M/S ☆**
88. Competitive daily/weekly objectives (per-domain). **M/S ☆**
89. "Climb to next rank" goal surfaced on home. **M/S ☆**
90. Ranked re-engagement nudges (lifecycle notifs already exist). **M/S ☆**
91. New-account ranked restriction (play N solo first). **M/S**
92. "Rate my session" → "want to rank it up?" funnel from solo into ranked. **M/S ☆**
93. Comeback/return season-catchup boost (σ already supports this). **L/S ☆**
94. Streak protection for ranked engagement. **L/S ☆**
95. Tutorialized "what each ladder means" once unified. **M/S ★**

### J. Operational & analytics
96. Rating health dashboard (inflation, distribution, queue times). **M/M**
97. Per-domain population/skill-distribution analytics. **M/S**
98. A/B harness for ranked changes. **M/M**
99. Season config (length/rewards) as data, not constants. **M/S**
100. Public "state of the ladder" transparency report (trust/reach). **L/S ☆**

---

## 6. Top 25 highest-impact changes (ranked)

> Impact × (educational + retention value) ÷ effort. These are the moves that matter most.

1. **Unify the rating substrate** — one canonical per-domain `μ/σ` rating; stop NRS and duels
   corrupting `users.elo`/`rank`/`competitive_matches`. *Nothing else is trustworthy until this
   lands.* (H impact / M effort)
2. **Make duels update the canonical rating** (relative-skill term feeding NRS) so solo and
   competitive play move one coherent number. (H/M, ★)
3. **Reduce speed weight; reward accuracy + difficulty + reasoning** in competitive scoring — make
   *understanding* win. (H/S, ★)
4. **Seasonal Rank Reward track** keyed to peak rank (the RL pattern). (H/M, ☆)
5. **Act-Rank-style seasonal peak badge** minted from already-stored `season_ratings.peak_display`.
   (H/S, ☆ — best effort:impact ratio in the audit)
6. **Surface the 9 domains as specialties / "main"** + per-domain rank ladders. (H/S, ★☆)
7. **Divisions with pips + promotion series + rank-up ceremony.** (H/M, ☆)
8. **Plug the bot Elo farm** and server-validate session metrics. (H/S)
9. **Competitive profile showcase** (titles, peaks, mains, season medals, match history). (H/M, ☆)
10. **Reasoning/self-explanation ranked mode** (reuse `selfExplainEngine`/`socraticEngine`). (H/L, ★☆)
11. **Wire `computeMatchQuality` into real matchmaking** + hidden MMR / provisional marker. (H/M)
12. **Titles system** (earned, flexible, shown by name). (H/M, ☆)
13. **One published rank ladder** + in-app "how rating works." (H/S, ★)
14. **Seasonal-exclusive cosmetics** (scarcity → chase). (H/M, ☆)
15. **Per-domain ranked queue** ("rank up my Geometry"). (M/M, ★☆)
16. **Match history + duel replays** (data already stored). (H/M, ★)
17. **Club rating + club seasons/ladder** (skill, not summed XP). (M/M, ☆)
18. **Calculator/collusion/multi-account integrity** layer beyond speed. (H/M)
19. **Live class/group competitive rooms** (Kahoot energy, reuse class codes). (M/L, ★☆)
20. **Competitive onboarding** (placement narrative + rank reveal). (M/M, ☆)
21. **Seasonal history timeline** + career peak. (H/M, ☆)
22. **Shareable rank/result cards** (viral + reach). (M/S, ☆)
23. **Apex leaderboard tier** above Grandmaster. (M/M, ☆)
24. **Honor/commendation system** (fits the no-silent-bans ethic). (M/M, ☆)
25. **Mistake-review-into-SRS after ranked losses** (loss → learning). (M/S, ★☆)

---

## 7. Top 10 missing systems

1. **A unified, trusted, single competitive rating** (per domain) — the one number that means
   something. *Currently five numbers, none authoritative.*
2. **A seasonal reward track + season-history identity** (reward chase + permanent memory of peaks).
3. **A reasoning/understanding-based competitive mode** — where pedagogy *is* the win condition.
4. **Promotion/demotion + division pips** — the visible progression spine.
5. **A competitive identity layer** — titles, mains, peaks, showcase, replays, rivalries.
6. **Real-time arena + scalable tournaments** (continuous re-pairing, swiss/bracket).
7. **A real anti-cheat program** beyond speed (calculators, collusion, alts, derank).
8. **Per-domain ranked ladders** that turn the 9-domain model into 9 climbable mountains.
9. **Club competitive league** (club rating, seasons, promotion/relegation).
10. **Live/social classroom competition** (teacher-hosted group events).

---

## 8. Top 10 risks

1. **Rating incoherence is shipping now** — players will lose trust the moment they notice their
   "rank" contradicts itself. *Reputational + retention risk, live today.* (H)
2. **Competition trains the wrong skill** — speed-MCQ undermines the concept-first brand and the
   genuine learning outcomes the product is sold on. (H, educational)
3. **Bot Elo farm + client-trusted metrics** — the ladder can be inflated trivially; a visible farm
   destroys ladder legitimacy. (H)
4. **Smurf/boost/alt economy via free guest accounts** — competitive integrity erodes as population
   grows; hard to retrofit. (M→H)
5. **Reward economy inflation** — adding competitive coin rewards without sinks worsens the
   documented inflation problem (`EconomyModel.md`). (M)
6. **Zero-population cold start** — ranked + social modes feel dead at low user count (partly
   mitigated by pace-setter bots, but bots-as-opponents corrode trust if undisclosed). (M)
7. **Over-gamification backlash** — pushing prestige/cosmetics too hard risks the Prodigy trap
   (engagement over learning) and parent/educator distrust. (M, educational)
8. **Complexity overload** — five systems are already confusing; bolting on more without unifying
   makes onboarding worse. (M)
9. **Anti-cheat false positives** — aggressive timing/statistical flags on fast *legitimate* strong
   students; mitigated by the no-silent-ban ethic but still a fairness risk. (M, educational)
10. **Child-safety surface** in social/competitive (clubs, live rooms, shareable cards) — UGC +
    minors needs moderation/age-gating (ties to `ComplianceAudit.md` P0s). (M, compliance)

---

## 9. Competitive roadmap

A sequence chosen so each phase is shippable, builds on the last, and never regresses learning.

### Phase 0 — Coherence (foundation; weeks, not months)
*Goal: one trustworthy rating. No new features until this is solid.*
- Unify the substrate (§6.1–§6.5): one canonical per-domain `μ/σ`; duels update it; stop the
  `users.elo`/`rank`/`competitive_matches` triple-write.
- One published rank ladder + thresholds reused everywhere; in-app "how rating works."
- Plug the bot Elo farm; server-validate session metrics.
- Wire `computeMatchQuality` into real matchmaking; add hidden MMR + provisional `?`.

### Phase 1 — Clarity & the chase (Rocket League layer)
- Divisions with pips, promotion series, demotion shield, rank-up ceremony, "1 win away."
- Seasonal Rank Reward track + Act-Rank peak badge + seasonal-exclusive cosmetics + season recap.
- Surface 9 domains as specialties/"main"; per-domain rank rows.

### Phase 2 — Identity & prestige (Chess.com layer)
- Competitive profile showcase: titles, career peak, seasonal history, match history, replays.
- Titles system; apex leaderboard tier; rivalries/head-to-head.
- Public web competitive profiles (reach + SEO).

### Phase 3 — Make competition educational (the differentiation)
- Reasoning/self-explanation ranked mode; typed-answer mode; transfer-context problems.
- Per-domain ladders that teach as you climb; loss→SRS mistake review.
- Rebalance scoring so accuracy/difficulty/understanding dominate speed.

### Phase 4 — Scale & social (engagement layer)
- Real-time arena + swiss/bracket tournaments; party/team ranked.
- Club rating + club seasons/league with promotion/relegation.
- Live class/group competitive rooms; honor/commendation system; shareable cards.

### Phase 5 — Integrity & trust (continuous, starts in Phase 0)
- Calculator/collusion/alt/derank detection; smurf-flag actions; review queue.
- Ranked new-account restriction; rating-health dashboard; transparency reporting.

---

## 10. Differentiation strategy

**Numera's competitive identity should be: "The only ranked ladder where the better mathematician
wins — and the climb teaches you to be one."**

Three pillars no competitor can match:

1. **Skill that is real and multi-dimensional.** Chess has one number. Numera has **nine domain
   ratings with uncertainty** — you are not "1500," you are "Diamond in Algebra, climbing in
   Geometry, provisional in Calculus." This is a richer identity than any single-rating game, and
   it's *already in the data model*. Lead with it.

2. **Understanding is the win condition.** Every other educational competitor (Kahoot, Prodigy) lets
   speed and guessing win — which is why teachers distrust them as assessment. Numera should make the
   **reasoning** the differentiator: reasoning duels, self-explanation rounds, justification-scoring.
   "We're the ranked mode you can't fake your way up." This is simultaneously the differentiation
   *and* the educational safeguard.

3. **Radical transparency + earned prestige.** Borrow Chess.com's titles and VALORANT's peak badges,
   but keep the thing ranked games refuse: **show the rating, explain every change, never
   shadow-ban.** Prestige you can *trust* is prestige worth chasing.

**Positioning vs the field:**
- vs **Chess.com/Lichess**: same seriousness of rating, but multi-domain and curriculum-linked — you
  climb *and* learn the syllabus.
- vs **Rocket League/LoL/VALORANT/OW2**: the same progression dopamine (pips, promos, seasons, peak
  badges), wrapped around math instead of reflexes.
- vs **Kahoot/Prodigy**: the same social/competitive energy, but the score rewards understanding, so
  it doubles as honest assessment teachers and parents trust.

**The North-Star test for every competitive feature:** *Does winning require understanding more
math, or just clicking faster?* If it's the latter, it doesn't ship.

---

## Appendix — Key code references

- Rating math: `server/mathEngine/ratingEngine.js` (NRS: performance score, σ dynamics, smurf/tilt/
  velocity, `computeMatchQuality`, `applySeasonReset`).
- Rating API + seasons: `server/routes/rating.js` (note `:289` `users.elo = round(mu)` overwrite).
- Duel Elo + integrity: `server/lib/duelIntegrity.js` (`resolveDuel`, K=32, `CHEAT_ELO_PENALTY`).
- Real-time matchmaking/duels: `server/server.js` (`matchmake`, `buildDuelProblemSet`,
  `applyDuelAnswer`, `startDuelWithBot` `isCasual:!isRanked`, `processPlayerDuelResult` `:1184`).
- Rank ladders: `server/lib/progression.js` (`calculateRank`, `calculateRankFromElo`).
- Rewards: `server/services/rankRewardService.js` (GM == Master cosmetics).
- Events: `routes/tournaments.js`, `routes/clubWars.js`, `routes/clubs.js`, `routes/botDuel.js`,
  `routes/asyncDuel.js`, `routes/puzzleRush.js`, `routes/league.js`, `routes/leaderboard.js`.
- Intent: `docs/specs/Spec-CompetitionExpansion.md`; economy: `docs/EconomyModel.md`.
