// Worked-Example Engine — the highest-effect-size, lowest-cost scaffold for a struggling learner.
//
// The worked-example effect (Sweller & Cooper) is one of the best-evidenced findings in the
// learning sciences: novices learn a procedure far more efficiently by studying a fully worked
// solution than by floundering through unguided problem solving. The companion to this module is
// selfExplainEngine.js (deepens a CORRECT answer); worked examples support a WRONG one — at the
// moment of struggle we offer a complete, step-by-step model of the *method*.
//
// Crucially the worked example is a DIFFERENT canonical instance than the learner's live problem
// (its own numbers, fully solved). It therefore never leaks the live answer — it teaches the
// technique, which the learner then applies to their own problem. This worked-example→problem
// pairing is exactly the structure the research recommends.
//
// "Fading" is realized on the client: the steps are revealed one at a time (predict-then-reveal),
// matching the app's predict-before-verify stance, so a confident learner can anticipate each next
// step rather than passively read the whole solution.
//
// This module is pure (no DB / IO) and mirrors selfExplainEngine's contract: it emits a JSON
// STRING attached to the generated problem (see workedExampleJson in mathGenerator + Models.kt).
// Concepts WITHOUT an authored example return '' so the client shows nothing — we only ever
// surface a vetted example, and coverage grows concept-by-concept exactly like the lessons did.
//
// LaTeX in the `math`/`problem` fields uses double backslashes (JS string escaping); a single
// "\f"/"\p" would be a silent control-char/escape bug (the same fingerprint guarded below).

// Authored worked examples, keyed by conceptId. Each entry:
//   problem: the example's own problem statement (a clean instance, NOT the live one).
//   steps:   ordered [{ action, math, why }] — action = what to do, math = the line after doing it,
//            why = the one-line reason. The final step's math states the example's answer.
// Keep steps short (3–5) and each `why` to a single sentence.
const WORKED_EXAMPLES = {
  // ---- Foundational arithmetic & expressions ----
  eval_expression: {
    problem: 'Evaluate $3x + 5$ when $x = 4$.',
    steps: [
      { action: 'Substitute the value for the variable', math: '3 \\times 4 + 5', why: 'The variable is a placeholder, so it becomes its value first.' },
      { action: 'Do the multiplication', math: '12 + 5', why: 'Multiplication comes before addition by order of operations.' },
      { action: 'Add', math: '17', why: 'Only the loose addition is left.' },
    ],
  },
  pemdas: {
    problem: 'Simplify $6 + 2 \\times 5$.',
    steps: [
      { action: 'Find the highest-priority operation', math: '2 \\times 5 = 10', why: 'Multiplication is resolved before the addition around it.' },
      { action: 'Rewrite with that result', math: '6 + 10', why: 'Replace the product so only addition remains.' },
      { action: 'Add', math: '16', why: 'The final loose addition gives the answer.' },
    ],
  },
  distribute: {
    problem: 'Expand $3(x + 4)$.',
    steps: [
      { action: 'Multiply the outside factor by the first term', math: '3 \\times x = 3x', why: 'Each term inside is scaled by the factor.' },
      { action: 'Multiply it by the second term', math: '3 \\times 4 = 12', why: 'Every part of the sum is scaled equally.' },
      { action: 'Write the sum of both products', math: '3x + 12', why: 'Distribution turns the product into a sum of terms.' },
    ],
  },
  combine_like_terms: {
    problem: 'Simplify $4x + 7 + 2x$.',
    steps: [
      { action: 'Group the like terms', math: '(4x + 2x) + 7', why: 'Only terms with the same variable part count the same thing.' },
      { action: 'Add the coefficients of the x-terms', math: '6x + 7', why: 'The variable part stays; only its counts combine.' },
      { action: 'Leave the constant as is', math: '6x + 7', why: 'A plain number is not like an x-term, so it cannot merge.' },
    ],
  },

  // ---- Integers ----
  integer_add: {
    problem: 'Compute $-8 + 5$.',
    steps: [
      { action: 'Compare the signs', math: '-8 \\text{ and } +5 \\text{ pull opposite ways}', why: 'Opposite signs mean part of each amount cancels.' },
      { action: 'Subtract the sizes', math: '8 - 5 = 3', why: 'Only the difference survives the cancelling.' },
      { action: 'Keep the sign of the larger size', math: '-3', why: 'The 8 outweighs the 5, so the result stays negative.' },
    ],
  },
  integer_mult: {
    problem: 'Compute $(-3) \\times (-6)$.',
    steps: [
      { action: 'Multiply the sizes', math: '3 \\times 6 = 18', why: 'The magnitude of a product ignores the signs.' },
      { action: 'Apply the sign rule', math: '(-) \\times (-) = (+)', why: 'Multiplying by a negative reverses direction; reversing twice points positive.' },
      { action: 'Write the signed result', math: '18', why: 'Same signs give a positive product.' },
    ],
  },

  // ---- Decimals ----
  decimal_add: {
    problem: 'Add $3.7 + 1.25$.',
    steps: [
      { action: 'Line up the decimal points', math: '3.70 + 1.25', why: 'Aligning the points matches tenths with tenths — a trailing zero fills the empty place.' },
      { action: 'Add column by column', math: '3.70 + 1.25 = 4.95', why: 'Only like place values combine.' },
      { action: 'Keep the point in the same column', math: '4.95', why: 'The decimal point of the sum sits directly below the aligned points.' },
    ],
  },
  decimal_sub: {
    problem: 'Compute $5.2 - 2.85$.',
    steps: [
      { action: 'Give both numbers the same places', math: '5.20 - 2.85', why: 'A trailing zero adds an empty place without changing the value.' },
      { action: 'Subtract with borrowing', math: '5.20 - 2.85 = 2.35', why: 'Borrowing works across the decimal point just like in whole numbers.' },
    ],
  },
  decimal_mult: {
    problem: 'Multiply $0.6 \\times 0.15$.',
    steps: [
      { action: 'Multiply as whole numbers', math: '6 \\times 15 = 90', why: 'Ignore the points first; handle size at the end.' },
      { action: 'Count the decimal places', math: '1 + 2 = 3 \\text{ places}', why: 'Each factor contributes its own places to the product.' },
      { action: 'Place the point', math: '0.090 = 0.09', why: 'Move the point three places left in 90.' },
    ],
  },
  decimal_div: {
    problem: 'Divide $4.8 \\div 0.4$.',
    steps: [
      { action: 'Shift both points to make the divisor whole', math: '48 \\div 4', why: 'Multiplying both numbers by 10 leaves the quotient unchanged.' },
      { action: 'Divide', math: '48 \\div 4 = 12', why: 'Now it is ordinary whole-number division.' },
    ],
  },

  // ---- Fractions (operations beyond add/mult) ----
  fraction_simplify: {
    problem: 'Simplify $\\frac{18}{24}$.',
    steps: [
      { action: 'Find the greatest shared factor', math: '\\gcd(18, 24) = 6', why: 'Both counts contain the factor 6, so it can be removed from each.' },
      { action: 'Divide top and bottom by it', math: '\\frac{18 \\div 6}{24 \\div 6}', why: 'Removing the same factor from part and whole keeps the proportion.' },
      { action: 'Write the simplest form', math: '\\frac{3}{4}', why: '3 and 4 share no factor, so this cannot reduce further.' },
    ],
  },
  fraction_sub: {
    problem: 'Subtract $\\frac{5}{6} - \\frac{1}{4}$.',
    steps: [
      { action: 'Find a common denominator', math: '\\text{LCD of } 6 \\text{ and } 4 = 12', why: 'Pieces must be the same size before they can be removed.' },
      { action: 'Rewrite both fractions', math: '\\frac{10}{12} - \\frac{3}{12}', why: 'Scale numerator and denominator together so each value is unchanged.' },
      { action: 'Subtract the numerators', math: '\\frac{7}{12}', why: 'With equal pieces you just subtract the counts.' },
    ],
  },
  fraction_div: {
    problem: 'Divide $\\frac{3}{4} \\div \\frac{1}{8}$.',
    steps: [
      { action: 'Ask what the division means', math: '\\text{how many } \\tfrac{1}{8} \\text{ fit in } \\tfrac{3}{4}?', why: 'Division counts how many of the second piece fit inside the first.' },
      { action: 'Multiply by the reciprocal of the divisor', math: '\\frac{3}{4} \\times \\frac{8}{1}', why: 'Smaller pieces fit in more times — the flip counts that.' },
      { action: 'Multiply across and simplify', math: '\\frac{24}{4} = 6', why: 'Six eighths-pieces fill three quarters exactly.' },
    ],
  },
  fraction_of: {
    problem: 'Find $\\frac{2}{5}$ of $30$.',
    steps: [
      { action: 'Split the amount into equal shares', math: '30 \\div 5 = 6', why: 'The denominator says how many equal shares the whole splits into.' },
      { action: 'Take the shares you need', math: '2 \\times 6 = 12', why: 'The numerator counts how many of those shares you take.' },
    ],
  },

  // ---- Ratios & exponents ----
  ratio_solve: {
    problem: 'Juice uses syrup and water in the ratio $2 : 5$. How much water goes with $6$ cups of syrup?',
    steps: [
      { action: 'Find the scale factor', math: '6 \\div 2 = 3', why: 'The real syrup amount is 3 times the ratio amount.' },
      { action: 'Scale the other part the same way', math: '5 \\times 3 = 15', why: 'Both parts must grow by the same factor to keep the relationship.' },
    ],
  },
  exponent_power: {
    problem: 'Evaluate $3^4$.',
    steps: [
      { action: 'Read the exponent as a count of copies', math: '3 \\times 3 \\times 3 \\times 3', why: 'The exponent counts the copies of the base being multiplied — it is not a factor.' },
      { action: 'Multiply step by step', math: '9 \\times 3 = 27,\\ 27 \\times 3 = 81', why: 'Work left to right, one factor at a time.' },
      { action: 'State the power', math: '81', why: 'Four copies of 3 multiply to 81.' },
    ],
  },

  // ---- Geometry ----
  geo_perimeter_rect: {
    problem: 'Find the perimeter of a rectangle with length $7$ and width $4$.',
    steps: [
      { action: 'Add one length and one width', math: '7 + 4 = 11', why: 'That covers one trip along half the boundary.' },
      { action: 'Double it', math: '2 \\times 11 = 22', why: 'Walking all the way around crosses each dimension twice.' },
    ],
  },
  geo_area_rect: {
    problem: 'Find the area of a rectangle with length $8$ and width $5$.',
    steps: [
      { action: 'Picture rows of unit squares', math: '5 \\text{ squares per row}, 8 \\text{ rows}', why: 'Area counts the unit squares the shape covers.' },
      { action: 'Multiply rows by squares per row', math: '8 \\times 5 = 40', why: 'Multiplication counts the whole grid at once.' },
    ],
  },
  geo_area_triangle: {
    problem: 'Find the area of a triangle with base $10$ and height $6$.',
    steps: [
      { action: 'Build the rectangle on the same base and height', math: '10 \\times 6 = 60', why: 'The triangle sits inside this rectangle.' },
      { action: 'Take half of it', math: '60 \\div 2 = 30', why: 'A triangle is exactly half the rectangle on its base and height.' },
    ],
  },
  geo_circle_area: {
    problem: 'Find the area of a circle with radius $5$ (leave $\\pi$ in the answer).',
    steps: [
      { action: 'Square the radius', math: '5^2 = 25', why: 'Area is two-dimensional: it scales with radius × radius, not with the diameter.' },
      { action: 'Multiply by pi', math: '25\\pi', why: 'About three-and-a-bit of the r-by-r squares cover the circle.' },
    ],
  },

  // ---- Statistics ----
  stat_mean: {
    problem: 'Find the mean of $4, 7, 9, 12$.',
    steps: [
      { action: 'Add all the values', math: '4 + 7 + 9 + 12 = 32', why: 'The mean starts from the total of everything.' },
      { action: 'Divide by how many values there are', math: '32 \\div 4 = 8', why: 'Dividing shares the total out equally across the data points.' },
    ],
  },

  // ---- Fractions, integers, percents ----
  fraction_add: {
    problem: 'Add $\\frac{1}{4} + \\frac{1}{6}$.',
    steps: [
      { action: 'Find a common denominator', math: '\\text{LCD of }4\\text{ and }6 = 12', why: 'Only equal-sized pieces can be counted together.' },
      { action: 'Rewrite each fraction over 12', math: '\\frac{3}{12} + \\frac{2}{12}', why: 'Scale each fraction to the shared piece size.' },
      { action: 'Add the numerators', math: '\\frac{5}{12}', why: 'With equal denominators you just count the pieces.' },
    ],
  },
  fraction_mult: {
    problem: 'Multiply $\\frac{2}{3} \\times \\frac{4}{5}$.',
    steps: [
      { action: 'Multiply the numerators', math: '2 \\times 4 = 8', why: 'A fraction OF a fraction scales the parts.' },
      { action: 'Multiply the denominators', math: '3 \\times 5 = 15', why: 'It also scales the whole, so both lines multiply.' },
      { action: 'Write the product', math: '\\frac{8}{15}', why: 'No common factor to cancel, so this is simplest form.' },
    ],
  },
  integer_sub: {
    problem: 'Compute $6 - (-4)$.',
    steps: [
      { action: 'Rewrite subtracting a negative as adding', math: '6 + 4', why: 'Removing a debt adds value — subtract a negative means add its opposite.' },
      { action: 'Add', math: '10', why: 'Two positives combine to a larger result.' },
    ],
  },
  percentage_of: {
    problem: 'Find $25\\%$ of $80$.',
    steps: [
      { action: 'Convert the percent to a decimal', math: '25\\% = 0.25', why: 'Percent means "out of 100", so it must become that ratio first.' },
      { action: 'Multiply by the amount', math: '0.25 \\times 80', why: 'Taking a percent OF a number scales it by that ratio.' },
      { action: 'Compute', math: '20', why: 'The scaled amount is the answer.' },
    ],
  },

  // ---- Graphing ----
  slope_from_points: {
    problem: 'Find the slope through $(1, 2)$ and $(4, 8)$.',
    steps: [
      { action: 'Subtract the y-values (rise)', math: '8 - 2 = 6', why: 'Slope measures vertical change between the points.' },
      { action: 'Subtract the x-values (run)', math: '4 - 1 = 3', why: 'It measures that change per unit of horizontal travel.' },
      { action: 'Divide rise by run', math: '\\frac{6}{3} = 2', why: 'Slope is the ratio of rise to run.' },
    ],
  },

  // ---- Equations strand ----
  eqn_onestep_div: {
    problem: 'Solve $\\frac{x}{3} = 5$.',
    steps: [
      { action: 'Identify the operation on x', math: 'x \\div 3', why: 'x is being divided by 3, so we must undo that.' },
      { action: 'Multiply both sides by 3', math: '\\frac{x}{3} \\times 3 = 5 \\times 3', why: 'Multiplying undoes the division attached to x.' },
      { action: 'Simplify', math: 'x = 15', why: 'x is now isolated.' },
    ],
  },
  eqn_two_step_fraction: {
    problem: 'Solve $\\frac{x}{2} - 3 = 4$.',
    steps: [
      { action: 'Add the constant to both sides', math: '\\frac{x}{2} = 7', why: 'Undo operations in reverse order — clear the subtraction first.' },
      { action: 'Multiply both sides by the denominator', math: 'x = 7 \\times 2', why: 'Now undo the division to free x.' },
      { action: 'Simplify', math: 'x = 14', why: 'x stands alone, so this is the solution.' },
    ],
  },

  // ---- Factors & multiples ----
  find_gcf: {
    problem: 'Find the GCF of $12$ and $18$.',
    steps: [
      { action: 'Prime-factor each number', math: '12 = 2^2 \\times 3,\\ \\ 18 = 2 \\times 3^2', why: 'A common factor can only be built from shared primes.' },
      { action: 'Take the primes both share, to the lower power', math: '2^1 \\times 3^1', why: 'Each shared prime is limited by the number that has fewer of it.' },
      { action: 'Multiply', math: '6', why: 'The product of the shared primes is the greatest common factor.' },
    ],
  },
};

// Control-char guard (same LaTeX-corruption fingerprint as the generation/lesson/self-explain sweeps).
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

// Build the worked example for a concept as a JSON STRING, or '' when the concept has no authored
// example (the client renders nothing in that case).
//
// Shape: { problem, steps: [{ action, math, why }] }
function buildWorkedExampleJson(conceptId) {
  // Hand-authored example first; otherwise re-shape the concept's authored worked example into
  // faded steps (deriveActiveLearning.js). Required lazily to avoid a load-order cycle.
  const entry = (conceptId && WORKED_EXAMPLES[conceptId]) || require('./deriveActiveLearning').deriveWorkedExample(conceptId);
  if (!entry) return '';

  return JSON.stringify({
    problem: entry.problem,
    steps: entry.steps.map((s) => ({ action: s.action, math: s.math, why: s.why })),
  });
}

module.exports = {
  buildWorkedExampleJson,
  WORKED_EXAMPLES,
  hasControlChar,
};
