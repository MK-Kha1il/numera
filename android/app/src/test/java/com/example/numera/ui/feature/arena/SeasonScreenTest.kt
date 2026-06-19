package com.example.numera.ui.feature.arena

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SeasonLeaderboardEntry
import com.example.numera.data.network.SeasonLeaderboardResponse
import com.example.numera.data.network.User
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Screen-level test (review #81): the ranked-season leaderboard renders fetched entries. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SeasonScreenTest {
    @get:Rule val compose = createComposeRule()

    private val me = User(id = 99, username = "me", xp = 0, level = 1, coins = 100, rank = "Bronze", streak = 0)

    @Test
    fun rendersFetchedLeaderboard() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getSeasonLeaderboard(any()) } returns SeasonLeaderboardResponse(
            leaderboard = listOf(
                SeasonLeaderboardEntry(position = 1, username = "season_ace", userId = 7, peak = 1500),
            ),
            yourRank = null,
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { SeasonScreen(user = me, onExit = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("season_ace", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("season_ace", substring = true).assertIsDisplayed()
    }
}
