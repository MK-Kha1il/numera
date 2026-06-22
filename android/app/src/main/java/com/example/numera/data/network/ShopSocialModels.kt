// Shop, social actions, commitment & notifications DTOs — SRS, shop/purchase/equip, friend/block/report, assessment, relics, commitment & streak, favorites, notifications.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
package com.example.numera.data.network

import kotlinx.serialization.Serializable

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
    val ownedItems: List<ShopItem>? = null, // every owned cosmetic (incl. earn-only) — equip anytime
    val earnableItems: List<ShopItem>? = null, // earn-only prestige NOT yet owned (the "Earnable" tab)
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

