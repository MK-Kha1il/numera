package com.example.numera.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.runtime.getValue
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import com.example.numera.theme.MedalGold
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun rememberDrawableResource(name: String): Painter? {
    val context = LocalContext.current
    val resourceId = remember(name) {
        if (name.isEmpty()) 0 else context.resources.getIdentifier(name, "drawable", context.packageName)
    }
    return if (resourceId != 0) {
        painterResource(id = resourceId)
    } else {
        null
    }
}

object MathAvatars {
    val AVATAR_MAP = mapOf(
        "avatar_pythagoras" to "📐 Pythagoras",
        "avatar_hypatia" to "🏺 Hypatia",
        "avatar_einstein" to "⚛️ Einstein",
        "avatar_lovelace" to "💻 Lovelace",
        "avatar_newton" to "🍎 Newton",
        "avatar_euler" to "🧩 Euler"
    )

    fun getEmoji(avatarKey: String?): String {
        return when (avatarKey) {
            "avatar_pythagoras" -> "📐"
            "avatar_hypatia" -> "🏺"
            "avatar_einstein" -> "⚛️"
            "avatar_lovelace" -> "💻"
            "avatar_newton" -> "🍎"
            "avatar_euler" -> "🧩"
            // Seasonal + prestige cosmetics (ultra-review #66/#75)
            "avatar_comet" -> "☄️"
            "avatar_solstice" -> "☀️"
            "avatar_frost" -> "❄️"
            "avatar_celestial" -> "🌌"
            else -> "📐" // Default fallback
        }
    }

    fun getLabel(avatarKey: String?): String {
        return AVATAR_MAP[avatarKey] ?: "📐 Pythagoras"
    }
}

object MathBanners {
    val BANNER_MAP = mapOf(
        "banner_default" to "Default Gradient",
        "banner_geometry" to "Geometry Blueprint",
        "banner_fibonacci" to "Golden Spiral",
        "banner_calculus" to "Calculus Shimmer",
        "banner_matrix" to "Matrix Rain",
        "banner_cosmos" to "Cosmic Constellation",
        "banner_champion_aureate" to "Aureate Champion",
        "banner_champion_verdant" to "Verdant Champion",
        "banner_champion_crimson" to "Crimson Champion"
    )

    fun getLabel(bannerKey: String?): String {
        return BANNER_MAP[bannerKey] ?: "Default Gradient"
    }
}

@Composable
fun MathAvatar(
    avatarKey: String?,
    modifier: Modifier = Modifier,
    fallbackEmoji: String? = null,
    fontSize: androidx.compose.ui.unit.TextUnit = 28.sp
) {
    val cleanKey = avatarKey?.replace("avatar_", "") ?: ""
    val drawableName = "avatar_$cleanKey"
    val painter = rememberDrawableResource(drawableName)
    if (painter != null) {
        Image(
            painter = painter,
            contentDescription = avatarKey ?: "Avatar",
            contentScale = ContentScale.Crop,
            modifier = modifier
        )
    } else {
        val emoji = fallbackEmoji ?: MathAvatars.getEmoji(avatarKey)
        Box(
            modifier = modifier,
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = emoji,
                fontSize = fontSize
            )
        }
    }
}

@Composable
fun ProfileBanner(bannerKey: String?, modifier: Modifier = Modifier) {
    val cleanKey = bannerKey?.replace("banner_", "") ?: ""
    val drawableName = "banner_$cleanKey"
    val painter = rememberDrawableResource(drawableName)
    if (painter != null) {
        Image(
            painter = painter,
            contentDescription = bannerKey ?: "Banner",
            contentScale = ContentScale.Crop,
            modifier = modifier
        )
    } else {
        Box(modifier = modifier) {
            when (bannerKey) {
            "banner_geometry" -> {
                // Navy slate with yellow blueprint grid
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364))
                            )
                        )
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val gridWidth = 20.dp.toPx()
                        for (x in 0..size.width.toInt() step gridWidth.toInt()) {
                            drawLine(
                                color = Color(0x22FFD700),
                                start = Offset(x.toFloat(), 0f),
                                end = Offset(x.toFloat(), size.height),
                                strokeWidth = 1f
                            )
                        }
                        for (y in 0..size.height.toInt() step gridWidth.toInt()) {
                            drawLine(
                                color = Color(0x22FFD700),
                                start = Offset(0f, y.toFloat()),
                                end = Offset(size.width, y.toFloat()),
                                strokeWidth = 1f
                            )
                        }
                    }
                }
            }
            "banner_fibonacci" -> {
                // Golden spiral on dark orange/brown copper gradient
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF43C6AC), Color(0xFF191654))
                            )
                        )
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val path = Path()
                        var angle = 0f
                        var radius = 2f
                        val centerX = size.width * 0.75f
                        val centerY = size.height * 0.5f
                        path.moveTo(centerX, centerY)
                        while (radius < size.width) {
                            val nextAngle = angle + 0.1f
                            val nextRadius = radius + 0.6f
                            val nextX = centerX + nextRadius * cos(angle)
                            val nextY = centerY + nextRadius * sin(angle)
                            path.lineTo(nextX, nextY)
                            angle = nextAngle
                            radius = nextRadius
                        }
                        drawPath(path, Color(0x55FFD700), style = Stroke(width = 4f))
                    }
                }
            }
            "banner_calculus" -> {
                // Deep teal with equations text positioned randomly
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF0D324D), Color(0xFF7F5A83))
                            )
                        )
                ) {
                    Text(
                        text = "∫ x² dx = x³/3 + C",
                        color = Color(0x22FFFFFF),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(10.dp)
                    )
                    Text(
                        text = "lim (1 + 1/n)ⁿ = e",
                        color = Color(0x22FFFFFF),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(10.dp)
                    )
                    Text(
                        text = "∂f/∂x",
                        color = Color(0x22FFFFFF),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .padding(end = 40.dp)
                    )
                }
            }
            "banner_matrix" -> {
                // Binary rain on obsidian dark background
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF050505))
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val spacing = 25.dp.toPx()
                        for (x in 0..size.width.toInt() step spacing.toInt()) {
                            val startY = (Math.random() * size.height).toFloat()
                            val speed = (20f + Math.random() * 40f).toFloat()
                            drawLine(
                                color = Color(0x3300FF00),
                                start = Offset(x.toFloat(), startY),
                                end = Offset(x.toFloat(), startY + speed),
                                strokeWidth = 3f
                            )
                        }
                    }
                    Text(
                        text = "10101001",
                        color = Color(0x2200FF00),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(10.dp)
                    )
                    Text(
                        text = "01101110",
                        color = Color(0x2200FF00),
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .padding(10.dp)
                    )
                }
            }
            "banner_cosmos" -> {
                // Cosmic dark blue and stars
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF0F0C20), Color(0xFF1F1C2C), Color(0xFF928DAB))
                            )
                        )
                ) {
                    Canvas(modifier = Modifier.fillMaxSize()) {
                        val pts = listOf(
                            Offset(size.width * 0.1f, size.height * 0.2f),
                            Offset(size.width * 0.25f, size.height * 0.5f),
                            Offset(size.width * 0.35f, size.height * 0.3f),
                            Offset(size.width * 0.55f, size.height * 0.7f),
                            Offset(size.width * 0.7f, size.height * 0.4f),
                            Offset(size.width * 0.85f, size.height * 0.2f)
                        )
                        for (i in 0 until pts.size - 1) {
                            drawLine(
                                color = Color(0x33FFFFFF),
                                start = pts[i],
                                end = pts[i + 1],
                                strokeWidth = 1.5f
                            )
                        }
                        pts.forEach { pt ->
                            drawCircle(Color.White, radius = 4f, center = pt)
                        }
                    }
                }
            }
            // Seasonal + prestige banners (ultra-review #66/#75): distinct gradients so the
            // premium season/token cosmetics read as premium rather than the default fill.
            "banner_aurora_veil" -> SeasonGradientBanner(listOf(Color(0xFF00C9A7), Color(0xFF1A2980), Color(0xFF4ADEDE)))
            "banner_eclipse" -> SeasonGradientBanner(listOf(Color(0xFF0B0B1E), Color(0xFF512DA8), Color(0xFFFFB300)))
            "banner_meteor" -> SeasonGradientBanner(listOf(Color(0xFF1B1B2F), Color(0xFFE94057), Color(0xFFF27121)))
            "banner_eternal" -> SeasonGradientBanner(listOf(Color(0xFFFFD54A), Color(0xFF8E2DE2), Color(0xFF1A1A2E)))
            // Season-reward Champion banners (audit #14): earned by reaching Diamond on the season track.
            "banner_champion_aureate" -> SeasonGradientBanner(listOf(Color(0xFF3A2E00), Color(0xFFC9A227), Color(0xFFFFE082)))
            "banner_champion_verdant" -> SeasonGradientBanner(listOf(Color(0xFF06281E), Color(0xFF188C5A), Color(0xFF8CE6B0)))
            "banner_champion_crimson" -> SeasonGradientBanner(listOf(Color(0xFF2B0710), Color(0xFFB3123C), Color(0xFFFF7B89)))
            else -> {
                // banner_default: Premium Purple-Pink linear gradient
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF6A11CB), Color(0xFF2575FC))
                            )
                        )
                )
            }
        }
    }
}
}

/** A full-bleed diagonal gradient used by the seasonal/prestige banners (no drawable needed). */
@Composable
private fun SeasonGradientBanner(colors: List<Color>) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.linearGradient(colors))
    )
}

/**
 * The competitive rank crest (docs/BrandIdentity.md §4.1). One faceted core per tier carrying a math
 * symbol that climbs from beginner to expert (+ √ π ∑ ∫ ∂ ∞), with ornamentation and motion that
 * escalate from a still Bronze coin to a radiant, rotating Grandmaster apex. Motion is gated by the
 * shared reduce-motion setting; Bronze + unranked render static.
 */
@Composable
fun RankBadge(rankName: String?, modifier: Modifier = Modifier) {
    val st = remember(rankName) { crestStyle(rankName) }
    val reduce = com.example.numera.motion.MotionManager.reduceMotion
    if (reduce || st.spinMs <= 0) {
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.fillMaxSize()) { drawRankCrest(st, 0f, 1f) }
        }
    } else {
        val tr = rememberInfiniteTransition(label = "rankCrest")
        val spin by tr.animateFloat(
            0f, 360f,
            infiniteRepeatable(tween(durationMillis = st.spinMs, easing = LinearEasing)),
            label = "spin",
        )
        val pulse by tr.animateFloat(
            0.45f, 1f,
            infiniteRepeatable(tween(durationMillis = 1700, easing = LinearEasing), RepeatMode.Reverse),
            label = "pulse",
        )
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.fillMaxSize()) { drawRankCrest(st, spin, pulse) }
        }
    }
}

private class CrestStyle(
    val idx: Int,
    val symbol: String,
    val ring: Color,
    val fill: Color,
    val facet: Color,
    val sym: Color,
    val accent: Color,
    val spinMs: Int,
)

// Map a rank label (e.g. "Gold II", "Grandmaster", "Unranked (Placement: 0/5)") to its crest style.
private fun crestStyle(rankName: String?): CrestStyle {
    val r = rankName?.lowercase() ?: ""
    return when {
        r.contains("grandmaster") -> CrestStyle(6, "∞", Color(0xFF23272F), Color(0xFF363B47), Color(0xFF50566A), Color(0xFFE6B36A), Color(0xFFD99A4E), 14000)
        r.contains("master") -> CrestStyle(5, "∂", Color(0xFF443893), Color(0xFF7361C2), Color(0xFF9586D6), Color(0xFF241B58), Color(0xFF9586D6), 18000)
        r.contains("diamond") -> CrestStyle(4, "∫", Color(0xFF4FA1BE), Color(0xFF95D6E8), Color(0xFFC0E9F3), Color(0xFF1F5A6B), Color(0xFF4FA1BE), 20000)
        r.contains("platinum") -> CrestStyle(3, "∑", Color(0xFF7C93A4), Color(0xFFB6C9D7), Color(0xFFD4E0E9), Color(0xFF3C5060), Color(0xFF7C93A4), 9000)
        r.contains("gold") -> CrestStyle(2, "π", Color(0xFFB07F0C), Color(0xFFE3BC49), Color(0xFFF4D98A), Color(0xFF6A4D08), Color(0xFFB07F0C), 16000)
        r.contains("silver") -> CrestStyle(1, "√", Color(0xFF8A929A), Color(0xFFBCC4CC), Color(0xFFDCE2E7), Color(0xFF3F464D), Color(0xFF8A929A), 24000)
        r.contains("bronze") -> CrestStyle(0, "+", Color(0xFF9C5A2A), Color(0xFFC77F3A), Color(0xFFDDA168), Color(0xFF5A3214), Color(0xFF9C5A2A), 0)
        else -> CrestStyle(-1, "·", Color(0xFF9AA0A6), Color(0xFFC4C9CE), Color(0xFFE0E3E6), Color(0xFF5A6066), Color(0xFF9AA0A6), 0)
    }
}

private fun DrawScope.drawRankCrest(st: CrestStyle, rot: Float, pulse: Float) {
    val s = minOf(size.width, size.height)
    val cx = size.width / 2f
    val cy = size.height / 2f
    val c = Offset(cx, cy)
    val core = s * 0.30f

    when (st.idx) {
        6 -> {
            rotate(rot, c) { drawSunburst(cx, cy, 12, s * 0.34f, s * 0.50f, s * 0.018f, st.accent) }
            rotate(-rot, c) { drawOrbit(c, cx, cy, s * 0.45f, s * 0.038f, 3, st.accent, st.facet) }
            drawCircle(st.accent, core * 1.14f, c)
        }
        5 -> {
            drawWing(cx, cy, s, st.fill, false)
            drawWing(cx, cy, s, st.fill, true)
            rotate(rot, c) { drawOrbit(c, cx, cy, s * 0.42f, s * 0.032f, 3, st.accent, st.facet) }
        }
        4 -> rotate(rot, c) { drawSunburst(cx, cy, 8, s * 0.34f, s * 0.46f, s * 0.014f, st.accent) }
        3 -> rotate(rot, c) { drawOrbit(c, cx, cy, s * 0.44f, s * 0.04f, 1, st.ring, st.facet) }
        2 -> {
            drawArc(st.ring, 20f, 140f, false, Offset(cx - s * 0.42f, cy - s * 0.10f), Size(s * 0.84f, s * 0.84f), style = Stroke(s * 0.05f))
            drawCircle(st.facet.copy(alpha = pulse), s * 0.03f, Offset(cx - s * 0.40f, cy - s * 0.18f))
            drawCircle(st.facet.copy(alpha = pulse), s * 0.022f, Offset(cx + s * 0.40f, cy - s * 0.12f))
        }
        1 -> rotate(rot, c) { drawArc(st.facet, -40f, 120f, false, Offset(cx - s * 0.44f, cy - s * 0.44f), Size(s * 0.88f, s * 0.88f), style = Stroke(s * 0.04f)) }
    }

    drawCircle(st.ring, core, c)
    drawCircle(st.fill, core * 0.82f, c)
    drawCircle(st.facet.copy(alpha = 0.7f), core * 0.34f, Offset(cx - core * 0.28f, cy - core * 0.30f))

    val nv = drawContext.canvas.nativeCanvas
    val paint = android.graphics.Paint().apply {
        isAntiAlias = true
        color = st.sym.toArgb()
        textSize = s * 0.40f
        textAlign = android.graphics.Paint.Align.CENTER
        typeface = android.graphics.Typeface.create(android.graphics.Typeface.SERIF, android.graphics.Typeface.BOLD)
    }
    val fm = paint.fontMetrics
    nv.drawText(st.symbol, cx, cy - (fm.ascent + fm.descent) / 2f, paint)
}

private fun DrawScope.drawSunburst(cx: Float, cy: Float, n: Int, r1: Float, r2: Float, w: Float, color: Color) {
    for (i in 0 until n) {
        val a = (2.0 * PI * i / n).toFloat()
        val dx = cos(a); val dy = sin(a)
        val px = -dy; val py = dx
        drawPath(
            Path().apply {
                moveTo(cx + dx * r1 - px * w, cy + dy * r1 - py * w)
                lineTo(cx + dx * r1 + px * w, cy + dy * r1 + py * w)
                lineTo(cx + dx * r2, cy + dy * r2)
                close()
            },
            color,
        )
    }
}

private fun DrawScope.drawOrbit(c: Offset, cx: Float, cy: Float, r: Float, dot: Float, dots: Int, ringColor: Color, dotColor: Color) {
    drawCircle(ringColor.copy(alpha = 0.6f), r, c, style = Stroke(width = r * 0.05f))
    for (i in 0 until dots) {
        val a = (2.0 * PI * i / dots - PI / 2.0).toFloat()
        drawCircle(dotColor, dot, Offset(cx + cos(a) * r, cy + sin(a) * r))
    }
}

private fun DrawScope.drawWing(cx: Float, cy: Float, s: Float, color: Color, mirror: Boolean) {
    val g = if (mirror) -1f else 1f
    drawPath(
        Path().apply {
            moveTo(cx + g * s * 0.10f, cy - s * 0.02f)
            cubicTo(cx + g * s * 0.52f, cy - s * 0.34f, cx + g * s * 0.62f, cy - s * 0.02f, cx + g * s * 0.50f, cy + s * 0.20f)
            cubicTo(cx + g * s * 0.34f, cy + s * 0.04f, cx + g * s * 0.20f, cy + s * 0.08f, cx + g * s * 0.10f, cy + s * 0.12f)
            close()
        },
        color,
    )
}

@Composable
fun AchievementBadge(achievementId: String?, modifier: Modifier = Modifier) {
    val drawableName = "ach_${achievementId ?: ""}"
    val painter = rememberDrawableResource(drawableName)
    if (painter != null) {
        Image(
            painter = painter,
            contentDescription = achievementId ?: "Achievement Badge",
            contentScale = ContentScale.Fit,
            modifier = modifier
        )
    } else {
        val family = achievementFamily(achievementId ?: "")
        val tier = achievementTier(achievementId ?: "", family.motifs.size)
        val info = AchievementVisual(
            emoji = family.motifs[tier - 1],
            tier = tier,
            startColor = family.startColor,
            endColor = family.endColor
        )

        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val s = minOf(size.width, size.height)
                val cx = size.width / 2f
                val cy = size.height / 2f
                val r = s * 0.42f

                // Badge background circle with gradient
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(info.startColor, info.endColor),
                        center = Offset(cx, cy),
                        radius = r
                    ),
                    radius = r,
                    center = Offset(cx, cy)
                )

                // Tier ring (thicker + warmer for higher tiers — the frame escalation
                // is what signals prestige; the hue stays owned by the family)
                val ringWidth = when (info.tier) {
                    1 -> 2.dp.toPx()
                    2 -> 2.5.dp.toPx()
                    3 -> 3.dp.toPx()
                    else -> 3.5.dp.toPx()
                }
                val ringColor = when {
                    info.tier <= 1 -> Color.White.copy(alpha = 0.5f)
                    info.tier == 2 -> Color(0xFFFDE68A)
                    info.tier == 3 -> Color(0xFFFBBF24)
                    else -> MedalGold
                }
                drawCircle(
                    color = ringColor,
                    radius = r + ringWidth / 2f,
                    center = Offset(cx, cy),
                    style = Stroke(width = ringWidth)
                )

                // Tier pips at bottom (capped at 5 so deep ladders don't overflow the medallion)
                val dotCount = minOf(info.tier, 5)
                val dotR = 2.5.dp.toPx()
                val dotSpacing = 7.dp.toPx()
                val totalDotsWidth = (dotCount - 1) * dotSpacing
                val startX = cx - totalDotsWidth / 2f
                val dotY = cy + r * 0.62f
                repeat(dotCount) { i ->
                    drawCircle(
                        color = Color.White.copy(alpha = 0.9f),
                        radius = dotR,
                        center = Offset(startX + i * dotSpacing, dotY)
                    )
                }
            }
            Text(
                text = info.emoji,
                fontSize = 18.sp,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
    }
}

/** Per-badge resolved visual: family hue pair + the tier's motif glyph. */
private data class AchievementVisual(
    val emoji: String,
    val tier: Int,
    val startColor: Color,
    val endColor: Color
)

/**
 * Achievement families — each progression family owns one hue pair and a motif ladder,
 * so a badge's *color says which family it is* and its *frame/motif say how far you got*.
 * This replaces a per-id lookup that silently fell back to a generic trophy for most
 * seeded achievements (streak_5+, learn_*, accuracy_*, every mastery_* chain, …).
 */
private enum class AchievementFamily(
    val startColor: Color,
    val endColor: Color,
    /** Motif ladder, lowest tier first. Tier N renders motifs[N-1]. */
    val motifs: List<String>
) {
    /** Daily-habit fire: ember orange. */
    Streak(Color(0xFFFDBA74), Color(0xFFEA580C), listOf("🌱", "🔥", "⚡", "☀️", "🌋", "💫", "👑")),
    /** Problems solved / lessons: scholar indigo. */
    Learning(Color(0xFF818CF8), Color(0xFF4F46E5), listOf("📖", "📚", "📝", "🎓", "🧙")),
    /** Perfect runs: surgical emerald. */
    Precision(Color(0xFF6EE7B7), Color(0xFF059669), listOf("🎯", "🏹", "🔮", "💠")),
    /** Per-topic mastery chains: deep violet. */
    Mastery(Color(0xFFA78BFA), Color(0xFF6D28D9), listOf("📈", "🌟", "🏵️", "👑")),
    /** Friends & community: open sky blue. */
    Social(Color(0xFF7DD3FC), Color(0xFF1D4ED8), listOf("🤝", "👥", "🌐")),
    /** Arena duels: battle crimson. */
    Duels(Color(0xFFF87171), Color(0xFFB91C1C), listOf("⚔️", "🛡️", "🏆", "👑", "🐉")),
    /** Archive & daily puzzles: voyager teal. */
    Exploration(Color(0xFF67E8F9), Color(0xFF0E7490), listOf("🗺️", "🧭", "🛸")),
    /** Shop collecting: treasury gold. */
    Collection(Color(0xFFFDE68A), Color(0xFFB45309), listOf("🪙", "💼", "💎", "✨")),
    /** Event chains: festival rose. */
    Seasonal(Color(0xFFFDA4AF), Color(0xFFE11D48), listOf("🌸", "☀️")),
    /** Hidden / elite accomplishments: cosmic violet. */
    Elite(Color(0xFFC084FC), Color(0xFF6D28D9), listOf("🌀", "⚡", "🛸", "💎")),
    /** Fallback for unrecognized ids (incl. purchased badge values): laurel gold. */
    Laurels(Color(0xFFFDE68A), Color(0xFFD97706), listOf("🏆"))
}

/**
 * Maps an achievement id (or a shop-badge value like "Gladiator II") onto its family.
 * Prefix/keyword based so newly seeded chain rungs inherit their family automatically.
 */
private fun achievementFamily(id: String): AchievementFamily {
    val key = id.trim().lowercase()
    return when {
        key.startsWith("hidden") -> AchievementFamily.Elite
        key.startsWith("streak") || key.startsWith("persist") || key.contains("daily habit") -> AchievementFamily.Streak
        key.startsWith("mastery") -> AchievementFamily.Mastery
        key.startsWith("learn") || key.startsWith("solver") || key.startsWith("math") -> AchievementFamily.Learning
        key.startsWith("accuracy") || key.contains("perfect") || key.contains("speed") -> AchievementFamily.Precision
        key.startsWith("social") || key.contains("friend") -> AchievementFamily.Social
        key.startsWith("arena") || key.startsWith("comp") || key.startsWith("gladiator") -> AchievementFamily.Duels
        key.startsWith("explore") || key.contains("archive") -> AchievementFamily.Exploration
        key.startsWith("shop") || key.startsWith("collect") -> AchievementFamily.Collection
        key.startsWith("seasonal") || key.contains("spring") || key.contains("summer") -> AchievementFamily.Seasonal
        else -> AchievementFamily.Laurels
    }
}

/**
 * Resolves the rung on the family's motif ladder. Ids encode either a chain order
 * ("streak_5"), a raw target ("accuracy_perfect_100" — clamps to the top rung), or a
 * roman numeral ("Gladiator II"); anything unparseable lands on rung 1.
 */
private fun achievementTier(id: String, ladderSize: Int): Int {
    val key = id.trim().lowercase()
    Regex("(\\d+)$").find(key)?.groupValues?.get(1)?.toIntOrNull()?.let { n ->
        return n.coerceIn(1, ladderSize)
    }
    val romanValues = mapOf("i" to 1, "ii" to 2, "iii" to 3, "iv" to 4, "v" to 5)
    Regex("\\b(iv|v|i{1,3})$").find(key)?.groupValues?.get(1)?.let { numeral ->
        romanValues[numeral]?.let { return it.coerceIn(1, ladderSize) }
    }
    return 1
}

