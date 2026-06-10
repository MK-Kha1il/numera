package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Spacing

private data class Cadence(val key: String, val label: String, val blurb: String)

private val CADENCES = listOf(
    Cadence("daily", "Every day", "Small and steady — the fastest way to improve."),
    Cadence("weekdays", "Weekdays", "Mon–Fri. Keep weekends free."),
    Cadence("weekends", "Weekends", "Sat & Sun. Perfect for a relaxed routine."),
    Cadence("custom", "Custom", "Pick the exact days that fit your life."),
)

// 0=Mon … 6=Sun (matches the server's accepted 0–6 range).
private val DAY_LABELS = listOf("M", "T", "W", "T", "F", "S", "S")

/**
 * Phase 8 — habit formation. Framed as a promise to your future self, not a demand from the app.
 */
@Composable
fun HabitStep(
    stepIndex: Int,
    totalSteps: Int,
    onBack: () -> Unit,
    onContinue: (frequency: String, days: List<Int>) -> Unit,
) {
    var frequency by remember { mutableStateOf("daily") }
    val customDays = remember { mutableStateListOf(0, 1, 2, 3, 4) }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "How often will you show up?",
        subtitle = "A promise to your future self. You can change it anytime.",
        primaryLabel = "Make it official",
        nextPreview = "Stay on track",
        onBack = onBack,
        onPrimary = {
            val days = if (frequency == "custom") customDays.sorted().toList() else emptyList()
            onContinue(frequency, days)
        },
    ) {
        SelectGrid(items = CADENCES, columns = 1) { c, cellMod ->
            SelectableCard(
                selected = frequency == c.key,
                onClick = { SoundManager.playClick(); frequency = c.key },
                modifier = cellMod,
            ) {
                Text(text = c.label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                Text(text = c.blurb, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }

        if (frequency == "custom") {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("Which days?")
            SelectGrid(items = (0..6).toList(), columns = 7, spacing = Spacing.xs) { day, cellMod ->
                val isSel = customDays.contains(day)
                SelectableCard(
                    selected = isSel,
                    onClick = {
                        SoundManager.playClick()
                        if (isSel) customDays.remove(day) else customDays.add(day)
                    },
                    modifier = cellMod,
                ) {
                    Text(text = DAY_LABELS[day], style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}
