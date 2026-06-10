package com.example.numera.ui.feature.archive

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import com.example.numera.data.network.*
import com.example.numera.theme.*

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
        // Curriculum strands (now on the main map — each gets its own node identity).
        category == "fractions" -> Triple(Color(0xFFFB7185), Color(0xFFE11D48), Color(0xFF9F1239))
        category == "decimals" -> Triple(Color(0xFFFB923C), Color(0xFFEA580C), Color(0xFF9A3412))
        category == "integers" -> Triple(Color(0xFFA3E635), Color(0xFF65A30D), Color(0xFF3F6212))
        category == "geometry" -> Triple(Color(0xFF38BDF8), Color(0xFF0284C7), Color(0xFF075985))
        category == "number_sense" -> Triple(Color(0xFFE879F9), Color(0xFFC026D3), Color(0xFF86198F))
        category == "statistics" -> Triple(Color(0xFFA78BFA), Color(0xFF7C3AED), Color(0xFF5B21B6))
        category == "expressions" -> Triple(Color(0xFF22D3EE), Color(0xFF0891B2), Color(0xFF155E75))
        category == "powers" -> Triple(Color(0xFF64B5F6), Color(0xFF1976D2), Color(0xFF0D47A1))
        else -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
    }

    val contentColor = if (isUnlocked) Color.White else Color(0xFF9CA3AF)

    // Hoisted out of the render path: active nodes recompose every animation frame
    // (scale/glow infinite transition), so allocating these brushes inline would churn
    // a new Brush per frame. Keyed on their inputs (constant for the START badge).
    val nodeBrush = remember(startColor, endColor) {
        Brush.verticalGradient(colors = listOf(startColor, endColor))
    }
    val startBadgeBrush = remember {
        Brush.horizontalGradient(colors = listOf(Color(0xFFEC4899), Color(0xFFF43F5E)))
    }

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
                        brush = nodeBrush,
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
                            modifier = Modifier.size(IconSize.m)
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
                        brush = startBadgeBrush,
                        shape = RoundedCornerShape(6.dp)
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.6f), shape = RoundedCornerShape(6.dp))
                    .padding(horizontal = Spacing.s, vertical = 2.dp)
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
            .padding(horizontal = 20.dp, vertical = Spacing.xl)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.15f),
                        endColor.copy(alpha = 0.05f)
                    )
                ),
                shape = RoundedCornerShape(CornerRadius.xl)
            )
            .border(
                width = 1.5.dp,
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.6f),
                        endColor.copy(alpha = 0.2f)
                    )
                ),
                shape = RoundedCornerShape(CornerRadius.xl)
            )
            .padding(20.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.l)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(56.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(startColor, endColor)
                        ),
                        shape = RoundedCornerShape(CornerRadius.l)
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
                Spacer(modifier = Modifier.height(Spacing.xs))
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





