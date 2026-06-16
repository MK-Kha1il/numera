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
  const entry = conceptId && WORKED_EXAMPLES[conceptId];
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
