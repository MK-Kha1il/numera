package com.example.numera.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.indication
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Breadcrumb trail for deep hierarchical areas (Archive ▸ Topic ▸ Subtopic ▸ Set,
 * Profile ▸ Collections ▸ Saved, Settings ▸ Security).
 *
 * Breadcrumbs answer two questions at a glance: "where am I" and "how do I go up". The last crumb
 * is the current location (bold, non-interactive); every earlier crumb is a tap target that jumps
 * straight back to that level. The row scrolls horizontally so a long trail never wraps or truncates
 * the leaf. Do NOT use this for primary tab navigation — only for genuine drill-down hierarchies.
 */

data class Crumb(
    val label: String,
    /** null for the current (last) crumb, which is never clickable. */
    val onClick: (() -> Unit)? = null
)

@Composable
fun NumeraBreadcrumbs(
    items: List<Crumb>,
    modifier: Modifier = Modifier
) {
    if (items.isEmpty()) return
    val scroll = rememberScrollState()
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(scroll)
            .padding(vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        items.forEachIndexed { index, crumb ->
            val isLast = index == items.lastIndex
            CrumbChip(crumb = crumb, isCurrent = isLast)
            if (!isLast) {
                NumeraIcon(
                    type = NumeraIconType.ChevronRight,
                    tint = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
                    animate = false,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}

@Composable
private fun CrumbChip(crumb: Crumb, isCurrent: Boolean) {
    val interaction = remember { MutableInteractionSource() }
    val pressed = interaction.collectIsPressedAsState().value
    val clickable = crumb.onClick != null && !isCurrent
    val base = Modifier
        .clip(RoundedCornerShape(CornerRadius.s))
        .then(if (clickable) Modifier.pressScale(pressed) else Modifier)
        .then(
            if (clickable) Modifier
                .clickable(
                    interactionSource = interaction,
                    indication = ripple(),
                ) {
                    SoundManager.playClick()
                    HapticManager.playSoft()
                    crumb.onClick?.invoke()
                }
            else Modifier
        )
        .padding(horizontal = Spacing.s, vertical = Spacing.xs)
    Text(
        text = crumb.label,
        modifier = base,
        color = if (isCurrent) MaterialTheme.colorScheme.onSurface
                else MaterialTheme.colorScheme.primary,
        fontSize = 13.sp,
        fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.SemiBold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}
