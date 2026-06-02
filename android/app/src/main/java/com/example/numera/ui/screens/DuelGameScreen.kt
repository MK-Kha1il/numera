package com.example.numera.ui.screens

import android.util.Log
import androidx.compose.animation.*
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    onFinishGame: () -> Unit
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
    
    var showParticles by remember { mutableStateOf(false) }
    
    var isDuelOver by remember { mutableStateOf(false) }
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
            val data = args[0] as JSONObject
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
            val data = args[0] as JSONObject
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

    VictoryParticles(trigger = showParticles) {
        showParticles = false
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
        return
    }

    val currentProblem = problemsList.getOrNull(currentProblemIdx) ?: problemsList.last()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Racer Progress Display (Modern, clean, Duo-like panels)
        DuoCard(
            modifier = Modifier.fillMaxWidth(),
            backgroundColor = MaterialTheme.colorScheme.surfaceVariant
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Player progress
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("YOU (Progress)", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text("$myPoints pts ($myProgress/5)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(
                        progress = { myProgress / 5f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.outline
                    )
                }

                // Opponent progress
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(opponentName.uppercase() + " (Opponent)", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold)
                        Text("$oppPoints pts ($oppProgress/5)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(
                        progress = { oppProgress / 5f },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp)),
                        color = MaterialTheme.colorScheme.secondary,
                        trackColor = MaterialTheme.colorScheme.outline
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
            borderColor = if (hasAnswered) {
                if (selectedAnswer == currentProblem.correctAnswer) CorrectGreen else WrongRed
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
                                        correct_answer = currentProblem.correctAnswer,
                                        options = currentProblem.options,
                                        explanation = currentProblem.explanation
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
                val isCorrect = currentProblem.correctAnswer == option

                val outlineColor = if (hasAnswered) {
                    if (isCorrect) CorrectGreen else if (isSelected) WrongRed else MaterialTheme.colorScheme.outline
                } else {
                    MaterialTheme.colorScheme.outline
                }

                val depthColor = if (hasAnswered) {
                    if (isCorrect) CorrectGreenPressed else if (isSelected) WrongRed else MaterialTheme.colorScheme.outline
                } else {
                    DuoBorder
                }

                val bgColor = if (hasAnswered) {
                    if (isCorrect) CorrectGreen.copy(alpha = 0.1f)
                    else if (isSelected) WrongRed.copy(alpha = 0.1f)
                    else MaterialTheme.colorScheme.surfaceVariant
                } else {
                    MaterialTheme.colorScheme.surface
                }

                val textColor = if (hasAnswered) {
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
                                        val correct = option == currentProblem.correctAnswer
                                        
                                        if (correct) {
                                            SoundManager.playCorrect()
                                            com.example.numera.haptic.HapticManager.playSuccess()
                                            showParticles = true
                                        } else {
                                            SoundManager.playWrong()
                                            com.example.numera.haptic.HapticManager.playError()
                                        }

                                        val nextIdx = currentProblemIdx + 1
                                        SocketClient.submitAnswer(roomId, myUserId, correct, nextIdx)

                                        val isLast = currentProblemIdx >= problemsList.size - 1
                                        if (!isLast) {
                                            scope.launch {
                                                kotlinx.coroutines.delay(1000)
                                                currentProblemIdx++
                                                hasAnswered = false
                                                selectedAnswer = ""
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
}
