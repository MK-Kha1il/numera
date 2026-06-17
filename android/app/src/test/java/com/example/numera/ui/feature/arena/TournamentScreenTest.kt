package com.example.numera.ui.feature.arena

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.TournamentCurrentResponse
import com.example.numera.data.network.TournamentLeaderboardEntry
import com.example.numera.data.network.TournamentMeta
import com.example.numera.data.network.User
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Screen-level test over the data boundary: a mocked [ApiService] feeds the weekly tournament,
 * and we assert the leaderboard renders a real player AND labels a pace-setter bot as a bot
 * (ultra-review #46/#19 — the seeded bots that keep the board from being an empty room).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class TournamentScreenTest {
    @get:Rule val compose = createComposeRule()

    private val me = User(id = 99, username = "me", xp = 0, level = 1, coins = 100, rank = "Bronze", streak = 0)

    @Test
    fun rendersLeaderboardAndLabelsBots() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getCurrentTournament(any()) } returns TournamentCurrentResponse(
            tournament = TournamentMeta(id = 1, title = "Weekly Fractions Cup", conceptName = "Fractions", problemCount = 10, msRemaining = 86_400_000, status = "active"),
            yourEntry = null,
            yourRank = null,
            leaderboard = listOf(
                TournamentLeaderboardEntry(position = 1, username = "alice_test", userId = 7, score = 9, elapsedMs = 60_000, isBot = false),
                TournamentLeaderboardEntry(position = 2, username = "Sigma", userId = 0, score = 8, elapsedMs = 70_000, isBot = true),
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { TournamentScreen(user = me, onExit = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("alice_test", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("alice_test", substring = true).assertIsDisplayed()
        // The seeded pace-setter is always labeled as a bot.
        compose.onNodeWithText("🤖 bot", substring = true).assertIsDisplayed()
    }
}
