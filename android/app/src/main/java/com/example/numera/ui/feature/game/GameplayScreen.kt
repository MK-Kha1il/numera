package com.example.numera.ui.feature.game

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import com.example.numera.ui.components.PressFeedback
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathKeyboard
import com.example.numera.ui.components.VictoryParticles
import com.example.numera.ui.components.TapEffectLayer
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.animation.core.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraSlideOver
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType

/**
 * Parsed shape of [com.example.numera.data.network.MathProblem.socraticJson], produced by the
 * server's `mathEngine/socraticEngine.js`. [byOption] keys are wrong-option strings; [generic] is
 * the fallback for typed answers and unmatched options. probe = a guiding question; hint = a
 * targeted nudge revealed on demand. Neither ever contains the final answer.
 */
data class SocraticEntry(
    val misconception: String? = null,
    val probe: String? = null,
    val hint: String? = null,
)

data class SocraticFeedback(
    val byOption: Map<String, SocraticEntry>? = null,
    val generic: SocraticEntry? = null,
)

/**
 * Parsed shape of [com.example.numera.data.network.MathProblem.selfExplainJson], produced by the
 * server's `mathEngine/selfExplainEngine.js`. After a CORRECT answer we ask the learner WHY it is
 * right (the self-explanation effect): pick the real reason among plausible-but-wrong rationales.
 * Exactly one [SelfExplainOption.correct] is true. Empty/absent when the concept has no authored set.
 */
data class SelfExplainOption(
    val text: String? = null,
    val correct: Boolean = false,
)

data class SelfExplainPrompt(
    val question: String? = null,
    val options: List<SelfExplainOption>? = null,
    val explanation: String? = null,
)

/**
 * Parsed shape of [com.example.numera.data.network.MathProblem.workedExampleJson], produced by the
 * server's `mathEngine/workedExampleEngine.js`. After a WRONG answer we offer a fully worked model
 * of the *method* on a DIFFERENT instance ([problem] has its own numbers, so the live answer is not
 * leaked). [steps] are revealed one at a time (predict-then-reveal "fading"). Empty/absent when the
 * concept has no authored example.
 */
data class WorkedExampleStep(
    val action: String? = null,
    val math: String? = null,
    val why: String? = null,
)

data class WorkedExample(
    val problem: String? = null,
    val steps: List<WorkedExampleStep>? = null,
)

/**
 * The per-problem gameplay UI carved out of SoloGameScreen (the old "Main Gameplay Screen" Box:
 * progress header + reference slide-over, the equation card with the favorite/save dialog and
 * tooltip, the Tip/Calc/Try-Paper tool buttons, the MCQ/typed/timed answer interface, the feedback
 * banner, and the whiteboard/calculator/tip slide-up overlays).
 *
 * State stays owned by SoloGameScreen: written values come in as MutableState (re-delegated with
 * `by` below so the moved body is verbatim) and the reward/advance + answer logic come in as
 * callbacks (handleAnswer / isCurrentAnswerCorrect / continueOrFinish / logCalculatorTelemetry).
 * Guarded by GameplayScreenTest (correct/wrong banner, advance, review dialog, out-of-hearts) and
 * RecapScreenTest (finish -> recap).
 */
@Composable
fun GameplayScreen(
    category: String,
    level: Int,
    isLegacyPuzzle: Boolean,
    gameMode: String,
    currentProblem: com.example.numera.data.network.MathProblem,
    currentProblemIdx: Int,
    problemsList: List<com.example.numera.data.network.MathProblem>,
    currentExerciseType: ExerciseType,
    lessonTitle: String?,
    lessonContent: String?,
    lessonFormula: String?,
    totalTime: Float,
    timeLeft: Float,
    heartsLeft: Int,
    shakeOffset: androidx.compose.ui.unit.Dp,
    isSavingSession: Boolean,
    gamePrefs: android.content.SharedPreferences,
    scope: kotlinx.coroutines.CoroutineScope,
    hasAnsweredState: androidx.compose.runtime.MutableState<Boolean>,
    selectedAnswerState: androidx.compose.runtime.MutableState<String>,
    typedInputState: androidx.compose.runtime.MutableState<String>,
    activeExplanationState: androidx.compose.runtime.MutableState<String?>,
    answeredWrongForCurrentState: androidx.compose.runtime.MutableState<Boolean>,
    showReferenceState: androidx.compose.runtime.MutableState<Boolean>,
    showSaveDialogState: androidx.compose.runtime.MutableState<Boolean>,
    showFavoriteTooltipState: androidx.compose.runtime.MutableState<Boolean>,
    showScratchpadPromptState: androidx.compose.runtime.MutableState<Boolean>,
    showWhiteboardState: androidx.compose.runtime.MutableState<Boolean>,
    showCalculatorState: androidx.compose.runtime.MutableState<Boolean>,
    showTipState: androidx.compose.runtime.MutableState<Boolean>,
    showReviewDialogState: androidx.compose.runtime.MutableState<Boolean>,
    favoritedQuestionsState: androidx.compose.runtime.MutableState<Set<String>>,
    whiteboardStrokes: androidx.compose.runtime.snapshots.SnapshotStateList<com.example.numera.ui.components.ScratchStroke>,
    whiteboardRedoStrokes: androidx.compose.runtime.snapshots.SnapshotStateList<com.example.numera.ui.components.ScratchStroke>,
    calculatorInputState: androidx.compose.runtime.MutableState<String>,
    calculatorResultState: androidx.compose.runtime.MutableState<String>,
    calculatorMemoryState: androidx.compose.runtime.MutableState<Double>,
    calculatorHistoryState: androidx.compose.runtime.MutableState<List<String>>,
    calcIsErrorState: androidx.compose.runtime.MutableState<Boolean>,
    handleAnswer: (Boolean) -> Unit,
    isCurrentAnswerCorrect: () -> Boolean,
    continueOrFinish: (Boolean) -> Unit,
    logCalculatorTelemetry: (String?) -> Unit,
) {
    var hasAnswered by hasAnsweredState
    var selectedAnswer by selectedAnswerState
    var typedInput by typedInputState
    var activeExplanation by activeExplanationState
    var answeredWrongForCurrent by answeredWrongForCurrentState
    var showReference by showReferenceState
    var showSaveDialog by showSaveDialogState
    var showFavoriteTooltip by showFavoriteTooltipState
    var showScratchpadPrompt by showScratchpadPromptState
    var showWhiteboard by showWhiteboardState
    var showCalculator by showCalculatorState
    var showTip by showTipState
    var showReviewDialog by showReviewDialogState
    var favoritedQuestions by favoritedQuestionsState

    // Socratic wrong-answer feedback parsed from the server JSON string (see Models.kt).
    val socratic = remember(currentProblem.socraticJson) {
        currentProblem.socraticJson?.takeIf { it.isNotBlank() }?.let { json ->
            try {
                com.google.gson.Gson().fromJson(json, SocraticFeedback::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }
    // Self-explanation prompt (shown after a CORRECT answer) parsed from the server JSON string.
    val selfExplain = remember(currentProblem.selfExplainJson) {
        currentProblem.selfExplainJson?.takeIf { it.isNotBlank() }?.let { json ->
            try {
                com.google.gson.Gson().fromJson(json, SelfExplainPrompt::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }
    // Which reason the learner tapped in the self-explanation prompt (null = unanswered). Resets
    // per problem. Purely formative — it never changes the score, only deepens understanding.
    var selfExplainChoice by remember(currentProblemIdx) { mutableStateOf<Int?>(null) }
    // Worked example (shown on demand after a WRONG answer) parsed from the server JSON string.
    val workedExample = remember(currentProblem.workedExampleJson) {
        currentProblem.workedExampleJson?.takeIf { it.isNotBlank() }?.let { json ->
            try {
                com.google.gson.Gson().fromJson(json, WorkedExample::class.java)
            } catch (e: Exception) {
                null
            }
        }
    }
    // Faded reveal: how many worked-example steps the learner has uncovered (0 = collapsed). Each
    // tap predicts-then-reveals the next step. Resets per problem. Purely formative.
    var workedStepsShown by remember(currentProblemIdx) { mutableStateOf(0) }
    // Progressive-disclosure flag for the targeted hint: stays one tap behind the probe so the
    // learner gets a chance to self-correct first. Resets when the problem changes or the banner
    // is dismissed (e.g. Retry Exercise flips hasAnswered back to false).
    var showHint by remember(currentProblemIdx) { mutableStateOf(false) }
    // Productive struggle: in MCQ we withhold *which* option is correct until the learner either
    // answered correctly or chose to see the worked solution. Flipped by "Review Solution".
    var answerRevealed by remember(currentProblemIdx) { mutableStateOf(false) }
    // Content-quality report dialog for the current exercise (ultra review #17/#90).
    var showReport by remember { mutableStateOf(false) }
    val reportContext = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(hasAnswered) {
        if (!hasAnswered) {
            showHint = false
            answerRevealed = false
        }
    }

    // Main Gameplay Screen — wrapped so an equipped tap effect (docs/ShopOverhaul.md §8) flourishes
    // where each answer tap lands. The pointer handler observes only (never consumes), so taps work.
    TapEffectLayer(tapKey = RetrofitClient.equippedTapKey, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(Spacing.l),
            verticalArrangement = Arrangement.Top
        ) {
        // Progress header
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (gameMode == "mistakes_practice") "GROWTH PRACTICE" else if (isLegacyPuzzle) "LEGACY PUZZLE" else "${category.uppercase()} · LEVEL $level",
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    Text(
                        text = "Exercise ${currentProblemIdx + 1} of ${problemsList.size}",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                    // Reference: open the concept/formula reminder without leaving the exercise.
                    val hasReference = !lessonFormula.isNullOrEmpty() || !lessonContent.isNullOrEmpty()
                    if (hasReference) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(MaterialTheme.colorScheme.secondary.copy(alpha = 0.14f))
                                .pressable(feedback = PressFeedback.Silent) {
                                    SoundManager.playClick()
                                    com.example.numera.haptic.HapticManager.playSoft()
                                    showReference = true
                                }
                                .padding(horizontal = Spacing.s, vertical = 5.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                NumeraIcon(type = NumeraIconType.Tip, tint = MaterialTheme.colorScheme.secondary, animate = false, modifier = Modifier.size(IconSize.s))
                                Text("Reference", color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            if (showReference) {
                NumeraSlideOver(
                    onDismiss = { showReference = false },
                    title = lessonTitle ?: "Reference",
                    subtitle = "Quick reminder — your progress is saved"
                ) {
                    if (!lessonFormula.isNullOrEmpty()) {
                        Text("FORMULA", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 0.8.sp)
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            val f = lessonFormula!!
                            if (f.contains("$") || f.contains("\\")) {
                                MathText(text = f, fontSizePx = 26, color = MaterialTheme.colorScheme.onBackground, modifier = Modifier.fillMaxWidth())
                            } else {
                                Text(f, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                            }
                        }
                    }
                    if (!lessonContent.isNullOrEmpty()) {
                        Text("CONCEPT", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Black, fontSize = 11.sp, letterSpacing = 0.8.sp)
                        val c = lessonContent!!
                        if (c.contains("$") || c.contains("\\")) {
                            MathText(text = c, fontSizePx = 16, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.fillMaxWidth())
                        } else {
                            Text(c, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurface, lineHeight = 20.sp)
                        }
                    }
                }
            }

            // Exercise Mode Label & Countdown
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val modeLabel = when (currentExerciseType) {
                    ExerciseType.MCQ -> if (gameMode == "level" && currentProblemIdx == 0) "Guided Exercise" else "Exercise"
                    ExerciseType.TYPED -> "Independent Exercise"
                    ExerciseType.TIMED -> "Timed Mastery"
                }
                
                Text(
                    text = modeLabel,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp
                )

                if (gameMode == "level") {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        repeat(3) { i ->
                            val active = i < heartsLeft
                            Text(
                                text = if (active) "❤️" else "🖤",
                                fontSize = 14.sp
                            )
                        }
                    }
                }

                if (currentExerciseType == ExerciseType.TIMED) {
                    val sec = timeLeft.toInt()
                    val pulseScale = if (timeLeft <= 5f) {
                        1f + 0.15f * kotlin.math.sin(timeLeft * Math.PI * 2).toFloat().coerceAtLeast(0f)
                    } else 1f
                    
                    Text(
                        text = "⏱️ ${sec}s",
                        color = if (timeLeft <= 5f) WrongRed else DuoSecondary,
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        modifier = Modifier.drawBehind {
                            // Subtle pulse drawing
                        }
                    )
                }
            }

            // Timed progress bar
            if (currentExerciseType == ExerciseType.TIMED) {
                val progress = timeLeft / totalTime
                val color = when {
                    timeLeft > 10f -> CorrectGreen
                    timeLeft > 5f -> DuoTertiary
                    else -> WrongRed
                }
                LinearProgressIndicator(
                    progress = progress,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = color,
                    trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                )
            }
        }

        // Active Equation Card with Screen Shake
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 80.dp, max = 180.dp)
                .padding(vertical = Spacing.s)
                .offset(x = shakeOffset)
        ) {
            DuoCard(
                modifier = Modifier.fillMaxSize(),
                borderColor = if (hasAnswered) {
                    if (isCurrentAnswerCorrect()) CorrectGreen else WrongRed
                } else {
                    MaterialTheme.colorScheme.outline
                }
            ) {
                val questionLength = currentProblem.question.length
                val adaptiveFontSize = when {
                    questionLength > 200 -> 13.sp
                    questionLength > 120 -> 15.sp
                    questionLength > 60  -> if (isLegacyPuzzle) 15.sp else 18.sp
                    else                 -> if (isLegacyPuzzle) 16.sp else 22.sp
                }
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 60.dp, max = 180.dp)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = Spacing.l, vertical = Spacing.m),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    if (currentProblem.question.contains("$") || currentProblem.question.contains("\\")) {
                        val mathFontSize = if (questionLength > 120) 28 else 38
                        MathText(
                            text = currentProblem.question,
                            fontSizePx = mathFontSize,
                            color = MaterialTheme.colorScheme.onBackground,
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text(
                            text = currentProblem.question,
                            fontSize = adaptiveFontSize,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            val isFav = favoritedQuestions.contains(currentProblem.question)
            IconButton(
                onClick = {
                    com.example.numera.haptic.HapticManager.playMedium()
                    showSaveDialog = true
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(Spacing.s)
                    .testTag("favorite-toggle")
            ) {
                com.example.numera.ui.components.NumeraIcon(
                    type = com.example.numera.ui.components.NumeraIconType.Favorite,
                    filled = isFav,
                    tint = if (isFav) WrongRed else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
            }

            if (showSaveDialog) {
                SaveOptionsDialog(
                    isSaved = isFav,
                    onToggleFavorite = {
                        showSaveDialog = false
                        val nextFavState = !isFav
                        favoritedQuestions = if (nextFavState)
                            favoritedQuestions + currentProblem.question
                        else favoritedQuestions - currentProblem.question
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.toggleFavorite(token,
                                    com.example.numera.data.network.ToggleFavoriteRequest(
                                        title = if (isLegacyPuzzle) "Archive Exercise" else "Level $level Exercise",
                                        category = category,
                                        question = currentProblem.question,
                                        correct_answer = currentProblem.correctAnswer,
                                        options = currentProblem.options,
                                        explanation = currentProblem.explanation
                                    ))
                            } catch (e: Exception) {
                                Log.e("SoloGame", "Failed to toggle favorite: ${e.message}")
                            }
                        }
                    },
                    onSaveLevel = {
                        showSaveDialog = false
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                problemsList.forEach { prob ->
                                    try {
                                        RetrofitClient.apiService.toggleFavorite(token,
                                            com.example.numera.data.network.ToggleFavoriteRequest(
                                                title = "Level $level Exercise",
                                                category = category,
                                                question = prob.question,
                                                correct_answer = prob.correctAnswer,
                                                options = prob.options,
                                                explanation = prob.explanation
                                            ))
                                    } catch (_: Exception) {}
                                }
                                withContext(Dispatchers.Main) {
                                    favoritedQuestions = favoritedQuestions + problemsList.map { it.question }.toSet()
                                }
                            } catch (e: Exception) {
                                Log.e("SoloGame", "Failed to save level: ${e.message}")
                            }
                        }
                    },
                    onRetryExercise = {
                        showSaveDialog = false
                        hasAnswered = false
                        selectedAnswer = ""
                        typedInput = ""
                        activeExplanation = null
                        answeredWrongForCurrent = false
                        com.example.numera.haptic.HapticManager.playSoft()
                    },
                    onDismiss = { showSaveDialog = false },
                )
            }

            if (showFavoriteTooltip) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = Spacing.xxxl, end = Spacing.m)
                        .width(200.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                        .border(1.dp, MaterialTheme.colorScheme.secondary, RoundedCornerShape(8.dp))
                        .padding(Spacing.s)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        Text(
                            text = "❤️ Save this equation for offline review in your notebook!",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.weight(1f)
                        )
                        IconButton(
                            onClick = {
                                showFavoriteTooltip = false
                                gamePrefs.edit().putBoolean("dismissed_favorite_tooltip", true).apply()
                            },
                            modifier = Modifier.size(IconSize.s)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Close",
                                modifier = Modifier.size(Spacing.m),
                                tint = MaterialTheme.colorScheme.onSecondaryContainer
                            )
                        }
                    }
                }
            }

            if (currentExerciseType == ExerciseType.MCQ || currentExerciseType == ExerciseType.TYPED) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(Spacing.m)
                ) {
                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        AnimatedVisibility(
                            visible = showScratchpadPrompt,
                            enter = fadeIn() + expandVertically(),
                            exit = fadeOut() + shrinkVertically()
                        ) {
                            Box(
                                modifier = Modifier
                                    .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(10.dp))
                                    .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Text(
                                    text = "💡 Need scratch space?",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }
                        }

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Tip Button
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.tertiary,
                                                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.8f)
                                            )
                                        )
                                    )
                                    .pressable(feedback = PressFeedback.Silent) {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showCalculator = false
                                        showWhiteboard = false
                                        showTip = true
                                    }
                                    .padding(horizontal = Spacing.m, vertical = Spacing.s),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Tip,
                                        tint = MaterialTheme.colorScheme.onTertiary,
                                        modifier = Modifier.size(IconSize.s),
                                        animate = false
                                    )
                                    Text(
                                        text = "TIP",
                                        color = MaterialTheme.colorScheme.onTertiary,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp,
                                        letterSpacing = 0.8.sp
                                    )
                                }
                            }

                            // Calculator Button
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.secondary,
                                                MaterialTheme.colorScheme.secondary.copy(alpha = 0.8f)
                                            )
                                        )
                                    )
                                    .pressable(feedback = PressFeedback.Silent) {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showTip = false
                                        showWhiteboard = false
                                        showCalculator = true
                                        logCalculatorTelemetry(null)
                                    }
                                    .padding(horizontal = Spacing.m, vertical = Spacing.s),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Calculator,
                                        tint = MaterialTheme.colorScheme.onSecondary,
                                        modifier = Modifier.size(IconSize.s),
                                        animate = false
                                    )
                                    Text(
                                        text = "CALC",
                                        color = MaterialTheme.colorScheme.onSecondary,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp,
                                        letterSpacing = 0.8.sp
                                    )
                                }
                            }

                            // Try Paper Button
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.primary,
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)
                                            )
                                        )
                                    )
                                    .border(BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.8f)), shape = RoundedCornerShape(12.dp))
                                    .pressable(feedback = PressFeedback.Silent) {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showTip = false
                                        showCalculator = false
                                        showWhiteboard = true
                                        showScratchpadPrompt = false
                                    }
                                    .padding(horizontal = Spacing.m, vertical = Spacing.s),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Scratchpad,
                                        tint = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(IconSize.s),
                                        animate = false
                                    )
                                    Text(
                                        text = "TRY PAPER",
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 11.sp,
                                        letterSpacing = 0.8.sp
                                    )
                                }
                            }
                        }
                    }
        }
    }
}

        // Answer Interface using slide transition — takes remaining space and is scrollable
        AnimatedContent(
            targetState = currentProblemIdx,
            transitionSpec = {
                slideInHorizontally { width -> width } + fadeIn() togetherWith
                        slideOutHorizontally { width -> -width } + fadeOut()
            },
            label = "problem_transition",
            modifier = Modifier.weight(1f)
        ) { targetIdx ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                // Interactive Mathematical Discovery surface — shown only when the
                // server's Adaptive Visual Intelligence attached a manipulative, and
                // only while the learner is still working the problem.
                currentProblem.interactiveVisualJson
                    ?.takeIf { it.isNotBlank() && !hasAnswered }
                    ?.let { visJson ->
                        DuoCard(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "✦ DISCOVER",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.sp,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.padding(start = 14.dp, top = 10.dp)
                                )
                                com.example.numera.ui.components.InteractiveVisual(
                                    specJson = visJson
                                )
                            }
                        }
                    }

                if (currentExerciseType == ExerciseType.TYPED) {
                    // Typed answer layout
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Text(
                            text = "Type the correct numerical value:",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
                        )
                        
                        OutlinedTextField(
                            value = typedInput,
                            onValueChange = { if (!hasAnswered) typedInput = it },
                            placeholder = { Text("Value...") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(16.dp),
                            enabled = !hasAnswered,
                            keyboardOptions = KeyboardOptions(
                                keyboardType = if (currentProblem.correctAnswer.all { it.isDigit() || it == '-' || it == '.' || it == '/' }) KeyboardType.Number else KeyboardType.Text,
                                imeAction = ImeAction.Done
                            ),
                            keyboardActions = KeyboardActions(
                                onDone = {
                                    if (!hasAnswered && typedInput.trim().isNotEmpty()) {
                                        hasAnswered = true
                                        handleAnswer(isCurrentAnswerCorrect())
                                    }
                                }
                            )
                        )

                        // Math-symbol pad: the tokens the stock keyboard makes painful
                        // (fraction / exponent / π / parens) — all grader-understood (#16).
                        if (!hasAnswered) {
                            MathKeyboard(
                                value = typedInput,
                                onValueChange = { typedInput = it },
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }

                        if (!hasAnswered) {
                            DuoButton(
                                text = "Check Answer",
                                enabled = typedInput.trim().isNotEmpty(),
                                onClick = {
                                    hasAnswered = true
                                    handleAnswer(isCurrentAnswerCorrect())
                                },
                                modifier = Modifier.fillMaxWidth(),
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                } else {
                    // MCQ choices layout (used in Exercise 1 and 3)
                    Column(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        currentProblem.options.forEach { option ->
                            val isSelected = selectedAnswer == option
                            // The correct option is only styled as correct once revealed (got it
                            // right, or tapped Review Solution). Until then a wrong pick shows red
                            // but the right answer stays hidden — the probe gets the first word.
                            val revealCorrect = isCurrentAnswerCorrect() || answerRevealed
                            val isCorrect = currentProblem.correctAnswer == option && revealCorrect

                            val outlineColor = if (hasAnswered) {
                                if (isCorrect) CorrectGreen else if (isSelected) WrongRed else MaterialTheme.colorScheme.outline
                            } else {
                                MaterialTheme.colorScheme.outline
                            }
                            
                            val depthColor = if (hasAnswered) {
                                if (isCorrect) CorrectGreenPressed else if (isSelected) WrongRedPressed else MaterialTheme.colorScheme.outline
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
                                if (isCorrect) CorrectGreenPressed else if (isSelected) WrongRedPressed else MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
                            } else {
                                MaterialTheme.colorScheme.onBackground
                            }

                            val bottomDepth = Spacing.xs
                            val isPressed = remember { mutableStateOf(false) }
                            val offset = if (isPressed.value && !hasAnswered) bottomDepth else Spacing.zero

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
                                                    handleAnswer(option == currentProblem.correctAnswer)
                                                }
                                            )
                                        }
                                    }
                                    .drawBehind {
                                        if (!hasAnswered) {
                                            drawRoundRect(
                                                color = depthColor,
                                                cornerRadius = CornerRadius(Spacing.l.toPx(), Spacing.l.toPx())
                                            )
                                        }
                                    }
                                    .padding(bottom = if (isPressed.value && !hasAnswered) Spacing.zero else bottomDepth)
                                    .offset(y = offset)
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(bgColor)
                                    .border(
                                        BorderStroke(1.5.dp, outlineColor),
                                        shape = RoundedCornerShape(16.dp)
                                    )
                                    .padding(Spacing.l),
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
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(Spacing.s))

        // Mistake Banner sliding sheet
        AnimatedVisibility(
            visible = hasAnswered,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxWidth()
        ) {
            val correct = isCurrentAnswerCorrect()

            val isLast = currentProblemIdx >= problemsList.size - 1

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = Spacing.xs),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (correct) CorrectGreen.copy(alpha = 0.08f) else WrongRed.copy(alpha = 0.08f)
                ),
                border = BorderStroke(1.5.dp, if (correct) CorrectGreen.copy(alpha = 0.3f) else WrongRed.copy(alpha = 0.3f))
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Text(
                        text = if (correct) "✨ EXCELLENT JOB!" else "🤔 LET'S THINK",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = if (correct) CorrectGreen else MaterialTheme.colorScheme.primary,
                        letterSpacing = 1.sp
                    )

                    // Self-explanation prompt (the self-explanation effect): after a CORRECT answer,
                    // ask WHY it's right so the learner articulates the principle. Optional and purely
                    // formative — it never changes the score; the learner can just tap Continue. Only
                    // appears for concepts the server authored a reason-set for (selfExplainEngine.js).
                    val seOptions = selfExplain?.options
                    if (correct && !seOptions.isNullOrEmpty()) {
                        Text(
                            text = selfExplain.question ?: "Why is that the right answer?",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
                            lineHeight = 19.sp
                        )
                        seOptions.forEachIndexed { i, opt ->
                            val answered = selfExplainChoice != null
                            val isThis = selfExplainChoice == i
                            val bg = when {
                                answered && opt.correct -> CorrectGreen.copy(alpha = 0.15f)
                                answered && isThis -> WrongRed.copy(alpha = 0.15f)
                                else -> MaterialTheme.colorScheme.primary.copy(alpha = 0.06f)
                            }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                    .background(bg)
                                    .then(
                                        if (!answered) Modifier.pressable(feedback = PressFeedback.Silent) {
                                            com.example.numera.haptic.HapticManager.playSoft()
                                            selfExplainChoice = i
                                        } else Modifier
                                    )
                                    .padding(horizontal = Spacing.m, vertical = Spacing.s),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                if (answered && opt.correct) {
                                    Text("✓", color = CorrectGreen, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                } else if (answered && isThis) {
                                    Text("✗", color = WrongRed, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                }
                                Text(
                                    text = opt.text ?: "",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
                                    lineHeight = 17.sp
                                )
                            }
                        }
                        if (selfExplainChoice != null && !selfExplain.explanation.isNullOrBlank()) {
                            val gotIt = seOptions.getOrNull(selfExplainChoice!!)?.correct == true
                            Text(
                                text = (if (gotIt) "Exactly — " else "The key idea: ") + selfExplain.explanation,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.75f),
                                lineHeight = 17.sp
                            )
                        }
                    }

                    // Socratic guidance instead of an instant answer reveal: lead with a question
                    // targeted at the learner's chosen wrong option (productive struggle), keep the
                    // worked answer one tap away behind "Review Solution".
                    if (!correct) {
                        val chosenWrong = if (currentExerciseType == ExerciseType.TYPED)
                            typedInput.trim() else selectedAnswer
                        val entry = socratic?.byOption?.get(chosenWrong) ?: socratic?.generic
                        val probe = entry?.probe
                        val hint = entry?.hint

                        Text(
                            text = probe ?: "Take another look — which single step might have slipped?",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
                            lineHeight = 20.sp
                        )

                        // Fading guidance: the targeted nudge is revealed only on request.
                        if (!hint.isNullOrBlank()) {
                            if (!showHint) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                        .pressable(feedback = PressFeedback.Silent) {
                                            com.example.numera.haptic.HapticManager.playSoft()
                                            showHint = true
                                        }
                                        .padding(horizontal = Spacing.m, vertical = Spacing.s)
                                ) {
                                    Text(
                                        text = "Show a hint",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            } else {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.08f))
                                        .padding(Spacing.m),
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                ) {
                                    Text(text = "💡", fontSize = 14.sp)
                                    Text(
                                        text = hint,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f),
                                        lineHeight = 19.sp
                                    )
                                }
                            }
                        }

                        // Worked example (the worked-example effect): a fully solved model of the
                        // METHOD on a DIFFERENT instance (its own numbers — never the live answer),
                        // offered at the moment of struggle. Faded: steps reveal one at a time so the
                        // learner predicts each next move. Optional, formative — never changes score.
                        // Only appears for concepts the server authored an example for.
                        val weSteps = workedExample?.steps
                        if (!weSteps.isNullOrEmpty()) {
                            if (workedStepsShown == 0) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                        .pressable(feedback = PressFeedback.Silent) {
                                            com.example.numera.haptic.HapticManager.playSoft()
                                            workedStepsShown = 1
                                        }
                                        .padding(horizontal = Spacing.m, vertical = Spacing.s)
                                ) {
                                    Text(
                                        text = "📝 See a worked example",
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }
                            } else {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.06f))
                                        .padding(Spacing.m),
                                    verticalArrangement = Arrangement.spacedBy(Spacing.s)
                                ) {
                                    Text(
                                        text = "Worked example — different numbers, same method:",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.85f)
                                    )
                                    workedExample.problem?.takeIf { it.isNotBlank() }?.let { p ->
                                        MathText(
                                            text = p,
                                            fontSizePx = 16,
                                            color = MaterialTheme.colorScheme.onBackground,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                    weSteps.take(workedStepsShown).forEachIndexed { i, step ->
                                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                            Text(
                                                text = "${i + 1}. ${step.action ?: ""}",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium,
                                                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.9f),
                                                lineHeight = 17.sp
                                            )
                                            step.math?.takeIf { it.isNotBlank() }?.let { m ->
                                                MathText(
                                                    text = m,
                                                    fontSizePx = 15,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.fillMaxWidth()
                                                )
                                            }
                                            step.why?.takeIf { it.isNotBlank() }?.let { w ->
                                                Text(
                                                    text = w,
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Normal,
                                                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                                                    lineHeight = 15.sp
                                                )
                                            }
                                        }
                                    }
                                    if (workedStepsShown < weSteps.size) {
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f))
                                                .pressable(feedback = PressFeedback.Silent) {
                                                    com.example.numera.haptic.HapticManager.playSoft()
                                                    workedStepsShown += 1
                                                }
                                                .padding(horizontal = Spacing.m, vertical = Spacing.s)
                                        ) {
                                            Text(
                                                text = "Reveal next step",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                        }
                                    } else {
                                        Text(
                                            text = "Now try yours the same way 👆",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (!correct) {
                            // "Review Solution" option
                            DuoButton(
                                text = "Review Solution",
                                onClick = {
                                    answerRevealed = true
                                    showReviewDialog = true
                                },
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }

                        // "Continue" option (either next question or finish game)
                        DuoButton(
                            text = if (isSavingSession) "Saving..." else (if (isLast) "Finish Game" else "Continue"),
                            enabled = !isSavingSession,
                            onClick = { continueOrFinish(isLast) },
                            modifier = Modifier.weight(1f),
                            color = if (correct) CorrectGreen else MaterialTheme.colorScheme.primary
                        )
                    }

                    // Quiet, always-available "report a problem" affordance — the content-quality
                    // feedback loop, reachable after every answer regardless of correctness.
                    Text(
                        text = "⚐ Report a problem",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                        modifier = Modifier
                            .align(Alignment.CenterHorizontally)
                            .clip(RoundedCornerShape(com.example.numera.theme.CornerRadius.s))
                            .pressable(feedback = PressFeedback.Silent) { showReport = true }
                            .padding(horizontal = Spacing.m, vertical = Spacing.s)
                    )
                }
            }
        }
    } // Closes the main Column

        // Slide-up whiteboard overlay
        AnimatedVisibility(
            visible = showWhiteboard,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            com.example.numera.ui.components.ScratchPad(
                strokes = whiteboardStrokes,
                redoStrokes = whiteboardRedoStrokes,
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f),
                onClose = {
                    showWhiteboard = false
                }
            )
        }

        // Slide-up scientific calculator overlay
        CalculatorOverlay(
            visible = showCalculator,
            onClose = { showCalculator = false },
            inputState = calculatorInputState,
            resultState = calculatorResultState,
            memoryState = calculatorMemoryState,
            historyState = calculatorHistoryState,
            errorState = calcIsErrorState,
            logTelemetry = { logCalculatorTelemetry(it) },
        )

        // Slide-up tip overlay
        TipOverlay(
            visible = showTip,
            onClose = { showTip = false },
            problem = problemsList.getOrNull(currentProblemIdx),
        )

        if (showReport) {
            ReportProblemDialog(
                problem = currentProblem,
                category = category,
                level = level,
                gameMode = gameMode,
                onDismiss = { showReport = false },
                onSubmitted = {
                    showReport = false
                    android.widget.Toast.makeText(reportContext, "Thanks — report sent.", android.widget.Toast.LENGTH_SHORT).show()
                },
            )
        }
    } // Closes the wrapping Box
}
