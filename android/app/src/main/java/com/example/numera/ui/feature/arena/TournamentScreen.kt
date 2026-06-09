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
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.AnswerInput
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Weekly tournament (audit #21 — recurring re-engagement + an endless competitive ladder). One
// global event per week: everyone races the same server-generated set, one timed attempt each,
// top 3 win coins on close. Server-authoritative (routes/tournaments.js): the client never sees
// answers and timing is measured server-side, so the speed tiebreak can't be faked.
@Composable
fun TournamentScreen(user: User?, onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("home") } // home | playing
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    var current by remember { mutableStateOf<TournamentCurrentResponse?>(null) }
    var problems by remember { mutableStateOf(listOf<AsyncProblemDto>()) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var typed by remember { mutableStateOf("") }
    var qIndex by remember { mutableIntStateOf(0) }
    var lastResult by remember { mutableStateOf<TournamentPlayResponse?>(null) }

    fun reload() {
        scope.launch {
            try {
                current = withContext(Dispatchers.IO) { RetrofitClient.apiService.getCurrentTournament(token) }
            } catch (e: Exception) { Log.e("Tournament", "load: ${e.message}") }
        }
    }
    LaunchedEffect(Unit) { reload() }

    fun begin() {
        val tid = current?.tournament?.id ?: return
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                val s = withContext(Dispatchers.IO) { RetrofitClient.apiService.startTournament(token, tid) }
                problems = s.problems; answers = emptyList(); typed = ""; qIndex = 0; lastResult = null; phase = "playing"
            } catch (e: Exception) {
                error = "Couldn't start your run."
                Log.e("Tournament", "start: ${e.message}")
            } finally { busy = false }
        }
    }

    fun submit(finalAnswers: List<String>) {
        val tid = current?.tournament?.id ?: return
        busy = true
        scope.launch {
            try {
                lastResult = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.playTournament(token, tid, TournamentPlayRequest(finalAnswers))
                }
                reload()
                phase = "home"
            } catch (e: Exception) {
                error = "Couldn't submit your run."
                Log.e("Tournament", "play: ${e.message}")
            } finally { busy = false }
        }
    }

    fun remaining(ms: Long): String {
        if (ms <= 0) return "ending soon"
        val days = ms / 86_400_000L
        val hours = (ms % 86_400_000L) / 3_600_000L
        return when {
            days > 0 -> "${days}d ${hours}h left"
            hours > 0 -> "${hours}h left"
            else -> "${(ms % 3_600_000L) / 60_000L}m left"
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🏆 Weekly Tournament", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = { if (phase == "home") onExit() else { phase = "home"; reload() } }) {
                Text(if (phase == "home") "Close" else "Back")
            }
        }

        error?.let { Text(it, color = WrongRed, fontSize = 12.sp) }

        val cur = current
        if (cur == null) {
            CircularProgressIndicator()
            return@Column
        }

        if (phase == "playing" && qIndex < problems.size) {
            Text("Question ${qIndex + 1} of ${problems.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
            DuoCard(modifier = Modifier.fillMaxWidth()) {
                Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                    MathText(text = problems[qIndex].question, fontSizePx = 44)
                }
            }
            AnswerInput(
                value = typed,
                onValueChange = { typed = it },
                onSubmit = {
                    val updated = answers + typed.trim(); typed = ""
                    if (updated.size >= problems.size) { answers = updated; submit(updated) }
                    else { answers = updated; qIndex = updated.size }
                },
                enabled = !busy,
                submitLabel = if (qIndex >= problems.size - 1) "Submit" else "Next"
            )
            if (busy) Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            return@Column
        }

        // Home: the event card, your standing, and the leaderboard.
        DuoCard(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(cur.tournament.title, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                Text("${cur.tournament.conceptName} · ${cur.tournament.problemCount} problems", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text("⏳ ${remaining(cur.tournament.msRemaining)} · top 3 win coins", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
        }

        lastResult?.let { r ->
            DuoCard(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                    Text("Your run is in!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                    Text("${r.score} / ${r.total}", fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = CorrectGreen)
                    r.yourRank?.let { Text("Currently #$it on the board", fontSize = 13.sp, fontWeight = FontWeight.Bold) }
                }
            }
        }

        val entry = cur.yourEntry
        if (entry == null || entry.status != "done") {
            DuoButton(text = "▶ Enter the tournament", onClick = { begin() }, modifier = Modifier.fillMaxWidth())
        } else if (lastResult == null) {
            Text(
                "You played: ${entry.score ?: 0} / ${cur.tournament.problemCount}" +
                    (cur.yourRank?.let { " · rank #$it" } ?: "") +
                    " — one attempt per player.",
                fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        }

        Text("Leaderboard", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
        if (cur.leaderboard.isEmpty()) {
            Text("No finishers yet — be the first to set a score!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
        } else {
            cur.leaderboard.forEach { row ->
                val isMe = row.username == user?.username
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.xs),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        "#${row.position}  ${row.username}" + (if (isMe) "  (you)" else ""),
                        fontWeight = if (isMe) FontWeight.ExtraBold else FontWeight.Medium,
                        fontSize = 14.sp,
                        color = if (isMe) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "${row.score} · ${row.elapsedMs / 1000}s" + (if (row.reward > 0) "  +${row.reward}🪙" else ""),
                        fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}
