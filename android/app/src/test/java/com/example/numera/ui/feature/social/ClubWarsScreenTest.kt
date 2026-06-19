package com.example.numera.ui.feature.social

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.ClubDetail
import com.example.numera.data.network.ClubWar
import com.example.numera.data.network.ClubWarSide
import com.example.numera.data.network.ClubWarsResponse
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
 * Screen-level test over the data boundary (review #81 — the last untested network screen): a
 * mocked [ApiService] returns an active war for the player's club, and we assert the matchup card
 * renders (challenger vs opponent + concept).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ClubWarsScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersActiveWarMatchup() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getClubWars(any()) } returns ClubWarsResponse(
            wars = listOf(
                ClubWar(
                    id = 1, concept = "Fractions", problemCount = 10, status = "active", myClubId = 1,
                    challenger = ClubWarSide(clubId = 1, name = "Mathletes", total = 12, players = 3),
                    opponent = ClubWarSide(clubId = 2, name = "Rivals", total = 8, players = 2),
                ),
            ),
            myClubId = 1,
        )
        coEvery { fakeApi.getMyClub(any()) } returns MyClubResponse(
            club = ClubDetail(id = 1, name = "Mathletes", isOwner = true),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { ClubWarsScreen(onBack = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Mathletes", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Mathletes", substring = true).assertIsDisplayed()
        compose.onNodeWithText("Fractions", substring = true).assertIsDisplayed()
    }
}
