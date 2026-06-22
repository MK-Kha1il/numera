# Design system

All visual values come from tokens in `android/.../theme/`. **No raw `16.dp`, `Color(0x…)`, or
`RoundedCornerShape(…)` literals in new code** — use a token. Depth:
[docs/DesignSystem.md](../docs/DesignSystem.md) (the tokens) and
[docs/BrandIdentity.md](../docs/BrandIdentity.md) (the world/voice/motion the tokens implement).

## Files (`theme/`)

| File | Holds |
|---|---|
| `Color.kt` | Color tokens (the "Studio" palette: warm light, indigo→amber; plus `SeasonGold`, `MedalSilver/Bronze`, `Status*`, rarity accents). The Duolingo-green era is retired. |
| `Type.kt` | Typography scale (Material3 `Typography`). |
| `Theme.kt` | `NumeraTheme` (Material3) + `ArenaStadiumTheme` (forced dark "stadium" surface for live duels) + `VaultTheme` (shop tinted to the equipped theme). |
| `DesignTokens.kt` | Spacing, radius, elevation, and `AnimDuration` (`xslow`/`slow`/`entrance`…) motion timings. |
| `Rarity*` / `RankBadge` | Cosmetic rarity accents (incl. `RarityMythicIridescent`) and animated rank crests. |

## Brand stance (don't drift from this)

- **Competition-first.** Math is a sport: the Arena is the main stage, learning is "training."
- **Studio visual** — warm light surfaces, indigo→amber accent. Kept deliberately.
- **Competitor-to-competitor voice** — the old "Mentor" persona was deleted. Copy is peer/rival
  voice, not a teacher talking down. Use "rating/rank", not legacy "ELO" copy.
- **Bronze→Grandmaster** rank names kept; **league** uses the stone ladder (Quartz→Obsidian).

## Motion

Primitives **Trace / Warm / Link** (see BrandIdentity §motion) over `AnimDuration` timings.
Respect accessibility: `MotionManager` (singleton; in-app toggle OR OS animator-scale=0) gates
confetti and looping background motion — new looping/celebratory animation must check it.

## Components

Reusable widgets live in `ui/components/` (`DuoButton`, `GlassCard`, `NumeraIcon`, toasts,
skeletons, empty states, command palette, bottom sheet, breadcrumbs, slide-over). They are
token-driven and mounted once via CompositionLocals where global (`LocalToast`,
`LocalCommandPalette` in `MainTabsScreen`). Prefer composing these over hand-rolling.

## Accessibility tokens-of-behavior

- `NumeraIcon` carries per-type screen-reader labels (override when an icon is decorative-only).
- Math content has a screen-reader path (`MathText`/`MathSpeech`); the KaTeX `MathText` WebView
  has a **test seam** (renders plain text under Robolectric) so UI tests settle reliably.
