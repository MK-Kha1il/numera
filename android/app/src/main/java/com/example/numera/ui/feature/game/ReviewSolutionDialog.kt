package com.example.numera.ui.feature.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MathProblem
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.MathText

/**
 * "Solution breakdown" dialog shown when the learner taps Review Solution after a wrong answer.
 * Read-only over the current [problem]; the two actions are hoisted to the parent so the state
 * resets (clear answer / restart timer) and the dismiss stay owned by SoloGameScreen. Body moved
 * verbatim from the old inline `if (showReviewDialog)` block, with `currentProblem` -> [problem]
 * and the onClick bodies replaced by [onRetry] / [onDismiss]. Guarded by GameplayScreenTest
 * (wrong answer -> Review Solution -> dialog renders).
 */
@Composable
fun ReviewSolutionDialog(
    problem: MathProblem,
    onRetry: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "💡 SOLUTION BREAKDOWN",
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.primary
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(Spacing.m),
                modifier = Modifier.verticalScroll(rememberScrollState())
            ) {
                Text("Let's analyze the correct logic:", fontWeight = FontWeight.Bold)

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.05f))
                        .border(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                        .padding(Spacing.m)
                ) {
                    Column {
                        Text("Question:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        if (problem.question.contains("$") || problem.question.contains("\\")) {
                            MathText(text = problem.question, fontSizePx = 30, color = MaterialTheme.colorScheme.onSurface)
                        } else {
                            Text(text = problem.question, fontWeight = FontWeight.Bold)
                        }

                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Correct Answer:", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text(text = problem.correctAnswer, fontWeight = FontWeight.ExtraBold, color = CorrectGreen)
                    }
                }

                if (!problem.explanation.isNullOrEmpty()) {
                    Text("Explanation:", fontWeight = FontWeight.Bold)
                    if (problem.explanation.contains("$") || problem.explanation.contains("\\")) {
                        MathText(text = problem.explanation, fontSizePx = 28, color = MaterialTheme.colorScheme.onSurface)
                    } else {
                        Text(text = problem.explanation, fontSize = 14.sp)
                    }
                } else {
                    Text("Work step-by-step to isolate the variables and evaluate the expression.", fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(Spacing.s))
                Text("💡 Tip: Retry the question to lock in the logic!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
        },
        confirmButton = {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                DuoButton(
                    text = "Retry Exercise",
                    onClick = onRetry,
                    modifier = Modifier.weight(1f),
                    color = CorrectGreen
                )
                DuoButton(
                    text = "Close",
                    onClick = onDismiss,
                    modifier = Modifier.weight(0.8f),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    )
}
