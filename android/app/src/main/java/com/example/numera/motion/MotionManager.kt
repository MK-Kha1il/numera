package com.example.numera.motion

import android.content.Context
import android.provider.Settings

/**
 * Accessibility: a single source of truth for "reduce motion" (ultra review #76). It's ON when
 * EITHER the user flips the in-app toggle OR the OS has animations disabled
 * (ANIMATOR_DURATION_SCALE == 0, i.e. Settings > Accessibility > Remove animations). Heavy,
 * non-essential effects (confetti, the looping math-symbol background) read [reduceMotion] and
 * render a still frame instead. Mirrors SoundManager/HapticManager: a plain singleton so it can be
 * read inside or outside composition.
 */
object MotionManager {
    @Volatile private var userPref: Boolean = false
    @Volatile private var systemReduced: Boolean = false

    /** Effective setting used by animations to decide whether to move. */
    val reduceMotion: Boolean get() = userPref || systemReduced

    /** The in-app toggle alone (drives the Settings switch; OS setting is layered on top). */
    var userReduceMotion: Boolean
        get() = userPref
        set(value) { userPref = value }

    fun init(context: Context) {
        userPref = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
            .getBoolean("reduce_motion", false)
        systemReduced = systemAnimationsDisabled(context)
    }

    fun saveSettings(context: Context) {
        context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
            .edit().putBoolean("reduce_motion", userPref).apply()
    }

    private fun systemAnimationsDisabled(context: Context): Boolean = try {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    } catch (e: Exception) {
        false
    }
}
