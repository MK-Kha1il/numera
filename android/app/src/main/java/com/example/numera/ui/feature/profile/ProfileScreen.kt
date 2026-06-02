package com.example.numera.ui.feature.profile

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
