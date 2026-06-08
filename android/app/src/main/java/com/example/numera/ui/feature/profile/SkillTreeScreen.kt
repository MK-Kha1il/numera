package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MasteryDimensions
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SkillTreeNode
import com.example.numera.data.network.SkillTreeResponse
import com.example.numera.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

// Skill Tree — the hero mastery view (audit #6). Surfaces the per-concept, multi-dimensional
// mastery the engine already computes (accuracy/fluency/retention/independence/transfer) across
// the whole curriculum, so it's visible instead of buried in one profile card. Tapping a concept
// launches practice for it, turning the view into a learning driver (not just a read-only report).
//
// Gating: every node the server returns is already filtered to the playable curriculum
// (CONCEPT_TO_LEVEL), so all concepts are practiceable — no prereq/level gate is applied here.
// This is the simpler correct option: the server is authoritative and generates level-appropriate
// problems for any (category, level) we hand it.
@Composable
fun SkillTreeScreen(onBack: () -> Unit, onPractice: (SkillTreeNode) -> Unit) {
    var data by remember { mutableStateOf<SkillTreeResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val token = RetrofitClient.authToken ?: ""
            data = withContext(Dispatchers.IO) { RetrofitClient.apiService.getSkillTree(token) }
        } catch (e: Exception) {
            error = e.message ?: "Failed to load your skill tree"
        } finally {
            loading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("🧭 Skill Mastery", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onBackground)
            TextButton(onClick = onBack) { Text("Close") }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            error != null -> Box(Modifier.fillMaxSize().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            else -> {
                val tree = data
                Column(
                    modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = Spacing.l).padding(bottom = Spacing.xxl),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    // Aggregate summary
                    tree?.masteryProfile?.let { agg ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(CornerRadius.l),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        ) {
                            Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    Text("Overall Mastery", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                    StageChip(agg.stage)
                                }
                                OverallBar(agg.overall, stageColor(agg.stage))
                                Text("${agg.conceptCount} concepts practiced", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                Spacer(Modifier.height(Spacing.xs))
                                DimensionGrid(agg.dimensions, tree.dimensions.associate { it.key to it.label })
                            }
                        }
                    }

                    // Concepts grouped by category, in curriculum (level) order.
                    val grouped = (tree?.nodes ?: emptyList()).groupBy { it.category }
                    grouped.forEach { (category, nodes) ->
                        Text(
                            categoryLabel(category),
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.secondary,
                            modifier = Modifier.padding(top = Spacing.s)
                        )
                        nodes.forEach { node -> ConceptCard(node, tree?.dimensions?.associate { it.key to it.label } ?: emptyMap(), onPractice) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConceptCard(node: SkillTreeNode, dimLabels: Map<String, String>, onPractice: (SkillTreeNode) -> Unit) {
    Card(
        onClick = { onPractice(node) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.m),
        colors = CardDefaults.cardColors(
            containerColor = if (node.started) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
        )
    ) {
        Column(modifier = Modifier.padding(Spacing.m), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(node.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (node.started) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                StageChip(node.stage)
            }
            if (node.started) {
                OverallBar(node.overall, stageColor(node.stage))
                node.dimensions?.let { DimensionGrid(it, dimLabels) }
            } else {
                Text("Not started yet", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
            // Practice affordance — tapping anywhere on the card launches practice for this concept.
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                Text(
                    if (node.started) "Practice ▸" else "Start ▸",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }
    }
}

@Composable
private fun DimensionGrid(d: MasteryDimensions, labels: Map<String, String>) {
    val rows = listOf(
        "accuracy" to d.accuracy,
        "fluency" to d.fluency,
        "retention" to d.retention,
        "independence" to d.independence,
        "transfer" to d.transfer
    )
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        rows.forEach { (key, value) ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(labels[key] ?: key.replaceFirstChar { it.uppercase() }, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), modifier = Modifier.width(86.dp))
                MiniBar(value, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun OverallBar(value: Float, color: Color) {
    Box(modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))) {
        Box(modifier = Modifier.fillMaxWidth(value.coerceIn(0f, 1f)).fillMaxHeight().clip(RoundedCornerShape(CornerRadius.s)).background(color))
    }
}

@Composable
private fun MiniBar(value: Float, modifier: Modifier = Modifier) {
    Box(modifier = modifier.height(7.dp).clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))) {
        Box(modifier = Modifier.fillMaxWidth(value.coerceIn(0f, 1f)).fillMaxHeight().clip(RoundedCornerShape(CornerRadius.s)).background(MaterialTheme.colorScheme.primary))
    }
}

@Composable
private fun StageChip(stage: String) {
    val c = stageColor(stage)
    Box(modifier = Modifier.clip(RoundedCornerShape(CornerRadius.s)).background(c.copy(alpha = 0.18f)).padding(horizontal = Spacing.s, vertical = 2.dp)) {
        Text(stage, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = c)
    }
}

private fun stageColor(stage: String): Color = when (stage) {
    "Mastered" -> CorrectGreen
    "Proficient" -> CorrectGreen.copy(alpha = 0.75f)
    "Developing" -> MilestoneGold
    "Novice" -> WrongRed.copy(alpha = 0.8f)
    else -> Color.Gray
}

private fun categoryLabel(category: String): String = when (category) {
    "arithmetic" -> "Arithmetic"
    "algebra" -> "Algebra"
    "combinatorics" -> "Combinatorics"
    "calculus" -> "Calculus"
    "number_theory" -> "Number Theory"
    else -> category.replaceFirstChar { it.uppercase() }
}
