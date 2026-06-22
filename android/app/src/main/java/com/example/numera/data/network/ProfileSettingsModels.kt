// Goals, sessions, collections & onboarding DTOs — learner goals, weekly recap, skill tree, adaptive answers, sessions & security log, saved collections, calculator log, onboarding catalogs, arena feed.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
package com.example.numera.data.network

import kotlinx.serialization.Serializable

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

// ── Living Arena (docs/CompetitiveArenaRedesign.md) ───────────────────────────────────────────
// A competitor's reputation, shown on the pre-match player card. Mirrors the server's
// arenaService.loadArenaIdentity payload (ships inside duel_start / room_status `identities`).
@Serializable
data class ArenaIdentity(
    val id: Int = 0,
    val username: String = "",
    val isBot: Boolean = false,
    val rank: String = "Unranked",
    val elo: Int = 1000,
    val peak_elo: Int = 1000,
    val current_win_streak: Int = 0,
    val best_win_streak: Int = 0,
    val competitive_matches: Int = 0,
    val specialty: String? = null
)

// Your head-to-head record against an opponent, from YOUR perspective.
@Serializable
data class HeadToHead(
    val total: Int = 0,
    val myWins: Int = 0,
    val theirWins: Int = 0,
    val draws: Int = 0
)

@Serializable
data class RivalsResponse(val rivals: List<Rival> = emptyList())

@Serializable
data class Rival(
    val opponentId: Int = 0,
    val username: String = "",
    val total: Int = 0,
    val myWins: Int = 0,
    val theirWins: Int = 0,
    val lastPlayed: Long = 0
)

@Serializable
data class MatchHistoryResponse(val matches: List<MatchRecord> = emptyList())

@Serializable
data class MatchRecord(
    val opponent: String = "",
    val result: String = "",   // "win" | "loss" | "draw"
    val eloChange: Int = 0,
    val mode: String = "",
    val createdAt: Long = 0
)

@Serializable
data class ArenaFeedResponse(val events: List<ArenaEvent> = emptyList())

@Serializable
data class ArenaEvent(
    val username: String = "",
    val type: String = "",
    val detail: String? = null,
    val created_at: Long = 0
)
