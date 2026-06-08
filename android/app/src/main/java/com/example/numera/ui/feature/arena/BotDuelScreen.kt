package com.example.numera.ui.feature.arena

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Bot duels: practice competition on demand against a calibrated AI (no matchmaking wait).
// select tier → one-at-a-time MCQ → result vs the bot. Server-authoritative (routes/botDuel.js).
@Composable
fun BotDuelScreen(onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("select") } // select | playing
    var busy by remember { mutableStateOf(false) }

    var matchId by remember { mutableIntStateOf(0) }
    var problems by remember { mutableStateOf(listOf<AsyncProblemDto>()) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var qIndex by remember { mutableIntStateOf(0) }
    var result by remember { mutableStateOf<BotPlayResponse?>(null) }

    val tiers = listOf(
        Triple("easy", "Rookie Bot", "≈900 rating · +10 coins"),
        Triple("medium", "Challenger Bot", "≈1200 rating · +18 coins"),
        Triple("hard", "Master Bot", "≈1500 rating · +28 coins")
    )

    fun start(tier: String) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val s = withContext(Dispatchers.IO) { RetrofitClient.apiService.startBotDuel(token, BotStartRequest(tier)) }
                matchId = s.matchId; problems = s.problems; answers = emptyList(); qIndex = 0; result = null; phase = "playing"
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    fun submit(finalAnswers: List<String>) {
        busy = true
        scope.launch {
            try {
                result = withContext(Dispatchers.IO) { RetrofitClient.apiService.playBotDuel(token, matchId, BotPlayRequest(finalAnswers)) }
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🤖 Bot Duel", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Exit") }
        }

        if (phase == "select") {
            Text("Pick an opponent. Beat the bot's score to win coins.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
            tiers.forEach { (key, name, sub) ->
                DuoCard(modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { start(key) }) {
                    Row(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            Text(sub, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Text("▶", fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        } else {
            val r = result
            if (r != null) {
                val won = r.winner == "user"
                val draw = r.winner == "draw"
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        Text("You ${r.userScore} — ${r.botScore} Bot", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                        Text(
                            if (draw) "It's a draw!" else if (won) "You beat the bot! 🏆" else "The bot won — try again?",
                            fontWeight = FontWeight.Bold, fontSize = 16.sp,
                            color = if (won) CorrectGreen else if (draw) MaterialTheme.colorScheme.onSurface else WrongRed
                        )
                        if (won && r.reward > 0) Text("+${r.reward} coins", fontWeight = FontWeight.Bold, color = MilestoneGold)
                        else if (won) Text("Daily reward cap reached — played for practice.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
                DuoButton(text = "Play again", onClick = { phase = "select" }, modifier = Modifier.fillMaxWidth())
            } else if (qIndex < problems.size) {
                Text("Question ${qIndex + 1} of ${problems.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                        MathText(text = problems[qIndex].question, fontSizePx = 44)
                    }
                }
                problems[qIndex].options.forEach { opt ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) {
                            val updated = answers + opt
                            if (updated.size >= problems.size) { answers = updated; submit(updated) }
                            else { answers = updated; qIndex = updated.size }
                        },
                        shape = RoundedCornerShape(CornerRadius.m),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                    ) {
                        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.m), contentAlignment = Alignment.Center) {
                            MathText(text = opt, fontSizePx = 36)
                        }
                    }
                }
            } else {
                CircularProgressIndicator()
            }
        }
    }
}
