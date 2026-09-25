package com.example.numera.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Semantic text roles — the single source of truth for *what a piece of text is*, mapped onto the
 * Material3 scale in [Typography]. Adopt via `style = AppText.rowTitle` (etc.) to retire the
 * raw `fontSize = …sp` / `fontWeight = …` literals scattered across the screens.
 *
 * Pairing rules:
 *  - Secondary lines ([rowSubtitle], [caption]) should be tinted with `Alpha.secondary` (0.70) or
 *    `Alpha.hint` (0.50) — not a hand-picked `0.6f` — so muting is consistent.
 *  - Anything that renders *figures* (scores, ratings, timers, "12 / 30", balances) should use
 *    [stat] (or merge `NumeralStyle`) for tabular, non-jittering digits.
 *
 * These reference the static [Typography] object (the same instance wired into the theme), so they
 * are usable from non-composable contexts too.
 */
object AppText {
    /** Top-of-screen / app-bar title. */
    val screenTitle: TextStyle = Typography.headlineMedium                 // 22 · Bold

    /** Group / section header inside a screen (e.g. "Account settings"). */
    val sectionTitle: TextStyle = Typography.titleSmall                    // 16 · SemiBold

    /** Hero or card title. */
    val cardTitle: TextStyle = Typography.titleMedium                      // 20 · Bold

    /** Primary line of a list / setting / quest row. */
    val rowTitle: TextStyle = Typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold) // 16

    /** Secondary line under a row — pair with `Alpha.secondary`. */
    val rowSubtitle: TextStyle = Typography.bodySmall                      // 12

    /** Running body copy. */
    val body: TextStyle = Typography.bodyMedium                            // 14

    /** Timestamps, meta, fine print — pair with `Alpha.hint`/`Alpha.secondary`. */
    val caption: TextStyle = Typography.labelSmall                         // 11

    /** Primary CTA label. Sentence case, calm spacing (no more ALL-CAPS by default). */
    val button: TextStyle = Typography.titleSmall.copy(letterSpacing = 0.3.sp) // 16 · SemiBold

    /** Figures that must not jitter: scores, ratings, timers, counts, balances. */
    val stat: TextStyle = Typography.titleMedium.merge(NumeralStyle)       // tabular monospace
}
