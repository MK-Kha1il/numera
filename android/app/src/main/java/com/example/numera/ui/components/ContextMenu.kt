package com.example.numera.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Long-press context menus move secondary actions (rename, add to collection, share, delete,
 * duplicate, archive…) off the main surface and into a contextual menu, cutting interface clutter
 * while keeping power features one gesture away.
 *
 * Wrap any item with [ContextMenuArea]: a normal tap runs [onClick]; a long-press fires a haptic and
 * opens a themed anchored menu of [ContextAction]s. Destructive actions render in the error color.
 */

data class ContextAction(
    val label: String,
    val icon: NumeraIconType,
    val destructive: Boolean = false,
    val onClick: () -> Unit
)

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ContextMenuArea(
    actions: List<ContextAction>,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier = modifier) {
        Box(
            modifier = Modifier.combinedClickable(
                onClick = {
                    if (onClick != null) {
                        SoundManager.playClick()
                        HapticManager.playSoft()
                        onClick()
                    }
                },
                onLongClick = {
                    HapticManager.playMedium()
                    SoundManager.playClick()
                    expanded = true
                }
            )
        ) {
            content()
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(CornerRadius.l),
            modifier = Modifier.background(MaterialTheme.colorScheme.surface)
        ) {
            actions.forEach { action ->
                val tint = if (action.destructive) MaterialTheme.colorScheme.error
                           else MaterialTheme.colorScheme.onSurface
                DropdownMenuItem(
                    text = {
                        Text(
                            action.label,
                            color = tint,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    },
                    leadingIcon = {
                        NumeraIcon(
                            type = action.icon,
                            tint = if (action.destructive) MaterialTheme.colorScheme.error
                                   else MaterialTheme.colorScheme.primary,
                            animate = false,
                            modifier = Modifier.size(20.dp)
                        )
                    },
                    onClick = {
                        SoundManager.playClick()
                        HapticManager.playSoft()
                        expanded = false
                        action.onClick()
                    }
                )
            }
        }
    }
}
