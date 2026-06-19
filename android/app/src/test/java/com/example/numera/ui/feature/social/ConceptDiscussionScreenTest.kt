package com.example.numera.ui.feature.social

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.ConceptPost
import com.example.numera.data.network.ConceptPostsResponse
import com.example.numera.data.network.RetrofitClient
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Screen-level test (review #81): the per-concept discussion renders fetched posts. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ConceptDiscussionScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersFetchedPosts() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getConceptPosts(any(), any()) } returns ConceptPostsResponse(
            conceptId = "frac_add",
            name = "Adding Fractions",
            posts = listOf(
                ConceptPost(id = 1, username = "curious_learner", body = "Why invert and multiply?"),
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent {
            ConceptDiscussionScreen(conceptId = "frac_add", conceptName = "Adding Fractions", onBack = {})
        }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Why invert and multiply?", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Why invert and multiply?", substring = true).assertIsDisplayed()
    }
}
