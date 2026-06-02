package com.example.numera.ui.feature.archive

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
import com.example.numera.ui.feature.shop.ShopScreen
import com.example.numera.ui.feature.profile.ProfileScreen
import com.example.numera.ui.feature.profile.UserProfileDialog
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
fun LevelNode(
    levelNum: Int,
    category: String,
    isUnlocked: Boolean,
    isActive: Boolean,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    val currentScale = if (isActive) scale else 1.0f

    val (startColor, endColor, shadowColor) = when {
        !isUnlocked -> Triple(Color(0xFFE5E7EB), Color(0xFFD1D5DB), Color(0xFF9CA3AF))
        category == "mental" -> Triple(Color(0xFF818CF8), Color(0xFF4F46E5), Color(0xFF3730A3))
        category == "arithmetic" -> Triple(Color(0xFF34D399), Color(0xFF059669), Color(0xFF065F46))
        category == "algebra" -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
        category == "number_theory" -> Triple(Color(0xFF2DD4BF), Color(0xFF0D9488), Color(0xFF115E59))
        category == "calculus" -> Triple(Color(0xFF3B82F6), Color(0xFF2563EB), Color(0xFF1E3A8A))
        category == "combinatorics" -> Triple(Color(0xFFEC4899), Color(0xFFDB2777), Color(0xFF881337))
        else -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
    }

    val contentColor = if (isUnlocked) Color.White else Color(0xFF9CA3AF)

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(100.dp)
            .clickable(enabled = isUnlocked, onClick = onClick)
    ) {
        if (isActive) {
            // Subtle glowing backdrop
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .background(startColor.copy(alpha = glowAlpha * 0.15f), shape = CircleShape)
            )
            // Focus framing ring
            Box(
                modifier = Modifier
                    .size(86.dp)
                    .border(
                        width = 2.dp,
                        color = startColor.copy(alpha = glowAlpha),
                        shape = CircleShape
                    )
            )
        }

        Box(
            modifier = Modifier
                .size(76.dp)
                .graphicsLayer(
                    scaleX = currentScale,
                    scaleY = currentScale
                ),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .offset(y = 6.dp)
                    .background(shadowColor, shape = CircleShape)
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(startColor, endColor)
                        ),
                        shape = CircleShape
                    )
                    .border(
                        width = 2.dp,
                        color = Color.White.copy(alpha = 0.4f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    if (!isUnlocked) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Locked",
                            tint = contentColor,
                            modifier = Modifier.size(24.dp)
                        )
                    } else if (isActive) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Active",
                            tint = contentColor,
                            modifier = Modifier.size(28.dp)
                        )
                    } else {
                        Text(
                            text = levelNum.toString(),
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = contentColor
                        )
                    }
                }
            }
        }

        if (isActive) {
            Box(
                modifier = Modifier
                    .offset(y = (-48).dp)
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color(0xFFEC4899), Color(0xFFF43F5E))
                        ),
                        shape = RoundedCornerShape(6.dp)
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.6f), shape = RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "START",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 9.sp,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

sealed class LearnMapItem {
    data class StageHeader(
        val stageNum: Int,
        val title: String,
        val description: String,
        val startColor: Color,
        val endColor: Color
    ) : LearnMapItem()

    data class LevelNodeItem(
        val levelNum: Int,
        val category: String,
        val isUnlocked: Boolean,
        val isActive: Boolean
    ) : LearnMapItem()
}

@Composable
fun StageHeaderCard(
    stageNum: Int,
    title: String,
    description: String,
    startColor: Color,
    endColor: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 24.dp)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.15f),
                        endColor.copy(alpha = 0.05f)
                    )
                ),
                shape = RoundedCornerShape(24.dp)
            )
            .border(
                width = 1.5.dp,
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.6f),
                        endColor.copy(alpha = 0.2f)
                    )
                ),
                shape = RoundedCornerShape(24.dp)
            )
            .padding(20.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(56.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(startColor, endColor)
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
            ) {
                Text(
                    text = stageNum.toString(),
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title.uppercase(),
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }
        }
    }
}





