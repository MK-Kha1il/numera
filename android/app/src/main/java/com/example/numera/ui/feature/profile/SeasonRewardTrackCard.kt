package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.RewardTier
import com.example.numera.data.network.RewardTrackResponse
import com.example.numera.ui.components.RankBadge
import com.example.numera.theme.*

/**
 * Seasonal Rank Reward track (competitive audit Top-25 #4, the Rocket League pattern). For the active
 * season, each metal tier shows its reward and your status: claimable once you've REACHED it (by
 * season peak), permanently locked-in once claimed, and locked until reached. Tokens feed the
 * prestige-cosmetic economy, so the chase has a destination. Fed by GET /api/rating/reward-track.
 */
@Composable
fun SeasonRewardTrackCard(
    track: RewardTrackResponse?,
    onClaim: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (track == null || track.tiers.isEmpty()) return

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
                    text = "🎖️ Season Rewards",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                )
                if (track.season.daysRemaining > 0) {
                    Text(
                        text = "${track.season.daysRemaining}d left",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }
            Text(
                text = "Reach a tier this season to claim its reward. The track resets when the season ends.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            track.tiers.forEach { tier -> RewardTierRow(tier = tier, onClaim = onClaim) }
        }
    }
}

@Composable
private fun RewardTierRow(tier: RewardTier, onClaim: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
        ) {
            RankBadge(rankName = tier.tierName, modifier = Modifier.size(IconSize.s))
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(text = tier.tierName, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
                Text(
                    text = "🪙 ${tier.coins} · 🎟️ ${tier.tokens} token${if (tier.tokens == 1) "" else "s"}",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                )
                if (tier.cosmetic != null) {
                    // The season-exclusive earn-only Champion banner (audit #14).
                    Text(
                        text = "🎁 Season-exclusive banner",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.tertiary,
                    )
                }
            }
        }

        when {
            tier.claimed -> Text(
                text = "✓ Claimed",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = CorrectGreen,
            )
            tier.reached -> Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(MaterialTheme.colorScheme.primary)
                    .clickable { onClaim(tier.tierIndex) }
                    .padding(horizontal = Spacing.m, vertical = Spacing.xs),
            ) {
                Text(text = "Claim", fontSize = 12.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onPrimary)
            }
            else -> Text(
                text = "🔒",
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
            )
        }
    }
}
