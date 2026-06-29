package com.example.numera.theme

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Rarity — the cross-feature collectible language.
 *
 * One enum owns each tier's accent color, border gradient, and glow strength so an Epic
 * reads identically in the shop, the purchase reveal, the profile collection, and any
 * future loot surface. Previously these hexes lived privately in `ui/feature/shop/shopUtils.kt`.
 */

// Rarity accent tokens (kept as named colors so one-off accents can reference them too).
val RarityCommonSlate    = Color(0xFF708090)
val RarityRareTeal       = Color(0xFF00CED1)
val RarityRareBlue       = Color(0xFF1E90FF)
val RarityEpicViolet     = Color(0xFF8A2BE2)
val RarityEpicIndigo     = Color(0xFF4B0082)
val RarityLegendaryAmber = Color(0xFFFDB813)
val RarityLegendaryRose  = Color(0xFFB76E79)
val RarityMythicRoyal    = Color(0xFF6A0DAD)
// Mythic's signature accent — a bright iridescent orchid, deliberately distinct from Legendary's
// amber and Epic's blue-violet so a Mythic reads in under half a second (docs/ShopOverhaul.md §7).
val RarityMythicIridescent = Color(0xFFE05CFF)

// The prismatic sweep used by the *animated* Mythic frame. A seamless loop (ends where it starts).
val MythicIridescence = listOf(
    Color(0xFF7C4DFF), // violet
    Color(0xFF00E5FF), // cyan
    Color(0xFF69F0AE), // mint
    Color(0xFFFFD54A), // gold
    Color(0xFFFF5EC8), // magenta
    Color(0xFF7C4DFF), // loop back to violet
)

enum class Rarity(
    val label: String,
    val color: Color,
    private val gradientColors: List<Color>,
    /** 0f–1f: how loudly surfaces may glow/shimmer for this tier. */
    val glow: Float
) {
    Common("Common", RarityCommonSlate, listOf(RarityCommonSlate, RarityCommonSlate), 0f),
    Rare("Rare", RarityRareTeal, listOf(RarityRareTeal, RarityRareBlue), 0.25f),
    Epic("Epic", RarityEpicViolet, listOf(RarityEpicViolet, RarityEpicIndigo), 0.5f),
    Legendary("Legendary", RarityLegendaryAmber, listOf(RarityLegendaryRose, RarityLegendaryAmber), 0.75f),
    Mythic("Mythic", RarityMythicIridescent, listOf(RarityMythicRoyal, RarityMythicIridescent, MedalGold), 1f);

    val borderBrush: Brush get() = Brush.linearGradient(gradientColors)

    /** True for the tiers that earn ambient shimmer/pulse treatments. */
    val isPrestige: Boolean get() = this >= Epic

    companion object {
        /** Tolerant parse of server-provided rarity strings; unknown → Common. */
        fun from(value: String?): Rarity = when (value?.trim()?.lowercase()) {
            "mythic" -> Mythic
            "legendary" -> Legendary
            "epic" -> Epic
            "rare" -> Rare
            else -> Common
        }
    }
}

/** Animated prismatic border brush for Mythic frames; [offset] is the shimmer translation so the
 *  iridescence sweeps. The one treatment that makes Mythic unmistakable next to Legendary. */
fun mythicIridescentBrush(offset: Float): Brush = Brush.linearGradient(
    colors = MythicIridescence,
    start = Offset(offset, 0f),
    end = Offset(offset + 420f, 420f),
)
