package com.example.numera.ui.feature.profile

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
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
 * Render-crash guard for the (large, previously untested) Profile screen. A green build does not
 * prove a Compose screen opens — see the Settings `.first { it.title }` crash that compiled fine.
 * Renders the real screen with a relaxed mocked ApiService (its load-time fetches are try/caught)
 * and waits for a static section header, proving composition reached deep without throwing.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ProfileScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWithoutCrashing() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      ProfileScreen(
        user = User(id = 1, username = "tester", xp = 100, level = 5, coins = 50, rank = "Bronze III", streak = 3),
        onLogout = {},
        onRefreshProfile = {},
        onShowUserProfile = {},
        unlockedRelicIds = emptySet(),
      )
    }

    // The always-visible identity strip renders straight from the `user` param (tab-independent),
    // so reaching it proves the screen composed without throwing.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("3-day streak").fetchSemanticsNodes().isNotEmpty()
    }
  }
}
