package com.example.numera.ui.feature.profile

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.motion.MotionManager
import com.example.numera.theme.*
import com.example.numera.ui.components.NumeraLoader
import com.example.numera.ui.components.PressFeedback
import com.example.numera.ui.components.pressable
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Mastery Profile — the Mathematical Mastery Profile page (GET /api/mastery/profile).
 *
 * The long-game identity view: 8 mathematical domains (territory) × 10 thinking competencies
 * (style), growth trends from daily snapshots, personal records, stage milestones, computed
 * titles and playable recommendations. Everything shown is a *demonstrated-understanding rate*
 * computed server-side — nothing here is a grind counter.
 *
 * `onPractice(gameMode, category, level)` deep-links a recommendation into a solo session.
 */
@Composable
fun MasteryMapScreen(
    onBack: () -> Unit,
    onPractice: (gameMode: String, category: String, level: Int) -> Unit,
) {
    var data by remember { mutableStateOf<MasteryMapResponse?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val token = RetrofitClient.authToken ?: ""
            data = withContext(Dispatchers.IO) { RetrofitClient.apiService.getMasteryMap(token) }
        } catch (e: Exception) {
            error = e.message ?: "Failed to load your mastery profile"
        } finally {
            loading = false
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.m, vertical = Spacing.s),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Mastery Profile", style = AppText.screenTitle, color = MaterialTheme.colorScheme.onBackground)
            TextButton(onClick = onBack) { Text("Close") }
        }

        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { NumeraLoader() }
            error != null -> Box(Modifier.fillMaxSize().padding(Spacing.xl), contentAlignment = Alignment.Center) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
            }
            data != null -> MasteryMapContent(data!!, onPractice)
        }
    }
}

@Composable
private fun MasteryMapContent(
    map: MasteryMapResponse,
    onPractice: (String, String, Int) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = Spacing.l)
            .padding(bottom = Spacing.xxl),
        verticalArrangement = Arrangement.spacedBy(Spacing.m),
    ) {
        IdentityHero(map.identity)

        SectionLabel("How you think")
        CompetencyRadar(map.competencies)
        map.competencies.forEach { c -> CompetencyRow(c) }

        SectionLabel("Your territory")
        map.domains.forEach { d -> DomainCard(d, map.growth.movers.find { it.name == d.name }?.delta) }

        if (map.growth.overallDelta7d != null || map.growth.overallDelta30d != null) {
            SectionLabel("Recent growth")
            GrowthCard(map.growth)
        }

        if (map.records.isNotEmpty()) {
            SectionLabel("Personal records")
            RecordsGrid(map.records)
        }

        if (map.milestones.next != null || map.milestones.recent.isNotEmpty()) {
            SectionLabel("Milestones")
            MilestonesCard(map.milestones)
        }

        if (map.titles.isNotEmpty()) {
            SectionLabel("Titles")
            TitlesShelf(map.titles)
        }

        if (map.recommendations.isNotEmpty()) {
            SectionLabel("Sharpen your edge")
            map.recommendations.forEach { rec ->
                RecommendationCard(rec) { onPractice(rec.gameMode, rec.category, rec.level) }
            }
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = AppText.sectionTitle,
        color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
        modifier = Modifier.padding(top = Spacing.s),
    )
}

// ── Identity ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun IdentityHero(identity: MasteryIdentity) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(modifier = Modifier.fillMaxWidth().padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = identity.stage,
                    style = AppText.caption,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = Alpha.secondary),
                )
                Text(
                    text = "${(identity.overall * 100).roundToInt()}%",
                    style = AppText.stat,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            Text(
                text = identity.headline,
                style = AppText.cardTitle,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
            Text(
                text = identity.subline,
                style = AppText.rowSubtitle,
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.85f),
            )
        }
    }
}

// ── Competencies ─────────────────────────────────────────────────────────────────────────

// Short axis labels so the radar stays readable at phone width.
private val RADAR_LABELS = mapOf(
    "mental_math" to "Mental",
    "accuracy" to "Accuracy",
    "speed" to "Speed",
    "logic" to "Logic",
    "visualization" to "Visual",
    "pattern_recognition" to "Patterns",
    "problem_solving" to "Solving",
    "consistency" to "Habit",
    "adaptability" to "Adapt",
    "strategic_thinking" to "Strategy",
)

@Composable
private fun CompetencyRadar(competencies: List<MasteryCompetency>) {
    if (competencies.isEmpty()) return
    val primary = MaterialTheme.colorScheme.primary
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.25f)
    val labelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary)
    val lockedLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
    val textMeasurer = rememberTextMeasurer()
    val labelStyle = AppText.caption

    // One entrance sweep; snaps instantly under reduce-motion.
    var played by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { played = true }
    val sweep by animateFloatAsState(
        targetValue = if (played || MotionManager.reduceMotion) 1f else 0f,
        animationSpec = tween(durationMillis = AnimDuration.xslow, easing = FastOutSlowInEasing),
        label = "radarSweep",
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Canvas(modifier = Modifier.fillMaxWidth().height(260.dp).padding(Spacing.l)) {
            val n = competencies.size
            val center = Offset(size.width / 2f, size.height / 2f)
            val radius = minOf(size.width, size.height) / 2f * 0.72f
            val angleOf = { i: Int -> Math.toRadians(-90.0 + i * (360.0 / n)) }
            val pointAt = { i: Int, r: Float ->
                Offset(
                    center.x + (r * cos(angleOf(i))).toFloat(),
                    center.y + (r * sin(angleOf(i))).toFloat(),
                )
            }

            // Grid rings + spokes.
            for (ring in 1..4) {
                val r = radius * ring / 4f
                val path = Path()
                for (i in 0 until n) {
                    val p = pointAt(i, r)
                    if (i == 0) path.moveTo(p.x, p.y) else path.lineTo(p.x, p.y)
                }
                path.close()
                drawPath(path, gridColor, style = Stroke(width = 1.dp.toPx()))
            }
            for (i in 0 until n) drawLine(gridColor, center, pointAt(i, radius))

            // Value polygon (locked competencies sit at the centre — no fake numbers).
            val valuePath = Path()
            for (i in 0 until n) {
                val v = if (competencies[i].unlocked) competencies[i].value.coerceIn(0f, 1f) else 0f
                val p = pointAt(i, radius * v * sweep)
                if (i == 0) valuePath.moveTo(p.x, p.y) else valuePath.lineTo(p.x, p.y)
            }
            valuePath.close()
            drawPath(valuePath, primary.copy(alpha = 0.22f))
            drawPath(valuePath, primary, style = Stroke(width = 2.dp.toPx()))
            for (i in 0 until n) {
                if (!competencies[i].unlocked) continue
                val v = competencies[i].value.coerceIn(0f, 1f)
                drawCircle(primary, radius = 3.dp.toPx(), center = pointAt(i, radius * v * sweep))
            }

            // Axis labels just beyond the rim.
            for (i in 0 until n) {
                val label = RADAR_LABELS[competencies[i].key] ?: competencies[i].name
                val measured = textMeasurer.measure(label, labelStyle)
                val p = pointAt(i, radius * 1.12f)
                drawText(
                    measured,
                    color = if (competencies[i].unlocked) labelColor else lockedLabelColor,
                    topLeft = Offset(p.x - measured.size.width / 2f, p.y - measured.size.height / 2f),
                )
            }
        }
    }
}

@Composable
private fun CompetencyRow(c: MasteryCompetency) {
    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(c.name, style = AppText.rowTitle, color = MaterialTheme.colorScheme.onBackground)
                Text(c.blurb, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
            }
            if (c.unlocked) {
                Text(
                    "${(c.value * 100).roundToInt()}%",
                    style = AppText.stat,
                    color = MaterialTheme.colorScheme.primary,
                )
            } else {
                Text(
                    "Emerging",
                    style = AppText.caption,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                )
            }
        }
        if (c.unlocked) {
            AnimatedBar(value = c.value, color = MaterialTheme.colorScheme.primary)
        } else {
            Text(
                // Honest gate, framed as an invitation: play reveals the skill.
                "Keep playing to reveal — ${(c.minEvidence - c.evidence).coerceAtLeast(1)} more attempts of evidence needed",
                style = AppText.caption,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f),
            )
        }
    }
}

// ── Domains ──────────────────────────────────────────────────────────────────────────────

// Stage ladder colors reuse existing semantic tokens (info → correct → transfer → gold);
// Exploring/Unexplored fall back to the neutral onSurface tint in StageChip.
private val STAGE_COLORS = mapOf(
    "Developing" to StatusInfo,
    "Proficient" to CorrectGreen,
    "Advanced" to TransferViolet,
    "Mastered" to MedalGold,
)

@Composable
private fun DomainCard(d: MasteryDomain, delta: Float?) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = if (d.comingSoon) 0.4f else 1f)
        ),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(d.name, style = AppText.rowTitle, color = MaterialTheme.colorScheme.onBackground)
                    Text(d.blurb, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                }
                StageChip(d.stage)
            }

            if (d.comingSoon) return@Column

            AnimatedBar(
                value = d.score,
                color = STAGE_COLORS[d.stage] ?: MaterialTheme.colorScheme.primary,
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    if (d.started == 0) "Untouched territory — ${d.total} concepts waiting"
                    else "${d.proficient} of ${d.total} concepts proficient",
                    style = AppText.caption,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                )
                delta?.let {
                    Text(
                        text = (if (it > 0) "▲ +" else "▼ ") + "${(it * 100).roundToInt()} this week",
                        style = AppText.caption,
                        fontWeight = FontWeight.Bold,
                        color = if (it > 0) CorrectGreen else MaterialTheme.colorScheme.error,
                    )
                }
            }
            d.topConcept?.let { tc ->
                Text(
                    "Strongest: ${tc.name} (${(tc.overall * 100).roundToInt()}%)",
                    style = AppText.caption,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                )
            }
        }
    }
}

@Composable
private fun StageChip(stage: String) {
    val color = STAGE_COLORS[stage] ?: MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(color.copy(alpha = 0.15f))
            .padding(horizontal = Spacing.m, vertical = Spacing.xs),
    ) {
        Text(stage, style = AppText.caption, fontWeight = FontWeight.Black, color = color)
    }
}

// ── Growth, records, milestones, titles, recommendations ───────────────────────────────

@Composable
private fun GrowthCard(growth: MasteryGrowth) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
                GrowthDelta("Last 7 days", growth.overallDelta7d, Modifier.weight(1f))
                GrowthDelta("Last 30 days", growth.overallDelta30d, Modifier.weight(1f))
            }
            growth.movers.forEach { m ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(m.name, style = AppText.rowSubtitle, color = MaterialTheme.colorScheme.onBackground)
                    Text(
                        (if (m.delta > 0) "+" else "") + "${(m.delta * 100).roundToInt()}",
                        style = AppText.rowSubtitle,
                        fontWeight = FontWeight.Bold,
                        color = if (m.delta > 0) CorrectGreen else MaterialTheme.colorScheme.error,
                    )
                }
            }
        }
    }
}

@Composable
private fun GrowthDelta(label: String, delta: Float?, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary))
        Text(
            text = when {
                delta == null -> "—"
                delta > 0 -> "+${(delta * 100).roundToInt()}"
                else -> "${(delta * 100).roundToInt()}"
            },
            style = AppText.stat,
            color = when {
                delta == null -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                delta >= 0 -> CorrectGreen
                else -> MaterialTheme.colorScheme.error
            },
        )
    }
}

@Composable
private fun RecordsGrid(records: List<MasteryRecord>) {
    records.chunked(2).forEach { row ->
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.m)) {
            row.forEach { r ->
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(CornerRadius.m),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.fillMaxWidth().padding(Spacing.m), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "${r.value}${if (r.unit == "%") "%" else ""}",
                            style = AppText.stat,
                            color = MaterialTheme.colorScheme.primary,
                        )
                        Text(
                            r.detail ?: r.label,
                            style = AppText.caption,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                        )
                        if (r.detail != null) {
                            Text(r.label, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                        } else if (r.unit != null && r.unit != "%") {
                            Text(r.unit, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                        }
                    }
                }
            }
            if (row.size == 1) Spacer(Modifier.weight(1f))
        }
        Spacer(Modifier.height(Spacing.xs))
    }
}

@Composable
private fun MilestonesCard(milestones: MasteryMilestones) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
            milestones.next?.let { next ->
                Text(
                    "Next up: ${next.domain} → ${next.to}",
                    style = AppText.rowTitle,
                    color = MaterialTheme.colorScheme.onBackground,
                )
                AnimatedBar(value = next.progress, color = MaterialTheme.colorScheme.primary)
                Text(
                    "${(next.progress * 100).roundToInt()}% of the way from ${next.from}",
                    style = AppText.caption,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
                )
            }
            milestones.recent.forEach { m ->
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(m.text, style = AppText.rowSubtitle, color = MaterialTheme.colorScheme.onBackground)
                    Text(m.date, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f))
                }
            }
        }
    }
}

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun TitlesShelf(titles: List<MasteryTitle>) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(Spacing.s),
        verticalArrangement = Arrangement.spacedBy(Spacing.s),
    ) {
        titles.forEach { t ->
            val color = if (t.earned) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.35f)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(color.copy(alpha = if (t.earned) 0.14f else 0.08f))
                    .padding(horizontal = Spacing.m, vertical = Spacing.xs),
            ) {
                Text(
                    text = if (t.earned) t.name else "${t.name} · ${t.desc}",
                    style = AppText.caption,
                    fontWeight = if (t.earned) FontWeight.Black else FontWeight.Medium,
                    color = color,
                )
            }
        }
    }
}

@Composable
private fun RecommendationCard(rec: MasteryRecommendation, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .pressable(feedback = PressFeedback.Medium, onClickLabel = rec.title) { onClick() },
        shape = RoundedCornerShape(CornerRadius.l),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f)),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(Spacing.l),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(rec.title, style = AppText.rowTitle, color = MaterialTheme.colorScheme.onBackground)
                Text(rec.reason, style = AppText.caption, color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary))
                Text(
                    "Trains ${rec.target}",
                    style = AppText.caption,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text("→", fontSize = 20.sp, color = MaterialTheme.colorScheme.primary)
        }
    }
}

// Shared animated progress bar (entrance-animated, reduce-motion aware).
@Composable
private fun AnimatedBar(value: Float, color: Color) {
    var target by remember(value) { mutableStateOf(if (MotionManager.reduceMotion) value else 0f) }
    LaunchedEffect(value) { target = value.coerceIn(0f, 1f) }
    val progress by animateFloatAsState(
        targetValue = target,
        animationSpec = tween(durationMillis = AnimDuration.xslow, easing = FastOutSlowInEasing),
        label = "MasteryBar",
    )
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(10.dp)
            .clip(RoundedCornerShape(CornerRadius.s))
            .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
    ) {
        if (progress > 0f) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(CornerRadius.s))
                    .background(color),
            )
        }
    }
}
