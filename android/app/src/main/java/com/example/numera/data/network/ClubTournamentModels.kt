// Tournaments, clubs & discussion DTOs — weekly tournaments, adaptive practice, skill-tree nodes, clubs & club wars, club leaderboards, concept discussion.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
package com.example.numera.data.network

import kotlinx.serialization.Serializable

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

// Club SKILL ladder (audit #17): clubs ranked by avg competitive rating of placed members, not XP.
data class ClubSkillEntry(
    val id: Int = 0,
    val name: String = "",
    val memberCount: Int = 0,
    val ratedMembers: Int = 0,
    val avgRating: Int = 0,
    val clubRank: String = "Unrated",
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

