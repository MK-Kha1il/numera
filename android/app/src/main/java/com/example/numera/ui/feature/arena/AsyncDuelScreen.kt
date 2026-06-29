package com.example.numera.ui.feature.arena

import com.example.numera.ui.components.pressable
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Async (correspondence) duels: challenge a friend, then both solve the same set within 24h.
// list → your matches + friends to challenge; playing → one-at-a-time MCQ, then result.
// Server-authoritative (see routes/asyncDuel.js); this screen is display + input.
@Composable
fun AsyncDuelScreen(user: User?, onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("list") } // list | playing
    var matches by remember { mutableStateOf(listOf<AsyncMatchSummary>()) }
    var friends by remember { mutableStateOf(listOf<Friend>()) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }

    // playing state
    var playMatchId by remember { mutableIntStateOf(0) }
    var problems by remember { mutableStateOf(listOf<AsyncProblemDto>()) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var qIndex by remember { mutableIntStateOf(0) }
    var result by remember { mutableStateOf<AsyncPlayResponse?>(null) }

    suspend fun reload() {
        try {
            matches = withContext(Dispatchers.IO) { RetrofitClient.apiService.asyncActiveDuels(token) }
            friends = withContext(Dispatchers.IO) { RetrofitClient.apiService.getFriends(token) }.filter { it.status == "accepted" }
        } catch (_: Exception) { /* keep last-known */ } finally { loading = false }
    }
    LaunchedEffect(Unit) { reload() }

    fun challenge(friendId: Int) {
        if (busy) return
        busy = true
        scope.launch {
            try { withContext(Dispatchers.IO) { RetrofitClient.apiService.asyncChallenge(token, AsyncChallengeRequest(friendId)) }; reload() }
            catch (_: Exception) {} finally { busy = false }
        }
    }

    fun startPlay(id: Int) {
        if (busy) return
        busy = true
        scope.launch {
            try {
                val f = withContext(Dispatchers.IO) { RetrofitClient.apiService.asyncFetchDuel(token, id) }
                playMatchId = id; problems = f.problems; answers = emptyList(); qIndex = 0; result = null; phase = "playing"
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    fun submitPlay(finalAnswers: List<String>) {
        busy = true
        scope.launch {
            try {
                result = withContext(Dispatchers.IO) { RetrofitClient.apiService.asyncPlayDuel(token, playMatchId, AsyncPlayRequest(finalAnswers)) }
                reload()
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("⚔️ Async Duels", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Exit") }
        }

        if (phase == "playing") {
            val r = result
            if (r != null) {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        Text("You scored ${r.score} / ${problems.size}", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.secondary)
                        if (r.resolved) {
                            val res = r.result
                            val won = res?.winnerId != null && res.winnerId == user?.id
                            val draw = res?.winnerId == null
                            Text(
                                if (draw) "It's a draw!" else if (won) "You won! 🏆" else "You lost — rematch?",
                                fontWeight = FontWeight.Bold, fontSize = 16.sp,
                                color = if (won) CorrectGreen else if (draw) MaterialTheme.colorScheme.onSurface else WrongRed
                            )
                            if (won && (res?.reward ?: 0) > 0) Text("+${res?.reward} coins", fontWeight = FontWeight.Bold, color = MilestoneGold)
                        } else {
                            Text("Waiting for your opponent to play…", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), textAlign = TextAlign.Center)
                        }
                    }
                }
                DuoButton(text = "Back to Duels", onClick = { phase = "list" }, modifier = Modifier.fillMaxWidth())
            } else if (qIndex < problems.size) {
                Text("Question ${qIndex + 1} of ${problems.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                        MathText(text = problems[qIndex].question, fontSizePx = 44)
                    }
                }
                problems[qIndex].options.forEach { opt ->
                    Card(
                        modifier = Modifier.fillMaxWidth().pressable(enabled = !busy) {
                            val updated = answers + opt
                            if (updated.size >= problems.size) { answers = updated; submitPlay(updated) }
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
                com.example.numera.ui.components.MathIconSpinner()
            }
        } else {
            // LIST
            if (loading) {
                com.example.numera.ui.components.NumeraPremiumLoader(modifier = Modifier.fillMaxWidth())
            } else {
                // Challenge a friend
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                        Text("Challenge a Friend", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                        if (friends.isEmpty()) {
                            Text("Add friends to challenge them to a duel.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        } else {
                            friends.forEach { f ->
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text(f.username, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                    TextButton(onClick = { challenge(f.id) }, enabled = !busy) { Text("Challenge") }
                                }
                            }
                        }
                    }
                }

                // Your duels
                Text("Your Duels", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.align(Alignment.Start))
                if (matches.isEmpty()) {
                    Text("No active duels yet. Challenge a friend above!", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                } else {
                    matches.forEach { m ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("vs ${m.opponentName}", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    val sub = when {
                                        m.status == "finished" -> if (m.won) "You won ${m.myScore}–${m.theirScore} 🏆" else if (m.winnerId == null) "Draw ${m.myScore}–${m.theirScore}" else "Lost ${m.myScore}–${m.theirScore}"
                                        m.status == "expired" -> "Expired"
                                        m.yourTurn -> "Your turn — ${m.problemCount} questions"
                                        m.played -> "Waiting for opponent"
                                        else -> m.status
                                    }
                                    Text(sub, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                }
                                if (m.yourTurn) {
                                    DuoButton(text = "Play", onClick = { startPlay(m.matchId) }, enabled = !busy)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
