// Concept Visualization Metadata
// =============================================================================
// The single source of truth for "what mathematical object should the learner be
// able to touch for this concept, which interaction primitives does it use, what
// idea should become felt, what misconception does failure confront, and how much
// does a visual actually help here." The benefit engine and the spec builder both
// read from this registry; the knowledge graph joins it into describeConcept().
//
// Authored per VISUAL MODEL (not per concept): each model declares its metadata
// once, and concepts inherit it through MODEL_CONCEPTS. That keeps all visual
// concepts richly described without N hand-written entries, and a new model is a
// single block + one concept list.
//
// Pure module (no DB/IO). Lazily requires knowledgeGraph for per-concept
// misconceptions to avoid any load-order coupling.

// The canonical interaction-primitive vocabulary. A model's `primitives` must be a
// subset of this — it is the shared language the renderer's primitive layer speaks.
const PRIMITIVES = Object.freeze([
  'drag', 'rotate', 'resize', 'split', 'merge', 'snap',
  'construct', 'reorder', 'compare', 'simulate', 'transform'
]);

// The discovery-loop stages. Every model should exercise at least observe +
// manipulate + (verify | explain). `explain` is the retention/transfer close.
const LOOP_STAGES = Object.freeze(['observe', 'predict', 'manipulate', 'verify', 'explain']);

// -----------------------------------------------------------------------------
// Per-model metadata. `benefit` (0..1) is how much a manipulative genuinely helps
// THIS idea — the base signal the benefit engine scales by mastery/novelty/context.
// `feedbackRules` are declarative, ANSWER-FREE consequences the renderer applies
// (productive failure: a wrong choice has a visible cost, never a printed answer).
// -----------------------------------------------------------------------------
const MODEL_META = {
  balance_scale: {
    representations: ['symbolic', 'balance'],
    primitives: ['transform', 'compare', 'construct'],
    benefit: 0.9,
    learningGoal: 'Doing the same operation to both sides keeps an equation true.',
    reflectionPrompt: 'Why did doing the same thing to both sides keep the scale balanced?',
    loop: ['observe', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'one_side_only', effect: 'tilt_undo', message: 'Unbalanced — what you do to one side, do to the other.' },
      { trigger: 'below_zero', effect: 'undo', message: 'A pan cannot go below zero.' },
      { trigger: 'uneven_split', effect: 'reject', message: "Those pieces don't split evenly." }
    ]
  },
  fraction_bar: {
    representations: ['symbolic', 'area', 'partition', 'bar'],
    primitives: ['split', 'construct', 'compare'],
    benefit: 0.92,
    learningGoal: 'A fraction is a count of equal parts; only same-size parts can be compared or added.',
    reflectionPrompt: 'Why do the pieces have to be the same size before you can add them?',
    loop: ['observe', 'predict', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'mismatched_pieces', effect: 'block_count', message: 'Only same-size pieces can be counted together.' },
      { trigger: 'predict_before_verify', effect: 'gate_reveal', message: 'Commit a prediction first.' }
    ]
  },
  algebra_tiles: {
    representations: ['symbolic', 'area', 'set'],
    primitives: ['drag', 'merge', 'construct', 'compare'],
    benefit: 0.75,
    learningGoal: 'Only like terms combine: x-tiles join with x-tiles, and you count how many there are.',
    reflectionPrompt: 'Why can these tiles be gathered into one group — and what stays the same?',
    loop: ['observe', 'manipulate', 'construct', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'merged', effect: 'count', message: 'Now count the like tiles in the row.' },
      { trigger: 'unlike_tiles', effect: 'reject', message: 'Only like tiles can be combined.' }
    ]
  },
  area_model: {
    representations: ['area', 'partition', 'symbolic'],
    primitives: ['drag', 'split', 'construct', 'compare'],
    benefit: 0.85,
    learningGoal: 'A product is the area of a rectangle; splitting a side splits the area (distribution).',
    reflectionPrompt: 'Why does splitting one side into parts let you add the smaller areas to get the whole product?',
    loop: ['observe', 'manipulate', 'construct', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'gap_or_overlap', effect: 'snap', message: 'The parts must tile the whole side — no gaps, no overlaps.' }
    ]
  },
  shape_grid: {
    representations: ['geometric', 'area', 'partition'],
    primitives: ['drag', 'construct', 'transform', 'compare'],
    benefit: 0.82,
    learningGoal: 'Area is the number of unit squares a shape covers; a triangle is half its rectangle and a parallelogram shears into one.',
    reflectionPrompt: 'Why does this shape cover exactly that many unit squares?',
    loop: ['observe', 'manipulate', 'construct', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'matches_target', effect: 'celebrate', message: 'Now count the unit squares it covers.' },
      { trigger: 'shear_to_rectangle', effect: 'reveal_equal_area', message: 'Same base, same height — same area as the rectangle.' }
    ]
  },
  right_triangle: {
    representations: ['geometric', 'area', 'symbolic'],
    primitives: ['drag', 'resize', 'compare'],
    benefit: 0.85,
    learningGoal: 'The square on the hypotenuse equals the sum of the squares on the legs.',
    reflectionPrompt: 'Why does counting the cells in the two leg-squares tell you c²?',
    loop: ['observe', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'leg_out_of_range', effect: 'clamp', message: 'Keep the legs on the grid so you can count cells.' }
    ]
  },
  function_grapher: {
    representations: ['graph', 'linear', 'symbolic'],
    primitives: ['drag', 'snap', 'compare'],
    benefit: 0.85,
    learningGoal: 'A line is a constant rate of change: slope is rise over run, and the y-intercept is where it crosses x = 0.',
    reflectionPrompt: 'How did the rise-over-run triangle give you the slope?',
    loop: ['observe', 'manipulate', 'predict', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'reach_target', effect: 'celebrate', message: 'Now read the coordinate straight off the axis.' },
      { trigger: 'off_line', effect: 'snap', message: 'The tracer stays on the line.' }
    ]
  },
  parabola: {
    representations: ['graph', 'symbolic'],
    primitives: ['drag', 'transform'],
    benefit: 0.8,
    learningGoal: 'Each coefficient reshapes the curve and moves where it crosses the x-axis.',
    reflectionPrompt: 'Which coefficient moved the crossings the most — and why?',
    loop: ['observe', 'manipulate', 'predict', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'no_real_roots', effect: 'structural_message', message: 'The curve never reaches the axis (b² − 4ac < 0).' }
    ]
  },
  percent_bar: {
    representations: ['bar', 'partition', 'linear'],
    primitives: ['drag', 'snap', 'construct'],
    benefit: 0.8,
    learningGoal: 'A percentage is a count of equal cells of one whole, not a magic formula.',
    reflectionPrompt: 'How did counting the shaded cells give you the part?',
    loop: ['observe', 'predict', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'reach_target', effect: 'celebrate', message: 'Now count the shaded cells to build the part.' }
    ]
  },
  ratio_line: {
    representations: ['linear', 'bar'],
    primitives: ['drag', 'snap', 'compare', 'transform'],
    benefit: 0.82,
    learningGoal: 'Equivalent ratios are two quantities growing in lockstep.',
    reflectionPrompt: 'Why is every aligned pair you make the same ratio?',
    loop: ['observe', 'manipulate', 'construct', 'explain'],
    feedbackRules: [
      { trigger: 'scale_both', effect: 'lockstep', message: 'Both quantities scale together.' }
    ]
  },
  probability: {
    representations: ['set', 'area', 'simulation'],
    primitives: ['simulate', 'compare', 'construct'],
    benefit: 0.78,
    learningGoal: 'A probability is the count of favorable outcomes out of all equally-likely outcomes; many trials make the experimental rate approach it.',
    reflectionPrompt: 'Why does running more trials pull the experimental rate toward the theoretical probability?',
    loop: ['observe', 'predict', 'simulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'more_trials', effect: 'converge', message: 'More trials → the experimental rate approaches the theoretical probability.' }
    ]
  },
  dice_sim: {
    representations: ['simulation', 'distribution', 'bar'],
    primitives: ['simulate', 'compare'],
    benefit: 0.72,
    learningGoal: 'The long-run average of random outcomes settles toward the expected value.',
    reflectionPrompt: 'Your running average settled near one value — why that one?',
    loop: ['predict', 'simulate', 'observe', 'explain'],
    feedbackRules: [
      { trigger: 'predict_then_run', effect: 'compare', message: 'Predict where it will settle, then watch.' }
    ]
  },
  calculus: {
    representations: ['graph', 'area', 'symbolic'],
    primitives: ['drag', 'construct', 'compare'],
    benefit: 0.8,
    learningGoal: 'The derivative is the slope of the tangent that just touches the curve; a definite integral is accumulated area under it.',
    reflectionPrompt: 'How did the picture turn the calculus symbol into a slope or an area you could read?',
    loop: ['observe', 'predict', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'line_crosses', effect: 'secant', message: 'This line cuts through the curve — not yet the tangent.' },
      { trigger: 'accumulate', effect: 'fill', message: 'Each strip adds to the running area.' }
    ]
  },
  dot_plot: {
    representations: ['data', 'distribution', 'linear'],
    primitives: ['drag', 'snap', 'compare'],
    benefit: 0.8,
    learningGoal: 'The mean is the balance point of the data; the range is how far it spreads.',
    reflectionPrompt: 'Why does the data balance exactly at the mean?',
    loop: ['observe', 'predict', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'off_balance', effect: 'tilt', message: 'Not balanced yet — shift toward the heavier side.' },
      { trigger: 'balanced', effect: 'celebrate', message: 'Balanced — read the value off the axis.' }
    ]
  },
  number_line: {
    representations: ['linear'],
    primitives: ['simulate', 'snap'],
    benefit: 0.58,
    learningGoal: 'Operations are movements along the line; a remainder is the leftover distance.',
    reflectionPrompt: 'Where you landed — how does its position answer the question?',
    loop: ['observe', 'manipulate', 'verify', 'explain'],
    feedbackRules: [
      { trigger: 'overshoot', effect: 'block', message: 'No full jump fits — read the leftover distance.' }
    ]
  }
};

// -----------------------------------------------------------------------------
// Which concepts each model serves. The union is the set of "visual concepts"
// the engine recognizes (the concept gate). This is the SINGLE source of the
// concept→model mapping — visualEngine builders read their concept lists here.
// -----------------------------------------------------------------------------
const MODEL_CONCEPTS = {
  balance_scale: ['linear_one_step', 'linear_two_step', 'linear_variable_both_sides', 'linear_system', 'eqn_onestep_div', 'eqn_fraction_coeff', 'eqn_clear_denom', 'eqn_proportion', 'eqn_two_step_fraction'],
  parabola: ['quadratic', 'quadratic_factoring', 'quadratic_formula', 'discriminant_roots', 'complete_the_square'],
  function_grapher: ['slope_intercept_id', 'point_on_line', 'function_evaluate', 'function_solve', 'slope_from_points'],
  right_triangle: ['pythagorean', 'distance_formula'],
  shape_grid: ['geo_area_rect', 'geo_area_triangle', 'geo_area_parallelogram', 'geo_area_trapezoid', 'geo_perimeter_rect', 'geo_composite'],
  percent_bar: ['percentage_of', 'percentage', 'percent_change', 'percent_discount', 'percent_markup', 'percent_error', 'simple_interest'],
  ratio_line: ['ratio_solve', 'proportion_solve', 'unit_rate', 'ratios', 'proportions', 'ratio_simplify', 'ratio_share', 'unit_price', 'scale_factor'],
  fraction_bar: ['fraction_simplify', 'fraction_add', 'fraction_sub', 'fraction_mult', 'fraction_div', 'fraction_compare', 'mixed_number', 'fraction_of', 'fraction_negative', 'fraction_decimal_convert'],
  dice_sim: ['compound_probability', 'prob_without_replacement', 'expected_value'],
  probability: ['stat_probability', 'probability_complement', 'stat_theoretical_prob', 'stat_experimental_prob'],
  number_line: ['arithmetic_add', 'arithmetic_sub', 'modular_arithmetic', 'integer_add', 'integer_sub', 'integer_compare'],
  dot_plot: ['stat_mean', 'mean_missing_value', 'stat_range', 'stat_median', 'stat_mode', 'stat_mad', 'stat_quartile', 'stat_iqr'],
  calculus: ['derivative', 'integral', 'limit'],
  area_model: ['arithmetic_mult', 'distribute', 'foil_binomials', 'square_binomial', 'factor_trinomial'],
  algebra_tiles: ['combine_like_terms']
};

// concept -> model name
const CONCEPT_MODEL = {};
for (const [model, list] of Object.entries(MODEL_CONCEPTS)) {
  for (const c of list) CONCEPT_MODEL[c] = model;
}

// The set of concepts the engine recognizes as having a visual model (the gate).
const VISUAL_CONCEPTS = new Set(Object.keys(CONCEPT_MODEL));

function modelFor(conceptId) {
  return conceptId ? (CONCEPT_MODEL[conceptId] || null) : null;
}

// Whether the engine recognizes this concept at all (gate is active for these).
function isVisualConcept(conceptId) {
  return !!conceptId && VISUAL_CONCEPTS.has(conceptId);
}

// Full metadata for a concept (model meta + its real misconceptions from the
// graph), or null if the concept has no visual model. The misconceptions let the
// renderer build TARGETED decoys instead of generic ones.
function metadataFor(conceptId) {
  const model = modelFor(conceptId);
  if (!model) return null;
  const meta = MODEL_META[model];
  let misconceptions = [];
  try {
    const { concepts } = require('./knowledgeGraph');
    const node = concepts[conceptId];
    if (node && Array.isArray(node.misconceptions)) {
      misconceptions = node.misconceptions.map((m) => ({ id: m.id, label: m.label }));
    }
  } catch (_) { /* graph optional */ }
  return {
    model,
    representations: meta.representations.slice(),
    primitives: meta.primitives.slice(),
    benefit: meta.benefit,
    learningGoal: meta.learningGoal,
    reflectionPrompt: meta.reflectionPrompt,
    loop: meta.loop.slice(),
    feedbackRules: meta.feedbackRules.map((r) => ({ ...r })),
    misconceptions
  };
}

// Base benefit weight for a concept (0 when no model). Unknown concepts return
// `null` so the benefit engine can distinguish "known to not benefit" (0) from
// "unrecognized — fall back to pattern matching" (null).
function benefitFor(conceptId) {
  if (!conceptId) return null;
  const model = CONCEPT_MODEL[conceptId];
  if (model) return MODEL_META[model].benefit;
  return isVisualConcept(conceptId) ? 0 : null;
}

// Enrich a built spec in place with the metadata fields the renderer consumes.
// Never adds answer-bearing data — only concept-level, answer-free guidance.
function enrichSpec(spec, conceptId) {
  if (!spec) return spec;
  const meta = metadataFor(conceptId) || MODEL_META[spec.type] || null;
  if (!meta) return spec;
  if (!spec.learningGoal) spec.learningGoal = meta.learningGoal;
  // A builder may supply a mode-specific reflection prompt (e.g. tangent vs.
  // accumulation share one model); otherwise use the model's default.
  if (!spec.reflectionPrompt) spec.reflectionPrompt = meta.reflectionPrompt;
  spec.primitives = meta.primitives;
  spec.representations = meta.representations;
  spec.loop = meta.loop;
  spec.feedbackRules = meta.feedbackRules;
  if (meta.misconceptions && meta.misconceptions.length) spec.misconceptions = meta.misconceptions;
  return spec;
}

module.exports = {
  PRIMITIVES,
  LOOP_STAGES,
  MODEL_META,
  MODEL_CONCEPTS,
  VISUAL_CONCEPTS,
  modelFor,
  isVisualConcept,
  metadataFor,
  benefitFor,
  enrichSpec
};
