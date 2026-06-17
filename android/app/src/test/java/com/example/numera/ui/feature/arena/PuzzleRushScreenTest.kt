package com.example.numera.ui.feature.arena

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.PuzzleRushLeaderboardEntry
import com.example.numera.data.network.PuzzleRushLeaderboardResponse
import com.example.numera.data.network.RetrofitClient
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
 * Screen-level test over the data boundary (review #81): a mocked [ApiService] feeds the Puzzle
 * Rush idle view, and we assert the fetched leaderboard renders.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class PuzzleRushScreenTest {
    @get:Rule val compose = createComposeRule()

    private val me = User(id = 99, username = "me", xp = 0, level = 1, coins = 100, rank = "Bronze", streak = 0)

    @Test
    fun rendersFetchedLeaderboard() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.puzzleRushLeaderboard(any()) } returns PuzzleRushLeaderboardResponse(
            leaderboard = listOf(
                PuzzleRushLeaderboardEntry(username = "rush_champ", best = 42),
                PuzzleRushLeaderboardEntry(username = "second_place", best = 30),
            ),
            personalBest = 12,
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { PuzzleRushScreen(user = me, onExit = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("rush_champ", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("rush_champ", substring = true).assertIsDisplayed()
    }
}
