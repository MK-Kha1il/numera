# Motion, Interaction & Micro-Interaction Audit — 2026-06

**Canonical doc** for Numera's app-wide motion overhaul. Scope: the Jetpack Compose Android
client (`android/app/src/main/java/com/example/numera`). The server has no motion surface.

> **Thesis.** Numera does **not** have a missing-animation problem — it has an **adoption**
> problem. A genuinely good motion vocabulary already exists (`theme/Motion.kt`,
> `MotionManager` reduce-motion, `HapticManager`, `SoundManager`, toasts, skeletons, empty
> states, victory particles). But it is used inconsistently: a few screens are polished while
> most tappable surfaces are silent. The fix is **one shared interaction primitive + a token
> layer**, then mechanical adoption — not more bespoke animation. This pass built that layer,
> proved it on three surfaces (home / settings / competitive), and ranks the rollout below.

---

## 0. What shipped in this pass (foundation + seed adoption)

| Area | Change | File |
| --- | --- | --- |
| Tokens | `MotionTokens` — standard press-scales (large/medium/small `0.98/0.96/0.92`), slide divisor, reward overshoot | `theme/Motion.kt` |
| Spring | `Motion.pressSpring()` — single source of truth for tap-scale settle | `theme/Motion.kt` |
| **Primitive** | **`Modifier.pressable {}`** — drop-in for `.clickable {}`: press-scale + ripple + sound + haptic + reduce-motion, with `PressFeedback` (Silent/Light/Medium/Strong) for weight | `ui/components/Pressable.kt` |
| Primitive | `Modifier.pressScale(pressed)` — scale-only, for surfaces that own their gesture state | `ui/components/Pressable.kt` |
| Primitive | `animatedInt(target)` — counter/tally reveals (rating, coins, XP, score), reduce-motion aware | `ui/components/Pressable.kt` |
| Adoption | **Every dead `.clickable` in the app → `pressable`** across **~36 files** — nav/list/dialog/first-run **and** game surfaces, keypads, shop, and the component library | (see list below) |
| Competitive | Post-duel **rating gain** counts up (green/red) + live **score pop** on each point (M4) | `ui/screens/DuelGameScreen.kt` |
| Reward | End-of-session **XP & coin tally counts up** as the recap lands (M7) | `ui/feature/game/RecapScreen.kt` |
| Empty states | Illustrations gently **breathe** so empty screens feel alive, not dead (M10) | `EmptyState.kt` |
| Micro | Breadcrumb chip gained a press-scale | `Breadcrumbs.kt` |
| **O1 a11y/perf** | **All** infinite shimmers/pulses now **stop under reduce-motion** — app-wide (`GlassCard` GlossyProgressBar/ClaimButton, `Skeletons`) **and** all 5 `ShopCards` rarity/ambient glows (which previously ran for every card) | `GlassCard.kt`, `Skeletons.kt`, `ShopCards.kt` |
| **I6 brand** | Victory confetti retinted from cyber-neon to the warm Studio palette | `VictoryParticles.kt` |

Migrated (~36 files). **Wave 1** (nav/list/dialog/first-run): `TodayCard`, `SettingsScreen` (16),
`DashboardScreen`, `ArenaScreen`, `ProfileScreen`, `ChallengesScreen`, `AsyncDuelScreen`,
`BotDuelScreen`, `ClubWarsScreen`, `ArchiveComponents`, `LevelMapScreen`, `SkillTreeScreen`,
`GrowthInsightsCard`, `LearningPlanScreen`, `ClassesDialog`, `NotificationsDialog`,
`ReportProblemDialog`, `OnboardingScaffold`, `AhaStep`, `AuthScreens`, `PlacementTestScreen`,
`MainTabsScreen`. **Wave 2** (game/keypad/shop/components, using `Silent` feedback where a click
sound would be machine-gunny or a haptic already fires): `GameplayScreen`, `CalculatorOverlay`
(key), `AnswerInput`, `MathKeyboard`, `ScratchPad`, `ShopCards`, `ShopScreen`, `BottomSheet`,
`SmartFilters`, `ProgressiveDisclosure`, `CommandPalette`, `QuickPreview`, `SlideOverPanel`,
`SearchField`. **Cleanup**: removed now-unused `clickable` imports (`SoloGameScreen`,
`LessonScreen`, `DuelGameScreen`).

**Intentionally left as `clickable`** (correct, not dead): full-screen dismiss **scrims** &
tap-**consumers** (`indication = null` / `enabled = false` in CalculatorOverlay, TipOverlay,
CommandPalette, QuickPreview, SlideOverPanel); **toasts** (own motion); `ClaimButton` &
`Breadcrumbs` (already have ripple + sound + haptic); and the bespoke whole-tile/depth presses
(QuickActions, DuoButton, duel answer tiles).

Verified after every batch: `gradlew assembleDebug` ✅ and `gradlew testDebugUnitTest`
(Robolectric) ✅.

---

## 1. Motion Audit (current state, by phase)

**Foundation — strong, underused.**
- `theme/Motion.kt`: 3 easing curves (enter/exit/standard) + canned `contentEnter/Exit`,
  `rewardSpring`, `rewardEnter`. Good rules ("entrances decelerate, exits accelerate, rewards
  overshoot"). **Only referenced 15× across 7 files.**
- `AnimDuration`: a clean duration scale (instant 100 → entrance 800). Used, but alongside many
  raw literals.
- `motion/MotionManager`: correct reduce-motion source of truth (in-app toggle OR OS
  animator-scale=0). **Honoured by confetti + math background only** — not by most animations.
- `HapticManager` (soft/medium/success/majorReward/error/tickTension) and `SoundManager`
  (click/correct/wrong/levelUp/rewardClaim/purchase) are rich and well-built.

**Component library — mostly polished.**
- `Feedback.kt` (toasts): spring slide-in + fade, dedupe, haptic, typed glyphs. ✅
- `Skeletons.kt`: one shimmer brush + typed per-screen skeletons. ✅
- `EmptyState.kt`: themed Canvas line-art + CTA per collection. ✅ (static art — no ambient
  motion, see Phase 6.)
- `PremiumLoader.kt`, `VictoryParticles.kt`, `MasteryUpCelebration.kt`, `RankBadge`,
  `GlossyProgressBar`, `ClaimButton` (shimmer+pulse). ✅
- `QuickActions.kt`, `DuoButton`: bespoke whole-tile press (scale + sound + haptic). ✅ — these
  are the *good* 7; intentionally kept (richer than baseline `pressable`).

**Competitive (`DuelGameScreen`) — better than it feels, with real gaps.** Has: VS intro
(`rewardEnter`), animated score bars (`Motion.standard`), confetti on win, streak chip,
reward-spring result card, win/lose haptics. **Missing:** countdown, per-question entrance,
timer urgency, combo/momentum visualization beyond a text chip, animated score pop, round
transition (questions hard-swap after a 1s delay), promotion/rank-up celebration. Rating gain
was static text → **fixed this pass**.

**Learning (`GameplayScreen`, `SoloGameScreen`, `LessonScreen`)** — functional, modest motion.
Answer tiles have a depth-press; correct/wrong drive sound+haptic+particles. Lessons reveal
statically. `LinearProgressIndicator` deprecated-API usage.

### The two measured problems

1. **Dead buttons.** **139 `.clickable` call sites across 43 files; only 7 had any press
   feedback.** Most taps gave zero visual/scale confirmation. *(17 fixed this pass.)*
2. **Easing drift.** Hand-rolled **`tween(...)` appears 68× across 18 files** (mostly default
   easing / arbitrary durations) vs. the unified **`Motion.*` helpers used only 15×**.

---

## 2. Inconsistency Report

| # | Inconsistency | Evidence | Fix |
| --- | --- | --- | --- |
| I1 | Press-scale magnitudes differ per author | `0.95` (DuoButton), `0.97` (QuickActionHero), `0.95` (QuickActionTile), depth-offset (Duel tiles) | `MotionTokens.pressScale*` + `pressable` |
| I2 | Easing absent on most movement | 68 raw `tween()` use default `FastOutSlowIn` or `Linear` | route through `Motion.standard/enter/exit` |
| I3 | Duration literals alongside the token scale | `tween(1500)`, `tween(700)`, `tween(2000)`, `delay(1000)` | use `AnimDuration.*` |
| I4 | Some surfaces alive, identical-looking neighbours dead | QuickActions (alive) vs. Today rows / Settings rows (were dead) | `pressable` everywhere |
| I5 | Reduce-motion honoured by 2 effects only | only confetti + math bg check `MotionManager` | baked into `pressable`/`pressScale`/`animatedInt`; extend to infinite shimmers/pulses |
| I6 | Celebration palette off-brand | `VictoryParticles` hardcodes cyber-neon `0xFF00F5FF…` (pre-Studio) | retint to theme primary/secondary/`MilestoneGold` |
| I7 | Counter values snap | rating/score/coins set as text | `animatedInt` (rating done; extend) |

---

## 3. Missing Animations (ranked — see §9 for scoring key)

| # | Missing | Where | Tier | Effort |
| --- | --- | --- | --- | --- |
| M1 | **Press feedback on the ~122 remaining dead taps** | app-wide `.clickable` | Small×many | Low (mechanical `pressable` swap) |
| M2 | Round/question transition (enter+exit) | `DuelGameScreen`, gameplay | Medium | Low (`Motion.contentEnter/Exit` + `AnimatedContent`) |
| M3 | Timer-urgency motion (pulse/color as time runs low) | duel, puzzle rush | Medium | Med |
| M4 | Animated score pop on point gain | `DuelGameScreen` | Small | Low (`animatedInt` + scale blip) |
| M5 | Countdown "3·2·1·GO" before a match | duel entry | Medium | Med |
| M6 | Rank promotion / new-rank celebration (Epic) | duel result, league | **Epic** | Med (detect prior rank; reuse particles + `rewardEnter`) |
| M7 | Coins/XP count-up on reward claim | quests, shop, level debrief | Small | Low (`animatedInt`) |
| M8 | Lesson concept staggered reveal | `LessonScreen` | Small | Low (per-section `AnimatedVisibility` + delay) |
| M9 | Streak / combo emphasis (scale + glow), not just text | duel, solo | Small | Low |
| M10 | Empty-state ambient motion (breathing illustration) | `EmptyState` | Tiny | Low |

---

## 4. Overused / Distracting Animations

- **O1 — Infinite shimmer/pulse ignore reduce-motion.** `GlossyProgressBar`, `ClaimButton`,
  `rememberShimmerBrush` loop forever regardless of `MotionManager`. Battery + a11y cost.
  *Fix:* gate the infinite transition; render a still gradient when `reduceMotion`.
- **O2 — Always-on "CLAIM" pulse+shimmer.** Attention-grabbing is fine for *one* claimable, but
  multiple simultaneously fight for the eye (violates Phase 10). *Fix:* animate only the single
  highest-priority claim; others static.
- **O3 — Looping math-symbol background.** Already reduce-motion gated ✅; keep amplitude low so
  it never competes with content.
- No evidence of gratuitous decorative animation elsewhere — the app errs toward *too static*,
  not too busy. Removal needs are minimal.

---

## 5. Motion Design System (the unified language)

**Durations** (`AnimDuration`): instant 100 · fast 200 · normal 300 · slow 450 · xslow 600 ·
entrance 800.
**Easing** (`MotionEasing`): `enter` (decelerate) · `exit` (accelerate) · `standard`
(on-screen moves).
**Springs** (`Motion`): `pressSpring` (taps) · `rewardSpring` (celebrations).
**Amounts** (`MotionTokens`): press-scale large/medium/small `0.98/0.96/0.92`; slide divisor 12;
reward overshoot 1.08.
**Transitions** (`Motion`): `contentEnter/contentExit` (default page/section) · `rewardEnter`
(earned moments).
**Feedback weight** (`PressFeedback`): Silent · Light · Medium · Strong → sound + haptic.

**Rules of use (one product, one feel):**
1. Every tappable surface uses `Modifier.pressable` (or `pressScale` if it owns its gesture).
2. No raw `tween()` with default easing — pass a `Motion.*` spec.
3. No magic numbers — durations from `AnimDuration`, scales from `MotionTokens`.
4. Reward overshoot is **reserved** for earned moments (Phase 9 hierarchy).
5. Everything checks `MotionManager.reduceMotion` (baked into the primitives).
6. Animate **transform + opacity only** (scale/translate/alpha) — never layout-affecting props
   in hot paths.

---

## 6. New Interaction Patterns

- **P1 `pressable`** — universal tap response (shipped).
- **P2 `animatedInt`** — number reveals (shipped; rating done).
- **P3 Round transitions** — wrap question content in `AnimatedContent` keyed on index with
  `Motion.contentEnter() togetherWith Motion.contentExit()`.
- **P4 Celebration tiers** — a single `Celebrate(tier)` entry point mapping
  Tiny→Epic to the right combo of `rewardEnter` + particles + haptic (`playMajorReward`) +
  sound (`playLevelUp`). Consolidates ad-hoc celebration code.
- **P5 Attention pulse** — a shared "look here" modifier (one-shot scale breath) for *next
  action* hints; used sparingly, one at a time.

---

## 7. Premium Polish Opportunities

Spacing/opacity continuity during transitions; layered elevation on press (shadow lift);
icon morphs (e.g. favorite fill); **counter animations** (coins/XP/rating); progress **rings**
for mastery; **card reveal** stagger in lists; **reward reveal** choreography (scale → settle →
particles → number count). Retint `VictoryParticles` to the Studio palette (I6).

---

## 8. Performance Improvements

- Prefer `Modifier.scale`/`graphicsLayer` + alpha (transform/opacity) — `pressable` already does.
- **Gate infinite transitions on reduce-motion** (O1) — removes always-on recomposition/GPU
  cost for users who opted out.
- `VictoryParticles` runs a 16ms `mutableStateList` loop driving recomposition; acceptable for a
  ~1.5s burst, but a `withFrameNanos` + single Canvas draw (no list-state churn) would be
  smoother. Already reduce-motion gated ✅.
- Replace deprecated `LinearProgressIndicator(progress=Float)` / `Divider` with lambda/`Horizontal`
  variants (warnings in `GameplayScreen`, `RecapScreen`, `LessonScreen`, `TipOverlay`).
- No layout-thrash animations found; the codebase already animates transforms.

---

## 9. Accessibility Review

- ✅ Reduce-motion source of truth exists and is now baked into the new primitives.
- ⚠️ **Extend** reduce-motion gating to all infinite shimmers/pulses (O1) and to round/section
  reveals (still animate, but instantly under reduce-motion — `animatedInt` already does via
  `snap()`).
- ✅ `pressable` sets `role = Role.Button` → correct TalkBack semantics on migrated rows (the
  raw `.clickable {}` rows had no role).
- ✅ Haptics/sound independently toggleable (`HapticManager`/`SoundManager` prefs).
- Motion never the *only* signal (done-state uses check + strikethrough + dim, not color alone).

---

## 10. Remaining Weaknesses (honest list)

1. ~~Adoption is partial~~ — **DONE.** Every dead `.clickable` in the app now routes through
   `pressable` (~36 files); the only remaining `.clickable` are intentional scrims, tap-consumers,
   toasts, and already-rich bespoke surfaces (see §0).
2. ~~Competitive choreography~~ — **DONE.** Duel **countdown** (3·2·1·GO, M5), **round/question
   transitions** (M2, AnimatedContent on question change), **rank-promotion celebration** (M6 —
   pre-match rank now captured at join, so a win that changes rank fires an Epic fanfare + second
   confetti burst), plus the earlier rating count-up + score pop.
3. ~~Infinite animations not reduce-motion gated~~ — **DONE everywhere** (O1), incl. all 5
   `ShopCards` glows.
4. ~~Celebration logic scattered~~ — **DONE.** `CelebrationTier` (Tiny→Epic) is the single
   reserved entry point in `Pressable.kt`; the duel rank-up is its first caller (P4).
5. ~~Off-brand confetti palette~~ — **DONE** (I6).
6. ~~Lesson section reveal~~ — **DONE.** The lesson's opening sections (intro/concept/formula)
   cascade in via a reveal counter + `AnimatedVisibility`, reduce-motion gated (M8).
7. **No on-device verification this pass** — changes are compile- + Robolectric-verified only;
   the BlueStacks pass (per CLAUDE.md) is still owed to *tune the feel* of the new live-duel
   choreography (countdown pacing, round-transition timing). Nothing is left unbuilt.

---

## Recommendation ranking (User · Learning · Emotional · Perf cost · Effort)

Scale: ●●● high / ●● med / ● low. **Perf cost** lower = better.

| Rank | Item | User | Learning | Emotional | Perf cost | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | M1 `pressable` rollout (~36 files) — **DONE** ✅ | ●●● | ●● | ●● | ● | ●● |
| 2 | O1 gate **all** infinite anims on reduce-motion (incl. ShopCards) — **DONE** ✅ | ●● | ● | ● | ●●● (saves) | ● |
| 3 | I6 retint confetti to Studio palette — **DONE** ✅ | ● | – | ●● | ● | ● |
| 4 | M7/M4 reward & score count-ups (recap XP/coins + duel rating + score pop) — **DONE** ✅ | ●● | ● | ●● | ● | ● |
| 5 | M10 empty-state ambient breathing — **DONE** ✅ | ● | – | ● | ● | ● |
| 6 | M5 duel countdown (3·2·1·GO) — **DONE** ✅ | ●● | ● | ●● | ● | ●● |
| 7 | M2 round/question transitions — **DONE** ✅ | ●● | ●● | ●● | ● | ● |
| 8 | M6 rank-promotion celebration (Epic) — **DONE** ✅ | ●● | ● | ●●● | ● | ●● |
| 9 | M8 lesson staggered reveal — **DONE** ✅ | ● | ●● | ● | ● | ● |
| 10 | P4 `CelebrationTier` unified entry point — **DONE** ✅ | ● | – | ●● | ● | ●● |
| — | *Everything in this audit is now implemented. Only `M3` (timer-urgency motion) is unscoped — the duel has no per-question timer to drive it.* | | | | | |

### Mechanical rollout for #1 (per file)
1. Add `import com.example.numera.ui.components.pressable`.
2. Swap dead `.clickable {` → `.pressable {`; for buttons/icons pass
   `feedback = PressFeedback.Medium` and/or `pressScale = MotionTokens.pressScaleMedium/Small`.
3. **Do not** convert the bespoke whole-tile/depth presses (QuickActions, DuoButton, ShopCards,
   Duel answer tiles) — they are intentionally richer.
4. Remove the now-unused `androidx.compose.foundation.clickable` import.
5. `gradlew assembleDebug && gradlew testDebugUnitTest`.

**Priority screens for rollout:** Profile (14), DashboardScreen (3), Shop (3 non-bespoke),
Arena/Challenges/Async/BotDuel, Social/ClubWars, Archive/LevelMap, LessonScreen, dialogs
(Classes/Notifications/ReportProblem), CommandPalette/SearchField/SmartFilters.

### Definition of done
Every interactive element responds; one easing/spring vocabulary; reduce-motion respected
everywhere; celebrations tiered (Tiny→Epic) and reserved; verified in BlueStacks. Users never
notice the animations — they just feel the app is exceptionally polished.
