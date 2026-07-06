# Visual Experience Sprint — July 2026

> **Mission:** a complete pass over how users *visually experience* Numera — coherence, hierarchy,
> premium microdetail, math-as-hero, storytelling, depth, iconography, accessibility, performance.
> **Method:** re-baselined the repo-wide drift metrics, audited every surface class against the
> 14 mission phases, shipped the highest-leverage code slices (verified green), and ranked the rest.
>
> **This document consolidates — it does not restart.** The June audits
> ([UiUxSimplificationAudit-2026-06](UiUxSimplificationAudit-2026-06.md),
> [MotionDesignAudit-2026-06](MotionDesignAudit-2026-06.md), [BrandIdentity](BrandIdentity.md),
> [DesignSystem](DesignSystem.md)) already established the visual language and shipped its first
> slices. This sprint's job was to *finish the system's adoption* and audit what they didn't cover.

---

## 0. TL;DR

**The visual language exists and is good; the sprint closed most of the remaining drift.**

| Drift category | June 2026 | Sprint start | Now |
|---|--:|--:|--:|
| `RoundedCornerShape(N.dp)` literals | 343 | 96 | **5** (intentional 2–4dp micro-radii) |
| Hand-picked `alpha = 0.6f` | ~160 | 12 | 12 (all in excluded art files) |
| ALL-CAPS shouting | app-wide | eyebrows only | eyebrows only (by design) |
| `Color(0x…)` literals | 175 (logic surfaces) | — | ~420 total incl. intentional art/avatar/particle palettes ([color-token audit](../docs/DesignSystem.md)) |
| Functional emoji | 341 lines / 60 files | — | 344 / 61 — **the biggest remaining category** |
| Raw `fontSize = N.sp` | ~"almost every Text" | — | 960 — but the clean-fit sweep is done; the rest is bespoke content type (by design) or per-screen judgment |

**Shipped this sprint (all verified: `assembleDebug` + full Robolectric suite green):**
1. **One radius rhythm, done.** 91 radius literals across 22 files tokenized onto `CornerRadius`
   (6/8→`s`, 10/12/14→`m`, 16/20→`l`, 24→`xl`). The 20dp Duolingo-era radius is gone app-wide;
   inputs sit at `m`, cards at `l`/`xl`, pills at `full`. Only five 2–4dp micro-radii on
   hairline-thin bars remain — below the token scale, intentional geometry.
2. **`RewardChip`** — one canonical coins/XP reward display (vector `NumeraIcon`s + tabular
   `NumeralStyle` figures) replacing the "🪙 12  ⭐ 30 XP" glyph-soup on quest rows and the
   daily-puzzle card. This is the template for retiring functional emoji elsewhere.
3. **`ClaimButton` retuned** — 48dp touch target via `minimumInteractiveComponentSize` (was ~30dp),
   semantic `CorrectGreen` tokens instead of hard-coded hexes (shimmer highlight now *derived*
   via `lerp(CorrectGreen, White, .35)`), token padding, sentence-case "Claim" matching every
   other claim CTA in the app. Pulse/shimmer energy kept — it's a reward moment.
4. **Math as hero (gameplay chrome demoted)** — the exercise header eyebrow dropped from a
   competing 14sp headline to a true 11sp caps eyebrow; "Exercise N of M" demoted to 12sp meta;
   the countdown timer and progress counter now render tabular digits (no jitter). The equation
   card is now unambiguously the loudest element on the screen.

**Shipped in round 2 (same session, verified green):**

5. **Shop tabs 9 → 6.** The three single-family grids (Titles / Effects / Themes) folded into the
   Cosmetics tab as in-body type-filter chips (the pattern `CosmeticsTab` already implemented);
   `FilteredGridTab` deleted, one `matchesTypeFilter` group predicate added ("effects" spans
   profile/victory/tap). Featured · Cosmetics · Utilities · Seasonal · Collection · Earnable remain —
   each functionally distinct, so 6 is the honest floor without hiding real destinations.
6. **Emoji → `NumeraIcon`, first structural pass.** The app-wide top bar (coins + level pills), the
   Vault wallet pill, and Profile's identity chips + stat-card eyebrows now use vector icons with
   tabular figures instead of 🪙⭐🔥🏅✨ glyphs. The 👑 Season-Token glyph stays (brand, per hybrid).
   **Batch 2:** gameplay hearts (❤️/🖤 → filled/hollow vector hearts — lives now read by *shape*,
   with a screen-reader count); the Review-Solution dialog title (💡 → Tip icon); the streak-repair
   button says "coins" instead of an inline 🪙. **Deliberately deferred:** the six quest-type icons
   need four *new* canvas icon types (pencil/puzzle/bolt/brain) — drawing those blind without a
   visual QA loop risks degrading quality, so they wait for the BlueStacks pass.
7. **A11y #75 verified already-resolved, not open.** Standings promo/demo chips carry text+arrows
   ("Promo ↗"/"Demotion ↘"); solo and duel MCQ answers both render ✓/✗ icons with content
   descriptions alongside color. Removed from the backlog.
8. **Launch on "what next" — DECIDED & SHIPPED (product call, user-approved 2026-07-06).** The app
   now opens on the home/Today tab (index 2) instead of Arena: the Today plan answers "what should
   I do now" in 0 taps. Arena keeps its nav prominence one tap away. BrandIdentity.md Phase 0
   amended in place to record the supersession.
9. **Profile Stats-tab rhythm (backlog #3, first slice).** The seven co-equal blocks now read as
   three groups: the learning story (stats grid → Skill Mastery → Growth Insights → weekly activity
   chart, with the chart moved up from between the collections), then a quiet "Customize" label +
   Inventory, then "Milestones" + Commitment Archive + Rank Rewards. Remaining for #3: the bespoke
   competitive-card token sweep (Competitive sub-tab), which is per-card judgment work.

---

## 1. Visual Experience Audit (Phase 1) — state of every surface class

Legend: ✅ coherent/on-system · 🟡 partial · 🔴 needs work

| Surface | State | Notes |
|---|---|---|
| Home / Dashboard (Quests tab) | ✅ | Fully swept (AppText, StandingRow, 2-tab collapse, RewardChip). The model screen alongside Shop. |
| Levels (Train / LevelMap) | 🟡 | Sub-tab descriptors de-capped; body still has bespoke sizes; daily-puzzle card now uses RewardChip. |
| Lessons (LessonScreen) | ✅ | Bespoke *reading* typography is deliberate (26sp title / 16sp body); section headers de-capped; radii tokenized. |
| Exercises (GameplayScreen) | ✅ | This sprint: chrome demoted, math leads, tabular timer. Feedback slot calmed in June. Remaining: hearts/timer emoji glyphs. |
| Visualizations (InteractiveVisual, ScratchPad) | ✅ | Canvas art palettes are intentional (color-token audit); excluded from sweeps. |
| Competitive (Arena, Duel, Tournament) | 🟡 | Energy is *by design* (brand: math as sport). Radii tokenized this sprint. Rating count-ups tabular. Emoji-heavy headers remain. |
| Daily Puzzle | ✅ | RewardChip'd this sprint; rotation/anti-repeat solid. |
| Archive | 🟡 | ArchiveComponents radii tokenized; empty states on-system. |
| Mistake Bank | ✅ | Uses NumeraEmptyState (Mistakes illustration). |
| Shop ("The Vault") | ✅ | Still the most disciplined surface; model for the rest. Tabs grouped 9 → 6 this sprint (cosmetic families = one grid + filters). |
| Achievements | 🟡 | ClaimButton fix lands here (Profile); family/rarity system good; emoji in badges intentional (celebration). |
| Profile / Statistics | 🟡 | Headers swept; body + bespoke cards (CompetitiveRankCard, RivalsCard) still per-screen judgment. |
| Notifications | ✅ | Dialog + empty state on-system. |
| Settings | ✅ | Decluttered in June (dup controls removed, quick-tiles removed, full AppText sweep). In-screen search removal still open (structural). |
| Search (CommandPalette) | ✅ | On-system, has empty state. |
| Loading | ✅ | Branded loaders + skeletons (PremiumLoader, Skeletons.kt); radii tokenized this sprint. |
| Errors / Empty states | ✅ | `NumeraEmptyState`: one line-art illustration language, themed, breathing (reduce-motion aware), CTA slot. |
| Dialogs / Bottom sheets / Slide-overs | ✅ | Radii tokenized this sprint (SaveProgress, SaveOptions, ReportProblem, ReviewSolution, Classes, TipOverlay). |
| Auth / Placement | ✅ | Radii tokenized; AuthScreensTest guards render. |

**Weak-composition findings that remain real** (carried into the backlog): functional emoji as
iconography (344 lines); launch tab ≠ "what should I do now"; Shop's 9-chip tab scroll; Profile
body density; the two-eyebrow header on gameplay (mode label + category label).

## 2. Visual design language (Phase 2) — the system, as now enforced

- **Radii:** `s` 8 (badges/chips) · `m` 12 (inputs, compact controls) · `l` 16 (cards, buttons)
  · `xl` 24 (hero cards, sheets) · `full` (pills, progress). *Sub-token micro-radii (2–4dp) are
  permitted only on sub-8dp-tall elements.* **Enforced app-wide as of this sprint.**
- **Borders:** neutral cards = 1dp hairline `outline @ 0.4α`; accent (selected/complete/promo/self)
  = 2dp semantic color. No other border treatments.
- **Elevation:** `Elevation` tokens; depth via layering + scrims, not shadows-on-everything.
- **Spacing:** `Spacing` 4/8/12/16/24/32/48. **Type:** M3 scale via `AppText` semantic roles for UI
  chrome; bespoke reading scale for lesson/equation content (deliberate boundary); `NumeralStyle`
  tabular digits wherever figures change (scores, timers, counts, balances).
- **Alpha:** `Alpha.secondary` .70 / `hint` .50 / `disabled` .38 — no hand-picked muting.
- **Color:** semantic tokens for meaning (Correct/Wrong/medals/rarity); theme palettes for chrome;
  literal hexes only in art (avatars, particles, canvas illustrations).
- **Voice/case:** sentence case everywhere; tiny caps eyebrows only; ALL-CAPS shouts reserved for
  celebration moments (RANKED UP / MASTERY UP / LEVEL UP) per the hybrid calm/energy direction.
- **Illustration:** `EmptyIllustration` line-art language (4dp round stroke, theme-tinted, soft
  pedestal circle, sparkle accents) — the house style for any new spot art.
- **Motion:** `MotionTokens` + `pressable` (see MotionDesignAudit); reduce-motion gates everything.

## 3. Rhythm, storytelling, depth (Phases 3/6/8)

- The hybrid direction **is** the storytelling system: calm token-true base = "learning is focused
  work"; borders/caps/particles budgeted to competitive & reward moments = "competition is
  prestigious, mastery is celebrated." This is decided and consistently applied; new work must
  spend energy from the same budget, not add new dialects.
- Screen rhythm (dense → breathing → focus → support) is healthiest on Dashboard, Shop, and
  Gameplay (post-answer progressive disclosure). Weakest on Profile (unbroken card stack) —
  see backlog.
- Depth: elevation + scrims + rarity-scaled reveals only where meaning exists (sheets, celebration,
  focus). No decorative blur/glass anywhere — keep it that way; Compose blur is also a perf tax.

## 4. Phases already covered by prior shipped systems (do not rebuild)

- **Feedback (Phase 5):** press feedback app-wide (`pressable` rollout), one-moment-one-sound audio
  vocabulary, correct/wrong/unlock/purchase/rank-change all have distinct visual+audio+haptic
  signatures. Complete.
- **Illustration (Phase 9):** `NumeraEmptyState` language shipped; achievements/rarity system
  shipped. Remaining: adopt the same line-art style if success/loading spot-art is ever added.
- **Iconography (Phase 10):** `NumeraIcon` family (consistent stroke, a11y labels, 24-type set)
  exists; the gap is *adoption* — 344 emoji lines still act as icons. RewardChip is the pattern.
- **Accessibility (Phase 13):** icon labels (#74) done; reduce-motion done; alpha-contrast
  standardized; ClaimButton 48dp fixed this sprint. Open: color-only state (#75), remaining
  sub-48dp chips, a font-scale QA pass.
- **Performance (Phase 12):** infinite animations gated behind reduce-motion (June); no blur/glass;
  Canvas art is cheap line work; tap-effects observe-don't-consume. No new effects added this
  sprint — by design.

## 5. Ranked backlog (Learning · Visual · Trust · Effort — H/M/L)

| # | Recommendation | Learn | Visual | Trust | Effort |
|---|---|:--:|:--:|:--:|:--:|
| 1 | **Emoji → `NumeraIcon`, continue the rollout** (round 2 did the top bar, Vault wallet, Profile chips; ~330 lines remain — section headers, quest icons, LevelMap/Arena chrome; keep celebration emoji). Extend the icon set as needed (Hearts, Timer, Puzzle). RewardChip is the template. | M | **H** | M | M |
| 2 | ~~Launch on "what next"~~ — **shipped**: the app opens on the home/Today tab (user-approved product call; BrandIdentity Phase 0 amended). | **H** | M | M | L |
| 3 | **Profile body rhythm** — break the unbroken card stack: hero identity → stats → competitive → collections, with section breathing; sweep bespoke cards onto tokens where they're chrome (not art). | L | **H** | M | M |
| 4 | **Settings search removal** — structural (`allSettingsList` is the screen's backbone); pair with collapsible groups. Test net now exists. | L | M | L | **H** |
| 5 | **Gameplay two-eyebrow merge** — largely defused by the round-1 eyebrow demotion (mode label is now the single louder label by design); revisit only if BlueStacks QA disagrees. | M | L | L | L |
| 6 | **BlueStacks visual QA pass** — light/dark × font-scale × reduce-motion over the swept screens; the one thing code-grounded audits can't prove. | M | M | **H** | L |
| 7 | **Per-screen `fontSize` judgment sweeps** (Arena, LevelMap bodies) — only where a raw size is UI chrome, never content type. | L | M | L | M |
| 8 | **Split Settings/Profile files** by responsibility (render tests now guard it). Code health, not pixels. | L | L | L | **H** |

*(Resolved since first draft: Shop tab grouping — shipped 9→6; color-only state #75 — verified
already satisfied on every flagged surface.)*

## 5b. BlueStacks visual QA pass — DONE (2026-07-06, screenshots in session scratchpad)

Guest session, fresh APK, live server. **Verified on device:** launch lands on the Today plan
(the existing "Your home base" spotlight now matches the landing); top-bar coins/level pills render
vector icons + tabular figures; RewardChip on quest rows and the Train daily-puzzle card; Shop shows
6 tabs (all fit without scrolling) with the full Cosmetics filter row; Profile identity chips are
vector (flame/coin/trophy) and the "Milestones" group label + learning-story order read correctly;
gameplay header is a true quiet eyebrow with the equation as hero; wrong answer = red + ✗ (correct
stays hidden), reveal = green + ✓; "Solution breakdown" dialog carries the Tip icon.

**The QA pass also caught a real shipped server bug** (fixed + guarded, commit 9c71b9b): the
`shop_items` type CHECK constraint predated Stage D, so all 22 title/effect/victory/tap/frame
cosmetics were silently dropped by the `INSERT OR IGNORE` seed on every boot — the live-cosmetics
catalog never existed in any running DB, and the old Titles/Effects tabs were always empty. Fixed
the CHECK, added `test/shopSeedIntegrity.test.js` (pins every seeded family + asserts the catalog
serves them), verified the recovered items render in the app. This is the argument for visual QA
in one screenshot: code-grounded audits and 1240 passing tests never noticed an empty product surface.

## 6. Remaining weaknesses (honest list)

1. **The emoji dialect is the last big incoherence** — 344 lines across 61 files mixing Unicode
   rendering with the crisp vector language. Mechanical-ish but large; needs the icon set extended
   first (quest-type icons: pencil/puzzle/bolt/brain — now unblocked, since the QA loop exists).
2. ~~No device-screenshot verification~~ — **done** (§5b); hearts-in-level-mode is the one changed
   surface not directly screenshotted (daily-puzzle mode has no hearts).
3. **Brand tension is managed, not eliminated** — competition-first energy vs. calm learning base
   is a budget, and every new feature will try to overspend it. The design-language section above
   is the contract; hold the line in review.
4. **960 raw `fontSize` literals** — the majority are now either bespoke content type (by design)
   or celebration surfaces (by design); the residue is per-screen judgment work, not a sweep.

---
*Sprint date 2026-07-06. Verified: `gradlew assembleDebug` + `testDebugUnitTest` (full Robolectric
suite) green. Companions: UiUxSimplificationAudit-2026-06.md (foundation), DesignSystem.md (tokens),
BrandIdentity.md (identity), MotionDesignAudit-2026-06.md (motion), SoundDesign.md (audio).*
