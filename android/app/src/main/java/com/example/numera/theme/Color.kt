package com.example.numera.theme

import androidx.compose.ui.graphics.Color

// Shared colors
val CorrectGreen = Color(0xFF58CC02) // semantic "correct answer" green (feedback only — NOT a brand color)
val CorrectGreenPressed = Color(0xFF46A302)
val WrongRed = Color(0xFFEA2B2B)
val WrongRedPressed = Color(0xFFC21818)

// ── Studio — the flagship / default theme (see docs/BrandIdentity.md) ────────────────────────────
// The brand surface for "the competitive home of math": warm off-white paper, graphite ink, and a
// two-tone arc — Studio Indigo = active / training (brand primary), Amber = earned (rank, wins,
// mastery). Replaces the borrowed Duolingo skin as the default; secondary is a refined teal accent.
val StudioBg               = Color(0xFFFBFAF8) // warm off-white "paper"
val StudioPrimary          = Color(0xFF4C5BA6) // Studio Indigo — brand / active / training
val StudioPrimaryPressed   = Color(0xFF3A4680)
val StudioSecondary        = Color(0xFF2E7D6B) // refined teal — secondary accent
val StudioSecondaryPressed = Color(0xFF245C50)
val StudioTertiary         = Color(0xFFD99A4E) // Amber — earned (rank, wins, mastery)
val StudioTertiaryPressed  = Color(0xFFB97E33)
val StudioSurface          = Color(0xFFFFFFFF)
val StudioSurfaceCard      = Color(0xFFF4F2EC)
val StudioOnSurface        = Color(0xFF23262B) // graphite ink
val StudioBorder           = Color(0xFFECE9E4)
val StudioSubtext          = Color(0xFF7C7A74)

// Duolingo Theme (legacy alternate — no longer the default; kept as a selectable theme)
val DuoBg = Color(0xFFFFFFFF)
val DuoPrimary = Color(0xFF58CC02) 
val DuoPrimaryPressed = Color(0xFF46A302)
val DuoSecondary = Color(0xFF1899D6) // Accent Blue
val DuoSecondaryPressed = Color(0xFF1482B5)
val DuoTertiary = Color(0xFFFF9600) // Accent Orange
val DuoTertiaryPressed = Color(0xFFE68500)
val DuoSurface = Color(0xFFFFFFFF)
val DuoSurfaceCard = Color(0xFFF7F7F7)
val DuoOnSurface = Color(0xFF3C3C3C)
val DuoBorder = Color(0xFFE5E5E5)
val DuoSubtext = Color(0xFF777777)

// Cyberpunk (Adapted to bright/rich flat 3D)
val CyberBg = Color(0xFFFAF0FF)
val CyberPrimary = Color(0xFFBD00FF)
val CyberPrimaryPressed = Color(0xFF9000C7)
val CyberSecondary = Color(0xFF00C2FF)
val CyberSecondaryPressed = Color(0xFF009BCB)
val CyberTertiary = Color(0xFFFF007F)
val CyberTertiaryPressed = Color(0xFFCC0066)
val CyberSurface = Color(0xFFFFFFFF)
val CyberSurfaceCard = Color(0xFFF6EAFF)
val CyberOnSurface = Color(0xFF3D1B4F)
val CyberBorder = Color(0xFFE3C4FF)

// Neon Eclipse (Adapted to bright/rich flat 3D)
val EclipseBg = Color(0xFFFFFDF5)
val EclipsePrimary = Color(0xFFD18A00)
val EclipsePrimaryPressed = Color(0xFF9E6800)
val EclipseSecondary = Color(0xFFC76200)
val EclipseSecondaryPressed = Color(0xFF9E4E00)
val EclipseTertiary = Color(0xFF219EBC)
val EclipseTertiaryPressed = Color(0xFF1A7F96)
val EclipseSurface = Color(0xFFFFFFFF)
val EclipseSurfaceCard = Color(0xFFFFF6DF)
val EclipseOnSurface = Color(0xFF473C21)
val EclipseBorder = Color(0xFFFCE19B)

// Emerald Abyss (Adapted to bright/rich flat 3D)
val EmeraldBg = Color(0xFFF4FDF8)
val EmeraldPrimary = Color(0xFF00CD76)
val EmeraldPrimaryPressed = Color(0xFF009C5A)
val EmeraldSecondary = Color(0xFF00A2C9)
val EmeraldSecondaryPressed = Color(0xFF0082A2)
val EmeraldTertiary = Color(0xFF7D3CFF)
val EmeraldTertiaryPressed = Color(0xFF632FD1)
val EmeraldSurface = Color(0xFFFFFFFF)
val EmeraldSurfaceCard = Color(0xFFE6FAF0)
val EmeraldOnSurface = Color(0xFF0A301E)
val EmeraldBorder = Color(0xFFBFF2DB)

// Crimson Nebula (Adapted to bright/rich flat 3D)
val CrimsonBg = Color(0xFFFFF5F6)
val CrimsonPrimary = Color(0xFFFA2C56)
val CrimsonPrimaryPressed = Color(0xFFCD1A3E)
val CrimsonSecondary = Color(0xFFFF725E)
val CrimsonSecondaryPressed = Color(0xFFDB5A47)
val CrimsonTertiary = Color(0xFFAC0037)
val CrimsonTertiaryPressed = Color(0xFF86002A)
val CrimsonSurface = Color(0xFFFFFFFF)
val CrimsonSurfaceCard = Color(0xFFFFE8EC)
val CrimsonOnSurface = Color(0xFF4B101C)
val CrimsonBorder = Color(0xFFFFAEC0)

// Aurora Borealis Theme
val AuroraBg = Color(0xFFF3FAF7)
val AuroraPrimary = Color(0xFF008A72)
val AuroraPrimaryPressed = Color(0xFF006C59)
val AuroraSecondary = Color(0xFF845EC2)
val AuroraSecondaryPressed = Color(0xFF6B4B9E)
val AuroraTertiary = Color(0xFFD65DB1)
val AuroraTertiaryPressed = Color(0xFFB14E93)
val AuroraSurface = Color(0xFFFFFFFF)
val AuroraSurfaceCard = Color(0xFFE5F5F0)
val AuroraOnSurface = Color(0xFF1B3B32)
val AuroraBorder = Color(0xFFBBE5D9)

// Deep Ocean Theme
val OceanBg = Color(0xFFF0F7FA)
val OceanPrimary = Color(0xFF0078AA)
val OceanPrimaryPressed = Color(0xFF005F86)
val OceanSecondary = Color(0xFF3AB4F2)
val OceanSecondaryPressed = Color(0xFF289ECE)
val OceanTertiary = Color(0xFF009664)
val OceanTertiaryPressed = Color(0xFF00754E)
val OceanSurface = Color(0xFFFFFFFF)
val OceanSurfaceCard = Color(0xFFE1EFF5)
val OceanOnSurface = Color(0xFF0A2B3C)
val OceanBorder = Color(0xFFB0DAEC)

// Sunset Horizon Theme
val SunsetBg = Color(0xFFFFF7F2)
val SunsetPrimary = Color(0xFFFF5F7E)
val SunsetPrimaryPressed = Color(0xFFE04966)
val SunsetSecondary = Color(0xFFFF9F29)
val SunsetSecondaryPressed = Color(0xFFE0861A)
val SunsetTertiary = Color(0xFFC66900)
val SunsetTertiaryPressed = Color(0xFF9E5400)
val SunsetSurface = Color(0xFFFFFFFF)
val SunsetSurfaceCard = Color(0xFFFFF0E5)
val SunsetOnSurface = Color(0xFF3A1C0E)
val SunsetBorder = Color(0xFFFDD5C0)

// Bright "trophy" gold (cross-theme) — medals, stars, coin/level accents. The brighter sibling
// of MilestoneGold; previously inlined as Color(0xFFFFD700) in a dozen places.
val MedalGold          = Color(0xFFFFD700)
// Podium siblings of MedalGold — 2nd/3rd place. Complete the medal set so leaderboard ranks
// pull from one place instead of inlining silver/bronze hexes.
val MedalSilver        = Color(0xFFC0C0C0)
val MedalBronze        = Color(0xFFCD7F32)

// Transfer / "depth" accent (Sprint 4) — the violet of the transfer mastery dimension, distinct
// from the green/blue/orange/gold used by the other four dimensions.
val TransferViolet     = Color(0xFF8B5CF6)

// Semantic status accents (cross-theme) — used for risk/urgency/state badges and icons (e.g.
// commitment risk level, retention "fading"/"protected"). Danger + Info were each duplicated
// across CommitmentStatusDialog and MainTabsScreen before being centralised here.
val StatusDanger       = Color(0xFFEF5350)
val StatusWarning      = Color(0xFFFFB74D)
val StatusSuccess      = Color(0xFF66BB6A)
val StatusInfo         = Color(0xFF42A5F5)
// Light tinted containers + their legible on-container text, completing the Status* set. Used by
// status cards/badges (retention "fading"/"protected", notification kinds) so a status renders as
// one cohesive container/text/accent triple instead of three inlined hexes.
val StatusDangerContainer = Color(0xFFFFEBEE)
val StatusDangerText      = Color(0xFFC62828)
val StatusInfoContainer   = Color(0xFFE3F2FD)
val StatusInfoText        = Color(0xFF1565C0)

// Milestone Achievement (cross-theme — used for levels 10, 20, 30, 40, 50, 60)
val MilestoneGold      = Color(0xFFD4AF37)
val MilestoneGoldDark  = Color(0xFF9E7C00)
// Deep readable gold for text/buttons on gold-tinted surfaces (streak/level/milestone callouts);
// previously inlined as 0xFF856404 across MainTabsScreen and LevelMapScreen.
val MilestoneGoldText  = Color(0xFF856404)
val MilestoneBg        = Color(0xFFFFFDF0)
val MilestoneSurface   = Color(0xFFFFF9DF)
val MilestoneBorder    = Color(0xFFE6CA65)
val MilestoneOnSurface = Color(0xFF4C3E08)

// Midnight Galaxy Theme
val MidnightBg = Color(0xFFF5F5FA)
val MidnightPrimary = Color(0xFF3F3B6C)
val MidnightPrimaryPressed = Color(0xFF302B52)
val MidnightSecondary = Color(0xFF624F82)
val MidnightSecondaryPressed = Color(0xFF4C3C67)
val MidnightTertiary = Color(0xFFA3C7D7)
val MidnightTertiaryPressed = Color(0xFF88A9B8)
val MidnightSurface = Color(0xFFFFFFFF)
val MidnightSurfaceCard = Color(0xFFEFEFF7)
val MidnightOnSurface = Color(0xFF1C1A27)
val MidnightBorder = Color(0xFFCECEDF)
