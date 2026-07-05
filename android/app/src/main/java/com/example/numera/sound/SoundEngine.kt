package com.example.numera.sound

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.os.SystemClock
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.exp
import kotlin.math.sin

/**
 * How much a sound is allowed to fight for the mix. Under polyphony pressure the engine
 * sheds [LOW] sounds first (UI ticks nobody will miss), keeps [NORMAL] feedback, and always
 * lets [HIGH] moments through (results, celebrations — the sounds that carry meaning).
 */
internal enum class SoundPriority(val maxConcurrent: Int) {
    LOW(3),
    NORMAL(5),
    HIGH(8),
}

/**
 * One synthesis voice inside a sound. Every Numera sound is a stack of these — transient,
 * body, tail, weight — rather than a single loud tone (docs/SoundDesign.md, "Layers").
 *
 * Kinds:
 *  - [Kind.CHIME]  struck glass / celesta — the signature Numera material (inharmonic partials).
 *  - [Kind.PLUCK]  warm felt-piano low — grounding, "soft landing" material.
 *  - [Kind.SUB]    low sine sweep [freq]→[freqEnd] — physical weight for major impacts only.
 *  - [Kind.TICK]   very short pure blip — UI-tier transients and timers.
 *  - [Kind.NOISE]  filtered air burst — attack definition ("touch") on confident taps/impacts.
 */
internal data class Layer(
    val kind: Kind,
    val freq: Float = 0f,
    val startMs: Int = 0,
    val durationMs: Int,
    val amplitude: Float,
    val decay: Float = 0.1f,
    val tremolo: Boolean = false,
    val freqEnd: Float = freq,
) {
    enum class Kind { CHIME, PLUCK, SUB, TICK, NOISE }
}

/**
 * The playback engine behind [SoundManager]. Renders each sound ONCE into a cached PCM buffer
 * (the old engine re-synthesized every play — a correct-answer chord cost ~25k samples of math
 * before the first byte reached the speaker), plays it on a fresh MODE_STATIC AudioTrack, and
 * releases it from a coroutine `delay` instead of a Thread.sleep poll (the old engine parked a
 * worker thread for up to 2.4s per sound). Per-key throttling stops double-fires; the priority
 * cap keeps rapid taps from stacking into mush.
 */
internal object SoundEngine {
    private const val TAG = "SoundEngine"
    internal const val SAMPLE_RATE = 22050

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    private val cache = ConcurrentHashMap<String, ShortArray>()
    private val lastPlayedAt = ConcurrentHashMap<String, Long>()
    private val active = AtomicInteger(0)

    /**
     * Render-and-play [layers] under [key]. The first play of a key pays the synthesis cost;
     * afterwards playback starts from the cached buffer. [gain] is the tier loudness
     * (Tiny 0.55 → Epic 1.0) multiplied by the user's master volume at play time, so moving
     * the volume slider needs no re-render. [throttleMs] drops repeat fires of the same key.
     */
    fun play(
        key: String,
        priority: SoundPriority,
        gain: Float,
        throttleMs: Long = 0L,
        layers: () -> List<Layer>,
    ) {
        if (SoundManager.isMuted) return
        val now = SystemClock.uptimeMillis()
        if (throttleMs > 0) {
            val last = lastPlayedAt[key]
            if (last != null && now - last < throttleMs) return
        }
        lastPlayedAt[key] = now
        if (active.get() >= priority.maxConcurrent) return

        scope.launch {
            active.incrementAndGet()
            try {
                val buffer = cache.getOrPut(key) { render(layers()) }
                playBuffer(buffer, gain)
            } catch (e: Exception) {
                Log.e(TAG, "Sound '$key' failed: ${e.message}", e)
            } finally {
                active.decrementAndGet()
            }
        }
    }

    /** Pre-render the given keys off the critical path so first taps aren't the slow ones. */
    fun prewarm(vararg sounds: Pair<String, () -> List<Layer>>) {
        scope.launch {
            for ((key, layers) in sounds) {
                try {
                    cache.getOrPut(key) { render(layers()) }
                } catch (e: Exception) {
                    Log.w(TAG, "Prewarm '$key' failed: ${e.message}")
                }
            }
        }
    }

    // ── Playback ─────────────────────────────────────────────────────────────

    private suspend fun playBuffer(buffer: ShortArray, gain: Float) {
        if (buffer.isEmpty()) return
        val minBufSize = AudioTrack.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT
        )
        val track = AudioTrack.Builder()
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
            .setBufferSizeInBytes(minBufSize.coerceAtLeast(buffer.size * 2))
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        try {
            track.setVolume((SoundManager.volume * gain).coerceIn(0f, 1f))
            track.write(buffer, 0, buffer.size)
            track.play()
            // Non-blocking wait for the tail to ring out before releasing the track.
            delay(buffer.size * 1000L / SAMPLE_RATE + 80L)
        } finally {
            try { track.stop() } catch (e: Exception) { Log.w(TAG, "stop: ${e.message}") }
            try { track.release() } catch (e: Exception) { Log.w(TAG, "release: ${e.message}") }
        }
    }

    // ── Synthesis ────────────────────────────────────────────────────────────

    /** Mix all layers into one PCM16 buffer. Exposed internally so tests can assert on it. */
    internal fun render(layers: List<Layer>): ShortArray {
        val totalMs = layers.maxOf { it.startMs + it.durationMs }
        val totalSamples = (SAMPLE_RATE * (totalMs / 1000.0)).toInt()
        val mix = DoubleArray(totalSamples)

        for (layer in layers) {
            val start = (SAMPLE_RATE * (layer.startMs / 1000.0)).toInt()
            val n = (SAMPLE_RATE * (layer.durationMs / 1000.0)).toInt()
            var phase = 0.0
            // Deterministic noise so a cached render is identical every time.
            var noiseState = 0x2F6E2B1
            var noisePrev = 0.0
            for (j in 0 until n) {
                val i = start + j
                if (i >= totalSamples) break
                val t = j.toDouble() / SAMPLE_RATE
                mix[i] += when (layer.kind) {
                    Layer.Kind.CHIME -> synthChime(layer, t)
                    Layer.Kind.PLUCK -> synthPluck(layer, t)
                    Layer.Kind.TICK -> synthTick(layer, t)
                    Layer.Kind.SUB -> {
                        val progress = j.toDouble() / n
                        val f = layer.freq + (layer.freqEnd - layer.freq) * progress
                        phase += 2.0 * Math.PI * f / SAMPLE_RATE
                        val env = (1.0 - exp(-t / 0.004)) * exp(-t / (layer.durationMs / 1000.0 * 0.4))
                        sin(phase) * env * layer.amplitude
                    }
                    Layer.Kind.NOISE -> {
                        noiseState = noiseState * 1664525 + 1013904223
                        val r = ((noiseState ushr 8) % 2000) / 1000.0 - 1.0
                        val highpassed = r - noisePrev * 0.5
                        noisePrev = r
                        // 0.5ms attack: keeps the transient bite but never a DC step on sample one.
                        val env = (1.0 - exp(-t / 0.0005)) * exp(-t / layer.decay)
                        highpassed * env * layer.amplitude
                    }
                }
            }
        }

        val out = ShortArray(totalSamples)
        for (i in 0 until totalSamples) {
            val clamped = (mix[i] * 0.25).coerceIn(-1.0, 1.0)
            out[i] = (clamped * Short.MAX_VALUE).toInt().toShort()
        }
        return out
    }

    /** Warm felt-piano pluck — rich low harmonics, soft bite, fast settle. */
    private fun synthPluck(tone: Layer, t: Double): Double {
        val attack = 1.0 - exp(-t / 0.002)
        val decay = exp(-t / tone.decay)
        val env = attack * decay * tone.amplitude
        val biteWindow = 0.05
        val bite = if (t < biteWindow)
            (1.0 - t / biteWindow) * 0.15 * (if ((tone.freq * t) % 1.0 > 0.5) 1.0 else -1.0)
        else 0.0
        val f = tone.freq.toDouble()
        val wave = sin(2.0 * Math.PI * f * t) +
            0.40 * sin(4.0 * Math.PI * f * t) * exp(-2.0 * t / tone.decay) +
            0.25 * sin(6.0 * Math.PI * f * t) * exp(-4.0 * t / tone.decay) +
            0.15 * sin(8.0 * Math.PI * f * t) * exp(-6.0 * t / tone.decay) +
            0.08 * sin(10.0 * Math.PI * f * t) * exp(-8.0 * t / tone.decay) +
            0.20 * sin(2.0 * Math.PI * 90.0 * t) * exp(-t / 0.08)
        return (wave + bite) * env
    }

    /** Struck glass / celesta — the Numera signature material (inharmonic bell partials). */
    private fun synthChime(tone: Layer, t: Double): Double {
        val attack = 1.0 - exp(-t / 0.010)
        val decay = exp(-t / tone.decay)
        val env = attack * decay * tone.amplitude
        val f = tone.freq.toDouble()
        var wave = sin(2.0 * Math.PI * f * t) +
            0.25 * sin(2.0 * Math.PI * f * 2.76 * t) * exp(-3.0 * t / tone.decay) +
            0.18 * sin(2.0 * Math.PI * f * 5.40 * t) * exp(-5.0 * t / tone.decay) +
            0.10 * sin(2.0 * Math.PI * f * 8.12 * t) * exp(-8.0 * t / tone.decay) +
            0.15 * sin(4.0 * Math.PI * f * t) * exp(-2.0 * t / tone.decay)
        if (tone.tremolo) wave *= 1.0 + 0.22 * sin(2.0 * Math.PI * 6.0 * t)
        return wave * env
    }

    /** Sub-30ms pure blip — the quietest thing the app says. */
    private fun synthTick(tone: Layer, t: Double): Double {
        val env = (1.0 - exp(-t / 0.0008)) * exp(-t / tone.decay) * tone.amplitude
        val f = tone.freq.toDouble()
        return (sin(2.0 * Math.PI * f * t) +
            0.30 * sin(4.0 * Math.PI * f * t) * exp(-t / 0.004)) * env
    }
}
