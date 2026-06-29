package com.example.numera.ui.feature.shop

// HeroShowcasePanel — the in-place preview/buy/equip surface shown inside the Vault's bottom
// sheet (docs/ShopOverhaul.md §6/§13). Split out of ShopCards.kt to keep that file under the
// 600-line limit; imports are a superset shared with the cards.
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
fun HeroShowcasePanel(
    item: ShopItem?,
    user: User?,
    inventoryIds: List<String>,
    ownedUtilities: List<UtilityBalance>,
    scope: kotlinx.coroutines.CoroutineScope,
    onPurchaseComplete: () -> Unit,
    onDismissShowcase: () -> Unit,
    // The single Featured Spotlight: the eyebrow reads "FEATURED SPOTLIGHT" for the featured item
    // (with a refresh countdown) and "PREVIEW" for anything else the player taps to inspect.
    eyebrow: String = "✦ SHOWCASE PREVIEW ✦",
    refreshSeconds: Long? = null,
) {
    if (item == null) return
    
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = item.isEquippedBy(user)

    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false
    // Earn-only prestige (mastery frames, rank/relic badges): granted through play, never bought.
    val isEarnOnly = item.cost <= 0 && (item.token_cost ?: 0) <= 0 && item.is_utility == 0
    val utilityQty = ownedUtilities.find { it.item_id == item.id }?.quantity ?: 0
    
    val infiniteTransition = rememberInfiniteTransition(label = "showcaseAmbient")
    val pulseScale1 by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse1"
    )
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(15000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rot"
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Spacing.xs)
            .border(2.dp, rarityColor.copy(alpha = 0.7f), RoundedCornerShape(20.dp)),
        shape = RoundedCornerShape(CornerRadius.xl),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Canvas(modifier = Modifier.matchParentSize()) {
                drawCircle(
                    color = rarityColor.copy(alpha = 0.08f),
                    radius = size.minDimension * 0.5f * pulseScale1
                )
            }
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(Spacing.l),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        Text(
                            text = eyebrow,
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            color = rarityColor,
                            letterSpacing = 1.5.sp
                        )
                        if (refreshSeconds != null) {
                            Text(
                                text = "Refreshes in ${formatDuration(refreshSeconds)}",
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint)
                            )
                        }
                    }
                    IconButton(
                        onClick = {
                            com.example.numera.haptic.HapticManager.playSoft()
                            onDismissShowcase()
                        },
                        modifier = Modifier.size(IconSize.m)
                    ) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Close,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                        )
                    }
                }
                
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .graphicsLayer {
                            translationY = Spacing.xs.toPx() * kotlin.math.sin(rotation * Math.PI / 180).toFloat()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (Rarity.from(item.rarity) >= Rarity.Legendary) {
                        Canvas(modifier = Modifier.size(130.dp)) {
                            drawCircle(
                                color = rarityColor.copy(alpha = 0.25f),
                                style = Stroke(
                                    width = 2.dp.toPx(),
                                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f)
                                )
                            )
                        }
                    }
                    
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(RoundedCornerShape(CornerRadius.l))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .border(2.dp, rarityColor, RoundedCornerShape(CornerRadius.l)),
                        contentAlignment = Alignment.Center
                    ) {
                        when (item.type) {
                            "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                            "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 48.sp)
                            "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                            "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                            "utility" -> {
                                val emoji = when (item.id) {
                                    "item_streak_shield" -> "🛡️"
                                    "item_retry_token" -> "🔄"
                                    "item_xp_booster" -> "⚡"
                                    "item_challenge_ticket" -> "🎫"
                                    else -> "📦"
                                }
                                Text(emoji, fontSize = 48.sp)
                            }
                        }
                        if (isLocked) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🔒", fontSize = 24.sp)
                            }
                        }
                    }
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = item.name,
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        color = Color.White
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Text(
                            text = (item.rarity ?: "Common").uppercase(),
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            color = rarityColor
                        )
                        Text(
                            text = "·",
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 11.sp
                        )
                        Text(
                            text = item.type.uppercase(),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }
                
                Text(
                    text = item.description ?: "",
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    color = Color.White.copy(alpha = 0.75f),
                    modifier = Modifier.padding(horizontal = Spacing.s)
                )
                
                if (item.required_rank != null) {
                    Surface(
                        shape = RoundedCornerShape(CornerRadius.s),
                        color = (if (isLocked) WrongRed else CorrectGreen).copy(alpha = 0.1f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isLocked) WrongRed else CorrectGreen)
                    ) {
                        Text(
                            text = if (isLocked) "Locked: Requires Rank ${item.required_rank}" else "Unlocked: ${item.required_rank} reached",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isLocked) WrongRed else CorrectGreen,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                        )
                    }
                }
                
                if (item.is_utility == 1) {
                    Text(
                        text = "Current Stock: $utilityQty owned",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White.copy(alpha = 0.7f)
                    )
                }
                
                if (isEquipped) {
                    DuoButton(
                        text = "Active & Equipped",
                        onClick = {},
                        enabled = false,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (hasPurchased && item.is_utility == 0) {
                    DuoButton(
                        text = "Equip Now",
                        onClick = {
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.equipItem(
                                        token, EquipRequest(item.type, item.value)
                                    )
                                    withContext(Dispatchers.Main) {
                                        onPurchaseComplete()
                                    }
                                } catch (e: Exception) {
                                    Log.e("Shop", "Equip err: ${e.message}")
                                }
                            }
                        },
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (isEarnOnly) {
                    // Earn-only prestige: show how it's unlocked, never a buy button (docs §9).
                    Surface(
                        shape = RoundedCornerShape(CornerRadius.m),
                        color = MedalGold.copy(alpha = 0.12f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, MedalGold.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(Spacing.m),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                        ) {
                            Text("🏅 EARNED THROUGH PLAY", fontWeight = FontWeight.Black, fontSize = 12.sp, color = MedalGold, letterSpacing = 0.8.sp)
                            Text(
                                text = item.description ?: "Keep playing to unlock this.",
                                fontSize = 12.sp,
                                color = Color.White.copy(alpha = 0.8f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                } else {
                    val canBuy = (user?.coins ?: 0) >= item.cost && !isLocked

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // Means-tested affordability help, presented honestly as a quiet "member
                        // price" — never a red fake-urgency "SALE" (docs/ShopOverhaul.md §11).
                        if (item.discountActive == true && item.originalCost != null) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "🪙 ${item.originalCost}",
                                    style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
                                    fontSize = 13.sp
                                )
                                Text(
                                    text = "member price",
                                    color = MaterialTheme.colorScheme.secondary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp
                                )
                            }
                        }

                        DuoButton(
                            text = if (isLocked) "Rank Locked" else "Purchase (🪙 ${item.cost})",
                            onClick = {
                                if (!canBuy) return@DuoButton
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        RetrofitClient.apiService.purchaseItem(
                                            token, PurchaseRequest(item.id)
                                        )
                                        withContext(Dispatchers.Main) {
                                            SoundManager.playUnlock(Rarity.from(item.rarity).ordinal)
                                            onPurchaseComplete()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("Shop", "Buy err: ${e.message}")
                                    }
                                }
                            },
                            enabled = canBuy,
                            color = if (canBuy) MaterialTheme.colorScheme.tertiary else Color.White.copy(alpha = 0.25f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
