package com.example.numera.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.AdaptiveAnswerRequest
import com.example.numera.data.network.ApiService
import com.example.numera.sound.SoundManager
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.WrongRed
import com.example.numera.ui.components.GlossyProgressBar
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.launch

// Adaptive diagnostic placement. Server-authoritative: questions arrive one at a time, the server
// scores each answer (the client never sees the correct answer) and adapts the difficulty, then
// places the learner at a starting level. Replaces the old static, client-scored quiz.
@Composable
fun PlacementTestScreen(
    apiService: ApiService,
    token: String,
    onComplete: (level: Int, rank: String) -> Unit,
    onCancel: () -> Unit
) {
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var errorMsg by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    var sessionId by remember { mutableIntStateOf(0) }
    var question by remember { mutableStateOf("") }
    var options by remember { mutableStateOf(listOf<String>()) }
    var questionNumber by remember { mutableIntStateOf(1) }
    var totalQuestions by remember { mutableIntStateOf(7) }

    var selectedOption by remember { mutableStateOf<String?>(null) }
    var isCheckingAnswer by remember { mutableStateOf(false) }
    var lastCorrect by remember { mutableStateOf(false) }

    // The next question (delivered with the answer response) is held until "Continue".
    var pendingQuestion by remember { mutableStateOf<String?>(null) }
    var pendingOptions by remember { mutableStateOf(listOf<String>()) }
    var pendingNumber by remember { mutableIntStateOf(0) }
    var finishing by remember { mutableStateOf(false) }

    var done by remember { mutableStateOf(false) }
    var placedLevel by remember { mutableIntStateOf(1) }
    var correctCount by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        try {
            val r = apiService.startAdaptiveDiagnostic(token)
            sessionId = r.sessionId
            question = r.question
            options = r.options
            questionNumber = r.questionNumber
            totalQuestions = r.totalQuestions
            isLoading = false
        } catch (e: Exception) {
            errorMsg = e.message ?: "Failed to start the diagnostic"
            isLoading = false
        }
    }

    fun checkAnswer() {
        val sel = selectedOption ?: return
        if (busy) return
        busy = true
        scope.launch {
            try {
                val res = apiService.answerAdaptiveDiagnostic(token, AdaptiveAnswerRequest(sessionId, sel))
                lastCorrect = res.lastCorrect
                if (res.lastCorrect) SoundManager.playCorrect() else SoundManager.playWrong()
                if (res.done) {
                    finishing = true
                    placedLevel = res.placedLevel ?: 1
                    correctCount = res.correct
                } else {
                    pendingQuestion = res.question
                    pendingOptions = res.options
                    pendingNumber = res.questionNumber
                }
                isCheckingAnswer = true
            } catch (e: Exception) {
                errorMsg = e.message ?: "Failed to submit your answer"
            } finally {
                busy = false
            }
        }
    }

    fun continueNext() {
        isCheckingAnswer = false
        selectedOption = null
        if (finishing) {
            done = true
        } else {
            question = pendingQuestion ?: question
            options = pendingOptions
            questionNumber = pendingNumber
            pendingQuestion = null
        }
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator()
                Spacer(modifier = Modifier.height(16.dp))
                Text("Calibrating your placement…", style = MaterialTheme.typography.bodyLarge)
            }
        }
        return
    }

    if (errorMsg != null && !done) {
        Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Diagnostic Error ⚠️", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(12.dp))
                Text(errorMsg!!, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(24.dp))
                Button(onClick = onCancel) { Text("Go Back") }
            }
        }
        return
    }

    if (done) {
        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(24.dp).verticalScroll(rememberScrollState()),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                Text("Placement Calibrated! 🧠✨", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary, textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(8.dp))
                Text("You answered $correctCount of $totalQuestions correctly.", fontSize = 15.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f), textAlign = TextAlign.Center)
                Spacer(modifier = Modifier.height(20.dp))
                Box(
                    modifier = Modifier.size(120.dp).clip(RoundedCornerShape(24.dp)).background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("LEVEL", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f))
                        Text("$placedLevel", fontSize = 40.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                if (placedLevel > 1) {
                    Text(
                        "🚀 We started you at your actual proficiency — no need to grind through the basics.",
                        fontSize = 13.sp, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.85f)
                    )
                }
                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = { onComplete(placedLevel, "") },
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

    Scaffold(
        topBar = {
            Column(modifier = Modifier.background(MaterialTheme.colorScheme.background)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Adaptive Placement", fontSize = 18.sp, fontWeight = FontWeight.Black, color = MaterialTheme.colorScheme.primary)
                    TextButton(onClick = onCancel) { Text("Skip") }
                }
                GlossyProgressBar(
                    progress = questionNumber.toFloat() / totalQuestions,
                    isCompleted = false,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }
        },
        bottomBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .border(width = 1.dp, color = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                    .padding(16.dp)
                    .navigationBarsPadding()
            ) {
                if (!isCheckingAnswer) {
                    Button(
                        onClick = { checkAnswer() },
                        enabled = selectedOption != null && !busy,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        if (busy) CircularProgressIndicator(color = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(22.dp))
                        else Text("Check Answer", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onPrimary)
                    }
                } else {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = if (lastCorrect) com.example.numera.ui.components.NumeraIconType.Check else com.example.numera.ui.components.NumeraIconType.Close,
                                tint = if (lastCorrect) CorrectGreen else WrongRed,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (lastCorrect) "Correct!" else "Not quite",
                                fontSize = 18.sp, fontWeight = FontWeight.ExtraBold,
                                color = if (lastCorrect) CorrectGreen else WrongRed
                            )
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(
                            onClick = { continueNext() },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = if (lastCorrect) CorrectGreen else WrongRed)
                        ) {
                            Text(
                                text = if (finishing) "See My Placement" else "Continue",
                                fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(paddingValues).padding(16.dp).verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Question $questionNumber of $totalQuestions", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                    Spacer(modifier = Modifier.height(12.dp))
                    MathText(text = question, fontSizePx = 46)
                }
            }
            options.forEach { option ->
                val isSelected = selectedOption == option
                Card(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).clickable(enabled = !isCheckingAnswer) {
                        SoundManager.playClick()
                        selectedOption = option
                    },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface),
                    border = BorderStroke(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
                    )
                ) {
                    Box(modifier = Modifier.fillMaxWidth().padding(18.dp), contentAlignment = Alignment.CenterStart) {
                        MathText(text = option, fontSizePx = 38)
                    }
                }
            }
            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
