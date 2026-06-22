// Account, auth & progress DTOs — register/login/MFA/password & email changes, achievements, classes & guardian, analytics, checkpoint/word/estimation, coin convert, telemetry, growth, complete-session.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
package com.example.numera.data.network

import kotlinx.serialization.Serializable

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

// In-app Help & Support ticket (Settings → Contact Support / Report a Bug / Request a Feature).
// kind = "support" | "bug" | "feature". Backed by /api/feedback.
@Serializable
data class FeedbackRequest(
    val kind: String,
    val subject: String? = null,
    val body: String,
    val appVersion: String? = null
)

@Serializable
data class FeedbackResponse(
    val success: Boolean = false,
    val id: Int = 0,
    val message: String? = null
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

