# Interactive Visualization Audit & Redesign (2026-06-10)

Audit of the Interactive Mathematical Discovery System (`server/mathEngine/visualEngine.js`
+ `android/app/src/main/assets/interactive_visuals.html`) against the educational mission:
**visualizations are thinking tools, not answer revealers.** The learner must still reason
and earn the solution.

## The test applied to every visual

> If a learner taps/reads the visual *without doing any mathematics*, can they answer the
> exercise? If yes, the visual is an answer revealer and fails.

Every visual was also graded on the active-learning loop it should support:
**Observe → Manipulate → Predict → Verify → Explain.**

## Findings (pre-redesign)

| Visual | Verdict | Evidence |
|---|---|---|
| `balance_scale` | **Severe answer revealer + over-guided** | The single action button *names the correct operation* ("Subtract 3 from both", "Divide both by 2") and *performs it*; the final state prints **"x = N"** with confetti. Two taps = solved, zero algebra. The learner makes no decisions. |
| `fraction_bar` | **Answer revealer** | Printed the decimal value of each fraction (`= 0.75`) — the comparison answer; printed the verdict ("3/4 is greater"); printed the completed sum (`1/4 + 2/4 = 3/4`); a button computed the common denominator automatically. |
| `right_triangle` | **Partial revealer** | Live-printed `c = 5` and the fully computed identity `3² + 4² = 9 + 16 = 25 = c²`, with legs *seeded to the problem's numbers* — the hypotenuse answer was on screen at load. |
| `parabola` | **Partial revealer** | Printed numeric roots ("roots: x = 1, 3") while quadratic exercises ask exactly for the roots. (The "no real roots (b²−4ac<0)" structural message is good and kept.) |
| `dice_sim` | **Minor reveal** | Printed "expected 3.5" — the literal answer to expected-value questions. Otherwise the strongest discovery design of the set. |
| `number_line` | **Answer revealer** | Jump mode titled the canvas "5 + 3 = 8" *before any interaction*; modulo mode's button label became "Remainder is X" and printed "remainder = X". |
| Passive / decorative visuals | none | All six are interactive; none are purely decorative. |
| Redundant visuals | none | Each type maps to a distinct concept family. |

### Systemic findings

- **Difficulty adaptation was shallow.** `decideComplexity()` (guided/explore/ondemand/null)
  only trimmed the caption and collapsed the card. *Inside* the canvas, a beginner and an
  advanced learner saw identical scaffolding.
- **Coverage gaps:** no percentage visual, no ratio visual.
- **No predict step anywhere.** Verification was given away rather than earned by committing
  to a prediction first.

## Redesign principles (now implemented)

1. **The learner chooses the moves.** Where the old visual had one button that knew the right
   operation, the new visual offers a *palette of legal and tempting-but-wrong moves* (e.g.
   the balance scale offers several subtraction amounts and a one-side-only decoy). Wrong
   choices produce visible consequences (tilt, misaligned pieces), not lockouts.
2. **Quantities the learner must read, not labels that read them.** Final states present the
   structure (blocks on a pan, a marker on a line, square areas as countable grids) and ask —
   they never print `x = N`, `c = 5`, sums, verdicts, or remainders.
3. **Predict before verify.** Where a verdict exists (which fraction is greater), the learner
   commits a prediction first; the visual then animates the evidence. Verification of a
   committed prediction is pedagogy; unprompted verdicts are answer-revealing.
4. **Scaffolding adapts inside the canvas.** The renderer reads `spec.complexity`:
   - `guided` — full captions, hint text, move labels explained;
   - `explore` — captions trimmed, hints only after a wrong move;
   - `ondemand` — minimal labels, no hints (and the card starts collapsed). Experts get none.
5. **Performance unchanged:** still a single vanilla-canvas renderer, on-demand rAF loop
   (idles when static), no CDN, no extra layers.

## Concept coverage after redesign

| Concept | Visual | Loop |
|---|---|---|
| arithmetic | `number_line` (jump) | hop the line yourself; read where you land |
| fractions | `fraction_bar` | shade/split pieces; align sizes to add; predict-then-verify compares |
| **percentages** | **`percent_bar` (new)** | drag a % handle over a quantity bar; predict the part before the grid confirms |
| **ratios** | **`ratio_line` (new)** | double number line; scale both quantities in lockstep; find equivalent pairs |
| algebra | `balance_scale` | choose legal moves (incl. decoys) to isolate x; count the result yourself |
| geometry | `right_triangle` | drag legs; leg squares are countable grids; c stays `?` |
| graphing | `parabola` | sliders reshape the curve; roots marked but unlabeled — read them off the grid |
| probability | `dice_sim` | roll; watch the running average settle; no expected-value label |
| statistics | `dice_sim` histogram | distribution shape emerges from samples |

## Verification

- `server/test/visualEngine.test.js` — builder parsing, complexity gating, and a
  **no-answer-leak guard**: spec prompts/goals must not contain the computed answer.
- Renderer modules previewable in a desktop browser: `interactive_visuals.html?spec=<json>`.
- `npm test` + `gradlew assembleDebug` green.
