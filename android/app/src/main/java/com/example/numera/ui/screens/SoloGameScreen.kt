package com.example.numera.ui.screens

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
    var showFavoriteTooltip by remember {
        mutableStateOf(!gamePrefs.getBoolean("dismissed_favorite_tooltip", false))
    }

    var problemsList by remember { mutableStateOf<List<MathProblem>>(emptyList()) }
    var mistakeIdsList by remember { mutableStateOf<List<Int>>(emptyList()) }
    var currentProblemIdx by remember { mutableIntStateOf(0) }
    var score by remember { mutableIntStateOf(0) }
    
    var solvedCount by remember { mutableIntStateOf(0) }
    var correctStreak by remember { mutableIntStateOf(0) }
    var activeExplanation by remember { mutableStateOf<String?>(null) }
    var hasAnswered by remember { mutableStateOf(false) }
    var selectedAnswer by remember { mutableStateOf("") }
    
    var showParticles by remember { mutableStateOf(false) }
    var isGameOver by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(true) }
    
    var xpReward by remember { mutableIntStateOf(0) }
    var coinReward by remember { mutableIntStateOf(0) }
    var levelUpOccurred by remember { mutableStateOf(false) }
    var isSavingSession by remember { mutableStateOf(false) }

    var lessonTitle by remember { mutableStateOf<String?>(null) }
    var lessonContent by remember { mutableStateOf<String?>(null) }
    var lessonFormula by remember { mutableStateOf<String?>(null) }
    var examplesList by remember { mutableStateOf<List<MathExample>>(emptyList()) }
    var showLesson by remember { mutableStateOf(false) }
    
    var errorsCount by remember { mutableIntStateOf(0) }
    var heartsLeft by remember { mutableIntStateOf(3) }
    var retryTokensLeft by remember { mutableIntStateOf(0) }
    var showRetryDialogPrompt by remember { mutableStateOf(false) }
    var streakBonusActive by remember { mutableStateOf(false) }
    var criticalBonusActive by remember { mutableStateOf(false) }

    // New Game feel & Loop states
    var typedInput by remember { mutableStateOf("") }
    var timeLeft by remember { mutableFloatStateOf(20f) }
    val totalTime = 20f

    var answeredWrongForCurrent by remember { mutableStateOf(false) }
    var correctFirstTryCount by remember { mutableIntStateOf(0) }
    var perfectStreakCount by remember { mutableIntStateOf(0) }
    var maxPerfectStreak by remember { mutableIntStateOf(0) }

    var shakeTrigger by remember { mutableIntStateOf(0) }
    val shakeOffset by animateDpAsState(
        targetValue = if (shakeTrigger % 2 == 1) 10.dp else 0.dp,
        animationSpec = keyframes {
            durationMillis = 300
            0.dp at 0
            (-10).dp at 50
            10.dp at 100
            (-8).dp at 150
            8.dp at 200
            (-4).dp at 250
            0.dp at 300
        },
        label = "shake"
    )

    var showReviewDialog by remember { mutableStateOf(false) }

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
    var showWhiteboard by remember { mutableStateOf(false) }
    
    // Calculator states
    var showCalculator by remember { mutableStateOf(false) }
    var calculatorInput by remember { mutableStateOf("") }
    var calculatorResult by remember { mutableStateOf("") }
    
    // Tip states
    var showTip by remember { mutableStateOf(false) }
    
    val whiteboardStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    val whiteboardRedoStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    
    var showScratchpadPrompt by remember { mutableStateOf(false) }
    var timeSpentOnQuestion by remember { mutableIntStateOf(0) }
    var favoritedQuestions by remember { mutableStateOf<Set<String>>(emptySet()) }

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

    LaunchedEffect(Unit) {
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                
                try {
                    val favs = RetrofitClient.apiService.getFavorites(token)
                    withContext(Dispatchers.Main) {
                        favoritedQuestions = favs.map { it.question }.toSet()
                    }
                } catch (e: Exception) {
                    Log.e("SoloGame", "Failed to load favorites: ${e.message}")
                }
                
                // Fetch profile to get initial streak & stats
                try {
                    val profile = RetrofitClient.apiService.getProfile(token)
                    withContext(Dispatchers.Main) {
                        currentStreakDays = profile.streak
                        userRank = profile.rank
                        userLevel = profile.level
                        userXP = profile.xp
                        userCoins = profile.coins
                    }
                } catch (e: Exception) {
                    Log.e("SoloGame", "Failed to load user profile: ${e.message}")
                }

                // Fetch retry tokens from shop utilities
                try {
                    val shop = RetrofitClient.apiService.getShop(token)
                    val retryTokenUtility = shop.utilities?.find { it.item_id == "item_retry_token" }
                    withContext(Dispatchers.Main) {
                        retryTokensLeft = retryTokenUtility?.quantity ?: 0
                    }
                } catch (e: Exception) {
                    Log.e("SoloGame", "Failed to load shop utilities: ${e.message}")
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
                            val targetLevel = if (match.stars > 0) match.stars * 6 else 18
                            try {
                                val response = RetrofitClient.apiService.getProblems(token, match.category, targetLevel, count = 1)
                                withContext(Dispatchers.Main) {
                                    lessonTitle = response.lessonTitle
                                    lessonContent = response.lessonContent
                                    lessonFormula = response.lessonFormula
                                    examplesList = response.examples ?: emptyList()
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
                                examplesList = examples ?: emptyList()
                                showLesson = true
                            }
                        } else {
                            val targetLevel = if (puzzle.stars != null && puzzle.stars > 0) puzzle.stars * 6 else 18
                            try {
                                val response = RetrofitClient.apiService.getProblems(token, puzzle.category ?: "arithmetic", targetLevel, count = 1)
                                withContext(Dispatchers.Main) {
                                    lessonTitle = response.lessonTitle
                                    lessonContent = response.lessonContent
                                    lessonFormula = response.lessonFormula
                                    examplesList = response.examples ?: emptyList()
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
                                        examplesList = response.examples ?: emptyList()
                                        showLesson = !response.lessonTitle.isNullOrEmpty()
                                    }
                                } catch (e: Exception) {
                                    Log.e("SoloGame", "Failed to load lesson for archive puzzle: ${e.message}")
                                }
                            }
                        }
                    }
                    else -> { // "level"
                        val response = RetrofitClient.apiService.getProblems(token, category, level, count = 3)
                        problemsList = response.problems.take(3)
                        withContext(Dispatchers.Main) {
                            lessonTitle = response.lessonTitle
                            lessonContent = response.lessonContent
                            lessonFormula = response.lessonFormula
                            examplesList = response.examples ?: emptyList()
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
        Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("Error loading mathematical exercise set.", color = MaterialTheme.colorScheme.onBackground)
                DuoButton(onClick = onFinishGame, text = "Go Back")
            }
        }
        return
    }

    if (showLesson && lessonTitle != null) {
        val isMilestone = (level > 0) && (level % 10 == 0)
        
        val primaryColor = if (isMilestone) Color(0xFFD4AF37) else MaterialTheme.colorScheme.primary
        val bgColor = if (isMilestone) Color(0xFFFFFDF0) else MaterialTheme.colorScheme.background
        val cardBgColor = if (isMilestone) Color(0xFFFFF9DF) else MaterialTheme.colorScheme.surfaceVariant
        val borderColor = if (isMilestone) Color(0xFFE6CA65) else MaterialTheme.colorScheme.outline
        val onSurfaceColor = if (isMilestone) Color(0xFF4C3E08) else MaterialTheme.colorScheme.onBackground
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
                .padding(16.dp)
        ) {
            Text(
                text = if (isMilestone) "🌟 MILESTONE THEOREM" else "LESSON",
                color = primaryColor,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = lessonTitle ?: "",
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                color = onSurfaceColor,
                lineHeight = 32.sp
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (!lessonContent.isNullOrEmpty()) {
                    if (lessonContent!!.contains("$") || lessonContent!!.contains("\\")) {
                        MathText(
                            text = lessonContent!!,
                            fontSizePx = 36,
                            color = onSurfaceColor.copy(alpha = 0.85f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text(
                            text = lessonContent!!,
                            fontSize = 16.sp,
                            color = onSurfaceColor.copy(alpha = 0.85f),
                            lineHeight = 24.sp
                        )
                    }
                }
                
                if (!lessonFormula.isNullOrEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(cardBgColor)
                            .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
                            .padding(16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "CORE FORMULA / CONCEPT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = primaryColor,
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            val formulaText = if (!lessonFormula!!.contains("$") && !lessonFormula!!.contains("\\(") && !lessonFormula!!.contains("\\[")) {
                                "$$${lessonFormula!!}$$"
                            } else {
                                lessonFormula!!
                            }
                            MathText(
                                text = formulaText,
                                fontSizePx = 42,
                                color = onSurfaceColor,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
                
                if (examplesList.isNotEmpty()) {
                    Text(
                        text = "WORKED EXAMPLES",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor,
                        letterSpacing = 0.5.sp
                    )
                    
                    examplesList.forEachIndexed { index, ex ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.5.dp, borderColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "Example ${index + 1}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = primaryColor
                            )
                            
                            if (ex.question.contains("$") || ex.question.contains("\\")) {
                                MathText(text = ex.question, fontSizePx = 32, color = onSurfaceColor)
                            } else {
                                Text(text = ex.question, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = onSurfaceColor)
                            }
                            
                            Text(
                                text = "Answer: ${ex.answer}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = CorrectGreen
                            )
                            
                            if (ex.explanation.isNotEmpty()) {
                                Divider(color = borderColor.copy(alpha = 0.3f))
                                if (ex.explanation.contains("$") || ex.explanation.contains("\\")) {
                                    MathText(text = ex.explanation, fontSizePx = 28, color = onSurfaceColor.copy(alpha = 0.7f))
                                } else {
                                    Text(text = ex.explanation, fontSize = 13.sp, color = onSurfaceColor.copy(alpha = 0.7f))
                                }
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            DuoButton(
                text = "Start Exercises",
                onClick = {
                    showLesson = false
                    SoundManager.playClick()
                },
                modifier = Modifier.fillMaxWidth(),
                color = primaryColor
            )
        }
        return
    }

    val currentProblem = problemsList[currentProblemIdx]

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
        AlertDialog(
            onDismissRequest = { showReviewDialog = false },
            title = {
                Text(
                    text = "💡 SOLUTION BREAKDOWN",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.primary
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.verticalScroll(rememberScrollState())
                ) {
                    Text("Let's analyze the correct logic:", fontWeight = FontWeight.Bold)
                    
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.05f))
                            .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text("Question:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            if (currentProblem.question.contains("$") || currentProblem.question.contains("\\")) {
                                MathText(text = currentProblem.question, fontSizePx = 30, color = MaterialTheme.colorScheme.onSurface)
                            } else {
                                Text(text = currentProblem.question, fontWeight = FontWeight.Bold)
                            }
                            
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("Correct Answer:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text(text = currentProblem.correctAnswer, fontWeight = FontWeight.ExtraBold, color = CorrectGreen)
                        }
                    }

                    if (!currentProblem.explanation.isNullOrEmpty()) {
                        Text("Explanation:", fontWeight = FontWeight.Bold)
                        if (currentProblem.explanation.contains("$") || currentProblem.explanation.contains("\\")) {
                            MathText(text = currentProblem.explanation, fontSizePx = 28, color = MaterialTheme.colorScheme.onSurface)
                        } else {
                            Text(text = currentProblem.explanation, fontSize = 14.sp)
                        }
                    } else {
                        Text("Work step-by-step to isolate the variables and evaluate the expression.", fontSize = 14.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("💡 Tip: Retry the question to lock in the logic!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            },
            confirmButton = {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    DuoButton(
                        text = "Retry Exercise",
                        onClick = {
                            showReviewDialog = false
                            hasAnswered = false
                            selectedAnswer = ""
                            typedInput = ""
                            activeExplanation = null
                            if (currentExerciseType == ExerciseType.TIMED) {
                                timeLeft = 20f
                            }
                        },
                        modifier = Modifier.weight(1f),
                        color = CorrectGreen
                    )
                    DuoButton(
                        text = "Close",
                        onClick = { showReviewDialog = false },
                        modifier = Modifier.weight(0.8f),
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        )
    }

    VictoryParticles(trigger = showParticles) {
        showParticles = false
    }

    if (isGameOver) {
        val isMilestone = (level > 0) && (level % 10 == 0)
        val bgColor = if (isMilestone) Color(0xFFFFFDF0) else MaterialTheme.colorScheme.background
        val cardOutlineColor = if (isMilestone) Color(0xFFE6CA65) else MaterialTheme.colorScheme.outline
        val primaryColor = if (isMilestone) Color(0xFFD4AF37) else MaterialTheme.colorScheme.primary

        var statsCardVisible by remember { mutableStateOf(false) }
        var levelCardVisible by remember { mutableStateOf(false) }
        var badgeCardVisible by remember { mutableStateOf(false) }
        var multipliersVisible by remember { mutableStateOf(false) }
        var animateProgressBar by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            delay(150)
            statsCardVisible = true
            delay(250)
            levelCardVisible = true
            animateProgressBar = true
            delay(250)
            badgeCardVisible = true
            delay(250)
            multipliersVisible = true
        }

        val nextLevelXP = userLevel * 100
        val progressFractionTarget = (userXP.toFloat() / nextLevelXP).coerceIn(0f, 1f)
        val progressFractionAnim by animateFloatAsState(
            targetValue = if (animateProgressBar) progressFractionTarget else 0f,
            animationSpec = tween(durationMillis = 1500, easing = EaseOutCubic),
            label = "progressRecap"
        )
        
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth(0.95f)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = if (isMilestone) "🏆 MILESTONE MASTERED" else "LEVEL RECAP",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Black,
                    color = primaryColor
                )

                Text(
                    text = if (levelUpOccurred) "🎉 LEVEL UP!" else if (isMilestone) "Theorem Documented!" else "Session Complete!",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isMilestone) Color(0xFFD4AF37) else CorrectGreen
                )

                // Stats Dashboard Grid
                AnimatedVisibility(
                    visible = statsCardVisible,
                    enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                    exit = fadeOut()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(24.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                            .border(1.5.dp, cardOutlineColor, RoundedCornerShape(24.dp))
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("XP Earned", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                Text("+$xpReward XP", fontWeight = FontWeight.Black, fontSize = 20.sp, color = primaryColor)
                            }
                            Column {
                                Text("Coins Earned", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                Text("+$coinReward 🪙", fontWeight = FontWeight.Black, fontSize = 20.sp, color = MaterialTheme.colorScheme.tertiary)
                            }
                            Column {
                                Text("Accuracy", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                val acc = if (problemsList.isNotEmpty()) (correctFirstTryCount * 100) / problemsList.size else 100
                                Text("$acc%", fontWeight = FontWeight.Black, fontSize = 20.sp, color = CorrectGreen)
                            }
                        }

                        Divider(color = cardOutlineColor.copy(alpha = 0.3f))

                        // Speed & Combo Bonuses
                        if (gameMode == "level") {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Speed Bonus", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                    Text(if (speedBonusGained > 0) "+$speedBonusGained XP ⏱️" else "0 XP", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DuoSecondary)
                                }
                                Column {
                                    Text("Perfect Combo", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                    Text(if (comboBonusGained > 0) "+$comboBonusGained XP ⚡" else "0 XP", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DuoTertiary)
                                }
                            }
                        }

                        // Streak
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text("✨ Consistency Climb:", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                            Text("$currentStreakDays Days", fontWeight = FontWeight.Bold, color = DuoTertiary)
                        }
                    }
                }

                // Level Progress Info
                AnimatedVisibility(
                    visible = levelCardVisible,
                    enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                    exit = fadeOut()
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("Level $userLevel", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("$userXP / $nextLevelXP XP", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        
                        Spacer(modifier = Modifier.height(6.dp))
                        
                        LinearProgressIndicator(
                            progress = progressFractionAnim,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(12.dp)
                                .clip(RoundedCornerShape(6.dp)),
                            color = primaryColor,
                            trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                        )
                    }
                }

                // Rank Medal Card
                AnimatedVisibility(
                    visible = badgeCardVisible,
                    enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                    exit = fadeOut()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(primaryColor.copy(alpha = 0.05f))
                            .border(1.dp, primaryColor.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        RankBadge(rankName = userRank, modifier = Modifier.size(54.dp))
                        Column {
                            Text("Current Rating Medal", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text(userRank, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = primaryColor)
                        }
                    }
                }

                // Multiplier highlights
                AnimatedVisibility(
                    visible = multipliersVisible && (streakBonusActive || criticalBonusActive || isMilestone),
                    enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                    exit = fadeOut()
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(primaryColor.copy(alpha = 0.05f))
                            .border(1.dp, primaryColor.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                            .padding(8.dp)
                    ) {
                        if (isMilestone) {
                            Text("🏅 Milestone Theorem 2.0x Multiplier Applied!", color = primaryColor, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        if (streakBonusActive) {
                            Text("✨ Consistency 1.5x XP Multiplier Active!", color = DuoSecondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        if (criticalBonusActive) {
                            Text("✨ 10% Critical Double Coins Triggered!", color = DuoTertiary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                DuoButton(
                    text = "Continue",
                    onClick = {
                        RetrofitClient.triggerProfileRefresh()
                        onFinishGame()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    color = primaryColor
                )
            }
        }
        return
    }

    // Main Gameplay Screen
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(16.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
        // Progress header
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
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

                Text(
                    text = "Exercise ${currentProblemIdx + 1} of ${problemsList.size}",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )
            }

            // Exercise Mode Label & Countdown
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val modeLabel = when (currentExerciseType) {
                    ExerciseType.MCQ -> "Warmup MCQ"
                    ExerciseType.TYPED -> "Typed Focus"
                    ExerciseType.TIMED -> "Timed Challenge ⚡"
                }
                
                Text(
                    text = modeLabel,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 12.sp
                )

                if (gameMode == "level") {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
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
                .weight(1f)
                .padding(vertical = 12.dp)
                .offset(x = shakeOffset)
        ) {
            DuoCard(
                modifier = Modifier.fillMaxSize(),
                borderColor = if (hasAnswered) {
                    val correct = if (currentExerciseType == ExerciseType.TYPED) {
                        typedInput.trim().equals(currentProblem.correctAnswer.trim(), ignoreCase = true)
                    } else {
                        selectedAnswer == currentProblem.correctAnswer
                    }
                    if (correct) CorrectGreen else WrongRed
                } else {
                    MaterialTheme.colorScheme.outline
                }
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
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
                            fontSize = if (isLegacyPuzzle) 16.sp else 26.sp,
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
                                    title = if (isLegacyPuzzle) "Archive Exercise" else "Level $level Exercise",
                                    category = category,
                                    question = currentProblem.question,
                                    correct_answer = currentProblem.correctAnswer,
                                    options = currentProblem.options,
                                    explanation = currentProblem.explanation
                                )
                            )
                        } catch (e: Exception) {
                            Log.e("SoloGame", "Failed to toggle favorite: ${e.message}")
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

            if (showFavoriteTooltip) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 48.dp, end = 12.dp)
                        .width(200.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                        .border(1.dp, MaterialTheme.colorScheme.secondary, RoundedCornerShape(8.dp))
                        .padding(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
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
                            modifier = Modifier.size(16.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Clear,
                                contentDescription = "Close",
                                modifier = Modifier.size(12.dp),
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
                        .padding(12.dp)
                ) {
                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(4.dp)
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
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Tip Button
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.secondaryContainer)
                                    .border(BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f)), shape = RoundedCornerShape(12.dp))
                                    .clickable {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showCalculator = false
                                        showWhiteboard = false
                                        showTip = true
                                    }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Tip,
                                        tint = MaterialTheme.colorScheme.onSecondaryContainer,
                                        modifier = Modifier.size(16.dp),
                                        animate = false
                                    )
                                    Text(
                                        text = "TIP",
                                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            // Calculator Button
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(MaterialTheme.colorScheme.tertiaryContainer)
                                    .border(BorderStroke(1.dp, MaterialTheme.colorScheme.tertiary.copy(alpha = 0.3f)), shape = RoundedCornerShape(12.dp))
                                    .clickable {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showTip = false
                                        showWhiteboard = false
                                        showCalculator = true
                                        logCalculatorTelemetry(null)
                                    }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Calculator,
                                        tint = MaterialTheme.colorScheme.onTertiaryContainer,
                                        modifier = Modifier.size(16.dp),
                                        animate = false
                                    )
                                    Text(
                                        text = "CALC",
                                        color = MaterialTheme.colorScheme.onTertiaryContainer,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
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
                                    .clickable {
                                        com.example.numera.haptic.HapticManager.playSoft()
                                        showTip = false
                                        showCalculator = false
                                        showWhiteboard = true
                                        showScratchpadPrompt = false
                                    }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Scratchpad,
                                        tint = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(16.dp),
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

        // Answer Interface using slide transition
        AnimatedContent(
            targetState = currentProblemIdx,
            transitionSpec = {
                slideInHorizontally { width -> width } + fadeIn() togetherWith
                        slideOutHorizontally { width -> -width } + fadeOut()
            },
            label = "problem_transition"
        ) { targetIdx ->
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (currentExerciseType == ExerciseType.TYPED) {
                    // Typed answer layout
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                        val correct = typedInput.trim().equals(currentProblem.correctAnswer.trim(), ignoreCase = true)
                                        if (correct) {
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
                                }
                            )
                        )

                        if (!hasAnswered) {
                            DuoButton(
                                text = "Check Answer",
                                enabled = typedInput.trim().isNotEmpty(),
                                onClick = {
                                    hasAnswered = true
                                    val correct = typedInput.trim().equals(currentProblem.correctAnswer.trim(), ignoreCase = true)
                                    if (correct) {
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
                            val isCorrect = currentProblem.correctAnswer == option
                            
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
                                                    if (option == currentProblem.correctAnswer) {
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
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Mistake Banner sliding sheet
        AnimatedVisibility(
            visible = hasAnswered,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.fillMaxWidth()
        ) {
            val correct = if (currentExerciseType == ExerciseType.TYPED) {
                typedInput.trim().equals(currentProblem.correctAnswer.trim(), ignoreCase = true)
            } else {
                selectedAnswer == currentProblem.correctAnswer
            }

            val isLast = currentProblemIdx >= problemsList.size - 1

            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
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
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (correct) "✨ EXCELLENT JOB!" else "💡 NOT QUITE RIGHT",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = if (correct) CorrectGreen else WrongRed,
                            letterSpacing = 1.sp
                        )

                        if (!correct) {
                            Text(
                                text = "Correct: ${currentProblem.correctAnswer}",
                                fontWeight = FontWeight.Bold,
                                color = CorrectGreen,
                                fontSize = 13.sp
                            )
                        }
                    }

                    // Encouraging microcopy when wrong
                    if (!correct) {
                        val encouragement = when (currentProblemIdx) {
                            0 -> "Mistakes are proof that you're trying!"
                            1 -> "Let's analyze and perfect the steps."
                            else -> "You're getting closer every time!"
                        }
                        Text(
                            text = encouragement,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.8f)
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        if (!correct) {
                            // "Review Solution" option
                            DuoButton(
                                text = "Review Solution",
                                onClick = { showReviewDialog = true },
                                modifier = Modifier.weight(1f),
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }

                        // "Continue" option (either next question or finish game)
                        DuoButton(
                            text = if (isSavingSession) "Saving..." else (if (isLast) "Finish Game" else "Continue"),
                            enabled = !isSavingSession,
                            onClick = {
                                if (isLast) {
                                    isSavingSession = true
                                    val baseXP = solvedCount * 20
                                    val baseCoins = solvedCount * 5
                                    
                                    if (gameMode == "daily_puzzle") {
                                        xpReward = 50
                                        coinReward = 30
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

                                            if (gameMode == "level" || gameMode == "archive_puzzle" || gameMode == "legacy_puzzle" || gameMode == "daily_puzzle") {
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
                            },
                            modifier = Modifier.weight(1f),
                            color = if (correct) CorrectGreen else MaterialTheme.colorScheme.primary
                        )
                    }
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

        // Slide-up calculator overlay
        AnimatedVisibility(
            visible = showCalculator,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f)
                    .clickable(enabled = false) {}
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "🧮 Calculator",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        IconButton(onClick = { showCalculator = false }) {
                            Icon(Icons.Default.Clear, contentDescription = "Close")
                        }
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(72.dp)
                            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f), RoundedCornerShape(12.dp)),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalArrangement = Arrangement.Center,
                            horizontalAlignment = Alignment.End
                        ) {
                            Text(
                                text = calculatorInput.ifEmpty { "0" },
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1
                            )
                            if (calculatorResult.isNotEmpty()) {
                                Text(
                                    text = "= $calculatorResult",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.secondary,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    val keys = listOf(
                        listOf("C", "(", ")", "⌫"),
                        listOf("7", "8", "9", "/"),
                        listOf("4", "5", "6", "*"),
                        listOf("1", "2", "3", "-"),
                        listOf("0", ".", "π", "+"),
                        listOf("e", "sqrt(", "=", "=")
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        keys.forEach { row ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                var skipNext = false
                                row.forEachIndexed { colIdx, key ->
                                    if (skipNext) {
                                        skipNext = false
                                        return@forEachIndexed
                                    }
                                    
                                    val isEquals = key == "="
                                    val isDouble = isEquals && colIdx < row.size - 1 && row[colIdx + 1] == "="
                                    
                                    val weight = if (isDouble) 2f else 1f
                                    if (isDouble) skipNext = true
                                    
                                    val containerColor = when (key) {
                                        "C" -> WrongRed.copy(alpha = 0.15f)
                                        "⌫" -> MaterialTheme.colorScheme.secondaryContainer
                                        "=", "+", "-", "*", "/" -> MaterialTheme.colorScheme.primaryContainer
                                        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                    }
                                    val contentColor = when (key) {
                                        "C" -> WrongRed
                                        "=", "+", "-", "*", "/" -> MaterialTheme.colorScheme.onPrimaryContainer
                                        else -> MaterialTheme.colorScheme.onSurfaceVariant
                                    }
                                    
                                    Box(
                                        modifier = Modifier
                                            .weight(weight)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(containerColor)
                                            .clickable {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                when (key) {
                                                    "C" -> {
                                                        calculatorInput = ""
                                                        calculatorResult = ""
                                                    }
                                                    "⌫" -> {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            calculatorInput = calculatorInput.dropLast(1)
                                                        }
                                                    }
                                                    "=" -> {
                                                        try {
                                                            if (calculatorInput.isNotEmpty()) {
                                                                val res = evaluateExpression(calculatorInput)
                                                                calculatorResult = if (res % 1.0 == 0.0) res.toInt().toString() else String.format("%.4f", res)
                                                                if (Math.abs(res - 67.0) < 1e-9) {
                                                                    logCalculatorTelemetry("67")
                                                                } else {
                                                                    logCalculatorTelemetry(calculatorInput)
                                                                }
                                                            }
                                                        } catch (e: Exception) {
                                                            calculatorResult = "Error"
                                                        }
                                                    }
                                                    else -> {
                                                        calculatorInput += key
                                                    }
                                                }
                                                
                                                if (key != "=" && key != "C") {
                                                    try {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            val res = evaluateExpression(calculatorInput)
                                                            calculatorResult = if (res % 1.0 == 0.0) res.toInt().toString() else String.format("%.4f", res)
                                                        } else {
                                                            calculatorResult = ""
                                                        }
                                                    } catch (e: Exception) {
                                                        // ignore invalid expressions mid-typing
                                                    }
                                                }
                                            }
                                            .padding(vertical = 10.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = key,
                                            fontSize = 18.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = contentColor
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Slide-up tip overlay
        AnimatedVisibility(
            visible = showTip,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.55f)
                    .clickable(enabled = false) {}
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                    .background(MaterialTheme.colorScheme.surface),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "💡 Study Tip",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                        IconButton(onClick = { showTip = false }) {
                            Icon(Icons.Default.Clear, contentDescription = "Close")
                        }
                    }

                    if (problemsList.isNotEmpty() && currentProblemIdx < problemsList.size) {
                        val problem = problemsList[currentProblemIdx]
                        val tipText = problem.tip ?: "Focus on the core concepts shown in the lesson."
                        
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
                                .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                                .padding(14.dp)
                        ) {
                            if (tipText.contains("$") || tipText.contains("\\")) {
                                MathText(
                                    text = tipText,
                                    fontSizePx = 36,
                                    color = MaterialTheme.colorScheme.onBackground,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            } else {
                                Text(
                                    text = tipText,
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        problem.tipMetadata?.let { metadata ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(1.dp)
                                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
                            )
                            
                            Text(
                                text = "Metadata Details",
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.secondary
                            )
                            
                            Column(
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                metadata.concept?.let {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("• Concept:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                metadata.subskill?.let {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("• Subskill:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                metadata.difficulty?.let {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("• Difficulty:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                metadata.learningObjective?.let {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("• Objective:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                                metadata.commonMistakes?.let {
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("• Common Pitfall:", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = WrongRed)
                                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)
                                    }
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "No active problem to display tips for.",
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    } // Closes the wrapping Box

    if (showRetryDialogPrompt) {
        AlertDialog(
            onDismissRequest = {},
            title = {
                Text(
                    text = "💔 OUT OF HEARTS",
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = WrongRed
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        text = "You made 3 mistakes and failed the level.",
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "You currently have $retryTokensLeft Retry Tokens in your inventory.",
                        fontSize = 14.sp
                    )
                    if (retryTokensLeft > 0) {
                        Text(
                            text = "Use a Retry Token to restore your hearts and continue playing this level without losing progress!",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    } else {
                        Text(
                            text = "You don't have any Retry Tokens left. You can purchase them in the Shop tab.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            },
            confirmButton = {
                if (retryTokensLeft > 0) {
                    DuoButton(
                        text = "Use Retry Token ($retryTokensLeft left)",
                        onClick = {
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
                        color = CorrectGreen
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showRetryDialogPrompt = false
                        onFinishGame()
                    }
                ) {
                    Text("Exit Level", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            }
        )
    }
}

enum class ExerciseType {
    MCQ, TYPED, TIMED
}

private fun evaluateExpression(expr: String): Double {
    val cleaned = expr.replace(" ", "")
                      .replace("π", "pi")
                      .lowercase()
    
    var pos = -1
    var ch = 0

    fun nextChar() {
        ch = if (++pos < cleaned.length) cleaned[pos].code else -1
    }

    fun eat(charToEat: Int): Boolean {
        while (ch == ' '.code) nextChar()
        if (ch == charToEat) {
            nextChar()
            return true
        }
        return false
    }

    fun parseFactor(): Double {
        if (eat('+'.code)) return parseFactor() // unary plus
        if (eat('-'.code)) return -parseFactor() // unary minus

        var x: Double
        val startPos = pos
        if (eat('('.code)) { // parentheses
            // Local function to allow recursion inside parseFactor
            fun parseExpr(): Double {
                fun parseTermLocal(): Double {
                    fun parseFactLocal(): Double {
                        if (eat('+'.code)) return parseFactLocal()
                        if (eat('-'.code)) return -parseFactLocal()
                        var xl: Double
                        val startPosL = pos
                        if (eat('('.code)) {
                            xl = parseExpr()
                            eat(')'.code)
                        } else if ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) {
                            while ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) nextChar()
                            xl = cleaned.substring(startPosL, pos).toDouble()
                        } else if (ch >= 'a'.code && ch <= 'z'.code) {
                            while (ch >= 'a'.code && ch <= 'z'.code) nextChar()
                            val str = cleaned.substring(startPosL, pos)
                            if (str == "pi") {
                                xl = Math.PI
                            } else if (str == "e") {
                                xl = Math.E
                            } else if (str == "sqrt") {
                                eat('('.code)
                                xl = Math.sqrt(parseExpr())
                                eat(')'.code)
                            } else {
                                throw RuntimeException("Unknown function/constant: $str")
                            }
                        } else {
                            throw RuntimeException("Unexpected character: " + ch.toChar())
                        }
                        return xl
                    }
                    var xl = parseFactLocal()
                    while (true) {
                        if (eat('*'.code)) xl *= parseFactLocal()
                        else if (eat('/'.code)) xl /= parseFactLocal()
                        else return xl
                    }
                }
                var xl = parseTermLocal()
                while (true) {
                    if (eat('+'.code)) xl += parseTermLocal()
                    else if (eat('-'.code)) xl -= parseTermLocal()
                    else return xl
                }
            }
            x = parseExpr()
            eat(')'.code)
        } else if ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) { // numbers
            while ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) nextChar()
            x = cleaned.substring(startPos, pos).toDouble()
        } else if (ch >= 'a'.code && ch <= 'z'.code) { // functions or constants
            while (ch >= 'a'.code && ch <= 'z'.code) nextChar()
            val str = cleaned.substring(startPos, pos)
            if (str == "pi") {
                x = Math.PI
            } else if (str == "e") {
                x = Math.E
            } else if (str == "sqrt") {
                eat('('.code)
                // Local function to allow recursion inside parseFactor
                fun parseExpr(): Double {
                    fun parseTermLocal(): Double {
                        fun parseFactLocal(): Double {
                            if (eat('+'.code)) return parseFactLocal()
                            if (eat('-'.code)) return -parseFactLocal()
                            var xl: Double
                            val startPosL = pos
                            if (eat('('.code)) {
                                xl = parseExpr()
                                eat(')'.code)
                            } else if ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) {
                                while ((ch >= '0'.code && ch <= '9'.code) || ch == '.'.code) nextChar()
                                xl = cleaned.substring(startPosL, pos).toDouble()
                            } else if (ch >= 'a'.code && ch <= 'z'.code) {
                                while (ch >= 'a'.code && ch <= 'z'.code) nextChar()
                                val str = cleaned.substring(startPosL, pos)
                                if (str == "pi") {
                                    xl = Math.PI
                                } else if (str == "e") {
                                    xl = Math.E
                                } else if (str == "sqrt") {
                                    eat('('.code)
                                    xl = Math.sqrt(parseExpr())
                                    eat(')'.code)
                                } else {
                                    throw RuntimeException("Unknown function/constant: $str")
                                }
                            } else {
                                throw RuntimeException("Unexpected character: " + ch.toChar())
                            }
                            return xl
                        }
                        var xl = parseFactLocal()
                        while (true) {
                            if (eat('*'.code)) xl *= parseFactLocal()
                            else if (eat('/'.code)) xl /= parseFactLocal()
                            else return xl
                        }
                    }
                    var xl = parseTermLocal()
                    while (true) {
                        if (eat('+'.code)) xl += parseTermLocal()
                        else if (eat('-'.code)) xl -= parseTermLocal()
                        else return xl
                    }
                }
                x = Math.sqrt(parseExpr())
                eat(')'.code)
            } else {
                throw RuntimeException("Unknown function/constant: $str")
            }
        } else {
            throw RuntimeException("Unexpected character: " + ch.toChar())
        }

        return x
    }

    fun parseTerm(): Double {
        var x = parseFactor()
        while (true) {
            if (eat('*'.code)) x *= parseFactor() // multiplication
            else if (eat('/'.code)) x /= parseFactor() // division
            else return x
        }
    }

    fun parseExpression(): Double {
        var x = parseTerm()
        while (true) {
            if (eat('+'.code)) x += parseTerm() // addition
            else if (eat('-'.code)) x -= parseTerm() // subtraction
            else return x
        }
    }

    nextChar()
    val res = parseExpression()
    if (pos < cleaned.length) {
        throw RuntimeException("Unexpected character: " + ch.toChar())
    }
    return res
}
