package com.example.numera.ui.feature.game

import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.MathProblem
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Regression net for the overlays carved out of SoloGameScreen. These guard that the extracted
 * composables still compose with their hoisted state and render their content when visible — the
 * exact behavior a blind refactor could silently break.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class OverlayTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun calculatorOverlay_visible_rendersHeaderAndKeys() {
    compose.setContent {
      Box {
        CalculatorOverlay(
          visible = true,
          onClose = {},
          inputState = remember { mutableStateOf("") },
          resultState = remember { mutableStateOf("") },
          memoryState = remember { mutableStateOf(0.0) },
          historyState = remember { mutableStateOf<List<String>>(emptyList()) },
          errorState = remember { mutableStateOf(false) },
          logTelemetry = {},
        )
      }
    }
    compose.onNodeWithText("CALCULATOR").assertIsDisplayed()
    compose.onNodeWithText("sin").assertIsDisplayed() // a scientific function key
    compose.onNodeWithText("MC").assertIsDisplayed() // a memory key
  }

  @Test
  fun tipOverlay_visible_showsTipAndConcept() {
    val problem = MathProblem(
      question = "3^2 + 4^2 = ?",
      correctAnswer = "25",
      options = listOf("25", "12", "49"),
      explanation = "Sum of squares.",
      tip = "Square each term before adding.",
    )
    compose.setContent {
      Box {
        TipOverlay(visible = true, onClose = {}, problem = problem)
      }
    }
    compose.onNodeWithText("HINT").assertIsDisplayed()
    compose.onNodeWithText("Study Tip").assertIsDisplayed() // default concept when no metadata
    compose.onNodeWithText("Square each term before adding.").assertIsDisplayed()
  }

  /**
   * Interaction test: drive the calculator through the UI and verify it actually computes
   * (key input -> CalcEngine eval -> result line). Chosen so no intermediate display value
   * collides with a key label: 5 × 9 = 45 ("45" is not a key, "= 45" is the result row).
   */
  @Test
  fun calculatorOverlay_computesResultFromKeyPresses() {
    compose.setContent {
      Box {
        CalculatorOverlay(
          visible = true,
          onClose = {},
          inputState = remember { mutableStateOf("") },
          resultState = remember { mutableStateOf("") },
          memoryState = remember { mutableStateOf(0.0) },
          historyState = remember { mutableStateOf<List<String>>(emptyList()) },
          errorState = remember { mutableStateOf(false) },
          logTelemetry = {},
        )
      }
    }
    compose.onNodeWithText("5").performClick()
    compose.onNodeWithText("×").performClick()
    compose.onNodeWithText("9").performClick()
    compose.onNodeWithText("=").performClick()
    compose.onNodeWithText("= 45").assertIsDisplayed()
  }
}
