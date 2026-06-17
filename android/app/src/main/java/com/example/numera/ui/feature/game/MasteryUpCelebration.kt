package com.example.numera.ui.feature.game

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.VictoryParticles

/**
 * The signature "mastery-up" moment (ultra-review #20). Mastery is Numera's crown jewel, yet
 * until now only *activity* events (level-up, streak) got a celebration while *learning* events
 * passed silently. This is the biggest, most deliberate celebration in the learning loop: a
 * full-screen takeover with a confetti burst and a spring-scaled crown, fired when the server
 * reports a category crossed a mastery milestone.
 *
 * Reduced-motion is respected by [VictoryParticles] / the shared MotionManager downstream.
 */
@Composable
fun MasteryUpCelebration(
    category: String,
    label: String,
    onContinue: () -> Unit,
) {
    var revealed by remember { mutableStateOf(false) }
    var burst by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (revealed) 1f else 0.4f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "masteryScale",
    )
    LaunchedEffect(Unit) {
        revealed = true
        burst = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.scrim.copy(alpha = 0.92f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .scale(scale)
                .padding(Spacing.xl),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.m),
        ) {
            Text(text = "👑", fontSize = 72.sp)
            Text(
                text = "MASTERY UP",
                fontSize = 30.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFFFFD54A), // gold — the celebration accent, not a state signal
                textAlign = TextAlign.Center,
            )
            Text(
                // Category name + the tier reached: text carries the meaning, never color alone.
                text = "${category.replaceFirstChar { it.uppercase() }} — $label",
                fontSize = 20.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Text(
                text = "You've grown a real, lasting skill here — not just points. This is the part that sticks.",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.8f),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = Spacing.l),
            )
            DuoButton(
                text = "Keep climbing",
                onClick = onContinue,
                color = Color(0xFFFFD54A),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.m, start = Spacing.xl, end = Spacing.xl),
            )
        }

        VictoryParticles(trigger = burst) { burst = false }
    }
}
