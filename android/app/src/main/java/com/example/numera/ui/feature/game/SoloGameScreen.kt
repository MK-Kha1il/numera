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

// Renders lesson prose that may contain inline LaTeX ($...$) or plain text.
@Composable
private fun LessonProse(text: String, color: Color, mathPx: Int = 28) {
    if (text.contains("$") || text.contains("\\")) {
        MathText(text = text, fontSizePx = mathPx, color = color, modifier = Modifier.fillMaxWidth())
    } else {
        Text(text = text, fontSize = 15.sp, color = color, lineHeight = 22.sp)
    }
}

// A labelled concept-first lesson section (intuition hook, what/why/when, a representation).
@Composable
private fun LessonSectionCard(
    label: String,
    body: String,
    accent: Color,
    onSurface: Color,
    border: Color,
    bg: Color
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(bg)
            .border(1.5.dp, border.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accent, letterSpacing = 0.5.sp)
        LessonProse(body, onSurface.copy(alpha = 0.85f), 28)
    }
}

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
    var lessonSections by remember { mutableStateOf<LessonSections?>(null) }
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

    // Slide-over reference panel — lets the learner peek the concept/formula mid-exercise.
    var showReference by remember { mutableStateOf(false) }

    // Calculator states
    var showCalculator by remember { mutableStateOf(false) }
    var calculatorInput by remember { mutableStateOf("") }
    var calculatorResult by remember { mutableStateOf("") }
    var calculatorMemory by remember { mutableStateOf(0.0) }
    var calculatorHistory by remember { mutableStateOf<List<String>>(emptyList()) }
    var calcIsError by remember { mutableStateOf(false) }
    
    // Tip states
    var showTip by remember { mutableStateOf(false) }
    
    val whiteboardStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    val whiteboardRedoStrokes = remember(currentProblemIdx) { mutableStateListOf<com.example.numera.ui.components.ScratchStroke>() }
    
    var showScratchpadPrompt by remember { mutableStateOf(false) }
    var timeSpentOnQuestion by remember { mutableIntStateOf(0) }
    var favoritedQuestions by remember { mutableStateOf<Set<String>>(emptySet()) }
    var showSaveDialog by remember { mutableStateOf(false) }

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
        
        val primaryColor = if (isMilestone) MilestoneGold else MaterialTheme.colorScheme.primary
        val bgColor = if (isMilestone) MilestoneBg else MaterialTheme.colorScheme.background
        val cardBgColor = if (isMilestone) MilestoneSurface else MaterialTheme.colorScheme.surfaceVariant
        val borderColor = if (isMilestone) MilestoneBorder else MaterialTheme.colorScheme.outline
        val onSurfaceColor = if (isMilestone) MilestoneOnSurface else MaterialTheme.colorScheme.onBackground
        
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
                
                lessonSections?.let { s ->
                    if (!s.intuitionHook.isNullOrBlank()) {
                        LessonSectionCard("💡 THINK FIRST", s.intuitionHook!!, primaryColor, onSurfaceColor, borderColor, cardBgColor)
                    }
                    if (!s.whatItIs.isNullOrBlank()) {
                        LessonSectionCard("WHAT IT IS", s.whatItIs!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    if (!s.whyItWorks.isNullOrBlank()) {
                        LessonSectionCard("WHY IT WORKS", s.whyItWorks!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    if (!s.whenToUse.isNullOrBlank()) {
                        LessonSectionCard("WHEN TO USE IT", s.whenToUse!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    val reps = s.representations ?: emptyList()
                    if (reps.isNotEmpty()) {
                        Text(
                            text = "SEE IT DIFFERENTLY",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor,
                            letterSpacing = 0.5.sp
                        )
                        reps.forEach { rep ->
                            LessonSectionCard(rep.label, rep.body, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                        }
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

                lessonSections?.let { s ->
                    val mistakes = s.commonMistakes ?: emptyList()
                    if (mistakes.isNotEmpty()) {
                        Text(
                            text = "⚠️ COMMON MISTAKES",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                            letterSpacing = 0.5.sp
                        )
                        mistakes.forEach { m ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.22f))
                                    .border(1.5.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(text = m.label, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = onSurfaceColor)
                                if (!m.why.isNullOrBlank()) LessonProse(m.why!!, onSurfaceColor.copy(alpha = 0.75f), 26)
                                if (!m.fix.isNullOrBlank()) {
                                    Text(text = "✓ FIX", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CorrectGreen)
                                    LessonProse(m.fix!!, onSurfaceColor.copy(alpha = 0.85f), 26)
                                }
                            }
                        }
                    }
                    val connections = s.connections ?: emptyList()
                    if (connections.isNotEmpty()) {
                        Text(
                            text = "🔗 HOW THIS CONNECTS",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor,
                            letterSpacing = 0.5.sp
                        )
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.5.dp, borderColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            connections.forEach { c ->
                                LessonProse("• " + c.note, onSurfaceColor.copy(alpha = 0.85f), 26)
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

    fun handleAnswer(isCorrect: Boolean) {
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
        val bgColor = if (isMilestone) MilestoneBg else MaterialTheme.colorScheme.background
        val cardOutlineColor = if (isMilestone) MilestoneBorder else MaterialTheme.colorScheme.outline
        val primaryColor = if (isMilestone) MilestoneGold else MaterialTheme.colorScheme.primary

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
            verticalArrangement = Arrangement.Top
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

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
                                .clickable {
                                    SoundManager.playClick()
                                    com.example.numera.haptic.HapticManager.playSoft()
                                    showReference = true
                                }
                                .padding(horizontal = 8.dp, vertical = 5.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                NumeraIcon(type = NumeraIconType.Tip, tint = MaterialTheme.colorScheme.secondary, animate = false, modifier = Modifier.size(16.dp))
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
                .heightIn(min = 80.dp, max = 180.dp)
                .padding(vertical = 8.dp)
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
                        .padding(horizontal = 16.dp, vertical = 12.dp),
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
                    .padding(8.dp)
            ) {
                com.example.numera.ui.components.NumeraIcon(
                    type = com.example.numera.ui.components.NumeraIconType.Favorite,
                    filled = isFav,
                    tint = if (isFav) WrongRed else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
            }

            if (showSaveDialog) {
                androidx.compose.ui.window.Dialog(onDismissRequest = { showSaveDialog = false }) {
                    androidx.compose.material3.Card(
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text("Exercise Options", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)

                            // Save this question
                            val isSaved = isFav
                            androidx.compose.material3.OutlinedButton(
                                onClick = {
                                    showSaveDialog = false
                                    val nextFavState = !isSaved
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
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Text(if (isSaved) "❤️  Unsave This Question" else "❤️  Save This Question", fontWeight = FontWeight.Bold)
                            }

                            // Save entire level
                            androidx.compose.material3.Button(
                                onClick = {
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
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                            ) {
                                Text("📁  Save Entire Level", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                            }

                            // Retry this exercise
                            androidx.compose.material3.Button(
                                onClick = {
                                    showSaveDialog = false
                                    hasAnswered = false
                                    selectedAnswer = ""
                                    typedInput = ""
                                    activeExplanation = null
                                    answeredWrongForCurrent = false
                                    com.example.numera.haptic.HapticManager.playSoft()
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                            ) {
                                Text("🔄  Retry This Exercise", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondary)
                            }

                            TextButton(onClick = { showSaveDialog = false }, modifier = Modifier.align(Alignment.End)) {
                                Text("Cancel")
                            }
                        }
                    }
                }
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
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(
                                                MaterialTheme.colorScheme.tertiary,
                                                MaterialTheme.colorScheme.tertiary.copy(alpha = 0.8f)
                                            )
                                        )
                                    )
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
                                        tint = MaterialTheme.colorScheme.onTertiary,
                                        modifier = Modifier.size(16.dp),
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
                                        tint = MaterialTheme.colorScheme.onSecondary,
                                        modifier = Modifier.size(16.dp),
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
                verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                        handleAnswer(correct)
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
                                    handleAnswer(correct)
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
                                                    handleAnswer(option == currentProblem.correctAnswer)
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

        // Slide-up scientific calculator overlay
        AnimatedVisibility(
            visible = showCalculator,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.72f)
                    .clickable(enabled = false) {}
                    .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = 16.dp)
            ) {
                val onSurface = MaterialTheme.colorScheme.onSurface
                val primary = MaterialTheme.colorScheme.primary

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp)
                        .padding(bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Handle bar
                    Box(
                        modifier = Modifier
                            .padding(top = 8.dp, bottom = 2.dp)
                            .width(40.dp)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                            .align(Alignment.CenterHorizontally)
                    )

                    // Header row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "CALCULATOR",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = primary
                            )
                            if (calculatorMemory != 0.0) {
                                Text(
                                    text = "M = ${if (calculatorMemory % 1.0 == 0.0) calculatorMemory.toInt().toString() else String.format("%.4f", calculatorMemory)}",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                        IconButton(
                            onClick = { showCalculator = false },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = "Close", modifier = Modifier.size(18.dp))
                        }
                    }

                    // History strip (last 2 entries)
                    if (calculatorHistory.isNotEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            calculatorHistory.takeLast(2).forEach { entry ->
                                Text(
                                    text = entry,
                                    fontSize = 11.sp,
                                    color = onSurface.copy(alpha = 0.45f),
                                    maxLines = 1,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.End
                                )
                            }
                        }
                    }

                    // Display
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.CenterEnd
                    ) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = calculatorInput.ifEmpty { "0" },
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (calcIsError) WrongRed else onSurface,
                                maxLines = 1
                            )
                            if (calculatorResult.isNotEmpty() && !calcIsError) {
                                Text(
                                    text = "= $calculatorResult",
                                    fontSize = 14.sp,
                                    color = primary,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    // Keys
                    val keyRows = listOf(
                        listOf("MC", "MR", "M+", "M-"),
                        listOf("sin(", "cos(", "tan(", "^"),
                        listOf("ln(", "log(", "√(", "%"),
                        listOf("7", "8", "9", "÷"),
                        listOf("4", "5", "6", "×"),
                        listOf("1", "2", "3", "-"),
                        listOf("0", ".", "(", "+"),
                        listOf("π", "e", ")", "!"),
                        listOf("C", "⌫", "=", "=")
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        keyRows.forEach { row ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                var skipNext = false
                                row.forEachIndexed { colIdx, key ->
                                    if (skipNext) { skipNext = false; return@forEachIndexed }
                                    val isWideEquals = key == "=" && colIdx < row.size - 1 && row[colIdx + 1] == "="
                                    val weight = if (isWideEquals) 2f else 1f
                                    if (isWideEquals) skipNext = true

                                    val bgColor = when {
                                        key == "=" -> primary
                                        key == "C" -> WrongRed.copy(alpha = 0.12f)
                                        key == "⌫" -> MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                                        key in listOf("MC", "MR", "M+", "M-") -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f)
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(", "√(") -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.10f)
                                        key in listOf("÷", "×", "-", "+", "^", "%", "!") -> primary.copy(alpha = 0.10f)
                                        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                    }
                                    val textColor = when {
                                        key == "=" -> MaterialTheme.colorScheme.onPrimary
                                        key == "C" -> WrongRed
                                        key in listOf("MC", "MR", "M+", "M-") -> MaterialTheme.colorScheme.tertiary
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(", "√(") -> MaterialTheme.colorScheme.secondary
                                        key in listOf("÷", "×", "-", "+", "^", "%", "!") -> primary
                                        else -> onSurface.copy(alpha = 0.85f)
                                    }
                                    val displayKey = when (key) {
                                        "sin(" -> "sin"
                                        "cos(" -> "cos"
                                        "tan(" -> "tan"
                                        "ln(" -> "ln"
                                        "log(" -> "log"
                                        "√(" -> "√"
                                        "÷" -> "÷"
                                        "×" -> "×"
                                        else -> key
                                    }
                                    val fontSize = when {
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(") -> 13.sp
                                        else -> 16.sp
                                    }

                                    Box(
                                        modifier = Modifier
                                            .weight(weight)
                                            .height(38.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(bgColor)
                                            .clickable {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                calcIsError = false
                                                when (key) {
                                                    "C" -> {
                                                        calculatorInput = ""
                                                        calculatorResult = ""
                                                    }
                                                    "⌫" -> {
                                                        calculatorInput = if (calculatorInput.isNotEmpty()) {
                                                            val drop = when {
                                                                calculatorInput.endsWith("sin(") -> 4
                                                                calculatorInput.endsWith("cos(") -> 4
                                                                calculatorInput.endsWith("tan(") -> 4
                                                                calculatorInput.endsWith("ln(")  -> 3
                                                                calculatorInput.endsWith("log(") -> 4
                                                                calculatorInput.endsWith("√(")  -> 2
                                                                else -> 1
                                                            }
                                                            calculatorInput.dropLast(drop)
                                                        } else ""
                                                        calculatorResult = ""
                                                    }
                                                    "MC" -> { calculatorMemory = 0.0 }
                                                    "MR" -> { calculatorInput += if (calculatorMemory % 1.0 == 0.0) calculatorMemory.toInt().toString() else String.format("%.6g", calculatorMemory) }
                                                    "M+" -> {
                                                        try {
                                                            if (calculatorResult.isNotEmpty()) calculatorMemory += calculatorResult.toDouble()
                                                            else if (calculatorInput.isNotEmpty()) calculatorMemory += evaluateExpression(calculatorInput)
                                                        } catch (_: Exception) {}
                                                    }
                                                    "M-" -> {
                                                        try {
                                                            if (calculatorResult.isNotEmpty()) calculatorMemory -= calculatorResult.toDouble()
                                                            else if (calculatorInput.isNotEmpty()) calculatorMemory -= evaluateExpression(calculatorInput)
                                                        } catch (_: Exception) {}
                                                    }
                                                    "=" -> {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            try {
                                                                val res = evaluateExpression(calculatorInput)
                                                                val formatted = if (res % 1.0 == 0.0) res.toLong().toString() else String.format("%.6g", res)
                                                                val historyEntry = "${calculatorInput} = $formatted"
                                                                calculatorHistory = (calculatorHistory + historyEntry).takeLast(10)
                                                                calculatorResult = formatted
                                                                calculatorInput = formatted
                                                                if (Math.abs(res - 67.0) < 1e-9) logCalculatorTelemetry("67")
                                                                else logCalculatorTelemetry(historyEntry)
                                                            } catch (_: Exception) {
                                                                calcIsError = true
                                                                calculatorResult = ""
                                                                calculatorInput = "Error"
                                                            }
                                                        }
                                                    }
                                                    "÷" -> calculatorInput += "/"
                                                    "×" -> calculatorInput += "*"
                                                    else -> calculatorInput += key
                                                }
                                                // Live preview (not on = or memory ops)
                                                if (key !in listOf("=", "C", "MC", "MR", "M+", "M-", "⌫")) {
                                                    try {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            val r = evaluateExpression(calculatorInput)
                                                            calculatorResult = if (r % 1.0 == 0.0) r.toLong().toString() else String.format("%.6g", r)
                                                        }
                                                    } catch (_: Exception) { calculatorResult = "" }
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = displayKey,
                                            fontSize = fontSize,
                                            fontWeight = if (key == "=") FontWeight.ExtraBold else FontWeight.Bold,
                                            color = textColor
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
                        Column {
                            Text(
                                text = "HINT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.primary,
                                letterSpacing = 1.sp
                            )
                            Text(
                                text = problemsList.getOrNull(currentProblemIdx)?.tipMetadata?.concept
                                    ?: "Study Tip",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 18.sp,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                        IconButton(onClick = { showTip = false }) {
                            Icon(Icons.Default.Clear, contentDescription = "Close")
                        }
                    }

                    if (problemsList.isNotEmpty() && currentProblemIdx < problemsList.size) {
                        val problem = problemsList[currentProblemIdx]
                        val tipText = problem.tip?.takeIf { it.isNotBlank() }
                            ?: "Tip unavailable for this exercise."

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
                            Divider(
                                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f),
                                thickness = 1.dp
                            )

                            metadata.learningObjective?.let { objective ->
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = "LEARNING OBJECTIVE",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.secondary,
                                        letterSpacing = 0.8.sp
                                    )
                                    Text(
                                        text = objective,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                                        lineHeight = 18.sp
                                    )
                                }
                            }

                            metadata.commonMistakes?.let { pitfall ->
                                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Text(
                                        text = "WATCH OUT FOR",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = WrongRed,
                                        letterSpacing = 0.8.sp
                                    )
                                    Text(
                                        text = pitfall,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.85f),
                                        lineHeight = 18.sp
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                metadata.subskill?.let { skill ->
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "SKILL",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            letterSpacing = 0.8.sp
                                        )
                                        Text(text = skill, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                    }
                                }
                                metadata.difficulty?.let { diff ->
                                    Column {
                                        Text(
                                            text = "DIFFICULTY",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            letterSpacing = 0.8.sp
                                        )
                                        Text(text = diff, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                                    }
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "Tip unavailable for this exercise.",
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

private fun evaluateExpression(expr: String): Double =
    CalcParser(
        expr.replace(" ", "")
            .replace("π", "pi")
            .replace("÷", "/")
            .replace("×", "*")
            .replace("√", "sqrt")
            .lowercase()
    ).parse()

private class CalcParser(private val s: String) {
    private var pos = 0

    fun parse(): Double {
        val result = parseExpression()
        if (pos < s.length) throw RuntimeException("Unexpected: '${s[pos]}'")
        return result
    }

    private fun peek(): Char = if (pos < s.length) s[pos] else ' '

    private fun eat(c: Char): Boolean {
        if (peek() == c) { pos++; return true }
        return false
    }

    private fun parseExpression(): Double {
        var x = parseTerm()
        while (true) x = when {
            eat('+') -> x + parseTerm()
            eat('-') -> x - parseTerm()
            else     -> return x
        }
    }

    private fun parseTerm(): Double {
        var x = parsePower()
        while (true) x = when {
            eat('*') -> x * parsePower()
            eat('/') -> { val d = parsePower(); if (d == 0.0) throw RuntimeException("Division by zero"); x / d }
            else     -> return x
        }
    }

    private fun parsePower(): Double {
        val base = parseUnary()
        return if (peek() == '^') { pos++; Math.pow(base, parsePower()) } else base
    }

    private fun parseUnary(): Double {
        if (eat('+')) return parseUnary()
        if (eat('-')) return -parseUnary()
        return parsePostfix()
    }

    private fun parsePostfix(): Double {
        var x = parseAtom()
        while (true) x = when {
            eat('!') -> factorial(x.toLong())
            eat('%') -> x / 100.0
            else     -> return x
        }
    }

    private fun parseAtom(): Double {
        if (eat('(')) {
            val x = parseExpression()
            eat(')')
            return x
        }
        if (peek().isDigit() || peek() == '.') {
            val start = pos
            while (pos < s.length && (s[pos].isDigit() || s[pos] == '.')) pos++
            return s.substring(start, pos).toDouble()
        }
        if (peek().isLetter()) {
            val start = pos
            while (pos < s.length && s[pos].isLetter()) pos++
            return when (val name = s.substring(start, pos)) {
                "pi"    -> Math.PI
                "e"     -> Math.E
                "sqrt"  -> fn1 { Math.sqrt(it) }
                "sin"   -> fn1 { Math.sin(Math.toRadians(it)) }
                "cos"   -> fn1 { Math.cos(Math.toRadians(it)) }
                "tan"   -> fn1 { Math.tan(Math.toRadians(it)) }
                "ln"    -> fn1 { if (it <= 0) throw RuntimeException("ln undefined for x<=0"); Math.log(it) }
                "log"   -> fn1 { if (it <= 0) throw RuntimeException("log undefined for x<=0"); Math.log10(it) }
                "abs"   -> fn1 { Math.abs(it) }
                "ceil"  -> fn1 { Math.ceil(it) }
                "floor" -> fn1 { Math.floor(it) }
                "round" -> fn1 { Math.round(it).toDouble() }
                else    -> throw RuntimeException("Unknown function: $name")
            }
        }
        throw RuntimeException("Unexpected: '${peek()}'")
    }

    private fun fn1(f: (Double) -> Double): Double {
        eat('(')
        val a = parseExpression()
        eat(')')
        return f(a)
    }

    private fun factorial(n: Long): Double {
        if (n < 0) throw RuntimeException("Factorial undefined for negatives")
        if (n > 20) throw RuntimeException("Factorial too large (max 20!)")
        var r = 1.0
        for (i in 2..n) r *= i
        return r
    }
}
