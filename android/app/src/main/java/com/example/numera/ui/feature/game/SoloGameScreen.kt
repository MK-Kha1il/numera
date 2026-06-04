package com.example.numera.ui.feature.game

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import com.example.numera.ui.components.VictoryParticles
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

@Composable
fun SoloGameScreen(
    category: String,
    level: Int,
    isLegacyPuzzle: Boolean = false,
    legacyPuzzleId: Int = 0,
    gameMode: String = "level",
    passedQuestion: String? = null,
    passedCorrectAnswer: String? = null,
    passedOptionsJson: String? = null,
    passedExplanation: String? = null,
    passedLessonTitle: String? = null,
    passedLessonContent: String? = null,
    passedLessonFormula: String? = null,
    passedExamplesJson: String? = null,
    onFinishGame: () -> Unit
) {
    val context = LocalContext.current
    val gamePrefs = remember(context) { context.getSharedPreferences("numera_game_prefs", android.content.Context.MODE_PRIVATE) }
    val showFavoriteTooltipState = remember {
        mutableStateOf(!gamePrefs.getBoolean("dismissed_favorite_tooltip", false))
    }
    var showFavoriteTooltip by showFavoriteTooltipState

    var problemsList by remember { mutableStateOf<List<MathProblem>>(emptyList()) }
    var mistakeIdsList by remember { mutableStateOf<List<Int>>(emptyList()) }
    // Concept being assessed in a transfer challenge — used to record the out-of-context outcome.
    var transferConceptId by remember { mutableStateOf<String?>(null) }
    var currentProblemIdx by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    
    var solvedCount by remember { mutableIntStateOf(0) }
    var correctStreak by remember { mutableIntStateOf(0) }
    val activeExplanationState = remember { mutableStateOf<String?>(null) }
    var activeExplanation by activeExplanationState
    val hasAnsweredState = remember { mutableStateOf(false) }
    var hasAnswered by hasAnsweredState
    val selectedAnswerState = remember { mutableStateOf("") }
    var selectedAnswer by selectedAnswerState
    
    var showParticles by remember { mutableStateOf(false) }
    var isGameOver by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    // Bumped by the error-state "Try Again" button to re-run the load effect (retry on failure).
    var loadAttempt by remember { mutableIntStateOf(0) }
    
    var xpReward by remember { mutableIntStateOf(0) }
    var coinReward by remember { mutableIntStateOf(0) }
    var levelUpOccurred by remember { mutableStateOf(false) }
    var isSavingSession by remember { mutableStateOf(false) }

    var lessonTitle by remember { mutableStateOf<String?>(null) }
    var lessonContent by remember { mutableStateOf<String?>(null) }
    var lessonFormula by remember { mutableStateOf<String?>(null) }
    var examplesList by remember { mutableStateOf<List<MathExample>>(emptyList()) }
    var lessonSections by remember { mutableStateOf<LessonSections?>(null) }
    var showLesson by remember { mutableStateOf(false) }
    
    var errorsCount by remember { mutableIntStateOf(0) }
    var heartsLeft by remember { mutableIntStateOf(3) }
    var retryTokensLeft by remember { mutableIntStateOf(0) }
    var showRetryDialogPrompt by remember { mutableStateOf(false) }
    var streakBonusActive by remember { mutableStateOf(false) }
    var criticalBonusActive by remember { mutableStateOf(false) }

    // New Game feel & Loop states
    val typedInputState = remember { mutableStateOf("") }
    var typedInput by typedInputState
    var timeLeft by remember { mutableFloatStateOf(20f) }
    val totalTime = 20f

    val answeredWrongForCurrentState = remember { mutableStateOf(false) }
    var answeredWrongForCurrent by answeredWrongForCurrentState
    var correctFirstTryCount by remember { mutableIntStateOf(0) }
    var perfectStreakCount by remember { mutableIntStateOf(0) }
    var maxPerfectStreak by remember { mutableIntStateOf(0) }

    var shakeTrigger by remember { mutableIntStateOf(0) }
    val shakeOffset by animateDpAsState(
        targetValue = if (shakeTrigger % 2 == 1) 10.dp else Spacing.zero,
        animationSpec = keyframes {
            durationMillis = 300
            Spacing.zero at 0
            (-10).dp at 50
            10.dp at 100
            (-8).dp at 150
            Spacing.s at 200
            (-4).dp at 250
            Spacing.zero at 300
        },
        label = "shake"
    )

    val showReviewDialogState = remember { mutableStateOf(false) }
    var showReviewDialog by showReviewDialogState

    // User Profile Stats for recap screen
    var currentStreakDays by remember { mutableIntStateOf(0) }
    var userRank by remember { mutableStateOf("Bronze V") }
    var userLevel by remember { mutableIntStateOf(1) }
    var userXP by remember { mutableIntStateOf(0) }
    var userCoins by remember { mutableIntStateOf(0) }

    // Bonus statistics
    var speedBonusGained by remember { mutableIntStateOf(0) }
    var comboBonusGained by remember { mutableIntStateOf(0) }
 
    val scope = rememberCoroutineScope()

    // Session Start Time for Telemetry
    val sessionStartTime = remember { System.currentTimeMillis() }

    // Whiteboard / Scratchpad states
    val showWhiteboardState = remember { mutableStateOf(false) }
    var showWhiteboard by showWhiteboardState

    // Slide-over reference panel — lets the learner peek the concept/formula mid-exercise.
    val showReferenceState = remember { mutableStateOf(false) }
    var showReference by showReferenceState

    // Calculator states
    val showCalculatorState = remember { mutableStateOf(false) }
    var showCalculator by showCalculatorState
    val calculatorInputState = remember { mutableStateOf("") }
    val calculatorResultState = remember { mutableStateOf("") }
    val calculatorMemoryState = remember { mutableStateOf(0.0) }
    val calculatorHistoryState = remember { mutableStateOf<List<String>>(emptyList()) }
    val calcIsErrorState = remember { mutableStateOf(false) }
    
    // Tip states
    val showTipState = remember { mutableStateOf(false) }
    var showTip by showTipState
    
    val whiteboardStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    val whiteboardRedoStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    
    val showScratchpadPromptState = remember { mutableStateOf(false) }
    var showScratchpadPrompt by showScratchpadPromptState
    var timeSpentOnQuestion by remember { mutableIntStateOf(0) }
    val favoritedQuestionsState = remember { mutableStateOf<Set<String>>(emptySet()) }
    var favoritedQuestions by favoritedQuestionsState
    val showSaveDialogState = remember { mutableStateOf(false) }
    var showSaveDialog by showSaveDialogState

    fun logCalculatorTelemetry(expression: String? = null) {
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                val request = CalculatorLogRequest(
                    category = category,
                    level = level,
                    question = if (problemsList.isNotEmpty() && currentProblemIdx < problemsList.size) problemsList[currentProblemIdx].question else "unknown",
                    template_type = if (problemsList.isNotEmpty() && currentProblemIdx < problemsList.size) problemsList[currentProblemIdx].tipMetadata?.subskill ?: "unknown" else "unknown",
                    game_mode = gameMode,
                    inputExpression = expression
                )
                val res = RetrofitClient.apiService.logCalculatorUsage(token, request)
                if (res.easterEggUnlocked == true) {
                    withContext(Dispatchers.Main) {
                        SoundManager.playRewardClaim()
                        RetrofitClient.triggerProfileRefresh()
                    }
                }
            } catch (e: Exception) {
                Log.e("SoloGame", "Failed to log calculator telemetry: ${e.message}")
            }
        }
    }

    LaunchedEffect(loadAttempt) {
        isLoading = true
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                
                coroutineScope {
                    val favsDeferred = async {
                        try {
                            RetrofitClient.apiService.getFavorites(token)
                        } catch (e: Exception) {
                            Log.e("SoloGame", "Failed to load favorites: ${e.message}")
                            null
                        }
                    }
                    val profileDeferred = async {
                        try {
                            RetrofitClient.apiService.getProfile(token)
                        } catch (e: Exception) {
                            Log.e("SoloGame", "Failed to load user profile: ${e.message}")
                            null
                        }
                    }
                    val shopDeferred = async {
                        try {
                            RetrofitClient.apiService.getShop(token)
                        } catch (e: Exception) {
                            Log.e("SoloGame", "Failed to load shop utilities: ${e.message}")
                            null
                        }
                    }

                    val favs = favsDeferred.await()
                    val profile = profileDeferred.await()
                    val shop = shopDeferred.await()

                    favs?.let {
                        withContext(Dispatchers.Main) {
                            favoritedQuestions = it.map { fav -> fav.question }.toSet()
                        }
                    }
                    profile?.let {
                        withContext(Dispatchers.Main) {
                            currentStreakDays = it.streak
                            userRank = it.rank
                            userLevel = it.level
                            userXP = it.xp
                            userCoins = it.coins
                        }
                    }
                    shop?.let {
                        val retryTokenUtility = it.utilities?.find { item -> item.item_id == "item_retry_token" }
                        withContext(Dispatchers.Main) {
                            retryTokensLeft = retryTokenUtility?.quantity ?: 0
                        }
                    }
                }

                when (gameMode) {
                    "legacy_puzzle" -> {
                        val puzzles = RetrofitClient.apiService.getLegacyPuzzles(token)
                        val match = puzzles.find { it.id == legacyPuzzleId }
                        if (match != null) {
                            problemsList = listOf(
                                MathProblem(
                                    question = match.question,
                                    correctAnswer = match.correct_answer,
                                    options = match.options,
                                    explanation = match.explanation
                                )
                            )
                            // Fetch lesson using the puzzle's actual category and difficulty tier
                            val targetLevel = when {
                                match.stars >= 4 -> 45
                                match.stars >= 3 -> 30
                                match.stars >= 2 -> 18
                                else -> 9
                            }
                            try {
                                val response = RetrofitClient.apiService.getProblems(token, match.category, targetLevel, count = 1)
                                withContext(Dispatchers.Main) {
                                    lessonTitle = response.lessonTitle
                                    lessonContent = response.lessonContent
                                    lessonFormula = response.lessonFormula
                                    examplesList = response.examples ?: emptyList(); lessonSections = response.lessonSections
                                    showLesson = !response.lessonTitle.isNullOrEmpty()
                                }
                            } catch (e: Exception) {
                                Log.e("SoloGame", "Failed to load lesson for legacy puzzle: ${e.message}")
                            }
                        }
                    }
                    "daily_puzzle" -> {
                        val puzzle = RetrofitClient.apiService.getDailyPuzzle(token)
                        problemsList = listOf(
                            MathProblem(
                                question = puzzle.question ?: "",
                                correctAnswer = puzzle.correct_answer ?: "",
                                options = puzzle.options ?: emptyList(),
                                explanation = puzzle.explanation ?: ""
                            )
                        )
                        val lessonT = puzzle.lessonTitle
                        val lessonC = puzzle.lessonContent
                        val lessonF = puzzle.lessonFormula
                        val examples = puzzle.examples
                        if (!lessonT.isNullOrEmpty()) {
                            withContext(Dispatchers.Main) {
                                lessonTitle = lessonT
                                lessonContent = lessonC
                                lessonFormula = lessonF
                                examplesList = examples ?: emptyList(); lessonSections = puzzle.lessonSections
                                showLesson = true
                            }
                        } else {
                            // Derive a contextually appropriate lesson level from the puzzle's difficulty tier
                            val puzzleCategory = puzzle.category ?: "arithmetic"
                            val targetLevel = when {
                                puzzle.stars != null && puzzle.stars >= 4 -> 45
                                puzzle.stars != null && puzzle.stars >= 3 -> 30
                                puzzle.stars != null && puzzle.stars >= 2 -> 18
                                else -> 9
                            }
                            try {
                                val response = RetrofitClient.apiService.getProblems(token, puzzleCategory, targetLevel, count = 1)
                                withContext(Dispatchers.Main) {
                                    lessonTitle = response.lessonTitle
                                    lessonContent = response.lessonContent
                                    lessonFormula = response.lessonFormula
                                    examplesList = response.examples ?: emptyList(); lessonSections = response.lessonSections
                                    showLesson = !response.lessonTitle.isNullOrEmpty()
                                }
                            } catch (e: Exception) {
                                Log.e("SoloGame", "Failed to load lesson for daily puzzle: ${e.message}")
                            }
                        }
                    }
                    "mistakes_practice" -> {
                        val mistakes = RetrofitClient.apiService.getMistakes(token)
                        problemsList = mistakes.map { m ->
                            MathProblem(
                                question = m.question,
                                correctAnswer = m.correct_answer,
                                options = m.options,
                                explanation = m.explanation
                            )
                        }
                        mistakeIdsList = mistakes.map { it.id }
                    }
                    "archive_puzzle" -> {
                        if (passedQuestion != null && passedCorrectAnswer != null && passedOptionsJson != null) {
                            val opts = passedOptionsJson.split("|||")
                            problemsList = listOf(
                                MathProblem(
                                    question = passedQuestion,
                                    correctAnswer = passedCorrectAnswer,
                                    options = opts,
                                    explanation = passedExplanation ?: ""
                                )
                            )
                            if (!passedLessonTitle.isNullOrEmpty()) {
                                val parsedExamples = try {
                                    if (!passedExamplesJson.isNullOrEmpty()) {
                                        val typeToken = object : com.google.gson.reflect.TypeToken<List<MathExample>>() {}.type
                                        com.google.gson.Gson().fromJson<List<MathExample>>(passedExamplesJson, typeToken)
                                    } else emptyList()
                                } catch (e: Exception) {
                                    emptyList()
                                }
                                withContext(Dispatchers.Main) {
                                    lessonTitle = passedLessonTitle
                                    lessonContent = passedLessonContent
                                    lessonFormula = passedLessonFormula
                                    examplesList = parsedExamples
                                    showLesson = true
                                }
                            } else {
                                val targetLevel = if (level > 0) level else 18
                                try {
                                    val response = RetrofitClient.apiService.getProblems(token, category, targetLevel, count = 1)
                                    withContext(Dispatchers.Main) {
                                        lessonTitle = response.lessonTitle
                                        lessonContent = response.lessonContent
                                        lessonFormula = response.lessonFormula
                                        examplesList = response.examples ?: emptyList(); lessonSections = response.lessonSections
                                        showLesson = !response.lessonTitle.isNullOrEmpty()
                                    }
                                } catch (e: Exception) {
                                    Log.e("SoloGame", "Failed to load lesson for archive puzzle: ${e.message}")
                                }
                            }
                        }
                    }
                    "transfer_challenge" -> {
                        // A single novel-context problem (Sprint 4). Deliberately no lesson — the
                        // point is to recognise the concept in an unfamiliar framing on your own.
                        val challenge = RetrofitClient.apiService.getTransferChallenge(token)
                        withContext(Dispatchers.Main) {
                            transferConceptId = challenge.conceptId
                            problemsList = listOf(
                                MathProblem(
                                    question = challenge.problem.question,
                                    correctAnswer = challenge.problem.correctAnswer,
                                    options = challenge.problem.options,
                                    explanation = challenge.problem.explanation
                                )
                            )
                        }
                    }
                    else -> { // "level"
                        val response = RetrofitClient.apiService.getProblems(token, category, level, count = 3)
                        problemsList = response.problems.take(3)
                        withContext(Dispatchers.Main) {
                            lessonTitle = response.lessonTitle
                            lessonContent = response.lessonContent
                            lessonFormula = response.lessonFormula
                            examplesList = response.examples ?: emptyList(); lessonSections = response.lessonSections
                            showLesson = !response.lessonTitle.isNullOrEmpty()
                        }
                    }
                }
                withContext(Dispatchers.Main) {
                    isLoading = false
                }
            } catch (e: Exception) {
                Log.e("SoloGame", "Failed to load problems: ${e.message}")
                withContext(Dispatchers.Main) {
                    isLoading = false
                }
            }
        }
    }

    // Intelligent whiteboard hesitation recommendation
    LaunchedEffect(currentProblemIdx, showWhiteboard, hasAnswered, problemsList) {
        if (hasAnswered || showWhiteboard || problemsList.isEmpty()) {
            showScratchpadPrompt = false
            return@LaunchedEffect
        }
        timeSpentOnQuestion = 0
        showScratchpadPrompt = false
        while (timeSpentOnQuestion < 10) {
            delay(1000)
            timeSpentOnQuestion++
        }
        val currentProblem = problemsList.getOrNull(currentProblemIdx)
        val type = if (currentProblem != null) {
            if (gameMode == "level") {
                when (currentProblemIdx) {
                    0 -> ExerciseType.MCQ
                    1 -> ExerciseType.TYPED
                    else -> ExerciseType.TIMED
                }
            } else {
                if (currentProblem.options.isEmpty()) ExerciseType.TYPED else ExerciseType.MCQ
            }
        } else null
        
        if (!hasAnswered && !showWhiteboard && (type == ExerciseType.MCQ || type == ExerciseType.TYPED)) {
            showScratchpadPrompt = true
        }
    }

    LaunchedEffect(answeredWrongForCurrent, problemsList) {
        if (problemsList.isEmpty()) return@LaunchedEffect
        val currentProblem = problemsList.getOrNull(currentProblemIdx)
        val type = if (currentProblem != null) {
            if (gameMode == "level") {
                when (currentProblemIdx) {
                    0 -> ExerciseType.MCQ
                    1 -> ExerciseType.TYPED
                    else -> ExerciseType.TIMED
                }
            } else {
                if (currentProblem.options.isEmpty()) ExerciseType.TYPED else ExerciseType.MCQ
            }
        } else null

        if (answeredWrongForCurrent && !showWhiteboard && !hasAnswered && (type == ExerciseType.MCQ || type == ExerciseType.TYPED)) {
            showScratchpadPrompt = true
        }
    }

    if (isLoading) {
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            NumeraPremiumLoader()
        }
        return
    }

    if (problemsList.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background).padding(Spacing.xl),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.m),
            ) {
                Text("😕", fontSize = 48.sp)
                Text(
                    "We couldn't load this round",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onBackground,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "Check your connection and try again — your progress is safe.",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center,
                )
                DuoButton(onClick = { loadAttempt++ }, text = "Try Again")
                TextButton(onClick = onFinishGame) {
                    Text("Go Back", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f))
                }
            }
        }
        return
    }

    if (showLesson && lessonTitle != null) {
        LessonScreen(
            level = level,
            lessonTitle = lessonTitle,
            lessonContent = lessonContent,
            lessonFormula = lessonFormula,
            examplesList = examplesList,
            lessonSections = lessonSections,
            onStart = {
                showLesson = false
                SoundManager.playClick()
            },
        )
        return
    }

    val currentProblem = problemsList[currentProblemIdx]

    fun handleAnswer(isCorrect: Boolean) {
        // Transfer challenge: record the out-of-context outcome (feeds the `transfer` mastery
        // dimension). Fire-and-forget so it never blocks the feedback UI.
        if (gameMode == "transfer_challenge") {
            val cid = transferConceptId
            if (cid != null) {
                scope.launch(Dispatchers.IO) {
                    try {
                        RetrofitClient.apiService.submitTransferResult(
                            RetrofitClient.authToken ?: "",
                            com.example.numera.data.network.TransferResultRequest(conceptId = cid, correct = isCorrect)
                        )
                    } catch (e: Exception) {
                        Log.e("SoloGame", "Failed to record transfer result: ${e.message}")
                    }
                }
            }
        }
        if (isCorrect) {
            SoundManager.playCorrect()
            com.example.numera.haptic.HapticManager.playSuccess()
            showParticles = true
            score += 20
            solvedCount++
            correctStreak++
            if (!answeredWrongForCurrent) {
                correctFirstTryCount++
                perfectStreakCount++
                maxPerfectStreak = maxOf(maxPerfectStreak, perfectStreakCount)
            }
            if (gameMode == "mistakes_practice" && currentProblemIdx < mistakeIdsList.size) {
                val mId = mistakeIdsList[currentProblemIdx]
                scope.launch(Dispatchers.IO) {
                    try {
                        RetrofitClient.apiService.resolveMistake(
                            token = RetrofitClient.authToken ?: "",
                            request = ResolveMistakeRequest(mId)
                        )
                    } catch (e: Exception) {
                        Log.e("SoloGame", "Failed to resolve mistake: ${e.message}")
                    }
                }
            }
            if (gameMode == "daily_puzzle") {
                scope.launch(Dispatchers.IO) {
                    try {
                        RetrofitClient.apiService.submitDailyPuzzle(
                            token = RetrofitClient.authToken ?: "",
                            request = DailyPuzzleSubmitRequest(correct = true)
                        )
                    } catch (e: Exception) {
                        Log.e("SoloGame", "Failed to submit daily puzzle: ${e.message}")
                    }
                }
            }
        } else {
            SoundManager.playWrong()
            com.example.numera.haptic.HapticManager.playError()
            errorsCount++
            answeredWrongForCurrent = true
            perfectStreakCount = 0
            activeExplanation = currentProblem.explanation
            shakeTrigger++
            if (gameMode != "mistakes_practice") {
                scope.launch(Dispatchers.IO) {
                    try {
                        RetrofitClient.apiService.addMistake(
                            token = RetrofitClient.authToken ?: "",
                            request = AddMistakeRequest(
                                category = if (category.isEmpty()) "General" else category,
                                question = currentProblem.question,
                                correct_answer = currentProblem.correctAnswer,
                                options = currentProblem.options,
                                explanation = currentProblem.explanation
                            )
                        )
                    } catch (e: Exception) {
                        Log.e("SoloGame", "Failed to add mistake: ${e.message}")
                    }
                }
            }
        }
    }

    // Determine current exercise type
    val currentExerciseType = remember(currentProblemIdx, gameMode, currentProblem) {
        if (gameMode == "level") {
            when (currentProblemIdx) {
                0 -> ExerciseType.MCQ
                1 -> ExerciseType.TYPED
                else -> ExerciseType.TIMED
            }
        } else {
            if (currentProblem.options.isEmpty()) {
                ExerciseType.TYPED
            } else {
                ExerciseType.MCQ
            }
        }
    }

    // Single source of truth for "did the learner answer the current problem correctly?" — this
    // exact branch was previously inlined three times (card border, feedback banner, typed-submit),
    // see AUDIT #3. TYPED compares the trimmed typed value case-insensitively; MCQ/TIMED compare the
    // tapped option to the answer.
    fun isCurrentAnswerCorrect(): Boolean = if (currentExerciseType == ExerciseType.TYPED) {
        typedInput.trim().equals(currentProblem.correctAnswer.trim(), ignoreCase = true)
    } else {
        selectedAnswer == currentProblem.correctAnswer
    }

    // Tapped from the feedback banner's primary button. On the last exercise it computes rewards,
    // persists the session (SRS + completeSession) and flips to the recap; otherwise it advances to
    // the next exercise and resets per-question state. Hoisted out of the button's onClick so the
    // gameplay UI can be extracted with this as a single callback (it owns ~15 reward/session vars).
    fun continueOrFinish(isLast: Boolean) {
        if (isLast) {
            isSavingSession = true
            val baseXP = solvedCount * 20
            val baseCoins = solvedCount * 5

            if (gameMode == "daily_puzzle") {
                xpReward = 50
                coinReward = 30
            } else if (gameMode == "transfer_challenge") {
                xpReward = 30
                coinReward = 15
            } else if (gameMode == "mistakes_practice") {
                xpReward = solvedCount * 15
                coinReward = solvedCount * 10
            } else {
                xpReward = baseXP
                coinReward = baseCoins
            }

            // Calculate Bonuses
            if (gameMode == "level") {
                if (correctFirstTryCount == problemsList.size) {
                    comboBonusGained = 15
                }
                if (currentExerciseType == ExerciseType.TIMED && timeLeft > 0f && !answeredWrongForCurrent) {
                    speedBonusGained = timeLeft.toInt()
                }
            }

            scope.launch(Dispatchers.IO) {
                try {
                    val token = RetrofitClient.authToken ?: ""

                    if (gameMode == "level") {
                        val calculatedQuality = if (problemsList.isNotEmpty()) {
                            (solvedCount * 5) / problemsList.size
                        } else {
                            0
                        }
                        try {
                            RetrofitClient.apiService.submitSrsReview(
                                token, SrsReviewRequest(topic = "${category}_${level}", quality = calculatedQuality)
                            )
                        } catch (e: Exception) {
                            Log.e("SoloGame", "SRS submission failed: ${e.message}")
                        }
                    }

                    if (gameMode == "level" || gameMode == "archive_puzzle" || gameMode == "legacy_puzzle" || gameMode == "daily_puzzle" || gameMode == "transfer_challenge") {
                        val saveRes = RetrofitClient.apiService.completeSession(
                            token, CompleteSessionRequest(
                                xpGained = xpReward,
                                coinsGained = coinReward,
                                solvedCount = solvedCount,
                                category = category,
                                level = if (gameMode == "level") level else null,
                                errorsCount = errorsCount,
                                speedBonus = speedBonusGained,
                                comboBonus = comboBonusGained,
                                gameMode = gameMode,
                                totalTime = ((System.currentTimeMillis() - sessionStartTime) / 1000).toInt()
                            )
                        )

                        withContext(Dispatchers.Main) {
                            levelUpOccurred = saveRes.levelUp
                            xpReward = saveRes.xpGained ?: xpReward
                            coinReward = saveRes.coinsGained ?: coinReward
                            streakBonusActive = saveRes.streakBonusActive ?: false
                            criticalBonusActive = saveRes.criticalBonusActive ?: false
                            userXP = saveRes.xp
                            userLevel = saveRes.level
                            userCoins = saveRes.coins
                            userRank = saveRes.rank

                            if (levelUpOccurred) {
                                SoundManager.playLevelUp()
                                com.example.numera.haptic.HapticManager.playMajorReward()
                            } else {
                                SoundManager.playRewardClaim()
                                com.example.numera.haptic.HapticManager.playMajorReward()
                            }
                        }
                    }
                    withContext(Dispatchers.Main) {
                        isGameOver = true
                        isSavingSession = false
                    }
                } catch (e: Exception) {
                    Log.e("SoloGame", "Failed to submit session: ${e.message}")
                    withContext(Dispatchers.Main) {
                        isGameOver = true
                        isSavingSession = false
                    }
                }
            }
        } else {
            // Proceed to next question
            currentProblemIdx++
            hasAnswered = false
            selectedAnswer = ""
            typedInput = ""
            activeExplanation = null
            answeredWrongForCurrent = false
            showWhiteboard = false
        }
    }

    LaunchedEffect(errorsCount) {
        if (gameMode == "level") {
            val currentHearts = (3 - errorsCount).coerceAtLeast(0)
            heartsLeft = currentHearts
            if (currentHearts <= 0) {
                showRetryDialogPrompt = true
            }
        }
    }

    // Countdown Timer for Timed Challenge
    LaunchedEffect(currentProblemIdx, hasAnswered, isGameOver) {
        if (currentExerciseType == ExerciseType.TIMED && !hasAnswered && !isGameOver) {
            timeLeft = 20f
            while (timeLeft > 0f && !hasAnswered && !isGameOver) {
                delay(100)
                timeLeft -= 0.1f
                
                // Tick sound synthesis under 5 seconds
                if (timeLeft <= 5.1f && timeLeft > 0f) {
                    val sec = timeLeft.toInt()
                    val prevSec = (timeLeft + 0.1f).toInt()
                    if (sec != prevSec) {
                        SoundManager.playTick()
                        // Calm experience timer tension: final 3 seconds
                        if (timeLeft <= 3.1f) {
                            val intensity = (3.0f - timeLeft) / 3.0f
                            com.example.numera.haptic.HapticManager.playTickTension(intensity.coerceIn(0f, 1f))
                        }
                    }
                }
            }
            if (timeLeft <= 0f && !hasAnswered) {
                timeLeft = 0f
                hasAnswered = true
                selectedAnswer = ""
                SoundManager.playWrong()
                com.example.numera.haptic.HapticManager.playError()
                errorsCount++
                activeExplanation = "Time's up! Let's review the solution."
                correctStreak = 0
                shakeTrigger++
            }
        }
    }

    // Review Solution Detailed Modal
    if (showReviewDialog) {
        ReviewSolutionDialog(
            problem = currentProblem,
            onRetry = {
                showReviewDialog = false
                hasAnswered = false
                selectedAnswer = ""
                typedInput = ""
                activeExplanation = null
                if (currentExerciseType == ExerciseType.TIMED) {
                    timeLeft = 20f
                }
            },
            onDismiss = { showReviewDialog = false },
        )
    }

    VictoryParticles(trigger = showParticles) {
        showParticles = false
    }

    if (isGameOver) {
        RecapScreen(
            level = level,
            gameMode = gameMode,
            userLevel = userLevel,
            userXP = userXP,
            userRank = userRank,
            currentStreakDays = currentStreakDays,
            xpReward = xpReward,
            coinReward = coinReward,
            levelUpOccurred = levelUpOccurred,
            problemsList = problemsList,
            correctFirstTryCount = correctFirstTryCount,
            speedBonusGained = speedBonusGained,
            comboBonusGained = comboBonusGained,
            streakBonusActive = streakBonusActive,
            criticalBonusActive = criticalBonusActive,
            onFinishGame = onFinishGame,
        )
        return
    }

    // Main Gameplay Screen
    GameplayScreen(
        category = category,
        level = level,
        isLegacyPuzzle = isLegacyPuzzle,
        gameMode = gameMode,
        currentProblem = currentProblem,
        currentProblemIdx = currentProblemIdx,
        problemsList = problemsList,
        currentExerciseType = currentExerciseType,
        lessonTitle = lessonTitle,
        lessonContent = lessonContent,
        lessonFormula = lessonFormula,
        totalTime = totalTime,
        timeLeft = timeLeft,
        heartsLeft = heartsLeft,
        shakeOffset = shakeOffset,
        isSavingSession = isSavingSession,
        gamePrefs = gamePrefs,
        scope = scope,
        hasAnsweredState = hasAnsweredState,
        selectedAnswerState = selectedAnswerState,
        typedInputState = typedInputState,
        activeExplanationState = activeExplanationState,
        answeredWrongForCurrentState = answeredWrongForCurrentState,
        showReferenceState = showReferenceState,
        showSaveDialogState = showSaveDialogState,
        showFavoriteTooltipState = showFavoriteTooltipState,
        showScratchpadPromptState = showScratchpadPromptState,
        showWhiteboardState = showWhiteboardState,
        showCalculatorState = showCalculatorState,
        showTipState = showTipState,
        showReviewDialogState = showReviewDialogState,
        favoritedQuestionsState = favoritedQuestionsState,
        whiteboardStrokes = whiteboardStrokes,
        whiteboardRedoStrokes = whiteboardRedoStrokes,
        calculatorInputState = calculatorInputState,
        calculatorResultState = calculatorResultState,
        calculatorMemoryState = calculatorMemoryState,
        calculatorHistoryState = calculatorHistoryState,
        calcIsErrorState = calcIsErrorState,
        handleAnswer = { handleAnswer(it) },
        isCurrentAnswerCorrect = { isCurrentAnswerCorrect() },
        continueOrFinish = { continueOrFinish(it) },
        logCalculatorTelemetry = { logCalculatorTelemetry(it) },
    )

    if (showRetryDialogPrompt) {
        OutOfHeartsDialog(
            retryTokensLeft = retryTokensLeft,
            onUseRetryToken = {
                scope.launch(Dispatchers.IO) {
                    try {
                        val token = RetrofitClient.authToken ?: ""
                        RetrofitClient.apiService.consumeRetryToken(token)
                        withContext(Dispatchers.Main) {
                            retryTokensLeft -= 1
                            errorsCount = 0
                            heartsLeft = 3
                            showRetryDialogPrompt = false
                        }
                    } catch (e: Exception) {
                        Log.e("SoloGame", "Failed to consume retry token: ${e.message}")
                    }
                }
            },
            onExit = {
                showRetryDialogPrompt = false
                onFinishGame()
            },
        )
    }
}

