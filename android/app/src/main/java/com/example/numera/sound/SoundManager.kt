package com.example.numera.sound

import android.content.Context
import com.example.numera.sound.Layer.Kind.CHIME
import com.example.numera.sound.Layer.Kind.NOISE
import com.example.numera.sound.Layer.Kind.PLUCK
import com.example.numera.sound.Layer.Kind.SUB
import com.example.numera.sound.Layer.Kind.TICK

/**
 * Numera's audio vocabulary — every sound the app can make, and why it exists.
 * See docs/SoundDesign.md for the identity, hierarchy, and wiring rules.
 *
 * The sonic identity in one line: **struck glass over warm felt, speaking C-pentatonic.**
 * Every tonal sound draws from one scale (C–D–E–G–A), so nothing the app plays can clash
 * with anything else it plays; the signature motif (C → G → C′, root–fifth–octave) recurs
 * from level-complete to promotion so the app is recognizable with your eyes closed.
 *
 * Hierarchy (importance = loudness × length × layer count — never just volume):
 *  - TINY   ≤ 60ms, one voice        — taps, ticks, navigation
 *  - SMALL  ≤ 400ms, 1–3 voices      — answers, reveals, sheets, toasts
 *  - MEDIUM ≤ 700ms, 3–4 voices      — claims, session complete, match beats
 *  - LARGE  ≤ 1.5s, layered + weight — level-up, victory, defeat, mastery
 *  - EPIC   ≤ 2.5s, full stack       — rank promotion, legendary/mythic unlocks
 *
 * Rules of the language (do not regress):
 *  - One moment, one sound. Never fire two vocabulary sounds for the same event.
 *  - Wrong ≠ defeat ≠ time-up. A mistake is a soft "not yet", never a punishment.
 *  - Correct answers stay SMALL; only *streaks* earn extra sparkle (momentum you can hear).
 *  - Silence is part of the system: thinking time, manipulatives, info toasts stay quiet.
 *
 * Each sound's layers live in a named `spec*` builder so the vocabulary is testable:
 * [vocabularyForTest] feeds `SoundVocabularyTest`, the loudness/duration/hierarchy tripwire.
 */
object SoundManager {

    @Volatile var isMuted: Boolean = false
    @Volatile var volume: Float = 0.5f

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_settings", Context.MODE_PRIVATE)
        isMuted = prefs.getBoolean("sound_muted", false)
        volume = prefs.getFloat("sound_volume", 0.5f)
        // Render the high-frequency sounds up front so the first tap is as fast as the hundredth.
        SoundEngine.prewarm(
            "tap.light" to { specTapLight() },
            "navigate" to { specNavigate() },
            "correct.0" to { specCorrect(0) },
            "wrong" to { specWrong() },
        )
    }

    fun saveSettings(context: Context) {
        context.getSharedPreferences("numera_settings", Context.MODE_PRIVATE).edit().apply {
            putBoolean("sound_muted", isMuted)
            putFloat("sound_volume", volume)
            apply()
        }
    }

    // ── Tier gains: the hierarchy's loudness floor/ceiling ──────────────────
    internal const val TINY = 0.55f
    internal const val SMALL = 0.70f
    internal const val MEDIUM = 0.85f
    internal const val LARGE = 1.0f
    internal const val EPIC = 1.0f

    // ── Notes (just-intonation-ish, C-pentatonic + supporting lows) ─────────
    private const val G3 = 196.00f
    private const val A3 = 220.00f
    private const val C4 = 261.63f
    private const val E4 = 329.63f
    private const val G4 = 392.00f
    private const val A4 = 440.00f
    private const val C5 = 523.25f
    private const val D5 = 587.33f
    private const val E5 = 659.25f
    private const val G5 = 783.99f
    private const val A5 = 880.00f
    private const val C6 = 1046.50f
    private const val E6 = 1318.51f
    private const val G6 = 1567.98f
    private const val A6 = 1760.00f
    private const val C7 = 2093.00f
    private const val E7 = 2637.02f

    // ═════════════════════════════ TINY — interaction ═══════════════════════

    /** Default tap (PressFeedback.Light): the smallest confirmation the app can give. */
    fun playClick() = SoundEngine.play("tap.light", SoundPriority.LOW, TINY, throttleMs = 45) { specTapLight() }

    private fun specTapLight() = listOf(
        Layer(TICK, C6, 0, 26, 0.50f, 0.007f),
        Layer(TICK, C7, 0, 18, 0.12f, 0.005f),
    )

    /** Firmer tap (PressFeedback.Medium): primary buttons, confirmations, mode launches. */
    fun playTapMedium() = SoundEngine.play("tap.medium", SoundPriority.LOW, TINY, throttleMs = 45) { specTapMedium() }

    private fun specTapMedium() = listOf(
        Layer(NOISE, startMs = 0, durationMs = 10, amplitude = 0.14f, decay = 0.004f),
        Layer(CHIME, C5, 0, 90, 0.45f, 0.045f),
    )

    /** Committed tap (PressFeedback.Strong): "do it" moments below celebration tier. */
    fun playTapStrong() = SoundEngine.play("tap.strong", SoundPriority.LOW, TINY, throttleMs = 60) { specTapStrong() }

    private fun specTapStrong() = listOf(
        Layer(NOISE, startMs = 0, durationMs = 12, amplitude = 0.17f, decay = 0.005f),
        Layer(CHIME, G4, 0, 110, 0.50f, 0.055f),
        Layer(CHIME, C5, 12, 110, 0.40f, 0.055f),
    )

    /** Moving somewhere (tabs, back, breadcrumbs): a rising two-blip, distinct from a button. */
    fun playNavigate() = SoundEngine.play("navigate", SoundPriority.LOW, TINY, throttleMs = 100) { specNavigate() }

    private fun specNavigate() = listOf(
        Layer(TICK, G5, 0, 22, 0.40f, 0.006f),
        Layer(TICK, C6, 45, 26, 0.44f, 0.007f),
    )

    /** A surface sliding in (bottom sheets, palette, drawers): soft rising pair. */
    fun playSheetOpen() = SoundEngine.play("sheet.open", SoundPriority.LOW, TINY, throttleMs = 150) { specSheetOpen() }

    private fun specSheetOpen() = listOf(
        Layer(CHIME, C5, 0, 100, 0.25f, 0.05f),
        Layer(CHIME, E5, 40, 120, 0.22f, 0.06f),
    )

    /** A surface sliding away: the open pair, reversed — falling. */
    fun playSheetClose() = SoundEngine.play("sheet.close", SoundPriority.LOW, TINY, throttleMs = 150) { specSheetClose() }

    private fun specSheetClose() = listOf(
        Layer(CHIME, E5, 0, 100, 0.22f, 0.05f),
        Layer(CHIME, C5, 40, 120, 0.20f, 0.06f),
    )

    /**
     * Timer tick. [urgency] 0..1 raises pitch and presence so the *sound itself* carries the
     * time pressure (the old flat 800Hz tick said nothing). Pairs with HapticManager.playTickTension.
     */
    fun playTick(urgency: Float = 0f) {
        val bucket = (urgency.coerceIn(0f, 1f) * 3).toInt() // 4 cached variants, not one per float
        SoundEngine.play("tick.$bucket", SoundPriority.LOW, TINY, throttleMs = 150) { specTick(bucket) }
    }

    private fun specTick(bucket: Int) = listOf(
        Layer(TICK, 880f + 520f * bucket / 3f, 0, 22, 0.30f + 0.22f * bucket / 3f, 0.006f),
    )

    // ═════════════════════════════ SMALL — learning ═════════════════════════

    /**
     * Correct answer. Deliberately SMALL — it plays hundreds of times a session, so the base is
     * two quick glass notes (E→G, rising). *Streaks* grow it: ≥3 adds the octave, ≥5 shimmers,
     * ≥10 sparkles — momentum becomes audible without a single new sound effect.
     */
    fun playCorrect(streak: Int = 0) {
        val bucket = when {
            streak >= 10 -> 10
            streak >= 5 -> 5
            streak >= 3 -> 3
            else -> 0
        }
        SoundEngine.play("correct.$bucket", SoundPriority.NORMAL, SMALL) { specCorrect(bucket) }
    }

    private fun specCorrect(bucket: Int): List<Layer> {
        val layers = mutableListOf(
            Layer(CHIME, E5, 0, 380, 0.32f, 0.28f),
            Layer(CHIME, G5, 70, 420, 0.30f, 0.32f),
        )
        if (bucket >= 3) layers += Layer(CHIME, C6, 140, 460, 0.26f, 0.36f)
        if (bucket >= 5) layers += Layer(CHIME, E6, 210, 520, 0.22f, 0.42f, tremolo = true)
        if (bucket >= 10) layers += Layer(CHIME, G6, 280, 600, 0.18f, 0.50f, tremolo = true)
        return layers
    }

    /**
     * Wrong answer: a soft falling "not yet" (A→G, warm felt, quiet). Information, not
     * punishment — a learner five answers deep in a struggle hears a shrug, not a buzzer.
     */
    fun playWrong() = SoundEngine.play("wrong", SoundPriority.NORMAL, SMALL) { specWrong() }

    private fun specWrong() = listOf(
        Layer(PLUCK, A3, 0, 340, 0.38f, 0.16f),
        Layer(PLUCK, G3, 90, 380, 0.30f, 0.18f),
    )

    /** The clock ran out: a slow deflating fall with air — clearly not "you were wrong". */
    fun playTimeUp() = SoundEngine.play("time.up", SoundPriority.NORMAL, SMALL) { specTimeUp() }

    private fun specTimeUp() = listOf(
        Layer(NOISE, startMs = 0, durationMs = 60, amplitude = 0.06f, decay = 0.03f),
        Layer(PLUCK, C4, 0, 320, 0.40f, 0.18f),
        Layer(PLUCK, G3, 120, 420, 0.34f, 0.22f),
    )

    /** Something gentle appeared to help (hint, worked example, explanation): one quiet note. */
    fun playReveal() = SoundEngine.play("reveal", SoundPriority.LOW, SMALL, throttleMs = 300) { specReveal() }

    private fun specReveal() = listOf(Layer(CHIME, A4, 0, 260, 0.28f, 0.18f))

    /** An "aha" in a manipulative or lesson — a small upward spark, brighter than correct. */
    fun playDiscovery() = SoundEngine.play("discovery", SoundPriority.NORMAL, SMALL) { specDiscovery() }

    private fun specDiscovery() = listOf(
        Layer(CHIME, E5, 0, 240, 0.30f, 0.16f),
        Layer(CHIME, A5, 60, 320, 0.26f, 0.22f),
        Layer(CHIME, E6, 120, 340, 0.16f, 0.30f, tremolo = true),
    )

    /** Duel answer committed (before the reveal): a blip anchored by a low note — "locked". */
    fun playLockIn() = SoundEngine.play("lock.in", SoundPriority.NORMAL, SMALL) { specLockIn() }

    private fun specLockIn() = listOf(
        Layer(TICK, C6, 0, 20, 0.35f, 0.006f),
        Layer(PLUCK, C4, 5, 160, 0.35f, 0.08f),
    )

    /** A success toast slid in. Info + Achievement toasts stay silent by design — don't add one. */
    fun playToastSuccess() = SoundEngine.play("toast.ok", SoundPriority.LOW, SMALL, throttleMs = 400) { specToastSuccess() }

    private fun specToastSuccess() = listOf(Layer(CHIME, G5, 0, 220, 0.24f, 0.15f))

    /** An error toast slid in: one low warm note. Recoverable problem, not an alarm. */
    fun playToastError() = SoundEngine.play("toast.err", SoundPriority.LOW, SMALL, throttleMs = 400) { specToastError() }

    private fun specToastError() = listOf(Layer(PLUCK, A3, 0, 260, 0.30f, 0.14f))

    // ═════════════════════════════ MEDIUM — progress ════════════════════════

    /** Claiming an earned reward (quests, chests, debriefs): a quick ascending run. */
    fun playRewardClaim() = SoundEngine.play("reward.claim", SoundPriority.NORMAL, MEDIUM) { specRewardClaim() }

    private fun specRewardClaim() = listOf(
        Layer(CHIME, C5, 0, 340, 0.40f, 0.14f),
        Layer(CHIME, E5, 60, 340, 0.38f, 0.15f),
        Layer(CHIME, G5, 120, 380, 0.36f, 0.17f),
        Layer(CHIME, C6, 180, 460, 0.32f, 0.22f),
    )

    /** Session / level complete (no level-up): the signature motif (C–G–C′) at medium weight. */
    fun playLevelComplete() = SoundEngine.play("level.complete", SoundPriority.NORMAL, MEDIUM) { specLevelComplete() }

    private fun specLevelComplete() = listOf(
        Layer(SUB, 90f, 0, 140, 0.25f, freqEnd = 55f),
        Layer(CHIME, C5, 0, 380, 0.42f, 0.18f),
        Layer(CHIME, G5, 90, 420, 0.38f, 0.22f),
        Layer(CHIME, C6, 180, 560, 0.34f, 0.30f),
    )

    /** A mastery dimension leveled up: warm stacked shimmer — earned wisdom, not fireworks. */
    fun playMasteryUp() = SoundEngine.play("mastery.up", SoundPriority.NORMAL, MEDIUM) { specMasteryUp() }

    private fun specMasteryUp() = listOf(
        Layer(CHIME, A4, 0, 500, 0.38f, 0.30f, tremolo = true),
        Layer(CHIME, C5, 90, 520, 0.36f, 0.32f, tremolo = true),
        Layer(CHIME, E5, 180, 560, 0.34f, 0.36f, tremolo = true),
        Layer(CHIME, A5, 280, 700, 0.28f, 0.45f),
    )

    // ═════════════════════════════ competitive beats ════════════════════════

    /** Opponent found: an open fifth with a touch of weight — alert, not alarming. */
    fun playMatchFound() = SoundEngine.play("match.found", SoundPriority.HIGH, MEDIUM) { specMatchFound() }

    private fun specMatchFound() = listOf(
        Layer(SUB, 100f, 0, 140, 0.22f, freqEnd = 60f),
        Layer(CHIME, G4, 0, 420, 0.40f, 0.25f),
        Layer(CHIME, D5, 60, 480, 0.36f, 0.30f),
    )

    /** Pre-match 3-2-1: one note per second, RISING (A→C→E) — tension that builds, not nags. */
    fun playCountdown(second: Int) {
        val s = second.coerceIn(1, 3)
        SoundEngine.play("countdown.$s", SoundPriority.HIGH, MEDIUM, throttleMs = 400) { specCountdown(s) }
    }

    private fun specCountdown(second: Int): List<Layer> {
        val (note, amp) = when (second) {
            3 -> A4 to 0.38f
            2 -> C5 to 0.40f
            else -> E5 to 0.44f
        }
        return listOf(Layer(CHIME, note, 0, 300, amp, 0.12f))
    }

    /** GO — the countdown resolves: impact + bright pair. The match has weight from beat one. */
    fun playMatchStart() = SoundEngine.play("match.start", SoundPriority.HIGH, MEDIUM) { specMatchStart() }

    private fun specMatchStart() = listOf(
        Layer(NOISE, startMs = 0, durationMs = 14, amplitude = 0.18f, decay = 0.006f),
        Layer(SUB, 110f, 0, 160, 0.50f, freqEnd = 50f),
        Layer(CHIME, G5, 0, 300, 0.44f, 0.18f),
        Layer(CHIME, C6, 60, 420, 0.40f, 0.26f),
    )

    /** Draw: a suspended fourth that never resolves — genuinely neither win nor loss. */
    fun playDraw() = SoundEngine.play("draw", SoundPriority.HIGH, MEDIUM) { specDraw() }

    private fun specDraw() = listOf(
        Layer(CHIME, D5, 0, 600, 0.34f, 0.35f),
        Layer(CHIME, G5, 40, 700, 0.30f, 0.40f),
    )

    // ═════════════════════════════ LARGE — milestones ═══════════════════════

    /** Level up: the full rising run, now landing with physical weight on the top note. */
    fun playLevelUp() = SoundEngine.play("level.up", SoundPriority.HIGH, LARGE) { specLevelUp() }

    private fun specLevelUp() = listOf(
        Layer(CHIME, C4, 0, 900, 0.50f, 0.40f, tremolo = true),
        Layer(CHIME, G4, 90, 900, 0.48f, 0.42f, tremolo = true),
        Layer(CHIME, C5, 180, 950, 0.44f, 0.45f, tremolo = true),
        Layer(CHIME, E5, 270, 1000, 0.40f, 0.50f, tremolo = true),
        Layer(CHIME, G5, 360, 1100, 0.36f, 0.55f, tremolo = true),
        Layer(SUB, 100f, 460, 180, 0.30f, freqEnd = 50f),
        Layer(CHIME, C6, 460, 1300, 0.32f, 0.65f),
    )

    /**
     * Duel victory: impact-led triumph — sub weight, then the signature motif sprinting upward
     * into shimmer. Faster and brighter than [playLevelUp]; unmistakably "you beat someone".
     */
    fun playVictory() = SoundEngine.play("victory", SoundPriority.HIGH, LARGE) { specVictory() }

    private fun specVictory() = listOf(
        Layer(NOISE, startMs = 0, durationMs = 16, amplitude = 0.18f, decay = 0.007f),
        Layer(SUB, 120f, 0, 200, 0.55f, freqEnd = 45f),
        Layer(CHIME, C5, 40, 500, 0.46f, 0.30f),
        Layer(CHIME, G5, 140, 540, 0.42f, 0.34f),
        Layer(CHIME, C6, 240, 640, 0.38f, 0.42f),
        Layer(CHIME, E6, 340, 800, 0.32f, 0.55f, tremolo = true),
        Layer(CHIME, G6, 460, 1000, 0.24f, 0.70f, tremolo = true),
    )

    /**
     * Duel defeat: a graceful descending line that lands on home (A→E→C). Soft, respectful,
     * finished — the emotional opposite of [playWrong]'s "try again". Losing a match is not
     * an error, and it must never sound like one.
     */
    fun playDefeat() = SoundEngine.play("defeat", SoundPriority.HIGH, LARGE) { specDefeat() }

    private fun specDefeat() = listOf(
        Layer(CHIME, A4, 0, 500, 0.34f, 0.35f),
        Layer(CHIME, E4, 160, 560, 0.32f, 0.40f),
        Layer(CHIME, C4, 330, 780, 0.30f, 0.50f),
    )

    // ═════════════════════════════ EPIC — reserved ══════════════════════════

    /**
     * Rank promotion / season milestone — the biggest thing Numera can say. Deep impact,
     * the pentatonic run climbing two octaves, then a long shimmering cluster tail.
     * Reserve this: if it fires twice an hour it means nothing.
     */
    fun playPromotion() = SoundEngine.play("promotion", SoundPriority.HIGH, EPIC) { specPromotion() }

    private fun specPromotion(): List<Layer> {
        val run = listOf(C4, E4, G4, C5, E5, G5)
        val layers = mutableListOf(
            Layer(NOISE, startMs = 0, durationMs = 18, amplitude = 0.20f, decay = 0.008f),
            Layer(SUB, 130f, 0, 240, 0.60f, freqEnd = 40f),
        )
        run.forEachIndexed { idx, note ->
            layers += Layer(CHIME, note, 60 + idx * 80, 700, 0.50f - idx * 0.02f, 0.35f, tremolo = true)
        }
        layers += Layer(CHIME, C6, 560, 900, 0.40f, 0.60f, tremolo = true)
        layers += Layer(CHIME, E6, 700, 1300, 0.24f, 0.80f, tremolo = true)
        layers += Layer(CHIME, G6, 760, 1300, 0.20f, 0.85f, tremolo = true)
        layers += Layer(CHIME, A6, 900, 1200, 0.16f, 0.90f)
        return layers
    }

    /**
     * Per-rarity unlock fanfare (docs/ShopOverhaul.md §7). [tier] is the Rarity ordinal
     * (0=Common … 4=Mythic): higher tiers add notes, climb higher, shimmer and ring longer.
     * Legendary/Mythic gain sub weight — the ear knows how rare the unlock was.
     */
    fun playUnlock(tier: Int) {
        val t = tier.coerceIn(0, 4)
        val gain = if (t >= 3) EPIC else MEDIUM
        SoundEngine.play("unlock.$t", SoundPriority.HIGH, gain) { specUnlock(t) }
    }

    private fun specUnlock(tier: Int): List<Layer> = when (tier) {
        0 -> listOf( // Common — a clean, brief two-note chime
            Layer(CHIME, C5, 0, 300, 0.40f, 0.15f),
            Layer(CHIME, E5, 60, 360, 0.38f, 0.18f),
        )
        1 -> listOf( // Rare — three ascending notes
            Layer(CHIME, C5, 0, 340, 0.42f, 0.18f),
            Layer(CHIME, E5, 60, 380, 0.40f, 0.20f),
            Layer(CHIME, G5, 120, 440, 0.36f, 0.24f),
        )
        2 -> listOf( // Epic — brighter, shimmering
            Layer(CHIME, C5, 0, 380, 0.45f, 0.20f, tremolo = true),
            Layer(CHIME, E5, 70, 420, 0.42f, 0.22f, tremolo = true),
            Layer(CHIME, G5, 140, 460, 0.40f, 0.26f, tremolo = true),
            Layer(CHIME, C6, 210, 540, 0.36f, 0.30f),
        )
        3 -> listOf( // Legendary — a full fanfare with weight
            Layer(SUB, 110f, 0, 180, 0.40f, freqEnd = 50f),
            Layer(CHIME, C5, 0, 500, 0.50f, 0.30f, tremolo = true),
            Layer(CHIME, E5, 80, 520, 0.48f, 0.32f, tremolo = true),
            Layer(CHIME, G5, 160, 560, 0.45f, 0.36f, tremolo = true),
            Layer(CHIME, C6, 240, 640, 0.42f, 0.44f, tremolo = true),
            Layer(CHIME, E6, 330, 720, 0.38f, 0.55f),
            Layer(CHIME, G6, 420, 820, 0.34f, 0.65f),
        )
        else -> listOf( // Mythic — shimmering pentatonic sparkle with a long tail
            Layer(SUB, 120f, 0, 200, 0.45f, freqEnd = 45f),
            Layer(CHIME, E5, 0, 600, 0.45f, 0.40f, tremolo = true),
            Layer(CHIME, A5, 90, 660, 0.42f, 0.46f, tremolo = true),
            Layer(CHIME, C6, 180, 720, 0.40f, 0.52f, tremolo = true),
            Layer(CHIME, E6, 270, 820, 0.38f, 0.62f, tremolo = true),
            Layer(CHIME, A6, 380, 920, 0.34f, 0.74f, tremolo = true),
            Layer(CHIME, C7, 500, 1120, 0.28f, 0.92f),
            Layer(CHIME, E7, 600, 1240, 0.20f, 1.00f),
        )
    }

    // ═════════════════════════════ test surface ═════════════════════════════

    /**
     * The whole vocabulary (cache key → tier gain + layers), including every cached bucket of
     * the parameterized sounds. Consumed by `SoundVocabularyTest` — the executable loudness /
     * duration / hierarchy contract. Keep in sync when adding a sound.
     */
    internal fun vocabularyForTest(): Map<String, Pair<Float, List<Layer>>> {
        val vocab = mutableMapOf(
            "tap.light" to (TINY to specTapLight()),
            "tap.medium" to (TINY to specTapMedium()),
            "tap.strong" to (TINY to specTapStrong()),
            "navigate" to (TINY to specNavigate()),
            "sheet.open" to (TINY to specSheetOpen()),
            "sheet.close" to (TINY to specSheetClose()),
            "wrong" to (SMALL to specWrong()),
            "time.up" to (SMALL to specTimeUp()),
            "reveal" to (SMALL to specReveal()),
            "discovery" to (SMALL to specDiscovery()),
            "lock.in" to (SMALL to specLockIn()),
            "toast.ok" to (SMALL to specToastSuccess()),
            "toast.err" to (SMALL to specToastError()),
            "reward.claim" to (MEDIUM to specRewardClaim()),
            "level.complete" to (MEDIUM to specLevelComplete()),
            "mastery.up" to (MEDIUM to specMasteryUp()),
            "match.found" to (MEDIUM to specMatchFound()),
            "match.start" to (MEDIUM to specMatchStart()),
            "draw" to (MEDIUM to specDraw()),
            "level.up" to (LARGE to specLevelUp()),
            "victory" to (LARGE to specVictory()),
            "defeat" to (LARGE to specDefeat()),
            "promotion" to (EPIC to specPromotion()),
        )
        for (b in intArrayOf(0, 3, 5, 10)) vocab["correct.$b"] = SMALL to specCorrect(b)
        for (b in 0..3) vocab["tick.$b"] = TINY to specTick(b)
        for (s in 1..3) vocab["countdown.$s"] = MEDIUM to specCountdown(s)
        for (t in 0..4) vocab["unlock.$t"] = (if (t >= 3) EPIC else MEDIUM) to specUnlock(t)
        return vocab
    }
}
