package com.example.numera.ui.feature.dashboard

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.NextRecommendationResponse
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the home-screen recommendation nudge: it surfaces the engine's high-signal reasons with an
 * actionable CTA (transfer_practice → launch a transfer challenge), and renders nothing for
 * low-signal reasons so the home screen stays uncluttered.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class RecommendationNudgeTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun transferPractice_showsNudge_andFiresTransferAction() {
    var transferTapped = false
    compose.setContent {
      RecommendationNudge(
        recommendation = NextRecommendationResponse(conceptId = "arithmetic_add", reason = "transfer_practice"),
        onTakeTransferChallenge = { transferTapped = true },
        onContinueLearning = {},
        onReview = {},
      )
    }
    compose.onNodeWithText("Ready for a transfer challenge?").assertIsDisplayed()
    // DuoButton uppercases its label.
    compose.onNodeWithText("TAKE THE CHALLENGE").performClick()
    assert(transferTapped) { "transfer CTA should invoke onTakeTransferChallenge" }
  }

  @Test
  fun dimensionBuilding_usesServerFocusMessage_andFiresContinue() {
    var continueTapped = false
    compose.setContent {
      RecommendationNudge(
        recommendation = NextRecommendationResponse(
          conceptId = "arithmetic_mult",
          reason = "dimension_building",
          meta = com.example.numera.data.network.RecommendationMeta(
            dimension = "fluency",
            focus = com.example.numera.data.network.MasteryFocus(
              dimension = "fluency", action = "timed_practice", message = "Build speed with timed drills.",
            ),
          ),
        ),
        onTakeTransferChallenge = {},
        onContinueLearning = { continueTapped = true },
        onReview = {},
      )
    }
    compose.onNodeWithText("Sharpen a specific skill").assertIsDisplayed()
    compose.onNodeWithText("Build speed with timed drills.").assertIsDisplayed()
    compose.onNodeWithText("KEEP PRACTISING").performClick()
    assert(continueTapped)
  }

  @Test
  fun lowSignalReason_rendersNothing() {
    compose.setContent {
      RecommendationNudge(
        recommendation = NextRecommendationResponse(conceptId = "arithmetic_add", reason = "fallback"),
        onTakeTransferChallenge = {},
        onContinueLearning = {},
        onReview = {},
      )
    }
    compose.onAllNodesWithText("Ready for a transfer challenge?").assertCountEquals(0)
    compose.onAllNodesWithText("Sharpen a specific skill").assertCountEquals(0)
  }
}
