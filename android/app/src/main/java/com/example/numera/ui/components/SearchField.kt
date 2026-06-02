package com.example.numera.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing
import kotlinx.coroutines.delay

/**
 * Debounced search system.
 *
 * The text field echoes input instantly (feels effortless) while [rememberDebouncedValue] delays
 * publishing the value, so callers key their fetch effect on the debounced value and fire one
 * request per pause instead of one per keystroke.
 */

/** Returns [value] delayed by [delayMs]; supersedes pending updates when [value] changes again. */
@Composable
fun <T> rememberDebouncedValue(value: T, delayMs: Long = 300L): State<T> {
    val state = remember { mutableStateOf(value) }
    LaunchedEffect(value) {
        delay(delayMs)
        state.value = value
    }
    return state
}

/** Themed search input: instant local echo, search glyph, and a clear affordance. */
@Composable
fun NumeraSearchField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Search…",
    focusRequester: FocusRequester? = null,
    onSearch: (() -> Unit)? = null
) {
    val onSurface = MaterialTheme.colorScheme.onSurface
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(2.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(CornerRadius.full))
            .padding(horizontal = Spacing.l, vertical = Spacing.m),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        NumeraIcon(type = NumeraIconType.Search, tint = onSurface.copy(alpha = Alpha.secondary), animate = false)
        Box(modifier = Modifier.weight(1f)) {
            if (value.isEmpty()) {
                Text(
                    text = placeholder,
                    color = onSurface.copy(alpha = Alpha.hint),
                    fontSize = 15.sp
                )
            }
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = LocalTextStyle.current.copy(color = onSurface, fontSize = 15.sp),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSearch = { onSearch?.invoke() }),
                modifier = Modifier
                    .fillMaxWidth()
                    .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            )
        }
        if (value.isNotEmpty()) {
            NumeraIcon(
                type = NumeraIconType.Close,
                tint = onSurface.copy(alpha = Alpha.secondary),
                animate = false,
                modifier = Modifier
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .clickable { onValueChange("") }
                    .padding(Spacing.xs)
            )
        }
    }
}
