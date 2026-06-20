package com.example.numera.ui.feature.shop

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.numera.data.network.*
import com.example.numera.theme.*

@Composable
fun ThemePreview(themeKey: String, modifier: Modifier = Modifier) {
    val colors = when (themeKey) {
        "studio", "theme_studio" -> Triple(StudioPrimary, StudioSecondary, StudioTertiary)
        "duolingo", "theme_duolingo" -> Triple(DuoPrimary, DuoSecondary, DuoTertiary)
        "cyberpunk", "theme_cyberpunk" -> Triple(CyberPrimary, CyberSecondary, CyberTertiary)
        "eclipse", "theme_eclipse", "neon_eclipse", "theme_neon_eclipse" -> Triple(EclipsePrimary, EclipseSecondary, EclipseTertiary)
        "emerald", "theme_emerald", "emerald_abyss", "theme_emerald_abyss" -> Triple(EmeraldPrimary, EmeraldSecondary, EmeraldTertiary)
        "crimson", "theme_crimson", "crimson_nebula", "theme_crimson_nebula" -> Triple(CrimsonPrimary, CrimsonSecondary, CrimsonTertiary)
        "aurora", "theme_aurora" -> Triple(AuroraPrimary, AuroraSecondary, AuroraTertiary)
        "ocean", "theme_ocean" -> Triple(OceanPrimary, OceanSecondary, OceanTertiary)
        "sunset", "theme_sunset" -> Triple(SunsetPrimary, SunsetSecondary, SunsetTertiary)
        "midnight", "theme_midnight" -> Triple(MidnightPrimary, MidnightSecondary, MidnightTertiary)
        else -> Triple(StudioPrimary, StudioSecondary, StudioTertiary)
    }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(CornerRadius.s))
            .background(Color.White)
            .border(1.dp, MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f).copy(alpha = 0.5f), RoundedCornerShape(CornerRadius.s))
            .padding(Spacing.xs),
        contentAlignment = Alignment.Center
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(Spacing.xs)) {
            Box(modifier = Modifier.size(Spacing.m).clip(CircleShape).background(colors.first))
            Box(modifier = Modifier.size(Spacing.m).clip(CircleShape).background(colors.second))
            Box(modifier = Modifier.size(Spacing.m).clip(CircleShape).background(colors.third))
        }
    }
}
