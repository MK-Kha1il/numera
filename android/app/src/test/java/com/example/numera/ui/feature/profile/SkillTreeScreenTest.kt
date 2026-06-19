package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SkillTreeNode
import com.example.numera.data.network.SkillTreeResponse
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Screen-level test over the data boundary (review #81): a mocked [ApiService] feeds the skill
 * tree, and we assert a fetched concept node renders under its strand heading.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SkillTreeScreenTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun rendersFetchedConceptNodes() {
        val fakeApi = mockk<ApiService>(relaxed = true)
        coEvery { fakeApi.getSkillTree(any()) } returns SkillTreeResponse(
            nodes = listOf(
                SkillTreeNode(conceptId = "frac_add", name = "Adding Fractions", category = "Fractions", level = 3, started = true, overall = 0.7f, stage = "Skilled"),
            ),
        )
        RetrofitClient.authToken = "test-token"
        RetrofitClient.setApiServiceForTest(fakeApi)

        compose.setContent { SkillTreeScreen(onBack = {}, onPractice = {}, onDiscuss = {}) }

        compose.waitUntil(timeoutMillis = 5_000) {
            compose.onAllNodesWithText("Adding Fractions", substring = true).fetchSemanticsNodes().isNotEmpty()
        }
        compose.onNodeWithText("Adding Fractions", substring = true).assertIsDisplayed()
    }
}
