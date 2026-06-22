# Feature map

**The lookup table.** For a task like "fix achievements", find the row and read only those
files. Server is authoritative; the Android column is render + input only.

Conventions: server route = `server/routes/<file>.js`; service = `server/services/`; engine =
`server/mathEngine/`; lib = `server/lib/`. Android feature = `android/.../ui/feature/<pkg>/`.

| Feature | Server (routes / services / engine) | Android |
|---|---|---|
| **Auth & sessions** | `routes/auth.js`, `middleware/auth.js`, `lib/passwords.js` `lib/totp.js` `lib/commonPasswords.js`, `services/mailer.js` | `ui/screens/AuthScreens.kt`, `data/network/RetrofitClient.kt`, `Navigation.kt` |
| **Onboarding** | `routes/onboarding.js` | `ui/feature/onboarding/` |
| **Math: problems & generation** | `routes/math.js`, `mathGenerator.js`, `mathEngine/{templates,distractors,validation,generation}` | `ui/feature/game/` (`SoloGameScreen`, `GameplayScreen`, `RecapScreen`) |
| **Lessons (concept-first)** | `mathEngine/{conceptLessons,lessons,explanationEngine,tips}.js`, `routes/learn.js` | `ui/feature/game/LessonScreen.kt`, `LessonComponents.kt` |
| **Adaptive learning / mastery** | `mathEngine/{problemOrchestrator,masteryEngine,learnerModel,adaptive,retentionEngine,remediationEngine}.js`, `routes/engine.js` | `ui/feature/profile/` (mastery/growth/skill-tree cards) |
| **Misconceptions / Socratic / self-explain** | `mathEngine/{misconceptionEngine,socraticEngine,selfExplainEngine,workedExampleEngine,hintLadder}.js` | `ui/feature/game/GameplayScreen.kt` (banners/overlays) |
| **Visual / interactive learning** | `mathEngine/visualEngine.js` (`interactiveVisualJson`) | `ui/feature/game/` WebView canvas manipulatives |
| **Exercise variety** | `mathEngine/{estimation,wordProblems,transferEngine,exerciseMemory,lessonSafety}.js`, `routes/transfer.js` | game modes in `ui/feature/game/` |
| **Levels / archive (level map)** | `routes/archive.js`, `routes/library.js` | `ui/feature/archive/LevelMapScreen.kt` |
| **Daily puzzle** | `routes/dailyPuzzle.js` | dashboard / archive entry points |
| **Mistake bank & SRS** | `routes/mistakes.js`, `routes/srs.js`, `services/srsService.js` | mistakes-practice game mode |
| **Assessment / checkpoint / placement** | `routes/assessment.js`, `routes/math.js` (checkpoint-exam) | `ui/screens/PlacementTestScreen.kt` |
| **Duels (live, bot, async, reasoning)** | `server.js` Socket.IO + `routes/{botDuel,asyncDuel,reasoningDuel}.js`, `services/{arenaService,matchLog,integrityEngine}.js`, `lib/{duelIntegrity,duelMoments,arenaDifficulty,integritySignals}.js` | `ui/screens/DuelGameScreen.kt`, `ui/feature/arena/`, `data/network/SocketClient.kt` |
| **Rating (Elo + NRS)** | `routes/rating.js`, `services/ratingService.js`, `mathEngine/ratingEngine.js` | arena rating/rank UI in `ui/feature/arena/`, `theme/RankBadge` |
| **Leagues & seasons** | `routes/league.js`, `services/rankRewardService.js` | league/season screens in `ui/feature/arena/` |
| **Tournaments / challenges / live rooms** | `routes/{tournaments,challenges,liveRoom}.js` | `ui/feature/arena/{TournamentScreen,ChallengesScreen}.kt` |
| **Clubs & club wars** | `routes/{clubs,clubWars}.js` | `ui/feature/social/{ClubsScreen,ClubWarsScreen}.kt` |
| **Achievements** | `routes/achievements.js`, `services/achievementService.js` | profile achievements UI |
| **Streaks / commitment** | `routes/commitment.js`, `services/commitmentService.js` | `ui/dialogs/CommitmentStatusDialog.kt` |
| **Quests** | `routes/quests.js`, `lib/questDefs.js` | dashboard quest cards |
| **Shop & cosmetics** | `routes/shop.js`, `lib/titles.js` | `ui/feature/shop/`, `ui/components/ProfileCosmetics.kt` |
| **Profile & public profile** | `routes/{publicProfile,publicProfilePage}.js`, `routes/account.js` | `ui/feature/profile/`, `ui/feature/profile/UserProfileDialog.kt` |
| **Social (friends, discussion)** | `routes/{friends,discussion}.js`, `lib/discussionSeeds.js` | `ui/feature/social/` |
| **Leaderboard** | `routes/leaderboard.js` | leaderboard UI in arena/social |
| **Notifications & lifecycle** | `routes/notifications.js`, `services/{notificationService,lifecycleJobs,pushSender,retention}.js` | `ui/dialogs/` notifications |
| **Settings** | `routes/account.js` | `ui/feature/settings/SettingsScreen.kt` |
| **Dashboard / Today** | `routes/today.js` | `ui/feature/dashboard/DashboardScreen.kt` |
| **Parent / school channel** | `routes/classes.js`, `services/progressReport.js` | classes dialog |
| **Engine feed (telemetry)** | `services/engineFeed.js`, `routes/{engine,analytics}.js` | fire-and-forget from game screens |
| **Moderation / feedback / reports** | `routes/{moderation,feedback}.js` | report dialogs |
| **CAS / equivalence** | `routes/cas.js`, `mathEngine/{answerEquivalence,symbolic,cas/}.js` | CAS solver dialog |
| **Crash reporting** | `routes/crash.js` | `CrashReporter` (Android) |
| **Public web (SEO/landing/worksheets)** | `server.js` `/`, `routes/{learn,worksheet}.js`, `server/public/` | — (server-rendered HTML) |

## Cross-cutting (touch carefully — wide blast radius)

| Concern | Files |
|---|---|
| DB schema | `server/db.js` (baseline) + `server/migrations.js` (append-only) |
| Transactions / write connection | `server/dbx.js` |
| Idempotency | `server/idempotency.js` + `RetrofitClient` POST interceptor |
| Shared DTOs | `android/.../data/network/Models.kt` + `ApiService.kt` |
| Theme/tokens | `android/.../theme/` |
| App shell & nav | `Navigation.kt`, `ui/screens/MainTabsScreen.kt` |
