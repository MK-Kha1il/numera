// Procedural Mathematics Challenge Generator for Numera
// Integrated with the Modular Adaptive Mathematical Intelligence Engine

const { calculateDifficultyProfile, calculateAdaptiveDifficulty } = require('./mathEngine/adaptive');
const { generateDistractors } = require('./mathEngine/distractors');
const { templates } = require('./mathEngine/templates');
const { getLessonAndExamples, getLessonForArchive } = require('./mathEngine/lessons');
const {
  factorial,
  gcd,
  lcm,
  isPrime,
  getPrimeFactors,
  getDivisors,
  generatePythagoreanTriple,
  generateQuadraticEquation,
  generateMatrix2x2,
  derangement
} = require('./mathEngine/symbolic');
const { constructPersonalizedExplanation } = require('./mathEngine/explanationEngine');
const { solveSymbolically } = require('./mathEngine/validation');
const { buildSocraticJson } = require('./mathEngine/socraticEngine');
const { buildSelfExplainJson } = require('./mathEngine/selfExplainEngine');
const { buildWorkedExampleJson } = require('./mathEngine/workedExampleEngine');
const { conceptFromType } = require('./mathEngine/problemOrchestrator');

// Maps knowledge-graph conceptId → the canonical template category + level
// that generates problems of that concept type.
const CONCEPT_TO_LEVEL = {
  arithmetic_add:       { category: 'arithmetic',    level: 1  },
  arithmetic_sub:       { category: 'arithmetic',    level: 6  },
  arithmetic_mult:      { category: 'arithmetic',    level: 7  },
  arithmetic_div:       { category: 'arithmetic',    level: 8  },
  pemdas:               { category: 'arithmetic',    level: 9  },
  pythagorean:          { category: 'arithmetic',    level: 10 },
  // Geometry strand (audit #1.1 — parallel curriculum, routed by category not level band).
  geo_perimeter_rect:   { category: 'geometry',      level: 2  },
  geo_area_rect:        { category: 'geometry',      level: 3  },
  geo_area_triangle:    { category: 'geometry',      level: 4  },
  geo_angles_triangle:  { category: 'geometry',      level: 5  },
  geo_circle_area:      { category: 'geometry',      level: 12 },
  // Geometry depth (solid measurement — volume, surface area, circumference).
  geo_volume_rect:      { category: 'geometry',      level: 6  },
  geo_surface_area_rect:{ category: 'geometry',      level: 7  },
  geo_circumference:    { category: 'geometry',      level: 8  },
  geo_volume_cylinder:  { category: 'geometry',      level: 9  },
  geo_composite:        { category: 'geometry',      level: 11 },
  geo_angles_lines:     { category: 'geometry',      level: 13 },
  geo_area_parallelogram: { category: 'geometry',    level: 14 },
  geo_area_trapezoid:   { category: 'geometry',      level: 15 },
  // Volume II — cone, sphere, pyramid (band extended to 18; the 8.G.C.9 / HSG-GMD family).
  geo_volume_cone:      { category: 'geometry',      level: 16 },
  geo_volume_sphere:    { category: 'geometry',      level: 17 },
  geo_volume_pyramid:   { category: 'geometry',      level: 18 },
  // Surface area II — cylinder, sphere, cone (band extended to 22; 21/22 skip the 20 boss).
  geo_surface_cylinder: { category: 'geometry',      level: 19 },
  geo_surface_sphere:   { category: 'geometry',      level: 21 },
  geo_surface_cone:     { category: 'geometry',      level: 22 },
  // Integers strand (audit #1.1 — signed-number arithmetic; the negatives band).
  absolute_value:       { category: 'integers',      level: 4  },
  integer_add:          { category: 'integers',      level: 5  },
  integer_sub:          { category: 'integers',      level: 6  },
  integer_compare:      { category: 'integers',      level: 7  },
  integer_mult:         { category: 'integers',      level: 8  },
  integer_div:          { category: 'integers',      level: 9  },
  integer_ops:          { category: 'integers',      level: 11 },
  // Decimals strand (audit #1.1 — decimal place value & operations; all math in scaled ints).
  decimal_add:          { category: 'decimals',      level: 3  },
  percent_decimal_convert: { category: 'decimals',   level: 4  },
  decimal_sub:          { category: 'decimals',      level: 5  },
  decimal_compare:      { category: 'decimals',      level: 6  },
  decimal_mult:         { category: 'decimals',      level: 7  },
  fraction_decimal_convert: { category: 'decimals',  level: 8  },
  decimal_round:        { category: 'decimals',      level: 9  },
  decimal_div:          { category: 'decimals',      level: 11 },
  // Fractions strand (audit #1.1 — fraction operations, the core middle-school topic).
  fraction_simplify:    { category: 'fractions',     level: 3  },
  fraction_add:         { category: 'fractions',     level: 4  },
  mixed_number:         { category: 'fractions',     level: 5  },
  fraction_sub:         { category: 'fractions',     level: 6  },
  fraction_compare:     { category: 'fractions',     level: 7  },
  fraction_mult:        { category: 'fractions',     level: 8  },
  fraction_div:         { category: 'fractions',     level: 9  },
  fraction_negative:    { category: 'fractions',     level: 11 },
  // Number-sense / pre-algebra strand (audit #1.1 — the band the ladder used to skip).
  percentage_of:        { category: 'number_sense',  level: 6  },
  fraction_of:          { category: 'number_sense',  level: 7  },
  ratio_solve:          { category: 'number_sense',  level: 8  },
  percent_change:       { category: 'number_sense',  level: 9  },
  // Measurement depth (unit conversion — metric powers of ten vs. base-60 time).
  unit_convert_metric:  { category: 'number_sense',  level: 11 },
  unit_convert_time:    { category: 'number_sense',  level: 12 },
  unit_rate:            { category: 'number_sense',  level: 13 },
  exponent_power:       { category: 'number_sense',  level: 14 },
  proportion_solve:     { category: 'number_sense',  level: 15 },
  percent_discount:     { category: 'number_sense',  level: 16 },
  simple_interest:      { category: 'number_sense',  level: 17 },
  multi_step_word:      { category: 'number_sense',  level: 18 },
  percent_markup:       { category: 'number_sense',  level: 19 },
  percent_error:        { category: 'number_sense',  level: 21 },
  // Statistics strand (audit #1.1 — descriptive stats & basic probability).
  stat_mode:            { category: 'statistics',    level: 7  },
  stat_mean:            { category: 'statistics',    level: 8  },
  stat_median:          { category: 'statistics',    level: 9  },
  stat_range:           { category: 'statistics',    level: 11 },
  mean_missing_value:   { category: 'statistics',    level: 12 },
  stat_probability:     { category: 'statistics',    level: 13 },
  compound_probability: { category: 'statistics',    level: 14 },
  probability_complement: { category: 'statistics',  level: 15 },
  prob_without_replacement: { category: 'statistics', level: 16 },
  // Statistics II — measures of spread (depth on the existing strand, band extended to 19).
  stat_quartile:        { category: 'statistics',    level: 17 },
  stat_iqr:             { category: 'statistics',    level: 18 },
  stat_mad:             { category: 'statistics',    level: 19 },
  // Algebraic-expressions strand (audit #1.1 — the bridge into algebra).
  eval_expression:      { category: 'expressions',   level: 11 },
  eval_two_var:         { category: 'expressions',   level: 12 },
  combine_like_terms:   { category: 'expressions',   level: 13 },
  translate_expression: { category: 'expressions',   level: 14 },
  distribute:           { category: 'expressions',   level: 15 },
  // Polynomial depth (multiply & factor binomials — the algebra I core).
  foil_binomials:       { category: 'expressions',   level: 16 },
  square_binomial:      { category: 'expressions',   level: 17 },
  factor_trinomial:     { category: 'expressions',   level: 18 },
  // Powers strand (exponents & roots — the 8.EE band).
  square_root:            { category: 'powers',      level: 4  },
  cube_root:              { category: 'powers',      level: 5  },
  exponent_power_of_product: { category: 'powers',   level: 6  },
  exponent_product_rule:  { category: 'powers',      level: 7  },
  exponent_power_rule:    { category: 'powers',      level: 8  },
  exponent_quotient_rule: { category: 'powers',      level: 9  },
  exponent_zero_negative: { category: 'powers',      level: 11 },
  scientific_notation:    { category: 'powers',      level: 13 },
  // Graphing strand (linear graphing & the coordinate plane — 8.EE/8.F/8.G).
  // Keys deliberately skip 10: milestone keys are force-routed to boss categories.
  point_on_line:          { category: 'graphing',    level: 8  },
  slope_from_points:      { category: 'graphing',    level: 9  },
  slope_intercept_id:     { category: 'graphing',    level: 11 },
  midpoint:               { category: 'graphing',    level: 13 },
  distance_formula:       { category: 'graphing',    level: 15 },
  // Coordinate transformations (reflections & translations on the plane).
  coord_reflect:          { category: 'graphing',    level: 16 },
  coord_translate:        { category: 'graphing',    level: 17 },
  // Transformations II — rotations & dilation about the origin (band extended to 21; 20 boss).
  coord_rotate_180:       { category: 'graphing',    level: 18 },
  coord_rotate_90:        { category: 'graphing',    level: 19 },
  coord_dilate:           { category: 'graphing',    level: 21 },
  // Inequalities strand (order reasoning — the 6.EE/7.EE band). Keys skip 10 (boss-routed).
  inequality_one_step_add:  { category: 'inequalities', level: 7  },
  inequality_one_step_mult: { category: 'inequalities', level: 9  },
  inequality_flip_negative: { category: 'inequalities', level: 11 },
  inequality_two_step:      { category: 'inequalities', level: 13 },
  inequality_compound:      { category: 'inequalities', level: 15 },
  // Functions strand (8.F — notation, tables, rate of change). Keys skip 10 (boss-routed).
  function_evaluate:        { category: 'functions',  level: 7  },
  function_table:           { category: 'functions',  level: 9  },
  rate_of_change:           { category: 'functions',  level: 11 },
  function_initial:         { category: 'functions',  level: 13 },
  function_solve:           { category: 'functions',  level: 15 },
  // Equations strand (solving equations with fractions). Keys skip 10 (boss-routed).
  eqn_onestep_div:          { category: 'equations',  level: 7  },
  eqn_fraction_coeff:       { category: 'equations',  level: 9  },
  eqn_clear_denom:          { category: 'equations',  level: 11 },
  eqn_proportion:           { category: 'equations',  level: 13 },
  eqn_two_step_fraction:    { category: 'equations',  level: 15 },
  // Factors & multiples strand (middle-school number theory). Keys skip 10 (boss-routed).
  prime_factorization:      { category: 'factors',    level: 7  },
  find_gcf:                 { category: 'factors',    level: 9  },
  find_lcm:                 { category: 'factors',    level: 11 },
  gcf_word:                 { category: 'factors',    level: 13 },
  lcm_word:                 { category: 'factors',    level: 15 },
  // Ratios & rates strand (applied proportional reasoning). Keys skip 10 (boss-routed).
  ratio_simplify:           { category: 'rates',      level: 7  },
  ratio_share:              { category: 'rates',      level: 9  },
  unit_price:               { category: 'rates',      level: 11 },
  speed_dist_time:          { category: 'rates',      level: 13 },
  scale_factor:             { category: 'rates',      level: 15 },
  // Sequences strand (arithmetic & geometric patterns). Keys skip 10 (boss-routed).
  arithmetic_next_term:         { category: 'sequences', level: 7  },
  arithmetic_common_difference: { category: 'sequences', level: 9  },
  arithmetic_nth_term:          { category: 'sequences', level: 11 },
  geometric_next_term:          { category: 'sequences', level: 13 },
  geometric_common_ratio:       { category: 'sequences', level: 15 },
  // Sequences II — explicit geometric term, arithmetic series, recursive (band extended to 19).
  geometric_nth_term:           { category: 'sequences', level: 17 },
  arithmetic_series:            { category: 'sequences', level: 18 },
  fibonacci_next:               { category: 'sequences', level: 19 },
  linear_one_step:      { category: 'algebra',       level: 11 },
  linear_two_step:      { category: 'algebra',       level: 13 },
  // Promoted from variety templates: the level-14/16 generators already produced these.
  linear_variable_both_sides: { category: 'algebra', level: 14 },
  quadratic:            { category: 'algebra',       level: 15 },
  linear_system:        { category: 'algebra',       level: 16 },
  matrix_trace:         { category: 'algebra',       level: 17 },
  matrix_determinant:   { category: 'algebra',       level: 18 },
  pigeonhole:           { category: 'combinatorics', level: 21 },
  permutations:         { category: 'combinatorics', level: 23 },
  combinations:         { category: 'combinatorics', level: 25 },
  binomial:             { category: 'combinatorics', level: 30 },
  derivative:           { category: 'calculus',      level: 31 },
  integral:             { category: 'calculus',      level: 35 },
  // Promoted from a variety template: the level-38 generator already produced limits.
  limit:                { category: 'calculus',      level: 38 },
  gcd_lcm:              { category: 'number_theory', level: 41 },
  modular_arithmetic:   { category: 'number_theory', level: 45 },
  // Promoted from a variety template: the level-47 generator already counted divisors.
  divisor_count:        { category: 'number_theory', level: 47 },
  totient:              { category: 'number_theory', level: 49 }
};

let ingestedTemplatesCache = [];

function refreshIngestedTemplates() {
  try {
    const { db } = require('./db');
    if (!db) return;
    db.all("SELECT * FROM ingested_knowledge_templates", [], (err, rows) => {
      if (err) {
        // Table might not exist yet during initial script execution or migration
        return;
      }
      ingestedTemplatesCache = rows.map(row => {
        try {
          return {
            ...row,
            solve_params: JSON.parse(row.solve_params_json)
          };
        } catch (e) {
          return {
            ...row,
            solve_params: {}
          };
        }
      });
    });
  } catch (e) {
    // db might not be initialized
  }
}

// Initial load
setTimeout(refreshIngestedTemplates, 100);

// Helper to match levels with ingested template range (e.g. "11-20")
function levelMatchesRange(level, rangeStr) {
  if (!rangeStr) return false;
  const parts = rangeStr.split('-');
  if (parts.length === 2) {
    const min = parseInt(parts[0], 10);
    const max = parseInt(parts[1], 10);
    return level >= min && level <= max;
  }
  return parseInt(rangeStr, 10) === level;
}

function validateLaTeXString(str) {
  if (!str) return true;
  // 1. Check $ balance (ignoring escaped ones \$)
  const singleDollarCount = (str.match(/(?<!\\)\$/g) || []).length;
  if (singleDollarCount % 2 !== 0) {
    return false;
  }
  
  // 2. Check $$ balance
  const doubleDollarCount = (str.match(/(?<!\\)\$\$/g) || []).length;
  if (doubleDollarCount % 2 !== 0) {
    return false;
  }

  // 3. Check \begin{...} and \end{...} balance
  const begins = (str.match(/\\begin\{[^}]+\}/g) || []);
  const ends = (str.match(/\\end\{[^}]+\}/g) || []);
  if (begins.length !== ends.length) {
    return false;
  }

  // 4. Validate matching braces (like \frac{...}{...})
  let braces = 0;
  for (const char of str) {
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (braces < 0) return false;
  }
  if (braces !== 0) return false;

  return true;
}

// Generates an exercise matching standard gameplay levels
// engineOptions: { targetConceptId?, learnerProfile? } — provided by orchestrator
function generateProblemInstance(category, level, index, elo, userAnalytics = {}, engineOptions = {}) {
  // Use learner-model-aware difficulty when a profile is available
  const profile = engineOptions.learnerProfile
    ? calculateAdaptiveDifficulty(elo, engineOptions.learnerProfile)
    : calculateDifficultyProfile(elo);
  const diffFactor = profile.diffFactor;

  // If the orchestrator has nominated a specific concept, override level — but only
  // when the concept belongs to the same category the caller requested, so a stale
  // orchestrator result can never inject cross-category content.
  if (engineOptions.targetConceptId && CONCEPT_TO_LEVEL[engineOptions.targetConceptId]) {
    const mapped = CONCEPT_TO_LEVEL[engineOptions.targetConceptId];
    const requestedCat = category.toLowerCase().replace(' ', '_');
    const mappedCat    = mapped.category.toLowerCase().replace(' ', '_');
    if (requestedCat === mappedCat || requestedCat === 'mental') {
      category = mapped.category;
      level    = mapped.level;
    }
    // else: concept is from a different category — ignore the override and
    // generate from the requested category+level as-is.
  }
  const idx = index !== undefined ? index : Math.floor(Math.random() * 10);
  
  let catKey;
  const normalizedCat = category.toLowerCase();
  
  if (level === 10) {
    catKey = 'arithmetic';
  } else if (level === 20) {
    catKey = 'algebra';
  } else if (level === 30) {
    catKey = 'combinatorics';
  } else if (level === 40) {
    catKey = 'calculus';
  } else if (level === 50 || level === 60) {
    catKey = 'number_theory';
  } else if (normalizedCat === 'algebra') {
    catKey = 'algebra';
  } else if (normalizedCat === 'mental') {
    catKey = 'mental';
  } else if (normalizedCat === 'calculus') {
    catKey = 'calculus';
  } else if (normalizedCat === 'combinatorics') {
    catKey = 'combinatorics';
  } else if (normalizedCat === 'number theory' || normalizedCat === 'number_theory') {
    catKey = 'number_theory';
  } else if (normalizedCat === 'geometry') {
    catKey = 'geometry';
  } else if (normalizedCat === 'number_sense' || normalizedCat === 'number sense') {
    catKey = 'number_sense';
  } else if (normalizedCat === 'statistics') {
    catKey = 'statistics';
  } else if (normalizedCat === 'expressions') {
    catKey = 'expressions';
  } else if (normalizedCat === 'integers') {
    catKey = 'integers';
  } else if (normalizedCat === 'decimals') {
    catKey = 'decimals';
  } else if (normalizedCat === 'fractions') {
    catKey = 'fractions';
  } else if (normalizedCat === 'powers') {
    catKey = 'powers';
  } else if (normalizedCat === 'graphing') {
    catKey = 'graphing';
  } else if (normalizedCat === 'inequalities') {
    catKey = 'inequalities';
  } else if (normalizedCat === 'functions') {
    catKey = 'functions';
  } else if (normalizedCat === 'sequences') {
    catKey = 'sequences';
  } else if (normalizedCat === 'equations') {
    catKey = 'equations';
  } else if (normalizedCat === 'rates') {
    catKey = 'rates';
  } else if (normalizedCat === 'factors') {
    catKey = 'factors';
  } else {
    catKey = 'arithmetic';
  }

  // 1. Try to find matching ingested knowledge templates
  const categoryLower = catKey.toLowerCase();
  const matchingTemplates = ingestedTemplatesCache.filter(t => {
    const tCat = (t.category || '').toLowerCase();
    const catMatches = tCat === categoryLower || 
                       (categoryLower === 'number_theory' && tCat === 'number theory') ||
                       (categoryLower === 'number theory' && tCat === 'number_theory');
    return catMatches && levelMatchesRange(level, t.level_range);
  });

  // 50% probability to use ingested template if available, else static template
  let useIngested = false;
  let selectedTemplate = null;
  if (matchingTemplates.length > 0 && Math.random() < 0.5) {
    useIngested = true;
    selectedTemplate = matchingTemplates[idx % matchingTemplates.length];
  }

  if (useIngested && selectedTemplate) {
    const params = {};
    const rules = selectedTemplate.solve_params;
    
    // Resolve primary parameters adaptively
    for (const key in rules) {
      const r = rules[key];
      if (r.type === "range") {
        const min = r.min || 1;
        const max = r.max || 10;
        
        // Map diffFactor (0.6 to 2.5) to a percentile of the range, with seed-based variance
        const weight = Math.min(1.0, Math.max(0.0, (diffFactor - 0.6) / (2.5 - 0.6))); 
        const variance = ((idx % 5) - 2) * 0.1; // -20% to +20% variance
        let targetPercentile = weight + variance;
        targetPercentile = Math.min(1.0, Math.max(0.0, targetPercentile));

        params[key] = Math.round(min + targetPercentile * (max - min));
      } else if (r.type === "choice") {
        params[key] = r.choices[(idx + 1) % r.choices.length];
      } else {
        params[key] = r.value !== undefined ? r.value : 5;
      }
    }

    // Add derived parameters
    if (selectedTemplate.type === "linear_two_step") {
      if (params.a !== undefined && params.x !== undefined && params.b !== undefined) {
        params.c = params.a * params.x + params.b;
      }
    } else if (selectedTemplate.type === "modular_arithmetic") {
      if (params.base !== undefined && params.power !== undefined) {
        params.powerAns = Math.pow(params.base, params.power);
      }
    }

    // Solve programmatically
    const answerVal = solveSymbolically(selectedTemplate.type, params);
    const correct = answerVal !== null && answerVal !== undefined ? answerVal.toString() : "0";
    params.answer = correct;

    // Substitute parameters into question and explanation
    let question = selectedTemplate.question_pattern;
    let explanationPattern = selectedTemplate.explanation_pattern;
    for (const key in params) {
      question = question.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
      explanationPattern = explanationPattern.replace(new RegExp(`\\{${key}\\}`, 'g'), params[key]);
    }

    // Generate distractors
    const dList = generateDistractors(answerVal || 0, selectedTemplate.type, {
      ...params,
      distractors: []
    });

    const uniqueOptions = new Set();
    uniqueOptions.add(correct);
    for (const d of dList) {
      if (uniqueOptions.size >= 4) break;
      uniqueOptions.add(d.toString());
    }

    let fallbackOffset = 1;
    const isNumeric = !isNaN(Number(correct));
    while (uniqueOptions.size < 4) {
      if (isNumeric) {
        const val = Number(correct) + fallbackOffset;
        if (val >= 0) {
          uniqueOptions.add(val.toString());
        }
        fallbackOffset = fallbackOffset > 0 ? -fallbackOffset : -fallbackOffset + 1;
      } else {
        uniqueOptions.add(`Option_${uniqueOptions.size}`);
      }
    }

    const options = Array.from(uniqueOptions);
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    // Personalize explanation
    const conceptAnalytics = (userAnalytics && userAnalytics[selectedTemplate.type]) 
      ? userAnalytics[selectedTemplate.type] 
      : userAnalytics;
    const personalizedExplanation = constructPersonalizedExplanation(selectedTemplate.type, explanationPattern, conceptAnalytics);

    // Socratic feedback: misconception-targeted probe/hint per wrong option (JSON string).
    const socraticJson = buildSocraticJson(conceptFromType(selectedTemplate.type), correct, options, params);
    // Self-explanation: a "why is that right?" reason-MCQ shown after a CORRECT answer ('' if none).
    const selfExplainJson = buildSelfExplainJson(conceptFromType(selectedTemplate.type));
    // Worked example: a faded step-by-step model of the method, offered after a WRONG answer ('' if none).
    const workedExampleJson = buildWorkedExampleJson(conceptFromType(selectedTemplate.type));

    return {
      question,
      correctAnswer: correct,
      options,
      explanation: personalizedExplanation,
      templateType: selectedTemplate.type,
      socraticJson,
      selfExplainJson,
      workedExampleJson
    };
  }

  // 2. Fallback to static code templates
  let tplFn = templates[catKey][level];
  if (!tplFn) {
    // Fallback: search for closest level in templates[catKey]
    const availableLevels = Object.keys(templates[catKey]).map(Number).sort((a, b) => a - b);
    let fallbackLevel = availableLevels[0];
    for (const val of availableLevels) {
      if (val <= level) {
        fallbackLevel = val;
      }
    }
    tplFn = templates[catKey][fallbackLevel];
  }

  const rawProblem = tplFn(diffFactor, idx);
  const correct = rawProblem.answer.toString();
  
  // Generate distractors using generateDistractors
  const dList = generateDistractors(rawProblem.answer, rawProblem.type, {
    ...rawProblem,
    distractors: rawProblem.distractors
  });

  const uniqueOptions = new Set();
  uniqueOptions.add(correct);
  for (const d of dList) {
    if (uniqueOptions.size >= 4) break;
    uniqueOptions.add(d.toString());
  }

  // Safe fallback to fill up to 4 options if distractors were duplicate
  let fallbackOffset = 1;
  const isNumeric = !isNaN(Number(correct));
  while (uniqueOptions.size < 4) {
    if (isNumeric) {
      const val = Number(correct) + fallbackOffset;
      if (val >= 0) {
        uniqueOptions.add(val.toString());
      }
      fallbackOffset = fallbackOffset > 0 ? -fallbackOffset : -fallbackOffset + 1;
    } else {
      uniqueOptions.add(`Option_${uniqueOptions.size}`);
    }
  }

  const options = Array.from(uniqueOptions);
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Personalize explanation
  const conceptAnalytics = (userAnalytics && userAnalytics[rawProblem.type]) 
    ? userAnalytics[rawProblem.type] 
    : userAnalytics;
  const personalizedExplanation = constructPersonalizedExplanation(rawProblem.type, rawProblem.explanation, conceptAnalytics);

  // Socratic feedback: misconception-targeted probe/hint per wrong option (JSON string).
  // The raw template object doubles as the params bag for the misconception classifier
  // (it carries a/b/x1/x2/mod/etc. for the concept-specific rules).
  const socraticJson = buildSocraticJson(conceptFromType(rawProblem.type), correct, options, rawProblem);
  // Self-explanation: a "why is that right?" reason-MCQ shown after a CORRECT answer ('' if none).
  const selfExplainJson = buildSelfExplainJson(conceptFromType(rawProblem.type));
  // Worked example: a faded step-by-step model of the method, offered after a WRONG answer ('' if none).
  const workedExampleJson = buildWorkedExampleJson(conceptFromType(rawProblem.type));

  return {
    question: rawProblem.question,
    correctAnswer: correct,
    options: options,
    explanation: personalizedExplanation,
    templateType: rawProblem.type,
    socraticJson,
    selfExplainJson,
    workedExampleJson
  };
}

// Generates an exercise matching standard gameplay levels with LaTeX validation and retry loop
// engineOptions: { targetConceptId?, learnerProfile? }
function generateProblem(category, level, index, elo, userAnalytics = {}, engineOptions = {}) {
  let attempt = 0;
  while (attempt < 10) {
    const problem = generateProblemInstance(category, level, index + attempt, elo, userAnalytics, engineOptions);
    if (validateLaTeXString(problem.question) && validateLaTeXString(problem.explanation)) {
      return problem;
    }
    attempt++;
  }
  return generateProblemInstance(category, level, index, elo, userAnalytics, engineOptions);
}

// Generates a parameterized mathematical challenge for the Archive Explorer
function generateArchiveProblemInstance(category, stars) {
  let title = "";
  let story = "";
  let question = "";
  let correctAnswer = "";
  let explanation = "";
  let rawOptions = [];
  
  const sourceDB = {
    MathOverflow: ["MathOverflow Thread #1823", "MathOverflow Thread #3391", "MathOverflow Thread #4092", "MathOverflow Thread #7810"],
    StackExchange: ["Mathematics Stack Exchange #4019", "Mathematics Stack Exchange #5589", "Mathematics Stack Exchange #7712", "Mathematics Stack Exchange #9921"],
    Bibmath: ["Bibmath Analysis Archives", "Bibmath Combinatorics", "Bibmath Arithmetic Archives", "Bibmath Probability"]
  };
  
  // Choose source based on star difficulty
  let srcType = "StackExchange";
  if (stars >= 4) srcType = "MathOverflow";
  else if (stars === 2) srcType = "Bibmath";
  
  const sourceList = sourceDB[srcType];
  const source = sourceList[Math.floor(Math.random() * sourceList.length)];
  
  const cat = (category || 'arithmetic').toLowerCase();
  
  if (cat === "number theory" || cat === "number_theory") {
    if (stars <= 2) {
      const a = Math.floor(Math.random() * 3) + 2; // 2..4
      const p = [11, 13, 17][Math.floor(Math.random() * 3)];
      title = "Fermat's Little Theorem Modular Exponent";
      story = "Fermat's Little Theorem states that if $p$ is prime, then for any integer $a$, $a^p \\equiv a \\pmod{p}$. If $\\gcd(a,p)=1$, this simplifies to $a^{p-1} \\equiv 1 \\pmod{p}$.";
      question = `Find the remainder when $${a}^{${p-1}}$ is divided by $${p}$ (i.e. evaluate: $${a}^{${p-1}} \\pmod{${p}}$).`;
      correctAnswer = "1";
      rawOptions = ["0", "1", `${a}`, `${p-1}`];
      explanation = `By Fermat's Little Theorem, since $${p}$ is prime and $\\gcd(${a}, ${p}) = 1$, the exponentiation $${a}^{${p-1}} \\equiv 1 \\pmod{${p}}$. Therefore, the remainder is $1$.`;
    } else if (stars === 3) {
      const p = [5, 7, 11][Math.floor(Math.random() * 3)];
      const q = [13, 17, 19][Math.floor(Math.random() * 3)];
      title = "Euler Totient of Prime Product";
      story = "Euler's totient function $\\phi(n)$ computes the number of positive integers up to $n$ that are relatively prime to $n$. Because the function is multiplicative, if $\\gcd(a,b)=1$, then $\\phi(ab) = \\phi(a)\\phi(b)$.";
      question = `Calculate $\\phi(N)$ for $N = ${p} \\times ${q} = ${p*q}$.`;
      const ansVal = (p-1)*(q-1);
      correctAnswer = ansVal.toString();
      rawOptions = [ansVal.toString(), (p*q - p - q).toString(), (p*q - 1).toString(), (p*q / 2).toString()];
      explanation = `Since $${p}$ and $${q}$ are prime, their greatest common divisor is $1$. By the multiplicative property:\n$$\\phi(${p*q}) = \\phi(${p}) \\cdot \\phi(${q}) = (${p}-1) \\cdot (${q}-1) = ${p-1} \\times ${q-1} = ${correctAnswer}$$`;
    } else {
      const rem1 = Math.floor(Math.random() * 2) + 1; // 1..2
      const rem2 = Math.floor(Math.random() * 3) + 1; // 1..3
      let sol = 0;
      for (let i = 1; i <= 15; i++) {
        if (i % 3 === rem1 && i % 5 === rem2) {
          sol = i;
          break;
        }
      }
      title = "Diophantine Chinese Remainder Theorem";
      story = "The Chinese Remainder Theorem guarantees that for pairwise coprime moduli $m_1, m_2, \\dots, m_k$ and any integers $a_1, a_2, \\dots, a_k$, there exists a unique solution modulo $M = m_1 m_2 \\dots m_k$ to a system of simultaneous congruences.";
      question = `Solve for the smallest positive integer $x$ satisfying the system:\n$$x \\equiv ${rem1} \\pmod 3$$\n$$x \\equiv ${rem2} \\pmod 5$$`;
      correctAnswer = sol.toString();
      rawOptions = [sol.toString(), (sol + 5).toString(), (sol + 3).toString(), ((sol + 15) % 16).toString()];
      explanation = `We seek a solution $x$ modulo $15$:\n1. From the second congruence, $x = 5k + ${rem2}$.\n2. Substituting into the first congruence: $5k + ${rem2} \\equiv ${rem1} \\pmod 3$.\n3. Since $5 \\equiv 2 \\pmod 3$, we have $2k + ${rem2} \\equiv ${rem1} \\pmod 3$.\nBy testing $k \\in \\{0, 1, 2\\}$, we find the smallest positive integer is $x = ${sol}$.`;
    }
  } else if (cat === "combinatorics") {
    if (stars <= 2) {
      const n = Math.floor(Math.random() * 4) + 6;
      title = "Combinatorial Subset Selection";
      story = "The number of ways to choose an unordered subset of $k$ elements from a set of $n$ elements is given by the binomial coefficient $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$.";
      question = `How many ways can a committee of 2 mathematicians be chosen from a department of $${n}$ professors?`;
      const ansVal = (n * (n - 1)) / 2;
      correctAnswer = ansVal.toString();
      rawOptions = [correctAnswer, (n * (n - 1)).toString(), (n + 2).toString(), "12"];
      explanation = `We compute the binomial coefficient for selecting $k = 2$ from $n = ${n}$:\n$$\\binom{${n}}{2} = \\frac{${n}(${n}-1)}{2} = ${correctAnswer}$$`;
    } else if (stars === 3) {
      const n = Math.floor(Math.random() * 2) + 4; // 4 or 5
      const ans = derangement(n);
      title = "Derangements and Subfactorials";
      story = "A derangement is a permutation of elements of a set, such that no element appears in its original position. The number of derangements of a set of size $n$ is denoted by the subfactorial $!n = n! \\sum_{i=0}^n \\frac{(-1)^i}{i!}$.";
      question = `In how many ways can $${n}$ letters be placed in $${n}$ addressed envelopes such that EVERY letter goes into a wrong envelope?`;
      correctAnswer = ans.toString();
      
      const wrong1 = factorial(n).toString();
      const wrong2 = (ans + 5).toString();
      const wrong3 = (ans - 3 > 0 ? ans - 3 : ans + 10).toString();
      rawOptions = [correctAnswer, wrong1, wrong2, wrong3];
      
      explanation = `Using the derangement formula for $n = ${n}$:\n$$!${n} = ${n}! \\left( \\sum_{i=0}^{${n}} \\frac{(-1)^i}{i!} \\right) = ${ans}$$`;
    } else {
      const starsCount = Math.floor(Math.random() * 3) + 5;
      title = "Indistinguishable Distribution via Stars and Bars";
      story = "The Stars and Bars theorem states that the number of ways to place $n$ identical stars into $k$ distinct bins such that each bin contains at least one star is given by $\\binom{n-1}{k-1}$.";
      question = `How many ways can we distribute $${starsCount}$ identical tokens into $3$ distinct boxes such that each box receives at least 1 token?`;
      const ans = (starsCount - 1) * (starsCount - 2) / 2;
      correctAnswer = ans.toString();
      rawOptions = [ans.toString(), (ans + 4).toString(), (ans * 2).toString(), "10"];
      explanation = `By the Stars and Bars theorem, the number of positive integer solutions is:\n$$\\binom{${starsCount}-1}{3-1} = \\binom{${starsCount-1}}{2} = \\frac{${starsCount-1} \\times ${starsCount-2}}{2} = ${correctAnswer}$$`;
    }
  } else if (cat === "calculus") {
    if (stars <= 2) {
      const p = Math.floor(Math.random() * 3) + 2;
      title = "Reverse Power Rule Integration";
      story = "By the Fundamental Theorem of Calculus, the definite integral of a continuous function $f(x)$ over $[a, b]$ is evaluated using its antiderivative $F(x)$:\n$$\\int_a^b f(x) \\, dx = F(b) - F(a)$$";
      question = `Evaluate the definite integral: $$\\int_0^2 ${p+1}x^{${p}} \\, dx$$`;
      const ansVal = Math.pow(2, p+1);
      correctAnswer = ansVal.toString();
      rawOptions = [ansVal.toString(), Math.pow(2, p).toString(), (ansVal - 1).toString(), "16"];
      explanation = `First, find the antiderivative of $f(x) = ${p+1}x^{${p}}$:\n$$F(x) = x^{${p+1}}$$\nEvaluating at the endpoints $0$ and $2$:\n$$F(2) - F(0) = 2^{${p+1}} - 0^{${p+1}} = ${correctAnswer}$$`;
    } else if (stars === 3) {
      const a = Math.floor(Math.random() * 4) + 2;
      title = "Taylor Series Expansion";
      story = "The Taylor series expansion of a smooth function $f(x)$ centered at $x=0$ (Maclaurin series) is given by:\n$$f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(0)}{n!} x^n$$";
      const numer = Math.pow(a, 3);
      question = `Find the coefficient of the $x^3$ term in the Taylor expansion of $e^{${a}x}$ centered at $x = 0$. (Format as a fraction/value)`;
      correctAnswer = `$\\frac{${numer}}{6}$`;
      rawOptions = [`$\\frac{${numer}}{6}$`, `$\\frac{${numer}}{3}$`, `$\\frac{${a}}{6}$`, `$\\frac{1}{6}$`];
      explanation = `The Maclaurin series for $e^u$ is $\\sum_{n=0}^{\\infty} \\frac{u^n}{n!}$. Letting $u = ${a}x$:\n$$e^{${a}x} = \\sum_{n=0}^{\\infty} \\frac{(${a}x)^n}{n!} = \\sum_{n=0}^{\\infty} \\frac{${a}^n}{n!} x^n$$\nFor $n = 3$, the coefficient of $x^3$ is:\n$$\\frac{${a}^3}{3!} = \\frac{${numer}}{6}$$`;
    } else {
      // Rotate among famous convergent series so this slot is not the identical Basel
      // problem every single time (it previously always returned pi^2/6).
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        title = "The Basel Problem Evaluation";
        story = "The Basel Problem asks for the precise sum of the reciprocals of the squares of the natural numbers, first solved by Leonhard Euler in 1734.";
        question = `Find the sum of the infinite series: $$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = 1 + \\frac{1}{4} + \\frac{1}{9} + \\frac{1}{16} + \\dots$$`;
        correctAnswer = `$\\frac{\\pi^2}{6}$`;
        rawOptions = [`$\\frac{\\pi}{4}$`, `$\\frac{\\pi^2}{8}$`, `$\\frac{\\pi^2}{6}$`, `$\\frac{\\pi^2}{12}$`];
        explanation = `Euler proved that the infinite sum converges to a value related to $\\pi$. Using the product expansion of the sine function:\n$$\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}$$`;
      } else if (roll === 1) {
        title = "Telescoping Series Evaluation";
        story = "Some infinite sums collapse: when each term splits into a difference, almost everything cancels, leaving only the first surviving piece.";
        question = `Evaluate the telescoping series: $$\\sum_{n=1}^{\\infty} \\frac{1}{n(n+1)} = \\frac{1}{2} + \\frac{1}{6} + \\frac{1}{12} + \\dots$$`;
        correctAnswer = "1";
        rawOptions = ["1", "2", `$\\frac{1}{2}$`, `$\\frac{3}{2}$`];
        explanation = `Use partial fractions $\\frac{1}{n(n+1)} = \\frac{1}{n} - \\frac{1}{n+1}$. The sum telescopes:\n$$\\left(1 - \\frac{1}{2}\\right) + \\left(\\frac{1}{2} - \\frac{1}{3}\\right) + \\dots = 1$$`;
      } else {
        title = "Convergent Geometric Series";
        story = "A geometric series with ratio between -1 and 1 converges to a clean closed form, the cornerstone of many infinite-sum arguments.";
        question = `Evaluate the geometric series: $$\\sum_{n=0}^{\\infty} \\frac{1}{2^n} = 1 + \\frac{1}{2} + \\frac{1}{4} + \\frac{1}{8} + \\dots$$`;
        correctAnswer = "2";
        rawOptions = ["2", "1", `$\\frac{3}{2}$`, `$\\infty$`];
        explanation = `For a geometric series $\\sum_{n=0}^{\\infty} r^n = \\frac{1}{1-r}$ when $|r| < 1$. With $r = \\frac{1}{2}$:\n$$\\frac{1}{1 - \\frac{1}{2}} = 2$$`;
      }
    }
  } else if (cat === "algebra") {
    if (stars <= 2) {
      const a = Math.floor(Math.random() * 4) + 2;
      const b = Math.floor(Math.random() * 4) + 2;
      title = "Matrix Determinant Calculation";
      story = "For any $2 \\times 2$ matrix, the determinant measures the scaling factor of the linear transformation, computed as $ad - bc$.";
      question = `Calculate the determinant of the matrix: $$\\begin{pmatrix} ${a} & 1 \\\\ 3 & ${b} \\end{pmatrix}$$`;
      const ansVal = a * b - 3;
      correctAnswer = ansVal.toString();
      rawOptions = [ansVal.toString(), (a * b + 3).toString(), (a + b).toString(), "0"];
      explanation = `Applying the definition of the determinant:\n$$\\det \\begin{pmatrix} ${a} & 1 \\\\ 3 & ${b} \\end{pmatrix} = (${a} \\cdot ${b}) - (1 \\cdot 3) = ${a*b} - 3 = ${correctAnswer}$$`;
    } else if (stars === 3) {
      const a = Math.floor(Math.random() * 3) + 2;
      const b = Math.floor(Math.random() * 2) + 1;
      title = "Eigenvalues of Symmetric Matrix";
      story = "The eigenvalues $\\lambda$ of a square matrix $A$ are the roots of its characteristic equation $\\det(A - \\lambda I) = 0$.";
      question = `Find the larger eigenvalue of the symmetric matrix: $$\\begin{pmatrix} ${a} & ${b} \\\\ ${b} & ${a} \\end{pmatrix}$$`;
      correctAnswer = (a + b).toString();
      rawOptions = [(a+b).toString(), (a-b).toString(), a.toString(), (a+b+1).toString()];
      explanation = `The characteristic equation is:\n$$\\det \\begin{pmatrix} ${a} - \\lambda & ${b} \\\\ ${b} & ${a} - \\lambda \\end{pmatrix} = 0 \\implies (${a} - \\lambda)^2 - ${b*b} = 0$$\n$$\\lambda^2 - ${2*a}\\lambda + ${a*a - b*b} = 0 \\implies (\\lambda - ${a+b})(\\lambda - ${a-b}) = 0$$\nThus, the eigenvalues are $\\lambda_1 = ${a-b}$ and $\\lambda_2 = ${a+b}$. The larger eigenvalue is $${a+b}$.`;
    } else {
      const matrix = generateMatrix2x2(1.5);
      const tr = matrix.trace;
      const det = matrix.determinant;
      title = "Cayley-Hamilton Matrix Powers";
      story = "The Cayley-Hamilton theorem states that every square matrix satisfies its own characteristic equation, providing a recursive method to calculate high-power matrices.";
      
      const coeffA = tr * tr - det;
      const coeffI = -tr * det;
      const signI = coeffI < 0 ? "-" : "+";
      const absI = Math.abs(coeffI);
      
      question = `If a 2x2 matrix $A$ has trace $${tr}$ and determinant $${det}$, it satisfies the relation $A^2 - ${tr}A + ${det}I = 0$ by the Cayley-Hamilton theorem. Express $A^3$ as a linear combination of $A$ and $I$.`;
      correctAnswer = `$${coeffA}A ${signI} ${absI}I$`;
      rawOptions = [
        `$${coeffA}A ${signI} ${absI}I$`,
        `$${coeffA + 3}A - ${absI}I$`,
        `$${tr * tr}A ${signI} ${absI}I$`,
        `$${coeffA - 2}A + ${absI + 2}I$`
      ];
      explanation = `Multiplying the relation $A^2 - ${tr}A + ${det}I = 0$ by $A$ on both sides yields:\n$$A^3 - ${tr}A^2 + ${det}A = 0 \\implies A^3 = ${tr}A^2 - ${det}A$$\nSubstituting $A^2 = ${tr}A - ${det}I$ into this expression:\n$$A^3 = ${tr}(${tr}A - ${det}I) - ${det}A = (${tr*tr} - ${det})A - ${tr*det}I = ${coeffA}A ${signI} ${absI}I$$`;
    }
  } else if (cat === "mental") {
    if (stars <= 2) {
      // Parameterized expected value: vary the die (or ask the two-dice sum) so the answer
      // isn't the constant 3.5 each time.
      if (Math.random() < 0.5) {
        const sides = [4, 6, 8, 10, 12, 20][Math.floor(Math.random() * 6)];
        const ev = (sides + 1) / 2;
        title = "Expected Value of a Fair Die";
        story = "The expected value is the long-run average outcome of a random variable, computed as the probability-weighted sum of all possible outcomes.";
        question = `Determine the expected value of a single roll of a fair ${sides}-sided die.`;
        correctAnswer = ev.toString();
        rawOptions = [ev.toString(), (ev - 0.5).toString(), (ev + 0.5).toString(), (sides / 2).toString()];
        explanation = `Each of the $${sides}$ faces is equally likely, so the mean is the midpoint:\n$$E[X] = \\frac{1 + 2 + \\dots + ${sides}}{${sides}} = \\frac{${sides}+1}{2} = ${ev}$$`;
      } else {
        title = "Expected Value of Two Dice";
        story = "The expected value of a sum of independent variables is the sum of their expected values — no need to enumerate all 36 outcomes.";
        question = `Determine the expected value of the sum when rolling two fair six-sided dice.`;
        correctAnswer = "7";
        rawOptions = ["6", "7", "6.5", "8"];
        explanation = `Expectation is additive: $E[X+Y] = E[X] + E[Y] = 3.5 + 3.5 = 7$.`;
      }
    } else if (stars === 3) {
      // Parameterized Bayes: vary the disease prevalence so the posterior changes.
      const prev = [0.01, 0.02, 0.05][Math.floor(Math.random() * 3)];
      const tpr = 0.9;
      const fpr = 0.1;
      const post = (tpr * prev) / (tpr * prev + fpr * (1 - prev));
      const pct = (x) => `${(x * 100).toFixed(1)}%`;
      title = "Bayesian Diagnostics Probability";
      story = "Bayes' Theorem updates the conditional probability of an event given prior knowledge and new evidence: $P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$.";
      question = `A medical test for a disease (prevalence ${pct(prev)}) has a false positive rate of 10% and true positive rate of 90%. What is the probability that a patient who tests positive actually has the disease?`;
      correctAnswer = pct(post);
      rawOptions = [pct(post), pct(prev), "50.0%", "90.0%"];
      explanation = `Let $D$ be the disease and $+$ a positive test:\n$$P(D \\mid +) = \\frac{0.90 \\times ${prev}}{(0.90 \\times ${prev}) + (0.10 \\times ${(1 - prev).toFixed(2)})} \\approx ${pct(post)}$$`;
    } else {
      // Rotate among classic probability paradoxes (was always Monty Hall = 2/3).
      const roll = Math.floor(Math.random() * 3);
      if (roll === 0) {
        title = "The Monty Hall Paradox (Switch)";
        story = "The Monty Hall problem is a famous probability puzzle where switching doors yields a counterintuitive doubling of win probability.";
        question = `In the Monty Hall problem with three doors, what is the probability of winning if you SWITCH doors after one losing door is revealed?`;
        correctAnswer = `$\\frac{2}{3}$`;
        rawOptions = [`$\\frac{1}{3}$`, `$\\frac{1}{2}$`, `$\\frac{2}{3}$`, `$\\frac{3}{4}$`];
        explanation = `Your first pick wins with probability $\\frac{1}{3}$. The host's reveal shifts the remaining $\\frac{2}{3}$ entirely onto the other door, so switching wins $\\frac{2}{3}$ of the time.`;
      } else if (roll === 1) {
        title = "The Monty Hall Paradox (Stay)";
        story = "The flip side of Monty Hall: how often does stubbornly keeping your first choice pay off?";
        question = `In the Monty Hall problem with three doors, what is the probability of winning if you STAY with your original door after a losing door is revealed?`;
        correctAnswer = `$\\frac{1}{3}$`;
        rawOptions = [`$\\frac{1}{3}$`, `$\\frac{1}{2}$`, `$\\frac{2}{3}$`, `$\\frac{1}{4}$`];
        explanation = `Staying wins exactly when your original pick was already correct — probability $\\frac{1}{3}$, unaffected by the host's reveal.`;
      } else {
        title = "The Boy-or-Girl Paradox";
        story = "Conditional probability defies intuition: knowing one fact about a family reshapes the odds of the rest.";
        question = `A family has two children. Given that at least one is a boy, what is the probability that BOTH are boys?`;
        correctAnswer = `$\\frac{1}{3}$`;
        rawOptions = [`$\\frac{1}{2}$`, `$\\frac{1}{3}$`, `$\\frac{1}{4}$`, `$\\frac{2}{3}$`];
        explanation = `The equally-likely cases are BB, BG, GB, GG. Conditioning on "at least one boy" removes GG, leaving $\\{BB, BG, GB\\}$. Only BB has two boys, so the probability is $\\frac{1}{3}$.`;
      }
    }
  } else {
    // Arithmetic
    if (stars <= 2) {
      // Parameterized Gauss summation: the upper bound N varies, so the answer is no longer
      // a constant "5050" every time. Two structural framings (consecutive integers vs.
      // first-N evens) give the diversity engine distinct shapes to choose between.
      const N = [50, 60, 80, 100, 120, 150][Math.floor(Math.random() * 6)];
      if (Math.random() < 0.5) {
        const ans = (N * (N + 1)) / 2;
        title = "Gauss Summation Series";
        story = "Carl Friedrich Gauss famously summed the integers from 1 to 100 in seconds as a child by pairing symmetric terms.";
        question = `Evaluate the arithmetic series sum: $$\\sum_{i=1}^{${N}} i = 1 + 2 + 3 + \\dots + ${N}$$`;
        correctAnswer = ans.toString();
        rawOptions = [ans.toString(), (ans - N).toString(), (ans + N).toString(), (N * N).toString()];
        explanation = `The sum of the first $n$ natural numbers is $\\frac{n(n+1)}{2}$. For $n = ${N}$:\n$$\\text{Sum} = \\frac{${N} \\times ${N + 1}}{2} = ${ans}$$`;
      } else {
        const ans = N * (N + 1);
        title = "Sum of the First Even Numbers";
        story = "The sum of consecutive even numbers grows quadratically — a classic result Gauss-style pairing reveals instantly.";
        question = `Evaluate the sum of the first $${N}$ even numbers: $$2 + 4 + 6 + \\dots + ${2 * N}$$`;
        correctAnswer = ans.toString();
        rawOptions = [ans.toString(), ((N * (N + 1)) / 2).toString(), (ans + 2 * N).toString(), (N * N).toString()];
        explanation = `Factor out the $2$: $\\sum_{i=1}^{${N}} 2i = 2 \\cdot \\frac{${N}(${N}+1)}{2} = ${N}(${N}+1) = ${ans}$.`;
      }
    } else if (stars === 3) {
      // Alternate between the classic Diophantus epitaph and a parameterized
      // consecutive-integers word problem so the slot isn't always "84".
      if (Math.random() < 0.5) {
        title = "Diophantus Linear Life Epitaph";
        story = "Diophantus of Alexandria, the father of algebra, had a riddle carved on his tomb detailing the proportions of his lifespan.";
        question = `Solve the linear equation representing Diophantus' life: childhood was 1/6 of his life, youth 1/12, married 1/7, had a son after 5 years who lived half the father's age, and the father died 4 years after the son. How old was he?`;
        correctAnswer = "84";
        rawOptions = ["60", "72", "80", "84"];
        explanation = `Let $x$ represent his total lifespan:\n$$\\frac{x}{6} + \\frac{x}{12} + \\frac{x}{7} + 5 + \\frac{x}{2} + 4 = x$$\n$$9 = \\left( 1 - \\frac{75}{84} \\right)x = \\frac{9}{84}x \\implies x = 84$$`;
      } else {
        const middle = [12, 18, 24, 31, 47, 58][Math.floor(Math.random() * 6)];
        const sum = 3 * middle;
        const largest = middle + 1;
        title = "Consecutive Integers Puzzle";
        story = "Translating a word puzzle into a single linear equation is the heart of classical algebra.";
        question = `Three consecutive integers add up to $${sum}$. What is the largest of the three?`;
        correctAnswer = largest.toString();
        rawOptions = [largest.toString(), middle.toString(), (middle - 1).toString(), (largest + 1).toString()];
        explanation = `Let the middle integer be $x$. Then $(x-1) + x + (x+1) = 3x = ${sum}$, so $x = ${middle}$ and the largest is $${largest}$.`;
      }
    } else {
      // Parameterized geometric progression: vary how many squares (or ask for a single
      // square's grains) so the answer is no longer the constant 255.
      const k = [6, 7, 8, 10, 12][Math.floor(Math.random() * 5)];
      if (Math.random() < 0.5) {
        const total = Math.pow(2, k) - 1;
        title = "Wheat and Chessboard Geometric Progression";
        story = "The creator of chess requested a reward of grain: 1 grain on the first square, 2 on the second, 4 on the third, doubling on each subsequent square.";
        question = `Compute the total grains of wheat on the first $${k}$ squares of the chessboard (doubling each square, starting from 1).`;
        correctAnswer = total.toString();
        rawOptions = [total.toString(), Math.pow(2, k).toString(), (total - 1).toString(), Math.pow(2, k - 1).toString()];
        explanation = `The total is a geometric series with $a=1$, $r=2$, $n=${k}$:\n$$\\sum_{i=0}^{${k - 1}} 2^i = 2^{${k}} - 1 = ${total}$$`;
      } else {
        const grains = Math.pow(2, k - 1);
        title = "Doubling on a Single Square";
        story = "On the doubling chessboard, each square alone holds twice the previous one — exponential growth made tangible.";
        question = `On the chessboard where grains double each square (1 on the first), how many grains sit on square number $${k}$ alone?`;
        correctAnswer = grains.toString();
        rawOptions = [grains.toString(), Math.pow(2, k).toString(), (grains - 1).toString(), (k * k).toString()];
        explanation = `The $n$-th square holds $2^{n-1}$ grains. For $n = ${k}$:\n$$2^{${k} - 1} = ${grains}$$`;
      }
    }
  }
  
  // Deduplicate and pad options
  const uniqueOptions = new Set();
  uniqueOptions.add(correctAnswer);
  
  for (const opt of rawOptions) {
    if (uniqueOptions.size >= 4) break;
    uniqueOptions.add(opt.toString());
  }
  
  let fallbackOffset = 1;
  const isNumeric = !isNaN(Number(correctAnswer));
  while (uniqueOptions.size < 4) {
    if (isNumeric) {
      const val = Number(correctAnswer) + fallbackOffset;
      if (val >= 0) {
        uniqueOptions.add(val.toString());
      }
      fallbackOffset = fallbackOffset > 0 ? -fallbackOffset : -fallbackOffset + 1;
    } else {
      uniqueOptions.add(`Option_${uniqueOptions.size}`);
    }
  }
  
  const options = Array.from(uniqueOptions);
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  return {
    title,
    story,
    question,
    correct_answer: correctAnswer,
    options: JSON.stringify(options),
    explanation,
    difficulty: stars >= 4 ? "Sage" : stars === 3 ? "Scholar" : "Apprentice",
    category,
    stars,
    source
  };
}

// Generates a parameterized mathematical challenge with LaTeX validation and retry loop
function generateArchiveProblem(category, stars) {
  let attempt = 0;
  while (attempt < 10) {
    const problem = generateArchiveProblemInstance(category, stars);
    if (validateLaTeXString(problem.question) && validateLaTeXString(problem.explanation)) {
      return problem;
    }
    attempt++;
  }
  return generateArchiveProblemInstance(category, stars);
}

module.exports = {
  generateProblem,
  generateArchiveProblem,
  getLessonAndExamples,
  getLessonForArchive,
  refreshIngestedTemplates,
  CONCEPT_TO_LEVEL
};
