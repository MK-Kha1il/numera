package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.example.numera.data.network.OnboardingCatalogItem
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Spacing

/**
 * Phase 2 — multi-select motivational goals. Aspirational ("why are you here"), not the quantitative
 * user_goals. The selection shapes the rest of the experience, so we ask for it before teaching.
 */
@Composable
fun GoalsStep(
    stepIndex: Int,
    totalSteps: Int,
    motivations: List<OnboardingCatalogItem>,
    onContinue: (List<String>) -> Unit,
) {
    val selected = remember { mutableStateListOf<String>() }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "What brings you to Numera?",
        subtitle = "Pick all that apply — this shapes the path we build for you.",
        primaryLabel = if (selected.isEmpty()) "Select at least one" else "Continue",
        primaryEnabled = selected.isNotEmpty(),
        nextPreview = "Make it yours",
        onPrimary = { onContinue(selected.toList()) },
    ) {
        if (motivations.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@OnboardingScaffold
        }
        SelectGrid(items = motivations, columns = 2) { item, cellMod ->
            val isSel = selected.contains(item.key)
            SelectableCard(
                selected = isSel,
                onClick = {
                    SoundManager.playClick()
                    if (isSel) selected.remove(item.key) else selected.add(item.key)
                },
                modifier = cellMod,
            ) {
                Text(text = item.emoji, style = MaterialTheme.typography.headlineSmall)
                Text(
                    text = item.label,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}
