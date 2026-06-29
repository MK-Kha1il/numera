package com.example.numera.ui.feature.arena

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Live group/class competitive rooms (audit #19 — Kahoot-style). Host opens a room → others join by
// code → host starts → everyone races the same server-graded set → live podium. Server-authoritative
// (routes/liveRoom.js). Socket push (join_live_room channel + live_room_update ping) gives instant
// liveness, with a slower REST poll as the graceful fallback.
@Composable
fun LiveRoomScreen(onExit: () -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var phase by remember { mutableStateOf("menu") } // menu | lobby | playing | done
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    var roomId by remember { mutableIntStateOf(0) }
    var code by remember { mutableStateOf("") }
    var isHost by remember { mutableStateOf(false) }
    var joinCode by remember { mutableStateOf("") }

    var state by remember { mutableStateOf<LiveRoomState?>(null) }
    var problems by remember { mutableStateOf(listOf<LiveRoomProblem>()) }
    var qIndex by remember { mutableIntStateOf(0) }
    var myScore by remember { mutableIntStateOf(0) }
    var podium by remember { mutableStateOf(listOf<LiveStanding>()) }

    fun create() {
        if (busy) return; busy = true; error = null
        scope.launch(Dispatchers.IO) {
            try {
                val r = RetrofitClient.apiService.createLiveRoom(token)
                roomId = r.roomId; code = r.code; isHost = true; phase = "lobby"
            } catch (_: Exception) { error = "Couldn't create a room." } finally { busy = false }
        }
    }

    fun join() {
        if (busy || joinCode.length < 4) return; busy = true; error = null
        scope.launch(Dispatchers.IO) {
            try {
                val r = RetrofitClient.apiService.joinLiveRoom(token, joinCode.trim().uppercase())
                roomId = r.roomId; code = r.code; isHost = r.isHost; phase = "lobby"
            } catch (_: Exception) { error = "Couldn't join — check the code." } finally { busy = false }
        }
    }

    fun start() {
        if (busy) return; busy = true
        scope.launch(Dispatchers.IO) {
            try {
                val r = RetrofitClient.apiService.startLiveRoom(token, roomId)
                problems = r.problems; qIndex = 0; phase = "playing"
            } catch (_: Exception) { error = "Couldn't start." } finally { busy = false }
        }
    }

    fun answer(opt: String) {
        if (busy) return; busy = true
        scope.launch(Dispatchers.IO) {
            try {
                val r = RetrofitClient.apiService.answerLiveRoom(token, roomId, LiveAnswerRequest(qIndex, opt))
                myScore = r.score
                if (qIndex + 1 < problems.size) qIndex += 1 else qIndex = problems.size // done answering
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    fun finish() {
        if (busy) return; busy = true
        scope.launch(Dispatchers.IO) {
            try {
                val r = RetrofitClient.apiService.finishLiveRoom(token, roomId)
                podium = r.podium; phase = "done"
            } catch (_: Exception) {} finally { busy = false }
        }
    }

    // One authoritative room fetch + phase transition, shared by the poll loop and the socket push.
    suspend fun applyRoomState() {
        if (roomId == 0) return
        try {
            val s = RetrofitClient.apiService.getLiveRoom(token, roomId)
            state = s
            if (phase == "lobby" && s.status == "active") {
                problems = s.problems; qIndex = 0; phase = "playing"
            } else if (s.status == "done") {
                podium = s.standings; phase = "done"
            }
        } catch (_: Exception) {}
    }

    // Instant liveness: subscribe to the room's socket channel so a server push (player joined, host
    // started, score moved, host ended) re-fetches immediately. The poll below stays as a fallback if
    // the socket is unavailable, so behaviour degrades gracefully to the original REST-only flow.
    DisposableEffect(roomId) {
        if (roomId != 0) {
            SocketClient.connect() // no-op if already connected; attaches the JWT auth
            SocketClient.joinLiveRoom(roomId)
            SocketClient.onLiveRoomUpdate { scope.launch { applyRoomState() } }
        }
        onDispose {
            if (roomId != 0) {
                SocketClient.offLiveRoomUpdate()
                SocketClient.leaveLiveRoom(roomId)
            }
        }
    }

    // Poll room state for liveness while in the lobby or playing — the fallback when no socket push
    // arrives (slower cadence now that the socket carries the instant path).
    LaunchedEffect(phase, roomId) {
        while ((phase == "lobby" || phase == "playing") && roomId != 0) {
            applyRoomState()
            delay(3000)
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🎉 Live Room", fontWeight = FontWeight.ExtraBold, fontSize = 22.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onExit) { Text("Exit") }
        }
        error?.let { Text(it, color = WrongRed, fontSize = 13.sp, fontWeight = FontWeight.Bold) }

        when (phase) {
            "menu" -> {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                        Text("Play live, together.", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                        Text("Host a room and share the code, or join one — everyone races the same questions and a live podium decides the winner.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                    }
                }
                DuoButton(text = if (busy) "…" else "Host a Room", onClick = { create() }, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(
                    value = joinCode,
                    onValueChange = { if (it.length <= 6) joinCode = it.uppercase() },
                    label = { Text("Join with a code") },
                    placeholder = { Text("ABC123") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, capitalization = KeyboardCapitalization.Characters),
                    modifier = Modifier.fillMaxWidth()
                )
                DuoButton(text = "Join Room", enabled = joinCode.length in 4..6 && !busy, onClick = { join() }, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.fillMaxWidth())
            }

            "lobby" -> {
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                        Text("ROOM CODE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                        Text(code, fontSize = 40.sp, fontWeight = FontWeight.Black, letterSpacing = 4.sp, color = MaterialTheme.colorScheme.primary)
                        Text(if (isHost) "Share the code, then start when everyone's in." else "Waiting for the host to start…", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                    }
                }
                StandingsList(state?.standings ?: emptyList(), "In the room")
                if (isHost) DuoButton(text = if (busy) "…" else "Start Room", onClick = { start() }, modifier = Modifier.fillMaxWidth())
            }

            "playing" -> {
                if (qIndex < problems.size) {
                    val p = problems[qIndex]
                    Text("Question ${qIndex + 1} of ${problems.size} · Score $myScore", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.secondary)
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) { MathText(text = p.question, fontSizePx = 44) }
                    }
                    p.options.forEach { opt ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable(enabled = !busy) { answer(opt) },
                            shape = RoundedCornerShape(CornerRadius.m),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.m), contentAlignment = Alignment.Center) { MathText(text = opt, fontSizePx = 36) }
                        }
                    }
                } else {
                    Text("✅ All answered — score $myScore", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = CorrectGreen)
                    Text(if (isHost) "End the room when everyone's done." else "Waiting for the host to end the room…", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                    StandingsList(state?.standings ?: emptyList(), "Live standings")
                    if (isHost) DuoButton(text = if (busy) "…" else "End Room & Show Podium", onClick = { finish() }, modifier = Modifier.fillMaxWidth())
                }
            }

            else -> {
                Text("🏆 Final Podium", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                StandingsList(podium, "Results")
                DuoButton(text = "Done", onClick = onExit, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun StandingsList(standings: List<LiveStanding>, title: String) {
    if (standings.isEmpty()) return
    DuoCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.secondary)
            standings.forEach { s ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(
                        "#${s.position}  ${s.username}",
                        fontSize = 13.sp,
                        fontWeight = if (s.position == 1) FontWeight.Black else FontWeight.SemiBold,
                        color = when (s.position) { 1 -> MilestoneGold; 2 -> MedalSilver; 3 -> MedalBronze; else -> MaterialTheme.colorScheme.onSurface }
                    )
                    Text("${s.score}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}
