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
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.DomainRating
import com.example.numera.data.network.SeasonAward
import com.example.numera.ui.components.RankBadge
import com.example.numera.theme.*

/**
 * Unified competitive identity (docs/specs/Spec-RatingUnification.md + competitive-audit Top-25 #6).
 * Leads with the ONE competitive rank (now fed by both solo practice and ranked duels), then expresses
 * the learner's real differentiator — per-domain skill — as "specialties", strongest first, with the
 * top played domain flagged as their "main". Fed by GET /api/rating/profile; renders nothing until the
 * learner has a rating profile.
 */

private val DOMAIN_LABELS = mapOf(
    "arithmetic" to "Arithmetic",
    "algebra" to "Algebra",
    "geometry" to "Geometry",
    "calculus" to "Calculus",
    "combinatorics" to "Combinatorics",
    "number_theory" to "Number Theory",
    "statistics" to "Statistics",
    "probability" to "Probability",
)

private fun isUnranked(r: DomainRating) = r.sessionsCount < 5 || r.rank.contains("Unranked")

@Composable
fun CompetitiveRankCard(
    profile: Map<String, DomainRating>?,
    modifier: Modifier = Modifier,
    seasonHistory: List<SeasonAward>? = null,
) {
    if (profile.isNullOrEmpty()) return
    val global = profile["global"] ?: return

    // Specialties = the math domains the learner has actually played, strongest display rating first.
    val specialties = profile.entries
        .filter { it.key != "global" && it.value.sessionsCount > 0 }
        .sortedByDescending { it.value.displayRating }
        .map { it.key to it.value }
    // "Main" = the strongest domain that is actually out of placement.
    val mainKey = specialties.firstOrNull { !isUnranked(it.second) }?.first

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
            Text(
                text = "🏆 Competitive Rank",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
            )
            Text(
                text = "One rating, earned across solo practice and ranked duels.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )

            // Hero row: the overall rank.
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.m),
            ) {
                RankBadge(rankName = global.rank, modifier = Modifier.size(IconSize.l))
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text(
                        text = if (isUnranked(global)) "Unranked" else global.rank,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground,
                    )
                    Text(
                        text = if (isUnranked(global)) {
                            "Play ${5 - global.sessionsCount.coerceAtMost(5)} more rated session(s) to be placed"
                        } else {
                            "Rating ${global.displayRating} · ${global.sessionsCount} rated"
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }

            if (specialties.isNotEmpty()) {
                Text(
                    text = "Specialties",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                specialties.forEach { (key, dr) ->
                    DomainRankRow(
                        label = DOMAIN_LABELS[key] ?: key,
                        rating = dr,
                        isMain = key == mainKey,
                    )
                }
            }

            // Past Seasons (Act Rank): permanent badges of the peak rank reached each ended season.
            if (!seasonHistory.isNullOrEmpty()) {
                Text(
                    text = "Past Seasons",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                seasonHistory.forEach { award ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                        ) {
                            RankBadge(rankName = award.peakRank, modifier = Modifier.size(IconSize.s))
                            Text(
                                text = award.seasonName,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onBackground,
                            )
                        }
                        Text(
                            text = "Peak: ${award.peakRank}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun DomainRankRow(
    label: String,
    rating: DomainRating,
    isMain: Boolean,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
        ) {
            RankBadge(rankName = rating.rank, modifier = Modifier.size(IconSize.s))
            Text(text = label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onBackground)
            if (isMain) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(CornerRadius.full))
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.14f))
                        .padding(horizontal = Spacing.s, vertical = Spacing.xs),
                ) {
                    Text(text = "main", fontSize = 10.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
        Text(
            text = if (isUnranked(rating)) "Unranked" else "${rating.rank} · ${rating.displayRating}",
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
        )
    }
}
