package com.example.numera.ui.feature.profile

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import com.example.numera.data.network.MasteryProfile
import com.example.numera.theme.*

/**
 * Multi-dimensional mastery breakdown (Sprint 3). Shows the four learner-model dimensions —
 * accuracy, fluency, retention, independence — as labelled bars, the overall stage, and a
 * targeted focus tip for the single weakest dimension. Fed by GET /api/engine/learner's
 * `masteryProfile` aggregate; renders nothing until the learner has practiced enough to have one.
 */

private data class DimensionMeta(val key: String, val label: String, val blurb: String, val color: Color)

// Client mirror of server masteryEngine: dimensions (display order) + the focus copy per weakness.
private val DIMENSIONS = listOf(
    DimensionMeta("accuracy", "Accuracy", "Getting it right", CorrectGreen),
    DimensionMeta("fluency", "Fluency", "Solving quickly", DuoSecondary),
    DimensionMeta("retention", "Retention", "Remembering over time", DuoTertiary),
    DimensionMeta("independence", "Independence", "Solving unaided", MedalGold),
    DimensionMeta("transfer", "Transfer", "Applying it in a new context", TransferViolet),
)

private val FOCUS_COPY = mapOf(
    "accuracy" to "Revisit the concept itself — accuracy is the foundation everything builds on.",
    "fluency" to "You understand it — now build speed. Try timed drills to make it automatic.",
    "retention" to "It's fading between sessions. Come back after a short break to lock it in.",
    "independence" to "Try a few without hints or the calculator to turn understanding into confidence.",
    "transfer" to "You can solve the standard form — now apply it in a new, unfamiliar context to prove you understand it.",
)

@Composable
fun MasteryProfileCard(
    profile: MasteryProfile?,
    modifier: Modifier = Modifier,
) {
    if (profile == null) return

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "🧭 Skill Mastery",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                )
                if (profile.stage.isNotBlank()) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(CornerRadius.full))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                            .padding(horizontal = Spacing.m, vertical = Spacing.xs),
                    ) {
                        Text(
                            text = profile.stage,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    }
                }
            }

            Text(
                text = "How your understanding breaks down — not just whether you're right, but whether it's fast, sticky, and unaided.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            DIMENSIONS.forEach { dim ->
                val value = when (dim.key) {
                    "accuracy" -> profile.dimensions.accuracy
                    "fluency" -> profile.dimensions.fluency
                    "retention" -> profile.dimensions.retention
                    "independence" -> profile.dimensions.independence
                    else -> profile.dimensions.transfer
                }
                DimensionRow(
                    label = dim.label,
                    blurb = dim.blurb,
                    value = value,
                    color = dim.color,
                    isWeakest = profile.weakest == dim.key,
                )
            }

            // Targeted next step for the single weakest dimension (fading guidance, not a scold).
            profile.weakest?.let { weak ->
                FOCUS_COPY[weak]?.let { tip ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(CornerRadius.m))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                            .padding(Spacing.m),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                    ) {
                        Text(text = "🎯", fontSize = 14.sp)
                        Text(
                            text = tip,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                            lineHeight = 17.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DimensionRow(
    label: String,
    blurb: String,
    value: Float,
    color: Color,
    isWeakest: Boolean,
) {
    var target by remember(value) { mutableStateOf(0f) }
    LaunchedEffect(value) { target = value.coerceIn(0f, 1f) }
    val progress by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing),
        label = "DimensionProgress",
    )

    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(text = label, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                if (isWeakest) {
                    Text(text = "· focus", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }
            Text(
                text = "${(value.coerceIn(0f, 1f) * 100).toInt()}%",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(10.dp)
                .clip(RoundedCornerShape(CornerRadius.s))
                .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        ) {
            if (progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(10.dp)
                        .clip(RoundedCornerShape(CornerRadius.s))
                        .background(color),
                )
            }
        }

        Text(
            text = blurb,
            fontSize = 10.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        )
    }
}
