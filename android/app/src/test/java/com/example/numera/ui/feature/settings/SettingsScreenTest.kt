package com.example.numera.ui.feature.settings

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Render-crash guard for the Settings screen. Settings is a searchable *catalog* (`allSettingsList`)
 * whose visible layout pulls items by title via `allSettingsList.first { it.title == "…" }` — which
 * throws NoSuchElementException at render time if a catalog item is removed without updating the
 * layout. (That exact regression shipped once when the dead duplicate motion controls were deduped:
 * the items were removed from the catalog but the layout still referenced them.) There is no other
 * test that renders this screen, so a green build does NOT prove it opens. This does.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SettingsScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersWithoutCrashing_andShowsSingleFunctionalMotionControl() {
    // Relaxed mock: the screen's LaunchedEffects call getProgressReport/getNotificationPreferences;
    // relaxed returns benign defaults so the composition reaches its full layout.
    val fakeApi = mockk<ApiService>(relaxed = true)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent {
      SettingsScreen(user = null, onLogout = {}, onRefreshProfile = {}, onBack = {})
    }

    // If any `.first { it.title == … }` layout lookup missed, composition would throw before this.
    // The Appearance section renders the single, functional "Reduce Motion" control.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Reduce Motion").fetchSemanticsNodes().isNotEmpty()
    }
    // The two dead/duplicate controls that used to live here are gone.
    compose.onAllNodesWithText("Reduced Motion").assertCountEquals(0)
    compose.onAllNodesWithText("Animation Intensity").assertCountEquals(0)
  }
}
