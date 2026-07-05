# UI/UX Simplification & Premium-Polish Audit — June 2026

> **Scope:** the entire Jetpack Compose client (`android/app/src/main/java/com/example/numera/ui`),
> 75 UI files. **Goal (per brief):** remove friction; make the app feel *premium, calm, focused,
> approachable, fast* — Apple / Linear / Arc / Chess.com / Supercell / Notion — **without a redesign**.
> **Method:** read the design-token foundation, the shared primitives (`DuoCard`/`DuoButton`),
> navigation, and the four highest-traffic surfaces (Dashboard, Gameplay, Shop, Settings), plus
> repo-wide drift measurements.

---

## TL;DR — the three findings that matter

1. **You already have a good design system; the app just doesn't use it.** `theme/DesignTokens.kt`
   (spacing 4/8/12/16/24/32/48, radius, icon, elevation, alpha) and `theme/Type.kt` (full M3 type
   scale + `NumeralStyle`) are clean and complete. But the screens bypass them:
   **694 raw `.dp`**, **343 `RoundedCornerShape(`**, **175 `Color(0x…)`** literals, and almost every
   `Text` hardcodes `fontSize = …sp` instead of `MaterialTheme.typography.*`. The premium feeling is
   lost not to bad taste but to **drift** — a thousand small inconsistencies. This is the highest-leverage
   fix and it's mostly mechanical.

2. **The base card fights the brief.** `DuoCard` (the primitive behind ~every surface) paints a **2dp
   visible border on every card**, uses an off-scale `RoundedCornerShape(20.dp)`, and a literal
   `.padding(16.dp)`. `DuoButton` **UPPERCASES every label**. That's a loud, Duolingo-era aesthetic. The
   brief asks for Linear/Arc/Apple calm — which is achieved primarily by *removing borders*, softening to
   elevation/hairlines, and using sentence case. Retuning these two primitives changes the feel of the
   whole app in one edit.

3. **Density and duplication, not missing features.** Settings is **2,220 lines** with a *search box
   inside it* and **"Reduce Motion" listed twice** (plus a third "Animation Intensity" slider). The home
   surface ("Quests" tab) nests **3 sub-tabs**, two of which are leaderboards. The bottom nav opens on
   **Arena**, so "what should I do today" (the Today plan) is **two navigations from launch**. The app is
   bloated because secondary information is shown at full weight everywhere at once.

**What's already good (keep & propagate):** the Shop ("The Vault") is the most disciplined surface in the
app — proper token use, bottom sheets instead of scroll-jumps, chip tabs, rarity-scaled reveals. It is the
model the rest should follow. The motion system (`MotionManager`, reduce-motion gating), `pressable`
feedback rollout, a11y icon labels, and the recently-started subtractive work (see the "removed the
QuickActionsBar… it duplicated bottom-nav" comments in `DashboardScreen.kt:196`) are all the right
instincts — this audit extends them, it doesn't reverse them.

---

## 1. UI Audit (what's on screen)

| Area | Finding | Evidence |
|---|---|---|
| **Card chrome** | 2dp border + gradient fill on *every* card → heavy, "outlined-everything" look. Premium UIs use a single elevation/hairline language, not a border on every box. | `GlassCard.kt:52-58` |
| **Corner radius** | Base card is `RoundedCornerShape(20.dp)` — off the 8/12/16/24 token scale. 343 raw `RoundedCornerShape(` calls across 75 files → radii drift (7,10,16,20,24…). | `GlassCard.kt:41`, repo grep |
| **Typography** | Screens set raw `fontSize`/`fontWeight` per-`Text` (e.g. Dashboard uses 10/11/12/13/14/15/16/18/22/32 sp ad-hoc). The M3 type scale in `Type.kt` is essentially unused outside theme wiring. | `DashboardScreen.kt:267-360`, `SettingsScreen.kt:168-660` |
| **Secondary text** | `onSurface.copy(alpha = 0.6f)` hardcoded everywhere instead of the `Alpha.secondary`/`Alpha.hint` tokens (0.70/0.50). Inconsistent muting. | `SettingsScreen.kt` (~30×), `DashboardScreen.kt` |
| **Emoji as iconography** | **341 emoji occurrences across 60 files** — quest icons (✏️⚔️❌🧩⚡🧠), section titles ("🌍 Global Leaderboard", "🎨 Equipped Theme"), reward strings ("🪙 12  ⭐ 30 XP"). Inconsistent metaphors, mixed rendering, not crisp. | repo grep, `DashboardScreen.kt:299-360` |
| **ALL-CAPS** | Button labels (`DuoButton` `.uppercase()`), eyebrows ("THE VAULT", "✦ PREVIEW ✦", "✧ UNLOCKED ✧", "CLAIM"). Reads shouty rather than premium. | `GlassCard.kt:169`, `ShopScreen.kt:299,422` |
| **Loud literal colors** | `ClaimButton` hardcodes Duolingo green `Color(0xFF58CC02)` rather than a theme/semantic token → bypasses theming. | `GlassCard.kt:350` |
| **Nested tabs** | Home ("Quests" tab) is a `TabRow` of *Daily Drills / Weekly Leagues / Global Standings* — three purposes in one tab; two are leaderboards. | `DashboardScreen.kt:181-194` |
| **Oversized screens** | Settings 2,220 · Profile 1,870 · LevelMap 1,303 · Gameplay 1,280 · SoloGame 1,006 lines — too much packed per surface. | line counts |

## 2. UX Audit (how it flows)

- **"Where am I / what next" is buried.** Launch lands on **Arena** (`MainTabsScreen.kt:64`, `selectedTab=1`).
  The server-composed **Today plan** ("review → learn → puzzle → duel") — the single best answer to "what
  should I do now" — lives inside the **Quests** tab (index 2) *and* below a sub-tab row. Two hops from cold open.
- **Leaderboards appear in ≥3 places:** Weekly Leagues + Global Standings (both Dashboard sub-tabs) + the
  Arena/Season surfaces. Redundant competitive views compete for the same attention.
- **Settings has a search field** (`SettingsScreen.kt:707`). A settings screen that needs internal search is
  a signal it's too dense — the answer is fewer, grouped options, not search.
- **Three overlapping motion controls** in Settings: "Reduce Motion" (`:282`), "Reduced Motion" (`:402`),
  and "Animation Intensity" slider (`:443`). Two of these are the same concept.
- **Quick-toggle tiles duplicate full rows.** Settings shows compact Dark/Haptic/Audio tiles (`:815-876`)
  *and* full rows for the same toggles below — the user sees each control twice.
- **Nav display order ≠ index wiring** (`MainTabsScreen.kt:636-644`): Arena=1, Train=0, Quests=2… an
  intentional-but-surprising mapping that makes back/restore logic (`previousTab`) harder to reason about.

## 3. Clutter Report (rank-ordered by noise removed)

1. **Per-card 2dp borders** — the single biggest source of visual noise; appears on every card app-wide.
2. **341 emoji** used as functional icons + in headings — replace with the existing `NumeraIcon` set on
   structural surfaces; keep emoji only where they're genuinely decorative/celebratory.
3. **Settings duplication** — duplicate motion toggles, duplicate quick-tiles-vs-rows, in-screen search.
4. **Verbose helper paragraphs in cards** — e.g. the league rules paragraph (`DashboardScreen.kt:447-452`),
   "All-time rankings of top Numera solvers worldwide by total XP" (`:614`). Move to tooltips/info sheets.
5. **Reward micro-strings** — "🪙 12  ⭐ 30 XP" dense glyph soup; standardize a `RewardChip`.
6. **Redundant leaderboard surfaces** — collapse Weekly/Global/Season into one ranked surface with a filter.
7. **ALL-CAPS labels & eyebrows** — sentence case throughout except short system badges.

## 4. Components to Remove / Collapse

- **Duplicate motion controls** → one "Reduce motion" toggle (already backed by `MotionManager`); delete the
  second toggle and fold "Animation Intensity" into it (or remove — it overlaps reduce-motion).
- **Settings search field** → removed once sections are grouped and collapsible.
- **Quick-toggle tile strip in Settings** (`:815-876`) → redundant with the rows; keep one representation.
- **Dashboard sub-tab row** → promote "Today's drills" to the landing surface; move Weekly/Global into a
  single "Standings" entry rather than two always-rendered tabs.
- **`GlassCard` / `NeonButton` / `NeonText` legacy aliases** (`GlassCard.kt:181-230`) → fold callers onto the
  canonical `DuoCard`/primary button so there's one card and one button name.
- **One of the two leaderboard list bodies** in `DashboardScreen` (Weekly vs Global are near-identical
  `DuoCard` rows, ~120 duplicated lines) → extract a single `StandingRow`.

## 5. Components to Simplify / Systematize

- **`DuoCard`** → `surfaceVariant` fill, **no default border** (border becomes an *opt-in* state for
  "actionable/selected" only), radius from `CornerRadius.l`/`xl`, padding from `Spacing.l`.
- **`DuoButton`** → drop `.uppercase()`; replace the 27-branch `when(color)` pressed-color map with a
  single derived "pressed = darken(color)" or a small theme lookup.
- **Typography** → add `theme/TextStyles.kt` semantic styles (`SectionTitle`, `RowTitle`, `RowSubtitle`,
  `Caption`, `Stat`) mapping onto the M3 scale; sweep screens onto them.
- **Reward display** → one `RewardChip(coins, xp)` component (icon + tabular `NumeralStyle` figures).
- **Section header** → one `SectionHeader(title, subtitle?)` (Dashboard already hand-rolls this at `:266`).
- **Standing row** → one `StandingRow` shared by Weekly/Global/Season.

## 6. Navigation Improvements

- **Open on the plan, not the fight.** Either land on a "Home/Today" surface, or hoist the Today plan to the
  top of whatever the launch tab is, so "what next" is answerable in 0 taps.
- **Collapse the home sub-tabs.** Landing = Today plan + Daily drills; one "Standings" destination (filter
  Weekly/Global/Season) instead of two permanent tabs.
- **Make nav index == display order** to remove the surprising mapping and simplify `previousTab` restore.
- **Shop: 9 tabs is too many** for a horizontal chip scroll (`ShopTab.entries`). Group into ~4
  (Featured · Cosmetics · Seasonal · Collection) with sub-filters inside.

## 7. Hierarchy Improvements (one purpose / one primary action per screen)

- **Dashboard:** primary = "Start today's session" (the Today card). Demote quests to a quieter list; the
  league/leaderboard becomes a secondary destination, not a co-equal tab.
- **Gameplay:** the problem + answer must be the loudest thing; the "🤔 LET'S THINK" / worked-example / self-
  explain banners should be one calm, consistent feedback slot, not competing colored cards.
- **Settings:** collapsible groups (Account · Gameplay · Appearance · Notifications · Privacy · Help), each
  closed by default → the screen becomes a short scannable index instead of a 2,220-line wall.
- **Shop:** the featured hero is the focal point; reduce the eyebrow/ALL-CAPS chrome so the item is the star.

## 8. Accessibility Improvements

- **Touch targets:** several controls pad to ~`vertical = 2-7.dp` (e.g. promo/demo chips `DashboardScreen.kt:564`,
  `ClaimButton` 7dp `GlassCard.kt:361`) → below the 48dp min. Audit interactive rows for 48dp.
- **Contrast:** hardcoded `alpha = 0.6f` secondary text on `surfaceVariant` can fall under WCAG AA at small
  sizes; standardizing on `Alpha.secondary` (0.70) and verifying on both themes fixes most of it.
- **Color-only state** (open item #75): promo/demotion and correct/wrong rely on color alone — add a glyph/label.
- **Font scaling:** raw `sp` values ignore the in-app "Font Readability" setting unless it scales the whole
  theme; moving to typography styles makes scaling consistent.
- **Emoji + screen readers:** functional emoji read out as their unicode name ("crossed swords"); swapping to
  `NumeraIcon` (which already carries a11y labels) improves this.

## 9. Premium-Polish Opportunities

- **Borders → elevation/hairline.** Remove default card borders; use `Elevation.card` (2dp) or a single 1px
  `outline @ 0.5α` hairline. Instantly reads more Linear/Arc.
- **One radius rhythm.** Cards `CornerRadius.l`(16)/`xl`(24); chips/pills `full`; inputs `m`(12). Kill the 7/10/20.
- **Tabular numerals everywhere figures live** — ratings, scores, timers, "12 / 30", coin balances — via the
  existing `NumeralStyle`. Stops scoreboard jitter; feels engineered.
- **Sentence case** for buttons/labels; reserve ALL-CAPS for tiny system eyebrows only (if at all).
- **Calm color discipline** — semantic tokens (`CorrectGreen`/`WrongRed`/medals) for *meaning* only; stop
  literal `Color(0xFF…)` in logic surfaces (keep them in art/avatars/particles per the color-token audit).
- **Consistent empty/loading/error** — `NumeraEmptyState` + skeletons exist; ensure every list uses them
  (Dashboard does; verify Profile/Arena/Social).

## 10. Remaining Weaknesses / Risks

- **Brand tension is unresolved.** `docs/BrandIdentity.md` says competition-first, "math as sport," energetic,
  and *keeps* the Duolingo-ish bordered Studio look. The brief wants Apple/Linear calm. These pull opposite
  ways on borders/caps/emoji. **This needs a deliberate decision** (see questions at hand-off) — recommend a
  *hybrid*: calm, token-true base; save energy/borders/celebration for competitive & reward moments.
- **Big-screen rewrites are risky without the Compose test net.** Settings (2,220) and Profile (1,870) should
  be decluttered *and* split; CLAUDE.md flags the Compose UI test net (`createComposeRule`/Robolectric) as the
  guard. Add render tests before carving.
- **No device screenshots in this pass.** Findings are code-grounded; a visual QA pass on BlueStacks (light
  + dark, font-scale, reduce-motion) should confirm before/after.

---

## Ranked recommendation backlog

Legend: **User** = friction/clarity impact · **Learn** = learning impact · **Effort** · **Visual** = polish lift. (H/M/L)

| # | Recommendation | User | Learn | Effort | Visual |
|---|---|:--:|:--:|:--:|:--:|
| 1 | Retune `DuoCard` (no default border, token radius/padding) + `DuoButton` (sentence case, simplify color map) | **H** | M | **L** | **H** |
| 2 | Add semantic `TextStyles` + alpha tokens; sweep screens off raw `fontSize`/`0.6f` | **H** | L | M | **H** |
| 3 | Hoist Today plan to launch; collapse Dashboard's 3 sub-tabs → Today + one Standings | **H** | **H** | M | M |
| 4 | Declutter Settings: dedupe motion controls, drop in-screen search + quick-tiles, collapsible groups | **H** | L | M | M |
| 5 | Replace functional emoji with `NumeraIcon` on structural surfaces; keep emoji for celebration only | M | L | M | **H** |
| 6 | One radius rhythm + tabular numerals on all figures | M | L | **L** | **H** |
| 7 | Extract shared `RewardChip` / `SectionHeader` / `StandingRow`; remove duplicated leaderboard body | M | L | M | M |
| 8 | Group Shop's 9 tabs → ~4; reduce ALL-CAPS eyebrow chrome | M | L | **L** | M |
| 9 | Gameplay: unify feedback banners into one calm slot; problem is the loudest element | M | **H** | M | M |
| 10 | A11y sweep: 48dp targets, contrast on tokens, color+glyph state | **H** | L | M | L |
| 11 | Split Settings (2,220) & Profile (1,870) by responsibility (after Compose test net) | L | L | **H** | L |

**Suggested sequencing:** #1 + #2 + #6 first (systemic, low-risk, app-wide visual lift via primitives/tokens),
then #3 + #4 (highest friction removal), then #5/#7/#8/#9 (per-surface), with #10 running throughout and #11 last.

---

## Implemented — Slice 1: systemic primitives (2026-06-29)

Direction chosen: **hybrid** — calm, token-true base; energy reserved for competitive & reward states.
Shipped the highest-leverage, app-wide primitive retune (backlog #1/#2/#6):

- **`DuoCard` (`GlassCard.kt`)** — neutral cards now read as a quiet **1dp hairline** (the `outline`
  default at 0.4α) instead of a heavy 2dp border; any *accent* color passed in (selected / complete /
  promo / self) still gets the bold 2dp border. Radius `RoundedCornerShape(20.dp)` → `CornerRadius.l`;
  padding `16.dp` → `Spacing.l`. One edit, calmer everywhere, energy preserved where it means something.
- **`DuoButton`** — dropped `.uppercase()` → **sentence case** app-wide (every call site already passed
  natural-case labels; the primitive was doing all the shouting). Now styled via the new `AppText.button`
  role; radius/padding tokenized. The satisfying 3D depth-press is untouched.
- **`GlossyProgressBar`** — off-scale `RoundedCornerShape(7.dp)` → `CornerRadius.full` (true pill).
- **New `theme/TextStyles.kt` (`AppText`)** — semantic roles (`screenTitle`, `sectionTitle`, `rowTitle`,
  `rowSubtitle`, `button`, `stat`, …) over the M3 scale; the foundation the per-screen typography sweep
  (#2) adopts to retire raw `fontSize`/`alpha=0.6f`.
- **Tests** — 11 Compose/Robolectric tests asserted the old UPPERCASE labels; updated to the sentence-case
  rendering (and the obsolete "DuoButton uppercases" comments removed). `assembleDebug` green;
  `testDebugUnitTest` 85/85 green.

## Implemented — Slice 2 (in progress): typography sweep onto `AppText` (2026-06-29)

Reference surface: **Dashboard** (`feature/dashboard/DashboardScreen.kt`) fully swept — section/card
titles, row titles, subtitles and captions now read through `AppText.*` roles instead of ad-hoc
`fontSize`/`fontWeight`; secondary text standardized from hand-picked `alpha = 0.6f` to `Alpha.secondary`;
off-scale `14.dp`/`6.dp` → `Spacing.m`/`Spacing.xs`. `assembleDebug` + `testDebugUnitTest` (85/85) green.
This is the pattern the remaining screens adopt.

**Settings — declutter + alpha done (2026-06-29):** removed **two dead/redundant motion controls** —
the duplicate "Reduced Motion" toggle (`reduced_motion` pref) and the "Animation Intensity" slider
(`animation_intensity` pref). Grep proved **both prefs were write-only — nothing in the app ever read
them**, so they were non-functional toggles, not just redundant; only the canonical "Reduce Motion"
(`MotionManager`) actually does anything. Also removed the orphaned state vars, `remember` keys, and an
"Info ?" tooltip badge. All 65 `alpha = 0.6f` → `Alpha.secondary`. `assembleDebug` + `testDebugUnitTest`
(85/85) green. **Settings quick-tile duplication removed (2026-06-29):** the "Quick Preferences" strip (3 compact
Dark/Haptic/Mute cards) duplicated the full Dark Mode / Haptic Feedback / Sound Effects rows below it —
deleted the block; the full rows (with descriptions) remain. Verified by `SettingsScreenTest`. **Still
pending on Settings:** dropping the in-screen search (its `allSettingsList` machinery is the screen's
backbone → real refactor, pair with collapsible sections — a design call).

**Alpha drift — DONE app-wide (2026-06-29):** swept `alpha = 0.6f` → `Alpha.secondary` across **50
files / ~160 occurrences** (Dashboard + Settings by hand; the other 48 via one encoding-safe script that
also added the `Alpha` import where missing). Art/icon files (Avatar, PremiumIcons, ScratchPad,
InteractiveVisual, ProfileCosmetics) deliberately excluded per the color-token audit. `assembleDebug` +
`testDebugUnitTest` (85/85) green. The hand-picked-`0.6f` secondary-text-muting drift category is closed.

**⚠️ Settings render crash — found & fixed (2026-06-29):** the dead-control removal crashed Settings at
runtime (`NoSuchElementException`) even though the build was green — there was no `SettingsScreenTest`, so
nothing rendered the screen. SettingsScreen is a searchable *catalog* (`allSettingsList`) whose visible
layout pulls items **by title** via `allSettingsList.first { it.title == "…" }`; the layout still
referenced the removed "Reduced Motion"/"Animation Intensity". Fixed by pointing the Appearance section at
the functional "Reduce Motion" control (it had been rendering the *dead* "Reduced Motion"; the working one
was reachable only via search) and dropping the dead slider. **Added render-crash guards** — `SettingsScreenTest`
(asserts the single functional motion control is present + the dead ones gone), plus `ProfileScreenTest`,
`DashboardScreenTest`, and `LevelMapScreenTest` (the other big/edited screens + the Train tab), each
rendering the real screen with a relaxed mocked ApiService and waiting for a stable element — so a green
build now actually proves these screens open. Plus `ArenaScreenTest`. With the existing
`ShopScreenTest`, **all 5 main tabs (Arena/Train/Quests/Shop/Profile) + Settings are render-guarded** —
a green build now proves every main destination opens. Added `AuthScreensTest` too (login + register —
the entry screens every user sees). 92/92 green. Also extended the section-header
standardization (`16.sp ExtraBold primary` → `AppText.sectionTitle`) to ProfileScreen + TitlesCard. **Takeaway:** styling sweeps (alpha/typography) are
runtime-safe; structural removals on screens with no render test are not — add the test first.

**Settings typography — DONE (2026-06-29):** its three consistent inline patterns swept onto roles —
31 row titles → `AppText.rowTitle`, 6 section headers → `AppText.sectionTitle`, all subtitles →
`AppText.rowSubtitle`. Verified green.

**SocialScreen — typography swept (2026-06-29):** section headers de-capped onto `AppText.sectionTitle`
("My friends", "Friends ranking"), friend/leaderboard row titles → `rowTitle`, sub-labels → `caption`;
figures + status chips left as-is. Verified by `SocialScreenTest` (renders the screen). On-direction with
the approved calm-hybrid preview.

### The `AppText` sweep boundary (discovered while propagating)

Not every screen should take the calm `AppText` treatment. Two categories must be left alone:
- **Reward / celebration / competitive moments** (`RecapScreen`, `MasteryUpCelebration`, victory, level-up,
  Arena matchmaking) — the hybrid direction *keeps* their energy (big Black titles, ALL-CAPS shouts,
  animated counters). Calming these would flatten the payoff. **Leave as-is by design.**
- **Bespoke content typography** (`LessonScreen` lesson titles 26sp + 16sp reading body + pedagogical
  section eyebrows; `GameplayScreen` formula display / MCQ option / timer sizing) — these are tuned for
  *content/learning*, not UI chrome, and don't map onto the `AppText` UI-chrome roles (which top out at
  `screenTitle` 22 / `cardTitle` 20). Mapping them would force ill-fitting sizes. A separate "reading"
  type scale would be a deliberate design decision, not a mechanical sweep.

**LessonScreen — section labels de-capped (2026-06-29):** the descriptive content headers ("Worked
examples", "Common mistakes", "How this connects", "Core formula", "See it differently", "What it is",
"Why it works", "When to use it", "Think first", spark labels) moved from ALL-CAPS to sentence case — the
approved calm direction, applied only to *descriptive section headers*; the tiny page eyebrow ("LESSON")
stays caps per the hybrid's eyebrow exception, and the bespoke reading sizes (26sp title / 16sp body) were
left untouched (no ill-fitting `AppText` forced). Text-only change, build + tests green.

**De-cap pass propagated app-wide (2026-06-29):** the same principle applied across screens via `sed`
(reliable for embedded-quote strings where PowerShell `.Replace` mangled them) — Clubs ("Team ranking",
"Browse clubs", "🏆 Top clubs"), Arena hub ("More ways to play"), LevelMap sub-tab descriptors
("Scientifically planned pathway", "Spaced repetition reviews", "Infinite archive explorer"),
LevelDebrief ("Learning focus"), TipOverlay ("Learning objective", "Watch out for"), LiveRoom
("Room code"), WeeklyActivityChart stat chips ("Best day"/"Active days"/"Daily avg"), ReviewSolution
("💡 Solution breakdown"), LearningPlan ("▶ Next up"). **Kept** (energy/brand/status, per hybrid): Shop's
`THE VAULT`/`✦`/`👑` eyebrows, matchmaking status ("SEARCHING FOR MATCH"), `RANKED UP`/`MASTERY UP`/
`LEVEL UP` celebrations, gameplay feedback banners, the tiny page eyebrows. Synced 3 tests
(Arena/Gameplay/LearningPlan render guards). Build + tests green.

**Net:** the clean-fit `AppText` sweep is **done for the screens it suits** — Settings, Dashboard, Social
(full), Profile (headers). The everyday-chrome drift is closed. What's left is genuinely
design/QA-gated, not more mechanical sweeping.

**Gameplay feedback — calmed the container (2026-06-29):** finding: the post-answer feedback is *already*
one progressive-disclosure card (header → self-explain OR probe/hint/worked-example → Review Solution →
Continue), not literally competing banners — so #9 was "calm the slot," not "merge." Changes: off-scale
`RoundedCornerShape(20.dp)` → `CornerRadius.l`; heavy `1.5dp`/`0.3α` tinted border → `1dp`/`0.22α` hairline;
fill `0.08α` → `0.06α`; revealed-guidance tints made consistent (`0.06`). **Kept:** the energetic
"✨ EXCELLENT JOB!"/"🤔 LET'S THINK" header (a reward/feedback moment) and the green/red correct-wrong
signal. So the problem leads while the feedback stays clearly readable. `GameplayScreenTest` (drives the
real answer flow) green. Header loudness + chip consolidation are the remaining QA-dependent calls.

**Still open (per-screen visual judgment / design decision):** Profile body (+ its bespoke
cards: CompetitiveRankCard, RivalsCard, …), Gameplay, Arena, LevelMap, Shop bodies, Auth, the dialogs.
Each needs its own read because a raw `14.sp` means different roles in different screens. **Recommend a
BlueStacks visual QA pass** (light/dark, font-scale, reduce-motion) on the calmer cards + swept screens
before the riskier blind sweeps and the structural restructures.

**NOT done (visually neutral / judgment / higher-risk, deliberately deferred):** radius-literal
tokenization (343 `RoundedCornerShape(n.dp)` — pure magic-number cleanup, zero pixel change, and a real
`theme.CornerRadius` vs `geometry.CornerRadius` import-collision risk if bulk-scripted); emoji→`NumeraIcon`
on structural surfaces (#5); the Settings in-screen-search removal (#4 — its `allSettingsList` machinery is
the screen backbone, no test coverage); home-flow restructure (#3); Gameplay feedback unification (#9);
Shop tab grouping (#8).

**Next slices (not yet done):** finish the per-screen typography/alpha sweep onto `AppText` (#2 cont.); home-flow
hoist (open-on-plan / launch-tab) (#3 remainder); Settings declutter/dedupe (#4); emoji→`NumeraIcon` on structural
surfaces (#5); shared `RewardChip`/`SectionHeader` (#7 remainder); Shop tab grouping (#8); Gameplay
feedback unification (#9); a11y target/contrast sweep (#10). Visual QA on BlueStacks (light/dark, font-scale,
reduce-motion) still recommended to confirm the calmer card treatment before the next slice.

---

## Implemented — Dashboard sub-tab collapse + shared `StandingRow` (2026-06-30, #3 in-tab / #7)

The home ("Quests") tab's **3-way sub-tab row** (Daily Drills / Weekly Leagues / Global Standings — two of
the three were leaderboards) is now **2 tabs: "Daily Drills" + "Standings"**, where Standings carries an
in-body Weekly-leagues / Global **filter chip** row (Material3 `FilterChip`, matching the SocialScreen
pattern). One fewer always-rendered destination; the two leaderboards no longer compete as co-equal tabs.

- **Extracted `StandingRow`** — the Weekly and Global bodies were ~120 lines of near-identical inline
  `DuoCard` rows (rank + medal color, avatar, username + "(You)", subtitle, trailing figure, promo/demo
  badge). Now one private composable both call (`DashboardScreen.kt`). Net **−240 / +212 lines** in the file.
- **Tabular figures (#6) on the leaderboard** — rank (`#N`) and the trailing score/XP render via
  `AppText.stat` (merges `NumeralStyle`, monospace tabular) so the columns don't jitter on scroll. The
  promo/demo chip + medal colors are preserved (competitive energy kept, per the hybrid direction).
- **Avatar fallback unified** — the Weekly row's hand-rolled 4-avatar emoji `when` map was dropped; both
  rows now let `MathAvatar` use its canonical `MathAvatars.getEmoji()` fallback (strictly more coverage).
- **Fetch wiring** — `LaunchedEffect(homeSubTab, standingsFilter)` fetches quests on Daily Drills, and the
  weekly **or** global leaderboard based on the active filter chip (was three separate `homeSubTab` arms).
- **Test** — `DashboardScreenTest.standingsTabRendersWeeklyAndGlobalFilters` drives the new path (click
  "Standings" → assert both filter chips → click "Global" → assert the Global header composes), guarding
  the structural rewrite the way the prior Settings crash taught us to. `assembleDebug` green; full
  `testDebugUnitTest` suite green.

**Deliberately left for a follow-up:** the launch-tab / open-on-plan half of #3 (the app still opens on
Arena, so the Today plan is still one hop in — that's a navigation-default product call, not a within-screen
cleanup); the `RewardChip`/`SectionHeader` extractions and the quest reward glyph-string (`🪙 12  ⭐ 30 XP`,
tangled with the deferred emoji→icon decision).

---
*Audit date 2026-06-29. Companion to docs/DesignSystem.md (tokens), docs/BrandIdentity.md (identity),
docs/MotionDesignAudit-2026-06.md (motion). Slice 1 (primitives) implemented & verified; remaining
slices are findings/plan only.*
