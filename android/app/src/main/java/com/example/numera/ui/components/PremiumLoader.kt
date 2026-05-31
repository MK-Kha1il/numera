package com.example.numera.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun NumeraPremiumLoader(
    modifier: Modifier = Modifier,
    cardPadding: Dp = 24.dp
) {
    val mathMessages = remember {
        listOf(
            "Consulting the Pythagorean elders...",
            "Calibrating coordinate dimensions...",
            "Balancing the algebraic scale...",
            "Harmonizing trigonometry waves...",
            "Plotting vector fields...",
            "Factoring prime integers...",
            "Realigning matrix variables..."
        )
    }

    var messageIdx by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(2600)
            messageIdx = (messageIdx + 1) % mathMessages.size
        }
    }

    val infiniteTransition = rememberInfiniteTransition(label = "loaderEffects")
    
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )

    val scalePulse by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.secondary
    val cardBg = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.9f)
    val outlineColor = MaterialTheme.colorScheme.outline

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(cardPadding),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .clip(RoundedCornerShape(24.dp))
                .background(cardBg)
                .border(2.dp, outlineColor, RoundedCornerShape(24.dp))
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(100.dp)
                    .graphicsLayer {
                        rotationZ = rotation
                    },
                contentAlignment = Alignment.Center
            ) {
                // Blueprint coordinate radial helper lines
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val radius = size.minDimension / 2f
                    // Draw outer dashed circular compass
                    drawCircle(
                        color = primaryColor.copy(alpha = 0.15f),
                        radius = radius,
                        style = androidx.compose.ui.graphics.drawscope.Stroke(
                            width = 1.5.dp.toPx(),
                            pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                        )
                    )
                    // Draw inner grid crosshairs
                    drawLine(
                        color = secondaryColor.copy(alpha = 0.2f),
                        start = Offset(0f, size.height / 2f),
                        end = Offset(size.width, size.height / 2f),
                        strokeWidth = 1.dp.toPx()
                    )
                    drawLine(
                        color = secondaryColor.copy(alpha = 0.2f),
                        start = Offset(size.width / 2f, 0f),
                        end = Offset(size.width / 2f, size.height),
                        strokeWidth = 1.dp.toPx()
                    )
                }

                // Core pulsing mathematical character overlay
                val symbols = listOf("π", "∞", "√", "Σ", "Δ")
                val activeSymbol = symbols[messageIdx % symbols.size]
                
                Box(
                    modifier = Modifier
                        .graphicsLayer {
                            // Cancel target rotation so the symbol stays upright
                            rotationZ = -rotation
                            scaleX = scalePulse
                            scaleY = scalePulse
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = activeSymbol,
                        fontSize = 38.sp,
                        fontWeight = FontWeight.Black,
                        color = primaryColor,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Animated message transition
            AnimatedContent(
                targetState = mathMessages[messageIdx],
                transitionSpec = {
                    fadeIn(animationSpec = tween(400)) togetherWith fadeOut(animationSpec = tween(400))
                },
                label = "loadingMessageText"
            ) { text ->
                Text(
                    text = text,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp)
                )
            }
        }
    }
}

@Composable
fun NumeraSkeletonCard(
    modifier: Modifier = Modifier,
    height: Dp = 80.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "skeletonShimmer")
    val translateAnim by infiniteTransition.animateFloat(
        initialValue = -300f,
        targetValue = 600f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )

    val surfaceCard = MaterialTheme.colorScheme.surfaceVariant
    val shimmerColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
    
    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            surfaceCard,
            shimmerColor,
            surfaceCard
        ),
        start = Offset(translateAnim, 0f),
        end = Offset(translateAnim + 160f, 160f)
    )

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(16.dp))
            .background(shimmerBrush)
            .border(1.5.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
    )
}

@Composable
fun MathIconSpinner(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "iconSpinner")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(6000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )
    val scalePulse by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.secondary

    Box(
        modifier = modifier.size(60.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = primaryColor.copy(alpha = 0.08f),
                radius = size.minDimension / 2f
            )
            drawCircle(
                color = secondaryColor.copy(alpha = 0.25f),
                radius = size.minDimension / 2f,
                style = androidx.compose.ui.graphics.drawscope.Stroke(
                    width = 2.5.dp.toPx(),
                    pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(12f, 12f), rotation * 0.2f)
                )
            )
        }
        Box(
            modifier = Modifier.graphicsLayer {
                scaleX = scalePulse
                scaleY = scalePulse
            }
        ) {
            Text(
                text = "π",
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = primaryColor
            )
        }
    }
}

