package com.example.numera.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.theme.*
import kotlinx.coroutines.delay

/**
 * Global toast / feedback system.
 *
 * One controller is provided via [LocalToast] near the app root and rendered once by
 * [NumeraToastHost]. Any composable can fire reassuring, unobtrusive confirmations
 * (`LocalToast.current.success("Saved")`) without wiring state down the tree. Toasts are
 * lightweight, top-anchored, consistently timed and animated — never modal interruptions.
 */

enum class ToastType { Success, Error, Info, Achievement }

data class ToastData(
    val id: Long,
    val message: String,
    val type: ToastType,
    val actionLabel: String? = null,
    val onAction: (() -> Unit)? = null,
    val durationMs: Long = 2800L
)

/** Holds the live queue of toasts. Stable across recomposition (remembered at the root). */
@Stable
class ToastController {
    val queue: SnapshotStateList<ToastData> = mutableStateListOf()
    private var nextId = 0L

    fun show(
        message: String,
        type: ToastType = ToastType.Info,
        actionLabel: String? = null,
        durationMs: Long = 2800L,
        onAction: (() -> Unit)? = null
    ) {
        // Collapse duplicates that are already on screen (e.g. rapid double-taps).
        if (queue.any { it.message == message && it.type == type }) return
        queue.add(ToastData(nextId++, message, type, actionLabel, onAction, durationMs))
        // Keep the stack shallow so it stays unobtrusive.
        while (queue.size > 3) queue.removeAt(0)
    }

    fun success(message: String) = show(message, ToastType.Success)
    fun error(message: String) = show(message, ToastType.Error)
    fun info(message: String) = show(message, ToastType.Info)
    fun achievement(message: String) = show(message, ToastType.Achievement, durationMs = 3600L)

    fun dismiss(item: ToastData) { queue.remove(item) }
}

/** No-op fallback so call sites are always safe even if the host isn't mounted (previews, tests). */
val LocalToast = staticCompositionLocalOf { ToastController() }

@Composable
fun rememberToastController(): ToastController = remember { ToastController() }

/** The single overlay that renders the toast stack. Place it once, above all app content. */
@Composable
fun NumeraToastHost(
    controller: ToastController,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.TopCenter) {
        Column(
            modifier = Modifier
                .statusBarsPadding()
                .padding(horizontal = Spacing.l, vertical = Spacing.s)
                .widthIn(max = 440.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            controller.queue.forEach { toast ->
                key(toast.id) { ToastRow(toast = toast, onDismiss = { controller.dismiss(toast) }) }
            }
        }
    }
}

@Composable
private fun ToastRow(toast: ToastData, onDismiss: () -> Unit) {
    var visible by remember { mutableStateOf(false) }
    LaunchedEffect(toast.id) {
        visible = true
        HapticManager.playSoft()
        delay(toast.durationMs)
        visible = false
        delay(AnimDuration.normal.toLong())
        onDismiss()
    }

    AnimatedVisibility(
        visible = visible,
        enter = slideInVertically(
            initialOffsetY = { -it },
            animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)
        ) + fadeIn(tween(AnimDuration.fast)),
        exit = slideOutVertically(targetOffsetY = { -it }, animationSpec = tween(AnimDuration.normal)) +
            fadeOut(tween(AnimDuration.normal))
    ) {
        val accent = toast.type.accent()
        val surface = MaterialTheme.colorScheme.surfaceVariant
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(CornerRadius.l))
                .background(
                    Brush.verticalGradient(listOf(surface, surface.copy(alpha = 0.94f)))
                )
                .border(BorderStroke(2.dp, accent.copy(alpha = 0.55f)), RoundedCornerShape(CornerRadius.l))
                .clickable { visible = false; onDismiss() }
                .padding(horizontal = Spacing.l, vertical = Spacing.m),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
        ) {
            ToastGlyph(toast.type, accent)
            Text(
                text = toast.message,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f)
            )
            if (toast.actionLabel != null && toast.onAction != null) {
                Text(
                    text = toast.actionLabel.uppercase(),
                    color = accent,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.6.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(CornerRadius.s))
                        .clickable { toast.onAction?.invoke(); visible = false; onDismiss() }
                        .padding(horizontal = Spacing.s, vertical = Spacing.xs)
                )
            }
        }
    }
}

/** Lightweight drawn glyph per toast type — keeps iconography consistent without asset deps. */
@Composable
private fun ToastGlyph(type: ToastType, accent: Color) {
    androidx.compose.foundation.Canvas(modifier = Modifier.size(IconSize.m)) {
        val r = size.minDimension / 2f
        val c = Offset(size.width / 2f, size.height / 2f)
        drawCircle(color = accent.copy(alpha = 0.15f), radius = r)
        drawCircle(color = accent, radius = r, style = Stroke(width = 2.2.dp.toPx()))
        val sw = 2.4.dp.toPx()
        when (type) {
            ToastType.Success -> {
                // checkmark
                val p = androidx.compose.ui.graphics.Path().apply {
                    moveTo(c.x - r * 0.42f, c.y + r * 0.02f)
                    lineTo(c.x - r * 0.10f, c.y + r * 0.34f)
                    lineTo(c.x + r * 0.46f, c.y - r * 0.34f)
                }
                drawPath(p, color = accent, style = Stroke(width = sw, cap = StrokeCap.Round))
            }
            ToastType.Error -> {
                drawLine(accent, Offset(c.x - r * 0.34f, c.y - r * 0.34f), Offset(c.x + r * 0.34f, c.y + r * 0.34f), sw, StrokeCap.Round)
                drawLine(accent, Offset(c.x + r * 0.34f, c.y - r * 0.34f), Offset(c.x - r * 0.34f, c.y + r * 0.34f), sw, StrokeCap.Round)
            }
            ToastType.Info -> {
                drawCircle(accent, radius = sw * 0.6f, center = Offset(c.x, c.y - r * 0.38f))
                drawLine(accent, Offset(c.x, c.y - r * 0.08f), Offset(c.x, c.y + r * 0.42f), sw, StrokeCap.Round)
            }
            ToastType.Achievement -> {
                // 4-point sparkle star
                val s = r * 0.5f
                drawLine(accent, Offset(c.x, c.y - s), Offset(c.x, c.y + s), sw, StrokeCap.Round)
                drawLine(accent, Offset(c.x - s, c.y), Offset(c.x + s, c.y), sw, StrokeCap.Round)
                val d = s * 0.55f
                drawLine(accent.copy(alpha = 0.7f), Offset(c.x - d, c.y - d), Offset(c.x + d, c.y + d), sw * 0.8f, StrokeCap.Round)
                drawLine(accent.copy(alpha = 0.7f), Offset(c.x + d, c.y - d), Offset(c.x - d, c.y + d), sw * 0.8f, StrokeCap.Round)
            }
        }
    }
}

@Composable
private fun ToastType.accent(): Color = when (this) {
    ToastType.Success -> CorrectGreen
    ToastType.Error -> WrongRed
    ToastType.Info -> MaterialTheme.colorScheme.secondary
    ToastType.Achievement -> MilestoneGold
}
