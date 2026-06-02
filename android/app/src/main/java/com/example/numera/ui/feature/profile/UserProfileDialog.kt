package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*
import com.example.numera.ui.components.ProfileBanner
import com.example.numera.ui.components.MathAvatar
import com.example.numera.ui.components.RankBadge
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.DuoCard

@Composable
fun UserProfileDialog(
    profile: PublicProfile?,
    isLoading: Boolean,
    onDismissRequest: () -> Unit
) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismissRequest) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(Spacing.l),
            borderColor = MaterialTheme.colorScheme.primary
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                if (isLoading || profile == null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(250.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        com.example.numera.ui.components.MathIconSpinner()
                    }
                } else {
                    // Banner
                    Box(modifier = Modifier.fillMaxWidth().height(110.dp)) {
                        ProfileBanner(
                            bannerKey = profile.active_banner,
                            modifier = Modifier.fillMaxWidth().height(80.dp)
                        )
                        // Close button at top-right
                        IconButton(
                            onClick = {
                                com.example.numera.haptic.HapticManager.playSoft()
                                onDismissRequest()
                            },
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(Spacing.s)
                                .size(28.dp)
                                .background(MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f), CircleShape)
                        ) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Close,
                                tint = Color.White,
                                modifier = Modifier.size(IconSize.s)
                            )
                        }
                        // Avatar overlapping banner
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .padding(start = Spacing.l)
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.surface)
                                .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            MathAvatar(
                                avatarKey = profile.avatar,
                                modifier = Modifier.fillMaxSize(),
                                fontSize = 32.sp
                            )
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Spacing.l)
                    ) {
                        Text(
                            text = profile.username,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = profile.active_badge ?: "Apprentice Solver",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.SemiBold
                        )

                        Spacer(modifier = Modifier.height(Spacing.l))

                        // Stats Card
                        DuoCard(
                            modifier = Modifier.fillMaxWidth(),
                            backgroundColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                        ) {
                            Column(
                                modifier = Modifier.padding(Spacing.m),
                                verticalArrangement = Arrangement.spacedBy(Spacing.s)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        RankBadge(rankName = profile.rank, modifier = Modifier.size(IconSize.m))
                                        Text(
                                            text = profile.rank,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp
                                        )
                                    }
                                    Text(
                                        text = "Level ${profile.level}",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = MaterialTheme.colorScheme.primary
                                    )
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Solved problems", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text("${profile.solved_count}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Arena victories", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        Text("${profile.arena_wins}", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(Spacing.l))

                        // Mastery title
                        Text(
                            text = "Category Mastery",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Spacer(modifier = Modifier.height(Spacing.s))

                        Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                            MasteryBar(
                                topicName = "Arithmetic",
                                correctCount = profile.mastery.arithmetic_correct,
                                maxCount = 100,
                                color = DuoPrimary
                            )
                            MasteryBar(
                                topicName = "Mental Math",
                                correctCount = profile.mastery.mental_correct,
                                maxCount = 100,
                                color = DuoSecondary
                            )
                            MasteryBar(
                                topicName = "Algebra",
                                correctCount = profile.mastery.algebra_correct,
                                maxCount = 100,
                                color = DuoTertiary
                            )
                            MasteryBar(
                                topicName = "Calculus",
                                correctCount = profile.mastery.calculus_correct,
                                maxCount = 100,
                                color = Color(0xFF9B6FD6)
                            )
                            MasteryBar(
                                topicName = "Combinatorics",
                                correctCount = profile.mastery.combinatorics_correct,
                                maxCount = 100,
                                color = Color(0xFFE074C3)
                            )
                            MasteryBar(
                                topicName = "Number Theory",
                                correctCount = profile.mastery.number_theory_correct,
                                maxCount = 100,
                                color = Color(0xFFFF9F29)
                            )
                        }
                    }
                }
            }
        }
    }
}
