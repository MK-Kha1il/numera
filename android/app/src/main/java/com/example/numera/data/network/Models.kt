// Core gameplay & profile DTOs — learner model & mastery, user/public-profile/friend, shop items, math problems & lessons, archive, mistakes, quests, daily puzzle, league.
// Split from the former monolithic Models.kt (2,218 lines) for navigability; same package,
// so no consumer imports change — Kotlin resolves these classes by package, not by file.
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
    // New cosmetic equip slots (docs/ShopOverhaul.md §8, Stage D)
    val active_title: String? = null,
    val active_effect: String? = null,
    val active_victory: String? = null,
    val active_tap: String? = null,
    val active_frame: String? = null,
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
    // Living-Arena reputation (server migration v47): permanent high-water mark + form.
    val peak_elo: Int? = null,
    val current_win_streak: Int? = 0,
    val best_win_streak: Int? = 0,
    val competitive_matches: Int? = null,
    val competitive_rank: String? = null, // unified competitive rank (mirror of user_ratings global)
    val rank_revealed: Int? = 0,          // one-time placement rank-reveal ceremony fired (audit #20)
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
    val active_frame: String? = null,
    val active_effect: String? = null,
    val solved_count: Int,
    val arena_wins: Int,
    val competitive_rank: String? = null,
    val active_title: String? = null,
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
    val tipMetadata: TipMetadata? = null,
    // Concept-anchored interactive manipulative (JSON string) for the puzzle's own concept; null when
    // the concept has no useful visual. Rendered the same way as MathProblem.interactiveVisualJson.
    val interactiveVisualJson: String? = null
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

