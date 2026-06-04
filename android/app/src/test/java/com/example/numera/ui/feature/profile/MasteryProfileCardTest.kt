package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.MasteryDimensions
import com.example.numera.data.network.MasteryProfile
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the Sprint-3 multi-dimensional mastery card: it must render the four named dimensions,
 * the stage, and a focus tip targeted at the single weakest dimension — and render nothing at all
 * when there's no mastery data yet (fresh learner).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MasteryProfileCardTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersDimensions_stage_andFocusForWeakest() {
    val profile = MasteryProfile(
      dimensions = MasteryDimensions(accuracy = 0.9f, fluency = 0.3f, retention = 0.8f, independence = 0.8f),
      overall = 0.72f,
      stage = "Proficient",
      weakest = "fluency",
      conceptCount = 5,
    )
    compose.setContent { MasteryProfileCard(profile = profile) }

    compose.onNodeWithText("🧭 Skill Mastery").assertIsDisplayed()
    compose.onNodeWithText("Proficient").assertIsDisplayed()
    // All five dimensions are labelled (incl. the Sprint-4 transfer dimension).
    for (label in listOf("Accuracy", "Fluency", "Retention", "Independence", "Transfer")) {
      compose.onNodeWithText(label).assertIsDisplayed()
    }
    // The weakest dimension is marked and gets a targeted focus tip (not an accuracy scold).
    compose.onNodeWithText("· focus").assertIsDisplayed()
    compose.onNodeWithText("build speed", substring = true).assertIsDisplayed()
  }

  @Test
  fun rendersNothing_whenNoMasteryData() {
    compose.setContent { MasteryProfileCard(profile = null) }
    compose.onAllNodesWithText("🧭 Skill Mastery").assertCountEquals(0)
  }
}
