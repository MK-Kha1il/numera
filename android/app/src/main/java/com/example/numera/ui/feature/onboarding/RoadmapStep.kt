package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RoadmapCategory
import com.example.numera.data.network.RoadmapResponse
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Phase 5 — the personalized outcome screen. Turns the diagnostic into an honest, optimistic
 * picture: where you're starting, what you're already good at, what you'll grow, and soft milestone
 * estimates. Optimism without over-promising ("could", "approximately").
 */
@Composable
fun RoadmapStep(
    stepIndex: Int,
    totalSteps: Int,
    api: ApiService,
    token: String,
    onContinue: () -> Unit,
) {
    var roadmap by remember { mutableStateOf<RoadmapResponse?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        roadmap = runCatching { withContext(Dispatchers.IO) { api.getOnboardingRoadmap(token) } }.getOrNull()
        loading = false
    }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "Your personalized path",
        subtitle = "Built from how you just did — not a generic plan.",
        primaryLabel = "Let's try one",
        primaryEnabled = !loading,
        nextPreview = "Solve your first problem",
        onPrimary = onContinue,
    ) {
        val r = roadmap
        if (loading || r == null) {
            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@OnboardingScaffold
        }

        // Placement headline.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(CornerRadius.l))
                .background(MaterialTheme.colorScheme.primaryContainer)
                .padding(Spacing.l),
        ) {
            Column {
                Text("You're starting at", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f))
                Text("Level ${r.placedLevel}  ·  ${r.rank}", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onPrimaryContainer)
            }
        }

        if (r.strengths.isNotEmpty()) {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("You already show strength in")
            CategoryList(r.strengths, accent = true)
        }

        if (r.growth.isNotEmpty()) {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("You'll focus on growing")
            CategoryList(r.growth, accent = false)
        }

        if (r.milestones.isNotEmpty()) {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("Milestones you could reach")
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                r.milestones.forEach { m ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(CornerRadius.m))
                            .background(MaterialTheme.colorScheme.surface)
                            .padding(Spacing.m),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier.size(Spacing.xxl).clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.secondaryContainer),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("~${m.weeks}w", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondaryContainer)
                        }
                        Spacer(Modifier.size(Spacing.m))
                        Text(m.label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryList(items: List<RoadmapCategory>, accent: Boolean) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
        items.forEach { c ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(CornerRadius.m))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = Spacing.m, vertical = Spacing.s),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = c.label,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = if (accent) CorrectGreen else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                c.accuracy?.let {
                    Text("$it%", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}
