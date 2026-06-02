package com.example.numera.ui.feature.social

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.Friend
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
 * Screen-level test exercising the data boundary: a mocked [ApiService] (injected via the
 * RetrofitClient test seam) feeds SocialScreen, and we assert the fetched friend renders. This
 * is what the injectable-ApiService work unlocks — testing real screens, not just pure widgets.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SocialScreenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun rendersFetchedFriends() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.getFriends(any()) } returns
      listOf(Friend(id = 1, username = "alice_test", xp = 100, level = 5, rank = "Gold", status = "accepted"))
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { SocialScreen() }

    // The fetch hops IO -> Main, so poll the semantics tree until the friend appears.
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("alice_test").fetchSemanticsNodes().isNotEmpty()
    }
    compose.onNodeWithText("alice_test").assertIsDisplayed()
  }
}
