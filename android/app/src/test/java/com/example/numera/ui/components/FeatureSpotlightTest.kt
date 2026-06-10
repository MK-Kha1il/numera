package com.example.numera.ui.components

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SimpleResponse
import com.example.numera.data.network.SpotlightItem
import com.example.numera.data.network.SpotlightsResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class FeatureSpotlightTest {
    @get:Rule val compose = createComposeRule()

    /** An unseen spotlight is revealed once and, on dismiss, is reported seen to the server. */
    @Test
    fun unseenSpotlightShowsThenMarksSeen() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getSpotlights(any()) } returns SpotlightsResponse(
            seen = emptyList(),
            catalog = listOf(SpotlightItem("arena", "The Arena", "Race live opponents.", "⚔️")),
        )
        coEvery { fakeApi.markSpotlightSeen(any(), any()) } returns SimpleResponse(true, "ok")
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent {
            val controller = rememberSpotlightController()
            LaunchedEffect(controller.loaded) { if (controller.loaded) controller.maybeShow("arena") }
            FeatureSpotlightHost(controller)
        }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("The Arena").fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Got it", ignoreCase = true).performClick()

        // Dismissing reports the spotlight as seen so it never repeats.
        coVerify { fakeApi.markSpotlightSeen(any(), any()) }
    }
}
