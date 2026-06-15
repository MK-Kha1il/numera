package com.example.numera.motion

import android.content.Context
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/** Guards the reduce-motion source of truth: in-app toggle persists and drives reduceMotion. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class MotionManagerTest {

    private fun ctx(): Context = RuntimeEnvironment.getApplication()

    @Test
    fun defaultsToMotionOn() {
        ctx().getSharedPreferences("numera_prefs", Context.MODE_PRIVATE).edit().clear().apply()
        MotionManager.init(ctx())
        assertFalse("reduce-motion is off by default", MotionManager.reduceMotion)
    }

    @Test
    fun userToggleEnablesAndPersists() {
        ctx().getSharedPreferences("numera_prefs", Context.MODE_PRIVATE).edit().clear().apply()
        MotionManager.init(ctx())

        MotionManager.userReduceMotion = true
        MotionManager.saveSettings(ctx())
        assertTrue(MotionManager.reduceMotion)

        // A fresh init (e.g. next launch) restores the saved preference.
        MotionManager.userReduceMotion = false
        MotionManager.init(ctx())
        assertTrue("saved preference survives re-init", MotionManager.reduceMotion)
    }
}
