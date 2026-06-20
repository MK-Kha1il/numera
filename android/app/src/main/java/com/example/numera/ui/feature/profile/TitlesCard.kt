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
import com.example.numera.data.network.TitlesResponse
import com.example.numera.theme.*

/**
 * Competitive titles (Phase 2 identity — Chess.com's prestige layer). Earned titles can be equipped
 * to display by your name; locked ones show their requirement. `onSelect("")` clears the title. Fed
 * by GET /api/rating/titles; the parent handles selection + refetch.
 */
@Composable
fun TitlesCard(
    titles: TitlesResponse?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    if (titles == null || titles.titles.isEmpty()) return

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("🎖️ Titles", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                if (titles.active.isNotEmpty()) {
                    Text("Clear", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.clickable { onSelect("") })
                }
            }
            Text("Earn titles by competing, then equip one to show by your name.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))

            titles.titles.forEach { t ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = Spacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.m),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = t.name,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (t.earned) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        )
                        Text(t.desc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                    when {
                        t.active -> Text("✓ Active", fontSize = 12.sp, fontWeight = FontWeight.Black, color = CorrectGreen)
                        t.earned -> Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(CornerRadius.full))
                                .background(MaterialTheme.colorScheme.primary)
                                .clickable { onSelect(t.id) }
                                .padding(horizontal = Spacing.m, vertical = Spacing.xs),
                        ) {
                            Text("Equip", fontSize = 12.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onPrimary)
                        }
                        else -> Text("🔒", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                    }
                }
            }
        }
    }
}
