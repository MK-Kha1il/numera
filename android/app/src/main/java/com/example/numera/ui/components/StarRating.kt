package com.example.numera.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.numera.motion.MotionManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.MedalGold
import kotlinx.coroutines.delay

/**
 * The 0–3 star rating of a level-map level (server rule, lib/soloRewards.levelStars): ★ cleared,
 * ★★ every problem solved, ★★★ flawless. Static on map nodes; on the recap it can reveal the earned
 * stars one by one ([animateReveal]) with a springy pop, calling [onStarRevealed] as each lands so
 * the caller can add sound/haptics. Reduced motion shows the final state immediately.
 */
@Composable
fun StarRating(
    stars: Int,
    modifier: Modifier = Modifier,
    size: Dp = 14.dp,
    earnedColor: Color = MedalGold,
    emptyColor: Color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.disabled),
    animateReveal: Boolean = false,
    onStarRevealed: ((index: Int) -> Unit)? = null,
) {
    val earnedCount = stars.coerceIn(0, 3)
    val reveal = animateReveal && !MotionManager.reduceMotion
    var revealed by remember(earnedCount, reveal) { mutableIntStateOf(if (reveal) 0 else earnedCount) }
    if (reveal) {
        LaunchedEffect(earnedCount) {
            for (i in 1..earnedCount) {
                delay(320)
                revealed = i
                onStarRevealed?.invoke(i - 1)
            }
        }
    }
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(size / 6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        for (i in 0 until 3) {
            val earned = i < revealed
            val scale by animateFloatAsState(
                targetValue = if (earned) 1f else 0.82f,
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow),
                label = "star$i",
            )
            Icon(
                imageVector = if (earned) Icons.Filled.Star else Icons.Filled.StarBorder,
                contentDescription = if (i == 0) "$earnedCount of 3 stars" else null,
                tint = if (earned) earnedColor else emptyColor,
                modifier = Modifier.size(size).graphicsLayer(scaleX = scale, scaleY = scale),
            )
        }
    }
}
