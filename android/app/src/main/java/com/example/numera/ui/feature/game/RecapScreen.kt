package com.example.numera.ui.feature.game

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.EaseOutCubic
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Divider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MathProblem
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.DuoSecondary
import com.example.numera.theme.DuoTertiary
import com.example.numera.theme.MilestoneBg
import com.example.numera.theme.MilestoneBorder
import com.example.numera.theme.MilestoneGold
import com.example.numera.theme.Spacing
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.RankBadge
import kotlinx.coroutines.delay

/**
 * The post-session recap (the old `if (isGameOver)` early-return block of SoloGameScreen). A
 * read-only celebration screen: it animates in stat/level/rank/multiplier cards from values the
 * parent already computed (server rewards land in those vars before isGameOver flips), and the
 * only thing it writes back is the Continue tap. State stays owned by SoloGameScreen; this takes
 * plain values + [onFinishGame]. Body moved verbatim — only parent-owned refs are now parameters.
 * Guarded by RecapScreenTest (finish a session -> recap renders).
 */
@Composable
fun RecapScreen(
    level: Int,
    gameMode: String,
    userLevel: Int,
    userXP: Int,
    userRank: String,
    currentStreakDays: Int,
    xpReward: Int,
    coinReward: Int,
    levelUpOccurred: Boolean,
    problemsList: List<MathProblem>,
    correctFirstTryCount: Int,
    speedBonusGained: Int,
    comboBonusGained: Int,
    streakBonusActive: Boolean,
    criticalBonusActive: Boolean,
    onFinishGame: () -> Unit,
) {
    val isMilestone = (level > 0) && (level % 10 == 0)
    val bgColor = if (isMilestone) MilestoneBg else MaterialTheme.colorScheme.background
    val cardOutlineColor = if (isMilestone) MilestoneBorder else MaterialTheme.colorScheme.outline
    val primaryColor = if (isMilestone) MilestoneGold else MaterialTheme.colorScheme.primary

    var statsCardVisible by remember { mutableStateOf(false) }
    var levelCardVisible by remember { mutableStateOf(false) }
    var badgeCardVisible by remember { mutableStateOf(false) }
    var multipliersVisible by remember { mutableStateOf(false) }
    var animateProgressBar by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        delay(150)
        statsCardVisible = true
        delay(250)
        levelCardVisible = true
        animateProgressBar = true
        delay(250)
        badgeCardVisible = true
        delay(250)
        multipliersVisible = true
    }

    val nextLevelXP = userLevel * 100
    val progressFractionTarget = (userXP.toFloat() / nextLevelXP).coerceIn(0f, 1f)
    val progressFractionAnim by animateFloatAsState(
        targetValue = if (animateProgressBar) progressFractionTarget else 0f,
        animationSpec = tween(durationMillis = 1500, easing = EaseOutCubic),
        label = "progressRecap"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(bgColor)
            .padding(Spacing.l),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth(0.95f)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.l)
        ) {
            Text(
                text = if (isMilestone) "🏆 MILESTONE MASTERED" else "LEVEL RECAP",
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                color = primaryColor
            )

            Text(
                text = if (levelUpOccurred) "🎉 LEVEL UP!" else if (isMilestone) "Theorem Documented!" else "Session Complete!",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = if (isMilestone) MilestoneGold else CorrectGreen
            )

            // Stats Dashboard Grid
            AnimatedVisibility(
                visible = statsCardVisible,
                enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                exit = fadeOut()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(24.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                        .border(1.5.dp, cardOutlineColor, RoundedCornerShape(24.dp))
                        .padding(Spacing.l),
                    verticalArrangement = Arrangement.spacedBy(Spacing.m)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text("XP Earned", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                            Text("+$xpReward XP", fontWeight = FontWeight.Black, fontSize = 20.sp, color = primaryColor)
                        }
                        Column {
                            Text("Coins Earned", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                            Text("+$coinReward 🪙", fontWeight = FontWeight.Black, fontSize = 20.sp, color = MaterialTheme.colorScheme.tertiary)
                        }
                        Column {
                            Text("Accuracy", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                            val acc = if (problemsList.isNotEmpty()) (correctFirstTryCount * 100) / problemsList.size else 100
                            Text("$acc%", fontWeight = FontWeight.Black, fontSize = 20.sp, color = CorrectGreen)
                        }
                    }

                    Divider(color = cardOutlineColor.copy(alpha = 0.3f))

                    // Speed & Combo Bonuses
                    if (gameMode == "level") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Speed Bonus", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                Text(if (speedBonusGained > 0) "+$speedBonusGained XP ⏱️" else "0 XP", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DuoSecondary)
                            }
                            Column {
                                Text("Perfect Combo", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                Text(if (comboBonusGained > 0) "+$comboBonusGained XP ⚡" else "0 XP", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = DuoTertiary)
                            }
                        }
                    }

                    // Streak
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                    ) {
                        Text("✨ Consistency Climb:", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                        Text("$currentStreakDays Days", fontWeight = FontWeight.Bold, color = DuoTertiary)
                    }
                }
            }

            // Level Progress Info
            AnimatedVisibility(
                visible = levelCardVisible,
                enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                exit = fadeOut()
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Level $userLevel", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("$userXP / $nextLevelXP XP", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    LinearProgressIndicator(
                        progress = progressFractionAnim,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(Spacing.m)
                            .clip(RoundedCornerShape(6.dp)),
                        color = primaryColor,
                        trackColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
                    )
                }
            }

            // Rank Medal Card
            AnimatedVisibility(
                visible = badgeCardVisible,
                enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                exit = fadeOut()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(primaryColor.copy(alpha = 0.05f))
                        .border(1.dp, primaryColor.copy(alpha = 0.2f), RoundedCornerShape(16.dp))
                        .padding(Spacing.m),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(Spacing.l)
                ) {
                    RankBadge(rankName = userRank, modifier = Modifier.size(54.dp))
                    Column {
                        Text("Current Rating Medal", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text(userRank, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = primaryColor)
                    }
                }
            }

            // Multiplier highlights
            AnimatedVisibility(
                visible = multipliersVisible && (streakBonusActive || criticalBonusActive || isMilestone),
                enter = slideInVertically(initialOffsetY = { 40 }) + fadeIn(animationSpec = tween(400)),
                exit = fadeOut()
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(Spacing.xs),
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(primaryColor.copy(alpha = 0.05f))
                        .border(1.dp, primaryColor.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                        .padding(Spacing.s)
                ) {
                    if (isMilestone) {
                        Text("🏅 Milestone Theorem 2.0x Multiplier Applied!", color = primaryColor, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    if (streakBonusActive) {
                        Text("✨ Consistency 1.5x XP Multiplier Active!", color = DuoSecondary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    if (criticalBonusActive) {
                        Text("✨ 10% Critical Double Coins Triggered!", color = DuoTertiary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.l))

            DuoButton(
                text = "Continue",
                onClick = {
                    RetrofitClient.triggerProfileRefresh()
                    onFinishGame()
                },
                modifier = Modifier.fillMaxWidth(),
                color = primaryColor
            )
        }
    }
}
