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
import com.example.numera.data.network.RivalEntry
import com.example.numera.theme.*

/**
 * Rivals (Phase 2 identity, audit #71): the player's head-to-head record against each human opponent
 * they've faced, most-played first. Renders nothing until there's a repeat opponent, so it stays out
 * of the way for new/solo players. Fed by GET /api/rating/rivals.
 */
@Composable
fun RivalsCard(
    rivals: List<RivalEntry>?,
    modifier: Modifier = Modifier,
) {
    // Only worth showing once there's an actual rivalry (someone faced more than once, or several foes).
    val meaningful = rivals?.filter { it.total >= 2 } ?: emptyList()
    if (meaningful.isEmpty()) return

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(
                text = "🤺 Rivals",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "Your head-to-head record against the players you've faced most.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            meaningful.take(8).forEach { r ->
                val leading = r.wins > r.losses
                val even = r.wins == r.losses
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = r.opponentName,
                        modifier = Modifier.weight(1f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text = "${r.wins}–${r.losses}${if (r.draws > 0) "–${r.draws}" else ""}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black,
                        color = when {
                            even -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            leading -> CorrectGreen
                            else -> WrongRed
                        },
                    )
                }
            }
        }
    }
}
