package com.example.numera.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import com.example.numera.theme.Spacing

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
        DuoButton(
            text = submitLabel,
            onClick = onSubmit,
            enabled = canSubmit,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
