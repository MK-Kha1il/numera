package com.example.numera.ui.feature.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.RatingHistoryEntry
import com.example.numera.theme.*

/**
 * Competitive history (Phase 2 identity / competitive-audit #69): the player's rating timeline — the
 * last handful of rated results, each showing the mode, the delta, and the rating it left them at.
 * This is the Chess.com "rating over time" surface. Fed by GET /api/rating/history (global domain);
 * renders nothing until the player has rated results.
 */

private fun modeLabel(gameMode: String): String = when (gameMode) {
    "duel" -> "Duel"
    "reasoning" -> "Reasoning"
    "level", "" -> "Practice"
    "puzzle_rush" -> "Puzzle Rush"
    "tournament" -> "Tournament"
    else -> gameMode.replaceFirstChar { it.uppercase() }
}

private fun relativeTime(createdAtSeconds: Long, nowSeconds: Long): String {
    val d = (nowSeconds - createdAtSeconds).coerceAtLeast(0)
    return when {
        d < 60 -> "just now"
        d < 3600 -> "${d / 60}m ago"
        d < 86400 -> "${d / 3600}h ago"
        else -> "${d / 86400}d ago"
    }
}

@Composable
fun RatingHistoryCard(
    history: List<RatingHistoryEntry>?,
    modifier: Modifier = Modifier,
) {
    if (history.isNullOrEmpty()) return
    val now = System.currentTimeMillis() / 1000

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(
                text = "📈 Rating History",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Your recent rated results and where they left your rating.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            history.take(10).forEach { e ->
                val up = e.delta >= 0
                val deltaInt = e.delta.toInt()
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = modeLabel(e.gameMode), fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                        Text(text = relativeTime(e.createdAt, now), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                    Text(
                        text = "${if (up) "▲ +" else "▼ "}$deltaInt",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = if (up) CorrectGreen else WrongRed,
                    )
                    Text(
                        text = "→ ${e.displayAfter}",
                        modifier = Modifier.padding(start = Spacing.m),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
            }
        }
    }
}
