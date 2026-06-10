package com.example.numera.ui.feature.arena

import android.util.Log
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
import com.example.numera.ui.components.AnswerInput
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Custom Challenges (audit #10 — UGC community gravity + content treadmill). Author a named
// challenge over one concept (server generates a FIXED problem set), share the code, and friends
// race for the top of its leaderboard. One scored attempt each. Server-authoritative
// (routes/challenges.js): the client never sees answers, glory-only (no coins).
@Composable
fun ChallengesScreen(onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("home") } // home | create | detail | playing
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    // Home
    var mine by remember { mutableStateOf<List<ChallengeListItem>>(emptyList()) }
    var joinCode by remember { mutableStateOf("") }

    // Create
    var concepts by remember { mutableStateOf<List<ChallengeConcept>>(emptyList()) }
    var title by remember { mutableStateOf("") }
    var selectedConcept by remember { mutableStateOf<ChallengeConcept?>(null) }
    var count by remember { mutableIntStateOf(5) }
    var countMin by remember { mutableIntStateOf(5) }
    var countMax by remember { mutableIntStateOf(15) }
    var conceptMenuOpen by remember { mutableStateOf(false) }

    // Detail / play
    var detail by remember { mutableStateOf<ChallengeDetailResponse?>(null) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var typed by remember { mutableStateOf("") }
    var qIndex by remember { mutableIntStateOf(0) }
    var startedAt by remember { mutableLongStateOf(0L) }
    var lastResult by remember { mutableStateOf<PlayChallengeResponse?>(null) }

    fun loadHome() {
        scope.launch {
            try {
                mine = withContext(Dispatchers.IO) { RetrofitClient.apiService.getMyChallenges(token) }.challenges
            } catch (e: Exception) { Log.e("Challenges", "home load: ${e.message}") }
        }
    }
    LaunchedEffect(Unit) { loadHome() }

    fun openDetail(code: String) {
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                detail = withContext(Dispatchers.IO) { RetrofitClient.apiService.getChallenge(token, code) }
                lastResult = null; phase = "detail"
            } catch (e: Exception) {
                error = "Couldn't find that challenge."
                Log.e("Challenges", "detail: ${e.message}")
            } finally { busy = false }
        }
    }

    fun startCreate() {
        title = ""; selectedConcept = null; error = null
        scope.launch {
            try {
                val res = withContext(Dispatchers.IO) { RetrofitClient.apiService.getChallengeConcepts(token) }
                concepts = res.concepts; countMin = res.countMin; countMax = res.countMax
                count = res.countMin
                selectedConcept = res.concepts.firstOrNull()
            } catch (e: Exception) { Log.e("Challenges", "concepts: ${e.message}") }
        }
        phase = "create"
    }

    fun submitCreate() {
        val concept = selectedConcept ?: return
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                val made = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.createChallenge(token, CreateChallengeRequest(title.trim(), concept.conceptId, count))
                }
                loadHome()
                openDetail(made.code)
            } catch (e: Exception) {
                error = "Couldn't create — check the title (3–40 chars, keep it clean)."
                Log.e("Challenges", "create: ${e.message}")
                busy = false
            }
        }
    }

    fun beginPlay() {
        answers = emptyList(); typed = ""; qIndex = 0; startedAt = System.currentTimeMillis(); phase = "playing"
    }

    fun submitPlay(finalAnswers: List<String>) {
        val code = detail?.code ?: return
        busy = true
        scope.launch {
            try {
                val elapsed = System.currentTimeMillis() - startedAt
                lastResult = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.playChallenge(token, code, PlayChallengeRequest(finalAnswers, elapsed))
                }
                detail = withContext(Dispatchers.IO) { RetrofitClient.apiService.getChallenge(token, code) }
                phase = "detail"
            } catch (e: Exception) {
                error = "Couldn't submit your run."
                Log.e("Challenges", "play: ${e.message}")
            } finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🎯 Challenges", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = { if (phase == "home") onBack() else { phase = "home"; loadHome() } }) {
                Text(if (phase == "home") "Close" else "Back")
            }
        }

        error?.let { Text(it, color = WrongRed, fontSize = 12.sp) }

        when (phase) {
            "home" -> {
                Text(
                    "Create a problem set, share the code, and see who tops its leaderboard.",
                    fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                DuoButton(text = "＋ Create a Challenge", onClick = { startCreate() }, modifier = Modifier.fillMaxWidth())

                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                        Text("Play by code", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        OutlinedTextField(
                            value = joinCode,
                            onValueChange = { if (it.length <= 6) joinCode = it.uppercase() },
                            singleLine = true,
                            placeholder = { Text("ABC234") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        DuoButton(
                            text = "Open",
                            onClick = { if (joinCode.length == 6) openDetail(joinCode) },
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                Text("Your challenges", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                if (mine.isEmpty()) {
                    Text("None yet — create one or play a friend's code.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                } else {
                    mine.forEach { c ->
                        DuoCard(modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { openDetail(c.code) }) {
                            Row(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(c.title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text(
                                        "${c.conceptName} · ${c.problemCount} Qs · ${c.playCount} plays" +
                                            (if (c.isMine) " · yours" else "") +
                                            (c.yourScore?.let { " · your best $it/${c.problemCount}" } ?: ""),
                                        fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                                Text(c.code, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }

            "create" -> {
                OutlinedTextField(
                    value = title,
                    onValueChange = { if (it.length <= 40) title = it },
                    singleLine = true,
                    label = { Text("Challenge title") },
                    placeholder = { Text("e.g. Friday Algebra Showdown") },
                    modifier = Modifier.fillMaxWidth()
                )

                Text("Topic", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Box {
                    DuoCard(modifier = Modifier.fillMaxWidth().clickable { conceptMenuOpen = true }) {
                        Row(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(selectedConcept?.name ?: "Pick a topic", fontWeight = FontWeight.Medium, fontSize = 14.sp)
                            Text("▾", fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    DropdownMenu(expanded = conceptMenuOpen, onDismissRequest = { conceptMenuOpen = false }) {
                        concepts.forEach { c ->
                            DropdownMenuItem(
                                text = { Text("${c.name}  ·  Lv${c.level}", fontSize = 13.sp) },
                                onClick = { selectedConcept = c; conceptMenuOpen = false }
                            )
                        }
                    }
                }

                Text("Number of problems", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.l)) {
                    OutlinedButton(onClick = { if (count > countMin) count-- }, enabled = count > countMin) { Text("−") }
                    Text("$count", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                    OutlinedButton(onClick = { if (count < countMax) count++ }, enabled = count < countMax) { Text("＋") }
                }

                DuoButton(
                    text = if (busy) "Creating…" else "Create & Share",
                    onClick = { submitCreate() },
                    modifier = Modifier.fillMaxWidth()
                )
            }

            "detail" -> {
                val d = detail
                if (d == null) {
                    com.example.numera.ui.components.NumeraPremiumLoader(modifier = Modifier.fillMaxWidth())
                } else {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            Text(d.title, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                            Text("${d.conceptName} · ${d.problemCount} problems · by ${d.creator}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text("Code: ${d.code}  ·  ${d.playCount} plays", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        }
                    }

                    lastResult?.let { r ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                Text(
                                    if (r.alreadyPlayed) "You already played this" else "Your run is in!",
                                    fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary
                                )
                                Text("${r.score} / ${r.total}", fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, color = CorrectGreen)
                            }
                        }
                    }

                    val played = d.yourAttempt != null
                    if (!played) {
                        DuoButton(text = "▶ Play this challenge", onClick = { beginPlay() }, modifier = Modifier.fillMaxWidth())
                    } else if (lastResult == null) {
                        Text(
                            "Your best: ${d.yourAttempt!!.score} / ${d.problemCount} — one attempt per player.",
                            fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }

                    Text("🏆 Leaderboard", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                    if (d.leaderboard.isEmpty()) {
                        Text("No one's played yet. Be the first!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    } else {
                        d.leaderboard.forEach { row ->
                            Row(modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.xs), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("#${row.position}  ${row.username}", fontWeight = FontWeight.Medium, fontSize = 14.sp, modifier = Modifier.weight(1f))
                                Text("${row.score} · ${row.elapsedMs / 1000}s", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                    }
                }
            }

            "playing" -> {
                val d = detail
                if (d == null || qIndex >= d.problems.size) {
                    CircularProgressIndicator()
                } else {
                    Text("Question ${qIndex + 1} of ${d.problems.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                            MathText(text = d.problems[qIndex].question, fontSizePx = 44)
                        }
                    }
                    AnswerInput(
                        value = typed,
                        onValueChange = { typed = it },
                        onSubmit = {
                            val updated = answers + typed.trim(); typed = ""
                            if (updated.size >= d.problems.size) { answers = updated; submitPlay(updated) }
                            else { answers = updated; qIndex = updated.size }
                        },
                        enabled = !busy,
                        submitLabel = if (qIndex >= d.problems.size - 1) "Submit" else "Next"
                    )
                    if (busy) {
                        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    }
                }
            }
        }
    }
}
