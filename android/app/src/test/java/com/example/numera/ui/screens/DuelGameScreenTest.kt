package com.example.numera.ui.screens

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SocketClient
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Duel screen terminal-state guard. With no live socket (the Robolectric default —
 * SocketClient.socket is null), the screen must land on the explicit "Match unavailable"
 * recovery state with a way back to the arena — never a silent pop, never an infinite
 * "entering the arena" spinner (both previous failure modes of the old screen).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class DuelGameScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun deadSocketShowsRecoveryStateNotSilentExit() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)
    SocketClient.disconnect() // ensure no socket survives from another test

    var finished = false
    compose.setContent {
      DuelGameScreen(
        roomId = "duel_test_room",
        opponentName = "Rival",
        myUserIdHint = 1,
        onFinishGame = { finished = true },
      )
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Match unavailable").fetchSemanticsNodes().isNotEmpty()
    }
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Back to Arena").fetchSemanticsNodes().isNotEmpty()
    }
    // The screen offers the exit — it does not take it for the player.
    assert(!finished) { "screen must not auto-navigate away without the player's input" }
  }
}
