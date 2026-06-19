package com.example.numera.data.network

import kotlinx.serialization.Serializable

@Serializable
data class CategoryMastery(
    val arithmetic_correct: Int,
    val mental_correct: Int,
    val algebra_correct: Int,
    val calculus_correct: Int,
    val combinatorics_correct: Int,
    val number_theory_correct: Int,
    // Curriculum strands (server migration v27). Defaults keep old payloads parseable.
    val geometry_correct: Int = 0,
    val integers_correct: Int = 0,
    val decimals_correct: Int = 0,
    val fractions_correct: Int = 0,
    val number_sense_correct: Int = 0,
    val statistics_correct: Int = 0,
    val expressions_correct: Int = 0,
    val powers_correct: Int = 0,
    val graphing_correct: Int = 0,
    val inequalities_correct: Int = 0,
    val functions_correct: Int = 0,
    val sequences_correct: Int = 0,
    val equations_correct: Int = 0,
    val rates_correct: Int = 0,
    val factors_correct: Int = 0
)

// Multi-dimensional mastery (server mathEngine/masteryEngine.js). Each dimension is 0..1.
@Serializable
data class MasteryDimensions(
    val accuracy: Float = 0f,
    val fluency: Float = 0f,
    val retention: Float = 0f,
    val independence: Float = 0f,
    val transfer: Float = 0f
)

@Serializable
data class MasteryProfile(
    val dimensions: MasteryDimensions = MasteryDimensions(),
    val overall: Float = 0f,
    val stage: String = "",
    val weakest: String? = null,
    val conceptCount: Int = 0
)

// Subset of GET /api/engine/learner we render (Gson ignores the rest).
@Serializable
data class LearnerModelResponse(
    val masteryProfile: MasteryProfile? = null
)

// Transfer challenge (Sprint 4): a novel-context framing of a concept (GET /api/math/transfer/challenge).
@Serializable
data class TransferProblem(
    val question: String,
    val correctAnswer: String,
    val options: List<String>,
    val explanation: String,
    val isTransfer: Boolean = true
)

@Serializable
data class TransferChallengeResponse(
    val conceptId: String,
    val conceptName: String = "",
    val transferContext: String? = null,
    val problem: TransferProblem
)

@Serializable
data class TransferResultRequest(
    val conceptId: String,
    val correct: Boolean
)

// Orchestrator's "best next step" (GET /api/engine/next). `reason` drives a home-screen nudge;
// `meta.focus` carries the server-authored focus copy for dimension_building.
@Serializable
data class MasteryFocus(
    val dimension: String? = null,
    val action: String? = null,
    val message: String? = null
)

@Serializable
data class RecommendationMeta(
    val dimension: String? = null,
    val focus: MasteryFocus? = null
)

@Serializable
data class NextRecommendationResponse(
    val conceptId: String? = null,
    val reason: String? = null,
    val learningStyle: String? = null,
    val meta: RecommendationMeta? = null
)

@Serializable
data class User(
    val id: Int,
    val username: String,
    val xp: Int,
    val level: Int,
    val coins: Int,
    val rank: String,
    val streak: Int,
    val active_badge: String? = null,
    val theme: String? = null,
    val avatar: String? = null,
    val active_banner: String? = null,
    val assessment_taken: Int? = null,
    val onboarding_complete: Int? = 0,
    val is_guest: Int? = 0,
    val display_name: String? = null,
    val reminders_opt_in: Int? = 0,
    val league: String? = null,
    val league_points: Int? = null,
    val solved_count: Int? = null,
    val arena_wins: Int? = null,
    val elo: Int? = null,
    val competitive_matches: Int? = null,
    val total_coins_earned: Int? = null,
    val total_coins_spent: Int? = null,
    val xp_booster_uses_left: Int? = null,
    val max_streak: Int? = 0,
    val commitment_state: String? = "active",
    val burnout_risk: String? = "low",
    val consistency_index: Float? = 0f,
    val email: String? = "",
    val telemetry_enabled: Int? = 1,
    val profile_private: Int? = 0,
    val mastery: CategoryMastery? = null
)

@Serializable
data class PublicProfile(
    val id: Int,
    val username: String,
    val xp: Int,
    val level: Int,
    val coins: Int,
    val rank: String,
    val active_badge: String? = null,
    val theme: String? = null,
    val avatar: String? = null,
    val active_banner: String? = null,
    val solved_count: Int,
    val arena_wins: Int,
    val mastery: CategoryMastery
)

@Serializable
data class Friend(
    val id: Int,
    val username: String,
    val xp: Int,
    val level: Int,
    val rank: String,
    val active_badge: String? = null,
    val avatar: String? = null,
    val active_banner: String? = null,
    val status: String, // "pending" or "accepted"
    val incoming: Boolean = false // true = they sent it to me (I can accept/decline)
)

@Serializable
data class ShopItem(
    val id: String,
    val name: String,
    val cost: Int,
    val type: String, // "avatar", "theme", "badge", "banner", "utility"
    val value: String,
    val rarity: String? = "Common",
    val description: String? = "",
    val required_rank: String? = null,
    val is_animated: Int? = 0,
    val particle_effect: String? = null,
    val is_utility: Int? = 0,
    val originalCost: Int? = null,
    val discountActive: Boolean? = null,
    // Seasonal sink (#66/#75): season_slot != null => buyable only this season; token_cost > 0 =>
    // a token-only prestige item (paid in Season Tokens, not coins).
    val season_slot: Int? = null,
    val token_cost: Int? = 0
)

@Serializable
data class TipMetadata(
    val concept: String? = null,
    val subskill: String? = null,
    val difficulty: String? = null,
    val learningObjective: String? = null,
    val commonMistakes: String? = null
)

@Serializable
data class MathProblem(
    val question: String,
    val correctAnswer: String,
    val options: List<String>,
    val explanation: String,
    val tip: String? = null,
    val tipMetadata: TipMetadata? = null,
    // Declarative interactive-visual spec (JSON string) chosen by the server's
    // Adaptive Visual Intelligence. Forwarded verbatim to the canvas renderer.
    val interactiveVisualJson: String? = null,
    // Socratic wrong-answer feedback (JSON string) from the server's socraticEngine:
    // { byOption: { "<wrongOption>": {misconception, probe, hint} }, generic: {probe, hint} }.
    // Carried as a string for the same reason as interactiveVisualJson (Gson/kotlinx mix).
    val socraticJson: String? = null,
    // Self-explanation prompt (JSON string) from the server's selfExplainEngine, shown after a
    // CORRECT answer: { question, options: [{text, correct}], explanation }. '' / null when the
    // concept has no authored reason-set (the client renders nothing).
    val selfExplainJson: String? = null,
    // Worked example (JSON string) from the server's workedExampleEngine, offered after a WRONG
    // answer: { problem, steps: [{action, math, why}] }. The example uses its OWN numbers (not the
    // live problem), so it teaches the method without leaking the answer. '' / null when unauthored.
    val workedExampleJson: String? = null,
    // The generator's template/concept key for this problem. Reported back in per-answer telemetry
    // so the server's learning-intelligence engine (mastery, retention, misconceptions) can attribute
    // the outcome to the right concept. Server-supplied; absent on client-built fixtures.
    val templateType: String? = null
)

@Serializable
data class MathExample(
    val question: String,
    val answer: String,
    val explanation: String
)

// Concept-first lesson sections (server: conceptLessons.js). All optional so
// legacy lessons without rich content deserialize cleanly to null.
@Serializable
data class LessonRepresentation(
    val kind: String? = null,   // number_line | area_model | real_world | symbolic | balance | grid
    val label: String = "",
    val body: String = ""
)

@Serializable
data class LessonMistake(
    val label: String = "",
    val why: String? = null,
    val fix: String? = null
)

@Serializable
data class LessonConnection(
    val concept: String? = null,
    val note: String = ""
)

@Serializable
data class LessonSections(
    val intuitionHook: String? = null,
    val whatItIs: String? = null,
    val whyItWorks: String? = null,
    val whenToUse: String? = null,
    val representations: List<LessonRepresentation>? = null,
    val commonMistakes: List<LessonMistake>? = null,
    val connections: List<LessonConnection>? = null
)

@Serializable
data class MathLevelResponse(
    val category: String,
    val level: Int,
    val lessonTitle: String? = null,
    val lessonContent: String? = null,
    val lessonFormula: String? = null,
    val examples: List<MathExample>? = null,
    val lessonSections: LessonSections? = null,
    val problems: List<MathProblem>
)

@Serializable
data class LegacyExercise(
    val id: Int,
    val title: String,
    val story: String,
    val question: String,
    val correct_answer: String,
    val options: List<String>,
    val explanation: String,
    val difficulty: String,
    val category: String = "arithmetic",
    val stars: Int = 3
)

@Serializable
data class ArchiveExercise(
    val id: Int,
    val title: String,
    val story: String = "",
    val question: String,
    val correct_answer: String,
    val options: List<String>,
    val explanation: String,
    val category: String,
    val stars: Int = 3,
    val source: String = "Favorites",
    val lessonTitle: String? = null,
    val lessonContent: String? = null,
    val lessonFormula: String? = null,
    val examples: List<MathExample>? = null,
    val lessonSections: LessonSections? = null,
    val collection_id: Int? = null,
    val tip: String? = null,
    val tipMetadata: TipMetadata? = null
)

@Serializable
data class Mistake(
    val id: Int,
    val user_id: Int,
    val category: String,
    val question: String,
    val correct_answer: String,
    val options: List<String>,
    val explanation: String,
    val created_at: Long
)

@Serializable
data class Quest(
    val type: String,
    val name: String,
    val description: String,
    val target: Int,
    val current: Int,
    val claimed: Int,
    val rewardCoins: Int,
    val rewardXp: Int
)

@Serializable
data class DailyPuzzle(
    val id: Int? = null,
    val title: String? = null,
    val story: String? = null,
    val question: String? = null,
    val correct_answer: String? = null,
    val options: List<String>? = null,
    val explanation: String? = null,
    val category: String? = null,
    val stars: Int? = null,
    val source: String? = null,
    val solved_today: Boolean? = null,
    val lessonTitle: String? = null,
    val lessonContent: String? = null,
    val lessonFormula: String? = null,
    val examples: List<MathExample>? = null,
    val lessonSections: LessonSections? = null,
    val tip: String? = null,
    val tipMetadata: TipMetadata? = null
)

@Serializable
data class LeagueStandingUser(
    val id: Int,
    val username: String,
    val league_points: Int,
    val avatar: String? = null,
    val active_badge: String? = null,
    val level: Int
)

@Serializable
data class LeagueLeaderboardResponse(
    val league: String,
    val seconds_remaining: Long,
    val standings: List<LeagueStandingUser>
)

@Serializable
data class AddMistakeRequest(
    val category: String,
    val question: String,
    val correct_answer: String,
    val options: List<String>,
    val explanation: String
)

@Serializable
data class ResolveMistakeRequest(
    val mistakeId: Int
)

@Serializable
data class ResolveMistakeResponse(
    val success: Boolean,
    val coinsGained: Int,
    val xpGained: Int,
    val xp: Int,
    val level: Int,
    val coins: Int,
    val rank: String
)

@Serializable
data class ClaimQuestRequest(
    val questType: String
)

@Serializable
data class ClaimQuestResponse(
    val success: Boolean,
    val rewardCoins: Int,
    val rewardXp: Int,
    val xp: Int,
    val level: Int,
    val coins: Int,
    val rank: String
)

@Serializable
data class DailyPuzzleSubmitRequest(
    val correct: Boolean
)

@Serializable
data class DailyPuzzleSubmitResponse(
    val success: Boolean,
    val message: String,
    val alreadySolved: Boolean? = null,
    val rewardCoins: Int? = null,
    val rewardXp: Int? = null,
    val xp: Int? = null,
    val level: Int? = null,
    val coins: Int? = null,
    val rank: String? = null
)

@Serializable
data class RegisterRequest(
    val username: String,
    val password: String,
    val avatar: String? = null,
    val birthDate: String? = null // ISO YYYY-MM-DD; required by the server age gate (13+)
)

@Serializable
data class Achievement(
    val id: String,
    val name: String,
    val description: String,
    val icon: String,
    val target_value: Int,
    val reward_coins: Int,
    val progress: Int,
    val claimed: Int,
    val completed_at: Long,
    val category: String? = null,
    val chain_id: String? = null,
    val chain_order: Int? = null,
    val is_hidden: Int? = null
)

@Serializable
data class AchievementClaimRequest(
    val achievementId: String
)

@Serializable
data class AchievementClaimResponse(
    val success: Boolean,
    val rewardCoins: Int
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

// Flags a specific generated exercise as wrong/confusing/etc. — the content-quality feedback loop.
// `reason` is one of: wrong_answer, typo, confusing, renders_wrong, too_easy, too_hard, other.
@Serializable
data class ProblemReportRequest(
    val question: String,
    val correctAnswer: String? = null,
    val category: String? = null,
    val level: Int? = null,
    val gameMode: String? = null,
    val reason: String,
    val note: String? = null
)

@Serializable
data class ProblemReportResponse(
    val success: Boolean = false
)

// School channel: class-code create/join + teacher roster.
@Serializable
data class ClassCreateRequest(val name: String)

@Serializable
data class ClassCreateResponse(val id: Int = 0, val code: String = "", val name: String = "")

@Serializable
data class ClassJoinRequest(val code: String)

@Serializable
data class ClassJoinResponse(val id: Int = 0, val name: String = "")

@Serializable
data class TaughtClass(val id: Int = 0, val code: String = "", val name: String = "", val memberCount: Int = 0)

@Serializable
data class JoinedClass(val id: Int = 0, val name: String = "", val teacher: String = "")

@Serializable
data class MyClassesResponse(val teaching: List<TaughtClass> = emptyList(), val joined: List<JoinedClass> = emptyList())

@Serializable
data class RosterMember(
    val name: String = "",
    val level: Int = 1,
    val streak: Int = 0,
    val totalSolved: Int = 0,
    val topStrength: String? = null
)

@Serializable
data class ClassRosterResponse(
    val id: Int = 0,
    val name: String = "",
    val code: String = "",
    val members: List<RosterMember> = emptyList()
)

// Parent channel: a learner-set guardian email + a plain-language progress report to share.
@Serializable
data class GuardianRequest(val email: String)

@Serializable
data class GuardianResponse(val success: Boolean = false, val sharing: Boolean = false)

@Serializable
data class ProgressStrength(val label: String = "", val solved: Int = 0)

@Serializable
data class ProgressReport(
    val name: String = "",
    val level: Int = 1,
    val rank: String = "",
    val streak: Int = 0,
    val maxStreak: Int = 0,
    val totalSolved: Int = 0,
    val strengths: List<ProgressStrength> = emptyList()
)

@Serializable
data class ProgressReportResponse(
    val report: ProgressReport = ProgressReport(),
    val guardianEmail: String = ""
)

@Serializable
data class SendProgressResponse(val success: Boolean = false)

// Privacy-first product analytics: a single allowlisted event key, counted server-side in
// aggregate (no user/device linkage is ever sent or stored).
@Serializable
data class AnalyticsEventRequest(
    val event: String
)

@Serializable
data class AnalyticsEventResponse(
    val success: Boolean = false,
    val recorded: Boolean = false
)

// A mixed-strand cumulative checkpoint exam (problems interleave concepts across strands).
@Serializable
data class CheckpointExamResponse(
    val count: Int = 0,
    val level: Int = 1,
    val strands: List<String> = emptyList(),
    val problems: List<MathProblem> = emptyList()
)

// Applied word problems (ultra review #9): a server-assembled MCQ set of real-world contexts.
@Serializable
data class WordProblemResponse(
    val count: Int = 0,
    val level: Int = 1,
    val problems: List<MathProblem> = emptyList()
)

// Estimation / number-sense (ultra review edu#16): a server-assembled "best estimate" MCQ set.
@Serializable
data class EstimationResponse(
    val count: Int = 0,
    val level: Int = 1,
    val problems: List<MathProblem> = emptyList()
)

// Upgrades a guest account in place into a full account (keeps all progress). Same shape as
// RegisterRequest; sent to /api/auth/convert with the guest's bearer token.
@Serializable
data class ConvertRequest(
    val username: String,
    val password: String,
    val avatar: String? = null,
    val birthDate: String? = null
)

// token/user are absent when the server demands a second factor — then mfaRequired=true and a
// short-lived `challenge` is returned, which the client exchanges at /api/auth/mfa/login.
// `token` aliases `accessToken`; `refreshToken` rotates and is exchanged at /api/auth/refresh.
@Serializable
data class AuthResponse(
    val token: String? = null,
    val accessToken: String? = null,
    val refreshToken: String? = null,
    val user: User? = null,
    val mfaRequired: Boolean? = null,
    val challenge: String? = null
)

@Serializable
data class RefreshRequest(val refreshToken: String)

// ---- MFA (TOTP authenticator + one-time recovery codes) ----
@Serializable
data class MfaLoginRequest(
    val challenge: String,
    val token: String? = null,        // 6-digit TOTP code
    val recoveryCode: String? = null  // or a one-time recovery code
)

@Serializable
data class MfaStatusResponse(val enabled: Boolean)

@Serializable
data class MfaSetupResponse(
    val secret: String,
    val otpauthUri: String
)

@Serializable
data class MfaEnableRequest(val token: String)

@Serializable
data class MfaEnableResponse(
    val success: Boolean,
    val recoveryCodes: List<String>
)

@Serializable
data class MfaDisableRequest(val password: String)

@Serializable
data class GenericMessageResponse(
    val success: Boolean? = null,
    val message: String? = null,
    val error: String? = null
)

// ---- Password reset (email-delivered code) ----
@Serializable
data class ForgotPasswordRequest(val username: String)

@Serializable
data class ResetPasswordRequest(
    val username: String,
    val code: String,
    val newPassword: String
)

// Per-answer cognitive telemetry. Fire-and-forget after each solved/missed problem; revives the
// server's learning-intelligence engine (mastery, retention, teaching-style, and — when the chosen
// wrong answer is included — misconception tracking that powers Growth Insights). PII-free.
@Serializable
data class TelemetryRequest(
    val concept: String,
    val isCorrect: Boolean,
    val speed: Float? = null,
    val templateType: String? = null,
    val correctAnswer: String? = null,
    val wrongAnswer: String? = null
)

@Serializable
data class TelemetryResponse(val success: Boolean? = null)

// Learner-facing "Growth Insights" (ultra review edu#44): what you're strong at, and the error
// habits worth watching — the engine's view, made visible.
@Serializable
data class GrowthStrength(val name: String, val successRate: Int)

@Serializable
data class GrowthWatchArea(
    val conceptName: String? = null,
    val label: String,
    val severity: String? = null,
    val frequency: Int? = null,
    // Actionable corrective guidance (the fix, not just the diagnosis) — revealed on tap.
    val tip: String? = null
)

@Serializable
data class GrowthProfileResponse(
    val practiced: Int = 0,
    val strengths: List<GrowthStrength> = emptyList(),
    val watchAreas: List<GrowthWatchArea> = emptyList()
)

@Serializable
data class CompleteSessionRequest(
    val xpGained: Int,
    val coinsGained: Int,
    val solvedCount: Int,
    val category: String? = null,
    val level: Int? = null,
    val errorsCount: Int? = null,
    val speedBonus: Int? = null,
    val comboBonus: Int? = null,
    val gameMode: String? = null,
    val totalTime: Int? = null
)

@Serializable
data class CompleteSessionResponse(
    val xp: Int,
    val level: Int,
    val coins: Int,
    val rank: String,
    val levelUp: Boolean,
    val streakBonusActive: Boolean? = null,
    val coinsGained: Int? = null,
    val xpGained: Int? = null,
    val criticalBonusActive: Boolean? = null,
    val xpBoosterActive: Boolean? = null,
    val xpBoosterUsesLeft: Int? = null,
    // Present when this level's solves pushed the category across a mastery milestone — the
    // client turns it into the signature mastery-up celebration (ultra-review #20).
    val masteryMilestone: MasteryMilestone? = null
)

@Serializable
data class MasteryMilestone(
    val category: String = "",
    val label: String = "",
    val count: Int = 0
)

@Serializable
data class SrsReviewRequest(
    val topic: String,
    val quality: Int
)

@Serializable
data class SrsReviewResponse(
    val topic: String,
    val ease_factor: Float,
    val interval: Int,
    val next_review: Long
)

@Serializable
data class SrsDueItem(
    val id: Int,
    val user_id: Int,
    val topic: String,
    val ease_factor: Float,
    val interval: Int,
    val repetitions: Int,
    val next_review: Long
)

@Serializable
data class UtilityBalance(
    val user_id: Int,
    val item_id: String,
    val quantity: Int
)

@Serializable
data class ShopResponse(
    val items: List<ShopItem>,
    val inventory: List<String>,
    val featuredItems: List<ShopItem>? = null,
    val dailyItems: List<ShopItem>? = null,
    val utilityItems: List<ShopItem>? = null,
    val catalogItems: List<ShopItem>? = null,
    val seasonItems: List<ShopItem>? = null,
    val tokenItems: List<ShopItem>? = null,
    val seasonInfo: ShopSeasonInfo? = null,
    val seasonTokens: Int? = 0,
    val utilities: List<UtilityBalance>? = null,
    val expiresInSeconds: Long? = null,
    val featuredExpiresInSeconds: Long? = null,
    val saveRate: Float? = null,
    val discountApplied: Boolean? = null
)

@Serializable
data class ShopSeasonInfo(
    val seasonId: Int = 0,
    val seasonName: String = "",
    val slot: Int = 0,
    val endsAt: Long = 0
)

@Serializable
data class ConvertCoinsRequest(
    val tokens: Int
)

@Serializable
data class ConvertCoinsResponse(
    val success: Boolean = false,
    val tokensGained: Int = 0,
    val coinsSpent: Int = 0,
    val coins: Int = 0,
    val seasonTokens: Int = 0
)

@Serializable
data class PurchaseRequest(
    val itemId: String
)

@Serializable
data class PurchaseResponse(
    val success: Boolean,
    val message: String,
    val coinsLeft: Int
)

@Serializable
data class EquipRequest(
    val type: String,
    val value: String
)

@Serializable
data class EquipResponse(
    val success: Boolean,
    val equipped: String,
    val value: String
)

@Serializable
data class FriendRequestPayload(
    val friendUsername: String
)

@Serializable
data class FriendAcceptPayload(
    val friendId: Int
)

@Serializable
data class SimpleResponse(
    val success: Boolean,
    val message: String
)

// ---- UGC moderation -------------------------------------------------------
@Serializable
data class BlockRequest(
    val userId: Int
)

@Serializable
data class ReportRequest(
    val targetType: String, // "user" | "collection"
    val targetId: Int,
    val reason: String? = null
)

@Serializable
data class BlockedUser(
    val userId: Int,
    val username: String,
    val created_at: Long = 0
)

@Serializable
data class AssessmentSubmitRequest(
    val score: Int
)

@Serializable
data class AssessmentSubmitResponse(
    val success: Boolean,
    val assignedLevel: Int,
    val assignedRank: String,
    val rewardsUnlocked: List<String>
)

@Serializable
data class PasswordChangeRequest(
    val oldPassword: String,
    val newPassword: String
)

@Serializable
data class PasswordChangeResponse(
    val success: Boolean,
    val message: String
)

@Serializable
data class Relic(
    val relic_id: String,
    val unlocked_at: Long
)

@Serializable
data class ActivityDay(
    val date: String,
    val solved_count: Int
)

@Serializable
data class CommitmentStatusResponse(
    val streak: Int,
    val maxStreak: Int,
    val commitmentState: String,
    val burnoutRisk: String,
    val consistencyIndex: Float,
    val shieldsCount: Int,
    val coins: Int,
    val message: String,
    val challengeQuestionsCount: Int,
    val relics: List<Relic>,
    val activityHistory: List<ActivityDay>? = null,
    // Non-null only while a just-lost streak can still be bought back (the repair grace window).
    val streakRepair: StreakRepairOffer? = null
)

@Serializable
data class StreakRepairOffer(
    val lostStreak: Int,
    val cost: Int,
    val expiresAt: Long
)

@Serializable
data class StreakRepairResponse(
    val success: Boolean = false,
    val message: String = "",
    val restoredStreak: Int = 0,
    val user: User? = null
)

@Serializable
data class RecommitRequest(
    val method: String
)

@Serializable
data class RecommitResponse(
    val success: Boolean,
    val message: String,
    val user: User
)

@Serializable
data class ToggleFavoriteRequest(
    val title: String,
    val category: String,
    val question: String,
    val correct_answer: String,
    val options: List<String>,
    val explanation: String
)

@Serializable
data class ToggleFavoriteResponse(
    val success: Boolean,
    val saved: Boolean,
    val message: String
)

@Serializable
data class NotificationItemDto(
    val id: Int,
    val title: String,
    val message: String,
    val type: String,
    val read_state: Int,
    val created_at: Long
)

@Serializable
data class MarkReadRequest(
    val notificationId: Int? = null
)

@Serializable
data class ChangeUsernameRequest(
    val username: String
)

@Serializable
data class RequestEmailChangePayload(
    val email: String
)

@Serializable
data class RequestEmailChangeResponse(
    val success: Boolean,
    val message: String,
    val code: String? = null
)

@Serializable
data class VerifyEmailChangePayload(
    val code: String
)

@Serializable
data class PrivacyUpdateRequest(
    val telemetryEnabled: Boolean,
    val profilePrivate: Boolean
)

// Server-backed lifecycle/notification preferences (GET /api/notifications/preferences).
// Field names are snake_case to match the server JSON keys exactly.
@Serializable
data class NotificationPreferencesDto(
    val email_enabled: Int = 1,
    val email_lifecycle: Int = 1,
    val push_enabled: Int = 0,
    val quiet_hours_start: Int = 21,
    val quiet_hours_end: Int = 8,
    val tz_offset_minutes: Int = 0
)

// Partial update: only non-null fields are serialized (encodeDefaults=false), so the server
// merges just the changed field(s) onto the user's current prefs.
@Serializable
data class NotificationPreferencesUpdateRequest(
    val email_enabled: Int? = null,
    val email_lifecycle: Int? = null,
    val push_enabled: Int? = null,
    val quiet_hours_start: Int? = null,
    val quiet_hours_end: Int? = null,
    val tz_offset_minutes: Int? = null
)

@Serializable
data class NotificationPreferencesResponse(
    val success: Boolean = false,
    val preferences: NotificationPreferencesDto? = null
)

// ---- Puzzle Rush (solo time-attack ladder) ----
@Serializable
data class PuzzleRushProblemDto(
    val question: String = "",
    val options: List<String> = emptyList(),
    val correctAnswer: String? = null // never sent for an active problem; only as the missed reveal
)

@Serializable
data class PuzzleRushStartResponse(
    val runId: Int = 0,
    val index: Int = 0,
    val lives: Int = 0,
    val score: Int = 0,
    val problem: PuzzleRushProblemDto = PuzzleRushProblemDto()
)

@Serializable
data class PuzzleRushSubmitRequest(
    val runId: Int,
    val index: Int,
    val answer: String
)

@Serializable
data class PuzzleRushSubmitResponse(
    val correct: Boolean = false,
    val gameOver: Boolean = false,
    val score: Int = 0,
    val lives: Int = 0,
    val index: Int = 0,
    val correctAnswer: String? = null,
    val finalScore: Int? = null,
    val reward: Int? = null,
    val flagged: Boolean = false,
    val problem: PuzzleRushProblemDto? = null
)

@Serializable
data class PuzzleRushLeaderboardEntry(
    val username: String = "",
    val best: Int = 0
)

@Serializable
data class PuzzleRushLeaderboardResponse(
    val leaderboard: List<PuzzleRushLeaderboardEntry> = emptyList(),
    val personalBest: Int = 0
)

// ---- Async (correspondence) duels ----
@Serializable
data class AsyncChallengeRequest(val opponentId: Int)

@Serializable
data class AsyncChallengeResponse(val matchId: Int = 0, val problemCount: Int = 0)

@Serializable
data class AsyncMatchSummary(
    val matchId: Int = 0,
    val opponentName: String = "",
    val status: String = "",        // pending | finished | expired
    val yourTurn: Boolean = false,
    val played: Boolean = false,
    val myScore: Int? = null,
    val theirScore: Int? = null,
    val winnerId: Int? = null,
    val won: Boolean = false,
    val reward: Int = 0,
    val problemCount: Int = 0
)

@Serializable
data class AsyncProblemDto(val question: String = "", val options: List<String> = emptyList())

@Serializable
data class AsyncPlayFetchResponse(
    val matchId: Int = 0,
    val problems: List<AsyncProblemDto> = emptyList(),
    val problemCount: Int = 0
)

@Serializable
data class AsyncPlayRequest(val answers: List<String>)

@Serializable
data class AsyncResultDto(
    val winnerId: Int? = null,
    val challengerScore: Int = 0,
    val opponentScore: Int = 0,
    val reward: Int = 0
)

@Serializable
data class AsyncPlayResponse(
    val success: Boolean = false,
    val score: Int = 0,
    val resolved: Boolean = false,
    val result: AsyncResultDto? = null
)

// ---- Bot duels (calibrated AI opponent) ----
@Serializable
data class BotStartRequest(val tier: String)

@Serializable
data class BotDuelStartResponse(
    val matchId: Int = 0,
    val tier: String = "",
    val botRating: Int = 0,
    val problemCount: Int = 0,
    val problems: List<AsyncProblemDto> = emptyList()
)

@Serializable
data class BotPlayRequest(val answers: List<String>)

@Serializable
data class BotPlayResponse(
    val success: Boolean = false,
    val userScore: Int = 0,
    val botScore: Int = 0,
    val winner: String = "",
    val reward: Int = 0
)

// ---- Custom Challenges (user-created problem sets — audit #10) ----
@Serializable
data class ChallengeConcept(val conceptId: String = "", val name: String = "", val category: String = "", val level: Int = 0)

@Serializable
data class ChallengeConceptsResponse(val concepts: List<ChallengeConcept> = emptyList(), val countMin: Int = 5, val countMax: Int = 15)

@Serializable
data class CreateChallengeRequest(val title: String, val conceptId: String, val count: Int)

@Serializable
data class CreateChallengeResponse(val id: Int = 0, val code: String = "", val title: String = "", val conceptName: String = "", val problemCount: Int = 0)

@Serializable
data class ChallengeListItem(
    val code: String = "",
    val title: String = "",
    val conceptName: String = "",
    val problemCount: Int = 0,
    val playCount: Int = 0,
    val isMine: Boolean = false,
    val yourScore: Int? = null
)

@Serializable
data class ChallengeListResponse(val challenges: List<ChallengeListItem> = emptyList())

@Serializable
data class ChallengeAttemptDto(val score: Int = 0, val elapsedMs: Long = 0)

@Serializable
data class ChallengeLeaderboardEntry(
    val position: Int = 0,
    val username: String = "",
    val userId: Int = 0,
    val score: Int = 0,
    val elapsedMs: Long = 0
)

@Serializable
data class ChallengeDetailResponse(
    val code: String = "",
    val title: String = "",
    val conceptName: String = "",
    val creator: String = "",
    val isMine: Boolean = false,
    val problemCount: Int = 0,
    val playCount: Int = 0,
    val problems: List<AsyncProblemDto> = emptyList(),
    val yourAttempt: ChallengeAttemptDto? = null,
    val leaderboard: List<ChallengeLeaderboardEntry> = emptyList()
)

@Serializable
data class PlayChallengeRequest(val answers: List<String>, val elapsedMs: Long = 0)

@Serializable
data class PlayChallengeResponse(
    val alreadyPlayed: Boolean = false,
    val score: Int = 0,
    val elapsedMs: Long = 0,
    val total: Int = 0,
    val leaderboard: List<ChallengeLeaderboardEntry> = emptyList()
)

// ---- Ranked seasons with rewards (audit #4) ----
@Serializable
data class SeasonInfo(val id: Int = 0, val name: String = "", val endAt: Long = 0)

@Serializable
data class SeasonLeaderboardEntry(
    val position: Int = 0,
    val username: String = "",
    val userId: Int = 0,
    val peak: Int = 0,
    val isMe: Boolean = false
)

@Serializable
data class SeasonLeaderboardResponse(
    val season: SeasonInfo = SeasonInfo(),
    val leaderboard: List<SeasonLeaderboardEntry> = emptyList(),
    val yourRank: Int? = null
)

// ---- Unified competitive rating (NRS) — GET /api/rating/profile ----
// One (mu/sigma) rating per domain; `displayRating` is the conservative mu−2σ shown to the player,
// `rank` its ladder label. The `profile` map is keyed by domain ("global" + the 8 math domains).
// See docs/specs/Spec-RatingUnification.md.
data class DomainRating(
    val displayRating: Int = 0,
    val rank: String = "Unranked (Placement: 0/5)",
    val progress: Float = 0f,        // 0..1 through the current division (divisions/pips)
    val pointsToNext: Int? = null,   // display points to the next division (null at Grandmaster)
    val nextRank: String? = null,
    val sessionsCount: Int = 0,
    val mu: Double = 0.0,
    val velocity: Double = 0.0
)

data class RatingProfileResponse(
    val profile: Map<String, DomainRating> = emptyMap()
)

// ---- Rating timeline — GET /api/rating/history (returns a bare array) ----
data class RatingHistoryEntry(
    val domain: String = "global",
    val displayBefore: Int = 0,
    val displayAfter: Int = 0,
    val delta: Double = 0.0,
    val gameMode: String = "",
    val sessionCategory: String? = null,
    val sessionLevel: Int = 0,
    val explanation: String = "",
    val createdAt: Long = 0
)

// ---- Season peak badges ("Act Rank") — GET /api/rating/season-history ----
// A permanent record of the highest competitive rank reached in each ended season.
data class SeasonAward(
    val seasonId: Int = 0,
    val seasonName: String = "",
    val peakDisplay: Int = 0,
    val peakRank: String = "",
    val awardedAt: Long = 0
)

data class SeasonHistoryResponse(
    val awards: List<SeasonAward> = emptyList()
)

// ---- Seasonal Rank Reward track — GET /api/rating/reward-track, POST .../claim ----
data class RewardTier(
    val tierIndex: Int = 0,
    val tierName: String = "",
    val tokens: Int = 0,
    val coins: Int = 0,
    val reached: Boolean = false,
    val claimed: Boolean = false
)

data class RewardTrackSeason(
    val id: Int = 0,
    val name: String = "",
    val endAt: Long = 0,
    val daysRemaining: Int = 0
)

data class RewardTrackResponse(
    val season: RewardTrackSeason = RewardTrackSeason(),
    val peakRank: String = "",
    val peakTier: Int = -1,
    val tiers: List<RewardTier> = emptyList()
)

data class ClaimTierRequest(val tier: Int)

data class RewardClaimResponse(
    val success: Boolean = false,
    val tierName: String = "",
    val tokensAwarded: Int = 0,
    val coinsAwarded: Int = 0,
    val seasonTokens: Int = 0,
    val coins: Int = 0,
    val error: String? = null
)

// ---- Reasoning Arena (understanding-gated ranked mode) ----
// A point banks only if BOTH the answer AND the chosen reason are correct. See routes/reasoningDuel.js.
data class ReasoningProblemDto(
    val question: String = "",
    val options: List<String> = emptyList(),
    val reasonQuestion: String = "",
    val reasonOptions: List<String> = emptyList()
)

data class ReasoningStartResponse(
    val roundId: Int = 0,
    val problemCount: Int = 0,
    val problems: List<ReasoningProblemDto> = emptyList()
)

data class ReasoningSubmitRequest(
    val answers: List<String>,
    val reasons: List<Int>
)

data class ReasoningResultItem(
    val answerCorrect: Boolean = false,
    val reasonCorrect: Boolean = false,
    val banked: Boolean = false,
    val correctAnswer: String = "",
    val reasonCorrectIndex: Int = 0,
    val reasonExplanation: String = ""
)

data class ReasoningSubmitResponse(
    val success: Boolean = false,
    val banked: Int = 0,
    val answerCorrect: Int = 0,
    val total: Int = 0,
    val ratingDelta: Double = 0.0,
    val newDisplayRating: Int? = null,
    val newRank: String? = null,
    val promoted: Boolean = false,
    val perProblem: List<ReasoningResultItem> = emptyList()
)

// ---- Learning plan (goal-driven concept path — audit #19) ----
@Serializable
data class LearningPlanStep(
    val conceptId: String = "",
    val name: String = "",
    val category: String = "",
    val level: Int = 0,
    val status: String = "", // done | in_progress | available | locked
    val overall: Double = 0.0,
    val isNext: Boolean = false
)

@Serializable
data class LearningPlanResponse(
    val currentLevel: Int = 0,
    val targetLevel: Int = 0,
    val goalDriven: Boolean = false,
    val goalType: String? = null,
    val total: Int = 0,
    val done: Int = 0,
    val percent: Int = 0,
    val nextStep: LearningPlanStep? = null,
    val steps: List<LearningPlanStep> = emptyList()
)

// ---- Weekly tournaments (async global event — audit #21) ----
@Serializable
data class TournamentMeta(
    val id: Int = 0,
    val title: String = "",
    val conceptName: String = "",
    val problemCount: Int = 0,
    val startsAt: Long = 0,
    val endsAt: Long = 0,
    val msRemaining: Long = 0,
    val status: String = ""
)

@Serializable
data class TournamentEntryDto(
    val status: String = "",
    val score: Int? = null,
    val elapsedMs: Long? = null,
    val reward: Int = 0
)

@Serializable
data class TournamentLeaderboardEntry(
    val position: Int = 0,
    val username: String = "",
    val userId: Int = 0,
    val score: Int = 0,
    val elapsedMs: Long = 0,
    val reward: Int = 0,
    // A calibrated pace-setter bot (never a real user, never paid) — labeled in the UI so a
    // player always knows who's human (ultra-review #46).
    val isBot: Boolean = false
)

@Serializable
data class TournamentCurrentResponse(
    val tournament: TournamentMeta = TournamentMeta(),
    val yourEntry: TournamentEntryDto? = null,
    val yourRank: Int? = null,
    val leaderboard: List<TournamentLeaderboardEntry> = emptyList()
)

@Serializable
data class TournamentStartResponse(
    val tournamentId: Int = 0,
    val problemCount: Int = 0,
    val problems: List<AsyncProblemDto> = emptyList()
)

@Serializable
data class TournamentPlayRequest(val answers: List<String>)

@Serializable
data class TournamentPlayResponse(
    val score: Int = 0,
    val elapsedMs: Long = 0,
    val total: Int = 0,
    val yourRank: Int? = null,
    val leaderboard: List<TournamentLeaderboardEntry> = emptyList()
)

// ---- Adaptive diagnostic (server-authoritative placement) ----
@Serializable
data class AdaptiveStartResponse(
    val sessionId: Int = 0,
    val questionNumber: Int = 1,
    val totalQuestions: Int = 7,
    val question: String = "",
    val options: List<String> = emptyList()
)

// ---- Skill tree (mastery map across the curriculum) ----
@Serializable
data class SkillTreeNode(
    val conceptId: String = "",
    val name: String = "",
    val standard: String? = null,
    val category: String = "",
    val level: Int = 0,
    val prereqs: List<String> = emptyList(),
    val started: Boolean = false,
    val dimensions: MasteryDimensions? = null,
    val overall: Float = 0f,
    val stage: String = "Locked",
    val needsReview: Boolean = false
)

@Serializable
data class MasteryDimensionMeta(val key: String = "", val label: String = "", val blurb: String = "")

// ---- Clubs / teams ----
@Serializable
data class ClubMember(
    val id: Int = 0,
    val username: String = "",
    val level: Int = 0,
    val xp: Int = 0,
    val rank: String = "",
    val avatar: String? = null,
    val position: Int = 0
)

@Serializable
data class ClubSummary(
    val id: Int = 0,
    val name: String = "",
    val description: String? = null,
    val ownerId: Int = 0,
    val memberCount: Int = 0,
    val joined: Boolean = false
)

@Serializable
data class ClubDetail(
    val id: Int = 0,
    val name: String = "",
    val description: String? = null,
    val ownerId: Int = 0,
    val isOwner: Boolean = false
)

@Serializable
data class MyClubResponse(
    val club: ClubDetail? = null,
    val members: List<ClubMember> = emptyList()
)

@Serializable
data class CreateClubRequest(val name: String, val description: String? = null)

@Serializable
data class ClubMemberActionRequest(val userId: Int)

// ---- Club wars (team competition — audit #1.7) ----
@Serializable
data class ClubWarSide(val clubId: Int = 0, val name: String = "", val total: Int = 0, val players: Int = 0)

@Serializable
data class ClubWar(
    val id: Int = 0,
    val concept: String = "",
    val problemCount: Int = 0,
    val endsAt: Long = 0,
    val msRemaining: Long = 0,
    val status: String = "",
    val challenger: ClubWarSide = ClubWarSide(),
    val opponent: ClubWarSide = ClubWarSide(),
    val myClubId: Int = 0,
    val winnerClubId: Int? = null,
    val youPlayed: Boolean = false,
    val yourScore: Int? = null,
    val problems: List<AsyncProblemDto> = emptyList()
)

@Serializable
data class ClubWarsResponse(val wars: List<ClubWar> = emptyList(), val myClubId: Int? = null)

@Serializable
data class ChallengeClubRequest(val opponentClubId: Int)

@Serializable
data class ClubWarPlayResponse(val score: Int = 0, val total: Int = 0, val war: ClubWar = ClubWar())

@Serializable
data class NudgeRequest(val type: String)

@Serializable
data class ClubLeaderboardEntry(
    val id: Int = 0,
    val name: String = "",
    val memberCount: Int = 0,
    val totalLevel: Int = 0,
    val totalXp: Int = 0,
    val position: Int = 0
)

// ---- Friends leaderboard ----
@Serializable
data class FriendLeaderboardEntry(
    val id: Int = 0,
    val username: String = "",
    val xp: Int = 0,
    val level: Int = 0,
    val rank: String = "",
    val position: Int = 0,
    val isMe: Boolean = false
)

// ---- Per-concept discussion ----
@Serializable
data class ConceptPost(
    val id: Int = 0,
    val parentId: Int? = null,
    val userId: Int = 0,
    val username: String = "",
    val body: String = "",
    val createdAt: Long = 0,
    val mine: Boolean = false,
    val votes: Int = 0,
    val voted: Boolean = false,
    val replies: List<ConceptPost> = emptyList()
)

@Serializable
data class VoteResponse(val postId: Int = 0, val voted: Boolean = false, val votes: Int = 0)

@Serializable
data class ConceptPostsResponse(
    val conceptId: String = "",
    val name: String = "",
    val posts: List<ConceptPost> = emptyList()
)

@Serializable
data class CreatePostPayload(val body: String, val parentId: Int? = null)

// ---- Learner-set goals ----
@Serializable
data class GoalTypeMeta(val key: String = "", val label: String = "", val unit: String = "", val min: Int = 1, val max: Int = 100)

@Serializable
data class LearningGoal(
    val goalType: String = "",
    val targetValue: Int = 0,
    val current: Int = 0,
    val completed: Boolean = false,
    val createdAt: Long = 0
)

@Serializable
data class GoalResponse(
    val goal: LearningGoal? = null,
    val types: List<GoalTypeMeta> = emptyList()
)

@Serializable
data class SetGoalPayload(val goalType: String, val targetValue: Int)

// ---- Weekly "Your Week" recap (in-app, shareable) ----
@Serializable
data class RecapTopConcept(val name: String = "", val overall: Float = 0f)

@Serializable
data class WeeklyRecap(
    val weekProblems: Int = 0,
    val activeDays: Int = 0,
    val streak: Int = 0,
    val level: Int = 1,
    val coins: Int = 0,
    val conceptsPracticed: Int = 0,
    val overallMastery: Float = 0f,
    val masteryStage: String = "Novice",
    val topConcept: RecapTopConcept? = null
)

@Serializable
data class SkillTreeResponse(
    val nodes: List<SkillTreeNode> = emptyList(),
    val masteryProfile: MasteryProfile? = null,
    val dimensions: List<MasteryDimensionMeta> = emptyList()
)

@Serializable
data class AdaptiveAnswerRequest(val sessionId: Int, val answer: String)

@Serializable
data class AdaptiveAnswerResponse(
    val done: Boolean = false,
    val lastCorrect: Boolean = false,
    val questionNumber: Int = 0,
    val totalQuestions: Int = 7,
    val question: String? = null,
    val options: List<String> = emptyList(),
    val placedLevel: Int? = null,
    val correct: Int = 0,
    val total: Int = 0
)

@Serializable
data class RevokeSessionRequest(
    val sessionId: String
)

@Serializable
data class UserSessionDto(
    val id: String,
    val user_id: Int,
    val user_agent: String,
    val ip_address: String,
    val created_at: Long,
    val expires_at: Long,
    val is_current: Boolean
)

@Serializable
data class SecurityLogDto(
    val id: Int,
    val timestamp: Long,
    val event_type: String,
    val ip_address: String,
    val details: String
)

@Serializable
data class SavedCollection(
    val id: Int,
    val user_id: Int,
    val name: String,
    val is_public: Int,
    val created_at: Long
)

@Serializable
data class CreateCollectionRequest(
    val name: String,
    val is_public: Boolean
)

@Serializable
data class UpdateCollectionRequest(
    val name: String,
    val is_public: Boolean
)

@Serializable
data class AssignCollectionRequest(
    val exerciseId: Int,
    val collectionId: Int?
)

@Serializable
data class PublicCollectionDto(
    val id: Int,
    val name: String,
    val created_at: Long,
    val exercises: List<ArchiveExercise>
)

@Serializable
data class CalculatorLogRequest(
    val category: String? = null,
    val level: Int? = null,
    val question: String? = null,
    val template_type: String? = null,
    val game_mode: String? = null,
    val inputExpression: String? = null
)

@Serializable
data class CalculatorLogResponse(
    val success: Boolean,
    val easterEggUnlocked: Boolean? = null
)

// ---- Onboarding (first launch → habit). Field names match routes/onboarding.js JSON. ----
@Serializable
data class OnboardingCatalogItem(
    val key: String,
    val label: String = "",
    val emoji: String = "",
    val blurb: String? = null
)

@Serializable
data class OnboardingAvatarItem(
    val key: String,
    val emoji: String = ""
)

@Serializable
data class OnboardingCatalogs(
    val motivations: List<OnboardingCatalogItem> = emptyList(),
    val interests: List<OnboardingCatalogItem> = emptyList(),
    val profileStyles: List<OnboardingCatalogItem> = emptyList(),
    val avatars: List<OnboardingAvatarItem> = emptyList()
)

// Anonymous crash report (CrashReporter → /api/crash): stack + app version + API level,
// deliberately nothing that could identify a user or device.
@Serializable
data class CrashReportRequest(
    val stack: String,
    val appVersion: String,
    val sdkInt: Int
)

// One ordered "do this now" plan composed server-side (/api/today) from the SRS queue +
// the four daily quests — review → learn → puzzle → duel → growth.
@Serializable
data class TodayItem(
    val key: String,
    val title: String,
    val subtitle: String? = null,
    val progress: Int = 0,
    val target: Int = 1,
    val done: Boolean = false
)

@Serializable
data class TodayComeback(
    val daysAway: Int = 0,
    val dueReviews: Int = 0
)

@Serializable
data class TodayResponse(
    val streak: Int = 0,
    val streakSafeToday: Boolean = false,
    val claimableQuests: Int = 0,
    // Present when the learner returns after >=7 days away — swaps the card's framing
    // to a warm re-entry instead of the everyday plan header.
    val comeback: TodayComeback? = null,
    val items: List<TodayItem> = emptyList()
)

@Serializable
data class OnboardingStateResponse(
    val onboardingComplete: Boolean = false,
    // False while the server has no FCM credential — the client then hides the
    // notification opt-in step instead of asking for a promise it can't keep.
    val pushAvailable: Boolean = false,
    val catalogs: OnboardingCatalogs = OnboardingCatalogs()
)

@Serializable
data class MotivationsRequest(val keys: List<String>)

@Serializable
data class OnboardingProfileRequest(
    val displayName: String? = null,
    val profileStyle: String? = null,
    val avatar: String? = null,
    val interests: List<String> = emptyList()
)

@Serializable
data class RoadmapCategory(
    val key: String,
    val label: String = "",
    val accuracy: Int? = null
)

@Serializable
data class RoadmapMilestone(
    val weeks: Int = 0,
    val label: String = ""
)

@Serializable
data class RoadmapResponse(
    val placedLevel: Int = 1,
    val rank: String = "",
    val strengths: List<RoadmapCategory> = emptyList(),
    val growth: List<RoadmapCategory> = emptyList(),
    val milestones: List<RoadmapMilestone> = emptyList(),
    val recommendedFocus: String = ""
)

@Serializable
data class AhaStartResponse(
    val question: String = "",
    val options: List<String> = emptyList()
)

@Serializable
data class AhaAnswerRequest(val answer: String)

@Serializable
data class AhaAnswerResponse(val correct: Boolean = false)

@Serializable
data class CommitmentRequest(val frequency: String, val days: List<Int> = emptyList())

@Serializable
data class NotificationOptInRequest(val optIn: Boolean)

@Serializable
data class OnboardingEventRequest(
    val step: String,
    val event: String,
    val ms: Long? = null
)

// ---- Progressive disclosure (Phase 11) ----
@Serializable
data class SpotlightItem(
    val key: String,
    val title: String = "",
    val body: String = "",
    val emoji: String = ""
)

@Serializable
data class SpotlightsResponse(
    val seen: List<String> = emptyList(),
    val catalog: List<SpotlightItem> = emptyList()
)

@Serializable
data class SpotlightSeenRequest(val key: String)

// ---- Push registration (FCM) ----
@Serializable
data class PushTokenRequest(val token: String, val platform: String = "android")

// CAS solver (POST /api/cas/solve). `ok=false` carries an `error` ("unsolved", "no_unique_solution",
// "invalid_input"); on success, `steps` is the worked LaTeX derivation and `source` is js-linear|sympy.
@Serializable
data class CasSolveRequest(
    val equation: String
)

@Serializable
data class CasSolveResponse(
    val ok: Boolean = false,
    val equation: String? = null,
    val variable: String? = null,
    val solutions: List<String> = emptyList(),
    val steps: List<String> = emptyList(),
    val source: String? = null,
    val error: String? = null,
    val detail: String? = null
)
