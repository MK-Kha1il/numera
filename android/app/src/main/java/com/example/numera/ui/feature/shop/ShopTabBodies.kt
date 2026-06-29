package com.example.numera.ui.feature.shop

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.ShopItem
import com.example.numera.data.network.User
import com.example.numera.data.network.UtilityBalance
import com.example.numera.theme.*
import com.example.numera.ui.components.GlossyProgressBar

/** The Vault's top-level sections (docs/ShopOverhaul.md §4). Titles/Effects/Earnable arrive in Stage D. */
enum class ShopTab(val label: String) {
    Featured("Featured"),
    Cosmetics("Cosmetics"),
    Titles("Titles"),
    Effects("Effects"),
    Themes("Themes"),
    Utilities("Utilities"),
    Seasonal("Seasonal"),
    Collection("Collection"),
    Earnable("Earnable"),
}

enum class ShopSort(val label: String) { Rarity("Rarity"), PriceLow("Price ↑"), PriceHigh("Price ↓") }

private val rarityRank = mapOf("Common" to 0, "Rare" to 1, "Epic" to 2, "Legendary" to 3, "Mythic" to 4)

/** Search (name+description) → type filter → saved filter → sort. One place so every tab agrees. */
fun List<ShopItem>.applyFilters(
    query: String,
    sort: ShopSort,
    type: String?,
    savedOnly: Boolean,
    favorites: Set<String>,
): List<ShopItem> {
    val q = query.trim().lowercase()
    val filtered = filter { item ->
        (q.isEmpty() || item.name.lowercase().contains(q) || (item.description ?: "").lowercase().contains(q)) &&
            (type == null || item.type == type) &&
            (!savedOnly || favorites.contains(item.id))
    }
    return when (sort) {
        ShopSort.Rarity -> filtered.sortedWith(compareBy({ rarityRank[it.rarity] ?: 0 }, { it.cost }))
        ShopSort.PriceLow -> filtered.sortedBy { it.cost }
        ShopSort.PriceHigh -> filtered.sortedByDescending { it.cost }
    }
}

// ── Shared grid plumbing ─────────────────────────────────────────────────────────────────────

private fun LazyGridScope.fullSpan(content: @Composable () -> Unit) {
    item(span = { GridItemSpan(maxLineSpan) }) { content() }
}

private fun LazyGridScope.collectibleItems(
    list: List<ShopItem>,
    user: User?,
    inventoryIds: List<String>,
    favorites: Set<String>,
    onCardClick: (ShopItem) -> Unit,
    onToggleFav: (String) -> Unit,
) {
    items(list, key = { it.id }) { item ->
        CollectibleCard(
            item = item,
            owned = inventoryIds.contains(item.id),
            equipped = item.isEquippedBy(user),
            locked = item.isLockedFor(user),
            favorite = favorites.contains(item.id),
            onClick = { onCardClick(item) },
            onToggleFavorite = { onToggleFav(item.id) },
        )
    }
}

@Composable
private fun vaultGrid(content: LazyGridScope.() -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = Spacing.xxl),
        horizontalArrangement = Arrangement.spacedBy(Spacing.m),
        verticalArrangement = Arrangement.spacedBy(Spacing.m),
        content = content,
    )
}

// ── Controls ─────────────────────────────────────────────────────────────────────────────────

@Composable
fun ShopChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
            .clickable { onClick() }
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
    ) {
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = if (selected) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
        )
    }
}

/** Type chips (optional) + Saved toggle + sort chips, in one horizontally scrollable row. */
@Composable
private fun ShopControlRow(
    sort: ShopSort,
    onSort: (ShopSort) -> Unit,
    savedOnly: Boolean,
    onSavedToggle: () -> Unit,
    typeFilter: String?,
    onType: (String?) -> Unit,
    showTypes: Boolean,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = Spacing.xs),
        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (showTypes) {
            val types = listOf(null to "All", "avatar" to "Avatars", "banner" to "Banners", "badge" to "Badges")
            types.forEach { (value, label) ->
                ShopChip(label = label, selected = typeFilter == value) { onType(value) }
            }
            Box(Modifier.width(1.dp).height(IconSize.m).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.15f)))
        }
        ShopChip(label = "♡ Saved", selected = savedOnly) { onSavedToggle() }
        Box(Modifier.width(1.dp).height(IconSize.m).background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.15f)))
        ShopSort.entries.forEach { s ->
            ShopChip(label = s.label, selected = sort == s) { onSort(s) }
        }
    }
}

@Composable
fun ShopEmptyState(emoji: String, message: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth().padding(Spacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        Text(emoji, fontSize = 40.sp)
        Text(
            message,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
            fontSize = 13.sp,
            textAlign = TextAlign.Center,
        )
    }
}

// ── Tabs ─────────────────────────────────────────────────────────────────────────────────────

@Composable
fun FeaturedTab(
    featured: List<ShopItem>,
    daily: List<ShopItem>,
    refreshSeconds: Long?,
    savingFor: ShopItem?,
    coins: Int,
    user: User?,
    inventoryIds: List<String>,
    favorites: Set<String>,
    onCardClick: (ShopItem) -> Unit,
    onToggleFav: (String) -> Unit,
) {
    val hero = featured.firstOrNull()
    val rest = (featured.drop(1) + daily).distinctBy { it.id }
    if (hero == null) {
        ShopEmptyState("✦", "Today's featured items are loading.")
        return
    }
    vaultGrid {
        if (savingFor != null) {
            fullSpan { SavingForBanner(item = savingFor, coins = coins, onClick = { onCardClick(savingFor) }) }
        }
        fullSpan {
            CollectibleCard(
                item = hero,
                owned = inventoryIds.contains(hero.id),
                equipped = hero.isEquippedBy(user),
                locked = hero.isLockedFor(user),
                favorite = favorites.contains(hero.id),
                large = true,
                onClick = { onCardClick(hero) },
                onToggleFavorite = { onToggleFav(hero.id) },
            )
        }
        if (rest.isNotEmpty()) {
            fullSpan {
                ShopSectionHeader(
                    title = "⏰ TODAY'S DEALS",
                    accent = RarityRareTeal,
                    trailing = refreshSeconds?.let { "Refreshes in ${formatDuration(it)}" },
                )
            }
            collectibleItems(rest, user, inventoryIds, favorites, onCardClick, onToggleFav)
        }
    }
}

@Composable
fun CosmeticsTab(
    cosmetics: List<ShopItem>,
    query: String,
    sort: ShopSort,
    onSort: (ShopSort) -> Unit,
    typeFilter: String?,
    onType: (String?) -> Unit,
    savedOnly: Boolean,
    onSavedToggle: () -> Unit,
    user: User?,
    inventoryIds: List<String>,
    favorites: Set<String>,
    onCardClick: (ShopItem) -> Unit,
    onToggleFav: (String) -> Unit,
) {
    val shown = cosmetics.applyFilters(query, sort, typeFilter, savedOnly, favorites)
    vaultGrid {
        fullSpan {
            ShopControlRow(sort, onSort, savedOnly, onSavedToggle, typeFilter, onType, showTypes = true)
        }
        if (shown.isEmpty()) {
            fullSpan { ShopEmptyState("🔍", "Nothing matches yet. Try a different filter or search.") }
        } else {
            collectibleItems(shown, user, inventoryIds, favorites, onCardClick, onToggleFav)
        }
    }
}

/**
 * A grid tab with sort + ♡-saved controls but no type sub-filter — used by Themes, Titles, and
 * Effects (each is already a single type family, so type chips would be redundant).
 */
@Composable
fun FilteredGridTab(
    base: List<ShopItem>,
    query: String,
    sort: ShopSort,
    onSort: (ShopSort) -> Unit,
    savedOnly: Boolean,
    onSavedToggle: () -> Unit,
    emptyEmoji: String,
    emptyMessage: String,
    user: User?,
    inventoryIds: List<String>,
    favorites: Set<String>,
    onCardClick: (ShopItem) -> Unit,
    onToggleFav: (String) -> Unit,
) {
    val shown = base.applyFilters(query, sort, null, savedOnly, favorites)
    vaultGrid {
        fullSpan {
            ShopControlRow(sort, onSort, savedOnly, onSavedToggle, null, {}, showTypes = false)
        }
        if (shown.isEmpty()) {
            fullSpan { ShopEmptyState(emptyEmoji, emptyMessage) }
        } else {
            collectibleItems(shown, user, inventoryIds, favorites, onCardClick, onToggleFav)
        }
    }
}

/**
 * The "Earnable" showcase (docs/ShopOverhaul.md §9): prestige you unlock by playing — ranks,
 * mastery frames, streak relics — never for sale. Tapping a card opens the preview sheet, which
 * shows the requirement instead of a buy button.
 */
@Composable
fun EarnableTab(
    items: List<ShopItem>,
    user: User?,
    inventoryIds: List<String>,
    onCardClick: (ShopItem) -> Unit,
) {
    if (items.isEmpty()) {
        ShopEmptyState("🏅", "Nothing locked right now — you've earned what's available. Keep climbing for more.")
        return
    }
    val sorted = items.sortedByDescending { rarityRank[it.rarity] ?: 0 }
    vaultGrid {
        fullSpan {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text("🏅 EARN THESE — NEVER FOR SALE", fontSize = 12.sp, fontWeight = FontWeight.Black, color = MedalGold, letterSpacing = 0.8.sp)
                Text(
                    "Prestige you unlock by playing: ranks, mastery, streaks. Tap any to see how it's earned.",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 12.sp,
                )
            }
        }
        collectibleItems(sorted, user, inventoryIds, emptySet(), onCardClick, {})
    }
}

@Composable
fun UtilitiesTab(
    utilities: List<ShopItem>,
    userUtilities: List<UtilityBalance>,
    user: User?,
    onCardClick: (ShopItem) -> Unit,
) {
    if (utilities.isEmpty()) {
        ShopEmptyState("💼", "No utilities available right now.")
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = Spacing.xxl, top = Spacing.xs),
        verticalArrangement = Arrangement.spacedBy(Spacing.m),
    ) {
        item {
            Text(
                "Convenience and quality of life — never an edge in skill or rating.",
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                fontSize = 12.sp,
            )
        }
        items(utilities, key = { it.id }) { item ->
            val qty = userUtilities.find { it.item_id == item.id }?.quantity ?: 0
            UtilityShopItemCard(item = item, ownedQuantity = qty, user = user, onClick = { onCardClick(item) })
        }
    }
}

@Composable
fun SeasonalTab(
    seasonItems: List<ShopItem>,
    tokenItems: List<ShopItem>,
    seasonName: String?,
    seasonTokens: Int,
    coins: Int,
    onConvert: () -> Unit,
    onClaim: (ShopItem) -> Unit,
    user: User?,
    inventoryIds: List<String>,
    onCardClick: (ShopItem) -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = Spacing.xxl, top = Spacing.xs),
        verticalArrangement = Arrangement.spacedBy(Spacing.m),
    ) {
        item { SeasonTokenWallet(tokens = seasonTokens, coins = coins, onConvert = onConvert) }
        if (seasonItems.isNotEmpty()) {
            item {
                ShopSectionHeader(
                    title = "✦ THIS SEASON" + (seasonName?.let { " · $it" } ?: ""),
                    accent = SeasonGold,
                )
            }
            item {
                Text(
                    "Season-exclusive — these leave the shop when the season ends.",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 12.sp,
                )
            }
            items(seasonItems, key = { "season_${it.id}" }) { item ->
                DailyShopItemCard(item = item, inventoryIds = inventoryIds, user = user, onClick = { onCardClick(item) })
            }
        }
        if (tokenItems.isNotEmpty()) {
            item { ShopSectionHeader(title = "👑 PRESTIGE — TOKEN ONLY", accent = SeasonGold) }
            items(tokenItems, key = { "token_${it.id}" }) { item ->
                PrestigeTokenCard(item = item, tokens = seasonTokens, onClaim = { onClaim(item) })
            }
        }
        if (seasonItems.isEmpty() && tokenItems.isEmpty()) {
            item { ShopEmptyState("✦", "No seasonal items right now. New rewards arrive with each season.") }
        }
    }
}

@Composable
fun CollectionTab(
    ownedItems: List<ShopItem>,
    catalogItems: List<ShopItem>,
    user: User?,
    inventoryIds: List<String>,
    favorites: Set<String>,
    onCardClick: (ShopItem) -> Unit,
    onToggleFav: (String) -> Unit,
) {
    if (ownedItems.isEmpty()) {
        ShopEmptyState(
            "🗝️",
            "Your vault is empty — for now. Earn coins by solving and dueling, then claim your first cosmetic.",
        )
        return
    }
    val totalKnown = (catalogItems.map { it.id } + ownedItems.map { it.id }).distinct().size.coerceAtLeast(1)
    val ownedCount = ownedItems.size
    vaultGrid {
        fullSpan {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("🏆 COLLECTION", fontSize = 12.sp, fontWeight = FontWeight.Black, color = MedalGold, letterSpacing = 0.8.sp)
                    Text("$ownedCount / $totalKnown owned", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                }
                GlossyProgressBar(
                    progress = (ownedCount.toFloat() / totalKnown).coerceIn(0f, 1f),
                    isCompleted = ownedCount >= totalKnown,
                    modifier = Modifier.fillMaxWidth().height(10.dp),
                )
                Text(
                    "Tap anything you own to preview and equip it — including earned rewards.",
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 12.sp,
                )
            }
        }
        collectibleItems(ownedItems, user, inventoryIds, favorites, onCardClick, onToggleFav)
    }
}

/** A small section header (title + optional trailing note) shared by the tab bodies. */
@Composable
fun ShopSectionHeader(title: String, accent: androidx.compose.ui.graphics.Color, trailing: String? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = Spacing.s),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, fontWeight = FontWeight.Black, fontSize = 14.sp, color = accent)
        if (trailing != null) {
            Text(trailing, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary))
        }
    }
}

/**
 * "Saving for" nudge (docs/ShopOverhaul.md §11/§12): the player's closest wishlisted-but-unaffordable
 * item, with how far away it is + a progress bar — turns surplus coins into a goal. Tap to preview it.
 */
@Composable
fun SavingForBanner(item: ShopItem, coins: Int, onClick: () -> Unit) {
    val gap = (item.cost - coins).coerceAtLeast(0)
    val progress = if (item.cost > 0) (coins.toFloat() / item.cost).coerceIn(0f, 1f) else 1f
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(1.dp, SeasonGold.copy(alpha = 0.4f), RoundedCornerShape(CornerRadius.m))
            .clickable { onClick() }
            .padding(Spacing.m),
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text("🎯 SAVING FOR", fontSize = 11.sp, fontWeight = FontWeight.Black, color = SeasonGold, letterSpacing = 0.8.sp)
            Text("$gap 🪙 to go", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.m),
        ) {
            ShopItemArt(item = item, locked = false, artSize = 44)
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(item.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                GlossyProgressBar(progress = progress, isCompleted = gap == 0, modifier = Modifier.fillMaxWidth().height(8.dp))
            }
        }
    }
}
