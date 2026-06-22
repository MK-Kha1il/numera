package com.example.numera.ui.feature.arena

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.ArenaIdentity
import com.example.numera.data.network.DomainRating
import com.example.numera.data.network.HeadToHead
import com.example.numera.theme.*
import com.example.numera.ui.components.RankBadge
import kotlin.math.abs

// ── Momentum (docs/CompetitiveArenaRedesign.md §"Momentum system") ───────────────────────────────
// A purely COSMETIC read on how the match is going. It never touches grading, score, rating, or
// rewards — it only changes how a run of correct answers *feels*. Four named states plus neutral.
enum class Momentum(val label: String, val emoji: String, val accent: Color) {
    NEUTRAL("", "", Color.Transparent),
    IN_RHYTHM("In Rhythm", "🎵", RarityRareTeal),
    LOCKED_IN("Locked In", "🎯", RarityRareBlue),
    ON_FIRE("On Fire", "🔥", RarityLegendaryAmber),
    CLUTCH("Clutch Time", "⚡", MilestoneGold)
}

// Derive the live momentum state from the duel's heartbeat. Clutch (the match is on the line in the
// final stretch, decided by one swing) outranks any streak; otherwise the streak sets the tier.
fun momentumFor(streak: Int, currentIdx: Int, total: Int, myPoints: Int, oppPoints: Int): Momentum {
    val isFinalStretch = total > 1 && currentIdx >= total - 1
    val decidedByOneSwing = abs(myPoints - oppPoints) <= 20
    if (isFinalStretch && decidedByOneSwing && (myPoints > 0 || oppPoints > 0)) return Momentum.CLUTCH
    return when {
        streak >= 5 -> Momentum.ON_FIRE
        streak >= 3 -> Momentum.LOCKED_IN
        streak >= 2 -> Momentum.IN_RHYTHM
        else -> Momentum.NEUTRAL
    }
}

// A breathing accent pill that announces the current momentum state. Shown only when non-neutral.
@Composable
fun MomentumBanner(momentum: Momentum, modifier: Modifier = Modifier) {
    AnimatedVisibility(
        visible = momentum != Momentum.NEUTRAL,
        enter = scaleIn(initialScale = 0.85f) + fadeIn()
    ) {
        val pulse by rememberInfiniteTransition(label = "momentumPulse").animateFloat(
            initialValue = 0.55f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(700, easing = LinearEasing), RepeatMode.Reverse),
            label = "momentumAlpha"
        )
        Row(
            modifier = modifier
                .clip(RoundedCornerShape(CornerRadius.full))
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            momentum.accent.copy(alpha = 0.30f * pulse),
                            momentum.accent.copy(alpha = 0.12f)
                        )
                    )
                )
                .border(1.5.dp, momentum.accent.copy(alpha = pulse), RoundedCornerShape(CornerRadius.full))
                .padding(horizontal = Spacing.m, vertical = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Text(momentum.emoji, fontSize = 16.sp)
            Text(
                text = momentum.label.uppercase(),
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                color = momentum.accent
            )
        }
    }
}

// ── Clutch tags (post-match) ─────────────────────────────────────────────────────────────────────
// Mirrors the server's lib/duelMoments computeClutchTags output. The client appends a "comeback"
// tag it alone observed (trailing → won). Accents are semantic strings the server emits.
data class ClutchTag(val key: String, val label: String, val emoji: String, val accent: String)

fun clutchAccentColor(accent: String): Color = when (accent) {
    "gold" -> MilestoneGold
    "violet" -> RarityEpicViolet
    "green" -> CorrectGreen
    "blue" -> RarityRareBlue
    "amber" -> RarityLegendaryAmber
    "teal" -> RarityRareTeal
    else -> RarityRareBlue
}

// The headline clutch banner (tags[0]) — big, accented, with its own entrance. Plus any secondary
// tags as compact chips beneath. Returns nothing visible when there are no tags.
@Composable
fun ClutchBanners(tags: List<ClutchTag>, modifier: Modifier = Modifier) {
    if (tags.isEmpty()) return
    val headline = tags.first()
    val accent = clutchAccentColor(headline.accent)
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        var revealed by remember { mutableStateOf(false) }
        LaunchedEffect(Unit) { revealed = true }
        AnimatedVisibility(visible = revealed, enter = scaleIn(initialScale = 0.7f) + fadeIn()) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(CornerRadius.l))
                    .background(
                        Brush.horizontalGradient(
                            listOf(accent.copy(alpha = 0.28f), accent.copy(alpha = 0.10f))
                        )
                    )
                    .border(2.dp, accent, RoundedCornerShape(CornerRadius.l))
                    .padding(horizontal = Spacing.l, vertical = Spacing.s),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.s)
            ) {
                Text(headline.emoji, fontSize = 24.sp)
                Text(
                    text = headline.label.uppercase(),
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                    color = accent
                )
            }
        }
        if (tags.size > 1) {
            FlowRowSimple(tags.drop(1))
        }
    }
}

// A tiny wrap row for the secondary tag chips (avoids pulling in the experimental FlowRow API).
@Composable
private fun FlowRowSimple(tags: List<ClutchTag>) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().wrapContentWidth(Alignment.CenterHorizontally)
    ) {
        tags.take(3).forEach { tag ->
            val a = clutchAccentColor(tag.accent)
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(a.copy(alpha = 0.14f))
                    .border(1.dp, a.copy(alpha = 0.5f), RoundedCornerShape(CornerRadius.full))
                    .padding(horizontal = Spacing.s, vertical = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                Text(tag.emoji, fontSize = 11.sp)
                Text(tag.label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = a)
            }
        }
    }
}

// An animated rating count-up: the number springs from the pre-match rating to the new one, with
// a colored ± delta. Gives the rating change *weight* instead of being a static string.
@Composable
fun RatingCountUp(oldElo: Int, newElo: Int, delta: Int, modifier: Modifier = Modifier) {
    var target by remember { mutableIntStateOf(oldElo) }
    LaunchedEffect(newElo) { target = newElo }
    val shown by animateIntAsState(targetValue = target, animationSpec = tween(900), label = "ratingCount")
    val deltaColor = if (delta >= 0) CorrectGreen else WrongRed
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("RATING", fontSize = 11.sp, fontWeight = FontWeight.Black, letterSpacing = 2.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
        Text(
            text = "$shown",
            fontSize = 40.sp,
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "${if (delta >= 0) "+" else ""}$delta",
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = deltaColor
        )
    }
}

// ── Pre-match player card ────────────────────────────────────────────────────────────────────────
// Turns a bare username into a real competitor: rank crest, rating, peak, win streak, specialty.
@Composable
fun PlayerIdentityCard(
    identity: ArenaIdentity,
    isYou: Boolean,
    accent: Color,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(
                Brush.horizontalGradient(listOf(accent.copy(alpha = 0.14f), Color.Transparent))
            )
            .border(1.5.dp, accent.copy(alpha = 0.5f), RoundedCornerShape(CornerRadius.l))
            .padding(Spacing.m),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.m)
    ) {
        RankBadge(rankName = identity.rank, modifier = Modifier.size(48.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
                Text(
                    text = if (isYou) "You" else identity.username,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    color = accent,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (identity.isBot) {
                    Text(
                        text = "BOT",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        modifier = Modifier
                            .clip(RoundedCornerShape(CornerRadius.full))
                            .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f))
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    )
                }
            }
            Text(
                text = "${identity.rank} · ${identity.elo}",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.s),
                modifier = Modifier.padding(top = 2.dp)
            ) {
                if (!identity.isBot && identity.peak_elo > identity.elo) {
                    StatChip("📈", "Peak ${identity.peak_elo}")
                }
                if (identity.current_win_streak >= 2) {
                    StatChip("🔥", "${identity.current_win_streak}")
                }
                identity.specialty?.let { StatChip("✦", it) }
            }
        }
    }
}

@Composable
private fun StatChip(emoji: String, label: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(emoji, fontSize = 11.sp)
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

// One-line rivalry framing from the head-to-head record (your perspective). Returns null-ish empty
// when there's no history (caller can decide whether to show "First meeting").
fun rivalryLine(h2h: HeadToHead, opponentName: String): String = when {
    h2h.total == 0 -> "First meeting — make it count."
    h2h.myWins > h2h.theirWins -> "You lead $opponentName ${h2h.myWins}–${h2h.theirWins}."
    h2h.myWins < h2h.theirWins -> "$opponentName leads ${h2h.theirWins}–${h2h.myWins} — even the score."
    else -> "Rivalry tied ${h2h.myWins}–${h2h.theirWins}."
}

// ── The climb + pre-match stakes (server-authoritative) ──────────────────────────────────────────
// The rating substrate is NRS (mu/sigma → conservative display rating), so the client can't
// reproduce the rank ladder or the rating swing locally — the old classic-Elo K=32 guess and the
// 1100–2700 `calculateRankFromElo` mirror were both retired on the server and produced numbers that
// disagreed with what it actually assigns. Both the climb bar and the duel stakes are now fed by the
// server (GET /api/rating/profile · duel_start `identities.stakes`), so they can never drift again.

// What a ranked duel puts on the line for you, projected by the server with the SAME NRS engine that
// settles it (so it matches the post-match count-up). Null when the duel is rating-neutral (casual,
// friend, or a bot fallback) — the client then shows no stakes rather than a fabricated one.
data class DuelStakes(val winDelta: Int, val loseDelta: Int, val promoteOnWin: Boolean, val nextRank: String?)

// A compact "the climb" bar for the arena home: progress through the current division + "N to Next".
// Driven by the server's NRS rank math (DomainRating). Renders nothing for a player still in
// placement or already at the top (no next division).
@Composable
fun PromotionProgressBar(rating: DomainRating?, modifier: Modifier = Modifier) {
    if (rating == null) return
    val nextRank = rating.nextRank ?: return
    val pointsToNext = rating.pointsToNext ?: return
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = "$pointsToNext to $nextRank",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(6.dp)
                .clip(RoundedCornerShape(CornerRadius.full))
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.10f))
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(rating.progress.coerceIn(0f, 1f))
                    .height(6.dp)
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(
                        Brush.horizontalGradient(listOf(MilestoneGold.copy(alpha = 0.8f), MilestoneGold))
                    )
            )
        }
    }
}

// ── Reasoning beat (educational integrity, docs/CompetitiveArenaRedesign.md §15) ─────────────────
// After the speed race, a moment that rewards UNDERSTANDING the *why*: a "why is that right?" MCQ on
// one problem from the duel. No rewards attached (so it can't be farmed) — purely learning. The
// duel's grading/rating are untouched; this only fires on the result screen.
@Composable
fun ReasoningRecapCard(
    question: String,
    options: List<Pair<String, Boolean>>, // text → isCorrect
    explanation: String,
    modifier: Modifier = Modifier
) {
    if (options.isEmpty()) return
    val accent = MaterialTheme.colorScheme.tertiary
    var selected by remember { mutableStateOf<Int?>(null) }
    val revealed = selected != null
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(accent.copy(alpha = 0.06f))
            .border(1.dp, accent.copy(alpha = 0.4f), RoundedCornerShape(CornerRadius.l))
            .padding(Spacing.m),
        verticalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Text("🧠", fontSize = 15.sp)
            Text(
                text = "WHY IS THAT RIGHT?",
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp,
                color = accent
            )
        }
        Text(
            text = question.ifBlank { "Which statement best explains the answer?" },
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        options.forEachIndexed { idx, (text, isCorrect) ->
            val border = when {
                !revealed -> MaterialTheme.colorScheme.outline
                isCorrect -> CorrectGreen
                idx == selected -> WrongRed
                else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.4f)
            }
            val bg = when {
                !revealed -> MaterialTheme.colorScheme.surface
                isCorrect -> CorrectGreen.copy(alpha = 0.12f)
                idx == selected -> WrongRed.copy(alpha = 0.10f)
                else -> MaterialTheme.colorScheme.surface
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(CornerRadius.m))
                    .background(bg)
                    .border(1.5.dp, border, RoundedCornerShape(CornerRadius.m))
                    .then(if (!revealed) Modifier.clickable { selected = idx } else Modifier)
                    .padding(Spacing.s),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
            ) {
                if (revealed && isCorrect) Text("✓", fontSize = 14.sp, fontWeight = FontWeight.Black, color = CorrectGreen)
                else if (revealed && idx == selected) Text("✗", fontSize = 14.sp, fontWeight = FontWeight.Black, color = WrongRed)
                Text(
                    text = text,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
        if (revealed) {
            val gotIt = options.getOrNull(selected ?: -1)?.second == true
            Text(
                text = (if (gotIt) "✓ Reasoning confirmed. " else "Not quite — ") +
                    explanation.ifBlank { "" },
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = if (gotIt) CorrectGreen else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f)
            )
        }
    }
}

// The decisive-moment banner: pure climax emphasis shown on the final, one-swing-decides-it question.
@Composable
fun MatchPointBanner(modifier: Modifier = Modifier) {
    val pulse by rememberInfiniteTransition(label = "matchPoint").animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(600, easing = LinearEasing), RepeatMode.Reverse),
        label = "matchPointAlpha"
    )
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(CornerRadius.full))
            .background(MilestoneGold.copy(alpha = 0.18f * pulse))
            .border(1.5.dp, MilestoneGold.copy(alpha = pulse), RoundedCornerShape(CornerRadius.full))
            .padding(horizontal = Spacing.m, vertical = Spacing.xs),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
    ) {
        Text("⚡", fontSize = 15.sp)
        Text(
            text = "MATCH POINT",
            fontSize = 13.sp,
            fontWeight = FontWeight.Black,
            letterSpacing = 2.sp,
            color = MilestoneGold
        )
    }
}
