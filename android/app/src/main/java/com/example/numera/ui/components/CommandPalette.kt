package com.example.numera.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Global command palette — the app's universal discovery tool.
 *
 * A single search field that spans navigation, content (lessons, exercises, concepts, collections,
 * achievements, profiles) and quick actions. Static commands (tabs, settings, quick actions) match
 * instantly client-side; an optional [onSearch] provider fetches content results from the server,
 * debounced. Anything reachable in the app should be reachable from here in two taps.
 *
 * Mount [CommandPaletteHost] once near the app root and provide [LocalCommandPalette] so any
 * composable can `LocalCommandPalette.current.open()`.
 */

enum class CommandCategory(val label: String) {
    Navigate("Navigate"),
    QuickAction("Quick Actions"),
    Lessons("Lessons"),
    Exercises("Exercises"),
    Concepts("Concepts"),
    Collections("Collections"),
    Achievements("Achievements"),
    Profiles("Profiles"),
    Settings("Settings")
}

data class CommandItem(
    val title: String,
    val category: CommandCategory,
    val icon: NumeraIconType,
    val subtitle: String? = null,
    /** Extra terms to match against (synonyms, codes) that aren't shown. */
    val keywords: String = "",
    val action: () -> Unit
) {
    fun matches(q: String): Boolean {
        if (q.isBlank()) return true
        val needle = q.trim().lowercase()
        return title.lowercase().contains(needle) ||
            (subtitle?.lowercase()?.contains(needle) == true) ||
            keywords.lowercase().contains(needle) ||
            category.label.lowercase().contains(needle)
    }
}

@Stable
class CommandPaletteController {
    var isOpen by mutableStateOf(false)
        private set

    fun open() {
        SoundManager.playClick()
        HapticManager.playSoft()
        isOpen = true
    }

    fun close() { isOpen = false }
}

val LocalCommandPalette = staticCompositionLocalOf { CommandPaletteController() }

@Composable
fun rememberCommandPaletteController(): CommandPaletteController = remember { CommandPaletteController() }

@Composable
fun CommandPaletteHost(
    controller: CommandPaletteController,
    staticCommands: List<CommandItem>,
    onSearch: (suspend (String) -> List<CommandItem>)? = null
) {
    if (!controller.isOpen) return

    Dialog(
        onDismissRequest = { controller.close() },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        var query by remember { mutableStateOf("") }
        val debounced by rememberDebouncedValue(query, 250L)
        var remote by remember { mutableStateOf<List<CommandItem>>(emptyList()) }
        var searching by remember { mutableStateOf(false) }
        val focus = remember { FocusRequester() }
        var shown by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            shown = true
            try { focus.requestFocus() } catch (_: Exception) {}
        }

        // Server-backed content search (lessons/exercises/profiles…), debounced.
        LaunchedEffect(debounced) {
            if (onSearch == null || debounced.isBlank()) {
                remote = emptyList()
                searching = false
                return@LaunchedEffect
            }
            searching = true
            remote = try { onSearch(debounced) } catch (_: Exception) { emptyList() }
            searching = false
        }

        val local = staticCommands.filter { it.matches(query) }
        // Server search supplements results with procedurally-generated exercises that can share the
        // same title+category (the generator picks one category/stars per request). Collapse exact
        // duplicates so the list isn't full of identical rows AND so list keys stay unique.
        val combined = (local + remote).distinctBy { "${it.category.name}|${it.title}|${it.subtitle}" }
        val grouped = combined.groupBy { it.category }
        val orderedCategories = CommandCategory.entries.filter { grouped.containsKey(it) }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) { controller.close() },
            contentAlignment = Alignment.TopCenter
        ) {
            AnimatedVisibility(
                visible = shown,
                enter = fadeIn(tween(180)) + slideInVertically(
                    spring(dampingRatio = Spring.DampingRatioLowBouncy, stiffness = Spring.StiffnessMediumLow)
                ) { -it / 3 } + scaleIn(initialScale = 0.96f),
                exit = fadeOut(tween(120)) + slideOutVertically { -it / 3 }
            ) {
                Column(
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(Spacing.l)
                        .fillMaxWidth()
                        .widthIn(max = 560.dp)
                        .heightIn(max = 560.dp)
                        .clip(RoundedCornerShape(CornerRadius.xl))
                        .background(MaterialTheme.colorScheme.surface)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {}
                        .padding(Spacing.l),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    NumeraSearchField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = "Search lessons, actions, settings…",
                        focusRequester = focus
                    )

                    if (combined.isEmpty() && !searching) {
                        NumeraEmptyState(
                            illustration = EmptyIllustration.Search,
                            title = "Nothing matches that",
                            message = "Try a lesson name, a concept, or an action like \"daily puzzle\" or \"theme\"."
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                        ) {
                            orderedCategories.forEach { category ->
                                val rows = grouped[category].orEmptyList()
                                item(key = "h_${category.name}") {
                                    CategoryHeader(category.label, rows.size)
                                }
                                // Index-based keys: collision-proof even if two rows somehow share a
                                // title/subtitle (a duplicate key crashes the whole LazyColumn).
                                itemsIndexed(rows, key = { index, _ -> "${category.name}_$index" }) { _, cmd ->
                                    CommandRow(cmd) {
                                        controller.close()
                                        cmd.action()
                                    }
                                }
                            }
                            if (searching) {
                                item(key = "searching") {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(Spacing.m),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(18.dp),
                                            strokeWidth = 2.dp,
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
    }
}

private fun <T> List<T>?.orEmptyList(): List<T> = this ?: emptyList()

@Composable
private fun CategoryHeader(label: String, count: Int) {
    Text(
        text = "${label.uppercase()}  ·  $count",
        modifier = Modifier.padding(top = Spacing.s, start = Spacing.xs, bottom = Spacing.xs),
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 0.8.sp
    )
}

@Composable
private fun CommandRow(cmd: CommandItem, onRun: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.m))
            .clickable {
                SoundManager.playClick()
                HapticManager.playSoft()
                onRun()
            }
            .padding(vertical = Spacing.s, horizontal = Spacing.s),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(CornerRadius.s))
                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            NumeraIcon(type = cmd.icon, tint = MaterialTheme.colorScheme.primary, animate = false, modifier = Modifier.size(19.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(
                cmd.title,
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1
            )
            if (cmd.subtitle != null) {
                Text(
                    cmd.subtitle,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1
                )
            }
        }
        NumeraIcon(
            type = NumeraIconType.ChevronRight,
            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
            animate = false,
            modifier = Modifier.size(16.dp)
        )
    }
}
