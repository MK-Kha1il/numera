package com.example.numera

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import io.mockk.coEvery
import io.mockk.mockk
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

/**
 * Launch-time token validation in [MainNavigation]: only a definite server rejection (401/403)
 * may drop the stored session. A network failure at cold start (server unreachable, timeout)
 * must keep the token and let the user into the app — see the regression where any exception
 * cleared the token and stranded users at Login.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class NavigationTokenTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun networkFailureAtLaunchKeepsTokenAndEntersApp() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.getProfile(any()) } throws IOException("server unreachable")
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { MainNavigation() }

    // The offline token check must proceed into the app (bottom nav renders)…
    compose.waitUntil(timeoutMillis = 10_000) {
      compose.onAllNodesWithText("Arena").fetchSemanticsNodes().isNotEmpty()
    }
    // …without dropping the stored session.
    assertTrue(RetrofitClient.isUserLoggedIn)
  }

  @Test
  fun rejectedTokenAtLaunchIsCleared() {
    val fakeApi = mockk<ApiService>(relaxed = true)
    coEvery { fakeApi.getProfile(any()) } throws
      HttpException(Response.error<Any>(401, "{}".toResponseBody()))
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { MainNavigation() }

    compose.waitUntil(timeoutMillis = 10_000) { !RetrofitClient.isUserLoggedIn }
    assertFalse(RetrofitClient.isUserLoggedIn)
  }

  @Test
  fun onlyDefiniteAuthRejectionsClearTheToken() {
    fun http(code: Int) = HttpException(Response.error<Any>(code, "{}".toResponseBody()))
    assertTrue(isAuthRejection(http(401)))
    assertTrue(isAuthRejection(http(403)))
    assertFalse(isAuthRejection(http(500)))
    assertFalse(isAuthRejection(IOException("timeout")))
  }
}
