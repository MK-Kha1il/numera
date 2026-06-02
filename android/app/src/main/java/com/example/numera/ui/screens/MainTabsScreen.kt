package com.example.numera.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.TextStyle
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import android.content.Context
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.numera.data.network.*
import com.example.numera.SoloGame
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.feature.arena.ArenaScreen
import com.example.numera.ui.feature.dashboard.DashboardScreen
import com.example.numera.ui.feature.settings.SettingsScreen
import com.example.numera.ui.feature.shop.ShopScreen
import com.example.numera.ui.dialogs.LevelDebriefDialog
import com.example.numera.ui.dialogs.CommitmentStatusDialog
import com.example.numera.ui.dialogs.NotificationsDialog
import com.example.numera.ui.components.MathAvatars
import com.example.numera.ui.components.MathBanners
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.rememberDrawableResource
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.GlassCard
import com.example.numera.ui.components.NeonButton
import com.example.numera.ui.components.NeonText
import com.example.numera.ui.components.ClaimButton
import com.example.numera.ui.components.GlossyProgressBar
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraSkeletonCard
import com.example.numera.ui.components.MathText
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.CommitmentRelicIcon
import com.example.numera.ui.components.ToastController
import com.example.numera.ui.components.ToastType
import com.example.numera.ui.components.LocalToast
import com.example.numera.ui.components.NumeraToastHost
import com.example.numera.ui.components.rememberToastController
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.NumeraSearchField
import com.example.numera.ui.components.rememberDebouncedValue
import com.example.numera.ui.components.rememberInfiniteScroll
import com.example.numera.ui.components.rememberRevealWindow
import com.example.numera.ui.components.LoadMoreFooter
import com.example.numera.ui.components.runOptimistic
import com.example.numera.ui.components.ArchiveRowSkeleton
import com.example.numera.ui.components.LeaderboardRowSkeleton
import com.example.numera.ui.components.NotificationSkeleton
import com.example.numera.ui.components.ShopItemSkeleton
import com.example.numera.ui.components.AchievementSkeleton
import com.example.numera.ui.components.LessonCardSkeleton
import com.example.numera.ui.components.SkeletonList
import com.example.numera.ui.components.SkeletonLine
import com.example.numera.ui.components.CommandPaletteController
import com.example.numera.ui.components.CommandPaletteHost
import com.example.numera.ui.components.CommandItem
import com.example.numera.ui.components.CommandCategory
import com.example.numera.ui.components.LocalCommandPalette
import com.example.numera.ui.components.rememberCommandPaletteController
import com.example.numera.ui.components.NumeraBreadcrumbs
import com.example.numera.ui.components.Crumb
import com.example.numera.ui.components.NumeraFilterRow
import com.example.numera.ui.components.NumeraFilterChip
import com.example.numera.ui.components.NumeraBottomSheet
import com.example.numera.ui.components.SheetActionRow
import com.example.numera.ui.components.SheetSectionLabel
import com.example.numera.ui.components.ContextMenuArea
import com.example.numera.ui.components.ContextAction
import com.example.numera.ui.components.NumeraQuickPreview
import com.example.numera.ui.components.QuickActionsBar
import com.example.numera.ui.components.QuickAction
import com.example.numera.ui.components.DisclosureSection
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.async
import org.json.JSONObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainTabsScreen(
    onStartSoloGame: (SoloGame) -> Unit,
    onStartDuelGame: (String, String) -> Unit,
    onStartLegacyGame: (Int) -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    var previousTab by remember { mutableStateOf(0) }
    var currentUser by remember { mutableStateOf<User?>(null) }
    val scope = rememberCoroutineScope()
    var isTakingPlacementTest by remember { mutableStateOf(false) }
    var activeProfileDialogUserId by remember { mutableStateOf<Int?>(null) }
    var activeProfileData by remember { mutableStateOf<PublicProfile?>(null) }
    var profileLoading by remember { mutableStateOf(false) }
    var showCommitmentDialog by remember { mutableStateOf(false) }
    var unlockedRelicIds by remember { mutableStateOf<Set<String>>(emptySet()) }

    var unreadNotificationsCount by remember { mutableStateOf(0) }
    var notificationsList by remember { mutableStateOf<List<NotificationItemDto>>(emptyList()) }
    var showNotificationsDialog by remember { mutableStateOf(false) }
    var showMapTooltip by remember { mutableStateOf(false) }
    val context = androidx.compose.ui.platform.LocalContext.current

    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        showMapTooltip = prefs.getBoolean("show_map_tooltip_v1", true)
    }

    LaunchedEffect(activeProfileDialogUserId) {
        val id = activeProfileDialogUserId
        if (id != null) {
            profileLoading = true
            try {
                val token = RetrofitClient.authToken ?: ""
                val res = RetrofitClient.apiService.getUserProfile(token, id)
                activeProfileData = res
            } catch (e: Exception) {
                Log.e("MainTabsScreen", "Failed to fetch user profile: ${e.message}")
            } finally {
                profileLoading = false
            }
        } else {
            activeProfileData = null
        }
    }

    // Fetch user profile on start & refresh
    val refreshProfile = {
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                val user = RetrofitClient.apiService.getProfile(token)
                val commitment = try {
                    RetrofitClient.apiService.getCommitmentStatus(token)
                } catch (e: Exception) {
                    null
                }
                val notifs = try {
                    RetrofitClient.apiService.getNotifications(token)
                } catch (e: Exception) {
                    emptyList()
                }
                withContext(Dispatchers.Main) {
                    currentUser = user
                    ThemeManager.currentTheme = user.theme ?: "duolingo"
                    if (commitment != null) {
                        unlockedRelicIds = commitment.relics.map { it.relic_id }.toSet()
                    }
                    notificationsList = notifs
                    unreadNotificationsCount = notifs.count { it.read_state == 0 }
                }
            } catch (e: Exception) {
                Log.e("MainTabs", "Failed to fetch profile: ${e.message}, exception class: ${e.javaClass.name}")
                if (e is retrofit2.HttpException && (e.code() == 401 || e.code() == 403)) {
                    withContext(Dispatchers.Main) {
                        onLogout()
                    }
                }
            }
        }
    }

    if (isTakingPlacementTest) {
        NumeraTheme {
            PlacementTestScreen(
                apiService = RetrofitClient.apiService,
                token = RetrofitClient.authToken ?: "",
                onComplete = { lvl, rank ->
                    isTakingPlacementTest = false
                    refreshProfile()
                },
                onCancel = {
                    isTakingPlacementTest = false
                }
            )
        }
        return
    }

    LaunchedEffect(Unit) {
        refreshProfile()
        RetrofitClient.profileRefreshFlow.collect {
            refreshProfile()
        }
    }

    val toastController = rememberToastController()
    val commandPalette = rememberCommandPaletteController()

    // Switch top-level tab, remembering where we came from so the Settings back-arrow returns there.
    val goTab: (Int) -> Unit = { target ->
        if (selectedTab != 5) previousTab = selectedTab
        selectedTab = target
    }

    // The universal discovery surface: every section, the highest-intent actions, and settings are
    // all reachable from one search box. Content (lessons/exercises) is searched server-side below.
    val paletteCommands = remember(selectedTab) {
        listOf(
            CommandItem("Learn", CommandCategory.Navigate, NumeraIconType.Learn, "Level map & archive", "lessons home map levels") { goTab(0) },
            CommandItem("Arena", CommandCategory.Navigate, NumeraIconType.Arena, "Ranked & duels", "versus pvp ranked match") { goTab(1) },
            CommandItem("Quests", CommandCategory.Navigate, NumeraIconType.Quests, "Daily goals & dashboard", "home dashboard daily goals") { goTab(2) },
            CommandItem("Shop", CommandCategory.Navigate, NumeraIconType.Shop, "Avatars, banners & boosts", "store buy coins items") { goTab(3) },
            CommandItem("Profile", CommandCategory.Navigate, NumeraIconType.Profile, "Stats, collections & progress", "me account collections saved") { goTab(4) },
            CommandItem("Continue Learning", CommandCategory.QuickAction, NumeraIconType.Learn, "Jump back into the level map", "resume keep going practice") { goTab(0) },
            CommandItem("Daily Puzzle", CommandCategory.QuickAction, NumeraIconType.Calculator, "Today's bonus challenge", "puzzle daily bonus") {
                onStartSoloGame(SoloGame(category = "General", level = 0, gameMode = "daily_puzzle"))
            },
            CommandItem("Ranked Match", CommandCategory.QuickAction, NumeraIconType.Arena, "Find a live opponent", "duel versus pvp compete") { goTab(1) },
            CommandItem("Practice Mistakes", CommandCategory.QuickAction, NumeraIconType.Warning, "Review what you got wrong", "errors review redo srs") {
                onStartSoloGame(SoloGame(category = "General", level = 0, gameMode = "mistakes_practice"))
            },
            CommandItem("Notifications", CommandCategory.QuickAction, NumeraIconType.Notification, "See your latest activity", "alerts inbox bell") { showNotificationsDialog = true },
            CommandItem("Consistency Climb", CommandCategory.QuickAction, NumeraIconType.Streak, "Check your streak status", "streak commitment fire") { showCommitmentDialog = true },
            CommandItem("Settings", CommandCategory.Settings, NumeraIconType.Settings, "Themes, account & security", "preferences theme security notifications dark mode logout") { goTab(5) }
        )
    }

    // Debounced server-backed content search → launches the exercise straight from the palette.
    val paletteSearch: suspend (String) -> List<CommandItem> = remember {
        { q ->
            val token = RetrofitClient.authToken ?: ""
            val results = RetrofitClient.apiService.searchArchive(token, null, null, q, 8, 0)
            results.map { ex ->
                CommandItem(
                    title = ex.title,
                    category = CommandCategory.Exercises,
                    icon = NumeraIconType.Learn,
                    subtitle = ex.category,
                    keywords = ex.question
                ) {
                    onStartSoloGame(
                        SoloGame(
                            category = ex.category,
                            level = 0,
                            gameMode = "archive_puzzle",
                            title = ex.title,
                            question = ex.question,
                            correctAnswer = ex.correct_answer,
                            optionsJson = ex.options.joinToString("|||"),
                            explanation = ex.explanation,
                            lessonTitle = ex.lessonTitle,
                            lessonContent = ex.lessonContent,
                            lessonFormula = ex.lessonFormula,
                            examplesJson = ex.examples?.let { com.google.gson.Gson().toJson(it) }
                        )
                    )
                }
            }
        }
    }

    CompositionLocalProvider(
        LocalToast provides toastController,
        LocalCommandPalette provides commandPalette
    ) {
    Box(modifier = Modifier.fillMaxSize()) {
    Scaffold(
        topBar = {
            if (selectedTab == 5) {
                TopAppBar(
                    title = { Text("Settings", fontWeight = FontWeight.Bold) },
                    navigationIcon = {
                        IconButton(onClick = {
                            com.example.numera.haptic.HapticManager.playSoft()
                            selectedTab = previousTab
                        }) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Back,
                                tint = MaterialTheme.colorScheme.onBackground
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background
                    )
                )
            } else {
                TopAppBar(
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            // User Avatar
                            MathAvatar(
                                avatarKey = currentUser?.avatar,
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(CircleShape)
                                    .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f), CircleShape)
                            )
                            
                            Column {
                                Text(
                                    text = currentUser?.username ?: "Loading...",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                currentUser?.active_badge?.let {
                                    Text(
                                        text = it,
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.secondary,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }
                    },
                    actions = {
                        // Consistency Climb Pill
                        val climbState = currentUser?.commitment_state ?: "active"
                        val climbCount = currentUser?.streak ?: 0
                        val infiniteTransition = rememberInfiniteTransition(label = "ClimbPulse")
                        val fadeAlpha by if (climbState == "fading") {
                            infiniteTransition.animateFloat(
                                initialValue = 0.4f,
                                targetValue = 1.0f,
                                animationSpec = infiniteRepeatable(
                                    animation = tween(800, easing = LinearEasing),
                                    repeatMode = RepeatMode.Reverse
                                ),
                                label = "fadePulse"
                            )
                        } else {
                            remember { mutableStateOf(1.0f) }
                        }
                        
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .padding(end = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(
                                    when (climbState) {
                                        "fading" -> Color(0xFFFFEBEE).copy(alpha = fadeAlpha)
                                        "protected" -> Color(0xFFE3F2FD)
                                        else -> Color(0xFFFFFDF0)
                                    }
                                )
                                .border(
                                    1.dp,
                                    when (climbState) {
                                        "fading" -> Color(0xFFEF5350)
                                        "protected" -> Color(0xFF42A5F5)
                                        else -> Color(0xFFFFD700)
                                    },
                                    RoundedCornerShape(12.dp)
                                )
                                .clickable {
                                    com.example.numera.sound.SoundManager.playClick()
                                    com.example.numera.haptic.HapticManager.playSoft()
                                    showCommitmentDialog = true
                                }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = when (climbState) {
                                    "fading" -> "⚠️ Restore"
                                    "protected" -> "🛡️ Protected ($climbCount)"
                                    else -> "✨ $climbCount"
                                },
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = when (climbState) {
                                    "fading" -> Color(0xFFC62828)
                                    "protected" -> Color(0xFF1565C0)
                                    else -> Color(0xFF856404)
                                }
                            )
                        }

                        // Coins count pill
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .padding(end = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFFFFDF0))
                                .border(1.dp, Color(0xFFFFD700), RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "🪙 ${currentUser?.coins ?: 0}",
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = Color(0xFFC5A028)
                            )
                        }

                        // Level/XP Pill
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .padding(end = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFFF3FAF7))
                                .border(1.dp, Color(0xFF00C9A7), RoundedCornerShape(12.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = "⭐ Lvl ${currentUser?.level ?: 1}",
                                fontWeight = FontWeight.Black,
                                fontSize = 12.sp,
                                color = Color(0xFF009B81)
                            )
                        }

                        IconButton(onClick = { commandPalette.open() }) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Search,
                                tint = MaterialTheme.colorScheme.primary,
                                animate = false
                            )
                        }

                        IconButton(onClick = {
                            SoundManager.playClick()
                            com.example.numera.haptic.HapticManager.playSoft()
                            showNotificationsDialog = true
                        }) {
                            Box(modifier = Modifier.padding(4.dp)) {
                                com.example.numera.ui.components.NumeraIcon(
                                    type = com.example.numera.ui.components.NumeraIconType.Notification,
                                    tint = MaterialTheme.colorScheme.primary
                                )
                                if (unreadNotificationsCount > 0) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(WrongRed)
                                            .align(Alignment.TopEnd)
                                    )
                                }
                            }
                        }

                        IconButton(onClick = {
                            if (selectedTab != 5) {
                                previousTab = selectedTab
                            }
                            selectedTab = 5
                            SoundManager.playClick()
                            com.example.numera.haptic.HapticManager.playSoft()
                        }) {
                            com.example.numera.ui.components.NumeraIcon(
                                    type = com.example.numera.ui.components.NumeraIconType.Settings,
                                    tint = MaterialTheme.colorScheme.primary,
                                    animate = false
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.background
                    )
                )
            }
        },
        bottomBar = {
            if (selectedTab != 5) {
                NavigationBar(
                    containerColor = MaterialTheme.colorScheme.surface
                ) {
                    val items = listOf(
                        NavigationItem("Learn", com.example.numera.ui.components.NumeraIconType.Learn, 0),
                        NavigationItem("Arena", com.example.numera.ui.components.NumeraIconType.Arena, 1),
                        NavigationItem("Quests", com.example.numera.ui.components.NumeraIconType.Quests, 2),
                        NavigationItem("Shop", com.example.numera.ui.components.NumeraIconType.Shop, 3),
                        NavigationItem("Profile", com.example.numera.ui.components.NumeraIconType.Profile, 4)
                    )

                    items.forEach { item ->
                        NavigationBarItem(
                            selected = selectedTab == item.index,
                            onClick = {
                                SoundManager.playClick()
                                com.example.numera.haptic.HapticManager.playSoft()
                                selectedTab = item.index
                            },
                            icon = {
                                com.example.numera.ui.components.NumeraIcon(
                                    type = item.iconType,
                                    tint = if (selectedTab == item.index) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            },
                            label = { Text(item.label, fontSize = 11.sp) }
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
        ) {
            AnimatedContent(
                targetState = selectedTab,
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
                label = "MainTabsTransition"
            ) { targetTab ->
                when (targetTab) {
                    0 -> LevelMapScreen(
                        currentUser,
                        onStartSoloGame,
                        onStartLegacyGame,
                        onStartPlacement = { isTakingPlacementTest = true },
                        onSkipPlacement = {
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.skipAssessment(token)
                                    withContext(Dispatchers.Main) {
                                        refreshProfile()
                                    }
                                } catch (e: Exception) {
                                    Log.e("MainTabs", "Failed to skip placement: ${e.message}")
                                }
                            }
                        },
                        onShowCommitment = { showCommitmentDialog = true }
                    )
                    1 -> ArenaScreen(currentUser, onStartDuelGame)
                    2 -> DashboardScreen(
                        currentUser,
                        onRefreshProfile = { refreshProfile() },
                        onShowUserProfile = { activeProfileDialogUserId = it },
                        onNavigateTab = { goTab(it) },
                        onStartQuickGame = { onStartSoloGame(it) }
                    )
                    3 -> ShopScreen(currentUser, { refreshProfile() })
                    4 -> ProfileScreen(currentUser, onLogout, onRefreshProfile = { refreshProfile() }, onShowUserProfile = { activeProfileDialogUserId = it }, unlockedRelicIds = unlockedRelicIds)
                    5 -> SettingsScreen(
                        currentUser,
                        onLogout,
                        onRefreshProfile = { refreshProfile() },
                        onBack = { selectedTab = previousTab }
                    )
                }
            }
            if (activeProfileDialogUserId != null) {
                UserProfileDialog(
                    profile = activeProfileData,
                    isLoading = profileLoading,
                    onDismissRequest = { activeProfileDialogUserId = null }
                )
            }
            if (showCommitmentDialog) {
                CommitmentStatusDialog(
                    apiService = RetrofitClient.apiService,
                    token = RetrofitClient.authToken ?: "",
                    onDismissRequest = { showCommitmentDialog = false },
                    onRefreshProfile = { refreshProfile() }
                )
            }
            if (showNotificationsDialog) {
                NotificationsDialog(
                    notifications = notificationsList,
                    onDismissRequest = { showNotificationsDialog = false },
                    onMarkAllRead = {
                        // Optimistic: clear unread badges instantly, then confirm with the server.
                        notificationsList = notificationsList.map { if (it.read_state == 0) it.copy(read_state = 1) else it }
                        unreadNotificationsCount = 0
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.markNotificationsRead(token, MarkReadRequest(null))
                            } catch (e: Exception) {
                                Log.e("MainTabsScreen", "Failed to mark notifications read: ${e.message}")
                                // Recover: re-fetch the true state.
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    val updated = RetrofitClient.apiService.getNotifications(token)
                                    withContext(Dispatchers.Main) {
                                        notificationsList = updated
                                        unreadNotificationsCount = updated.count { it.read_state == 0 }
                                    }
                                } catch (_: Exception) {}
                            }
                        }
                    },
                    onMarkSingleRead = { id ->
                        // Optimistic: flip this one to read instantly, then confirm with the server.
                        notificationsList = notificationsList.map { if (it.id == id) it.copy(read_state = 1) else it }
                        unreadNotificationsCount = notificationsList.count { it.read_state == 0 }
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.markNotificationsRead(token, MarkReadRequest(id))
                            } catch (e: Exception) {
                                Log.e("MainTabsScreen", "Failed to mark single notification read: ${e.message}")
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    val updated = RetrofitClient.apiService.getNotifications(token)
                                    withContext(Dispatchers.Main) {
                                        notificationsList = updated
                                        unreadNotificationsCount = updated.count { it.read_state == 0 }
                                    }
                                } catch (_: Exception) {}
                            }
                        }
                    }
                )
            }
        }
    }
        NumeraToastHost(toastController)
        CommandPaletteHost(
            controller = commandPalette,
            staticCommands = paletteCommands,
            onSearch = paletteSearch
        )
    }
    }
}

data class NavigationItem(val label: String, val iconType: com.example.numera.ui.components.NumeraIconType, val index: Int)

// -------------------------------------------------------------
// 2. LEVEL MAP SCREEN
// -------------------------------------------------------------
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LevelMapScreen(
    user: User?,
    onStartSoloGame: (SoloGame) -> Unit,
    onStartLegacyGame: (Int) -> Unit,
    onStartPlacement: () -> Unit,
    onSkipPlacement: () -> Unit,
    onShowCommitment: () -> Unit
) {
    var selectedCategoryTab by remember { mutableStateOf(0) }
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
    LaunchedEffect(user, mapItems, dailyPuzzle, mistakesList, hasAutoScrolled) {
        if (user != null && mapItems.isNotEmpty() && !hasAutoScrolled) {
            val savedIdx = prefs.getInt("scroll_index", -1)
            if (savedIdx != -1) {
                hasAutoScrolled = true
            } else {
                val activeIdx = mapItems.indexOfFirst { it is LearnMapItem.LevelNodeItem && it.isActive }
                if (activeIdx != -1) {
                    var headerCount = 1
                    if (user.assessment_taken == 0) headerCount++
                    if (dailyPuzzle != null) headerCount++
                    if (mistakesList.isNotEmpty()) headerCount++
                    
                    val targetIndex = headerCount + activeIdx
                    val scrollTarget = (targetIndex - 1).coerceAtLeast(0)
                    lazyListState.scrollToItem(scrollTarget)
                    hasAutoScrolled = true
                }
            }
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
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .clickable { onShowCommitment() },
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3CD)),
                border = BorderStroke(1.dp, Color(0xFFFFEBAA)),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("⚠️", fontSize = 20.sp)
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Your climb is fading",
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF856404),
                            fontSize = 13.sp
                        )
                        Text(
                            text = "A small step keeps the climb alive. Restore your consistency run now.",
                            color = Color(0xFF856404).copy(alpha = 0.8f),
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = { onShowCommitment() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF856404)),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
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
                Text("Levels", modifier = Modifier.padding(16.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = selectedCategoryTab == 1, onClick = { selectedCategoryTab = 1 }) {
                Box {
                    Text("Spaced Review", modifier = Modifier.padding(16.dp), fontWeight = FontWeight.Bold)
                    if (srsDueItems.isNotEmpty()) {
                        Badge(modifier = Modifier.align(Alignment.TopEnd).offset(x = 10.dp, y = 8.dp)) {
                            Text(srsDueItems.size.toString())
                        }
                    }
                }
            }
            Tab(selected = selectedCategoryTab == 2, onClick = { selectedCategoryTab = 2 }) {
                Text("Archive Explorer", modifier = Modifier.padding(16.dp), fontWeight = FontWeight.Bold)
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
                            .padding(16.dp),
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
                            modifier = Modifier.padding(vertical = 4.dp)
                        )
                    }

                    if (user?.assessment_taken == 0) {
                        if (showPlacementTooltip) {
                            item {
                                Card(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 8.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.4f)
                                    ),
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.secondary.copy(alpha = 0.3f))
                                ) {
                                    Row(
                                        modifier = Modifier.padding(12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Close,
                                                contentDescription = "Dismiss",
                                                modifier = Modifier.size(16.dp),
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
                                    .padding(bottom = 8.dp),
                                borderColor = MaterialTheme.colorScheme.secondary
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
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
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Button(
                                            onClick = onStartPlacement,
                                            modifier = Modifier.weight(1.5f),
                                            shape = RoundedCornerShape(12.dp)
                                        ) {
                                            Text("Take 10-Min Test", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                        OutlinedButton(
                                            onClick = onSkipPlacement,
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(12.dp)
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
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
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
                                    DuoButton(
                                        text = "Train",
                                        onClick = {
                                            onStartSoloGame(
                                                SoloGame(
                                                    category = "General",
                                                    level = 0,
                                                    gameMode = "mistakes_practice"
                                                )
                                            )
                                        },
                                        modifier = Modifier.width(90.dp),
                                        color = Color(0xFF6366F1)
                                    )
                                }
                            }
                        }
                    }

                    // Render dynamic sequential levels
                    items(mapItems) { item ->
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
                                                        width = with(density) { 8.dp.toPx() },
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
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
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
                            modifier = Modifier.padding(vertical = 4.dp)
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
                        items(srsDueItems) { item ->
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
                                        .padding(8.dp),
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
                        .padding(16.dp)
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
                        modifier = Modifier.padding(vertical = 4.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))

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

                    Spacer(modifier = Modifier.height(8.dp))

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
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
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
                            Spacer(modifier = Modifier.height(12.dp))
                            DuoButton(
                                text = "Show results",
                                onClick = { showArchiveFilterSheet = false },
                                modifier = Modifier.fillMaxWidth()
                            )
                            if (selectedCategoryFilter != null || selectedStarsFilter != null) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Clear all filters",
                                    color = MaterialTheme.colorScheme.primary,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(12.dp))
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

                    Spacer(modifier = Modifier.height(12.dp))
                    
                    if (isArchiveLoading) {
                        SkeletonList(
                            count = 5,
                            modifier = Modifier.fillMaxWidth().weight(1f).padding(top = 16.dp)
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
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            items(archiveResults) { item ->
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
                                        modifier = Modifier.padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
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
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Badge(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.15f)) {
                                                Text(
                                                    text = item.category.uppercase(),
                                                    color = MaterialTheme.colorScheme.secondary,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 10.sp,
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                                )
                                            }
                                            Text(
                                                text = "Source: ${item.source}",
                                                fontSize = 11.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                        
                                        Text(
                                            text = item.question,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface,
                                            maxLines = 3,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
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
            Text(
                text = item.question,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
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

// -------------------------------------------------------------
// 5. DETAILED PROFILE SCREEN
// -------------------------------------------------------------
@Composable
fun MasteryBar(
    topicName: String,
    correctCount: Int,
    maxCount: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    val targetProgress = if (maxCount > 0) (correctCount.toFloat() / maxCount.toFloat()).coerceIn(0f, 1f) else 0f
    var animProgress by remember { mutableStateOf(0f) }
    LaunchedEffect(targetProgress) {
        animProgress = targetProgress
    }
    val progress by animateFloatAsState(
        targetValue = animProgress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "MasteryBarProgress"
    )
    
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = topicName,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "$correctCount / $maxCount solved",
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        
        Spacer(modifier = Modifier.height(6.dp))
        
        val height = 14.dp
        val shape = RoundedCornerShape(8.dp)
        
        val shadowColor = Color(
            red = (WrongRed.red * 0.7f).coerceIn(0f, 1f),
            green = (color.green * 0.7f).coerceIn(0f, 1f),
            blue = (color.blue * 0.7f).coerceIn(0f, 1f),
            alpha = color.alpha
        )
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(height + 4.dp)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .align(Alignment.BottomStart)
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            )
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .align(Alignment.TopStart)
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            )
            
            if (progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(height)
                        .align(Alignment.BottomStart)
                        .clip(shape)
                        .background(shadowColor)
                )
                
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(height)
                        .align(Alignment.TopStart)
                        .clip(shape)
                        .background(color)
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    user: User?,
    onLogout: () -> Unit,
    onRefreshProfile: () -> Unit,
    onShowUserProfile: (Int) -> Unit,
    unlockedRelicIds: Set<String>
) {
    val scope = rememberCoroutineScope()
    val toast = LocalToast.current

    var shopData by remember { mutableStateOf<ShopResponse?>(null) }
    var inventoryLoading by remember { mutableStateOf(true) }
    var equipStatusMsg by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val token = RetrofitClient.authToken ?: ""
            shopData = RetrofitClient.apiService.getShop(token)
        } catch (e: Exception) {
            Log.e("ProfileInventory", "Failed to fetch shop: ${e.message}")
        } finally {
            inventoryLoading = false
        }
    }
    
    var achievementsList by remember { mutableStateOf<List<Achievement>>(emptyList()) }
    var activityDays by remember { mutableStateOf<List<ActivityDay>>(emptyList()) }
    var activityLoading by remember { mutableStateOf(false) }
    
    // Sub-tab selection state inside ProfileScreen
    var selectedSubTab by remember { mutableStateOf(0) } // 0: Stats & Customize, 1: Achievements, 2: Friends, 3: Saved
    var selectedCategoryTab by remember { mutableStateOf("Persistence") }

    // Favorites and Collections states
    var favoritesList by remember { mutableStateOf<List<ArchiveExercise>>(emptyList()) }
    var collectionsList by remember { mutableStateOf<List<SavedCollection>>(emptyList()) }
    var favoritesLoading by remember { mutableStateOf(false) }

    // Dialog states for Saved/Collections
    var showCreateCollectionDialog by remember { mutableStateOf(false) }
    var newCollectionName by remember { mutableStateOf("") }
    var isNewCollectionPublic by remember { mutableStateOf(false) }

    var collectionToRename by remember { mutableStateOf<SavedCollection?>(null) }
    var renameCollectionName by remember { mutableStateOf("") }
    var renameCollectionPublic by remember { mutableStateOf(false) }

    var collectionToDelete by remember { mutableStateOf<SavedCollection?>(null) }

    var exerciseToAssign by remember { mutableStateOf<ArchiveExercise?>(null) }
    var selectedCollectionFilterId by remember { mutableStateOf<Int?>(null) } // null = All
    var exerciseToShowExplanation by remember { mutableStateOf<ArchiveExercise?>(null) }

    val fetchFavoritesAndCollections = {
        scope.launch(Dispatchers.IO) {
            try {
                favoritesLoading = true
                val token = RetrofitClient.authToken ?: ""
                val favs = RetrofitClient.apiService.getFavorites(token)
                val colls = RetrofitClient.apiService.getCollections(token)
                withContext(Dispatchers.Main) {
                    favoritesList = favs
                    collectionsList = colls
                }
            } catch (e: Exception) {
                Log.e("Profile", "Failed to fetch favorites/collections: ${e.message}")
            } finally {
                favoritesLoading = false
            }
        }
    }
    
    val fetchAchievements = {
        scope.launch(Dispatchers.IO) {
            try {
                val list = RetrofitClient.apiService.getAchievements(RetrofitClient.authToken ?: "")
                withContext(Dispatchers.Main) {
                    achievementsList = list
                }
            } catch (e: Exception) {
                Log.e("Profile", "Achievements fetch err: ${e.message}")
            }
        }
    }

    val fetchActivityHistory = {
        scope.launch(Dispatchers.IO) {
            try {
                activityLoading = true
                val token = RetrofitClient.authToken ?: ""
                val res = RetrofitClient.apiService.getCommitmentStatus(token)
                withContext(Dispatchers.Main) {
                    activityDays = res.activityHistory ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e("Profile", "Failed to fetch activity history: ${e.message}")
            } finally {
                activityLoading = false
            }
        }
    }
    
    LaunchedEffect(Unit) {
        fetchAchievements()
        fetchActivityHistory()
        fetchFavoritesAndCollections()
    }
    
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
    ) {
        // Banner & Avatar Box
        Box(modifier = Modifier.fillMaxWidth().height(180.dp)) {
            ProfileBanner(
                bannerKey = user?.active_banner,
                modifier = Modifier.fillMaxWidth().height(140.dp)
            )
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 24.dp)
                    .size(88.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surface)
                    .border(3.dp, MaterialTheme.colorScheme.primary, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                MathAvatar(
                    avatarKey = user?.avatar,
                    modifier = Modifier.fillMaxSize(),
                    fontSize = 46.sp
                )
            }
        }

        // User info details
        Text(
            text = user?.username ?: "Math Explorer",
            fontSize = 26.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp)
        )
        Text(
            text = user?.active_badge ?: "Apprentice Solver",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.padding(horizontal = 24.dp)
        )

        Spacer(modifier = Modifier.height(12.dp))

        TabRow(
            selectedTabIndex = selectedSubTab,
            containerColor = MaterialTheme.colorScheme.background,
            contentColor = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
        ) {
            Tab(selected = selectedSubTab == 0, onClick = { selectedSubTab = 0 }) {
                Text("Stats", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = selectedSubTab == 1, onClick = { selectedSubTab = 1 }) {
                Text("Achievements", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = selectedSubTab == 2, onClick = { selectedSubTab = 2 }) {
                Text("Friends", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = selectedSubTab == 3, onClick = { selectedSubTab = 3 }) {
                Text("Saved", modifier = Modifier.padding(vertical = 12.dp), fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (selectedSubTab == 0) {
            // Progress Stats Grid (2x2)
            Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("⭐ XP Gained", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${user?.xp ?: 0}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🏆 Math Rank", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        RankBadge(
                            rankName = user?.rank ?: "Bronze III",
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = user?.rank ?: "Bronze III",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("✨ Climb Run", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${user?.streak ?: 0} Days", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Max climb: ${user?.max_streak ?: 0}d", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontWeight = FontWeight.Medium)
                }
            }
            Card(
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("🪙 Coins & Habits", fontSize = 11.sp, color = MaterialTheme.colorScheme.secondary, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("${user?.coins ?: 0}", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Text("Consistency: ${((user?.consistency_index ?: 0f) * 100).toInt()}%", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontWeight = FontWeight.Medium)
                }
            }
        }

        // ── INVENTORY CUSTOMIZER ──
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("🎒", fontSize = 20.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Inventory & Customizer", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                }
                Text("Equip your owned avatars, banners, and badges.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Spacer(modifier = Modifier.height(12.dp))

                if (inventoryLoading) {
                    Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                        com.example.numera.ui.components.MathIconSpinner(modifier = Modifier.size(40.dp))
                    }
                } else {
                    val ownedIds = shopData?.inventory ?: emptyList()
                    val allItems = shopData?.items ?: emptyList()
                    val ownedItems = allItems.filter { it.id in ownedIds }

                    if (ownedItems.isEmpty()) {
                        Text("No items in inventory yet. Visit the Shop to purchase!", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    } else {
                        // ── Owned Avatars ──
                        val ownedAvatars = ownedItems.filter { it.type == "avatar" }
                        if (ownedAvatars.isNotEmpty()) {
                            Text("Avatars", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                ownedAvatars.forEach { item ->
                                    val isEquipped = user?.avatar == item.value
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier
                                            .width(72.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .border(
                                                2.dp,
                                                if (isEquipped) MaterialTheme.colorScheme.primary else Color.Transparent,
                                                RoundedCornerShape(12.dp)
                                            )
                                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))
                                            .clickable {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                scope.launch(Dispatchers.IO) {
                                                    try {
                                                        val token = RetrofitClient.authToken ?: ""
                                                        RetrofitClient.apiService.equipItem(token, EquipRequest("avatar", item.value))
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Equipped ${item.name}!"
                                                            toast.success("Equipped ${item.name}!")
                                                            onRefreshProfile()
                                                        }
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Error equipping avatar"
                                                        }
                                                    }
                                                }
                                            }
                                            .padding(8.dp)
                                    ) {
                                        MathAvatar(avatarKey = item.value, modifier = Modifier.size(40.dp), fontSize = 24.sp)
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = item.name.replace(" Avatar", ""),
                                            fontSize = 9.sp,
                                            fontWeight = if (isEquipped) FontWeight.ExtraBold else FontWeight.Medium,
                                            textAlign = TextAlign.Center,
                                            color = if (isEquipped) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                            maxLines = 1
                                        )
                                        if (isEquipped) {
                                            Text("Active", fontSize = 8.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // ── Owned Banners ──
                        val ownedBanners = ownedItems.filter { it.type == "banner" }
                        if (ownedBanners.isNotEmpty()) {
                            Text("Banners", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                            Spacer(modifier = Modifier.height(6.dp))
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                ownedBanners.forEach { item ->
                                    val isEquipped = user?.active_banner == item.value
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .border(
                                                2.dp,
                                                if (isEquipped) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                                                RoundedCornerShape(12.dp)
                                            )
                                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))
                                            .clickable {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                scope.launch(Dispatchers.IO) {
                                                    try {
                                                        val token = RetrofitClient.authToken ?: ""
                                                        RetrofitClient.apiService.equipItem(token, EquipRequest("banner", item.value))
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Equipped ${item.name}!"
                                                            toast.success("Equipped ${item.name}!")
                                                            onRefreshProfile()
                                                        }
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Error equipping banner"
                                                        }
                                                    }
                                                }
                                            },
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        ProfileBanner(bannerKey = item.value, modifier = Modifier.width(80.dp).height(40.dp))
                                        Spacer(modifier = Modifier.width(10.dp))
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                        }
                                        if (isEquipped) {
                                            Text("Active ✓", fontSize = 11.sp, color = CorrectGreen, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 12.dp))
                                        } else {
                                            Text("Equip", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(end = 12.dp))
                                        }
                                    }
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // ── Owned Badges ──
                        val ownedBadges = ownedItems.filter { it.type == "badge" }
                        if (ownedBadges.isNotEmpty()) {
                            Text("Badges", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                ownedBadges.forEach { item ->
                                    val isEquipped = user?.active_badge == item.value
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(12.dp))
                                            .border(
                                                2.dp,
                                                if (isEquipped) MaterialTheme.colorScheme.primary else Color.Transparent,
                                                RoundedCornerShape(12.dp)
                                            )
                                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.5f))
                                            .clickable {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                scope.launch(Dispatchers.IO) {
                                                    try {
                                                        val token = RetrofitClient.authToken ?: ""
                                                        RetrofitClient.apiService.equipItem(token, EquipRequest("badge", item.value))
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Equipped ${item.name}!"
                                                            toast.success("Equipped ${item.name}!")
                                                            onRefreshProfile()
                                                        }
                                                    } catch (e: Exception) {
                                                        withContext(Dispatchers.Main) {
                                                            equipStatusMsg = "Error equipping badge"
                                                        }
                                                    }
                                                }
                                            }
                                            .padding(horizontal = 14.dp, vertical = 10.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Text("🏅", fontSize = 22.sp)
                                            Text(
                                                text = item.name.replace(" Badge", ""),
                                                fontSize = 10.sp,
                                                fontWeight = if (isEquipped) FontWeight.ExtraBold else FontWeight.Medium,
                                                color = if (isEquipped) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                            )
                                            if (isEquipped) {
                                                Text("Active", fontSize = 8.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        equipStatusMsg?.let { msg ->
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(msg, color = CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        var selectedRelicDetail by remember { mutableStateOf<Pair<String, String>?>(null) }

        // Commitment Archive Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Commitment Archive",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "A collection of milestones proving consistency, discipline, and personal growth.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
                )

                val relicsList = listOf(
                    Triple("relic_spark", "Spark Sigil", "Unlocked by keeping your promise for 3 consecutive days."),
                    Triple("relic_rhythm", "Rhythm Emblem", "Unlocked by keeping your promise for 7 consecutive days."),
                    Triple("relic_dedication", "Dedication Relic", "Unlocked by keeping your promise for 30 consecutive days."),
                    Triple("relic_sage", "Sage Sigil", "Unlocked by keeping your promise for 100 consecutive days."),
                    Triple("relic_comeback", "Resilience Medal", "Unlocked by successfully recovering your climb through a Recommit Challenge."),
                    Triple("relic_burnout_shield", "Calm Balance Emblem", "Unlocked by balancing your session intensity and preventing burnout.")
                )

                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    for (row in 0 until 2) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceAround
                        ) {
                            for (col in 0 until 3) {
                                val idx = row * 3 + col
                                if (idx < relicsList.size) {
                                    val relic = relicsList[idx]
                                    val isUnlocked = unlockedRelicIds.contains(relic.first)
                                    Column(
                                        horizontalAlignment = Alignment.CenterHorizontally,
                                        modifier = Modifier
                                            .width(90.dp)
                                            .clickable {
                                                com.example.numera.sound.SoundManager.playClick()
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                selectedRelicDetail = Pair(relic.second, relic.third + (if (isUnlocked) "\n\nStatus: Unlocked!" else "\n\nStatus: Locked"))
                                            }
                                            .padding(4.dp)
                                    ) {
                                        CommitmentRelicIcon(
                                            relicId = relic.first,
                                            modifier = Modifier.size(44.dp),
                                            grayscale = !isUnlocked
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = relic.second,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            textAlign = TextAlign.Center,
                                            color = if (isUnlocked) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (selectedRelicDetail != null) {
            AlertDialog(
                onDismissRequest = { selectedRelicDetail = null },
                title = { Text(selectedRelicDetail!!.first, fontWeight = FontWeight.Bold) },
                text = { Text(selectedRelicDetail!!.second, fontSize = 14.sp) },
                confirmButton = {
                    TextButton(onClick = { selectedRelicDetail = null }) {
                        Text("Close")
                    }
                }
            )
        }

        if (activityLoading) {
            NumeraPremiumLoader(cardPadding = 16.dp)
        } else {
            WeeklyActivityChart(activityDays)
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Ranks Milestone Tracker Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Milestone Rank Rewards", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Text("Unlock premium mathematical avatars and custom banners by raising your skill rating.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Spacer(modifier = Modifier.height(12.dp))
                
                val milestones = listOf(
                    Triple("Bronze III", 1, "Default Gradient"),
                    Triple("Silver III", 10, "🏺 Hypatia • 🌀 Golden Spiral"),
                    Triple("Gold III", 19, "🍎 Newton • 📐 Calculus Shimmer"),
                    Triple("Platinum III", 28, "💻 Lovelace • 👾 Matrix Rain"),
                    Triple("Diamond III", 37, "🧩 Euler • 📐 Geometry Blueprint"),
                    Triple("Master III", 46, "⚛️ Einstein • 🌌 Cosmic Constellation")
                )
                
                milestones.forEach { (rankName, reqLevel, rewardsStr) ->
                    val isUnlocked = (user?.level ?: 1) >= reqLevel
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        RankBadge(
                            rankName = rankName,
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .size(36.dp)
                        )
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = rankName,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = if (isUnlocked) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                            Text(
                                text = rewardsStr,
                                fontSize = 11.sp,
                                color = if (isUnlocked) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f).copy(alpha = 0.7f)
                            )
                        }
                        Text(
                            text = if (isUnlocked) "Unlocked ✓" else "Lvl $reqLevel Required",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isUnlocked) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
        } // End of selectedSubTab == 0

        if (selectedSubTab == 2) {
        // Friends List integration Card
        Card(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Social & Friends", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(10.dp))
                
                var searchUsername by remember { mutableStateOf("") }
                var friendsList by remember { mutableStateOf<List<Friend>>(emptyList()) }
                var statusMessage by remember { mutableStateOf<String?>(null) }
                var statusIsError by remember { mutableStateOf(false) }
                
                val fetchFriends = {
                    scope.launch(Dispatchers.IO) {
                        try {
                            val list = RetrofitClient.apiService.getFriends(RetrofitClient.authToken ?: "")
                            withContext(Dispatchers.Main) {
                                friendsList = list
                            }
                        } catch (e: Exception) {
                            Log.e("Social", "Friends list fetch err: ${e.message}")
                        }
                    }
                }
                
                LaunchedEffect(Unit) {
                    fetchFriends()
                }
                
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = searchUsername,
                        onValueChange = { searchUsername = it },
                        label = { Text("Friend's Username") },
                        singleLine = true,
                        modifier = Modifier.weight(1f)
                    )
                    Button(
                        onClick = {
                            if (searchUsername.isBlank()) return@Button
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    val res = RetrofitClient.apiService.requestFriend(
                                        token, FriendRequestPayload(searchUsername)
                                    )
                                    withContext(Dispatchers.Main) {
                                        statusMessage = res.message
                                        statusIsError = false
                                        searchUsername = ""
                                        fetchFriends()
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        statusMessage = "Not found or link exists."
                                        statusIsError = true
                                    }
                                }
                            }
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Add", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
                
                statusMessage?.let { msg ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = msg,
                        color = if (statusIsError) WrongRed else CorrectGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                
                Spacer(modifier = Modifier.height(12.dp))
                Text("Active Connections", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.height(6.dp))
                
                if (friendsList.isEmpty()) {
                    Text("No friends added yet.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        friendsList.forEach { friend ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                                    .clickable { onShowUserProfile(friend.id) }
                                    .padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.surface),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        MathAvatar(
                                            avatarKey = friend.avatar,
                                            modifier = Modifier.fillMaxSize(),
                                            fontSize = 20.sp
                                        )
                                    }
                                    Column {
                                        Text(friend.username, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                        Text("${friend.rank} (Lvl ${friend.level})", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                    }
                                }
                                
                                if (friend.status == "pending") {
                                    Button(
                                        onClick = {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    RetrofitClient.apiService.acceptFriend(
                                                        token, FriendAcceptPayload(friend.id)
                                                    )
                                                    withContext(Dispatchers.Main) {
                                                        fetchFriends()
                                                    }
                                                } catch (e: Exception) {
                                                    Log.e("Social", "Accept friend err: ${e.message}")
                                                }
                                            }
                                        },
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Accept", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                    }
                                } else {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(8.dp)
                                                .clip(CircleShape)
                                                .background(CorrectGreen)
                                        )
                                        Text("Active", fontSize = 11.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        } // End of selectedSubTab == 2

        if (selectedSubTab == 1) {
            // Redesigned progression-based Achievements framework
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Achievements Progression",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Complete milestone chains to unlock premium rewards and coins.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    // Categorized horizontal chips tab
                    val categories = listOf("Persistence", "Learning", "Accuracy", "Mastery", "Social", "Competitive", "Exploration", "Collection", "Seasonal")
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        categories.forEach { cat ->
                            val isSelected = selectedCategoryTab.lowercase() == cat.lowercase()
                            Card(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .border(
                                        1.5.dp,
                                        if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                        RoundedCornerShape(20.dp)
                                    )
                                    .clickable {
                                        selectedCategoryTab = cat
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent
                                )
                            ) {
                                Text(
                                    text = cat,
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 12.sp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    if (achievementsList.isEmpty()) {
                        SkeletonList(count = 4, modifier = Modifier.padding(vertical = 8.dp)) {
                            AchievementSkeleton()
                        }
                    } else {
                        val categoryAchievements = achievementsList.filter { 
                            it.category?.lowercase() == selectedCategoryTab.lowercase() 
                        }
                        
                        if (categoryAchievements.isEmpty()) {
                            Text(
                                text = "No milestones in this category.",
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                fontSize = 13.sp,
                                modifier = Modifier.padding(vertical = 12.dp)
                            )
                        } else {
                            val groupedChains = categoryAchievements.groupBy { it.chain_id ?: "default" }
                            
                            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                                groupedChains.forEach { (chainId, milestones) ->
                                    val sortedMilestones = milestones.sortedBy { it.chain_order ?: 0 }
                                    
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                        )
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Text(
                                                text = when (chainId) {
                                                    "streak" -> "Consistency Milestones"
                                                    "exercises" -> "Solved Exercises Milestones"
                                                    "perfect" -> "Perfect Session Milestones"
                                                    "mastery" -> "Category Mastery Milestones"
                                                    "friends" -> "Social Connections"
                                                    "arena" -> "Arena Victor Milestones"
                                                    "archive" -> "Archivist Explorations"
                                                    "items" -> "Collector Milestones"
                                                    "spring" -> "Spring Equinox Event"
                                                    "summer" -> "Summer Solstice Event"
                                                    "ultimate" -> "Ultimate Mystery Milestone"
                                                    "speed" -> "Velocity Demon"
                                                    else -> chainId.replace("_", " ").uppercase()
                                                },
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.secondary
                                            )
                                            Spacer(modifier = Modifier.height(10.dp))
                                            
                                            // Milestone timeline row visualization
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                sortedMilestones.forEachIndexed { index, milestone ->
                                                    // Completion = server's source of truth (completed_at). progress can fall
                                                    // back below target (e.g. a broken streak) while it stays claimable.
                                                    val isCompleted = milestone.completed_at > 0 || milestone.progress >= milestone.target_value
                                                    val isClaimed = milestone.claimed == 1
                                                    
                                                    // Determine timeline states:
                                                    // "claimed": already claimed
                                                    // "unclaimed": completed but not claimed yet
                                                    // "locked": preceding milestone(s) not claimed
                                                    // "active": currently active progress
                                                    
                                                    val precedingUnclaimed = sortedMilestones.take(index).any { it.claimed == 0 }
                                                    val state = when {
                                                        isClaimed -> "claimed"
                                                        isCompleted -> "unclaimed"
                                                        precedingUnclaimed -> "locked"
                                                        else -> "active"
                                                    }
                                                    
                                                    Box(
                                                        modifier = Modifier
                                                            .weight(1f)
                                                            .border(
                                                                1.dp,
                                                                when (state) {
                                                                    "claimed" -> CorrectGreen.copy(alpha = 0.45f)
                                                                    "active", "unclaimed" -> MaterialTheme.colorScheme.primary
                                                                    else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)
                                                                },
                                                                RoundedCornerShape(12.dp)
                                                            )
                                                            .background(
                                                                when (state) {
                                                                    "claimed" -> CorrectGreen.copy(alpha = 0.10f)
                                                                    "unclaimed" -> MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)
                                                                    else -> Color.Transparent
                                                                },
                                                                RoundedCornerShape(12.dp)
                                                            )
                                                            .padding(6.dp)
                                                    ) {
                                                        Column(
                                                            horizontalAlignment = Alignment.CenterHorizontally,
                                                            modifier = Modifier.fillMaxWidth(),
                                                            verticalArrangement = Arrangement.spacedBy(4.dp)
                                                        ) {
                                                            Box(modifier = Modifier.size(32.dp), contentAlignment = Alignment.Center) {
                                                                when (state) {
                                                                    "claimed" -> {
                                                                        Box(
                                                                            modifier = Modifier.size(22.dp).clip(CircleShape).background(CorrectGreen),
                                                                            contentAlignment = Alignment.Center
                                                                        ) {
                                                                            NumeraIcon(
                                                                                type = NumeraIconType.Check,
                                                                                tint = Color.White,
                                                                                animate = false,
                                                                                modifier = Modifier.size(14.dp)
                                                                            )
                                                                        }
                                                                    }
                                                                    "locked" -> {
                                                                        NumeraIcon(type = NumeraIconType.Lock, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f), animate = false, modifier = Modifier.size(16.dp))
                                                                    }
                                                                    else -> {
                                                                        AchievementBadge(achievementId = milestone.id, modifier = Modifier.fillMaxSize())
                                                                    }
                                                                }
                                                            }
                                                            
                                                            val isMasked = milestone.is_hidden == 1 && !isCompleted
                                                            Text(
                                                                text = if (isMasked) "???" else milestone.name,
                                                                fontSize = 10.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                textAlign = TextAlign.Center,
                                                                maxLines = 1,
                                                                color = if (state == "locked") MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f) else MaterialTheme.colorScheme.onSurface
                                                            )
                                                            
                                                            if (state == "active") {
                                                                Text(
                                                                    text = "${milestone.progress}/${milestone.target_value}",
                                                                    fontSize = 9.sp,
                                                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                                                    fontWeight = FontWeight.SemiBold
                                                                )

                                                                // Custom progress bar
                                                                Box(
                                                                    modifier = Modifier
                                                                        .fillMaxWidth()
                                                                        .height(5.dp)
                                                                        .clip(RoundedCornerShape(3.dp))
                                                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                                                ) {
                                                                    Box(
                                                                        modifier = Modifier
                                                                            .fillMaxHeight()
                                                                            .fillMaxWidth(fraction = (milestone.progress.toFloat() / milestone.target_value.toFloat()).coerceIn(0f, 1f))
                                                                            .background(MaterialTheme.colorScheme.primary)
                                                                    )
                                                                }
                                                            } else if (state == "claimed") {
                                                                Text("Claimed", fontSize = 9.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                                                            } else if (state == "unclaimed") {
                                                                Text("Ready!", fontSize = 9.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                                            } else {
                                                                Text("Locked", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                                            }
                                                            
                                                            if (state == "unclaimed") {
                                                                Spacer(modifier = Modifier.height(2.dp))
                                                                ClaimButton(
                                                                    onClick = {
                                                                        scope.launch(Dispatchers.IO) {
                                                                            try {
                                                                                val token = RetrofitClient.authToken ?: ""
                                                                                val res = RetrofitClient.apiService.claimAchievement(
                                                                                    token, AchievementClaimRequest(milestone.id)
                                                                                )
                                                                                withContext(Dispatchers.Main) {
                                                                                    SoundManager.playRewardClaim()
                                                                                    toast.achievement("Milestone reward claimed!")
                                                                                    onRefreshProfile()
                                                                                    fetchAchievements()
                                                                                }
                                                                            } catch (e: Exception) {
                                                                                Log.e("Profile", "Claim achievement error: ${e.message}")
                                                                            }
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
                            }
                        }
                    }
                }
            }
        } // End of selectedSubTab == 1

        if (selectedSubTab == 3) {
            // Saved exercises and collections UI
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("📁", fontSize = 20.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Collections", fontSize = 16.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                        }
                        TextButton(onClick = {
                            newCollectionName = ""
                            isNewCollectionPublic = false
                            showCreateCollectionDialog = true
                        }) {
                            Text("+ Create", fontWeight = FontWeight.Bold)
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Collections chips list
                    Row(
                        modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // "All" chip
                        Card(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .border(
                                    1.5.dp,
                                    if (selectedCollectionFilterId == null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                    RoundedCornerShape(20.dp)
                                )
                                .clickable {
                                    selectedCollectionFilterId = null
                                },
                            colors = CardDefaults.cardColors(
                                containerColor = if (selectedCollectionFilterId == null) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent
                            )
                        ) {
                            Text(
                                text = "All Favorites (${favoritesList.size})",
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = if (selectedCollectionFilterId == null) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                            )
                        }
                        
                        collectionsList.forEach { col ->
                            val count = favoritesList.count { it.collection_id == col.id }
                            Card(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .border(
                                        1.5.dp,
                                        if (selectedCollectionFilterId == col.id) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                                        RoundedCornerShape(20.dp)
                                    )
                                    .clickable {
                                        selectedCollectionFilterId = col.id
                                    },
                                colors = CardDefaults.cardColors(
                                    containerColor = if (selectedCollectionFilterId == col.id) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent
                                )
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = "${col.name} ($count)",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = if (selectedCollectionFilterId == col.id) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                    )
                                    if (col.is_public == 1) {
                                        Text("🌐", fontSize = 10.sp)
                                    }
                                    Text(
                                        text = "✏️",
                                        fontSize = 11.sp,
                                        modifier = Modifier.clickable {
                                            renameCollectionName = col.name
                                            renameCollectionPublic = col.is_public == 1
                                            collectionToRename = col
                                        }
                                    )
                                    Text(
                                        text = "🗑️",
                                        fontSize = 11.sp,
                                        modifier = Modifier.clickable {
                                            collectionToDelete = col
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(6.dp))

            // Exercises Section
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Saved Exercises",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    
                    val filteredExercises = if (selectedCollectionFilterId == null) {
                        favoritesList
                    } else {
                        favoritesList.filter { it.collection_id == selectedCollectionFilterId }
                    }
                    
                    if (favoritesLoading) {
                        Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            com.example.numera.ui.components.MathIconSpinner(modifier = Modifier.size(40.dp))
                        }
                    } else if (filteredExercises.isEmpty()) {
                        Text(
                            text = if (selectedCollectionFilterId == null) "No saved exercises yet." else "No exercises in this collection.",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(vertical = 12.dp)
                        )
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            filteredExercises.forEach { ex ->
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                                        .padding(12.dp)
                                ) {
                                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = ex.category.uppercase(),
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black,
                                                color = MaterialTheme.colorScheme.secondary
                                            )
                                            
                                            Row(
                                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                // Move to collection
                                                Text(
                                                    text = "📁 Move",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    modifier = Modifier.clickable {
                                                        exerciseToAssign = ex
                                                    }
                                                )
                                                // Unfavorite
                                                Text(
                                                    text = "🗑️ Remove",
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = WrongRed,
                                                    modifier = Modifier.clickable {
                                                        // Optimistic: drop it from the list immediately, sync in the background.
                                                        scope.launch {
                                                            runOptimistic(
                                                                apply = {
                                                                    favoritesList = favoritesList.filterNot { it === ex }
                                                                    toast.info("Removed from saved")
                                                                },
                                                                revert = { fetchFavoritesAndCollections() },
                                                                call = {
                                                                    val token = RetrofitClient.authToken ?: ""
                                                                    withContext(Dispatchers.IO) {
                                                                        RetrofitClient.apiService.toggleFavorite(
                                                                            token,
                                                                            ToggleFavoriteRequest(
                                                                                title = ex.title,
                                                                                category = ex.category,
                                                                                question = ex.question,
                                                                                correct_answer = ex.correct_answer,
                                                                                options = ex.options,
                                                                                explanation = ex.explanation
                                                                            )
                                                                        )
                                                                    }
                                                                },
                                                                onError = { toast.error("Couldn't remove — restored it") }
                                                            )
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                        
                                        Text(
                                            text = ex.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                        
                                        Box(modifier = Modifier.fillMaxWidth().heightIn(max = 80.dp)) {
                                            MathText(
                                                text = ex.question,
                                                color = MaterialTheme.colorScheme.onSurface,
                                                fontSizePx = 36
                                            )
                                        }
                                        
                                        Spacer(modifier = Modifier.height(4.dp))
                                        
                                        DuoButton(
                                            text = "View Explanation",
                                            onClick = {
                                                exerciseToShowExplanation = ex
                                            },
                                            modifier = Modifier.fillMaxWidth(),
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Dialogs
        if (showCreateCollectionDialog) {
            AlertDialog(
                onDismissRequest = { showCreateCollectionDialog = false },
                title = { Text("Create New Collection", fontWeight = FontWeight.Bold) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = newCollectionName,
                            onValueChange = { newCollectionName = it },
                            label = { Text("Collection Name") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Switch(
                                checked = isNewCollectionPublic,
                                onCheckedChange = { isNewCollectionPublic = it }
                            )
                            Text("Publicly visible on your profile")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        if (newCollectionName.isNotBlank()) {
                            val nameToCreate = newCollectionName.trim()
                            val isPublic = isNewCollectionPublic
                            newCollectionName = ""
                            isNewCollectionPublic = false
                            showCreateCollectionDialog = false
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.createCollection(token, CreateCollectionRequest(nameToCreate, isPublic))
                                    val colls = RetrofitClient.apiService.getCollections(token)
                                    withContext(Dispatchers.Main) {
                                        collectionsList = colls
                                    }
                                } catch (e: Exception) {
                                    Log.e("Profile", "Create collection error", e)
                                }
                            }
                        } else {
                            newCollectionName = ""
                            isNewCollectionPublic = false
                            showCreateCollectionDialog = false
                        }
                    }) {
                        Text("Create")
                    }
                },
                dismissButton = {
                    TextButton(onClick = {
                        newCollectionName = ""
                        isNewCollectionPublic = false
                        showCreateCollectionDialog = false
                    }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (collectionToRename != null) {
            AlertDialog(
                onDismissRequest = { collectionToRename = null },
                title = { Text("Edit Collection", fontWeight = FontWeight.Bold) },
                text = {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = renameCollectionName,
                            onValueChange = { renameCollectionName = it },
                            label = { Text("Collection Name") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Switch(
                                checked = renameCollectionPublic,
                                onCheckedChange = { renameCollectionPublic = it }
                            )
                            Text("Publicly visible on your profile")
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = {
                        if (renameCollectionName.isNotBlank() && collectionToRename != null) {
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.updateCollection(
                                        token,
                                        collectionToRename!!.id,
                                        UpdateCollectionRequest(renameCollectionName.trim(), renameCollectionPublic)
                                    )
                                    fetchFavoritesAndCollections()
                                } catch (e: Exception) {
                                    Log.e("Profile", "Rename collection error", e)
                                }
                            }
                        }
                        collectionToRename = null
                    }) {
                        Text("Save")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { collectionToRename = null }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (collectionToDelete != null) {
            AlertDialog(
                onDismissRequest = { collectionToDelete = null },
                title = { Text("Delete Collection?", fontWeight = FontWeight.Bold) },
                text = { Text("Are you sure you want to delete '${collectionToDelete!!.name}'? Saved exercises in this collection won't be deleted, but they will be unassigned.") },
                confirmButton = {
                    TextButton(onClick = {
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.deleteCollection(token, collectionToDelete!!.id)
                                fetchFavoritesAndCollections()
                            } catch (e: Exception) {
                                Log.e("Profile", "Delete collection error", e)
                            }
                        }
                        collectionToDelete = null
                    }) {
                        Text("Delete", color = WrongRed)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { collectionToDelete = null }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (exerciseToAssign != null) {
            val targetExercise = exerciseToAssign!!
            AlertDialog(
                onDismissRequest = { exerciseToAssign = null },
                title = { Text("Move to Collection", fontWeight = FontWeight.Bold) },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TextButton(
                            onClick = {
                                exerciseToAssign = null
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        RetrofitClient.apiService.assignCollection(token, AssignCollectionRequest(targetExercise.id, null))
                                        fetchFavoritesAndCollections()
                                    } catch (e: Exception) {
                                        Log.e("Profile", "Assign collection error", e)
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("None (Unassigned)", fontWeight = FontWeight.Bold)
                        }
                        collectionsList.forEach { col ->
                            TextButton(
                                onClick = {
                                    exerciseToAssign = null
                                    scope.launch(Dispatchers.IO) {
                                        try {
                                            val token = RetrofitClient.authToken ?: ""
                                            RetrofitClient.apiService.assignCollection(token, AssignCollectionRequest(targetExercise.id, col.id))
                                            fetchFavoritesAndCollections()
                                        } catch (e: Exception) {
                                            Log.e("Profile", "Assign collection error", e)
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(col.name)
                            }
                        }
                    }
                },
                confirmButton = {
                    TextButton(onClick = { exerciseToAssign = null }) {
                        Text("Cancel")
                    }
                }
            )
        }

        if (exerciseToShowExplanation != null) {
            val ex = exerciseToShowExplanation!!
            AlertDialog(
                onDismissRequest = { exerciseToShowExplanation = null },
                title = {
                    Text(
                        text = ex.title,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.primary
                    )
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("Category: ${ex.category.replaceFirstChar { it.uppercase() }}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.secondary)
                        
                        Text("Question:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        MathText(
                            text = ex.question,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSizePx = 38
                        )
                        
                        Spacer(modifier = Modifier.height(4.dp))
                        
                        Text("Correct Answer:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        MathText(
                            text = ex.correct_answer,
                            color = CorrectGreen,
                            fontSizePx = 38
                        )
                        
                        Spacer(modifier = Modifier.height(4.dp))
                        
                        Text("Step-by-step Explanation:", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        MathText(
                            text = ex.explanation,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSizePx = 36
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { exerciseToShowExplanation = null }) {
                        Text("Close", fontWeight = FontWeight.Bold)
                    }
                }
            )
        }

    }
}



@Composable
fun LevelNode(
    levelNum: Int,
    category: String,
    isUnlocked: Boolean,
    isActive: Boolean,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    val currentScale = if (isActive) scale else 1.0f

    val (startColor, endColor, shadowColor) = when {
        !isUnlocked -> Triple(Color(0xFFE5E7EB), Color(0xFFD1D5DB), Color(0xFF9CA3AF))
        category == "mental" -> Triple(Color(0xFF818CF8), Color(0xFF4F46E5), Color(0xFF3730A3))
        category == "arithmetic" -> Triple(Color(0xFF34D399), Color(0xFF059669), Color(0xFF065F46))
        category == "algebra" -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
        category == "number_theory" -> Triple(Color(0xFF2DD4BF), Color(0xFF0D9488), Color(0xFF115E59))
        category == "calculus" -> Triple(Color(0xFF3B82F6), Color(0xFF2563EB), Color(0xFF1E3A8A))
        category == "combinatorics" -> Triple(Color(0xFFEC4899), Color(0xFFDB2777), Color(0xFF881337))
        else -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
    }

    val contentColor = if (isUnlocked) Color.White else Color(0xFF9CA3AF)

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(100.dp)
            .clickable(enabled = isUnlocked, onClick = onClick)
    ) {
        if (isActive) {
            // Subtle glowing backdrop
            Box(
                modifier = Modifier
                    .size(92.dp)
                    .background(startColor.copy(alpha = glowAlpha * 0.15f), shape = CircleShape)
            )
            // Focus framing ring
            Box(
                modifier = Modifier
                    .size(86.dp)
                    .border(
                        width = 2.dp,
                        color = startColor.copy(alpha = glowAlpha),
                        shape = CircleShape
                    )
            )
        }

        Box(
            modifier = Modifier
                .size(76.dp)
                .graphicsLayer(
                    scaleX = currentScale,
                    scaleY = currentScale
                ),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .offset(y = 6.dp)
                    .background(shadowColor, shape = CircleShape)
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(startColor, endColor)
                        ),
                        shape = CircleShape
                    )
                    .border(
                        width = 2.dp,
                        color = Color.White.copy(alpha = 0.4f),
                        shape = CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    if (!isUnlocked) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Locked",
                            tint = contentColor,
                            modifier = Modifier.size(24.dp)
                        )
                    } else if (isActive) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Active",
                            tint = contentColor,
                            modifier = Modifier.size(28.dp)
                        )
                    } else {
                        Text(
                            text = levelNum.toString(),
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = contentColor
                        )
                    }
                }
            }
        }

        if (isActive) {
            Box(
                modifier = Modifier
                    .offset(y = (-48).dp)
                    .background(
                        brush = Brush.horizontalGradient(
                            colors = listOf(Color(0xFFEC4899), Color(0xFFF43F5E))
                        ),
                        shape = RoundedCornerShape(6.dp)
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.6f), shape = RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 2.dp)
            ) {
                Text(
                    text = "START",
                    color = Color.White,
                    fontWeight = FontWeight.Black,
                    fontSize = 9.sp,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

sealed class LearnMapItem {
    data class StageHeader(
        val stageNum: Int,
        val title: String,
        val description: String,
        val startColor: Color,
        val endColor: Color
    ) : LearnMapItem()

    data class LevelNodeItem(
        val levelNum: Int,
        val category: String,
        val isUnlocked: Boolean,
        val isActive: Boolean
    ) : LearnMapItem()
}

@Composable
fun StageHeaderCard(
    stageNum: Int,
    title: String,
    description: String,
    startColor: Color,
    endColor: Color
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 24.dp)
            .background(
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.15f),
                        endColor.copy(alpha = 0.05f)
                    )
                ),
                shape = RoundedCornerShape(24.dp)
            )
            .border(
                width = 1.5.dp,
                brush = Brush.horizontalGradient(
                    colors = listOf(
                        startColor.copy(alpha = 0.6f),
                        endColor.copy(alpha = 0.2f)
                    )
                ),
                shape = RoundedCornerShape(24.dp)
            )
            .padding(20.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(56.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(startColor, endColor)
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
            ) {
                Text(
                    text = stageNum.toString(),
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title.uppercase(),
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.5.sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    fontSize = 12.sp,
                    lineHeight = 16.sp
                )
            }
        }
    }
}


@Composable
fun UserProfileDialog(
    profile: PublicProfile?,
    isLoading: Boolean,
    onDismissRequest: () -> Unit
) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismissRequest) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            borderColor = MaterialTheme.colorScheme.primary
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (isLoading || profile == null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        com.example.numera.ui.components.MathIconSpinner()
                    }
                } else {
                    // Banner
                    Box(modifier = Modifier.fillMaxWidth().height(110.dp)) {
                        ProfileBanner(
                            bannerKey = profile.active_banner,
                            modifier = Modifier.fillMaxWidth().height(80.dp)
                        )
                        // Close button at top-right
                        IconButton(
                            onClick = {
                                com.example.numera.haptic.HapticManager.playSoft()
                                onDismissRequest()
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(8.dp)
                                .size(28.dp)
                                .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f), CircleShape)
                        ) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Close,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        // Avatar overlapping banner
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(start = 16.dp)
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surface)
                                .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            MathAvatar(
                                avatarKey = profile.avatar,
                                modifier = Modifier.fillMaxSize(),
                                fontSize = 32.sp
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = profile.username,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = profile.active_badge ?: "Apprentice Solver",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.SemiBold
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Stats Card
                        DuoCard(
                            modifier = Modifier.fillMaxWidth(),
                            backgroundColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        RankBadge(rankName = profile.rank, modifier = Modifier.size(24.dp))
                                        Text(
                                            text = profile.rank,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                    }
                                    Text(
                                        text = "Level ${profile.level}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Solved problems", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text("${profile.solved_count}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Arena victories", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text("${profile.arena_wins}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Mastery title
                        Text(
                            text = "Category Mastery",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            MasteryBar(
                                topicName = "Arithmetic",
                                correctCount = profile.mastery.arithmetic_correct,
                                maxCount = 100,
                                color = DuoPrimary
                            )
                            MasteryBar(
                                topicName = "Mental Math",
                                correctCount = profile.mastery.mental_correct,
                                maxCount = 100,
                                color = DuoSecondary
                            )
                            MasteryBar(
                                topicName = "Algebra",
                                correctCount = profile.mastery.algebra_correct,
                                maxCount = 100,
                                color = DuoTertiary
                            )
                            MasteryBar(
                                topicName = "Calculus",
                                correctCount = profile.mastery.calculus_correct,
                                maxCount = 100,
                                color = Color(0xFF9B6FD6)
                            )
                            MasteryBar(
                                topicName = "Combinatorics",
                                correctCount = profile.mastery.combinatorics_correct,
                                maxCount = 100,
                                color = Color(0xFFE074C3)
                            )
                            MasteryBar(
                                topicName = "Number Theory",
                                correctCount = profile.mastery.number_theory_correct,
                                maxCount = 100,
                                color = Color(0xFFFF9F29)
                            )
                        }
                    }
                }
            }
        }
    }
}




@Composable
fun WeeklyActivityChart(activityDays: List<ActivityDay>) {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val textColor = MaterialTheme.colorScheme.onSurface
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.10f)
    val mutedBarColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.18f)

    val displayDays = remember(activityDays) {
        if (activityDays.isNullOrEmpty()) {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val list = mutableListOf<ActivityDay>()
            for (i in 6 downTo 0) {
                val tempCal = java.util.Calendar.getInstance()
                tempCal.add(java.util.Calendar.DAY_OF_YEAR, -i)
                list.add(ActivityDay(sdf.format(tempCal.time), 0))
            }
            list
        } else {
            activityDays.takeLast(7)
        }
    }

    val maxSolved = remember(displayDays) {
        val maxVal = displayDays.maxOfOrNull { it.solved_count } ?: 0
        if (maxVal == 0) 10 else maxVal
    }
    val totalSolved = remember(displayDays) { displayDays.sumOf { it.solved_count } }
    val bestDay = remember(displayDays) { displayDays.maxOfOrNull { it.solved_count } ?: 0 }
    val activeDays = remember(displayDays) { displayDays.count { it.solved_count > 0 } }
    val todayStr = remember {
        java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())
    }

    // Animate bars growing in
    var animate by remember { mutableStateOf(false) }
    LaunchedEffect(displayDays) { animate = false; animate = true }
    val growth by animateFloatAsState(
        targetValue = if (animate) 1f else 0f,
        animationSpec = tween(900, easing = FastOutSlowInEasing),
        label = "barGrowth"
    )

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            primary.copy(alpha = 0.06f),
                            MaterialTheme.colorScheme.surface
                        )
                    )
                )
                .padding(18.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Weekly Activity",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Equations solved over the last 7 days",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f)
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(primary.copy(alpha = 0.12f))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "🔥 $totalSolved",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black,
                        color = primary
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Summary stat chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                @Composable
                fun StatChip(label: String, value: String, accent: Color, modifier: Modifier) {
                    Column(
                        modifier = modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(accent.copy(alpha = 0.08f))
                            .border(1.dp, accent.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = accent)
                        Text(label, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                    }
                }
                StatChip("BEST DAY", bestDay.toString(), primary, Modifier.weight(1f))
                StatChip("ACTIVE DAYS", "$activeDays/7", secondary, Modifier.weight(1f))
                StatChip("DAILY AVG", (totalSolved / 7).toString(), MaterialTheme.colorScheme.tertiary, Modifier.weight(1f))
            }

            Spacer(modifier = Modifier.height(18.dp))

            val density = LocalDensity.current
            val valuePaint = remember(textColor, density) {
                android.graphics.Paint().apply {
                    color = textColor.toArgb()
                    textSize = with(density) { 11.sp.toPx() }
                    isAntiAlias = true
                    isFakeBoldText = true
                    textAlign = android.graphics.Paint.Align.CENTER
                }
            }
            val labelPaint = remember(labelColor, density) {
                android.graphics.Paint().apply {
                    color = labelColor.toArgb()
                    textSize = with(density) { 10.sp.toPx() }
                    isAntiAlias = true
                    textAlign = android.graphics.Paint.Align.CENTER
                }
            }
            val primaryArgb = primary
            val secondaryArgb = secondary

            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(170.dp)
            ) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                val bottomLabelHeight = 44f
                val topPadding = 26f
                val chartHeight = canvasHeight - bottomLabelHeight - topPadding

                val barCount = displayDays.size
                val barWidth = 26.dp.toPx()
                val totalBarsWidth = barWidth * barCount
                val spacing = (canvasWidth - totalBarsWidth) / (barCount + 1)

                // Subtle dashed gridlines
                val gridLines = listOf(0f, 0.5f, 1.0f)
                gridLines.forEach { fraction ->
                    val y = topPadding + chartHeight * (1f - fraction)
                    drawLine(
                        color = gridColor,
                        start = androidx.compose.ui.geometry.Offset(0f, y),
                        end = androidx.compose.ui.geometry.Offset(canvasWidth, y),
                        strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f), 0f)
                    )
                }

                displayDays.forEachIndexed { index, day ->
                    val fraction = day.solved_count.toFloat() / maxSolved.toFloat()
                    val currentBarHeight = chartHeight * fraction * growth
                    val isToday = day.date == todayStr
                    val isBest = day.solved_count == bestDay && bestDay > 0

                    val x = spacing + index * (barWidth + spacing)
                    val left = x
                    val right = x + barWidth
                    val bottom = topPadding + chartHeight
                    val rx = 8.dp.toPx()

                    // Track (faint full-height capsule behind the bar)
                    val trackPath = Path().apply {
                        moveTo(left, bottom)
                        lineTo(left, topPadding + rx)
                        quadraticBezierTo(left, topPadding, left + rx, topPadding)
                        lineTo(right - rx, topPadding)
                        quadraticBezierTo(right, topPadding, right, topPadding + rx)
                        lineTo(right, bottom)
                        close()
                    }
                    drawPath(path = trackPath, color = mutedBarColor)

                    if (currentBarHeight > rx) {
                        val top = bottom - currentBarHeight
                        val barPath = Path().apply {
                            moveTo(left, bottom)
                            lineTo(left, top + rx)
                            quadraticBezierTo(left, top, left + rx, top)
                            lineTo(right - rx, top)
                            quadraticBezierTo(right, top, right, top + rx)
                            lineTo(right, bottom)
                            close()
                        }
                        val barBrush = if (isToday || isBest) {
                            Brush.verticalGradient(listOf(secondaryArgb, primaryArgb))
                        } else {
                            Brush.verticalGradient(listOf(primaryArgb, primaryArgb.copy(alpha = 0.55f)))
                        }
                        drawPath(path = barPath, brush = barBrush)

                        // Glossy highlight on left edge
                        drawLine(
                            color = Color.White.copy(alpha = 0.35f),
                            start = androidx.compose.ui.geometry.Offset(left + rx * 0.7f, top + rx),
                            end = androidx.compose.ui.geometry.Offset(left + rx * 0.7f, bottom - rx),
                            strokeWidth = 2.dp.toPx(),
                            cap = StrokeCap.Round
                        )

                        // Value label above bar
                        if (day.solved_count > 0 && growth > 0.7f) {
                            drawContext.canvas.nativeCanvas.drawText(
                                day.solved_count.toString(),
                                x + barWidth / 2,
                                top - 10f,
                                valuePaint
                            )
                        }
                    }

                    val dayLabel = try {
                        val sdfInput = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
                        val date = sdfInput.parse(day.date)
                        val sdfOutput = java.text.SimpleDateFormat("E", java.util.Locale.US)
                        sdfOutput.format(date)
                    } catch (e: Exception) {
                        day.date
                    }

                    labelPaint.isFakeBoldText = isToday
                    drawContext.canvas.nativeCanvas.drawText(
                        if (isToday) "•$dayLabel" else dayLabel,
                        x + barWidth / 2,
                        bottom + 26f,
                        labelPaint
                    )
                }
            }
        }
    }
}




