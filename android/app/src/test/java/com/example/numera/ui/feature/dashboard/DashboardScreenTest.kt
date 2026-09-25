package com.example.numera.ui.feature.dashboard

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.User
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Render-crash guard for the Dashboard ("Quests" tab home). Also pins the recent typography sweep:
 * a green build doesn't prove the screen still composes. Relaxed mocked ApiService feeds its
 * (try/caught) load-time fetches; the static TabRow label proves composition succeeded.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class DashboardScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWithoutCrashing() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      DashboardScreen(
        user = User(id = 1, username = "tester", xp = 100, level = 5, coins = 50, rank = "Bronze III", streak = 3),
        onRefreshProfile = {},
        onShowUserProfile = {},
      )
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Daily Drills").fetchSemanticsNodes().isNotEmpty()
    }
  }

  /**
   * Guards the sub-tab collapse: the former "Weekly Leagues" + "Global Standings"
   * top-level sub-tabs are now one "Standings" tab with an in-body Weekly/Global filter, both
   * rendering through the shared StandingRow. Drives that whole path so a green build proves it
   * composes (the structural rewrite isn't exercised by the default Daily-Drills render above).
   */
  @Test
  fun standingsTabRendersWeeklyAndGlobalFilters() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      DashboardScreen(
        user = User(id = 1, username = "tester", xp = 100, level = 5, coins = 50, rank = "Bronze III", streak = 3),
        onRefreshProfile = {},
        onShowUserProfile = {},
      )
    }

    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Standings").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("Standings").performClick()

    // Weekly is the default filter; both filter chips should be present.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Global").fetchSemanticsNodes().isNotEmpty()
    }

    // Switch to Global — its header always renders regardless of (empty) data.
    compose.onNodeWithText("Global").performClick()
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Global Leaderboard", substring = true).fetchSemanticsNodes().isNotEmpty()
    }
  }
}
