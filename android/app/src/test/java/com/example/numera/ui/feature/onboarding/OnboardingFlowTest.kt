package com.example.numera.ui.feature.onboarding

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.AhaStartResponse
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.OnboardingCatalogItem
import com.example.numera.data.network.OnboardingCatalogs
import com.example.numera.data.network.OnboardingStateResponse
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

@RunWith(RobolectricTestRunner::class)
// A tall, phone-sized window so the pinned bottom CTA is on-screen (default Robolectric window is
// small enough to push it out of view, which fails display/click assertions).
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class OnboardingFlowTest {
    @get:Rule val compose = createComposeRule()

    /** The multi-select goals step renders its options and gates the CTA on at least one selection. */
    @Test
    fun goalsStepGatesCtaOnSelection() {
        val motivations = listOf(
            OnboardingCatalogItem("improve_grades", "Improve my grades", "📈"),
            OnboardingCatalogItem("compete", "Compete with others", "🏆"),
        )
        compose.setContent { GoalsStep(stepIndex = 3, totalSteps = 5, motivations = motivations, onContinue = {}) }

        compose.onNodeWithText("Improve my grades").assertIsDisplayed()
        // Nothing selected yet → CTA is the disabled prompt. (DuoButton renders its label uppercased,
        // so match case-insensitively.)
        compose.onNodeWithText("Select at least one", ignoreCase = true).assertExists()

        compose.onNodeWithText("Improve my grades").performClick()
        // Selecting one flips the CTA to Continue.
        compose.onNodeWithText("Continue", ignoreCase = true).assertExists()
        compose.onNodeWithText("Select at least one", ignoreCase = true).assertDoesNotExist()
    }

    /**
     * The orchestrator greets the learner and advances Welcome → Aha against a mocked API. The
     * streamlined flow puts the "solve now" aha moment at step 2 (was ~step 6).
     */
    @Test
    fun flowAdvancesFromWelcomeToAha() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getOnboardingState(any()) } returns OnboardingStateResponse(
            onboardingComplete = false,
            catalogs = OnboardingCatalogs(
                motivations = listOf(OnboardingCatalogItem("improve_grades", "Improve my grades", "📈")),
            ),
        )
        coEvery { fakeApi.getProfile(any()) } returns
            User(id = 1, username = "ada", xp = 0, level = 1, coins = 0, rank = "Bronze", streak = 0)
        coEvery { fakeApi.startOnboardingAha(any()) } returns
            AhaStartResponse(question = "2 + 2", options = listOf("3", "4", "5"))
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { OnboardingFlow(onComplete = {}) }

        // DuoButton uppercases its label → match case-insensitively + substring.
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("begin", substring = true, ignoreCase = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("begin", substring = true, ignoreCase = true).performClick()

        // The aha step ("Your first win") is now what follows Welcome.
        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Your first win").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Your first win").assertIsDisplayed()
    }
}
