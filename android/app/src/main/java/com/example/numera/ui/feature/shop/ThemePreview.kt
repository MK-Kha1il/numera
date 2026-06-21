package com.example.numera.ui.feature.shop

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.numera.theme.*

/**
 * A theme swatch rendered as a tiny app mockup — an app-bar, two text lines, and a CTA pill — in the
 * theme's *own* colors, so a player can imagine the app wearing it (docs/ShopOverhaul.md §8/§13).
 * Replaces the old three-dot swatch. It deliberately uses explicit theme tokens (StudioPrimary, …)
 * rather than MaterialTheme.colorScheme.*, because it renders inside the Vault's dark scheme and must
 * show the previewed theme, not the surrounding surface.
 */
@Composable
fun ThemePreview(themeKey: String, modifier: Modifier = Modifier) {
    val s = themeSwatch(themeKey)
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(CornerRadius.s))
            .background(s.paper)
            .border(1.dp, s.ink.copy(alpha = 0.15f), RoundedCornerShape(CornerRadius.s))
    ) {
        // App bar: a secondary "avatar" dot + a title bar, on the theme's primary.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.34f)
                .background(s.primary)
                .padding(horizontal = Spacing.xs),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Box(Modifier.size(Spacing.s).clip(CircleShape).background(s.secondary))
            Box(
                Modifier
                    .fillMaxWidth(0.5f)
                    .height(Spacing.xs)
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(Color.White.copy(alpha = 0.85f))
            )
        }
        // Body: two "text" lines in ink + a tertiary CTA pill (the "earned"/action accent).
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(0.66f)
                .padding(Spacing.xs),
            verticalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Box(
                Modifier
                    .fillMaxWidth(0.82f)
                    .height(Spacing.xs)
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(s.ink.copy(alpha = 0.55f))
            )
            Box(
                Modifier
                    .fillMaxWidth(0.55f)
                    .height(Spacing.xs)
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(s.ink.copy(alpha = 0.30f))
            )
            Spacer(Modifier.weight(1f))
            Box(
                Modifier
                    .fillMaxWidth(0.5f)
                    .height(Spacing.s)
                    .clip(RoundedCornerShape(CornerRadius.full))
                    .background(s.tertiary)
            )
        }
    }
}

/** The five colors a theme mockup needs: the brand triple + paper + ink, all from the theme's tokens. */
private data class ThemeSwatch(
    val primary: Color,
    val secondary: Color,
    val tertiary: Color,
    val paper: Color,
    val ink: Color,
)

private fun themeSwatch(themeKey: String): ThemeSwatch = when (themeKey) {
    "studio", "theme_studio" -> ThemeSwatch(StudioPrimary, StudioSecondary, StudioTertiary, StudioSurfaceCard, StudioOnSurface)
    "duolingo", "theme_duolingo" -> ThemeSwatch(DuoPrimary, DuoSecondary, DuoTertiary, DuoSurfaceCard, DuoOnSurface)
    "cyberpunk", "theme_cyberpunk" -> ThemeSwatch(CyberPrimary, CyberSecondary, CyberTertiary, CyberSurfaceCard, CyberOnSurface)
    "eclipse", "theme_eclipse", "neon_eclipse", "theme_neon_eclipse" -> ThemeSwatch(EclipsePrimary, EclipseSecondary, EclipseTertiary, EclipseSurfaceCard, EclipseOnSurface)
    "emerald", "theme_emerald", "emerald_abyss", "theme_emerald_abyss" -> ThemeSwatch(EmeraldPrimary, EmeraldSecondary, EmeraldTertiary, EmeraldSurfaceCard, EmeraldOnSurface)
    "crimson", "theme_crimson", "crimson_nebula", "theme_crimson_nebula" -> ThemeSwatch(CrimsonPrimary, CrimsonSecondary, CrimsonTertiary, CrimsonSurfaceCard, CrimsonOnSurface)
    "aurora", "theme_aurora" -> ThemeSwatch(AuroraPrimary, AuroraSecondary, AuroraTertiary, AuroraSurfaceCard, AuroraOnSurface)
    "ocean", "theme_ocean" -> ThemeSwatch(OceanPrimary, OceanSecondary, OceanTertiary, OceanSurfaceCard, OceanOnSurface)
    "sunset", "theme_sunset" -> ThemeSwatch(SunsetPrimary, SunsetSecondary, SunsetTertiary, SunsetSurfaceCard, SunsetOnSurface)
    "midnight", "theme_midnight" -> ThemeSwatch(MidnightPrimary, MidnightSecondary, MidnightTertiary, MidnightSurfaceCard, MidnightOnSurface)
    else -> ThemeSwatch(StudioPrimary, StudioSecondary, StudioTertiary, StudioSurfaceCard, StudioOnSurface)
}
