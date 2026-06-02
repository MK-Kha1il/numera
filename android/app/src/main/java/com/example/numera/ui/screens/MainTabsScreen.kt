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
import com.example.numera.ui.feature.profile.ProfileScreen
import com.example.numera.ui.feature.profile.UserProfileDialog
import com.example.numera.ui.feature.archive.LevelMapScreen
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