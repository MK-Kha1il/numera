package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.LearningPlanResponse
import com.example.numera.data.network.LearningPlanStep
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
 * Screen-level test over the data boundary (review #81): a mocked [ApiService] feeds the learning
 * plan, and we assert the next-up step and a path step render.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class LearningPlanScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersFetchedPlan() {
        val next = LearningPlanStep(conceptId = "frac_add", name = "Adding Fractions", category = "Fractions", level = 3, status = "available", isNext = true)
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getLearningPlan(any()) } returns LearningPlanResponse(
            currentLevel = 2, targetLevel = 10, goalDriven = true, total = 5, done = 1, percent = 20,
            nextStep = next,
            steps = listOf(
                LearningPlanStep(conceptId = "int_add", name = "Adding Integers", category = "Integers", level = 1, status = "done", overall = 1.0),
                next,
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { LearningPlanScreen(onBack = {}, onPractice = { _, _ -> }) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Adding Fractions", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("▶ NEXT UP", substring = true).assertIsDisplayed()
        compose.onNodeWithText("Adding Integers", substring = true).assertIsDisplayed()
    }
}
