package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.unit.dp
import com.example.numera.data.network.AhaAnswerRequest
import com.example.numera.data.network.ApiService
import com.example.numera.sound.SoundManager
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing
import com.example.numera.theme.WrongRed
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Phase 6 — the "aha" moment. ONE deliberately achievable problem (a couple levels below placement),
 * graded server-side. A miss just lets you retry; this moment is designed to end in success.
 */
@Composable
fun AhaStep(
    stepIndex: Int,
    totalSteps: Int,
    api: ApiService,
    token: String,
    onSolved: () -> Unit,
    onSkip: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var question by remember { mutableStateOf("") }
    var options by remember { mutableStateOf<List<String>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var selected by remember { mutableStateOf<String?>(null) }
    var checking by remember { mutableStateOf(false) }
    var wrongShake by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        runCatching { withContext(Dispatchers.IO) { api.startOnboardingAha(token) } }
            .onSuccess { question = it.question; options = it.options }
        loading = false
    }

    fun check() {
        val sel = selected ?: return
        if (checking) return
        checking = true
        wrongShake = false
        scope.launch {
            val res = runCatching { withContext(Dispatchers.IO) { api.answerOnboardingAha(token, AhaAnswerRequest(sel)) } }.getOrNull()
            checking = false
            if (res?.correct == true) {
                SoundManager.playCorrect()
                onSolved()
            } else {
                SoundManager.playWrong()
                wrongShake = true
                selected = null
            }
        }
    }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "Your first win",
        subtitle = "One problem, picked just for you. Take your time.",
        primaryLabel = if (checking) "Checking…" else "Check",
        primaryEnabled = selected != null && !checking && !loading,
        onSkip = onSkip,
        onPrimary = { check() },
    ) {
        if (loading) {
            Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@OnboardingScaffold
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(CornerRadius.l))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .padding(Spacing.l),
            contentAlignment = Alignment.Center,
        ) {
            MathText(text = question, fontSizePx = 44)
        }

        Spacer(Modifier.height(Spacing.l))
        Column {
            options.forEach { opt ->
                val isSel = selected == opt
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = Spacing.xs)
                        .clip(RoundedCornerShape(CornerRadius.l))
                        .background(if (isSel) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)
                        .border(
                            BorderStroke(if (isSel) 2.dp else 1.dp, if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)),
                            RoundedCornerShape(CornerRadius.l),
                        )
                        .clickable { SoundManager.playClick(); selected = opt }
                        .padding(Spacing.l),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    MathText(text = opt, fontSizePx = 36)
                }
            }
        }

        if (wrongShake) {
            Spacer(Modifier.height(Spacing.m))
            Text(
                text = "Not quite — give it another try. You've got this.",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.SemiBold,
                color = WrongRed,
            )
        }
    }
}
