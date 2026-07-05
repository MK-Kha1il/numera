package com.example.numera.sound

import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/**
 * The executable contract for the whole audio vocabulary (docs/SoundDesign.md §2/§7):
 * renders every sound the app can make (every cache key, via SoundManager.vocabularyForTest)
 * and asserts the loudness/duration/hierarchy rules that make the language coherent.
 * If a new sound breaks a tier cap, clips, pops, or inverts the hierarchy, this fails in CI.
 */
class SoundVocabularyTest {

    private val vocabulary = SoundManager.vocabularyForTest()
    private val rendered: Map<String, ShortArray> =
        vocabulary.mapValues { (_, spec) -> SoundEngine.render(spec.second) }

    private fun durationMs(key: String) = rendered.getValue(key).size * 1000 / SoundEngine.SAMPLE_RATE

    private fun peak(key: String) = rendered.getValue(key).maxOf { abs(it.toInt()) }

    /** Peak as heard: raw render peak × the tier gain applied at play time. */
    private fun effectivePeak(key: String) = peak(key) * vocabulary.getValue(key).first

    @Test
    fun `every sound in the vocabulary renders audible signal`() {
        for (key in vocabulary.keys) {
            assertTrue("'$key' rendered near-silence", peak(key) > 500)
        }
    }

    @Test
    fun `no sound starts with a pop`() {
        for ((key, buffer) in rendered) {
            assertTrue("'$key' pops at onset (first sample ${buffer[0]})", abs(buffer[0].toInt()) < 300)
        }
    }

    @Test
    fun `no sound clips against the rails`() {
        // Headroom rule: the mix scale must keep every vocabulary sound below ~90% full scale,
        // so simultaneous playback and device EQ never push it into audible distortion.
        val ceiling = (Short.MAX_VALUE * 0.90).toInt()
        for (key in vocabulary.keys) {
            assertTrue("'$key' renders too hot (peak ${peak(key)})", peak(key) < ceiling)
        }
    }

    @Test
    fun `tier duration caps hold`() {
        // LARGE and EPIC share a gain (1.0) — importance there is length/layering, not volume —
        // so the EPIC membership is named explicitly rather than inferred from gain.
        val epicKeys = setOf("promotion", "unlock.3", "unlock.4")
        val capByGain = mapOf(
            SoundManager.TINY to 300,    // taps, ticks, navigation, sheet glides
            SoundManager.SMALL to 900,   // answers, reveals, toasts (incl. ring-out tails)
            SoundManager.MEDIUM to 1000, // claims, match beats, session complete
            SoundManager.LARGE to 1800,  // level-up, victory, defeat
        )
        for ((key, spec) in vocabulary) {
            val cap = if (key in epicKeys) 2600 else capByGain.getValue(spec.first)
            assertTrue("'$key' (${durationMs(key)}ms) exceeds its tier cap (${cap}ms)", durationMs(key) <= cap)
        }
    }

    @Test
    fun `hierarchy — bigger moments are audibly bigger`() {
        // Duration ordering across the tiers' flagship sounds.
        assertTrue(durationMs("tap.light") < durationMs("correct.0"))
        assertTrue(durationMs("correct.0") < durationMs("level.complete"))
        assertTrue(durationMs("level.complete") < durationMs("victory"))
        assertTrue(durationMs("victory") < durationMs("promotion"))
        // Effective loudness: an EPIC impact must tower over a UI tap.
        assertTrue(effectivePeak("promotion") > effectivePeak("tap.light") * 1.5)
        assertTrue(effectivePeak("victory") > effectivePeak("tap.light"))
    }

    @Test
    fun `streak escalation grows the correct sound`() {
        assertTrue(durationMs("correct.0") < durationMs("correct.3"))
        assertTrue(durationMs("correct.3") < durationMs("correct.5"))
        assertTrue(durationMs("correct.5") < durationMs("correct.10"))
    }

    @Test
    fun `unlock fanfares scale with rarity`() {
        for (t in 0..3) {
            assertTrue(
                "unlock.$t should be shorter than unlock.${t + 1}",
                durationMs("unlock.$t") < durationMs("unlock.${t + 1}")
            )
        }
        assertTrue("Mythic must out-celebrate Common", effectivePeak("unlock.4") > effectivePeak("unlock.0"))
    }

    @Test
    fun `wrong stays gentle — never louder than the celebration it might follow`() {
        // Pedagogy rule: the mistake sound must not dominate. It stays below the reward claim
        // and far below victory in perceived level.
        assertTrue(effectivePeak("wrong") < effectivePeak("reward.claim"))
        assertTrue(effectivePeak("wrong") < effectivePeak("victory"))
        // And it must be short — a shrug, not a dirge.
        assertTrue(durationMs("wrong") <= 500)
    }

    @Test
    fun `countdown rises toward the start`() {
        // 3 → 2 → 1 climbs in presence: each second's peak is at least as strong as the last.
        assertTrue(peak("countdown.2") >= peak("countdown.3") * 0.9)
        assertTrue(peak("countdown.1") >= peak("countdown.2") * 0.9)
    }
}
