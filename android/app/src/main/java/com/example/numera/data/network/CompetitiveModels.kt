// Competitive / Arena DTOs — puzzle rush, async & bot duels, custom challenges, seasons, rating & apex, match history, share card, live rooms, commend/honor, reasoning duel, titles, rivals, reward track, learning plan.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
package com.example.numera.data.network

import kotlinx.serialization.Serializable

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
    val provisional: Boolean = false, // σ still wide → show `?`, rating not yet calibrated
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

// ---- Apex tier — GET /api/rating/apex (leaderboard-only standing above the rank thresholds) ----
data class ApexEntry(
    val position: Int = 0,
    val userId: Int = 0,
    val username: String = "",
    val avatar: String? = null,
    val displayRating: Int = 0,
    val rank: String = ""
)
data class ApexStanding(
    val position: Int = 0,
    val displayRating: Int = 0
)
data class ApexResponse(
    val size: Int = 0,
    val cutoffRating: Int? = null,
    val leaders: List<ApexEntry> = emptyList(),
    val you: ApexStanding? = null // null unless the viewer is inside the apex
)

// ---- Competitive match history — GET /api/rating/matches (returns a bare array) ----
data class MatchHistoryEntry(
    val id: Int = 0,
    val mode: String = "",
    val opponentId: Int? = null,
    val opponentName: String? = null,
    val myScore: Int = 0,
    val oppScore: Int = 0,
    val result: String = "",
    val ratingDelta: Double = 0.0,
    val refId: Int? = null,   // replayable source (e.g. the reasoning round id)
    val createdAt: Long = 0,
    val commended: Boolean = false,   // you have honored this opponent (audit #24)
    val commendable: Boolean = false  // a real human opponent you can still commend
)

// ---- Shareable rank card — GET /api/rating/share-card (audit #22, viral loop) ----
data class ShareCardResponse(
    val text: String = "",
    val placed: Boolean = false,
    val rank: String? = null,
    val displayRating: Int? = null,
    val title: String? = null
)

// ---- Live group/class competitive rooms — audit #19 ----
data class CreateLiveRoomRequest(val category: String? = null, val level: Int? = null)
data class LiveAnswerRequest(val problemIndex: Int, val answer: String)
data class LiveRoomProblem(val question: String = "", val options: List<String> = emptyList())
data class LiveStanding(
    val position: Int = 0,
    val userId: Int = 0,
    val username: String = "",
    val score: Int = 0,
    val answered: Int = 0
)
data class LiveYou(val score: Int = 0, val answered: Int = 0)
data class LiveRoomResponse( // create / join
    val roomId: Int = 0,
    val code: String = "",
    val problemCount: Int = 0,
    val status: String = "lobby",
    val isHost: Boolean = false
)
data class LiveRoomState( // GET /api/live-rooms/:id
    val roomId: Int = 0,
    val code: String = "",
    val status: String = "lobby",
    val isHost: Boolean = false,
    val problemCount: Int = 0,
    val problems: List<LiveRoomProblem> = emptyList(),
    val you: LiveYou = LiveYou(),
    val standings: List<LiveStanding> = emptyList()
)
data class LiveStartResponse(val status: String = "active", val problems: List<LiveRoomProblem> = emptyList())
data class LiveAnswerResponse(val correct: Boolean = false, val score: Int = 0, val answered: Int = 0, val total: Int = 0)
data class LiveFinishResponse(val status: String = "done", val podium: List<LiveStanding> = emptyList())

// ---- Honor / commendation system — audit #24 ----
data class CommendRequest(
    val matchId: Int,
    val type: String = "good_game" // good_game | tough_opponent | good_sport
)
data class CommendResponse(
    val success: Boolean = false,
    val commended: Boolean = false,
    val alreadyCommended: Boolean = false,
    val toUserId: Int = 0
)
data class HonorResponse(
    val total: Int = 0,
    val level: Int = 0,
    val byType: Map<String, Int> = emptyMap()
)

// ---- Reasoning round replay — GET /api/reasoning-duel/:id/review ----
data class ReasoningReviewItem(
    val question: String = "",
    val options: List<String> = emptyList(),
    val yourAnswer: String? = null,
    val correctAnswer: String = "",
    val answerCorrect: Boolean = false,
    val reasonQuestion: String = "",
    val reasonOptions: List<String> = emptyList(),
    val yourReasonIndex: Int? = null,
    val reasonCorrectIndex: Int = 0,
    val reasonCorrect: Boolean = false,
    val reasonExplanation: String = "",
    val banked: Boolean = false
)

data class ReasoningReviewResponse(
    val roundId: Int = 0,
    val total: Int = 0,
    val banked: Int = 0,
    val items: List<ReasoningReviewItem> = emptyList()
)

// ---- Competitive titles — GET /api/rating/titles, POST .../select ----
data class TitleEntry(
    val id: String = "",
    val name: String = "",
    val desc: String = "",
    val earned: Boolean = false,
    val active: Boolean = false
)

data class TitlesResponse(
    val active: String = "",
    val titles: List<TitleEntry> = emptyList()
)

data class SelectTitleRequest(val title: String)

data class SelectTitleResponse(
    val success: Boolean = false,
    val active: String = "",
    val error: String? = null
)

// ---- Head-to-head rivals — GET /api/rating/rivals (returns a bare array) ----
data class RivalEntry(
    val opponentId: Int = 0,
    val opponentName: String = "",
    val opponentAvatar: String? = null,
    val wins: Int = 0,
    val losses: Int = 0,
    val draws: Int = 0,
    val total: Int = 0,
    val lastPlayed: Long = 0
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
    val cosmetic: String? = null, // season-exclusive earn-only banner at the Diamond tier (audit #14)
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
    val domain: String? = null, // the round's dominant domain (the focused ladder, when chosen)
    val problems: List<ReasoningProblemDto> = emptyList()
)

// Optional focus: climb a specific domain ladder ("rank up my Algebra"). Null/absent = mixed round.
data class ReasoningStartRequest(
    val domain: String? = null
)

// The domains offerable as a focus (each has enough authored reason-sets to fill a round).
data class ReasoningDomainsResponse(
    val domains: List<String> = emptyList()
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
    val ratingCounted: Boolean = true,
    val ratingDelta: Double = 0.0,
    val newDisplayRating: Int? = null,
    val newRank: String? = null,
    val promoted: Boolean = false,
    val perProblem: List<ReasoningResultItem> = emptyList(),
    val reviewQueued: Int = 0 // concepts you missed, queued into spaced review (audit #25)
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

