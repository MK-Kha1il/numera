package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.CompleteSessionResponse
import com.example.numera.data.network.MathLevelResponse
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.RetrofitClient
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the recap (isGameOver) end-screen so it can be carved into a RecapScreen composable. The
 * only way to reach the recap is to actually finish a session, so this drives a one-problem level
 * to completion: answer correctly -> tap FINISH GAME -> the stubbed completeSession resolves ->
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
    // Single problem -> this is the last one, so the CTA is "FINISH GAME" (DuoButton uppercases).
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("FINISH GAME").fetchSemanticsNodes().isNotEmpty()
    }
    compose.waitForIdle()
    compose.onNodeWithText("FINISH GAME").performClick()
    // completeSession resolves on Main -> isGameOver flips -> recap renders.
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("LEVEL RECAP").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("LEVEL RECAP").assertIsDisplayed()
  }
}
