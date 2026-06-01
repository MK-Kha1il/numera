# Design System (Android)

Numera's UI is built on **design tokens + a Material3 theme + a reusable component library**,
so screens compose from consistent parts instead of hand-rolling spacing, color, and feedback.

## Tokens — `theme/DesignTokens.kt`
Single source for non-color design values:
- `Spacing` (zero/xs/s/m/l/xl/xxl/xxxl → 0–48dp)
- `CornerRadius` (s/m/l/xl/full)
- `IconSize` (s/m/l/xl)
- `Elevation` (none/card/raised/modal)
- `AnimDuration` (instant…entrance, in ms)
- `Alpha` (disabled/hint/secondary/high/full)

**Typography is NOT here.** It lives in `theme/Type.kt` as the Material3 `Typography` object
(wired in `Theme.kt`) and is consumed via `MaterialTheme.typography.*`. A duplicate
`AppTypography` object was removed so there is one source of truth for type.

## Color — `theme/Color.kt` + `theme/Theme.kt`
Named color tokens (brand greens, rarity colors, milestone golds, etc.) feed the Material3
color scheme. Prefer `MaterialTheme.colorScheme.*` / named tokens over raw `Color(0x…)` so
theming (multiple selectable themes) stays consistent.

## Component library — `ui/components/`
- **Primitives:** `DuoButton`, `GlassCard`/`DuoCard`, `NumeraIcon` (+ `PremiumIcons` Canvas
  glyphs), inputs.
- **Feedback & perceived performance:** `Feedback` (global toasts via `LocalToast` +
  `NumeraToastHost`, mounted once in `MainTabsScreen`), `Skeletons` (typed shimmer
  placeholders), `EmptyState`, `SmartProgress`, `Optimistic` (`runOptimistic`).
- **Lists/search:** `SearchField` (`rememberDebouncedValue`), `Pagination`
  (`rememberInfiniteScroll`, `rememberRevealWindow`).
- **Premium interaction:** `CommandPalette` (global search via `LocalCommandPalette`),
  `BottomSheet`, `Breadcrumbs`, `ContextMenu`, `QuickPreview`, `SlideOverPanel`,
  `SmartFilters`, `QuickActions`, `ProgressiveDisclosure`.
- **Domain visuals:** `MathText` (LaTeX-aware text), `InteractiveVisual` (WebView host for
  the canvas manipulatives), `ScratchPad`, `Avatar`, `VictoryParticles`.

All components are token-driven and build on the primitives + `LocalToast` CompositionLocal
pattern. New components should follow the same conventions.

## Conventions
- **Use tokens, not literals.** New/edited screens should use `Spacing.*`, `CornerRadius.*`,
  `MaterialTheme.typography.*`, and color tokens rather than raw `16.dp` / `Color(0x…)`.
  (The component library already does; the large legacy screens still carry raw values and
  are migrated as they're split into `ui/feature/<domain>/` — a sprint follow-up.)
- **Mount global hosts once** (toast, command palette) at the `MainTabsScreen` shell, exposed
  via CompositionLocals — don't re-instantiate per screen.
- **No CDN dependency** for the interactive canvas (offline/instant) — see MathEngine.md.
