package com.example.numera.ui.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.CasSolveRequest
import com.example.numera.data.network.CasSolveResponse
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// "Show me how" — the user-facing front door to the CAS solving half (POST /api/cas/solve). Type an
// equation, get an exact worked solution: linear is solved exactly in-process server-side, quadratics
// and beyond come from SymPy with a factoring / quadratic-formula derivation. Steps are LaTeX, so they
// render through MathText exactly like an authored lesson. Read-only — it never grants rewards.
@Composable
fun CasSolverDialog(
    onDismissRequest: () -> Unit
) {
    var equation by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<CasSolveResponse?>(null) }
    var errorText by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    fun solve() {
        val eq = equation.trim()
        if (eq.isBlank() || loading) return
        loading = true
        errorText = null
        result = null
        scope.launch(Dispatchers.IO) {
            val resp = try {
                val token = RetrofitClient.authToken ?: ""
                RetrofitClient.apiService.casSolve(token, CasSolveRequest(eq))
            } catch (e: Exception) {
                null
            }
            withContext(Dispatchers.Main) {
                loading = false
                if (resp != null && resp.ok) {
                    result = resp
                } else {
                    errorText = when (resp?.error) {
                        "no_unique_solution" -> resp.detail ?: "That equation has no single solution."
                        "unsolved" -> "Couldn't solve that one. Try a linear or quadratic equation."
                        "invalid_input" -> "Please enter a valid equation."
                        else -> "Couldn't reach the solver. Check your connection and try again."
                    }
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = onDismissRequest,
        properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false),
        modifier = Modifier
            .fillMaxWidth(0.92f)
            .wrapContentHeight()
            .clip(RoundedCornerShape(CornerRadius.xl)),
        confirmButton = {
            TextButton(onClick = onDismissRequest) {
                Text("Close", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
        },
        title = {
            Text(
                text = "Show me how",
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                color = MaterialTheme.colorScheme.onSurface
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 460.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                Text(
                    text = "Enter an equation and see it solved step by step.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                OutlinedTextField(
                    value = equation,
                    onValueChange = { equation = it },
                    enabled = !loading,
                    singleLine = true,
                    label = { Text("Equation") },
                    placeholder = { Text("e.g. 3x + 4 = 13,  x^2 - 5x + 6 = 0") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { solve() }),
                    modifier = Modifier.fillMaxWidth()
                )
                DuoButton(
                    text = if (loading) "Solving…" else "Solve",
                    onClick = { solve() },
                    enabled = !loading && equation.isNotBlank(),
                    modifier = Modifier.fillMaxWidth()
                )

                errorText?.let { msg ->
                    Text(text = msg, fontSize = 13.sp, color = WrongRed, fontWeight = FontWeight.Medium)
                }

                result?.let { r ->
                    Spacer(modifier = Modifier.height(Spacing.xs))
                    if (r.solutions.isNotEmpty()) {
                        val label = if (r.solutions.size > 1) "Solutions" else "Solution"
                        Text(
                            text = "$label: ${r.solutions.joinToString(",  ")}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = CorrectGreenPressed
                        )
                    }
                    r.steps.forEachIndexed { idx, step ->
                        StepRow(number = idx + 1, step = step)
                    }
                }
            }
        }
    )
}

@Composable
private fun StepRow(number: Int, step: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .padding(Spacing.m),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        Text(
            text = "$number",
            fontWeight = FontWeight.Black,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.primary
        )
        if (step.contains("$") || step.contains("\\")) {
            MathText(text = step, fontSizePx = 30, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.weight(1f))
        } else {
            Text(
                text = step,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
            )
        }
    }
}
