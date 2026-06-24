# Visualization Engine Redesign — "Thinking Tools, Not Answer Revealers" (2026-06-22)

> Supersedes [`VisualizationAudit.md`](VisualizationAudit.md) (the 2026-06-10 "de-reveal" pass).
> That pass fixed the worst *answer-revealing* — this redesign rebuilds the **intelligence**
> around the visuals: when to show one, how much to scaffold, how to make failure productive,
> how to close the loop with explanation, and how to feel premium. Canonical going forward.

## The mission, as a rubric

A visualization must be a **thinking tool**, never an answer revealer. Every visual must require
learner *action* across the loop **Observe → Manipulate → Predict → Verify → Explain**, and must
maximize: understanding · active learning · discovery · retention · transfer · engagement ·
satisfaction. The felt outcome we optimize for: *"I figured it out myself"* — never *"the app
showed me the answer."*

---

## Audit of the current system (post de-reveal)

The 2026-06-10 pass removed the literal answer give-aways (printed decimals, "x = N", computed
roots, "expected 3.5"). Re-auditing the **current** code (`mathEngine/visualEngine.js` +
`assets/interactive_visuals.html`) against the full rubric, nine substantive weaknesses remain.
These are the targets of this redesign.

| # | Weakness | Evidence in current code | Cost to learning |
|---|---|---|---|
| **A1** | **Benefit gating is mastery-only & binary.** Whether a visual attaches depends only on `decideComplexity(profile)` (mastery/exposure). There is no per-concept signal for *"does a visual even help this idea?"* | `visualEngine.js decideComplexity()`; a visual attaches to **every** matching problem on the main path | Visuals appear where they add nothing (forced visuals → noise, slower, dependence) and the "only-when-it-helps" mandate is unmet |
| **A2** | **No lesson / exercise / competitive context.** All three flow through the same path with the same scaffolding. The mission requires *high* guidance in lessons, *minimal/optional* in exercises, *none* in competition. | `buildVisualSpec(problem, conceptId, learnerProfile)` — no context arg | Lessons under-scaffold; exercises over-scaffold; transfer suffers |
| **A3** | **Interaction events are silently dropped.** The renderer carefully emits `predict` / `manipulate` / `discover` / `solve` events; `InteractiveVisual` exposes `onEvent`, but `GameplayScreen` never passes it. | `GameplayScreen.kt` calls `InteractiveVisual(specJson = visJson)` with no `onEvent` | No haptics, no micro-celebration trigger, no telemetry to the learning engine, the predict/discover signal vanishes |
| **A4** | **No Explain step.** The loop stops at Verify. Self-explanation is the single highest-effect-size lever (already used elsewhere via `selfExplainEngine`) and is absent from visuals. | No reflection/explain prompt anywhere in the renderer or spec | Lower retention & transfer than the same interaction with a "why?" close |
| **A5** | **No shared interaction-primitive vocabulary.** Every module re-implements drag/hit/snap by hand. | each `MODULES.*` has its own `down/move/up` | New models are inconsistent; snapping/spring/haptic feel is uneven; the mission's primitive set (drag/rotate/resize/split/merge/snap/construct/reorder/compare/simulate/transform) isn't expressible |
| **A6** | **Misconceptions aren't targeted.** The knowledge graph carries rich per-concept misconceptions; visuals don't use them. Balance-scale decoys are generic, not e.g. "divide before subtract". | `knowledgeGraph.js` misconceptions vs generic decoys in `balance_scale` | Productive failure is generic instead of confronting the learner's *actual* likely error |
| **A7** | **Residual passivity in three modules.** `dice_sim` has no prediction (just "roll & watch"); `number_line` jump mode is one repeated button tap (near-zero cognitive demand); `right_triangle` seeds legs from the problem and prints the reduced relationship in guided mode. | `MODULES.dice_sim`, `number_line` (jump), `right_triangle` | Engagement & discovery below the rest of the set |
| **A8** | **Geometric-interpretation coverage gaps.** 161 concepts, 51 mapped to a visual, but whole families have none: **area model** (multiplication / `distribute` / `foil`), **general grapher** (`function`×4, `slope`, `coord`), **calculus** (`derivative`/`integral`/`limit`), **statistics** beyond one die (`stat`×11), most of **geometry** (`geo`×19 → only right triangle). | family counts vs `BUILDERS` | The most powerful geometric models for the hardest concepts are missing |
| **A9** | **Metadata is implicit & scattered.** `describeConcept` joins some fields, but there is no single registry of *representations · manipulations · misconceptions · geometry model · interaction types · feedback rules · learning goals* that **drives** the engine. | `knowledgeGraph.describeConcept` (read-only join) | The engine can't reason about "what visual, which primitives, which feedback" per concept; metadata mandate unmet |

What's already **good** and is *kept*: declarative spec → native canvas (offline, instant);
answer-leak guard (`lessonSafety.sanitizeVisualJson`); concept-gate so a stray pattern can't
attach the wrong model; on-demand rAF loop; the predict-then-verify pattern in `fraction_bar`;
the choose-your-move palette in `balance_scale`; per-mastery collapse.

---

## Redesign architecture

Four new/changed layers. The engine becomes a small **intelligence pipeline**: *metadata →
benefit → spec → renderer*, with context (lesson/exercise/competitive) flowing through all of it.

```
concept ──▶ visualMetadata.js ──▶ visualBenefit.js ──▶ visualEngine.buildVisualSpec ──▶ spec (JSON)
            (representations,        (score + decision:    (model + params + the              │
             model, primitives,       attach? scaffold,     metadata-derived feedback         ▼
             misconceptions,          collapsed, reason)    rules, learningGoal,        interactive_visuals.html
             feedbackRules,                                  reflectionPrompt, loop)    (primitives lib, haptics,
             learningGoal, benefit)                                                      reflect step, reduce-motion)
                                                                                               │
                                                                          onEvent ◀────────────┘
                                                                (haptics + engine telemetry, A3)
```

### 1. Concept Visualization Metadata — `mathEngine/visualMetadata.js` (new) — fixes A9, A6, A2

A registry that answers, for any concept, the mission's required fields:

- `representations` — the representations that apply (`symbolic`, `area`, `linear`, `set`, `graph`, `bar`, `partition`).
- `model` — the manipulative / geometry model (`balance_scale`, `area_model`, …).
- `primitives` — the interaction primitives the model uses, from the canonical vocabulary.
- `misconceptions` — pulled from the knowledge graph; the renderer turns these into *targeted decoys*.
- `feedbackRules` — declarative, answer-free consequences ("one-side-only → tilt + undo").
- `learningGoal` — the conceptual idea the interaction should make felt.
- `reflectionPrompt` — the **Explain** question shown after Verify (A4).
- `benefit` — base weight `0..1`: how much a visual genuinely helps *this* idea (drives A1).
- `loop` — the discovery-loop stages this model actually exercises.

Authored per **visual model** (8 today) and mapped to concepts by family, so all 51 visual
concepts inherit rich metadata without 51 hand-written entries, and new models drop in.

### 2. Visualization Benefit Engine — `mathEngine/visualBenefit.js` (new) — fixes A1, A2

Pure, unit-tested. `scoreVisualBenefit({ conceptId, context, learnerProfile, exposure })` →
`{ score, attach, scaffold, collapsed, reason }`. It combines, with documented weights:

- **concept benefit** (from metadata) — no model or low benefit ⇒ don't force a visual;
- **mastery** — high mastery lowers benefit (avoid dependence; the fade-scaffolding finding);
- **novelty** — first exposures benefit most;
- **context** — `lesson` boosts guidance & always attaches if a model exists; `exercise` makes
  it optional/minimal; `competitive` returns `attach:false` (no guidance under competition).

`scaffold ∈ {guided, explore, ondemand}` and `collapsed` replace the old direct
`decideComplexity` call. Backwards-compatible: `context:'exercise'` reproduces today's
mastery→scaffold mapping so existing behavior/tests hold.

### 3. Context-aware spec builder — `visualEngine.js` (changed) — fixes A2, A4, A6

`buildVisualSpec(problem, conceptId, learnerProfile, opts)` now:
1. asks the benefit engine for the decision (attach / scaffold / collapsed) using `opts.context`;
2. builds the model spec (as today, plus the new `area_model`);
3. enriches it from metadata: `learningGoal`, `reflectionPrompt`, `primitives`, `feedbackRules`,
   targeted `misconceptions`, and `loop`.

Callers pass context: `routes/math.js` & orchestrator → `exercise`; lesson surfaces → `lesson`;
duels never call it (`competitive`). `dailyPuzzle` → `exercise`.

### 4. Renderer + client upgrades — `interactive_visuals.html`, `InteractiveVisual.kt`, `GameplayScreen.kt` — fixes A3, A4, A5, A7

- **Interaction-primitives layer** (A5): one `Drag`/`snap`/`compare`/`simulate` helper set the
  modules share, with spring + snap + a `haptic()` hook, so feel is uniform and the vocabulary
  is real.
- **Haptics + micro-celebrations** (A3): renderer emits `{event:'haptic',intensity}`; the host
  routes events to `HapticManager` (soft on snap, success on solve), gated by `MotionManager`
  (reduce-motion) and `HapticManager.isEnabled`.
- **Explain step** (A4): after Verify, the renderer shows the spec's `reflectionPrompt` and emits
  `{event:'reflect'}`; the client can record it as a self-explanation signal.
- **Telemetry** (A3): `GameplayScreen` passes `onEvent` → fire-and-forget to the learning engine
  (manipulation/predict/discover/solve are learning signals, like `engineFeed`).
- **Reduce-motion** (satisfaction, responsibly): the loop honors a `reduceMotion` flag.
- **Targeted decoys** (A6) and de-passivified `dice_sim` (predict-the-settle), `number_line`,
  `right_triangle` (A7).

### 5. New geometric model — `area_model` (A8, first installment)

Multiplication / distribution / FOIL as a **partitioned rectangle** the learner *constructs* and
*splits*: drag the split, count the sub-rectangles, assemble the product — the total is never
printed. Demonstrates the new primitive set (`drag`, `split`, `construct`, `compare`). The other
gaps (general grapher, calculus accumulation, statistics sampling) are now **drop-in** against
this architecture and are tracked as the follow-on coverage track below.

---

## What ships in this pass

1. `mathEngine/visualMetadata.js` + `test/visualMetadata.test.js`
2. `mathEngine/visualBenefit.js` + `test/visualBenefit.test.js`
3. `visualEngine.js` rewired (context, metadata-enriched specs, `area_model` builder) + extended `test/visualEngine.test.js`
4. orchestrator / `routes/math.js` / `routes/dailyPuzzle.js` pass context
5. `interactive_visuals.html`: primitives layer, haptics, reflect step, reduce-motion, `area_model` module, A6/A7 fixes
6. `InteractiveVisual.kt` + `GameplayScreen.kt`: `onEvent` → haptics + telemetry, reduce-motion, context
7. docs + memory updated

## Increment 2 (shipped) — `function_grapher`

The mission's "Functions: interactive graphs and sliders." A coordinate-grid model serving
**5 previously-uncovered concepts** (`slope_intercept_id`, `point_on_line`, `function_evaluate`,
`function_solve`, `slope_from_points`). The learner drags a tracer along `y = mx + b` (or two
points); a **rise/run triangle** makes slope visible and the y-axis crossing is marked. Modes:
*read* slope/intercept off the geometry; *evaluate* (drag to a dashed `x = k`, read `y`); *solve*
(drag until the line meets a dashed `y = T`, read `x`); *two-point* slope. Slope, intercept, and
coordinates are **read off the axes — never printed**. Reaching a target fires solve → celebrate →
the Explain banner. Verified by browser screenshot (read + solve modes + the drag-to-target →
Explain flow). Tests in `visualEngine.test.js`.

## Increment 3 (shipped) — A7 predict-before-verify in `dice_sim`

Closed the last passivity gap (A7): `dice_sim` was "roll and watch." Now the learner must **commit
a prediction first** — a 1–6 track with a draggable guess marker; the roll buttons are **locked
until a prediction is made**. As rolls accumulate, the live running-average marker lands on the
*same* track, so the learner directly compares their guess against where it actually settles, then
the Explain banner asks "why that one?". Verified by browser screenshot (locked → predict → 50
rolls → guess-vs-average compare + Explain).

## Increment 4 (shipped) — `dot_plot` (mean = balance point)

The statistics family's center & spread, on the iconic *mean-as-balance-point* model. Dots ride a
plank over a fulcrum; the data balances exactly at the mean. Modes: **mean** (drag the fulcrum
until level → read the mean), **mean_missing** (`mean_missing_value`: known dots + a fixed fulcrum
at the given mean; drag the one empty dot until it balances → read its value), **range** (bracket
the min and max → the span is the range). Off-balance tilts toward the heavy side (productive
failure); the mean / missing value / range is **read off the axis, never printed**. Serves
`stat_mean`, `mean_missing_value`, `stat_range`. Verified functionally via the live renderer (all
three modes drive to balance → solve/discover → Explain, no errors). Tests in `visualEngine.test.js`.

## Increment 5 (shipped) — `probability` (sample space + trials)

Theoretical probability as a **sample-space grid**: every equally-likely outcome is a cell, the
favorable ones highlighted. The learner counts favorable/total, then **TESTS it** — each trial
picks a random cell and the experimental-rate bar converges toward the theoretical probability
(connecting theoretical ↔ experimental, and reinforcing the law of large numbers alongside
`dice_sim`). The probability value is **never printed** — it is counted and confirmed by experiment.
Serves `stat_probability`, `probability_complement` (favorable = total − event), `stat_theoretical_prob`
(spinner). Verified by browser screenshot (bag grid + 120-trial convergence + Explain; spinner
variant). Tests in `visualEngine.test.js`. (`dice_sim` accordingly narrowed to the dice-shaped
concepts `compound_probability` / `prob_without_replacement` / `expected_value`.)

## Increment 6 (shipped) — `shape_grid` (2D area)

The geometry area family on a unit grid. **rect** (`geo_area_rect`): drag a corner to build an
L×W rectangle, count the unit squares. **triangle** (`geo_area_triangle`): tap the empty half to
mirror the copy and SEE the triangle is exactly half its b×h rectangle. **parallelogram**
(`geo_area_parallelogram`): shear the leaning shape until it lines up with the reference rectangle —
same base + same height ⇒ same area (the iconic "why base × height" proof, using the `transform`
primitive). The area is **never printed** — counted in unit squares. Verified functionally on the
live renderer (all three modes drive to solve/discover → Explain; no errors). Tests in
`visualEngine.test.js`.

## Increment 7 (shipped) — `calculus` (tangent + accumulation + limit)

All three calculus visualizations the mission names. **tangent** (`derivative`, `y = a·xⁿ`): tilt a
line through the point until it just **kisses** the curve — every other slope visibly cuts through
(productive failure); the tangent's rise ÷ run is the derivative. **accumulation** (`integral`,
`∫₀ᵇ c dx`): drag the upper limit, sweeping unit strips of area under the line, then count the
squares. **limit** (`limit`, `(pn+r)/(qn+s)`): drag to add sequence terms and watch them converge
onto the dashed asymptote — read the level off the axis. The derivative / integral / limit value is
**never printed**. Verified by browser screenshot (tangent kissing y=2x² at (1,2) with rise/run
triangle; the 5×3 swept-strip integral; 28 terms converging to y=2) + each → solve → Explain flow.
Builder-supplied **mode-specific reflection prompts** (an `enrichSpec` tweak lets builders set their
own `reflectionPrompt`). Tests in `visualEngine.test.js`.

## Increment 8 (shipped) — `algebra_tiles` (combine like terms)

The mission's named "algebra: tiles" representation. `a·x + b·x` (`combine_like_terms`): two groups
of x-tiles the learner drags together (the **merge** primitive); they snap into one row of `(a+b)`
tiles to count — only LIKE tiles join, and the sum is **never printed**. Verified by screenshot
(2x + 3x → one row of 5 x-tiles, merge celebration, Explain banner) + the drag→merge→solve→Explain
flow. Tests in `visualEngine.test.js`. (Factoring stays with `parabola`; `combine_like_terms` was
the one uncovered algebra concept that fits tiles cleanly.)

## Increment 9 (shipped) — `dot_plot` median mode

Extended the proven dot-plot with **median** (`stat_median`): the dots sit on the number line and
the learner drags a divider until the counts on each side match — the median sits there, read off
the axis (never printed). Verified by screenshot (divider on 6 with "2 ←" / "→ 2" equal halves +
Explain) + the drag→balance→solve→Explain flow. The dot-plot model now covers mean · missing-value
· range · median.

## Increment 10 (shipped) — `shape_grid` perimeter mode

Extended the shape-grid with **perimeter** (`geo_perimeter_rect`): the learner taps each of the four
sides to measure it (each lights up with unit ticks + its length); when all four are measured they
add the lengths — perimeter as the distance around, distinct from area, never printed. Verified by
screenshot (3×5 rectangle, four sides labeled 3·3·5·5 + Explain) + the tap-all-sides→solve→Explain
flow. The shape-grid now covers rectangle-area · triangle · parallelogram · perimeter.

## Increment 11 (shipped) — `shape_grid` composite (L-shape) mode

Extended the shape-grid with **composite** (`geo_composite`): a big w×h grid with a cw×ch corner
highlighted; the learner taps to **cut** the corner away, leaving the L-shape to count — composite
area as a whole rectangle minus the piece removed (decomposition by subtraction), never printed.
Verified by screenshot (8×6 grid, 2×3 corner cut → L-shape + Explain) + the tap-to-cut→solve→Explain
flow. The shape-grid now covers rectangle-area · triangle · parallelogram · perimeter · composite.

## Increment 12 (shipped) — `dot_plot` mode

Extended the proven dot-plot with **mode** (`stat_mode`): the dots stack into columns on the
number line, and the learner taps the **tallest column** — the value that appears most. Tapping a
single dot (e.g. the *largest* value) turns it red with "that's a single dot — find the TALLEST
stack, not the biggest value", confronting the catalogued `picked_max` misconception directly
(productive failure). The mode is **read off the axis, never printed**. Verified by screenshot
(stack of two on `3`; wrong-tap on the largest value `9` → red hint; correct tap → green +
Explain). The dot-plot model now covers mean · missing-value · range · median · mode.

## Increment 13 (shipped) — `probability` experimental mode

The statistics family's last probability gap, on the iconic *what-actually-happened* model.
**experimental** (`stat_experimental_prob`): the trials have **already happened** — a row of
recorded flips (`succ` heads of `trials`, H/T glyphs) the learner **tallies** by tapping each
heads; the rate bar fills to heads ÷ total. Unlike the theoretical sample-space grid (count the
equally-likely favorable outcomes, then sample to converge), experimental has no randomness: the
record is fixed and the learner reads the rate *from what happened*. The experimental probability
is **never printed** — it is the filled fraction of the bar. Verified by screenshot (6-of-9 grid →
tally → bar at ⅔ → celebrate → Explain "why divide by TOTAL flips, not the tails?").

## Increment 14 (shipped) — `shape_grid` trapezoid

The geometry area family's trapezoid, by **decomposition** (the grid-friendly proof, reusing the
triangle "complete the box" interaction). **trapezoid** (`geo_area_trapezoid`): a right trapezoid
splits into a `b₁ × h` **rectangle** (countable unit squares) plus a right **triangle** of base
`(b₂ − b₁)`; the learner taps the empty corner to mirror the triangle into its `(b₂ − b₁) × h`
box, seeing the triangle is exactly half of it — so the trapezoid is the rectangle plus half the
extra-width box, i.e. the average of the two parallel sides times the height. The area is **never
printed** — counted in unit squares + half a box. Verified by screenshot (3×4 rectangle + 3×4
triangle box, dashed → tap → mirror completes the box → celebrate → Explain). The shape-grid now
covers rectangle-area · triangle · parallelogram · trapezoid · perimeter · composite.

## Increment 15 (shipped) — `area_model` FOIL (2×2 box)

The algebra family's binomial product, on the iconic *box-method* rectangle. **foil**
(`foil_binomials`, `(x + a)(x + b)`): a rectangle whose sides are `(x + a)` and `(x + b)`, split
into **four regions** — `x·x`, the two middle strips `a·x` and `b·x`, and the countable `a·b`
corner. The learner taps each of the four to claim it; the two middle strips are physically
present, so the catalogued `forgot_middle` slip ("multiplied Firsts and Lasts but skipped the
Outer/Inner pairs") becomes impossible to make. The expansion (`x² + (a+b)x + ab`) is **never
printed** — the corner is a countable grid and the learner combines the four parts. Only the *sum*
form gets the model (a difference would need subtracted strips → returns null). Verified by
screenshot (the 2×2 box with both middle strips labelled `2x`/`3x`) + the four-region event trace
(`solve` fires only after the 4th region). The area-model now covers product · distribute · FOIL.

## Increment 16 (shipped) — `dot_plot` quartiles / IQR (box-plot construction)

The statistics-spread family, on a genuine *box-plot construction* over a 7-value sorted set
(median = the 4th value, given as context). **box** mode serves both: for `stat_quartile` the
learner drags **Q1** into the lower half until one dot sits on each side (Q1 = the median of the
lower half — *not* the minimum, *not* the overall median, directly confronting the `gave_min` /
`gave_median` misconceptions); for `stat_iqr` they place **both Q1 and Q3**, and the **box** between
them (holding the middle half, with the median line inside) shows the spread — its width is the IQR.
The quartile / IQR value is **read off the axis, never printed** (the box shows "width = ?"). Verified
by screenshot (initial wide orange box → drag Q1→3, Q3→13 → green box holding the middle 5 dots, the
two outliers outside) + event traces (`solve:box:iqr` on both quartiles correct; `solve:box:q1` on Q1
alone). The dot-plot now covers mean · missing-value · range · median · mode · quartiles/IQR.

## Increment 17 (shipped) — `area_model` factoring (reverse FOIL)

The algebra family's factoring, by working the FOIL box **backwards**. **factor** (`factor_trinomial`,
`x² + S·x + P`): the corner always holds **P** squares (the learner slides through the divisor pairs
of P, each of which tiles the corner differently but always to P cells); the two middle strips total
`(a+b)·x`, and only the pair that also **adds to S** factors the trinomial. A pair with the right
product but wrong sum (e.g. `1·6` for `x²+5x+6`) visibly leaves the strips totalling the wrong number
of x's — confronting the catalogued `product_pair_wrong_sum` slip directly. The factor pair is **never
printed**; the side labels `(x + a)(x + b)` appear only as the learner's own discovered result. Sum
form only. Verified by event trace (`solve:factor` fires only on the pair summing to S; the same-product
wrong-sum pair never solves).

## Increment 18 (shipped) — `area_model` perfect square `(x + a)²`

A near-free win reusing the FOIL box with **a = b** (`square_binomial`): the box is a perfect square,
so the two middle strips are *equal* `a·x` strips — physically showing why the middle term is **2ax**,
not `ax` (`forgot_double`) and certainly not missing (`dropped_middle_term`, "the freshman's dream").
Zero renderer changes — the builder maps `(x+a)²` onto the existing `foil` mode. Verified by event
trace (`solve` after all four regions claimed).

## Increment 19 (shipped) — `dot_plot` MAD (deviation balance)

The statistics family's mean-absolute-deviation, as the *average distance from the mean*. **mad**
(`stat_mad`): each value's distance from the (given) mean is a horizontal bar; the learner slides a
vertical line until the **overhangs** (long bars past the line) exactly **fill the gaps** (short bars'
shortfall to the line) — that balancing level is the average distance, the MAD, read off the axis
(never printed). Confronts the `forgot_to_divide` (gives the total) and `gave_mean` (gives the center)
slips: the balance level is neither the biggest distance nor the mean. Verified functionally (starts
off-balance at the max deviation; `solve:mad` fires when the line reaches the average distance). The
dot-plot now covers mean · missing · range · median · mode · quartiles/IQR · MAD.

## Follow-on coverage track (architecture is ready for these)

- `circle` model — area as the wedge-rearranged `πr × r` rectangle, circumference as the rim
  unrolled to π diameters → `geo_circle_area`, `geo_circumference` (π resists clean unit-square
  counting, so these read the **coefficient of π** off the construction rather than a square count)
