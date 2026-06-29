package com.example.numera.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.theme.MotionTokens
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

/**
 * A compact math-symbol pad shown above the stock keyboard for TYPED-answer modes
 * (ultra-review #16). The stock keyboard handles digits and the minus sign fine; what it makes
 * painful are the *math* tokens — fractions, exponents, π, grouping — so this pad supplies only
 * those, appending to the answer string.
 *
 * Every token here is one the server grader (`mathEngine/answerEquivalence.js`) actually
 * understands: `/` (rationals), `^` (→ `**`), `π` (→ `pi`), and `(` `)` (algebra grouping).
 * `√`/`sqrt` is deliberately **omitted** — the grader doesn't parse it, so offering it would
 * produce answers that grade wrong. Backspace removes the last character.
 */
private data class MathKey(val label: String, val token: String, val description: String)

private val MATH_KEYS = listOf(
    MathKey("a/b", "/", "fraction bar"),
    MathKey("x²", "^", "exponent"),
    MathKey("π", "π", "pi"),
    MathKey("(", "(", "open parenthesis"),
    MathKey(")", ")", "close parenthesis"),
)

@Composable
fun MathKeyboard(
    value: String,
    onValueChange: (String) -> Unit,
    enabled: Boolean = true,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
    ) {
        MATH_KEYS.forEach { key ->
            MathKeyButton(
                label = key.label,
                description = key.description,
                enabled = enabled,
                weight = 1f,
                onClick = { onValueChange(value + key.token) },
            )
        }
        MathKeyButton(
            label = "⌫",
            description = "delete last character",
            enabled = enabled && value.isNotEmpty(),
            weight = 1f,
            onClick = { onValueChange(value.dropLast(1)) },
        )
    }
}

@Composable
private fun RowScope.MathKeyButton(
    label: String,
    description: String,
    enabled: Boolean,
    weight: Float,
    onClick: () -> Unit,
) {
    val alpha = if (enabled) 1f else 0.4f
    Box(
        modifier = Modifier
            .weight(weight)
            .height(44.dp)
            .clip(RoundedCornerShape(CornerRadius.m))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha))
            .border(
                1.dp,
                MaterialTheme.colorScheme.outline.copy(alpha = 0.5f * alpha),
                RoundedCornerShape(CornerRadius.m),
            )
            .pressable(enabled = enabled, feedback = PressFeedback.Silent, pressScale = MotionTokens.pressScaleSmall, onClick = onClick)
            .padding(horizontal = Spacing.xs)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = alpha),
        )
    }
}
