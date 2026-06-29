package com.example.numera.ui.feature.shop

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import com.example.numera.ui.components.PressFeedback
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
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.GlossyProgressBar
import androidx.compose.foundation.BorderStroke
import com.example.numera.ui.components.LocalToast
import com.example.numera.ui.components.ShopItemSkeleton
import com.example.numera.ui.components.LessonCardSkeleton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ShopScreen(user: User?, onPurchaseComplete: () -> Unit) {
    val toast = LocalToast.current
    var featuredItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var dailyItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var utilityItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var catalogItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var seasonItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var tokenItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var seasonName by remember { mutableStateOf<String?>(null) }
    var seasonTokens by remember { mutableIntStateOf(0) }
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
    val shopListState = rememberLazyListState()

    // Tapping an item updates the showcase panel near the top of the list. Previously that panel
    // (which holds the only Purchase button) was off-screen when you tapped an item lower down, so
    // it felt like nothing happened / "can't buy anything". Bring it into view on every selection.
    val showItemDetail: (ShopItem) -> Unit = { picked ->
        selectedItemForDetail = picked
        scope.launch { shopListState.animateScrollToItem(3) }
    }

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
                    seasonItems = res.seasonItems ?: emptyList()
                    tokenItems = res.tokenItems ?: emptyList()
                    seasonName = res.seasonInfo?.seasonName
                    seasonTokens = res.seasonTokens ?: 0
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

    // Convert 500 coins → 1 Season Token (the deep end-game coin sink). One token per tap keeps it
    // simple and reversible-feeling; the server caps and guards the actual deduction.
    val convertCoins: () -> Unit = {
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                val res = RetrofitClient.apiService.convertCoinsToTokens(token, ConvertCoinsRequest(tokens = 1))
                withContext(Dispatchers.Main) {
                    seasonTokens = res.seasonTokens
                    toast.success("Converted 500 🪙 → 1 Season Token")
                    RetrofitClient.triggerProfileRefresh()
                    fetchShop()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { toast.error("Not enough coins (500 needed)") }
            }
        }
    }

    // Claim a token-only prestige item (paid in Season Tokens, not coins).
    val claimTokenItem: (ShopItem) -> Unit = { item ->
        scope.launch(Dispatchers.IO) {
            try {
                val token = RetrofitClient.authToken ?: ""
                RetrofitClient.apiService.purchaseItem(token, PurchaseRequest(item.id))
                withContext(Dispatchers.Main) {
                    toast.achievement("Claimed ${item.name}!")
                    RetrofitClient.triggerProfileRefresh()
                    fetchShop()
                    onPurchaseComplete()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { toast.error("Not enough Season Tokens") }
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchShop()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        ShopBackground(modifier = Modifier.fillMaxSize())
        
        LazyColumn(
            state = shopListState,
            modifier = Modifier
                .fillMaxSize()
                .padding(Spacing.l),
            verticalArrangement = Arrangement.spacedBy(Spacing.l)
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
                    color = Color.White.copy(alpha = 0.6f),
                    modifier = Modifier.padding(vertical = Spacing.xs)
                )
            }

            if (isShopLoading) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(Spacing.l)) {
                        LessonCardSkeleton()
                        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
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
                        .padding(vertical = Spacing.xs)
                ) {
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
                                text = "🏆 COSMETIC COLLECTION UNLOCKED",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = MedalGold,
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
                            .padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "YOUR BALANCE",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White.copy(alpha = 0.65f)
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
                                shape = RoundedCornerShape(CornerRadius.m),
                                color = MedalGold.copy(alpha = 0.2f),
                                border = androidx.compose.foundation.BorderStroke(1.dp, MedalGold)
                            ) {
                                Text(
                                    text = "⚡ XP Booster: ${user.xp_booster_uses_left} left",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = MilestoneGold,
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
                        modifier = Modifier.padding(horizontal = Spacing.s)
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
                        modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.s),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "★ FEATURED HERO EXHIBIT",
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = MedalGold
                        )
                        featuredExpiresInSeconds?.let { sec ->
                            Text(
                                text = "Refreshes in: ${formatDuration(sec)}",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.65f)
                            )
                        }
                    }
                }

                item {
                    ShopHeroCard(
                        item = heroItem,
                        inventoryIds = inventoryIds,
                        user = user,
                        onClick = { showItemDetail(heroItem) }
                    )
                }
            }

            // Daily Deals Section
            if (dailyItems.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = Spacing.s),
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
                                color = Color.White.copy(alpha = 0.65f)
                            )
                        }
                    }
                }

                items(dailyItems, key = { "daily_${it.id}" }) { item ->
                    DailyShopItemCard(
                        item = item,
                        inventoryIds = inventoryIds,
                        user = user,
                        onClick = { showItemDetail(item) }
                    )
                }
            }

            // This Season — rotating season-exclusive cosmetics (coin-priced, leave when the season
            // ends). A recurring coin sink so coins stay meaningful past the one-time catalog (#66).
            if (seasonItems.isNotEmpty()) {
                item {
                    Text(
                        text = "✦ THIS SEASON" + (seasonName?.let { " · $it" } ?: ""),
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = Color(0xFFFFD54A),
                        modifier = Modifier.padding(top = Spacing.s)
                    )
                }
                item {
                    Text(
                        text = "Season-exclusive — these leave the shop when the season ends.",
                        fontSize = 11.sp,
                        color = Color.White.copy(alpha = 0.6f)
                    )
                }
                items(seasonItems, key = { "season_${it.id}" }) { item ->
                    DailyShopItemCard(
                        item = item,
                        inventoryIds = inventoryIds,
                        user = user,
                        onClick = { showItemDetail(item) }
                    )
                }
            }

            // Season Tokens wallet + the deep coin→token sink, plus token-only prestige cosmetics.
            item {
                SeasonTokenWallet(
                    tokens = seasonTokens,
                    coins = user?.coins ?: 0,
                    onConvert = convertCoins,
                    modifier = Modifier.padding(top = Spacing.s)
                )
            }
            if (tokenItems.isNotEmpty()) {
                items(tokenItems, key = { "token_${it.id}" }) { item ->
                    PrestigeTokenCard(
                        item = item,
                        tokens = seasonTokens,
                        onClaim = { claimTokenItem(item) }
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
                        modifier = Modifier.padding(top = Spacing.s)
                    )
                }

                items(utilityItems, key = { "utility_${it.id}" }) { item ->
                    val qty = userUtilities.find { it.item_id == item.id }?.quantity ?: 0
                    UtilityShopItemCard(
                        item = item,
                        ownedQuantity = qty,
                        user = user,
                        onClick = { showItemDetail(item) }
                    )
                }
            }

            // Full Catalog Section — every cosmetic, always purchasable (not gated by rotation)
            if (catalogItems.isNotEmpty()) {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = Spacing.l)
                            .pressable(feedback = PressFeedback.Silent) {
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
                        com.example.numera.ui.components.NumeraIcon(
                            type = if (showFullCatalog) com.example.numera.ui.components.NumeraIconType.ChevronUp
                                else com.example.numera.ui.components.NumeraIconType.ChevronDown,
                            tint = Color.White
                        )
                    }
                }

                if (showFullCatalog) {
                    item {
                        Text(
                            text = "Browse and buy any cosmetic directly — no waiting for the rotation.",
                            fontSize = 11.sp,
                            color = Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.padding(bottom = Spacing.xs)
                        )
                    }

                    // Type filter chips
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                        ) {
                            val types = listOf(null to "All", "avatar" to "Avatars", "banner" to "Banners", "badge" to "Badges", "theme" to "Themes")
                            types.forEach { (typeVal, label) ->
                                val isSel = catalogTypeFilter == typeVal
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(if (isSel) MaterialTheme.colorScheme.primary else Color.White.copy(alpha = 0.08f))
                                        .pressable { catalogTypeFilter = typeVal }
                                        .padding(horizontal = 14.dp, vertical = Spacing.s)
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

                    items(filteredCatalog, key = { "catalog_${it.id}" }) { item ->
                        DailyShopItemCard(
                            item = item,
                            inventoryIds = inventoryIds,
                            user = user,
                            onClick = { showItemDetail(item) }
                        )
                    }
                }
            }
        }

        // Cinematic Reveal Overlay Dialog — staged reward moment: the medallion pops in
        // with the reward spring, and prestige tiers (Epic+) earn a confetti burst behind
        // the dialog so the unlock feels earned, not transactional.
        purchasedItemForReveal?.let { item ->
            val tier = Rarity.from(item.rarity)
            val rarityColor = tier.color
            var revealStarted by remember(item.id) { mutableStateOf(false) }
            var burstActive by remember(item.id) { mutableStateOf(tier.isPrestige) }
            LaunchedEffect(item.id) { revealStarted = true }

            if (burstActive) {
                com.example.numera.ui.components.VictoryParticles(
                    trigger = true,
                    onFinished = { burstActive = false }
                )
            }

            AlertDialog(
                onDismissRequest = { purchasedItemForReveal = null },
                // Deliberately dark across all themes — the reveal shares the shop's
                // showcase-case aesthetic, and its white/rarity text depends on it.
                containerColor = Color(0xFF1E1E2E),
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
                        verticalArrangement = Arrangement.spacedBy(Spacing.l)
                    ) {
                        AnimatedVisibility(
                            visible = revealStarted,
                            enter = Motion.rewardEnter()
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
