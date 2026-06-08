package com.example.numera.ui.feature.social

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
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Club wars (audit #1.7 — team competition). Your club's wars + (for the owner) a way to declare
// one on a rival club. Both clubs' members race the same set once; the higher combined score wins.
// Server-authoritative (routes/clubWars.js): answers never leave the server, one attempt each.
@Composable
fun ClubWarsScreen(onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("list") } // list | pick | war | playing
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    var wars by remember { mutableStateOf<List<ClubWar>>(emptyList()) }
    var myClubId by remember { mutableIntStateOf(0) }
    var isOwner by remember { mutableStateOf(false) }
    var rivals by remember { mutableStateOf<List<ClubSummary>>(emptyList()) }

    var war by remember { mutableStateOf<ClubWar?>(null) }
    var answers by remember { mutableStateOf(listOf<String>()) }
    var qIndex by remember { mutableIntStateOf(0) }

    fun loadList() {
        scope.launch {
            try {
                val res = withContext(Dispatchers.IO) { RetrofitClient.apiService.getClubWars(token) }
                wars = res.wars; myClubId = res.myClubId ?: 0
                val mine = withContext(Dispatchers.IO) { RetrofitClient.apiService.getMyClub(token) }
                isOwner = mine.club?.isOwner == true
            } catch (e: Exception) { Log.e("ClubWars", "list: ${e.message}") }
        }
    }
    LaunchedEffect(Unit) { loadList() }

    fun openWar(id: Int) {
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                war = withContext(Dispatchers.IO) { RetrofitClient.apiService.getClubWar(token, id) }
                phase = "war"
            } catch (e: Exception) { error = "Couldn't load the war." } finally { busy = false }
        }
    }

    fun openPicker() {
        error = null
        scope.launch {
            try {
                rivals = withContext(Dispatchers.IO) { RetrofitClient.apiService.browseClubs(token) }.filter { it.id != myClubId }
            } catch (e: Exception) { Log.e("ClubWars", "browse: ${e.message}") }
        }
        phase = "pick"
    }

    fun declare(opponentClubId: Int) {
        if (busy) return
        busy = true; error = null
        scope.launch {
            try {
                withContext(Dispatchers.IO) { RetrofitClient.apiService.challengeClub(token, ChallengeClubRequest(opponentClubId)) }
                loadList(); phase = "list"
            } catch (e: Exception) {
                error = "Couldn't declare war — there may already be one running."
                Log.e("ClubWars", "declare: ${e.message}")
            } finally { busy = false }
        }
    }

    fun submit(finalAnswers: List<String>) {
        val w = war ?: return
        busy = true
        scope.launch {
            try {
                val res = withContext(Dispatchers.IO) { RetrofitClient.apiService.playClubWar(token, w.id, TournamentPlayRequest(finalAnswers)) }
                war = withContext(Dispatchers.IO) { RetrofitClient.apiService.getClubWar(token, w.id) }
                phase = "war"
                loadList()
            } catch (e: Exception) { error = "Couldn't submit your run." } finally { busy = false }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("⚔️ Club Wars", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = { if (phase == "list") onBack() else { phase = "list"; loadList() } }) {
                Text(if (phase == "list") "Close" else "Back")
            }
        }
        error?.let { Text(it, color = WrongRed, fontSize = 12.sp) }

        when (phase) {
            "list" -> {
                if (myClubId == 0) {
                    Text("Join a club to take part in club wars.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                } else {
                    if (isOwner) {
                        DuoButton(text = "⚔️ Declare War", onClick = { openPicker() }, modifier = Modifier.fillMaxWidth())
                    }
                    if (wars.isEmpty()) {
                        Text("No wars yet. ${if (isOwner) "Challenge a rival club!" else "Your owner can start one."}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    } else {
                        wars.forEach { w -> WarCard(w, onClick = { openWar(w.id) }) }
                    }
                }
            }

            "pick" -> {
                Text("Choose a rival club to challenge", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                if (rivals.isEmpty()) {
                    Text("No other clubs to challenge yet.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                } else {
                    rivals.forEach { c ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Row(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(c.name, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    Text("${c.memberCount} ${if (c.memberCount == 1) "member" else "members"}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                }
                                DuoButton(text = "Challenge", onClick = { declare(c.id) }, enabled = !busy)
                            }
                        }
                    }
                }
            }

            "war" -> {
                val w = war
                if (w == null) { CircularProgressIndicator() } else {
                    WarStandings(w)
                    val amInThisWar = w.myClubId == w.challenger.clubId || w.myClubId == w.opponent.clubId
                    when {
                        w.status != "active" -> Text(
                            if (w.winnerClubId == null || w.winnerClubId == 0) "This war ended in a draw."
                            else if (w.winnerClubId == w.myClubId) "🏆 Your club won this war!"
                            else "Your club lost this one — next time!",
                            fontWeight = FontWeight.Bold, fontSize = 14.sp,
                            color = if (w.winnerClubId == w.myClubId) CorrectGreen else MaterialTheme.colorScheme.onSurface
                        )
                        w.youPlayed -> Text("You scored ${w.yourScore}/${w.problemCount} for your club. 🎯", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                        amInThisWar -> DuoButton(text = "▶ Play for your club", onClick = { answers = emptyList(); qIndex = 0; phase = "playing" }, modifier = Modifier.fillMaxWidth())
                        else -> Text("You're not in either of these clubs.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
            }

            "playing" -> {
                val w = war
                if (w == null || qIndex >= w.problems.size) { CircularProgressIndicator() } else {
                    Text("Question ${qIndex + 1} of ${w.problems.size}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                            MathText(text = w.problems[qIndex].question, fontSizePx = 44)
                        }
                    }
                    w.problems[qIndex].options.forEach { opt ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) {
                                val updated = answers + opt
                                if (updated.size >= w.problems.size) { answers = updated; submit(updated) }
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
                    if (busy) Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                }
            }
        }
    }
}

@Composable
private fun WarCard(w: ClubWar, onClick: () -> Unit) {
    DuoCard(modifier = Modifier.fillMaxWidth().clickable { onClick() }) {
        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${w.challenger.name}  vs  ${w.opponent.name}", fontWeight = FontWeight.Bold, fontSize = 14.sp, modifier = Modifier.weight(1f))
                Text(if (w.status == "active") "LIVE" else "ENDED", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = if (w.status == "active") CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
            Text("${w.challenger.total} — ${w.opponent.total}  ·  ${w.concept}", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            if (w.status == "active" && !w.youPlayed) Text("Tap to play for your club", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary)
        }
    }
}

@Composable
private fun WarStandings(w: ClubWar) {
    DuoCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(w.concept, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                SideScore(w.challenger, w.myClubId)
                Text("${if (w.status == "active") (w.msRemaining / 86_400_000L) else 0}d", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                SideScore(w.opponent, w.myClubId)
            }
        }
    }
}

@Composable
private fun SideScore(side: ClubWarSide, myClubId: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(side.name + (if (side.clubId == myClubId) " (you)" else ""), fontWeight = if (side.clubId == myClubId) FontWeight.ExtraBold else FontWeight.Medium, fontSize = 12.sp, color = if (side.clubId == myClubId) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
        Text("${side.total}", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.secondary)
        Text("${side.players} played", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
    }
}
