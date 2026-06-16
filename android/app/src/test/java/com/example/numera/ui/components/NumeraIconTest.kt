package com.example.numera.ui.components

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.onNodeWithContentDescription
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Accessibility (ultra review #74): the custom canvas icon exposes a screen-reader label. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class NumeraIconTest {
    @get:Rule val compose = createComposeRule()

    @Test fun actionIconCarriesADefaultLabel() {
        compose.setContent { NumeraIcon(type = NumeraIconType.Back, animate = false) }
        compose.onNodeWithContentDescription("Back").assertIsDisplayed()
    }

    @Test fun callerCanOverrideTheLabel() {
        compose.setContent { NumeraIcon(type = NumeraIconType.Notification, animate = false, contentDescription = "3 unread notifications") }
        compose.onNodeWithContentDescription("3 unread notifications").assertIsDisplayed()
    }

    @Test fun decorativeIconHasNoAutoLabel() {
        // A stat glyph that sits beside its own number should not add screen-reader noise.
        compose.setContent { NumeraIcon(type = NumeraIconType.Coins, animate = false) }
        assertEquals(0, compose.onAllNodesWithContentDescription("Coins").fetchSemanticsNodes().size)
    }

    @Test fun emptyStringSilencesAnActionIcon() {
        compose.setContent { NumeraIcon(type = NumeraIconType.Back, animate = false, contentDescription = "") }
        assertEquals(0, compose.onAllNodesWithContentDescription("Back").fetchSemanticsNodes().size)
    }
}
