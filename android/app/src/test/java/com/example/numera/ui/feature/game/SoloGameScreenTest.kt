package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.MathLevelResponse
import com.example.numera.data.network.MathProblem
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
 * Flow test pinning the entry into SoloGameScreen: a mocked getProblems returns a level whose
 * response carries a lesson, and we assert the lesson screen renders from that fetched data
 * (title shown). This is the regression guard that makes the next step — carving the lesson
 * block out into its own LessonScreen composable — verifiable rather than blind.
 *
 * Only getProblems is stubbed; the parallel favorites/profile/shop loads hit the unstubbed mock,
 * throw, and are swallowed by the screen's own try/catch (treated as "no data") — exactly the
 * resilient behavior we want to lock in.
 *
 * NOTE: we assert on the lesson *title* (top of the screen) rather than the CTA at the bottom of
 * the scrolling lesson — under Robolectric the lower content (which includes async-measured
 * MathText) composes unreliably, so the title is the stable signal that the lesson rendered.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SoloGameScreenTest {
  @get:Rule val compose = createComposeRule()

  private fun stubLevelWithLesson(): ApiService {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.getProblems(any(), any(), any(), any()) } returns MathLevelResponse(
      category = "Algebra",
      level = 1,
      lessonTitle = "Solving Linear Equations",
      lessonContent = "Isolate the variable on one side.",
      problems = listOf(
        MathProblem(
          question = "If 2x = 4, then x = ?",
          correctAnswer = "2",
          options = listOf("1", "2", "3"),
          explanation = "Divide both sides by 2.",
        ),
      ),
    )
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)
    return fakeApi
  }

  @Test
  fun fetchedLesson_isShownFirst() {
    stubLevelWithLesson()
    compose.setContent {
      SoloGameScreen(category = "Algebra", level = 1, gameMode = "level", onFinishGame = {})
    }
    // The fetch hops IO -> Main, so poll until the fetched lesson title renders.
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Solving Linear Equations").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Solving Linear Equations").assertIsDisplayed()
  }
}
