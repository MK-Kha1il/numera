// Self-Explanation Engine — turns a CORRECT answer into a deeper learning moment.
//
// The self-explanation effect (Chi et al.) is one of the highest-effect-size, lowest-cost
// interventions known: after a learner gets something right, asking them to articulate WHY it
// is right converts a lucky-or-procedural success into durable understanding. This is the
// complement to socraticEngine.js, which fires only on WRONG answers.
//
// For an authored concept we present a short multiple-choice "why is that right?" prompt: one
// option states the governing principle; the distractors are appealing-but-wrong rationales —
// circular reasoning ("because that's what you compute"), superficial pattern-matching, or a
// misconception dressed up as a justification. Picking the real reason is the skill.
//
// This module is pure (no DB / IO) and mirrors socraticEngine's contract: it emits a JSON
// STRING attached to the generated problem (see selfExplainJson in mathGenerator + Models.kt).
// Concepts WITHOUT an authored reason-set return '' so the client shows nothing — we only ever
// surface a vetted prompt, and coverage grows concept-by-concept exactly like the lessons did.

// Authored reason-sets, keyed by conceptId. correct = the genuine principle; distractors = wrong
// rationales for the (correct) answer. Keep options comparable in length so the right one isn't
// given away by being the longest. No option may contain the numeric answer.
const SELF_EXPLAIN = {
  // ---- Foundational arithmetic & expressions ----
  eval_expression: {
    question: 'Why do you substitute the value for the variable before doing the arithmetic?',
    correct: 'The variable is a placeholder, so it must become its value before the operations can run.',
    distractors: [
      'Because the variable is always equal to the first number in the expression.',
      'Because letters are simplified away before any numbers are used.',
      'Because you should add every number you see, then remove the letter.',
    ],
  },
  pemdas: {
    question: 'In $2 + 3 \\times 4$, why is the multiplication done before the addition?',
    correct: 'Multiplication is repeated addition, so it must be resolved before the loose addition around it.',
    distractors: [
      'Because you always work strictly left to right.',
      'Because the larger numbers should always be combined first.',
      'Because addition is the least important operation and is done last.',
    ],
  },
  distribute: {
    question: 'Why does $a(b + c)$ become $ab + ac$?',
    correct: 'The factor outside multiplies every term inside, since each part of the sum is scaled equally.',
    distractors: [
      'Because you only need to multiply the outside number by the first term.',
      'Because the parentheses mean you add the numbers before multiplying.',
      'Because multiplication and addition can be done in any order you like.',
    ],
  },
  combine_like_terms: {
    question: 'Why can you combine $3x$ and $5x$ but not $3x$ and $5$?',
    correct: 'Only terms with the same variable part count the same kind of thing, so only they can be added.',
    distractors: [
      'Because you can add any two numbers that appear next to each other.',
      'Because the variable disappears once you add the coefficients.',
      'Because $x$ always stands for $1$, so every term is really just a number.',
    ],
  },

  // ---- Fractions, integers, percents ----
  fraction_add: {
    question: 'Why must the fractions share a common denominator before you add them?',
    correct: 'The denominator sets the size of each piece, and only equal-sized pieces can be counted together.',
    distractors: [
      'Because the new denominator is found by adding the two denominators.',
      'Because the larger denominator is always the correct one to keep.',
      'Because fractions can only be added when their numerators already match.',
    ],
  },
  fraction_mult: {
    question: 'Why do you multiply the numerators and the denominators straight across?',
    correct: 'Taking a fraction OF a fraction scales both the parts and the whole, so both lines multiply.',
    distractors: [
      'Because you need a common denominator first, just like adding.',
      'Because only the numerators multiply and the denominator stays the same.',
      'Because multiplying fractions always gives a bigger result.',
    ],
  },
  integer_sub: {
    question: 'Why does subtracting a negative, like $5 - (-3)$, give a larger result?',
    correct: 'Removing a debt adds value, so subtracting a negative is the same as adding its opposite.',
    distractors: [
      'Because two negative signs are simply ignored.',
      'Because subtraction always makes a number smaller, so the sign flips to fix it.',
      'Because the larger number always keeps its own sign.',
    ],
  },
  percentage_of: {
    question: 'Why do you convert the percent to a fraction or decimal before multiplying?',
    correct: 'A percent means "out of 100", so it must be expressed as that ratio before it can scale the amount.',
    distractors: [
      'Because you should subtract the percent from the number instead.',
      'Because the percent sign means you divide the number by the percent.',
      'Because percents can be added directly to the amount.',
    ],
  },

  // ---- Graphing ----
  slope_from_points: {
    question: 'Why is slope the change in $y$ divided by the change in $x$?',
    correct: 'Slope measures how much the line rises per unit it runs, which is exactly that ratio.',
    distractors: [
      'Because you subtract the two points and that difference is the slope.',
      'Because slope is the larger coordinate divided by the smaller one.',
      'Because you always divide the first point by the second point.',
    ],
  },

  // ---- Equations strand ----
  eqn_onestep_div: {
    question: 'Why do you multiply both sides by the denominator to solve $\\frac{x}{a} = b$?',
    correct: 'Multiplying undoes the division attached to $x$, leaving $x$ by itself.',
    distractors: [
      'Because the answer to an equation is always bigger than the numbers shown.',
      'Because you repeat whatever operation already appears in the problem.',
      'Because multiplication is the easiest operation to perform.',
    ],
  },
  eqn_fraction_coeff: {
    question: 'Why do you multiply by the reciprocal to solve $\\frac{a}{b}x = c$?',
    correct: 'A number times its reciprocal is $1$, so it clears the fraction and leaves $x$ alone.',
    distractors: [
      'Because dividing by the numerator alone is enough to isolate $x$.',
      'Because flipping the fraction makes the answer a whole number.',
      'Because you should multiply both sides by the fraction itself, not its reciprocal.',
    ],
  },
  eqn_clear_denom: {
    question: 'Why do you multiply both sides by the denominator FIRST in $\\frac{x + c}{a} = d$?',
    correct: 'The fraction bar groups the whole numerator, so clearing it keeps $x + c$ together before you isolate $x$.',
    distractors: [
      'Because you should subtract $c$ before touching the denominator.',
      'Because the denominator only multiplies the $x$, not the whole top.',
      'Because fractions must be turned into decimals before solving.',
    ],
  },
  eqn_proportion: {
    question: 'Why does cross-multiplying solve $\\frac{a}{b} = \\frac{x}{d}$?',
    correct: 'Multiplying both sides by both denominators clears the fractions, giving one simple equation.',
    distractors: [
      'Because the answer is just the product of the two numbers across from each other.',
      'Because equal fractions must always have equal denominators.',
      'Because you add the diagonals instead of multiplying them.',
    ],
  },
  eqn_two_step_fraction: {
    question: 'Why do you add the constant back before multiplying by the denominator in $\\frac{x}{a} - c = d$?',
    correct: 'You undo operations in reverse order, so the subtraction is cleared before the division.',
    distractors: [
      'Because multiplication should always be done first in any equation.',
      'Because the constant and the fraction can be combined into one number.',
      'Because the order of the steps never affects the final answer.',
    ],
  },

  // ---- Factors & multiples ----
  find_gcf: {
    question: 'Why is the GCF the product of the primes the two numbers share?',
    correct: 'A common factor can only be built from primes both numbers contain, so the shared primes give the greatest one.',
    distractors: [
      'Because the GCF is the larger of the two numbers.',
      'Because you multiply the two numbers together to get their common factor.',
      'Because the GCF is always the smallest prime that appears in either number.',
    ],
  },
};

// Control-char guard (same LaTeX-corruption fingerprint as the generation/lesson sweeps).
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

// Build the self-explanation package for a concept as a JSON STRING, or '' when the concept has
// no authored reason-set (the client renders nothing in that case).
//
// Shape: { question, options: [{ text, correct }], explanation }
// Exactly one option has correct=true. Options are shuffled so the answer isn't always first.
function buildSelfExplainJson(conceptId) {
  // Hand-authored reason-set first; otherwise derive one from the concept's authored principle
  // + a real misconception (deriveActiveLearning.js). Required lazily to avoid a load-order cycle.
  const entry = (conceptId && SELF_EXPLAIN[conceptId]) || require('./deriveActiveLearning').deriveSelfExplain(conceptId);
  if (!entry) return '';

  const options = [
    { text: entry.correct, correct: true },
    ...entry.distractors.map((d) => ({ text: d, correct: false })),
  ];
  // Fisher–Yates shuffle (mirrors the MCQ option shuffle in mathGenerator).
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return JSON.stringify({
    question: entry.question || 'Which statement best explains why that answer is correct?',
    options,
    explanation: entry.explanation || entry.correct,
  });
}

module.exports = {
  buildSelfExplainJson,
  SELF_EXPLAIN,
  hasControlChar,
};
