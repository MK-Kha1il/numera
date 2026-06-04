package com.example.numera.ui.screens

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.MfaStatusResponse
import com.example.numera.data.network.RetrofitClient
import com.example.numera.ui.feature.settings.TwoFactorSettingsSection
import io.mockk.coEvery
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the Settings MFA enrollment section: a disabled account is offered the enrollment entry
 * point after the status fetch resolves. (The login second-factor dialog is a system AlertDialog
 * window whose idling fights Robolectric; its end-to-end exchange is covered by the server's
 * auth_security MFA test, so it isn't re-driven here.)
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h2000dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MfaClientTest {
  @get:Rule val compose = createComposeRule()

  // onAllNodesWithText (no idle wait), matching the codebase's RecapScreenTest pattern.
  private fun present(text: String) =
    compose.onAllNodesWithText(text).fetchSemanticsNodes().isNotEmpty()

  @Test
  fun settingsSection_disabledState_offersEnrollment() {
    val fakeApi = mockk<ApiService>()
    coEvery { fakeApi.mfaStatus(any()) } returns MfaStatusResponse(enabled = false)
    RetrofitClient.authToken = "test-token"
    RetrofitClient.setApiServiceForTest(fakeApi)

    compose.setContent { TwoFactorSettingsSection() }

    compose.waitUntil(timeoutMillis = 5_000) { present("Enable Two-Factor Auth") }
    assert(present("Enable Two-Factor Auth"))
  }
}
