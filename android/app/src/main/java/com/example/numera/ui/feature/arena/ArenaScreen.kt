package com.example.numera.ui.feature.arena

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.RankBadge
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
    val scope = rememberCoroutineScope()

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

            sock?.on("friend_room_created") { args ->
                val data = args[0] as JSONObject
                val code = data.getString("roomCode")
                scope.launch(Dispatchers.Main) {
                    friendRoomCode = code
                }
            }

            sock?.on("friend_room_error") { args ->
                val data = args[0] as JSONObject
                val msg = data.getString("message")
                scope.launch(Dispatchers.Main) {
                    friendRoomError = msg
                    friendLobbyState = "join_input" // go back to input on error
                }
            }

            sock?.on("duel_start") { args ->
                val data = args[0] as JSONObject
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
                            text = "Search window: ±${100 + queueSecondsElapsed * 15} Elo",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            textAlign = TextAlign.Center
                        )

                        Spacer(modifier = Modifier.height(Spacing.l))

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
                            RankBadge(
                                rankName = user?.rank,
                                modifier = Modifier.size(72.dp)
                            )

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = user?.rank ?: "Unranked",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )

                                Text(
                                    text = "${user?.elo ?: 1000} Rating (Elo)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                                )

                                Spacer(modifier = Modifier.height(Spacing.xs))

                                val matches = user?.competitive_matches ?: 0
                                val wins = user?.arena_wins ?: 0
                                val winRate = if (matches > 0) (wins * 100) / matches else 0

                                Text(
                                    text = "Record: $wins W - ${matches - wins} L ($winRate% win rate)",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                    }
                }

                // Battle Modes Section Title
                item {
                    Text(
                        text = "BATTLE ARENAS",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.padding(top = Spacing.s)
                    )
                }

                // Ranked Battle
                item {
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(Spacing.l),
                            verticalArrangement = Arrangement.spacedBy(Spacing.m)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "⚔️ Ranked Match",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 17.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Text(
                                        text = "Compete for rating and rank up.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                            DuoButton(
                                text = "Find Ranked Duel",
                                onClick = { matchmakingMode = "ranked" },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // Casual Practice
                item {
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(Spacing.l),
                            verticalArrangement = Arrangement.spacedBy(Spacing.m)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "🛡️ Casual Practice",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 17.sp,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                    Text(
                                        text = "Play without rating loss risk.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                            DuoButton(
                                text = "Solve Casual Duel",
                                onClick = { matchmakingMode = "casual" },
                                color = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // Friend Battles
                item {
                    DuoCard(
                        modifier = Modifier.fillMaxWidth(),
                        borderColor = MaterialTheme.colorScheme.tertiary.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(Spacing.l),
                            verticalArrangement = Arrangement.spacedBy(Spacing.m)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "👥 Friend Arena",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 17.sp,
                                        color = MaterialTheme.colorScheme.tertiary
                                    )
                                    Text(
                                        text = "Duel direct friends using lobby codes.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )
                                }
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                            ) {
                                DuoButton(
                                    text = "Create Room",
                                    onClick = { friendLobbyState = "create" },
                                    color = MaterialTheme.colorScheme.tertiary,
                                    modifier = Modifier.weight(1f)
                                )
                                DuoButton(
                                    text = "Join Room",
                                    onClick = { friendLobbyState = "join_input" },
                                    color = MaterialTheme.colorScheme.tertiary,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
