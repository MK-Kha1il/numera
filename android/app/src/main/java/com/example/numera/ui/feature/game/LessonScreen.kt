package com.example.numera.ui.feature.game

import android.util.Log
import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.VictoryParticles
import com.example.numera.ui.components.MathText
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.animation.core.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.NumeraPremiumLoader
import com.example.numera.ui.components.NumeraSlideOver
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType

// The concept-first lesson screen shown before the exercises, carved out of SoloGameScreen.
// Pure: it renders the fetched lesson (title/content/formula/examples/sections) and calls
// onStart when the learner taps "Start Exercises" (the parent flips showLesson off + plays a
// click). Lesson state is owned by the parent and passed in.
@Composable
fun LessonScreen(
    level: Int,
    lessonTitle: String?,
    lessonContent: String?,
    lessonFormula: String?,
    examplesList: List<MathExample>,
    lessonSections: LessonSections?,
    onStart: () -> Unit,
) {
        val isMilestone = (level > 0) && (level % 10 == 0)
        
        val primaryColor = if (isMilestone) MilestoneGold else MaterialTheme.colorScheme.primary
        val bgColor = if (isMilestone) MilestoneBg else MaterialTheme.colorScheme.background
        val cardBgColor = if (isMilestone) MilestoneSurface else MaterialTheme.colorScheme.surfaceVariant
        val borderColor = if (isMilestone) MilestoneBorder else MaterialTheme.colorScheme.outline
        val onSurfaceColor = if (isMilestone) MilestoneOnSurface else MaterialTheme.colorScheme.onBackground

        // Staggered reveal (M8): the lesson's opening sections cascade in so the concept unfolds
        // rather than dumping all at once. Honours reduce-motion (everything shows immediately).
        var revealStep by remember { mutableStateOf(0) }
        LaunchedEffect(Unit) { repeat(4) { delay(110); revealStep++ } }
        @Composable
        fun Reveal(step: Int, content: @Composable () -> Unit) {
            AnimatedVisibility(
                visible = com.example.numera.motion.MotionManager.reduceMotion || revealStep > step,
                enter = fadeIn() + slideInVertically { it / 8 },
            ) { content() }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(bgColor)
                .padding(Spacing.l)
        ) {
            Text(
                text = if (isMilestone) "🌟 MILESTONE THEOREM" else "LESSON",
                color = primaryColor,
                fontWeight = FontWeight.ExtraBold,
                fontSize = 14.sp,
                letterSpacing = 1.sp
            )
            
            Spacer(modifier = Modifier.height(Spacing.s))
            
            Text(
                text = lessonTitle ?: "",
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                color = onSurfaceColor,
                lineHeight = 32.sp
            )
            
            Spacer(modifier = Modifier.height(Spacing.l))
            
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(Spacing.l)
            ) {
                Reveal(0) {
                if (!lessonContent.isNullOrEmpty()) {
                    if (lessonContent!!.contains("$") || lessonContent!!.contains("\\")) {
                        MathText(
                            text = lessonContent!!,
                            fontSizePx = 36,
                            color = onSurfaceColor.copy(alpha = 0.85f),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text(
                            text = lessonContent!!,
                            fontSize = 16.sp,
                            color = onSurfaceColor.copy(alpha = 0.85f),
                            lineHeight = 24.sp
                        )
                    }
                }
                }

                Reveal(1) {
                lessonSections?.let { s ->
                    if (!s.intuitionHook.isNullOrBlank()) {
                        LessonSectionCard("💡 THINK FIRST", s.intuitionHook!!, primaryColor, onSurfaceColor, borderColor, cardBgColor)
                    }
                    if (!s.whatItIs.isNullOrBlank()) {
                        LessonSectionCard("WHAT IT IS", s.whatItIs!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    if (!s.whyItWorks.isNullOrBlank()) {
                        LessonSectionCard("WHY IT WORKS", s.whyItWorks!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    if (!s.whenToUse.isNullOrBlank()) {
                        LessonSectionCard("WHEN TO USE IT", s.whenToUse!!, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                    }
                    val reps = s.representations ?: emptyList()
                    if (reps.isNotEmpty()) {
                        Text(
                            text = "SEE IT DIFFERENTLY",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor,
                            letterSpacing = 0.5.sp
                        )
                        reps.forEach { rep ->
                            LessonSectionCard(rep.label, rep.body, primaryColor, onSurfaceColor, borderColor, MaterialTheme.colorScheme.surface)
                        }
                    }
                }
                }

                Reveal(2) {
                if (!lessonFormula.isNullOrEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(cardBgColor)
                            .border(1.5.dp, borderColor, RoundedCornerShape(16.dp))
                            .padding(Spacing.l),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "CORE FORMULA / CONCEPT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = primaryColor,
                                letterSpacing = 0.5.sp
                            )
                            Spacer(modifier = Modifier.height(Spacing.s))
                            val formulaText = if (!lessonFormula!!.contains("$") && !lessonFormula!!.contains("\\(") && !lessonFormula!!.contains("\\[")) {
                                "$$${lessonFormula!!}$$"
                            } else {
                                lessonFormula!!
                            }
                            MathText(
                                text = formulaText,
                                fontSizePx = 42,
                                color = onSurfaceColor,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
                }
                
                if (examplesList.isNotEmpty()) {
                    Text(
                        text = "WORKED EXAMPLES",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = primaryColor,
                        letterSpacing = 0.5.sp
                    )
                    
                    examplesList.forEachIndexed { index, ex ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.5.dp, borderColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                .padding(Spacing.l),
                            verticalArrangement = Arrangement.spacedBy(Spacing.s)
                        ) {
                            Text(
                                text = "Example ${index + 1}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = primaryColor
                            )
                            
                            if (ex.question.contains("$") || ex.question.contains("\\")) {
                                MathText(text = ex.question, fontSizePx = 32, color = onSurfaceColor)
                            } else {
                                Text(text = ex.question, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = onSurfaceColor)
                            }
                            
                            Text(
                                text = "Answer: ${ex.answer}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = CorrectGreen
                            )
                            
                            if (ex.explanation.isNotEmpty()) {
                                Divider(color = borderColor.copy(alpha = 0.3f))
                                if (ex.explanation.contains("$") || ex.explanation.contains("\\")) {
                                    MathText(text = ex.explanation, fontSizePx = 28, color = onSurfaceColor.copy(alpha = 0.7f))
                                } else {
                                    Text(text = ex.explanation, fontSize = 13.sp, color = onSurfaceColor.copy(alpha = 0.7f))
                                }
                            }
                        }
                    }
                }

                lessonSections?.let { s ->
                    val mistakes = s.commonMistakes ?: emptyList()
                    if (mistakes.isNotEmpty()) {
                        Text(
                            text = "⚠️ COMMON MISTAKES",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.error,
                            letterSpacing = 0.5.sp
                        )
                        mistakes.forEach { m ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.22f))
                                    .border(1.5.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                                    .padding(Spacing.l),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(text = m.label, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = onSurfaceColor)
                                if (!m.why.isNullOrBlank()) LessonProse(m.why!!, onSurfaceColor.copy(alpha = 0.75f), 26)
                                if (!m.fix.isNullOrBlank()) {
                                    Text(text = "✓ FIX", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CorrectGreen)
                                    LessonProse(m.fix!!, onSurfaceColor.copy(alpha = 0.85f), 26)
                                }
                            }
                        }
                    }
                    val connections = s.connections ?: emptyList()
                    if (connections.isNotEmpty()) {
                        Text(
                            text = "🔗 HOW THIS CONNECTS",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = primaryColor,
                            letterSpacing = 0.5.sp
                        )
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(16.dp))
                                .background(MaterialTheme.colorScheme.surface)
                                .border(1.5.dp, borderColor.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
                                .padding(Spacing.l),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            connections.forEach { c ->
                                LessonProse("• " + c.note, onSurfaceColor.copy(alpha = 0.85f), 26)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.l))

            // Auto-generated-content disclaimer (see docs/ComplianceAudit.md L1).
            Text(
                text = "Lessons and practice problems are generated automatically and may contain errors. " +
                    "They're a study aid, not a substitute for professional instruction.",
                fontSize = 10.sp,
                color = onSurfaceColor.copy(alpha = 0.5f),
                modifier = Modifier.fillMaxWidth().padding(bottom = Spacing.s)
            )

            DuoButton(
                text = "Start Exercises",
                onClick = onStart,
                modifier = Modifier.fillMaxWidth(),
                color = primaryColor
            )
        }
}
