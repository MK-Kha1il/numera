package com.example.numera.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.numera.theme.AnimDuration
import com.example.numera.theme.CornerRadius
import kotlinx.coroutines.delay

/**
 * Progress-bar illusion system.
 *
 * Real loads have unknown duration, so a literal progress bar either freezes or jumps. Instead we
 * model *perceived* progress: start quickly, advance confidently, decelerate toward ~90%, then snap
 * to 100% the instant the real work finishes. The actual duration is unchanged — only the curve is.
 */

/**
 * Drives a believable 0→1 progress value from a boolean [loading] flag.
 * While loading it eases toward 0.9 (closing a fixed fraction of the remaining gap each tick, so it
 * is fast then slow); when loading clears it finishes naturally to 1f.
 */
@Composable
fun rememberSmartProgress(loading: Boolean): Float {
    var target by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(loading) {
        if (loading) {
            target = 0f
            while (target < 0.9f) {
                delay(90)
                target += (0.9f - target) * 0.10f   // decelerating approach
            }
        } else if (target > 0f) {
            target = 1f
            delay(AnimDuration.slow.toLong())
            target = 0f                              // reset for next load
        }
    }

    val animated by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(AnimDuration.normal),
        label = "smartProgress"
    )
    return animated
}

/** Thin token-styled progress bar. Renders nothing at 0 so it never lingers as an empty track. */
@Composable
fun SmartProgressBar(
    progress: Float,
    modifier: Modifier = Modifier,
    height: Dp = 4.dp
) {
    if (progress <= 0f) return
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(progress.coerceIn(0f, 1f))
                .clip(RoundedCornerShape(CornerRadius.full))
                .background(Brush.horizontalGradient(listOf(primary, secondary)))
        )
    }
}
