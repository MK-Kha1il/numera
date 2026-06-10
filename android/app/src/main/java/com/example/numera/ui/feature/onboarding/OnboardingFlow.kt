package com.example.numera.ui.feature.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.CommitmentRequest
import com.example.numera.data.network.MotivationsRequest
import com.example.numera.data.network.NotificationOptInRequest
import com.example.numera.data.network.OnboardingCatalogs
import com.example.numera.data.network.OnboardingEventRequest
import com.example.numera.data.network.OnboardingProfileRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.AnimDuration
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.screens.CinematicMathBackground
import com.example.numera.ui.screens.PlacementTestScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// The ordered onboarding steps. `ordinal` is the progress index; size is the total.
private enum class OnbStep { Welcome, Goals, Profile, Diagnostic, Roadmap, Aha, Celebrate, Habit, Notifications }

/**
 * The onboarding orchestrator: a step state-machine hosting all phases between signup and the app,
 * with one shared premium skin, animated transitions, funnel analytics, and server-owned completion.
 * Reuses the existing adaptive diagnostic ([PlacementTestScreen]) verbatim as the placement step.
 */
@Composable
fun OnboardingFlow(onComplete: () -> Unit) {
    val api = RetrofitClient.apiService
    val token = RetrofitClient.authToken ?: ""
    val scope = rememberCoroutineScope()
    val totalAll = OnbStep.values().size

    var step by remember { mutableStateOf(OnbStep.Welcome) }
    var catalogs by remember { mutableStateOf(OnboardingCatalogs()) }
    var displayName by remember { mutableStateOf("") }
    // Hidden until the server confirms push can actually deliver (FCM credentialed) —
    // never ask a brand-new user to opt into notifications that cannot arrive.
    var pushAvailable by remember { mutableStateOf(false) }
    // Progress denominator excludes the notifications step while it's hidden.
    val total = if (pushAvailable) totalAll else totalAll - 1

    // Fire-and-forget funnel analytics (Phase 14).
    fun logEvent(s: OnbStep, event: String) {
        scope.launch(Dispatchers.IO) {
            runCatching { api.logOnboardingEvent(token, OnboardingEventRequest(s.name.lowercase(), event, null)) }
        }
    }
    LaunchedEffect(step) { logEvent(step, "enter") }

    // Load catalogs + the learner's name once.
    LaunchedEffect(Unit) {
        runCatching { withContext(Dispatchers.IO) { api.getOnboardingState(token) } }.getOrNull()?.let {
            catalogs = it.catalogs
            pushAvailable = it.pushAvailable
        }
        runCatching { withContext(Dispatchers.IO) { api.getProfile(token) } }.getOrNull()?.let { displayName = it.display_name ?: it.username }
    }

    fun go(next: OnbStep) {
        logEvent(step, "complete")
        step = next
    }

    // Lightweight personalization saves are optimistic (advance immediately; persist in background).
    fun persistMotivations(keys: List<String>) {
        scope.launch(Dispatchers.IO) { runCatching { api.saveMotivations(token, MotivationsRequest(keys)) } }
    }
    fun persistProfile(name: String, avatar: String?, style: String?, interests: List<String>) {
        scope.launch(Dispatchers.IO) { runCatching { api.saveOnboardingProfile(token, OnboardingProfileRequest(name, style, avatar, interests)) } }
    }
    fun persistCommitment(frequency: String, days: List<Int>) {
        scope.launch(Dispatchers.IO) { runCatching { api.saveOnboardingCommitment(token, CommitmentRequest(frequency, days)) } }
    }
    // optIn == null means the notifications step was hidden (push not deliverable yet):
    // complete onboarding without recording a choice the user never made.
    fun finish(optIn: Boolean?) {
        scope.launch(Dispatchers.IO) {
            if (optIn != null) {
                runCatching { api.saveOnboardingNotificationOptIn(token, NotificationOptInRequest(optIn)) }
                logEvent(OnbStep.Notifications, "complete")
            }
            runCatching { api.completeOnboarding(token) }
            withContext(Dispatchers.Main) { onComplete() }
        }
    }

    AnimatedContent(
        targetState = step,
        transitionSpec = {
            (slideInHorizontally(animationSpec = tween(AnimDuration.normal)) { it / 3 } +
                fadeIn(animationSpec = tween(AnimDuration.normal))) togetherWith
                fadeOut(animationSpec = tween(AnimDuration.fast))
        },
        label = "onboarding-steps",
    ) { s ->
        val idx = s.ordinal
        when (s) {
            OnbStep.Welcome -> WelcomeStep(idx, total, displayName) { go(OnbStep.Goals) }

            OnbStep.Goals -> GoalsStep(idx, total, catalogs.motivations) { keys ->
                persistMotivations(keys)
                go(OnbStep.Profile)
            }

            OnbStep.Profile -> ProfileStep(
                stepIndex = idx,
                totalSteps = total,
                initialName = displayName,
                avatars = catalogs.avatars,
                styles = catalogs.profileStyles,
                interests = catalogs.interests,
                onBack = { step = OnbStep.Goals },
            ) { name, avatar, style, interests ->
                displayName = name
                persistProfile(name, avatar, style, interests)
                go(OnbStep.Diagnostic)
            }

            // Reuse the existing server-authoritative adaptive diagnostic verbatim. It writes
            // users.level server-side, which the roadmap then reads.
            OnbStep.Diagnostic -> PlacementTestScreen(
                apiService = api,
                token = token,
                onComplete = { _, _ -> go(OnbStep.Roadmap) },
                onCancel = { go(OnbStep.Roadmap) },
            )

            OnbStep.Roadmap -> RoadmapStep(idx, total, api, token) { go(OnbStep.Aha) }

            OnbStep.Aha -> AhaStep(
                stepIndex = idx,
                totalSteps = total,
                api = api,
                token = token,
                onSolved = { go(OnbStep.Celebrate) },
                onSkip = { go(OnbStep.Habit) },
            )

            OnbStep.Celebrate -> CelebrateStep { go(OnbStep.Habit) }

            OnbStep.Habit -> HabitStep(
                stepIndex = idx,
                totalSteps = total,
                onBack = { step = OnbStep.Roadmap },
            ) { frequency, days ->
                persistCommitment(frequency, days)
                if (pushAvailable) {
                    go(OnbStep.Notifications)
                } else {
                    logEvent(OnbStep.Habit, "complete")
                    finish(null)
                }
            }

            OnbStep.Notifications -> NotificationsStep(idx, total) { optIn -> finish(optIn) }
        }
    }
}

/** Phase 1 — warm identity intro. Sets the tone (premium, welcoming) and previews the value. */
@Composable
private fun WelcomeStep(stepIndex: Int, totalSteps: Int, name: String, onStart: () -> Unit) {
    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = if (name.isBlank()) "Welcome to Numera 👋" else "Welcome, $name 👋",
        subtitle = "Let's build a learning space that's truly yours. It takes about a minute.",
        primaryLabel = "Let's begin",
        nextPreview = "Choose what you're here for",
        onPrimary = onStart,
    ) {
        ValueProp("🎯", "Learn at your level", "A quick, smart placement — no grinding through what you already know.")
        Spacer(Modifier.height(Spacing.m))
        ValueProp("🧠", "Practice that fits your goals", "Every session is tuned to where you want to go.")
        Spacer(Modifier.height(Spacing.m))
        ValueProp("🔥", "Build a habit that sticks", "Small, consistent wins — we'll help you show up.")
    }
}

@Composable
private fun ValueProp(emoji: String, title: String, body: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
        Text(emoji, fontSize = 30.sp)
        Spacer(Modifier.width(Spacing.m))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Text(body, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f))
        }
    }
}

/** Phase 7 — a restrained, meaningful celebration of the first solved problem. Momentum, not noise. */
@Composable
private fun CelebrateStep(onContinue: () -> Unit) {
    val scale = remember { Animatable(0.6f) }
    LaunchedEffect(Unit) { scale.animateTo(1f, animationSpec = tween(AnimDuration.slow)) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.surfaceVariant)
                )
            )
            .systemBarsPadding()
            .padding(Spacing.xl),
    ) {
        CinematicMathBackground()
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("🎉", fontSize = 72.sp, modifier = Modifier.graphicsLayer { scaleX = scale.value; scaleY = scale.value })
            Spacer(Modifier.height(Spacing.l))
            Text(
                "That's your first win.",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.primary,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(Spacing.s))
            Text(
                "This is how momentum starts — one solved problem at a time. Let's make it a habit.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        DuoButton(
            text = "Keep going",
            onClick = onContinue,
            modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter),
        )
    }
}
