# Mathematical Mastery Profile ("Mastery Map")

The long-term identity layer: a two-level profile of the learner's real mathematical
abilities, built entirely from demonstrated understanding. It is **not an XP system** —
every number is a *rate* derived from the masteryEngine's dimension model, so repetition
without learning moves nothing.

## Model

**Layer 1 — 8 Mathematical Domains** (`mathEngine/masteryMap.js`):
Arithmetic · Algebra · Geometry · Trigonometry (future-ready, 0 concepts → "On the horizon")
· Calculus · Statistics · Probability · Number Theory.

- The 20 curriculum categories map via `CATEGORY_TO_DOMAIN`; probability concepts inside the
  `statistics` category are split out by id (`PROBABILITY_CONCEPTS`).
- **Domain score = ½ depth + ½ breadth.** Depth = exposure-weighted mean concept mastery
  (weight capped at 15 attempts — the anti-grind invariant); breadth = concepts ≥ 0.6
  overall / total concepts in the domain.
- Stage ladder: Unexplored → Exploring → Developing → Proficient → Advanced → Mastered
  (`STAGE_FLOOR` thresholds). Mastering a whole domain is intentionally a months-long arc.

**Layer 2 — 10 Competencies**: Mental Math, Accuracy, Speed, Logic, Visualization, Pattern
Recognition, Problem Solving, Consistency, Adaptability, Strategic Thinking.

- Computed from learner_profiles dimension vectors (accuracy/fluency/independence/…),
  transfer history (Problem Solving is EARNED only via transfer attempts), commitment
  history (Consistency), and early-exposure accuracy (Adaptability).
- **Evidence-gated**: each competency stays locked ("Emerging") until `minEvidence`
  genuine attempts exist. Locked competencies expose `value = 0` — never a fake number.

## Data flow

```
gameplay → engineFeed/telemetry → learner_profiles (existing)
GET /api/mastery/profile (routes/masteryMap.js)
  → services/masteryMapService.js
      → mathEngine/masteryMap.js (pure: domains, competencies, identity, titles, recs)
      → mastery_snapshots (migration v64): INSERT OR IGNORE, one JSON snapshot/user/day
      → growth (7/30-day deltas vs nearest older snapshot) + milestones (stage-ups)
```

- **Hidden analytics**: `getInternalMasteryMap()` keeps per-domain `focusConcept` and raw
  evidence for server-side adaptation; the HTTP payload strips it.
- **Recommendations** map weak signals to existing playable modes only
  (estimation / mistakes_practice / error_detection / transfer_challenge / checkpoint_exam /
  level play at the focus concept) — gameplay integration without new modes.
- **Balanced growth is celebrated**: `balancedGrowthTitles` (Curriculum Explorer / Polymath /
  Renaissance Mind) are earned from stage breadth ACROSS domains, so all-rounders get the
  same visibility as specialists. Stage-based, never volume-based.
- **Competitive profiles are enriched**: `GET /api/user/:userId` (routes/publicProfile.js)
  attaches a compact `masteryIdentity` (headline, stage, top domain, earned-title count),
  rendered under the username in `UserProfileDialog`. Best-effort — never blocks the profile.
- `mastery_snapshots` is in the account-deletion purge list (routes/account.js).

## Client

`ui/feature/profile/MasteryMapScreen.kt` — identity hero, 10-axis competency radar
(Canvas, reduce-motion aware), domain cards with stage chips, growth, records, milestones,
title shelf, and pressable recommendation cards that deep-link via `onStartSoloGame`.
Entries: Profile → Stats tab hero card, and the command palette ("Mastery Profile").
Models in `data/network/Models.kt` (`MasteryMapResponse`); API `getMasteryMap`.

## Tests

- `server/test/masteryMap.test.js` — curriculum partition, anti-grind, evidence gating,
  earned-only problem solving, route smoke, one-snapshot-per-day, playable recommendations.
- `android/.../MasteryMapScreenTest.kt` — renders identity/domains/gated competencies from a
  mocked ApiService; recommendation click deep-links with the right mode.

## Do not regress

- Never add a counter-based stat to this profile; rates only.
- Never unlock a competency below its `minEvidence`.
- Keep Trigonometry future-ready (comingSoon) until real trig content ships, then extend
  `CATEGORY_TO_DOMAIN`/concept overrides — the client needs no change.
- New game modes that teach a competency should be added to `MODE_FOR` in
  `buildRecommendations` so the profile keeps steering play.
