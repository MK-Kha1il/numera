// Problem Orchestrator — the core intelligence engine
// Answers: "What is the best next mathematical experience for this learner right now?"
//
// Priority hierarchy:
//  1. CRITICAL MISCONCEPTION   — targeted remediation for a severe/persistent misconception
//  2. OVERDUE RETENTION REVIEW — spaced repetition for a decaying concept
//  3. PREREQUISITE GAP         — foundational concept blocking progress
//  4. MASTERY BUILDING         — deliberate practice on current target concept
//  5. EXPLORATION              — introduce the next ready concept
//  6. CHALLENGE                — push beyond comfort zone when mastery is high

const { concepts, getDependencies }  = require('./knowledgeGraph');
const { getActiveMisconceptions,
        getConceptMisconceptions,
        buildMisconceptionWarning }   = require('./misconceptionEngine');
const { getOverdueReviews }           = require('./retentionEngine');
const { getProfile, getWeakConcepts,
        getStrongConcepts }           = require('./learnerModel');
const { computeMasteryProfile }       = require('./masteryEngine');
const { hasTransfer }                 = require('./transferEngine');
const { getLearningStyle,
        adaptExplanation }            = require('./teachingEngine');
const { constructPersonalizedExplanation } = require('./explanationEngine');
const { buildVisualSpecJson }         = require('./visualEngine');
const { getConceptRecency,
        leastRecentlySeen }           = require('./exerciseMemory');

// Map template category + type string → conceptId in knowledgeGraph
const TYPE_TO_CONCEPT = {
  arithmetic_add:       'arithmetic_add',
  arithmetic_sub:       'arithmetic_sub',
  arithmetic_mult:      'arithmetic_mult',
  arithmetic_div:       'arithmetic_div',
  arithmetic_pemdas:    'pemdas',
  pemdas:               'pemdas',
  pythagorean:          'pythagorean',
  linear_one_step:      'linear_one_step',
  linear_two_step:      'linear_two_step',
  quadratic:            'quadratic',
  matrix_trace:         'matrix_trace',
  matrix_determinant:   'matrix_determinant',
  pigeonhole:           'pigeonhole',
  permutations:         'permutations',
  combinations:         'combinations',
  // These two must sit ABOVE 'binomial': conceptFromType matches by substring in insertion
  // order, and 'binomial' would otherwise capture both polynomial types.
  foil_binomials:       'foil_binomials',
  square_binomial:      'square_binomial',
  binomial:             'binomial',
  derivative:           'derivative',
  integral:             'integral',
  gcd_lcm:              'gcd_lcm',
  modular_arithmetic:   'modular_arithmetic',
  totient:              'totient',
  // Advanced promotions: the template type strings differ from their conceptIds.
  limit:                'limit',
  divisors:             'divisor_count',
  // Graphing strand — template types equal conceptIds; mapping them routes the Socratic
  // engine to the concept-specific misconception rules instead of the generic fallback.
  point_on_line:        'point_on_line',
  slope_from_points:    'slope_from_points',
  slope_intercept_id:   'slope_intercept_id',
  midpoint:             'midpoint',
  distance_formula:     'distance_formula',
  // Inequalities strand + geometry depth — same identity pattern.
  inequality_one_step_add:  'inequality_one_step_add',
  inequality_one_step_mult: 'inequality_one_step_mult',
  inequality_flip_negative: 'inequality_flip_negative',
  inequality_two_step:      'inequality_two_step',
  inequality_compound:      'inequality_compound',
  geo_volume_rect:          'geo_volume_rect',
  geo_surface_area_rect:    'geo_surface_area_rect',
  geo_circumference:        'geo_circumference',
  geo_volume_cylinder:      'geo_volume_cylinder',
  // Volume II — cone, sphere, pyramid.
  geo_volume_cone:          'geo_volume_cone',
  geo_volume_sphere:        'geo_volume_sphere',
  geo_volume_pyramid:       'geo_volume_pyramid',
  // Surface area II — cylinder, sphere, cone.
  geo_surface_cylinder:     'geo_surface_cylinder',
  geo_surface_sphere:       'geo_surface_sphere',
  geo_surface_cone:         'geo_surface_cone',
  // Algebra promotions + polynomial/measurement depth.
  linear_variable_both_sides: 'linear_variable_both_sides',
  linear_system:            'linear_system',
  // Systems II — solving methods + solution types.
  linear_system_substitution:   'linear_system_substitution',
  linear_system_elimination:    'linear_system_elimination',
  linear_system_solution_types: 'linear_system_solution_types',
  // Quadratics II — solving methods (factoring, formula, discriminant, completing the square).
  quadratic_factoring:      'quadratic_factoring',
  quadratic_formula:        'quadratic_formula',
  discriminant_roots:       'discriminant_roots',
  complete_the_square:      'complete_the_square',
  factor_trinomial:         'factor_trinomial',
  unit_convert_metric:      'unit_convert_metric',
  unit_convert_time:        'unit_convert_time',
  // Proportional / integers / fractions / probability depth.
  unit_rate:                'unit_rate',
  proportion_solve:         'proportion_solve',
  integer_div:              'integer_div',
  integer_ops:              'integer_ops',
  mixed_number:             'mixed_number',
  fraction_compare:         'fraction_compare',
  compound_probability:     'compound_probability',
  // Decimals / powers / geometry / statistics depth (wave 5).
  percent_decimal_convert:  'percent_decimal_convert',
  decimal_compare:          'decimal_compare',
  fraction_decimal_convert: 'fraction_decimal_convert',
  cube_root:                'cube_root',
  exponent_power_rule:      'exponent_power_rule',
  geo_composite:            'geo_composite',
  mean_missing_value:       'mean_missing_value',
  // Ordering / translation / angles / percent applications (wave 6).
  integer_compare:          'integer_compare',
  translate_expression:     'translate_expression',
  geo_angles_lines:         'geo_angles_lines',
  percent_discount:         'percent_discount',
  simple_interest:          'simple_interest',
  multi_step_word:          'multi_step_word',
  // Functions strand.
  function_evaluate:        'function_evaluate',
  function_table:           'function_table',
  rate_of_change:           'rate_of_change',
  function_initial:         'function_initial',
  function_solve:           'function_solve',
  // Capstone depth (wave 7).
  probability_complement:   'probability_complement',
  coord_reflect:            'coord_reflect',
  coord_translate:          'coord_translate',
  // Transformations II — rotations & dilation.
  coord_rotate_180:         'coord_rotate_180',
  coord_rotate_90:          'coord_rotate_90',
  coord_dilate:             'coord_dilate',
  percent_markup:           'percent_markup',
  percent_error:            'percent_error',
  // Rational / probability / geometry / powers depth (wave 8).
  fraction_negative:        'fraction_negative',
  prob_without_replacement: 'prob_without_replacement',
  geo_area_parallelogram:   'geo_area_parallelogram',
  geo_area_trapezoid:       'geo_area_trapezoid',
  exponent_power_of_product: 'exponent_power_of_product',
  // Statistics II — measures of spread.
  stat_quartile:            'stat_quartile',
  stat_iqr:                 'stat_iqr',
  stat_mad:                 'stat_mad',
  // Statistics III — probability foundations.
  stat_theoretical_prob:    'stat_theoretical_prob',
  stat_experimental_prob:   'stat_experimental_prob',
  stat_sample_space:        'stat_sample_space',
  // Factors & multiples strand — template types equal conceptIds (prefixed to dodge gcd_lcm).
  prime_factorization:      'prime_factorization',
  find_gcf:                 'find_gcf',
  find_lcm:                 'find_lcm',
  gcf_word:                 'gcf_word',
  lcm_word:                 'lcm_word',
  // Ratios & rates strand — template types equal conceptIds.
  ratio_simplify:           'ratio_simplify',
  ratio_share:              'ratio_share',
  unit_price:               'unit_price',
  speed_dist_time:          'speed_dist_time',
  scale_factor:             'scale_factor',
  // Equations strand — template types equal conceptIds.
  eqn_onestep_div:          'eqn_onestep_div',
  eqn_fraction_coeff:       'eqn_fraction_coeff',
  eqn_clear_denom:          'eqn_clear_denom',
  eqn_proportion:           'eqn_proportion',
  eqn_two_step_fraction:    'eqn_two_step_fraction',
  // Sequences strand — template types equal conceptIds.
  arithmetic_next_term:         'arithmetic_next_term',
  arithmetic_common_difference: 'arithmetic_common_difference',
  arithmetic_nth_term:          'arithmetic_nth_term',
  geometric_next_term:          'geometric_next_term',
  geometric_common_ratio:       'geometric_common_ratio',
  // Sequences II.
  geometric_nth_term:           'geometric_nth_term',
  arithmetic_series:            'arithmetic_series',
  fibonacci_next:               'fibonacci_next'
};

// Resolve a concept from a template type string
function conceptFromType(type) {
  if (!type) return null;
  const lower = type.toLowerCase();
  for (const [key, val] of Object.entries(TYPE_TO_CONCEPT)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

// -----------------------------------------------------------------------
// Determine which concept a user should work on next (returns conceptId)
// -----------------------------------------------------------------------
async function selectNextConcept(db, userId, currentCategory, currentLevel) {
  // Concept-level freshness: how recently has this learner seen each concept? Exposure rows
  // are keyed by template type, so canonicalize them to knowledge-graph conceptIds (merging
  // synonyms like "modulo" -> "modular_arithmetic"). Used only to break ties between concepts
  // that are *equally valid* to teach next — it never overrides pedagogical priority.
  let conceptRecency = {};
  try {
    const raw = await getConceptRecency(db, userId);
    for (const [type, rec] of Object.entries(raw)) {
      const canon = conceptFromType(type) || type;
      const cur = conceptRecency[canon] || { lastSeen: 0, seenCount: 0 };
      conceptRecency[canon] = {
        lastSeen: Math.max(cur.lastSeen, rec.lastSeen || 0),
        seenCount: cur.seenCount + (rec.seenCount || 0),
      };
    }
  } catch (_) {
    conceptRecency = {};
  }
  const stalest = (candidates) => leastRecentlySeen(candidates, conceptRecency) || candidates[0];

  // 1. Check for critical misconceptions — scoped to current category so we don't
  //    inject calculus problems into an arithmetic session.
  const categoryConceptIdsEarly = getCategoryConceptIds(currentCategory, currentLevel);
  const misconceptions = await getActiveMisconceptions(db, userId, 5);
  const critical = misconceptions.find(
    m => (m.severity === 'high' || m.persistence > 0.6) &&
         categoryConceptIdsEarly.includes(m.concept_id)
  );
  if (critical) {
    return {
      conceptId: critical.concept_id,
      reason:    'misconception_remediation',
      priority:  1,
      meta:      { misconception: critical }
    };
  }

  // 2. Check overdue retention reviews — same category guard.
  const overdueReviews = await getOverdueReviews(db, userId);
  const topOverdue = overdueReviews.find(r => categoryConceptIdsEarly.includes(r.concept_id));
  if (topOverdue) {
    return {
      conceptId: topOverdue.concept_id,
      reason:    'retention_review',
      priority:  2,
      meta:      { schedule: topOverdue }
    };
  }

  // 3. Identify prerequisite gaps for the current concept path — only surface
  //    prereqs that are themselves within the same category so a permutations
  //    session never injects arithmetic_mult problems.
  const categoryConceptIds = categoryConceptIdsEarly;
  for (const conceptId of categoryConceptIds) {
    const prereqs = getDependencies(conceptId)
      .filter(p => p !== conceptId && categoryConceptIds.includes(p));
    for (const prereqId of prereqs) {
      const profile = await getProfile(db, userId, prereqId);
      if (profile.exposure_count > 0 && profile.mastery_score < 0.55) {
        return {
          conceptId: prereqId,
          reason:    'prerequisite_gap',
          priority:  3,
          meta:      { blockedConcept: conceptId, masteryScore: profile.mastery_score }
        };
      }
    }
  }

  // 4. Find the weakest concept that needs mastery building
  const weakConcepts = await getWeakConcepts(db, userId, 0.7);
  const relevantWeak = weakConcepts.filter(w => categoryConceptIds.includes(w.concept_id));
  if (relevantWeak.length > 0) {
    // Keep the genuinely-weakest as the anchor, but among concepts within a small band of it
    // (all about equally in need of work) prefer the one seen least recently — so a learner
    // with several soft spots doesn't get hammered on the same one every round.
    const floor = relevantWeak[0].mastery_score;
    const tied = relevantWeak.filter(w => w.mastery_score <= floor + 0.08);
    const chosen = stalest(tied.map(w => w.concept_id));
    const picked = relevantWeak.find(w => w.concept_id === chosen) || relevantWeak[0];
    return {
      conceptId: picked.concept_id,
      reason:    'mastery_building',
      priority:  4,
      meta:      { masteryScore: picked.mastery_score }
    };
  }

  // 4b. Dimension building — a concept that is overall solid but has one specific weak dimension.
  //     Retention weakness already routes through step 2 (retention review); here we deliberately
  //     target FLUENCY (accurate but slow) or INDEPENDENCE (reliant on hints), which otherwise
  //     never get singled out. This is the multi-dimensional-mastery payoff: not all "good enough"
  //     concepts are equal, and we push the specific edge that is lagging.
  for (const conceptId of categoryConceptIds) {
    const profile = await getProfile(db, userId, conceptId);
    if (profile.exposure_count < 3) continue;  // need enough signal to trust the dimensions
    const mp = computeMasteryProfile(profile);
    if (mp.overall >= 0.6 && (mp.weakest === 'fluency' || mp.weakest === 'independence')) {
      return {
        conceptId,
        reason:    'dimension_building',
        priority:  4,
        meta:      { dimension: mp.weakest, focus: mp.focus, dimensions: mp.dimensions },
      };
    }
  }

  // 4c. Transfer practice — the concept is solid in-context (accurate + independent) but has never
  //     been applied out-of-context. Recommend a transfer challenge to prove real understanding,
  //     not just procedural recall (Sprint 4). Served via /api/math/transfer/challenge.
  for (const conceptId of categoryConceptIds) {
    if (!hasTransfer(conceptId)) continue;
    const profile = await getProfile(db, userId, conceptId);
    const mp = computeMasteryProfile(profile);
    if (mp.transferReady) {
      return {
        conceptId,
        reason:    'transfer_practice',
        priority:  4,
        meta:      { transfer: true, dimensions: mp.dimensions },
      };
    }
  }

  // 5. Exploration — find concepts in this category whose prereqs are all mastered.
  const strongConcepts = await getStrongConcepts(db, userId, 0.75);
  const masteredIds = new Set(strongConcepts.map(s => s.concept_id));
  const readyToExplore = categoryConceptIds.filter(
    cId => !masteredIds.has(cId) && concepts[cId] && concepts[cId].prereqs.every(p => masteredIds.has(p))
  );
  if (readyToExplore.length > 0) {
    return {
      conceptId: stalest(readyToExplore),
      reason:    'exploration',
      priority:  5,
      meta:      { candidates: readyToExplore.length }
    };
  }

  // 6. Challenge — push a mastered concept further, scoped to current category.
  const relevantStrong = strongConcepts.filter(s => categoryConceptIds.includes(s.concept_id));
  if (relevantStrong.length > 0) {
    const chosenId = stalest(relevantStrong.map(s => s.concept_id));
    const picked = relevantStrong.find(s => s.concept_id === chosenId) || relevantStrong[0];
    return {
      conceptId: picked.concept_id,
      reason:    'challenge',
      priority:  6,
      meta:      { masteryScore: picked.mastery_score }
    };
  }

  // Fallback
  return { conceptId: categoryConceptIds[0] || 'arithmetic_add', reason: 'fallback', priority: 7, meta: {} };
}

// Map category + level to the expected concept IDs for that range
function getCategoryConceptIds(category, level) {
  const map = {
    arithmetic:    ['arithmetic_add', 'arithmetic_sub', 'arithmetic_mult', 'arithmetic_div', 'pemdas'],
    algebra:       ['linear_one_step', 'linear_two_step', 'linear_variable_both_sides', 'quadratic', 'linear_system', 'matrix_trace', 'matrix_determinant', 'linear_system_substitution', 'linear_system_elimination', 'linear_system_solution_types', 'quadratic_factoring', 'quadratic_formula', 'discriminant_roots', 'complete_the_square'],
    combinatorics: ['pigeonhole', 'permutations', 'combinations', 'binomial'],
    calculus:      ['derivative', 'integral', 'limit'],
    number_theory: ['gcd_lcm', 'modular_arithmetic', 'totient', 'divisor_count'],
    mental:        ['arithmetic_add', 'arithmetic_sub', 'arithmetic_mult'],
    milestone:     ['pythagorean', 'binomial', 'integral', 'totient'],
    // Curriculum strands (audit #1.1). Must stay in sync with CONCEPT_TO_LEVEL in
    // mathGenerator.js — strandCoherence.test.js enforces it. Without these entries the
    // category falls back to arithmetic and the orchestrator's misconception/SRS/weak-concept
    // targeting silently stops working for the strand.
    geometry:      ['geo_perimeter_rect', 'geo_area_rect', 'geo_area_triangle', 'geo_angles_triangle', 'geo_circle_area',
                    'geo_volume_rect', 'geo_surface_area_rect', 'geo_circumference', 'geo_volume_cylinder', 'geo_composite', 'geo_angles_lines',
                    'geo_area_parallelogram', 'geo_area_trapezoid', 'geo_volume_cone', 'geo_volume_sphere', 'geo_volume_pyramid',
                    'geo_surface_cylinder', 'geo_surface_sphere', 'geo_surface_cone'],
    integers:      ['absolute_value', 'integer_add', 'integer_sub', 'integer_compare', 'integer_mult', 'integer_div', 'integer_ops'],
    decimals:      ['decimal_add', 'percent_decimal_convert', 'decimal_sub', 'decimal_compare', 'decimal_mult', 'fraction_decimal_convert', 'decimal_round', 'decimal_div'],
    fractions:     ['fraction_simplify', 'fraction_add', 'mixed_number', 'fraction_sub', 'fraction_compare', 'fraction_mult', 'fraction_div', 'fraction_negative'],
    number_sense:  ['percentage_of', 'fraction_of', 'ratio_solve', 'percent_change', 'unit_convert_metric', 'unit_convert_time', 'unit_rate', 'exponent_power', 'proportion_solve',
                    'percent_discount', 'simple_interest', 'multi_step_word', 'percent_markup', 'percent_error'],
    statistics:    ['stat_mode', 'stat_mean', 'stat_median', 'stat_range', 'mean_missing_value', 'stat_probability', 'compound_probability', 'probability_complement', 'prob_without_replacement', 'stat_quartile', 'stat_iqr', 'stat_mad', 'stat_theoretical_prob', 'stat_experimental_prob', 'stat_sample_space'],
    expressions:   ['eval_expression', 'eval_two_var', 'combine_like_terms', 'translate_expression', 'distribute', 'foil_binomials', 'square_binomial', 'factor_trinomial'],
    powers:        ['square_root', 'cube_root', 'exponent_power_of_product', 'exponent_product_rule', 'exponent_power_rule', 'exponent_quotient_rule', 'exponent_zero_negative', 'scientific_notation'],
    graphing:      ['point_on_line', 'slope_from_points', 'slope_intercept_id', 'midpoint', 'distance_formula', 'coord_reflect', 'coord_translate', 'coord_rotate_180', 'coord_rotate_90', 'coord_dilate'],
    inequalities:  ['inequality_one_step_add', 'inequality_one_step_mult', 'inequality_flip_negative', 'inequality_two_step', 'inequality_compound'],
    functions:     ['function_evaluate', 'function_table', 'rate_of_change', 'function_initial', 'function_solve'],
    sequences:     ['arithmetic_next_term', 'arithmetic_common_difference', 'arithmetic_nth_term', 'geometric_next_term', 'geometric_common_ratio', 'geometric_nth_term', 'arithmetic_series', 'fibonacci_next'],
    equations:     ['eqn_onestep_div', 'eqn_fraction_coeff', 'eqn_clear_denom', 'eqn_proportion', 'eqn_two_step_fraction'],
    rates:         ['ratio_simplify', 'ratio_share', 'unit_price', 'speed_dist_time', 'scale_factor'],
    factors:       ['prime_factorization', 'find_gcf', 'find_lcm', 'gcf_word', 'lcm_word']
  };
  const key = (category || 'arithmetic').toLowerCase();
  return map[key] || map.arithmetic;
}

// -----------------------------------------------------------------------
// Build a full enriched problem package
// problem: raw problem object from template generator
// -----------------------------------------------------------------------
async function enrichProblem(db, userId, problem, orchestrationMeta) {
  const conceptId = conceptFromType(problem.type) || orchestrationMeta.conceptId;

  // 1. Fetch concept-level misconceptions for this user
  const misconceptions = conceptId
    ? await getConceptMisconceptions(db, userId, conceptId)
    : [];
  const misconceptionWarning = buildMisconceptionWarning(misconceptions);

  // 2. Personalise explanation (and capture the profile for visual gating)
  let explanation = problem.explanation || '';
  let learnerProfile = null;
  if (conceptId) {
    learnerProfile = await getProfile(db, userId, conceptId);
    explanation = constructPersonalizedExplanation(conceptId, explanation, {
      hesitation_index: learnerProfile.avg_response_ms > 15000 ? 2 : 0.5,
      success_rate:     learnerProfile.accuracy_rate
    });
  }

  // 3. Build structured explanation object
  const structuredExplanation = {
    solution:            explanation,
    simplified:          buildSimplifiedExplanation(problem, conceptId),
    tip:                 problem.tip || (problem.tipMetadata ? problem.tipMetadata.learningObjective : null),
    misconceptionWarning,
    solutionPath:        buildSolutionPath(problem, conceptId),
    educationalNote:     buildEducationalNote(conceptId, orchestrationMeta.reason)
  };

  // 4. Adapt to learning style
  const styleProfile = await getLearningStyle(db, userId);
  const adaptedExplanation = adaptExplanation(structuredExplanation, styleProfile);

  // 5. Adaptive Visual Intelligence — attach an interactive manipulative when
  //    (and only when) this concept becomes easier to understand by touching it.
  let interactiveVisualJson = null;
  try {
    interactiveVisualJson = buildVisualSpecJson(problem, conceptId, learnerProfile);
  } catch (_) {
    interactiveVisualJson = null;
  }

  return {
    ...problem,
    conceptId,
    orchestration: {
      reason:   orchestrationMeta.reason,
      priority: orchestrationMeta.priority,
      meta:     orchestrationMeta.meta
    },
    enrichedExplanation: adaptedExplanation,
    interactiveVisualJson
  };
}

function buildSimplifiedExplanation(problem, conceptId) {
  if (!conceptId) return null;
  const simplifications = {
    arithmetic_add:    'Add the two numbers together.',
    arithmetic_sub:    'Subtract the smaller number from the larger.',
    arithmetic_mult:   'Multiply: repeated addition of the same value.',
    arithmetic_div:    'Divide: split the total into equal groups.',
    pemdas:            'Solve Parentheses → Exponents → Multiply/Divide → Add/Subtract.',
    linear_one_step:   'Undo the operation to isolate x.',
    linear_two_step:   'Undo addition/subtraction first, then undo multiplication/division.',
    quadratic:         'Factor or use the quadratic formula to find both roots.',
    derivative:        'Power rule: bring the exponent down and reduce it by one.',
    integral:          'Reverse the power rule: raise exponent by one and divide.',
    gcd_lcm:           'GCD: find the largest factor shared by both numbers.',
    modular_arithmetic:'Find the remainder after dividing by the modulus.',
    combinations:      'n choose k = n! / (k! × (n-k)!)',
    permutations:      'n permute k = n! / (n-k)!'
  };
  return simplifications[conceptId] || null;
}

function buildSolutionPath(problem, conceptId) {
  // Returns a step-indicator string. Real step-by-step is in explanation.
  if (!conceptId) return null;
  const paths = {
    linear_two_step: ['Identify constants and coefficient', 'Move constant to RHS', 'Divide both sides by coefficient'],
    quadratic:       ['Write standard form ax²+bx+c=0', 'Compute discriminant b²-4ac', 'Apply quadratic formula'],
    derivative:      ['Identify coefficient and exponent', 'Multiply coefficient by exponent', 'Reduce exponent by 1'],
    integral:        ['Identify integrand', 'Increase exponent by 1', 'Divide by new exponent', 'Apply bounds'],
    combinations:    ['Write n and k', 'Compute n!', 'Compute k! and (n-k)!', 'Divide']
  };
  return paths[conceptId] || null;
}

function buildEducationalNote(conceptId, reason) {
  if (reason === 'misconception_remediation') {
    return '🎯 This problem specifically targets a mistake pattern you\'ve shown before. Focus carefully on each step.';
  }
  if (reason === 'retention_review') {
    return '🔁 You haven\'t seen this concept in a while. This review strengthens long-term memory.';
  }
  if (reason === 'prerequisite_gap') {
    return '🔑 Mastering this foundational concept will unlock more advanced topics.';
  }
  if (reason === 'dimension_building') {
    return '🎯 You\'ve got the idea — this round sharpens a specific edge (solving faster, or unaided) to deepen your mastery.';
  }
  if (reason === 'transfer_practice') {
    return '🧩 You\'ve mastered the standard form — now apply it in a new, unfamiliar context to prove you truly understand it.';
  }
  if (reason === 'exploration') {
    return '🌟 You\'ve mastered the prerequisites — this is a new concept for you!';
  }
  if (reason === 'challenge') {
    return '🏆 You\'re performing well. This problem pushes your mastery further.';
  }
  return null;
}

module.exports = {
  selectNextConcept,
  enrichProblem,
  conceptFromType,
  getCategoryConceptIds
};
