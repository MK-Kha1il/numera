package com.example.numera.ui.components

import android.content.Context
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Reusable smart-filter system: instant, visually-obvious filter chips with optional persistence.
 *
 * Filters should feel like a remote control, not a form. Tapping a chip filters immediately (no
 * "Apply" button); the selected state is unmistakable (filled, accented, slight lift); state can be
 * remembered across sessions via [rememberPersistentSelection] so a user's preferred view sticks.
 */

@Composable
fun NumeraFilterChip(
    label: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    leadingIcon: NumeraIconType? = null,
    count: Int? = null,
    onClick: () -> Unit
) {
    val shape = RoundedCornerShape(CornerRadius.full)
    val bg by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.surfaceVariant,
        label = "chipBg"
    )
    val border by animateColorAsState(
        if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.outline,
        label = "chipBorder"
    )
    val content = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface
    val lift by animateDpAsState(
        if (selected) 2.dp else 0.dp,
        animationSpec = spring(),
        label = "chipLift"
    )

    Row(
        modifier = modifier
            .offset(y = -lift)
            .clip(shape)
            .background(bg)
            .border(BorderStroke(1.5.dp, border), shape)
            .pressable(feedback = PressFeedback.Silent) {
                SoundManager.playClick()
                HapticManager.playSoft()
                onClick()
            }
            .padding(horizontal = Spacing.m, vertical = Spacing.s),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        if (leadingIcon != null) {
            NumeraIcon(type = leadingIcon, tint = content, animate = false, modifier = Modifier.size(16.dp))
        }
        Text(
            text = label,
            color = content,
            fontSize = 13.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold
        )
        if (count != null) {
            Text(
                text = count.toString(),
                color = content.copy(alpha = Alpha.secondary),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/**
 * Horizontally-scrolling row of single-select filter chips. Pass an "All"/null option by including
 * it in [options] and mapping it to `null` if you want a clear-all affordance.
 */
@Composable
fun <T> NumeraFilterRow(
    options: List<Pair<T, String>>,
    selected: T,
    modifier: Modifier = Modifier,
    onSelect: (T) -> Unit
) {
    val scroll = rememberScrollState()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scroll)
            .padding(vertical = Spacing.xs),
        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        options.forEach { (value, label) ->
            NumeraFilterChip(
                label = label,
                selected = value == selected,
                onClick = { onSelect(value) }
            )
        }
    }
}

/**
 * String-keyed filter selection that persists to SharedPreferences, so a user's chosen view is
 * restored next launch. Survives both recomposition and process death.
 */
@Composable
fun rememberPersistentSelection(
    key: String,
    default: String
): MutableState<String> {
    val context = LocalContext.current
    val state = rememberSaveable(key) {
        mutableStateOf(prefs(context).getString("filter_$key", default) ?: default)
    }
    LaunchedEffect(state.value) {
        prefs(context).edit().putString("filter_$key", state.value).apply()
    }
    return state
}

private fun prefs(context: Context) =
    context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
