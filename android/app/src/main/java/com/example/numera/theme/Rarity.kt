package com.example.numera.theme

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
    Mythic("Mythic", MedalGold, listOf(RarityMythicRoyal, MedalGold, MilestoneGold), 1f);

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
