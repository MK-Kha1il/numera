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

## Motion — `theme/Motion.kt`
The app-wide animation language. `AnimDuration` supplies durations; `MotionEasing` supplies
the curve shapes and `Motion` the canned specs/transitions:
- **Entrances decelerate** (`Motion.enter` / `Motion.contentEnter()`),
- **exits accelerate** (`Motion.exit` / `Motion.contentExit()`),
- **on-screen moves use standard** (`Motion.standard`),
- **only rewards overshoot** (`Motion.rewardSpring` / `Motion.rewardEnter()`) — celebration
  pops are springy; informational motion stays calm.
New animation code should take its spec from here instead of `tween(300)` with default easing.

## Rarity — `theme/Rarity.kt`
The cross-feature collectible language. The `Rarity` enum (Common→Mythic) owns each tier's
accent `color`, `borderBrush`, `glow` strength, and the `isPrestige` threshold (Epic+) so an
item's tier reads identically in the shop, the purchase reveal, and the profile collection.
Parse server strings with `Rarity.from(...)` (tolerant; unknown → Common — covered by
`RarityTest`). `ui/feature/shop/shopUtils.kt` keeps thin string adapters for old call sites.

## Achievement families — `ui/components/Avatar.kt` (`AchievementBadge`)
Every achievement badge derives a **family** (streak/learning/precision/mastery/social/
duels/exploration/collection/seasonal/elite) from its id or display value, and a **tier**
from its trailing arabic/roman number. The family owns the hue pair + motif ladder; the
tier escalates the frame (ring color/width + pips). So color answers "which family?" and
the frame answers "how far?" — and newly seeded chain rungs inherit their look automatically.
The dark shop surfaces (`ShopBackground` + rarity cards + the purchase-reveal dialog) are
intentionally theme-independent dark; text on them uses `Color.White.copy(...)`, never
`onSurface`, so they stay legible in light themes.

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
