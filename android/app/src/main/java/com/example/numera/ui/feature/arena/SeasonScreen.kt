package com.example.numera.ui.feature.arena

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Ranked season standings (audit #4 — "daily ranked seasons with rewards"). Shows the current
// season, time left, and the leaderboard by peak rating with your row highlighted. Seasons
// auto-roll over server-side and pay the top 3 (500 / 300 / 150 coins) when they end.
@Composable
fun SeasonScreen(user: User?, onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var data by remember { mutableStateOf<SeasonLeaderboardResponse?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                data = withContext(Dispatchers.IO) { RetrofitClient.apiService.getSeasonLeaderboard(token) }
            } catch (e: Exception) {
                Log.e("Season", "load: ${e.message}")
            } finally {
                loading = false
            }
        }
    }

    fun daysLeft(endAtSec: Long): Long {
        val now = System.currentTimeMillis() / 1000
        return ((endAtSec - now) / 86400L).coerceAtLeast(0)
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🏅 Ranked Season", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Close") }
        }

        val d = data
        when {
            loading -> com.example.numera.ui.components.NumeraPremiumLoader(modifier = Modifier.fillMaxWidth())
            d == null -> Text("Couldn't load the season.", color = WrongRed, fontSize = 13.sp)
            else -> {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                        Text(d.season.name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                        Text("⏳ ${daysLeft(d.season.endAt)} days left · top 3 win 500 / 300 / 150 coins", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        d.yourRank?.let { Text("Your rank: #$it", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary) }
                            ?: Text("Play ranked duels to set a peak rating and climb the board.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }

                Text("Standings", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                if (d.leaderboard.isEmpty()) {
                    Text("No ranked players yet this season — be the first!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                } else {
                    d.leaderboard.forEach { row ->
                        val isMe = row.isMe || row.username == user?.username
                        DuoCard(
                            modifier = Modifier.fillMaxWidth(),
                            borderColor = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        ) {
                            Row(modifier = Modifier.fillMaxWidth().padding(Spacing.m), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                                Text(
                                    "#${row.position}",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 15.sp,
                                    color = when (row.position) { 1 -> MilestoneGold; 2 -> MedalSilver; 3 -> MedalBronze; else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f) },
                                    modifier = Modifier.width(40.dp)
                                )
                                Text(
                                    row.username + (if (isMe) " (you)" else ""),
                                    fontWeight = if (isMe) FontWeight.ExtraBold else FontWeight.Medium,
                                    fontSize = 14.sp,
                                    color = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f)
                                )
                                Text("${row.peak}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                            }
                        }
                    }
                }
            }
        }
    }
}
