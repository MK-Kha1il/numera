package com.example.numera.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.theme.MotionTokens
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

// Math symbols the stock keyboard makes painful, in usefulness order. ONLY symbols the
// server's equivalence grader actually parses (answerEquivalence: fractions, decimals,
// signs, exponents via ^, parentheses, π, %, x) — never offer a key that grades wrong.
private val MATH_KEYS = listOf("/", ".", "-", "^", "(", ")", "π", "%", "x")

// Free-typed answer entry for competitive modes. The server grades the typed value by mathematical
// EQUIVALENCE (mathEngine/answerEquivalence.areEquivalent), so "0.5" is accepted for "1/2", "12 + 4x"
// for "4x + 12", etc. — which means no multiple-choice options and therefore no 25% guess floor.
// Reused across Puzzle Rush / tournaments / challenges / duels; the host owns the text state and the
// submit action (collect-into-a-list, send-now, etc.).
@Composable
fun AnswerInput(
    value: String,
    onValueChange: (String) -> Unit,
    onSubmit: () -> Unit,
    enabled: Boolean,
    submitLabel: String = "Submit",
    modifier: Modifier = Modifier
) {
    val canSubmit = enabled && value.isNotBlank()
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            enabled = enabled,
            singleLine = true,
            label = { Text("Type your answer") },
            placeholder = { Text("e.g. 3/4, 0.5, -7, 8x") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { if (canSubmit) onSubmit() }),
            modifier = Modifier.fillMaxWidth()
        )
        // Math key strip: one tap for the symbols buried in stock-keyboard sub-layers.
        // Hosts own plain-String state (no cursor), so keys append — typed answers are
        // short single tokens, which makes append the right behaviour ~always.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(Spacing.s)
        ) {
            MATH_KEYS.forEach { key ->
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(CornerRadius.m))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .border(
                            1.dp,
                            MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                            RoundedCornerShape(CornerRadius.m)
                        )
                        .pressable(enabled = enabled, feedback = PressFeedback.Silent, pressScale = MotionTokens.pressScaleSmall) { onValueChange(value + key) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = key,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (enabled) MaterialTheme.colorScheme.onSurface
                                else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
            }
        }
        DuoButton(
            text = submitLabel,
            onClick = onSubmit,
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
