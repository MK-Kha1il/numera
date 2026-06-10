package com.example.numera.ui.feature.profile

import android.content.Context
import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.WeeklyRecap
import com.example.numera.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

// "Your Week" — an in-app, shareable recap (audit #20, Wrapped-style). Reuses the engine's
// last-7-days activity (real figures from user_commitment_history) + the mastery aggregate, and
// hands the learner a one-tap share. Retention + organic reach, honestly framed (weekly = activity;
// standing = current totals). Read-only; loads /api/engine/weekly-recap.
@Composable
fun WeeklyRecapScreen(onBack: () -> Unit) {
    var data by remember { mutableStateOf<WeeklyRecap?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        try {
            val token = RetrofitClient.authToken ?: ""
            data = withContext(Dispatchers.IO) { RetrofitClient.apiService.getWeeklyRecap(token) }
        } catch (e: Exception) {
            error = e.message ?: "Failed to load your recap"
        } finally {
            loading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("📊 Your Week", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            TextButton(onClick = onBack) { Text("Close") }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { com.example.numera.ui.components.NumeraPremiumLoader() }
            error != null -> Box(Modifier.fillMaxSize().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            data != null -> {
                val r = data!!
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = Spacing.l).padding(bottom = Spacing.xxl),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    // Hero: problems solved in the last 7 days.
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(CornerRadius.l),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("This week you solved", fontSize = 13.sp, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f))
                            Text("${r.weekProblems}", fontSize = 56.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            Text(
                                if (r.weekProblems == 1) "problem" else "problems",
                                fontSize = 15.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                            Spacer(Modifier.height(Spacing.xs))
                            Text(
                                "across ${r.activeDays} active ${if (r.activeDays == 1) "day" else "days"}",
                                fontSize = 12.sp, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                            )
                        }
                    }

                    // Standing tiles.
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        StatTile("🔥", "${r.streak}", "day streak", MilestoneGold, Modifier.weight(1f))
                        StatTile("⭐", "${r.level}", "level", CorrectGreen, Modifier.weight(1f))
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        StatTile("🪙", "${r.coins}", "coins", MilestoneGold, Modifier.weight(1f))
                        StatTile("🧩", "${r.conceptsPracticed}", "concepts", MaterialTheme.colorScheme.secondary, Modifier.weight(1f))
                    }

                    // Mastery summary.
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(CornerRadius.l),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    ) {
                        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                Text("Overall Mastery", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text("${(r.overallMastery * 100).roundToInt()}% · ${r.masteryStage}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                            }
                            Box(modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))) {
                                Box(modifier = Modifier.fillMaxWidth(r.overallMastery.coerceIn(0f, 1f)).fillMaxHeight().clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.primary))
                            }
                            r.topConcept?.let { tc ->
                                Text(
                                    "💪 Strongest concept: ${tc.name} (${(tc.overall * 100).roundToInt()}%)",
                                    fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
                                )
                            }
                        }
                    }

                    Button(onClick = { shareRecap(context, r) }, modifier = Modifier.fillMaxWidth()) {
                        Text("Share my week 🚀", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatTile(emoji: String, value: String, label: String, accent: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(CornerRadius.m),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.m), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(emoji, fontSize = 20.sp)
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = accent)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        }
    }
}

private fun shareRecap(context: Context, r: WeeklyRecap) {
    val mastery = "${(r.overallMastery * 100).roundToInt()}% (${r.masteryStage})"
    val text = buildString {
        append("📊 My week on Numera: ")
        append("${r.weekProblems} problems solved across ${r.activeDays} active ${if (r.activeDays == 1) "day" else "days"}")
        append(", a ${r.streak}-day streak, now level ${r.level}. ")
        append("Overall mastery: $mastery.")
        r.topConcept?.let { append(" Strongest: ${it.name}.") }
        append(" #Numera")
    }
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(send, "Share your week"))
}
