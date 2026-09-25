package com.example.numera.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.example.numera.theme.AppText
import com.example.numera.theme.IconSize
import com.example.numera.theme.NumeralStyle
import com.example.numera.theme.Spacing

/**
 * The one canonical way to display a coins/XP reward. Replaces the ad-hoc glyph-soup strings
 * ("🪙 12  ⭐ 30 XP") so every reward renders the same: crisp vector [NumeraIcon]s + tabular
 * [NumeralStyle] figures that never jitter as counts change.
 */
@Composable
fun RewardChip(
    coins: Int? = null,
    xp: Int? = null,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.primary
) {
    val figureStyle = AppText.caption.merge(NumeralStyle).copy(fontWeight = FontWeight.Bold)
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        if (coins != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                NumeraIcon(
                    type = NumeraIconType.Coins,
                    modifier = Modifier.size(IconSize.s),
                    tint = tint,
                    animate = false
                )
                Text(text = "$coins", style = figureStyle, color = tint)
            }
        }
        if (xp != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                NumeraIcon(
                    type = NumeraIconType.XP,
                    modifier = Modifier.size(IconSize.s),
                    tint = tint,
                    animate = false
                )
                Text(text = "$xp XP", style = figureStyle, color = tint)
            }
        }
    }
}
