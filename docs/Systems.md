# Numera — Systems Catalog

Every system in the app, what it does, where it lives, and how complete it is — written as the
single map a new contributor (human or AI) reads before touching anything. It is the index; the
linked subsystem docs hold the depth.

**Status legend** — ✅ complete and test-backed · 🔧 completed/fixed in the 2026-09 completion pass
(see [§ Completion pass](#completion-pass-2026-09)) · 🟡 works, with a known gap listed ·
⛔ blocked on an external dependency.

**Snapshot (2026-09-25):** server 44 routers / 219 endpoints, 69 migrations, 88 tables,
1,316 passing `node:test` tests, ESLint 0 errors · content 181 concepts, 182 concept-first lessons,
117 achievements, 114 shop items, 14 titles, 6 daily quests, 16 interactive visual models ·
Android 129 Kotlin source files (~40k lines), 50 Robolectric test files.

> The server is authoritative for everything that affects progression, economy or rating; the
> client renders and captures input. Every system below is judged against that invariant.

---

## Map

| # | Domain | System | Server | Client | Status |
|---|--------|--------|--------|--------|--------|
| 1 | Platform | Bootstrap, config, routing | `server.js`, `config.js` | — | 🟡 |
| 2 | Platform | Data layer: schema, migrations, transactions, cache, backups | `db.js`, `migrations.js`, `dbx.js`, `cache.js`, `backup.js` | — | ✅ |
| 3 | Platform | Auth & sessions | `routes/auth.js`, `middleware/auth.js`, `lib/passwords.js`, `lib/totp.js` | `ui/screens/AuthScreens.kt`, `MfaChallenge.kt`, `RetrofitClient.kt` | 🔧 |
| 4 | Platform | Security & abuse controls | `middleware/{security,rateLimit}.js`, `lib/contentFilter.js`, `idempotency.js` | — | 🔧 |
| 5 | Platform | Observability | `logger.js`, `routes/{analytics,crash,health}.js`, `services/economyLedger.js` | `analytics/`, `CrashReporter` | 🔧 |
| 6 | Platform | Account, privacy & compliance | `routes/account.js`, `services/retention.js` | `ui/feature/settings/` | ✅ |
| 7 | Learning | Problem generation + CAS | `mathGenerator.js`, `mathEngine/templates.js`, `mathEngine/cas/` | — | ✅ |
| 8 | Learning | Knowledge graph & curriculum | `mathEngine/knowledgeGraph.js` | `archive/LevelMapScreen.kt` | ✅ |
| 9 | Learning | Concept-first lessons | `mathEngine/conceptLessons.js`, `lessons.js`, `lessonSafety.js` | `game/LessonScreen.kt` | ✅ |
| 10 | Learning | Adaptive orchestration & learner model | `problemOrchestrator.js`, `learnerModel.js`, `exerciseMemory.js`, `adaptive.js` | — | ✅ |
| 11 | Learning | Feedback & scaffolding | `hintLadder.js`, `socraticEngine.js`, `selfExplainEngine.js`, `workedExampleEngine.js`, `remediationEngine.js`, `misconceptionEngine.js` | `game/GameplayScreen.kt`, `TipOverlay.kt` | ✅ |
| 12 | Learning | Mastery model & Mastery Map | `masteryEngine.js`, `masteryMap.js`, `services/masteryMapService.js` | `profile/MasteryMapScreen.kt`, `SkillTreeScreen.kt` | ✅ |
| 13 | Learning | Spaced repetition | `routes/srs.js`, `retentionEngine.js`, `services/srsService.js` | Learn → Review sub-tab | 🔧 |
| 14 | Learning | Interactive visual engine | `visualEngine.js`, `visualMetadata.js`, `visualBenefit.js` | `components/InteractiveVisual.kt` | ✅ |
| 15 | Learning | Answer equivalence (grading) | `mathEngine/answerEquivalence.js` | — | ✅ |
| 16 | Learning | Content Quality Gate | `mathEngine/contentQualityGate.js` | — | ✅ |
| 17 | Game loop | Level map, XP & progression | `lib/progression.js`, `routes/math.js` | `archive/LevelMapScreen.kt` | 🔧 |
| 18 | Game loop | Solo sessions, serve tickets & rewards | `lib/soloRewards.js`, `services/soloSessionService.js`, `routes/math.js` | `game/SoloGameScreen.kt`, `RecapScreen.kt` | 🔧 |
| 19 | Game loop | Solo game modes (10) | `routes/{math,archive,dailyPuzzle,mistakes,transfer}.js` | `game/` | 🔧 |
| 20 | Game loop | Placement diagnostic | `routes/assessment.js` | `ui/screens/PlacementTestScreen.kt` | 🔧 |
| 21 | Game loop | Streaks, commitment & relics | `lib/streak.js`, `services/{streakService,commitmentService,relicService}.js`, `routes/commitment.js` | `dialogs/CommitmentStatusDialog.kt` | 🔧 |
| 22 | Game loop | Daily quests & the Today composer | `lib/questDefs.js`, `routes/{quests,today}.js` | `dashboard/TodayCard.kt`, `DashboardScreen.kt` | 🔧 |
| 23 | Game loop | Goals, learning plan, weekly recap | `routes/{account,engine}.js` | `profile/{GoalScreen,LearningPlanScreen,WeeklyRecapScreen}.kt` | ✅ |
| 24 | Economy | Coins: faucets, sinks, ledger | every reward route + `services/economyLedger.js` | — | 🔧 |
| 25 | Economy | Shop, cosmetics, utilities, season tokens | `routes/shop.js` | `feature/shop/` | ✅ |
| 26 | Economy | Achievements, badges, titles, frames | `services/achievementService.js`, `routes/achievements.js`, `lib/titles.js` | `profile/ProfileScreen.kt`, `TitlesCard.kt` | ✅ |
| 27 | Compete | Rating (NRS), seasons, reward track, apex | `mathEngine/ratingEngine.js`, `services/ratingService.js`, `routes/rating.js` | `profile/CompetitiveRankCard.kt`, `arena/SeasonScreen.kt` | 🔧 |
| 28 | Compete | Live duels (Socket.IO) | `server.js` (duel engine), `lib/duelIntegrity.js` | `ui/screens/DuelGameScreen.kt`, `arena/ArenaScreen.kt` | 🔧 |
| 29 | Compete | Bot duels | `routes/botDuel.js` | `arena/BotDuelScreen.kt` | 🔧 |
| 30 | Compete | Async (correspondence) duels | `routes/asyncDuel.js` | `arena/AsyncDuelScreen.kt` | 🔧 |
| 31 | Compete | Reasoning Arena | `routes/reasoningDuel.js` | `arena/ReasoningArenaScreen.kt` | 🔧 |
| 32 | Compete | Puzzle Rush | `routes/puzzleRush.js` | `arena/PuzzleRushScreen.kt` | ✅ |
| 33 | Compete | Weekly tournaments | `routes/tournaments.js` | `arena/TournamentScreen.kt` | 🟡 |
| 34 | Compete | Custom challenges | `routes/challenges.js` | `arena/ChallengesScreen.kt` | ✅ |
| 35 | Compete | Live rooms (class play) | `routes/liveRoom.js` | `arena/LiveRoomScreen.kt` | ✅ |
| 36 | Compete | Weekly league | `lib/leagueWeeks.js`, `services/leagueService.js`, `routes/league.js` | `DashboardScreen.kt` | 🔧 |
| 37 | Compete | Leaderboards | `routes/{leaderboard,rating,puzzleRush,clubs}.js` | various | ✅ |
| 38 | Compete | Competitive integrity | `lib/{duelIntegrity,integritySignals}.js`, `services/integrityEngine.js` | — | 🟡 |
| 39 | Social | Friends & nudges | `routes/friends.js` | `social/SocialScreen.kt` | 🔧 |
| 40 | Social | Clubs & club wars | `routes/{clubs,clubWars}.js` | `social/{ClubsScreen,ClubWarsScreen}.kt` | 🟡 |
| 41 | Social | Concept discussion & moderation | `routes/{discussion,moderation}.js`, `lib/discussionSeeds.js` | `social/ConceptDiscussionScreen.kt` | ✅ |
| 42 | Social | Classes (teacher channel) | `routes/classes.js` | `dialogs/ClassesDialog.kt` | ✅ |
| 43 | Social | Public web presence | `routes/{publicProfile,publicProfilePage,learn,worksheet}.js` | `profile/UserProfileDialog.kt` | ✅ |
| 44 | Engagement | Notifications & lifecycle | `services/{notificationService,lifecycleJobs,mailer,pushSender}.js`, `routes/notifications.js` | `dialogs/NotificationsDialog.kt` | ⛔ push |
| 45 | Engagement | Onboarding | `routes/onboarding.js` | `feature/onboarding/` | ✅ |
| 46 | Client | Shell, navigation, command palette | — | `Navigation.kt`, `ui/screens/MainTabsScreen.kt`, `components/CommandPalette.kt` | ✅ |
| 47 | Client | Design system, motion, sound, haptics | — | `theme/`, `motion/`, `sound/`, `haptic/` | ✅ |
| 48 | Client | Network layer | — | `data/network/` | 🔧 |
| 49 | Quality | Test & lint nets, CI | `test/`, `eslint.config.js` | `app/src/test/`, `.github/workflows/ci.yml` | ✅ |

---

## Platform

### 1. Bootstrap, config, routing 🟡
Express app + global middleware (CORS allow-list, security headers, 5xx sanitizer, per-IP limiter),
44 routers mounted in `server.js`, DB init + migrations (`ready` promise), Socket.IO attach.
`config.js` is the single env source (`JWT_SECRET` mandatory in production).
**Gap:** `server.js` has regrown to ~1.9k lines — the Socket.IO duel engine (~1.2k lines) and a
~380-line HTML landing page still live there. Split them into `socket/duels.js` and
`routes/landing.js` (both covered by the duel socket/lifecycle/end-to-end tests).

### 2. Data layer ✅
SQLite in WAL mode. `db.js` is the idempotent baseline; `migrations.js` holds 69 versioned,
run-once migrations (never edit a shipped one). `dbx.withTransaction` runs ACID work on a dedicated
serialized write connection (`BEGIN IMMEDIATE`, conditional deductions). `cache.js` is an in-process
TTL cache; `backup.js` does `VACUUM INTO` + integrity check + SHA-256. **Accepted gap:** backups are
local-only (no offsite copy).

### 3. Auth & sessions 🔧
Register (age gate, content-filtered usernames, breached-password blocklist, argon2id with
transparent bcrypt upgrade), login with brute-force protection, value-first **guest** accounts with
in-place conversion, TOTP MFA + recovery codes, email password reset, stateful JWT (every access
token maps to a live `user_sessions` row) with rotating refresh tokens and reuse detection.
Socket.IO performs the same session check.
**Fixed this pass:** logout never reached the server — the app only forgot its tokens, leaving
the session and refresh token alive. `POST /api/auth/logout` now also accepts the refresh token
(works after the short-lived access token expired) and the client revokes on logout.

### 4. Security & abuse controls 🔧
Hardening headers, audit log (`security_audit_logs`), layered rate limits, 10 KB body cap,
parameterized SQL, idempotency keys on every reward POST, content filter + UGC moderation queue.
**Fixed this pass:** Socket.IO had no event budget (answer spam / queue flapping) — a per-socket
token bucket now drops floods before any handler runs. Several reward paths trusted the client or
could be looped (see [§ Completion pass](#completion-pass-2026-09)).
See [Security.md](Security.md), [SecurityAudit-Auth.md](SecurityAudit-Auth.md).

### 5. Observability 🔧
Leveled structured logger, security audit log, self-hosted crash reports, privacy-first aggregate
product analytics (allow-listed events, no user ids), onboarding funnel, activation metric.
**Added this pass:** the **economy ledger** (`economy_daily`: coins in/out per source per day, no
user ids) with `GET /api/analytics/economy` (admin), and `GET /healthz` for uptime monitors.
**Gap:** no metrics/alerting stack beyond the health probe.

### 6. Account, privacy & compliance ✅
Password/username/email changes (email verified by code), privacy flag enforced on public
profiles, active sessions + revoke, per-user security log, GDPR JSON export, account deletion,
guardian/parent progress reports, IP-log retention purge. See [ComplianceAudit.md](ComplianceAudit.md)
(open: accessibility audit, DPIA).

## Learning core

### 7. Problem generation + CAS ✅
Procedural templates for every level band, curriculum strands, word problems, estimation,
spot-the-mistake, transfer contexts; distractors from real misconceptions. The CAS layer adds exact
rational arithmetic, a linear solver, and an optional SymPy bridge for high-level problems and the
public `/api/cas/solve`. See [MathEngine.md](MathEngine.md).

### 8. Knowledge graph & curriculum ✅
181 concepts in a prerequisite DAG across arithmetic → calculus/number theory, grouped into strands
and the 9 competitive domains. `scripts/contentGraphAudit.js` checks coherence.

### 9. Concept-first lessons ✅
182 lessons (intuition hook → sections → formula → worked examples), with the lesson/visual
answer-leak guard (`lessonSafety.js`) so a lesson never solves the problem it precedes.

### 10. Adaptive orchestration & learner model ✅
The orchestrator picks the next concept (mastery gaps, misconception remediation, retention,
exploration, challenge) with diversity-aware tie-breaks; the learner model tracks per-concept
mastery/confidence/speed/retention; exercise memory prevents repeats. See
[MathEngineRepetitionAudit.md](MathEngineRepetitionAudit.md).

### 11. Feedback & scaffolding ✅
Five-rung hint ladder, Socratic probes after a wrong answer, self-explanation after a right one,
worked examples as the scaffold, misconception classification with targeted remediation (the
learner's own wrong answer is confronted as a distractor).

### 12. Mastery model & Mastery Map ✅
Multi-dimensional mastery (accuracy, fluency, retention, independence, transfer), the Mathematical
Mastery Profile (domains × competencies, growth, records, milestones), skill tree, mastery-up
celebrations and earned Mastery Frames. See [MasteryProfile.md](MasteryProfile.md).

### 13. Spaced repetition 🔧
SM-2 review queue (`srs_reviews`) fed by level play and ranked losses, with snooze.
**Fixed this pass:** the "Memory Tune-Up" quest counted *every* SRS write — including the
bookkeeping write at the end of every level — so it completed itself during ordinary play. Only a
review that was actually **due** counts now.

### 14. Interactive visual engine ✅
16 manipulative models (area, fraction bars, number line, coordinate plane, circle, factoring…)
with predict-before-verify and answer-key stripping. See
[VisualizationRedesign-2026-06.md](VisualizationRedesign-2026-06.md).

### 15. Answer equivalence ✅
Server-side grading for everything the server grades (duels, rush, tournaments, challenges, daily
puzzle, diagnostic): numeric/fraction/expression equivalence with safe parsing.

### 16. Content Quality Gate ✅
Every lesson/generator must pass `contentQualityGate.js` (enforced on every `npm test`). Never
weaken a check — fix the content. See [ContentQualityGate.md](ContentQualityGate.md).

## Game loop

### 17. Level map, XP & progression 🔧
A level path unlocked up to `users.level`; XP levels cost `level × 100` (`lib/progression.applyXp`
is now the single copy of that loop, which was pasted into 10 routes); learning rank labels.
**Fixed this pass:** `/api/math/complete` let a client "complete" any **locked** level and jump
progression there (`level: 150` → level 151). Only the frontier level unlocks the next one, and only
with at least one solve.

### 18. Solo sessions, serve tickets & rewards 🔧
Solo play is graded on the device (instant feedback, hints, retries), so the server anchors it:
every problem-serving endpoint issues a **serve ticket**; `POST /api/math/complete` must consume one
for the same mode (+ level) inside its reward transaction, and solves are capped at what the ticket
served. The reward table (`lib/soloRewards.js`) is the only source of truth for XP/coins; coins and
league points taper after 15 sessions a day (XP never does); the grant, the ticket and the counters
commit atomically.
**Fixed this pass:** the server used to pay whatever `xpGained`/`coinsGained` the client sent for
every non-level mode; `parseInt(solvedCount) || 5` turned a zero-solve session into five solves; a
wrong transfer answer was paid in full; completions needed no serve at all (scriptable farming).
**Gap:** full server grading of solo answers (the client would send its answers with `/complete`)
is the remaining step; today the ticket bounds what a tampered client can claim.

### 19. Solo game modes 🔧
Ten modes share the solo loop: **level**, **archive puzzle**, **legacy puzzle**, **daily puzzle**,
**mistakes practice**, **checkpoint exam**, **word problems**, **estimation**, **spot the mistake**,
**transfer challenge**.
**Fixed this pass:** the daily puzzle regenerated on every refresh, trusted a client
`{ correct: true }`, paid twice (submit + `/complete`), and a learner without a quest row could be
paid on every submit. It is now pinned per learner per local day, server-graded, and paid exactly
once. The Mistakes Bank credited the "Focus Practice" quest for *logging* mistakes (getting answers
wrong) and add→resolve was an unlimited coin loop; the quest now counts resolves and paid resolves
are capped per day.

### 20. Placement diagnostic 🔧
A server-graded, 7-question adaptive (binary-search) diagnostic places the learner; skip is allowed.
**Fixed this pass:** removed the unused legacy `POST /api/assessment/submit`, which set
`users.level` from a client-reported score at any time; a retake can no longer demote a learner.

### 21. Streaks, commitment & relics 🔧
The streak is now a **local-calendar-day** engine (`lib/streak.js`): solving anything credits today
once; opening the app or logging in only *settles* missed days — Streak Shields cover missed days
(only if they cover all of them), one uncovered day enters a `fading` grace that today's solve
restores, anything longer resets and stashes the run for the coins-paid repair. Recommit
(challenge/shield/coins), streak repair, milestone relics (3/7/30/100 days, comeback, burnout shield)
and the anti-burnout consistency index sit on top.
**Fixed this pass:** the old elapsed-seconds logic never advanced for someone playing daily at a
slightly earlier time, and a player returning after a week through a saved login got +1 instead of
a reset (the missed-day check only ran on password login). Recommit deductions were not
transactional.

### 22. Daily quests & the Today composer 🔧
Six quests (solve 5, play 2 Arena rounds, resolve 3 mistakes, daily puzzle, Puzzle Rush, clear 3 due
reviews) and the Today plan that orders review → learn → puzzle → duel → growth with streak safety
and comeback framing.
**Fixed this pass:** quests reset on a rolling 24 h window anchored to whenever the app was opened
after the last reset (the reset time drifted and a day's quests bled into the next) — they now reset
on the learner's local calendar day, and the reset runs before any counter is bumped. Claims were a
read-modify-write of coins and could cash yesterday's unclaimed quest; they are transactional now.
"Arena Duelist" only counted live socket duels; every Arena mode counts now.

### 23. Goals, learning plan, weekly recap ✅
One explicit goal (daily problems / reach level / streak) with progress and a celebration, an
ordered learning plan to the goal, and a weekly recap.

## Economy & collection

### 24. Coins: faucets, sinks, ledger 🔧
Faucets: solo sessions, daily puzzle, mistakes, quests, achievements, Puzzle Rush, bot/live/async
duels, tournaments, club wars, season rewards and track, rank rewards. Sinks: cosmetics, utilities,
coin→Season Token conversion, streak repair, recommit. Every one now records into the aggregate
ledger, so [EconomyModel.md](EconomyModel.md) can be checked against real behavior
(`GET /api/analytics/economy`). Coins are earned-only ([MonetizationLine.md](MonetizationLine.md)).

### 25. Shop, cosmetics, utilities, season tokens ✅
Daily/featured rotation, affordability discount, season-slot exclusives, token-only prestige items,
"My Collection" for earned cosmetics, equip slots (theme, avatar, badge, banner, title, effect,
victory, tap, frame), consumables (retry tokens, XP booster, Streak Shield). See
[ShopOverhaul.md](ShopOverhaul.md).

### 26. Achievements, badges, titles, frames ✅
117 achievements in tiered chains (recomputed server-side, hidden ones masked), claimable coin
rewards + badges, 14 competitive titles, earn-only Mastery Frames and rank rewards. See
[AchievementSystem.md](AchievementSystem.md).

## Competition

### 27. Rating (NRS), seasons, reward track, apex 🔧
One μ/σ rating per domain + global, conservative display rating, rank ladder with divisions and
promotion moments, hidden-MMR matchmaking, seasons with soft reset, peak badges, reward track,
Apex tier, honor/commendations, rating history and explanations, share cards.
**Completed this pass:** the owner decision "solo + duels move ONE number per domain" was
half-built — the app never called `POST /api/rating/session`, so solo play never moved the rating,
while that endpoint accepted client-asserted stats (an open rating pump). Ticket-anchored **level**
sessions now update the rating inside `/api/math/complete`; the pump endpoint is gone. See
[specs/Spec-RatingUnification.md](specs/Spec-RatingUnification.md).

### 28. Live duels 🔧
Socket.IO ranked/casual matchmaking with rating gates and a bot offer, friend lobbies by code,
server-authoritative grading, synced countdown, disconnect grace + forfeit, reconnect/"find my
duel", rematch handshake, emotes, timing-based integrity, match log and replays. See
[MultiplayerOverhaul-2026-07.md](MultiplayerOverhaul-2026-07.md).
**Fixed this pass:** the per-socket event budget (§4); duels now credit the streak.

### 29–35. Bot duels · async duels · Reasoning Arena · Puzzle Rush · tournaments · challenges · live rooms
All server-generated and server-graded, with idempotent transactional rewards: calibrated bots with
a decaying daily faucet; correspondence duels between friends; the Reasoning Arena (an answer only
banks with the right reason; per-domain ranked focus, daily rated cap, replays); Puzzle Rush
time-attack with integrity-filtered boards; weekly tournaments; user-authored challenges with a
server-side clock; Kahoot-style live rooms with socket liveness.
**Fixed this pass:** all of them credit the streak; bot/async/reasoning rounds count toward the Arena
quest. **Gap (33):** tournament problem sets are shared across entrants over an async window
(out-of-band answer sharing) — per-entrant sets from the same recipe would close it.

### 36. Weekly league 🔧
Five stone leagues (Quartz → Obsidian), weekly promotion/demotion.
**Fixed this pass:** each player's "week" was anchored to their own last reset and only their points
were zeroed; inactive players were never reset, so an account that left months ago could top a
league forever. Leagues now run on one global week (Monday 00:00 UTC) with a single transactional
rollover (`league_rollovers`, one claim per week) that ranks everyone at once and notifies movers.

### 37. Leaderboards ✅
Learning (level/XP), friends, weekly league, rating (per domain + global), season, Apex, Puzzle Rush,
club activity and club skill ladders.

### 38. Competitive integrity 🟡
Duel timing scorer with forfeits, Puzzle Rush verdicts, smurf and tilt signals, win-trade/boost
detection with an admin review queue, bot-Elo farm closed, solo stats now ticket-anchored.
**Gap:** calculator-use and multi-account/device heuristics
([CompetitiveEcosystemAudit.md](CompetitiveEcosystemAudit.md) #18).

## Social & community

### 39. Friends & nudges 🔧
Requests (reciprocal auto-accept), accept/decline/remove, six preset nudges (no free text), friends
leaderboard, async-duel challenges.
**Fixed this pass:** the Friends screen was orphaned when Social left the bottom nav — decline,
remove, nudges and the friends ranking were unreachable. It opens from Profile ("See all") and the
command palette again.

### 40. Clubs & club wars 🟡
One club per learner; create (filtered, unique), browse, join/leave, owner governance (kick,
transfer, disband, auto-succession), activity + skill ladders; club-vs-club wars on a shared problem
set with a paid winning side. **Gap:** club seasons with promotion/relegation (#17).

### 41. Concept discussion & moderation ✅
Per-concept threads seeded with authored "common questions", report/block, admin moderation queue.

### 42. Classes ✅
Any user can create a class (becoming its teacher) and share a join code; the teacher sees a
roster of plain-language progress reports for members of classes they own. See
[specs/Spec-TeacherClassroom.md](specs/Spec-TeacherClassroom.md).

### 43. Public web presence ✅
No-auth, SEO-friendly concept pages (`/learn`), player pages (`/u/:username`, private flag
honored) with SVG rank cards, printable worksheets with answer keys.

## Engagement

### 44. Notifications & lifecycle ⛔ (push)
One funnel for in-app, email and push with per-category dedup, quiet hours in the learner's
timezone, minors' email suppression, one-click unsubscribe; an hourly lifecycle sweeper (streak
risk, lapsed learners, comeback). **Blocked:** push needs an FCM service account on the server and
token registration in the app (the client never calls `POST /api/notifications/push-token`).

### 45. Onboarding ✅
Welcome → solve-now "aha" → adaptive diagnostic → goals → celebrate, server-owned completion,
funnel analytics, feature spotlights. The profile/roadmap/habit/notification steps were cut from the
flow; their unused screens were removed this pass (the server endpoints remain for week-1 surfaces).
**Gap:** `users.practice_schedule` is still written by `/api/onboarding/commitment` but read by
nothing.

## Client

### 46. Shell, navigation, command palette ✅
Navigation 3 back stack (Login → Onboarding → MainTabs → game), token validation on launch, global
401 → login, a bottom nav of Arena · Train · Quests (the Today home, where the app opens) · Shop ·
Profile, with Settings one tap away, full-screen overlays, and a command palette with
server-backed exercise search.

### 47. Design system, motion, sound, haptics ✅
Token-driven theme (spacing/radius/color/type), brand identity, motion system with reduced-motion
respect, synthesized sound vocabulary, haptic manager. See [DesignSystem.md](DesignSystem.md),
[BrandIdentity.md](BrandIdentity.md), [SoundDesign.md](SoundDesign.md).
**Gap:** several screens exceed the 600-line rule (Settings 2.1k, Profile 2.0k, `Models.kt` 2.3k,
DuelGame 1.5k, LevelMap 1.35k, Gameplay 1.35k, SoloGame 1.1k, Arena 1.0k); i18n, accessibility and
tablet layouts are unaudited ([UltraReview-2026-06.md](UltraReview-2026-06.md)).

### 48. Network layer 🔧
Retrofit/OkHttp with an Authorization interceptor, `Idempotency-Key` on every POST, a refresh-token
authenticator, encrypted token storage, a Socket.IO client.
**Fixed this pass:** logout revokes the server session; the daily-puzzle submit sends the answer.

### 49. Test & lint nets, CI ✅
Server: `npm test` (node:test against the real app on a throwaway DB) + ESLint. Android: Robolectric
Compose UI tests with an injectable `ApiService`. CI runs both on pushes to `main` and on PRs.

---

## Completion pass (2026-09)

The audit behind this catalog checked every system against the code (not the older audit docs) and
fixed what was broken or half-built. Each item is test-backed on the server; the client edits are
small and syntax-checked (a full Gradle build was not available in the environment that made them —
CI's `assembleDebug` + Robolectric run is the gate).

| Area | What was wrong | Now |
|------|----------------|-----|
| Streak | Elapsed-seconds logic stalled for daily players; token users never lost a streak | Local-calendar-day engine, settle vs credit, all solve paths credit |
| Daily quests | Rolling 24 h reset drifted; counters bumped before the reset | Local-day reset, run before every bump |
| Solo rewards | Client-chosen XP/coins; 0 solves → 5; no serve needed | Server reward table, serve tickets, solve cap, daily taper |
| Progression | Any locked level could be "completed" | Frontier-only unlock with a solve |
| Daily puzzle | Regenerated per refresh; `{correct:true}` trusted; paid twice; infinite without a quest row | Pinned per day, server-graded, paid once |
| Placement | Legacy endpoint set level from a client score; retakes demoted | Removed; placement never demotes |
| SRS quest | Counted every SRS write | Counts due reviews only |
| Mistakes Bank | Quest counted wrong answers; add→resolve coin loop | Counts resolves; paid resolves capped |
| Quest claims | Read-modify-write coins; yesterday's quest cashable | Transactional, reset first |
| Arena quest | Only live duels counted | Every Arena mode counts |
| Rating | Solo never moved the rating; open client-asserted rating endpoint | Ticket-anchored level sessions rate server-side; endpoint removed |
| Weekly league | Per-player weeks; inactive players never reset | One global week, single transactional rollover |
| Logout | Server session stayed alive | Revoked (by refresh token) |
| Sockets | No event budget | Per-socket token bucket |
| Friends | Screen unreachable | Re-mounted |
| Economy | Faucets/sinks unmeasured | Aggregate ledger + admin rollup |
| Ops | No health endpoint | `GET /healthz` |

## Open work (honest backlog)

1. **Verify the Android changes in CI** (`assembleDebug` + `testDebugUnitTest`).
2. **Server grading for solo answers** — have the client send its answers with `/complete` so the
   server grades them against the ticketed problems (§18).
3. **Split `server.js`** — the Socket.IO duel engine and the landing page (§1).
4. **Split the oversized Android screens** before they grow further (§47).
5. **Push notifications** — FCM credential + client token registration (§44).
6. **Club seasons** with promotion/relegation (§40); **per-entrant tournament sets** (§33);
   **device/multi-account integrity** heuristics (§38).
7. **Accessibility, i18n, tablet layouts; DPIA** ([ComplianceAudit.md](ComplianceAudit.md)).
8. Decide the fate of `practice_schedule` (wire it into reminders, or drop it) (§45).
9. Offsite, encrypted backups (§2).
