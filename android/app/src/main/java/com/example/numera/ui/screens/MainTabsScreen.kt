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
// 1. DASHBOARD SCREEN
// -------------------------------------------------------------
@Composable
fun DashboardScreen(
    user: User?,
    onRefreshProfile: () -> Unit,
    onShowUserProfile: (Int) -> Unit,
    onNavigateTab: (Int) -> Unit = {},
    onStartQuickGame: (SoloGame) -> Unit = {}
) {
    val toast = LocalToast.current
    var homeSubTab by remember { mutableStateOf(0) }
    var questsList by remember { mutableStateOf<List<Quest>>(emptyList()) }
    var leagueLeaderboard by remember { mutableStateOf<LeagueLeaderboardResponse?>(null) }
    var secondsLeft by remember { mutableStateOf<Long>(0L) }
    
    var globalLeaderboard by remember { mutableStateOf<List<User>>(emptyList()) }
    var globalLoading by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // Sort quests: completed-unclaimed first, then active by progress, claimed last.
    fun sortQuests(list: List<Quest>): List<Quest> {
        return list.sortedWith(compareBy<Quest> { quest ->
            when {
                quest.claimed == 1 -> 2
                quest.current >= quest.target -> 0
                else -> 1
            }
        }.thenByDescending { quest ->
            if (quest.target > 0) quest.current.toFloat() / quest.target.toFloat() else 0f
        })
    }

    val fetchQuests = {
        scope.launch(Dispatchers.IO) {
            try {
                val list = RetrofitClient.apiService.getQuests(RetrofitClient.authToken ?: "")
                withContext(Dispatchers.Main) {
                    // Freeze the sort order at fetch time so claiming doesn't reshuffle the list mid-view
                    questsList = sortQuests(list)
                }
            } catch (e: Exception) {
                Log.e("Dashboard", "Quests fetch err: ${e.message}")
            }
        }
    }

    val fetchLeagueLeaderboard = {
        scope.launch(Dispatchers.IO) {
            try {
                val res = RetrofitClient.apiService.getLeagueLeaderboard(RetrofitClient.authToken ?: "")
                withContext(Dispatchers.Main) {
                    leagueLeaderboard = res
                }
            } catch (e: Exception) {
                Log.e("Dashboard", "League fetch err: ${e.message}")
            }
        }
    }

    val fetchGlobalLeaderboard = {
        scope.launch(Dispatchers.IO) {
            try {
                globalLoading = true
                val list = RetrofitClient.apiService.getLeaderboard(RetrofitClient.authToken ?: "")
                withContext(Dispatchers.Main) {
                    globalLeaderboard = list
                }
            } catch (e: Exception) {
                Log.e("Dashboard", "Global leaderboard fetch err: ${e.message}")
            } finally {
                globalLoading = false
            }
        }
    }

    // Render in the already-frozen fetch order so a claim updates the button in place
    // without reshuffling. The list re-sorts only when the tab is refreshed (re-fetched).
    val sortedQuests = questsList

    LaunchedEffect(homeSubTab) {
        if (homeSubTab == 0) {
            fetchQuests()
        } else if (homeSubTab == 1) {
            fetchLeagueLeaderboard()
        } else if (homeSubTab == 2) {
            fetchGlobalLeaderboard()
        }
    }

    LaunchedEffect(leagueLeaderboard) {
        leagueLeaderboard?.let {
            secondsLeft = it.seconds_remaining
        }
    }

    LaunchedEffect(secondsLeft) {
        if (secondsLeft > 0) {
            kotlinx.coroutines.delay(1000)
            secondsLeft -= 1
        }
    }

    fun formatTimeRemaining(seconds: Long): String {
        if (seconds <= 0) return "League ended / calculating..."
        val days = seconds / 86400
        val hours = (seconds % 86400) / 3600
        val minutes = (seconds % 3600) / 60
        val secs = seconds % 60
        return if (days > 0) {
            "${days}d ${hours}h ${minutes}m"
        } else {
            "${hours}h ${minutes}m ${secs}s"
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        TabRow(
            selectedTabIndex = homeSubTab,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Tab(selected = homeSubTab == 0, onClick = { homeSubTab = 0 }) {
                Text("Daily Quests", modifier = Modifier.padding(14.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = homeSubTab == 1, onClick = { homeSubTab = 1 }) {
                Text("Weekly Leagues", modifier = Modifier.padding(14.dp), fontWeight = FontWeight.Bold)
            }
            Tab(selected = homeSubTab == 2, onClick = { homeSubTab = 2 }) {
                Text("Global Standings", modifier = Modifier.padding(14.dp), fontWeight = FontWeight.Bold)
            }
        }

        // Quick actions: the highest-intent moves on the home screen, one tap away.
        QuickActionsBar(
            hero = QuickAction(
                label = "Continue Learning",
                sublabel = "Pick up your climb on the level map",
                icon = NumeraIconType.Learn
            ) { onNavigateTab(0) },
            tiles = listOf(
                QuickAction(
                    label = "Daily Puzzle",
                    icon = NumeraIconType.Calculator,
                    accent = MaterialTheme.colorScheme.tertiary
                ) { onStartQuickGame(SoloGame(category = "General", level = 0, gameMode = "daily_puzzle")) },
                QuickAction(
                    label = "Ranked Match",
                    icon = NumeraIconType.Arena,
                    accent = MaterialTheme.colorScheme.secondary
                ) { onNavigateTab(1) }
            ),
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
        )

        AnimatedContent(
            targetState = homeSubTab,
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
            label = "DashboardTabsTransition",
            modifier = Modifier.weight(1f).fillMaxWidth()
        ) { targetHomeSubTab ->
            if (targetHomeSubTab == 0) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                item {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(8.dp)) {
                            Text(
                                text = "Daily Challenges",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                            Text(
                                text = "Complete objectives every day to earn coins and experience points.",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.padding(vertical = 4.dp)
                            )
                        }
                    }
                }

                if (sortedQuests.isEmpty()) {
                    item {
                        SkeletonList(count = 3, modifier = Modifier.padding(top = 8.dp)) {
                            AchievementSkeleton()
                        }
                    }
                } else {
                    items(sortedQuests, key = { it.type }) { quest ->
                        DuoCard(
                            modifier = Modifier.fillMaxWidth().animateItem(),
                            borderColor = if (quest.current >= quest.target && quest.claimed == 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                val icon = when (quest.type) {
                                    "solve" -> "✏️"
                                    "duel" -> "⚔️"
                                    "mistake" -> "❌"
                                    "daily_puzzle" -> "🧩"
                                    else -> "🎯"
                                }

                                Text(text = icon, fontSize = 32.sp)

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = quest.name,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 15.sp,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = quest.description,
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                    )

                                    Spacer(modifier = Modifier.height(6.dp))

                                    val targetProgressFraction = (quest.current.toFloat() / quest.target.toFloat()).coerceAtMost(1.0f)
                                    var animProgressFraction by remember(quest.type) { mutableStateOf(0f) }
                                    LaunchedEffect(targetProgressFraction) {
                                        animProgressFraction = targetProgressFraction
                                    }
                                    val progressFraction by animateFloatAsState(
                                        targetValue = animProgressFraction,
                                        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
                                        label = "QuestProgress"
                                    )
                                    GlossyProgressBar(
                                        progress = progressFraction,
                                        isCompleted = quest.current >= quest.target
                                    )

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "${quest.current} / ${quest.target}",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (quest.current >= quest.target) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )

                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Text(
                                                text = "🪙 ${quest.rewardCoins}  ⭐ ${quest.rewardXp} XP",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            
                                            if (quest.claimed == 1) {
                                                Text(
                                                    text = "Claimed ✓",
                                                    color = CorrectGreen,
                                                    fontWeight = FontWeight.Bold,
                                                    fontSize = 11.sp
                                                )
                                            } else if (quest.current >= quest.target) {
                                                ClaimButton(
                                                    onClick = {
                                                        scope.launch(Dispatchers.IO) {
                                                            try {
                                                                val token = RetrofitClient.authToken ?: ""
                                                                val res = RetrofitClient.apiService.claimQuest(token, ClaimQuestRequest(quest.type))
                                                                if (res.success) {
                                                                    withContext(Dispatchers.Main) {
                                                                        SoundManager.playRewardClaim()
                                                                        toast.success("Quest reward claimed!")
                                                                        // Mark claimed in place — keep the row's position.
                                                                        // It only moves to the bottom when the tab is re-fetched.
                                                                        questsList = questsList.map { q ->
                                                                            if (q.type == quest.type) q.copy(claimed = 1) else q
                                                                        }
                                                                        onRefreshProfile()
                                                                    }
                                                                }
                                                            } catch (e: Exception) {
                                                                Log.e("Dashboard", "Quest claim error: ${e.message}")
                                                            }
                                                        }
                                                    }
                                                )
                                            } else {
                                                Text(
                                                    text = "Active",
                                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                                    fontSize = 11.sp,
                                                    fontWeight = FontWeight.Medium
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
        } else if (targetHomeSubTab == 1) {
            val currentDivision = leagueLeaderboard?.league ?: "Bronze"
            val showDemotion = currentDivision != "Bronze"

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                val leagueEmoji = when (currentDivision) {
                    "Bronze" -> "🪵"
                    "Silver" -> "🪙"
                    "Gold" -> "🥇"
                    "Platinum" -> "💎"
                    "Diamond" -> "👑"
                    else -> "🏆"
                }

                item {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "$leagueEmoji $currentDivision League",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary,
                                textAlign = TextAlign.Center
                            )

                            Text(
                                text = "Ends in: ${formatTimeRemaining(secondsLeft)}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary,
                                textAlign = TextAlign.Center
                            )

                            Text(
                                text = "Weekly Standings: Earn XP to climb. Top 3 promote to next league, bottom 3 (except Bronze) demote.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                val standings = leagueLeaderboard?.standings ?: emptyList()
                if (standings.isEmpty()) {
                    item {
                        SkeletonList(count = 4, modifier = Modifier.padding(top = 8.dp)) {
                            LeaderboardRowSkeleton()
                        }
                    }
                } else {
                    itemsIndexed(standings) { index, competitor ->
                        val isSelf = competitor.id == user?.id
                        val totalSize = standings.size
                        val isPromo = index < 3
                        val isDemo = showDemotion && (totalSize >= 5 && index >= totalSize - 3)

                        val itemBorderColor = when {
                            isSelf -> MaterialTheme.colorScheme.primary
                            isPromo -> CorrectGreen
                            isDemo -> WrongRed
                            else -> MaterialTheme.colorScheme.outline
                        }

                        val itemBgColor = when {
                            isSelf -> MaterialTheme.colorScheme.primary.copy(alpha = 0.05f)
                            isPromo -> CorrectGreen.copy(alpha = 0.03f)
                            isDemo -> WrongRed.copy(alpha = 0.03f)
                            else -> MaterialTheme.colorScheme.surfaceVariant
                        }

                        DuoCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onShowUserProfile(competitor.id) },
                            borderColor = itemBorderColor,
                            backgroundColor = itemBgColor
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        text = "#${index + 1}",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = when (index) {
                                            0 -> Color(0xFFFFD700)
                                            1 -> Color(0xFFC0C0C0)
                                            2 -> Color(0xFFCD7F32)
                                            else -> MaterialTheme.colorScheme.onBackground
                                        }
                                    )

                                    MathAvatar(
                                        avatarKey = competitor.avatar,
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), CircleShape),
                                        fallbackEmoji = when (competitor.avatar) {
                                            "avatar_owl" -> "🦉"
                                            "avatar_fox" -> "🦊"
                                            "avatar_koala" -> "🐨"
                                            "avatar_panda" -> "🐼"
                                            else -> "📐"
                                        }
                                    )

                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = competitor.username,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = if (isSelf) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                            )
                                            if (isSelf) {
                                                Text(
                                                    text = " (You)",
                                                    fontSize = 12.sp,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }

                                        Text(
                                            text = "Level ${competitor.level}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                }

                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    when {
                                        isPromo -> {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(CorrectGreen.copy(alpha = 0.15f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text("Promo ↗", color = CorrectGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                        isDemo -> {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(WrongRed.copy(alpha = 0.15f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text("Demotion ↘", color = WrongRed, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }

                                    Text(
                                        text = "${competitor.league_points} pts",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 14.sp,
                                        color = MaterialTheme.colorScheme.secondary
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else if (targetHomeSubTab == 2) {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = "🌍 Global Leaderboard",
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary,
                                textAlign = TextAlign.Center
                            )
                            Text(
                                text = "All-time rankings of top Numera solvers worldwide by total XP.",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }

                if (globalLoading) {
                    item {
                        NumeraPremiumLoader(cardPadding = 16.dp)
                    }
                } else if (globalLeaderboard.isEmpty()) {
                    item {
                        NumeraEmptyState(
                            illustration = EmptyIllustration.Leaderboard,
                            title = "No standings yet",
                            message = "Be the first to climb. Solve a few problems and your name will rise onto the board."
                        )
                    }
                } else {
                    itemsIndexed(globalLeaderboard) { index, globalUser ->
                        val isSelf = globalUser.id == user?.id
                        val itemBorderColor = if (isSelf) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline
                        val itemBgColor = if (isSelf) MaterialTheme.colorScheme.primary.copy(alpha = 0.05f) else MaterialTheme.colorScheme.surfaceVariant

                        DuoCard(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onShowUserProfile(globalUser.id) },
                            borderColor = itemBorderColor,
                            backgroundColor = itemBgColor
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Text(
                                        text = "#${index + 1}",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = when (index) {
                                            0 -> Color(0xFFFFD700)
                                            1 -> Color(0xFFC0C0C0)
                                            2 -> Color(0xFFCD7F32)
                                            else -> MaterialTheme.colorScheme.onBackground
                                        }
                                    )

                                    MathAvatar(
                                        avatarKey = globalUser.avatar,
                                        modifier = Modifier
                                            .size(32.dp)
                                            .clip(CircleShape)
                                            .border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f), CircleShape)
                                    )

                                    Column {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = globalUser.username,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 15.sp,
                                                color = if (isSelf) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                                            )
                                            if (isSelf) {
                                                Text(
                                                    text = " (You)",
                                                    fontSize = 12.sp,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }

                                        Text(
                                            text = "Level ${globalUser.level} · ${globalUser.rank}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                        )
                                    }
                                }

                                Text(
                                    text = "${globalUser.xp} XP",
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 14.sp,
                                    color = MaterialTheme.colorScheme.secondary
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
// 5. SHOP SCREEN (COSMETICS SHOP)
// -------------------------------------------------------------
// Helpers for Shop Economy
fun getRankValue(rankStr: String?): Int {
    if (rankStr.isNullOrBlank()) return 0
    val cleaned = rankStr.replace(Regex("Unranked.*", RegexOption.IGNORE_CASE), "").trim()
    if (cleaned.isEmpty()) return 0

    val ranks = listOf("Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster")
    val divisions = listOf("III", "II", "I")

    var tierVal = 0
    for (i in ranks.indices) {
        if (cleaned.startsWith(ranks[i])) {
            tierVal = (i + 1) * 10
            break
        }
    }

    var divVal = 0
    for (j in divisions.indices) {
        if (cleaned.endsWith(divisions[j])) {
            divVal = j + 1
            break
        }
    }

    return tierVal + divVal
}

fun getRarityColor(rarity: String): Color {
    return when (rarity.lowercase()) {
        "mythic" -> Color(0xFFFFD700)
        "legendary" -> Color(0xFFFDB813)
        "epic" -> Color(0xFF8A2BE2)
        "rare" -> Color(0xFF00CED1)
        else -> Color(0xFF708090)
    }
}

fun getRarityBorderBrush(rarity: String): Brush {
    return when (rarity.lowercase()) {
        "mythic" -> Brush.linearGradient(listOf(Color(0xFF6A0DAD), Color(0xFFFFD700), Color(0xFFD4AF37)))
        "legendary" -> Brush.linearGradient(listOf(Color(0xFFB76E79), Color(0xFFFDB813)))
        "epic" -> Brush.linearGradient(listOf(Color(0xFF8A2BE2), Color(0xFF4B0082)))
        "rare" -> Brush.linearGradient(listOf(Color(0xFF00CED1), Color(0xFF1E90FF)))
        else -> Brush.linearGradient(listOf(Color(0xFF708090), Color(0xFF708090)))
    }
}

fun formatDuration(seconds: Long): String {
    val days = seconds / 86400
    val hours = (seconds % 86400) / 3600
    val minutes = (seconds % 3600) / 60
    return if (days > 0) {
        "${days}d ${hours}h"
    } else {
        "${hours}h ${minutes}m"
    }
}

@Composable
fun ShopBackground(modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "ambientGlow")
    
    val xOffset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(8000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "x1"
    )
    val yOffset1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 120f,
        animationSpec = infiniteRepeatable(
            animation = tween(10000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "y1"
    )
    val xOffset2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -80f,
        animationSpec = infiniteRepeatable(
            animation = tween(7000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "x2"
    )
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F13))
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = Color(0x1F8A2BE2),
                radius = 400.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(
                    x = size.width * 0.2f + xOffset1.dp.toPx(),
                    y = size.height * 0.3f + yOffset1.dp.toPx()
                )
            )
            drawCircle(
                color = Color(0x1800CED1),
                radius = 350.dp.toPx(),
                center = androidx.compose.ui.geometry.Offset(
                    x = size.width * 0.8f + xOffset2.dp.toPx(),
                    y = size.height * 0.7f - yOffset1.dp.toPx()
                )
            )
            
            val columns = 15
            val rows = 30
            val cellWidth = size.width / columns
            val cellHeight = size.height / rows
            for (i in 0..columns) {
                drawLine(
                    color = Color.White.copy(alpha = 0.03f),
                    start = androidx.compose.ui.geometry.Offset(i * cellWidth, 0f),
                    end = androidx.compose.ui.geometry.Offset(i * cellWidth, size.height),
                    strokeWidth = 1.dp.toPx()
                )
            }
            for (j in 0..rows) {
                drawLine(
                    color = Color.White.copy(alpha = 0.03f),
                    start = androidx.compose.ui.geometry.Offset(0f, j * cellHeight),
                    end = androidx.compose.ui.geometry.Offset(size.width, j * cellHeight),
                    strokeWidth = 1.dp.toPx()
                )
            }
        }
    }
}

@Composable
fun RarityCardFrame(
    rarity: String,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val rarityColor = getRarityColor(rarity)
    
    val infiniteTransition = rememberInfiniteTransition(label = "cardShimmer")
    val translateAnim by infiniteTransition.animateFloat(
        initialValue = -500f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "translate"
    )
    
    val borderBrush = getRarityBorderBrush(rarity)
    
    val elevation = when (rarity.lowercase()) {
        "mythic" -> 12.dp
        "legendary" -> 8.dp
        "epic" -> 6.dp
        else -> 2.dp
    }
    
    Card(
        modifier = modifier
            .border(
                width = if (rarity.lowercase() in listOf("mythic", "legendary")) 2.dp else 1.dp,
                brush = borderBrush,
                shape = RoundedCornerShape(16.dp)
            ),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Color(0xFF161622).copy(alpha = 0.85f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation)
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(rarityColor.copy(alpha = 0.08f), Color.Transparent),
                            radius = 300f
                        )
                    )
            )
            
            Box(modifier = Modifier.padding(12.dp)) {
                content()
            }
            
            if (rarity.lowercase() in listOf("mythic", "legendary", "epic")) {
                val shimmerBrush = Brush.linearGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0f),
                        Color.White.copy(alpha = 0.12f),
                        Color.White.copy(alpha = 0f)
                    ),
                    start = androidx.compose.ui.geometry.Offset(translateAnim, 0f),
                    end = androidx.compose.ui.geometry.Offset(translateAnim + 150f, 300f)
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(shimmerBrush)
                )
            }
        }
    }
}

@Composable
fun HeroShowcasePanel(
    item: ShopItem?,
    user: User?,
    inventoryIds: List<String>,
    ownedUtilities: List<UtilityBalance>,
    scope: kotlinx.coroutines.CoroutineScope,
    onPurchaseComplete: () -> Unit,
    onDismissShowcase: () -> Unit
) {
    if (item == null) return
    
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = when (item.type) {
        "theme" -> user?.theme == item.value
        "avatar" -> user?.avatar == item.value
        "badge" -> user?.active_badge == item.value
        "banner" -> user?.active_banner == item.value
        else -> false
    }
    
    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false
    val utilityQty = ownedUtilities.find { it.item_id == item.id }?.quantity ?: 0
    
    val infiniteTransition = rememberInfiniteTransition(label = "showcaseAmbient")
    val pulseScale1 by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = EaseInOutSine),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse1"
    )
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(15000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rot"
    )
    
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .border(2.dp, rarityColor.copy(alpha = 0.7f), RoundedCornerShape(20.dp)),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E1E2E).copy(alpha = 0.95f))
    ) {
        Box(modifier = Modifier.fillMaxWidth()) {
            Canvas(modifier = Modifier.matchParentSize()) {
                drawCircle(
                    color = rarityColor.copy(alpha = 0.08f),
                    radius = size.minDimension * 0.5f * pulseScale1
                )
            }
            
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "✦ SHOWCASE PREVIEW ✦",
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        color = rarityColor,
                        letterSpacing = 1.5.sp
                    )
                    IconButton(
                        onClick = {
                            com.example.numera.haptic.HapticManager.playSoft()
                            onDismissShowcase()
                        },
                        modifier = Modifier.size(24.dp)
                    ) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Close,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
                
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .graphicsLayer {
                            translationY = 4.dp.toPx() * kotlin.math.sin(rotation * Math.PI / 180).toFloat()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    if (item.rarity?.lowercase() in listOf("legendary", "mythic")) {
                        Canvas(modifier = Modifier.size(130.dp)) {
                            drawCircle(
                                color = rarityColor.copy(alpha = 0.25f),
                                style = Stroke(
                                    width = 2.dp.toPx(),
                                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(15f, 15f), 0f)
                                )
                            )
                        }
                    }
                    
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .border(2.dp, rarityColor, RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        when (item.type) {
                            "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                            "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 48.sp)
                            "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                            "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                            "utility" -> {
                                val emoji = when (item.id) {
                                    "item_streak_shield" -> "🛡️"
                                    "item_retry_token" -> "🔄"
                                    "item_xp_booster" -> "⚡"
                                    "item_challenge_ticket" -> "🎫"
                                    else -> "📦"
                                }
                                Text(emoji, fontSize = 48.sp)
                            }
                        }
                        if (isLocked) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("🔒", fontSize = 24.sp)
                            }
                        }
                    }
                }
                
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = item.name,
                        fontWeight = FontWeight.Black,
                        fontSize = 20.sp,
                        color = Color.White
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = (item.rarity ?: "Common").uppercase(),
                            fontWeight = FontWeight.Black,
                            fontSize = 11.sp,
                            color = rarityColor
                        )
                        Text(
                            text = "·",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontSize = 11.sp
                        )
                        Text(
                            text = item.type.uppercase(),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }
                
                Text(
                    text = item.description ?: "",
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.padding(horizontal = 8.dp)
                )
                
                if (item.required_rank != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = (if (isLocked) WrongRed else CorrectGreen).copy(alpha = 0.1f),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isLocked) WrongRed else CorrectGreen)
                    ) {
                        Text(
                            text = if (isLocked) "Locked: Requires Rank ${item.required_rank}" else "Unlocked: ${item.required_rank} reached",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isLocked) WrongRed else CorrectGreen,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                        )
                    }
                }
                
                if (item.is_utility == 1) {
                    Text(
                        text = "Current Stock: $utilityQty owned",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
                
                if (isEquipped) {
                    DuoButton(
                        text = "Active & Equipped",
                        onClick = {},
                        enabled = false,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (hasPurchased && item.is_utility == 0) {
                    DuoButton(
                        text = "Equip Now",
                        onClick = {
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.equipItem(
                                        token, EquipRequest(item.type, item.value)
                                    )
                                    withContext(Dispatchers.Main) {
                                        onPurchaseComplete()
                                    }
                                } catch (e: Exception) {
                                    Log.e("Shop", "Equip err: ${e.message}")
                                }
                            }
                        },
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else {
                    val canBuy = (user?.coins ?: 0) >= item.cost && !isLocked
                    
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (item.discountActive == true && item.originalCost != null) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "🪙 ${item.originalCost}",
                                    style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                    fontSize = 13.sp
                                )
                                Box(
                                    modifier = Modifier
                                        .background(WrongRed, RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = "DISCOUNTED",
                                        color = Color.White,
                                        fontWeight = FontWeight.Black,
                                        fontSize = 8.sp
                                    )
                                }
                            }
                        }
                        
                        DuoButton(
                            text = if (isLocked) "Rank Locked" else "Purchase (🪙 ${item.cost})",
                            onClick = {
                                if (!canBuy) return@DuoButton
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        RetrofitClient.apiService.purchaseItem(
                                            token, PurchaseRequest(item.id)
                                        )
                                        withContext(Dispatchers.Main) {
                                            SoundManager.playPurchase()
                                            onPurchaseComplete()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("Shop", "Buy err: ${e.message}")
                                    }
                                }
                            },
                            enabled = canBuy,
                            color = if (canBuy) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FeaturedShopItemCard(
    item: ShopItem,
    inventoryIds: List<String>,
    user: User?,
    onClick: () -> Unit
) {
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = when (item.type) {
        "theme" -> user?.theme == item.value
        "avatar" -> user?.avatar == item.value
        "badge" -> user?.active_badge == item.value
        "banner" -> user?.active_banner == item.value
        else -> false
    }

    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false

    val infiniteTransition = rememberInfiniteTransition(label = "featuredGlow")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.98f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val scaleValue = if (item.rarity?.lowercase() in listOf("legendary", "mythic")) pulseScale else 1f

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .scale(scaleValue)
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, rarityColor.copy(alpha = 0.5f), RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 42.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 36.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🔒", fontSize = 24.sp)
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    color = Color.White
                )
                Text(
                    text = (item.rarity ?: "Common").uppercase(),
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 11.sp,
                    color = rarityColor
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = item.description ?: "",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    maxLines = 2
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                    Box(
                        modifier = Modifier
                            .background(WrongRed, RoundedCornerShape(4.dp))
                            .padding(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "OFFER",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                if (isEquipped) {
                    Text(
                        text = "Active",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = rarityColor
                    )
                }
            }
        }
    }
}

@Composable
fun ShopHeroCard(
    item: ShopItem,
    inventoryIds: List<String>,
    user: User?,
    onClick: () -> Unit
) {
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = when (item.type) {
        "theme" -> user?.theme == item.value
        "avatar" -> user?.avatar == item.value
        "badge" -> user?.active_badge == item.value
        "banner" -> user?.active_banner == item.value
        else -> false
    }

    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false

    val infiniteTransition = rememberInfiniteTransition(label = "heroGlow")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 0.99f,
        targetValue = 1.01f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val scaleValue = if (item.rarity?.lowercase() in listOf("legendary", "mythic")) pulseScale else 1f

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .scale(scaleValue)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "✨ TODAY'S HERO ITEM",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = rarityColor,
                    letterSpacing = 1.sp
                )
                Text(
                    text = (item.rarity ?: "Common").uppercase(),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = rarityColor.copy(alpha = 0.8f),
                    letterSpacing = 0.5.sp
                )
            }

            Box(
                modifier = Modifier
                    .size(160.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f))
                    .border(1.5.dp, rarityColor.copy(alpha = 0.4f), RoundedCornerShape(20.dp)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 64.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 48.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("🔒", fontSize = 32.sp)
                            Text("Rank locked", fontSize = 10.sp, color = Color.White.copy(alpha = 0.8f))
                        }
                    }
                }
            }

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    color = Color.White,
                    textAlign = TextAlign.Center
                )
                if (!item.description.isNullOrEmpty()) {
                    Text(
                        text = item.description,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }

                if (isEquipped) {
                    Text(
                        text = "Equipped",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = rarityColor
                    )
                }
            }
        }
    }
}

@Composable
fun DailyShopItemCard(
    item: ShopItem,
    inventoryIds: List<String>,
    user: User?,
    onClick: () -> Unit
) {
    val hasPurchased = inventoryIds.contains(item.id)
    val isEquipped = when (item.type) {
        "theme" -> user?.theme == item.value
        "avatar" -> user?.avatar == item.value
        "badge" -> user?.active_badge == item.value
        "banner" -> user?.active_banner == item.value
        else -> false
    }

    val rarityColor = getRarityColor(item.rarity ?: "Common")
    val isLocked = item.required_rank?.let { getRankValue(user?.rank ?: "") < getRankValue(it) } ?: false

    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .border(1.dp, rarityColor.copy(alpha = 0.3f), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                when (item.type) {
                    "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                    "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 28.sp)
                    "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                    "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                    else -> Text("📦", fontSize = 24.sp)
                }
                if (isLocked) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🔒", fontSize = 16.sp)
                    }
                }
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = (item.rarity ?: "Common").uppercase(),
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 10.sp,
                        color = rarityColor
                    )
                    Text(
                        text = "·",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    Text(
                        text = item.type.uppercase(),
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                if (item.discountActive == true && item.originalCost != null && !hasPurchased) {
                    Text(
                        text = "🪙 ${item.originalCost}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        style = TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                    )
                }
                if (isEquipped) {
                    Text(
                        text = "Active",
                        color = CorrectGreen,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                } else if (hasPurchased) {
                    Text(
                        text = "Owned",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                } else {
                    Text(
                        text = "🪙 ${item.cost}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = rarityColor
                    )
                }
            }
        }
    }
}

@Composable
fun UtilityShopItemCard(
    item: ShopItem,
    ownedQuantity: Int,
    user: User?,
    onClick: () -> Unit
) {
    RarityCardFrame(
        rarity = item.rarity ?: "Common",
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(54.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center
            ) {
                val emoji = when (item.id) {
                    "item_streak_shield" -> "🛡️"
                    "item_retry_token" -> "🔄"
                    "item_xp_booster" -> "⚡"
                    "item_challenge_ticket" -> "🎫"
                    else -> "📦"
                }
                Text(emoji, fontSize = 28.sp)
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color.White)
                Text(
                    text = "Owned: $ownedQuantity",
                    fontSize = 12.sp,
                    color = if (ownedQuantity > 0) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    fontWeight = FontWeight.Bold
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "🪙 ${item.cost}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = getRarityColor(item.rarity ?: "Common")
                )
            }
        }
    }
}

@Composable
fun ShopScreen(user: User?, onPurchaseComplete: () -> Unit) {
    val toast = LocalToast.current
    var featuredItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var dailyItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var utilityItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var catalogItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var userUtilities by remember { mutableStateOf<List<UtilityBalance>>(emptyList()) }
    var inventoryIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var shopErrorMessage by remember { mutableStateOf<String?>(null) }
    var expiresInSeconds by remember { mutableStateOf<Long?>(null) }
    var featuredExpiresInSeconds by remember { mutableStateOf<Long?>(null) }
    var selectedItemForDetail by remember { mutableStateOf<ShopItem?>(null) }
    var purchasedItemForReveal by remember { mutableStateOf<ShopItem?>(null) }
    var showFullCatalog by remember { mutableStateOf(false) }
    var catalogTypeFilter by remember { mutableStateOf<String?>(null) }
    var isShopLoading by remember { mutableStateOf(true) }

    val scope = rememberCoroutineScope()

    val fetchShop = {
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                val res = RetrofitClient.apiService.getShop(token)
                withContext(Dispatchers.Main) {
                    isShopLoading = false
                    featuredItems = res.featuredItems ?: emptyList()
                    dailyItems = res.dailyItems ?: emptyList()
                    utilityItems = res.utilityItems ?: emptyList()
                    catalogItems = res.catalogItems ?: emptyList()
                    userUtilities = res.utilities ?: emptyList()
                    inventoryIds = res.inventory
                    expiresInSeconds = res.expiresInSeconds
                    featuredExpiresInSeconds = res.featuredExpiresInSeconds
                    
                    if (selectedItemForDetail == null && featuredItems.isNotEmpty()) {
                        selectedItemForDetail = featuredItems.first()
                    }
                }
            } catch (e: Exception) {
                Log.e("Shop", "Shop fetch err: ${e.message}")
                withContext(Dispatchers.Main) { isShopLoading = false }
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchShop()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        ShopBackground(modifier = Modifier.fillMaxSize())
        
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    text = "NUMERA SHOP",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 18.sp,
                    color = Color.White
                )
                Text(
                    text = "Exchange your Math Coins earned from levels and duels for visual upgrades and utilities.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
                    modifier = Modifier.padding(vertical = 4.dp)
                )
            }

            if (isShopLoading) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        LessonCardSkeleton()
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            ShopItemSkeleton()
                            ShopItemSkeleton()
                        }
                    }
                }
            }

            // Collection completion milestone progress card
            item {
                val totalCosmetics = (featuredItems.size + dailyItems.size).coerceAtLeast(1)
                val ownedCosmeticsCount = inventoryIds.count { id ->
                    featuredItems.any { it.id == id } || dailyItems.any { it.id == id }
                }
                val progressFraction = ownedCosmeticsCount.toFloat() / totalCosmetics
                
                RarityCardFrame(
                    rarity = "Legendary",
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
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
                                text = "🏆 COSMETIC COLLECTION UNLOCKED",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFFFFD700),
                                letterSpacing = 0.8.sp
                            )
                            Text(
                                text = "$ownedCosmeticsCount / $totalCosmetics items",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                        
                        GlossyProgressBar(
                            progress = progressFraction.coerceIn(0f, 1f),
                            isCompleted = ownedCosmeticsCount == totalCosmetics,
                            modifier = Modifier.fillMaxWidth().height(10.dp)
                        )
                    }
                }
            }

            item {
                RarityCardFrame(
                    rarity = "Common",
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "YOUR BALANCE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                            Text(
                                text = "🪙 ${user?.coins ?: 0}",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        if (user?.xp_booster_uses_left != null && user.xp_booster_uses_left > 0) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFFFFD700).copy(alpha = 0.2f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFFD700))
                            ) {
                                Text(
                                    text = "⚡ XP Booster: ${user.xp_booster_uses_left} left",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFD4AF37),
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                                )
                            }
                        }
                    }
                }
            }

            shopErrorMessage?.let { err ->
                item {
                    Text(
                        text = err,
                        color = WrongRed,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )
                }
            }

            // Interactive Hero Showcase Panel
            item {
                if (selectedItemForDetail != null) {
                    HeroShowcasePanel(
                        item = selectedItemForDetail,
                        user = user,
                        inventoryIds = inventoryIds,
                        ownedUtilities = userUtilities,
                        scope = scope,
                        onPurchaseComplete = {
                            val itemPurchased = selectedItemForDetail
                            if (itemPurchased != null && !inventoryIds.contains(itemPurchased.id) && itemPurchased.is_utility == 0) {
                                purchasedItemForReveal = itemPurchased
                            }
                            fetchShop()
                            onPurchaseComplete()
                        },
                        onDismissShowcase = { selectedItemForDetail = null }
                    )
                }
            }

            // Featured Section
            featuredItems.firstOrNull()?.let { heroItem ->
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "★ FEATURED HERO EXHIBIT",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = Color(0xFFFFD700)
                        )
                        featuredExpiresInSeconds?.let { sec ->
                            Text(
                                text = "Refreshes in: ${formatDuration(sec)}",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }

                item {
                    ShopHeroCard(
                        item = heroItem,
                        inventoryIds = inventoryIds,
                        user = user,
                        onClick = { selectedItemForDetail = heroItem }
                    )
                }
            }

            // Daily Deals Section
            if (dailyItems.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "⏰ DAILY DEALS",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = Color(0xFF00CED1)
                        )
                        expiresInSeconds?.let { sec ->
                            Text(
                                text = "Refreshes in: ${formatDuration(sec)}",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                    }
                }

                items(dailyItems) { item ->
                    DailyShopItemCard(
                        item = item,
                        inventoryIds = inventoryIds,
                        user = user,
                        onClick = { selectedItemForDetail = item }
                    )
                }
            }

            // Utilities Section
            if (utilityItems.isNotEmpty()) {
                item {
                    Text(
                        text = "💼 UTILITY BOOSTERS",
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = Color.White,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                items(utilityItems) { item ->
                    val qty = userUtilities.find { it.item_id == item.id }?.quantity ?: 0
                    UtilityShopItemCard(
                        item = item,
                        ownedQuantity = qty,
                        user = user,
                        onClick = { selectedItemForDetail = item }
                    )
                }
            }

            // Full Catalog Section — every cosmetic, always purchasable (not gated by rotation)
            if (catalogItems.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 16.dp)
                            .clickable {
                                com.example.numera.haptic.HapticManager.playSoft()
                                showFullCatalog = !showFullCatalog
                            },
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "📚 FULL COLLECTION (${catalogItems.size})",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = Color.White
                        )
                        Icon(
                            imageVector = if (showFullCatalog) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = "Toggle catalog",
                            tint = Color.White
                        )
                    }
                }

                if (showFullCatalog) {
                    item {
                        Text(
                            text = "Browse and buy any cosmetic directly — no waiting for the rotation.",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                            modifier = Modifier.padding(bottom = 4.dp)
                        )
                    }

                    // Type filter chips
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            val types = listOf(null to "All", "avatar" to "Avatars", "banner" to "Banners", "badge" to "Badges", "theme" to "Themes")
                            types.forEach { (typeVal, label) ->
                                val isSel = catalogTypeFilter == typeVal
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(if (isSel) MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.08f))
                                        .clickable { catalogTypeFilter = typeVal }
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Text(
                                        text = label,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSel) MaterialTheme.colorScheme.onPrimary else Color.White.copy(alpha = 0.7f)
                                    )
                                }
                            }
                        }
                    }

                    val filteredCatalog = if (catalogTypeFilter == null) catalogItems
                        else catalogItems.filter { it.type == catalogTypeFilter }

                    items(filteredCatalog) { item ->
                        DailyShopItemCard(
                            item = item,
                            inventoryIds = inventoryIds,
                            user = user,
                            onClick = { selectedItemForDetail = item }
                        )
                    }
                }
            }
        }

        // Cinematic Reveal Overlay Dialog
        purchasedItemForReveal?.let { item ->
            val rarityColor = getRarityColor(item.rarity ?: "Common")
            
            AlertDialog(
                onDismissRequest = { purchasedItemForReveal = null },
                confirmButton = {},
                dismissButton = {
                    DuoButton(
                        text = if (item.is_utility == 0) "Claim & Equip" else "Claim",
                        onClick = {
                            if (item.is_utility == 0) {
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        RetrofitClient.apiService.equipItem(
                                            token, EquipRequest(item.type, item.value)
                                        )
                                        withContext(Dispatchers.Main) {
                                            purchasedItemForReveal = null
                                            onPurchaseComplete()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("Shop", "Auto-equip err: ${e.message}")
                                        withContext(Dispatchers.Main) {
                                            purchasedItemForReveal = null
                                        }
                                    }
                                }
                            } else {
                                purchasedItemForReveal = null
                            }
                        },
                        color = CorrectGreen,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                title = {
                    Text(
                        text = "✧ UNLOCKED ✧",
                        fontWeight = FontWeight.Black,
                        fontSize = 24.sp,
                        color = rarityColor,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .border(3.dp, rarityColor, RoundedCornerShape(20.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            when (item.type) {
                                "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                                "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 54.sp)
                                "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                                "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                                "utility" -> {
                                    val emoji = when (item.id) {
                                        "item_streak_shield" -> "🛡️"
                                        "item_retry_token" -> "🔄"
                                        "item_xp_booster" -> "⚡"
                                        "item_challenge_ticket" -> "🎫"
                                        else -> "📦"
                                    }
                                    Text(emoji, fontSize = 54.sp)
                                }
                            }
                        }
                        
                        Text(
                            text = item.name,
                            fontWeight = FontWeight.Black,
                            fontSize = 18.sp,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                        
                        Text(
                            text = (item.rarity ?: "Common").uppercase(),
                            fontWeight = FontWeight.Bold,
                            color = rarityColor,
                            fontSize = 13.sp
                        )
                    }
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    user: User?,
    onLogout: () -> Unit,
    onRefreshProfile: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val toast = LocalToast.current
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("numera_prefs", android.content.Context.MODE_PRIVATE) }

    // State variables
    var searchQuery by remember { mutableStateOf("") }

    // Dialog states
    var showUsernameDialog by remember { mutableStateOf(false) }
    var showEmailDialog by remember { mutableStateOf(false) }
    var showSessionsDialog by remember { mutableStateOf(false) }
    var showLogsDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Placeholders modal states
    var showFaqDialog by remember { mutableStateOf(false) }
    var showContactDialog by remember { mutableStateOf(false) }
    var showBugDialog by remember { mutableStateOf(false) }
    var showFeatureDialog by remember { mutableStateOf(false) }
    var showGuidelinesDialog by remember { mutableStateOf(false) }
    var showPolicyDialog by remember { mutableStateOf(false) }
    var showTermsDialog by remember { mutableStateOf(false) }
    var showCreditsDialog by remember { mutableStateOf(false) }

    // Tooltips
    var showHapticsTooltip by remember { mutableStateOf(!prefs.getBoolean("tooltip_haptics_dismissed", false)) }
    var showMotionTooltip by remember { mutableStateOf(!prefs.getBoolean("tooltip_motion_dismissed", false)) }

    // Settings preferences
    var isDarkMode by remember { mutableStateOf(ThemeManager.isDarkMode) }
    var isHapticEnabled by remember { mutableStateOf(com.example.numera.haptic.HapticManager.isEnabled) }
    var isSoundMuted by remember { mutableStateOf(SoundManager.isMuted) }
    var soundVolume by remember { mutableStateOf(SoundManager.volume) }

    var timerEnabled by remember { mutableStateOf(prefs.getBoolean("timer_enabled", true)) }
    var autoClearWhiteboard by remember { mutableStateOf(prefs.getBoolean("auto_clear_whiteboard", true)) }
    var animationIntensity by remember { mutableStateOf(prefs.getFloat("animation_intensity", 1.0f)) }
    var fontSizeScale by remember { mutableStateOf(prefs.getFloat("font_size_scale", 1.0f)) }
    var reducedMotion by remember { mutableStateOf(prefs.getBoolean("reduced_motion", false)) }

    // Granular notification alerts
    var notifDaily by remember { mutableStateOf(prefs.getBoolean("notif_daily_puzzle", true)) }
    var notifStreak by remember { mutableStateOf(prefs.getBoolean("notif_streak", true)) }
    var notifFriends by remember { mutableStateOf(prefs.getBoolean("notif_friends", true)) }
    var notifAchievements by remember { mutableStateOf(prefs.getBoolean("notif_achievements", true)) }
    var notifRanked by remember { mutableStateOf(prefs.getBoolean("notif_ranked", true)) }
    var notifEvents by remember { mutableStateOf(prefs.getBoolean("notif_events", true)) }
    var notifSeasonal by remember { mutableStateOf(prefs.getBoolean("notif_seasonal", true)) }

    // Privacy & Security backend state
    var profilePrivate by remember { mutableStateOf((user?.profile_private ?: 0) == 1) }
    var telemetryEnabled by remember { mutableStateOf((user?.telemetry_enabled ?: 1) == 1) }

    LaunchedEffect(user) {
        if (user != null) {
            profilePrivate = (user.profile_private ?: 0) == 1
            telemetryEnabled = (user.telemetry_enabled ?: 1) == 1
        }
    }

    val saveToggle = { key: String, value: Boolean ->
        prefs.edit().putBoolean(key, value).apply()
    }

    // Structures to hold settings items to allow clean real-time search filtering
    data class SearchableSettingItem(
        val title: String,
        val description: String,
        val tags: String,
        val content: @Composable () -> Unit
    )

    val allSettingsList = remember(isDarkMode, isHapticEnabled, isSoundMuted, soundVolume, timerEnabled, autoClearWhiteboard, animationIntensity, fontSizeScale, reducedMotion, notifDaily, notifStreak, notifFriends, notifAchievements, notifRanked, notifEvents, notifSeasonal, profilePrivate, telemetryEnabled, user) {
        listOf(
            SearchableSettingItem("Dark Mode", "Switch to obsidian dark aesthetic", "theme appearance night mode colors black") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Dark Mode", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Switch to obsidian dark aesthetic", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = ThemeManager.isDarkMode,
                        onCheckedChange = {
                            ThemeManager.isDarkMode = it
                            isDarkMode = it
                            ThemeManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Haptic Feedback", "Tactile sensations on taps and events", "vibration physical touch feelings haptics feedback") {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Haptic Feedback", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                if (showHapticsTooltip) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                            .clickable {
                                                prefs.edit().putBoolean("tooltip_haptics_dismissed", true).apply()
                                                showHapticsTooltip = false
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Info ?", fontSize = 9.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            Text("Tactile sensations on taps and events", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = com.example.numera.haptic.HapticManager.isEnabled,
                            onCheckedChange = {
                                com.example.numera.haptic.HapticManager.isEnabled = it
                                isHapticEnabled = it
                                com.example.numera.haptic.HapticManager.saveSettings(context)
                                if (it) com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (showHapticsTooltip) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "💡 Tactical vibration confirms correct actions, achievements, and clicks. Tap 'Info ?' to dismiss.",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                }
            },
            SearchableSettingItem("Sound Effects", "Toggle audio feedback for correctness and buttons", "volume audio sound correct click mute") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Sound Effects", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Toggle audio feedback", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = !isSoundMuted,
                            onCheckedChange = { checked ->
                                isSoundMuted = !checked
                                SoundManager.isMuted = !checked
                                SoundManager.saveSettings(context)
                                com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (!isSoundMuted) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Vol: ${(soundVolume * 100).toInt()}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), modifier = Modifier.width(55.dp))
                            Slider(
                                value = soundVolume,
                                onValueChange = {
                                    soundVolume = it
                                    SoundManager.volume = it
                                },
                                onValueChangeFinished = {
                                    SoundManager.saveSettings(context)
                                },
                                valueRange = 0f..1f,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            },
            SearchableSettingItem("Timer Preferences", "Toggle game round countdown timers", "time countdown limit speed gameplay") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Level Countdown Timer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Add time constraints to your math problems", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = timerEnabled,
                        onCheckedChange = {
                            timerEnabled = it
                            saveToggle("timer_enabled", it)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Whiteboard Clear", "Automatically clear the whiteboard after submitting answers", "scratchpad board clean drawing canvas gameplay") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Auto-clear Whiteboard", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Reset drawing pad when answer is evaluated", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = autoClearWhiteboard,
                        onCheckedChange = {
                            autoClearWhiteboard = it
                            saveToggle("auto_clear_whiteboard", it)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Reduced Motion", "Reduce visual animation intensities and transit speeds", "motion animations performance speed graphics") {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Reduced Motion", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                if (showMotionTooltip) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), RoundedCornerShape(4.dp))
                                            .clickable {
                                                prefs.edit().putBoolean("tooltip_motion_dismissed", true).apply()
                                                showMotionTooltip = false
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Info ?", fontSize = 9.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            Text("Disable high intensity layout animations", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = reducedMotion,
                            onCheckedChange = {
                                reducedMotion = it
                                saveToggle("reduced_motion", it)
                                com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (showMotionTooltip) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "💡 Reduced motion simplifies tab transition fades and eliminates particle bursts. Tap 'Info ?' to dismiss.",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                }
            },
            SearchableSettingItem("Animation Intensity", "Adjust graphics scale and particle density", "graphics detail effects quality animations speed") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Animation Intensity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Control graphics rendering scales: ${(animationIntensity * 100).toInt()}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Slider(
                        value = animationIntensity,
                        onValueChange = {
                            animationIntensity = it
                        },
                        onValueChangeFinished = {
                            prefs.edit().putFloat("animation_intensity", animationIntensity).apply()
                        },
                        valueRange = 0f..1.2f,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            SearchableSettingItem("Text Font Size", "Scale screen typography readability sizes", "accessibility read display letters typography") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Font Readability Size", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    val fontLabel = when {
                        fontSizeScale <= 0.85f -> "Small (Accessibility)"
                        fontSizeScale <= 1.05f -> "Normal (Default)"
                        fontSizeScale <= 1.25f -> "Large (Readability)"
                        else -> "Extra Large"
                    }
                    Text("Scale: $fontLabel", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Slider(
                        value = fontSizeScale,
                        onValueChange = {
                            fontSizeScale = it
                        },
                        onValueChangeFinished = {
                            prefs.edit().putFloat("font_size_scale", fontSizeScale).apply()
                        },
                        valueRange = 0.8f..1.4f,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            SearchableSettingItem("Change Username", "Change your game display name", "profile account edit name tags details") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showUsernameDialog = true }.padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Change Username", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Current: ${user?.username ?: "Not set"}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Email Management", "Configure registered recovery email address", "account recovery security email details") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showEmailDialog = true }.padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Email Management", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Linked: ${if (user?.email.isNullOrBlank()) "None" else user?.email}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Active Sessions", "Audit devices connected to your credentials", "security logs logins active sessions device list") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showSessionsDialog = true }.padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Active Sessions", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Audit and revoke connected devices", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Security Activity Log", "Review login logs and credential events", "audit telemetry logins history security list") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showLogsDialog = true }.padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Security Activity Log", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Glance audit list of account actions", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Private Profile Settings", "Toggle statistics privacy filters", "privacy visibility friends public search rankings") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Private Profile", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Hide ELO ratings and Relics from others", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = profilePrivate,
                        onCheckedChange = { checked ->
                            profilePrivate = checked
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.updatePrivacy(token, PrivacyUpdateRequest(telemetryEnabled, checked))
                                    withContext(Dispatchers.Main) { onRefreshProfile() }
                                } catch(e: Exception) {
                                    Log.e("Settings", "Failed updating privacy: ${e.message}")
                                }
                            }
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Telemetry Preferences", "Control anonymous diagnostic reporting updates", "privacy logs telemetry data diagnostics server tracking") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Telemetry Diagnostics", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Share anonymous crashes for app stability", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = telemetryEnabled,
                        onCheckedChange = { checked ->
                            telemetryEnabled = checked
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.updatePrivacy(token, PrivacyUpdateRequest(checked, profilePrivate))
                                    withContext(Dispatchers.Main) { onRefreshProfile() }
                                } catch(e: Exception) {
                                    Log.e("Settings", "Failed updating telemetry: ${e.message}")
                                }
                            }
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Daily Puzzle Reminders", "Get notified when daily challenge is ready", "alerts daily quest schedule timers notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Daily Puzzle Reminders", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Never miss your daily math challenges", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifDaily, onCheckedChange = { notifDaily = it; saveToggle("notif_daily_puzzle", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Streak Danger Reminders", "Alerts when streak is close to resetting", "alerts streaks fire consistency notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Streak Reminders", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Alerts when your consistency streak is in danger", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifStreak, onCheckedChange = { notifStreak = it; saveToggle("notif_streak", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Social & Friend Alerts", "Notify on friend duels and status connections", "alerts social request duel notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Friend Activity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Duels invitations and connection alerts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifFriends, onCheckedChange = { notifFriends = it; saveToggle("notif_friends", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Achievement Completed Alerts", "Trigger badge unlock confirmations", "alerts badges accomplishments notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Achievement Alerts", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Trigger banner on badge unlocks", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifAchievements, onCheckedChange = { notifAchievements = it; saveToggle("notif_achievements", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Ranked Rating Changes", "Alerts when ELO placement status shifts", "alerts ranked rating arena matches notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Ranked Activity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Rating ELO adjustments and league promotions", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifRanked, onCheckedChange = { notifRanked = it; saveToggle("notif_ranked", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Live Quests Event Notifications", "Alerts when seasonal global events begin", "alerts quests events seasons notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Event Notifications", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Live updates for global quests challenges", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifEvents, onCheckedChange = { notifEvents = it; saveToggle("notif_events", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Seasonal Content Alerts", "Notify on shop content inventory additions", "alerts calendar themes shop updates notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Seasonal Updates", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Shop inventory catalog adjustments", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifSeasonal, onCheckedChange = { notifSeasonal = it; saveToggle("notif_seasonal", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            }
        )
    }

    // Filter items based on search query
    val filteredSettings = remember(searchQuery, allSettingsList) {
        if (searchQuery.isBlank()) {
            emptyList()
        } else {
            val q = searchQuery.lowercase()
            allSettingsList.filter { it.title.lowercase().contains(q) || it.description.lowercase().contains(q) || it.tags.contains(q) }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp)
    ) {
        // Toolbar Bar Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 12.dp, start = 12.dp, end = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = {
                com.example.numera.haptic.HapticManager.playSoft()
                onBack()
            }) {
                com.example.numera.ui.components.NumeraIcon(
                    type = com.example.numera.ui.components.NumeraIconType.Back,
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "Settings",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // Real-Time Search Bar TextField
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search settings (e.g. haptics, privacy)...", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) },
                leadingIcon = {
                    com.example.numera.ui.components.NumeraIcon(
                        type = com.example.numera.ui.components.NumeraIconType.Search,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.size(20.dp)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = ""; com.example.numera.haptic.HapticManager.playSoft() }) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Close,
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (searchQuery.isNotBlank()) {
            // Search Results Mode
            Text(
                text = "Search Results (${filteredSettings.size})",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )
            if (filteredSettings.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No settings matched your search query.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        filteredSettings.forEachIndexed { index, item ->
                            item.content()
                            if (index < filteredSettings.size - 1) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                            }
                        }
                    }
                }
            }
        } else {
            // Grouped Category Mode

            // 1. QUICK PREFERENCES ROW (At the top)
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                Text(
                    text = "Quick Preferences",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(start = 8.dp, bottom = 6.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Dark Mode compact
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(12.dp),
                        onClick = {
                            ThemeManager.isDarkMode = !ThemeManager.isDarkMode
                            ThemeManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (ThemeManager.isDarkMode) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = androidx.compose.material.icons.Icons.Default.Brightness4,
                                contentDescription = "Dark Mode Icon",
                                tint = if (ThemeManager.isDarkMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("Dark Mode", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }

                    // Haptics compact
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(12.dp),
                        onClick = {
                            val nextVal = !com.example.numera.haptic.HapticManager.isEnabled
                            com.example.numera.haptic.HapticManager.isEnabled = nextVal
                            com.example.numera.haptic.HapticManager.saveSettings(context)
                            if (nextVal) com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (com.example.numera.haptic.HapticManager.isEnabled) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = androidx.compose.material.icons.Icons.Default.Vibration,
                                contentDescription = "Haptics Icon",
                                tint = if (com.example.numera.haptic.HapticManager.isEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("Haptic Feed", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }

                    // Quick Mute compact
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(12.dp),
                        onClick = {
                            val nextMute = !isSoundMuted
                            isSoundMuted = nextMute
                            SoundManager.isMuted = nextMute
                            SoundManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (!isSoundMuted) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = if (isSoundMuted) androidx.compose.material.icons.Icons.Default.VolumeOff else androidx.compose.material.icons.Icons.Default.VolumeUp,
                                contentDescription = "Mute Icon",
                                tint = if (!isSoundMuted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("App Audio", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 2. ACCOUNT SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Profile,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Account settings", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    
                    // Username Change Row
                    allSettingsList.first { it.title == "Change Username" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Email Row
                    allSettingsList.first { it.title == "Email Management" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Password Changing block
                    var showPasswordSection by remember { mutableStateOf(false) }
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showPasswordSection = !showPasswordSection }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Password Management", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Update your account credentials", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(
                            imageVector = if (showPasswordSection) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    AnimatedVisibility(visible = showPasswordSection) {
                        var oldPassword by remember { mutableStateOf("") }
                        var newPassword by remember { mutableStateOf("") }
                        var confirmPassword by remember { mutableStateOf("") }
                        var pwStatusMsg by remember { mutableStateOf<String?>(null) }
                        var pwIsError by remember { mutableStateOf(false) }
                        var pwIsLoading by remember { mutableStateOf(false) }

                        Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
                            OutlinedTextField(
                                value = oldPassword,
                                onValueChange = { oldPassword = it },
                                label = { Text("Current Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = { Text("New Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = { Text("Confirm New Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            )
                            pwStatusMsg?.let { msg ->
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = msg,
                                    color = if (pwIsError) WrongRed else CorrectGreen,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    if (oldPassword.isBlank() || newPassword.isBlank()) {
                                        pwStatusMsg = "Please fill in all fields"
                                        pwIsError = true
                                        return@Button
                                    }
                                    if (newPassword != confirmPassword) {
                                        pwStatusMsg = "Passwords do not match"
                                        pwIsError = true
                                        return@Button
                                    }
                                    if (newPassword.length < 8) {
                                        pwStatusMsg = "Password must be at least 8 characters"
                                        pwIsError = true
                                        return@Button
                                    }
                                    pwIsLoading = true
                                    pwStatusMsg = null
                                    scope.launch(Dispatchers.IO) {
                                        try {
                                            val token = RetrofitClient.authToken ?: ""
                                            val res = RetrofitClient.apiService.changePassword(
                                                token, PasswordChangeRequest(oldPassword, newPassword)
                                            )
                                            withContext(Dispatchers.Main) {
                                                pwIsLoading = false
                                                if (res.success) {
                                                    pwStatusMsg = "✅ Password updated successfully!"
                                                    pwIsError = false
                                                    oldPassword = ""
                                                    newPassword = ""
                                                    confirmPassword = ""
                                                } else {
                                                    pwStatusMsg = res.message
                                                    pwIsError = true
                                                }
                                            }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) {
                                                pwIsLoading = false
                                                pwStatusMsg = "Failed: ${e.message}"
                                                pwIsError = true
                                            }
                                        }
                                    }
                                },
                                enabled = !pwIsLoading,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                if (pwIsLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Text("Update Password", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Connected active sessions device lists
                    allSettingsList.first { it.title == "Active Sessions" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Audit Security Logs Row
                    allSettingsList.first { it.title == "Security Activity Log" }.content()
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 3. GAMEPLAY SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Arena,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Gameplay options", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Sound Toggle inside card
                    allSettingsList.first { it.title == "Sound Effects" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Countdown timer
                    allSettingsList.first { it.title == "Timer Preferences" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Auto clear whiteboard
                    allSettingsList.first { it.title == "Whiteboard Clear" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Accessibility scale sizes
                    allSettingsList.first { it.title == "Text Font Size" }.content()
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 4. APPEARANCE SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Settings,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp),
                            animate = false
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Appearance & themes", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Accent theme equip blocks
                    Text("🎨 Equipped Theme Accent", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Unlock and choose your math identity", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(4.dp))
                    
                    val themesList = listOf(
                        "duolingo" to "Duo",
                        "neon_eclipse" to "Eclipse",
                        "emerald_abyss" to "Emerald",
                        "crimson_nebula" to "Crimson",
                        "cyberpunk" to "Cyber",
                        "aurora" to "Aurora",
                        "ocean" to "Ocean",
                        "sunset" to "Sunset",
                        "midnight" to "Midnight"
                    )
                    val chunked = themesList.chunked(5)
                    chunked.forEach { rowItems ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
                        ) {
                            rowItems.forEach { (themeKey, themeLabel) ->
                                val isActive = user?.theme == themeKey || (user?.theme == null && themeKey == "duolingo")
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                        .clickable {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    val res = RetrofitClient.apiService.equipItem(token, EquipRequest("theme", themeKey))
                                                    if (res.success) {
                                                        withContext(Dispatchers.Main) {
                                                            ThemeManager.currentTheme = themeKey
                                                            ThemeManager.saveSettings(context)
                                                            toast.success("Theme applied")
                                                            onRefreshProfile()
                                                        }
                                                    }
                                                } catch (e: Exception) {
                                                    Log.e("Settings", "Theme equip err: ${e.message}")
                                                }
                                            }
                                        }
                                        .padding(vertical = 8.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = themeLabel,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isActive) Color.White else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                            repeat(5 - rowItems.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Dark Mode Toggle
                    allSettingsList.first { it.title == "Dark Mode" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Reduced motion accessibilities
                    allSettingsList.first { it.title == "Reduced Motion" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Animation Intensity
                    allSettingsList.first { it.title == "Animation Intensity" }.content()
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 5. NOTIFICATIONS CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Notification,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Granular notification control", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Daily Puzzle Reminders" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Streak Danger Reminders" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Social & Friend Alerts" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Achievement Completed Alerts" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Ranked Rating Changes" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Live Quests Event Notifications" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Seasonal Content Alerts" }.content()
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 6. PRIVACY & SECURITY CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Lock,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Privacy & Security controls", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Private Profile Settings" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Telemetry Preferences" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Data Export Button
                    var exportLoading by remember { mutableStateOf(false) }
                    var exportFinished by remember { mutableStateOf(false) }
                    var exportFilePath by remember { mutableStateOf("") }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Export Account Data", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Download GDPR-compliant JSON profile history", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Button(
                            onClick = {
                                exportLoading = true
                                exportFinished = false
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        val responseBody = RetrofitClient.apiService.exportData(token)
                                        val jsonString = responseBody.string()
                                        
                                        // Save to app external storage folder for maximum safety
                                        val file = java.io.File(context.getExternalFilesDir(null), "numera_user_data.json")
                                        file.writeText(jsonString)
                                        
                                        withContext(Dispatchers.Main) {
                                            exportLoading = false
                                            exportFinished = true
                                            exportFilePath = file.absolutePath
                                            com.example.numera.haptic.HapticManager.playSuccess()
                                        }
                                    } catch(e: Exception) {
                                        Log.e("Settings", "Failed data export: ${e.message}")
                                        withContext(Dispatchers.Main) { exportLoading = false }
                                    }
                                }
                            },
                            enabled = !exportLoading,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (exportLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Text("Export", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    if (exportFinished) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "✅ File exported to: $exportFilePath",
                            fontSize = 10.sp,
                            color = CorrectGreen,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Account deletion card row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Delete Account", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.error)
                            Text("Permanently wipe profile data (Irreversible)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Button(
                            onClick = { showDeleteDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Delete", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 7. HELP & SUPPORT CARD (Visual Placeholders)
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Warning,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Help & Support", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // FAQ row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showFaqDialog = true }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Frequently Asked Questions", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Find answers to common problem queries", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Contact row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showContactDialog = true }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Contact Customer Support", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Submit feedback direct to creators", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Report bug row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showBugDialog = true }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Report a System Bug", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Log mathematical template formatting errors", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Feature Request row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showFeatureDialog = true }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Request New Feature", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Suggest topics, avatars, or banner options", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Community Guidelines row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showGuidelinesDialog = true }.padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Community Guidelines", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Code of conduct for duels and social chats", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // 8. ABOUT CARD (At the bottom, low visual priority)
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Learn,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("About Numera", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Client Version", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text("v1.2.0 (Build 3020)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showPolicyDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Privacy Policy", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showTermsDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Terms of Service", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showCreditsDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Credits & Contributors", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Logout Button
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(50.dp)
            ) {
                Text("Log Out Account", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }

    // ==========================================
    // DIALOGS & POPUPS DEFINITIONS
    // ==========================================

    // 1. Username Dialog
    if (showUsernameDialog) {
        var newUsername by remember { mutableStateOf(user?.username ?: "") }
        var statusMsg by remember { mutableStateOf<String?>(null) }
        var isError by remember { mutableStateOf(false) }
        var isLoading by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isLoading) showUsernameDialog = false },
            title = { Text("Change Username", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Your username is how friends identify you in duels.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    OutlinedTextField(
                        value = newUsername,
                        onValueChange = { newUsername = it },
                        label = { Text("New Username") },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    )
                    statusMsg?.let { msg ->
                        Text(msg, color = if (isError) WrongRed else CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newUsername.trim().length < 3) {
                            statusMsg = "Username must be at least 3 characters"
                            isError = true
                            return@Button
                        }
                        isLoading = true
                        statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                val res = RetrofitClient.apiService.changeUsername(token, ChangeUsernameRequest(newUsername))
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    if (res.success) {
                                        statusMsg = "Username updated!"
                                        isError = false
                                        onRefreshProfile()
                                        scope.launch {
                                            kotlinx.coroutines.delay(800)
                                            showUsernameDialog = false
                                        }
                                    } else {
                                        statusMsg = res.message
                                        isError = true
                                    }
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    statusMsg = "Failed: ${e.message}"
                                    isError = true
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Save")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showUsernameDialog = false }, enabled = !isLoading) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 2. Email Management Dialog
    if (showEmailDialog) {
        var showVerifyInput by remember { mutableStateOf(false) }
        var emailText by remember { mutableStateOf(user?.email ?: "") }
        var codeText by remember { mutableStateOf("") }
        var statusMsg by remember { mutableStateOf<String?>(null) }
        var isError by remember { mutableStateOf(false) }
        var isLoading by remember { mutableStateOf(false) }
        var sentCode by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!isLoading) showEmailDialog = false },
            title = { Text("Email Management", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (!showVerifyInput) {
                        Text("Link your email address to recover your account.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = emailText,
                            onValueChange = { emailText = it },
                            label = { Text("Email Address") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text("Enter the 6-digit verification code sent to $emailText.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        if (sentCode.isNotEmpty()) {
                            Text("Local Sandbox Code: $sentCode", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                        }
                        OutlinedTextField(
                            value = codeText,
                            onValueChange = { codeText = it },
                            label = { Text("Verification Code") },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    statusMsg?.let { msg ->
                        Text(msg, color = if (isError) WrongRed else CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isLoading = true
                        statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                if (!showVerifyInput) {
                                    val res = RetrofitClient.apiService.requestEmailChange(token, RequestEmailChangePayload(emailText))
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        if (res.success) {
                                            statusMsg = "Code sent! Check console / display below."
                                            isError = false
                                            sentCode = res.code ?: ""
                                            showVerifyInput = true
                                        } else {
                                            statusMsg = res.message
                                            isError = true
                                        }
                                    }
                                } else {
                                    val res = RetrofitClient.apiService.verifyEmailChange(token, VerifyEmailChangePayload(codeText))
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        if (res.success) {
                                            statusMsg = "Email address linked!"
                                            isError = false
                                            onRefreshProfile()
                                            scope.launch {
                                                kotlinx.coroutines.delay(800)
                                                showEmailDialog = false
                                            }
                                        } else {
                                            statusMsg = res.message
                                            isError = true
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    statusMsg = "Failed: ${e.message}"
                                    isError = true
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text(if (showVerifyInput) "Verify" else "Request Code")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        if (showVerifyInput) {
                            showVerifyInput = false
                            statusMsg = null
                        } else {
                            showEmailDialog = false
                        }
                    },
                    enabled = !isLoading
                ) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 3. Sessions Dialog
    if (showSessionsDialog) {
        var sessionsList by remember { mutableStateOf<List<UserSessionDto>>(emptyList()) }
        var loadingSessions by remember { mutableStateOf(false) }

        val fetchSessions = {
            loadingSessions = true
            scope.launch(Dispatchers.IO) {
                try {
                    val token = RetrofitClient.authToken ?: ""
                    val list = RetrofitClient.apiService.getSessions(token)
                    withContext(Dispatchers.Main) {
                        sessionsList = list
                        loadingSessions = false
                    }
                } catch(e: Exception) {
                    Log.e("Settings", "Failed fetching sessions: ${e.message}")
                    withContext(Dispatchers.Main) { loadingSessions = false }
                }
            }
        }

        LaunchedEffect(Unit) {
            fetchSessions()
        }

        AlertDialog(
            onDismissRequest = { showSessionsDialog = false },
            title = { Text("Active Connected Devices", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().height(260.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("Revoking a session will immediately force that device to log out.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(4.dp))
                    if (loadingSessions) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            sessionsList.forEach { session ->
                                val deviceName = if (session.user_agent.contains("Mozilla")) "Web Browser" else "Mobile App"
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(deviceName, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                if (session.is_current) {
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Box(
                                                        modifier = Modifier
                                                            .background(CorrectGreen, RoundedCornerShape(4.dp))
                                                            .padding(horizontal = 4.dp, vertical = 2.dp)
                                                    ) {
                                                        Text("CURRENT", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                            Text("IP: ${session.ip_address}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US)
                                                .format(java.util.Date(session.created_at * 1000))
                                            Text("Connected: $dateStr", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        }
                                        if (!session.is_current) {
                                            Button(
                                                onClick = {
                                                    scope.launch(Dispatchers.IO) {
                                                        try {
                                                            val token = RetrofitClient.authToken ?: ""
                                                            val res = RetrofitClient.apiService.revokeSession(token, RevokeSessionRequest(session.id))
                                                            if (res.success) {
                                                                fetchSessions()
                                                            }
                                                        } catch(e: Exception) {
                                                            Log.e("Settings", "Failed revoke: ${e.message}")
                                                        }
                                                    }
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                                shape = RoundedCornerShape(8.dp),
                                                modifier = Modifier.height(28.dp).padding(horizontal = 2.dp)
                                            ) {
                                                Text("Revoke", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSessionsDialog = false }) { Text("Close") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 4. Security Log Dialog
    if (showLogsDialog) {
        var logsList by remember { mutableStateOf<List<SecurityLogDto>>(emptyList()) }
        var loadingLogs by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            loadingLogs = true
            scope.launch(Dispatchers.IO) {
                try {
                    val token = RetrofitClient.authToken ?: ""
                    val list = RetrofitClient.apiService.getSecurityLogs(token)
                    withContext(Dispatchers.Main) {
                        logsList = list
                        loadingLogs = false
                    }
                } catch(e: Exception) {
                    Log.e("Settings", "Failed security logs: ${e.message}")
                    withContext(Dispatchers.Main) { loadingLogs = false }
                }
            }
        }

        AlertDialog(
            onDismissRequest = { showLogsDialog = false },
            title = { Text("Security Activity Log", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().height(280.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("A transparent record of security events related to your profile credentials.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(4.dp))
                    if (loadingLogs) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (logsList.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("No security events logged yet.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                }
                            } else {
                                logsList.forEach { log ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f))
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                val eventLabel = log.event_type.replace("_", " ").uppercase()
                                                Text(eventLabel, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                                                val logDate = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US)
                                                    .format(java.util.Date(log.timestamp * 1000))
                                                Text(logDate, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            }
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(log.details, fontSize = 11.sp)
                                            Text("Origin IP: ${log.ip_address}", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLogsDialog = false }) { Text("Close") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 5. Delete Account Dialog
    if (showDeleteDialog) {
        var deleteIsLoading by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { if (!deleteIsLoading) showDeleteDialog = false },
            title = { Text("Permanently Delete Account?", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.error) },
            text = {
                Text(
                    text = "This action is irreversible. All your level progression, rating ELO, relics, coin balance, and custom banners will be permanently wiped.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        deleteIsLoading = true
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                val res = RetrofitClient.apiService.deleteAccount(token)
                                withContext(Dispatchers.Main) {
                                    deleteIsLoading = false
                                    if (res.success) {
                                        showDeleteDialog = false
                                        onLogout()
                                    }
                                }
                            } catch(e: Exception) {
                                Log.e("Settings", "Failed deletion: ${e.message}")
                                withContext(Dispatchers.Main) { deleteIsLoading = false }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    enabled = !deleteIsLoading,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (deleteIsLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Delete Everything", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }, enabled = !deleteIsLoading) { Text("Keep Account") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 6. FAQ dialog (Placeholders)
    if (showFaqDialog) {
        AlertDialog(
            onDismissRequest = { showFaqDialog = false },
            title = { Text("Frequently Asked Questions", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column {
                        Text("How do I gain rank ELO?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Gain ELO rating by winning ranked duels against other players or bots in the Arena tab.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider()
                    Column {
                        Text("What are Streak Shields?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Streak Shields automatically protect your daily consistency streak if you fail to log in and complete a level. Purchase them in the Shop.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider()
                    Column {
                        Text("How are Relics unlocked?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Milestone Relics are unlocked automatically in your Profile when you maintain active daily consistency paths for 3, 7, 30, and 100 days.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showFaqDialog = false }) { Text("Dismiss") }
            }
        )
    }

    // 7. Contact Support dialog (Placeholders)
    if (showContactDialog) {
        var subject by remember { mutableStateOf("") }
        var bodyMsg by remember { mutableStateOf("") }
        var submitted by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { showContactDialog = false },
            title = { Text("Contact Support", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (!submitted) {
                        Text("Submit a ticket directly to our development team.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = subject,
                            onValueChange = { subject = it },
                            label = { Text("Subject") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = bodyMsg,
                            onValueChange = { bodyMsg = it },
                            label = { Text("Message details") },
                            modifier = Modifier.fillMaxWidth().height(100.dp)
                        )
                    } else {
                        Text("Thank you! Your support ticket has been logged. We will review your query.", fontSize = 13.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (submitted) {
                        showContactDialog = false
                    } else {
                        submitted = true
                        com.example.numera.haptic.HapticManager.playSuccess()
                    }
                }) {
                    Text(if (submitted) "Close" else "Submit ticket")
                }
            },
            dismissButton = {
                if (!submitted) {
                    TextButton(onClick = { showContactDialog = false }) { Text("Cancel") }
                }
            }
        )
    }

    // 8. Report Bug dialog (Placeholders)
    if (showBugDialog) {
        var bugTitle by remember { mutableStateOf("") }
        var bugDesc by remember { mutableStateOf("") }
        var submitted by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { showBugDialog = false },
            title = { Text("Report a Bug", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (!submitted) {
                        Text("Let us know about errors in math generation, UI glitches, or freezes.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = bugTitle,
                            onValueChange = { bugTitle = it },
                            label = { Text("Bug Title") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = bugDesc,
                            onValueChange = { bugDesc = it },
                            label = { Text("Steps to Reproduce") },
                            modifier = Modifier.fillMaxWidth().height(100.dp)
                        )
                    } else {
                        Text("Bug report submitted! Thank you for helping us improve Numera.", fontSize = 13.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (submitted) {
                        showBugDialog = false
                    } else {
                        submitted = true
                        com.example.numera.haptic.HapticManager.playSuccess()
                    }
                }) {
                    Text(if (submitted) "Close" else "Submit report")
                }
            },
            dismissButton = {
                if (!submitted) {
                    TextButton(onClick = { showBugDialog = false }) { Text("Cancel") }
                }
            }
        )
    }

    // 9. Feature Request (Placeholders)
    if (showFeatureDialog) {
        AlertDialog(
            onDismissRequest = { showFeatureDialog = false },
            title = { Text("Request Feature", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Vote for features or suggest new ones. Comming soon!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("📐 LaTeX Math Canvas Renderer", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("▲ 85 Votes", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("🛡️ SRS Decay Alert Notification", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("▲ 42 Votes", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showFeatureDialog = false }) { Text("Close") }
            }
        )
    }

    // 10. Guidelines (Placeholders)
    if (showGuidelinesDialog) {
        AlertDialog(
            onDismissRequest = { showGuidelinesDialog = false },
            title = { Text("Community Guidelines", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text("1. Academic Honesty: Use scratchpads for solving, do not use external equation solvers during ranked Arena matches.", fontSize = 12.sp)
                    Text("2. Respectful Behavior: Maintain clean profiles. Verbal toxicity in lobbies will result in chat bans.", fontSize = 12.sp)
                    Text("3. Growth Mindset: Support learning friends and celebrate their relic milestones.", fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { showGuidelinesDialog = false }) { Text("Close") }
            }
        )
    }

    // 11. Privacy Policy
    if (showPolicyDialog) {
        AlertDialog(
            onDismissRequest = { showPolicyDialog = false },
            title = { Text("Privacy Policy", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "Numera is built to foster math learning. We value user privacy. Profile ratings, solved stats, and connections are stored in the local sandbox database. Telemetry parameters track performance metrics anonymously. No credentials are sold or shared with external analytics brokers.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showPolicyDialog = false }) { Text("Close") }
            }
        )
    }

    // 12. Terms of Service
    if (showTermsDialog) {
        AlertDialog(
            onDismissRequest = { showTermsDialog = false },
            title = { Text("Terms of Service", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "By accessing Numera Quest, you agree to engage in fair academic play. Cheating, bot usage, or manipulation of coins balance is strictly forbidden. The game client and server assets are owned by the Advanced Agentic Coding team, provided for peer learning, sandbox exploration, and mathematical progression.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showTermsDialog = false }) { Text("Close") }
            }
        )
    }

    // 13. Credits
    if (showCreditsDialog) {
        AlertDialog(
            onDismissRequest = { showCreditsDialog = false },
            title = { Text("Credits & Contributors", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Numera Quest Math Client", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text("Developed by Antigravity and the AAC AI Coding Team.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Special Thanks:", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("• Duolingo, for layout gamification inspiration.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Text("• Jetpack Compose & Material 3, enabling sleek layouts.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Text("• Our dedicated Beta Testers, pointing out bugs.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            },
            confirmButton = {
                TextButton(onClick = { showCreditsDialog = false }) { Text("Dismiss") }
            }
        )
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
fun ThemePreview(themeKey: String, modifier: Modifier = Modifier) {
    val colors = when (themeKey) {
        "duolingo", "theme_duolingo" -> Triple(DuoPrimary, DuoSecondary, DuoTertiary)
        "cyberpunk", "theme_cyberpunk" -> Triple(CyberPrimary, CyberSecondary, CyberTertiary)
        "eclipse", "theme_eclipse", "neon_eclipse", "theme_neon_eclipse" -> Triple(EclipsePrimary, EclipseSecondary, EclipseTertiary)
        "emerald", "theme_emerald", "emerald_abyss", "theme_emerald_abyss" -> Triple(EmeraldPrimary, EmeraldSecondary, EmeraldTertiary)
        "crimson", "theme_crimson", "crimson_nebula", "theme_crimson_nebula" -> Triple(CrimsonPrimary, CrimsonSecondary, CrimsonTertiary)
        "aurora", "theme_aurora" -> Triple(AuroraPrimary, AuroraSecondary, AuroraTertiary)
        "ocean", "theme_ocean" -> Triple(OceanPrimary, OceanSecondary, OceanTertiary)
        "sunset", "theme_sunset" -> Triple(SunsetPrimary, SunsetSecondary, SunsetTertiary)
        "midnight", "theme_midnight" -> Triple(MidnightPrimary, MidnightSecondary, MidnightTertiary)
        else -> Triple(DuoPrimary, DuoSecondary, DuoTertiary)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .background(Color.White)
            .border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f).copy(alpha = 0.5f), RoundedCornerShape(8.dp))
            .padding(4.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(colors.first))
            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(colors.second))
            Box(modifier = Modifier.size(12.dp).clip(CircleShape).background(colors.third))
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

data class LevelDebriefInfo(
    val title: String,
    val categoryName: String,
    val eloRating: String,
    val description: String,
    val concepts: List<String>
)

fun getLevelDebriefInfo(levelNum: Int): LevelDebriefInfo {
    // Milestones
    if (levelNum == 10) {
        return LevelDebriefInfo(
            title = "The Pythagorean Theorem",
            categoryName = "Arithmetic Milestone",
            eloRating = "Standard (800-1200)",
            description = "Master right-angled triangles using the famous formula relating perpendicular sides and the hypotenuse.",
            concepts = listOf("Right triangles", "Hypotenuse", "Pythagorean Triples")
        )
    }
    if (levelNum == 20) {
        return LevelDebriefInfo(
            title = "Fermat's Little Theorem",
            categoryName = "Algebra Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Apply modular algebra and prime modulus reductions to simplify large exponential congruences.",
            concepts = listOf("Prime modulus", "Congruences", "Modular reduction")
        )
    }
    if (levelNum == 30) {
        return LevelDebriefInfo(
            title = "The Binomial Theorem",
            categoryName = "Combinatorics Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Expand algebraic expressions of the form (x+y)^n and determine coefficients using combination selections.",
            concepts = listOf("Binomial coefficients", "Combinations selection", "Pascal's Triangle")
        )
    }
    if (levelNum == 40) {
        return LevelDebriefInfo(
            title = "Fundamental Theorem of Calculus",
            categoryName = "Calculus Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Evaluate definite Riemann integrals using antiderivatives over bound intervals.",
            concepts = listOf("Antiderivatives", "Definite Integration", "Integration Bounds")
        )
    }
    if (levelNum == 50) {
        return LevelDebriefInfo(
            title = "Euler's Totient Theorem",
            categoryName = "Number Theory Milestone",
            eloRating = "Expert (1200-1500)",
            description = "Utilize Euler's totient function and modular totient theorems to solve complex modular relations.",
            concepts = listOf("Euler's phi function", "Coprimality", "Totient reduction")
        )
    }
    if (levelNum == 60) {
        return LevelDebriefInfo(
            title = "Euler's Identity",
            categoryName = "Grand Milestone",
            eloRating = "Insane (>1500)",
            description = "Confront the most beautiful relation in mathematics, linking e, i, pi, 1, and 0 in complex calculations.",
            concepts = listOf("Complex analysis", "Euler's formula", "Mathematical constants")
        )
    }

    // Interleaved levels
    val category = when (levelNum % 6) {
        0 -> "Number Theory"
        1 -> "Arithmetic"
        2 -> "Mental Math"
        3 -> "Algebra"
        4 -> "Calculus"
        else -> "Combinatorics"
    }

    val elo = when {
        levelNum <= 15 -> "Beginner (<800)"
        levelNum <= 30 -> "Standard (800-1200)"
        levelNum <= 45 -> "Expert (1200-1500)"
        else -> "Insane (>1500)"
    }

    // Specific sub-level index for category
    val index = (levelNum - 1) / 6 + 1

    val (title, description, concepts) = when (category) {
        "Arithmetic" -> {
            when (index) {
                1 -> Triple("Single-Digit Addition", "Master simple arithmetic summing single-digit integers.", listOf("Addition", "Number Line"))
                2 -> Triple("Two-Digit Sums", "Calculate sums of two-digit and single-digit integers without carrying.", listOf("Units column", "Tens column"))
                3 -> Triple("Decomposed Addition", "Evaluate double-digit additions by decomposing into place values.", listOf("Place value", "Decomposition"))
                4 -> Triple("Multi-Operand Sums", "Evaluate expressions combining three addition and subtraction terms.", listOf("Operation Precedence", "Operators"))
                5 -> Triple("Addition with Carry", "Perform two-digit summation requiring carrying over units to tens.", listOf("Carrying rule", "Columns alignment"))
                6 -> Triple("Subtraction under Borrow", "Evaluate differences requiring borrowing from the tens column.", listOf("Borrowing rule", "Minuend/Subtrahend"))
                7 -> Triple("Multiplication Tables", "Compute products of single digits representing repeated additions.", listOf("Scaling", "Product"))
                8 -> Triple("Inverse Division", "Evaluate division using inverse multiplication tables.", listOf("Quotient", "Divisor", "Dividend"))
                else -> Triple("Order of Operations", "Evaluate complex arithmetic expressions following PEMDAS precedence.", listOf("Precedence", "Multiplication first"))
            }
        }
        "Mental Math" -> {
            when (index) {
                1 -> Triple("Mental Multiples", "Calculate additions and subtractions of multiples of 10 and 5 mentally.", listOf("Visualization", "Multiples of 10"))
                2 -> Triple("Basic Percentages", "Quickly evaluate common percentages like 10%, 25%, 50%, and 75% of integers.", listOf("Ratios", "Fractions"))
                3 -> Triple("Tricky Percentages", "Calculate percentages like 15%, 35%, 60% of numbers mentally.", listOf("Mental decomposition", "Parts scaling"))
                4 -> Triple("Shortcuts Multiplication", "Apply mental multiplication shortcuts for multiplying by 5, 9, or 11.", listOf("Distributive trick", "Halving"))
                5 -> Triple("Mental Squaring", "Mentally compute squares of integers between 11 and 20.", listOf("Self-multiplication", "Base scaling"))
                6 -> Triple("Mental Cubing", "Compute cubes of single-digit integers mentally.", listOf("Cubes", "Power of 3"))
                7 -> Triple("Nearest Integer Estimation", "Estimate float products to the nearest integer.", listOf("Rounding", "Float scaling"))
                8 -> Triple("Arithmetic Mean", "Calculate average values of small lists of integers.", listOf("Summation", "Dividing count"))
                9 -> Triple("Sample Space Roll", "Determine count of dice combinations summing to target values.", listOf("Dice outcomes", "Probability space"))
                else -> Triple("Compound Percentage", "Compute consecutive percentages of base integers mentally.", listOf("Compound ratio", "Sequential multiplication"))
            }
        }
        "Algebra" -> {
            when (index) {
                1 -> Triple("One-Step Equations (+/-)", "Isolate unknown variable x by adding or subtracting constants.", listOf("Variable", "Inverse addition"))
                2 -> Triple("One-Step Equations (*/)", "Solve equations requiring division to isolate variables.", listOf("Coefficient", "Inverse multiplication"))
                3 -> Triple("Two-Step Equations", "Solve equations of form ax + b = c by combining multiple isolation steps.", listOf("Constant subtraction", "Division"))
                4 -> Triple("Variables on Both Sides", "Isolate variables by moving all x terms to one side.", listOf("Simplification", "Balancing"))
                5 -> Triple("Quadratic Roots", "Determine larger integer roots of factored quadratic equations.", listOf("Roots", "Factoring"))
                6 -> Triple("Linear Systems", "Solve systems of two simultaneous linear equations.", listOf("Substitution", "Elimination"))
                7 -> Triple("Matrix Trace", "Calculate the sum of the main diagonal elements of 2x2 matrices.", listOf("Square Matrix", "Diagonal sum"))
                8 -> Triple("Matrix Determinants", "Evaluate det(A) of 2x2 matrices with positive integers.", listOf("Cross multiplication", "Determinant"))
                else -> Triple("Signed Matrix Determinants", "Compute det(A) of 2x2 matrices with negative integer elements.", listOf("Negative signs", "Precedence"))
            }
        }
        "Calculus" -> {
            when (index) {
                1 -> Triple("Power Rule Derivative", "Evaluate derivatives of power functions ax^b at x=1.", listOf("Derivatives", "Power rule"))
                2 -> Triple("Polynomial Differentiation", "Evaluate derivative of polynomial functions at x=1.", listOf("Sum rule", "Term-by-term"))
                3 -> Triple("Tangent Line Slope", "Find derivative value at non-trivial evaluation points.", listOf("Slope", "Tangent"))
                4 -> Triple("Trig Differentiation", "Find derivative of functions combining trig and linear terms at x=0.", listOf("Cosine derivative", "Trig evaluation"))
                5 -> Triple("Constant Integrals", "Evaluate definite integrals of constant functions over positive intervals.", listOf("Antiderivative", "Interval area"))
                6 -> Triple("Linear Definite Integrals", "Integrate linear functions using the reverse power rule.", listOf("Reverse power rule", "Integration limits"))
                7 -> Triple("Average Value of Function", "Calculate mean height of quadratic functions over intervals.", listOf("Average formula", "Definite integral"))
                8 -> Triple("Linear Sequence Limits", "Determine sequence limits as n approaches infinity for linear functions.", listOf("Asymptotes", "Limits at infinity"))
                else -> Triple("Quadratic Sequence Limits", "Determine sequence limits as n approaches infinity for quadratic functions.", listOf("Dominant term", "Rational limits"))
            }
        }
        "Combinatorics" -> {
            when (index) {
                1 -> Triple("Pigeonhole Principle I", "Determine minimum draws to guarantee a color repeat.", listOf("Dirichlet principle", "Worst-case"))
                2 -> Triple("Pigeonhole Principle II", "Apply pigeonhole rules to complex color distributions.", listOf("Pigeonholes", "Matching pair"))
                3 -> Triple("Linear Permutations", "Compute distinct ways to arrange unique items in a row.", listOf("Factorial", "Arrangements"))
                4 -> Triple("Multiset Permutations", "Determine distinct letter arrangements for words with repeat characters.", listOf("Repeating letters", "Permutations"))
                5 -> Triple("Binomial Coefficients", "Evaluate combinations representing ways to choose subsets.", listOf("Combinations", "Subset selection"))
                6 -> Triple("Combinatorial Handshakes", "Compute total handshakes or games played in tournament formats.", listOf("Subsets of size 2", "Binomial coefficient"))
                7 -> Triple("Coin Flip Sample Space", "Calculate total outcomes for sequential independent events.", listOf("Independent events", "Powers of 2"))
                8 -> Triple("Circular Permutations", "Evaluate distinct circular seating arrangements of people.", listOf("Circular fixing", "N-1 factorial"))
                else -> Triple("Stars and Bars", "Compute number of ways to distribute tokens into distinct boxes.", listOf("Identical tokens", "Stars and bars"))
            }
        }
        else -> { // Number Theory
            when (index) {
                1 -> Triple("Basic GCD", "Determine greatest common divisor using factors.", listOf("Common divisor", "Euclidean reduction"))
                2 -> Triple("Advanced GCD", "Find GCD of larger integers using Euclidean remainder divisions.", listOf("Euclidean algorithm", "Remainders"))
                3 -> Triple("Modular Addition", "Evaluate modular sums over positive integer moduli.", listOf("Modulus", "Remainder"))
                4 -> Triple("Modular Multiplication", "Evaluate modular product of integer bases.", listOf("Congruence", "Modular scale"))
                5 -> Triple("Modular Exponentiation I", "Compute small modular powers by consecutive multiplication.", listOf("Powers", "Modular cycle"))
                6 -> Triple("Modular Exponentiation II", "Evaluate modular powers using successive squaring.", listOf("Successive squaring", "Modulo reduction"))
                7 -> Triple("Positive Divisors", "Determine total count of positive divisors from prime factorizations.", listOf("Prime factors", "Divisor count"))
                8 -> Triple("Euler Totient Prime", "Find phi(p) for prime integers p.", listOf("Totient function", "Coprimes"))
                else -> Triple("Euler Totient Composite", "Calculate phi(n) for composite products of two primes.", listOf("Multiplicative property", "Euler phi"))
            }
        }
    }

    return LevelDebriefInfo(title, category, elo, description, concepts)
}

@Composable
fun LevelDebriefDialog(
    levelNum: Int,
    category: String,
    onDismissRequest: () -> Unit,
    onStartLesson: () -> Unit
) {
    val debrief = remember(levelNum) { getLevelDebriefInfo(levelNum) }

    LaunchedEffect(levelNum) {
        SoundManager.playRewardClaim()
    }

    val (startColor, endColor, _) = when {
        category == "mental" -> Triple(Color(0xFF818CF8), Color(0xFF4F46E5), Color(0xFF3730A3))
        category == "arithmetic" -> Triple(Color(0xFF34D399), Color(0xFF059669), Color(0xFF065F46))
        category == "algebra" -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
        category == "number_theory" -> Triple(Color(0xFF2DD4BF), Color(0xFF0D9488), Color(0xFF115E59))
        category == "calculus" -> Triple(Color(0xFF3B82F6), Color(0xFF2563EB), Color(0xFF1E3A8A))
        category == "combinatorics" -> Triple(Color(0xFFEC4899), Color(0xFFDB2777), Color(0xFF881337))
        else -> Triple(Color(0xFFFBBF24), Color(0xFFD97706), Color(0xFF92400E))
    }

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismissRequest) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            borderColor = startColor
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with Subject Tag & Close button
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .background(startColor.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                            .border(1.dp, startColor, RoundedCornerShape(8.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = debrief.categoryName.uppercase(),
                            color = startColor,
                            fontWeight = FontWeight.Black,
                            fontSize = 10.sp,
                            letterSpacing = 0.5.sp
                        )
                    }

                    IconButton(
                        onClick = {
                            SoundManager.playClick()
                            com.example.numera.haptic.HapticManager.playSoft()
                            onDismissRequest()
                        },
                        modifier = Modifier.size(24.dp)
                    ) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Close,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Title
                Text(
                    text = debrief.title,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                // Level indicator
                Text(
                    text = "LEVEL $levelNum",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.secondary,
                    letterSpacing = 1.sp
                )

                Spacer(modifier = Modifier.height(16.dp))

                // ELO Difficulty Badge
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier
                        .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(12.dp))
                        .padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    com.example.numera.ui.components.NumeraIcon(
                        type = com.example.numera.ui.components.NumeraIconType.Arena,
                        tint = startColor,
                        modifier = Modifier.size(16.dp)
                    )
                    Text(
                        text = "Target ELO: ${debrief.eloRating}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Description
                Text(
                    text = debrief.description,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Concepts Header
                Text(
                    text = "LEARNING FOCUS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.secondary,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Concepts List
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    debrief.concepts.forEach { concept ->
                        Box(
                            modifier = Modifier
                                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = concept,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                // Start button
                DuoButton(
                    text = "Start Lesson (+20 XP)",
                    onClick = {
                        onStartLesson()
                        onDismissRequest()
                    },
                    color = CorrectGreen,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommitmentStatusDialog(
    apiService: ApiService,
    token: String,
    onDismissRequest: () -> Unit,
    onRefreshProfile: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var status by remember { mutableStateOf<CommitmentStatusResponse?>(null) }
    
    var isSolvingChallenge by remember { mutableStateOf(false) }
    var currentQuestionIndex by remember { mutableIntStateOf(0) }
    var inputAnswer by remember { mutableStateOf("") }
    var showErrorMessage by remember { mutableStateOf("") }
    
    var isRestoring by remember { mutableStateOf(false) }
    var restorationMessage by remember { mutableStateOf<String?>(null) }

    val loadStatus = {
        scope.launch(Dispatchers.IO) {
            try {
                val res = apiService.getCommitmentStatus(token)
                withContext(Dispatchers.Main) {
                    status = res
                    loading = false
                }
            } catch (e: Exception) {
                Log.e("CommitmentDialog", "Failed to fetch status: ${e.message}")
                withContext(Dispatchers.Main) {
                    loading = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        loadStatus()
    }

    val challengeQuestions = remember {
        listOf(
            Pair("Solve for x: x + 12 = 30", "18"),
            Pair("Compute: 7 * 8", "56"),
            Pair("Solve for y: 3y - 5 = 10", "5"),
            Pair("Compute: 45 - 19", "26"),
            Pair("Compute: 120 / 6", "20")
        )
    }

    val totalQuestions = status?.challengeQuestionsCount ?: 3

    val handleRecommit = { method: String ->
        scope.launch(Dispatchers.IO) {
            try {
                isRestoring = true
                val res = apiService.recommitClimb(token, RecommitRequest(method))
                withContext(Dispatchers.Main) {
                    isRestoring = false
                    restorationMessage = res.message
                    onRefreshProfile()
                    com.example.numera.sound.SoundManager.playRewardClaim()
                    com.example.numera.haptic.HapticManager.playSuccess()
                }
            } catch (e: Exception) {
                Log.e("CommitmentDialog", "Failed to recommit: ${e.message}")
                withContext(Dispatchers.Main) {
                    isRestoring = false
                    showErrorMessage = e.message ?: "Failed to restore climb."
                }
            }
        }
    }

    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!isSolvingChallenge) onDismissRequest() }) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            borderColor = MaterialTheme.colorScheme.primary
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (loading) {
                    CircularProgressIndicator(modifier = Modifier.size(40.dp))
                    Text("Opening commitment space...", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                } else if (restorationMessage != null) {
                    Text("✨ Restore Success ✨", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text(restorationMessage!!, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(8.dp))
                    DuoButton(
                        text = "Continue",
                        onClick = {
                            onDismissRequest()
                        },
                        color = CorrectGreen,
                        modifier = Modifier.fillMaxWidth()
                    )
                } else if (isSolvingChallenge) {
                    Text(
                        text = "Recommit Challenge",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Question ${currentQuestionIndex + 1} of $totalQuestions",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                    
                    val q = challengeQuestions[currentQuestionIndex % challengeQuestions.size]
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                    ) {
                        Box(modifier = Modifier.fillMaxWidth().padding(20.dp), contentAlignment = Alignment.Center) {
                            Text(q.first, fontWeight = FontWeight.Bold, fontSize = 16.sp, textAlign = TextAlign.Center)
                        }
                    }

                    OutlinedTextField(
                        value = inputAnswer,
                        onValueChange = { inputAnswer = it },
                        label = { Text("Your Answer") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )

                    if (showErrorMessage.isNotEmpty()) {
                        Text(showErrorMessage, color = WrongRed, fontSize = 12.sp)
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TextButton(
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                isSolvingChallenge = false
                                currentQuestionIndex = 0
                                inputAnswer = ""
                                showErrorMessage = ""
                            },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Quit")
                        }
                        
                        DuoButton(
                            text = "Submit",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                com.example.numera.haptic.HapticManager.playSoft()
                                if (inputAnswer.trim() == q.second) {
                                    showErrorMessage = ""
                                    inputAnswer = ""
                                    if (currentQuestionIndex + 1 >= totalQuestions) {
                                        handleRecommit("challenge")
                                    } else {
                                        currentQuestionIndex++
                                    }
                                } else {
                                    showErrorMessage = "Take your time. Double-check your formula."
                                }
                            },
                            color = CorrectGreen,
                            modifier = Modifier.weight(1f)
                        )
                    }
                } else {
                    val currentClimb = status?.streak ?: 0
                    val bestClimb = status?.maxStreak ?: 0
                    val index = status?.consistencyIndex ?: 0f
                    val burnout = status?.burnoutRisk ?: "low"
                    val state = status?.commitmentState ?: "active"
                    val shields = status?.shieldsCount ?: 0
                    
                    Text(
                        text = "Your Consistency Climb",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    
                    Text(
                        text = status?.message ?: "",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Climb", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("$currentClimb days", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Best Run", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("$bestClimb days", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Habit Index", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text("${(index * 100).toInt()}%", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Card(modifier = Modifier.weight(1f)) {
                            Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("Burnout Risk", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Text(
                                    text = burnout.replaceFirstChar { it.uppercaseChar() },
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = when (burnout) {
                                        "high" -> Color(0xFFEF5350)
                                        "medium" -> Color(0xFFFFB74D)
                                        else -> Color(0xFF66BB6A)
                                    }
                                )
                            }
                        }
                    }

                    if (state == "fading") {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Choose your recovery route:",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        DuoButton(
                            text = "Recommit Challenge ($totalQuestions Eq.)",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                com.example.numera.haptic.HapticManager.playSoft()
                                isSolvingChallenge = true
                            },
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.fillMaxWidth()
                        )

                        DuoButton(
                            text = "Use Streak Shield (Owned: $shields)",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                handleRecommit("shield")
                            },
                            color = if (shields > 0) Color(0xFF42A5F5) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = shields > 0
                        )

                        DuoButton(
                            text = "Spend 150 Coins",
                            onClick = {
                                com.example.numera.sound.SoundManager.playClick()
                                handleRecommit("coins")
                            },
                            color = if ((status?.coins ?: 0) >= 150) Color(0xFFFFB300) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = (status?.coins ?: 0) >= 150
                        )
                    }

                    if (showErrorMessage.isNotEmpty()) {
                        Text(showErrorMessage, color = WrongRed, fontSize = 12.sp, textAlign = TextAlign.Center)
                    }

                    TextButton(
                        onClick = onDismissRequest,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Close")
                    }
                }
            }
        }
    }
}

fun formatRelativeTime(timestampSeconds: Long): String {
    val diff = (System.currentTimeMillis() / 1000) - timestampSeconds
    if (diff < 60) return "Just now"
    val mins = diff / 60
    if (mins < 60) return "${mins}m ago"
    val hours = mins / 60
    if (hours < 24) return "${hours}h ago"
    val days = hours / 24
    return "${days}d ago"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsDialog(
    notifications: List<NotificationItemDto>,
    onDismissRequest: () -> Unit,
    onMarkAllRead: () -> Unit,
    onMarkSingleRead: (Int) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismissRequest,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier
            .fillMaxWidth(0.92f)
            .wrapContentHeight()
            .clip(RoundedCornerShape(24.dp)),
        confirmButton = {},
        title = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Inbox",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (notifications.any { it.read_state == 0 }) {
                    TextButton(onClick = onMarkAllRead) {
                        Text(
                            text = "Mark all read",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 400.dp)
            ) {
                if (notifications.isEmpty()) {
                    NumeraEmptyState(
                        illustration = EmptyIllustration.Notifications,
                        title = "You're all caught up",
                        message = "No new notifications right now. We'll let you know the moment something happens.",
                        ctaLabel = "Continue Learning",
                        onCta = onDismissRequest
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(notifications) { item ->
                            val isUnread = item.read_state == 0
                            val cardBg = if (isUnread) MaterialTheme.colorScheme.primary.copy(alpha = 0.08f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
                            val cardBorder = if (isUnread) MaterialTheme.colorScheme.primary.copy(alpha = 0.25f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                            
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        if (isUnread) {
                                            onMarkSingleRead(item.id)
                                        }
                                    },
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = cardBg),
                                border = BorderStroke(1.dp, cardBorder)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(
                                                when (item.type) {
                                                    "welcome" -> Color(0xFFE3F2FD)
                                                    "levelup" -> Color(0xFFFFF9C4)
                                                    "achievement" -> Color(0xFFE8F5E9)
                                                    "social" -> Color(0xFFF3E5F5)
                                                    else -> Color(0xFFECEFF1)
                                                }
                                            ),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = when (item.type) {
                                                "welcome" -> "🚀"
                                                "levelup" -> "🌟"
                                                "achievement" -> "🏆"
                                                "social" -> "🤝"
                                                else -> "🔔"
                                            },
                                            fontSize = 18.sp
                                        )
                                    }
                                    
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = item.title,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = MaterialTheme.colorScheme.onSurface
                                            )
                                            Text(
                                                text = formatRelativeTime(item.created_at),
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                            )
                                        }
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = item.message,
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                                        )
                                    }
                                    
                                    if (isUnread) {
                                        Box(
                                            modifier = Modifier
                                                .size(6.dp)
                                                .clip(CircleShape)
                                                .background(WrongRed)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    )
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




