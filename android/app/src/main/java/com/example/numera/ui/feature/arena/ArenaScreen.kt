package com.example.numera.ui.feature.arena

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.pressable
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable
fun ArenaScreen(
    user: User?,
    onStartDuelGame: (com.example.numera.DuelGame) -> Unit
) {
    var matchmakingMode by remember { mutableStateOf<String?>(null) } // null, "ranked", "casual"
    var friendLobbyState by remember { mutableStateOf<String?>(null) } // null, "create", "join_input", "join"
    var friendRoomCode by remember { mutableStateOf("") }
    var joinRoomCodeInput by remember { mutableStateOf("") }
    var friendRoomError by remember { mutableStateOf("") }
    var queueSecondsElapsed by remember { mutableIntStateOf(0) }
    // Server-pushed bot offer (never forced): after ~10s of empty queue the server offers a
    // clearly-labeled practice bot inside the same live-duel experience.
    var botOfferAvailable by remember { mutableStateOf(false) }
    // Matchmaking failures the player must actually see (already-in-match, match start failed).
    var queueError by remember { mutableStateOf("") }
    // Process-death rejoin: a live match found on entry (app was killed mid-duel; the server's
    // disconnect grace is still ticking) — offered back to the player instead of lost blind.
    var resumeDuel by remember { mutableStateOf<com.example.numera.DuelGame?>(null) }
    var showPuzzleRush by remember { mutableStateOf(false) }
    var showAsyncDuel by remember { mutableStateOf(false) }
    var showBotDuel by remember { mutableStateOf(false) }
    var showReasoning by remember { mutableStateOf(false) }
    var showLiveRoom by remember { mutableStateOf(false) }
    var showChallenges by remember { mutableStateOf(false) }
    var showTournament by remember { mutableStateOf(false) }
    var showSeason by remember { mutableStateOf(false) }
    // Ranked requires fair-play (telemetry) consent so the server's anti-cheat scorer may run.
    var showRankedConsent by remember { mutableStateOf(false) }
    var consentGrantedThisSession by remember { mutableStateOf(false) }
    // One-time placement rank-reveal ceremony (audit #20): fires once when a player finishes placement.
    var showRankReveal by remember(user?.competitive_matches, user?.rank_revealed) {
        mutableStateOf((user?.competitive_matches ?: 0) >= 5 && (user?.rank_revealed ?: 0) == 0)
    }
    val scope = rememberCoroutineScope()

    val hasFairplayConsent = consentGrantedThisSession || (user?.telemetry_enabled ?: 0) == 1

    DisposableEffect(Unit) {
        onDispose {
            SocketClient.leaveQueue()
            // Do NOT tear the socket down while a found match is being handed to DuelGameScreen —
            // this dispose fires as the navigation completes, and disconnect() also off()s the
            // listeners the duel screen just registered (the old always-disconnect here was the
            // root cause of duels freezing on "waiting" / never receiving duel_end).
            if (!SocketClient.duelHandoffActive) {
                SocketClient.disconnect()
            }
        }
    }

    LaunchedEffect(matchmakingMode, friendLobbyState) {
        if (matchmakingMode != null || friendLobbyState != null) {
            SocketClient.connect()
            val sock = SocketClient.socket

            sock?.off("friend_room_created")
            sock?.off("friend_room_error")
            sock?.off("friend_room_expired")
            sock?.off("duel_start")
            sock?.off("matchmaking_error")
            sock?.off("bot_offer")

            sock?.on("matchmaking_error") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val code = data.optString("code")
                val message = data.optString("message")
                scope.launch(Dispatchers.Main) {
                    matchmakingMode = null
                    when (code) {
                        "FAIRPLAY_CONSENT_REQUIRED" -> showRankedConsent = true
                        else -> queueError = message.ifEmpty { "Matchmaking failed — please try again." }
                    }
                }
            }

            sock?.on("bot_offer") { _ ->
                scope.launch(Dispatchers.Main) { botOfferAvailable = true }
            }

            sock?.on("friend_room_created") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val code = data.getString("roomCode")
                scope.launch(Dispatchers.Main) {
                    friendRoomCode = code
                }
            }

            sock?.on("friend_room_error") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val msg = data.getString("message")
                scope.launch(Dispatchers.Main) {
                    friendRoomError = msg
                    friendLobbyState = "join_input" // go back to input on error
                }
            }

            sock?.on("friend_room_expired") { _ ->
                scope.launch(Dispatchers.Main) {
                    if (friendLobbyState == "create") {
                        friendRoomCode = ""
                        friendLobbyState = null
                        queueError = "Your lobby code expired — create a new one when your friend is ready."
                    }
                }
            }

            sock?.on("duel_start") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val roomId = data.getString("roomId")
                val opponentObj = data.optJSONObject("opponent")
                val ranked = data.optBoolean("ranked", false)

                var opponentName = "Opponent"
                var opponentRank: String? = null
                if (opponentObj != null && opponentObj.has("p1")) {
                    val p1 = opponentObj.getJSONObject("p1")
                    val p2 = opponentObj.getJSONObject("p2")
                    val opp = if (p1.optInt("id") == user?.id) p2 else p1
                    opponentName = opp.optString("username", "Opponent")
                    opponentRank = opp.optString("rank").takeIf { it.isNotEmpty() && it != "null" }
                }

                // Hand the live socket to DuelGameScreen BEFORE navigating — see onDispose above.
                SocketClient.duelHandoffActive = true
                com.example.numera.analytics.Analytics.log("duel_match_found")
                // The searching state resolves: an opponent exists. Alert, not alarming.
                com.example.numera.sound.SoundManager.playMatchFound()
                com.example.numera.haptic.HapticManager.playMedium()
                scope.launch(Dispatchers.Main) {
                    matchmakingMode = null
                    friendLobbyState = null
                    onStartDuelGame(
                        com.example.numera.DuelGame(
                            roomId = roomId,
                            opponentName = opponentName,
                            opponentRank = opponentRank,
                            myUserId = user?.id ?: 0,
                            ranked = ranked
                        )
                    )
                }
            }

            if (matchmakingMode != null) {
                queueError = ""
                botOfferAvailable = false
                SocketClient.joinQueue(matchmakingMode!!)
                com.example.numera.analytics.Analytics.log("arena_queue_start")
            } else if (friendLobbyState == "create") {
                SocketClient.createFriendRoom()
            } else if (friendLobbyState == "join") {
                SocketClient.joinFriendRoom(joinRoomCodeInput)
            }
        } else {
            SocketClient.leaveQueue()
            botOfferAvailable = false
        }
    }

    LaunchedEffect(matchmakingMode) {
        if (matchmakingMode != null) {
            queueSecondsElapsed = 0
            while (matchmakingMode != null) {
                kotlinx.coroutines.delay(1000)
                queueSecondsElapsed++
            }
        }
    }

    // On entry: ask the server whether a live match is still waiting on us (process-death
    // rejoin — the emit is buffered until the socket connects, so no connection race here).
    LaunchedEffect(Unit) {
        SocketClient.connect()
        SocketClient.findMyDuel { roomId, oppName, oppRank, ranked ->
            if (roomId != null) {
                scope.launch(Dispatchers.Main) {
                    resumeDuel = com.example.numera.DuelGame(
                        roomId = roomId,
                        opponentName = oppName,
                        opponentRank = oppRank,
                        myUserId = user?.id ?: 0,
                        ranked = ranked
                    )
                }
            }
        }
    }

    // Self-contained modes render over the arena while active.
    if (showPuzzleRush) {
        PuzzleRushScreen(user = user, onExit = { showPuzzleRush = false })
        return
    }
    if (showAsyncDuel) {
        AsyncDuelScreen(user = user, onExit = { showAsyncDuel = false })
        return
    }
    if (showBotDuel) {
        BotDuelScreen(onExit = { showBotDuel = false })
        return
    }
    if (showReasoning) {
        ReasoningArenaScreen(onExit = { showReasoning = false })
        return
    }
    if (showLiveRoom) {
        LiveRoomScreen(onExit = { showLiveRoom = false })
        return
    }
    if (showChallenges) {
        ChallengesScreen(onBack = { showChallenges = false })
        return
    }
    if (showTournament) {
        TournamentScreen(user = user, onExit = { showTournament = false })
        return
    }
    if (showSeason) {
        SeasonScreen(user = user, onExit = { showSeason = false })
        return
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        if (matchmakingMode != null) {
            Box(
                modifier = Modifier.fillMaxSize().padding(Spacing.xl),
                contentAlignment = Alignment.Center
            ) {
                DuoCard(
                    modifier = Modifier.fillMaxWidth().wrapContentHeight()
                ) {
                    Column(
                        modifier = Modifier.padding(Spacing.xl),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(Spacing.l)
                    ) {
                        com.example.numera.ui.components.MathIconSpinner()

                        Text(
                            text = "SEARCHING FOR MATCH",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 20.sp,
                            color = MaterialTheme.colorScheme.primary
                        )

                        Text(
                            text = "Mode: ${matchmakingMode?.uppercase()}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.secondary
                        )

                        Text(
                            text = "Time elapsed: ${queueSecondsElapsed}s",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                        )

                        Text(
                            text = if (queueSecondsElapsed < 6) "Finding the fairest opponent for your skill…"
                                   else "Widening the search to match you sooner…",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(Spacing.l))

                        // Guaranteed match: at current population the queue can sit empty forever.
                        // The SERVER offers a clearly-labeled practice bot (~10s) — never forces
                        // one — and accepting keeps the same live-duel experience: same countdown,
                        // same race UI, just rating-neutral. Staying in the queue is also fine;
                        // a human match still takes priority until the bot duel actually starts.
                        if (botOfferAvailable) {
                            Text(
                                text = "Quiet out there right now — face the training bot while you wait? Practice match, rating unchanged.",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                                textAlign = TextAlign.Center
                            )
                            DuoButton(
                                text = "Play the practice bot",
                                onClick = {
                                    com.example.numera.analytics.Analytics.log("bot_offer_accepted")
                                    SocketClient.acceptBotOffer()
                                },
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        DuoButton(
                            text = "Cancel Search",
                            onClick = {
                                com.example.numera.analytics.Analytics.log("arena_queue_cancel")
                                matchmakingMode = null
                            },
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        } else if (friendLobbyState == "create") {
            Box(
                modifier = Modifier.fillMaxSize().padding(Spacing.xl),
                contentAlignment = Alignment.Center
            ) {
                DuoCard(
                    modifier = Modifier.fillMaxWidth().wrapContentHeight()
                ) {
                    Column(
                        modifier = Modifier.padding(Spacing.xl),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(Spacing.l)
                    ) {
                        Text(
                            text = "FRIEND LOBBY CREATED",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )

                        if (friendRoomCode.isEmpty()) {
                            com.example.numera.ui.components.MathIconSpinner()
                            Text("Generating Room Code...", color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary), fontSize = 14.sp)
                        } else {
                            Text(
                                text = friendRoomCode,
                                fontSize = 48.sp,
                                fontWeight = FontWeight.Black,
                                letterSpacing = 4.sp,
                                color = MaterialTheme.colorScheme.secondary,
                                textAlign = TextAlign.Center
                            )

                            Text(
                                text = "Share this 4-digit code with your friend.",
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                                textAlign = TextAlign.Center
                            )

                            Text(
                                text = "Waiting for friend to join...",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                textAlign = TextAlign.Center
                            )
                        }

                        Spacer(modifier = Modifier.height(Spacing.l))

                        DuoButton(
                            text = "Cancel Lobby",
                            onClick = {
                                friendLobbyState = null
                                friendRoomCode = ""
                            },
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        } else if (friendLobbyState == "join_input" || friendLobbyState == "join") {
            Box(
                modifier = Modifier.fillMaxSize().padding(Spacing.xl),
                contentAlignment = Alignment.Center
            ) {
                DuoCard(
                    modifier = Modifier.fillMaxWidth().wrapContentHeight()
                ) {
                    Column(
                        modifier = Modifier.padding(Spacing.xl),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(Spacing.l)
                    ) {
                        Text(
                            text = "JOIN FRIEND LOBBY",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )

                        OutlinedTextField(
                            value = joinRoomCodeInput,
                            onValueChange = {
                                if (it.length <= 4 && it.all { char -> char.isDigit() }) {
                                    joinRoomCodeInput = it
                                }
                            },
                            label = { Text("4-Digit Code") },
                            placeholder = { Text("1234") },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth()
                        )

                        if (friendRoomError.isNotEmpty()) {
                            Text(
                                text = friendRoomError,
                                color = WrongRed,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            )
                        }

                        Spacer(modifier = Modifier.height(Spacing.s))

                        DuoButton(
                            text = "Join Lobby",
                            enabled = joinRoomCodeInput.length == 4 && friendLobbyState != "join",
                            onClick = {
                                friendRoomError = ""
                                friendLobbyState = "join"
                            },
                            modifier = Modifier.fillMaxWidth()
                        )

                        DuoButton(
                            text = "Cancel",
                            onClick = {
                                friendLobbyState = null
                                joinRoomCodeInput = ""
                                friendRoomError = ""
                            },
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(Spacing.l),
                verticalArrangement = Arrangement.spacedBy(Spacing.l)
            ) {
                // Live match still waiting on us (app died mid-duel): one tap back in before
                // the disconnect grace forfeits it.
                resumeDuel?.let { resume ->
                    item {
                        DuoCard(
                            modifier = Modifier.fillMaxWidth(),
                            borderColor = CorrectGreen.copy(alpha = 0.6f)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(Spacing.m),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Live match in progress",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "You're still in a match against ${resume.opponentName} — return now before it forfeits.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }
                                DuoButton(
                                    text = "Return",
                                    color = CorrectGreen,
                                    onClick = {
                                        com.example.numera.analytics.Analytics.log("duel_resumed")
                                        SocketClient.duelHandoffActive = true
                                        resumeDuel = null
                                        onStartDuelGame(resume.copy(myUserId = user?.id ?: resume.myUserId))
                                    }
                                )
                            }
                        }
                    }
                }

                // Surface matchmaking failures instead of silently dropping back to the arena.
                if (queueError.isNotEmpty()) {
                    item {
                        DuoCard(
                            modifier = Modifier.fillMaxWidth(),
                            borderColor = WrongRed.copy(alpha = 0.6f)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(Spacing.m),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                            ) {
                                Text(
                                    text = queueError,
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    modifier = Modifier.weight(1f)
                                )
                                DuoButton(
                                    text = "OK",
                                    onClick = { queueError = "" },
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                }

                // Player Stats Header
                item {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.l)
                        ) {
                            val cMatches = user?.competitive_matches ?: 0
                            val placed = cMatches >= 5
                            val cRank = user?.competitive_rank ?: "Unranked (Placement: 0/5)"

                            RankBadge(
                                rankName = cRank,
                                modifier = Modifier.size(72.dp)
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = if (placed) cRank else "Unranked",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )

                                if (placed) {
                                    Text(
                                        text = "${user?.elo ?: 1000} Competitive Rating",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                } else {
                                    // Placement narrative (audit #20): make the path to a rank explicit.
                                    Text(
                                        text = "Placement: $cMatches/5",
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "Play ${5 - cMatches} more ranked game${if (5 - cMatches == 1) "" else "s"} to earn your rank",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                    )
                                }

                                Spacer(modifier = Modifier.height(Spacing.xs))

                                val wins = user?.arena_wins ?: 0
                                val winRate = if (cMatches > 0) (wins * 100) / cMatches else 0

                                Text(
                                    text = "Record: $wins W - ${cMatches - wins} L ($winRate% win rate)",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
                                )
                            }
                        }
                    }
                }

                // ── LIVE DUEL — the headline of the arena. Ranked and Casual are the same
                // realtime experience with different stakes, so they share one hero card
                // instead of two identical full-weight ones.
                item {
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = Alpha.secondary)
                    ) {
                        Box(modifier = Modifier.fillMaxWidth()) {
                            // Accent wash — the hero reads as the arena's marquee, not a gray box.
                            Box(
                                modifier = Modifier
                                    .matchParentSize()
                                    .background(
                                        Brush.linearGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                                                MaterialTheme.colorScheme.secondary.copy(alpha = 0.06f),
                                                Color.Transparent
                                            )
                                        )
                                    )
                            )
                            Column(
                                modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                                verticalArrangement = Arrangement.spacedBy(Spacing.m)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(52.dp)
                                            .background(
                                                Brush.radialGradient(
                                                    listOf(
                                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.38f),
                                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                                                    )
                                                ),
                                                RoundedCornerShape(CornerRadius.l)
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("⚔️", fontSize = 26.sp)
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                        ) {
                                            Text(
                                                text = "Live Duel",
                                                fontWeight = FontWeight.Black,
                                                fontSize = 19.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            val livePulse by rememberInfiniteTransition(label = "livePulse")
                                                .animateFloat(
                                                    initialValue = 0.45f,
                                                    targetValue = 1f,
                                                    animationSpec = infiniteRepeatable(
                                                        animation = tween(900),
                                                        repeatMode = RepeatMode.Reverse
                                                    ),
                                                    label = "liveAlpha"
                                                )
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(7.dp)
                                                        .background(
                                                            CorrectGreen.copy(alpha = livePulse),
                                                            RoundedCornerShape(CornerRadius.full)
                                                        )
                                                )
                                                Text(
                                                    text = "LIVE",
                                                    fontSize = 10.sp,
                                                    fontWeight = FontWeight.Black,
                                                    letterSpacing = 1.sp,
                                                    color = CorrectGreen
                                                )
                                            }
                                        }
                                        Text(
                                            text = "Face a real opponent in realtime — five problems, fastest correct answers take the match.",
                                            fontSize = 12.sp,
                                            lineHeight = 16.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                        )
                                    }
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    DuoButton(
                                        text = "Ranked",
                                        onClick = {
                                            if (hasFairplayConsent) matchmakingMode = "ranked"
                                            else showRankedConsent = true
                                        },
                                        modifier = Modifier.weight(1f)
                                    )
                                    DuoButton(
                                        text = "Casual",
                                        onClick = { matchmakingMode = "casual" },
                                        color = MaterialTheme.colorScheme.secondary,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }

                // ── Secondary modes: a compact tappable grid — one glance, no scrolling marathon.
                item {
                    Text(
                        text = "More ways to play",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 13.sp,
                        letterSpacing = 1.sp,
                        color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.padding(top = Spacing.s)
                    )
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                    ) {
                        ArenaModeTile(
                            emoji = "⚡", title = "Puzzle Rush",
                            subtitle = "Time-attack ladder starting at your level — every point climbs the difficulty. Three strikes ends the run.",
                            accent = MaterialTheme.colorScheme.tertiary,
                            cta = "PLAY",
                            modifier = Modifier.weight(1f)
                        ) { showPuzzleRush = true }
                        ArenaModeTile(
                            emoji = "🤖", title = "Bot Duel",
                            subtitle = "Instant match against a calibrated AI. Pick a tier, beat its score, win coins — no waiting.",
                            accent = MaterialTheme.colorScheme.primary,
                            cta = "PLAY",
                            modifier = Modifier.weight(1f)
                        ) { showBotDuel = true }
                    }
                }

                item {
                    ArenaModeTile(
                        emoji = "🧠", title = "Reasoning Arena",
                        subtitle = "Answer, then prove you understand WHY. A point banks only if both are right — ranked rating that rewards understanding, not speed.",
                        accent = MaterialTheme.colorScheme.secondary,
                        cta = "THINK",
                        modifier = Modifier.fillMaxWidth()
                    ) { showReasoning = true }
                }

                item {
                    ArenaModeTile(
                        emoji = "🎉", title = "Live Room",
                        subtitle = "Host a live room or join with a code — everyone races the same questions and a live podium crowns the winner. Great for a class or a group of friends.",
                        accent = MaterialTheme.colorScheme.tertiary,
                        cta = "HOST / JOIN",
                        modifier = Modifier.fillMaxWidth()
                    ) { showLiveRoom = true }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                    ) {
                        ArenaModeTile(
                            emoji = "🏆", title = "Tournament",
                            subtitle = "One global event each week — everyone races the same set, once. Top 3 take the coin prizes.",
                            accent = MilestoneGold,
                            cta = "COMPETE",
                            modifier = Modifier.weight(1f)
                        ) { showTournament = true }
                        ArenaModeTile(
                            emoji = "🏅", title = "Season",
                            subtitle = "The long game: climb the season ladder by peak rating. Prizes paid when it ends.",
                            accent = MaterialTheme.colorScheme.secondary,
                            cta = "STANDINGS",
                            modifier = Modifier.weight(1f)
                        ) { showSeason = true }
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                    ) {
                        ArenaModeTile(
                            emoji = "🎯", title = "Challenges",
                            subtitle = "Author your own problem set, share its code, and defend the top of its leaderboard.",
                            accent = MaterialTheme.colorScheme.tertiary,
                            cta = "CREATE",
                            modifier = Modifier.weight(1f)
                        ) { showChallenges = true }
                        ArenaModeTile(
                            emoji = "📨", title = "Async Duels",
                            subtitle = "Challenge a friend to the same set and answer whenever you like — 24h to settle it.",
                            accent = MaterialTheme.colorScheme.secondary,
                            cta = "CHALLENGE",
                            modifier = Modifier.weight(1f)
                        ) { showAsyncDuel = true }
                    }
                }

                // Friend lobby — slim row; it's the only mode needing two distinct actions.
                item {
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.5f)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .background(
                                        Brush.radialGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.38f),
                                                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.10f)
                                            )
                                        ),
                                        RoundedCornerShape(CornerRadius.m)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("👥", fontSize = 22.sp)
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "Friend Arena",
                                    fontWeight = FontWeight.Black,
                                    fontSize = 15.sp,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Live duel with a lobby code — share it, they join, you race.",
                                    fontSize = 11.sp,
                                    lineHeight = 14.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                            DuoButton(
                                text = "Create",
                                onClick = { friendLobbyState = "create" },
                                color = MaterialTheme.colorScheme.tertiary
                            )
                            DuoButton(
                                text = "Join",
                                onClick = { friendLobbyState = "join_input" },
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        }
                    }
                }
            }
        }
    }

    if (showRankedConsent) {
        AlertDialog(
            onDismissRequest = { showRankedConsent = false },
            title = {
                Text(
                    text = "Enable Fair-Play Monitoring",
                    fontWeight = FontWeight.ExtraBold
                )
            },
            text = {
                Text(
                    text = "Ranked duels check your answer timing to keep competition fair. " +
                        "This needs Telemetry turned on. If a result is ever flagged we always " +
                        "tell you why — no silent bans. You can turn it back off in Privacy settings anytime."
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch(Dispatchers.IO) {
                        val ok = try {
                            val token = RetrofitClient.authToken ?: ""
                            RetrofitClient.apiService.updatePrivacy(
                                token,
                                PrivacyUpdateRequest(true, (user?.profile_private ?: 0) == 1)
                            )
                            true
                        } catch (e: Exception) {
                            Log.e("Arena", "Fair-play consent update failed: ${e.message}")
                            false
                        }
                        withContext(Dispatchers.Main) {
                            showRankedConsent = false
                            if (ok) {
                                consentGrantedThisSession = true
                                matchmakingMode = "ranked"
                            }
                        }
                    }
                }) {
                    Text("Enable & Find Match", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showRankedConsent = false }) {
                    Text("Not now")
                }
            }
        )
    }

    // Placement rank-reveal ceremony (audit #20): a designed moment, fired exactly once.
    if (showRankReveal) {
        val cRank = user?.competitive_rank ?: "Unranked"
        val dismiss: () -> Unit = {
            showRankReveal = false
            scope.launch(Dispatchers.IO) {
                try { RetrofitClient.apiService.markRankRevealSeen(RetrofitClient.authToken ?: "") }
                catch (e: Exception) { Log.e("Arena", "reveal-seen failed: ${e.message}") }
            }
        }
        AlertDialog(
            onDismissRequest = dismiss,
            icon = { RankBadge(rankName = cRank, modifier = Modifier.size(64.dp)) },
            title = { Text(text = "Placement complete", fontWeight = FontWeight.ExtraBold) },
            text = {
                Text(
                    text = "You've played your placement games. Your competitive rank is " +
                        "$cRank. From here, every ranked result moves your rating."
                )
            },
            confirmButton = {
                TextButton(onClick = dismiss) { Text("Let's climb", fontWeight = FontWeight.Bold) }
            }
        )
    }
}

/**
 * Premium tappable mode tile for the arena grid. The whole card is the touch target.
 * Each mode owns a colored identity: an accent gradient wash, a glowing emoji medallion,
 * a real description, and an accent CTA — alive, not a flat gray box.
 */
@Composable
private fun ArenaModeTile(
    emoji: String,
    title: String,
    subtitle: String,
    accent: Color,
    cta: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    DuoCard(
        modifier = modifier
            .height(180.dp)
            .clip(RoundedCornerShape(CornerRadius.l))
            .pressable { onClick() },
        borderColor = accent.copy(alpha = 0.5f)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.linearGradient(
                            listOf(accent.copy(alpha = 0.16f), Color.Transparent)
                        )
                    )
            )
            Column(
                modifier = Modifier.fillMaxSize().padding(Spacing.m),
                verticalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .background(
                            Brush.radialGradient(
                                listOf(accent.copy(alpha = 0.38f), accent.copy(alpha = 0.10f))
                            ),
                            RoundedCornerShape(CornerRadius.m)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(emoji, fontSize = 22.sp)
                }
                Text(
                    text = title,
                    fontWeight = FontWeight.Black,
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    lineHeight = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "$cta →",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    color = accent
                )
            }
        }
    }
}
