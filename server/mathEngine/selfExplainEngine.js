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

  // ---- Integers & absolute value ----
  absolute_value: {
    question: 'Why is the absolute value of a negative number positive?',
    correct: 'Absolute value measures distance from zero, and a distance is never negative.',
    distractors: [
      'Because the bars always flip the sign of whatever is inside them.',
      'Because negative numbers become positive whenever you simplify.',
      'Because the minus sign is only decoration and can be ignored.',
    ],
  },
  integer_add: {
    question: 'When you add two integers with different signs, why do you subtract their sizes?',
    correct: 'Opposite signs pull in opposite directions, so part of each cancels and only the difference remains.',
    distractors: [
      'Because subtraction is just easier than adding signed numbers.',
      'Because the negative number always removes the whole positive number.',
      'Because you always subtract when any negative sign appears anywhere.',
    ],
  },
  integer_mult: {
    question: 'Why is a negative times a negative positive?',
    correct: 'Multiplying by a negative reverses direction, and reversing a reversal points you positive again.',
    distractors: [
      'Because two minus signs simply erase each other by convention.',
      'Because the product of big numbers has to come out positive.',
      'Because negatives only matter in addition, not multiplication.',
    ],
  },

  // ---- Decimals ----
  decimal_add: {
    question: 'Why must the decimal points line up before you add?',
    correct: 'Lining up the points aligns tenths with tenths and ones with ones, so you only combine like place values.',
    distractors: [
      'Because the answer must always have two decimal places.',
      'Because right-aligning the digits works for whole numbers, so it works here.',
      'Because the decimal point moves to the end once you start adding.',
    ],
  },
  decimal_sub: {
    question: 'Why can you write extra zeros after the last decimal digit before subtracting?',
    correct: 'Trailing zeros add empty place values without changing the number, so both numbers get the same number of columns.',
    distractors: [
      'Because longer decimals are always more precise and therefore more correct.',
      'Because you must make the two numbers look identical before subtracting.',
      'Because zeros at the end round the number to the nearest tenth.',
    ],
  },
  decimal_mult: {
    question: 'Why do you count decimal places to position the point in the product?',
    correct: 'Each factor is a whole number divided by a power of ten, so the product is divided by ten once for every decimal place.',
    distractors: [
      'Because the product keeps the decimal places of the longer factor.',
      'Because the decimal point always moves one place to the left in a product.',
      'Because counting places is a shortcut with no mathematical reason behind it.',
    ],
  },
  decimal_round: {
    question: 'Why do you look at the digit just after the rounding place?',
    correct: 'That next digit tells you which of the two neighbouring values your number is closer to.',
    distractors: [
      'Because the digit after the rounding place is always dropped and ignored.',
      'Because rounding means cutting the number off at the chosen place.',
      'Because the last digit of a number decides whether it is big or small.',
    ],
  },
  decimal_div: {
    question: 'Why can you shift both decimal points before dividing?',
    correct: 'Multiplying dividend and divisor by the same power of ten keeps their quotient unchanged.',
    distractors: [
      'Because division only works when both numbers are whole.',
      'Because shifting the points makes the answer ten times more accurate.',
      'Because the divisor must always be larger than the dividend.',
    ],
  },

  // ---- Fractions, integers, percents ----
  fraction_simplify: {
    question: 'Why does dividing the top and bottom by the same number keep the fraction equal?',
    correct: 'You are removing the same shared factor from both counts, so the proportion between part and whole is unchanged.',
    distractors: [
      'Because smaller numbers are always mathematically preferred.',
      'Because dividing the top makes the fraction smaller and dividing the bottom balances it back by luck.',
      'Because the fraction bar means the two numbers are independent of each other.',
    ],
  },
  fraction_sub: {
    question: 'Why do the denominators have to match before you subtract fractions?',
    correct: 'Subtraction removes pieces from a count, and the count only makes sense when the pieces are the same size.',
    distractors: [
      'Because the answer must keep the smaller of the two denominators.',
      'Because subtraction works top-minus-top and bottom-minus-bottom.',
      'Because matching denominators makes the numerators equal too.',
    ],
  },
  fraction_div: {
    question: 'Why does dividing by a fraction become multiplying by its reciprocal?',
    correct: 'Dividing asks how many of that piece fit inside, and smaller pieces fit in more times — the reciprocal counts that.',
    distractors: [
      'Because flipping the second fraction is a rule invented to avoid division.',
      'Because division and multiplication are the same operation for fractions.',
      'Because you flip whichever fraction is smaller before multiplying.',
    ],
  },
  fraction_of: {
    question: 'Why does "a fraction OF a number" mean multiplication?',
    correct: 'Taking a part of an amount scales it: the denominator splits the amount into equal shares and the numerator counts the shares you take.',
    distractors: [
      'Because "of" always signals division by the denominator only.',
      'Because a fraction of a number must be smaller, and multiplying shrinks things.',
      'Because you add the fraction to the number and then simplify.',
    ],
  },
  ratio_solve: {
    question: 'Why do you multiply both parts of a ratio by the same factor to scale it?',
    correct: 'A ratio is a fixed relationship, so both quantities must grow in the same proportion for the relationship to survive.',
    distractors: [
      'Because adding the same amount to both parts keeps them in step.',
      'Because only the larger quantity actually needs to be scaled.',
      'Because the two parts of a ratio are unrelated, so anything works.',
    ],
  },
  exponent_power: {
    question: 'Why is $2^4$ equal to $2 \\times 2 \\times 2 \\times 2$ and not $2 \\times 4$?',
    correct: 'The exponent counts how many copies of the base are multiplied together, not what the base is multiplied by.',
    distractors: [
      'Because the exponent is just another factor written higher up.',
      'Because powers are a shorthand for adding the base to itself.',
      'Because the base and exponent can be swapped without changing the value.',
    ],
  },

  // ---- Geometry ----
  geo_perimeter_rect: {
    question: 'Why does the perimeter of a rectangle double the sum of length and width?',
    correct: 'Walking the boundary crosses two lengths and two widths, so each dimension is travelled twice.',
    distractors: [
      'Because doubling makes the answer bigger, and perimeters are big.',
      'Because area is length times width, so perimeter must be double it.',
      'Because a rectangle has four sides, so you multiply everything by four.',
    ],
  },
  geo_area_rect: {
    question: 'Why does length × width give the area of a rectangle?',
    correct: 'The rectangle tiles into rows of unit squares — width squares per row, one row per unit of length — and multiplying counts them all.',
    distractors: [
      'Because multiplying the sides is the definition, with nothing behind it.',
      'Because the two sides added together and doubled give the same value.',
      'Because area always uses the two largest measurements available.',
    ],
  },
  geo_area_triangle: {
    question: 'Why does the area of a triangle include a factor of one half?',
    correct: 'A triangle with a given base and height is exactly half of the rectangle built on that base and height.',
    distractors: [
      'Because triangles have three sides, and three is half of six.',
      'Because the half compensates for the slanted side being shorter.',
      'Because all area formulas for pointed shapes include a half.',
    ],
  },
  geo_circle_area: {
    question: 'Why does the area of a circle use the radius squared?',
    correct: 'Area is two-dimensional, so it scales with a length times a length — about three of the r-by-r squares cover the circle.',
    distractors: [
      'Because squaring makes up for the circle having no corners.',
      'Because the radius is used twice: once for across and once for around.',
      'Because pi only works when it multiplies a squared number.',
    ],
  },

  // ---- Statistics ----
  stat_mode: {
    question: 'Why is the mode found by counting repetitions rather than computing?',
    correct: 'The mode reports the most typical value — the one that occurs most often — so frequency is the only thing that matters.',
    distractors: [
      'Because the mode is the largest value and needs no calculation.',
      'Because counting is a faster approximation of averaging.',
      'Because every data set has exactly one value that repeats.',
    ],
  },
  stat_mean: {
    question: 'Why does dividing the total by the count give a fair "typical" value?',
    correct: 'Dividing shares the whole total out equally, showing what each data point would be if they were all the same.',
    distractors: [
      'Because dividing always produces a value near the middle of any list.',
      'Because the count is the largest number involved, so you divide by it.',
      'Because the mean must be one of the values in the data set.',
    ],
  },

  // ---- Fractions, integers, percents (original set) ----
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
