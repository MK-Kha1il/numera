package com.example.numera.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.Spacing

/**
 * Progressive disclosure: keep the default surface calm for newcomers, and tuck richer/advanced
 * tools behind a single, clearly-labelled expander that power users can open. State is remembered
 * per-key so once a user opens "Advanced", it stays open for them.
 */
@Composable
fun DisclosureSection(
    title: String,
    modifier: Modifier = Modifier,
    persistKey: String? = null,
    initiallyExpanded: Boolean = false,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    var expanded = if (persistKey != null) {
        rememberSaveable(persistKey) { mutableStateOf(initiallyExpanded) }
    } else {
        remember { mutableStateOf(initiallyExpanded) }
    }
    val rotation by animateFloatAsState(if (expanded.value) 180f else 0f, label = "discloseRot")

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable {
                    SoundManager.playClick()
                    HapticManager.playSoft()
                    expanded.value = !expanded.value
                }
                .padding(vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    title,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                if (subtitle != null) {
                    Text(
                        subtitle,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            NumeraIcon(
                type = NumeraIconType.ChevronDown,
                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                animate = false,
                modifier = Modifier.rotate(rotation)
            )
        }
        AnimatedVisibility(
            visible = expanded.value,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut()
        ) {
            Column(
                Modifier
                    .fillMaxWidth()
                    .padding(top = Spacing.xs, bottom = Spacing.s),
                content = content
            )
        }
    }
}
