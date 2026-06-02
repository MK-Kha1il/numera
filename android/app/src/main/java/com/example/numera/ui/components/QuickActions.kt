package com.example.numera.ui.components

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Quick actions surface the one or two things a user most likely wants to do on a screen
 * (Home: Continue learning / Daily puzzle / Ranked; Profile: Resume / Collections / Progress)
 * as large, glanceable, single-tap tiles — removing a dig through tabs and menus.
 */

data class QuickAction(
    val label: String,
    val sublabel: String? = null,
    val icon: NumeraIconType,
    val accent: Color? = null,
    val onClick: () -> Unit
)

/** A prominent primary action tile — used for the single highest-intent action (e.g. "Continue"). */
@Composable
fun QuickActionHero(
    action: QuickAction,
    modifier: Modifier = Modifier
) {
    val accent = action.accent ?: MaterialTheme.colorScheme.primary
    var pressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        if (pressed) 0.97f else 1f,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "heroScale"
    )
    Row(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(Brush.horizontalGradient(listOf(accent, accent.copy(alpha = 0.82f))))
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = { pressed = true; tryAwaitRelease(); pressed = false },
                    onTap = {
                        SoundManager.playClick()
                        HapticManager.playMedium()
                        action.onClick()
                    }
                )
            }
            .padding(horizontal = Spacing.l, vertical = Spacing.l),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(CornerRadius.m))
                .background(Color.White.copy(alpha = 0.22f)),
            contentAlignment = Alignment.Center
        ) {
            NumeraIcon(type = action.icon, tint = Color.White, animate = false, modifier = Modifier.size(26.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(action.label, color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Black)
            if (action.sublabel != null) {
                Text(action.sublabel, color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp, fontWeight = FontWeight.Medium)
            }
        }
        NumeraIcon(type = NumeraIconType.ChevronRight, tint = Color.White, animate = false)
    }
}

/** A compact secondary action tile, sized for a horizontal row or 2-up grid. */
@Composable
fun QuickActionTile(
    action: QuickAction,
    modifier: Modifier = Modifier
) {
    val accent = action.accent ?: MaterialTheme.colorScheme.secondary
    var pressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        if (pressed) 0.95f else 1f,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "tileScale"
    )
    Column(
        modifier = modifier
            .graphicsLayer { scaleX = scale; scaleY = scale }
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .border(BorderStroke(1.5.dp, MaterialTheme.colorScheme.outline), RoundedCornerShape(CornerRadius.l))
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = { pressed = true; tryAwaitRelease(); pressed = false },
                    onTap = {
                        SoundManager.playClick()
                        HapticManager.playSoft()
                        action.onClick()
                    }
                )
            }
            .padding(Spacing.m),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(CornerRadius.m))
                .background(accent.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            NumeraIcon(type = action.icon, tint = accent, animate = false, modifier = Modifier.size(22.dp))
        }
        Text(
            action.label,
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )
        if (action.sublabel != null) {
            Text(
                action.sublabel,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

/** A full quick-actions block: one optional hero + an even row of tiles. */
@Composable
fun QuickActionsBar(
    hero: QuickAction?,
    tiles: List<QuickAction>,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
        if (hero != null) QuickActionHero(hero)
        if (tiles.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(Spacing.s)) {
                tiles.forEach { tile ->
                    QuickActionTile(action = tile, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
