package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.GoalResponse
import com.example.numera.data.network.GoalTypeMeta
import com.example.numera.data.network.RetrofitClient
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Screen-level test (review #81): with no goal set, the picker renders the fetched goal types. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class GoalScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersGoalTypePicker() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getGoal(any()) } returns GoalResponse(
            goal = null,
            types = listOf(
                GoalTypeMeta(key = "daily_problems", label = "Daily problems", unit = "problems", min = 1, max = 50),
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { GoalScreen(onBack = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Daily problems", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Daily problems", substring = true).assertIsDisplayed()
    }
}
