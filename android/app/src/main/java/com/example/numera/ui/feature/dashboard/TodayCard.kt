package com.example.numera.ui.feature.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.TodayResponse
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * The "Today" composer card: ONE ordered session plan (review → learn → puzzle → duel →
 * growth) assembled server-side by /api/today from the SRS queue + the four daily quests.
 * Quests, SRS, plans and commitments each answer "what should I do now?" separately — this
 * card is the single surface that resolves them, in pedagogical order, with done-states.
 *
 * Done state is signaled by a check glyph + strikethrough + dimming (never color alone).
 */
@Composable
fun TodayCard(
    today: TodayResponse,
    onItemClick: (key: String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (today.items.isEmpty()) return
    val doneCount = today.items.count { it.done }
    val allDone = doneCount == today.items.size

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.6f), RoundedCornerShape(CornerRadius.l))
            .padding(Spacing.l),
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = if (today.comeback != null) "Welcome back 👋" else "Today",
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = "$doneCount/${today.items.size}",
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
        }

        // Comeback framing beats streak framing: a learner back after a week away gets a
        // warm, achievable re-entry — never guilt about what lapsed while they were gone.
        Text(
            text = when {
                today.comeback != null ->
                    "It's been ${today.comeback.daysAway} days — one easy step below restarts the momentum. No catch-up needed."
                allDone -> "All done — see you tomorrow! 🎉"
                today.streakSafeToday -> "🔥 Streak safe for today" + if (today.streak > 1) " · ${today.streak} days" else ""
                today.streak > 0 -> "Solve one problem to keep your ${today.streak}-day streak"
                else -> "Start your streak with any step below"
            },
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = if (today.streakSafeToday || allDone) MaterialTheme.colorScheme.secondary
                    else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
        )

        Spacer(modifier = Modifier.height(Spacing.xs))

        today.items.forEachIndexed { index, item ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(CornerRadius.m))
                    .clickable(enabled = !item.done) { onItemClick(item.key) }
                    .padding(vertical = Spacing.s, horizontal = Spacing.xs),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.m),
            ) {
                // Step marker: number while pending, check glyph when done.
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(
                            if (item.done) MaterialTheme.colorScheme.secondary.copy(alpha = 0.18f)
                            else MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (item.done) "✓" else "${index + 1}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (item.done) MaterialTheme.colorScheme.secondary
                                else MaterialTheme.colorScheme.primary,
                    )
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.title,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        textDecoration = if (item.done) TextDecoration.LineThrough else null,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = if (item.done) 0.45f else 1f),
                    )
                    if (!item.done && !item.subtitle.isNullOrBlank()) {
                        Text(
                            text = item.subtitle,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                        )
                    }
                }

                if (!item.done) {
                    Text(
                        text = if (item.target > 1) "${item.progress}/${item.target}" else "›",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                    )
                }
            }
        }

        if (today.claimableQuests > 0) {
            Text(
                text = "🎁 ${today.claimableQuests} reward${if (today.claimableQuests > 1) "s" else ""} ready to claim below",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(top = Spacing.xs),
            )
        }
    }
}
