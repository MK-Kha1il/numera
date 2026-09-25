# Numera systems

Every system in the app: what it does, where the code is, and what's still missing. Start here,
then follow the links for detail.

As of 2026-09-25: 46 routers / 222 endpoints, 71 migrations, 88 tables, 1,321 server tests;
181 concepts with 182 lessons, 117 achievements, 114 shop items; 129 Kotlin source files and
50 Robolectric test files.

The server owns everything that affects progression, economy or rating. The client renders and
collects input.

## Map

| # | Domain | System | Server | Client | Known gap |
|---|--------|--------|--------|--------|-----------|
| 1 | Platform | Bootstrap, config, routing | `server.js`, `config.js`, `routes/landing.js` | — | — |
| 2 | Platform | Data layer: schema, migrations, transactions, cache, backups | `db.js`, `migrations.js`, `dbx.js`, `cache.js`, `backup.js` | — | backups are local-only |
| 3 | Platform | Auth & sessions | `routes/auth.js`, `middleware/auth.js`, `lib/passwords.js`, `lib/totp.js` | `ui/screens/AuthScreens.kt`, `MfaChallenge.kt`, `RetrofitClient.kt` | — |
| 4 | Platform | Security & abuse controls | `middleware/{security,rateLimit}.js`, `lib/contentFilter.js`, `idempotency.js` | — | — |
| 5 | Platform | Observability | `logger.js`, `routes/{analytics,crash,health}.js`, `services/economyLedger.js` | `analytics/`, `CrashReporter` | no metrics/alerting |
| 6 | Platform | Account, privacy & compliance | `routes/account.js`, `services/retention.js` | `ui/feature/settings/` | — |
| 7 | Learning | Problem generation + CAS | `mathGenerator.js`, `mathEngine/templates.js`, `mathEngine/cas/` | — | — |
| 8 | Learning | Knowledge graph & curriculum | `mathEngine/knowledgeGraph.js` | `archive/LevelMapScreen.kt` | — |
| 9 | Learning | Concept-first lessons | `mathEngine/conceptLessons.js`, `lessons.js`, `lessonSafety.js` | `game/LessonScreen.kt` | — |
| 10 | Learning | Adaptive orchestration & learner model | `problemOrchestrator.js`, `learnerModel.js`, `exerciseMemory.js`, `adaptive.js` | — | — |
| 11 | Learning | Feedback & scaffolding | `hintLadder.js`, `socraticEngine.js`, `selfExplainEngine.js`, `workedExampleEngine.js`, `remediationEngine.js`, `misconceptionEngine.js` | `game/GameplayScreen.kt`, `TipOverlay.kt` | — |
| 12 | Learning | Mastery model & Mastery Map | `masteryEngine.js`, `masteryMap.js`, `services/masteryMapService.js` | `profile/MasteryMapScreen.kt`, `SkillTreeScreen.kt` | — |
| 13 | Learning | Spaced repetition | `routes/srs.js`, `retentionEngine.js`, `services/srsService.js` | Learn → Review sub-tab | — |
| 14 | Learning | Interactive visual engine | `visualEngine.js`, `visualMetadata.js`, `visualBenefit.js` | `components/InteractiveVisual.kt` | — |
| 15 | Learning | Answer equivalence (grading) | `mathEngine/answerEquivalence.js` | — | — |
| 16 | Learning | Content Quality Gate | `mathEngine/contentQualityGate.js` | — | — |
| 17 | Game loop | Level map, XP & progression | `lib/progression.js`, `routes/math.js` | `archive/LevelMapScreen.kt` | — |
| 18 | Game loop | Solo sessions, serve tickets & rewards | `lib/soloRewards.js`, `services/soloSessionService.js`, `routes/math.js` | `game/SoloGameScreen.kt`, `RecapScreen.kt` | answers judged on device |
| 18b | Game loop | Session flow (stars, next level, combo, streak) | `routes/{math,levels}.js` | `game/{GameplayScreen,RecapScreen}.kt`, `components/StarRating.kt` | — |
| 19 | Game loop | Solo game modes (10) | `routes/{math,archive,dailyPuzzle,mistakes,transfer}.js` | `game/` | — |
| 20 | Game loop | Placement diagnostic | `routes/assessment.js` | `ui/screens/PlacementTestScreen.kt` | — |
| 21 | Game loop | Streaks, commitment & relics | `lib/streak.js`, `services/{streakService,commitmentService,relicService}.js`, `routes/commitment.js` | `dialogs/CommitmentStatusDialog.kt` | — |
| 22 | Game loop | Daily quests & the Today composer | `lib/questDefs.js`, `routes/{quests,today}.js` | `dashboard/TodayCard.kt`, `DashboardScreen.kt` | — |
| 23 | Game loop | Goals, learning plan, weekly recap | `routes/{account,engine}.js` | `profile/{GoalScreen,LearningPlanScreen,WeeklyRecapScreen}.kt` | — |
| 24 | Economy | Coins: faucets, sinks, ledger | every reward route + `services/economyLedger.js` | — | — |
| 25 | Economy | Shop, cosmetics, utilities, season tokens | `routes/shop.js` | `feature/shop/` | — |
| 26 | Economy | Achievements, badges, titles, frames | `services/achievementService.js`, `routes/achievements.js`, `lib/titles.js` | `profile/ProfileScreen.kt`, `TitlesCard.kt` | — |
| 27 | Compete | Rating (NRS), seasons, reward track, apex | `mathEngine/ratingEngine.js`, `services/ratingService.js`, `routes/rating.js` | `profile/CompetitiveRankCard.kt`, `arena/SeasonScreen.kt` | — |
| 28 | Compete | Live duels (Socket.IO) | `socket/duels.js`, `lib/duelIntegrity.js` | `ui/screens/DuelGameScreen.kt`, `arena/ArenaScreen.kt` | — |
| 29 | Compete | Bot duels | `routes/botDuel.js` | `arena/BotDuelScreen.kt` | — |
| 30 | Compete | Async (correspondence) duels | `routes/asyncDuel.js` | `arena/AsyncDuelScreen.kt` | — |
| 31 | Compete | Reasoning Arena | `routes/reasoningDuel.js` | `arena/ReasoningArenaScreen.kt` | — |
| 32 | Compete | Puzzle Rush | `routes/puzzleRush.js` | `arena/PuzzleRushScreen.kt` | — |
| 33 | Compete | Weekly tournaments | `routes/tournaments.js` | `arena/TournamentScreen.kt` | — |
| 34 | Compete | Custom challenges | `routes/challenges.js` | `arena/ChallengesScreen.kt` | — |
| 35 | Compete | Live rooms (class play) | `routes/liveRoom.js` | `arena/LiveRoomScreen.kt` | — |
| 36 | Compete | Weekly league | `lib/leagueWeeks.js`, `services/leagueService.js`, `routes/league.js` | `DashboardScreen.kt` | — |
| 37 | Compete | Leaderboards | `routes/{leaderboard,rating,puzzleRush,clubs}.js` | various | — |
| 38 | Compete | Competitive integrity | `lib/{duelIntegrity,integritySignals}.js`, `services/integrityEngine.js` | — | no device/multi-account checks |
| 39 | Social | Friends & nudges | `routes/friends.js` | `social/SocialScreen.kt` | — |
| 40 | Social | Clubs & club wars | `routes/{clubs,clubWars}.js` | `social/{ClubsScreen,ClubWarsScreen}.kt` | no club seasons |
| 41 | Social | Concept discussion & moderation | `routes/{discussion,moderation}.js`, `lib/discussionSeeds.js` | `social/ConceptDiscussionScreen.kt` | — |
| 42 | Social | Classes (teacher channel) | `routes/classes.js` | `dialogs/ClassesDialog.kt` | — |
| 43 | Social | Public web presence | `routes/{publicProfile,publicProfilePage,learn,worksheet}.js` | `profile/UserProfileDialog.kt` | — |
| 44 | Engagement | Notifications & lifecycle | `services/{notificationService,lifecycleJobs,mailer,pushSender}.js`, `routes/notifications.js` | `dialogs/NotificationsDialog.kt` | push not wired |
| 45 | Engagement | Onboarding | `routes/onboarding.js` | `feature/onboarding/` | `practice_schedule` unused |
| 46 | Client | Shell, navigation, command palette | — | `Navigation.kt`, `ui/screens/MainTabsScreen.kt`, `components/CommandPalette.kt` | — |
| 47 | Client | Design system, motion, sound, haptics | — | `theme/`, `motion/`, `sound/`, `haptic/` | several files > 600 lines |
| 48 | Client | Network layer | — | `data/network/` | — |
| 49 | Quality | Test & lint nets, CI | `test/`, `eslint.config.js` | `app/src/test/`, `.github/workflows/ci.yml` | — |

## Platform

### 1. Bootstrap, config, routing
Express app with global middleware (CORS allow-list, security headers, 5xx sanitizer, per-IP
limiter), 45 routers mounted in `server.js`, DB init + migrations behind a `ready` promise, and
`attachDuels(io)` for the socket engine in `socket/duels.js`. `config.js` is the only place env
vars are read; `JWT_SECRET` is required in production.

### 2. Data layer
SQLite in WAL mode. `db.js` is the idempotent baseline and `migrations.js` holds the versioned,
run-once migrations (append only). `dbx.withTransaction` runs writes on a dedicated serialized
connection (`BEGIN IMMEDIATE`, conditional deductions). `cache.js` is an in-process TTL cache;
`backup.js` does `VACUUM INTO` plus an integrity check and SHA-256. Backups stay on the local disk.

### 3. Auth & sessions
Registration with an age gate, filtered usernames, a common-password blocklist and argon2id
(bcrypt hashes upgrade on login); login with brute-force protection; guest accounts that convert in
place; TOTP MFA with recovery codes; email password reset. JWTs are stateful: every access token maps
to a live `user_sessions` row, refresh tokens rotate with reuse detection, and the socket handshake
runs the same check. Logout revokes the session and accepts the refresh token, so it works after the
access token has expired.

### 4. Security & abuse controls
Security headers, `security_audit_logs`, layered rate limits, a 10 KB body cap, parameterized SQL,
idempotency keys on reward POSTs, the content filter and a moderation queue. Each socket has a token
bucket, so floods are dropped before any handler runs. See [Security.md](Security.md).

### 5. Observability
Leveled logger, security audit log, self-hosted crash reports, aggregate product analytics
(allow-listed events, no user ids), onboarding funnel and activation metric. The economy ledger
(`economy_daily`: coins in/out per source per day) is readable at `GET /api/analytics/economy`
(admin), and `GET /healthz` serves uptime checks. There's no metrics or alerting stack beyond that.

### 6. Account, privacy & compliance
Password/username/email changes (email confirmed by code), private profiles, active sessions with
revoke, a per-user security log, JSON export, account deletion, guardian progress reports and a
daily retention purge. See [Compliance.md](Compliance.md).

## Learning

### 7. Problem generation + CAS
Procedural templates for every level band plus word problems, estimation, spot-the-mistake and
transfer contexts, with distractors built from real misconceptions. The CAS layer adds exact
rational arithmetic, a linear solver and an optional SymPy bridge (also behind `/api/cas/solve`).
See [MathEngine.md](MathEngine.md).

### 8. Knowledge graph & curriculum
181 concepts in a prerequisite DAG from arithmetic to calculus and number theory, grouped into
strands and the 9 competitive domains. `scripts/contentGraphAudit.js` checks the graph.

### 9. Lessons
182 concept-first lessons (hook → sections → formula → worked examples). `lessonSafety.js` makes
sure a lesson never gives away the answer to the problem that follows it.

### 10. Adaptive orchestration & learner model
The orchestrator picks the next concept (gaps, misconception remediation, retention, exploration,
challenge) with diversity-aware tie-breaks. The learner model tracks mastery, confidence, speed and
retention per concept, and `exerciseMemory.js` fingerprints served problems so they don't repeat.

### 11. Feedback & scaffolding
A five-step hint ladder, a Socratic probe after a wrong answer, a self-explanation prompt after a
right one, worked examples, and misconception classification with targeted practice (the learner's
own wrong answer comes back as a distractor).

### 12. Mastery model & Mastery Map
Mastery across accuracy, fluency, retention, independence and transfer; the mastery profile
(domains × competencies, growth, records, milestones), the skill tree, mastery-up moments and
earned Mastery Frames. See [MasteryProfile.md](MasteryProfile.md).

### 13. Spaced repetition
SM-2 review queue (`srs_reviews`) fed by level play and ranked losses, with snooze. Only reviews
that were actually due count toward the review quest.

### 14. Interactive visuals
16 manipulatives (area model, fraction bars, number line, coordinate plane, circle, factoring…)
with predict-then-check and the answer key stripped before it reaches the client.

### 15. Answer equivalence
Grading for everything the server checks (duels, Puzzle Rush, tournaments, challenges, the daily
puzzle, placement): numeric, fraction and expression equivalence with a safe parser.

### 16. Content Quality Gate
Every lesson and generator must pass `contentQualityGate.js`, enforced by `npm test`. Fix the
content, never the check. See [ContentQualityGate.md](ContentQualityGate.md).

## Game loop

### 17. Level map, XP & progression
Levels unlock up to `users.level`; an XP level costs `level × 100` (`lib/progression.applyXp`).
Only the frontier level unlocks the next one, and only with at least one solve. Each level has a
0–3 star rating (★ cleared, ★★ every problem solved, ★★★ no mistakes) from
`lib/soloRewards.levelStars`; the best is kept in `user_level_stars` and served by
`GET /api/levels/stars`. The level→category rule is `mapLevelCategory()`.

### 18. Solo sessions, serve tickets & rewards
Solo play is graded on the device for instant feedback, so the server anchors it another way:
every problem-serving endpoint issues a serve ticket, and `POST /api/math/complete` must consume
one for the same mode (and level) inside its reward transaction. Solves are capped at what the
ticket served. `lib/soloRewards.js` is the only reward table; coins and league points taper after
15 sessions a day, XP doesn't.

The answers themselves are still judged on the device, because the correct answers ship with the
problems. Moving to server grading means a round-trip per answer, which is a latency trade-off
nobody has decided on yet. Until then the ticket limits a modified client to served problems, once
each, at its own level, tapered.

### 18b. Session flow
Sound (the "correct" tone rises with the run), haptics, a shake on a miss, the scaffolding from §11,
manipulatives, calculator and scratchpad, and a free "Keep going" when hearts run out (mistakes
never cost anything in learning modes). A segmented progress bar and an "N in a row" chip track the
run; a miss resets it. Lessons show the first time only (still available from "Reference"). The
recap reveals the level's stars, marks a new best, says what the next star needs, shows the streak
when this session kept it alive, shows daily-quest progress, and offers "Next level ▶".

### 19. Solo modes
Ten modes share the solo loop: level, archive puzzle, legacy puzzle, daily puzzle, mistakes
practice, checkpoint exam, word problems, estimation, spot the mistake, transfer challenge. The
daily puzzle is pinned per learner per local day, graded on the server and paid once. The Mistakes
Bank quest counts resolved mistakes, and paid resolves are capped per day.

### 20. Placement
A 7-question adaptive (binary-search) test, graded on the server. It can be skipped, and a retake
never lowers your level.

### 21. Streaks, commitment & relics
`lib/streak.js` works in local calendar days. Solving anything credits today once; opening the app
or logging in only settles missed days. Streak Shields cover missed days if they cover all of them;
a single uncovered day puts the streak in a `fading` state that today's solve restores; anything
longer resets it and keeps the old run for a paid repair. Recommit, streak repair, milestone relics
(3/7/30/100 days, comeback, burnout shield) and the consistency index build on that.

### 22. Daily quests & Today
Six quests (solve 5, play 2 Arena rounds, resolve 3 mistakes, daily puzzle, Puzzle Rush, clear 3
due reviews), reset on the learner's local day before any counter moves. Claims are
transactional. The Today card orders review → learn → puzzle → duel → growth and switches to a
comeback message after a long break.

### 23. Goals, learning plan, weekly recap
One goal (daily problems, reach a level, or a streak) with progress, an ordered plan towards it,
and a weekly recap.

## Economy & collection

### 24. Coins
Faucets: solo sessions, daily puzzle, mistakes, quests, achievements, Puzzle Rush, bot/live/async
duels, tournaments, club wars, season rewards and track, rank rewards. Sinks: cosmetics, utilities,
coin → Season Token conversion, streak repair, recommit. Every faucet and sink records into the
ledger so [EconomyModel.md](EconomyModel.md) can be checked against real numbers. Coins can't be
bought ([MonetizationLine.md](MonetizationLine.md)).

### 25. Shop
Daily and featured rotation, an affordability discount, seasonal items, token-only items, a
collection view for earned cosmetics, equip slots (theme, avatar, badge, banner, title, effect,
victory, tap, frame) and consumables (retry tokens, XP booster, Streak Shield).

### 26. Achievements, badges, titles, frames
117 achievements in tiered chains (recomputed on the server, hidden ones masked), coin rewards and
badges, 14 competitive titles, earn-only Mastery Frames and rank rewards. See
[AchievementSystem.md](AchievementSystem.md).

## Competition

### 27. Rating, seasons, reward track, apex
One μ/σ rating per domain plus a global one, a conservative display rating, ranks with divisions,
hidden-MMR matchmaking, seasons with a soft reset, peak badges, a reward track, the Apex tier,
commendations, rating history and share cards. Level sessions update the rating inside
`/api/math/complete` (from the serve ticket, not client stats). See [Rating.md](Rating.md).

### 28. Live duels
Socket.IO ranked and casual matchmaking with rating gates and a bot fallback, friend lobbies by
code, server grading, a synced countdown, disconnect grace and forfeit, reconnect, rematch,
emotes, timing-based integrity checks, match log and replays.

### 29–35. Bot duels, async duels, Reasoning Arena, Puzzle Rush, tournaments, challenges, live rooms
All generated and graded on the server, with idempotent transactional rewards: bots with a daily
reward taper; correspondence duels between friends; the Reasoning Arena (an answer only counts with
the right reason, per-domain focus, a daily rated cap, replays); Puzzle Rush with integrity-filtered
boards; weekly tournaments where each entrant gets their own set from the event recipe; user-made
challenges with a server clock; live rooms for classes. All of them credit the streak, and every
Arena mode counts toward the Arena quest.

### 36. Weekly league
Five leagues (Quartz → Obsidian) on one global week starting Monday 00:00 UTC. A single
transactional rollover (`league_rollovers`, one claim per week) ranks everyone, moves players and
notifies them.

### 37. Leaderboards
Level/XP, friends, weekly league, rating (per domain and global), season, Apex, Puzzle Rush, club
activity and club skill.

### 38. Competitive integrity
Duel timing checks with forfeits, Puzzle Rush verdicts, smurf and tilt signals, win-trade/boost
detection with an admin review queue. Nothing yet for calculator use or multiple accounts on one
device.

## Social

### 39. Friends & nudges
Requests (a mutual request auto-accepts), accept/decline/remove, six preset nudges, a friends
leaderboard and async-duel challenges. Opens from Profile and the command palette.

### 40. Clubs & club wars
One club per learner: create, browse, join/leave, owner controls (kick, transfer, disband,
automatic succession), activity and skill ladders, and club-vs-club wars on a shared problem set.
No club seasons yet.

### 41. Concept discussion & moderation
Per-concept threads seeded with common questions, report/block, and an admin moderation queue.

### 42. Classes
Anyone can create a class and share a join code; the teacher sees plain-language progress reports
for its members.

### 43. Public web pages
No-login concept pages (`/learn`), player pages (`/u/:username`, respecting the private flag) with
SVG rank cards, and printable worksheets with answer keys.

## Engagement

### 44. Notifications & lifecycle
One pipeline for in-app, email and push, with per-category dedup, quiet hours in the learner's
timezone, no email to minors and one-click unsubscribe; an hourly sweep sends streak-risk, lapsed
and comeback reminders. Push isn't wired: the server needs an FCM service account and the app never
registers a token (`POST /api/notifications/push-token`).

### 45. Onboarding
Welcome → solve one problem → placement → goals → celebrate, with completion stored on the server
and funnel analytics. `users.practice_schedule` is still written by `/api/onboarding/commitment`
but nothing reads it.

## Client

### 46. Shell & navigation
Navigation 3 back stack (Login → Onboarding → MainTabs → game), token check on launch, a global 401
→ login, a bottom nav of Arena · Train · Quests (Today, where the app opens) · Shop · Profile, and a
command palette with exercise search.

### 47. Design system, motion, sound, haptics
Theme tokens (spacing, radius, color, type), motion with reduced-motion support, synthesized
sounds and a haptics manager. See [DesignSystem.md](DesignSystem.md),
[BrandIdentity.md](BrandIdentity.md), [SoundDesign.md](SoundDesign.md). Several files are well past
600 lines (Settings 2.1k, Profile 2.0k, `Models.kt` 2.3k, DuelGame 1.5k, LevelMap 1.35k, Gameplay
1.35k, SoloGame 1.1k, Arena 1.0k), and there's been no i18n, accessibility or tablet pass.

### 48. Network layer
Retrofit/OkHttp with an auth interceptor, an `Idempotency-Key` on every POST, a refresh-token
authenticator, encrypted token storage and a Socket.IO client.

### 49. Tests & CI
Server: `npm test` (node:test against the real app on a throwaway DB) and ESLint. Android:
Robolectric Compose tests with an injectable `ApiService`. `.github/workflows/ci.yml` runs both on
every push and pull request.

## Backlog

1. Server grading for solo answers (§18) — needs a decision on per-answer latency.
2. Split the oversized Android files (§47).
3. Push notifications: FCM credential plus token registration in the app (§44).
4. Club seasons (§40) and device/multi-account integrity checks (§38).
5. Accessibility, i18n and tablet layouts.
6. Use `practice_schedule` for reminders or drop it (§45).
7. Offsite, encrypted backups (§2).
