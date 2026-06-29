package com.example.numera.ui.feature.shop

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import com.example.numera.data.network.ShopItem
import com.example.numera.theme.*
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.ProfileBanner

/** The emoji that stands in for a utility booster (utilities have no procedural art). */
internal fun utilityEmoji(itemId: String): String = when (itemId) {
    "item_streak_shield" -> "🛡️"
    "item_retry_token" -> "🔄"
    "item_xp_booster" -> "⚡"
    "item_challenge_ticket" -> "🎫"
    else -> "📦"
}

/**
 * The framed art tile for a shop item — the one place that maps an item type to its renderer
 * (theme mockup / avatar / banner / badge / utility glyph), with a rank-lock scrim. Shared by the
 * collectible grid card and (later) the preview sheet so art reads identically everywhere.
 */
@Composable
fun ShopItemArt(item: ShopItem, locked: Boolean, artSize: Int, modifier: Modifier = Modifier) {
    val rarityColor = getRarityColor(item.rarity ?: "Common")
    Box(
        modifier = modifier
            .size(artSize.dp)
            .clip(RoundedCornerShape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, rarityColor.copy(alpha = 0.4f), RoundedCornerShape(CornerRadius.m)),
        contentAlignment = Alignment.Center
    ) {
        when (item.type) {
            "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
            "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = (artSize * 0.45f).sp)
            "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
            "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
            "utility" -> Text(utilityEmoji(item.id), fontSize = (artSize * 0.45f).sp)
            // New cosmetic types (Stage D): procedural math motifs, no emoji (docs/ShopOverhaul.md §8).
            "title" -> ShopTitleArt(item = item, accent = rarityColor)
            "effect" -> ShopMotifArt(accent = rarityColor, motif = ShopMotif.Effect)
            "victory" -> ShopMotifArt(accent = rarityColor, motif = ShopMotif.Victory)
            "tap" -> ShopMotifArt(accent = rarityColor, motif = ShopMotif.Tap)
            "frame" -> ShopMotifArt(accent = rarityColor, motif = ShopMotif.Frame)
            else -> Text("📦", fontSize = (artSize * 0.4f).sp)
        }
        if (locked) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.55f)),
                contentAlignment = Alignment.Center
            ) {
                Text("🔒", fontSize = (artSize * 0.32f).sp)
            }
        }
    }
}

/**
 * The single collectible card used across every grid tab (docs/ShopOverhaul.md §6): framed art,
 * rarity, name, price/own-state, and a save heart — buyable/previewable in place (tap opens the
 * preview sheet, no scroll-jump). `large` is the Featured-tab hero variant.
 */
@Composable
fun CollectibleCard(
    item: ShopItem,
    owned: Boolean,
    equipped: Boolean,
    locked: Boolean,
    favorite: Boolean,
    onClick: () -> Unit,
    onToggleFavorite: () -> Unit,
    modifier: Modifier = Modifier,
    large: Boolean = false,
) {
    val rarity = item.rarity ?: "Common"
    val rarityColor = getRarityColor(rarity)
    val artSize = if (large) 132 else 76

    RarityCardFrame(
        rarity = rarity,
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            if (large) {
                Text(
                    text = "✦ FEATURED",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = rarityColor,
                    letterSpacing = 1.sp,
                    modifier = Modifier.align(Alignment.Start)
                )
            }

            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                ShopItemArt(item = item, locked = locked, artSize = artSize)
                // Save heart, top-end. Earn-only catalog entries (cost 0, no token price) can't be
                // wishlisted as a *purchase*, so they don't show the heart.
                if (item.cost > 0 || (item.token_cost ?: 0) > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .clip(RoundedCornerShape(CornerRadius.full))
                            .clickable { onToggleFavorite() }
                            .padding(Spacing.xs),
                        contentAlignment = Alignment.Center
                    ) {
                        NumeraIcon(
                            type = NumeraIconType.Favorite,
                            tint = if (favorite) MaterialTheme.colorScheme.tertiary
                                   else MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
                            animate = false,
                            modifier = Modifier.size(IconSize.s)
                        )
                    }
                }
            }

            Text(
                text = item.name,
                fontWeight = FontWeight.Bold,
                fontSize = if (large) 17.sp else 13.sp,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
                maxLines = 2
            )
            Text(
                text = rarity.uppercase(),
                fontWeight = FontWeight.ExtraBold,
                fontSize = 9.sp,
                color = rarityColor,
                letterSpacing = 0.5.sp
            )

            CollectibleCardPrice(item = item, owned = owned, equipped = equipped, locked = locked, rarityColor = rarityColor)
        }
    }
}

/** The price / ownership line shared by every collectible card. */
@Composable
private fun CollectibleCardPrice(
    item: ShopItem,
    owned: Boolean,
    equipped: Boolean,
    locked: Boolean,
    rarityColor: androidx.compose.ui.graphics.Color,
) {
    when {
        equipped -> Text("Equipped", color = CorrectGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        owned -> Text("Owned", color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary), fontWeight = FontWeight.Bold, fontSize = 12.sp)
        locked -> Text("🔒 ${item.required_rank ?: "Locked"}", color = WrongRed, fontWeight = FontWeight.Bold, fontSize = 11.sp, textAlign = TextAlign.Center)
        (item.token_cost ?: 0) > 0 -> Text("👑 ${item.token_cost}", color = SeasonGold, fontWeight = FontWeight.Black, fontSize = 13.sp)
        // Earn-only prestige (cost 0, no token price): granted through play, never bought.
        item.cost <= 0 -> Text("🏅 Earn it", color = MedalGold, fontWeight = FontWeight.Black, fontSize = 12.sp)
        else -> Text("🪙 ${item.cost}", color = rarityColor, fontWeight = FontWeight.Black, fontSize = 13.sp)
    }
}

/** A title item's art: a small "nameplate" showing the title text it equips under your name. */
@Composable
private fun ShopTitleArt(item: ShopItem, accent: Color) {
    val label = item.name.substringAfter("— ", item.name)
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(accent.copy(alpha = 0.16f))
            .border(1.dp, accent.copy(alpha = 0.6f), RoundedCornerShape(CornerRadius.full))
            .padding(horizontal = Spacing.s, vertical = Spacing.xs),
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Black,
            fontSize = 10.sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
    }
}

/** The procedural math motifs that stand in for effect/victory/tap/frame items (no emoji art). */
enum class ShopMotif { Effect, Victory, Tap, Frame }

@Composable
private fun ShopMotifArt(accent: Color, motif: ShopMotif) {
    Canvas(modifier = Modifier.fillMaxSize().padding(Spacing.s)) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f
        when (motif) {
            ShopMotif.Effect -> {
                // A small constellation: stars + faint links.
                val pts = listOf(
                    Offset(0.20f, 0.30f), Offset(0.50f, 0.14f), Offset(0.82f, 0.34f),
                    Offset(0.66f, 0.74f), Offset(0.28f, 0.78f),
                )
                for (i in 0 until pts.size - 1) {
                    drawLine(accent.copy(alpha = 0.4f), Offset(pts[i].x * w, pts[i].y * h), Offset(pts[i + 1].x * w, pts[i + 1].y * h), strokeWidth = 2f)
                }
                pts.forEach { drawCircle(accent, w * 0.045f, Offset(it.x * w, it.y * h)) }
            }
            ShopMotif.Victory -> {
                // A clean starburst with a solid core — a "win" mark, not an explosion.
                val n = 8
                val r1 = w * 0.18f
                val r2 = w * 0.44f
                for (i in 0 until n) {
                    val a = (2.0 * PI * i / n).toFloat()
                    drawLine(accent, Offset(cx + cos(a) * r1, cy + sin(a) * r1), Offset(cx + cos(a) * r2, cy + sin(a) * r2), strokeWidth = 3f)
                }
                drawCircle(accent, w * 0.12f, Offset(cx, cy))
            }
            ShopMotif.Tap -> {
                // Concentric ripple rings spreading from a tap.
                for (k in 1..3) {
                    drawCircle(accent.copy(alpha = 0.75f - k * 0.18f), w * 0.12f * k, Offset(cx, cy), style = Stroke(width = 2.5f))
                }
            }
            ShopMotif.Frame -> {
                // A ringed avatar frame with tick marks — a mastery crest.
                drawCircle(accent, w * 0.38f, Offset(cx, cy), style = Stroke(width = w * 0.06f))
                val n = 12
                for (i in 0 until n) {
                    val a = (2.0 * PI * i / n).toFloat()
                    val r1 = w * 0.30f
                    val r2 = w * 0.40f
                    drawLine(accent.copy(alpha = 0.6f), Offset(cx + cos(a) * r1, cy + sin(a) * r1), Offset(cx + cos(a) * r2, cy + sin(a) * r2), strokeWidth = 2f)
                }
            }
        }
    }
}
