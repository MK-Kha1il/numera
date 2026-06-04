package com.example.numera.data.network

import kotlinx.serialization.Serializable

@Serializable
data class CategoryMastery(
    val arithmetic_correct: Int,
    val mental_correct: Int,
    val algebra_correct: Int,
    val calculus_correct: Int,
    val combinatorics_correct: Int,
    val number_theory_correct: Int
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
    val status: String // "pending" or "accepted"
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
    val discountActive: Boolean? = null
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
    val socraticJson: String? = null
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
    val avatar: String? = null
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

@Serializable
data class AuthResponse(
    val token: String,
    val user: User
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
    val xpBoosterUsesLeft: Int? = null
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
    val utilities: List<UtilityBalance>? = null,
    val expiresInSeconds: Long? = null,
    val featuredExpiresInSeconds: Long? = null,
    val saveRate: Float? = null,
    val discountApplied: Boolean? = null
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
    val activityHistory: List<ActivityDay>? = null
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
