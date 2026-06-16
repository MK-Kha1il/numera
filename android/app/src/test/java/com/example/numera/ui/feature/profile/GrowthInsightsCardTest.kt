package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.GrowthProfileResponse
import com.example.numera.data.network.GrowthStrength
import com.example.numera.data.network.GrowthWatchArea
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the Growth Insights card (edu#44): it surfaces the engine's strengths + error "habits to
 * watch", and renders nothing when there's no data yet (a fresh learner isn't shown an empty box).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class GrowthInsightsCardTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersStrengthsAndWatchAreas() {
    val profile = GrowthProfileResponse(
      practiced = 4,
      strengths = listOf(GrowthStrength(name = "Integer Multiplication", successRate = 92)),
      watchAreas = listOf(
        GrowthWatchArea(
          conceptName = "Integer Addition",
          label = "Sign error — positive/negative confusion",
          severity = "high",
          frequency = 6,
        )
      ),
    )
    compose.setContent { GrowthInsightsCard(profile = profile) }

    compose.onNodeWithText("🌱 Growth Insights").assertIsDisplayed()
    compose.onNodeWithText("Integer Multiplication").assertIsDisplayed()
    compose.onNodeWithText("92%").assertIsDisplayed()
    compose.onNodeWithText("Sign error", substring = true).assertIsDisplayed()
    // Concept context + a non-colour severity signal (accessibility #75).
    compose.onNodeWithText("Integer Addition", substring = true).assertIsDisplayed()
    compose.onNodeWithText("Keeps coming up", substring = true).assertIsDisplayed()
  }

  @Test
  fun rendersNothing_whenNoData() {
    compose.setContent { GrowthInsightsCard(profile = GrowthProfileResponse()) }
    compose.onAllNodesWithText("🌱 Growth Insights").assertCountEquals(0)
  }

  @Test
  fun rendersNothing_whenProfileNull() {
    compose.setContent { GrowthInsightsCard(profile = null) }
    compose.onAllNodesWithText("🌱 Growth Insights").assertCountEquals(0)
  }
}
