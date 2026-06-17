package com.example.numera.ui.feature.game

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Guards the signature mastery-up moment (ultra-review #20): it names the strand and tier reached
 * (text carries the meaning, never colour alone) and the continue button dismisses it.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], qualifiers = "w411dp-h891dp")
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class MasteryUpCelebrationTest {
    @get:Rule val compose = createComposeRule()

    @Test
    fun namesTheStrandAndTier() {
        compose.setContent {
            MasteryUpCelebration(category = "fractions", label = "Skilled", onContinue = {})
        }
        compose.onNodeWithText("MASTERY UP").assertIsDisplayed()
        compose.onNodeWithText("Fractions — Skilled").assertIsDisplayed()
    }

    @Test
    fun continueButtonDismisses() {
        var continued = false
        compose.setContent {
            MasteryUpCelebration(category = "algebra", label = "Mastered", onContinue = { continued = true })
        }
        // DuoButton renders its label uppercased.
        compose.onNodeWithText("KEEP CLIMBING").performClick()
        assertTrue(continued)
    }
}
