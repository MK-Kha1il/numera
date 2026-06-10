package com.example.numera.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SpotlightItem
import com.example.numera.data.network.SpotlightSeenRequest
import com.example.numera.theme.Spacing
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Progressive disclosure (Phase 11). Reveals a one-time intro card the first time a learner reaches
 * a feature surface — never all at once. "Seen" state is server-owned (survives reinstall) and
 * loaded once; each reveal is recorded so it never repeats.
 */
class SpotlightController(private val scope: CoroutineScope) {
    var catalog by mutableStateOf<List<SpotlightItem>>(emptyList())
        private set
    var current by mutableStateOf<SpotlightItem?>(null)
        private set
    var loaded by mutableStateOf(false)
        private set

    private val seen = mutableStateListOf<String>()

    fun load() {
        scope.launch {
            val token = RetrofitClient.authToken ?: return@launch
            try {
                val res = withContext(Dispatchers.IO) { RetrofitClient.apiService.getSpotlights(token) }
                catalog = res.catalog
                seen.clear()
                seen.addAll(res.seen)
            } catch (_: Exception) {
                // Best-effort: if it fails, we simply don't show spotlights this session.
            } finally {
                loaded = true
            }
        }
    }

    /** Show [key]'s intro if it exists, hasn't been seen, and nothing else is showing. */
    fun maybeShow(key: String) {
        if (!loaded || current != null || seen.contains(key)) return
        current = catalog.firstOrNull { it.key == key } ?: return
    }

    fun dismiss() {
        val key = current?.key ?: return
        if (!seen.contains(key)) seen.add(key)
        current = null
        scope.launch {
            val token = RetrofitClient.authToken ?: return@launch
            try {
                withContext(Dispatchers.IO) { RetrofitClient.apiService.markSpotlightSeen(token, SpotlightSeenRequest(key)) }
            } catch (_: Exception) { /* seen is also tracked locally, so a failed write won't re-show this session */ }
        }
    }
}

@Composable
fun rememberSpotlightController(): SpotlightController {
    val scope = rememberCoroutineScope()
    val controller = remember { SpotlightController(scope) }
    LaunchedEffect(Unit) { controller.load() }
    return controller
}

/** Renders the currently-active spotlight (if any) as a focused dialog. */
@Composable
fun FeatureSpotlightHost(controller: SpotlightController) {
    val item = controller.current ?: return
    Dialog(onDismissRequest = { controller.dismiss() }) {
        DuoCard(modifier = Modifier.fillMaxWidth().padding(Spacing.s)) {
            Column(
                modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(Spacing.m),
            ) {
                Text(item.emoji, fontSize = 48.sp)
                Text(
                    text = item.title,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = item.body,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                DuoButton(text = "Got it", onClick = { controller.dismiss() }, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}
