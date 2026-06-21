package com.example.numera.theme

import android.content.Context
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color

private val DuoColorScheme = lightColorScheme(
    primary = DuoPrimary,
    secondary = DuoSecondary,
    tertiary = DuoTertiary,
    background = DuoBg,
    surface = DuoSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = DuoOnSurface,
    onSurface = DuoOnSurface,
    outline = DuoBorder,
    surfaceVariant = DuoSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val DuoDarkColorScheme = darkColorScheme(
    primary = Color(0xFF58CC02),
    secondary = Color(0xFF1CB0F6),
    tertiary = Color(0xFFFF9600),
    background = Color(0xFF15191C),
    surface = Color(0xFF1A2024),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFE5E5E5),
    onSurface = Color(0xFFE5E5E5),
    outline = Color(0xFF323B42),
    surfaceVariant = Color(0xFF22282C),
    error = WrongRed,
    onError = Color.White
)

private val CyberColorScheme = lightColorScheme(
    primary = CyberPrimary,
    secondary = CyberSecondary,
    tertiary = CyberTertiary,
    background = CyberBg,
    surface = CyberSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = CyberOnSurface,
    onSurface = CyberOnSurface,
    outline = CyberBorder,
    surfaceVariant = CyberSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val CyberDarkColorScheme = darkColorScheme(
    primary = Color(0xFFBD00FF),
    secondary = Color(0xFF00C2FF),
    tertiary = Color(0xFFFF007F),
    background = Color(0xFF0D0B12),
    surface = Color(0xFF16121F),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFEDE0FF),
    onSurface = Color(0xFFEDE0FF),
    outline = Color(0xFF2C243B),
    surfaceVariant = Color(0xFF211B2E),
    error = WrongRed,
    onError = Color.White
)

private val EclipseColorScheme = lightColorScheme(
    primary = EclipsePrimary,
    secondary = EclipseSecondary,
    tertiary = EclipseTertiary,
    background = EclipseBg,
    surface = EclipseSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = EclipseOnSurface,
    onSurface = EclipseOnSurface,
    outline = EclipseBorder,
    surfaceVariant = EclipseSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val EclipseDarkColorScheme = darkColorScheme(
    primary = Color(0xFFFFB703),
    secondary = Color(0xFFFB8500),
    tertiary = Color(0xFF219EBC),
    background = Color(0xFF120E05),
    surface = Color(0xFF1E1708),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFFFF0D0),
    onSurface = Color(0xFFFFF0D0),
    outline = Color(0xFF33270E),
    surfaceVariant = Color(0xFF271E0B),
    error = WrongRed,
    onError = Color.White
)

private val EmeraldColorScheme = lightColorScheme(
    primary = EmeraldPrimary,
    secondary = EmeraldSecondary,
    tertiary = EmeraldTertiary,
    background = EmeraldBg,
    surface = EmeraldSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = EmeraldOnSurface,
    onSurface = EmeraldOnSurface,
    outline = EmeraldBorder,
    surfaceVariant = EmeraldSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val EmeraldDarkColorScheme = darkColorScheme(
    primary = Color(0xFF00CD76),
    secondary = Color(0xFF00A2C9),
    tertiary = Color(0xFF7D3CFF),
    background = Color(0xFF0A0F0C),
    surface = Color(0xFF121B16),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFE0FAF0),
    onSurface = Color(0xFFE0FAF0),
    outline = Color(0xFF20332B),
    surfaceVariant = Color(0xFF16251E),
    error = WrongRed,
    onError = Color.White
)

private val CrimsonColorScheme = lightColorScheme(
    primary = CrimsonPrimary,
    secondary = CrimsonSecondary,
    tertiary = CrimsonTertiary,
    background = CrimsonBg,
    surface = CrimsonSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = CrimsonOnSurface,
    onSurface = CrimsonOnSurface,
    outline = CrimsonBorder,
    surfaceVariant = CrimsonSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val CrimsonDarkColorScheme = darkColorScheme(
    primary = Color(0xFFFA2C56),
    secondary = Color(0xFFFF725E),
    tertiary = Color(0xFFAC0037),
    background = Color(0xFF12070A),
    surface = Color(0xFF1E0C10),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFFFE0E5),
    onSurface = Color(0xFFFFE0E5),
    outline = Color(0xFF33161C),
    surfaceVariant = Color(0xFF271115),
    error = WrongRed,
    onError = Color.White
)

private val AuroraColorScheme = lightColorScheme(
    primary = AuroraPrimary,
    secondary = AuroraSecondary,
    tertiary = AuroraTertiary,
    background = AuroraBg,
    surface = AuroraSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = AuroraOnSurface,
    onSurface = AuroraOnSurface,
    outline = AuroraBorder,
    surfaceVariant = AuroraSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val AuroraDarkColorScheme = darkColorScheme(
    primary = Color(0xFF00C9A7),
    secondary = Color(0xFF9B6FD6),
    tertiary = Color(0xFFE074C3),
    background = Color(0xFF0A141A),
    surface = Color(0xFF11222B),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFE0FAF3),
    onSurface = Color(0xFFE0FAF3),
    outline = Color(0xFF1F4354),
    surfaceVariant = Color(0xFF1A3340),
    error = WrongRed,
    onError = Color.White
)

private val OceanColorScheme = lightColorScheme(
    primary = OceanPrimary,
    secondary = OceanSecondary,
    tertiary = OceanTertiary,
    background = OceanBg,
    surface = OceanSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = OceanOnSurface,
    onSurface = OceanOnSurface,
    outline = OceanBorder,
    surfaceVariant = OceanSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val OceanDarkColorScheme = darkColorScheme(
    primary = Color(0xFF3AB4F2),
    secondary = Color(0xFF00FFAB),
    tertiary = Color(0xFF0078AA),
    background = Color(0xFF07111E),
    surface = Color(0xFF0D1E34),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFE5F6FD),
    onSurface = Color(0xFFE5F6FD),
    outline = Color(0xFF1E436F),
    surfaceVariant = Color(0xFF142C4B),
    error = WrongRed,
    onError = Color.White
)

private val SunsetColorScheme = lightColorScheme(
    primary = SunsetPrimary,
    secondary = SunsetSecondary,
    tertiary = SunsetTertiary,
    background = SunsetBg,
    surface = SunsetSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = SunsetOnSurface,
    onSurface = SunsetOnSurface,
    outline = SunsetBorder,
    surfaceVariant = SunsetSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val SunsetDarkColorScheme = darkColorScheme(
    primary = Color(0xFFFF5F7E),
    secondary = Color(0xFFFF9F29),
    tertiary = Color(0xFFFFD075),
    background = Color(0xFF1B0F13),
    surface = Color(0xFF2B191E),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFFFECEF),
    onSurface = Color(0xFFFFECEF),
    outline = Color(0xFF5E3942),
    surfaceVariant = Color(0xFF3C242A),
    error = WrongRed,
    onError = Color.White
)

private val MidnightColorScheme = lightColorScheme(
    primary = MidnightPrimary,
    secondary = MidnightSecondary,
    tertiary = MidnightTertiary,
    background = MidnightBg,
    surface = MidnightSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = MidnightOnSurface,
    onSurface = MidnightOnSurface,
    outline = MidnightBorder,
    surfaceVariant = MidnightSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

private val MidnightDarkColorScheme = darkColorScheme(
    primary = Color(0xFFA3C7D7),
    secondary = Color(0xFF624F82),
    tertiary = Color(0xFF3F3B6C),
    background = Color(0xFF0D0C14),
    surface = Color(0xFF161421),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = Color(0xFFECECFF),
    onSurface = Color(0xFFECECFF),
    outline = Color(0xFF29253B),
    surfaceVariant = Color(0xFF1F1C2E),
    error = WrongRed,
    onError = Color.White
)

// Studio — the flagship / default theme (docs/BrandIdentity.md). Warm "lobby" light: off-white paper,
// graphite ink, Studio Indigo as the brand/active primary, Amber as the earned tertiary.
private val StudioColorScheme = lightColorScheme(
    primary = StudioPrimary,
    secondary = StudioSecondary,
    tertiary = StudioTertiary,
    background = StudioBg,
    surface = StudioSurface,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = StudioOnSurface,
    onSurface = StudioOnSurface,
    outline = StudioBorder,
    surfaceVariant = StudioSurfaceCard,
    error = WrongRed,
    onError = Color.White
)

// Studio dark — the higher-contrast "Arena/stadium" surface: deep graphite-indigo ground, lifted
// indigo primary, amber for earned. Dark text on the lighter accents for legibility.
private val StudioDarkColorScheme = darkColorScheme(
    primary = Color(0xFF8E9BD6),
    secondary = Color(0xFF5FB3A1),
    tertiary = Color(0xFFE6B36A),
    background = Color(0xFF15171F),
    surface = Color(0xFF1C1F2A),
    onPrimary = Color(0xFF12152B),
    onSecondary = Color(0xFF06231C),
    onTertiary = Color(0xFF2A1B05),
    onBackground = Color(0xFFECEDF4),
    onSurface = Color(0xFFECEDF4),
    outline = Color(0xFF2E3344),
    surfaceVariant = Color(0xFF232838),
    error = WrongRed,
    onError = Color.White
)

object ThemeManager {
    var currentTheme by mutableStateOf("studio")
    var isDarkMode by mutableStateOf(false)

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        currentTheme = prefs.getString("current_theme", "studio") ?: "studio"
        isDarkMode = prefs.getBoolean("is_dark_mode", false)
    }

    fun saveSettings(context: Context) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("current_theme", currentTheme)
            putBoolean("is_dark_mode", isDarkMode)
            apply()
        }
    }
}

// Theme-key → color scheme. Extracted so NumeraTheme, VaultTheme, and any future focused surface
// resolve the same mapping instead of re-listing every theme. Unknown keys fall back to Studio.
internal fun darkColorSchemeFor(themeKey: String): ColorScheme = when (themeKey) {
    "duolingo", "theme_duolingo" -> DuoDarkColorScheme
    "cyberpunk", "theme_cyberpunk" -> CyberDarkColorScheme
    "eclipse", "theme_eclipse", "neon_eclipse", "theme_neon_eclipse" -> EclipseDarkColorScheme
    "emerald", "theme_emerald", "emerald_abyss", "theme_emerald_abyss" -> EmeraldDarkColorScheme
    "crimson", "theme_crimson", "crimson_nebula", "theme_crimson_nebula" -> CrimsonDarkColorScheme
    "aurora", "theme_aurora" -> AuroraDarkColorScheme
    "ocean", "theme_ocean" -> OceanDarkColorScheme
    "sunset", "theme_sunset" -> SunsetDarkColorScheme
    "midnight", "theme_midnight" -> MidnightDarkColorScheme
    "studio", "theme_studio" -> StudioDarkColorScheme
    else -> StudioDarkColorScheme
}

internal fun lightColorSchemeFor(themeKey: String): ColorScheme = when (themeKey) {
    "duolingo", "theme_duolingo" -> DuoColorScheme
    "cyberpunk", "theme_cyberpunk" -> CyberColorScheme
    "eclipse", "theme_eclipse", "neon_eclipse", "theme_neon_eclipse" -> EclipseColorScheme
    "emerald", "theme_emerald", "emerald_abyss", "theme_emerald_abyss" -> EmeraldColorScheme
    "crimson", "theme_crimson", "crimson_nebula", "theme_crimson_nebula" -> CrimsonColorScheme
    "aurora", "theme_aurora" -> AuroraColorScheme
    "ocean", "theme_ocean" -> OceanColorScheme
    "sunset", "theme_sunset" -> SunsetColorScheme
    "midnight", "theme_midnight" -> MidnightColorScheme
    "studio", "theme_studio" -> StudioColorScheme
    else -> StudioColorScheme
}

@Composable
fun NumeraTheme(
    darkTheme: Boolean = ThemeManager.isDarkMode,
    content: @Composable () -> Unit
) {
    val themeKey = ThemeManager.currentTheme
    val colorScheme = if (darkTheme) darkColorSchemeFor(themeKey) else lightColorSchemeFor(themeKey)

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}

/**
 * The Arena "stadium" surface (docs/BrandIdentity.md §4.2). Live matches always render on the
 * focused, higher-contrast dark Studio scheme — regardless of the player's chosen theme — so a match
 * *feels* like a match (the "lobby vs. stadium" rule). Wrap a duel/match screen in this; screens that
 * use `MaterialTheme.colorScheme.*` tokens (no hardcoded colors) restyle automatically.
 */
@Composable
fun ArenaStadiumTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = StudioDarkColorScheme,
        typography = Typography,
        content = content,
    )
}

/**
 * The Shop "Vault" surface (docs/ShopOverhaul.md §3). The shop is a premium, museum-case dark
 * surface — its rarity frames, glows, and light-on-dark text depend on a dark ground — but unlike
 * the Arena it **tints to the player's equipped theme** (Studio → graphite-indigo + amber, Ocean →
 * navy + cyan, …) rather than always Studio, so the Vault feels like *their* collection. Wrap the
 * shop in this; everything inside reads `MaterialTheme.colorScheme.*` and restyles automatically.
 */
@Composable
fun VaultTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorSchemeFor(ThemeManager.currentTheme),
        typography = Typography,
        content = content,
    )
}
