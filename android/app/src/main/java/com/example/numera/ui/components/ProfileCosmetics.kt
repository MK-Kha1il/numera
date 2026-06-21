package com.example.numera.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.motion.MotionManager
import com.example.numera.theme.*
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * An avatar wearing its equipped cosmetics (docs/ShopOverhaul.md §8): a profile-effect aura behind
 * it and an earned mastery-frame ring around it. With neither equipped it renders exactly like the
 * plain avatar circle (a surface disc + primary border), so existing surfaces are unchanged until a
 * player equips something. All motion is reduce-motion aware.
 */
@Composable
fun CosmeticAvatar(
    avatarKey: String?,
    frameKey: String?,
    effectKey: String?,
    modifier: Modifier = Modifier,
    fontSize: TextUnit = 28.sp,
) {
    val hasFrame = !frameKey.isNullOrEmpty()
    val hasEffect = !effectKey.isNullOrEmpty()
    val corePadding = if (hasFrame || hasEffect) 7.dp else 0.dp

    Box(modifier, contentAlignment = Alignment.Center) {
        if (hasEffect) ProfileEffectAura(effectKey!!, Modifier.fillMaxSize())

        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(corePadding)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surface)
                .then(if (hasFrame) Modifier else Modifier.border(3.dp, MaterialTheme.colorScheme.primary, CircleShape)),
            contentAlignment = Alignment.Center,
        ) {
            MathAvatar(avatarKey = avatarKey, modifier = Modifier.fillMaxSize(), fontSize = fontSize)
        }

        if (hasFrame) MasteryFrameRing(frameKey!!, Modifier.fillMaxSize())
    }
}

private fun frameColor(value: String): Color = when (value) {
    "arithmetic_master" -> RarityRareTeal
    "algebra_master" -> StudioPrimary
    "geometry_master" -> StudioTertiary
    "fractions_master" -> CorrectGreen
    "calculus_master" -> MedalGold
    "number_theory_master" -> RarityEpicViolet
    else -> MedalGold
}

/** The earned mastery-frame ring drawn around an avatar. Legendary strands (calculus / number
 *  theory) slowly rotate; the rest are still. */
@Composable
fun MasteryFrameRing(frameValue: String, modifier: Modifier = Modifier) {
    val color = remember(frameValue) { frameColor(frameValue) }
    val legendary = frameValue == "calculus_master" || frameValue == "number_theory_master"
    val reduce = MotionManager.reduceMotion
    val rotation = if (legendary && !reduce) {
        val tr = rememberInfiniteTransition(label = "frameSpin")
        tr.animateFloat(
            0f, 360f,
            infiniteRepeatable(tween(18000, easing = LinearEasing)),
            label = "spin",
        ).value
    } else 0f

    Canvas(modifier) {
        val r = size.minDimension / 2f
        val c = Offset(size.width / 2f, size.height / 2f)
        drawCircle(color, radius = r * 0.96f, center = c, style = Stroke(width = r * 0.10f))
        drawCircle(color.copy(alpha = 0.45f), radius = r * 0.80f, center = c, style = Stroke(width = r * 0.03f))
        rotate(rotation, c) {
            val n = 12
            for (i in 0 until n) {
                val a = (2.0 * PI * i / n).toFloat()
                val r1 = r * 0.84f
                val r2 = r * 0.96f
                drawLine(
                    color,
                    Offset(c.x + cos(a) * r1, c.y + sin(a) * r1),
                    Offset(c.x + cos(a) * r2, c.y + sin(a) * r2),
                    strokeWidth = r * 0.03f,
                )
            }
        }
    }
}

private fun effectColor(value: String): Color = when (value) {
    "constellation" -> RarityRareTeal
    "geometric_pulse" -> StudioPrimary
    "floating_symbols" -> StudioSecondary
    "golden_dust" -> MedalGold
    else -> MedalGold
}

/** A subtle equipped profile-effect aura drawn behind the avatar — elegant, never loud. */
@Composable
fun ProfileEffectAura(effectValue: String, modifier: Modifier = Modifier) {
    val color = remember(effectValue) { effectColor(effectValue) }
    val reduce = MotionManager.reduceMotion
    val t = if (reduce) 0.5f else {
        val tr = rememberInfiniteTransition(label = "effectAura")
        tr.animateFloat(
            0f, 1f,
            infiniteRepeatable(tween(4200, easing = LinearEasing), RepeatMode.Reverse),
            label = "t",
        ).value
    }

    Canvas(modifier) {
        when (effectValue) {
            "constellation" -> drawConstellation(color, t)
            "geometric_pulse" -> drawGeometricPulse(color, t)
            "floating_symbols" -> drawFloatingSymbols(color, t)
            else -> drawGoldenDust(color, t) // golden_dust + fallback
        }
    }
}

// Points near the corners of the box so they show *around* the inscribed avatar circle.
private val EDGE_POINTS = listOf(
    Offset(0.10f, 0.16f), Offset(0.88f, 0.20f), Offset(0.92f, 0.74f),
    Offset(0.14f, 0.82f), Offset(0.50f, 0.04f), Offset(0.06f, 0.50f),
)

private fun DrawScope.drawConstellation(color: Color, t: Float) {
    EDGE_POINTS.forEachIndexed { i, p ->
        val twinkle = 0.4f + 0.6f * (0.5f + 0.5f * sin((t * 2f * PI + i).toFloat()))
        val c = Offset(p.x * size.width, p.y * size.height)
        drawCircle(color.copy(alpha = 0.18f * twinkle), size.minDimension * 0.05f, c)
        drawCircle(Color.White.copy(alpha = 0.7f * twinkle), size.minDimension * 0.012f, c)
    }
}

private fun DrawScope.drawGeometricPulse(color: Color, t: Float) {
    val c = Offset(size.width / 2f, size.height / 2f)
    val base = size.minDimension * 0.5f
    for (k in 0..2) {
        val scale = 0.7f + 0.3f * ((t + k * 0.33f) % 1f)
        val r = base * scale
        val alpha = 0.22f * (1f - ((t + k * 0.33f) % 1f))
        val n = 6
        var prev: Offset? = null
        val first = Offset(c.x + r, c.y)
        for (i in 0..n) {
            val a = (2.0 * PI * i / n).toFloat()
            val p = Offset(c.x + cos(a) * r, c.y + sin(a) * r)
            if (prev != null) drawLine(color.copy(alpha = alpha), prev!!, p, strokeWidth = 2f)
            prev = p
        }
        drawLine(color.copy(alpha = alpha), prev!!, first, strokeWidth = 2f)
    }
}

private fun DrawScope.drawFloatingSymbols(color: Color, t: Float) {
    // small "+" glyphs rising in the side margins
    val xs = listOf(0.10f, 0.90f, 0.20f, 0.80f)
    xs.forEachIndexed { i, x ->
        val phase = (t + i * 0.25f) % 1f
        val y = (0.9f - phase) * size.height
        val cx = x * size.width
        val s = size.minDimension * 0.05f
        val alpha = 0.30f * (1f - kotlin.math.abs(phase - 0.5f) * 2f)
        drawLine(color.copy(alpha = alpha), Offset(cx - s, y), Offset(cx + s, y), strokeWidth = 2.5f)
        drawLine(color.copy(alpha = alpha), Offset(cx, y - s), Offset(cx, y + s), strokeWidth = 2.5f)
    }
}

private fun DrawScope.drawGoldenDust(color: Color, t: Float) {
    val specks = listOf(
        Offset(0.12f, 0.7f), Offset(0.9f, 0.6f), Offset(0.2f, 0.3f),
        Offset(0.85f, 0.3f), Offset(0.5f, 0.06f), Offset(0.08f, 0.45f),
    )
    specks.forEachIndexed { i, p ->
        val phase = (t + i * 0.17f) % 1f
        val y = (p.y - phase * 0.2f) * size.height
        val alpha = 0.4f * (1f - phase)
        drawCircle(color.copy(alpha = alpha), size.minDimension * (0.012f + 0.01f * (1f - phase)), Offset(p.x * size.width, y))
    }
}

private fun victoryColor(value: String): Color = when (value) {
    "equation_formation" -> MedalGold
    "pattern_reveal" -> StudioTertiary
    "constellation_burst" -> RarityRareTeal
    else -> MedalGold
}

/**
 * The equipped duel-win victory effect (docs/ShopOverhaul.md §8) — a one-shot, elegant reveal played
 * over the result screen, never an explosion. Empty key renders nothing (the caller keeps confetti).
 * Reduce-motion shows the fully-formed final frame.
 */
@Composable
fun VictoryEffectOverlay(victoryKey: String?, modifier: Modifier = Modifier) {
    if (victoryKey.isNullOrEmpty()) return
    val color = remember(victoryKey) { victoryColor(victoryKey) }
    val reduce = MotionManager.reduceMotion
    val p = remember(victoryKey) { Animatable(if (reduce) 1f else 0f) }
    LaunchedEffect(victoryKey) { if (!reduce) p.animateTo(1f, tween(1500, easing = LinearEasing)) }

    Canvas(modifier) {
        when (victoryKey) {
            "equation_formation" -> drawEquationFormation(color, p.value)
            "pattern_reveal" -> drawPatternReveal(color, p.value)
            else -> drawConstellationBurst(color, p.value) // constellation_burst + fallback
        }
    }
}

private fun DrawScope.drawEquationFormation(color: Color, p: Float) {
    // Three "equation bars" growing outward from the centre, with a fading "=" pair.
    val cx = size.width / 2f
    val rows = listOf(0.34f, 0.5f, 0.66f)
    rows.forEachIndexed { i, fy ->
        val seg = (p * rows.size - i).coerceIn(0f, 1f)
        if (seg <= 0f) return@forEachIndexed
        val half = size.width * 0.36f * seg
        val y = fy * size.height
        drawLine(color.copy(alpha = 0.5f * seg), Offset(cx - half, y), Offset(cx + half, y), strokeWidth = 4f)
    }
    val eq = (p * 1.4f).coerceIn(0f, 1f)
    drawLine(color.copy(alpha = 0.6f * eq), Offset(cx - size.width * 0.05f, size.height * 0.46f), Offset(cx + size.width * 0.05f, size.height * 0.46f), strokeWidth = 4f)
    drawLine(color.copy(alpha = 0.6f * eq), Offset(cx - size.width * 0.05f, size.height * 0.54f), Offset(cx + size.width * 0.05f, size.height * 0.54f), strokeWidth = 4f)
}

private fun DrawScope.drawPatternReveal(color: Color, p: Float) {
    // Concentric hexagons blooming outward and fading.
    val c = Offset(size.width / 2f, size.height / 2f)
    val base = size.minDimension * 0.42f
    for (k in 0..3) {
        val local = (p * 1.2f - k * 0.18f).coerceIn(0f, 1f)
        if (local <= 0f) continue
        val r = base * local
        val alpha = 0.5f * (1f - local) + 0.08f
        val n = 6
        var prev: Offset? = null
        val first = Offset(c.x + r, c.y)
        for (i in 0..n) {
            val a = (2.0 * PI * i / n).toFloat()
            val pt = Offset(c.x + cos(a) * r, c.y + sin(a) * r)
            if (prev != null) drawLine(color.copy(alpha = alpha), prev!!, pt, strokeWidth = 3f)
            prev = pt
        }
        drawLine(color.copy(alpha = alpha), prev!!, first, strokeWidth = 3f)
    }
}

private fun DrawScope.drawConstellationBurst(color: Color, p: Float) {
    // Stars radiate from the centre and connect into a ring.
    val c = Offset(size.width / 2f, size.height / 2f)
    val r = size.minDimension * 0.40f * p
    val n = 8
    val pts = (0 until n).map {
        val a = (2.0 * PI * it / n - PI / 2.0).toFloat()
        Offset(c.x + cos(a) * r, c.y + sin(a) * r)
    }
    for (i in 0 until n) {
        val a = pts[i]
        val b = pts[(i + 1) % n]
        drawLine(color.copy(alpha = 0.35f * p), a, b, strokeWidth = 2f)
    }
    pts.forEach {
        drawCircle(color.copy(alpha = 0.3f * p), size.minDimension * 0.03f, it)
        drawCircle(Color.White.copy(alpha = 0.8f * p), size.minDimension * 0.012f, it)
    }
}

private fun tapColor(value: String): Color = when (value) {
    "geometric_ripple" -> StudioPrimary
    "grid_pulse" -> RarityRareTeal
    "math_spark" -> MedalGold
    else -> MedalGold
}

/**
 * Wraps gameplay content with the equipped **tap effect** (docs/ShopOverhaul.md §8): a small flourish
 * where each tap lands. The pointer handler is **observe-only** — it never consumes the event
 * (`requireUnconsumed = false`, no `consume()`), so the underlying answer buttons keep working. When
 * nothing is equipped (or reduce-motion is on) it renders the content with zero overhead.
 */
@Composable
fun TapEffectLayer(tapKey: String?, modifier: Modifier = Modifier, content: @Composable BoxScope.() -> Unit) {
    if (tapKey.isNullOrEmpty() || MotionManager.reduceMotion) {
        Box(modifier, content = content)
        return
    }
    val color = remember(tapKey) { tapColor(tapKey) }
    var tapPos by remember { mutableStateOf<Offset?>(null) }
    var tapSeq by remember { mutableIntStateOf(0) }
    val anim = remember { Animatable(1f) }

    LaunchedEffect(tapSeq) {
        if (tapSeq > 0) {
            anim.snapTo(0f)
            anim.animateTo(1f, tween(420, easing = LinearEasing))
        }
    }

    Box(
        modifier = modifier.pointerInput(Unit) {
            awaitEachGesture {
                val down = awaitFirstDown(requireUnconsumed = false)
                tapPos = down.position
                tapSeq++
            }
        },
    ) {
        content()
        val pos = tapPos
        if (pos != null && anim.value < 1f) {
            Canvas(Modifier.fillMaxSize()) { drawTapEffect(tapKey, color, pos, anim.value) }
        }
    }
}

private fun DrawScope.drawTapEffect(key: String, color: Color, pos: Offset, p: Float) {
    val alpha = (1f - p).coerceIn(0f, 1f)
    val maxR = 26.dp.toPx()
    when (key) {
        "geometric_ripple" -> {
            val r = maxR * p
            val n = 6
            var prev: Offset? = null
            val first = Offset(pos.x + r, pos.y)
            for (i in 0..n) {
                val a = (2.0 * PI * i / n).toFloat()
                val pt = Offset(pos.x + cos(a) * r, pos.y + sin(a) * r)
                if (prev != null) drawLine(color.copy(alpha = 0.6f * alpha), prev!!, pt, strokeWidth = 2.5f)
                prev = pt
            }
            drawLine(color.copy(alpha = 0.6f * alpha), prev!!, first, strokeWidth = 2.5f)
        }
        "grid_pulse" -> {
            val s = maxR * (0.5f + 0.5f * p)
            for (k in -1..1) {
                drawLine(color.copy(alpha = 0.5f * alpha), Offset(pos.x + k * s / 2f, pos.y - s), Offset(pos.x + k * s / 2f, pos.y + s), strokeWidth = 2f)
                drawLine(color.copy(alpha = 0.5f * alpha), Offset(pos.x - s, pos.y + k * s / 2f), Offset(pos.x + s, pos.y + k * s / 2f), strokeWidth = 2f)
            }
        }
        else -> { // math_spark — a little starburst
            val r = maxR * p
            val n = 6
            for (i in 0 until n) {
                val a = (2.0 * PI * i / n).toFloat()
                drawLine(color.copy(alpha = 0.7f * alpha), Offset(pos.x + cos(a) * r * 0.4f, pos.y + sin(a) * r * 0.4f), Offset(pos.x + cos(a) * r, pos.y + sin(a) * r), strokeWidth = 2.5f)
            }
        }
    }
}
