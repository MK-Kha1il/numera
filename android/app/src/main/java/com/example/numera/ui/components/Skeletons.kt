package com.example.numera.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Shared loading-skeleton system.
 *
 * Replaces generic spinners wherever the final content structure is known so the user feels
 * "the content is already on its way." Built on one shimmer brush (see [shimmer]) and composed
 * into typed layouts that mimic each screen's real rows. All sizing uses design tokens.
 */

/** A horizontally-sweeping shimmer brush that animates forever. Cheap — one transition per call site. */
@Composable
fun rememberShimmerBrush(): Brush {
    val transition = rememberInfiniteTransition(label = "skeletonShimmer")
    val translate by transition.animateFloat(
        initialValue = -300f,
        targetValue = 600f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerTranslate"
    )
    val base = MaterialTheme.colorScheme.surfaceVariant
    val highlight = MaterialTheme.colorScheme.outline.copy(alpha = 0.40f)
    return Brush.linearGradient(
        colors = listOf(base, highlight, base),
        start = Offset(translate, 0f),
        end = Offset(translate + 160f, 160f)
    )
}

/** A single shimmering block. The building primitive for every skeleton. */
@Composable
fun SkeletonBox(
    modifier: Modifier = Modifier,
    corner: Dp = CornerRadius.m,
    brush: Brush = rememberShimmerBrush()
) {
    Box(modifier = modifier.clip(RoundedCornerShape(corner)).background(brush))
}

/** A shimmering text line. [widthFraction] lets rows look natural (varying line lengths). */
@Composable
fun SkeletonLine(
    widthFraction: Float = 1f,
    height: Dp = 14.dp,
    brush: Brush = rememberShimmerBrush(),
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(CornerRadius.s))
            .background(brush)
    )
}

/** A shimmering circle — avatars, rank medallions, icon slots. */
@Composable
fun SkeletonCircle(size: Dp = 44.dp, brush: Brush = rememberShimmerBrush()) {
    Box(modifier = Modifier.size(size).clip(CircleShape).background(brush))
}

/** Repeats [item] [count] times with consistent spacing. */
@Composable
fun SkeletonList(
    count: Int = 6,
    spacing: Dp = Spacing.m,
    modifier: Modifier = Modifier,
    item: @Composable (Int) -> Unit
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(spacing)) {
        repeat(count) { i -> item(i) }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed skeletons — each mirrors the real row/card layout on its screen.
// ─────────────────────────────────────────────────────────────────────────────

/** Mirrors an archive / lesson result row: leading badge, two text lines, trailing chip. */
@Composable
fun ArchiveRowSkeleton(brush: Brush = rememberShimmerBrush()) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(Spacing.l),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonBox(modifier = Modifier.size(44.dp), corner = CornerRadius.m, brush = brush)
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            SkeletonLine(widthFraction = 0.7f, height = 15.dp, brush = brush)
            SkeletonLine(widthFraction = 0.45f, height = 11.dp, brush = brush)
        }
        SkeletonBox(modifier = Modifier.size(width = 48.dp, height = 22.dp), corner = CornerRadius.full, brush = brush)
    }
}

/** Mirrors a leaderboard standing row: rank, avatar, name, score. */
@Composable
fun LeaderboardRowSkeleton(brush: Brush = rememberShimmerBrush()) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(horizontal = Spacing.l, vertical = Spacing.m),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonBox(modifier = Modifier.size(width = 20.dp, height = 18.dp), corner = CornerRadius.s, brush = brush)
        SkeletonCircle(size = 40.dp, brush = brush)
        SkeletonLine(widthFraction = 0.5f, height = 14.dp, brush = brush, modifier = Modifier.weight(1f))
        SkeletonBox(modifier = Modifier.size(width = 44.dp, height = 18.dp), corner = CornerRadius.s, brush = brush)
    }
}

/** Mirrors a notification row: leading icon dot, title line, body line. */
@Composable
fun NotificationSkeleton(brush: Brush = rememberShimmerBrush()) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(Spacing.l),
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonCircle(size = 32.dp, brush = brush)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            SkeletonLine(widthFraction = 0.6f, height = 13.dp, brush = brush)
            SkeletonLine(widthFraction = 0.9f, height = 11.dp, brush = brush)
        }
    }
}

/** Mirrors a shop item card: image block, title, price chip. */
@Composable
fun ShopItemSkeleton(brush: Brush = rememberShimmerBrush()) {
    Column(
        modifier = Modifier
            .width(150.dp)
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(Spacing.m),
        verticalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonBox(modifier = Modifier.fillMaxWidth().height(96.dp), corner = CornerRadius.m, brush = brush)
        SkeletonLine(widthFraction = 0.8f, height = 13.dp, brush = brush)
        SkeletonBox(modifier = Modifier.size(width = 60.dp, height = 22.dp), corner = CornerRadius.full, brush = brush)
    }
}

/** Mirrors an achievement tile: medallion + two lines + progress track. */
@Composable
fun AchievementSkeleton(brush: Brush = rememberShimmerBrush()) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(Spacing.l),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonCircle(size = 48.dp, brush = brush)
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            SkeletonLine(widthFraction = 0.55f, height = 14.dp, brush = brush)
            SkeletonLine(widthFraction = 0.85f, height = 10.dp, brush = brush)
            SkeletonBox(modifier = Modifier.fillMaxWidth(0.7f).height(8.dp), corner = CornerRadius.full, brush = brush)
        }
    }
}

/** Mirrors a generic content card: title + three body lines. */
@Composable
fun LessonCardSkeleton(brush: Brush = rememberShimmerBrush()) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .padding(Spacing.l),
        verticalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonLine(widthFraction = 0.6f, height = 18.dp, brush = brush)
        SkeletonLine(widthFraction = 1f, height = 12.dp, brush = brush)
        SkeletonLine(widthFraction = 0.92f, height = 12.dp, brush = brush)
        SkeletonLine(widthFraction = 0.5f, height = 12.dp, brush = brush)
    }
}

/** Mirrors the profile header: large avatar + name/handle lines. */
@Composable
fun ProfileHeaderSkeleton(brush: Brush = rememberShimmerBrush()) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(Spacing.l),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        SkeletonCircle(size = 96.dp, brush = brush)
        SkeletonLine(widthFraction = 0.4f, height = 18.dp, brush = brush)
        SkeletonLine(widthFraction = 0.25f, height = 12.dp, brush = brush)
    }
}
