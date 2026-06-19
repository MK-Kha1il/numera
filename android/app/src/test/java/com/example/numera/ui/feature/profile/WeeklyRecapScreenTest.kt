package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RecapTopConcept
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.WeeklyRecap
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Screen-level test (review #81): the weekly recap renders the fetched week's solve count. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class WeeklyRecapScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersFetchedRecap() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getWeeklyRecap(any()) } returns WeeklyRecap(
            weekProblems = 42, activeDays = 5, streak = 4, level = 7, coins = 300,
            conceptsPracticed = 9, overallMastery = 0.62f, masteryStage = "Skilled",
            topConcept = RecapTopConcept(name = "Adding Fractions", overall = 0.8f),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { WeeklyRecapScreen(onBack = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("This week you solved", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("This week you solved", substring = true).assertIsDisplayed()
        compose.onNodeWithText("42", substring = true).assertIsDisplayed()
    }
}
