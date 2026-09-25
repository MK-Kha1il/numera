package com.example.numera.ui.screens

import android.os.SystemClock
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius as GeometryCornerRadius
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.analytics.Analytics
import com.example.numera.data.network.AddMistakeRequest
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SocketClient
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathIconSpinner
import com.example.numera.ui.components.MathText
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.VictoryEffectOverlay
import com.example.numera.ui.components.VictoryParticles
import com.example.numera.ui.components.animatedInt
import com.example.numera.ui.components.pressable
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

// The realtime duel screen. Match flow: connect → synced countdown (VS intro) → question rounds
// with server-graded reveals → result debrief. The socket is HANDED OFF from ArenaScreen (see
// SocketClient.duelHandoffActive); from here this screen owns it and disconnects when the player
// leaves. Every terminal path is covered: win/loss/draw, forfeit (theirs or ours), reconnect
// within the server's grace, match deadline, and the room being gone entirely.
@Composable
fun DuelGameScreen(
    roomId: String,
    opponentName: String,
    opponentRank: String? = null,
    myUserIdHint: Int = 0,
    onFinishGame: () -> Unit,
    // Closes the compete→learn loop (ultra-review #17): jump straight from the result screen
    // into a Growth Practice session over the misses this duel just banked.
    onReviewMisses: () -> Unit = {},
    // Rematch agreed: swap this screen for a fresh one on the new room (same socket, handed off).
    onRematch: (com.example.numera.DuelGame) -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var problemsList by remember { mutableStateOf<List<MathProblem>>(emptyList()) }
    var currentProblemIdx by remember { mutableIntStateOf(0) }

    var myProgress by remember { mutableIntStateOf(0) }
    var oppProgress by remember { mutableIntStateOf(0) }
    var myPoints by remember { mutableIntStateOf(0) }
    var oppPoints by remember { mutableIntStateOf(0) }
    // Deepest point deficit this match — fuels the "comeback" recognition on a win.
    var maxDeficit by remember { mutableIntStateOf(0) }

    var hasAnswered by remember { mutableStateOf(false) }
    var selectedAnswer by remember { mutableStateOf("") }
    // The canonical answer is not shipped with the problem (server-authoritative grading); the
    // server discloses it in its submit_answer ack, and we hold it here to drive the reveal.
    var revealedCorrectAnswer by remember { mutableStateOf("") }
    var revealedExplanation by remember { mutableStateOf("") }
    // The problem index the last verdict belongs to. A slow ack arriving after we advanced used
    // to smear the PREVIOUS problem's answer highlights all over the next one; verdicts are now
    // keyed to the index they graded and dropped if stale.
    var verdictIdx by remember { mutableIntStateOf(-1) }

    var showParticles by remember { mutableStateOf(false) }
    var myUsername by remember { mutableStateOf("You") }
    var myRank by remember { mutableStateOf<String?>(null) }
    var streakCount by remember { mutableIntStateOf(0) }

    // Synced match clock (server-relative offsets mapped onto elapsedRealtime, so device clock
    // skew is irrelevant): countdown until first problem, then time remaining in the match.
    var matchStartAt by remember { mutableLongStateOf(Long.MAX_VALUE) }
    var matchEndAt by remember { mutableLongStateOf(0L) }
    var countdownSeconds by remember { mutableIntStateOf(-1) }
    var remainingSeconds by remember { mutableIntStateOf(-1) }

    var isDuelOver by remember { mutableStateOf(false) }
    var missCount by remember { mutableIntStateOf(0) }
    var duelWinnerId by remember { mutableIntStateOf(-1) }
    var duelIsDraw by remember { mutableStateOf(false) }
    var forfeitByUserId by remember { mutableIntStateOf(0) }
    var forfeitReason by remember { mutableStateOf("") }
    var myUserId by remember { mutableIntStateOf(myUserIdHint) }
    var eloInfo by remember { mutableStateOf<JSONObject?>(null) }
    var favoritedQuestions by remember { mutableStateOf<Set<String>>(emptySet()) }

    // Presence + resilience surfaces.
    var opponentConnected by remember { mutableStateOf(true) }
    var reconnecting by remember { mutableStateOf(false) }
    var roomGone by remember { mutableStateOf(false) }
    var timeExpired by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }

    // Opponent identity for the VS card (from room_status — the server sends rating + W-L record).
    var oppElo by remember { mutableIntStateOf(-1) }
    var oppWins by remember { mutableIntStateOf(-1) }
    var oppMatches by remember { mutableIntStateOf(-1) }
    var oppIsBot by remember { mutableStateOf(false) }

    // Per-round opponent tick: derived from their score/progress deltas (✓ if the answer scored,
    // ✗ if not) — tension you can feel without the server leaking anything extra.
    var oppFlashCorrect by remember { mutableStateOf<Boolean?>(null) }
    var oppFlashKey by remember { mutableIntStateOf(0) }

    // Rematch handshake state: null (offer open) / "waiting" / "incoming" / "unavailable".
    var rematchState by remember { mutableStateOf<String?>(null) }

    // Positive-only emotes (Phase 8): the opponent's latest emote (transient chip by their name)
    // and our own send cooldown (mirrors the server's rate limit so taps aren't silently eaten).
    var oppEmote by remember { mutableStateOf<String?>(null) }
    var oppEmoteKey by remember { mutableIntStateOf(0) }
    var emoteCoolingDown by remember { mutableStateOf(false) }

    val isOverState = rememberUpdatedState(isDuelOver)

    // Leave the match for good: this screen owns the socket now, so tearing it down here is safe.
    val exitDuel: () -> Unit = {
        RetrofitClient.triggerProfileRefresh()
        SocketClient.disconnect()
        onFinishGame()
    }

    // Hardware/gesture back: leaving a live match is a forfeit — make that explicit, never silent.
    BackHandler(enabled = !isDuelOver) { showLeaveDialog = true }
    BackHandler(enabled = isDuelOver) { exitDuel() }

    // ── Socket wiring. Listeners are registered with PRECISE identities and removed one-by-one
    // on dispose: a rematch swaps this screen for a fresh instance on the SAME socket, and the
    // old instance's dispose overlaps the new instance's setup — a blanket off("event") here
    // would strip the listeners the new screen just registered.
    DisposableEffect(roomId) {
        val socket = SocketClient.socket
        if (socket == null) {
            // The socket died between match-found and this screen (should no longer happen with
            // the handoff, but never strand the player on a blank screen if it does).
            roomGone = true
            onDispose { }
        } else {
        // Whether THIS instance handed the socket to a successor (rematch). Deliberately a local
        // — the previous instance's onDispose runs at the END of the nav transition, i.e. AFTER
        // the successor has mounted, so a shared/global flag cleared by the new screen would make
        // this dispose tear down the socket the new match is running on (the same dispose-order
        // race as the original arena freeze bug).
        var handedOff = false

        val onRoomStatus = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            scope.launch(Dispatchers.Main) {
                val firstLoad = problemsList.isEmpty() && data.has("problems")
                if (firstLoad) {
                    val pArray = data.getJSONArray("problems").toString()
                    val type = object : TypeToken<List<MathProblem>>() {}.type
                    problemsList = Gson().fromJson(pArray, type)
                }
                // Synced clocks (relative offsets — immune to device clock skew).
                if (data.has("startsInMs")) {
                    matchStartAt = SystemClock.elapsedRealtime() + data.optLong("startsInMs", 0L)
                }
                if (data.has("remainingMs") && !data.isNull("remainingMs")) {
                    matchEndAt = SystemClock.elapsedRealtime() + data.optLong("remainingMs", 0L)
                }

                var mineProg: Int? = null
                for (key in listOf("p1", "p2")) {
                    val obj = data.optJSONObject(key) ?: continue
                    val id = obj.optInt("id")
                    val prog = obj.optInt("progress")
                    val score = obj.optInt("score")
                    if (id == myUserId) {
                        myProgress = prog
                        myPoints = score
                        mineProg = prog
                    } else {
                        // Opponent-answered cue: their bar moves, a soft haptic tick lands, and a
                        // transient ✓/✗ (derived from whether the answer scored) flashes on their
                        // track — pressure you can feel without looking up from the problem.
                        if (prog > oppProgress && !isDuelOver) {
                            com.example.numera.haptic.HapticManager.playSoft()
                            oppFlashCorrect = (score - oppPoints) >= 20
                            oppFlashKey++
                        }
                        oppProgress = prog
                        oppPoints = score
                        opponentConnected = obj.optBoolean("connected", true)
                        oppIsBot = obj.optBoolean("isBot", false)
                        // Identity card data (rating + career record), sent on the join snapshot.
                        if (!obj.isNull("elo")) oppElo = obj.optInt("elo", -1)
                        if (!obj.isNull("wins")) oppWins = obj.optInt("wins", -1)
                        if (!obj.isNull("matches")) oppMatches = obj.optInt("matches", -1)
                    }
                }
                maxDeficit = maxOf(maxDeficit, oppPoints - myPoints)
                // Reconnect resume: pick up where the server says we are (local index only ever
                // trails the server after a drop; never let it rewind).
                if (firstLoad && mineProg != null && mineProg > currentProblemIdx) {
                    currentProblemIdx = mineProg.coerceAtMost(problemsList.size - 1)
                    hasAnswered = false
                    selectedAnswer = ""
                    revealedCorrectAnswer = ""
                    revealedExplanation = ""
                }
            }
        }

        val onDuelEnd = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            // winnerId is null on a draw — data.getInt() THREW on that, which hung the result
            // screen forever on every drawn match. Parse defensively, prefer the explicit flag.
            val winnerId = if (data.isNull("winnerId")) -1 else data.optInt("winnerId", -1)
            val draw = data.optBoolean("draw", winnerId == -1)
            val forfeitObj = data.optJSONObject("forfeit")
            scope.launch(Dispatchers.Main) {
                duelWinnerId = winnerId
                duelIsDraw = draw
                if (forfeitObj != null) {
                    forfeitByUserId = forfeitObj.optInt("userId")
                    forfeitReason = forfeitObj.optString("reason", "left the match")
                }
                eloInfo = data
                isDuelOver = true
                Analytics.log("duel_finish")
                when {
                    draw -> {
                        Analytics.log("duel_draw")
                        SoundManager.playDraw()
                        com.example.numera.haptic.HapticManager.playMedium()
                    }
                    winnerId == myUserId -> {
                        // Promotion supersedes victory — one moment, one (bigger) sound.
                        val p1 = data.optJSONObject("p1")
                        val p2 = data.optJSONObject("p2")
                        val mine = when {
                            p1?.optInt("id") == myUserId -> p1
                            p2?.optInt("id") == myUserId -> p2
                            else -> null
                        }
                        if (mine?.optBoolean("promoted", false) == true) SoundManager.playPromotion()
                        else SoundManager.playVictory()
                        com.example.numera.haptic.HapticManager.playMajorReward()
                    }
                    else -> {
                        // A lost match is a result, not a mistake — never the wrong-answer sound.
                        SoundManager.playDefeat()
                        com.example.numera.haptic.HapticManager.playMedium()
                    }
                }
                if (forfeitObj != null) Analytics.log("duel_forfeit")
            }
        }

        val onOpponentDisconnected = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject
            val whoId = data?.optInt("userId") ?: -1
            if (whoId != myUserId) {
                scope.launch(Dispatchers.Main) { opponentConnected = false }
            }
        }
        val onOpponentReconnected = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject
            val whoId = data?.optInt("userId") ?: -1
            if (whoId != myUserId) {
                scope.launch(Dispatchers.Main) { opponentConnected = true }
            }
        }
        val onRoomGone = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) { if (!isDuelOver) roomGone = true }
        }
        val onTimeout = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) { timeExpired = true }
        }
        val onOpponentEmote = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val emote = data.optString("emote")
            if (emote.isNotEmpty()) {
                scope.launch(Dispatchers.Main) {
                    oppEmote = emote
                    oppEmoteKey++
                    com.example.numera.haptic.HapticManager.playSoft()
                }
            }
        }

        // ── Rematch handshake (result screen): pending/incoming/unavailable states, and a fresh
        // duel_start on this same socket means both sides accepted — swap screens on the new room.
        val onRematchPending = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) { rematchState = "waiting" }
        }
        val onRematchRequested = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) {
                if (rematchState == null) rematchState = "incoming"
                com.example.numera.haptic.HapticManager.playMedium()
            }
        }
        val onRematchUnavailable = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) { rematchState = "unavailable" }
        }
        val onDuelStart = io.socket.emitter.Emitter.Listener { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@Listener
            val newRoomId = data.optString("roomId")
            if (newRoomId.isEmpty() || newRoomId == roomId) return@Listener
            val ranked = data.optBoolean("ranked", false)
            var oppName = opponentName
            var oppRank: String? = opponentRank
            val opponentObj = data.optJSONObject("opponent")
            if (opponentObj != null) {
                val p1 = opponentObj.optJSONObject("p1")
                val p2 = opponentObj.optJSONObject("p2")
                val opp = if (p1?.optInt("id") == myUserId) p2 else p1
                if (opp != null) {
                    oppName = opp.optString("username", oppName)
                    oppRank = opp.optString("rank").takeIf { it.isNotEmpty() && it != "null" } ?: oppRank
                }
            }
            // Keep the socket alive across the screen swap (same handoff as arena → duel).
            handedOff = true
            SocketClient.duelHandoffActive = true
            Analytics.log("duel_rematch")
            scope.launch(Dispatchers.Main) {
                onRematch(
                    com.example.numera.DuelGame(
                        roomId = newRoomId,
                        opponentName = oppName,
                        opponentRank = oppRank,
                        myUserId = myUserId,
                        ranked = ranked
                    )
                )
            }
        }

        // Our own connection health: banner while the socket.io client auto-reconnects, and a
        // room re-join on success (a new socket id must re-bind to our side server-side).
        val onDisconnected = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) { if (!isDuelOver) reconnecting = true }
        }
        val onConnected = io.socket.emitter.Emitter.Listener {
            scope.launch(Dispatchers.Main) {
                if (reconnecting) {
                    reconnecting = false
                    Analytics.log("duel_reconnected")
                    socket.emit("join_duel_room", JSONObject().put("roomId", roomId))
                }
            }
        }

        socket.on("room_status", onRoomStatus)
        socket.on("duel_end", onDuelEnd)
        socket.on("opponent_disconnected", onOpponentDisconnected)
        socket.on("opponent_reconnected", onOpponentReconnected)
        socket.on("duel_room_gone", onRoomGone)
        socket.on("duel_timeout", onTimeout)
        socket.on("opponent_emote", onOpponentEmote)
        socket.on("rematch_pending", onRematchPending)
        socket.on("rematch_requested", onRematchRequested)
        socket.on("rematch_unavailable", onRematchUnavailable)
        socket.on("duel_start", onDuelStart)
        socket.on(io.socket.client.Socket.EVENT_DISCONNECT, onDisconnected)
        socket.on(io.socket.client.Socket.EVENT_CONNECT, onConnected)

        // The screen already knows its own side (myUserIdHint via nav); joining is not gated on
        // any fetch anymore.
        socket.emit("join_duel_room", JSONObject().put("roomId", roomId))

        onDispose {
            socket.off("room_status", onRoomStatus)
            socket.off("duel_end", onDuelEnd)
            socket.off("opponent_disconnected", onOpponentDisconnected)
            socket.off("opponent_reconnected", onOpponentReconnected)
            socket.off("duel_room_gone", onRoomGone)
            socket.off("duel_timeout", onTimeout)
            socket.off("opponent_emote", onOpponentEmote)
            socket.off("rematch_pending", onRematchPending)
            socket.off("rematch_requested", onRematchRequested)
            socket.off("rematch_unavailable", onRematchUnavailable)
            socket.off("duel_start", onDuelStart)
            socket.off(io.socket.client.Socket.EVENT_DISCONNECT, onDisconnected)
            socket.off(io.socket.client.Socket.EVENT_CONNECT, onConnected)
            // Safety net for any non-back navigation away mid-match: forfeit rather than leaving
            // the opponent to wait out the disconnect grace. No-ops if the duel already ended.
            if (!isOverState.value) {
                SocketClient.leaveDuel(roomId)
            }
            // A rematch handoff keeps the socket alive for the next screen instance (checked via
            // the LOCAL flag — see its declaration for the dispose-order race a global would hit).
            if (!handedOff) {
                SocketClient.disconnect()
            }
        }
        }
    }

    // Profile (username/rank for the VS card, id fallback) + favorites, fetched concurrently
    // and non-blocking: the duel plays fine even if both fail.
    LaunchedEffect(roomId) {
        try {
            val token = RetrofitClient.authToken ?: ""
            coroutineScope {
                val profileDeferred = async(Dispatchers.IO) { RetrofitClient.apiService.getProfile(token) }
                val favsDeferred = async(Dispatchers.IO) { RetrofitClient.apiService.getFavorites(token) }
                val profile = profileDeferred.await()
                val favs = favsDeferred.await()
                if (myUserId == 0) myUserId = profile.id
                myUsername = profile.username
                myRank = profile.competitive_rank
                favoritedQuestions = favs.map { it.question }.toSet()
            }
        } catch (e: Exception) {
            Log.e("DuelGame", "Profile/favorites fetch err: ${e.message}")
        }
    }

    // Auto-clear the opponent's per-round ✓/✗ flash after a readable beat.
    LaunchedEffect(oppFlashKey) {
        if (oppFlashCorrect != null) {
            delay(1500)
            oppFlashCorrect = null
        }
    }
    // Auto-clear the opponent's emote chip.
    LaunchedEffect(oppEmoteKey) {
        if (oppEmote != null) {
            delay(2500)
            oppEmote = null
        }
    }

    // Tick the pre-match countdown (100ms resolution for a crisp 3‑2‑1), then the match clock.
    LaunchedEffect(matchStartAt) {
        if (matchStartAt == Long.MAX_VALUE) return@LaunchedEffect
        while (true) {
            val left = matchStartAt - SystemClock.elapsedRealtime()
            if (left <= 0) {
                countdownSeconds = 0
                SoundManager.playMatchStart()
                break
            }
            val secs = ((left + 999) / 1000).toInt()
            if (secs != countdownSeconds) {
                countdownSeconds = secs
                if (secs <= 3) SoundManager.playCountdown(secs)
                com.example.numera.haptic.HapticManager.playSoft()
            }
            delay(100)
        }
    }
    LaunchedEffect(matchEndAt, isDuelOver) {
        if (matchEndAt == 0L || isDuelOver) return@LaunchedEffect
        var lastTickedSecond = -1
        while (!isDuelOver) {
            remainingSeconds = (((matchEndAt - SystemClock.elapsedRealtime()) / 1000).toInt()).coerceAtLeast(0)
            if (remainingSeconds <= 0) break
            // Final-five-seconds pressure: rising ticks so the clock is audible without looking.
            if (remainingSeconds <= 5 && remainingSeconds != lastTickedSecond) {
                lastTickedSecond = remainingSeconds
                SoundManager.playTick(urgency = (5 - remainingSeconds) / 5f)
            }
            delay(250)
        }
    }

    // ── Terminal error state: the room is gone / socket never made it. Never a silent pop.
    if (roomGone && !isDuelOver) {
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            DuoCard(modifier = Modifier.fillMaxWidth(0.9f).wrapContentHeight().padding(Spacing.l)) {
                Column(
                    modifier = Modifier.padding(Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(Spacing.l)
                ) {
                    Text("Match unavailable", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
                    Text(
                        "This match already ended or the connection was lost before it began. No rating was affected.",
                        fontSize = 14.sp,
                        textAlign = TextAlign.Center,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                    )
                    DuoButton(text = "Back to Arena", onClick = exitDuel, modifier = Modifier.fillMaxWidth())
                }
            }
        }
        return
    }

    // Result first: a duel can end before the problems ever load (instant forfeit, deadline) —
    // the debrief must still show rather than stranding the player on the loader.
    if (isDuelOver) {
        DuelResultScreen(
            didIWin = !duelIsDraw && duelWinnerId == myUserId,
            isDraw = duelIsDraw,
            myPoints = myPoints,
            oppPoints = oppPoints,
            totalProblems = problemsList.size,
            maxDeficit = maxDeficit,
            opponentName = opponentName,
            myUserId = myUserId,
            eloInfo = eloInfo,
            forfeitByUserId = forfeitByUserId,
            forfeitReason = forfeitReason,
            timeExpired = timeExpired,
            missCount = missCount,
            rematchState = rematchState,
            onRequestRematch = {
                com.example.numera.haptic.HapticManager.playMedium()
                SocketClient.requestRematch(roomId)
            },
            onReviewMisses = {
                RetrofitClient.triggerProfileRefresh()
                SocketClient.disconnect()
                onReviewMisses()
            },
            onLeave = exitDuel
        )
        return
    }

    if (problemsList.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(Spacing.l)) {
                NumeraPremiumLoader()
                Text("Entering the arena…", color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    // ── VS intro + synced countdown: identity beat (names, ranks) while both clients count down
    // to the SAME server start tick — nobody sees the first problem early.
    val inCountdown = countdownSeconds != 0 && !isDuelOver
    if (inCountdown) {
        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    myRank?.let { RankBadge(rankName = it, modifier = Modifier.size(28.dp)) }
                    Text(
                        text = myUsername,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary,
                        textAlign = TextAlign.Center
                    )
                }
                Text(text = "⚔️", fontSize = 54.sp)
                Text(
                    text = "VS",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 6.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    opponentRank?.let { RankBadge(rankName = it, modifier = Modifier.size(28.dp)) }
                    Text(
                        text = opponentName,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.secondary,
                        textAlign = TextAlign.Center
                    )
                }
                // Opponent identity card: rating + career record — you're facing a person with
                // a history, not a nameless progress bar. (Hidden for the practice bot.)
                if (!oppIsBot && (oppElo > 0 || oppMatches >= 0)) {
                    Text(
                        text = buildString {
                            if (oppElo > 0) append("$oppElo rating")
                            if (oppMatches > 0 && oppWins >= 0) {
                                if (isNotEmpty()) append(" · ")
                                append("${oppWins}W–${(oppMatches - oppWins).coerceAtLeast(0)}L")
                            }
                        },
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                    )
                }
                Spacer(modifier = Modifier.height(Spacing.m))
                // The shared countdown — big, readable, impossible to miss (a11y: also in text).
                if (countdownSeconds > 0) {
                    Text(
                        text = "$countdownSeconds",
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.tertiary
                    )
                }
                Text(
                    text = "${problemsList.size} problems · most correct answers wins",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                )
            }
        }
        return
    }

    val currentProblem = problemsList.getOrNull(currentProblemIdx) ?: problemsList.last()
    val iAmDone = myProgress >= problemsList.size

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Score race header — the duel's heartbeat: live score front and center,
        // animated tracks underneath, plus lead callout, streak fire, Q counter and match clock.
        val total = problemsList.size.coerceAtLeast(1)
        val myBar by animateFloatAsState(myProgress / total.toFloat(), Motion.standard(), label = "myBar")
        val oppBar by animateFloatAsState(oppProgress / total.toFloat(), Motion.standard(), label = "oppBar")
        DuoCard(
            modifier = Modifier.fillMaxWidth(),
            backgroundColor = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(Spacing.m),
                verticalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = myUsername,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        text = "$myPoints — $oppPoints",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = Spacing.s)
                    )
                    Row(
                        modifier = Modifier.weight(1f),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // The opponent's latest emote pops in next to their name, then fades.
                        AnimatedVisibility(visible = oppEmote != null, enter = fadeIn(), exit = fadeOut()) {
                            Text(text = oppEmote ?: "", fontSize = 18.sp, modifier = Modifier.padding(end = Spacing.xs))
                        }
                        Text(
                            text = opponentName,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.secondary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            textAlign = TextAlign.End
                        )
                    }
                }
                LinearProgressIndicator(
                    progress = { myBar },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.outline
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    LinearProgressIndicator(
                        progress = { oppBar },
                        modifier = Modifier
                            .weight(1f)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.secondary,
                        trackColor = MaterialTheme.colorScheme.outline
                    )
                    // Per-round tick: ✓/✗ flashes as the opponent answers (derived from whether
                    // their answer scored — nothing extra leaves the server).
                    AnimatedVisibility(
                        visible = oppFlashCorrect != null,
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Text(
                            text = if (oppFlashCorrect == true) "✓" else "✗",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = if (oppFlashCorrect == true) CorrectGreen else WrongRed
                        )
                    }
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    Text(
                        text = when {
                            !opponentConnected -> "$opponentName lost connection…"
                            myPoints > oppPoints -> "You lead — keep pushing!"
                            myPoints < oppPoints -> "$opponentName leads — catch up!"
                            else -> "Neck and neck"
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            !opponentConnected -> MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                            myPoints > oppPoints -> CorrectGreen
                            myPoints < oppPoints -> WrongRed
                            else -> MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                        },
                        modifier = Modifier.weight(1f)
                    )
                    if (streakCount >= 2) {
                        Text(
                            text = "🔥 ×$streakCount",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.tertiary
                        )
                    }
                    // Match clock: quiet until the final 30 seconds, then it demands attention.
                    if (remainingSeconds >= 0) {
                        val low = remainingSeconds <= 30
                        Text(
                            text = "⏱ %d:%02d".format(remainingSeconds / 60, remainingSeconds % 60),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = if (low) WrongRed else MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                        )
                    }
                    Text(
                        text = "Q ${(currentProblemIdx + 1).coerceAtMost(total)}/$total",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                    )
                }
            }
        }

        // Emote strip — the sportsmanship channel: five positive-only reactions, rate-limited
        // (matching the server), each a comfortable touch target. No text, nothing to moderate.
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = Spacing.s),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            listOf("👏", "🔥", "🤝", "😅", "🤯").forEach { emote ->
                Text(
                    text = emote,
                    fontSize = 20.sp,
                    modifier = Modifier
                        .padding(horizontal = Spacing.xs)
                        .clip(RoundedCornerShape(CornerRadius.m))
                        .background(
                            MaterialTheme.colorScheme.surfaceVariant.copy(
                                alpha = if (emoteCoolingDown) 0.35f else 1f
                            )
                        )
                        .pressable {
                            if (!emoteCoolingDown) {
                                emoteCoolingDown = true
                                com.example.numera.haptic.HapticManager.playSoft()
                                Analytics.log("duel_emote_sent")
                                SocketClient.sendEmote(roomId, emote)
                                scope.launch {
                                    delay(2500)
                                    emoteCoolingDown = false
                                }
                            }
                        }
                        .padding(horizontal = 12.dp, vertical = 8.dp)
                )
            }
        }

        // Own-connection banner: honest, calm, and it clears itself on reconnect.
        AnimatedVisibility(visible = reconnecting) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.s)
                    .clip(RoundedCornerShape(CornerRadius.m))
                    .background(MilestoneGold.copy(alpha = 0.15f))
                    .padding(Spacing.m),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                MathIconSpinner()
                Text(
                    text = "Connection lost — reconnecting… your progress is safe.",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        // Active Equation Card
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(vertical = 16.dp),
            borderColor = if (hasAnswered && verdictIdx == currentProblemIdx && revealedCorrectAnswer.isNotEmpty()) {
                if (selectedAnswer == revealedCorrectAnswer) CorrectGreen else WrongRed
            } else {
                MaterialTheme.colorScheme.outline
            }
        ) {
            if (iAmDone) {
                // Finished first: a live waiting state that keeps the race visible (the old
                // disabled "Awaiting End Game..." button looked frozen — and could BE frozen,
                // since nothing guaranteed the match would ever end; now the server deadline does).
                Column(
                    modifier = Modifier.fillMaxSize().padding(Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    MathIconSpinner()
                    Spacer(modifier = Modifier.height(Spacing.l))
                    Text(
                        text = "You're done — $myPoints points banked.",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(Spacing.s))
                    Text(
                        text = if (opponentConnected)
                            "$opponentName is on Q ${(oppProgress + 1).coerceAtMost(problemsList.size)}/${problemsList.size}…"
                        else
                            "$opponentName lost connection — you win if they don't return.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                        textAlign = TextAlign.Center
                    )
                }
            } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(8.dp),
                contentAlignment = Alignment.Center
            ) {
                if (currentProblem.question.contains("$") || currentProblem.question.contains("\\")) {
                    MathText(
                        text = currentProblem.question,
                        fontSizePx = 52,
                        color = MaterialTheme.colorScheme.onBackground,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    Text(
                        text = currentProblem.question,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground,
                        textAlign = TextAlign.Center
                    )
                }

                val isFav = favoritedQuestions.contains(currentProblem.question)
                IconButton(
                    onClick = {
                        val nextFavState = !isFav
                        com.example.numera.haptic.HapticManager.playMedium()
                        favoritedQuestions = if (nextFavState) {
                            favoritedQuestions + currentProblem.question
                        } else {
                            favoritedQuestions - currentProblem.question
                        }
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.toggleFavorite(
                                    token,
                                    com.example.numera.data.network.ToggleFavoriteRequest(
                                        title = "Arena Duel Exercise",
                                        category = "Arena",
                                        question = currentProblem.question,
                                        // Neither the answer NOR the worked solution is shipped with
                                        // the problem; use the server-revealed ones, available once
                                        // the player has answered.
                                        correct_answer = revealedCorrectAnswer,
                                        options = currentProblem.options,
                                        explanation = revealedExplanation
                                    )
                                )
                            } catch (e: Exception) {
                                Log.e("DuelGame", "Failed to toggle favorite: ${e.message}")
                                withContext(Dispatchers.Main) {
                                    favoritedQuestions = if (isFav) {
                                        favoritedQuestions + currentProblem.question
                                    } else {
                                        favoritedQuestions - currentProblem.question
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                ) {
                    com.example.numera.ui.components.NumeraIcon(
                        type = com.example.numera.ui.components.NumeraIconType.Favorite,
                        filled = isFav,
                        tint = if (isFav) WrongRed else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
            }
            }
        }

        // Choice Options
        if (!iAmDone) {
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            currentProblem.options.forEach { option ->
                val isSelected = selectedAnswer == option
                // Reveal correctness only once the server's verdict FOR THIS PROBLEM is back.
                val revealed = hasAnswered && verdictIdx == currentProblemIdx && revealedCorrectAnswer.isNotEmpty()
                val isCorrect = revealed && revealedCorrectAnswer == option

                val outlineColor = if (revealed) {
                    if (isCorrect) CorrectGreen else if (isSelected) WrongRed else MaterialTheme.colorScheme.outline
                } else {
                    MaterialTheme.colorScheme.outline
                }

                val depthColor = if (revealed) {
                    if (isCorrect) CorrectGreenPressed else if (isSelected) WrongRed else MaterialTheme.colorScheme.outline
                } else {
                    DuoBorder
                }

                val bgColor = if (revealed) {
                    if (isCorrect) CorrectGreen.copy(alpha = 0.1f)
                    else if (isSelected) WrongRed.copy(alpha = 0.1f)
                    else MaterialTheme.colorScheme.surfaceVariant
                } else {
                    MaterialTheme.colorScheme.surface
                }

                val textColor = if (revealed) {
                    if (isCorrect) CorrectGreenPressed else if (isSelected) WrongRed else MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                } else {
                    MaterialTheme.colorScheme.onBackground
                }

                val bottomDepth = 4.dp
                val isPressed = remember { mutableStateOf(false) }
                val offset = if (isPressed.value && !hasAnswered) bottomDepth else 0.dp

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .pointerInput(hasAnswered, currentProblemIdx) {
                            if (!hasAnswered) {
                                detectTapGestures(
                                    onPress = {
                                        isPressed.value = true
                                        tryAwaitRelease()
                                        isPressed.value = false
                                    },
                                    onTap = {
                                        hasAnswered = true
                                        selectedAnswer = option
                                        revealedCorrectAnswer = ""
                                        revealedExplanation = ""
                                        SoundManager.playLockIn()
                                        com.example.numera.haptic.HapticManager.playSoft()

                                        // Verdicts are keyed to the index they grade — a slow ack
                                        // must never repaint a later problem (the old advance-on-
                                        // a-timer smeared stale answers across rounds).
                                        val answeredIdx = currentProblemIdx
                                        val answeredProblem = problemsList.getOrNull(answeredIdx)
                                        val isLast = answeredIdx >= problemsList.size - 1

                                        val advance: () -> Unit = advance@{
                                            if (currentProblemIdx != answeredIdx || !hasAnswered) return@advance
                                            if (!isLast) {
                                                currentProblemIdx++
                                                hasAnswered = false
                                                selectedAnswer = ""
                                                revealedCorrectAnswer = ""
                                                revealedExplanation = ""
                                            } else {
                                                // Last problem: flip into the waiting state
                                                // (myProgress may lag the server by a beat).
                                                myProgress = maxOf(myProgress, problemsList.size)
                                            }
                                        }

                                        SocketClient.submitAnswer(roomId, option) { correct, correctAnswer, explanation ->
                                            scope.launch(Dispatchers.Main) {
                                                // Drop stale verdicts (we already advanced past this problem).
                                                if (currentProblemIdx != answeredIdx || !hasAnswered) return@launch
                                                verdictIdx = answeredIdx
                                                revealedCorrectAnswer = correctAnswer
                                                revealedExplanation = explanation
                                                if (correct) {
                                                    streakCount++
                                                    SoundManager.playCorrect(streakCount)
                                                    com.example.numera.haptic.HapticManager.playSuccess()
                                                    showParticles = true
                                                } else {
                                                    streakCount = 0
                                                    SoundManager.playWrong()
                                                    com.example.numera.haptic.HapticManager.playError()
                                                    // A duel miss lands in the Mistakes Bank (same flow
                                                    // solo uses) so it resurfaces in growth practice.
                                                    if (answeredProblem != null && correctAnswer.isNotBlank()) {
                                                        missCount++
                                                        scope.launch(Dispatchers.IO) {
                                                            runCatching {
                                                                RetrofitClient.apiService.addMistake(
                                                                    RetrofitClient.authToken ?: "",
                                                                    AddMistakeRequest(
                                                                        category = "Duel",
                                                                        question = answeredProblem.question,
                                                                        correct_answer = correctAnswer,
                                                                        options = answeredProblem.options,
                                                                        explanation = explanation
                                                                    )
                                                                )
                                                            }
                                                        }
                                                    }
                                                }
                                                // One readable beat on the verdict, then move on.
                                                delay(900)
                                                advance()
                                            }
                                        }

                                        // Network resilience: if the verdict never arrives, keep the
                                        // match flowing (no reveal — we never self-judge locally).
                                        scope.launch {
                                            delay(4000)
                                            if (verdictIdx != answeredIdx) advance()
                                        }
                                    }
                                )
                            }
                        }
                        .drawBehind {
                            if (!hasAnswered) {
                                drawRoundRect(
                                    color = depthColor,
                                    cornerRadius = GeometryCornerRadius(16.dp.toPx(), 16.dp.toPx())
                                )
                            }
                        }
                        .padding(bottom = if (isPressed.value && !hasAnswered) 0.dp else bottomDepth)
                        .offset(y = offset)
                        .clip(RoundedCornerShape(CornerRadius.l))
                        .background(bgColor)
                        .border(
                            BorderStroke(1.5.dp, outlineColor),
                            shape = RoundedCornerShape(CornerRadius.l)
                        )
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (option.contains("$") || option.contains("\\")) {
                            MathText(
                                text = option,
                                fontSizePx = 32,
                                color = textColor,
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            Text(
                                text = option,
                                color = textColor,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.weight(1f)
                            )
                        }

                        if (revealed) {
                            if (isCorrect) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Correct", tint = CorrectGreen)
                            } else if (isSelected) {
                                Icon(Icons.Default.Clear, contentDescription = "Wrong", tint = WrongRed)
                            }
                        }
                    }
                }
            }
        }
        } else {
            Spacer(modifier = Modifier.height(1.dp))
        }
    }

    // Confetti overlays the board.
    VictoryParticles(trigger = showParticles) { showParticles = false }
    }

    // Leaving a live match = forfeiting it. Say so, then honor the choice instantly.
    if (showLeaveDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            title = { Text("Leave the match?", fontWeight = FontWeight.ExtraBold) },
            text = { Text("Leaving now forfeits the match to $opponentName.") },
            confirmButton = {
                TextButton(onClick = {
                    showLeaveDialog = false
                    Analytics.log("duel_forfeit")
                    SocketClient.leaveDuel(roomId)
                    exitDuel()
                }) { Text("Forfeit & leave", fontWeight = FontWeight.Bold, color = WrongRed) }
            },
            dismissButton = {
                TextButton(onClick = { showLeaveDialog = false }) { Text("Keep playing") }
            }
        )
    }
}

// The post-match debrief: honest outcome (win / loss / DRAW — draws used to hang the screen),
// the emotional read of the match (comeback, flawless, photo-finish, forfeit), the unified
// rating movement with a count-up, and the compete→learn exit ramp.
@Composable
private fun DuelResultScreen(
    didIWin: Boolean,
    isDraw: Boolean,
    myPoints: Int,
    oppPoints: Int,
    totalProblems: Int,
    maxDeficit: Int,
    opponentName: String,
    myUserId: Int,
    eloInfo: JSONObject?,
    forfeitByUserId: Int,
    forfeitReason: String,
    timeExpired: Boolean,
    missCount: Int,
    rematchState: String?,
    onRequestRematch: () -> Unit,
    onReviewMisses: () -> Unit,
    onLeave: () -> Unit
) {
    val isCasual = eloInfo?.optBoolean("isCasual", false) ?: false
    var myChange = 0
    var myNewRating = 0
    var myNewRank = ""
    var myRatingMoved = false
    var didIGetPromoted = false
    var didICheat = false
    var cheatReason: String? = null

    val p1Obj = eloInfo?.optJSONObject("p1")
    val p2Obj = eloInfo?.optJSONObject("p2")
    val mine = when {
        p1Obj != null && p1Obj.optInt("id") == myUserId -> p1Obj
        p2Obj != null && p2Obj.optInt("id") == myUserId -> p2Obj
        else -> null
    }
    if (mine != null) {
        myChange = mine.optInt("ratingDelta")
        myNewRating = mine.optInt("newDisplayRating")
        myNewRank = mine.optString("newRank")
        myRatingMoved = mine.optBoolean("ratingMoved", false)
        didIGetPromoted = mine.optBoolean("promoted", false)
        didICheat = mine.optBoolean("cheated", false)
        cheatReason = mine.optString("integrityReason").takeIf { it.isNotEmpty() && it != "null" }
    }

    val theyForfeited = forfeitByUserId != 0 && forfeitByUserId != myUserId
    val iForfeited = forfeitByUserId != 0 && forfeitByUserId == myUserId

    // The emotional read — one line that names what actually happened out there.
    val perfect = didIWin && myPoints >= totalProblems * 20
    val comeback = didIWin && maxDeficit >= 40
    val photoFinish = !isDraw && kotlin.math.abs(myPoints - oppPoints) <= 20 && !theyForfeited && !iForfeited
    val momentLine = when {
        didICheat -> null
        theyForfeited -> "$opponentName ${if (forfeitReason == "connection lost") "lost connection" else "left the match"} — the win is yours."
        iForfeited -> "You left the match, so it was forfeited."
        perfect -> "Flawless — every answer correct."
        comeback -> "Comeback win — you were $maxDeficit points down."
        isDraw -> "Dead even after $totalProblems problems."
        photoFinish && didIWin -> "A photo finish — decided by a single answer."
        photoFinish -> "One answer short — next time it's yours."
        timeExpired -> "Time ran out — the match was scored as it stood."
        else -> null
    }

    Box(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        var endRevealed by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) { endRevealed = true }
        AnimatedVisibility(visible = endRevealed, enter = Motion.rewardEnter()) {
            DuoCard(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .wrapContentHeight()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = when {
                            isDraw -> "DRAW"
                            didIWin -> "VICTORY"
                            else -> "DEFEAT"
                        },
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = when {
                            isDraw -> MaterialTheme.colorScheme.onSurface
                            didIWin -> CorrectGreen
                            else -> WrongRed
                        },
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "$myPoints — $oppPoints vs $opponentName",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )

                    momentLine?.let {
                        Text(
                            text = it,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (didIWin || isDraw) MaterialTheme.colorScheme.tertiary
                                    else MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                            textAlign = TextAlign.Center
                        )
                    }

                    Text(
                        text = if (isCasual) "Casual match — nothing at stake but pride" else "Ranked match",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    if (!isCasual) {
                        if (myRatingMoved) {
                            // Count the rating up/down to its new value — a number that MOVES
                            // reads as earned, not assigned. Seeded at the pre-match rating so it
                            // actually counts (an unseeded animatedInt snaps on first frame), and
                            // it ticks while climbing — the engine's throttle caps the rate.
                            // (reduce-motion snaps instantly and therefore stays silent)
                            var ratingTarget by remember { mutableIntStateOf(myNewRating - myChange) }
                            LaunchedEffect(Unit) { ratingTarget = myNewRating }
                            val animatedRating = animatedInt(target = ratingTarget)
                            LaunchedEffect(animatedRating) {
                                if (animatedRating != myNewRating) SoundManager.playTick()
                            }
                            Text(
                                text = "Rating: $animatedRating (${if (myChange >= 0) "+" else ""}$myChange)",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground
                            )
                        } else {
                            Text(
                                text = "Practice match — rating unchanged",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                                textAlign = TextAlign.Center
                            )
                        }

                        if (myNewRank.isNotEmpty() && myNewRank != "MathBot") {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                RankBadge(rankName = myNewRank, modifier = Modifier.size(32.dp))
                                Text(
                                    text = "Rank: $myNewRank",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                                )
                            }
                        }

                        if (didIGetPromoted) {
                            Text(
                                text = "Ranked up to $myNewRank",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = CorrectGreen,
                                textAlign = TextAlign.Center
                            )
                        }

                        if (didICheat) {
                            Text(
                                text = "Solve times looked automated, so this ranked match was forfeited." +
                                    (cheatReason?.let { "\n($it)" } ?: ""),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = WrongRed,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = when {
                            isDraw -> "An even match — one more problem would have settled it."
                            didIWin -> "Well played."
                            didICheat -> ""
                            else -> "Review the misses and run it back."
                        },
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    // "Run it back" — the single strongest next-match lever. Offered while the
                    // server's rematch window is open, for human opponents who didn't forfeit out.
                    val rematchOffered = (eloInfo?.optBoolean("rematchAvailable", false) ?: false) &&
                        forfeitByUserId == 0 && !didICheat
                    if (rematchOffered) {
                        when (rematchState) {
                            "waiting" -> DuoButton(
                                text = "Waiting for $opponentName…",
                                enabled = false,
                                onClick = {},
                                modifier = Modifier.fillMaxWidth()
                            )
                            "incoming" -> DuoButton(
                                text = "Accept $opponentName's rematch",
                                onClick = onRequestRematch,
                                color = CorrectGreen,
                                modifier = Modifier.fillMaxWidth()
                            )
                            "unavailable" -> Text(
                                text = "Rematch unavailable — $opponentName has left.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                                textAlign = TextAlign.Center
                            )
                            else -> DuoButton(
                                text = "Rematch",
                                onClick = onRequestRematch,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Compete→learn loop: the problems missed this duel were banked to the
                    // Mistakes Bank as they happened; offer to review them now rather than
                    // letting a fast-paced loss teach nothing.
                    if (missCount > 0) {
                        DuoButton(
                            text = "Review your $missCount miss${if (missCount == 1) "" else "es"}",
                            onClick = onReviewMisses,
                            color = CorrectGreen,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    DuoButton(
                        text = "Leave Arena",
                        onClick = onLeave,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        if (didIWin) {
            // An equipped Victory Effect plays instead of the default
            // confetti — elegant, not explosive. Falls back to confetti when nothing is equipped.
            val victoryKey = remember { RetrofitClient.equippedVictoryKey }
            if (!victoryKey.isNullOrEmpty()) {
                VictoryEffectOverlay(victoryKey = victoryKey, modifier = Modifier.fillMaxSize())
            } else {
                var winBurst by remember { mutableStateOf(true) }
                VictoryParticles(trigger = winBurst) { winBurst = false }
            }
        }
    }
}
