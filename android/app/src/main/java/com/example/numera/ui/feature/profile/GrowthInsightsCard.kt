package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.GrowthProfileResponse
import com.example.numera.data.network.GrowthWatchArea
import com.example.numera.theme.*

/**
 * Growth Insights (ultra review edu#44): the learning-intelligence engine has always tracked which
 * concepts a learner is strong at and which error *habits* keep recurring — but the learner never
 * saw it. This card surfaces that: a short list of strengths, and the recurring slip-ups framed as
 * "habits to watch" (kindly, never as failures). Fed by GET /api/engine/growth-profile.
 *
 * Renders nothing until there's something to show, so a brand-new account isn't greeted by an empty
 * box. Every state signal carries text + an icon (not colour alone) for accessibility (#75).
 */
@Composable
fun GrowthInsightsCard(
    profile: GrowthProfileResponse?,
    modifier: Modifier = Modifier,
    onPracticeMistakes: (() -> Unit)? = null,
) {
    if (profile == null) return
    if (profile.strengths.isEmpty() && profile.watchAreas.isEmpty()) return

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
            Text(
                text = "🌱 Growth Insights",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "What your practice shows — the things you've got down, and the habits worth a second look.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            if (profile.strengths.isNotEmpty()) {
                Text(
                    text = "💪 You're strong at",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                profile.strengths.forEach { s ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(CornerRadius.m))
                            .background(CorrectGreen.copy(alpha = 0.10f))
                            .padding(horizontal = Spacing.m, vertical = Spacing.s),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            Text(text = "✓", fontSize = 13.sp, fontWeight = FontWeight.Black, color = CorrectGreen)
                            Text(
                                text = s.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
                            )
                        }
                        Text(
                            text = "${s.successRate}%",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = CorrectGreen,
                        )
                    }
                }
            }

            if (profile.watchAreas.isNotEmpty()) {
                Text(
                    text = "👀 Habits to watch",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                profile.watchAreas.forEach { w -> WatchAreaRow(w) }
                Text(
                    text = "Tap any habit for the fix. These aren't failures — they're your fastest wins.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                    lineHeight = 15.sp,
                )
                if (onPracticeMistakes != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(CornerRadius.m))
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f))
                            .clickable { onPracticeMistakes() }
                            .padding(vertical = Spacing.m),
                    ) {
                        Text(
                            text = "🎯 Practice these now",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.align(Alignment.Center),
                        )
                    }
                }
            }
        }
    }
}

// Severity → plain-language framing + an icon, so the signal never relies on colour alone (#75).
private data class SeverityMeta(val icon: String, val phrase: String)

private fun severityMeta(severity: String?): SeverityMeta = when (severity) {
    "high" -> SeverityMeta("🔁", "Keeps coming up")
    "medium" -> SeverityMeta("•", "Showing up a few times")
    else -> SeverityMeta("·", "A minor slip")
}

@Composable
private fun WatchAreaRow(w: GrowthWatchArea) {
    val meta = severityMeta(w.severity)
    val hasTip = !w.tip.isNullOrBlank()
    var expanded by remember { mutableStateOf(false) }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
            .then(if (hasTip) Modifier.clickable { expanded = !expanded } else Modifier)
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
        verticalAlignment = Alignment.Top,
    ) {
        Text(text = meta.icon, fontSize = 13.sp)
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    text = w.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
                    lineHeight = 16.sp,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (hasTip) {
                    Text(
                        text = if (expanded) "▲ fix" else "▼ fix",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
            val context = buildString {
                w.conceptName?.takeIf { it.isNotBlank() }?.let { append("in $it · ") }
                append(meta.phrase)
            }
            Text(
                text = context,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
            if (expanded && hasTip) {
                Text(
                    text = "💡 ${w.tip}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                    lineHeight = 15.sp,
                )
            }
        }
    }
}
