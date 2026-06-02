package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ApiService
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
 * Interaction tests that GUARD the gameplay UI in SoloGameScreen so it can be carved into a
 * GameplayScreen composable without silently changing behavior. Each drives the screen through
 * the real answer flow (tap an option -> handleAnswer -> feedback banner) and asserts the
 * observable result.
 *
 * Reliability strategy (the part that was previously flaky under Robolectric):
 *  - Plain-text problems (no `$`/`\`), so the gameplay path never instantiates the KaTeX
 *    [com.example.numera.ui.components.MathText] WebView — its async load/measure/draw was the
 *    main source of a non-settling semantics tree.
 *  - No lesson on the response (lessonTitle = null), so we land directly on the gameplay screen
 *    rather than the lesson early-return.
 *  - A tall viewport (`qualifiers = "w411dp-h2000dp"`) so the feedback banner at the bottom of
 *    the scrollable gameplay column is laid out on-screen.
 *  - `waitUntil` polling for the IO -> Main fetch hop and for animated (AnimatedVisibility) banner
 *    content, instead of a bare assert against a not-yet-settled tree.
 *
 * In level mode the per-index exercise type is fixed: idx 0 = MCQ, idx 1 = TYPED, idx 2 = TIMED.
 * These tests stay on idx 0 (MCQ) plus an advance into idx 1, deliberately avoiding the TIMED
 * countdown so there is no wall-clock race.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class GameplayScreenTest {
  @get:Rule val compose = createComposeRule()

  private val q0 = "Choose the correct value."
  private val q1 = "Type the next value now."

  /** Stub a no-lesson level with two plain-text problems: idx0 MCQ (correct = "bravo"), idx1 TYPED. */
  private fun stubPlainLevel(): ApiService {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.getProblems(any(), any(), any(), any()) } returns MathLevelResponse(
      category = "Algebra",
      level = 1,
      lessonTitle = null,
      problems = listOf(
        MathProblem(
          question = q0,
          correctAnswer = "bravo",
          options = listOf("alpha", "bravo", "charlie"),
          explanation = "bravo is correct.",
        ),
        MathProblem(
          question = q1,
          correctAnswer = "delta",
          options = emptyList(),
          explanation = "delta is correct.",
        ),
      ),
    )
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)
    return fakeApi
  }

  private fun launchAndAwaitGameplay() {
    stubPlainLevel()
    compose.setContent {
      SoloGameScreen(category = "Algebra", level = 1, gameMode = "level", onFinishGame = {})
    }
    // Fetch hops IO -> Main; poll until the first problem (gameplay) is on screen.
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText(q0).fetchSemanticsNodes().isNotEmpty()
    }
  }

  @Test
  fun correctMcqAnswer_showsSuccessBanner() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("bravo").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("✨ EXCELLENT JOB!").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("✨ EXCELLENT JOB!").assertIsDisplayed()
  }

  @Test
  fun wrongMcqAnswer_showsMistakeBannerAndCorrectAnswer() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("alpha").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("💡 NOT QUITE RIGHT").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("💡 NOT QUITE RIGHT").assertIsDisplayed()
    compose.onNodeWithText("Correct: bravo").assertIsDisplayed()
  }

  @Test
  fun continueAfterCorrect_advancesToSecondProblem() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("bravo").performClick()
    // DuoButton renders its label uppercased, so the advance CTA is "CONTINUE".
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("CONTINUE").fetchSemanticsNodes().isNotEmpty()
    }
    // The feedback banner slides in (AnimatedVisibility); let it settle so the button is laid out
    // at its final, on-screen position before we tap it (a mid-slide tap can miss).
    compose.waitForIdle()
    compose.onNodeWithText("CONTINUE").performClick()
    // Advancing rebuilds the gameplay for idx 1 (TYPED); its question card should now render.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText(q1).fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText(q1).assertIsDisplayed()
  }
}
