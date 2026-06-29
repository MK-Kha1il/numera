package com.example.numera.ui.feature.profile

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.numera.data.network.ReasoningReviewResponse
import com.example.numera.theme.*
import com.example.numera.ui.components.MathText

/**
 * Replay a finished Reasoning round (audit #70 — learn from competition): step through each problem
 * with the answer you gave vs the correct one, and the reason you picked vs the correct reason.
 */
@Composable
fun ReasoningReplayDialog(review: ReasoningReviewResponse, onDismiss: () -> Unit) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(CornerRadius.l),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
        ) {
            Column(
                modifier = Modifier.padding(Spacing.l).heightIn(max = 560.dp).verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(Spacing.m),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("🧠 Round Review · ${review.banked}/${review.total} banked", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    TextButton(onClick = onDismiss) { Text("Close") }
                }

                review.items.forEachIndexed { i, item ->
                    Card(
                        shape = RoundedCornerShape(CornerRadius.m),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Column(modifier = Modifier.padding(Spacing.m), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                            Text(
                                "Problem ${i + 1} ${if (item.banked) "· banked ✓" else ""}",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (item.banked) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            )
                            MathText(text = item.question, fontSizePx = 32)

                            Text(
                                "Your answer: ${item.yourAnswer ?: "—"}  ${if (item.answerCorrect) "✓" else "✗"}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (item.answerCorrect) CorrectGreen else WrongRed,
                            )
                            if (!item.answerCorrect) {
                                Text("Correct answer: ${item.correctAnswer}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                            }

                            Text("Why it's right — you said: ${if (item.reasonCorrect) "✓" else "✗"}", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = if (item.reasonCorrect) CorrectGreen else WrongRed)
                            val correctReason = item.reasonOptions.getOrNull(item.reasonCorrectIndex)
                            if (!item.reasonCorrect && correctReason != null) {
                                MathText(text = "✓ $correctReason", fontSizePx = 26)
                            }
                            if (item.reasonExplanation.isNotBlank()) {
                                MathText(text = item.reasonExplanation, fontSizePx = 26)
                            }
                        }
                    }
                }
            }
        }
    }
}
