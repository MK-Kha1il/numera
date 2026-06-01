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
        "banner_cosmos" to "Cosmic Constellation"
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

@Composable
fun RankBadge(rankName: String?, modifier: Modifier = Modifier) {
    val cleanRank = rankName?.split(" ")?.firstOrNull()?.lowercase() ?: "bronze"
    val drawableName = "rank_$cleanRank"
    val painter = rememberDrawableResource(drawableName)
    if (painter != null) {
        Image(
            painter = painter,
            contentDescription = rankName ?: "Rank Badge",
            contentScale = ContentScale.Fit,
            modifier = modifier
        )
    } else {
        val emoji = when {
            cleanRank.contains("silver") -> "🥈"
            cleanRank.contains("gold") -> "🥇"
            cleanRank.contains("platinum") -> "💎"
            cleanRank.contains("diamond") -> "💠"
            cleanRank.contains("master") -> "👑"
            cleanRank.contains("grandmaster") -> "🔥"
            else -> "🥉"
        }
        Box(modifier = modifier, contentAlignment = Alignment.Center) {
            Text(text = emoji, fontSize = 24.sp)
        }
    }
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
        // Determine emoji, tier, and accent colors from achievement id
        data class AchInfo(val emoji: String, val tier: Int, val startColor: Color, val endColor: Color)
        val info = when (achievementId) {
            "persist_streak_3", "streak_1"        -> AchInfo("🌱", 1, Color(0xFF4ADE80), Color(0xFF16A34A))
            "persist_streak_10", "streak_2"       -> AchInfo("🔥", 2, Color(0xFFFB923C), Color(0xFFEA580C))
            "persist_streak_30", "streak_3", "streak_expert" -> AchInfo("⚡", 3, Color(0xFFFDE047), Color(0xFFCA8A04))
            "streak_4"                            -> AchInfo("☀️", 4, Color(0xFFF9A8D4), Color(0xFFDB2777))

            "learn_exercises_10", "solver_1", "math_novice" -> AchInfo("📚", 1, Color(0xFF818CF8), Color(0xFF4F46E5))
            "learn_exercises_50", "solver_2"      -> AchInfo("📝", 2, Color(0xFF7DD3FC), Color(0xFF0284C7))
            "learn_exercises_200", "solver_3", "math_expert" -> AchInfo("🎓", 3, Color(0xFFA78BFA), Color(0xFF7C3AED))
            "solver_4"                            -> AchInfo("🧙", 4, Color(0xFFF9A8D4), Color(0xFFDB2777))

            "accuracy_perfect_5"                  -> AchInfo("🎯", 1, Color(0xFF6EE7B7), Color(0xFF059669))
            "accuracy_perfect_25"                 -> AchInfo("🏹", 2, Color(0xFF86EFAC), Color(0xFF16A34A))
            "accuracy_perfect_100"                -> AchInfo("🔮", 3, Color(0xFFC084FC), Color(0xFF9333EA))

            "mastery_level_10"                    -> AchInfo("📈", 1, Color(0xFF67E8F9), Color(0xFF0891B2))
            "mastery_level_30"                    -> AchInfo("🌟", 2, Color(0xFFFDE68A), Color(0xFFD97706))
            "mastery_level_60"                    -> AchInfo("👑", 3, Color(0xFFFDE047), Color(0xFFCA8A04))

            "social_friends_1"                    -> AchInfo("🤝", 1, Color(0xFF86EFAC), Color(0xFF15803D))
            "social_friends_5"                    -> AchInfo("👥", 2, Color(0xFF6EE7B7), Color(0xFF0F766E))
            "social_friends_15"                   -> AchInfo("🌐", 3, Color(0xFF7DD3FC), Color(0xFF1D4ED8))

            "comp_arena_wins_3", "arena_1"        -> AchInfo("⚔️", 1, Color(0xFFFCA5A5), Color(0xFFDC2626))
            "comp_arena_wins_15", "arena_2", "arena_challenger" -> AchInfo("🛡️", 2, Color(0xFF93C5FD), Color(0xFF2563EB))
            "comp_arena_wins_50", "arena_3"       -> AchInfo("🏆", 3, Color(0xFFFDE68A), Color(0xFFD97706))
            "arena_4", "arena_champion"           -> AchInfo("👑", 4, Color(0xFFF9A8D4), Color(0xFFBE185D))

            "explore_archive_5"                   -> AchInfo("🗺️", 1, Color(0xFF6EE7B7), Color(0xFF065F46))
            "explore_archive_25"                  -> AchInfo("🧭", 2, Color(0xFF67E8F9), Color(0xFF0891B2))
            "explore_archive_100"                 -> AchInfo("🛸", 3, Color(0xFFC084FC), Color(0xFF6D28D9))

            "collect_items_3", "shop_1", "shop_customer" -> AchInfo("🪙", 1, Color(0xFFFDE68A), Color(0xFFB45309))
            "collect_items_10", "shop_2"          -> AchInfo("💼", 2, Color(0xFF93C5FD), Color(0xFF1D4ED8))
            "collect_items_25", "shop_3"          -> AchInfo("💎", 3, Color(0xFFA5F3FC), Color(0xFF0891B2))
            "shop_4"                              -> AchInfo("✨", 4, Color(0xFFF9A8D4), Color(0xFFBE185D))

            "seasonal_spring_5"                   -> AchInfo("🌸", 2, Color(0xFFFDA4AF), Color(0xFFE11D48))
            "seasonal_summer_5"                   -> AchInfo("☀️", 2, Color(0xFFFDE68A), Color(0xFFD97706))
            "hidden_ultimate"                     -> AchInfo("🛸", 4, Color(0xFFC084FC), Color(0xFF6D28D9))
            "hidden_speed"                        -> AchInfo("⚡", 3, Color(0xFFFDE047), Color(0xFFCA8A04))
            else                                  -> AchInfo("🏆", 1, Color(0xFFFDE68A), Color(0xFFD97706))
        }

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

                // Tier ring (thicker for higher tiers)
                val ringWidth = when (info.tier) {
                    1 -> 2.dp.toPx()
                    2 -> 2.5.dp.toPx()
                    3 -> 3.dp.toPx()
                    else -> 3.5.dp.toPx()
                }
                val ringColor = when (info.tier) {
                    1 -> Color.White.copy(alpha = 0.5f)
                    2 -> Color(0xFFFDE68A)
                    3 -> Color(0xFFFBBF24)
                    else -> Color(0xFFF59E0B)
                }
                drawCircle(
                    color = ringColor,
                    radius = r + ringWidth / 2f,
                    center = Offset(cx, cy),
                    style = Stroke(width = ringWidth)
                )

                // Tier stars at bottom (1–4 small dots)
                val dotR = 2.5.dp.toPx()
                val dotSpacing = 7.dp.toPx()
                val totalDotsWidth = (info.tier - 1) * dotSpacing
                val startX = cx - totalDotsWidth / 2f
                val dotY = cy + r * 0.62f
                repeat(info.tier) { i ->
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

