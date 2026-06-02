package com.example.numera.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Quick preview: peek at an exercise, level, achievement or collection without committing to a full
 * navigation. A lightweight, spring-scaled card over a dimmed scrim — fast to open, fast to dismiss
 * (tap-outside / back), with an optional primary CTA to commit to the full view.
 */
@Composable
fun NumeraQuickPreview(
    onDismiss: () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    primaryLabel: String? = null,
    onPrimary: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        // Animate in on first composition for a premium spring entrance.
        var shown by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) { shown = true }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { onDismiss() },
            contentAlignment = Alignment.Center
        ) {
            AnimatedVisibility(
                visible = shown,
                enter = fadeIn(tween(180)) + scaleIn(
                    initialScale = 0.85f,
                    animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium)
                ),
                exit = fadeOut(tween(120)) + scaleOut(targetScale = 0.9f)
            ) {
                Column(
                    modifier = modifier
                        .fillMaxWidth(0.9f)
                        .widthIn(max = 460.dp)
                        // Consume taps so clicks inside the card don't dismiss.
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {}
                        .clip(RoundedCornerShape(CornerRadius.xl))
                        .background(MaterialTheme.colorScheme.surface)
                        .border(
                            BorderStroke(2.dp, MaterialTheme.colorScheme.outline),
                            RoundedCornerShape(CornerRadius.xl)
                        )
                        .padding(Spacing.l),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                title,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 19.sp,
                                fontWeight = FontWeight.Black
                            )
                            if (subtitle != null) {
                                Text(
                                    subtitle,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(RoundedCornerShape(CornerRadius.full))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { onDismiss() },
                            contentAlignment = Alignment.Center
                        ) {
                            NumeraIcon(type = NumeraIconType.Close, animate = false, modifier = Modifier.size(18.dp))
                        }
                    }
                    content()
                    if (primaryLabel != null && onPrimary != null) {
                        DuoButton(
                            text = primaryLabel,
                            onClick = { onPrimary(); onDismiss() },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
