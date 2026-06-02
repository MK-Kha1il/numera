package com.example.numera.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

enum class NumeraIconType {
    Learn, Arena, Quests, Shop, Profile, Settings, Lock, Warning, Back, Close, Search, Streak, Trophy, XP, Coins, Scratchpad, Favorite, Notification, Calculator, Tip,
    Check, ChevronRight, ChevronUp, ChevronDown
}

@Composable
fun NumeraIcon(
    type: NumeraIconType,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    animate: Boolean = true,
    filled: Boolean = false
) {
    val infiniteTransition = rememberInfiniteTransition(label = "PremiumIconTransition")
    
    // Streak pulse animation
    val streakScale by if (animate && type == NumeraIconType.Streak) {
        infiniteTransition.animateFloat(
            initialValue = 0.96f,
            targetValue = 1.06f,
            animationSpec = infiniteRepeatable(
                animation = tween(1200, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "streakPulse"
        )
    } else {
        remember { mutableStateOf(1f) }
    }

    // Trophy shimmer animation (sweep from -1.0 to 2.0 to give delay between sweeps)
    val trophySweep by if (animate && type == NumeraIconType.Trophy) {
        infiniteTransition.animateFloat(
            initialValue = -1.0f,
            targetValue = 2.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(2200, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "trophyShimmer"
        )
    } else {
        remember { mutableStateOf(-1f) }
    }

    // XP glow animation
    val xpGlowRadius by if (animate && type == NumeraIconType.XP) {
        infiniteTransition.animateFloat(
            initialValue = 0.65f,
            targetValue = 0.95f,
            animationSpec = infiniteRepeatable(
                animation = tween(1600, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "xpGlow"
        )
    } else {
        remember { mutableStateOf(0.8f) }
    }

    // Coins sparkle animation
    val coinSparkleAlpha by if (animate && type == NumeraIconType.Coins) {
        infiniteTransition.animateFloat(
            initialValue = 0.2f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(1000, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "coinSparkle"
        )
    } else {
        remember { mutableStateOf(0.7f) }
    }

    // Settings subtle spin
    val gearAngle by if (animate && type == NumeraIconType.Settings) {
        infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(
                animation = tween(8000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "gearRotation"
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    Canvas(modifier = modifier.size(24.dp)) {
        val w = size.width
        val h = size.height
        val strokeWidth = 2.5f.dp.toPx()
        val cap = StrokeCap.Round
        val join = StrokeJoin.Round

        when (type) {
            NumeraIconType.Learn -> {
                // Cohesive zigzag pathway map representing learning nodes
                val path = Path().apply {
                    moveTo(w * 0.15f, h * 0.8f)
                    cubicTo(w * 0.3f, h * 0.85f, w * 0.25f, h * 0.45f, w * 0.5f, h * 0.5f)
                    cubicTo(w * 0.75f, h * 0.55f, w * 0.7f, h * 0.15f, w * 0.85f, h * 0.2f)
                }
                drawPath(
                    path = path,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Draw 3 map node dots along the path
                drawCircle(color = tint, radius = strokeWidth * 1.5f, center = Offset(w * 0.15f, h * 0.8f))
                drawCircle(color = tint, radius = strokeWidth * 1.5f, center = Offset(w * 0.5f, h * 0.5f))
                drawCircle(color = tint, radius = strokeWidth * 1.5f, center = Offset(w * 0.85f, h * 0.2f))
            }

            NumeraIconType.Arena -> {
                // Sleek rounded five-point star with a small inner circle
                val centerX = w / 2f
                val centerY = h / 2f
                val outerRadius = w * 0.45f
                val innerRadius = w * 0.2f
                val starPath = Path()
                
                for (i in 0 until 10) {
                    val angle = i * PI / 5.0 - PI / 2.0
                    val r = if (i % 2 == 0) outerRadius else innerRadius
                    val x = centerX + r * cos(angle)
                    val y = centerY + r * sin(angle)
                    if (i == 0) {
                        starPath.moveTo(x.toFloat(), y.toFloat())
                    } else {
                        starPath.lineTo(x.toFloat(), y.toFloat())
                    }
                }
                starPath.close()

                drawPath(
                    path = starPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Inner center dot
                drawCircle(color = tint, radius = strokeWidth * 0.8f, center = Offset(centerX, centerY))
            }

            NumeraIconType.Quests -> {
                // Checklist with rounded list lines
                // Top clipboard clip
                drawRoundRect(
                    color = tint,
                    topLeft = Offset(w * 0.35f, h * 0.1f),
                    size = Size(w * 0.3f, h * 0.1f),
                    cornerRadius = CornerRadius(2.dp.toPx(), 2.dp.toPx()),
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Board body
                drawRoundRect(
                    color = tint,
                    topLeft = Offset(w * 0.2f, h * 0.2f),
                    size = Size(w * 0.6f, h * 0.7f),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx()),
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // 3 checklist items
                drawLine(color = tint, start = Offset(w * 0.35f, h * 0.4f), end = Offset(w * 0.7f, h * 0.4f), strokeWidth = strokeWidth, cap = cap)
                drawLine(color = tint, start = Offset(w * 0.35f, h * 0.55f), end = Offset(w * 0.7f, h * 0.55f), strokeWidth = strokeWidth, cap = cap)
                drawLine(color = tint, start = Offset(w * 0.35f, h * 0.7f), end = Offset(w * 0.7f, h * 0.7f), strokeWidth = strokeWidth, cap = cap)
                
                // Small checkmarks
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.27f, h * 0.4f))
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.27f, h * 0.55f))
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.27f, h * 0.7f))
            }

            NumeraIconType.Shop -> {
                // Stylized modern shopping basket with soft handles
                val basketPath = Path().apply {
                    moveTo(w * 0.2f, h * 0.4f)
                    lineTo(w * 0.8f, h * 0.4f)
                    lineTo(w * 0.72f, h * 0.85f)
                    cubicTo(w * 0.7f, h * 0.9f, w * 0.3f, h * 0.9f, w * 0.28f, h * 0.85f)
                    close()
                }
                drawPath(
                    path = basketPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Handle
                val handlePath = Path().apply {
                    moveTo(w * 0.3f, h * 0.4f)
                    cubicTo(w * 0.3f, h * 0.15f, w * 0.7f, h * 0.15f, w * 0.7f, h * 0.4f)
                }
                drawPath(
                    path = handlePath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
            }

            NumeraIconType.Profile -> {
                // Sleek minimalist profile user outline
                val centerX = w / 2f
                // Head
                drawCircle(
                    color = tint,
                    radius = h * 0.20f,
                    center = Offset(centerX, h * 0.32f),
                    style = Stroke(width = strokeWidth)
                )
                // Shoulder arc
                val shouldersPath = Path().apply {
                    moveTo(w * 0.15f, h * 0.88f)
                    cubicTo(w * 0.2f, h * 0.62f, w * 0.8f, h * 0.62f, w * 0.85f, h * 0.88f)
                }
                drawPath(
                    path = shouldersPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
            }

            NumeraIconType.Settings -> {
                // Gear wheel rotated dynamically
                val centerX = w / 2f
                val centerY = h / 2f
                val outerR = w * 0.36f
                val innerR = w * 0.22f
                
                // Draw rotating outer gear cogs
                val gearPath = Path()
                val teethCount = 8
                for (i in 0 until teethCount * 2) {
                    val angle = (i * PI / teethCount) + (gearAngle * PI / 180f)
                    val r = if (i % 2 == 0) outerR else innerR
                    val x = centerX + r * cos(angle)
                    val y = centerY + r * sin(angle)
                    if (i == 0) {
                        gearPath.moveTo(x.toFloat(), y.toFloat())
                    } else {
                        gearPath.lineTo(x.toFloat(), y.toFloat())
                    }
                }
                gearPath.close()

                drawPath(
                    path = gearPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Center hole
                drawCircle(
                    color = tint,
                    radius = w * 0.12f,
                    center = Offset(centerX, centerY),
                    style = Stroke(width = strokeWidth)
                )
            }

            NumeraIconType.Lock -> {
                // Padlock
                val bodyT = h * 0.45f
                drawRoundRect(
                    color = tint,
                    topLeft = Offset(w * 0.22f, bodyT),
                    size = Size(w * 0.56f, h * 0.45f),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx()),
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Shackle
                val shacklePath = Path().apply {
                    moveTo(w * 0.34f, bodyT)
                    lineTo(w * 0.34f, h * 0.28f)
                    cubicTo(w * 0.35f, h * 0.12f, w * 0.65f, h * 0.12f, w * 0.66f, h * 0.28f)
                    lineTo(w * 0.66f, bodyT)
                }
                drawPath(
                    path = shacklePath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
            }

            NumeraIconType.Warning -> {
                // Triangle alert
                val triPath = Path().apply {
                    moveTo(w * 0.5f, h * 0.12f)
                    lineTo(w * 0.88f, h * 0.88f)
                    lineTo(w * 0.12f, h * 0.88f)
                    close()
                }
                drawPath(
                    path = triPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                // Exclamation
                drawLine(color = tint, start = Offset(w * 0.5f, h * 0.4f), end = Offset(w * 0.5f, h * 0.65f), strokeWidth = strokeWidth, cap = cap)
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.5f, h * 0.77f))
            }

            NumeraIconType.Back -> {
                // Elegant back arrow
                drawLine(color = tint, start = Offset(w * 0.2f, h * 0.5f), end = Offset(w * 0.8f, h * 0.5f), strokeWidth = strokeWidth, cap = cap)
                val arrowTip = Path().apply {
                    moveTo(w * 0.45f, h * 0.25f)
                    lineTo(w * 0.2f, h * 0.5f)
                    lineTo(w * 0.45f, h * 0.75f)
                }
                drawPath(path = arrowTip, color = tint, style = Stroke(width = strokeWidth, cap = cap, join = join))
            }

            NumeraIconType.Close -> {
                // Elegant thick close X
                drawLine(color = tint, start = Offset(w * 0.25f, h * 0.25f), end = Offset(w * 0.75f, h * 0.75f), strokeWidth = strokeWidth, cap = cap)
                drawLine(color = tint, start = Offset(w * 0.75f, h * 0.25f), end = Offset(w * 0.25f, h * 0.75f), strokeWidth = strokeWidth, cap = cap)
            }

            NumeraIconType.Search -> {
                // Minimal lens with handle
                drawCircle(
                    color = tint,
                    radius = w * 0.24f,
                    center = Offset(w * 0.42f, h * 0.42f),
                    style = Stroke(width = strokeWidth)
                )
                drawLine(
                    color = tint,
                    start = Offset(w * 0.58f, h * 0.58f),
                    end = Offset(w * 0.82f, h * 0.82f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
            }

            NumeraIconType.Streak -> {
                // Pulsing Flame
                val scale = streakScale
                val fireColor = Brush.verticalGradient(listOf(Color(0xFFFF9600), Color(0xFFFF3D00)))
                val cx = w / 2f
                val cy = h / 2f
                
                drawContext.canvas.save()
                drawContext.canvas.scale(scale, scale, cx, cy)

                val flamePath = Path().apply {
                    moveTo(w * 0.5f, h * 0.1f) // Peak
                    cubicTo(w * 0.6f, h * 0.35f, w * 0.85f, h * 0.45f, w * 0.8f, h * 0.72f)
                    cubicTo(w * 0.75f, h * 0.95f, w * 0.25f, h * 0.95f, w * 0.2f, h * 0.72f)
                    cubicTo(w * 0.15f, h * 0.45f, w * 0.4f, h * 0.35f, w * 0.5f, h * 0.1f)
                    close()
                }
                drawPath(path = flamePath, brush = fireColor)
                
                // Inner spark detail
                val innerSpark = Path().apply {
                    moveTo(w * 0.5f, h * 0.45f)
                    cubicTo(w * 0.58f, h * 0.58f, w * 0.68f, h * 0.68f, w * 0.62f, h * 0.8f)
                    cubicTo(w * 0.58f, h * 0.88f, w * 0.42f, h * 0.88f, w * 0.38f, h * 0.8f)
                    cubicTo(w * 0.32f, h * 0.68f, w * 0.42f, h * 0.58f, w * 0.5f, h * 0.45f)
                    close()
                }
                drawPath(path = innerSpark, color = Color(0xFFFFEB3B))
                
                drawContext.canvas.restore()
            }

            NumeraIconType.Trophy -> {
                // Shimmering Golden Trophy
                val goldColor = Brush.verticalGradient(listOf(Color(0xFFFDD835), Color(0xFFF57F17)))
                val cupPath = Path().apply {
                    moveTo(w * 0.22f, h * 0.18f)
                    lineTo(w * 0.78f, h * 0.18f)
                    cubicTo(w * 0.78f, h * 0.55f, w * 0.68f, h * 0.65f, w * 0.5f, h * 0.68f)
                    cubicTo(w * 0.32f, h * 0.65f, w * 0.22f, h * 0.55f, w * 0.22f, h * 0.18f)
                    close()
                }
                // Base & Stem
                val stemPath = Path().apply {
                    moveTo(w * 0.45f, h * 0.68f)
                    lineTo(w * 0.55f, h * 0.68f)
                    lineTo(w * 0.55f, h * 0.85f)
                    lineTo(w * 0.68f, h * 0.85f)
                    lineTo(w * 0.68f, h * 0.92f)
                    lineTo(w * 0.32f, h * 0.92f)
                    lineTo(w * 0.32f, h * 0.85f)
                    lineTo(w * 0.45f, h * 0.85f)
                    close()
                }
                // Handles left/right
                val leftHandle = Path().apply {
                    moveTo(w * 0.22f, h * 0.25f)
                    cubicTo(w * 0.08f, h * 0.25f, w * 0.08f, h * 0.48f, w * 0.22f, h * 0.48f)
                }
                val rightHandle = Path().apply {
                    moveTo(w * 0.78f, h * 0.25f)
                    cubicTo(w * 0.92f, h * 0.25f, w * 0.92f, h * 0.48f, w * 0.78f, h * 0.48f)
                }

                // Draw shapes
                drawPath(path = leftHandle, color = Color(0xFFFDD835), style = Stroke(width = strokeWidth))
                drawPath(path = rightHandle, color = Color(0xFFFDD835), style = Stroke(width = strokeWidth))
                drawPath(path = cupPath, brush = goldColor)
                drawPath(path = stemPath, brush = goldColor)

                // Shimmer Overlay
                val sweepX = w * trophySweep
                val shimmerColor = Brush.linearGradient(
                    colors = listOf(Color.White.copy(alpha = 0f), Color.White.copy(alpha = 0.5f), Color.White.copy(alpha = 0f)),
                    start = Offset(sweepX - w * 0.3f, 0f),
                    end = Offset(sweepX + w * 0.1f, h)
                )
                // Draw shimmer over cup
                drawPath(path = cupPath, brush = shimmerColor)
            }

            NumeraIconType.XP -> {
                // Diamond shape with concentric radial glow pulsation
                val glowIntensity = xpGlowRadius
                val xpColor = Brush.radialGradient(
                    colors = listOf(Color(0xFF00E5FF), Color(0xFF2979FF)),
                    center = Offset(w/2f, h/2f),
                    radius = w * 0.45f
                )
                
                // Draw radial background glow
                drawCircle(
                    color = Color(0xFF00E5FF).copy(alpha = 0.2f * glowIntensity),
                    radius = w * 0.48f * glowIntensity,
                    center = Offset(w / 2f, h / 2f)
                )

                val diamondPath = Path().apply {
                    moveTo(w * 0.5f, h * 0.1f)   // Top
                    lineTo(w * 0.85f, h * 0.5f)  // Right
                    lineTo(w * 0.5f, h * 0.9f)   // Bottom
                    lineTo(w * 0.15f, h * 0.5f)  // Left
                    close()
                }
                drawPath(path = diamondPath, brush = xpColor)
                // Center accent reflection
                drawCircle(
                    color = Color.White.copy(alpha = 0.45f),
                    radius = strokeWidth * 0.8f,
                    center = Offset(w * 0.45f, h * 0.42f)
                )
            }

            NumeraIconType.Coins -> {
                // Golden coin with sparkle effect
                val coinColor = Brush.radialGradient(
                    colors = listOf(Color(0xFFFFD54F), Color(0xFFFFB300)),
                    center = Offset(w/2f, h/2f),
                    radius = w * 0.45f
                )
                drawCircle(brush = coinColor, radius = w * 0.42f, center = Offset(w/2f, h/2f))
                
                // Inner border
                drawCircle(
                    color = Color(0xFFFF8F00),
                    radius = w * 0.32f,
                    center = Offset(w/2f, h/2f),
                    style = Stroke(width = strokeWidth * 0.6f)
                )
                
                // Embossed dynamic dollar sign $ (with rounded curve)
                val symbolPath = Path().apply {
                    moveTo(w * 0.5f, h * 0.24f)
                    lineTo(w * 0.5f, h * 0.76f)
                    moveTo(w * 0.58f, h * 0.36f)
                    cubicTo(w * 0.4f, h * 0.32f, w * 0.36f, h * 0.46f, w * 0.5f, h * 0.5f)
                    cubicTo(w * 0.64f, h * 0.54f, w * 0.6f, h * 0.68f, w * 0.42f, h * 0.64f)
                }
                drawPath(
                    path = symbolPath,
                    color = Color(0xFFFF8F00),
                    style = Stroke(width = strokeWidth * 0.8f, cap = cap, join = join)
                )
                
                // Tiny star sparkle
                val sparkleAlpha = coinSparkleAlpha
                drawCircle(
                    color = Color.White.copy(alpha = sparkleAlpha),
                    radius = strokeWidth * 0.4f,
                    center = Offset(w * 0.72f, h * 0.28f)
                )
            }

            NumeraIconType.Scratchpad -> {
                val paperColor = tint
                val paperPath = Path().apply {
                    moveTo(w * 0.22f, h * 0.15f)
                    lineTo(w * 0.62f, h * 0.15f)
                    lineTo(w * 0.8f, h * 0.33f)
                    lineTo(w * 0.8f, h * 0.85f)
                    lineTo(w * 0.22f, h * 0.85f)
                    close()
                }
                drawPath(
                    path = paperPath,
                    color = paperColor,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                drawLine(
                    color = paperColor,
                    start = Offset(w * 0.62f, h * 0.15f),
                    end = Offset(w * 0.62f, h * 0.33f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
                drawLine(
                    color = paperColor,
                    start = Offset(w * 0.62f, h * 0.33f),
                    end = Offset(w * 0.8f, h * 0.33f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
                val pencilPath = Path().apply {
                    moveTo(w * 0.35f, h * 0.65f)
                    lineTo(w * 0.65f, h * 0.35f)
                }
                drawPath(
                    path = pencilPath,
                    color = paperColor,
                    style = Stroke(width = strokeWidth * 0.8f, cap = cap, join = join)
                )
                drawLine(
                    color = paperColor.copy(alpha = 0.5f),
                    start = Offset(w * 0.32f, h * 0.45f),
                    end = Offset(w * 0.52f, h * 0.45f),
                    strokeWidth = strokeWidth * 0.6f,
                    cap = cap
                )
                 drawLine(
                    color = paperColor.copy(alpha = 0.5f),
                    start = Offset(w * 0.32f, h * 0.55f),
                    end = Offset(w * 0.48f, h * 0.55f),
                    strokeWidth = strokeWidth * 0.6f,
                    cap = cap
                )
            }

            NumeraIconType.Favorite -> {
                val heartPath = Path().apply {
                    moveTo(w * 0.5f, h * 0.28f)
                    cubicTo(w * 0.5f, h * 0.12f, w * 0.15f, h * 0.12f, w * 0.15f, h * 0.45f)
                    cubicTo(w * 0.15f, h * 0.72f, w * 0.5f, h * 0.9f, w * 0.5f, h * 0.9f)
                    cubicTo(w * 0.5f, h * 0.9f, w * 0.85f, h * 0.72f, w * 0.85f, h * 0.45f)
                    cubicTo(w * 0.85f, h * 0.12f, w * 0.5f, h * 0.12f, w * 0.5f, h * 0.28f)
                    close()
                }
                if (filled) {
                    drawPath(
                        path = heartPath,
                        color = tint
                    )
                } else {
                    drawPath(
                        path = heartPath,
                        color = tint,
                        style = Stroke(width = strokeWidth, cap = cap, join = join)
                    )
                }
            }

            NumeraIconType.Notification -> {
                val bellPath = Path().apply {
                    moveTo(w * 0.5f, h * 0.15f)
                    cubicTo(w * 0.36f, h * 0.18f, w * 0.28f, h * 0.32f, w * 0.28f, h * 0.55f)
                    lineTo(w * 0.2f, h * 0.72f)
                    lineTo(w * 0.8f, h * 0.72f)
                    lineTo(w * 0.72f, h * 0.55f)
                    cubicTo(w * 0.72f, h * 0.32f, w * 0.64f, h * 0.18f, w * 0.5f, h * 0.15f)
                    close()
                }
                drawPath(
                    path = bellPath,
                    color = tint,
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                drawArc(
                    color = tint,
                    startAngle = 0f,
                    sweepAngle = 180f,
                    useCenter = true,
                    topLeft = Offset(w * 0.42f, h * 0.72f),
                    size = Size(w * 0.16f, h * 0.14f),
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
            }

            NumeraIconType.Calculator -> {
                drawRoundRect(
                    color = tint,
                    topLeft = Offset(w * 0.22f, h * 0.15f),
                    size = Size(w * 0.56f, h * 0.7f),
                    cornerRadius = CornerRadius(4.dp.toPx(), 4.dp.toPx()),
                    style = Stroke(width = strokeWidth, cap = cap, join = join)
                )
                drawLine(
                    color = tint,
                    start = Offset(w * 0.22f, h * 0.38f),
                    end = Offset(w * 0.78f, h * 0.38f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.38f, h * 0.55f))
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.62f, h * 0.55f))
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.38f, h * 0.72f))
                drawCircle(color = tint, radius = strokeWidth * 0.6f, center = Offset(w * 0.62f, h * 0.72f))
            }

            NumeraIconType.Tip -> {
                drawCircle(
                    color = tint,
                    radius = w * 0.22f,
                    center = Offset(w * 0.5f, h * 0.38f),
                    style = Stroke(width = strokeWidth)
                )
                drawLine(
                    color = tint,
                    start = Offset(w * 0.38f, h * 0.65f),
                    end = Offset(w * 0.62f, h * 0.65f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
                drawLine(
                    color = tint,
                    start = Offset(w * 0.44f, h * 0.76f),
                    end = Offset(w * 0.56f, h * 0.76f),
                    strokeWidth = strokeWidth,
                    cap = cap
                )
                drawLine(color = tint, start = Offset(w * 0.5f, h * 0.08f), end = Offset(w * 0.5f, h * 0.14f), strokeWidth = strokeWidth * 0.8f, cap = cap)
                drawLine(color = tint, start = Offset(w * 0.2f, h * 0.38f), end = Offset(w * 0.26f, h * 0.38f), strokeWidth = strokeWidth * 0.8f, cap = cap)
                drawLine(color = tint, start = Offset(w * 0.8f, h * 0.38f), end = Offset(w * 0.74f, h * 0.38f), strokeWidth = strokeWidth * 0.8f, cap = cap)
            }
            NumeraIconType.Check -> {
                val checkPath = Path().apply {
                    moveTo(w * 0.24f, h * 0.52f)
                    lineTo(w * 0.43f, h * 0.71f)
                    lineTo(w * 0.78f, h * 0.30f)
                }
                drawPath(path = checkPath, color = tint, style = Stroke(width = strokeWidth * 1.1f, cap = cap, join = join))
            }
            NumeraIconType.ChevronRight -> {
                val p = Path().apply {
                    moveTo(w * 0.40f, h * 0.26f)
                    lineTo(w * 0.64f, h * 0.50f)
                    lineTo(w * 0.40f, h * 0.74f)
                }
                drawPath(path = p, color = tint, style = Stroke(width = strokeWidth, cap = cap, join = join))
            }
            NumeraIconType.ChevronUp -> {
                val p = Path().apply {
                    moveTo(w * 0.26f, h * 0.60f)
                    lineTo(w * 0.50f, h * 0.36f)
                    lineTo(w * 0.74f, h * 0.60f)
                }
                drawPath(path = p, color = tint, style = Stroke(width = strokeWidth, cap = cap, join = join))
            }
            NumeraIconType.ChevronDown -> {
                val p = Path().apply {
                    moveTo(w * 0.26f, h * 0.40f)
                    lineTo(w * 0.50f, h * 0.64f)
                    lineTo(w * 0.74f, h * 0.40f)
                }
                drawPath(path = p, color = tint, style = Stroke(width = strokeWidth, cap = cap, join = join))
            }
        }
    }
}

@Composable
fun CommitmentRelicIcon(
    relicId: String,
    modifier: Modifier = Modifier,
    grayscale: Boolean = false,
    animate: Boolean = true
) {
    val infiniteTransition = rememberInfiniteTransition(label = "RelicTransition")
    
    val sparkOffset by if (animate && relicId == "relic_spark") {
        infiniteTransition.animateFloat(
            initialValue = -2f,
            targetValue = 2f,
            animationSpec = infiniteRepeatable(
                animation = tween(1500, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "sparkAnim"
        )
    } else {
        remember { mutableStateOf(0f) }
    }
    
    val rhythmRotation by if (animate && relicId == "relic_rhythm") {
        infiniteTransition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(
                animation = tween(6000, easing = LinearEasing),
                repeatMode = RepeatMode.Restart
            ),
            label = "rhythmAnim"
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    val sageGlow by if (animate && relicId == "relic_sage") {
        infiniteTransition.animateFloat(
            initialValue = 0.4f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(2000, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "sageGlow"
        )
    } else {
        remember { mutableStateOf(0.7f) }
    }

    // Hoist theme colors before Canvas (MaterialTheme cannot be accessed inside DrawScope)
    val onSurfaceMuted = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
    val onSurfaceSubtle = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
    val onSurface60 = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
    val onSurface70 = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)

    Canvas(modifier = modifier.size(48.dp)) {
        val w = size.width
        val h = size.height
        val cx = w / 2f
        val cy = h / 2f
        
        val baseColor = if (grayscale) onSurfaceMuted else when (relicId) {
            "relic_spark" -> Color(0xFFFF9E80)
            "relic_rhythm" -> Color(0xFF80D8FF)
            "relic_dedication" -> Color(0xFFB9F6CA)
            "relic_sage" -> Color(0xFFFFD700)
            "relic_comeback" -> Color(0xFFFF8A80)
            "relic_burnout_shield" -> Color(0xFFEA80FC)
            else -> onSurface60
        }

        val secondaryColor = if (grayscale) onSurfaceSubtle else when (relicId) {
            "relic_spark" -> Color(0xFFDD2C00)
            "relic_rhythm" -> Color(0xFF0091EA)
            "relic_dedication" -> Color(0xFF00C853)
            "relic_sage" -> Color(0xFFFFAB00)
            "relic_comeback" -> Color(0xFFD50000)
            "relic_burnout_shield" -> Color(0xFFAA00FF)
            else -> onSurface70
        }

        val strokeWidth = 2.dp.toPx()

        when (relicId) {
            "relic_spark" -> {
                drawCircle(color = baseColor.copy(alpha = 0.2f), radius = w * 0.45f)
                drawCircle(color = baseColor, radius = w * 0.45f, style = Stroke(width = strokeWidth))
                
                val path = Path().apply {
                    moveTo(cx, cy - h * 0.25f + sparkOffset)
                    lineTo(cx + w * 0.15f, cy)
                    lineTo(cx, cy + h * 0.25f - sparkOffset)
                    lineTo(cx - w * 0.15f, cy)
                    close()
                }
                drawPath(path = path, brush = Brush.radialGradient(listOf(Color.White, baseColor, secondaryColor)))
                
                drawCircle(color = baseColor, radius = 3f, center = Offset(cx - w * 0.2f, cy - h * 0.1f + sparkOffset))
                drawCircle(color = secondaryColor, radius = 4f, center = Offset(cx + w * 0.22f, cy + h * 0.15f - sparkOffset))
            }
            "relic_rhythm" -> {
                drawCircle(color = baseColor.copy(alpha = 0.1f), radius = w * 0.45f)
                drawCircle(color = baseColor, radius = w * 0.45f, style = Stroke(width = strokeWidth))
                drawCircle(color = secondaryColor, radius = w * 0.28f, style = Stroke(width = strokeWidth * 0.7f))
                
                val angleRad = (rhythmRotation * PI / 180f)
                val nodeX = cx + (w * 0.28f) * cos(angleRad).toFloat()
                val nodeY = cy + (w * 0.28f) * sin(angleRad).toFloat()
                drawCircle(color = if (grayscale) onSurface60 else Color.White, radius = 6f, center = Offset(nodeX, nodeY))
                drawCircle(color = baseColor, radius = 2f, center = Offset(cx, cy))
            }
            "relic_dedication" -> {
                drawCircle(color = baseColor.copy(alpha = 0.1f), radius = w * 0.45f)
                val hexPath = Path()
                for (i in 0 until 6) {
                    val angle = i * PI / 3.0
                    val x = cx + w * 0.4f * cos(angle).toFloat()
                    val y = cy + h * 0.4f * sin(angle).toFloat()
                    if (i == 0) hexPath.moveTo(x, y) else hexPath.lineTo(x, y)
                }
                hexPath.close()
                drawPath(path = hexPath, color = baseColor, style = Stroke(width = strokeWidth))
                
                val innerDiamond = Path().apply {
                    moveTo(cx, cy - h * 0.22f)
                    lineTo(cx + w * 0.22f, cy)
                    lineTo(cx, cy + h * 0.22f)
                    lineTo(cx - w * 0.22f, cy)
                    close()
                }
                drawPath(path = innerDiamond, brush = Brush.verticalGradient(listOf(baseColor, secondaryColor)))
            }
            "relic_sage" -> {
                drawCircle(color = baseColor.copy(alpha = 0.2f * sageGlow), radius = w * 0.45f)
                
                val starPath = Path()
                val outerR = w * 0.45f
                val innerR = w * 0.18f
                for (i in 0 until 16) {
                    val angle = i * PI / 8.0 - PI / 2.0
                    val r = if (i % 2 == 0) outerR else innerR
                    val x = cx + r * cos(angle).toFloat()
                    val y = cy + r * sin(angle).toFloat()
                    if (i == 0) starPath.moveTo(x, y) else starPath.lineTo(x, y)
                }
                starPath.close()
                
                drawPath(path = starPath, brush = Brush.radialGradient(listOf(Color.White, baseColor, secondaryColor)))
                drawPath(path = starPath, color = secondaryColor, style = Stroke(width = strokeWidth))
            }
            "relic_comeback" -> {
                drawCircle(color = baseColor.copy(alpha = 0.15f), radius = w * 0.45f)
                
                val wingPath = Path().apply {
                    moveTo(cx - w * 0.4f, cy - h * 0.2f)
                    cubicTo(cx - w * 0.2f, cy - h * 0.4f, cx + w * 0.2f, cy - h * 0.4f, cx + w * 0.4f, cy - h * 0.2f)
                    lineTo(cx + w * 0.3f, cy + h * 0.2f)
                    cubicTo(cx + w * 0.1f, cy + h * 0.35f, cx - w * 0.1f, cy + h * 0.35f, cx - w * 0.3f, cy + h * 0.2f)
                    close()
                }
                drawPath(path = wingPath, color = baseColor, style = Stroke(width = strokeWidth))
                
                val deltaPath = Path().apply {
                    moveTo(cx, cy - h * 0.18f)
                    lineTo(cx + w * 0.18f, cy + h * 0.15f)
                    lineTo(cx - w * 0.18f, cy + h * 0.15f)
                    close()
                }
                drawPath(path = deltaPath, brush = Brush.verticalGradient(listOf(Color.White, secondaryColor)))
            }
            "relic_burnout_shield" -> {
                drawCircle(color = baseColor.copy(alpha = 0.1f), radius = w * 0.45f)
                
                drawLine(color = baseColor, start = Offset(cx, cy - h * 0.35f), end = Offset(cx, cy + h * 0.38f), strokeWidth = strokeWidth * 1.5f)
                drawLine(color = baseColor, start = Offset(cx - w * 0.25f, cy + h * 0.38f), end = Offset(cx + w * 0.25f, cy + h * 0.38f), strokeWidth = strokeWidth * 2f)
                drawLine(color = secondaryColor, start = Offset(cx - w * 0.35f, cy - h * 0.2f), end = Offset(cx + w * 0.35f, cy - h * 0.2f), strokeWidth = strokeWidth)
                
                drawLine(color = baseColor, start = Offset(cx - w * 0.35f, cy - h * 0.2f), end = Offset(cx - w * 0.35f, cy + h * 0.1f), strokeWidth = strokeWidth * 0.6f)
                drawCircle(color = baseColor, radius = w * 0.08f, center = Offset(cx - w * 0.35f, cy + h * 0.1f))
                
                drawLine(color = baseColor, start = Offset(cx + w * 0.35f, cy - h * 0.2f), end = Offset(cx + w * 0.35f, cy + h * 0.1f), strokeWidth = strokeWidth * 0.6f)
                drawCircle(color = baseColor, radius = w * 0.08f, center = Offset(cx + w * 0.35f, cy + h * 0.1f))
            }
        }
    }
}
