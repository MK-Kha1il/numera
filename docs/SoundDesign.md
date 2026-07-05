# Numera Sound Design — the audio language

> Canonical reference for every sound the app makes. Code: `sound/SoundManager.kt`
> (vocabulary) + `sound/SoundEngine.kt` (synthesis/playback engine); tripwires:
> `app/src/test/.../sound/SoundEngineTest.kt` (mixer invariants) and
> `SoundVocabularyTest.kt` (the executable loudness/duration/hierarchy contract — it renders
> every cache key via `SoundManager.vocabularyForTest()`). Companion to
> [BrandIdentity.md](BrandIdentity.md) (what the app should feel like) and
> [MotionDesignAudit-2026-06.md](MotionDesignAudit-2026-06.md) (the motion twin of this doc —
> same philosophy: adoption-not-absence, hierarchy, restraint).

Numera's audio is **100% procedurally synthesized at runtime** — no sample libraries, no
audio assets, zero APK weight. This is not a cost compromise; it is the identity. Every
sound is literally mathematics (harmonic series, decaying exponentials, one shared scale),
which is the most Numera thing a sound system can be, and it makes stylistic drift
*structurally impossible*: there is no second library to accidentally mix in.

---

## 1. Sonic identity — "struck glass over warm felt"

One line: **glass/celesta strikes over a warm felt-piano low, speaking C-pentatonic.**

| Property   | Decision |
|------------|----------|
| Material   | Struck glass / celesta (inharmonic bell partials at ×2.76, ×5.40, ×8.12) for everything positive and neutral; warm felt-piano plucks (rich low harmonics, soft bite) for grounding and gentle negatives. |
| Palette    | **C-pentatonic (C–D–E–G–A)**, just-intonation-flavored. Every tonal sound draws from one scale, so no two Numera sounds can clash, ever. |
| Signature  | The motif **C → G → C′** (root–fifth–octave). It recurs at every scale: session complete (3 notes), victory (sprinting run), promotion (two-octave climb). The app is recognizable eyes-closed. |
| Brightness | Fundamentals live in 200 Hz–1.6 kHz. Sparkle above 2 kHz is *earned* — streaks ≥5, Mythic unlocks, promotions. |
| Warmth     | Negatives are always low + felt (plucks at 196–330 Hz), never buzzers, never dissonance. |
| Dynamics   | Tier gains 0.55 → 1.0 (see hierarchy). Nothing is ever "louder to be more important" alone — importance adds *layers and length*, not just gain. |
| Reverb     | None (dry synthesis). Tails come from long exponential decays — reads as "space" on phone speakers without mud. |
| Stereo     | Mono by design: phone speakers are mono, and mono keeps the engine allocation-free. Revisit only for a tablet/headphone tier. |
| Transients | UI taps get a ~1 ms attack TICK or filtered-NOISE onset ("touch"); learning/celebration sounds get a 10 ms soft attack (no pops — tested). |

**Emotional grammar** (how meaning maps to music, used everywhere):

- Rising = progress, invitation (navigate, countdown 3→2→1, correct, reward runs).
- Falling = closure, gentleness (sheet close, wrong "not yet", defeat, time-up deflate).
- Suspended/unresolved = neutral (draw: an open fourth that never lands).
- Sub-bass impact = physical significance (match start, victory, promotion **only**).
- Tremolo shimmer = rarity/mastery (streak ≥5, Epic+ unlocks, mastery-up).

## 2. Hierarchy — five tiers, enforced in code

| Tier | Gain | Length | Voices | Vocabulary |
|------|------|--------|--------|-----------|
| TINY | 0.55 | ≤60 ms | 1–2 | `playClick`, `playTapMedium`, `playTapStrong`, `playNavigate`, `playSheetOpen/Close`, `playTick(urgency)` |
| SMALL | 0.70 | ≤400 ms | 1–3 | `playCorrect(streak)`, `playWrong`, `playTimeUp`, `playReveal`, `playDiscovery`, `playLockIn`, `playToastSuccess/Error` |
| MEDIUM | 0.85 | ≤700 ms | 3–4 | `playRewardClaim`, `playLevelComplete`, `playMasteryUp`, `playMatchFound`, `playCountdown(n)`, `playMatchStart`, `playDraw` |
| LARGE | 1.0 | ≤1.5 s | 5–7 + weight | `playLevelUp`, `playVictory`, `playDefeat` |
| EPIC | 1.0 | ≤2.5 s | full stack | `playPromotion`, `playUnlock(3..4)` |

`PressFeedback` (Light/Medium/Strong) and `CelebrationTier` (Tiny→Epic) in
`ui/components/Pressable.kt` are the *routing* layer — they now map to **five audibly
distinct** sounds (the pre-redesign code mapped three press weights to one identical click
and three celebration tiers to one identical fanfare).

## 3. Layers — how big moments are built

Five synthesis primitives (`Layer.Kind` in SoundEngine): **CHIME** (glass body),
**PLUCK** (felt low), **SUB** (45–130 Hz pitch-drop impact), **TICK** (≤30 ms blip),
**NOISE** (filtered air transient). Complexity is stacked, not louder:

```
promotion = NOISE (attack definition)
          + SUB 130→40 Hz (physical weight)
          + 6-note pentatonic run, tremolo (the climb)
          + C6/E6/G6 shimmer cluster (rarity)
          + A6 sparkle tail (afterglow)
```

A tap is one TICK. Nothing in between ever uses more layers than its tier allows.

## 4. The rules (do not regress)

1. **One moment, one sound.** Never fire two vocabulary sounds for one event. Promotion
   *replaces* victory (DuelGameScreen checks `promoted` before choosing); a claim button
   press (TINY) and the claim outcome (MEDIUM) are different moments and may both speak.
2. **Wrong ≠ defeat ≠ time-up.** A mistake is a soft falling "not yet" (A3→G3 felt); a lost
   match is a graceful descending resolution landing on home (A4→E4→C4); a timeout is a
   deflate with air. None of them are punishments; none share a sound.
3. **Correct stays SMALL; streaks earn sparkle.** `playCorrect(streak)` plays two glass
   notes at streak 0 (it fires hundreds of times a session) and *grows*: ≥3 adds the octave,
   ≥5 shimmers, ≥10 sparkles. Momentum is audible without a single extra sound effect.
4. **Silence is part of the system.** Deliberately silent: keypads & calculator
   (`PressFeedback.Silent` — high-frequency contexts), manipulative dragging/predicting
   (thinking time; only `discover`/`solve` speak), Info toasts (ambient notices never nag),
   scratchpad drawing, scrims/dismissals, mid-question UI. Do not fill these.
5. **Tension only where stakes are** (final 5 s of a timed question or duel clock —
   rising-pitch ticks; pre-match countdown — rising A→C→E). Never during untimed learning.
6. **Reserve EPIC.** If promotion fires twice an hour it means nothing.
7. **Navigation says "moving", not "pressing"** — tabs/breadcrumbs use the rising
   two-blip `playNavigate`, never the button click.
8. **Never hand-roll a sound+haptic combo at a call site.** Route through `pressable` /
   `PressFeedback` / `CelebrationTier`, or call one vocabulary method + one haptic. (The
   audit found `pressable { SoundManager.playClick(); … }` double-fire bugs — pressable
   already emits.)

## 5. Engine — performance model

- **Render once, play forever.** Each sound key renders one PCM16 buffer (22.05 kHz mono)
  on first use and is cached (`ConcurrentHashMap`). The pre-redesign engine re-synthesized
  every play (a correct answer = ~25k samples of math before the first byte hit the DAC).
- **Prewarm** at `init`: click, navigate, correct(0), wrong — first tap is as fast as the hundredth.
- **Non-blocking playback.** MODE_STATIC AudioTrack + coroutine `delay` release. The old
  engine parked a `Dispatchers.Default` thread in a `Thread.sleep` poll for the full sound
  duration (up to 2.4 s each).
- **Polyphony caps by priority** (LOW 3 / NORMAL 5 / HIGH 8): rapid taps shed first, results
  always speak. **Per-key throttles** (taps 45 ms, ticks 150 ms, toasts 400 ms) kill double-fires.
- Parameterized sounds cache **bucketed** variants (streak 0/3/5/10, urgency ×4, countdown ×3,
  unlock ×5) — bounded memory, ballpark <1 MB fully warm.
- Volume applies at play time (`AudioTrack.setVolume`), so the slider never re-renders.

## 6. Accessibility

- Independent controls in Settings: **sound on/off + volume slider** (now with an audible
  preview on release, and a confirmation when re-enabling), **haptics toggle** (separate
  manager). Music: N/A — Numera has no background music *by design* (protect concentration;
  competitive tension is carried by SFX, not a score).
- Every sound-carried signal has a visual twin (verdict colors/banners, countdown numerals,
  timer bar, toast cards, rating count-up) — audio is reinforcement, never sole channel.
- `USAGE_GAME`/`CONTENT_TYPE_SONIFICATION` audio attributes: respects media volume and
  system routing. Haptics respect the OS animator-scale via MotionManager conventions.

## 7. Audit record (2026-07, what the redesign fixed)

| # | Finding | Fix |
|---|---------|-----|
| 1 | Press hierarchy collapse: Light/Medium/Strong → same click | 3 distinct taps (tick / glass / noise+two-note) |
| 2 | Celebration collapse: Medium/Large/Epic → same `playLevelUp`; `CelebrationTier.fire()` had **zero callers** | 5 distinct tiers; tier map fixed so future adoption is safe |
| 3 | Duel **defeat = wrong-answer sound**; error haptic on a match result | `playDefeat` (graceful descent) + medium haptic |
| 4 | Victory = generic level-up | `playVictory` (sub impact + signature run + shimmer) |
| 5 | Draw was silent | `playDraw` (suspended, unresolved) |
| 6 | Rank promotion (the biggest moment in the app) was **silent** | `playPromotion` EPIC; supersedes victory |
| 7 | Countdown 3-2-1 haptic-only; match start silent; no duel clock pressure | `playCountdown` rising notes, `playMatchStart` impact, final-5 s rising ticks |
| 8 | Timeout = wrong-answer sound | `playTimeUp` deflate |
| 9 | `playCorrect` was a 1.15 s 6-note fanfare on *every* answer (fatigue) | SMALL 2-note base + streak escalation |
| 10 | `playWrong` = harsh 49 Hz triple pluck at 0.9 amplitude | soft A3→G3 "not yet" |
| 11 | Puzzle Rush verdicts were haptic-only (competitive mode, no audio distinction) | correct(score)/wrong wired |
| 12 | Mastery-up full-screen celebration was silent | `playMasteryUp` + major haptic |
| 13 | Manipulative `discover`/`solve` events haptic-only | discovery spark / correct wired (drag stays silent) |
| 14 | Toasts haptic-only | Success/Error/Achievement speak; Info stays silent |
| 15 | Double-fire bugs: `pressable` + manual click/haptic inside (MainTabs pill, ArenaModeTile, SheetActionRow, GameplayScreen chip) | de-duplicated to single `pressable` |
| 16 | Tab nav / breadcrumbs sounded like button presses | `playNavigate` |
| 17 | Sheets/palette/context menus opened with a button click | `playSheetOpen/Close` motion audio |
| 18 | Answer commit in duels was silent until the verdict | `playLockIn` |
| 19 | `playPurchase` was dead code (zero callers) | removed; unlock fanfare owns the moment |
| 20 | Session-complete-without-level-up fired the *major reward* haptic | right-sized: `playLevelComplete` + success haptic |
| 21 | Per-play synthesis + AudioTrack alloc + `Thread.sleep` poll; unbounded polyphony | cached render, coroutine release, priority caps, throttles |
| 22 | Flat 800 Hz timer tick carried no urgency | pitch/presence rise with `urgency` |
| 23 | Volume slider gave no preview; unmute gave no confirmation | both added |

## 8. Second pass ("leave nothing behind", same day)

- **Rating count-up ticks**: the duel debrief rating now genuinely counts (the `animatedInt`
  was unseeded and snapped on first frame — fixed) and ticks while climbing; the engine's
  150 ms throttle caps the rate, and reduce-motion snaps → stays silent.
- **Achievement claims route by size**: milestone claims fire `CelebrationTier`
  Small/Medium/Large from `chain_order` + `reward_coins` — the first real `CelebrationTier`
  adopters. Rule added: **Achievement toasts are silent by design** — they always echo a
  claim/unlock moment that owns the audio (a toast is a visual echo, never a second voice).
- **Shop token-claims** speak the shop's language: the rarity-tiered `playUnlock` fanfare
  (they previously had no sound of their own).
- **Loudness pass is executable**: `SoundVocabularyTest` renders the entire vocabulary and
  enforces tier duration caps, a 90%-of-full-scale clipping ceiling, no onset pops (NOISE
  gained a 0.5 ms attack so transients bite without a DC step), streak/rarity escalation
  ordering, "wrong stays gentle" (quieter than reward-claim and victory, ≤500 ms), and the
  countdown's rising presence.

## 9. Deliberate non-goals (decisions, not gaps)

- **No sound on tab *content* transitions** — the navigate blip + motion carry it.
  Re-evaluate after a week of real use.
- **Mono, no reverb** — phone speakers are mono; dry tails read as space without mud. A
  stereo/headphone tier (width + gentle room) is the one future upgrade that would need an
  engine change.
- **No background music** — concentration is the product. Competitive tension is carried by
  SFX (countdown, clock ticks, lock-in), not a score.

## 10. How to add a sound (checklist)

1. Does it communicate confirmation / progress / attention / completion / navigation /
   reward / tension / continuity? **If not, don't add it.** Silence is a valid design.
2. Pick the tier honestly (§2) — then take one tier *lower* than your instinct.
3. Compose from existing primitives in the C-pentatonic palette; reuse the motif where the
   moment is "Numera succeeded at something".
4. Add it to `SoundManager` as a named `spec*` builder with a KDoc stating **why it exists**,
   register it in `vocabularyForTest()`, and wire exactly one call site per moment; throttle
   if it can repeat within 400 ms. `SoundVocabularyTest` will hold you to the tier rules.
5. Falling = closure, rising = progress, sub = significance. Don't invert the grammar.
