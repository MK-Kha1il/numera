package com.example.numera.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.AssessmentSubmitRequest
import com.example.numera.data.network.MathProblem
import com.example.numera.sound.SoundManager
import com.example.numera.ui.components.MathAvatars
import com.example.numera.ui.components.MathBanners
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.GlossyProgressBar
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PlacementTestScreen(
    apiService: ApiService,
    token: String,
    onComplete: (level: Int, rank: String) -> Unit,
    onCancel: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()
    var questions by remember { mutableStateOf<List<MathProblem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    var currentIndex by remember { mutableStateOf(0) }
    var score by remember { mutableStateOf(0) }
    var selectedOption by remember { mutableStateOf<String?>(null) }

    // Diagnostic UI states
    var isCheckingAnswer by remember { mutableStateOf(false) }
    var isAnswerCorrect by remember { mutableStateOf(false) }
    var testCompleted by remember { mutableStateOf(false) }

    // Final assigned values
    var assignedLevel by remember { mutableStateOf(1) }
    var assignedRank by remember { mutableStateOf("Bronze III") }
    var rewardsUnlocked by remember { mutableStateOf<List<String>>(emptyList()) }
    var submitting by remember { mutableStateOf(false) }

    // 10 minute countdown timer (600 seconds)
    var timeRemaining by remember { mutableStateOf(600) }

    // Timer effect
    LaunchedEffect(key1 = testCompleted, key2 = isLoading) {
        if (!testCompleted && !isLoading) {
            while (timeRemaining > 0) {
                delay(1000)
                timeRemaining--
            }
            // If timer runs out, auto-submit
            if (timeRemaining == 0) {
                testCompleted = true
            }
        }
    }

    // Load questions on start
    LaunchedEffect(Unit) {
        try {
            questions = apiService.getAssessmentQuestions(token)
            isLoading = false
        } catch (e: Exception) {
            errorMsg = e.message ?: "Failed to fetch diagnostic questions"
            isLoading = false
        }
    }

    // Submit results helper
    fun submitDiagnosticResults() {
        submitting = true
        coroutineScope.launch {
            try {
                val res = apiService.submitAssessment(token, AssessmentSubmitRequest(score))
                if (res.success) {
                    assignedLevel = res.assignedLevel
                    assignedRank = res.assignedRank
                    rewardsUnlocked = res.rewardsUnlocked
                    testCompleted = true
                    SoundManager.playLevelUp()
                } else {
                    errorMsg = "Submission error"
                }
            } catch (e: Exception) {
                errorMsg = e.message ?: "Failed to submit assessment results"
            } finally {
                submitting = false
            }
        }
    }

    // Format timer to MM:SS
    fun formatTime(seconds: Int): String {
        val minutes = seconds / 60
        val secs = seconds % 60
        return String.format("%02d:%02d", minutes, secs)
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text("Analyzing mathematics diagnostic syllabus...", style = MaterialTheme.typography.bodyLarge)
            }
        }
        return
    }

    if (errorMsg != null && !testCompleted) {
        Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Diagnostic Error ⚠️", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(12.dp))
                Text(errorMsg!!, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = onCancel) {
                    Text("Go Back")
                }
            }
        }
        return
    }

    if (testCompleted) {
        // Diagnostic Celebration view
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Placement Evaluated! 🧠✨",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Diagnostic Complete! Out of 10 analytical assessments, you correctly resolved:",
                    fontSize = 15.sp,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                
                // Big score badge
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$score / 10",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Assessed level card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Assessed Placement", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.secondary)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            RankBadge(
                                rankName = assignedRank,
                                modifier = Modifier.size(44.dp)
                            )
                            Text(assignedRank, fontSize = 28.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Unlocked Level $assignedLevel", fontSize = 15.sp, fontWeight = FontWeight.Medium)
                        
                        if (assignedLevel > 1) {
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "🚀 You successfully skipped the basic content and started at your actual proficiency level!",
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center,
                                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                if (rewardsUnlocked.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Rank Milestone Rewards Unlocked! 🎁", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        rewardsUnlocked.forEach { itemId ->
                            if (itemId.startsWith("avatar_")) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                                        .padding(10.dp)
                                ) {
                                    Text(MathAvatars.getEmoji(itemId), fontSize = 28.sp)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text("Avatar Unlocked", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary)
                                        Text(MathAvatars.getLabel(itemId), fontWeight = FontWeight.Bold)
                                    }
                                }
                            } else if (itemId.startsWith("banner_")) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                ) {
                                    Column {
                                        ProfileBanner(bannerKey = itemId, modifier = Modifier.fillMaxWidth().height(60.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth().padding(8.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column {
                                                Text("Profile Banner Unlocked", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary)
                                                Text(MathBanners.getLabel(itemId), fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))

                Button(
                    onClick = { onComplete(assignedLevel, assignedRank) },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("Start Learning Quest", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                }
            }
        }
        return
    }

    val currentProblem = questions.getOrNull(currentIndex)
    if (currentProblem == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(MaterialTheme.colorScheme.background)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Placement Test",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Timer, contentDescription = "Timer", tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = formatTime(timeRemaining),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (timeRemaining < 60) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onBackground
                        )
                    }
                }

                // Cinematic Progress Bar
                val progressVal = (currentIndex + 1).toFloat() / questions.size
                GlossyProgressBar(
                    progress = progressVal,
                    isCompleted = progressVal >= 1f,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
        },
        bottomBar = {
            // Elegant slide-up answer feedback bottom sheet
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        if (isCheckingAnswer) {
                            if (isAnswerCorrect) Color(0xFFD7FFB7) else Color(0xFFFFDFDF)
                        } else {
                            MaterialTheme.colorScheme.surface
                        }
                    )
                    .border(
                        width = 1.dp,
                        color = if (isCheckingAnswer) {
                            if (isAnswerCorrect) Color(0xFF58CC02).copy(alpha = 0.5f) else Color(0xFFEA2B2B).copy(alpha = 0.5f)
                        } else {
                            MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        },
                        shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
                    )
                    .padding(16.dp)
                    .navigationBarsPadding()
            ) {
                if (!isCheckingAnswer) {
                    Button(
                        onClick = {
                            if (selectedOption != null) {
                                isCheckingAnswer = true
                                isAnswerCorrect = selectedOption == currentProblem.correctAnswer
                                if (isAnswerCorrect) {
                                    score++
                                    SoundManager.playCorrect()
                                } else {
                                    SoundManager.playWrong()
                                }
                            }
                        },
                        enabled = selectedOption != null,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = MaterialTheme.colorScheme.primary,
                            disabledContainerColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                        )
                    ) {
                        Text("Check Answer", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onPrimary)
                    }
                } else {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isAnswerCorrect) Icons.Default.Check else Icons.Default.Close,
                                contentDescription = if (isAnswerCorrect) "Correct" else "Wrong",
                                tint = if (isAnswerCorrect) Color(0xFF58CC02) else Color(0xFFEA2B2B),
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isAnswerCorrect) "You got it right!" else "Incorrect answer",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = if (isAnswerCorrect) Color(0xFF388E3C) else Color(0xFFD32F2F)
                            )
                        }
                        
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Text(
                            text = currentProblem.explanation,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                            lineHeight = 18.sp
                        )
                        
                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                // Transition or submit
                                isCheckingAnswer = false
                                selectedOption = null
                                if (currentIndex + 1 < questions.size) {
                                    currentIndex++
                                    SoundManager.playClick()
                                } else {
                                    submitDiagnosticResults()
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isAnswerCorrect) Color(0xFF58CC02) else Color(0xFFEA2B2B)
                            )
                        ) {
                            if (submitting) {
                                CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(24.dp))
                            } else {
                                Text(
                                    text = if (currentIndex + 1 < questions.size) "Continue" else "Finalize Test",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = MaterialTheme.colorScheme.onPrimary
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(12.dp))

            // Diagnostic question text card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Question ${currentIndex + 1} of ${questions.size}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.secondary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = currentProblem.question,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        textAlign = TextAlign.Center,
                        lineHeight = 28.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Options list
            currentProblem.options.forEach { option ->
                val isSelected = selectedOption == option
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 6.dp)
                        .clickable(enabled = !isCheckingAnswer) {
                            SoundManager.playClick()
                            selectedOption = option
                        },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) {
                            MaterialTheme.colorScheme.primaryContainer
                        } else {
                            MaterialTheme.colorScheme.surface
                        }
                    ),
                    border = BorderStroke(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                        }
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Radio button indicator
                        Box(
                            modifier = Modifier
                                .size(22.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(
                                    if (isSelected) {
                                        MaterialTheme.colorScheme.primary
                                    } else {
                                        Color.Transparent
                                    }
                                )
                                .border(
                                    width = 1.5.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSelected) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(14.dp))
                            }
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        Text(
                            text = option,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) {
                                MaterialTheme.colorScheme.onPrimaryContainer
                            } else {
                                MaterialTheme.colorScheme.onSurface
                            }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
