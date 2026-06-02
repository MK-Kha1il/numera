package com.example.numera.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
 * Slide-over reference panel: surfaces educational references — formula sheets, lesson reminders,
 * glossary terms, concept explanations — over an active exercise so the learner never loses their
 * place. It slides in from the right over a dim scrim; tapping the scrim or the close button returns
 * them to exactly where they were. Use this instead of navigating away mid-task.
 */
@Composable
fun NumeraSlideOver(
    onDismiss: () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        var shown by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) { shown = true }

        Box(modifier = Modifier.fillMaxSize()) {
            // Scrim — tap to dismiss.
            AnimatedVisibility(visible = shown, enter = fadeIn(tween(200)), exit = fadeOut(tween(150))) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.4f))
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { onDismiss() }
                )
            }
            // Right-anchored panel.
            AnimatedVisibility(
                visible = shown,
                modifier = Modifier.align(Alignment.CenterEnd),
                enter = slideInHorizontally(tween(280)) { it } + fadeIn(tween(280)),
                exit = slideOutHorizontally(tween(200)) { it } + fadeOut(tween(150))
            ) {
                Column(
                    modifier = modifier
                        .fillMaxHeight()
                        .fillMaxWidth(0.86f)
                        .widthIn(max = 420.dp)
                        .clip(RoundedCornerShape(topStart = CornerRadius.xl, bottomStart = CornerRadius.xl))
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {}
                        .statusBarsPadding()
                        .padding(Spacing.l)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                title,
                                color = MaterialTheme.colorScheme.onSurface,
                                fontSize = 18.sp,
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
                                .size(34.dp)
                                .clip(RoundedCornerShape(CornerRadius.full))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .clickable { onDismiss() },
                            contentAlignment = Alignment.Center
                        ) {
                            NumeraIcon(type = NumeraIconType.Close, animate = false, modifier = Modifier.size(18.dp))
                        }
                    }
                    Spacer(Modifier.height(Spacing.m))
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(Spacing.m),
                        content = content
                    )
                }
            }
        }
    }
}
