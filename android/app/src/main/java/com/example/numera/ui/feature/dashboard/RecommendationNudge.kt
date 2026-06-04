package com.example.numera.ui.feature.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.NextRecommendationResponse
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton

/**
 * Home-screen "what should I do next?" nudge, driven by the orchestrator's `/api/engine/next`
 * recommendation (mathEngine/problemOrchestrator.js `selectNextConcept`). It makes the engine's
 * reasoning visible and actionable — most importantly the Sprint-3/4 reasons `dimension_building`
 * (sharpen a weak edge) and `transfer_practice` (apply a mastered concept in a new context).
 *
 * Renders nothing for low-signal reasons (exploration/challenge/mastery_building/fallback) — those
 * are already covered by the "Continue Learning" hero, so we don't clutter the home screen.
 */

private data class NudgeCopy(val emoji: String, val title: String, val cta: String, val isTransfer: Boolean)

@Composable
fun RecommendationNudge(
    recommendation: NextRecommendationResponse?,
    onTakeTransferChallenge: () -> Unit,
    onContinueLearning: () -> Unit,
    onReview: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val reason = recommendation?.reason ?: return

    val copy = when (reason) {
        "transfer_practice" -> NudgeCopy("🧩", "Ready for a transfer challenge?", "Take the challenge", isTransfer = true)
        "dimension_building" -> NudgeCopy("🎯", "Sharpen a specific skill", "Keep practising", isTransfer = false)
        "misconception_remediation" -> NudgeCopy("🛠️", "Let's untangle a tricky spot", "Practise it", isTransfer = false)
        "retention_review" -> NudgeCopy("🔁", "Time for a quick review", "Review now", isTransfer = false)
        "prerequisite_gap" -> NudgeCopy("🔑", "Shore up a foundation", "Practise it", isTransfer = false)
        else -> return // low-signal — don't render
    }

    // Body text: prefer the server-authored focus message when present (dimension_building), else
    // a tailored default per reason.
    val body = recommendation.meta?.focus?.message ?: when (reason) {
        "transfer_practice" -> "You've mastered a concept the standard way. Prove you really get it by applying it in a fresh, unfamiliar context."
        "misconception_remediation" -> "A recurring slip is worth a focused pass — let's turn it into a strength."
        "retention_review" -> "A concept you learned is starting to fade. A short review now locks it back in."
        "prerequisite_gap" -> "Strengthening a building-block concept will unlock the topics that depend on it."
        else -> "You've got the idea — now deepen it by building speed or solving it unaided."
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.25f), RoundedCornerShape(CornerRadius.l))
            .padding(Spacing.l),
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(text = copy.emoji, fontSize = 18.sp)
            Text(
                text = copy.title,
                fontSize = 15.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Text(
            text = body,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
            lineHeight = 18.sp,
        )
        DuoButton(
            text = copy.cta,
            onClick = {
                when (reason) {
                    "transfer_practice" -> onTakeTransferChallenge()
                    "retention_review" -> onReview()   // open the Spaced Review tab, not just the level map
                    else -> onContinueLearning()
                }
            },
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.primary,
        )
    }
}
