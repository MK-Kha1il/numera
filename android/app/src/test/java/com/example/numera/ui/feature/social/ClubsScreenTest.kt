package com.example.numera.ui.feature.social

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.ClubSummary
import com.example.numera.data.network.MyClubResponse
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
 * Screen-level test over the data boundary (review #81): when the player is in no club, a mocked
 * [ApiService] returns a browsable club and we assert it renders in the browse list.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ClubsScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersBrowsableClubsWhenNotInOne() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getMyClub(any()) } returns MyClubResponse(club = null)
        coEvery { fakeApi.browseClubs(any()) } returns listOf(
            ClubSummary(id = 1, name = "Mathletes", description = "Sharpest in the league", memberCount = 5),
        )
        // clubsLeaderboard is left to the relaxed mock (empty list).
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { ClubsScreen(onBack = {}, onOpenWars = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Mathletes", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Mathletes", substring = true).assertIsDisplayed()
    }
}
