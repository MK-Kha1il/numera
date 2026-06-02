package com.example.numera.ui.feature.profile

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
fun WeeklyActivityChart(activityDays: List<ActivityDay>) {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val textColor = MaterialTheme.colorScheme.onSurface
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.10f)
    val mutedBarColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.18f)

    val displayDays = remember(activityDays) {
        if (activityDays.isNullOrEmpty()) {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val list = mutableListOf<ActivityDay>()
            for (i in 6 downTo 0) {
                val tempCal = java.util.Calendar.getInstance()
                tempCal.add(java.util.Calendar.DAY_OF_YEAR, -i)
                list.add(ActivityDay(sdf.format(tempCal.time), 0))
            }
            list
        } else {
            activityDays.takeLast(7)
        }
    }

    val maxSolved = remember(displayDays) {
        val maxVal = displayDays.maxOfOrNull { it.solved_count } ?: 0
        if (maxVal == 0) 10 else maxVal
    }
    val totalSolved = remember(displayDays) { displayDays.sumOf { it.solved_count } }
    val bestDay = remember(displayDays) { displayDays.maxOfOrNull { it.solved_count } ?: 0 }
    val activeDays = remember(displayDays) { displayDays.count { it.solved_count > 0 } }
    val todayStr = remember {
        java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    }

    // Animate bars growing in
    var animate by remember { mutableStateOf(false) }
    LaunchedEffect(displayDays) { animate = false; animate = true }
    val growth by animateFloatAsState(
        targetValue = if (animate) 1f else 0f,
        animationSpec = tween(900, easing = FastOutSlowInEasing),
        label = "barGrowth"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            primary.copy(alpha = 0.06f),
                            MaterialTheme.colorScheme.surface
                        )
                    )
                )
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Weekly Activity",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Equations solved over the last 7 days",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(primary.copy(alpha = 0.12f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "🔥 $totalSolved",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black,
                        color = primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Summary stat chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                @Composable
                fun StatChip(label: String, value: String, accent: Color, modifier: Modifier) {
                    Column(
                        modifier = modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(accent.copy(alpha = 0.08f))
                            .border(1.dp, accent.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = accent)
                        Text(label, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
                StatChip("BEST DAY", bestDay.toString(), primary, Modifier.weight(1f))
                StatChip("ACTIVE DAYS", "$activeDays/7", secondary, Modifier.weight(1f))
                StatChip("DAILY AVG", (totalSolved / 7).toString(), MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(18.dp))

            val density = LocalDensity.current
            val valuePaint = remember(textColor, density) {
                android.graphics.Paint().apply {
                    color = textColor.toArgb()
                    textSize = with(density) { 11.sp.toPx() }
                    isAntiAlias = true
                    isFakeBoldText = true
                    textAlign = android.graphics.Paint.Align.CENTER
                }
            }
            val labelPaint = remember(labelColor, density) {
                android.graphics.Paint().apply {
                    color = labelColor.toArgb()
                    textSize = with(density) { 10.sp.toPx() }
                    isAntiAlias = true
                    textAlign = android.graphics.Paint.Align.CENTER
                }
            }
            val primaryArgb = primary
            val secondaryArgb = secondary

            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(170.dp)
            ) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                val bottomLabelHeight = 44f
                val topPadding = 26f
                val chartHeight = canvasHeight - bottomLabelHeight - topPadding

                val barCount = displayDays.size
                val barWidth = 26.dp.toPx()
                val totalBarsWidth = barWidth * barCount
                val spacing = (canvasWidth - totalBarsWidth) / (barCount + 1)

                // Subtle dashed gridlines
                val gridLines = listOf(0f, 0.5f, 1.0f)
                gridLines.forEach { fraction ->
                    val y = topPadding + chartHeight * (1f - fraction)
                    drawLine(
                        color = gridColor,
                        start = androidx.compose.ui.geometry.Offset(0f, y),
                        end = androidx.compose.ui.geometry.Offset(canvasWidth, y),
                        strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f), 0f)
                    )
                }

                displayDays.forEachIndexed { index, day ->
                    val fraction = day.solved_count.toFloat() / maxSolved.toFloat()
                    val currentBarHeight = chartHeight * fraction * growth
                    val isToday = day.date == todayStr
                    val isBest = day.solved_count == bestDay && bestDay > 0

                    val x = spacing + index * (barWidth + spacing)
                    val left = x
                    val right = x + barWidth
                    val bottom = topPadding + chartHeight
                    val rx = 8.dp.toPx()

                    // Track (faint full-height capsule behind the bar)
                    val trackPath = Path().apply {
                        moveTo(left, bottom)
                        lineTo(left, topPadding + rx)
                        quadraticBezierTo(left, topPadding, left + rx, topPadding)
                        lineTo(right - rx, topPadding)
                        quadraticBezierTo(right, topPadding, right, topPadding + rx)
                        lineTo(right, bottom)
                        close()
                    }
                    drawPath(path = trackPath, color = mutedBarColor)

                    if (currentBarHeight > rx) {
                        val top = bottom - currentBarHeight
                        val barPath = Path().apply {
                            moveTo(left, bottom)
                            lineTo(left, top + rx)
                            quadraticBezierTo(left, top, left + rx, top)
                            lineTo(right - rx, top)
                            quadraticBezierTo(right, top, right, top + rx)
                            lineTo(right, bottom)
                            close()
                        }
                        val barBrush = if (isToday || isBest) {
                            Brush.verticalGradient(listOf(secondaryArgb, primaryArgb))
                        } else {
                            Brush.verticalGradient(listOf(primaryArgb, primaryArgb.copy(alpha = 0.55f)))
                        }
                        drawPath(path = barPath, brush = barBrush)

                        // Glossy highlight on left edge
                        drawLine(
                            color = Color.White.copy(alpha = 0.35f),
                            start = androidx.compose.ui.geometry.Offset(left + rx * 0.7f, top + rx),
                            end = androidx.compose.ui.geometry.Offset(left + rx * 0.7f, bottom - rx),
                            strokeWidth = 2.dp.toPx(),
                            cap = StrokeCap.Round
                        )

                        // Value label above bar
                        if (day.solved_count > 0 && growth > 0.7f) {
                            drawContext.canvas.nativeCanvas.drawText(
                                day.solved_count.toString(),
                                x + barWidth / 2,
                                top - 10f,
                                valuePaint
                            )
                        }
                    }

                    val dayLabel = try {
                        val sdfInput = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                        val date = sdfInput.parse(day.date)
                        val sdfOutput = java.text.SimpleDateFormat("E", java.util.Locale.US)
                        sdfOutput.format(date)
                    } catch (e: Exception) {
                        day.date
                    }

                    labelPaint.isFakeBoldText = isToday
                    drawContext.canvas.nativeCanvas.drawText(
                        if (isToday) "•$dayLabel" else dayLabel,
                        x + barWidth / 2,
                        bottom + 26f,
                        labelPaint
                    )
                }
            }
        }
    }
}





