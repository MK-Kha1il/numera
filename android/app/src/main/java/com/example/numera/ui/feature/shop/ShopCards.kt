package com.example.numera.ui.feature.shop

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.TextStyle
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import android.content.Context
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.numera.data.network.*
import com.example.numera.SoloGame
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.feature.arena.ArenaScreen
import com.example.numera.ui.feature.dashboard.DashboardScreen
import com.example.numera.ui.feature.settings.SettingsScreen
import com.example.numera.ui.dialogs.LevelDebriefDialog
import com.example.numera.ui.dialogs.CommitmentStatusDialog
import com.example.numera.ui.dialogs.NotificationsDialog
import com.example.numera.ui.components.MathAvatars
import com.example.numera.ui.components.MathBanners
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.rememberDrawableResource
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.GlassCard
import com.example.numera.ui.components.NeonButton
import com.example.numera.ui.components.NeonText
import com.example.numera.ui.components.ClaimButton
import com.example.numera.ui.components.GlossyProgressBar
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraSkeletonCard
import com.example.numera.ui.components.MathText
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.CommitmentRelicIcon
import com.example.numera.ui.components.ToastController
import com.example.numera.ui.components.ToastType
import com.example.numera.ui.components.LocalToast
import com.example.numera.ui.components.NumeraToastHost
import com.example.numera.ui.components.rememberToastController
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.NumeraSearchField
import com.example.numera.ui.components.rememberDebouncedValue
import com.example.numera.ui.components.rememberInfiniteScroll
import com.example.numera.ui.components.rememberRevealWindow
import com.example.numera.ui.components.LoadMoreFooter
import com.example.numera.ui.components.runOptimistic
import com.example.numera.ui.components.ArchiveRowSkeleton
import com.example.numera.ui.components.LeaderboardRowSkeleton
import com.example.numera.ui.components.NotificationSkeleton
import com.example.numera.ui.components.ShopItemSkeleton
import com.example.numera.ui.components.AchievementSkeleton
import com.example.numera.ui.components.LessonCardSkeleton
import com.example.numera.ui.components.SkeletonList
import com.example.numera.ui.components.SkeletonLine
import com.example.numera.ui.components.CommandPaletteController
import com.example.numera.ui.components.CommandPaletteHost
import com.example.numera.ui.components.CommandItem
import com.example.numera.ui.components.CommandCategory
import com.example.numera.ui.components.LocalCommandPalette
import com.example.numera.ui.components.rememberCommandPaletteController
import com.example.numera.ui.components.NumeraBreadcrumbs
import com.example.numera.ui.components.Crumb
import com.example.numera.ui.components.NumeraFilterRow
import com.example.numera.ui.components.NumeraFilterChip
import com.example.numera.ui.components.NumeraBottomSheet
import com.example.numera.ui.components.SheetActionRow
import com.example.numera.ui.components.SheetSectionLabel
import com.example.numera.ui.components.ContextMenuArea
import com.example.numera.ui.components.ContextAction
import com.example.numera.ui.components.NumeraQuickPreview
import com.example.numera.ui.components.QuickActionsBar
import com.example.numera.ui.components.QuickAction
import com.example.numera.ui.components.DisclosureSection
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.async
import org.json.JSONObject

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
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F13))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = Color(0x1F8A2BE2),
                radius = 400.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(
                    x = size.width * 0.2f + xOffset1.dp.toPx(),
                    y = size.height * 0.3f + yOffset1.dp.toPx()
                )
            )
            drawCircle(
                color = Color(0x1800CED1),
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
                    color = Color.White.copy(alpha = 0.03f),
                    start = androidx.compose.ui.geometry.Offset(i * cellWidth, 0f),
                    end = androidx.compose.ui.geometry.Offset(i * cellWidth, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            for (j in 0..rows) {
                drawLine(
                    color = Color.White.copy(alpha = 0.03f),
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
    val rarityColor = getRarityColor(rarity)
    
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
    
    val borderBrush = getRarityBorderBrush(rarity)
    
    val elevation = when (rarity.lowercase()) {
        "mythic" -> 12.dp
        "legendary" -> 8.dp
        "epic" -> 6.dp
        else -> 2.dp
    }
    
    Card(
        modifier = modifier
            .border(
                width = if (rarity.lowercase() in listOf("mythic", "legendary")) 2.dp else 1.dp,
                brush = borderBrush,
                shape = RoundedCornerShape(16.dp)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF161622).copy(alpha = 0.85f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(rarityColor.copy(alpha = 0.08f), Color.Transparent),
                            radius = 300f
                        )
                    )
            )
            
            Box(modifier = Modifier.padding(12.dp)) {
                content()
            }
            
            if (rarity.lowercase() in listOf("mythic", "legendary", "epic")) {
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
fun HeroShowcasePanel(
    item: ShopItem?,
    user: User?,
    inventoryIds: List<String>,
    ownedUtilities: List<UtilityBalance>,
    scope: kotlinx.coroutines.CoroutineScope,
    onPurchaseComplete: () -> Unit,
    onDismissShowcase: () -> Unit
) {
    if (item == null) return
    
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
            .padding(vertical = 4.dp)
            .border(2.dp, rarityColor.copy(alpha = 0.7f), RoundedCornerShape(20.dp)),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E2E).copy(alpha = 0.95f))
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
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "✦ SHOWCASE PREVIEW ✦",
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        color = rarityColor,
                        letterSpacing = 1.5.sp
                    )
                    IconButton(
                        onClick = {
                            com.example.numera.haptic.HapticManager.playSoft()
                            onDismissShowcase()
                        },
                        modifier = Modifier.size(24.dp)
                    ) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Close,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
                
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .graphicsLayer {
                            translationY = 4.dp.toPx() * kotlin.math.sin(rotation * Math.PI / 180).toFloat()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (item.rarity?.lowercase() in listOf("legendary", "mythic")) {
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
                            .clip(RoundedCornerShape(16.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .border(2.dp, rarityColor, RoundedCornerShape(16.dp)),
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
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = (item.rarity ?: "Common").uppercase(),
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            color = rarityColor
                        )
                        Text(
                            text = "·",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontSize = 11.sp
                        )
                        Text(
                            text = item.type.uppercase(),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
                
                Text(
                    text = item.description ?: "",
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
                
                if (item.required_rank != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
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
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
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
                } else {
                    val canBuy = (user?.coins ?: 0) >= item.cost && !isLocked
                    
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (item.discountActive == true && item.originalCost != null) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "🪙 ${item.originalCost}",
                                    style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                    fontSize = 13.sp
                                )
                                Box(
                                    modifier = Modifier
                                        .background(WrongRed, RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "DISCOUNTED",
                                        color = Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 8.sp
                                    )
                                }
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
                                            SoundManager.playPurchase()
                                            onPurchaseComplete()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("Shop", "Buy err: ${e.message}")
                                    }
                                }
                            },
                            enabled = canBuy,
                            color = if (canBuy) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FeaturedShopItemCard(
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

    val infiniteTransition = rememberInfiniteTransition(label = "featuredGlow")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val scaleValue = if (item.rarity?.lowercase() in listOf("legendary", "mythic")) pulseScale else 1f

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .scale(scaleValue)
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, rarityColor.copy(alpha = 0.5f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 42.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 36.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🔒", fontSize = 24.sp)
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = Color.White
                )
                Text(
                    text = (item.rarity ?: "Common").uppercase(),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    color = rarityColor
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.description ?: "",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    maxLines = 2
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                    Box(
                        modifier = Modifier
                            .background(WrongRed, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "OFFER",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                if (isEquipped) {
                    Text(
                        text = "Active",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = rarityColor
                    )
                }
            }
        }
    }
}

@Composable
fun ShopHeroCard(
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

    val infiniteTransition = rememberInfiniteTransition(label = "heroGlow")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.99f,
        targetValue = 1.01f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val scaleValue = if (item.rarity?.lowercase() in listOf("legendary", "mythic")) pulseScale else 1f

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .scale(scaleValue)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "✨ TODAY'S HERO ITEM",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = rarityColor,
                    letterSpacing = 1.sp
                )
                Text(
                    text = (item.rarity ?: "Common").uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = rarityColor.copy(alpha = 0.8f),
                    letterSpacing = 0.5.sp
                )
            }

            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                    .border(1.5.dp, rarityColor.copy(alpha = 0.4f), RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 64.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 48.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("🔒", fontSize = 32.sp)
                            Text("Rank locked", fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
                        }
                    }
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                if (!item.description.isNullOrEmpty()) {
                    Text(
                        text = item.description,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }

                if (isEquipped) {
                    Text(
                        text = "Equipped",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = rarityColor
                    )
                }
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
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, rarityColor.copy(alpha = 0.3f), RoundedCornerShape(8.dp)),
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
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = item.type.uppercase(),
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                }
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
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
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
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(8.dp))
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
                Text(
                    text = "Owned: $ownedQuantity",
                    fontSize = 12.sp,
                    color = if (ownedQuantity > 0) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
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
