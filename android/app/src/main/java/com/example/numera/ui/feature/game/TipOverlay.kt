package com.example.numera.ui.feature.game

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MathProblem
import com.example.numera.theme.*
import com.example.numera.ui.components.MathText

// Slide-up hint/tip overlay, hoisted out of SoloGameScreen. Read-only: it shows the current
// problem's tip + metadata and closes via onClose; the active problem is passed in directly.
@Composable
fun BoxScope.TipOverlay(
    visible: Boolean,
    onClose: () -> Unit,
    problem: MathProblem?,
) {
        AnimatedVisibility(
            visible = visible,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f)
                    .clickable(enabled = false) {}
                    .clip(RoundedCornerShape(topStart = Spacing.xl, topEnd = Spacing.xl))
                    .background(MaterialTheme.colorScheme.surface),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Spacing.l)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(Spacing.l)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "HINT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = problem?.tipMetadata?.concept
                                    ?: "Study Tip",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 18.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        IconButton(onClick = onClose) {
                            Icon(Icons.Default.Clear, contentDescription = "Close")
                        }
                    }

                    if (problem != null) {
                        val tipText = problem.tip?.takeIf { it.isNotBlank() }
                            ?: "Tip unavailable for this exercise."

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                                .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            if (tipText.contains("$") || tipText.contains("\\")) {
                                MathText(
                                    text = tipText,
                                    fontSizePx = 36,
                                    color = MaterialTheme.colorScheme.onBackground,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            } else {
                                Text(
                                    text = tipText,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        problem.tipMetadata?.let { metadata ->
                            Divider(
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                                thickness = 1.dp
                            )

                            metadata.learningObjective?.let { objective ->
                                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                    Text(
                                        text = "LEARNING OBJECTIVE",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.secondary,
                                        letterSpacing = 0.8.sp
                                    )
                                    Text(
                                        text = objective,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                                        lineHeight = 18.sp
                                    )
                                }
                            }

                            metadata.commonMistakes?.let { pitfall ->
                                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                    Text(
                                        text = "WATCH OUT FOR",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WrongRed,
                                        letterSpacing = 0.8.sp
                                    )
                                    Text(
                                        text = pitfall,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                                        lineHeight = 18.sp
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.l)
                            ) {
                                metadata.subskill?.let { skill ->
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "SKILL",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            letterSpacing = 0.8.sp
                                        )
                                        Text(text = skill, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                    }
                                }
                                metadata.difficulty?.let { diff ->
                                    Column {
                                        Text(
                                            text = "DIFFICULTY",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            letterSpacing = 0.8.sp
                                        )
                                        Text(text = diff, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                    }
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "Tip unavailable for this exercise.",
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
}
