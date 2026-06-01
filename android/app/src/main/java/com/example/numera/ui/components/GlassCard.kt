package com.example.numera.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ripple
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import androidx.compose.animation.core.*
import androidx.compose.ui.graphics.graphicsLayer

@Composable
fun DuoCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(20.dp),
    borderColor: Color = MaterialTheme.colorScheme.outline,
    backgroundColor: Color = MaterialTheme.colorScheme.surfaceVariant,
    content: @Composable BoxScope.() -> Unit
) {
    val cardGradient = Brush.verticalGradient(
        colors = listOf(
            backgroundColor,
            backgroundColor.copy(alpha = 0.88f)
        )
    )
    Box(
        modifier = modifier
            .clip(shape)
            .background(cardGradient)
            .border(BorderStroke(2.dp, borderColor), shape = shape)
            .padding(16.dp)
    ) {
        content()
    }
}

@Composable
fun DuoButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    enabled: Boolean = true
) {
    val depthColor = when (color) {
        DuoPrimary -> DuoPrimaryPressed
        DuoSecondary -> DuoSecondaryPressed
        DuoTertiary -> DuoTertiaryPressed
        CyberPrimary -> CyberPrimaryPressed
        CyberSecondary -> CyberSecondaryPressed
        CyberTertiary -> CyberTertiaryPressed
        EclipsePrimary -> EclipsePrimaryPressed
        EclipseSecondary -> EclipseSecondaryPressed
        EclipseTertiary -> EclipseTertiaryPressed
        EmeraldPrimary -> EmeraldPrimaryPressed
        EmeraldSecondary -> EmeraldSecondaryPressed
        EmeraldTertiary -> EmeraldTertiaryPressed
        CrimsonPrimary -> CrimsonPrimaryPressed
        CrimsonSecondary -> CrimsonSecondaryPressed
        CrimsonTertiary -> CrimsonTertiaryPressed
        AuroraPrimary -> AuroraPrimaryPressed
        AuroraSecondary -> AuroraSecondaryPressed
        AuroraTertiary -> AuroraTertiaryPressed
        OceanPrimary -> OceanPrimaryPressed
        OceanSecondary -> OceanSecondaryPressed
        OceanTertiary -> OceanTertiaryPressed
        SunsetPrimary -> SunsetPrimaryPressed
        SunsetSecondary -> SunsetSecondaryPressed
        SunsetTertiary -> SunsetTertiaryPressed
        MidnightPrimary -> MidnightPrimaryPressed
        MidnightSecondary -> MidnightSecondaryPressed
        MidnightTertiary -> MidnightTertiaryPressed
        else -> color.copy(alpha = 0.8f)
    }

    val shape = RoundedCornerShape(16.dp)
    val isPressed = remember { mutableStateOf(false) }
    val bottomDepth = 4.dp
    val offset = if (isPressed.value && enabled) bottomDepth else 0.dp

    val scale by animateFloatAsState(
        targetValue = if (isPressed.value && enabled) 0.95f else 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "duoButtonScale"
    )

    val buttonGradient = Brush.verticalGradient(
        colors = if (enabled) {
            listOf(
                color,
                depthColor
            )
        } else {
            listOf(
                Color(0xFFE5E5E5),
                Color(0xFFCCCCCC)
            )
        }
    )

    Box(
        modifier = modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .pointerInput(enabled) {
                if (enabled) {
                    detectTapGestures(
                        onPress = {
                            isPressed.value = true
                            tryAwaitRelease()
                            isPressed.value = false
                        },
                        onTap = {
                            SoundManager.playClick()
                            com.example.numera.haptic.HapticManager.playSoft()
                            onClick()
                        }
                    )
                }
            }
            .drawBehind {
                if (enabled) {
                    drawRoundRect(
                        color = depthColor,
                        cornerRadius = CornerRadius(16.dp.toPx(), 16.dp.toPx())
                    )
                }
            }
            .padding(bottom = if (isPressed.value && enabled) 0.dp else bottomDepth)
            .offset(y = offset)
            .clip(shape)
            .background(buttonGradient)
            .border(BorderStroke(1.dp, if (enabled) depthColor else Color(0xFFCCCCCC)), shape = shape)
            .padding(vertical = 12.dp, horizontal = 24.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text.uppercase(),
            style = TextStyle(
                color = if (enabled) Color.White else Color(0xFFAFAFAF),
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp
            )
        )
    }
}

// Legacy Mappings for smooth migration
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(20.dp),
    borderWidth: Dp = 2.dp,
    borderColor: Color = MaterialTheme.colorScheme.outline,
    content: @Composable BoxScope.() -> Unit
) {
    DuoCard(
        modifier = modifier,
        shape = shape,
        borderColor = borderColor,
        backgroundColor = MaterialTheme.colorScheme.surfaceVariant,
        content = content
    )
}

@Composable
fun NeonButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.primary,
    enabled: Boolean = true
) {
    DuoButton(
        text = text,
        onClick = onClick,
        modifier = modifier,
        color = color,
        enabled = enabled
    )
}

@Composable
fun NeonText(
    text: String,
    modifier: Modifier = Modifier,
    style: TextStyle = TextStyle(),
    glowColor: Color = MaterialTheme.colorScheme.primary
) {
    Text(
        text = text,
        style = style.copy(
            color = glowColor,
            fontWeight = FontWeight.ExtraBold
        ),
        modifier = modifier
    )
}

@Composable
fun GlossyProgressBar(
    progress: Float,
    isCompleted: Boolean,
    modifier: Modifier = Modifier
) {
    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.secondary
    val targetColor = if (isCompleted) CorrectGreen else secondaryColor
    val trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)

    val infiniteTransition = rememberInfiniteTransition(label = "glossyProgress")
    val translateAnim by infiniteTransition.animateFloat(
        initialValue = -300f,
        targetValue = 600f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "translateAnim"
    )

    val gradientBrush = remember(isCompleted) {
        if (isCompleted) {
            Brush.horizontalGradient(
                colors = listOf(CorrectGreen, CorrectGreenPressed)
            )
        } else {
            Brush.horizontalGradient(
                colors = listOf(primaryColor, targetColor)
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(14.dp)
            .clip(RoundedCornerShape(7.dp))
            .background(trackColor)
    ) {
        if (progress > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .fillMaxWidth(progress)
                    .background(brush = gradientBrush)
            ) {
                // Diagonal sweeping white shimmer reflection
                val shimmerBrush = Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0f),
                        Color.White.copy(alpha = 0.35f),
                        Color.White.copy(alpha = 0f)
                    ),
                    start = androidx.compose.ui.geometry.Offset(translateAnim, 0f),
                    end = androidx.compose.ui.geometry.Offset(translateAnim + 120f, 60f)
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(shimmerBrush)
                )
                
                // Subtle horizontal glass reflection on upper half
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .fillMaxHeight(0.35f)
                        .background(Color.White.copy(alpha = 0.12f))
                )
            }
        }
    }
}

@Composable
fun ClaimButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ClaimPulse")
    val shimmerX by infiniteTransition.animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1600, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scalePulse"
    )

    Box(
        modifier = modifier
            .graphicsLayer(scaleX = scale, scaleY = scale)
            .clip(RoundedCornerShape(10.dp))
            .background(
                Brush.horizontalGradient(
                    colors = listOf(Color(0xFF58CC02), Color(0xFF86E800), Color(0xFF58CC02)),
                    startX = shimmerX * 200f,
                    endX = shimmerX * 200f + 200f
                )
            )
            .border(1.dp, Color.White.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
            .clickable {
                SoundManager.playClick()
                com.example.numera.haptic.HapticManager.playMedium()
                onClick()
            }
            .padding(horizontal = 12.dp, vertical = 7.dp),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "CLAIM",
            color = Color.White,
            fontWeight = FontWeight.Black,
            fontSize = 11.sp,
            letterSpacing = 0.8.sp,
            maxLines = 1,
            softWrap = false
        )
    }
}
