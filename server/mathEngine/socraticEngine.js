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
  }
};

// Concept-generic Socratic fallback for unclassified slips and advanced concepts that
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
      const tmpl = SOCRATIC_TEMPLATES[m.id] || conceptGenericFallback(conceptId);
      byOption[optStr] = {
        misconception: m.id,
        probe:         tmpl.probe,
        hint:          tmpl.hint
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
