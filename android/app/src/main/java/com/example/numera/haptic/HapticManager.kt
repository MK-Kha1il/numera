package com.example.numera.haptic

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

object HapticManager {
    private var vibrator: Vibrator? = null

    // Plain volatile — not Compose state; this singleton is used outside composition too
    @Volatile var isEnabled: Boolean = true

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        isEnabled = prefs.getBoolean("haptics_enabled", true)
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)
                ?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    fun saveSettings(context: Context) {
        context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
            .edit().putBoolean("haptics_enabled", isEnabled).apply()
    }

    // ── Public API ──────────────────────────────────────────────────────────

    fun playSoft() = vibrate(
        predefined  = VibrationEffect.EFFECT_TICK,
        oneShot     = null,
        waveTimings = null,
        legacyMs    = 12L
    )

    fun playMedium() = vibrate(
        predefined  = VibrationEffect.EFFECT_CLICK,
        oneShot     = OneShot(20L, 160),
        waveTimings = null,
        legacyMs    = 20L
    )

    fun playSuccess() = vibrate(
        predefined  = VibrationEffect.EFFECT_CLICK,
        oneShot     = OneShot(35L, 120),
        waveTimings = null,
        legacyMs    = 35L
    )

    fun playMajorReward() = vibrate(
        predefined  = null,
        oneShot     = null,
        waveTimings = WaveForm(
            timings    = longArrayOf(0, 80, 50, 150),
            amplitudes = intArrayOf(0, 140, 0, 240)
        ),
        legacyMs    = null,
        legacyPattern = longArrayOf(0, 80, 50, 150)
    )

    fun playError() = vibrate(
        predefined  = null,
        oneShot     = null,
        waveTimings = WaveForm(
            timings    = longArrayOf(0, 60, 40, 60),
            amplitudes = intArrayOf(0, 80, 0, 80)
        ),
        legacyMs    = null,
        legacyPattern = longArrayOf(0, 60, 40, 60)
    )

    fun playTickTension(intensity: Float) {
        if (!isEnabled) return
        val v = vibrator ?: return
        val duration  = (10 + 12 * intensity).toLong()
        val amplitude = (40 + 100 * intensity).toInt().coerceIn(1, 255)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(duration, amplitude))
        } else {
            @Suppress("DEPRECATION")
            v.vibrate(duration)
        }
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    private data class OneShot(val ms: Long, val amplitude: Int)
    private data class WaveForm(val timings: LongArray, val amplitudes: IntArray)

    private fun vibrate(
        predefined   : Int?,
        oneShot      : OneShot?,
        waveTimings  : WaveForm?,
        legacyMs     : Long?,
        legacyPattern: LongArray? = null
    ) {
        if (!isEnabled) return
        val v = vibrator ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && predefined != null) {
            v.vibrate(VibrationEffect.createPredefined(predefined))
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            when {
                waveTimings != null ->
                    v.vibrate(VibrationEffect.createWaveform(waveTimings.timings, waveTimings.amplitudes, -1))
                oneShot != null ->
                    v.vibrate(VibrationEffect.createOneShot(oneShot.ms, oneShot.amplitude))
                legacyMs != null ->
                    v.vibrate(VibrationEffect.createOneShot(legacyMs, VibrationEffect.DEFAULT_AMPLITUDE))
            }
        } else {
            @Suppress("DEPRECATION")
            when {
                legacyPattern != null -> v.vibrate(legacyPattern, -1)
                legacyMs      != null -> v.vibrate(legacyMs)
            }
        }
    }
}
