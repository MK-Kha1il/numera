package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.CompleteSessionResponse
import com.example.numera.data.network.MathLevelResponse
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.QuestProgressDto
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SessionStreak
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the recap (isGameOver) end-screen so it can be carved into a RecapScreen composable. The
 * only way to reach the recap is to actually finish a session, so this drives a one-problem level
 * to completion: answer correctly -> tap Finish Game -> the stubbed completeSession resolves ->
 * the recap renders. Asserts the recap's stable header.
 *
 * Plain-text problem (no $/\, avoids the KaTeX WebView) + tall viewport, same reliability strategy
 * as GameplayScreenTest. submitSrsReview is left unstubbed on purpose — it throws and is swallowed
 * by the screen's try/catch, exactly as in production when SRS is unavailable.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class RecapScreenTest {
  @get:Rule val compose = createComposeRule()

  private fun stubSingleProblemLevel(): ApiService {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.getProblems(any(), any(), any(), any()) } returns MathLevelResponse(
      category = "Algebra",
      level = 1,
      lessonTitle = null,
      problems = listOf(
        MathProblem(
          question = "Only question here.",
          correctAnswer = "right",
          options = listOf("wrong", "right", "other"),
          explanation = "right is correct.",
        ),
      ),
    )
    coEvery { fakeApi.completeSession(any(), any()) } returns CompleteSessionResponse(
      xp = 120, level = 2, coins = 60, rank = "Bronze IV", levelUp = true,
      xpGained = 20, coinsGained = 5,
    )
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)
    return fakeApi
  }

  @Test
  fun finishingSession_showsRecap() {
    stubSingleProblemLevel()
    compose.setContent {
      SoloGameScreen(category = "Algebra", level = 1, gameMode = "level", onFinishGame = {})
    }
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Only question here.").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("right").performClick()
    // Single problem -> this is the last one, so the CTA is "Finish Game".
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Finish Game").fetchSemanticsNodes().isNotEmpty()
    }
    compose.waitForIdle()
    compose.onNodeWithText("Finish Game").performClick()
    // completeSession resolves on Main -> isGameOver flips -> recap renders.
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("LEVEL RECAP").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("LEVEL RECAP").assertIsDisplayed()
  }

  // The recap's payoff layer: the server's stars / streak / quest fields render, and — for a map
  // level whose successor is now unlocked — "Next level" hands the next level to the caller.
  @Test
  fun recap_showsStarsStreakQuest_andNextLevelAdvances() {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.getProblems(any(), any(), any(), any()) } returns MathLevelResponse(
      category = "arithmetic",
      level = 1,
      lessonTitle = null,
      problems = listOf(
        MathProblem(question = "Only question here.", correctAnswer = "right", options = listOf("wrong", "right"), explanation = "right."),
      ),
    )
    coEvery { fakeApi.completeSession(any(), any()) } returns CompleteSessionResponse(
      xp = 30, level = 2, coins = 110, rank = "Bronze III", levelUp = true,
      xpGained = 18, coinsGained = 6,
      stars = 3, bestStars = 3, newBest = true,
      streak = SessionStreak(days = 4, extendedToday = true),
      questProgress = listOf(QuestProgressDto(type = "solved", name = "Daily Solver", current = 3, target = 5)),
      claimableQuests = 1,
    )
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    var nextLevelRequested: Int? = null
    compose.setContent {
      // Level 1's map category is "arithmetic" (mapLevelCategory), so "Next level" applies.
      SoloGameScreen(
        category = "arithmetic",
        level = 1,
        gameMode = "level",
        onNextLevel = { nextLevelRequested = it },
        onFinishGame = {},
      )
    }
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Only question here.").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("right").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Finish Game").fetchSemanticsNodes().isNotEmpty()
    }
    compose.waitForIdle()
    compose.onNodeWithText("Finish Game").performClick()
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Flawless!").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("NEW BEST").performScrollTo().assertIsDisplayed()
    compose.onNodeWithText("4-day streak!").performScrollTo().assertIsDisplayed()
    compose.onNodeWithText("Daily Solver").performScrollTo().assertIsDisplayed()
    compose.onNodeWithText("Next level ▶").performScrollTo().performClick()
    assertEquals(2, nextLevelRequested)
  }
}
