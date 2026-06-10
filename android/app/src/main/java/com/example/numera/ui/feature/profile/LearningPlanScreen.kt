package com.example.numera.ui.feature.profile

import android.util.Log
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

// Learning plan (audit #19 — goal actuation). Turns the learner's goal into an ordered,
// prerequisite-correct path with one clear "next step", derived server-side from the same mastery
// the engine computes (routes/engine.js GET /api/engine/learning-plan). Tapping a reachable step
// launches practice for that concept; locked steps wait on their prerequisites.
@Composable
fun LearningPlanScreen(onBack: () -> Unit, onPractice: (String, Int) -> Unit) {
    val scope = rememberCoroutineScope()
    val token = RetrofitClient.authToken ?: ""

    var plan by remember { mutableStateOf<LearningPlanResponse?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        scope.launch {
            try {
                plan = withContext(Dispatchers.IO) { RetrofitClient.apiService.getLearningPlan(token) }
            } catch (e: Exception) {
                Log.e("LearningPlan", "load: ${e.message}")
            } finally {
                loading = false
            }
        }
    }

    Column(
        modifier = Modifier.fillMaxSize().padding(Spacing.l).verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Text("🧭 Your Learning Plan", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
            TextButton(onClick = onBack) { Text("Close") }
        }

        val p = plan
        when {
            loading -> com.example.numera.ui.components.NumeraPremiumLoader(modifier = Modifier.fillMaxWidth())
            p == null -> Text("Couldn't load your plan.", color = WrongRed, fontSize = 13.sp)
            else -> {
                // Progress summary
                DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                        Text(
                            if (p.goalDriven) "Path to Level ${p.targetLevel}" else "Your next ${p.total} concepts",
                            fontWeight = FontWeight.Bold, fontSize = 16.sp
                        )
                        Text(
                            "${p.done} of ${p.total} concepts learned · ${p.percent}%",
                            fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                        )
                        LinearProgressIndicator(
                            progress = { (p.percent / 100f).coerceIn(0f, 1f) },
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (!p.goalDriven) {
                            Text(
                                "Tip: set a \"Reach a level\" goal to aim your plan at a target.",
                                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                            )
                        }
                    }
                }

                // The next step, highlighted and actionable.
                p.nextStep?.let { next ->
                    DuoCard(modifier = Modifier.fillMaxWidth(), borderColor = MaterialTheme.colorScheme.primary) {
                        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            Text("▶ NEXT UP", fontWeight = FontWeight.ExtraBold, fontSize = 12.sp, color = MaterialTheme.colorScheme.primary)
                            Text(next.name, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                            Text("${next.category} · Level ${next.level}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            DuoButton(text = "Practice this", onClick = { onPractice(next.category, next.level) }, modifier = Modifier.fillMaxWidth())
                        }
                    }
                } ?: DuoCard(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                        Text("🎉 You've learned everything on this path! Raise your goal to extend it.", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Text("The full path", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.secondary)
                p.steps.forEach { step ->
                    val reachable = step.status != "locked"
                    val icon = when (step.status) {
                        "done" -> "✓"
                        "in_progress" -> "◐"
                        "available" -> "○"
                        else -> "🔒"
                    }
                    val tint = when (step.status) {
                        "done" -> CorrectGreen
                        "in_progress", "available" -> MaterialTheme.colorScheme.primary
                        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    }
                    DuoCard(
                        modifier = Modifier.fillMaxWidth().then(
                            if (reachable) Modifier.clickable { onPractice(step.category, step.level) } else Modifier
                        )
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(Spacing.l),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Spacing.m)
                        ) {
                            Text(icon, fontSize = 18.sp, color = tint)
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    step.name,
                                    fontWeight = if (step.isNext) FontWeight.ExtraBold else FontWeight.Medium,
                                    fontSize = 15.sp,
                                    color = if (reachable) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                )
                                Text("${step.category} · Level ${step.level}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f))
                            }
                            if (step.status == "done") {
                                Text("${(step.overall * 100).toInt()}%", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CorrectGreen)
                            }
                        }
                    }
                }
            }
        }
    }
}
