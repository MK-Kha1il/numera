package com.example.numera.ui.feature.onboarding

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

private data class NotifPreview(val emoji: String, val title: String, val body: String)

private val PREVIEWS = listOf(
    NotifPreview("🔥", "Keep your streak alive", "You're 1 day from a 7-day streak — a 2-minute session keeps it going."),
    NotifPreview("🎯", "Your next challenge is ready", "A fresh problem set tuned to what you're working on is waiting."),
    NotifPreview("🏆", "You're close to a milestone", "Two more sessions and you'll reach Level 12. Nice work."),
)

/**
 * Phase 9 — value-first notification opt-in. We never ask at first launch; by here the learner has
 * already felt the product. We explain the benefit and SHOW example notifications, then request the
 * real Android 13+ runtime permission. "Maybe later" finishes without prompting.
 */
@Composable
fun NotificationsStep(
    stepIndex: Int,
    totalSteps: Int,
    onFinish: (optIn: Boolean) -> Unit,
) {
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted -> onFinish(granted) }

    fun requestOrFinish() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        } else {
            // Pre-13: notifications are allowed without a runtime prompt.
            onFinish(true)
        }
    }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "Stay on track",
        subtitle = "A gentle nudge at the right moment is the difference between a streak and a stall. Here's the kind of thing you'd see:",
        primaryLabel = "Turn on reminders",
        onPrimary = { requestOrFinish() },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            PREVIEWS.forEach { p ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(CornerRadius.l))
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(Spacing.m),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(p.emoji, style = MaterialTheme.typography.headlineSmall)
                    Spacer(Modifier.width(Spacing.m))
                    Column {
                        Text(p.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text(p.body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        Spacer(Modifier.height(Spacing.m))
        Text(
            text = "You're in control — change this anytime in Settings.",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(Spacing.s))
        TextButton(
            onClick = { onFinish(false) },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Maybe later", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
        }
    }
}
