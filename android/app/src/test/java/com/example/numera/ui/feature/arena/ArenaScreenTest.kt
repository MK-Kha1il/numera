package com.example.numera.ui.feature.arena

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
 * Render-crash guard for the Arena (landing) tab — the last main tab without one. In its default
 * state (no matchmaking/lobby active) the socket stays disconnected, so initial composition is
 * self-contained. Renders the real screen with a relaxed mocked ApiService and waits for the hub's
 * static "More ways to play" header, proving composition succeeded.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ArenaScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWithoutCrashing() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      ArenaScreen(
        user = User(id = 1, username = "tester", xp = 100, level = 5, coins = 50, rank = "Bronze III", streak = 3),
        onStartDuelGame = { _ -> },
      )
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("More ways to play").fetchSemanticsNodes().isNotEmpty()
    }
  }
}
