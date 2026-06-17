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
import com.example.numera.ui.components.MathText
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.MathIconSpinner
import com.example.numera.data.network.SocketClient
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
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

    DisposableEffect(Unit) {
        onDispose {
            SocketClient.socket?.off("room_status")
            SocketClient.socket?.off("duel_end")
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
            kotlinx.coroutines.delay(1800)
            showVsIntro = false
        }
        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            AnimatedVisibility(visible = introShown, enter = Motion.rewardEnter()) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Text(
                        text = myUsername,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary,
                        textAlign = TextAlign.Center
                    )
                    Text(text = "⚔️", fontSize = 54.sp)
                    Text(
                        text = "VS",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 6.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = opponentName,
                        fontSize = 26.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.secondary,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(Spacing.s))
                    Text(
                        text = "${problemsList.size} problems · fastest correct answers win",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        }
        return
    }

    if (isDuelOver) {
        val didIWin = duelWinnerId == myUserId
        val isCasual = eloInfo?.optBoolean("isCasual", false) ?: false
        var myChange = 0
        var myNewElo = 1000
        var myNewRank = ""
        var didICheat = false

        val p1Obj = eloInfo?.optJSONObject("p1")
        val p2Obj = eloInfo?.optJSONObject("p2")

        if (p1Obj != null && p1Obj.optInt("id") == myUserId) {
            myChange = p1Obj.optInt("eloChange")
            myNewElo = p1Obj.optInt("newElo")
            myNewRank = p1Obj.optString("newRank")
            didICheat = p1Obj.optBoolean("cheated", false)
        } else if (p2Obj != null && p2Obj.optInt("id") == myUserId) {
            myChange = p2Obj.optInt("eloChange")
            myNewElo = p2Obj.optInt("newElo")
            myNewRank = p2Obj.optString("newRank")
            didICheat = p2Obj.optBoolean("cheated", false)
        }

        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
            contentAlignment = Alignment.Center
        ) {
            // Result pops in with the reward spring; a win earns a confetti burst on top.
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

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (isCasual) {
                            "Casual Match Practice"
                        } else {
                            "Ranked League Battle"
                        },
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary
                    )

                    if (!isCasual) {
                        Text(
                            text = "New Rating: $myNewElo (${if (myChange >= 0) "+" else ""}$myChange)",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            RankBadge(rankName = myNewRank, modifier = Modifier.size(32.dp))
                            Text(
                                text = "Rank: $myNewRank",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }

                        if (didICheat) {
                            Text(
                                text = "⚠️ Suspicious solve times detected.\nElo change set to 0.",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = WrongRed,
                                textAlign = TextAlign.Center
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = if (didIWin) {
                            "You dominated the Arena! Received 🪙 +50 Coins."
                        } else {
                            "Opponent was faster this time."
                        },
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(16.dp))

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
                var winBurst by remember { mutableStateOf(true) }
                VictoryParticles(trigger = winBurst) { winBurst = false }
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
                    Text(
                        text = opponentName,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.secondary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.End,
                        modifier = Modifier.weight(1f)
                    )
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
                    if (streakCount >= 2) {
                        Text(
                            text = "🔥 ×$streakCount",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = MaterialTheme.colorScheme.tertiary
                        )
                    }
                    Text(
                        text = "Q ${(currentProblemIdx + 1).coerceAtMost(total)}/$total",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
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
                                        SocketClient.submitAnswer(roomId, myUserId, option, nextIdx) { correct, correctAnswer, explanation ->
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
