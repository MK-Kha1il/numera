package com.example.numera.ui.screens

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
 * Render-crash guards for the auth entry screens — the first thing every user sees, and previously
 * untested. A green build doesn't prove they open (see the Settings crash). Renders each real screen
 * with a relaxed mocked ApiService and waits for its primary CTA, proving composition succeeded.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AuthScreensTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun loginScreen_rendersWithoutCrashing() {
    RetrofitClient.setApiServiceForTest(mockk<ApiService>(relaxed = true))
    compose.setContent {
      LoginScreen(onNavigateToRegister = {}, onLoginSuccess = {})
    }
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Log In").fetchSemanticsNodes().isNotEmpty()
    }
  }

  @Test
  fun registerScreen_rendersWithoutCrashing() {
    RetrofitClient.setApiServiceForTest(mockk<ApiService>(relaxed = true))
    compose.setContent {
      RegisterScreen(onNavigateToLogin = {}, onRegisterSuccess = {})
    }
    compose.waitUntil(timeoutMillis = 5_000) {
      compose.onAllNodesWithText("Sign Up").fetchSemanticsNodes().isNotEmpty()
    }
  }
}
