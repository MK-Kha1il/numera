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

  // Integers (audit #1.1 — signed-number arithmetic, the negatives band)
  "absolute_value": {
    name: "Absolute Value",
    prereqs: ["arithmetic_sub"],
    baseElo: 600,
    misconceptions: [
      { id: "kept_sign", label: "Kept the negative sign instead of the distance", rule: (ans) => -ans }
    ]
  },
  "integer_add": {
    name: "Adding Integers",
    prereqs: ["absolute_value"],
    baseElo: 700,
    misconceptions: [
      { id: "dropped_sign", label: "Added magnitudes and dropped the sign", rule: (ans) => Math.abs(ans) }
    ]
  },
  "integer_sub": {
    name: "Subtracting Integers",
    prereqs: ["integer_add"],
    baseElo: 780,
    misconceptions: [
      { id: "subtract_reversed", label: "Subtracted in the wrong order", rule: (ans) => -ans }
    ]
  },
  "integer_mult": {
    name: "Multiplying Integers",
    prereqs: ["integer_add", "arithmetic_mult"],
    baseElo: 820,
    misconceptions: [
      { id: "sign_rule_slip", label: "Got the sign of the product wrong", rule: (ans) => -ans }
    ]
  },

  // Decimals (audit #1.1 — decimal place value & the four operations to hundredths)
  "decimal_add": {
    name: "Adding Decimals",
    prereqs: ["arithmetic_add"],
    baseElo: 560,
    misconceptions: [
      { id: "carry_slip", label: "Forgot to carry into the ones place", rule: (ans) => ans - 1 }
    ]
  },
  "decimal_sub": {
    name: "Subtracting Decimals",
    prereqs: ["decimal_add", "arithmetic_sub"],
    baseElo: 640,
    misconceptions: [
      { id: "borrow_slip", label: "Forgot to borrow across the decimal point", rule: (ans) => ans + 1 }
    ]
  },
  "decimal_mult": {
    name: "Multiplying Decimals",
    prereqs: ["decimal_add", "arithmetic_mult"],
    baseElo: 720,
    misconceptions: [
      { id: "place_count_slip", label: "Miscounted the decimal places in the product", rule: (ans) => ans * 10 }
    ]
  },
  "decimal_round": {
    name: "Rounding Decimals",
    prereqs: ["decimal_add"],
    baseElo: 600,
    misconceptions: [
      { id: "round_direction", label: "Rounded the wrong direction", rule: (ans) => ans + 0.1 }
    ]
  },
  "decimal_div": {
    name: "Dividing Decimals",
    prereqs: ["decimal_mult"],
    baseElo: 760,
    misconceptions: [
      { id: "unshifted_divisor", label: "Divided without shifting the divisor to a whole number", rule: (ans) => ans / 10 }
    ]
  },

  // Fractions (audit #1.1 — fraction operations, the core middle-school topic)
  "fraction_simplify": {
    name: "Simplifying Fractions",
    prereqs: ["arithmetic_div"],
    baseElo: 540,
    misconceptions: [
      { id: "partial_reduce", label: "Divided only the top or only the bottom", rule: (ans) => ans }
    ]
  },
  "fraction_add": {
    name: "Adding Fractions",
    prereqs: ["fraction_simplify", "arithmetic_add"],
    baseElo: 680,
    misconceptions: [
      { id: "add_across", label: "Added numerators and denominators straight across", rule: (ans) => ans }
    ]
  },
  "fraction_sub": {
    name: "Subtracting Fractions",
    prereqs: ["fraction_add"],
    baseElo: 700,
    misconceptions: [
      { id: "sub_across", label: "Subtracted numerators and denominators straight across", rule: (ans) => ans }
    ]
  },
  "fraction_mult": {
    name: "Multiplying Fractions",
    prereqs: ["fraction_simplify", "arithmetic_mult"],
    baseElo: 640,
    misconceptions: [
      { id: "cross_multiply", label: "Cross-multiplied instead of multiplying across", rule: (ans) => ans }
    ]
  },
  "fraction_div": {
    name: "Dividing Fractions",
    prereqs: ["fraction_mult"],
    baseElo: 720,
    misconceptions: [
      { id: "forgot_to_flip", label: "Multiplied across without flipping the second fraction", rule: (ans) => ans }
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
  },

  // Statistics & probability (audit #1.1 — descriptive statistics strand)
  "stat_mode": {
    name: "Mode of a Data Set",
    prereqs: ["arithmetic_add"],
    baseElo: 620,
    misconceptions: [
      { id: "picked_max", label: "Chose the largest value instead of the most frequent", rule: (ans) => ans + 1 }
    ]
  },
  "stat_mean": {
    name: "Mean (Average)",
    prereqs: ["arithmetic_div"],
    baseElo: 700,
    misconceptions: [
      { id: "forgot_divide", label: "Reported the total instead of dividing by the count", rule: (ans) => ans }
    ]
  },
  "stat_median": {
    name: "Median of a Data Set",
    prereqs: ["arithmetic_add"],
    baseElo: 740,
    misconceptions: [
      { id: "unsorted_middle", label: "Took the middle of the unsorted list", rule: (ans) => ans }
    ]
  },
  "stat_range": {
    name: "Range of a Data Set",
    prereqs: ["arithmetic_sub"],
    baseElo: 660,
    misconceptions: [
      { id: "gave_max", label: "Reported the maximum instead of max − min", rule: (ans) => ans }
    ]
  },
  "stat_probability": {
    name: "Simple Probability",
    prereqs: ["fraction_of"],
    baseElo: 820,
    misconceptions: [
      { id: "used_complement", label: "Computed the complement (probability of the other outcome)", rule: (ans) => 100 - ans }
    ]
  },

  // Algebraic expressions (audit #1.1 — the bridge from arithmetic into algebra)
  "eval_expression": {
    name: "Evaluating Expressions",
    prereqs: ["pemdas"],
    baseElo: 900,
    misconceptions: [
      { id: "added_all", label: "Added every number instead of substituting", rule: (ans) => ans + 1 }
    ]
  },
  "eval_two_var": {
    name: "Two-Variable Expressions",
    prereqs: ["eval_expression"],
    baseElo: 980,
    misconceptions: [
      { id: "swapped_values", label: "Substituted the values into the wrong variables", rule: (ans) => ans + 1 }
    ]
  },
  "combine_like_terms": {
    name: "Combining Like Terms",
    prereqs: ["arithmetic_add"],
    baseElo: 940,
    misconceptions: [
      { id: "multiplied_coeffs", label: "Multiplied the coefficients instead of adding them", rule: (ans) => ans }
    ]
  },
  "distribute": {
    name: "The Distributive Property",
    prereqs: ["arithmetic_mult"],
    baseElo: 1000,
    misconceptions: [
      { id: "partial_distribute", label: "Distributed to only the first term inside the parentheses", rule: (ans) => ans }
    ]
  },

  // ---- Powers strand (exponents & roots — the 8th-grade bridge into algebra II) ----
  "square_root": {
    name: "Square Roots",
    prereqs: ["arithmetic_mult"],
    baseElo: 750,
    misconceptions: [
      { id: "halved_instead", label: "Halved the number instead of finding its root", rule: (ans, p) => p.n / 2 },
      { id: "root_off_by_one", label: "Recalled the neighboring perfect square's root", rule: (ans) => ans + 1 }
    ]
  },
  "exponent_product_rule": {
    name: "Product Rule for Exponents",
    prereqs: ["exponent_power"],
    baseElo: 920,
    misconceptions: [
      { id: "multiplied_exponents", label: "Multiplied the exponents instead of adding them", rule: (ans) => ans }
    ]
  },
  "exponent_quotient_rule": {
    name: "Quotient Rule for Exponents",
    prereqs: ["exponent_product_rule"],
    baseElo: 960,
    misconceptions: [
      { id: "divided_exponents", label: "Divided the exponents instead of subtracting them", rule: (ans) => ans },
      { id: "subtracted_backwards", label: "Subtracted the exponents in the wrong order", rule: (ans) => ans }
    ]
  },
  "exponent_zero_negative": {
    name: "Zero & Negative Exponents",
    prereqs: ["exponent_quotient_rule"],
    baseElo: 1000,
    misconceptions: [
      { id: "zero_power_zero", label: "Decided anything to the power zero is zero", rule: () => 0 },
      { id: "negative_means_negative", label: "Treated a negative exponent as a negative number", rule: (ans) => -ans }
    ]
  },
  "scientific_notation": {
    name: "Scientific Notation",
    prereqs: ["exponent_zero_negative", "decimal_mult"],
    baseElo: 1040,
    misconceptions: [
      { id: "exponent_miscount", label: "Counted the decimal shift off by one", rule: (ans) => ans },
      { id: "mantissa_out_of_range", label: "Left the leading number outside 1–10", rule: (ans) => ans }
    ]
  },

  // ---- Graphing strand (linear graphing & the coordinate plane — the 8.EE/8.F/8.G bridge) ----
  "point_on_line": {
    name: "Points on a Line",
    prereqs: ["eval_expression"],
    baseElo: 940,
    misconceptions: [
      { id: "forgot_intercept", label: "Multiplied by the slope but never applied the intercept", rule: (ans, p) => p.m * p.x },
      { id: "added_before_multiplying", label: "Added the intercept to x before multiplying by the slope", rule: (ans, p) => p.m * (p.x + p.b) },
      { id: "flipped_intercept_sign", label: "Applied the intercept with the wrong sign", rule: (ans, p) => ans - 2 * p.b }
    ]
  },
  "slope_from_points": {
    name: "Slope Between Two Points",
    prereqs: ["point_on_line", "integer_sub"],
    baseElo: 1000,
    misconceptions: [
      { id: "mixed_subtraction_order", label: "Subtracted the coordinates in opposite orders, flipping the sign", rule: (ans) => -ans },
      { id: "inverted_rise_run", label: "Computed run over rise instead of rise over run", rule: (ans) => 1 / ans },
      { id: "rise_only", label: "Used only the change in y and ignored the run", rule: (ans, p) => p.y2 - p.y1 }
    ]
  },
  "slope_intercept_id": {
    name: "Slope–Intercept Form",
    prereqs: ["slope_from_points"],
    baseElo: 1030,
    misconceptions: [
      { id: "swapped_slope_intercept", label: "Read the intercept as the slope (or vice versa)", rule: (ans, p) => (Math.abs(ans - p.m) < 0.001 ? p.b : p.m) },
      { id: "dropped_sign", label: "Dropped the sign of the coefficient", rule: (ans) => -ans }
    ]
  },
  "midpoint": {
    name: "Midpoint of a Segment",
    prereqs: ["point_on_line", "stat_mean"],
    baseElo: 1060,
    misconceptions: [
      { id: "halved_difference", label: "Halved the coordinate differences but forgot the starting point", rule: (ans) => ans },
      { id: "forgot_to_halve", label: "Added the endpoints without dividing by two", rule: (ans) => ans }
    ]
  },
  "distance_formula": {
    name: "Distance Between Points",
    prereqs: ["pythagorean", "slope_from_points"],
    baseElo: 1120,
    misconceptions: [
      { id: "added_legs", label: "Added the legs directly instead of squaring under the root", rule: (ans, p) => p.legA + p.legB },
      { id: "forgot_root", label: "Computed the squared distance but skipped the square root", rule: (ans) => ans * ans }
    ]
  },

  // ---- Inequalities strand (solving & reasoning about order — the 6.EE/7.EE band) ----
  "inequality_one_step_add": {
    name: "One-Step Inequalities (Add/Subtract)",
    prereqs: ["linear_one_step"],
    baseElo: 900,
    misconceptions: [
      { id: "flipped_direction", label: "Flipped the inequality sign when no flip was needed", rule: (ans) => ans },
      { id: "wrong_inverse_op", label: "Added instead of subtracting (or vice versa) when isolating x", rule: (ans) => ans },
      { id: "treated_as_equation", label: "Answered with = as if it were an equation", rule: (ans) => ans }
    ]
  },
  "inequality_one_step_mult": {
    name: "One-Step Inequalities (Multiply/Divide)",
    prereqs: ["inequality_one_step_add", "arithmetic_div"],
    baseElo: 950,
    misconceptions: [
      { id: "flipped_direction", label: "Flipped the sign while dividing by a POSITIVE number", rule: (ans) => ans },
      { id: "subtracted_instead", label: "Subtracted the coefficient instead of dividing by it", rule: (ans) => ans }
    ]
  },
  "inequality_flip_negative": {
    name: "Flip on Negative",
    prereqs: ["inequality_one_step_mult", "integer_mult"],
    baseElo: 1050,
    misconceptions: [
      { id: "forgot_flip", label: "Divided by a negative without flipping the inequality", rule: (ans) => ans },
      { id: "dropped_negative", label: "Dropped the negative sign from the solution", rule: (ans) => ans }
    ]
  },
  "inequality_two_step": {
    name: "Two-Step Inequalities",
    prereqs: ["inequality_one_step_mult", "linear_two_step"],
    baseElo: 1080,
    misconceptions: [
      { id: "flipped_direction", label: "Flipped the sign without a negative division", rule: (ans) => ans },
      { id: "forgot_to_divide", label: "Subtracted the constant but never divided by the coefficient", rule: (ans) => ans }
    ]
  },
  "inequality_compound": {
    name: "Compound Inequalities",
    prereqs: ["inequality_two_step"],
    baseElo: 1150,
    misconceptions: [
      { id: "one_side_only", label: "Applied the operation to only one side of the sandwich", rule: (ans) => ans },
      { id: "dropped_constraint", label: "Kept only one of the two bounds", rule: (ans) => ans }
    ]
  },

  // ---- Geometry depth (solid measurement — volume, surface area, circumference) ----
  "geo_volume_rect": {
    name: "Volume of a Rectangular Prism",
    prereqs: ["geo_area_rect"],
    baseElo: 880,
    misconceptions: [
      { id: "added_dimensions", label: "Added the dimensions instead of multiplying them", rule: (ans, p) => p.l + p.w + p.h },
      { id: "forgot_height", label: "Computed the base area but forgot the height", rule: (ans, p) => p.l * p.w }
    ]
  },
  "geo_surface_area_rect": {
    name: "Surface Area of a Rectangular Prism",
    prereqs: ["geo_volume_rect"],
    baseElo: 1000,
    misconceptions: [
      { id: "forgot_double", label: "Summed the three face areas but forgot each appears twice", rule: (ans) => ans / 2 },
      { id: "volume_confusion", label: "Computed the volume instead of the surface area", rule: (ans, p) => p.l * p.w * p.h }
    ]
  },
  "geo_circumference": {
    name: "Circumference of a Circle",
    prereqs: ["geo_circle_area"],
    baseElo: 960,
    misconceptions: [
      { id: "radius_diameter_mixup", label: "Mixed up the radius and the diameter", rule: (ans) => ans },
      { id: "area_confusion", label: "Squared the radius — computed area instead of circumference", rule: (ans) => ans }
    ]
  },
  "geo_volume_cylinder": {
    name: "Volume of a Cylinder",
    prereqs: ["geo_volume_rect", "geo_circle_area"],
    baseElo: 1100,
    misconceptions: [
      { id: "forgot_square", label: "Used πrh — forgot to square the radius", rule: (ans) => ans },
      { id: "used_diameter", label: "Used the diameter where the radius belongs", rule: (ans) => ans }
    ]
  },

  // ---- Algebra promotions (existing variety templates raised to first-class concepts) ----
  "linear_variable_both_sides": {
    name: "Variables on Both Sides",
    prereqs: ["linear_two_step", "combine_like_terms"],
    baseElo: 1150,
    misconceptions: [
      { id: "sign_not_flipped", label: "Moved an x-term across the equals sign without changing its sign", rule: (ans) => ans },
      { id: "combined_unlike", label: "Combined an x-term with a constant", rule: (ans) => ans }
    ]
  },
  "linear_system": {
    name: "Systems of Two Equations",
    prereqs: ["linear_variable_both_sides"],
    baseElo: 1250,
    misconceptions: [
      { id: "answered_smaller", label: "Solved correctly but reported the other unknown", rule: (ans, p) => p.yVal },
      { id: "halved_the_sum", label: "Split the sum in half, ignoring the difference", rule: (ans, p) => (p.xVal + p.yVal) / 2 }
    ]
  },

  // ---- Polynomials (expressions depth — multiply and factor binomials) ----
  "foil_binomials": {
    name: "Multiplying Binomials (FOIL)",
    prereqs: ["distribute"],
    baseElo: 1180,
    misconceptions: [
      { id: "forgot_middle", label: "Multiplied Firsts and Lasts but skipped the Outer/Inner pairs", rule: (ans) => ans },
      { id: "swapped_sum_product", label: "Swapped the sum and the product of the constants", rule: (ans) => ans }
    ]
  },
  "square_binomial": {
    name: "Squaring a Binomial",
    prereqs: ["foil_binomials", "exponent_power"],
    baseElo: 1220,
    misconceptions: [
      { id: "dropped_middle_term", label: "Decided (x+a)² = x² + a² — the freshman's dream", rule: (ans) => ans },
      { id: "forgot_double", label: "Wrote the middle term as ax instead of 2ax", rule: (ans) => ans }
    ]
  },
  "factor_trinomial": {
    name: "Factoring Trinomials",
    prereqs: ["foil_binomials"],
    baseElo: 1280,
    misconceptions: [
      { id: "product_pair_wrong_sum", label: "Picked a factor pair with the right product but the wrong sum", rule: (ans) => ans },
      { id: "sign_mix", label: "Mixed the signs of the factors", rule: (ans) => ans }
    ]
  },

  // ---- Measurement (number-sense depth — unit conversion) ----
  "unit_convert_metric": {
    name: "Metric Unit Conversion",
    prereqs: ["decimal_mult"],
    baseElo: 850,
    misconceptions: [
      { id: "wrong_power", label: "Converted by the wrong power of ten", rule: (ans) => ans },
      { id: "wrong_direction", label: "Multiplied when the conversion needed division (or vice versa)", rule: (ans) => ans }
    ]
  },
  "unit_convert_time": {
    name: "Time Unit Conversion",
    prereqs: ["arithmetic_mult"],
    baseElo: 820,
    misconceptions: [
      { id: "used_100", label: "Treated an hour as 100 minutes (decimal-clock thinking)", rule: (ans) => ans },
      { id: "dropped_remainder", label: "Converted the whole units but dropped the leftover part", rule: (ans) => ans }
    ]
  },

  // ---- Proportional reasoning depth (number-sense strand) ----
  "unit_rate": {
    name: "Unit Rates",
    prereqs: ["ratio_solve", "arithmetic_div"],
    baseElo: 900,
    misconceptions: [
      { id: "subtracted_instead", label: "Subtracted the quantities instead of dividing them", rule: (ans, p) => p.total - p.count },
      { id: "inverted_rate", label: "Divided the wrong way around (count per dollar, not dollars per item)", rule: (ans) => 1 / ans }
    ]
  },
  "proportion_solve": {
    name: "Solving Proportions",
    prereqs: ["unit_rate", "fraction_simplify"],
    baseElo: 1000,
    misconceptions: [
      { id: "additive_thinking", label: "Added the same amount instead of scaling by the same factor", rule: (ans) => ans },
      { id: "copied_denominator", label: "Matched the denominators instead of the ratio", rule: (ans) => ans }
    ]
  },

  // ---- Integers depth (division sign rules, order of operations with negatives) ----
  "integer_div": {
    name: "Dividing Integers",
    prereqs: ["integer_mult", "arithmetic_div"],
    baseElo: 800,
    misconceptions: [
      { id: "sign_slip", label: "Got the magnitude right but the sign wrong", rule: (ans) => -ans },
      { id: "two_negatives_negative", label: "Decided negative ÷ negative stays negative", rule: (ans) => -ans }
    ]
  },
  "integer_ops": {
    name: "Order of Operations with Negatives",
    prereqs: ["integer_mult", "pemdas"],
    baseElo: 950,
    misconceptions: [
      { id: "left_to_right", label: "Worked left to right, adding before multiplying", rule: (ans) => ans },
      { id: "dropped_negative", label: "Lost a negative sign mid-calculation", rule: (ans) => -ans }
    ]
  },

  // ---- Fractions depth (mixed numbers, structural comparison) ----
  "mixed_number": {
    name: "Mixed Numbers & Improper Fractions",
    prereqs: ["fraction_simplify", "arithmetic_mult"],
    baseElo: 780,
    misconceptions: [
      { id: "added_whole_to_numerator", label: "Added the whole number to the numerator without multiplying by the denominator", rule: (ans) => ans },
      { id: "digit_concatenation", label: "Glued the whole number onto the numerator as digits", rule: (ans) => ans }
    ]
  },
  "fraction_compare": {
    name: "Comparing Fractions",
    prereqs: ["fraction_simplify"],
    baseElo: 850,
    misconceptions: [
      { id: "bigger_numbers_bigger", label: "Judged by the size of the numbers instead of the size of the fraction", rule: (ans) => ans },
      { id: "numerator_only", label: "Compared numerators and ignored the denominators", rule: (ans) => ans }
    ]
  },

  // ---- Statistics depth (compound events) ----
  "compound_probability": {
    name: "Compound Probability",
    prereqs: ["stat_probability", "fraction_mult"],
    baseElo: 1100,
    misconceptions: [
      { id: "added_probabilities", label: "Added the two probabilities instead of multiplying them", rule: (ans) => ans },
      { id: "ignored_second_event", label: "Reported the probability of only one of the events", rule: (ans) => ans }
    ]
  },

  // ---- Decimals depth (conversions & ordering — the representation-fluency band) ----
  "percent_decimal_convert": {
    name: "Percents & Decimals",
    prereqs: ["decimal_mult", "percentage_of"],
    baseElo: 800,
    misconceptions: [
      { id: "one_place_slip", label: "Slid the decimal point one place instead of two", rule: (ans) => ans * 10 },
      { id: "dropped_percent", label: "Dropped the percent sign without converting at all", rule: (ans) => ans * 100 }
    ]
  },
  "decimal_compare": {
    name: "Comparing Decimals",
    prereqs: ["decimal_round"],
    baseElo: 760,
    misconceptions: [
      { id: "longer_is_larger", label: "Judged size by the number of digits after the point", rule: (ans) => ans },
      { id: "shorter_is_larger", label: "Treated extra decimal digits like fraction denominators (more digits = smaller)", rule: (ans) => ans }
    ]
  },
  "fraction_decimal_convert": {
    name: "Fractions & Decimals",
    prereqs: ["fraction_simplify", "decimal_div"],
    baseElo: 880,
    misconceptions: [
      { id: "glued_digits", label: "Wrote the fraction's digits behind a decimal point without dividing", rule: (ans) => ans },
      { id: "place_slip", label: "Divided correctly but misplaced the decimal point", rule: (ans) => ans * 10 }
    ]
  },

  // ---- Powers depth (cube roots, the power rule) ----
  "cube_root": {
    name: "Cube Roots",
    prereqs: ["square_root"],
    baseElo: 1000,
    misconceptions: [
      { id: "square_cube_mixup", label: "Found the square root (or square) instead of the cube root", rule: (ans) => ans * ans },
      { id: "divided_by_three", label: "Divided by three instead of un-cubing", rule: (ans) => ans }
    ]
  },
  "exponent_power_rule": {
    name: "Power Rule for Exponents",
    prereqs: ["exponent_product_rule"],
    baseElo: 1020,
    misconceptions: [
      { id: "added_exponents", label: "Added the exponents — the product-rule reflex applied to nesting", rule: (ans) => ans },
      { id: "raised_exponent", label: "Raised the exponent to the power instead of multiplying", rule: (ans) => ans }
    ]
  },

  // ---- Geometry depth II (composite figures) ----
  "geo_composite": {
    name: "Composite Figures",
    prereqs: ["geo_area_rect"],
    baseElo: 1050,
    misconceptions: [
      { id: "ignored_cut", label: "Found the full rectangle's area and forgot the missing corner", rule: (ans, p) => p.full },
      { id: "added_cut", label: "Added the cut-out area instead of subtracting it", rule: (ans, p) => p.full + p.notch }
    ]
  },

  // ---- Statistics depth II (reverse-mean reasoning) ----
  "mean_missing_value": {
    name: "Missing Value from the Mean",
    prereqs: ["stat_mean", "linear_one_step"],
    baseElo: 1080,
    misconceptions: [
      { id: "repeated_the_mean", label: "Assumed the missing score equals the mean", rule: (ans) => ans },
      { id: "forgot_total", label: "Never converted the mean back into a total", rule: (ans) => ans }
    ]
  },

  // ---- Integers depth II (ordering on the number line) ----
  "integer_compare": {
    name: "Ordering Integers",
    prereqs: ["absolute_value"],
    baseElo: 740,
    misconceptions: [
      { id: "magnitude_as_size", label: "Ranked negatives by their digits — treated -8 as bigger than -3", rule: (ans) => ans },
      { id: "negatives_above_positives", label: "Placed a negative above a positive", rule: (ans) => ans }
    ]
  },

  // ---- Expressions depth II (words → symbols) ----
  "translate_expression": {
    name: "Words to Expressions",
    prereqs: ["eval_expression"],
    baseElo: 1010,
    misconceptions: [
      { id: "reversed_subtraction", label: "Translated 'b less than a' as b - a instead of a - b", rule: (ans) => ans },
      { id: "grouped_wrongly", label: "Wrapped the addition inside the multiplication", rule: (ans) => ans },
      { id: "swapped_roles", label: "Swapped the multiplier and the added constant", rule: (ans) => ans }
    ]
  },

  // ---- Geometry depth III (angle pairs at a crossing) ----
  "geo_angles_lines": {
    name: "Angles at a Crossing",
    prereqs: ["geo_angles_triangle"],
    baseElo: 980,
    misconceptions: [
      { id: "supplement_for_vertical", label: "Subtracted from 180° for a vertical angle (which is simply equal)", rule: (ans, p) => 180 - ans },
      { id: "complement_confusion", label: "Used 90° where the straight line demands 180°", rule: (ans, p) => 90 - (180 - ans) }
    ]
  },

  // ---- Percent applications (number-sense depth II) ----
  "percent_discount": {
    name: "Discounts & Sale Prices",
    prereqs: ["percentage_of"],
    baseElo: 920,
    misconceptions: [
      { id: "gave_the_discount", label: "Reported the discount amount instead of the final price", rule: (ans) => ans },
      { id: "subtracted_percent_as_dollars", label: "Subtracted the percent number directly from the price", rule: (ans) => ans }
    ]
  },
  "simple_interest": {
    name: "Simple Interest",
    prereqs: ["percent_discount", "arithmetic_mult"],
    baseElo: 1040,
    misconceptions: [
      { id: "forgot_the_years", label: "Computed one year's interest and stopped", rule: (ans, p) => ans / p.t },
      { id: "gave_the_balance", label: "Reported principal plus interest when only the interest was asked", rule: (ans, p) => p.P + ans }
    ]
  },
  "multi_step_word": {
    name: "Multi-Step Word Problems",
    prereqs: ["arithmetic_mult", "arithmetic_sub"],
    baseElo: 900,
    misconceptions: [
      { id: "stopped_early", label: "Answered an intermediate result instead of the final question", rule: (ans) => ans },
      { id: "wrong_operation_chain", label: "Combined the numbers with the wrong sequence of operations", rule: (ans) => ans }
    ]
  },

  // ---- Functions strand (8.F — notation, tables, rate of change, initial value) ----
  "function_evaluate": {
    name: "Evaluating Functions",
    prereqs: ["eval_expression", "point_on_line"],
    baseElo: 1060,
    misconceptions: [
      { id: "forgot_constant", label: "Applied the coefficient but dropped the constant term", rule: (ans, p) => p.a * p.c },
      { id: "added_before_multiplying", label: "Added the constant to the input before multiplying", rule: (ans, p) => p.a * (p.c + p.b) }
    ]
  },
  "function_table": {
    name: "Rules from Tables",
    prereqs: ["function_evaluate"],
    baseElo: 1120,
    misconceptions: [
      { id: "first_row_only", label: "Chose a rule that fits only the first table entry", rule: (ans) => ans },
      { id: "swapped_coefficients", label: "Swapped the rate and the starting value in the rule", rule: (ans) => ans }
    ]
  },
  "rate_of_change": {
    name: "Rate of Change",
    prereqs: ["function_table", "slope_from_points"],
    baseElo: 1160,
    misconceptions: [
      { id: "total_not_rate", label: "Reported the total change instead of the change per unit", rule: (ans, p) => p.y2 - p.y1 },
      { id: "used_the_run", label: "Reported the elapsed units instead of the rate", rule: (ans, p) => p.dx }
    ]
  },
  "function_initial": {
    name: "Initial Value",
    prereqs: ["rate_of_change"],
    baseElo: 1200,
    misconceptions: [
      { id: "wrong_direction", label: "Walked the rate the wrong way from the current state", rule: (ans, p) => p.V - p.r * p.t },
      { id: "gave_the_change", label: "Reported how much changed instead of the starting amount", rule: (ans, p) => p.r * p.t }
    ]
  },
  "function_solve": {
    name: "Solving f(x) = T",
    prereqs: ["function_evaluate", "linear_two_step"],
    baseElo: 1240,
    misconceptions: [
      { id: "plugged_in_the_target", label: "Computed f(T) instead of solving f(x) = T", rule: (ans, p) => p.a * p.T + p.b },
      { id: "forgot_to_divide", label: "Subtracted the constant but never divided by the coefficient", rule: (ans, p) => p.T - p.b }
    ]
  },

  // ---- Statistics depth III (the complement rule) ----
  "probability_complement": {
    name: "Complement of an Event",
    prereqs: ["stat_probability"],
    baseElo: 1020,
    misconceptions: [
      { id: "used_event_itself", label: "Reported the event's own probability instead of its complement", rule: (ans) => ans },
      { id: "wrong_whole", label: "Subtracted from the wrong total", rule: (ans) => ans }
    ]
  },

  // ---- Coordinate geometry (transformations on the plane) ----
  "coord_reflect": {
    name: "Reflecting a Point",
    prereqs: ["point_on_line", "integer_compare"],
    baseElo: 940,
    misconceptions: [
      { id: "wrong_coordinate", label: "Flipped the coordinate the axis leaves unchanged", rule: (ans) => ans },
      { id: "negated_both", label: "Negated both coordinates instead of just one", rule: (ans) => ans }
    ]
  },
  "coord_translate": {
    name: "Translating a Point",
    prereqs: ["coord_reflect", "integer_add"],
    baseElo: 980,
    misconceptions: [
      { id: "wrong_axis", label: "Applied the horizontal shift to the vertical coordinate", rule: (ans) => ans },
      { id: "wrong_sign", label: "Moved the point the opposite direction", rule: (ans) => ans }
    ]
  },

  // ---- Percent applications II (markup, percent error) ----
  "percent_markup": {
    name: "Markup & Percent Increase",
    prereqs: ["percent_discount"],
    baseElo: 960,
    misconceptions: [
      { id: "gave_the_markup", label: "Reported the increase instead of the new total", rule: (ans) => ans },
      { id: "used_decrease", label: "Subtracted the markup instead of adding it", rule: (ans) => ans }
    ]
  },
  "percent_error": {
    name: "Percent Error",
    prereqs: ["percent_markup", "percent_change"],
    baseElo: 1080,
    misconceptions: [
      { id: "divided_by_measured", label: "Divided by the measured value instead of the true value", rule: (ans) => ans },
      { id: "forgot_to_scale", label: "Reported the raw difference, never converting to a percent", rule: (ans) => ans }
    ]
  },

  // ---- Calculus promotion (limits of rational sequences) ----
  "limit": {
    name: "Limits at Infinity",
    prereqs: ["derivative"],
    baseElo: 1500,
    misconceptions: [
      { id: "ignored_lower_degree", label: "Let a lower-degree term survive the limit", rule: (ans) => ans },
      { id: "read_constant_term", label: "Read off a constant instead of the ratio of leading coefficients", rule: (ans) => ans }
    ]
  },

  // ---- Number-theory promotion (counting divisors) ----
  "divisor_count": {
    name: "Counting Divisors",
    prereqs: ["gcd_lcm"],
    baseElo: 1350,
    misconceptions: [
      { id: "listed_primes_only", label: "Counted only the prime factors, not all divisors", rule: (ans) => ans },
      { id: "forgot_exponent_plus_one", label: "Multiplied the exponents instead of (exponent + 1)", rule: (ans) => ans }
    ]
  },

  // ---- Fractions depth III (signed rational arithmetic, 7.NS) ----
  "fraction_negative": {
    name: "Adding & Subtracting Signed Fractions",
    prereqs: ["fraction_add", "integer_add"],
    baseElo: 1010,
    misconceptions: [
      { id: "dropped_sign", label: "Lost a negative sign while combining the numerators", rule: (ans) => ans },
      { id: "subtracted_a_negative_wrong", label: "Treated subtracting a negative as a subtraction", rule: (ans) => ans }
    ]
  },

  // ---- Statistics depth IV (dependent events) ----
  "prob_without_replacement": {
    name: "Probability Without Replacement",
    prereqs: ["compound_probability"],
    baseElo: 1180,
    misconceptions: [
      { id: "treated_independent", label: "Multiplied as if the first item were replaced", rule: (ans) => ans },
      { id: "one_draw_only", label: "Reported a single draw instead of both", rule: (ans) => ans }
    ]
  },

  // ---- Geometry depth IV (parallelogram & trapezoid areas) ----
  "geo_area_parallelogram": {
    name: "Area of a Parallelogram",
    prereqs: ["geo_area_rect"],
    baseElo: 900,
    misconceptions: [
      { id: "used_slant", label: "Multiplied by the slanted side instead of the perpendicular height", rule: (ans) => ans },
      { id: "added_sides", label: "Added base and height instead of multiplying", rule: (ans, p) => p.base + p.h }
    ]
  },
  "geo_area_trapezoid": {
    name: "Area of a Trapezoid",
    prereqs: ["geo_area_parallelogram"],
    baseElo: 1020,
    misconceptions: [
      { id: "forgot_to_average", label: "Multiplied the base sum by the height without halving", rule: (ans) => ans },
      { id: "one_base_only", label: "Used only one of the two parallel sides", rule: (ans) => ans }
    ]
  },

  // ---- Powers depth III (power of a product) ----
  "exponent_power_of_product": {
    name: "Power of a Product",
    prereqs: ["exponent_power_rule"],
    baseElo: 1080,
    misconceptions: [
      { id: "skipped_coefficient", label: "Raised x but left the coefficient un-powered", rule: (ans) => ans },
      { id: "multiplied_coefficient", label: "Multiplied the coefficient by the exponent instead of raising it", rule: (ans) => ans }
    ]
  },

  // ---- Sequences strand (arithmetic & geometric patterns — 4.OA / HSF) ----
  "arithmetic_next_term": {
    name: "Next Term of an Arithmetic Sequence",
    prereqs: ["integer_add"],
    baseElo: 1000,
    misconceptions: [
      { id: "forgot_to_add", label: "Repeated the last term instead of adding the common difference", rule: (ans, p) => p.last },
      { id: "doubled_last", label: "Doubled the last term", rule: (ans, p) => 2 * p.last }
    ]
  },
  "arithmetic_common_difference": {
    name: "Common Difference",
    prereqs: ["arithmetic_next_term", "integer_sub"],
    baseElo: 1040,
    misconceptions: [
      { id: "used_a_term", label: "Reported a term of the sequence instead of the gap between terms", rule: (ans, p) => p.t2 },
      { id: "used_first_term", label: "Mistook the first term for the common difference", rule: (ans, p) => p.a }
    ]
  },
  "arithmetic_nth_term": {
    name: "nth Term of an Arithmetic Sequence",
    prereqs: ["arithmetic_common_difference", "eval_expression"],
    baseElo: 1140,
    misconceptions: [
      { id: "off_by_one_n", label: "Multiplied the difference by n instead of (n − 1)", rule: (ans, p) => p.a1 + p.n * p.d },
      { id: "dropped_first_term", label: "Forgot to add the first term", rule: (ans, p) => (p.n - 1) * p.d }
    ]
  },
  "geometric_next_term": {
    name: "Next Term of a Geometric Sequence",
    prereqs: ["arithmetic_next_term", "integer_mult"],
    baseElo: 1180,
    misconceptions: [
      { id: "treated_arithmetic", label: "Added the last gap as if the sequence were arithmetic", rule: (ans, p) => 2 * p.last - p.prev },
      { id: "added_ratio", label: "Added the common ratio instead of multiplying by it", rule: (ans, p) => p.last + p.r }
    ]
  },
  "geometric_common_ratio": {
    name: "Common Ratio",
    prereqs: ["geometric_next_term", "integer_div"],
    baseElo: 1220,
    misconceptions: [
      { id: "subtracted_terms", label: "Subtracted consecutive terms as if the sequence were arithmetic", rule: (ans, p) => p.diff },
      { id: "read_a_term", label: "Reported a term instead of the ratio between terms", rule: (ans, p) => p.t2 }
    ]
  },
  "geometric_nth_term": {
    name: "nth Term of a Geometric Sequence",
    prereqs: ["geometric_common_ratio", "exponent_power"],
    baseElo: 1240,
    misconceptions: [
      { id: "off_by_one_exponent", label: "Raised the ratio to the n instead of (n − 1)", rule: (ans, p) => p.a1 * Math.pow(p.r, p.n) },
      { id: "multiplied_not_powered", label: "Multiplied by the ratio instead of raising it to a power", rule: (ans, p) => p.a1 * p.r * (p.n - 1) }
    ]
  },
  "arithmetic_series": {
    name: "Sum of an Arithmetic Series",
    prereqs: ["arithmetic_nth_term"],
    baseElo: 1260,
    misconceptions: [
      { id: "forgot_to_halve", label: "Added all the terms but never halved (used the doubled total)", rule: (ans, p) => p.doubled },
      { id: "used_last_not_average", label: "Multiplied the count by the last term instead of the average term", rule: (ans, p) => p.nlast }
    ]
  },
  "fibonacci_next": {
    name: "Recursive Sequences",
    prereqs: ["arithmetic_next_term"],
    baseElo: 1160,
    misconceptions: [
      { id: "doubled_last", label: "Doubled the last term instead of adding the two before it", rule: (ans, p) => 2 * p.t4 },
      { id: "summed_earlier_pair", label: "Summed an earlier pair of terms", rule: (ans, p) => p.t4 }
    ]
  },

  // ---- Statistics II: measures of spread (quartiles, IQR, MAD — 6.SP) ----
  "stat_quartile": {
    name: "Quartiles",
    prereqs: ["stat_median"],
    baseElo: 1080,
    misconceptions: [
      { id: "gave_median", label: "Reported the overall median instead of the lower quartile", rule: (ans, p) => p.median },
      { id: "gave_min", label: "Reported the minimum instead of the quartile", rule: (ans, p) => p.min }
    ]
  },
  "stat_iqr": {
    name: "Interquartile Range",
    prereqs: ["stat_quartile", "stat_range"],
    baseElo: 1140,
    misconceptions: [
      { id: "gave_range", label: "Reported the full range (max − min) instead of the interquartile range", rule: (ans, p) => p.max - p.min },
      { id: "gave_q3_only", label: "Reported Q3 without subtracting Q1", rule: (ans, p) => p.q3 }
    ]
  },
  "stat_mad": {
    name: "Mean Absolute Deviation",
    prereqs: ["stat_mean"],
    baseElo: 1200,
    misconceptions: [
      { id: "forgot_to_divide", label: "Summed the absolute deviations but never divided by the count", rule: (ans, p) => p.sumdev },
      { id: "gave_mean", label: "Reported the mean instead of the average distance from it", rule: (ans, p) => p.mean }
    ]
  },

  // ---- Transformations II: rotations & dilations about the origin (8.G.A) ----
  "coord_rotate_180": {
    name: "Rotating a Point 180°",
    prereqs: ["coord_reflect", "integer_mult"],
    baseElo: 1000,
    misconceptions: [
      { id: "negated_one", label: "Flipped the sign of only one coordinate", rule: (ans) => ans },
      { id: "swapped", label: "Swapped the coordinates instead of negating them", rule: (ans) => ans }
    ]
  },
  "coord_rotate_90": {
    name: "Rotating a Point 90°",
    prereqs: ["coord_rotate_180"],
    baseElo: 1080,
    misconceptions: [
      { id: "swapped_no_sign", label: "Swapped the coordinates but forgot the sign change", rule: (ans) => ans },
      { id: "wrong_direction", label: "Rotated clockwise instead of counterclockwise (negated the wrong coordinate)", rule: (ans) => ans }
    ]
  },
  "coord_dilate": {
    name: "Dilating a Point",
    prereqs: ["coord_translate", "integer_mult"],
    baseElo: 1120,
    misconceptions: [
      { id: "added_factor", label: "Added the scale factor instead of multiplying by it", rule: (ans) => ans },
      { id: "scaled_one", label: "Scaled only one coordinate", rule: (ans) => ans }
    ]
  },

  // ---- Geometry volume II: cone, sphere, pyramid (8.G.C / HSG-GMD) ----
  "geo_volume_cone": {
    name: "Volume of a Cone",
    prereqs: ["geo_volume_cylinder"],
    baseElo: 1140,
    misconceptions: [
      { id: "forgot_third", label: "Used the cylinder volume — forgot the one-third factor", rule: (ans) => ans },
      { id: "forgot_square", label: "Forgot to square the radius", rule: (ans) => ans }
    ]
  },
  "geo_volume_sphere": {
    name: "Volume of a Sphere",
    prereqs: ["geo_volume_cylinder"],
    baseElo: 1180,
    misconceptions: [
      { id: "forgot_four_thirds", label: "Dropped the 4/3 factor and reported r cubed alone", rule: (ans) => ans },
      { id: "squared_not_cubed", label: "Squared the radius instead of cubing it", rule: (ans) => ans }
    ]
  },
  "geo_volume_pyramid": {
    name: "Volume of a Pyramid",
    prereqs: ["geo_volume_rect"],
    baseElo: 1100,
    misconceptions: [
      { id: "forgot_third", label: "Used the prism volume — forgot the one-third factor", rule: (ans, p) => p.prism },
      { id: "base_only", label: "Reported the base area instead of the volume", rule: (ans, p) => p.base }
    ]
  },

  // ---- Geometry surface area II: cylinder, sphere, cone (7.G / HSG-GMD) ----
  "geo_surface_cylinder": {
    name: "Surface Area of a Cylinder",
    prereqs: ["geo_volume_cylinder", "geo_circle_area"],
    baseElo: 1160,
    misconceptions: [
      { id: "lateral_only", label: "Found the curved side but forgot the two circular caps", rule: (ans) => ans },
      { id: "used_volume", label: "Computed the volume instead of the surface area", rule: (ans) => ans }
    ]
  },
  "geo_surface_sphere": {
    name: "Surface Area of a Sphere",
    prereqs: ["geo_volume_sphere"],
    baseElo: 1200,
    misconceptions: [
      { id: "forgot_square", label: "Forgot to square the radius", rule: (ans) => ans },
      { id: "wrong_coefficient", label: "Used the wrong leading number instead of 4", rule: (ans) => ans }
    ]
  },
  "geo_surface_cone": {
    name: "Surface Area of a Cone",
    prereqs: ["geo_volume_cone", "geo_circle_area"],
    baseElo: 1220,
    misconceptions: [
      { id: "lateral_only", label: "Found the slanted side but forgot the circular base", rule: (ans) => ans },
      { id: "base_only", label: "Found the base but forgot the slanted side", rule: (ans) => ans }
    ]
  },

  // ---- Equations strand: solving equations with fractions (6.EE / 7.EE / 7.RP) ----
  "eqn_onestep_div": {
    name: "One-Step Equations (Division)",
    prereqs: ["integer_div"],
    baseElo: 980,
    misconceptions: [
      { id: "forgot_to_multiply", label: "Left the answer as the right side — forgot to multiply by the divisor", rule: (ans, p) => p.b },
      { id: "gave_divisor", label: "Reported the divisor instead of solving for x", rule: (ans, p) => p.a }
    ]
  },
  "eqn_fraction_coeff": {
    name: "Fractional Coefficients",
    prereqs: ["eqn_onestep_div", "fraction_mult"],
    baseElo: 1080,
    misconceptions: [
      { id: "only_divided", label: "Divided by the numerator but never multiplied by the denominator", rule: (ans, p) => p.k },
      { id: "only_multiplied", label: "Multiplied by the denominator but never divided by the numerator", rule: (ans, p) => p.abk }
    ]
  },
  "eqn_clear_denom": {
    name: "Clearing a Denominator",
    prereqs: ["eqn_onestep_div", "linear_two_step"],
    baseElo: 1100,
    misconceptions: [
      { id: "forgot_clear", label: "Solved the numerator without clearing the denominator", rule: (ans, p) => p.d - p.c },
      { id: "forgot_subtract", label: "Cleared the denominator but never subtracted the constant", rule: (ans, p) => p.a * p.d }
    ]
  },
  "eqn_proportion": {
    name: "Solving Proportions",
    prereqs: ["eqn_onestep_div", "proportion_solve"],
    baseElo: 1040,
    misconceptions: [
      { id: "forgot_divide", label: "Cross-multiplied but never divided", rule: (ans, p) => p.ad },
      { id: "copied_denominator", label: "Copied the denominator instead of solving", rule: (ans, p) => p.d }
    ]
  },
  "eqn_two_step_fraction": {
    name: "Two-Step Equations with a Fraction",
    prereqs: ["eqn_clear_denom"],
    baseElo: 1140,
    misconceptions: [
      { id: "forgot_to_multiply", label: "Isolated the fraction but never multiplied by the denominator", rule: (ans, p) => p.d + p.c },
      { id: "forgot_to_add", label: "Cleared the denominator before undoing the subtraction", rule: (ans, p) => p.a * p.d }
    ]
  },

  // ---- Ratios & rates strand: applied proportional reasoning (6.RP / 7.RP / 7.G) ----
  "ratio_simplify": {
    name: "Simplifying Ratios",
    prereqs: ["fraction_simplify"],
    baseElo: 940,
    misconceptions: [
      { id: "didnt_simplify", label: "Left the ratio unreduced", rule: (ans) => ans },
      { id: "reversed", label: "Wrote the two parts in the wrong order", rule: (ans) => ans }
    ]
  },
  "ratio_share": {
    name: "Sharing in a Ratio",
    prereqs: ["ratio_simplify", "ratio_solve"],
    baseElo: 1040,
    misconceptions: [
      { id: "gave_smaller", label: "Reported the smaller share instead of the one asked for", rule: (ans, p) => p.smaller },
      { id: "gave_total", label: "Reported the whole amount instead of one share", rule: (ans, p) => p.total }
    ]
  },
  "unit_price": {
    name: "Unit Price",
    prereqs: ["unit_rate"],
    baseElo: 1000,
    misconceptions: [
      { id: "gave_total", label: "Reported the total cost instead of the price per item", rule: (ans, p) => p.total },
      { id: "gave_count", label: "Reported the number of items instead of the price", rule: (ans, p) => p.count }
    ]
  },
  "speed_dist_time": {
    name: "Speed, Distance & Time",
    prereqs: ["unit_rate"],
    baseElo: 1060,
    misconceptions: [
      { id: "gave_distance", label: "Reported the distance instead of the speed", rule: (ans, p) => p.dist },
      { id: "gave_time", label: "Reported the time instead of the speed", rule: (ans, p) => p.time }
    ]
  },
  "scale_factor": {
    name: "Scale Drawings",
    prereqs: ["proportion_solve"],
    baseElo: 1100,
    misconceptions: [
      { id: "added_instead", label: "Added the scale and the measurement instead of multiplying", rule: (ans, p) => p.m + p.k },
      { id: "gave_scale", label: "Reported the scale instead of the actual distance", rule: (ans, p) => p.k }
    ]
  },

  // ---- Factors & multiples strand: middle-school number theory (4.OA / 6.NS) ----
  "prime_factorization": {
    name: "Prime Factorization",
    prereqs: ["arithmetic_mult"],
    baseElo: 920,
    misconceptions: [
      { id: "used_composite", label: "Left composite factors instead of breaking down to primes", rule: (ans) => ans },
      { id: "incomplete", label: "Stopped before fully factoring", rule: (ans) => ans }
    ]
  },
  "find_gcf": {
    name: "Greatest Common Factor",
    prereqs: ["prime_factorization", "fraction_simplify"],
    baseElo: 980,
    misconceptions: [
      { id: "gave_lcm", label: "Reported the least common multiple instead of the greatest common factor", rule: (ans, p) => p.lcm },
      { id: "gave_number", label: "Reported one of the original numbers", rule: (ans, p) => p.num }
    ]
  },
  "find_lcm": {
    name: "Least Common Multiple",
    prereqs: ["prime_factorization"],
    baseElo: 1020,
    misconceptions: [
      { id: "gave_product", label: "Multiplied the numbers without dividing by their GCF", rule: (ans, p) => p.prod },
      { id: "gave_gcf", label: "Reported the greatest common factor instead of the multiple", rule: (ans, p) => p.gcf }
    ]
  },
  "gcf_word": {
    name: "GCF Word Problems",
    prereqs: ["find_gcf"],
    baseElo: 1060,
    misconceptions: [
      { id: "gave_lcm", label: "Used the LCM instead of the GCF for an equal-grouping problem", rule: (ans, p) => p.lcm },
      { id: "gave_total", label: "Reported the total instead of the number of groups", rule: (ans, p) => p.total }
    ]
  },
  "lcm_word": {
    name: "LCM Word Problems",
    prereqs: ["find_lcm"],
    baseElo: 1100,
    misconceptions: [
      { id: "forgot_to_reduce", label: "Multiplied the two intervals instead of taking the least common multiple", rule: (ans, p) => p.prod },
      { id: "added", label: "Added the two intervals", rule: (ans, p) => p.sum }
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
  absolute_value: "6.NS.C.7c",
  integer_add: "7.NS.A.1",
  integer_sub: "7.NS.A.1",
  integer_mult: "7.NS.A.2",
  decimal_add: "5.NBT.B.7",
  decimal_sub: "5.NBT.B.7",
  decimal_mult: "5.NBT.B.7",
  decimal_round: "5.NBT.A.4",
  decimal_div: "6.NS.B.3",
  fraction_simplify: "4.NF.A.1",
  fraction_add: "5.NF.A.1",
  fraction_sub: "5.NF.A.1",
  fraction_mult: "5.NF.B.4",
  fraction_div: "6.NS.A.1",
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
  stat_mode: "6.SP.B.5c",
  stat_mean: "6.SP.B.5c",
  stat_median: "6.SP.B.5c",
  stat_range: "6.SP.B.5c",
  stat_probability: "7.SP.C.5",
  eval_expression: "6.EE.A.2c",
  eval_two_var: "6.EE.A.2c",
  combine_like_terms: "7.EE.A.1",
  distribute: "6.EE.A.3",
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
  square_root: "8.EE.A.2",
  exponent_product_rule: "8.EE.A.1",
  exponent_quotient_rule: "8.EE.A.1",
  exponent_zero_negative: "8.EE.A.1",
  scientific_notation: "8.EE.A.3",
  point_on_line: "8.F.A.1",
  slope_from_points: "8.EE.B.6",
  slope_intercept_id: "8.F.A.3",
  midpoint: "G-GPE.B.6",
  distance_formula: "8.G.B.8",
  inequality_one_step_add: "6.EE.B.8",
  inequality_one_step_mult: "7.EE.B.4b",
  inequality_flip_negative: "7.EE.B.4b",
  inequality_two_step: "7.EE.B.4b",
  inequality_compound: "HSA-REI.B.3",
  geo_volume_rect: "6.G.A.2",
  geo_surface_area_rect: "6.G.A.4",
  geo_circumference: "7.G.B.4",
  geo_volume_cylinder: "8.G.C.9",
  linear_variable_both_sides: "8.EE.C.7b",
  linear_system: "8.EE.C.8b",
  foil_binomials: "HSA-APR.A.1",
  square_binomial: "HSA-APR.A.1",
  factor_trinomial: "HSA-SSE.B.3a",
  unit_convert_metric: "5.MD.A.1",
  unit_convert_time: "4.MD.A.1",
  unit_rate: "6.RP.A.2",
  proportion_solve: "7.RP.A.2c",
  integer_div: "7.NS.A.2b",
  integer_ops: "7.NS.A.3",
  mixed_number: "4.NF.B.3c",
  fraction_compare: "4.NF.A.2",
  compound_probability: "7.SP.C.8",
  percent_decimal_convert: "6.RP.A.3c",
  decimal_compare: "5.NBT.A.3b",
  fraction_decimal_convert: "7.NS.A.2d",
  cube_root: "8.EE.A.2",
  exponent_power_rule: "8.EE.A.1",
  geo_composite: "7.G.B.6",
  mean_missing_value: "6.SP.B.5c",
  integer_compare: "6.NS.C.7a",
  translate_expression: "6.EE.A.2a",
  geo_angles_lines: "7.G.B.5",
  percent_discount: "7.RP.A.3",
  simple_interest: "7.RP.A.3",
  multi_step_word: "4.OA.A.3",
  function_evaluate: "8.F.A.1",
  function_table: "8.F.A.1",
  rate_of_change: "8.F.B.4",
  function_initial: "8.F.B.4",
  function_solve: "HSF-IF.A.2",
  probability_complement: "7.SP.C.5",
  coord_reflect: "8.G.A.3",
  coord_translate: "8.G.A.3",
  percent_markup: "7.RP.A.3",
  percent_error: "7.RP.A.3",
  limit: "Calculus — Limits at Infinity (AP/IB)",
  divisor_count: "Number Theory — Divisor Function",
  fraction_negative: "7.NS.A.1",
  prob_without_replacement: "7.SP.C.8",
  geo_area_parallelogram: "6.G.A.1",
  geo_area_trapezoid: "6.G.A.1",
  exponent_power_of_product: "8.EE.A.1",
  arithmetic_next_term: "4.OA.C.5",
  arithmetic_common_difference: "HSF-LE.A.2",
  arithmetic_nth_term: "HSF-BF.A.2",
  geometric_next_term: "HSF-IF.A.3",
  geometric_common_ratio: "HSF-BF.A.2",
  stat_quartile: "6.SP.B.5c",
  stat_iqr: "6.SP.B.5c",
  stat_mad: "6.SP.B.5c",
  coord_rotate_180: "8.G.A.3",
  coord_rotate_90: "8.G.A.3",
  coord_dilate: "8.G.A.4",
  geo_volume_cone: "8.G.C.9",
  geo_volume_sphere: "8.G.C.9",
  geo_volume_pyramid: "HSG-GMD.A.3",
  geo_surface_cylinder: "7.G.B.6",
  geo_surface_sphere: "HSG-GMD.A.1",
  geo_surface_cone: "HSG-GMD.A.1",
  eqn_onestep_div: "6.EE.B.7",
  eqn_fraction_coeff: "7.EE.B.4a",
  eqn_clear_denom: "7.EE.B.4a",
  eqn_proportion: "7.RP.A.2c",
  eqn_two_step_fraction: "7.EE.B.4a",
  ratio_simplify: "6.RP.A.1",
  ratio_share: "6.RP.A.3",
  unit_price: "6.RP.A.2",
  speed_dist_time: "7.RP.A.1",
  scale_factor: "7.G.A.1",
  geometric_nth_term: "HSF-BF.A.2",
  arithmetic_series: "HSF-BF.A.2",
  fibonacci_next: "HSF-IF.A.3",
  prime_factorization: "4.OA.B.4",
  find_gcf: "6.NS.B.4",
  find_lcm: "6.NS.B.4",
  gcf_word: "6.NS.B.4",
  lcm_word: "6.NS.B.4",
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
