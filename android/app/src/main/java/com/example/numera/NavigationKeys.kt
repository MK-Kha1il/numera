package com.example.numera

import androidx.navigation3.runtime.NavKey
import kotlinx.serialization.Serializable

@Serializable
data object Login : NavKey

@Serializable
data object Register : NavKey

@Serializable
data object Onboarding : NavKey

@Serializable
data object MainTabs : NavKey

@Serializable
data class SoloGame(
    val category: String,
    val level: Int,
    val isLegacyPuzzle: Boolean = false,
    val legacyPuzzleId: Int = 0,
    val gameMode: String = "level",
    val title: String? = null,
    val question: String? = null,
    val correctAnswer: String? = null,
    val optionsJson: String? = null,
    val explanation: String? = null,
    val lessonTitle: String? = null,
    val lessonContent: String? = null,
    val lessonFormula: String? = null,
    val examplesJson: String? = null
) : NavKey

@Serializable
data class DuelGame(
    val roomId: String,
    val opponentName: String,
    // Opponent's competitive rank for the VS intro player card (social presence).
    val opponentRank: String? = null,
    // Own id, passed from the arena so the duel never depends on a network fetch to know
    // which side of the room it is (a failed profile fetch used to corrupt attribution).
    val myUserId: Int = 0,
    val ranked: Boolean = false
) : NavKey

@Serializable
data class LegacyGame(val puzzleId: Int) : NavKey
