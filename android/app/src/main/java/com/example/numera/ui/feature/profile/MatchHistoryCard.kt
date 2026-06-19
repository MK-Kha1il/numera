package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MatchHistoryEntry
import com.example.numera.theme.*

/**
 * Competitive match history (Phase 2 identity, audit #69/#71): the player's recent head-to-head
 * results — opponent, scoreline, win/loss, and the rating it moved. The seed of rivalry records.
 * Fed by GET /api/rating/matches; renders nothing until the player has competed.
 */

private fun modeLabel(mode: String): String = when (mode) {
    "duel" -> "Duel"
    "reasoning" -> "Reasoning"
    else -> mode.replaceFirstChar { it.uppercase() }
}

private fun ago(createdAtSeconds: Long, nowSeconds: Long): String {
    val d = (nowSeconds - createdAtSeconds).coerceAtLeast(0)
    return when {
        d < 60 -> "now"
        d < 3600 -> "${d / 60}m"
        d < 86400 -> "${d / 3600}h"
        else -> "${d / 86400}d"
    }
}

@Composable
fun MatchHistoryCard(
    matches: List<MatchHistoryEntry>?,
    modifier: Modifier = Modifier,
) {
    if (matches.isNullOrEmpty()) return
    val now = System.currentTimeMillis() / 1000

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(
                text = "⚔️ Match History",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )

            matches.take(8).forEach { m ->
                val (badge, badgeColor) = when (m.result) {
                    "win" -> "W" to CorrectGreen
                    "loss" -> "L" to WrongRed
                    else -> "D" to MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                }
                val delta = m.ratingDelta.toInt()
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.m),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier.size(24.dp).clip(RoundedCornerShape(CornerRadius.s)).background(badgeColor.copy(alpha = 0.18f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(text = badge, fontSize = 12.sp, fontWeight = FontWeight.Black, color = badgeColor)
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "vs ${m.opponentName ?: "Opponent"}",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onBackground,
                        )
                        Text(
                            text = "${modeLabel(m.mode)} · ${m.myScore}–${m.oppScore} · ${ago(m.createdAt, now)}",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                        )
                    }
                    if (delta != 0) {
                        Text(
                            text = "${if (delta > 0) "+" else ""}$delta",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = if (delta > 0) CorrectGreen else WrongRed,
                        )
                    }
                }
            }
        }
    }
}
