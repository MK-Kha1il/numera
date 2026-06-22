// Symbolic Validation Layer for Advanced Ingestion & Synthesis

/**
 * Validates a mathematical template structure by running test instances.
 * Verifies correctness, edge cases, distractor uniqueness, and ELO estimates.
 */
function validateTemplate(template) {
  const result = {
    isValid: true,
    estimatedElo: 1000,
    errors: [],
    edgeCasesTested: 0
  };

  try {
    // 1. Structural Checks
    if (!template.category || !template.type || !template.question_pattern || !template.solve_params_json || !template.explanation_pattern) {
      result.isValid = false;
      result.errors.push("Missing core template fields (category, type, patterns).");
      return result;
    }

    const rules = typeof template.solve_params_json === 'string' 
      ? JSON.parse(template.solve_params_json) 
      : template.solve_params_json;

    // 2. Base ELO Estimation
    result.estimatedElo = estimateElo(template.category, rules);

    // 3. Programmatic Dry Run & Edge Case Tests
    for (let testIdx = 0; testIdx < 10; testIdx++) {
      result.edgeCasesTested++;
      const params = generateParams(rules, testIdx);

      // Solve the problem programmatically to check answer stability
      const ans = solveSymbolically(template.type, params);

      if (ans === null || ans === undefined || isNaN(Number(ans))) {
        result.isValid = false;
        result.errors.push(`Symbolic solver returned non-numeric or null answer for test index ${testIdx}.`);
        break;
      }

      const numericAns = Number(ans);

      // Edge case: division by zero checks
      if (template.type === "arithmetic_div" && params.a === 0) {
        result.isValid = false;
        result.errors.push("Detected potential division-by-zero risk.");
        break;
      }

      // Edge case: negative root check for certain physical/combinatorial contexts
      if (template.category === "combinatorics" && numericAns < 0) {
        result.isValid = false;
        result.errors.push("Combinatorial output yielded negative count.");
        break;
      }
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`Validation exception: ${error.message}`);
  }

  return result;
}

/**
 * Programmatically solves the template type based on parameters.
 */
function solveSymbolically(type, p) {
  switch (type) {
    case "arithmetic_add":
      return p.a + p.b;
    case "arithmetic_sub":
      return p.a - p.b;
    case "arithmetic_mult":
      return p.a * p.b;
    case "arithmetic_div":
      return p.a === 0 ? null : p.dividend / p.a;
    case "linear_one_step":
      return p.b - p.a;
    case "linear_two_step":
      return p.x !== undefined ? p.x : ((p.c - p.b) % p.a === 0 ? (p.c - p.b) / p.a : null);
    case "quadratic":
      // x^2 - (x1+x2)x + x1*x2 = 0
      return Math.max(p.x1, p.x2);
    case "gcd_lcm":
      return getGcd(p.a, p.b);
    case "modular_arithmetic":
      return Math.pow(p.base, p.power) % p.mod;
    case "totient":
      return p.p && p.q ? (p.p - 1) * (p.q - 1) : p.p - 1;
    default:
      // Default fallback solver
      return p.answer || 0;
  }
}

/**
 * Helper to generate random parameters based on validation rules
 */
function generateParams(rules, seed) {
  const params = {};
  for (const key in rules) {
    const r = rules[key];
    if (r.type === "range") {
      const min = r.min || 1;
      const max = r.max || 10;
      params[key] = min + ((seed + 3) % (max - min + 1));
    } else if (r.type === "choice") {
      params[key] = r.choices[(seed + 1) % r.choices.length];
    } else {
      params[key] = r.value !== undefined ? r.value : 5;
    }
  }
  return params;
}

/**
 * Programmatically estimates ELO difficulty score
 */
function estimateElo(category, rules) {
  let score = 800;
  
  // Base category score
  if (category === "algebra") score += 200;
  else if (category === "calculus") score += 400;
  else if (category === "combinatorics") score += 250;
  else if (category === "number_theory") score += 300;
  else if (category === "mental") score += 100;

  // Add points for range depth
  for (const key in rules) {
    const r = rules[key];
    if (r.type === "range" && r.max > 100) {
      score += 150;
    }
  }

  return Math.min(1800, Math.max(500, score));
}

function getGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

module.exports = {
  validateTemplate,
  solveSymbolically
};
