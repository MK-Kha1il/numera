package com.example.numera.ui.feature.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import com.example.numera.ui.components.pressable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.ProblemReportRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Reason keys mirror the server's REPORT_REASONS set (routes/math.js).
private val REPORT_REASONS = listOf(
    "wrong_answer" to "Wrong answer",
    "typo" to "Typo / unclear wording",
    "renders_wrong" to "Doesn't display right",
    "confusing" to "Confusing",
    "too_hard" to "Too hard for the level",
    "too_easy" to "Too easy for the level",
    "other" to "Something else",
)

/**
 * Lets a learner flag the current generated [problem] as wrong/confusing/etc. — the content-quality
 * feedback loop (ultra review #17/#90). Self-contained: posts to /api/math/report and reports its own
 * success via [onSubmitted]; the catalog had no human-review signal before this.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReportProblemDialog(
    problem: MathProblem,
    category: String,
    level: Int,
    gameMode: String,
    onDismiss: () -> Unit,
    onSubmitted: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var reason by remember { mutableStateOf<String?>(null) }
    var note by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "⚐ Report a problem",
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                color = MaterialTheme.colorScheme.primary
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                Text(
                    text = "Spotted something off with this exercise? Tell us what — it helps us fix the content.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    REPORT_REASONS.forEach { (key, label) ->
                        val selected = reason == key
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                            color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                            modifier = Modifier
                                .padding(vertical = 4.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .background(if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                .border(
                                    1.dp,
                                    if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline.copy(alpha = 0.4f),
                                    RoundedCornerShape(20.dp)
                                )
                                .pressable { reason = key }
                                .padding(horizontal = 12.dp, vertical = 8.dp)
                        )
                    }
                }
                OutlinedTextField(
                    value = note,
                    onValueChange = { if (it.length <= 300) note = it },
                    label = { Text("Add detail (optional)") },
                    singleLine = false,
                    maxLines = 3,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                if (error != null) {
                    Text(error!!, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            if (submitting) {
                CircularProgressIndicator(modifier = Modifier.padding(end = 12.dp))
            } else {
                DuoButton(
                    text = "Send report",
                    onClick = {
                        val r = reason
                        if (r == null) { error = "Pick what's wrong first."; return@DuoButton }
                        submitting = true
                        error = null
                        scope.launch(Dispatchers.IO) {
                            val ok = runCatching {
                                RetrofitClient.apiService.reportProblem(
                                    RetrofitClient.authToken ?: "",
                                    ProblemReportRequest(
                                        question = problem.question,
                                        correctAnswer = problem.correctAnswer,
                                        category = category.ifBlank { null },
                                        level = level,
                                        gameMode = gameMode,
                                        reason = r,
                                        note = note.trim().ifBlank { null },
                                    )
                                )
                            }.getOrNull()?.success == true
                            withContext(Dispatchers.Main) {
                                submitting = false
                                if (ok) onSubmitted() else error = "Couldn't send. Try again."
                            }
                        }
                    },
                    color = MaterialTheme.colorScheme.primary
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
        }
    )
}
