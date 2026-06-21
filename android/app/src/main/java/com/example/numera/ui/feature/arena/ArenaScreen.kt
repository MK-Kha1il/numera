package com.example.numera.ui.feature.arena

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

@Composable
fun ArenaScreen(
    user: User?,
    onStartDuelGame: (String, String) -> Unit
) {
    var matchmakingMode by remember { mutableStateOf<String?>(null) } // null, "ranked", "casual"
    var friendLobbyState by remember { mutableStateOf<String?>(null) } // null, "create", "join_input", "join"
    var friendRoomCode by remember { mutableStateOf("") }
    var joinRoomCodeInput by remember { mutableStateOf("") }
    var friendRoomError by remember { mutableStateOf("") }
    var queueSecondsElapsed by remember { mutableIntStateOf(0) }
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
    // Living Arena social presence: your rivals + the community feed make the arena feel inhabited.
    var rivals by remember { mutableStateOf<List<Rival>>(emptyList()) }
    var feed by remember { mutableStateOf<List<ArenaEvent>>(emptyList()) }
    var history by remember { mutableStateOf<List<MatchRecord>>(emptyList()) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        val token = RetrofitClient.authToken ?: return@LaunchedEffect
        try {
            withContext(Dispatchers.IO) {
                val r = RetrofitClient.apiService.getArenaRivals(token)
                val f = RetrofitClient.apiService.getArenaFeed(token)
                val h = RetrofitClient.apiService.getArenaHistory(token)
                withContext(Dispatchers.Main) { rivals = r.rivals; feed = f.events; history = h.matches }
            }
        } catch (e: Exception) {
            Log.e("Arena", "Arena social load failed: ${e.message}")
        }
    }

    val hasFairplayConsent = consentGrantedThisSession || (user?.telemetry_enabled ?: 0) == 1

    DisposableEffect(Unit) {
        onDispose {
            SocketClient.leaveQueue()
            SocketClient.disconnect()
        }
    }

    LaunchedEffect(matchmakingMode, friendLobbyState) {
        if (matchmakingMode != null || friendLobbyState != null) {
            SocketClient.connect()
            val sock = SocketClient.socket

            sock?.off("friend_room_created")
            sock?.off("friend_room_error")
            sock?.off("duel_start")
            sock?.off("matchmaking_error")

            sock?.on("matchmaking_error") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val code = data.optString("code")
                scope.launch(Dispatchers.Main) {
                    matchmakingMode = null
                    if (code == "FAIRPLAY_CONSENT_REQUIRED") showRankedConsent = true
                }
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

            sock?.on("duel_start") { args ->
                val data = args.getOrNull(0) as? JSONObject ?: return@on
                val roomId = data.getString("roomId")
                val opponentObj = data.getJSONObject("opponent")

                var opponentName = "Opponent"
                if (opponentObj.has("p1")) {
                    val p1 = opponentObj.getJSONObject("p1")
                    val p2 = opponentObj.getJSONObject("p2")
                    if (p1.getInt("id") == user?.id) {
                        opponentName = p2.getString("username")
                    } else {
                        opponentName = p1.getString("username")
                    }
                }

                scope.launch(Dispatchers.Main) {
                    matchmakingMode = null
                    friendLobbyState = null
                    onStartDuelGame(roomId, opponentName)
                }
            }

            if (matchmakingMode != null) {
                SocketClient.joinQueue(matchmakingMode!!)
            } else if (friendLobbyState == "create") {
                SocketClient.createFriendRoom()
            } else if (friendLobbyState == "join") {
                SocketClient.joinFriendRoom(joinRoomCodeInput)
            }
        } else {
            SocketClient.leaveQueue()
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
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )

                        Text(
                            text = if (queueSecondsElapsed < 6) "Finding the fairest opponent for your skill…"
                                   else "Widening the search to match you sooner…",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(Spacing.l))

                        // Guaranteed match: at current population the queue can sit empty
                        // forever — after 20s offer a clearly-labeled bot duel instead of
                        // an unbounded spinner. Leaving matchmaking happens via the same
                        // state reset the Cancel button uses (the effect calls leaveQueue).
                        if (queueSecondsElapsed >= 20) {
                            Text(
                                text = "Quiet out there right now — sharpen up against a training bot while you wait?",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                                textAlign = TextAlign.Center
                            )
                            DuoButton(
                                text = "🤖 Duel a Bot Instead",
                                onClick = {
                                    matchmakingMode = null
                                    showBotDuel = true
                                },
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }

                        DuoButton(
                            text = "Cancel Search",
                            onClick = {
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
                            Text("Generating Room Code...", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 14.sp)
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
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
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
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )

                                // Reputation: peak rating + current form, the markers you carry.
                                Row(
                                    modifier = Modifier.padding(top = Spacing.xs),
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    val peak = user?.peak_elo ?: user?.elo ?: 1000
                                    Text(
                                        text = "📈 Peak $peak",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MilestoneGold
                                    )
                                    val streak = user?.current_win_streak ?: 0
                                    if (streak >= 2) {
                                        Text(
                                            text = "🔥 $streak-win streak",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.tertiary
                                        )
                                    }
                                }

                                // The climb: how close you are to the next rank — the always-on chase.
                                PromotionProgressBar(
                                    elo = user?.elo ?: 1000,
                                    inPlacement = (user?.competitive_matches ?: 0) < 5,
                                    modifier = Modifier.padding(top = Spacing.s)
                                )
                            }
                        }
                    }
                }

                // ── Arena Feed — recent promotions, streaks, and upsets across the arena, so the
                // place feels inhabited even when you're not queuing. Hidden until there's signal.
                if (feed.isNotEmpty()) {
                    item {
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l)) {
                                Text(
                                    text = "LIVE FROM THE ARENA",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                                Spacer(modifier = Modifier.height(Spacing.s))
                                feed.take(4).forEach { ev ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.xs),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                    ) {
                                        Text(arenaFeedEmoji(ev.type), fontSize = 15.sp)
                                        Text(
                                            text = arenaFeedLine(ev),
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Rivals — your most-played opponents and the head-to-head record. The "unfinished
                // business" hook. Hidden until you've built some history.
                if (rivals.isNotEmpty()) {
                    item {
                        DuoCard(modifier = Modifier.fillMaxWidth(), borderColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.5f)) {
                            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l)) {
                                Text(
                                    text = "YOUR RIVALS",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.tertiary
                                )
                                Spacer(modifier = Modifier.height(Spacing.s))
                                rivals.take(4).forEach { rival ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.xs),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = rival.username,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier.weight(1f),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        val lead = rival.myWins - rival.theirWins
                                        Text(
                                            text = "${rival.myWins}–${rival.theirWins}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = when {
                                                lead > 0 -> CorrectGreen
                                                lead < 0 -> WrongRed
                                                else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                            }
                                        )
                                        Text(
                                            text = "  ·  ${rival.total} ${if (rival.total == 1) "duel" else "duels"}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // ── Recent Matches — your competitive arc: the last few duels with result + rating
                // delta. Hidden until you've played a ranked/casual human duel.
                if (history.isNotEmpty()) {
                    item {
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l)) {
                                Text(
                                    text = "RECENT MATCHES",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 12.sp,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Spacer(modifier = Modifier.height(Spacing.s))
                                history.take(6).forEach { m ->
                                    val won = m.result == "win"
                                    val lost = m.result == "loss"
                                    val resultColor = when {
                                        won -> CorrectGreen
                                        lost -> WrongRed
                                        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    }
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.xs),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                    ) {
                                        Text(
                                            text = if (won) "W" else if (lost) "L" else "D",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Black,
                                            color = resultColor,
                                            modifier = Modifier.width(16.dp)
                                        )
                                        Text(
                                            text = "vs ${m.opponent}",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        if (m.mode != "casual" && m.eloChange != 0) {
                                            Text(
                                                text = "${if (m.eloChange >= 0) "+" else ""}${m.eloChange}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Black,
                                                color = if (m.eloChange >= 0) CorrectGreen else WrongRed
                                            )
                                        } else {
                                            Text(
                                                text = "casual",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                            )
                                        }
                                    }
                                }
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
                        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
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
                        text = "MORE WAYS TO PLAY",
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
            title = { Text(text = "Placement complete!", fontWeight = FontWeight.ExtraBold) },
            text = {
                Text(
                    text = "You've played your placement games. Your competitive rank is " +
                        "$cRank. From here, every ranked result moves your rating — climb the ladder!"
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
            .clip(RoundedCornerShape(20.dp))
            .clickable {
                com.example.numera.haptic.HapticManager.playSoft()
                onClick()
            },
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

// Map an arena feed event type to its glyph + one-line story.
private fun arenaFeedEmoji(type: String): String = when (type) {
    "promotion" -> "⬆️"
    "upset" -> "🐉"
    "streak" -> "🔥"
    "peak" -> "📈"
    else -> "⚔️"
}

private fun arenaFeedLine(ev: ArenaEvent): String {
    val who = ev.username.ifBlank { "A competitor" }
    return when (ev.type) {
        "promotion" -> "$who promoted to ${ev.detail ?: "a new rank"}"
        "upset" -> "$who pulled off an upset win"
        "streak" -> "$who is on a ${ev.detail ?: "win streak"}"
        "peak" -> "$who hit a new peak (${ev.detail ?: "rating"})"
        else -> "$who ${ev.detail ?: "competed"}"
    }
}
