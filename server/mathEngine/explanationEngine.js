// Elite Tutoring & Dynamic Explanation Engine
const { concepts } = require('./knowledgeGraph');

// Per-concept tutor insights keyed by conceptId
const TUTOR_INSIGHTS = {
  pythagorean:      "If side lengths are scaled values of primitive triples (3,4,5 or 5,12,13), multiply the scale factor directly instead of squaring large integers.",
  linear_two_step:  "Work backwards — undo addition/subtraction first, then divide by the coefficient. Never divide before clearing constants.",
  modular_arithmetic: "Reduce the base modulo $m$ before applying powers. This keeps numbers small and avoids heavy long division.",
  quadratic:        "Check the discriminant $b^2 - 4ac$ first. If it's negative, there are no real roots. Always verify both solutions.",
  derivative:       "Power rule: bring the exponent down as a coefficient, then reduce the exponent by 1. Works term by term.",
  integral:         "Reverse the power rule: raise the exponent by 1, divide by the new exponent. Don't forget to add $+C$ for indefinite integrals.",
  combinations:     "Order does NOT matter for combinations. Divide permutations by $k!$ to remove the ordering count.",
  permutations:     "Order DOES matter. Count positions from left to right, reducing choices by 1 each time.",
  matrix_determinant: "Determinant = (top-left × bottom-right) − (top-right × bottom-left). Remember the subtraction — not addition.",
  gcd_lcm:          "Use the Euclidean algorithm: repeatedly replace the larger number with the remainder until you reach 0.",
  totient:          "For a prime $p$: $\\phi(p) = p-1$. For $n = p \\cdot q$ (both prime): $\\phi(n) = (p-1)(q-1)$."
};

// Per-concept simplified explanations
const SIMPLIFIED = {
  arithmetic_add:    "Add the numbers. Start with the ones column, carry when needed.",
  arithmetic_sub:    "Subtract the smaller from the larger. Borrow from the next column when needed.",
  arithmetic_mult:   "Multiply: repeated addition of the same value.",
  arithmetic_div:    "Divide: split the total into equal groups.",
  pemdas:            "Solve: Parentheses → Exponents → Multiply/Divide (left to right) → Add/Subtract.",
  pythagorean:       "Square both legs, add them, then take the square root to get the hypotenuse.",
  linear_one_step:   "Undo the operation on $x$ — the opposite operation on both sides.",
  linear_two_step:   "Undo addition/subtraction first, then undo multiplication/division.",
  quadratic:         "Use the quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$",
  derivative:        "Power rule: $\\frac{d}{dx}[x^n] = n x^{n-1}$",
  integral:          "Reverse power rule: $\\int x^n dx = \\frac{x^{n+1}}{n+1} + C$",
  combinations:      "$\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$",
  permutations:      "$P(n,k) = \\frac{n!}{(n-k)!}$",
  matrix_determinant:"$\\det\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix} = ad - bc$",
  gcd_lcm:           "GCD: Euclidean algorithm. LCM: $\\text{lcm}(a,b) = \\frac{a \\cdot b}{\\gcd(a,b)}$",
  modular_arithmetic:"$a \\mod m$ = the remainder when $a$ is divided by $m$.",
  totient:           "$\\phi(p) = p - 1$ for prime $p$; $\\phi(pq) = (p-1)(q-1)$"
};

// Per-concept solution step labels
const SOLUTION_PATHS = {
  linear_two_step:   ["Identify coefficient and constant", "Move constant to RHS", "Divide both sides by coefficient"],
  quadratic:         ["Write in standard form $ax^2+bx+c=0$", "Compute discriminant $b^2-4ac$", "Apply quadratic formula", "Simplify both roots"],
  derivative:        ["Identify each term's coefficient and exponent", "Apply power rule term by term", "Evaluate at the given point"],
  integral:          ["Identify the integrand", "Raise exponent by 1; divide by new exponent", "Apply bounds (FTC: $F(b)-F(a)$)"],
  combinations:      ["Write $n$ and $k$", "Compute $n!$, $k!$, $(n-k)!$", "Divide: $\\frac{n!}{k!(n-k)!}$"],
  matrix_determinant:["Label entries $a, b, c, d$", "Multiply diagonals: $ad$ and $bc$", "Subtract: $ad - bc$"],
  gcd_lcm:           ["Divide larger by smaller, find remainder", "Replace larger with remainder", "Repeat until remainder = 0", "Last non-zero remainder = GCD"]
};

function constructPersonalizedExplanation(conceptId, baseExplanation, userAnalytics = {}) {
  let text = baseExplanation;
  const concept = concepts[conceptId];
  if (!concept) return text;

  const hesitation  = userAnalytics.hesitation_index || userAnalytics.avg_response_ms / 10000 || 0;
  const successRate = userAnalytics.success_rate !== undefined ? userAnalytics.success_rate
                    : userAnalytics.accuracy_rate !== undefined ? userAnalytics.accuracy_rate : 1.0;

  if (hesitation > 1.5 || successRate < 0.7) {
    const tip = TUTOR_INSIGHTS[conceptId]
      || `Applying the inverse operation is the fastest route to isolate variables or solve for the unknown.`;
    text = `\n\n💡 **Tutor Insight**: ${tip}\n\n` + text;
  }

  if (successRate < 0.6 && concept.misconceptions && concept.misconceptions.length > 0) {
    const m = concept.misconceptions[0];
    text += `\n\n⚠️ **Common Pitfall**: Watch out for the **${m.label}**. Double-check signs and operation order.`;
  }

  return text;
}

// Full structured explanation object — consumed by enrichProblem and API responses
function buildStructuredExplanation(conceptId, baseExplanation, userAnalytics = {}, activeMisconceptions = []) {
  const solution     = constructPersonalizedExplanation(conceptId, baseExplanation, userAnalytics);
  const simplified   = SIMPLIFIED[conceptId] || null;
  const solutionPath = SOLUTION_PATHS[conceptId] || null;
  const tip          = TUTOR_INSIGHTS[conceptId] || null;

  let misconceptionWarning = null;
  if (activeMisconceptions.length > 0) {
    const top = activeMisconceptions[0];
    misconceptionWarning = {
      type:    top.misconception_type,
      label:   top.misconception_label,
      severity: top.severity,
      warning: `⚠️ You've made the error "${top.misconception_label}" ${top.frequency} time${top.frequency > 1 ? 's' : ''} before. Watch this step carefully.`
    };
  }

  return { solution, simplified, solutionPath, tip, misconceptionWarning };
}

module.exports = {
  constructPersonalizedExplanation,
  buildStructuredExplanation,
  TUTOR_INSIGHTS,
  SIMPLIFIED,
  SOLUTION_PATHS
};
