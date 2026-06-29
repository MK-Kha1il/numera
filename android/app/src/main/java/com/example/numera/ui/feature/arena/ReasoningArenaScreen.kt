package com.example.numera.ui.feature.arena

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.ui.draw.clip
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
import kotlinx.coroutines.launch

// Reasoning Arena (Phase 3 — understanding is the win condition). Each problem is answered, THEN you
// must pick the correct REASON it's right; a point banks only if BOTH are correct. Ranked: it moves
// the unified NRS rating with no speed signal. Server-authoritative (routes/reasoningDuel.js).
@Composable
fun ReasoningArenaScreen(onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("intro") } // intro | playing | done
    var busy by remember { mutableStateOf(false) }

    // Per-domain focus (audit #15): pick a ladder to climb, or "Any" (null) for a mixed round.
    var focusDomains by remember { mutableStateOf(listOf<String>()) }
    var selectedDomain by remember { mutableStateOf<String?>(null) }
    var roundDomain by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try { focusDomains = RetrofitClient.apiService.getReasoningDomains(token).domains } catch (_: Exception) {}
    }

    var roundId by remember { mutableIntStateOf(0) }
    var problems by remember { mutableStateOf(listOf<ReasoningProblemDto>()) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var reasons by remember { mutableStateOf(listOf<Int>()) }
    var qIndex by remember { mutableIntStateOf(0) }
    var step by remember { mutableStateOf("answer") } // answer | reason
    var result by remember { mutableStateOf<ReasoningSubmitResponse?>(null) }

    fun start() {
        if (busy) return
        busy = true
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                val s = RetrofitClient.apiService.startReasoningDuel(token, ReasoningStartRequest(selectedDomain))
                problems = s.problems; roundId = s.roundId; roundDomain = s.domain
                answers = emptyList(); reasons = emptyList(); qIndex = 0; step = "answer"; result = null
                phase = "playing"
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    fun submit(finalAnswers: List<String>, finalReasons: List<Int>) {
        busy = true
        scope.launch(kotlinx.coroutines.Dispatchers.IO) {
            try {
                result = RetrofitClient.apiService.submitReasoningDuel(token, roundId, ReasoningSubmitRequest(finalAnswers, finalReasons))
                phase = "done"
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🧠 Reasoning Arena", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Exit") }
        }

        when (phase) {
            "intro" -> {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        Text("Understanding wins here.", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text(
                            "Answer the problem, then pick the correct REASON it's right. A point only banks if BOTH are correct — so speed and lucky guesses can't carry you. Your ranked rating moves with how well you understand, not how fast you tap.",
                            fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                        if (focusDomains.isNotEmpty()) {
                            Text("Climb a ladder", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                            ) {
                                DomainChip(label = "Any", selected = selectedDomain == null) { selectedDomain = null }
                                focusDomains.forEach { d ->
                                    DomainChip(label = domainLabel(d), selected = selectedDomain == d) { selectedDomain = d }
                                }
                            }
                        }
                    }
                }
                DuoButton(
                    text = if (busy) "Starting…" else if (selectedDomain != null) "Start ${domainLabel(selectedDomain!!)} Round" else "Start Reasoning Round",
                    onClick = { start() }, modifier = Modifier.fillMaxWidth()
                )
            }

            "playing" -> {
                if (qIndex < problems.size) {
                    val p = problems[qIndex]
                    Text(
                        "Problem ${qIndex + 1} of ${problems.size}" + (roundDomain?.let { " · ${domainLabel(it)}" } ?: ""),
                        fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary
                    )

                    if (step == "answer") {
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                                MathText(text = p.question, fontSizePx = 44)
                            }
                        }
                        p.options.forEach { opt ->
                            OptionCard(text = opt, enabled = !busy) {
                                answers = answers + opt
                                step = "reason"
                            }
                        }
                    } else {
                        Text("Why is that right?", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.primary)
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.l), contentAlignment = Alignment.Center) {
                                MathText(text = p.reasonQuestion, fontSizePx = 34)
                            }
                        }
                        p.reasonOptions.forEachIndexed { idx, opt ->
                            OptionCard(text = opt, enabled = !busy, mathSizePx = 30) {
                                val nextReasons = reasons + idx
                                if (qIndex + 1 >= problems.size) {
                                    reasons = nextReasons
                                    submit(answers, nextReasons)
                                } else {
                                    reasons = nextReasons
                                    qIndex += 1
                                    step = "answer"
                                }
                            }
                        }
                    }
                } else {
                    com.example.numera.ui.components.MathIconSpinner()
                }
            }

            else -> {
                val r = result
                if (r != null) {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            Text("${r.banked} / ${r.total} banked", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = MaterialTheme.colorScheme.primary)
                            Text("${r.answerCorrect} answered correctly · ${r.banked} fully understood", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            if (!r.ratingCounted) {
                                Text("Practice round — daily ranked cap reached. Rating unchanged.", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            } else if (r.promoted && r.newRank != null) {
                                Text("⬆️ RANKED UP to ${r.newRank}!", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = CorrectGreen)
                            } else if (r.newRank != null) {
                                val delta = r.ratingDelta.toInt()
                                Text("Rating ${if (delta >= 0) "+" else ""}$delta · ${r.newRank}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                            }
                            if (r.reviewQueued > 0) {
                                Text(
                                    "📌 ${r.reviewQueued} concept${if (r.reviewQueued == 1) "" else "s"} added to your review queue",
                                    fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                    }
                    r.perProblem.forEachIndexed { i, item ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                Text(
                                    "Q${i + 1}: answer ${if (item.answerCorrect) "✓" else "✗"} · reason ${if (item.reasonCorrect) "✓" else "✗"}${if (item.banked) " · banked" else ""}",
                                    fontWeight = FontWeight.Bold, fontSize = 13.sp,
                                    color = if (item.banked) CorrectGreen else WrongRed
                                )
                                if (item.reasonExplanation.isNotBlank()) {
                                    MathText(text = item.reasonExplanation, fontSizePx = 28)
                                }
                            }
                        }
                    }
                    DuoButton(text = "Play again", onClick = { phase = "intro" }, modifier = Modifier.fillMaxWidth())
                } else {
                    com.example.numera.ui.components.MathIconSpinner()
                }
            }
        }
    }
}

private fun domainLabel(domain: String): String =
    domain.replace('_', ' ').split(' ').joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }

@Composable
private fun DomainChip(label: String, selected: Boolean, onClick: () -> Unit) {
    val bg = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
    val fg = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(bg)
            .clickable { onClick() }
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
    ) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
private fun OptionCard(text: String, enabled: Boolean, mathSizePx: Int = 36, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(enabled = enabled) { onClick() },
        shape = RoundedCornerShape(CornerRadius.m),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.m), contentAlignment = Alignment.Center) {
            MathText(text = text, fontSizePx = mathSizePx)
        }
    }
}
