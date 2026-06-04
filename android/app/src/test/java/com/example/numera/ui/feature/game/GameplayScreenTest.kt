package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithTag
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
          // Socratic feedback (server JSON-string contract): a targeted probe for the "alpha"
          // slip plus a generic fallback. Used by the wrong-answer + hint tests below.
          socraticJson = """{"byOption":{"alpha":{"misconception":"test_slip",""" +
            """"probe":"What made alpha look right to you?","hint":"Re-check the first step."}},""" +
            """"generic":{"probe":"Walk back through your steps.","hint":"Redo it slowly."}}""",
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

  /** Stub a no-lesson level with a single MCQ problem (correct = "right"). */
  private fun stubSingleMcqLevel(): ApiService {
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

  /**
   * Sprint 2: a wrong answer no longer reveals "Correct: bravo" up front. Instead it shows the
   * Socratic "🤔 LET'S THINK" banner with the misconception-targeted probe, and the answer must
   * NOT be on screen yet (it stays behind Review Solution — see the next test).
   */
  @Test
  fun wrongMcqAnswer_showsSocraticProbe_notTheAnswer() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("alpha").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("🤔 LET'S THINK").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("🤔 LET'S THINK").assertIsDisplayed()
    // The probe targeted at the "alpha" slip renders.
    compose.onNodeWithText("What made alpha look right to you?").assertIsDisplayed()
    // The banner no longer reveals the answer up front (it stays behind Review Solution),
    // and in MCQ the correct option is NOT marked correct yet — its ✓ checkmark is withheld
    // until the learner reveals the solution (productive struggle).
    compose.onAllNodesWithText("Correct: bravo").assertCountEquals(0)
    compose.onAllNodesWithContentDescription("Correct").assertCountEquals(0)
  }

  /**
   * After a wrong MCQ answer the correct option stays unmarked until "Review Solution" is tapped,
   * at which point its ✓ checkmark appears (the answer is revealed, just not instantly).
   */
  @Test
  fun reviewSolution_revealsCorrectOptionCheckmark() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("alpha").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("REVIEW SOLUTION").fetchSemanticsNodes().isNotEmpty()
    }
    // Hidden before reveal.
    compose.onAllNodesWithContentDescription("Correct").assertCountEquals(0)
    compose.waitForIdle()
    compose.onNodeWithText("REVIEW SOLUTION").performClick()
    // Revealed after — the correct option now carries the ✓ checkmark.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithContentDescription("Correct").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onAllNodesWithContentDescription("Correct").assertCountEquals(1)
  }

  /**
   * Fading guidance: the targeted hint is one tap behind a "Show a hint" affordance, so the
   * learner gets a chance to self-correct from the probe before the nudge appears.
   */
  @Test
  fun wrongMcqAnswer_showHint_revealsTargetedHint() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("alpha").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Show a hint").fetchSemanticsNodes().isNotEmpty()
    }
    // Hint text is hidden until requested.
    compose.onAllNodesWithText("Re-check the first step.").assertCountEquals(0)
    compose.waitForIdle()
    compose.onNodeWithText("Show a hint").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Re-check the first step.").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Re-check the first step.").assertIsDisplayed()
  }

  @Test
  fun reviewSolution_afterWrongAnswer_opensSolutionDialog() {
    launchAndAwaitGameplay()
    compose.onNodeWithText("alpha").performClick()
    // DuoButton uppercases its label.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("REVIEW SOLUTION").fetchSemanticsNodes().isNotEmpty()
    }
    compose.waitForIdle()
    compose.onNodeWithText("REVIEW SOLUTION").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("💡 SOLUTION BREAKDOWN").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("💡 SOLUTION BREAKDOWN").assertIsDisplayed()
    // The worked solution still reveals the correct answer — just one tap away, not up front.
    compose.onNodeWithText("Correct Answer:").assertIsDisplayed()
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

  @Test
  fun favoriteButton_opensSaveOptionsDialog() {
    launchAndAwaitGameplay()
    compose.onNodeWithTag("favorite-toggle").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Exercise Options").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Exercise Options").assertIsDisplayed()
    compose.onNodeWithText("📁  Save Entire Level").assertIsDisplayed()
  }

  /**
   * In level mode, three mistakes empties the 3 hearts and triggers the out-of-hearts retry
   * prompt. Drives that deterministically WITHOUT the TIMED problem's countdown: stay on the MCQ
   * (idx 0), answer wrong, reset via Review Solution -> Retry Exercise, repeat. The third wrong
   * pushes errorsCount to 3 and the dialog appears. This guards the OutOfHeartsDialog carve.
   */
  @Test
  fun threeMistakes_inLevelMode_showsOutOfHeartsDialog() {
    stubSingleMcqLevel()
    compose.setContent {
      SoloGameScreen(category = "Algebra", level = 1, gameMode = "level", onFinishGame = {})
    }
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Only question here.").fetchSemanticsNodes().isNotEmpty()
    }
    // First two mistakes: each time reopen the problem via Review Solution -> Retry Exercise.
    repeat(2) {
      compose.onNodeWithText("wrong").performClick()
      compose.waitUntil(timeoutMillis = 5_000) {
        compose.onAllNodesWithText("REVIEW SOLUTION").fetchSemanticsNodes().isNotEmpty()
      }
      compose.waitForIdle()
      compose.onNodeWithText("REVIEW SOLUTION").performClick()
      compose.waitUntil(timeoutMillis = 5_000) {
        compose.onAllNodesWithText("RETRY EXERCISE").fetchSemanticsNodes().isNotEmpty()
      }
      compose.waitForIdle()
      compose.onNodeWithText("RETRY EXERCISE").performClick()
      compose.waitForIdle()
    }
    // Third mistake empties the hearts -> out-of-hearts dialog.
    compose.onNodeWithText("wrong").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("💔 OUT OF HEARTS").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("💔 OUT OF HEARTS").assertIsDisplayed()
  }
}
