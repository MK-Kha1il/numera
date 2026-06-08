// Mathematical Conceptual Knowledge Graph (DAG & Dependency Mappings)

const concepts = {
  // Arithmetic & Basic Math
  "arithmetic_add": {
    name: "Integer Addition",
    prereqs: [],
    baseElo: 500,
    misconceptions: [
      { id: "off_by_one", label: "Off-by-one counting error", rule: (ans) => ans + 1 },
      { id: "off_by_ten", label: "Place value alignment error", rule: (ans) => ans + 10 }
    ]
  },
  "arithmetic_sub": {
    name: "Integer Subtraction",
    prereqs: ["arithmetic_add"],
    baseElo: 600,
    misconceptions: [
      { id: "wrong_borrow", label: "Borrowing column slip", rule: (ans) => ans + 10 },
      { id: "inverse_op", label: "Addition instead of subtraction", rule: (ans, p) => p.a + p.b }
    ]
  },
  "arithmetic_mult": {
    name: "Integer Multiplication",
    prereqs: ["arithmetic_add"],
    baseElo: 700,
    misconceptions: [
      { id: "add_instead_mult", label: "Added factors instead of multiplying", rule: (ans, p) => p.a + p.b },
      { id: "off_by_factor", label: "Multiplication table neighbor slip", rule: (ans, p) => p.a * (p.b + 1) }
    ]
  },
  "arithmetic_div": {
    name: "Integer Division",
    prereqs: ["arithmetic_mult"],
    baseElo: 850,
    misconceptions: [
      { id: "remainder_ignore", label: "Ignored fractional remainder", rule: (ans) => Math.floor(ans) + 1 },
      { id: "mult_instead_div", label: "Multiplied divisors", rule: (ans, p) => p.dividend * p.a }
    ]
  },
  "pemdas": {
    name: "Operator Order Precedence",
    prereqs: ["arithmetic_sub", "arithmetic_div"],
    baseElo: 900,
    misconceptions: [
      { id: "left_to_right", label: "Evaluated strictly left-to-right", rule: (ans, p) => (p.a + p.b) * p.c }
    ]
  },
  "pythagorean": {
    name: "Pythagorean Theorem",
    prereqs: ["arithmetic_mult"],
    baseElo: 1000,
    misconceptions: [
      { id: "linear_sum", label: "Sum of linear side lengths: a + b", rule: (ans, p) => p.a + p.b },
      { id: "sub_hypotenuse", label: "Subtracted square roots: c - a", rule: (ans, p) => Math.abs(p.c - p.a) }
    ]
  },

  // Algebra
  "linear_one_step": {
    name: "One-Step Linear Equations",
    prereqs: ["arithmetic_sub"],
    baseElo: 950,
    misconceptions: [
      { id: "inverse_sign_slip", label: "Forgot to invert operator sign", rule: (ans, p) => p.b + p.a }
    ]
  },
  "linear_two_step": {
    name: "Two-Step Linear Equations",
    prereqs: ["linear_one_step"],
    baseElo: 1100,
    misconceptions: [
      { id: "divide_before_subtract", label: "Divided before subtracting constants", rule: (ans, p) => Math.round((p.c + p.b) / p.a) }
    ]
  },
  "quadratic": {
    name: "Quadratic Equation Roots",
    prereqs: ["linear_two_step"],
    baseElo: 1300,
    misconceptions: [
      { id: "sign_flip_roots", label: "Inverted positive/negative root sign", rule: (ans) => -ans },
      { id: "incorrect_factorization", label: "Factored sum/product signs violation", rule: (ans, p) => p.smaller }
    ]
  },
  "matrix_trace": {
    name: "Matrix Trace Definition",
    prereqs: ["arithmetic_add"],
    baseElo: 1200,
    misconceptions: [
      { id: "det_instead_trace", label: "Calculated determinant (ad-bc) instead of trace", rule: (ans, p) => p.a * p.b - p.c * p.d }
    ]
  },
  "matrix_determinant": {
    name: "2x2 Matrix Determinants",
    prereqs: ["arithmetic_mult", "arithmetic_sub"],
    baseElo: 1350,
    misconceptions: [
      { id: "added_diagonals", label: "Added diagonal elements (ad+bc)", rule: (ans, p) => p.a * p.d + p.b * p.c }
    ]
  },

  // Combinatorics
  "pigeonhole": {
    name: "Pigeonhole Principle",
    prereqs: ["arithmetic_add"],
    baseElo: 1050,
    misconceptions: [
      { id: "exact_count", label: "Off by one (n instead of n+1)", rule: (ans) => ans - 1 }
    ]
  },
  "permutations": {
    name: "Permutations of Sets",
    prereqs: ["arithmetic_mult"],
    baseElo: 1200,
    misconceptions: [
      { id: "linear_factorial", label: "Total factorial without repeats division", rule: (ans, p) => ans * 2 }
    ]
  },
  "combinations": {
    name: "Combinations (n choose k)",
    prereqs: ["permutations"],
    baseElo: 1250,
    misconceptions: [
      { id: "perm_instead_comb", label: "Forgot to divide by k! (ordered permutations)", rule: (ans) => ans * 2 }
    ]
  },
  "binomial": {
    name: "Binomial Expansion Theorem",
    prereqs: ["combinations"],
    baseElo: 1400,
    misconceptions: [
      { id: "exponent_slip", label: "Off by one coefficient degree index", rule: (ans, p) => ans + p.n }
    ]
  },

  // Calculus
  "derivative": {
    name: "Power Rule Differentiation",
    prereqs: ["linear_two_step"],
    baseElo: 1400,
    misconceptions: [
      { id: "exponent_multiply", label: "Multiplied instead of subtracting exponent", rule: (ans, p) => ans + 2 }
    ]
  },
  "integral": {
    name: "Riemann Definite Integration",
    prereqs: ["derivative"],
    baseElo: 1500,
    misconceptions: [
      { id: "derivative_instead_integral", label: "Differentiated instead of integrating", rule: (ans, p) => Math.round(ans / 4) }
    ]
  },

  // Number Theory
  "gcd_lcm": {
    name: "Euclidean Greatest Common Divisor",
    prereqs: ["arithmetic_div"],
    baseElo: 1100,
    misconceptions: [
      { id: "product_instead_gcd", label: "Calculated product instead of divisor", rule: (ans, p) => p.a * p.b }
    ]
  },
  "modular_arithmetic": {
    name: "Modular Congruence Relations",
    prereqs: ["arithmetic_div"],
    baseElo: 1250,
    misconceptions: [
      { id: "off_by_one_mod", label: "Off-by-one remainder under modulus wrapper", rule: (ans, p) => (ans + 1) % p.mod }
    ]
  },
  "totient": {
    name: "Euler's Totient Function",
    prereqs: ["modular_arithmetic"],
    baseElo: 1450,
    misconceptions: [
      { id: "prime_totient_slip", label: "Treated composite as prime (N-1)", rule: (ans, p) => p.n - 1 }
    ]
  },

  // Geometry (audit #1.1 — a parallel strand broadening the catalog beyond the single number ladder)
  "geo_perimeter_rect": {
    name: "Perimeter of a Rectangle",
    prereqs: ["arithmetic_add"],
    baseElo: 550,
    misconceptions: [
      { id: "forgot_double", label: "Added length + width without doubling", rule: (ans) => Math.round(ans / 2) }
    ]
  },
  "geo_area_rect": {
    name: "Area of a Rectangle",
    prereqs: ["arithmetic_mult"],
    baseElo: 650,
    misconceptions: [
      { id: "area_slip", label: "Multiplication slip computing length × width", rule: (ans) => ans + 1 }
    ]
  },
  "geo_area_triangle": {
    name: "Area of a Triangle",
    prereqs: ["geo_area_rect"],
    baseElo: 800,
    misconceptions: [
      { id: "forgot_half", label: "Forgot the one-half factor (base × height)", rule: (ans) => ans * 2 }
    ]
  },
  "geo_angles_triangle": {
    name: "Angles in a Triangle",
    prereqs: ["arithmetic_sub"],
    baseElo: 750,
    misconceptions: [
      { id: "sum_to_360", label: "Assumed the angles sum to 360° instead of 180°", rule: (ans) => ans + 180 }
    ]
  },
  "geo_circle_area": {
    name: "Area of a Circle",
    prereqs: ["geo_area_rect"],
    baseElo: 950,
    misconceptions: [
      { id: "circumference_instead", label: "Used circumference (2πr) instead of area (πr²)", rule: (ans) => ans }
    ]
  },

  // Number sense / pre-algebra (audit #1.1 — the band the curriculum used to skip)
  "percentage_of": {
    name: "Percent of a Number",
    prereqs: ["arithmetic_mult"],
    baseElo: 700,
    misconceptions: [
      { id: "decimal_place", label: "Decimal-place slip (off by 10×)", rule: (ans) => ans * 10 }
    ]
  },
  "fraction_of": {
    name: "Fraction of a Number",
    prereqs: ["arithmetic_div"],
    baseElo: 720,
    misconceptions: [
      { id: "took_complement", label: "Computed the remaining part instead", rule: (ans) => ans }
    ]
  },
  "ratio_solve": {
    name: "Solving Ratios & Proportions",
    prereqs: ["arithmetic_mult"],
    baseElo: 780,
    misconceptions: [
      { id: "added_difference", label: "Added the ratio difference instead of scaling", rule: (ans) => ans + 1 }
    ]
  },
  "percent_change": {
    name: "Percent Increase & Decrease",
    prereqs: ["percentage_of"],
    baseElo: 850,
    misconceptions: [
      { id: "reported_change_only", label: "Gave only the change, not the new total", rule: (ans) => ans }
    ]
  },
  "exponent_power": {
    name: "Exponents & Powers",
    prereqs: ["arithmetic_mult"],
    baseElo: 760,
    misconceptions: [
      { id: "multiplied_base_exp", label: "Multiplied base × exponent instead of powering", rule: (ans) => ans }
    ]
  }
};

// Standards alignment (audit #1.1 — the school-market unlock). Common Core codes where they apply;
// a descriptive label for beyond-K-12 topics. Applied uniformly onto every concept so the catalog
// is fully tagged (enforced by test/curriculumCoverage.test.js — every concept must carry one).
const STANDARDS = {
  arithmetic_add: "1.OA.C.6",
  arithmetic_sub: "1.OA.C.6",
  arithmetic_mult: "3.OA.C.7",
  arithmetic_div: "3.OA.C.7",
  pemdas: "5.OA.A.1",
  pythagorean: "8.G.B.7",
  geo_perimeter_rect: "3.MD.D.8",
  geo_area_rect: "3.MD.C.7",
  geo_area_triangle: "6.G.A.1",
  geo_angles_triangle: "8.G.A.5",
  geo_circle_area: "7.G.B.4",
  percentage_of: "6.RP.A.3c",
  fraction_of: "5.NF.B.4",
  ratio_solve: "6.RP.A.3",
  percent_change: "7.RP.A.3",
  exponent_power: "6.EE.A.1",
  linear_one_step: "6.EE.B.7",
  linear_two_step: "7.EE.B.4",
  quadratic: "HSA-REI.B.4",
  matrix_trace: "HSN-VM.C.8",
  matrix_determinant: "HSN-VM.C.10",
  pigeonhole: "Discrete Math — Pigeonhole Principle",
  permutations: "HSS-CP.B.9",
  combinations: "HSS-CP.B.9",
  binomial: "HSA-APR.C.5",
  derivative: "Calculus — Differentiation (AP/IB)",
  integral: "Calculus — Integration (AP/IB)",
  gcd_lcm: "6.NS.B.4",
  modular_arithmetic: "Number Theory — Modular Arithmetic",
  totient: "Number Theory — Euler's Totient",
};
for (const id of Object.keys(concepts)) {
  concepts[id].standard = STANDARDS[id] || "Unmapped";
}

// Returns all prerequisites of a concept recursively (topological)
function getDependencies(conceptId) {
  const visited = new Set();
  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const c = concepts[id];
    if (c && c.prereqs) {
      c.prereqs.forEach(visit);
    }
  }
  visit(conceptId);
  return Array.from(visited);
}

module.exports = {
  concepts,
  getDependencies
};
