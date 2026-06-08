package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.GoalResponse
import com.example.numera.data.network.GoalTypeMeta
import com.example.numera.data.network.LearningGoal
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SetGoalPayload
import com.example.numera.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// "My Goal" — an explicit, learner-CHOSEN target (audit #2/#19). The engine measured everything but
// let the learner aim at nothing; this closes the loop with a Duolingo-style goal + live progress.
// Loads/saves /api/account/goal. Progress is computed server-side from existing stats.
@Composable
fun GoalScreen(onBack: () -> Unit) {
    var resp by remember { mutableStateOf<GoalResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf(false) }
    var selectedType by remember { mutableStateOf<String?>(null) }
    var target by remember { mutableStateOf(0) }
    var saving by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun load() {
        scope.launch {
            loading = true
            error = null
            try {
                val token = RetrofitClient.authToken ?: ""
                val r = withContext(Dispatchers.IO) { RetrofitClient.apiService.getGoal(token) }
                resp = r
                editing = r.goal == null // no goal yet → drop straight into setup
            } catch (e: Exception) {
                error = e.message ?: "Failed to load your goal"
            } finally {
                loading = false
            }
        }
    }
    LaunchedEffect(Unit) { load() }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("🎯 My Goal", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            TextButton(onClick = onBack) { Text("Close") }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Box(Modifier.fillMaxSize().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            else -> {
                val r = resp
                val types = r?.types ?: emptyList()
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = Spacing.l).padding(bottom = Spacing.xxl),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    if (!editing && r?.goal != null) {
                        GoalProgressCard(r.goal, types)
                        Button(
                            onClick = {
                                selectedType = r.goal.goalType
                                target = r.goal.targetValue
                                editing = true
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Change goal", fontWeight = FontWeight.Bold) }
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        withContext(Dispatchers.IO) { RetrofitClient.apiService.deleteGoal(token) }
                                        load()
                                    } catch (_: Exception) { }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Remove goal") }
                    } else {
                        Text("Pick something to aim for. We'll track your progress.", fontSize = 13.sp, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f))
                        types.forEach { t ->
                            val isSel = selectedType == t.key
                            if (isSel && target == 0) target = defaultTarget(t)
                            Card(
                                modifier = Modifier.fillMaxWidth()
                                    .selectable(selected = isSel, onClick = { selectedType = t.key; target = defaultTarget(t) })
                                    .then(if (isSel) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(CornerRadius.m)) else Modifier),
                                shape = RoundedCornerShape(CornerRadius.m),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                            ) {
                                Column(modifier = Modifier.padding(Spacing.m), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                                    Text(t.label, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isSel) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                    if (isSel) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                                            FilledTonalButton(onClick = { target = (target - 1).coerceAtLeast(t.min) }, enabled = target > t.min) { Text("−", fontSize = 18.sp) }
                                            Text("$target ${t.unit}", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                                            FilledTonalButton(onClick = { target = (target + 1).coerceAtMost(t.max) }, enabled = target < t.max) { Text("+", fontSize = 18.sp) }
                                        }
                                    }
                                }
                            }
                        }
                        Button(
                            onClick = {
                                val type = selectedType ?: return@Button
                                saving = true
                                scope.launch {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        withContext(Dispatchers.IO) { RetrofitClient.apiService.setGoal(token, SetGoalPayload(type, target)) }
                                        editing = false
                                        selectedType = null
                                        target = 0
                                        load()
                                    } catch (_: Exception) {
                                    } finally {
                                        saving = false
                                    }
                                }
                            },
                            enabled = selectedType != null && !saving,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text(if (saving) "Saving…" else "Set goal", fontWeight = FontWeight.Bold) }
                        if (r?.goal != null) {
                            TextButton(onClick = { editing = false; selectedType = null; target = 0 }, modifier = Modifier.fillMaxWidth()) { Text("Cancel") }
                        }
                    }
                }
            }
        }
    }
}

private fun defaultTarget(t: GoalTypeMeta): Int = when (t.key) {
    "daily_problems" -> 10
    "reach_level" -> 10
    "streak" -> 7
    else -> t.min
}.coerceIn(t.min, t.max)

@Composable
private fun GoalProgressCard(goal: LearningGoal, types: List<GoalTypeMeta>) {
    val meta = types.firstOrNull { it.key == goal.goalType }
    val pct = if (goal.targetValue > 0) (goal.current.toFloat() / goal.targetValue).coerceIn(0f, 1f) else 0f
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(meta?.label ?: goal.goalType, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                if (goal.completed) {
                    Box(modifier = Modifier.clip(RoundedCornerShape(CornerRadius.s)).background(CorrectGreen.copy(alpha = 0.18f)).padding(horizontal = Spacing.s, vertical = 2.dp)) {
                        Text("✓ Reached", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = CorrectGreen)
                    }
                }
            }
            Text("${goal.current} / ${goal.targetValue} ${meta?.unit ?: ""}", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
            Box(modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))) {
                Box(modifier = Modifier.fillMaxWidth(pct).fillMaxHeight().clip(RoundedCornerShape(CornerRadius.s)).background(if (goal.completed) CorrectGreen else MaterialTheme.colorScheme.primary))
            }
        }
    }
}
