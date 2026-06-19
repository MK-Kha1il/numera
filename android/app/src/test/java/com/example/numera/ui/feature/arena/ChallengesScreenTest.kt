package com.example.numera.ui.feature.arena

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.ChallengeListItem
import com.example.numera.data.network.ChallengeListResponse
import com.example.numera.data.network.RetrofitClient
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Screen-level test (review #81): the challenges home renders the player's fetched challenges. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ChallengesScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersFetchedChallenges() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getMyChallenges(any()) } returns ChallengeListResponse(
            challenges = listOf(
                ChallengeListItem(code = "ABC234", title = "Fractions Challenge", conceptName = "Fractions", problemCount = 10, isMine = true),
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { ChallengesScreen(onBack = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Fractions Challenge", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Fractions Challenge", substring = true).assertIsDisplayed()
    }
}
