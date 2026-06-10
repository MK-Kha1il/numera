package com.example.numera.ui.components

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
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

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class AnswerInputTest {
    @get:Rule val compose = createComposeRule()

    /** Math keys append their symbol to the host-owned value. */
    @Test
    fun mathKeyAppendsSymbol() {
        var value = ""
        compose.setContent {
            var v by remember { mutableStateOf("3") }
            AnswerInput(value = v, onValueChange = { v = it; value = it }, onSubmit = {}, enabled = true)
        }
        compose.onNodeWithText("/").performClick()
        assertEquals("3/", value)
        compose.onNodeWithText("π").assertIsDisplayed()
    }

    /** Submit stays disabled while the field is blank, and fires once there is content. */
    @Test
    fun submitGatedOnContent() {
        var submitted = 0
        compose.setContent {
            var v by remember { mutableStateOf("") }
            AnswerInput(value = v, onValueChange = { v = it }, onSubmit = { submitted++ }, enabled = true)
        }
        compose.onNodeWithText("SUBMIT").performClick() // DuoButton uppercases its label
        assertEquals(0, submitted)
        compose.onNodeWithText("-").performClick() // appends via the math strip
        compose.onNodeWithText("SUBMIT").performClick()
        assertEquals(1, submitted)
    }
}
