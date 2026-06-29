package com.example.numera.ui.feature.shop

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.Canvas
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.motion.MotionManager
import com.example.numera.theme.*
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.AchievementBadge
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.NumeraBottomSheet
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.VictoryParticles
import com.example.numera.ui.components.LocalToast
import com.example.numera.ui.components.ShopItemSkeleton
import com.example.numera.ui.components.LessonCardSkeleton
import androidx.compose.foundation.shape.RoundedCornerShape as Shape
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ShopScreen(user: User?, onPurchaseComplete: () -> Unit) {
    val toast = LocalToast.current
    val context = LocalContext.current

    var featuredItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var dailyItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var utilityItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var catalogItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var seasonItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var tokenItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var ownedItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var earnableItems by remember { mutableStateOf<List<ShopItem>>(emptyList()) }
    var seasonName by remember { mutableStateOf<String?>(null) }
    var seasonTokens by remember { mutableIntStateOf(0) }
    var userUtilities by remember { mutableStateOf<List<UtilityBalance>>(emptyList()) }
    var inventoryIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var featuredExpiresInSeconds by remember { mutableStateOf<Long?>(null) }
    var isShopLoading by remember { mutableStateOf(true) }

    // Vault UI state
    var selectedTab by remember { mutableStateOf(ShopTab.Featured) }
    var searchQuery by remember { mutableStateOf("") }
    var sort by remember { mutableStateOf(ShopSort.Rarity) }
    var typeFilter by remember { mutableStateOf<String?>(null) }
    var savedOnly by remember { mutableStateOf(false) }
    var sheetItem by remember { mutableStateOf<ShopItem?>(null) }
    var purchasedItemForReveal by remember { mutableStateOf<ShopItem?>(null) }

    val scope = rememberCoroutineScope()
    val favorites = ShopFavorites.ids

    LaunchedEffect(Unit) { ShopFavorites.init(context) }

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
                    ownedItems = res.ownedItems ?: emptyList()
                    earnableItems = res.earnableItems ?: emptyList()
                    seasonName = res.seasonInfo?.seasonName
                    seasonTokens = res.seasonTokens ?: 0
                    userUtilities = res.utilities ?: emptyList()
                    inventoryIds = res.inventory
                    featuredExpiresInSeconds = res.featuredExpiresInSeconds
                }
            } catch (e: Exception) {
                Log.e("Shop", "Shop fetch err: ${e.message}")
                withContext(Dispatchers.Main) { isShopLoading = false }
            }
        }
    }

    // Convert 500 coins → 1 Season Token (the deep end-game coin sink); server caps + guards.
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

    LaunchedEffect(Unit) { fetchShop() }

    // The shop is "The Vault" — a focused, premium dark surface tinted to the equipped theme
    // (docs/ShopOverhaul.md §3). Everything inside reads MaterialTheme.colorScheme.* and restyles.
    VaultTheme {
        Box(modifier = Modifier.fillMaxSize()) {
            ShopBackground(modifier = Modifier.fillMaxSize())

            Column(modifier = Modifier.fillMaxSize().padding(Spacing.l)) {
                VaultHeader(coins = user?.coins ?: 0, boosterUses = user?.xp_booster_uses_left ?: 0, tokens = seasonTokens)

                Spacer(Modifier.height(Spacing.m))

                // Tab chips
                Row(
                    modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                ) {
                    ShopTab.entries.forEach { tab ->
                        ShopChip(label = tab.label, selected = selectedTab == tab) {
                            com.example.numera.haptic.HapticManager.playSoft()
                            selectedTab = tab
                        }
                    }
                }

                // Search (only on the browsable grid tabs that filter by query)
                if (selectedTab == ShopTab.Cosmetics || selectedTab == ShopTab.Themes ||
                    selectedTab == ShopTab.Titles || selectedTab == ShopTab.Effects
                ) {
                    Spacer(Modifier.height(Spacing.s))
                    VaultSearchField(query = searchQuery, onQueryChange = { searchQuery = it })
                }

                Spacer(Modifier.height(Spacing.s))

                Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                    if (isShopLoading) {
                        Column(verticalArrangement = Arrangement.spacedBy(Spacing.l)) {
                            LessonCardSkeleton()
                            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                                ShopItemSkeleton(); ShopItemSkeleton()
                            }
                        }
                    } else {
                        val onCardClick: (ShopItem) -> Unit = { sheetItem = it }
                        val onToggleFav: (String) -> Unit = { ShopFavorites.toggle(context, it) }
                        when (selectedTab) {
                            ShopTab.Featured -> {
                                // The closest wishlisted-but-unaffordable item → the "saving for" nudge.
                                val coins = user?.coins ?: 0
                                val savingFor = (catalogItems + seasonItems)
                                    .filter { favorites.contains(it.id) && !inventoryIds.contains(it.id) && it.cost > coins }
                                    .minByOrNull { it.cost - coins }
                                FeaturedTab(
                                    featured = featuredItems, daily = dailyItems, refreshSeconds = featuredExpiresInSeconds,
                                    savingFor = savingFor, coins = coins,
                                    user = user, inventoryIds = inventoryIds, favorites = favorites,
                                    onCardClick = onCardClick, onToggleFav = onToggleFav,
                                )
                            }
                            ShopTab.Cosmetics -> CosmeticsTab(
                                cosmetics = catalogItems.filter { it.type == "avatar" || it.type == "banner" || it.type == "badge" },
                                query = searchQuery, sort = sort, onSort = { sort = it },
                                typeFilter = typeFilter, onType = { typeFilter = it },
                                savedOnly = savedOnly, onSavedToggle = { savedOnly = !savedOnly },
                                user = user, inventoryIds = inventoryIds, favorites = favorites,
                                onCardClick = onCardClick, onToggleFav = onToggleFav,
                            )
                            ShopTab.Titles -> FilteredGridTab(
                                base = catalogItems.filter { it.type == "title" },
                                query = searchQuery, sort = sort, onSort = { sort = it },
                                savedOnly = savedOnly, onSavedToggle = { savedOnly = !savedOnly },
                                emptyEmoji = "🎖️", emptyMessage = "No titles match. Buy one to wear it under your name.",
                                user = user, inventoryIds = inventoryIds, favorites = favorites,
                                onCardClick = onCardClick, onToggleFav = onToggleFav,
                            )
                            ShopTab.Effects -> FilteredGridTab(
                                base = catalogItems.filter { it.type == "effect" || it.type == "victory" || it.type == "tap" },
                                query = searchQuery, sort = sort, onSort = { sort = it },
                                savedOnly = savedOnly, onSavedToggle = { savedOnly = !savedOnly },
                                emptyEmoji = "✨", emptyMessage = "No effects match. Clear the filter to see profile, victory & tap effects.",
                                user = user, inventoryIds = inventoryIds, favorites = favorites,
                                onCardClick = onCardClick, onToggleFav = onToggleFav,
                            )
                            ShopTab.Themes -> FilteredGridTab(
                                base = catalogItems.filter { it.type == "theme" },
                                query = searchQuery, sort = sort, onSort = { sort = it },
                                savedOnly = savedOnly, onSavedToggle = { savedOnly = !savedOnly },
                                emptyEmoji = "🎨", emptyMessage = "No themes match. Clear the filter to see them all.",
                                user = user, inventoryIds = inventoryIds, favorites = favorites,
                                onCardClick = onCardClick, onToggleFav = onToggleFav,
                            )
                            ShopTab.Utilities -> UtilitiesTab(
                                utilities = utilityItems, userUtilities = userUtilities, user = user,
                                onCardClick = onCardClick,
                            )
                            ShopTab.Seasonal -> SeasonalTab(
                                seasonItems = seasonItems, tokenItems = tokenItems, seasonName = seasonName,
                                seasonTokens = seasonTokens, coins = user?.coins ?: 0,
                                onConvert = convertCoins, onClaim = claimTokenItem,
                                user = user, inventoryIds = inventoryIds, onCardClick = onCardClick,
                            )
                            ShopTab.Collection -> CollectionTab(
                                ownedItems = ownedItems, catalogItems = catalogItems,
                                user = user, inventoryIds = inventoryIds, favorites = favorites,
                                onCardClick = onCardClick, onToggleFav = onToggleFav,
                            )
                            ShopTab.Earnable -> EarnableTab(
                                items = earnableItems, user = user, inventoryIds = inventoryIds,
                                onCardClick = onCardClick,
                            )
                        }
                    }
                }
            }

            // In-place preview / buy / equip — a bottom sheet, never a scroll-jump (docs §6/§13).
            sheetItem?.let { item ->
                NumeraBottomSheet(onDismiss = { sheetItem = null }) {
                    HeroShowcasePanel(
                        item = item,
                        user = user,
                        inventoryIds = inventoryIds,
                        ownedUtilities = userUtilities,
                        scope = scope,
                        eyebrow = "✦ PREVIEW ✦",
                        onPurchaseComplete = {
                            if (!inventoryIds.contains(item.id) && item.is_utility == 0) {
                                purchasedItemForReveal = item
                            }
                            sheetItem = null
                            fetchShop()
                            onPurchaseComplete()
                        },
                        onDismissShowcase = { sheetItem = null },
                    )
                }
            }

            PurchaseRevealDialog(
                item = purchasedItemForReveal,
                scope = scope,
                onDismiss = { purchasedItemForReveal = null },
                onEquipDone = { purchasedItemForReveal = null; onPurchaseComplete() },
            )
        }
    }
}

/** The sticky wallet header: title + coin balance + (optional) tokens & XP-booster status. */
@Composable
private fun VaultHeader(coins: Int, boosterUses: Int, tokens: Int) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text("THE VAULT", fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface, letterSpacing = 1.sp)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            WalletPill(text = "🪙 $coins", accent = MaterialTheme.colorScheme.primary)
            if (tokens > 0) WalletPill(text = "👑 $tokens", accent = SeasonGold)
            Spacer(Modifier.weight(1f))
            if (boosterUses > 0) {
                Text("⚡ ${boosterUses} XP boosts", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MedalGold)
            }
        }
    }
}

@Composable
private fun WalletPill(text: String, accent: Color) {
    Box(
        modifier = Modifier
            .clip(Shape(CornerRadius.full))
            .background(accent.copy(alpha = 0.14f))
            .border(1.dp, accent.copy(alpha = 0.45f), Shape(CornerRadius.full))
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
    ) {
        Text(text, fontSize = 15.sp, fontWeight = FontWeight.Black, color = accent)
    }
}

@Composable
private fun VaultSearchField(query: String, onQueryChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(Shape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        NumeraIcon(type = NumeraIconType.Search, tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint), animate = false, modifier = Modifier.size(IconSize.s))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            singleLine = true,
            textStyle = TextStyle(color = MaterialTheme.colorScheme.onSurface, fontSize = 14.sp),
            cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (query.isEmpty()) {
                        Text("Search the vault…", color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint), fontSize = 14.sp)
                    }
                    inner()
                }
            },
        )
        if (query.isNotEmpty()) {
            NumeraIcon(
                type = NumeraIconType.Close,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                animate = false,
                modifier = Modifier.size(IconSize.s).clickable { onQueryChange("") },
            )
        }
    }
}

/**
 * Cinematic reveal — the medallion pops in with the reward spring. Epic/Legendary get a confetti
 * burst; Mythic gets its own constellation-forming reveal instead (docs/ShopOverhaul.md §7 —
 * "different, not more confetti") so the rarest unlocks feel singular.
 */
@Composable
private fun PurchaseRevealDialog(
    item: ShopItem?,
    scope: kotlinx.coroutines.CoroutineScope,
    onDismiss: () -> Unit,
    onEquipDone: () -> Unit,
) {
    if (item == null) return
    val tier = Rarity.from(item.rarity)
    val rarityColor = tier.color
    val isMythic = tier == Rarity.Mythic
    var revealStarted by remember(item.id) { mutableStateOf(false) }
    var burstActive by remember(item.id) { mutableStateOf(tier.isPrestige && !isMythic) }
    LaunchedEffect(item.id) { revealStarted = true }

    if (burstActive) {
        VictoryParticles(trigger = true, onFinished = { burstActive = false })
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        // The reveal shares the Vault's dark showcase-case aesthetic; under VaultTheme this is the
        // equipped theme's dark surface, so the reveal tints to the theme too.
        containerColor = MaterialTheme.colorScheme.surface,
        confirmButton = {},
        dismissButton = {
            DuoButton(
                text = if (item.is_utility == 0) "Claim & Equip" else "Claim",
                onClick = {
                    if (item.is_utility == 0) {
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                RetrofitClient.apiService.equipItem(token, EquipRequest(item.type, item.value))
                                withContext(Dispatchers.Main) { onEquipDone() }
                            } catch (e: Exception) {
                                Log.e("Shop", "Auto-equip err: ${e.message}")
                                withContext(Dispatchers.Main) { onEquipDone() }
                            }
                        }
                    } else {
                        onDismiss()
                    }
                },
                color = CorrectGreen,
                modifier = Modifier.fillMaxWidth(),
            )
        },
        title = {
            Text(
                text = "✧ UNLOCKED ✧",
                fontWeight = FontWeight.Black,
                fontSize = 24.sp,
                color = rarityColor,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.l),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (isMythic) {
                        MythicConstellationReveal(accent = rarityColor, modifier = Modifier.size(180.dp))
                    }
                    RevealMedallion(item = item, rarityColor = rarityColor, revealStarted = revealStarted)
                }
                Text(item.name, fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
                Text((item.rarity ?: "Common").uppercase(), fontWeight = FontWeight.Bold, color = rarityColor, fontSize = 13.sp)
            }
        },
    )
}

/** The medallion that springs in on the reveal (own composable so AnimatedVisibility isn't caught
 *  by an enclosing Column/Box scope). */
@Composable
private fun RevealMedallion(item: ShopItem, rarityColor: Color, revealStarted: Boolean) {
    AnimatedVisibility(visible = revealStarted, enter = Motion.rewardEnter()) {
        Box(
            modifier = Modifier
                .size(110.dp)
                .clip(Shape(CornerRadius.xl))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .border(3.dp, rarityColor, Shape(CornerRadius.xl)),
            contentAlignment = Alignment.Center,
        ) {
            when (item.type) {
                "theme" -> ThemePreview(themeKey = item.value, modifier = Modifier.fillMaxSize())
                "avatar" -> MathAvatar(avatarKey = item.value, modifier = Modifier.fillMaxSize(), fontSize = 54.sp)
                "banner" -> ProfileBanner(bannerKey = item.value, modifier = Modifier.fillMaxSize())
                "badge" -> AchievementBadge(achievementId = item.value, modifier = Modifier.fillMaxSize())
                "utility" -> Text(utilityEmoji(item.id), fontSize = 54.sp)
            }
        }
    }
}

/**
 * Mythic's signature reveal: eight stars fade in and connect into a constellation behind the
 * medallion, with a soft twinkle — elegant, not explosive. Honors reduce-motion (renders the final
 * formed frame statically).
 */
@Composable
private fun MythicConstellationReveal(accent: Color, modifier: Modifier = Modifier) {
    val reduce = MotionManager.reduceMotion
    val form = remember(reduce) { Animatable(if (reduce) 1f else 0f) }
    LaunchedEffect(reduce) { if (!reduce) form.animateTo(1f, tween(1800, easing = LinearEasing)) }

    val tr = rememberInfiniteTransition(label = "twinkle")
    val twinkleAnim by tr.animateFloat(
        initialValue = 0.55f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(1400, easing = LinearEasing), RepeatMode.Reverse),
        label = "tw",
    )
    val twinkle = if (reduce) 1f else twinkleAnim

    val stars = remember {
        listOf(
            Offset(0.50f, 0.06f), Offset(0.80f, 0.26f), Offset(0.88f, 0.62f),
            Offset(0.62f, 0.90f), Offset(0.30f, 0.86f), Offset(0.10f, 0.56f),
            Offset(0.20f, 0.22f), Offset(0.50f, 0.48f),
        )
    }
    Canvas(modifier = modifier) {
        val n = stars.size
        fun pt(o: Offset) = Offset(o.x * size.width, o.y * size.height)
        // Connecting lines draw in progressively as the constellation forms.
        for (k in 0 until n - 1) {
            val seg = (form.value * n - k).coerceIn(0f, 1f)
            if (seg <= 0f) continue
            val a = pt(stars[k]); val b = pt(stars[k + 1])
            val end = Offset(a.x + (b.x - a.x) * seg, a.y + (b.y - a.y) * seg)
            drawLine(accent.copy(alpha = 0.45f * seg), a, end, strokeWidth = 2f)
        }
        // Stars appear in sequence, each with a soft glow + white core that twinkles.
        for (k in stars.indices) {
            val appear = (form.value * n - k).coerceIn(0f, 1f)
            if (appear <= 0f) continue
            val c = pt(stars[k])
            val r = size.minDimension * 0.012f * appear
            drawCircle(accent.copy(alpha = 0.22f * appear * twinkle), r * 4f, c)
            drawCircle(Color.White.copy(alpha = appear * twinkle), r + 1.5f, c)
        }
    }
}
