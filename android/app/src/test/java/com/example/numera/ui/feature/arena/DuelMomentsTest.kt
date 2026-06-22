package com.example.numera.ui.feature.arena

import com.example.numera.data.network.HeadToHead
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

// Pure-logic guard for the cosmetic momentum + rivalry helpers (DuelMoments.kt). No Compose rule
// needed — these are plain functions, and they must never affect anything but presentation.
class DuelMomentsTest {

    @Test
    fun neutralWhenNoStreakAndEarly() {
        assertEquals(Momentum.NEUTRAL, momentumFor(streak = 0, currentIdx = 0, total = 5, myPoints = 0, oppPoints = 0))
    }

    @Test
    fun streakTiersClimb() {
        assertEquals(Momentum.IN_RHYTHM, momentumFor(2, 1, 5, 40, 20))
        assertEquals(Momentum.LOCKED_IN, momentumFor(3, 2, 5, 60, 20))
        assertEquals(Momentum.ON_FIRE, momentumFor(5, 3, 5, 100, 20))
    }

    @Test
    fun clutchOverridesStreakInACloseFinalStretch() {
        // Last problem, one-swing margin, real scores on the board → Clutch regardless of streak.
        assertEquals(Momentum.CLUTCH, momentumFor(streak = 1, currentIdx = 4, total = 5, myPoints = 60, oppPoints = 60))
    }

    @Test
    fun blowoutFinalStretchIsNotClutch() {
        // Final stretch but decided by far more than one swing → falls back to the streak tier.
        assertEquals(Momentum.LOCKED_IN, momentumFor(streak = 4, currentIdx = 4, total = 5, myPoints = 80, oppPoints = 0))
    }

    @Test
    fun clutchNeedsSomethingOnTheBoard() {
        // 0–0 on the last question shouldn't read as "clutch" — nobody's done anything yet.
        assertEquals(Momentum.NEUTRAL, momentumFor(streak = 0, currentIdx = 4, total = 5, myPoints = 0, oppPoints = 0))
    }

    @Test
    fun rivalryLineFramesTheRecord() {
        assertTrue(rivalryLine(HeadToHead(total = 0), "Sam").contains("First meeting"))
        assertTrue(rivalryLine(HeadToHead(total = 4, myWins = 3, theirWins = 1), "Sam").contains("You lead Sam 3–1"))
        assertTrue(rivalryLine(HeadToHead(total = 4, myWins = 1, theirWins = 3), "Sam").contains("Sam leads 3–1"))
        assertTrue(rivalryLine(HeadToHead(total = 4, myWins = 2, theirWins = 2), "Sam").contains("tied"))
    }

    @Test
    fun clutchAccentColorsAreDistinctAndDefaulted() {
        assertTrue(clutchAccentColor("gold") != clutchAccentColor("green"))
        // An unknown accent must resolve to a safe default, never crash.
        assertEquals(clutchAccentColor("blue"), clutchAccentColor("totally-unknown"))
    }

    // NB: the old client-side rank ladder (nextRankInfo) and Elo projection (projectedEloChange) were
    // removed — they mirrored the RETIRED classic-Elo scale and disagreed with the server's NRS rank
    // math. The climb bar + duel stakes are now fed by the server (DomainRating · duel_start stakes),
    // so there is no client rating math left to unit-test here.
}
