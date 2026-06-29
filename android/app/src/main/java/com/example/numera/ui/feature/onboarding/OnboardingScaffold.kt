package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.numera.theme.Alpha
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.GlossyProgressBar

/**
 * Shared premium chrome for every onboarding step. Gives the whole flow one consistent skin
 * (Phase 13) and keeps it feeling short (Phase 10): a progress spine ("Step N of total"), a title +
 * optional subtitle, a scrollable body, and a pinned CTA with an optional "what's next" preview and
 * Back/Skip affordances. Steps only supply their own content + the CTA wiring.
 */
@Composable
fun OnboardingScaffold(
    stepIndex: Int,
    totalSteps: Int,
    title: String,
    primaryLabel: String,
    onPrimary: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    nextPreview: String? = null,
    primaryEnabled: Boolean = true,
    onBack: (() -> Unit)? = null,
    onSkip: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(MaterialTheme.colorScheme.background, MaterialTheme.colorScheme.surfaceVariant)
                )
            )
            .systemBarsPadding()
            .padding(horizontal = Spacing.l),
    ) {
        // ── Progress spine ──
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = Spacing.m),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (onBack != null) {
                TextButton(onClick = onBack) { Text("←") }
            }
            Text(
                text = "Step ${stepIndex + 1} of $totalSteps",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                modifier = Modifier.weight(1f).padding(start = if (onBack == null) Spacing.xs else Spacing.zero),
            )
            if (onSkip != null) {
                TextButton(onClick = onSkip) {
                    Text("Skip", color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary))
                }
            }
        }
        GlossyProgressBar(
            progress = (stepIndex + 1).toFloat() / totalSteps,
            isCompleted = false,
            modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.s),
        )

        // ── Body ──
        Column(
            modifier = Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()),
        ) {
            Spacer(Modifier.height(Spacing.m))
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            if (subtitle != null) {
                Spacer(Modifier.height(Spacing.s))
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = Alpha.secondary),
                )
            }
            Spacer(Modifier.height(Spacing.l))
            content()
            Spacer(Modifier.height(Spacing.l))
        }

        // ── CTA ──
        Column(modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.l)) {
            DuoButton(
                text = primaryLabel,
                onClick = onPrimary,
                modifier = Modifier.fillMaxWidth(),
                enabled = primaryEnabled,
            )
            if (nextPreview != null) {
                Spacer(Modifier.height(Spacing.s))
                Text(
                    text = "Next: $nextPreview",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.hint),
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                )
            }
        }
    }
}

/**
 * Wrapping selection grid without the experimental FlowRow: chunks items into rows of [columns] and
 * stretches each cell to equal width. Used for goal/interest/avatar pickers.
 */
@Composable
fun <T> SelectGrid(
    items: List<T>,
    columns: Int = 2,
    spacing: Dp = Spacing.s,
    cell: @Composable (item: T, cellModifier: Modifier) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(spacing)) {
        items.chunked(columns).forEach { rowItems ->
            Row(
                horizontalArrangement = Arrangement.spacedBy(spacing),
                modifier = Modifier.fillMaxWidth(),
            ) {
                rowItems.forEach { item -> cell(item, Modifier.weight(1f)) }
                // Pad a short final row so cells keep their column width.
                repeat(columns - rowItems.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

/**
 * A selectable card primitive — the visual language for every multi/single-select picker in the
 * flow (primary tint + ring when selected). Keeps selection styling identical everywhere.
 */
@Composable
fun SelectableCard(
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val borderColor =
        if (selected) MaterialTheme.colorScheme.primary
        else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
    val bg =
        if (selected) MaterialTheme.colorScheme.primaryContainer
        else MaterialTheme.colorScheme.surface
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(bg)
            .border(BorderStroke(if (selected) 2.dp else 1.dp, borderColor), RoundedCornerShape(CornerRadius.l))
            .pressable { onClick() }
            .padding(Spacing.m),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.xs),
        content = content,
    )
}
