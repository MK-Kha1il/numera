package com.example.numera.sound

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlin.math.exp
import kotlin.math.sin

object SoundManager {
    private const val TAG = "SoundManager"
    private const val SAMPLE_RATE = 22050

    // SupervisorJob keeps other coroutines alive if one sound fails
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    @Volatile var isMuted: Boolean = false
    @Volatile var volume: Float = 0.5f

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_settings", Context.MODE_PRIVATE)
        isMuted = prefs.getBoolean("sound_muted", false)
        volume  = prefs.getFloat("sound_volume", 0.5f)
    }

    fun saveSettings(context: Context) {
        context.getSharedPreferences("numera_settings", Context.MODE_PRIVATE).edit().apply {
            putBoolean("sound_muted", isMuted)
            putFloat("sound_volume", volume)
            apply()
        }
    }

    fun playClick() = play {
        listOf(
            Tone(600f,   0,  80, 0.7f, 0.012f),
            Tone(1200f,  0,  40, 0.2f, 0.006f)
        )
    }

    fun playCorrect() = play {
        listOf(
            Tone(523.25f,  0,  600, 0.18f, 0.45f, hasTremolo = true),
            Tone(659.25f,  50, 600, 0.16f, 0.45f, hasTremolo = true),
            Tone(783.99f, 100, 600, 0.15f, 0.45f, hasTremolo = true),
            Tone(987.77f, 150, 700, 0.12f, 0.55f, hasTremolo = true),
            Tone(1174.66f,200, 800, 0.11f, 0.60f, hasTremolo = true),
            Tone(1567.98f,250, 900, 0.10f, 0.70f)
        )
    }

    fun playWrong() = play {
        listOf(
            Tone(49.00f,  0,  600, 0.90f, 0.18f, isPluck = true),
            Tone(73.42f, 25,  600, 0.80f, 0.18f, isPluck = true),
            Tone(98.00f, 50,  600, 0.70f, 0.22f, isPluck = true)
        )
    }

    fun playLevelUp() = play {
        listOf(
            Tone(261.63f,   0, 1200, 0.60f, 0.55f, hasTremolo = true),
            Tone(392.00f,  80, 1200, 0.60f, 0.55f, hasTremolo = true),
            Tone(523.25f, 160, 1300, 0.55f, 0.55f, hasTremolo = true),
            Tone(659.25f, 240, 1300, 0.50f, 0.55f, hasTremolo = true),
            Tone(783.99f, 320, 1400, 0.45f, 0.60f, hasTremolo = true),
            Tone(987.77f, 400, 1500, 0.40f, 0.65f, hasTremolo = true),
            Tone(1174.66f,480, 1600, 0.35f, 0.70f, hasTremolo = true),
            Tone(2093.00f,560, 1800, 0.30f, 0.85f)
        )
    }

    fun playTick() = play {
        listOf(Tone(800f, 0, 20, 0.3f, 0.005f))
    }

    fun playRewardClaim() = play {
        listOf(
            Tone(523.25f,   0, 400, 0.50f, 0.15f),
            Tone(659.25f,  50, 400, 0.50f, 0.15f),
            Tone(783.99f, 100, 400, 0.50f, 0.15f),
            Tone(1046.50f,150, 500, 0.45f, 0.20f),
            Tone(1318.51f,200, 500, 0.40f, 0.20f),
            Tone(1567.98f,250, 600, 0.35f, 0.25f)
        )
    }

    fun playPurchase() = play {
        listOf(
            Tone(65.41f,     0, 400, 0.70f, 0.12f, isPluck = true),
            Tone(98.00f,    20, 400, 0.60f, 0.12f, isPluck = true),
            Tone(1046.50f, 120, 500, 0.45f, 0.20f),
            Tone(1318.51f, 150, 500, 0.40f, 0.20f)
        )
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    private data class Tone(
        val freq: Float,
        val startMs: Int,
        val durationMs: Int,
        val amplitude: Float,
        val decayConstant: Float,
        val hasTremolo: Boolean = false,
        val isPluck: Boolean = false
    )

    private inline fun play(crossinline tones: () -> List<Tone>) {
        scope.launch {
            if (isMuted) return@launch
            try {
                synthesizeAndPlay(tones())
            } catch (e: Exception) {
                Log.e(TAG, "Audio synthesis failed: ${e.message}", e)
            }
        }
    }

    private fun synthesizeAndPlay(tones: List<Tone>) {
        val maxEndTimeMs = tones.maxOf { it.startMs + it.durationMs }
        val totalSamples = (SAMPLE_RATE * (maxEndTimeMs / 1000.0)).toInt()
        val buffer = ShortArray(totalSamples)

        val minBufSize = AudioTrack.getMinBufferSize(
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )

        val audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBufSize.coerceAtLeast(totalSamples * 2))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()

        for (i in 0 until totalSamples) {
            val timeSec = i.toDouble() / SAMPLE_RATE
            val timeMs  = (timeSec * 1000.0).toInt()
            var mixed   = 0.0

            for (tone in tones) {
                if (timeMs < tone.startMs || timeMs >= tone.startMs + tone.durationMs) continue
                val t = timeSec - tone.startMs / 1000.0

                mixed += if (tone.isPluck) synthPluck(tone, t)
                         else              synthChime(tone, t)
            }

            val scaled    = mixed * 0.25 * volume
            val clamped   = scaled.coerceIn(-1.0, 1.0)
            buffer[i]     = (clamped * Short.MAX_VALUE).toInt().toShort()
        }

        try {
            audioTrack.write(buffer, 0, totalSamples)
            audioTrack.play()
            // Wait for playback head to finish before releasing
            val expectedFrames = totalSamples
            var waited = 0
            while (audioTrack.playbackHeadPosition < expectedFrames && waited < maxEndTimeMs + 200) {
                Thread.sleep(16)
                waited += 16
            }
        } finally {
            try { audioTrack.stop()    } catch (e: Exception) { Log.w(TAG, "stop: ${e.message}") }
            try { audioTrack.release() } catch (e: Exception) { Log.w(TAG, "release: ${e.message}") }
        }
    }

    private fun synthPluck(tone: Tone, t: Double): Double {
        val attack = 1.0 - exp(-t / 0.002)
        val decay  = exp(-t / tone.decayConstant)
        val env    = attack * decay * tone.amplitude
        val biteWindow = 0.05
        val bite = if (t < biteWindow)
            (1.0 - t / biteWindow) * 0.15 * (if ((tone.freq * t) % 1.0 > 0.5) 1.0 else -1.0)
        else 0.0
        val f = tone.freq.toDouble()
        val wave = sin(2.0 * Math.PI * f * t) +
                   0.40 * sin(4.0 * Math.PI * f * t) * exp(-2.0 * t / tone.decayConstant) +
                   0.25 * sin(6.0 * Math.PI * f * t) * exp(-4.0 * t / tone.decayConstant) +
                   0.15 * sin(8.0 * Math.PI * f * t) * exp(-6.0 * t / tone.decayConstant) +
                   0.08 * sin(10.0 * Math.PI * f * t) * exp(-8.0 * t / tone.decayConstant) +
                   0.20 * sin(2.0 * Math.PI * 90.0 * t) * exp(-t / 0.08)
        return (wave + bite) * env
    }

    private fun synthChime(tone: Tone, t: Double): Double {
        val attack = 1.0 - exp(-t / 0.010)
        val decay  = exp(-t / tone.decayConstant)
        val env    = attack * decay * tone.amplitude
        val f = tone.freq.toDouble()
        var wave = sin(2.0 * Math.PI * f * t) +
                   0.25 * sin(2.0 * Math.PI * f * 2.76 * t) * exp(-3.0 * t / tone.decayConstant) +
                   0.18 * sin(2.0 * Math.PI * f * 5.40 * t) * exp(-5.0 * t / tone.decayConstant) +
                   0.10 * sin(2.0 * Math.PI * f * 8.12 * t) * exp(-8.0 * t / tone.decayConstant) +
                   0.15 * sin(4.0 * Math.PI * f * t) * exp(-2.0 * t / tone.decayConstant)
        if (tone.hasTremolo) wave *= 1.0 + 0.22 * sin(2.0 * Math.PI * 6.0 * t)
        return wave * env
    }
}
