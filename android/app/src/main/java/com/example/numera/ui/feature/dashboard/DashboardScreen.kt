package com.example.numera.ui.feature.dashboard

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.SoloGame
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.ClaimButton
import com.example.numera.ui.components.GlossyProgressBar
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraEmptyState
import com.example.numera.ui.components.EmptyIllustration
import com.example.numera.ui.components.SkeletonList
import com.example.numera.ui.components.AchievementSkeleton
import com.example.numera.ui.components.LeaderboardRowSkeleton
import com.example.numera.ui.components.LocalToast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun DashboardScreen(
    user: User?,
    onRefreshProfile: () -> Unit,
    onShowUserProfile: (Int) -> Unit,
    onNavigateTab: (Int) -> Unit = {},
    onStartQuickGame: (SoloGame) -> Unit = {},
    onReviewNow: () -> Unit = {}
) {
    val toast = LocalToast.current
    var homeSubTab by remember { mutableStateOf(0) }
    var questsList by remember { mutableStateOf<List<Quest>>(emptyList()) }
    var leagueLeaderboard by remember { mutableStateOf<LeagueLeaderboardResponse?>(null) }
    var secondsLeft by remember { mutableStateOf<Long>(0L) }

    var globalLeaderboard by remember { mutableStateOf<List<User>>(emptyList()) }
    var globalLoading by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // Orchestrator's "best next step" → drives the home-screen recommendation nudge.
    var recommendation by remember { mutableStateOf<NextRecommendationResponse?>(null) }
    LaunchedEffect(Unit) {
        try {
            recommendation = RetrofitClient.apiService.getNextRecommendation(
                RetrofitClient.authToken ?: "", level = user?.level
            )
        } catch (e: Exception) {
            Log.e("Dashboard", "Failed to fetch recommendation: ${e.message}")
        }
    }

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

        // NOTE: the "Continue Learning / Daily Puzzle / Ranked Match" QuickActionsBar was removed
        // from this (Quests) tab — it duplicated the bottom-nav destinations (Learn, Arena) and the
        // Daily Puzzle daily quest, and the stacked hero+tiles dominated the tab before any quest
        // content. The engine-driven nudge below stays: it's contextual guidance, not redundant nav.

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
                        .padding(horizontal = Spacing.l, vertical = Spacing.m),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                // Engine-driven nudge inside the scroll so it disappears when scrolled past.
                // Only shown when there is actionable guidance — low-signal reasons return null.
                recommendation?.let { rec ->
                    if (rec.reason in listOf("transfer_practice", "dimension_building", "misconception_remediation", "retention_review", "prerequisite_gap")) {
                        item(key = "nudge") {
                            RecommendationNudge(
                                recommendation = rec,
                                onTakeTransferChallenge = {
                                    onStartQuickGame(SoloGame(category = "General", level = 0, gameMode = "transfer_challenge"))
                                },
                                onContinueLearning = { onNavigateTab(0) },
                                onReview = onReviewNow,
                                modifier = Modifier.padding(bottom = Spacing.xs)
                            )
                        }
                    }
                }

                item {
                    // Lightweight section header (was a full DuoCard wrapping just a title +
                    // subtitle — heavy card chrome that bloated the top of the Quests tab).
                    Column(modifier = Modifier.padding(horizontal = Spacing.xs)) {
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
                            modifier = Modifier.padding(top = Spacing.xs)
                        )
                    }
                }

                if (sortedQuests.isEmpty()) {
                    item {
                        SkeletonList(count = 3, modifier = Modifier.padding(top = Spacing.s)) {
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
                                modifier = Modifier.fillMaxWidth().padding(Spacing.xs),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(Spacing.m)
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

                                    Spacer(modifier = Modifier.height(Spacing.xs))

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
                                            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
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
                    .padding(Spacing.l),
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
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
                            modifier = Modifier.padding(Spacing.xs),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(Spacing.s)
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
                        SkeletonList(count = 4, modifier = Modifier.padding(top = Spacing.s)) {
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
                                modifier = Modifier.fillMaxWidth().padding(Spacing.xs),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Text(
                                        text = "#${index + 1}",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = when (index) {
                                            0 -> MedalGold
                                            1 -> MedalSilver
                                            2 -> MedalBronze
                                            else -> MaterialTheme.colorScheme.onBackground
                                        }
                                    )

                                    MathAvatar(
                                        avatarKey = competitor.avatar,
                                        modifier = Modifier
                                            .size(IconSize.l)
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
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                                ) {
                                    when {
                                        isPromo -> {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(CornerRadius.s))
                                                    .background(CorrectGreen.copy(alpha = 0.15f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text("Promo ↗", color = CorrectGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                        isDemo -> {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(CornerRadius.s))
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
                    .padding(Spacing.l),
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                item {
                    DuoCard(modifier = Modifier.fillMaxWidth()) {
                        Column(
                            modifier = Modifier.padding(Spacing.m),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(Spacing.s)
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
                        NumeraPremiumLoader(cardPadding = Spacing.l)
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
                                modifier = Modifier.fillMaxWidth().padding(Spacing.xs),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                                ) {
                                    Text(
                                        text = "#${index + 1}",
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = when (index) {
                                            0 -> MedalGold
                                            1 -> MedalSilver
                                            2 -> MedalBronze
                                            else -> MaterialTheme.colorScheme.onBackground
                                        }
                                    )

                                    MathAvatar(
                                        avatarKey = globalUser.avatar,
                                        modifier = Modifier
                                            .size(IconSize.l)
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
