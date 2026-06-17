package com.example.numera.ui.components

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the typed-answer math pad (ultra-review #16): each key appends its grader-understood
 * token to the answer, and backspace trims the last character. The pad is stateless, so we assert
 * on the value handed back through onValueChange.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MathKeyboardTest {
    @get:Rule val compose = createComposeRule()

    private fun tokenFor(keyLabel: String, currentValue: String): String {
        var captured = currentValue
        compose.setContent {
            MathKeyboard(value = currentValue, onValueChange = { captured = it })
        }
        compose.onNodeWithText(keyLabel).performClick()
        return captured
    }

    @Test
    fun fractionKeyAppendsSlash() {
        assertEquals("2/", tokenFor("a/b", "2"))
    }

    @Test
    fun exponentKeyAppendsCaret() {
        assertEquals("2^", tokenFor("x²", "2"))
    }

    @Test
    fun piKeyAppendsPi() {
        assertEquals("π", tokenFor("π", ""))
    }

    @Test
    fun backspaceRemovesLastCharacter() {
        var captured = "2/"
        compose.setContent {
            MathKeyboard(value = "2/", onValueChange = { captured = it })
        }
        compose.onNodeWithText("⌫").performClick()
        assertEquals("2", captured)
    }
}
