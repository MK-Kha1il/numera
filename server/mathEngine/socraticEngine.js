// Socratic Feedback Engine — turns a wrong answer into a teaching moment.
//
// Instead of revealing "Correct: 5" the instant a learner slips, we ask a guiding
// QUESTION that helps them notice their own mistake (the probe), and keep a targeted
// nudge (the hint) one tap behind progressive disclosure. Neither the probe nor the
// hint ever states the final answer — that is what fading guidance + the worked
// "Review Solution" path are for.
//
// This module is pure (no DB / IO). It sits alongside misconceptionEngine.js and reuses
// its classifier: for each wrong MCQ option we identify the LIKELY misconception, then map
// that misconception id → an authored Socratic { probe, hint } template.

const { classifyMisconception } = require('./misconceptionEngine');
const { concepts } = require('./knowledgeGraph');
const { leaksAnswer } = require('./hintLadder');

// -----------------------------------------------------------------------------
// Authored Socratic templates, keyed by misconception id.
//
// Covers the GLOBAL_PATTERNS ids (sign_error, off_by_one, order_of_operations,
// fraction_addition, forgot_negative) and the foundational concept-specific ids
// from the knowledge graph (arithmetic_*, pemdas, pythagorean, linear_*). Advanced
// concepts fall through to the concept-generic fallback below.
//
// probe = a question that surfaces the slip. hint = a targeted nudge toward the
// method. RULE: neither may state the numeric answer.
// -----------------------------------------------------------------------------
const SOCRATIC_TEMPLATES = {
  // --- Global structural patterns ---
  off_by_one: {
    probe: 'Your answer is just one away from another value — did you count the very ' +
           'first (or very last) item, or skip one? Try recounting carefully.',
    hint:  'Watch the endpoints. "How many in total" is different from "how many in ' +
           'between" — list the items out one by one and see where the count starts and stops.'
  },
  sign_error: {
    probe: 'Your answer is the right size but maybe pointing the wrong way — should the ' +
           'result come out positive or negative here?',
    hint:  'Track the sign through every step. A negative times a negative turns positive, ' +
           'and subtracting a larger quantity flips the sign of the result.'
  },
  order_of_operations: {
    probe: 'Which operation did you carry out first? The order you tackle them changes the ' +
           'result — what does the order of operations say should come first?',
    hint:  'Multiplication and division are resolved before addition and subtraction. Find ' +
           'the × or ÷ and settle it before combining with the + or −.'
  },
  fraction_addition: {
    probe: 'When you add fractions, can you simply add the tops and add the bottoms? What ' +
           'has to be true about the denominators before you add?',
    hint:  'You need a common denominator first. The denominators do not add together — once ' +
           'they match, you add only the numerators.'
  },
  forgot_negative: {
    probe: 'Check the sign of your result — could it actually be negative? What happens to the ' +
           'sign in the very last step?',
    hint:  'Re-examine the final operation. If you subtracted a larger quantity or moved a ' +
           'negative term across the equals sign, the answer should keep its minus sign.'
  },

  // --- arithmetic_add ---
  off_by_ten: {
    probe: 'Your digits look right but the size is off by a power of ten — are the ones lined ' +
           'up under the ones and the tens under the tens?',
    hint:  'Stack the numbers by place value. A slip of exactly ten usually means a tens-column ' +
           'digit was combined into the wrong column.'
  },

  // --- arithmetic_sub ---
  wrong_borrow: {
    probe: 'When the top digit is smaller than the one beneath it, what do you have to do ' +
           'before you can subtract that column?',
    hint:  'You need to borrow from the next column. Borrowing turns the top digit into ' +
           'ten-plus-itself and drops the neighbour by one — recheck that step.'
  },
  inverse_op: {
    probe: 'Read the operation again — are you being asked to combine the two numbers, or to ' +
           'find the difference between them?',
    hint:  'This is a subtraction. Adding grows the result; here you want how much is left after ' +
           'taking one quantity away from the other.'
  },

  // --- arithmetic_mult ---
  add_instead_mult: {
    probe: 'Multiplication is a shortcut for repeated addition — how many times should one ' +
           'number be added to itself here, not just once?',
    hint:  'a × b means adding a to itself b times, not a + b. Picture b equal groups, each of ' +
           'size a, and total them.'
  },
  off_by_factor: {
    probe: 'Your answer is close to a neighbour in the times table — did you land on exactly ' +
           'the right multiple?',
    hint:  'Recheck the specific product. Being one row off in the multiplication table shifts ' +
           'the answer by one of the factors.'
  },

  // --- arithmetic_div ---
  remainder_ignore: {
    probe: 'Does the divisor go into the number a whole number of times, or is something left ' +
           'over? What should happen to that leftover?',
    hint:  'Do not round up automatically. Check whether the division comes out exactly, and if ' +
           'not, think about what the remainder really means here.'
  },
  mult_instead_div: {
    probe: 'Are you splitting the total into equal groups, or combining groups? Which operation ' +
           'undoes the other?',
    hint:  'Division is the inverse of multiplication. If you multiplied, the result grew — here ' +
           'you want to share the total out, so it should get smaller.'
  },

  // --- pemdas ---
  left_to_right: {
    probe: 'Did you work strictly left to right? Which operation does the order of operations ' +
           'tell you to handle before the others?',
    hint:  'Resolve multiplication and division before addition and subtraction — not simply in ' +
           'reading order. Find the × first.'
  },

  // --- pythagorean ---
  linear_sum: {
    probe: 'You added the side lengths — but the theorem is about the AREAS of the squares on ' +
           'each side, not the sides themselves. What is a² + b² here?',
    hint:  'Square each leg first, add those squares, then take the square root. Adding a + b ' +
           'skips the squaring entirely.'
  },
  sub_hypotenuse: {
    probe: 'The hypotenuse relates to the squares of the sides, not their plain difference — ' +
           'what equation links a², b², and c²?',
    hint:  'Use a² + b² = c². To find a missing leg, subtract the SQUARES (c² − a²) and then take ' +
           'the square root, rather than subtracting the lengths directly.'
  },

  // --- linear_one_step ---
  inverse_sign_slip: {
    probe: 'To get x by itself you undo the operation attached to it — if a number is added to ' +
           'x, what is the inverse you apply to both sides?',
    hint:  'Whatever is done to x must be undone. If the equation adds a number, subtract it from ' +
           'both sides (and vice-versa) — do not add it again.'
  },

  // --- linear_two_step ---
  divide_before_subtract: {
    probe: 'Which should you undo first — the number added to the x-term, or the coefficient ' +
           'multiplying x? What order rebuilds the equation in reverse?',
    hint:  'Undo addition and subtraction before division. Move the constant to the other side ' +
           'first, then divide by the coefficient.'
  },

  // --- Foundational band (2026-07: authored for the misconception ids that fire most;
  //     everything else gets the derived probe). NOTE: some ids are shared across concepts
  //     (dropped_sign, forgot_double, forgot_divide) — keep their wording general enough
  //     to fit every concept that declares them. ---

  // fractions
  add_across: {
    probe: 'You combined the tops AND the bottoms — but what does the bottom number actually ' +
           'describe? Can pieces of different sizes be counted together?',
    hint:  'The denominator names the piece size, so it must MATCH before you add. Find a common ' +
           'denominator first; then only the numerators combine.'
  },
  sub_across: {
    probe: 'You subtracted top-from-top and bottom-from-bottom — but do the denominators describe ' +
           'the same piece size here?',
    hint:  'Make the denominators match first. Once the pieces are the same size, subtract only ' +
           'the numerators — the denominator stays put.'
  },
  cross_multiply: {
    probe: 'Cross-multiplying is for solving proportions — is this a proportion, or a plain ' +
           'multiplication of two fractions?',
    hint:  'To multiply fractions, go straight across: top × top over bottom × bottom. No common ' +
           'denominator, no crossing.'
  },
  forgot_to_flip: {
    probe: 'You multiplied straight across — but the operation is DIVISION. What has to happen to ' +
           'the second fraction before you can multiply?',
    hint:  'Dividing by a fraction means multiplying by its reciprocal. Flip the SECOND fraction, ' +
           'then multiply across.'
  },
  partial_reduce: {
    probe: 'You divided one part of the fraction — what happens to its value if the other part ' +
           'is not divided by the same number?',
    hint:  'Simplifying divides the top AND the bottom by the same factor. Doing only one changes ' +
           'the fraction\'s value instead of just its look.'
  },
  // decimals
  carry_slip: {
    probe: 'One column added past nine — where does that extra ten go?',
    hint:  'When a column\'s sum passes 9, carry the 1 into the next column left. Re-add, column ' +
           'by column, watching for the carry.'
  },
  borrow_slip: {
    probe: 'A top digit was smaller than the one below it — what did you do at that column? Does ' +
           'borrowing work any differently just because a decimal point is nearby?',
    hint:  'Borrow across the decimal point exactly as with whole numbers: take 1 from the next ' +
           'column left, making the small digit ten-plus-itself.'
  },
  place_count_slip: {
    probe: 'Your digits are right but the decimal point is not — how many decimal places should ' +
           'the product have, given each factor\'s places?',
    hint:  'ADD the decimal places of the factors: that total is how many places the product ' +
           'needs. Count them off from the right.'
  },
  unshifted_divisor: {
    probe: 'You divided with the divisor still a decimal — what shift makes the divisor a whole ' +
           'number, and what must happen to the dividend at the same time?',
    hint:  'Multiply BOTH numbers by the same power of ten until the divisor is whole. The ' +
           'quotient is unchanged, and the division becomes ordinary.'
  },
  round_direction: {
    probe: 'Look at the digit just after the place you are rounding to — does it tell you to go ' +
           'up or stay?',
    hint:  '5 or more rounds the place UP; 4 or less keeps it. Check that one digit, then drop ' +
           'everything after the rounding place.'
  },
  // integers & absolute value
  dropped_sign: {
    probe: 'Your number is the right size but check its sign — where did the negative go?',
    hint:  'Track every minus sign through the work. Decide the sign of the result FIRST, from ' +
           'the rule, then attach it to the size you computed.'
  },
  subtract_reversed: {
    probe: 'Which quantity are you taking away from which? Does the order of a subtraction ' +
           'change the answer?',
    hint:  'a − b and b − a differ only in sign — but they differ. Re-read which value comes ' +
           'first and keep that order.'
  },
  sign_rule_slip: {
    probe: 'Before the arithmetic: same signs or different signs? What does that alone tell you ' +
           'about the sign of the product?',
    hint:  'Same signs multiply to positive; different signs to negative. Fix the sign from the ' +
           'rule first, then multiply the sizes.'
  },
  kept_sign: {
    probe: 'Absolute value asks how FAR from zero — can a distance be negative?',
    hint:  'Strip the direction, keep the size: the absolute value of a negative number is that ' +
           'number without its minus sign.'
  },
  // geometry
  forgot_double: {
    probe: 'Something in this shape appears TWICE, and your total counts it only once — which ' +
           'part did you count a single time?',
    hint:  'Walk through the structure and note each piece that occurs in a pair. Every paired ' +
           'piece contributes twice to the total.'
  },
  forgot_half: {
    probe: 'A triangle sits inside the rectangle on the same base and height — is the triangle ' +
           'the whole rectangle, or part of it?',
    hint:  'The triangle is exactly HALF that rectangle. Multiply base × height, then take half.'
  },
  circumference_instead: {
    probe: 'Did you measure the distance AROUND the circle, or the space INSIDE it? Which does ' +
           'the question ask for?',
    hint:  'Area is π r² — the radius is squared. 2πr is the circumference, a length, not an ' +
           'area.'
  },
  diameter_as_radius: {
    probe: 'Is the measurement you plugged in the distance across the whole circle, or from the ' +
           'centre to the edge?',
    hint:  'The formula wants the RADIUS. If you were given the diameter, halve it first.'
  },
  // number sense
  decimal_place: {
    probe: 'Your answer is exactly ten times off — when you converted the percent, how many ' +
           'places did the decimal point move?',
    hint:  'Percent means "out of 100": move the decimal point exactly TWO places to turn a ' +
           'percent into a decimal before multiplying.'
  },
  took_complement: {
    probe: 'You found the OTHER part — re-read the question: which part of the whole is it ' +
           'actually asking for?',
    hint:  'Identify the requested part first. The remaining part is 1 minus it — a different ' +
           'answer to a different question.'
  },
  added_difference: {
    probe: 'You adjusted by ADDING — but does a ratio grow by adding or by scaling? What happens ' +
           'to the relationship when you add the same amount to both parts?',
    hint:  'Keep ratios by MULTIPLYING both parts by the same factor. Find the scale factor ' +
           'first, then apply it to the other quantity.'
  },
  // exponents
  multiplied_base_exp: {
    probe: 'The exponent counts something — does 2⁴ mean 2 × 4, or something else entirely?',
    hint:  'The exponent counts COPIES of the base multiplied together: 2⁴ = 2 × 2 × 2 × 2. ' +
           'Write the copies out if in doubt.'
  },
  multiplied_exponents: {
    probe: 'When same-base powers multiply, what happens to their exponents — do they multiply ' +
           'too, or combine some other way?',
    hint:  'Multiplying same-base powers ADDS the exponents: aᵐ × aⁿ = aᵐ⁺ⁿ. Exponents multiply ' +
           'only for a power OF a power.'
  },
  // statistics
  forgot_divide: {
    probe: 'You have a combined total — but is the total itself the answer, or is there one more ' +
           'step to turn it into what was asked?',
    hint:  'Finish the computation: divide the total by the count involved. The raw sum or ' +
           'product is only the intermediate step.'
  },
  unsorted_middle: {
    probe: 'You picked the middle of the list AS GIVEN — does the median care about the order ' +
           'the values were written in?',
    hint:  'Sort the values first. The median is the middle of the SORTED list — position only ' +
           'means something once the data is in order.'
  },
  picked_max: {
    probe: 'You chose the biggest value — but is the mode about size, or about how OFTEN a value ' +
           'appears?',
    hint:  'Tally each value\'s occurrences. The mode is the most frequent value, no matter how ' +
           'big or small it is.'
  },
  gave_max: {
    probe: 'The largest value alone is only half the story — what does the range measure between ' +
           'the two ends of the data?',
    hint:  'Range = maximum − minimum: the spread between the extremes, not the maximum itself.'
  },
  used_complement: {
    probe: 'You computed the chance of the OTHER outcome — re-read which event the question asks ' +
           'about.',
    hint:  'Count the outcomes that match the requested event, over all equally likely outcomes. ' +
           'The complement answers the opposite question.'
  },
  // expressions
  added_all: {
    probe: 'You combined every number in sight — but what does the variable stand for, and what ' +
           'must happen to it before any arithmetic?',
    hint:  'Substitute first: replace the variable with its value, respecting multiplication ' +
           'like 3x = 3 × x. Then follow the order of operations.'
  },
  swapped_values: {
    probe: 'Two variables, two values — did each value go to its own variable?',
    hint:  'Match them by name before computing: write x = … and y = … above the expression, ' +
           'then substitute carefully, one at a time.'
  },
  multiplied_coeffs: {
    probe: 'Combining like terms means counting them — if you have 4 of something and 2 more of ' +
           'the same thing, do you multiply the counts?',
    hint:  'ADD the coefficients of like terms: 4x + 2x = 6x. Multiplying coefficients belongs ' +
           'to multiplication of terms, not collection.'
  },
  partial_distribute: {
    probe: 'The factor outside the parentheses touched only the first term — what about the ' +
           'other term inside?',
    hint:  'Distribute to EVERY term inside the parentheses, signs included. Draw an arrow from ' +
           'the factor to each term as a check.'
  }
};

// Concept-generic Socratic fallback for unclassified slips and advanced concepts that
// Derive a targeted probe/hint from a CLASSIFIED misconception when no authored template
// exists (authored templates cover ~13 of 300+ graph misconception ids). The probe names the
// slip the learner's answer matches; the hint reuses the lesson's authored fix for the same
// mistake when one matches by label overlap (same concept only — no cross-concept fuzzing).
// Never states the answer; both strings go through the caller's contract unchanged.
function deriveSocratic(conceptId, m) {
  if (!m || !m.id || m.id === 'unclassified' || !m.label) return null;

  const label = String(m.label).trim();
  const probe = `Your answer is exactly what you'd get if you ${lowerFirst(label)}. ` +
    'Walk back to that step — why is that move tempting here, and what does it break?';

  let hint = null;
  try {
    const { CONCEPT_LESSONS } = require('./conceptLessons'); // lazy: avoids load-order coupling
    const lesson = CONCEPT_LESSONS[conceptId];
    const mistakes = lesson && Array.isArray(lesson.commonMistakes) ? lesson.commonMistakes : [];
    const best = bestLabelMatch(label, mistakes);
    if (best && best.fix) hint = String(best.fix);
  } catch { /* lessons optional */ }

  return {
    probe,
    hint: hint ||
      'Redo just that one step, slowly, and compare it against the concept rule — the rest of your work may already be right.'
  };
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

// Match a graph-misconception label to the same lesson's commonMistakes entry by significant-
// token overlap. Requires ≥2 shared tokens (or all tokens of the shorter label) so one shared
// word doesn't produce a false match.
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'or', 'in', 'into', 'instead', 'with', 'for', 'by', 'on']);
function tokens(s) {
  return String(s).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}
function bestLabelMatch(label, mistakes) {
  const lt = new Set(tokens(label));
  let best = null, bestScore = 0;
  for (const cm of mistakes) {
    if (!cm || !cm.label) continue;
    const ct = tokens(cm.label);
    const shared = ct.filter((t) => lt.has(t)).length;
    const needed = Math.min(2, Math.min(lt.size, ct.length));
    if (shared >= needed && shared > bestScore) { best = cm; bestScore = shared; }
  }
  return best;
}

// have no authored template yet. Still a genuine probe + nudge; never the answer.
function conceptGenericFallback(conceptId) {
  const name = (conceptId && concepts[conceptId] && concepts[conceptId].name)
    ? concepts[conceptId].name
    : null;
  return {
    probe: name
      ? `Walk back through your steps for this ${name} problem — which single operation might ` +
        'have slipped? Try re-solving it one line at a time and compare.'
      : 'Walk back through your steps — which single operation might have slipped? Try ' +
        're-solving it one line at a time and compare.',
    hint:  'Redo the problem slowly, checking each line against the one before it. Look hardest at ' +
           'the step where the numbers changed the most.'
  };
}

// Build the Socratic feedback package for a problem as a JSON STRING (the model carries
// heterogeneous nested data as a string, mirroring interactiveVisualJson — see Models.kt).
//
// Shape:
//   { byOption: { "<wrongOptionStr>": { misconception, probe, hint }, ... },
//     generic:  { probe, hint } }
//
// For every option that is NOT the correct answer we classify the likely misconception
// and attach the matching authored template (or the concept-generic fallback).
function buildSocraticJson(conceptId, correctAnswer, options, params = {}) {
  const byOption = {};
  const correctStr = (correctAnswer === undefined || correctAnswer === null)
    ? ''
    : correctAnswer.toString().trim();

  if (Array.isArray(options)) {
    for (const opt of options) {
      const optStr = (opt === undefined || opt === null) ? '' : opt.toString().trim();
      if (optStr === '' || optStr === correctStr) continue;  // skip blanks + the right answer
      if (byOption[optStr]) continue;                          // de-dupe equal option strings

      const m = classifyMisconception(conceptId, correctAnswer, opt, params);
      const tmpl = SOCRATIC_TEMPLATES[m.id]
        || deriveSocratic(conceptId, m)
        || conceptGenericFallback(conceptId);
      // Leak guard: derived hints reuse lesson fix text whose worked numbers could coincide
      // with THIS problem's answer. Swap any leaking string for the concept-generic one.
      const fallback = conceptGenericFallback(conceptId);
      byOption[optStr] = {
        misconception: m.id,
        probe:         leaksAnswer(tmpl.probe, correctAnswer) ? fallback.probe : tmpl.probe,
        hint:          leaksAnswer(tmpl.hint, correctAnswer) ? fallback.hint : tmpl.hint
      };
    }
  }

  const generic = conceptGenericFallback(conceptId);
  return JSON.stringify({ byOption, generic });
}

module.exports = {
  buildSocraticJson,
  SOCRATIC_TEMPLATES
};
