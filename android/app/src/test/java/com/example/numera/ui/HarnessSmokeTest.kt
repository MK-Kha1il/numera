package com.example.numera.ui

import androidx.compose.material3.Text
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Proves the JVM Compose UI test net works: Robolectric + createComposeRule render a composable
 * and we can assert on the semantics tree — no device or emulator required. This is the
 * foundation the screen/component tests build on.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class HarnessSmokeTest {
  @get:Rule val compose = createComposeRule()

  @Test
  fun composeRule_rendersAndQueriesText() {
    compose.setContent { Text("numera-harness-ok") }
    compose.onNodeWithText("numera-harness-ok").assertIsDisplayed()
  }
}
