package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import com.example.numera.data.network.*
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Mastery Profile screen against a mocked [ApiService]: the identity headline, domain stages,
 * evidence-gated competencies (locked ones say "Emerging", never a fake number) and the
 * recommendation deep-link all render from a canned /api/mastery/profile payload.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MasteryMapScreenTest {
  @get:Rule val compose = createComposeRule()

  private fun fakeResponse() = MasteryMapResponse(
    identity = MasteryIdentity(
      headline = "A pattern-seeking algebraist",
      subline = "Pattern Recognition is your sharpest edge; Algebra is your territory.",
      stage = "Developing",
      overall = 0.52f,
    ),
    domains = listOf(
      MasteryDomain(key = "algebra", name = "Algebra", blurb = "Symbols and equations", total = 77, started = 12, proficient = 5, score = 0.4f, stage = "Developing"),
      MasteryDomain(key = "trigonometry", name = "Trigonometry", blurb = "Triangles", comingSoon = true, total = 0, stage = "On the horizon"),
    ),
    competencies = listOf(
      MasteryCompetency(key = "pattern_recognition", name = "Pattern Recognition", blurb = "Seeing the rule", value = 0.8f, unlocked = true, evidence = 40, minEvidence = 8),
      MasteryCompetency(key = "problem_solving", name = "Problem Solving", blurb = "Novel contexts", value = 0f, unlocked = false, evidence = 0, minEvidence = 3),
    ),
    records = listOf(MasteryRecord(key = "solved", label = "Problems solved", value = 321)),
    titles = listOf(MasteryTitle(id = "comp_pattern_recognition", name = "Pattern Seeker", desc = "Pattern Recognition at 75%+", earned = true)),
    recommendations = listOf(
      MasteryRecommendation(kind = "competency", target = "Problem Solving", gameMode = "transfer_challenge", category = "General", level = 0, title = "Transfer challenge", reason = "Prove it in a new context."),
    ),
  )

  @Test
  fun rendersIdentityDomainsAndGatedCompetencies() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.getMasteryMap(any()) } returns fakeResponse()
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { MasteryMapScreen(onBack = {}, onPractice = { _, _, _ -> }) }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("A pattern-seeking algebraist").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("A pattern-seeking algebraist").assertIsDisplayed()
    // Evidence gate: the locked competency shows "Emerging", not a fabricated percentage.
    compose.onNodeWithText("Emerging").performScrollTo().assertIsDisplayed()
    compose.onNodeWithText("80%").performScrollTo().assertIsDisplayed()
    // Domain layer: a started domain shows its stage; the future-ready one shows its horizon state.
    compose.onNodeWithText("Algebra").performScrollTo().assertIsDisplayed()
    compose.onAllNodesWithText("Developing").fetchSemanticsNodes().isNotEmpty()
    compose.onNodeWithText("On the horizon").performScrollTo().assertIsDisplayed()
  }

  @Test
  fun recommendationDeepLinksIntoPractice() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.getMasteryMap(any()) } returns fakeResponse()
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    var launched: Triple<String, String, Int>? = null
    compose.setContent {
      MasteryMapScreen(onBack = {}, onPractice = { mode, cat, lvl -> launched = Triple(mode, cat, lvl) })
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Transfer challenge").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Transfer challenge").performScrollTo().performClick()
    assertEquals(Triple("transfer_challenge", "General", 0), launched)
  }
}
