package com.example.numera.ui.feature.profile

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Guards the extracted MasteryBar composable renders its topic label. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MasteryBarTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersTopicName() {
    compose.setContent {
      MasteryBar(topicName = "Algebra", correctCount = 5, maxCount = 10, color = Color(0xFF4CAF50))
    }
    compose.onNodeWithText("Algebra").assertIsDisplayed()
  }
}
