package com.example.numera.ui.feature.dashboard

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.example.numera.data.network.TodayItem
import com.example.numera.data.network.TodayResponse
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
class TodayCardTest {
    @get:Rule val compose = createComposeRule()

    private val plan = TodayResponse(
        streak = 4,
        streakSafeToday = false,
        claimableQuests = 1,
        items = listOf(
            TodayItem(key = "review", title = "Rescue 2 fading concepts", subtitle = "Quick review", progress = 0, target = 2, done = false),
            TodayItem(key = "solved", title = "Solve 5 problems", subtitle = "Daily core", progress = 2, target = 5, done = false),
            TodayItem(key = "daily_puzzle", title = "Crack today's puzzle", progress = 1, target = 1, done = true),
        ),
    )

    /** The plan renders in order with progress, done count, streak warning and claim hint. */
    @Test
    fun rendersPlanWithProgressAndStreakLine() {
        compose.setContent { TodayCard(today = plan, onItemClick = {}) }

        compose.onNodeWithText("Today").assertIsDisplayed()
        compose.onNodeWithText("1/3").assertIsDisplayed() // one of three steps done
        compose.onNodeWithText("Rescue 2 fading concepts").assertIsDisplayed()
        compose.onNodeWithText("2/5").assertIsDisplayed() // solved progress
        compose.onNodeWithText("Solve one problem to keep your 4-day streak").assertIsDisplayed()
        compose.onNodeWithText("🎁 1 reward ready to claim below").assertIsDisplayed()
    }

    /** Tapping a pending step routes by key; tapping a done step does nothing. */
    @Test
    fun tappingPendingStepRoutesByKey() {
        val clicks = mutableListOf<String>()
        compose.setContent { TodayCard(today = plan, onItemClick = { clicks.add(it) }) }

        compose.onNodeWithText("Rescue 2 fading concepts").performClick()
        compose.onNodeWithText("Crack today's puzzle").performClick() // done → disabled
        assertEquals(listOf("review"), clicks)
    }

    /** Streak-safe day shows the positive framing instead of the warning. */
    @Test
    fun streakSafeShowsPositiveLine() {
        compose.setContent {
            TodayCard(today = plan.copy(streakSafeToday = true), onItemClick = {})
        }
        compose.onNodeWithText("🔥 Streak safe for today · 4 days").assertIsDisplayed()
    }
}
