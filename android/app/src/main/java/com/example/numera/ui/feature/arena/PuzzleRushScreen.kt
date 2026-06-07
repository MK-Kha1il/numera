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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Puzzle Rush — solo time-attack ladder (server-authoritative; see routes/puzzleRush.js).
// Idle → leaderboard + personal best + Start. Playing → escalating MCQ, 3 lives. Over → score,
// coin reward, play again. The server scores every submission; this screen is display + input.
@Composable
fun PuzzleRushScreen(user: User?, onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("idle") } // idle | playing | over
    var runId by remember { mutableIntStateOf(0) }
    var index by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    var lives by remember { mutableIntStateOf(3) }
    var question by remember { mutableStateOf("") }
    var options by remember { mutableStateOf(listOf<String>()) }
    var feedback by remember { mutableStateOf<String?>(null) } // null | "correct" | "wrong"
    var finalScore by remember { mutableIntStateOf(0) }
    var reward by remember { mutableIntStateOf(0) }
    var flagged by remember { mutableStateOf(false) }
    var personalBest by remember { mutableIntStateOf(0) }
    var leaderboard by remember { mutableStateOf(listOf<PuzzleRushLeaderboardEntry>()) }
    var busy by remember { mutableStateOf(false) }

    suspend fun refreshBoard() {
        try {
            val b = withContext(Dispatchers.IO) { RetrofitClient.apiService.puzzleRushLeaderboard(token) }
            personalBest = b.personalBest
            leaderboard = b.leaderboard
        } catch (_: Exception) { /* leave last-known */ }
    }

    LaunchedEffect(Unit) { refreshBoard() }

    fun startRun() {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val r = withContext(Dispatchers.IO) { RetrofitClient.apiService.startPuzzleRush(token) }
                runId = r.runId; index = r.index; score = r.score; lives = r.lives
                question = r.problem.question; options = r.problem.options
                feedback = null; phase = "playing"
            } catch (_: Exception) { /* stay idle */ } finally { busy = false }
        }
    }

    fun submit(answer: String) {
        if (busy || feedback != null) return
        busy = true
        scope.launch {
            try {
                val res = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.submitPuzzleRush(token, PuzzleRushSubmitRequest(runId, index, answer))
                }
                feedback = if (res.correct) "correct" else "wrong"
                com.example.numera.haptic.HapticManager.playSoft()
                delay(500) // let the feedback land
                if (res.gameOver) {
                    finalScore = res.finalScore ?: score
                    reward = res.reward ?: 0
                    flagged = res.flagged
                    refreshBoard()
                    phase = "over"
                } else {
                    score = res.score
                    lives = res.lives
                    index = res.index
                    question = res.problem?.question ?: ""
                    options = res.problem?.options ?: emptyList()
                    feedback = null
                }
            } catch (_: Exception) {
                feedback = null
            } finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("⚡ Puzzle Rush", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Exit") }
        }

        when (phase) {
            "playing" -> {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Score: $score", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                    Text("❤".repeat(lives.coerceAtLeast(0)) + "🤍".repeat((3 - lives).coerceAtLeast(0)), fontSize = 16.sp)
                }

                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                        MathText(text = question, fontSizePx = 44)
                    }
                }

                options.forEach { opt ->
                    val enabled = feedback == null && !busy
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled) { submit(opt) },
                        shape = RoundedCornerShape(CornerRadius.m),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        )
                    ) {
                        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.m), contentAlignment = Alignment.Center) {
                            MathText(text = opt, fontSizePx = 36)
                        }
                    }
                }

                feedback?.let { fb ->
                    Text(
                        text = if (fb == "correct") "✅ Correct!" else "❌ Not quite",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = if (fb == "correct") CorrectGreen else WrongRed
                    )
                }
            }

            "over" -> {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(Spacing.xl),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(Spacing.m)
                    ) {
                        Text("Run Over", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
                        Text("$finalScore", fontWeight = FontWeight.Black, fontSize = 56.sp, color = MaterialTheme.colorScheme.secondary)
                        Text("problems solved", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        if (reward > 0) Text("+$reward coins", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MilestoneGold)
                        if (flagged) {
                            Text(
                                "⚠️ Some answers came in faster than humanly possible, so this run wasn't counted on the leaderboard.",
                                fontSize = 12.sp,
                                color = WrongRed,
                                textAlign = TextAlign.Center
                            )
                        } else if (finalScore >= personalBest && finalScore > 0) {
                            Text("🏆 New personal best!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                DuoButton(text = "Play Again", onClick = { startRun() }, modifier = Modifier.fillMaxWidth(), enabled = !busy)
                DuoButton(
                    text = "Back to Arena",
                    onClick = onExit,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            else -> { // idle
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(Spacing.xl),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Text("Solve as many as you can.", fontWeight = FontWeight.Bold, fontSize = 16.sp, textAlign = TextAlign.Center)
                        Text("Three wrong answers ends the run. Difficulty climbs with every solve.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), textAlign = TextAlign.Center)
                        Spacer(modifier = Modifier.height(Spacing.xs))
                        Text("Your best: $personalBest", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.secondary)
                    }
                }
                DuoButton(text = if (busy) "Starting…" else "Start Rush", onClick = { startRun() }, modifier = Modifier.fillMaxWidth(), enabled = !busy)

                if (leaderboard.isNotEmpty()) {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            Text("🏆 Top Rushers", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                            HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                            leaderboard.take(10).forEachIndexed { i, entry ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("${i + 1}. ${entry.username}", fontSize = 14.sp, fontWeight = if (entry.username == user?.username) FontWeight.Bold else FontWeight.Normal)
                                    Text("${entry.best}", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
