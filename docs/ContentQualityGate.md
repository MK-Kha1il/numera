# Content Quality Gate

Every new lesson and exercise generator must pass this gate before it ships. It is not a
style guide — it is **enforced**: `test/contentQualityGate.test.js` runs the gate over the
entire catalog (all `CONCEPT_LESSONS` entries + every generator in `templates.js`) on every
`npm test`, so content that fails a check breaks the build, blocks the pre-commit hook
(`scripts/server-quality-gate.cjs`), and fails CI.

The applied-mode generators (word problems, estimation, spot-the-mistake) are gated too —
`gateExercise` runs over a sampled set of each family, plus a no-repeats variety check.

The gate module is `server/mathEngine/contentQualityGate.js` (pure, no DB/IO). You can gate
a candidate lesson *before* inserting it:

```js
const { gateLesson, gateGenerator } = require('./mathEngine/contentQualityGate');
gateLesson('my_new_concept', candidateLessonObject);   // → { pass, checks: [...] }
gateGenerator(myGeneratorFn);                          // samples 12 instances
```

## The checklist

| # | Question | How it's enforced |
|---|----------|-------------------|
| 1 | **Is the learning objective explicit?** | Lesson needs `title` + `oneLineSummary` (≥20 chars) stating what is learned. An exercise's objective is its concept's summary — so its `type` must resolve to a concept with a lesson. |
| 2 | **Does it match the intended concept and prerequisites?** | The id must exist in the knowledge graph and all `prereqs` must resolve (no dangling edges). Generated types map via `conceptFromType`; unmapped new types fail. |
| 3 | **Does it avoid revealing the answer?** | Stems must not *state* their answer — a completed equality (`3 + 4 = 7`) or a prose statement ("the answer is 7"). Constraints with unknowns (`2x − 2y = 4`) and read-off tasks (mode of a list — see `SELECTION_TYPES`) are inherently fine. Hint rungs are leak-filtered at build time; lessons are additionally leak-guarded against the live exercise at serve time (`lessonSafety`). Control-char scan catches the single-backslash LaTeX corruption bug. |
| 4 | **Does it promote reasoning rather than memorization?** | Lesson needs `whyItWorks` (≥30 chars) or an `intuitionHook`, ≥1 `commonMistakes` entry with its fix, and a fully worked example. Exercises need a worked `explanation` and a ≥3-rung hint ladder (authored tip or lesson-derived). |
| 5 | **Is it sufficiently different from recent content?** | A generator is sampled 12× across difficulty factors: ≥3 distinct questions AND ≥2 distinct answers required. (Serve-time diversity is additionally handled by `exerciseMemory`.) This check caught three real defects on day one: a divisor generator whose answer was always 6, a two-instance Euler generator, and a two-radius sphere generator. |
| 6 | **Does it fit the adaptive engine?** | The mapped concept needs `baseElo` and **≥2 misconceptions** — that's what powers diagnosis, tagged distractors, socratic probes, and remediation. |
| 7 | **Would you keep it if you could only ship 10% of your content?** | **Human judgment — not automated.** Ask it before authoring, not after: does this content teach something the catalog doesn't already teach, in a way a learner will remember? If it's a fourth cosmetic variation of an existing drill, don't ship it. When in doubt, cut. |

## Allowlists (documented exceptions — do not grow casually)

- `LEGACY_UNMAPPED_TYPES` — 14 problem types that pre-date the concept graph (the mental-math
  band, `fermat_little`, `euler_identity`, `gcd`, `modulo`, `probability`, `average`,
  `estimation`, `percentage`). They are covered by authored tips.js entries. **Frozen**: new
  types must map to a graph concept.
- `SELECTION_TYPES` — types whose answer is inherently visible in the stem because the task
  is selecting/reading a value from shown data (mode, median, range, comparisons).

## Authoring workflow for new content

1. Add the graph node first (`knowledgeGraph.js`): name, prereqs, `baseElo`, ≥2 misconceptions
   (id + label + predictive rule where the generator's distractors support one — see
   `test/revivedDiagnosis.test.js` for the rule contract).
2. Write the lesson (`conceptLessons.js`) — the gate tells you exactly what's missing.
3. Write the generator (`templates.js`); tag distractors with misconception ids (`misc: {...}`).
4. Run `npm test` — the gate suite plus the content tripwires must be green.
5. Optionally run `node scripts/contentGraphAudit.js` and hold the lines listed in
   docs/ContentQualitySprint-2026-07.md §4.
6. Ask checklist question 7 honestly. The gate can verify structure; only you can verify
   that the content deserves to exist.
