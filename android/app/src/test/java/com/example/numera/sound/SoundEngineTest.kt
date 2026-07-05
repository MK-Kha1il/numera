package com.example.numera.sound

import org.junit.Assert.assertEquals
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/**
 * Tripwire for the synthesis engine behind the app's audio language (docs/SoundDesign.md).
 * Pure-JVM: exercises [SoundEngine.render] only — no AudioTrack, no Robolectric shadows —
 * so a broken layer mixer or a non-deterministic render fails fast in CI.
 */
class SoundEngineTest {

    private fun chime(freq: Float, at: Int = 0, dur: Int = 200, amp: Float = 0.4f) =
        Layer(Layer.Kind.CHIME, freq, at, dur, amp, 0.1f)

    @Test
    fun `render produces the exact duration of the longest layer`() {
        val buffer = SoundEngine.render(
            listOf(
                chime(523.25f, at = 0, dur = 100),
                chime(659.25f, at = 150, dur = 300), // extends to 450ms
            )
        )
        assertEquals((SoundEngine.SAMPLE_RATE * 0.450).toInt(), buffer.size)
    }

    @Test
    fun `render is deterministic — cached playback must be identical every time`() {
        val layers = listOf(
            Layer(Layer.Kind.NOISE, startMs = 0, durationMs = 30, amplitude = 0.2f, decay = 0.01f),
            Layer(Layer.Kind.SUB, 120f, 0, 200, 0.5f, freqEnd = 45f),
            chime(783.99f, at = 20, dur = 300),
            Layer(Layer.Kind.PLUCK, 220f, 50, 300, 0.4f, 0.15f),
            Layer(Layer.Kind.TICK, 1046.5f, 0, 25, 0.5f, 0.007f),
        )
        assertArrayEquals(SoundEngine.render(layers), SoundEngine.render(layers))
    }

    @Test
    fun `every layer kind contributes audible signal`() {
        for (kind in Layer.Kind.values()) {
            val layer = when (kind) {
                Layer.Kind.SUB -> Layer(kind, 120f, 0, 200, 0.6f, freqEnd = 45f)
                Layer.Kind.NOISE -> Layer(kind, startMs = 0, durationMs = 40, amplitude = 0.3f, decay = 0.01f)
                else -> Layer(kind, 440f, 0, 200, 0.5f, 0.1f)
            }
            val peak = SoundEngine.render(listOf(layer)).maxOf { abs(it.toInt()) }
            assertTrue("layer kind $kind rendered silence", peak > 500)
        }
    }

    @Test
    fun `attack envelopes start from silence — no clicks or pops at onset`() {
        val buffer = SoundEngine.render(listOf(chime(523.25f)))
        // The first sample must be effectively zero (the old harsh onsets were a fatigue source).
        assertTrue("onset pop: first sample ${buffer[0]}", abs(buffer[0].toInt()) < 300)
    }

    @Test
    fun `mixing many loud layers never overflows sample range`() {
        val wall = (1..12).map { chime(200f * it, at = 0, dur = 300, amp = 1.0f) }
        val buffer = SoundEngine.render(wall)
        // ShortArray can't physically overflow, but the clamp must keep full-scale mixes stable
        // (values pinned at the rails rather than wrapped to garbage).
        assertTrue(buffer.all { it >= Short.MIN_VALUE && it <= Short.MAX_VALUE })
        assertTrue("wall of sound rendered silence", buffer.maxOf { abs(it.toInt()) } > 5000)
    }

    @Test
    fun `tier hierarchy — a tiny tap renders shorter and quieter than an epic stack`() {
        // Shapes mirror SoundManager's tap.light and promotion specs.
        val tiny = SoundEngine.render(
            listOf(
                Layer(Layer.Kind.TICK, 1046.5f, 0, 26, 0.5f, 0.007f),
                Layer(Layer.Kind.TICK, 2093f, 0, 18, 0.12f, 0.005f),
            )
        )
        val epic = SoundEngine.render(
            listOf(
                Layer(Layer.Kind.SUB, 130f, 0, 240, 0.6f, freqEnd = 40f),
                chime(261.63f, at = 60, dur = 700, amp = 0.5f),
                chime(523.25f, at = 300, dur = 700, amp = 0.46f),
                chime(1046.5f, at = 560, dur = 900, amp = 0.4f),
                chime(1318.51f, at = 700, dur = 1300, amp = 0.24f),
            )
        )
        assertTrue("hierarchy inverted: tiny (${tiny.size}) !< epic (${epic.size})", tiny.size < epic.size / 10)
        val tinyPeak = tiny.maxOf { abs(it.toInt()) }
        val epicPeak = epic.maxOf { abs(it.toInt()) }
        assertTrue("tiny tap ($tinyPeak) louder than epic impact ($epicPeak)", tinyPeak < epicPeak)
    }
}
