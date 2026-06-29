package com.example.numera.ui.feature.shop

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.TextStyle
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import com.example.numera.data.network.*
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.DuoButton
import androidx.compose.foundation.BorderStroke
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ShopBackground(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "ambientGlow")
    
    val xOffset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(8000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "x1"
    )
    val yOffset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 120f,
        animationSpec = infiniteRepeatable(
            animation = tween(10000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "y1"
    )
    val xOffset2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -80f,
        animationSpec = infiniteRepeatable(
            animation = tween(7000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "x2"
    )

    // The Vault tints to the equipped theme (VaultTheme wraps the shop in the theme's dark scheme):
    // a deep museum-case ground lit by two slow brand-colored glows — the "active" primary and the
    // "earned" tertiary (Studio indigo + amber by default) — over a faint ink lattice.
    val ground = MaterialTheme.colorScheme.background
    val glowActive = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
    val glowEarned = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.10f)
    val latticeColor = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.04f)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(ground)
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = glowActive,
                radius = 400.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(
                    x = size.width * 0.2f + xOffset1.dp.toPx(),
                    y = size.height * 0.3f + yOffset1.dp.toPx()
                )
            )
            drawCircle(
                color = glowEarned,
                radius = 350.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(
                    x = size.width * 0.8f + xOffset2.dp.toPx(),
                    y = size.height * 0.7f - yOffset1.dp.toPx()
                )
            )

            val columns = 15
            val rows = 30
            val cellWidth = size.width / columns
            val cellHeight = size.height / rows
            for (i in 0..columns) {
                drawLine(
                    color = latticeColor,
                    start = androidx.compose.ui.geometry.Offset(i * cellWidth, 0f),
                    end = androidx.compose.ui.geometry.Offset(i * cellWidth, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            for (j in 0..rows) {
                drawLine(
                    color = latticeColor,
                    start = androidx.compose.ui.geometry.Offset(0f, j * cellHeight),
                    end = androidx.compose.ui.geometry.Offset(size.width, j * cellHeight),
                    strokeWidth = 1.dp.toPx()
                )
            }
        }
    }
}

@Composable
fun RarityCardFrame(
    rarity: String,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val tier = Rarity.from(rarity)
    val rarityColor = tier.color

    val infiniteTransition = rememberInfiniteTransition(label = "cardShimmer")
    val translateAnim by infiniteTransition.animateFloat(
        initialValue = -500f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "translate"
    )

    // Mythic gets the animated prismatic sweep so it can never be mistaken for Legendary amber
    // (docs/ShopOverhaul.md §7); every other tier keeps its static gradient.
    val borderBrush = if (tier == Rarity.Mythic) mythicIridescentBrush(translateAnim) else tier.borderBrush

    // Stable per-card glow — hoisted so the infinite shimmer animation above doesn't
    // reallocate it every frame (the shimmer brush itself genuinely varies per frame).
    // Glow strength scales with the tier so rarity has a felt hierarchy, not just a hue.
    val glowBrush = remember(tier) {
        Brush.radialGradient(
            colors = listOf(rarityColor.copy(alpha = 0.06f + 0.06f * tier.glow), Color.Transparent),
            radius = 300f
        )
    }

    val elevation = when (tier) {
        Rarity.Mythic -> Elevation.modal
        Rarity.Legendary -> Spacing.s
        Rarity.Epic -> Elevation.raised
        else -> Elevation.card
    }

    Card(
        modifier = modifier
            .border(
                width = if (tier >= Rarity.Legendary) 2.dp else 1.dp,
                brush = borderBrush,
                shape = RoundedCornerShape(CornerRadius.l)
            ),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(
            // The collectible "case": the theme's elevated dark surface (VaultTheme), so cards tint
            // to the equipped theme instead of a fixed near-black.
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(glowBrush)
            )
            
            Box(modifier = Modifier.padding(Spacing.m)) {
                content()
            }
            
            if (tier.isPrestige) {
                val shimmerBrush = Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0f),
                        Color.White.copy(alpha = 0.12f),
                        Color.White.copy(alpha = 0f)
                    ),
                    start = androidx.compose.ui.geometry.Offset(translateAnim, 0f),
                    end = androidx.compose.ui.geometry.Offset(translateAnim + 150f, 300f)
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(shimmerBrush)
                )
            }
        }
    }
}

@Composable
fun DailyShopItemCard(
    item: ShopItem,
    inventoryIds: List<String>,
    user: User?,
    onClick: () -> Unit
) {
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = when (item.type) {
        "theme" -> user?.theme == item.value
        "avatar" -> user?.avatar == item.value
        "badge" -> user?.active_badge == item.value
        "banner" -> user?.active_banner == item.value
        else -> false
    }

    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(CornerRadius.s))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, rarityColor.copy(alpha = 0.3f), RoundedCornerShape(CornerRadius.s)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 28.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 24.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🔒", fontSize = 16.sp)
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = (item.rarity ?: "Common").uppercase(),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 10.sp,
                        color = rarityColor
                    )
                    Text(
                        text = "·",
                        fontSize = 10.sp,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                    Text(
                        text = item.type.uppercase(),
                        fontSize = 10.sp,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                if (isEquipped) {
                    Text(
                        text = "Active",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = Color.White.copy(alpha = 0.7f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = rarityColor
                    )
                }
            }
        }
    }
}

@Composable
fun UtilityShopItemCard(
    item: ShopItem,
    ownedQuantity: Int,
    user: User?,
    onClick: () -> Unit
) {
    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(CornerRadius.s))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                val emoji = when (item.id) {
                    "item_streak_shield" -> "🛡️"
                    "item_retry_token" -> "🔄"
                    "item_xp_booster" -> "⚡"
                    "item_challenge_ticket" -> "🎫"
                    else -> "📦"
                }
                Text(emoji, fontSize = 28.sp)
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                if (!item.description.isNullOrEmpty()) {
                    Text(
                        text = item.description,
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.65f),
                        maxLines = 2
                    )
                }
                Text(
                    text = "Owned: $ownedQuantity",
                    fontSize = 12.sp,
                    color = if (ownedQuantity > 0) CorrectGreen else Color.White.copy(alpha = 0.7f),
                    fontWeight = FontWeight.Bold
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "🪙 ${item.cost}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = getRarityColor(item.rarity ?: "Common")
                )
            }
        }
    }
}

/**
 * Season Tokens wallet + the coin→token conversion (the deep end-game sink, ultra-review #66/#75).
 * Tokens are earned by converting surplus coins and spent on token-only prestige cosmetics, so
 * coins stay meaningful long after a player owns the one-time cosmetic catalog.
 */
@Composable
fun SeasonTokenWallet(
    tokens: Int,
    coins: Int,
    onConvert: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, SeasonGold.copy(alpha = 0.5f), RoundedCornerShape(CornerRadius.m))
            .padding(Spacing.m),
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("👑 Season Tokens", fontWeight = FontWeight.Black, fontSize = 14.sp, color = SeasonGold)
            Text("$tokens", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color.White)
        }
        Text(
            text = "Convert surplus coins into prestige tokens — the rarest cosmetics cost tokens only.",
            fontSize = 11.sp,
            color = Color.White.copy(alpha = 0.65f),
        )
        DuoButton(
            text = "Convert 500 🪙 → 1 Token",
            onClick = onConvert,
            enabled = coins >= 500,
            color = SeasonGold,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** A token-only prestige cosmetic: priced in Season Tokens, claimed with the token balance. */
@Composable
fun PrestigeTokenCard(
    item: ShopItem,
    tokens: Int,
    onClaim: () -> Unit,
) {
    val cost = item.token_cost ?: 0
    RarityCardFrame(
        rarity = item.rarity ?: "Mythic",
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m),
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                if (!item.description.isNullOrEmpty()) {
                    Text(
                        text = item.description,
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.65f),
                        maxLines = 2,
                    )
                }
                Text(
                    text = "👑 $cost token${if (cost == 1) "" else "s"}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = SeasonGold,
                )
            }
            DuoButton(
                text = "Claim",
                onClick = onClaim,
                enabled = tokens >= cost,
                color = SeasonGold,
            )
        }
    }
}
