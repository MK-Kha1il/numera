package com.example.numera.ui.feature.archive

import android.util.Log
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
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
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.drawBehind
import android.content.Context
import com.example.numera.data.network.*
import com.example.numera.SoloGame
import com.example.numera.theme.*
import com.example.numera.ui.dialogs.LevelDebriefDialog
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.MathText
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.NumeraSearchField
import com.example.numera.ui.components.rememberDebouncedValue
import com.example.numera.ui.components.rememberInfiniteScroll
import com.example.numera.ui.components.LoadMoreFooter
import com.example.numera.ui.components.ArchiveRowSkeleton
import com.example.numera.ui.components.SkeletonList
import com.example.numera.ui.components.NumeraBreadcrumbs
import com.example.numera.ui.components.Crumb
import com.example.numera.ui.components.NumeraFilterRow
import com.example.numera.ui.components.NumeraFilterChip
import com.example.numera.ui.components.NumeraBottomSheet
import com.example.numera.ui.components.SheetSectionLabel
import com.example.numera.ui.components.ContextMenuArea
import com.example.numera.ui.components.ContextAction
import com.example.numera.ui.components.NumeraQuickPreview
import com.example.numera.ui.components.DisclosureSection
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.async

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LevelMapScreen(
    user: User?,
    onStartSoloGame: (SoloGame) -> Unit,
    onStartLegacyGame: (Int) -> Unit,
    onStartPlacement: () -> Unit,
    onSkipPlacement: () -> Unit,
    onShowCommitment: () -> Unit,
    requestedSubTab: Int? = null,
    onSubTabConsumed: () -> Unit = {}
) {
    var selectedCategoryTab by remember { mutableStateOf(0) }
    // Allow another screen (e.g. the Quests "Review Now" nudge) to request a specific sub-tab
    // (0 Levels / 1 Spaced Review / 2 Archive). Consumed once so manual tab taps still work.
    LaunchedEffect(requestedSubTab) {
        if (requestedSubTab != null) {
            selectedCategoryTab = requestedSubTab
            onSubTabConsumed()
        }
    }
    var srsDueItems by remember { mutableStateOf<List<SrsDueItem>>(emptyList()) }
    var legacyPuzzles by remember { mutableStateOf<List<LegacyExercise>>(emptyList()) }
    var dailyPuzzle by remember { mutableStateOf<DailyPuzzle?>(null) }
    var mistakesList by remember { mutableStateOf<List<Mistake>>(emptyList()) }
    var activeDebriefLevel by remember { mutableStateOf<Int?>(null) }
    var activeDebriefCategory by remember { mutableStateOf<String?>(null) }

    val context = LocalContext.current
    val prefs = remember(context) { context.getSharedPreferences("numera_scroll_prefs", android.content.Context.MODE_PRIVATE) }
    val savedIndex = remember(prefs) { prefs.getInt("scroll_index", -1) }
    val savedOffset = remember(prefs) { prefs.getInt("scroll_offset", 0) }

    var showPlacementTooltip by remember {
        mutableStateOf(
            !prefs.getBoolean("dismissed_placement_tooltip", false)
        )
    }

    val lazyListState = rememberLazyListState(
        initialFirstVisibleItemIndex = if (savedIndex != -1) savedIndex else 0,
        initialFirstVisibleItemScrollOffset = if (savedIndex != -1) savedOffset else 0
    )

    // Save scroll position asynchronously
    LaunchedEffect(lazyListState) {
        snapshotFlow { Pair(lazyListState.firstVisibleItemIndex, lazyListState.firstVisibleItemScrollOffset) }
            .collect { (index, offset) ->
                prefs.edit()
                    .putInt("scroll_index", index)
                    .putInt("scroll_offset", offset)
                    .apply()
            }
    }

    val currentMaxLevel = user?.level ?: 1
    val mapItems = remember(currentMaxLevel) {
        val itemsList = mutableListOf<LearnMapItem>()
        val maxLevelCount = maxOf(60, currentMaxLevel + 10)
        for (levelNum in 1..maxLevelCount) {
            if (levelNum == 1) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 1,
                        title = "Stage 1: Initiate Valley",
                        description = "Master the fundamentals of basic numerical systems.",
                        startColor = Color(0xFF10B981),
                        endColor = Color(0xFF059669)
                    )
                )
            } else if (levelNum == 11) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 2,
                        title = "Stage 2: Alge-Bridges",
                        description = "Cross the gap between arithmetic operations and algebraic formulas.",
                        startColor = Color(0xFF6366F1),
                        endColor = Color(0xFF4F46E5)
                    )
                )
            } else if (levelNum == 21) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 3,
                        title = "Stage 3: Combinatoric Peaks",
                        description = "Climb the heights of counting principles and permutations.",
                        startColor = Color(0xFFEC4899),
                        endColor = Color(0xFFDB2777)
                    )
                )
            } else if (levelNum == 31) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 4,
                        title = "Stage 4: The Calculus Abyss",
                        description = "Dive deep into the continuous limits of derivative mechanics.",
                        startColor = Color(0xFF3B82F6),
                        endColor = Color(0xFF1D4ED8)
                    )
                )
            } else if (levelNum == 41) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 5,
                        title = "Stage 5: Number Theory Nexus",
                        description = "Connect the patterns of prime structures and modular arithmetic.",
                        startColor = Color(0xFFFBBF24),
                        endColor = Color(0xFFD97706)
                    )
                )
            } else if (levelNum == 51) {
                itemsList.add(
                    LearnMapItem.StageHeader(
                        stageNum = 6,
                        title = "Stage 6: Infinity Void",
                        description = "Confront transfinite concepts and complex analysis vectors.",
                        startColor = Color(0xFF8B5CF6),
                        endColor = Color(0xFF6D28D9)
                    )
                )
            }

            val isUnlocked = levelNum <= currentMaxLevel
            val category = when (levelNum % 6) {
                0 -> "number_theory"
                1 -> "arithmetic"
                2 -> "mental"
                3 -> "algebra"
                4 -> "calculus"
                else -> "combinatorics"
            }

            itemsList.add(
                LearnMapItem.LevelNodeItem(
                    levelNum = levelNum,
                    category = category,
                    isUnlocked = isUnlocked,
                    isActive = (levelNum == currentMaxLevel)
                )
            )
        }
        itemsList
    }

    var hasAutoScrolled by remember { mutableStateOf(false) }
    LaunchedEffect(user, mapItems, dailyPuzzle, mistakesList) {
        if (user != null && mapItems.isNotEmpty() && !hasAutoScrolled) {
            // Always open the map on the learner's CURRENT level so they never have to scroll to
            // find where they are. (Previously a saved scroll position short-circuited this, so after
            // any scroll the map stopped returning to the active level on load.)
            val activeIdx = mapItems.indexOfFirst { it is LearnMapItem.LevelNodeItem && it.isActive }
            if (activeIdx != -1) {
                var headerCount = 1
                if (user.assessment_taken == 0) headerCount++
                if (dailyPuzzle != null) headerCount++
                if (mistakesList.isNotEmpty()) headerCount++

                val targetIndex = headerCount + activeIdx
                val scrollTarget = (targetIndex - 1).coerceAtLeast(0)
                lazyListState.scrollToItem(scrollTarget)
            }
            hasAutoScrolled = true
        }
    }
    
    // Archive state
    var searchQuery by remember { mutableStateOf("") }
    // Filter state is persisted so a user's preferred archive view survives leaving the tab.
    var selectedCategoryFilter by remember { mutableStateOf<String?>(prefs.getString("archive_category", null)) }
    var selectedStarsFilter by remember { mutableStateOf<Int?>(prefs.getInt("archive_stars", 0).takeIf { it in 1..5 }) }
    LaunchedEffect(selectedCategoryFilter, selectedStarsFilter) {
        prefs.edit()
            .putString("archive_category", selectedCategoryFilter)
            .putInt("archive_stars", selectedStarsFilter ?: 0)
            .apply()
    }
    var showArchiveFilterSheet by remember { mutableStateOf(false) }
    var archivePreviewItem by remember { mutableStateOf<ArchiveExercise?>(null) }
    var archiveResults by remember { mutableStateOf<List<ArchiveExercise>>(emptyList()) }
    var isArchiveLoading by remember { mutableStateOf(false) }
    var isArchiveLoadingMore by remember { mutableStateOf(false) }
    var archiveHasMore by remember { mutableStateOf(true) }
    val archiveListState = rememberLazyListState()
    val archivePageSize = 20
    // Debounced query so typing fires one search per pause, not one per keystroke.
    val debouncedQuery by rememberDebouncedValue(searchQuery, 300L)

    val scope = rememberCoroutineScope()

    val refreshAllData = {
        scope.launch(Dispatchers.IO) {
            val token = RetrofitClient.authToken ?: ""
            val srsDeferred = async {
                try { RetrofitClient.apiService.getSrsDue(token) } catch (e: Exception) { Log.e("LevelMap", "SRS fetch failed", e); emptyList() }
            }
            val legacyDeferred = async {
                try { RetrofitClient.apiService.getLegacyPuzzles(token) } catch (e: Exception) { Log.e("LevelMap", "Legacy puzzles fetch failed", e); emptyList() }
            }
            val dpDeferred = async {
                try { RetrofitClient.apiService.getDailyPuzzle(token) } catch (e: Exception) { Log.e("LevelMap", "Daily puzzle fetch failed", e); null }
            }
            val mistDeferred = async {
                try { RetrofitClient.apiService.getMistakes(token) } catch (e: Exception) { Log.e("LevelMap", "Mistakes fetch failed", e); emptyList() }
            }
            
            val srs = srsDeferred.await()
            val legacy = legacyDeferred.await()
            val dp = dpDeferred.await()
            val mist = mistDeferred.await()
            
            withContext(Dispatchers.Main) {
                srsDueItems = srs
                legacyPuzzles = legacy
                dailyPuzzle = dp
                mistakesList = mist
            }
        }
    }

    // Fetch SRS due items, Legacy items, Daily Puzzle, and Mistakes
    LaunchedEffect(Unit) {
        refreshAllData()
        RetrofitClient.profileRefreshFlow.collect {
            refreshAllData()
        }
    }

    // Fetch the first archive page whenever the debounced query or filters change (resets paging).
    LaunchedEffect(debouncedQuery, selectedCategoryFilter, selectedStarsFilter) {
        isArchiveLoading = true
        archiveHasMore = true
        try {
            val token = RetrofitClient.authToken ?: ""
            val results = withContext(Dispatchers.IO) {
                RetrofitClient.apiService.searchArchive(
                    token = token,
                    category = selectedCategoryFilter,
                    stars = selectedStarsFilter,
                    query = if (debouncedQuery.isBlank()) null else debouncedQuery,
                    limit = archivePageSize,
                    offset = 0
                )
            }
            archiveResults = results
            archiveHasMore = results.isNotEmpty()
        } catch (e: Exception) {
            Log.e("ArchiveExplorer", "Failed to search archive: ${e.message}")
        } finally {
            isArchiveLoading = false
        }
    }

    // Append the next archive page (infinite scroll). Preserves scroll position by appending.
    val loadMoreArchive: () -> Unit = loadMore@{
        if (isArchiveLoading || isArchiveLoadingMore || !archiveHasMore) return@loadMore
        isArchiveLoadingMore = true
        scope.launch {
            try {
                val token = RetrofitClient.authToken ?: ""
                val more = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.searchArchive(
                        token = token,
                        category = selectedCategoryFilter,
                        stars = selectedStarsFilter,
                        query = if (debouncedQuery.isBlank()) null else debouncedQuery,
                        limit = archivePageSize,
                        offset = archiveResults.size
                    )
                }
                if (more.isEmpty()) archiveHasMore = false
                else archiveResults = archiveResults + more
            } catch (e: Exception) {
                Log.e("ArchiveExplorer", "Failed to load more archive: ${e.message}")
            } finally {
                isArchiveLoadingMore = false
            }
        }
    }

    // Single source of truth for opening an archive exercise — shared by the Solve button, the
    // long-press context menu, and the quick-preview CTA so the launch stays consistent.
    val launchArchiveItem: (ArchiveExercise) -> Unit = { item ->
        onStartSoloGame(
            SoloGame(
                category = item.category,
                level = 0,
                gameMode = "archive_puzzle",
                title = item.title,
                question = item.question,
                correctAnswer = item.correct_answer,
                optionsJson = item.options.joinToString("|||"),
                explanation = item.explanation,
                lessonTitle = item.lessonTitle,
                lessonContent = item.lessonContent,
                lessonFormula = item.lessonFormula,
                examplesJson = item.examples?.let { com.google.gson.Gson().toJson(it) }
            )
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        if (user?.commitment_state == "fading") {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.l, vertical = Spacing.s)
                    .clickable { onShowCommitment() },
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3CD)),
                border = BorderStroke(1.dp, Color(0xFFFFEBAA)),
                shape = RoundedCornerShape(CornerRadius.m)
            ) {
                Row(
                    modifier = Modifier.padding(Spacing.m),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Text("⚠️", fontSize = 20.sp)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Your climb is fading",
                            fontWeight = FontWeight.Bold,
                            color = MilestoneGoldText,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "A small step keeps the climb alive. Restore your consistency run now.",
                            color = MilestoneGoldText.copy(alpha = 0.8f),
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = { onShowCommitment() },
                        colors = ButtonDefaults.buttonColors(containerColor = MilestoneGoldText),
                        shape = RoundedCornerShape(CornerRadius.s),
                        contentPadding = PaddingValues(horizontal = Spacing.m, vertical = Spacing.xs),
                        modifier = Modifier.height(Spacing.xxl)
                    ) {
                        Text("Restore", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
            }
        }

        TabRow(
            selectedTabIndex = selectedCategoryTab,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Tab(selected = selectedCategoryTab == 0, onClick = { selectedCategoryTab = 0 }) {
                Text("Levels", modifier = Modifier.padding(Spacing.l), fontWeight = FontWeight.Bold)
            }
            Tab(selected = selectedCategoryTab == 1, onClick = { selectedCategoryTab = 1 }) {
                Box {
                    Text("Spaced Review", modifier = Modifier.padding(Spacing.l), fontWeight = FontWeight.Bold)
                    if (srsDueItems.isNotEmpty()) {
                        Badge(modifier = Modifier.align(Alignment.TopEnd).offset(x = 10.dp, y = Spacing.s)) {
                            Text(srsDueItems.size.toString())
                        }
                    }
                }
            }
            Tab(selected = selectedCategoryTab == 2, onClick = { selectedCategoryTab = 2 }) {
                Text("Archive Explorer", modifier = Modifier.padding(Spacing.l), fontWeight = FontWeight.Bold)
            }
        }

        AnimatedContent(
            targetState = selectedCategoryTab,
            transitionSpec = {
                if (targetState > initialState) {
                    (slideInHorizontally { width -> width } + fadeIn()).togetherWith(
                        slideOutHorizontally { width -> -width } + fadeOut()
                    )
                } else {
                    (slideInHorizontally { width -> -width } + fadeIn()).togetherWith(
                        slideOutHorizontally { width -> width } + fadeOut()
                    )
                }
            },
            label = "LevelMapTabsTransition",
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) { targetSubTab ->
            when (targetSubTab) {
            0 -> {

                val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                val curveColorCapture = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .drawBehind {
                            val density = this
                            // Subtle coordinate grid
                            val gridSpacing = with(density) { 40.dp.toPx() }
                            
                            var x = 0f
                            while (x < this.size.width) {
                                drawLine(
                                    color = gridColor,
                                    start = androidx.compose.ui.geometry.Offset(x, 0f),
                                    end = androidx.compose.ui.geometry.Offset(x, this.size.height),
                                    strokeWidth = with(density) { 1.dp.toPx() }
                                )
                                x += gridSpacing
                            }
                            
                            var y = 0f
                            while (y < this.size.height) {
                                drawLine(
                                    color = gridColor,
                                    start = androidx.compose.ui.geometry.Offset(0f, y),
                                    end = androidx.compose.ui.geometry.Offset(this.size.width, y),
                                    strokeWidth = with(density) { 1.dp.toPx() }
                                )
                                y += gridSpacing
                            }
                            
                            // Subtle mathematical graphs/curves (sine & cosine waves)
                            val curveColor = curveColorCapture
                            
                            val sinePath = Path()
                            sinePath.moveTo(0f, this.size.height * 0.3f)
                            for (px in 0..this.size.width.toInt() step 5) {
                                val py = this.size.height * 0.3f + with(density) { 50.dp.toPx() } * kotlin.math.sin(px * 0.01f)
                                sinePath.lineTo(px.toFloat(), py)
                            }
                            drawPath(
                                path = sinePath,
                                color = curveColor,
                                style = Stroke(width = with(density) { 2.dp.toPx() })
                            )
                            
                            val cosPath = Path()
                            cosPath.moveTo(0f, this.size.height * 0.7f)
                            for (px in 0..this.size.width.toInt() step 5) {
                                val py = this.size.height * 0.7f + with(density) { 60.dp.toPx() } * kotlin.math.cos(px * 0.008f)
                                cosPath.lineTo(px.toFloat(), py)
                            }
                            drawPath(
                                path = cosPath,
                                color = curveColor,
                                style = Stroke(width = with(density) { 2.dp.toPx() })
                            )
                        }
                ) {
                    LazyColumn(
                        state = lazyListState,
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(Spacing.l),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    item {
                        Text(
                            text = "SCIENTIFICALLY PLANNED PATHWAY",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "Complete levels in sequence. Categories interleave automatically for scientifically proven long-term memory retention.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(vertical = Spacing.xs)
                        )
                    }

                    if (user?.assessment_taken == 0) {
                        if (showPlacementTooltip) {
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = Spacing.s),
                                    shape = RoundedCornerShape(CornerRadius.m),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)
                                    ),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(Spacing.m),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                    ) {
                                        Text("💡", fontSize = 18.sp)
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "Diagnostic Fast-Track",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 13.sp,
                                                color = MaterialTheme.colorScheme.onSecondaryContainer
                                            )
                                            Text(
                                                text = "Starting at Level 1 is great, but taking the diagnostic test helps match your skill rating precisely and saves you time!",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSecondaryContainer.copy(alpha = 0.8f)
                                            )
                                        }
                                        IconButton(
                                            onClick = {
                                                showPlacementTooltip = false
                                                prefs.edit().putBoolean("dismissed_placement_tooltip", true).apply()
                                            },
                                            modifier = Modifier.size(IconSize.m)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Close,
                                                contentDescription = "Dismiss",
                                                modifier = Modifier.size(IconSize.s),
                                                tint = MaterialTheme.colorScheme.onSecondaryContainer
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        item {
                            DuoCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = Spacing.s),
                                borderColor = MaterialTheme.colorScheme.secondary
                            ) {
                                Column(modifier = Modifier.padding(Spacing.l)) {
                                    Text(
                                        text = "🎯 Placement Assessment",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 18.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        text = "Determine your math level instantly using our scientifically proven evaluation. Place directly into higher ranks and unlock rewards!",
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                    )
                                    Spacer(modifier = Modifier.height(14.dp))
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Button(
                                            onClick = onStartPlacement,
                                            modifier = Modifier.weight(1.5f),
                                            shape = RoundedCornerShape(CornerRadius.m)
                                        ) {
                                            Text("Take 10-Min Test", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                        OutlinedButton(
                                            onClick = onSkipPlacement,
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(CornerRadius.m)
                                        ) {
                                            Text("Skip", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Daily Puzzle Card
                    dailyPuzzle?.let { puzzle ->
                        item {
                            DuoCard(
                                modifier = Modifier.fillMaxWidth(),
                                borderColor = MaterialTheme.colorScheme.tertiary
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(Spacing.m),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                        ) {
                                            Text(
                                                text = "🧩 Daily Puzzle",
                                                fontWeight = FontWeight.ExtraBold,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.tertiary
                                            )
                                            Row {
                                                repeat(5) { starIndex ->
                                                    Text(
                                                        text = if (starIndex < (puzzle.stars ?: 0)) "⭐" else "☆",
                                                        fontSize = 11.sp
                                                    )
                                                }
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = puzzle.title ?: "Untitled Puzzle",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = if (puzzle.solved_today == true) "Completed today! +50 XP, +30 🪙" else "Solve for +50 XP and +30 🪙",
                                            fontSize = 12.sp,
                                            color = if (puzzle.solved_today == true) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                    DuoButton(
                                        text = if (puzzle.solved_today == true) "Review" else "Play",
                                        onClick = {
                                            onStartSoloGame(
                                                SoloGame(
                                                    category = puzzle.category ?: "General",
                                                    level = 0,
                                                    gameMode = "daily_puzzle"
                                                )
                                            )
                                        },
                                        modifier = Modifier.width(90.dp),
                                        color = MaterialTheme.colorScheme.tertiary
                                    )
                                }
                            }
                        }
                    }

                    // Growth Practice Card
                    if (mistakesList.isNotEmpty()) {
                        item {
                            DuoCard(
                                modifier = Modifier.fillMaxWidth(),
                                borderColor = Color(0xFF6366F1)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(Spacing.m),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "🌱 Growth Practice",
                                            fontWeight = FontWeight.ExtraBold,
                                            fontSize = 14.sp,
                                            color = Color(0xFF6366F1)
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Focus Trainer",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = "Review your ${mistakesList.size} unresolved mathematical mistakes",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                    // Give the learner a choice: review the mistakes, or ignore
                                    // (dismiss) them so the bank isn't a permanent nag.
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                                    ) {
                                        DuoButton(
                                            text = "Review",
                                            onClick = {
                                                onStartSoloGame(
                                                    SoloGame(
                                                        category = "General",
                                                        level = 0,
                                                        gameMode = "mistakes_practice"
                                                    )
                                                )
                                            },
                                            modifier = Modifier.width(110.dp),
                                            color = Color(0xFF6366F1)
                                        )
                                        TextButton(
                                            onClick = {
                                                val toClear = mistakesList
                                                mistakesList = emptyList()   // optimistic clear
                                                scope.launch(Dispatchers.IO) {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    toClear.forEach { m ->
                                                        try {
                                                            RetrofitClient.apiService.resolveMistake(token, ResolveMistakeRequest(m.id))
                                                        } catch (e: Exception) {
                                                            Log.e("LevelMap", "Ignore mistake failed", e)
                                                        }
                                                    }
                                                }
                                            }
                                        ) {
                                            Text(
                                                "Ignore",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Render dynamic sequential levels
                    items(
                        mapItems,
                        key = {
                            when (it) {
                                is LearnMapItem.StageHeader -> "stage_${it.stageNum}"
                                is LearnMapItem.LevelNodeItem -> "level_${it.levelNum}"
                            }
                        }
                    ) { item ->
                        when (item) {
                            is LearnMapItem.StageHeader -> {
                                StageHeaderCard(
                                    stageNum = item.stageNum,
                                    title = item.title,
                                    description = item.description,
                                    startColor = item.startColor,
                                    endColor = item.endColor
                                )
                            }
                            is LearnMapItem.LevelNodeItem -> {
                                val levelNum = item.levelNum
                                val isUnlocked = item.isUnlocked
                                val category = item.category
                                val indexInPath = (levelNum - 1) % 10

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(120.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    if (levelNum % 10 != 0) {
                                        val density = LocalDensity.current
                                        val lockedPathColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                        val nextLevelNum = levelNum + 1
                                        val isNextUnlocked = nextLevelNum <= currentMaxLevel
                                        Canvas(modifier = Modifier.fillMaxSize()) {
                                            val width = size.width
                                            val height = size.height
                                            val centerX = width / 2
                                            
                                            val currentSnIndex = indexInPath
                                            val nextSnIndex = indexInPath + 1
                                            
                                            val xOffsetCurrentPx = with(density) { (80.dp * kotlin.math.sin(currentSnIndex * 0.9f)).toPx() }
                                            val xOffsetNextPx = with(density) { (80.dp * kotlin.math.sin(nextSnIndex * 0.9f)).toPx() }
                                            
                                            val startY = height / 2
                                            val endY = height / 2 + height + with(density) { 20.dp.toPx() }
                                            
                                            val path = Path().apply {
                                                moveTo(centerX + xOffsetCurrentPx, startY)
                                                cubicTo(
                                                    x1 = centerX + xOffsetCurrentPx,
                                                    y1 = startY + height * 0.4f,
                                                    x2 = centerX + xOffsetNextPx,
                                                    y2 = endY - height * 0.4f,
                                                    x3 = centerX + xOffsetNextPx,
                                                    y3 = endY
                                                )
                                            }
                                            
                                            if (isNextUnlocked) {
                                                drawPath(
                                                    path = path,
                                                    brush = Brush.verticalGradient(
                                                        colors = listOf(
                                                            Color(0xFF6366F1),
                                                            Color(0xFF10B981)
                                                        )
                                                    ),
                                                    style = Stroke(
                                                        width = with(density) { Spacing.s.toPx() },
                                                        cap = StrokeCap.Round
                                                    )
                                                )
                                            } else {
                                                drawPath(
                                                    path = path,
                                                    color = lockedPathColor,
                                                    style = Stroke(
                                                        width = with(density) { 6.dp.toPx() },
                                                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f),
                                                        cap = StrokeCap.Round
                                                    )
                                                )
                                            }
                                        }
                                    }
                                    
                                    val xOffset = 80.dp * kotlin.math.sin(indexInPath * 0.9f)
                                    Box(
                                        modifier = Modifier.offset(x = xOffset)
                                    ) {
                                        LevelNode(
                                            levelNum = levelNum,
                                            category = category,
                                            isUnlocked = isUnlocked,
                                            isActive = item.isActive,
                                            onClick = {
                                                if (isUnlocked) {
                                                    activeDebriefLevel = levelNum
                                                    activeDebriefCategory = category
                                                }
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
            1 -> {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(Spacing.l),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    item {
                        Text(
                            text = "SPACED REPETITION REVIEWS",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Text(
                            text = "Concepts you struggled with in the past are automatically scheduled for active recall based on the SuperMemo SM-2 algorithm.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.padding(vertical = Spacing.xs)
                        )
                    }

                    if (srsDueItems.isEmpty()) {
                        item {
                            NumeraEmptyState(
                                illustration = EmptyIllustration.Mistakes,
                                title = "You're all caught up",
                                message = "No reviews are due right now — your memory's looking sharp. Check back later."
                            )
                        }
                    } else {
                        items(srsDueItems, key = { it.id }) { item ->
                            val lastUnderscoreIdx = item.topic.lastIndexOf('_')
                            val srsCat = if (lastUnderscoreIdx != -1) item.topic.substring(0, lastUnderscoreIdx) else item.topic
                            val srsLvl = if (lastUnderscoreIdx != -1) item.topic.substring(lastUnderscoreIdx + 1).toIntOrNull() ?: 1 else 1
                            DuoCard(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        onStartSoloGame(
                                            SoloGame(
                                                category = srsCat,
                                                level = srsLvl,
                                                gameMode = "level"
                                            )
                                        )
                                    },
                                borderColor = WrongRed
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(Spacing.s),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            text = item.topic.replace("_", " ").uppercase(),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp
                                        )
                                        Text(
                                            text = "Review multiplier: +50% Bonus XP!",
                                            fontSize = 12.sp,
                                            color = WrongRed
                                        )
                                    }
                                    com.example.numera.ui.components.NumeraIcon(
                                        type = com.example.numera.ui.components.NumeraIconType.Warning,
                                        tint = WrongRed
                                    )
                                }
                            }
                        }
                    }
                }
            }
            2 -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(Spacing.l)
                ) {
                    Text(
                        text = "INFINITE ARCHIVE EXPLORER",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Search through thousands of historical and procedurally generated challenges.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.padding(vertical = Spacing.xs)
                    )
                    
                    Spacer(modifier = Modifier.height(Spacing.s))

                    // Breadcrumb: shows where the user is in the archive and lets them step back up
                    // through their active filters with a single tap.
                    val prettyCat = selectedCategoryFilter
                        ?.replace('_', ' ')
                        ?.split(' ')
                        ?.joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
                    NumeraBreadcrumbs(
                        items = buildList {
                            val hasFilters = selectedCategoryFilter != null || selectedStarsFilter != null
                            add(Crumb("Archive", onClick = if (hasFilters) {
                                { selectedCategoryFilter = null; selectedStarsFilter = null }
                            } else null))
                            if (prettyCat != null) {
                                add(Crumb(prettyCat, onClick = if (selectedStarsFilter != null) {
                                    { selectedStarsFilter = null }
                                } else null))
                            }
                            if (selectedStarsFilter != null) add(Crumb("$selectedStarsFilter★"))
                        }
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    NumeraSearchField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = "Search the archive…"
                    )

                    Spacer(modifier = Modifier.height(Spacing.s))

                    // Smart filter chips: instant, persistent, visually unmistakable. The full filter
                    // set (topic + difficulty) also lives in a bottom sheet for focused control.
                    val categoryOptions: List<Pair<String?, String>> = listOf(
                        null to "All Topics",
                        "arithmetic" to "Arithmetic",
                        "mental" to "Mental Math",
                        "algebra" to "Algebra",
                        "calculus" to "Calculus",
                        "combinatorics" to "Combinatorics",
                        "number_theory" to "Number Theory"
                    )
                    val starOptions: List<Pair<Int?, String>> =
                        listOf<Pair<Int?, String>>(null to "All Ratings") + (1..5).map { it to "⭐ $it" }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        NumeraFilterChip(
                            label = "Filters",
                            selected = selectedCategoryFilter != null || selectedStarsFilter != null,
                            leadingIcon = NumeraIconType.Settings,
                            onClick = { showArchiveFilterSheet = true }
                        )
                        Box(modifier = Modifier.weight(1f)) {
                            NumeraFilterRow(
                                options = categoryOptions,
                                selected = selectedCategoryFilter,
                                onSelect = { selectedCategoryFilter = it }
                            )
                        }
                    }

                    if (showArchiveFilterSheet) {
                        NumeraBottomSheet(
                            onDismiss = { showArchiveFilterSheet = false },
                            title = "Filter the archive",
                            subtitle = "Narrow thousands of challenges down to exactly what you want to practice."
                        ) {
                            SheetSectionLabel("Topic")
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                            ) {
                                categoryOptions.forEach { (value, label) ->
                                    NumeraFilterChip(
                                        label = label,
                                        selected = value == selectedCategoryFilter,
                                        onClick = { selectedCategoryFilter = value }
                                    )
                                }
                            }
                            // Progressive disclosure: most learners just pick a topic; difficulty
                            // filtering stays tucked away until a power user opens it.
                            DisclosureSection(
                                title = "Difficulty",
                                subtitle = "Filter by star rating",
                                persistKey = "archive_difficulty_disclosure",
                                initiallyExpanded = selectedStarsFilter != null
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .horizontalScroll(rememberScrollState()),
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                ) {
                                    starOptions.forEach { (value, label) ->
                                        NumeraFilterChip(
                                            label = label,
                                            selected = value == selectedStarsFilter,
                                            onClick = { selectedStarsFilter = value }
                                        )
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(Spacing.m))
                            DuoButton(
                                text = "Show results",
                                onClick = { showArchiveFilterSheet = false },
                                modifier = Modifier.fillMaxWidth()
                            )
                            if (selectedCategoryFilter != null || selectedStarsFilter != null) {
                                Spacer(modifier = Modifier.height(Spacing.s))
                                Text(
                                    text = "Clear all filters",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(CornerRadius.m))
                                        .clickable {
                                            selectedCategoryFilter = null
                                            selectedStarsFilter = null
                                        }
                                        .padding(vertical = 10.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(Spacing.m))
                    
                    if (isArchiveLoading) {
                        SkeletonList(
                            count = 5,
                            modifier = Modifier.fillMaxWidth().weight(1f).padding(top = Spacing.l)
                        ) {
                            ArchiveRowSkeleton()
                        }
                    } else if (archiveResults.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            contentAlignment = Alignment.Center
                        ) {
                            NumeraEmptyState(
                                illustration = EmptyIllustration.Search,
                                title = "Nothing matches that yet",
                                message = "Try a different keyword, or clear your filters to explore the whole archive.",
                                ctaLabel = if (searchQuery.isNotBlank() || selectedCategoryFilter != null || selectedStarsFilter != null) "Clear filters" else null,
                                onCta = {
                                    searchQuery = ""
                                    selectedCategoryFilter = null
                                    selectedStarsFilter = null
                                }
                            )
                        }
                    } else {
                        rememberInfiniteScroll(
                            listState = archiveListState,
                            enabled = archiveHasMore,
                            onLoadMore = loadMoreArchive
                        )
                        LazyColumn(
                            state = archiveListState,
                            modifier = Modifier.fillMaxWidth().weight(1f),
                            verticalArrangement = Arrangement.spacedBy(Spacing.l)
                        ) {
                            items(archiveResults, key = { it.id }) { item ->
                                ContextMenuArea(
                                    actions = listOf(
                                        ContextAction("Preview", NumeraIconType.Search) { archivePreviewItem = item },
                                        ContextAction("Solve problem", NumeraIconType.Check) { launchArchiveItem(item) }
                                    ),
                                    onClick = { archivePreviewItem = item }
                                ) {
                                DuoCard(
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(
                                        modifier = Modifier.padding(Spacing.m),
                                        verticalArrangement = Arrangement.spacedBy(Spacing.s)
                                    ) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 16.sp,
                                                modifier = Modifier.weight(1f)
                                            )
                                            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                                repeat(5) { starIdx ->
                                                    Text(
                                                        text = if (starIdx < item.stars) "⭐" else "☆",
                                                        fontSize = 12.sp
                                                    )
                                                }
                                            }
                                        }
                                        
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Badge(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f)) {
                                                Text(
                                                    text = item.category.uppercase(),
                                                    color = MaterialTheme.colorScheme.secondary,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 10.sp,
                                                    modifier = Modifier.padding(horizontal = Spacing.xs, vertical = 2.dp)
                                                )
                                            }
                                            Text(
                                                text = "Source: ${item.source}",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        
                                        // Render LaTeX so archive questions show real math, not raw
                                        // "$...$ / \times" source (this card previously used a plain Text).
                                        MathText(
                                            text = item.question,
                                            fontSizePx = 26,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                        
                                        Box(modifier = Modifier.align(Alignment.End)) {
                                            DuoButton(
                                                text = "Solve Problem",
                                                onClick = { launchArchiveItem(item) }
                                            )
                                        }
                                    }
                                }
                                }
                            }
                            item {
                                LoadMoreFooter(isLoading = isArchiveLoadingMore)
                            }
                        }
                    }
                }
            }
        }
    }

    // Quick preview: peek the problem (and its difficulty/topic) before committing to solve it.
    archivePreviewItem?.let { item ->
        NumeraQuickPreview(
            onDismiss = { archivePreviewItem = null },
            title = item.title,
            subtitle = "${item.category.replace('_', ' ').replaceFirstChar { it.uppercase() }} · ${"⭐".repeat(item.stars)}",
            primaryLabel = "Solve Problem",
            onPrimary = { launchArchiveItem(item) }
        ) {
            MathText(
                text = item.question,
                fontSizePx = 28,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth()
            )
            if (item.lessonTitle != null) {
                Text(
                    text = "Concept: ${item.lessonTitle}",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
        }
    }

    if (activeDebriefLevel != null && activeDebriefCategory != null) {
        LevelDebriefDialog(
            levelNum = activeDebriefLevel!!,
            category = activeDebriefCategory!!,
            onDismissRequest = {
                activeDebriefLevel = null
                activeDebriefCategory = null
            },
            onStartLesson = {
                onStartSoloGame(
                    SoloGame(
                        category = activeDebriefCategory!!,
                        level = activeDebriefLevel!!,
                        gameMode = "level"
                    )
                )
            }
        )
    }
}
}
