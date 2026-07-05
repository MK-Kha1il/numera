package com.example.numera.ui.feature.archive

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.User
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Render-crash guard for the Train tab (LevelMapScreen). Renders the real screen with a relaxed
 * mocked ApiService and waits for the static "Archive Explorer" sub-tab label, proving composition
 * succeeded. A level-5 user skips the placement prompt, so the level-map tabs render.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LevelMapScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWithoutCrashing() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      LevelMapScreen(
        user = User(id = 1, username = "tester", xp = 100, level = 5, coins = 50, rank = "Bronze III", streak = 3),
        onStartSoloGame = {},
        onStartLegacyGame = {},
        onStartPlacement = {},
        onSkipPlacement = {},
        onShowCommitment = {},
      )
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Archive Explorer").fetchSemanticsNodes().isNotEmpty()
    }
  }
}
