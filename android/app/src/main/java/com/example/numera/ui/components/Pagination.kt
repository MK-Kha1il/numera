package com.example.numera.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.example.numera.theme.Spacing

/**
 * Infinite-scroll / progressive-reveal helpers.
 *
 * [rememberInfiniteScroll] drives true server paging (the archive): it fires [onLoadMore] once as
 * the user nears the end, and callers append rather than replace so scroll position is preserved.
 * [rememberRevealWindow] gives the same continuous feel for small, already-fetched lists by
 * revealing them in chunks. [LoadMoreFooter] is the shared trailing affordance.
 */

/**
 * Invokes [onLoadMore] when the last visible item is within [buffer] of the end of the list.
 * Guarded so it only fires once per threshold crossing while [enabled].
 */
@Composable
fun rememberInfiniteScroll(
    listState: LazyListState,
    buffer: Int = 4,
    enabled: Boolean = true,
    onLoadMore: () -> Unit
) {
    val shouldLoadMore by remember {
        derivedStateOf {
            val layoutInfo = listState.layoutInfo
            val total = layoutInfo.totalItemsCount
            if (total == 0) return@derivedStateOf false
            val lastVisible = layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            lastVisible >= total - 1 - buffer
        }
    }

    LaunchedEffect(shouldLoadMore, enabled) {
        if (shouldLoadMore && enabled) onLoadMore()
    }
}

/**
 * Client-side chunked reveal for small/capped lists. Returns the currently-visible slice and a
 * `loadMore` lambda to widen the window. Resets whenever the backing [items] identity changes.
 */
@Stable
class RevealWindow<T>(
    val visible: List<T>,
    val hasMore: Boolean,
    val loadMore: () -> Unit
)

@Composable
fun <T> rememberRevealWindow(items: List<T>, pageSize: Int = 12): RevealWindow<T> {
    var count by remember(items) { mutableIntStateOf(minOf(pageSize, items.size)) }
    return RevealWindow(
        visible = items.take(count),
        hasMore = count < items.size,
        loadMore = { count = minOf(count + pageSize, items.size) }
    )
}

/** Trailing footer for paginated lists: a shimmering row while fetching, nothing when exhausted. */
@Composable
fun LoadMoreFooter(isLoading: Boolean, modifier: Modifier = Modifier) {
    if (!isLoading) return
    Box(
        modifier = modifier.fillMaxWidth().padding(vertical = Spacing.s),
        contentAlignment = Alignment.Center
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.m), modifier = Modifier.fillMaxWidth()) {
            ArchiveRowSkeleton()
        }
    }
}
