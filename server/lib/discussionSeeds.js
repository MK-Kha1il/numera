// Authored "common question" threads seeded into per-concept discussion (ultra review #5/#55).
// At zero population a blank discussion tab erodes trust; these give every seeded concept a useful
// starter thread (a real beginner question + a friendly, correct answer), attributed to the system
// "NumeraGuide" account. Seeding is lazy and one-time per concept (see routes/discussion.js):
// only concepts that appear here get starter threads, and only until a real post exists.
//
// Keep answers short, correct, and plain — they render as normal posts (no LaTeX assumed).
const DISCUSSION_SEEDS = {
  pemdas: [
    {
      q: 'Why do we do multiplication before addition? Why not just left to right?',
      a: 'Order of operations is a shared convention so everyone reads an expression the same way. In 2 + 3 × 4, multiplication binds tighter, so it is 2 + 12 = 14, not 5 × 4 = 20. Think of 3 × 4 as one "chunk" that must be computed before it can be added.',
    },
    {
      q: 'Where do brackets fit in PEMDAS?',
      a: 'Brackets (parentheses) come first — they let you override the default order. Anything inside them is computed before the outside. After brackets come exponents, then multiply/divide (left to right), then add/subtract (left to right).',
    },
  ],
  fraction_simplify: [
    {
      q: "How do I know when a fraction is fully simplified?",
      a: 'A fraction is fully simplified when the top and bottom share no common factor except 1. Find the greatest common divisor (GCD) of numerator and denominator and divide both by it. For 12/18 the GCD is 6, so it simplifies to 2/3.',
    },
  ],
  fraction_add: [
    {
      q: 'Why can\'t I just add the tops and bottoms straight across?',
      a: 'Because the pieces are different sizes until the denominators match. 1/2 + 1/3 is not 2/5 — rewrite them over a common denominator (6): 3/6 + 2/6 = 5/6. Only once the bottoms are equal do you add the numerators and keep the denominator.',
    },
  ],
  pythagorean: [
    {
      q: 'Does a² + b² = c² work for any triangle?',
      a: 'No — only right triangles (one 90° angle). c must be the hypotenuse, the side opposite the right angle and the longest side. For other triangles you need the law of cosines instead.',
    },
  ],
  linear_one_step: [
    {
      q: 'How do I decide what to do to both sides?',
      a: 'Do the inverse of whatever is attached to the variable. If it says x + 7, subtract 7 from both sides; if it says 3x, divide both sides by 3. The goal is to undo the operation so x is left alone. Always do the same thing to both sides to keep it balanced.',
    },
  ],
  gcd_lcm: [
    {
      q: 'What\'s the difference between GCD and LCM — I always mix them up.',
      a: 'GCD (greatest common divisor) is the biggest number that divides into both — it is never larger than your numbers. LCM (least common multiple) is the smallest number both divide into — it is never smaller than your numbers. GCD shrinks, LCM grows.',
    },
  ],
  integer_add: [
    {
      q: 'I keep getting signs wrong when adding negatives. Any trick?',
      a: 'Think of a number line. Adding a positive moves right, adding a negative moves left. For -3 + 5 start at -3 and move 5 right → 2. Same signs: add and keep the sign. Different signs: subtract the smaller size from the larger and take the sign of the larger.',
    },
  ],
  decimal_round: [
    {
      q: 'Which digit do I look at when rounding?',
      a: 'Look at the digit immediately to the right of the place you are rounding to. If it is 5 or more, round up; if it is 4 or less, round down (leave it). To round 3.47 to one decimal place, look at the 7 → round up → 3.5.',
    },
  ],
  arithmetic_div: [
    {
      q: 'What does a remainder actually mean?',
      a: 'The remainder is what is left over when the number does not split evenly. 17 ÷ 5 = 3 remainder 2, because 5 fits into 17 three times (15) with 2 left. You can keep going into decimals (3.4) or leave it as a remainder, depending on what the problem asks.',
    },
  ],
};

module.exports = { DISCUSSION_SEEDS, SEED_AUTHOR_USERNAME: 'NumeraGuide' };
