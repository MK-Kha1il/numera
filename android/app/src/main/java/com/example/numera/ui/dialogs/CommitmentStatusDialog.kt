package com.example.numera.ui.dialogs

import android.util.Log
import androidx.compose.foundation.layout.*
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import com.example.numera.data.network.*
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommitmentStatusDialog(
    apiService: ApiService,
    token: String,
    onDismissRequest: () -> Unit,
    onRefreshProfile: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var status by remember { mutableStateOf<CommitmentStatusResponse?>(null) }
    
    var isSolvingChallenge by remember { mutableStateOf(false) }
    var currentQuestionIndex by remember { mutableIntStateOf(0) }
    var inputAnswer by remember { mutableStateOf("") }
    var showErrorMessage by remember { mutableStateOf("") }
    
    var isRestoring by remember { mutableStateOf(false) }
    var restorationMessage by remember { mutableStateOf<String?>(null) }

    val loadStatus = {
        scope.launch(Dispatchers.IO) {
            try {
                val res = apiService.getCommitmentStatus(token)
                withContext(Dispatchers.Main) {
                    status = res
                    loading = false
                }
            } catch (e: Exception) {
                Log.e("CommitmentDialog", "Failed to fetch status: ${e.message}")
                withContext(Dispatchers.Main) {
                    loading = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        loadStatus()
    }

    val challengeQuestions = remember {
        listOf(
            Pair("Solve for x: x + 12 = 30", "18"),
            Pair("Compute: 7 * 8", "56"),
            Pair("Solve for y: 3y - 5 = 10", "5"),
            Pair("Compute: 45 - 19", "26"),
            Pair("Compute: 120 / 6", "20")
        )
    }

    val totalQuestions = status?.challengeQuestionsCount ?: 3

    val handleRecommit = { method: String ->
        scope.launch(Dispatchers.IO) {
            try {
                isRestoring = true
                val res = apiService.recommitClimb(token, RecommitRequest(method))
                withContext(Dispatchers.Main) {
                    isRestoring = false
                    restorationMessage = res.message
                    onRefreshProfile()
                    com.example.numera.sound.SoundManager.playRewardClaim()
                    com.example.numera.haptic.HapticManager.playSuccess()
                }
            } catch (e: Exception) {
                Log.e("CommitmentDialog", "Failed to recommit: ${e.message}")
                withContext(Dispatchers.Main) {
                    isRestoring = false
                    showErrorMessage = e.message ?: "Failed to restore climb."
                }
            }
        }
    }

    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!isSolvingChallenge) onDismissRequest() }) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Spacing.l),
            borderColor = MaterialTheme.colorScheme.primary
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(Spacing.l),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.l)
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(40.dp))
                    Text("Opening commitment space...", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                } else if (restorationMessage != null) {
                    Text("✨ Restore Success ✨", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(restorationMessage!!, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(Spacing.s))
                    DuoButton(
                        text = "Continue",
                        onClick = {
                            onDismissRequest()
                        },
                        color = CorrectGreen,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (isSolvingChallenge) {
                    Text(
                        text = "Recommit Challenge",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Question ${currentQuestionIndex + 1} of $totalQuestions",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    
                    val q = challengeQuestions[currentQuestionIndex % challengeQuestions.size]
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                            Text(q.first, fontWeight = FontWeight.Bold, fontSize = 16.sp, textAlign = TextAlign.Center)
                        }
                    }

                    OutlinedTextField(
                        value = inputAnswer,
                        onValueChange = { inputAnswer = it },
                        label = { Text("Your Answer") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )

                    if (showErrorMessage.isNotEmpty()) {
                        Text(showErrorMessage, color = WrongRed, fontSize = 12.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        TextButton(
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                isSolvingChallenge = false
                                currentQuestionIndex = 0
                                inputAnswer = ""
                                showErrorMessage = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Quit")
                        }
                        
                        DuoButton(
                            text = "Submit",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                com.example.numera.haptic.HapticManager.playSoft()
                                if (inputAnswer.trim() == q.second) {
                                    showErrorMessage = ""
                                    inputAnswer = ""
                                    if (currentQuestionIndex + 1 >= totalQuestions) {
                                        handleRecommit("challenge")
                                    } else {
                                        currentQuestionIndex++
                                    }
                                } else {
                                    showErrorMessage = "Take your time. Double-check your formula."
                                }
                            },
                            color = CorrectGreen,
                            modifier = Modifier.weight(1f)
                        )
                    }
                } else {
                    val currentClimb = status?.streak ?: 0
                    val bestClimb = status?.maxStreak ?: 0
                    val index = status?.consistencyIndex ?: 0f
                    val burnout = status?.burnoutRisk ?: "low"
                    val state = status?.commitmentState ?: "active"
                    val shields = status?.shieldsCount ?: 0
                    
                    Text(
                        text = "Your Consistency Climb",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    
                    Text(
                        text = status?.message ?: "",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Climb", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("$currentClimb days", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Best Run", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("$bestClimb days", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Habit Index", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("${(index * 100).toInt()}%", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Burnout Risk", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text(
                                    text = burnout.replaceFirstChar { it.uppercaseChar() },
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = when (burnout) {
                                        "high" -> StatusDanger
                                        "medium" -> StatusWarning
                                        else -> StatusSuccess
                                    }
                                )
                            }
                        }
                    }

                    if (state == "fading") {
                        Spacer(modifier = Modifier.height(Spacing.xs))
                        Text(
                            text = "Choose your recovery route:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        DuoButton(
                            text = "Recommit Challenge ($totalQuestions Eq.)",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                com.example.numera.haptic.HapticManager.playSoft()
                                isSolvingChallenge = true
                            },
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.fillMaxWidth()
                        )

                        DuoButton(
                            text = "Use Streak Shield (Owned: $shields)",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                handleRecommit("shield")
                            },
                            color = if (shields > 0) StatusInfo else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = shields > 0
                        )

                        DuoButton(
                            text = "Spend 150 Coins",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                handleRecommit("coins")
                            },
                            color = if ((status?.coins ?: 0) >= 150) Color(0xFFFFB300) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = (status?.coins ?: 0) >= 150
                        )
                    }

                    if (showErrorMessage.isNotEmpty()) {
                        Text(showErrorMessage, color = WrongRed, fontSize = 12.sp, textAlign = TextAlign.Center)
                    }

                    TextButton(
                        onClick = onDismissRequest,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }
}
