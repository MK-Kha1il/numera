package com.example.numera.ui.dialogs

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.CasSolveResponse
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
 * Exercises the CAS solver dialog's data boundary: a mocked [ApiService] returns a worked linear
 * solution (plain-text steps, so no WebView/MathText), and we assert the solution + steps render
 * after the user types an equation and taps Solve.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class CasSolverDialogTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWorkedSolution() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.casSolve(any(), any()) } returns CasSolveResponse(
      ok = true,
      equation = "3x + 4 = 13",
      variable = "x",
      solutions = listOf("3"),
      steps = listOf("Collect terms: 3x = 9", "Divide both sides by 3: x = 3"),
      source = "js-linear"
    )
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { CasSolverDialog(onDismissRequest = {}) }

    compose.onNode(hasSetTextAction()).performTextInput("3x + 4 = 13")
    compose.onNodeWithText("Solve", ignoreCase = true).performClick() // DuoButton renders the label uppercased

    // The call hops IO -> Main; poll until the rendered solution appears.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Solution: 3").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Solution: 3").assertIsDisplayed()
    // The worked step renders into the tree (it may sit below the dialog's scroll fold, so assert
    // existence rather than on-screen visibility).
    compose.onNodeWithText("Divide both sides by 3: x = 3").assertExists()
  }
}
