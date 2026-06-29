package com.example.numera.ui.feature.game

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.*
import com.example.numera.ui.components.pressable
import com.example.numera.ui.components.PressFeedback

// Slide-up scientific calculator overlay, hoisted out of SoloGameScreen. State lives in the
// parent (so input/memory/history persist across open/close) and is passed in as MutableState;
// re-delegated with `by` here so the original body is unchanged.
@Composable
fun BoxScope.CalculatorOverlay(
    visible: Boolean,
    onClose: () -> Unit,
    inputState: MutableState<String>,
    resultState: MutableState<String>,
    memoryState: MutableState<Double>,
    historyState: MutableState<List<String>>,
    errorState: MutableState<Boolean>,
    logTelemetry: (String?) -> Unit,
) {
    var calculatorInput by inputState
    var calculatorResult by resultState
    var calculatorMemory by memoryState
    var calculatorHistory by historyState
    var calcIsError by errorState

        AnimatedVisibility(
            visible = visible,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter)
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.72f)
                    .clickable(enabled = false) {}
                    .clip(RoundedCornerShape(topStart = Spacing.xl, topEnd = Spacing.xl)),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Spacing.l)
            ) {
                val onSurface = MaterialTheme.colorScheme.onSurface
                val primary = MaterialTheme.colorScheme.primary

                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = Spacing.m)
                        .padding(bottom = Spacing.m),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    // Handle bar
                    Box(
                        modifier = Modifier
                            .padding(top = Spacing.s, bottom = 2.dp)
                            .width(40.dp)
                            .height(Spacing.xs)
                            .clip(RoundedCornerShape(2.dp))
                            .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
                            .align(Alignment.CenterHorizontally)
                    )

                    // Header row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "CALCULATOR",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                                color = primary
                            )
                            if (calculatorMemory != 0.0) {
                                Text(
                                    text = "M = ${if (calculatorMemory % 1.0 == 0.0) calculatorMemory.toInt().toString() else String.format("%.4f", calculatorMemory)}",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                        IconButton(
                            onClick = onClose,
                            modifier = Modifier.size(IconSize.l)
                        ) {
                            Icon(Icons.Default.Clear, contentDescription = "Close", modifier = Modifier.size(18.dp))
                        }
                    }

                    // History strip (last 2 entries)
                    if (calculatorHistory.isNotEmpty()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                                .padding(horizontal = 10.dp, vertical = Spacing.xs),
                            verticalArrangement = Arrangement.spacedBy(2.dp)
                        ) {
                            calculatorHistory.takeLast(2).forEach { entry ->
                                Text(
                                    text = entry,
                                    fontSize = 11.sp,
                                    color = onSurface.copy(alpha = 0.45f),
                                    maxLines = 1,
                                    modifier = Modifier.fillMaxWidth(),
                                    textAlign = TextAlign.End
                                )
                            }
                        }
                    }

                    // Display
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(64.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                            .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 14.dp, vertical = 6.dp),
                        contentAlignment = Alignment.CenterEnd
                    ) {
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = calculatorInput.ifEmpty { "0" },
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (calcIsError) WrongRed else onSurface,
                                maxLines = 1
                            )
                            if (calculatorResult.isNotEmpty() && !calcIsError) {
                                Text(
                                    text = "= $calculatorResult",
                                    fontSize = 14.sp,
                                    color = primary,
                                    maxLines = 1
                                )
                            }
                        }
                    }

                    // Keys
                    val keyRows = listOf(
                        listOf("MC", "MR", "M+", "M-"),
                        listOf("sin(", "cos(", "tan(", "^"),
                        listOf("ln(", "log(", "√(", "%"),
                        listOf("7", "8", "9", "÷"),
                        listOf("4", "5", "6", "×"),
                        listOf("1", "2", "3", "-"),
                        listOf("0", ".", "(", "+"),
                        listOf("π", "e", ")", "!"),
                        listOf("C", "⌫", "=", "=")
                    )

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(Spacing.xs)
                    ) {
                        keyRows.forEach { row ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
                            ) {
                                var skipNext = false
                                row.forEachIndexed { colIdx, key ->
                                    if (skipNext) { skipNext = false; return@forEachIndexed }
                                    val isWideEquals = key == "=" && colIdx < row.size - 1 && row[colIdx + 1] == "="
                                    val weight = if (isWideEquals) 2f else 1f
                                    if (isWideEquals) skipNext = true

                                    val bgColor = when {
                                        key == "=" -> primary
                                        key == "C" -> WrongRed.copy(alpha = 0.12f)
                                        key == "⌫" -> MaterialTheme.colorScheme.outline.copy(alpha = 0.12f)
                                        key in listOf("MC", "MR", "M+", "M-") -> MaterialTheme.colorScheme.tertiary.copy(alpha = 0.12f)
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(", "√(") -> MaterialTheme.colorScheme.secondary.copy(alpha = 0.10f)
                                        key in listOf("÷", "×", "-", "+", "^", "%", "!") -> primary.copy(alpha = 0.10f)
                                        else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                                    }
                                    val textColor = when {
                                        key == "=" -> MaterialTheme.colorScheme.onPrimary
                                        key == "C" -> WrongRed
                                        key in listOf("MC", "MR", "M+", "M-") -> MaterialTheme.colorScheme.tertiary
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(", "√(") -> MaterialTheme.colorScheme.secondary
                                        key in listOf("÷", "×", "-", "+", "^", "%", "!") -> primary
                                        else -> onSurface.copy(alpha = 0.85f)
                                    }
                                    val displayKey = when (key) {
                                        "sin(" -> "sin"
                                        "cos(" -> "cos"
                                        "tan(" -> "tan"
                                        "ln(" -> "ln"
                                        "log(" -> "log"
                                        "√(" -> "√"
                                        "÷" -> "÷"
                                        "×" -> "×"
                                        else -> key
                                    }
                                    val fontSize = when {
                                        key in listOf("sin(", "cos(", "tan(", "ln(", "log(") -> 13.sp
                                        else -> 16.sp
                                    }

                                    Box(
                                        modifier = Modifier
                                            .weight(weight)
                                            .height(38.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(bgColor)
                                            .pressable(feedback = PressFeedback.Silent, pressScale = MotionTokens.pressScaleSmall) {
                                                com.example.numera.haptic.HapticManager.playSoft()
                                                calcIsError = false
                                                when (key) {
                                                    "C" -> {
                                                        calculatorInput = ""
                                                        calculatorResult = ""
                                                    }
                                                    "⌫" -> {
                                                        calculatorInput = if (calculatorInput.isNotEmpty()) {
                                                            val drop = when {
                                                                calculatorInput.endsWith("sin(") -> 4
                                                                calculatorInput.endsWith("cos(") -> 4
                                                                calculatorInput.endsWith("tan(") -> 4
                                                                calculatorInput.endsWith("ln(")  -> 3
                                                                calculatorInput.endsWith("log(") -> 4
                                                                calculatorInput.endsWith("√(")  -> 2
                                                                else -> 1
                                                            }
                                                            calculatorInput.dropLast(drop)
                                                        } else ""
                                                        calculatorResult = ""
                                                    }
                                                    "MC" -> { calculatorMemory = 0.0 }
                                                    "MR" -> { calculatorInput += if (calculatorMemory % 1.0 == 0.0) calculatorMemory.toInt().toString() else String.format("%.6g", calculatorMemory) }
                                                    "M+" -> {
                                                        try {
                                                            if (calculatorResult.isNotEmpty()) calculatorMemory += calculatorResult.toDouble()
                                                            else if (calculatorInput.isNotEmpty()) calculatorMemory += evaluateExpression(calculatorInput)
                                                        } catch (_: Exception) {}
                                                    }
                                                    "M-" -> {
                                                        try {
                                                            if (calculatorResult.isNotEmpty()) calculatorMemory -= calculatorResult.toDouble()
                                                            else if (calculatorInput.isNotEmpty()) calculatorMemory -= evaluateExpression(calculatorInput)
                                                        } catch (_: Exception) {}
                                                    }
                                                    "=" -> {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            try {
                                                                val res = evaluateExpression(calculatorInput)
                                                                val formatted = if (res % 1.0 == 0.0) res.toLong().toString() else String.format("%.6g", res)
                                                                val historyEntry = "${calculatorInput} = $formatted"
                                                                calculatorHistory = (calculatorHistory + historyEntry).takeLast(10)
                                                                calculatorResult = formatted
                                                                calculatorInput = formatted
                                                                if (Math.abs(res - 67.0) < 1e-9) logTelemetry("67")
                                                                else logTelemetry(historyEntry)
                                                            } catch (_: Exception) {
                                                                calcIsError = true
                                                                calculatorResult = ""
                                                                calculatorInput = "Error"
                                                            }
                                                        }
                                                    }
                                                    "÷" -> calculatorInput += "/"
                                                    "×" -> calculatorInput += "*"
                                                    else -> calculatorInput += key
                                                }
                                                // Live preview (not on = or memory ops)
                                                if (key !in listOf("=", "C", "MC", "MR", "M+", "M-", "⌫")) {
                                                    try {
                                                        if (calculatorInput.isNotEmpty()) {
                                                            val r = evaluateExpression(calculatorInput)
                                                            calculatorResult = if (r % 1.0 == 0.0) r.toLong().toString() else String.format("%.6g", r)
                                                        }
                                                    } catch (_: Exception) { calculatorResult = "" }
                                                }
                                            },
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = displayKey,
                                            fontSize = fontSize,
                                            fontWeight = if (key == "=") FontWeight.ExtraBold else FontWeight.Bold,
                                            color = textColor
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
}
