package com.example.numera.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * Reusable premium bottom-sheet system for filters, sorting, collection management, lesson
 * references, exercise options, friend actions and other contextual tools.
 *
 * Built on Material3 [ModalBottomSheet] so drag-to-close, the scrim, predictive-back and
 * accessibility semantics come native; this wrapper supplies the themed surface, the grabber, a
 * consistent header and ready-made action rows so every sheet across the app looks and feels the
 * same. Bottom sheets are for contextual actions on the *current* screen — never for primary
 * navigation between sections.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NumeraBottomSheet(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = MaterialTheme.colorScheme.onSurface,
        shape = RoundedCornerShape(topStart = CornerRadius.xl, topEnd = CornerRadius.xl),
        dragHandle = { SheetGrabber() }
    ) {
        Column(
            modifier = modifier
                .fillMaxWidth()
                .padding(horizontal = Spacing.l)
                .padding(bottom = Spacing.xl),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            if (title != null) {
                Text(
                    title,
                    color = MaterialTheme.colorScheme.onSurface,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black
                )
            }
            if (subtitle != null) {
                Text(
                    subtitle,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }
            if (title != null || subtitle != null) Spacer(Modifier.height(Spacing.s))
            content()
        }
    }
}

@Composable
private fun SheetGrabber() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = Spacing.m),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(width = 40.dp, height = 5.dp)
                .clip(RoundedCornerShape(CornerRadius.full))
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.18f))
        )
    }
}

/**
 * A single tappable action row for a bottom sheet (the standard "menu of actions" pattern).
 * Destructive actions render in the error color. Selected rows show a trailing check.
 */
@Composable
fun SheetActionRow(
    label: String,
    icon: NumeraIconType,
    modifier: Modifier = Modifier,
    description: String? = null,
    destructive: Boolean = false,
    selected: Boolean = false,
    onClick: () -> Unit
) {
    val tint = if (destructive) MaterialTheme.colorScheme.error
               else MaterialTheme.colorScheme.onSurface
    val accent = if (destructive) MaterialTheme.colorScheme.error
                 else MaterialTheme.colorScheme.primary
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.m))
            .pressable(feedback = PressFeedback.Silent) {
                SoundManager.playClick()
                HapticManager.playSoft()
                onClick()
            }
            .padding(vertical = Spacing.m, horizontal = Spacing.s),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(CornerRadius.s))
                .background(accent.copy(alpha = 0.12f)),
            contentAlignment = Alignment.Center
        ) {
            NumeraIcon(type = icon, tint = accent, animate = false, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(label, color = tint, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            if (description != null) {
                Text(
                    description,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
        if (selected) {
            NumeraIcon(type = NumeraIconType.Check, tint = MaterialTheme.colorScheme.primary, animate = false)
        }
    }
}

/** A small uppercase section label to group rows inside a sheet. */
@Composable
fun SheetSectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier.padding(top = Spacing.s, start = Spacing.s, bottom = Spacing.xs),
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        letterSpacing = 0.8.sp
    )
}
