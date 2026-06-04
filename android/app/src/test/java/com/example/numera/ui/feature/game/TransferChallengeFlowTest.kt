package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SimpleResponse
import com.example.numera.data.network.TransferChallengeResponse
import com.example.numera.data.network.TransferProblem
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the Sprint-4 in-app transfer-challenge flow end-to-end: SoloGameScreen in the
 * "transfer_challenge" game mode must fetch a transfer problem from GET /api/math/transfer/challenge,
 * render it, and POST the out-of-context outcome to /api/math/transfer/result when the learner
 * answers (that POST is what feeds the `transfer` mastery dimension).
 *
 * Uses a plain-text problem (no `$`/`\`) so the KaTeX WebView never instantiates under Robolectric.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TransferChallengeFlowTest {
  @get:Rule val compose = createComposeRule()

  private val q = "A library receives books on two days. Which is the correct total?"

  @Test
  fun transferChallenge_fetchesProblem_andRecordsOutcomeOnAnswer() {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.getTransferChallenge(any(), any()) } returns TransferChallengeResponse(
      conceptId = "arithmetic_add",
      conceptName = "Integer Addition",
      transferContext = "real-world",
      problem = TransferProblem(
        question = q,
        correctAnswer = "right",
        options = listOf("wrong", "right", "other"),
        explanation = "right is correct.",
      ),
    )
    coEvery { fakeApi.submitTransferResult(any(), any()) } returns SimpleResponse(true, "ok")
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      SoloGameScreen(category = "General", level = 0, gameMode = "transfer_challenge", onFinishGame = {})
    }

    // The fetched transfer problem renders (no lesson gate for transfer mode).
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText(q).fetchSemanticsNodes().isNotEmpty()
    }

    compose.onNodeWithText("right").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("✨ EXCELLENT JOB!").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("✨ EXCELLENT JOB!").assertIsDisplayed()

    // The out-of-context outcome was recorded for the concept under test (correct = true).
    coVerify { fakeApi.submitTransferResult(any(), match { it.conceptId == "arithmetic_add" && it.correct }) }
  }
}
