package com.example.numera.ui.screens

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.AddMistakeRequest
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.RetrofitClient
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.VictoryParticles
import com.example.numera.ui.components.VictoryEffectOverlay
import com.example.numera.ui.components.MathText
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.MathIconSpinner
import com.example.numera.data.network.SocketClient
import com.example.numera.data.network.ArenaIdentity
import com.example.numera.data.network.HeadToHead
import com.example.numera.ui.feature.arena.ClutchBanners
import com.example.numera.ui.feature.arena.ClutchTag
import com.example.numera.ui.feature.arena.Momentum
import com.example.numera.ui.feature.arena.MomentumBanner
import com.example.numera.ui.feature.arena.PlayerIdentityCard
import com.example.numera.ui.feature.arena.RatingCountUp
import com.example.numera.ui.feature.arena.ReasoningRecapCard
import com.example.numera.ui.feature.arena.momentumFor
import com.example.numera.ui.feature.arena.rivalryLine
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

@Composable
fun DuelGameScreen(
    roomId: String,
    opponentName: String,
    onFinishGame: () -> Unit,
    // Closes the compete→learn loop (ultra-review #17): jump straight from the result screen
    // into a Growth Practice session over the misses this duel just banked.
    onReviewMisses: () -> Unit = {}
) {
    val scope = rememberCoroutineScope()
    var problemsList by remember { mutableStateOf<List<MathProblem>>(emptyList()) }
    var currentProblemIdx by remember { mutableIntStateOf(0) }
    
    var myProgress by remember { mutableIntStateOf(0) }
    var oppProgress by remember { mutableIntStateOf(0) }
    var myPoints by remember { mutableIntStateOf(0) }
    var oppPoints by remember { mutableIntStateOf(0) }
    
    var hasAnswered by remember { mutableStateOf(false) }
    var selectedAnswer by remember { mutableStateOf("") }
    // The canonical answer is no longer shipped with the problem (server-authoritative grading);
    // the server discloses it in its submit_answer ack, and we hold it here to drive the reveal.
    var revealedCorrectAnswer by remember { mutableStateOf("") }
    // The worked solution is likewise withheld from the live problem (it spells the answer) and
    // disclosed only in the post-answer ack; held here for the favorite/archive payload.
    var revealedExplanation by remember { mutableStateOf("") }
    
    var showParticles by remember { mutableStateOf(false) }
    var myUsername by remember { mutableStateOf("You") }
    // Consecutive correct answers this duel — fuels the 🔥 streak chip in the race header.
    var streakCount by remember { mutableIntStateOf(0) }
    // One beat of anticipation (names square off) before the first problem appears.
    var showVsIntro by remember { mutableStateOf(true) }

    var isDuelOver by remember { mutableStateOf(false) }
    // How many problems the learner missed this duel — drives the post-duel "review your
    // misses" affordance (the misses themselves are banked to the Mistakes Bank as they happen).
    var missCount by remember { mutableIntStateOf(0) }
    var duelWinnerId by remember { mutableIntStateOf(-1) }
    var myUserId by remember { mutableIntStateOf(0) }
    var eloInfo by remember { mutableStateOf<JSONObject?>(null) }
    var favoritedQuestions by remember { mutableStateOf<Set<String>>(emptySet()) }

    // Living-Arena identity (docs/CompetitiveArenaRedesign.md): the opponent is a real competitor,
    // not a bare name. These ride along on room_status (server stashes them on the room).
    var myIdentity by remember { mutableStateOf<ArenaIdentity?>(null) }
    var oppIdentity by remember { mutableStateOf<ArenaIdentity?>(null) }
    var h2h by remember { mutableStateOf<HeadToHead?>(null) }
    var isRanked by remember { mutableStateOf(true) }
    // Comeback recognition: the client alone sees the live score progression, so it tracks whether
    // you were ever meaningfully behind before winning (the server can't infer this).
    var wasTrailing by remember { mutableStateOf(false) }
    // Rematch ("run it back") UI state: idle | requested (I asked) | offered (they asked) | unavailable.
    var rematchState by remember { mutableStateOf("idle") }
    // The room currently being played. Starts at the nav arg; a rematch swaps it IN PLACE (the
    // screen stays mounted and the socket listeners stay registered — no navigation churn, so a
    // rematch can't race the duel-screen's own listener teardown).
    var activeRoomId by remember { mutableStateOf(roomId) }
    // Opponent presence: a brief "answered" tell whenever the opponent's progress advances, so you
    // FEEL a competitor racing you rather than watching a bar move.
    var oppJustAnswered by remember { mutableStateOf(false) }
    LaunchedEffect(oppProgress) {
        if (oppProgress > 0) {
            oppJustAnswered = true
            kotlinx.coroutines.delay(850)
            oppJustAnswered = false
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            SocketClient.socket?.off("room_status")
            SocketClient.socket?.off("duel_end")
            SocketClient.socket?.off("rematch_offered")
            SocketClient.socket?.off("rematch_unavailable")
            SocketClient.socket?.off("duel_start")
        }
    }

    LaunchedEffect(roomId) {
        val socket = SocketClient.socket
        if (socket == null || !socket.connected()) {
            onFinishGame()
            return@LaunchedEffect
        }

        try {
            // Profile and favorites are independent — fetch them concurrently so the duel
            // join isn't gated on two sequential round-trips (max latency, not sum).
            val token = RetrofitClient.authToken ?: ""
            coroutineScope {
                val profileDeferred = async(Dispatchers.IO) { RetrofitClient.apiService.getProfile(token) }
                val favsDeferred = async(Dispatchers.IO) { RetrofitClient.apiService.getFavorites(token) }
                val profile = profileDeferred.await()
                val favs = favsDeferred.await()
                myUserId = profile.id
                myUsername = profile.username
                favoritedQuestions = favs.map { it.question }.toSet()
            }
        } catch (e: Exception) {
            Log.e("DuelGame", "Profile/favorites fetch err: ${e.message}")
        }

        // Join room immediately after acquiring myUserId
        val joinData = JSONObject().apply {
            put("roomId", roomId)
        }
        socket.emit("join_duel_room", joinData)

        socket.on("room_status") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            scope.launch(Dispatchers.Main) {
                if (data.has("problems") && problemsList.isEmpty()) {
                    val pArray = data.getJSONArray("problems").toString()
                    val type = object : TypeToken<List<MathProblem>>() {}.type
                    problemsList = Gson().fromJson(pArray, type)
                }

                // Identities (opponent player card + rivalry) — parsed once, perspective-corrected.
                val identitiesObj = data.optJSONObject("identities")
                if (identitiesObj != null && oppIdentity == null) {
                    val p1 = identitiesObj.optJSONObject("p1")
                    val p2 = identitiesObj.optJSONObject("p2")
                    if (p1 != null && p2 != null) {
                        val mineIsP1 = p1.optInt("id") == myUserId
                        val mineObj = if (mineIsP1) p1 else p2
                        val oppObj = if (mineIsP1) p2 else p1
                        myIdentity = parseArenaIdentity(mineObj)
                        oppIdentity = parseArenaIdentity(oppObj)
                        isRanked = identitiesObj.optBoolean("ranked", true)
                        identitiesObj.optJSONObject("h2h")?.let { h ->
                            val p1Wins = h.optInt("p1Wins")
                            val p2Wins = h.optInt("p2Wins")
                            h2h = HeadToHead(
                                total = h.optInt("total"),
                                myWins = if (mineIsP1) p1Wins else p2Wins,
                                theirWins = if (mineIsP1) p2Wins else p1Wins,
                                draws = h.optInt("draws")
                            )
                        }
                    }
                }

                if (data.has("p1")) {
                    val p1Obj = data.getJSONObject("p1")
                    val p1Id = p1Obj.getInt("id")
                    val p1Prog = p1Obj.getInt("progress")
                    val p1Score = p1Obj.getInt("score")
                    
                    if (p1Id == myUserId) {
                        myProgress = p1Prog
                        myPoints = p1Score
                    } else {
                        oppProgress = p1Prog
                        oppPoints = p1Score
                    }
                }
                if (data.has("p2")) {
                    val p2Obj = data.getJSONObject("p2")
                    val p2Id = p2Obj.getInt("id")
                    val p2Prog = p2Obj.getInt("progress")
                    val p2Score = p2Obj.getInt("score")
                    
                    if (p2Id == myUserId) {
                        myProgress = p2Prog
                        myPoints = p2Score
                    } else {
                        oppProgress = p2Prog
                        oppPoints = p2Score
                    }
                }
                // Comeback bookkeeping: remember if the opponent ever pulled meaningfully ahead.
                if (oppPoints > myPoints) wasTrailing = true
            }
        }

        socket.on("duel_end") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            val winnerId = data.getInt("winnerId")
            scope.launch(Dispatchers.Main) {
                duelWinnerId = winnerId
                eloInfo = data
                isDuelOver = true
                if (winnerId == myUserId) {
                    SoundManager.playLevelUp()
                    com.example.numera.haptic.HapticManager.playMajorReward()
                } else {
                    SoundManager.playWrong()
                    com.example.numera.haptic.HapticManager.playError()
                }
            }
        }

        // ── Rematch ("run it back") signalling, active on the result screen ──
        socket.on("rematch_offered") { _ ->
            scope.launch(Dispatchers.Main) {
                // Don't override my own pending request; only surface their offer if I'm idle.
                if (rematchState == "idle") rematchState = "offered"
                com.example.numera.haptic.HapticManager.playMedium()
            }
        }
        socket.on("rematch_unavailable") { _ ->
            scope.launch(Dispatchers.Main) { rematchState = "unavailable" }
        }
        // The rematch's fresh duel arrives as a new duel_start. Reset this screen IN PLACE onto the
        // new room (the socket is already joined to it) — no navigation, so the duel-screen's own
        // listeners are never torn down mid-rematch. Off any lingering ArenaScreen duel_start
        // listener first so the rematch isn't double-handled (ArenaScreen re-registers when queuing).
        socket.off("duel_start")
        socket.on("duel_start") { args ->
            val data = args.getOrNull(0) as? JSONObject ?: return@on
            val newRoomId = data.optString("roomId")
            if (newRoomId.isBlank() || newRoomId == activeRoomId) return@on
            scope.launch(Dispatchers.Main) {
                // Reset every per-duel field for the fresh room (same opponent, so name is unchanged).
                activeRoomId = newRoomId
                problemsList = emptyList()
                currentProblemIdx = 0
                myProgress = 0; oppProgress = 0; myPoints = 0; oppPoints = 0
                hasAnswered = false; selectedAnswer = ""; revealedCorrectAnswer = ""; revealedExplanation = ""
                showParticles = false
                streakCount = 0
                showVsIntro = true
                isDuelOver = false
                missCount = 0
                duelWinnerId = -1
                eloInfo = null
                myIdentity = null; oppIdentity = null; h2h = null; wasTrailing = false
                rematchState = "idle"
                com.example.numera.haptic.HapticManager.playMedium()
                // Join the new room to receive its problems + identities via room_status.
                SocketClient.socket?.emit("join_duel_room", JSONObject().apply { put("roomId", newRoomId) })
            }
        }
    }

    if (problemsList.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                NumeraPremiumLoader()
                Text("Waiting for Duel Arena grid setup...", color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    // VS intro — one beat of anticipation: the matchup squares off, then the race begins.
    if (showVsIntro && !isDuelOver) {
        var introShown by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) {
            introShown = true
            com.example.numera.haptic.HapticManager.playMedium()
            // A touch longer than before so the opponent's player card has time to arrive and the
            // matchup actually registers as a face-off, not a flash.
            kotlinx.coroutines.delay(2200)
            showVsIntro = false
        }
        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            AnimatedVisibility(visible = introShown, enter = Motion.rewardEnter()) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(Spacing.xl),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Text(
                        text = if (isRanked) "RANKED DUEL" else "CASUAL DUEL",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 4.sp,
                        color = MaterialTheme.colorScheme.primary
                    )

                    val mine = myIdentity
                    val opp = oppIdentity
                    if (mine != null && opp != null) {
                        PlayerIdentityCard(identity = mine, isYou = true, accent = MaterialTheme.colorScheme.primary)
                        Text(
                            text = "VS",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 6.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                        )
                        PlayerIdentityCard(identity = opp, isYou = false, accent = MaterialTheme.colorScheme.secondary)
                        h2h?.let { record ->
                            Text(
                                text = rivalryLine(record, opp.username),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.tertiary,
                                textAlign = TextAlign.Center
                            )
                        }

                        // Stakes preview — ranked only: what's on the line this match, and whether a
                        // win promotes you. Computed client-side from the same Elo math the server uses.
                        if (isRanked) {
                            val winChange = com.example.numera.ui.feature.arena.projectedEloChange(mine.elo, opp.elo, win = true, oppIsBot = opp.isBot)
                            val loseChange = com.example.numera.ui.feature.arena.projectedEloChange(mine.elo, opp.elo, win = false, oppIsBot = opp.isBot)
                            Text(
                                text = "On the line:  win +$winChange   ·   lose $loseChange",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                textAlign = TextAlign.Center
                            )
                            com.example.numera.ui.feature.arena.nextRankInfo(mine.elo)?.let { nx ->
                                if (winChange >= nx.pointsToNext) {
                                    Text(
                                        text = "🏆 Win this to reach ${nx.label}!",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Black,
                                        color = MilestoneGold,
                                        textAlign = TextAlign.Center
                                    )
                                }
                            }
                        }
                    } else {
                        // Identities not arrived yet — fall back to the classic name face-off.
                        Text(myUsername, fontSize = 26.sp, fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.primary, textAlign = TextAlign.Center)
                        Text("⚔️", fontSize = 54.sp)
                        Text("VS", fontSize = 18.sp, fontWeight = FontWeight.Black, letterSpacing = 6.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text(opponentName, fontSize = 26.sp, fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.secondary, textAlign = TextAlign.Center)
                    }

                    Spacer(modifier = Modifier.height(Spacing.xs))
                    Text(
                        text = "${problemsList.size} problems · fastest correct answers win",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
        return
    }

    if (isDuelOver) {
        val didIWin = duelWinnerId == myUserId
        val isCasual = eloInfo?.optBoolean("isCasual", false) ?: false
        // Unified rating (docs/specs/Spec-RatingUnification.md): duels move the SAME per-domain NRS
        // rating as solo play. The debrief shows the conservative display rating + its delta. A ranked
        // duel vs the bot fallback is rating-neutral (ratingMoved=false), so we don't show a change.

        val p1Obj = eloInfo?.optJSONObject("p1")
        val p2Obj = eloInfo?.optJSONObject("p2")
        val meIsP1 = p1Obj?.optInt("id") == myUserId
        val meObj = when {
            p1Obj?.optInt("id") == myUserId -> p1Obj
            p2Obj?.optInt("id") == myUserId -> p2Obj
            else -> null
        }

        val myChange = meObj?.optInt("ratingDelta") ?: 0
        val myNewRating = meObj?.optInt("newDisplayRating") ?: 1000
        val myNewRank = meObj?.optString("newRank") ?: ""
        val myRatingMoved = meObj?.optBoolean("ratingMoved", false) ?: false
        val didIGetPromoted = meObj?.optBoolean("promoted", false) ?: false
        val didICheat = meObj?.optBoolean("cheated", false) ?: false
        val myWinStreak = meObj?.optInt("winStreak", 0) ?: 0
        val myNewPeak = meObj?.optBoolean("newPeak", false) ?: false
        val myPeakElo = meObj?.optInt("peakElo", 0) ?: 0

        // Clutch moments (server-authored) + the client-only comeback it observed live.
        val serverTags = parseClutchTags(meObj?.optJSONArray("clutchTags"))
        val clutchTags = remember(serverTags, didIWin, wasTrailing) {
            if (didIWin && wasTrailing && serverTags.none { it.key == "comeback" }) {
                val comeback = ClutchTag("comeback", "Comeback", "🔥", "amber")
                if (serverTags.isEmpty()) listOf(comeback) else listOf(serverTags.first(), comeback) + serverTags.drop(1)
            } else serverTags
        }

        // Post-match reasoning beat: a "why is that right?" prompt on one of the duel's problems.
        val reasoningJson = eloInfo?.optJSONObject("reasoning")?.optString("selfExplainJson")
        val reasoning = remember(reasoningJson) {
            reasoningJson?.takeIf { it.isNotBlank() }?.let { sej ->
                runCatching {
                    val o = JSONObject(sej)
                    val opts = ArrayList<Pair<String, Boolean>>()
                    o.optJSONArray("options")?.let { arr ->
                        for (i in 0 until arr.length()) {
                            val oo = arr.optJSONObject(i) ?: continue
                            opts.add(oo.optString("text") to oo.optBoolean("correct", false))
                        }
                    }
                    Triple(o.optString("question"), opts, o.optString("explanation"))
                }.getOrNull()
            }
        }

        // Post-match rivalry standing (your perspective).
        val postH2h = eloInfo?.optJSONObject("h2h")?.let { h ->
            val p1Wins = h.optInt("p1Wins"); val p2Wins = h.optInt("p2Wins")
            HeadToHead(
                total = h.optInt("total"),
                myWins = if (meIsP1) p1Wins else p2Wins,
                theirWins = if (meIsP1) p2Wins else p1Wins,
                draws = h.optInt("draws")
            )
        }

        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            // Result pops in with the reward spring; a win earns a confetti burst on top.
            var endRevealed by remember { mutableStateOf(false) }
            LaunchedEffect(Unit) { endRevealed = true }
            // A distinct stinger for the rarest, most prestigious moment — a rank promotion — so it
            // doesn't feel like just another win (the win/loss sound already played on duel_end).
            LaunchedEffect(Unit) {
                if (clutchTags.any { it.key == "promotion" }) {
                    SoundManager.playRewardClaim()
                    com.example.numera.haptic.HapticManager.playMajorReward()
                }
            }
            // The result can get tall (clutch banners + rating + rivalry + reasoning), so bound the
            // card to most of the screen and let it scroll rather than clip on small devices.
            val maxResultHeight = (LocalConfiguration.current.screenHeightDp * 0.92f).dp
            AnimatedVisibility(visible = endRevealed, enter = Motion.rewardEnter()) {
            DuoCard(
                modifier = Modifier
                    .fillMaxWidth(0.9f)
                    .heightIn(max = maxResultHeight)
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(24.dp)
                        .verticalScroll(rememberScrollState()),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = if (didIWin) "🏆 VICTORY!" else "💀 DEFEAT",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = if (didIWin) CorrectGreen else WrongRed,
                        textAlign = TextAlign.Center
                    )

                    Text(
                        text = "$myPoints — $oppPoints vs $opponentName",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )

                    // Clutch moments — the memorable headline of a win (comeback / perfect / upset /
                    // streak-break / promotion / new peak). Nothing renders on a plain win or a loss.
                    if (clutchTags.isNotEmpty()) {
                        ClutchBanners(tags = clutchTags)
                    }

                    if (!isCasual) {
                        if (myRatingMoved) {
                            RatingCountUp(oldElo = myNewRating - myChange, newElo = myNewRating, delta = myChange)
                        } else {
                            // Ranked bot fallback: a practice opponent, so the rating is untouched.
                            Text(
                                text = "Practice match — rating unchanged",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            RankBadge(rankName = myNewRank, modifier = Modifier.size(32.dp))
                            Text(
                                text = myNewRank,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }

                        if (didIGetPromoted) {
                            Text(
                                text = "⬆️ RANKED UP to $myNewRank!",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = CorrectGreen,
                                textAlign = TextAlign.Center
                            )
                        }

                        // Reputation recap: your form and high-water mark, surfaced in the moment.
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (myWinStreak >= 2) {
                                Text(
                                    text = "🔥 $myWinStreak-win streak",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.tertiary
                                )
                            }
                            if (myNewPeak && myPeakElo > 0) {
                                Text(
                                    text = "📈 New peak $myPeakElo",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MilestoneGold
                                )
                            }
                        }

                        if (didICheat) {
                            Text(
                                text = "⚠️ Suspicious solve times detected.\nThis ranked match was forfeited.",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = WrongRed,
                                textAlign = TextAlign.Center
                            )
                        }
                    } else {
                        Text(
                            text = "Casual match · rating unaffected",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }

                    // Rivalry update — the story this match wrote, so the loop has unfinished business.
                    postH2h?.let { record ->
                        if (record.total > 0) {
                            Text(
                                text = rivalryLine(record, opponentName),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.tertiary,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    Text(
                        text = if (didIWin) {
                            "Match won · 🪙 +50 coins"
                        } else {
                            "Out-raced this time — study the misses and run it back."
                        },
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )

                    // Reasoning beat (educational integrity): reward UNDERSTANDING the why, not just
                    // recall speed — a "why is that right?" on one of this duel's problems. No reward
                    // attached (can't be farmed); the duel's rating/grading are untouched.
                    reasoning?.let { (q, opts, expl) ->
                        ReasoningRecapCard(question = q, options = opts, explanation = expl)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // "Run it back" — the one-more-match loop. Only against a human opponent (a bot
                    // can just be re-duelled from the arena). Both players must opt in.
                    val oppIsHuman = oppIdentity?.let { !it.isBot } ?: false
                    if (oppIsHuman) {
                        when (rematchState) {
                            "idle" -> DuoButton(
                                text = "🔁 Rematch $opponentName",
                                onClick = {
                                    com.example.numera.haptic.HapticManager.playMedium()
                                    SocketClient.requestRematch()
                                    rematchState = "requested"
                                },
                                color = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.fillMaxWidth()
                            )
                            "requested" -> DuoButton(
                                text = "Waiting for $opponentName…",
                                enabled = false,
                                onClick = {},
                                modifier = Modifier.fillMaxWidth()
                            )
                            "offered" -> DuoButton(
                                text = "⚔️ Accept $opponentName's rematch",
                                onClick = {
                                    com.example.numera.haptic.HapticManager.playMedium()
                                    SocketClient.requestRematch()
                                    rematchState = "requested"
                                },
                                color = CorrectGreen,
                                modifier = Modifier.fillMaxWidth()
                            )
                            else -> Text(
                                text = "$opponentName left the arena — no rematch.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    // Compete→learn loop (ultra-review #17): the problems missed this duel were
                    // banked to the Mistakes Bank as they happened; offer to review them now
                    // rather than letting a fast-paced loss teach nothing.
                    if (missCount > 0) {
                        DuoButton(
                            text = "📖 Review your $missCount miss${if (missCount == 1) "" else "es"}",
                            onClick = {
                                RetrofitClient.triggerProfileRefresh()
                                SocketClient.disconnect()
                                onReviewMisses()
                            },
                            color = CorrectGreen,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    DuoButton(
                        text = "Leave Arena",
                        onClick = {
                            RetrofitClient.triggerProfileRefresh()
                            SocketClient.disconnect()
                            onFinishGame()
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
            }

            if (didIWin) {
                // An equipped Victory Effect (docs/ShopOverhaul.md §8) plays instead of the default
                // confetti — elegant, not explosive. Cached on RetrofitClient (the duel screen has no
                // User object). Falls back to confetti when nothing is equipped.
                val victoryKey = remember { RetrofitClient.equippedVictoryKey }
                if (!victoryKey.isNullOrEmpty()) {
                    VictoryEffectOverlay(victoryKey = victoryKey, modifier = Modifier.fillMaxSize())
                } else {
                    var winBurst by remember { mutableStateOf(true) }
                    VictoryParticles(trigger = winBurst) { winBurst = false }
                }
            }
        }
        return
    }

    val currentProblem = problemsList.getOrNull(currentProblemIdx) ?: problemsList.last()

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Score race header — the duel's heartbeat: live score front and center,
        // animated tracks underneath, plus lead callout, streak fire and Q counter.
        val total = problemsList.size.coerceAtLeast(1)
        val myBar by animateFloatAsState(myProgress / total.toFloat(), Motion.standard(), label = "myBar")
        val oppBar by animateFloatAsState(oppProgress / total.toFloat(), Motion.standard(), label = "oppBar")
        // Cosmetic momentum (shared by the header banner, the match-point treatment, and the card glow).
        val momentum = momentumFor(streakCount, currentProblemIdx, total, myPoints, oppPoints)
        val isMatchPoint = momentum == Momentum.CLUTCH && !hasAnswered
        // A tension stinger the instant the match comes down to the wire.
        LaunchedEffect(isMatchPoint) {
            if (isMatchPoint) {
                SoundManager.playTick()
                com.example.numera.haptic.HapticManager.playMedium()
            }
        }
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
                    // You: rank crest + name.
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        myIdentity?.let { RankBadge(rankName = it.rank, modifier = Modifier.size(18.dp)) }
                        Text(
                            text = myUsername,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.primary,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(
                        text = "$myPoints — $oppPoints",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.padding(horizontal = Spacing.s)
                    )
                    // Opponent: a live "answered" tell + name + rank crest, right-aligned.
                    Row(
                        modifier = Modifier.weight(1f),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs, Alignment.End)
                    ) {
                        androidx.compose.animation.AnimatedVisibility(visible = oppJustAnswered) {
                            Text("⚡", fontSize = 12.sp)
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
                        oppIdentity?.let { RankBadge(rankName = it.rank, modifier = Modifier.size(18.dp)) }
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
                LinearProgressIndicator(
                    progress = { oppBar },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = MaterialTheme.colorScheme.secondary,
                    trackColor = MaterialTheme.colorScheme.outline
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    Text(
                        text = when {
                            myPoints > oppPoints -> "You lead — keep pushing!"
                            myPoints < oppPoints -> "$opponentName leads — catch up!"
                            else -> "Neck and neck"
                        },
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = when {
                            myPoints > oppPoints -> CorrectGreen
                            myPoints < oppPoints -> WrongRed
                            else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        },
                        modifier = Modifier.weight(1f)
                    )
                    // Momentum (cosmetic) subsumes the old streak chip: it reads the streak AND the
                    // live race to surface In Rhythm / Locked In / On Fire / Clutch.
                    MomentumBanner(momentum = momentum)
                    Text(
                        text = "Q ${(currentProblemIdx + 1).coerceAtMost(total)}/$total",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }

        // Match point — the decisive final question gets its own climax beat.
        if (isMatchPoint) {
            Box(modifier = Modifier.fillMaxWidth().padding(top = 4.dp), contentAlignment = Alignment.Center) {
                com.example.numera.ui.feature.arena.MatchPointBanner()
            }
        }

        // Active Equation Card
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(vertical = 16.dp),
            borderColor = if (hasAnswered && revealedCorrectAnswer.isNotEmpty()) {
                if (selectedAnswer == revealedCorrectAnswer) CorrectGreen else WrongRed
            } else if (isMatchPoint) {
                MilestoneGold
            } else {
                MaterialTheme.colorScheme.outline
            }
        ) {
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
                                        // the problem anymore; use the server-revealed ones, available
                                        // once the player has answered.
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

        // Choice Options
        Column(
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            currentProblem.options.forEach { option ->
                val isSelected = selectedAnswer == option
                // Reveal correctness only once the server's verdict (the canonical answer) is back.
                val revealed = hasAnswered && revealedCorrectAnswer.isNotEmpty()
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
                        .pointerInput(hasAnswered) {
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
                                        com.example.numera.haptic.HapticManager.playSoft()

                                        val nextIdx = currentProblemIdx + 1
                                        // Captured at tap time: the advance timer below moves
                                        // currentProblemIdx before the ack may arrive.
                                        val answeredProblem = problemsList.getOrNull(currentProblemIdx)
                                        // Send the actual answer; the SERVER grades it and acks back
                                        // its verdict + the canonical answer, which drives the reveal
                                        // (sound/particles/highlight). The client no longer self-judges.
                                        SocketClient.submitAnswer(activeRoomId, myUserId, option, nextIdx) { correct, correctAnswer, explanation ->
                                            scope.launch(Dispatchers.Main) {
                                                revealedCorrectAnswer = correctAnswer
                                                revealedExplanation = explanation
                                                if (correct) {
                                                    streakCount++
                                                    SoundManager.playCorrect()
                                                    com.example.numera.haptic.HapticManager.playSuccess()
                                                    showParticles = true
                                                } else {
                                                    streakCount = 0
                                                    SoundManager.playWrong()
                                                    com.example.numera.haptic.HapticManager.playError()
                                                    // Close the compete→learn loop: a duel miss lands in
                                                    // the Mistakes Bank (same flow solo uses), so it
                                                    // resurfaces in growth practice instead of vanishing
                                                    // when the match ends. Fire-and-forget.
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
                                            }
                                        }

                                        // Advance on a timer, independent of the ack, so the duel keeps
                                        // flowing even if the server reply is delayed or dropped.
                                        val isLast = currentProblemIdx >= problemsList.size - 1
                                        if (!isLast) {
                                            scope.launch {
                                                kotlinx.coroutines.delay(1000)
                                                currentProblemIdx++
                                                hasAnswered = false
                                                selectedAnswer = ""
                                                revealedCorrectAnswer = ""
                                                revealedExplanation = ""
                                            }
                                        }
                                    }
                                )
                            }
                        }
                        .drawBehind {
                            if (!hasAnswered) {
                                drawRoundRect(
                                    color = depthColor,
                                    cornerRadius = CornerRadius(16.dp.toPx(), 16.dp.toPx())
                                )
                            }
                        }
                        .padding(bottom = if (isPressed.value && !hasAnswered) 0.dp else bottomDepth)
                        .offset(y = offset)
                        .clip(RoundedCornerShape(16.dp))
                        .background(bgColor)
                        .border(
                            BorderStroke(1.5.dp, outlineColor),
                            shape = RoundedCornerShape(16.dp)
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
                        
                        if (hasAnswered) {
                            if (isCorrect) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Correct", tint = CorrectGreen)
                            } else if (isSelected) {
                                Icon(Icons.Default.Clear, contentDescription = "Wrong", tint = WrongRed)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Auto-advance logic
            if (hasAnswered) {
                val isLast = currentProblemIdx >= problemsList.size - 1
                if (isLast) {
                    DuoButton(
                        text = "Awaiting End Game...",
                        enabled = false,
                        onClick = {},
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }

    // Confetti overlays the board. (It used to be composed *before* the opaque game
    // column, so the correct-answer burst was painted underneath and never visible.)
    VictoryParticles(trigger = showParticles) { showParticles = false }
    }
}

// Parse a server arena-identity JSON object into the client model (perspective-agnostic).
private fun parseArenaIdentity(o: JSONObject): ArenaIdentity = ArenaIdentity(
    id = o.optInt("id"),
    username = o.optString("username", "Opponent"),
    isBot = o.optBoolean("isBot", false),
    rank = o.optString("rank", "Unranked"),
    elo = o.optInt("elo", 1000),
    peak_elo = o.optInt("peak_elo", o.optInt("elo", 1000)),
    current_win_streak = o.optInt("current_win_streak", 0),
    best_win_streak = o.optInt("best_win_streak", 0),
    competitive_matches = o.optInt("competitive_matches", 0),
    specialty = if (o.isNull("specialty")) null else o.optString("specialty", null)
)

// Parse the server's clutchTags array (post-match) into client models.
private fun parseClutchTags(arr: JSONArray?): List<ClutchTag> {
    if (arr == null) return emptyList()
    val out = ArrayList<ClutchTag>(arr.length())
    for (i in 0 until arr.length()) {
        val t = arr.optJSONObject(i) ?: continue
        out.add(
            ClutchTag(
                key = t.optString("key"),
                label = t.optString("label"),
                emoji = t.optString("emoji"),
                accent = t.optString("accent", "blue")
            )
        )
    }
    return out
}
