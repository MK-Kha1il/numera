// Applied Examples — authored real-world transfer contexts for concepts whose LESSON example
// is symbolic or non-numeric (fraction / coordinate / expression answers), which made them
// underivable as transfer problems (transfer MCQs need a plain numeric answer).
//
// Each entry is ONE canonical applied instance: a novel-context question whose answer is a
// plain number (counts, minutes, dollars, single coordinates — the framing does the work of
// keeping the answer numeric). deriveActiveLearning.deriveTransfer consumes these before
// falling back to the lesson's own examples, closing the transfer gap to 100% of the catalog
// (the `transfer` mastery dimension is earned ONLY on out-of-context problems).
//
// Authoring rules (enforced by test/appliedExamples.test.js):
//   - answer matches ^-?\d+(\.\d+)?$ (plain number, no units/LaTeX)
//   - question is APPLIED: it must not start with a bare symbolic command
//     (simplify/solve/evaluate/… — see deriveActiveLearning.isApplied)
//   - question never states its own answer; explanation shows the worked reasoning
//   - LaTeX uses double backslashes ("\\frac") — the classic single-backslash corruption
//     bug is control-char-scanned by the test
//
// Pure data module (no DB / IO).

const APPLIED_EXAMPLES = {
  // ---- Algebra: matrices, integrals, limits ----
  matrix_trace: {
    question: 'A game logs a $2 \\times 2$ stats table: row 1 is $(3, 2)$, row 2 is $(4, 5)$. The "diagonal score" adds the top-left and bottom-right entries. What is it?',
    answer: 8,
    explanation: 'The trace adds the main-diagonal entries: $3 + 5 = 8$.',
  },
  matrix_determinant: {
    question: 'A map app stretches a $1 \\times 1$ grid square using the matrix with rows $(3, 1)$ and $(2, 4)$. The stretched square\'s area equals the determinant. What is that area?',
    answer: 10,
    explanation: 'Determinant $= ad - bc = 3 \\times 4 - 1 \\times 2 = 10$ — the area scale factor of the transformation.',
  },
  integral: {
    question: 'A tap fills a tub at a rate of $2t$ litres per minute. Using the area under the rate graph from $t = 0$ to $t = 3$, how many litres flow in?',
    answer: 9,
    explanation: 'The definite integral $\\int_0^3 2t\\,dt = t^2 \\Big|_0^3 = 9$ litres — accumulated flow is area under the rate curve.',
  },
  limit: {
    question: 'A delivery firm\'s cost per package, $\\frac{3n + 1}{n}$ dollars for $n$ packages, settles toward one value as $n$ grows huge. What value?',
    answer: 3,
    explanation: 'Divide top and bottom by $n$: $\\frac{3 + 1/n}{1} \\to 3$ as $n \\to \\infty$; the $\\frac{1}{n}$ term vanishes.',
  },

  // ---- Number theory ----
  modular_arithmetic: {
    question: 'It is 9 o\'clock. A ferry departs exactly 30 hours from now. On a 12-hour clock face, what hour will it show?',
    answer: 3,
    explanation: '$9 + 30 = 39$, and $39 \\bmod 12 = 3$ — every 12 hours the clock face repeats.',
  },
  totient: {
    question: 'A necklace has 12 beads in a circle. A skip-pattern of size $k$ reaches every bead only when $k$ shares no factor with 12. How many such $k$ from 1 to 12 are there?',
    answer: 4,
    explanation: 'That count is Euler\'s totient $\\phi(12)$: the numbers coprime to 12 are 1, 5, 7, 11 — four of them.',
  },
  prime_factorization: {
    question: 'A florist splits 84 flowers into bunches whose sizes follow the prime factorization of 84. Counting repeats, how many prime factors does 84 have?',
    answer: 4,
    explanation: '$84 = 2 \\times 2 \\times 3 \\times 7$ — four prime factors counting multiplicity.',
  },

  // ---- Integers, absolute value ----
  absolute_value: {
    question: 'The overnight temperature was $-7$°C. How many degrees is that from zero?',
    answer: 7,
    explanation: 'Distance from zero ignores direction: $|-7| = 7$ degrees.',
  },

  // ---- Fractions ----
  fraction_simplify: {
    question: '18 of the 24 muffins at a bake sale are chocolate. When the fraction $\\frac{18}{24}$ is written in lowest terms, what is its denominator?',
    answer: 4,
    explanation: 'Divide top and bottom by their GCF 6: $\\frac{18}{24} = \\frac{3}{4}$, so the denominator is 4.',
  },
  fraction_add: {
    question: 'A recipe uses $\\frac{1}{4}$ cup of oil in the morning batch and $\\frac{1}{2}$ cup in the evening batch. Measured in quarter-cups, how many does the day use in total?',
    answer: 3,
    explanation: 'Rewrite over quarters: $\\frac{1}{4} + \\frac{2}{4} = \\frac{3}{4}$ — three quarter-cups.',
  },
  fraction_sub: {
    question: 'A water bottle is $\\frac{3}{4}$ full. After a hike it is $\\frac{1}{4}$ full. How many quarters of the bottle were drunk?',
    answer: 2,
    explanation: 'Same-size pieces subtract directly: $\\frac{3}{4} - \\frac{1}{4} = \\frac{2}{4}$ — two quarters.',
  },
  fraction_mult: {
    question: 'A movie lasts $\\frac{3}{4}$ of an hour. You watched $\\frac{2}{3}$ of it before dinner. How many minutes did you watch?',
    answer: 30,
    explanation: '$\\frac{2}{3} \\times \\frac{3}{4} = \\frac{1}{2}$ of an hour, and half of 60 minutes is 30.',
  },
  fraction_div: {
    question: 'A ribbon $\\frac{3}{4}$ m long is cut into pieces each $\\frac{1}{8}$ m. How many pieces are there?',
    answer: 6,
    explanation: 'Division asks how many eighths fit: $\\frac{3}{4} \\div \\frac{1}{8} = \\frac{3}{4} \\times 8 = 6$ pieces.',
  },
  fraction_negative: {
    question: 'A temperature falls $\\frac{3}{4}$° each hour for 2 hours. Measured in quarter-degrees, what is the total CHANGE?',
    answer: -6,
    explanation: 'Each hour is $-3$ quarters; two hours give $2 \\times (-3) = -6$ quarter-degrees.',
  },
  mixed_number: {
    question: 'Trail mix calls for $\\frac{7}{2}$ cups of oats. Written as a mixed number that is a whole part plus a fraction — what is the WHOLE-number part?',
    answer: 3,
    explanation: '$\\frac{7}{2} = 3\\frac{1}{2}$: two halves make each whole, giving 3 wholes with 1 half left.',
  },
  fraction_compare: {
    question: 'Two water tanks: one is $\\frac{3}{5}$ full, the other $\\frac{2}{3}$ full. Written over the common denominator 15, the FULLER tank has how many fifteenths?',
    answer: 10,
    explanation: '$\\frac{3}{5} = \\frac{9}{15}$ and $\\frac{2}{3} = \\frac{10}{15}$; the second tank is fuller with 10 fifteenths.',
  },
  fraction_decimal_convert: {
    question: 'A runner has finished $\\frac{3}{4}$ of a race. As a decimal, what fraction of the race is done?',
    answer: 0.75,
    explanation: '$3 \\div 4 = 0.75$ — a fraction is a division in disguise.',
  },
  percent_decimal_convert: {
    question: 'A store discount of 35% is entered into the till as a decimal. What number is typed?',
    answer: 0.35,
    explanation: 'Percent means out of 100: $35\\% = 35 \\div 100 = 0.35$.',
  },

  // ---- Geometry: circles, solids ----
  geo_circle_area: {
    question: 'A sprinkler waters a full circle of radius 10 m. Using $\\pi \\approx 3.14$, how many square metres get watered?',
    answer: 314,
    explanation: '$A = \\pi r^2 \\approx 3.14 \\times 10^2 = 314$ m² — the radius is squared, not doubled.',
  },
  geo_circumference: {
    question: 'A circular running track has a radius of 50 m. Using $\\pi \\approx 3.14$, how many metres is one lap around it?',
    answer: 314,
    explanation: 'Circumference $= 2\\pi r \\approx 2 \\times 3.14 \\times 50 = 314$ m.',
  },
  geo_volume_cylinder: {
    question: 'A soup can has radius 3 cm and height 10 cm. Using $\\pi \\approx 3.14$, how many cm³ does it hold?',
    answer: 282.6,
    explanation: '$V = \\pi r^2 h \\approx 3.14 \\times 9 \\times 10 = 282.6$ cm³ — circle area stacked through the height.',
  },
  geo_volume_cone: {
    question: 'An ice-cream cone has radius 3 cm and height 4 cm. Using $\\pi \\approx 3.14$, how many cm³ of ice cream fill it exactly?',
    answer: 37.68,
    explanation: 'A cone is a third of its cylinder: $V = \\frac{1}{3}\\pi r^2 h \\approx \\frac{1}{3} \\times 3.14 \\times 9 \\times 4 = 37.68$ cm³.',
  },
  geo_volume_sphere: {
    question: 'A beach ball has radius 3 dm. Using $\\pi \\approx 3.14$ and $V = \\frac{4}{3}\\pi r^3$, how many dm³ of air does it hold?',
    answer: 113.04,
    explanation: '$V = \\frac{4}{3} \\times 3.14 \\times 27 = 113.04$ dm³ — the radius is CUBED for volume.',
  },
  geo_surface_cylinder: {
    question: 'A label wraps the side of a can with radius 2 cm and height 10 cm. Using $\\pi \\approx 3.14$, how many cm² of paper is the label (side surface only)?',
    answer: 125.6,
    explanation: 'Unrolled, the label is a rectangle: circumference × height $= 2 \\times 3.14 \\times 2 \\times 10 = 125.6$ cm².',
  },
  geo_surface_sphere: {
    question: 'A globe has radius 5 cm. Using $\\pi \\approx 3.14$ and $A = 4\\pi r^2$, how many cm² of paint cover it?',
    answer: 314,
    explanation: '$A = 4 \\times 3.14 \\times 25 = 314$ cm² — four great-circle areas cover a sphere.',
  },
  geo_surface_cone: {
    question: 'A party hat is a cone with radius 3 cm and slant height 5 cm (open at the base). Using $\\pi \\approx 3.14$, how many cm² of card make it?',
    answer: 47.1,
    explanation: 'Lateral surface $= \\pi r \\ell \\approx 3.14 \\times 3 \\times 5 = 47.1$ cm² — the SLANT height, not the vertical height.',
  },
  midpoint: {
    question: 'Two towns sit at km-markers 3 and 11 on a straight highway. A rest stop is built exactly halfway between them. At which km-marker?',
    answer: 7,
    explanation: 'The midpoint averages the endpoints: $\\frac{3 + 11}{2} = 7$.',
  },

  // ---- Expressions & evaluation ----
  eval_expression: {
    question: 'A taxi charges a $5 flat fee plus $3 per km. Using the fare expression $3k + 5$ with $k = 6$, what is the fare in dollars?',
    answer: 23,
    explanation: 'Substitute the value first: $3 \\times 6 + 5 = 18 + 5 = 23$ dollars.',
  },
  eval_two_var: {
    question: 'A stall sells apples at $2 and pears at $3. With the cost expression $2a + 3p$, what do $a = 4$ apples and $p = 2$ pears cost in dollars?',
    answer: 14,
    explanation: 'Each value goes to its own variable: $2 \\times 4 + 3 \\times 2 = 8 + 6 = 14$ dollars.',
  },
  combine_like_terms: {
    question: 'A cart\'s load is $4x + 7 + 2x$ kg, where $x$ is one crate\'s weight. After combining like terms the load is $ax + 7$; what is $a$?',
    answer: 6,
    explanation: 'Only the $x$-terms merge: $4x + 2x = 6x$, so $a = 6$; the plain 7 is not a like term.',
  },
  distribute: {
    question: 'Tickets cost $x + 4$ dollars each and you buy 3. The total expands to $3x + c$ dollars; what is $c$?',
    answer: 12,
    explanation: 'The 3 multiplies BOTH terms inside: $3(x + 4) = 3x + 12$, so $c = 12$.',
  },
  translate_expression: {
    question: 'A phrase card reads: "triple a number, then add five". For the number 4, what value does the phrase give?',
    answer: 17,
    explanation: 'The phrase translates to $3n + 5$; with $n = 4$ that is $12 + 5 = 17$.',
  },
  function_table: {
    question: 'A vending machine\'s table shows: input 1 → 7, input 2 → 9, input 3 → 11. Following the same rule, what output goes with input 5?',
    answer: 15,
    explanation: 'Outputs climb by 2 per input step (rule $2n + 5$), so input 5 gives $2 \\times 5 + 5 = 15$.',
  },

  // ---- Powers, roots, scientific notation ----
  square_root: {
    question: 'A square dance floor covers 144 m². How many metres long is each side?',
    answer: 12,
    explanation: 'The side is the square root of the area: $\\sqrt{144} = 12$ m.',
  },
  cube_root: {
    question: 'A shipping crate is a perfect cube holding 64 m³. How many metres long is one edge?',
    answer: 4,
    explanation: 'The edge is the cube root of the volume: $\\sqrt[3]{64} = 4$ m.',
  },
  exponent_power: {
    question: 'One person starts a rumor and tells 3 people; each round, every new hearer tells 3 more. How many people hear it in round 4?',
    answer: 81,
    explanation: 'Round 4 reaches $3^4 = 3 \\times 3 \\times 3 \\times 3 = 81$ people — the exponent counts the rounds of tripling.',
  },
  exponent_product_rule: {
    question: 'A lab culture grows by a factor of $2^3$ in week one and by $2^4$ more in week two, so the overall growth factor is $2^n$. What is $n$?',
    answer: 7,
    explanation: 'Multiplying same-base powers ADDS exponents: $2^3 \\times 2^4 = 2^{3+4} = 2^7$, so $n = 7$.',
  },
  exponent_quotient_rule: {
    question: 'A file shrinks from $10^9$ bytes to $10^6$ bytes when compressed. The compression factor is $10^k$; what is $k$?',
    answer: 3,
    explanation: 'Dividing same-base powers SUBTRACTS exponents: $\\frac{10^9}{10^6} = 10^{9-6} = 10^3$, so $k = 3$.',
  },
  exponent_zero_negative: {
    question: 'A population model gives $5^0$ thousand fish in the starting year. How many thousand fish is that?',
    answer: 1,
    explanation: 'Any nonzero base to the power zero is 1 — the empty product.',
  },
  exponent_power_rule: {
    question: 'A virus spreads as $(10^2)^3$ hosts. Written as a single power $10^n$, what is $n$?',
    answer: 6,
    explanation: 'A power of a power MULTIPLIES exponents: $(10^2)^3 = 10^{2 \\times 3} = 10^6$.',
  },
  exponent_power_of_product: {
    question: 'A cube has edges of $2 \\times 3$ cm. Its volume $(2 \\times 3)^3$ can be split as $2^3 \\times 3^3$. How many cm³ is that?',
    answer: 216,
    explanation: 'The power distributes over the product: $2^3 \\times 3^3 = 8 \\times 27 = 216$ cm³.',
  },
  fractional_exponent: {
    question: 'A cube-shaped tank holds 27 m³, so each edge is $27^{1/3}$ m. How many metres is that?',
    answer: 3,
    explanation: 'A $\\frac{1}{3}$ exponent means cube root: $27^{1/3} = \\sqrt[3]{27} = 3$ m.',
  },
  simplify_radical: {
    question: 'A square poster has area 50 cm², so its side is $\\sqrt{50} = a\\sqrt{2}$ cm. What is $a$?',
    answer: 5,
    explanation: 'Pull out the largest square factor: $\\sqrt{50} = \\sqrt{25 \\times 2} = 5\\sqrt{2}$, so $a = 5$.',
  },
  scientific_notation: {
    question: 'A satellite orbits $4.2 \\times 10^3$ km above Earth. Written as an ordinary number, how many km is that?',
    answer: 4200,
    explanation: '$\\times 10^3$ shifts the decimal three places right: $4.2 \\to 4200$.',
  },
  scientific_notation_compute: {
    question: 'A data centre stores $3 \\times 10^4$ files on each of $2 \\times 10^2$ servers. The total is $6 \\times 10^k$ files; what is $k$?',
    answer: 6,
    explanation: 'Multiply the fronts ($3 \\times 2 = 6$) and add the exponents ($10^{4+2} = 10^6$), so $k = 6$.',
  },

  // ---- Inequalities ----
  inequality_one_step_add: {
    question: 'A lift can carry at most 300 kg. With 120 kg already inside, added cargo $x$ must satisfy $x + 120 \\le 300$. What is the greatest whole kg of cargo you can add?',
    answer: 180,
    explanation: 'Subtract 120 from both sides: $x \\le 180$, so 180 kg is the maximum.',
  },
  inequality_one_step_mult: {
    question: 'Movie tickets cost $4 each and your budget is at most $30, so $4x \\le 30$. What is the greatest whole number of tickets you can buy?',
    answer: 7,
    explanation: 'Divide both sides by 4: $x \\le 7.5$; whole tickets cap at 7.',
  },
  inequality_flip_negative: {
    question: 'A freezer cools steadily: its temperature after $t$ hours is $-2t$ degrees. For it to be colder than $-6$° (that is, $-2t < -6$), what is the least whole number of hours?',
    answer: 4,
    explanation: 'Dividing by $-2$ FLIPS the sign: $t > 3$, so the first whole hour that works is 4.',
  },
  inequality_two_step: {
    question: 'A phone plan costs $3 per GB plus a $5 fee, and your budget is at most $26, so $3g + 5 \\le 26$. What is the greatest whole GB you can use?',
    answer: 7,
    explanation: 'Subtract 5, then divide by 3: $g \\le 7$ — the fee comes off before the rate.',
  },
  inequality_compound: {
    question: 'A greenhouse must stay between 15° and 25° inclusive: $15 \\le T \\le 25$. How many whole-degree temperatures are allowed?',
    answer: 11,
    explanation: 'From 15 to 25 inclusive is $25 - 15 + 1 = 11$ whole values — count both endpoints.',
  },
  inequality_var_both_sides: {
    question: 'Gym A charges $5x$ for $x$ visits; Gym B charges $3x + 8$. For $5x > 3x + 8$, what is the least whole number of visits where A costs more?',
    answer: 5,
    explanation: 'Collect the $x$s: $2x > 8$, so $x > 4$; the first whole number past 4 is 5.',
  },
  inequality_distribute: {
    question: 'Party planning: 2 bags each holding $x + 3$ treats must total more than 16, so $2(x + 3) > 16$. What is the least whole $x$?',
    answer: 6,
    explanation: 'Distribute first: $2x + 6 > 16$, then $x > 5$, so the least whole value is 6.',
  },
  inequality_word: {
    question: 'A kart track requires riders to be at least 130 cm tall. Mia is 118 cm and grows about 4 cm per year. In how many whole years will she first qualify?',
    answer: 3,
    explanation: 'Solve $118 + 4y \\ge 130$: $4y \\ge 12$, so $y \\ge 3$ — three years.',
  },

  // ---- Equations strand ----
  eqn_onestep_div: {
    question: 'Four friends split a dinner bill evenly and each pays $12, so $\\frac{b}{4} = 12$. What was the whole bill in dollars?',
    answer: 48,
    explanation: 'Multiply both sides by 4 to undo the split: $b = 48$ dollars.',
  },
  eqn_fraction_coeff: {
    question: 'Three quarters of a fuel tank is 15 litres, so $\\frac{3}{4}x = 15$. How many litres does the FULL tank hold?',
    answer: 20,
    explanation: 'Multiply by the reciprocal $\\frac{4}{3}$: $x = 15 \\times \\frac{4}{3} = 20$ litres.',
  },
  eqn_clear_denom: {
    question: 'A prize is boosted by a $2 bonus, then split among 3 winners, giving each $4: $\\frac{p + 2}{3} = 4$. What was the original prize $p$ in dollars?',
    answer: 10,
    explanation: 'Clear the denominator FIRST: $p + 2 = 12$, then $p = 10$ — the fraction bar groups the whole top.',
  },
  eqn_proportion: {
    question: 'A photo 4 cm wide and 6 cm tall is enlarged to 10 cm wide keeping proportions, so $\\frac{4}{6} = \\frac{10}{h}$. How many cm tall is the enlargement?',
    answer: 15,
    explanation: 'Cross-multiply: $4h = 60$, so $h = 15$ cm.',
  },
  eqn_two_step_fraction: {
    question: 'A gym fee split between 2 friends, minus a $3 voucher each, comes to $7 each: $\\frac{m}{2} - 3 = 7$. What is the full fee $m$ in dollars?',
    answer: 20,
    explanation: 'Undo in reverse order: add 3 (getting $\\frac{m}{2} = 10$), then double: $m = 20$.',
  },
  eqn_distribute: {
    question: 'Three gift bags each hold a toy costing $x$ dollars plus $2 of wrapping, totalling $21: $3(x + 2) = 21$. What does each toy cost in dollars?',
    answer: 5,
    explanation: 'Distribute (or divide by 3 first): $x + 2 = 7$, so $x = 5$ dollars.',
  },
  eqn_var_denominator: {
    question: 'A 120 km road trip at a steady speed took 3 hours, so $\\frac{120}{v} = 3$. What was the speed $v$ in km/h?',
    answer: 40,
    explanation: 'Multiply both sides by $v$, then divide by 3: $v = \\frac{120}{3} = 40$ km/h.',
  },
  eqn_var_both_sides: {
    question: 'Two savings accounts reach equal balances after $m$ months: $4m + 10 = 6m + 2$. What is $m$?',
    answer: 4,
    explanation: 'Move the $m$s together: $10 - 2 = 6m - 4m$, so $8 = 2m$ and $m = 4$ months.',
  },
  linear_variable_both_sides: {
    question: 'Two candles burn: one starts at 20 cm losing 3 cm per hour ($20 - 3t$), the other at 12 cm losing 1 cm per hour ($12 - t$). After how many hours are they the same height?',
    answer: 4,
    explanation: 'Set them equal: $20 - 3t = 12 - t$, so $8 = 2t$ and $t = 4$ hours.',
  },

  // ---- Systems ----
  linear_system_substitution: {
    question: 'An adult ticket costs twice a child\'s ticket, and one adult plus one child ticket cost $18 together. What does the CHILD ticket cost in dollars?',
    answer: 6,
    explanation: 'Substitute $a = 2c$ into $a + c = 18$: $3c = 18$, so $c = 6$ dollars.',
  },
  linear_system_elimination: {
    question: 'Two burgers and a fry cost $16; one burger and a fry cost $10. Subtracting one order from the other, what does a burger cost in dollars?',
    answer: 6,
    explanation: 'Subtracting the orders eliminates the fry: $2b + f - (b + f) = 16 - 10$, so $b = 6$.',
  },
  linear_system_solution_types: {
    question: 'Ride service A charges $2 per km plus $5; service B charges $2 per km plus $7. At how many distances do they cost exactly the same?',
    answer: 0,
    explanation: 'Same rate, different fees — the cost lines are parallel and never meet: zero solutions.',
  },

  // ---- Quadratics & factoring ----
  quadratic_factoring: {
    question: 'A ball\'s height factors as $h = (6 - t)(t - 1)$, and it is on the ground when $h = 0$. What is the LATER ground time $t$ in seconds?',
    answer: 6,
    explanation: 'A product is zero when either factor is: $t = 1$ or $t = 6$; the later moment is 6 s.',
  },
  quadratic_formula: {
    question: 'A diver passes board level at the moments solving $t^2 - 5t + 6 = 0$. What is the LATER moment, in seconds?',
    answer: 3,
    explanation: 'The quadratic formula (or factoring to $(t-2)(t-3)$) gives $t = 2$ and $t = 3$; later is 3 s.',
  },
  discriminant_roots: {
    question: 'An arch modelled by $x^2 + 4x + 4 = 0$ touches the ground where the equation has solutions. How many DISTINCT touch points are there?',
    answer: 1,
    explanation: 'The discriminant $b^2 - 4ac = 16 - 16 = 0$: one repeated root, so exactly one touch point.',
  },
  complete_the_square: {
    question: 'A drone\'s height follows $x^2 + 6x + 2$, rewritten as $(x + 3)^2 + k$ to find its lowest point. What is $k$?',
    answer: -7,
    explanation: 'Half of 6 squared is 9: $x^2 + 6x + 2 = (x+3)^2 - 9 + 2 = (x+3)^2 - 7$, so $k = -7$.',
  },
  foil_binomials: {
    question: 'A garden plot measures $(x + 3)$ m by $(x + 2)$ m. Its area expands to $x^2 + bx + 6$; what is $b$?',
    answer: 5,
    explanation: 'The outer and inner products give the middle term: $2x + 3x = 5x$, so $b = 5$.',
  },
  square_binomial: {
    question: 'A square patio of side $(x + 4)$ m has area $x^2 + bx + 16$. What is $b$?',
    answer: 8,
    explanation: 'Squaring a binomial doubles the cross term: $(x+4)^2 = x^2 + 2 \\times 4x + 16$, so $b = 8$.',
  },
  factor_trinomial: {
    question: 'A rectangle of area $x^2 + 7x + 12$ has sides $(x + 3)$ and $(x + p)$. What is $p$?',
    answer: 4,
    explanation: 'Two numbers multiplying to 12 and adding to 7 are 3 and 4 — so the other side is $(x + 4)$.',
  },
  factor_gcf: {
    question: 'Two ribbons, 18 cm and 24 cm, must be cut into equal pieces with none left over. What is the longest possible piece length in cm?',
    answer: 6,
    explanation: 'The longest common piece is the GCF of 18 and 24, which is 6 cm.',
  },
  difference_of_squares: {
    question: 'A courtyard uses $13^2 - 12^2$ tiles. Using the difference-of-squares shortcut $(13-12)(13+12)$, how many tiles is that?',
    answer: 25,
    explanation: '$a^2 - b^2 = (a-b)(a+b) = 1 \\times 25 = 25$ tiles — no squaring needed.',
  },

  // ---- Ratios & proportion ----
  proportion_solve: {
    question: 'A recipe for 4 people needs 6 eggs. Keeping the same ratio, how many eggs feed 10 people?',
    answer: 15,
    explanation: 'Scale factor $\\frac{10}{4} = 2.5$, and $6 \\times 2.5 = 15$ eggs.',
  },
  ratio_simplify: {
    question: 'A class has 12 boys and 18 girls, so the boy-to-girl ratio simplifies to $a : 3$. What is $a$?',
    answer: 2,
    explanation: 'Divide both parts by their GCF 6: $12 : 18 = 2 : 3$, so $a = 2$.',
  },

  // ---- Probability & statistics ----
  compound_probability: {
    question: 'Two fair coins are flipped together. As a percentage, what is the chance BOTH land heads?',
    answer: 25,
    explanation: 'Independent events multiply: $\\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4} = 25\\%$.',
  },
  prob_without_replacement: {
    question: 'A bag holds 3 red and 2 blue marbles. You draw two, not returning the first. As a percentage, what is the chance both are red?',
    answer: 30,
    explanation: 'The pool shrinks: $\\frac{3}{5} \\times \\frac{2}{4} = \\frac{6}{20} = 30\\%$.',
  },
  stat_theoretical_prob: {
    question: 'A fair six-sided die is rolled once. As a percentage, what is the chance of rolling an even number?',
    answer: 50,
    explanation: 'Three of six equally likely faces are even: $\\frac{3}{6} = 50\\%$.',
  },
  stat_experimental_prob: {
    question: 'A basketball player made 18 of her 40 free throws this season. As a percentage, what is her experimental success rate?',
    answer: 45,
    explanation: 'Experimental probability = observed ratio: $\\frac{18}{40} = 0.45 = 45\\%$.',
  },

  // ---- Coordinate geometry ----
  coord_reflect: {
    question: 'A game sprite at $(3, -2)$ is mirrored over the x-axis. What is its new y-coordinate?',
    answer: 2,
    explanation: 'Reflecting over the x-axis flips the sign of $y$: $(3, -2) \\to (3, 2)$.',
  },
  coord_translate: {
    question: 'A chess app slides a piece at $(2, 3)$ right 4 and up 1. What is its new x-coordinate?',
    answer: 6,
    explanation: 'A translation adds to each coordinate: $x = 2 + 4 = 6$.',
  },
  coord_rotate_180: {
    question: 'A radar blip at $(4, -1)$ rotates 180° about the origin. What is its new x-coordinate?',
    answer: -4,
    explanation: 'A half-turn negates both coordinates: $(4, -1) \\to (-4, 1)$.',
  },
  coord_rotate_90: {
    question: 'A token at $(3, 2)$ rotates 90° counter-clockwise about the origin. What is its new y-coordinate?',
    answer: 3,
    explanation: 'Quarter-turn CCW maps $(x, y) \\to (-y, x)$: the new point is $(-2, 3)$, so $y = 3$.',
  },
  coord_dilate: {
    question: 'A map icon at $(2, 5)$ is enlarged by scale factor 3 from the origin. What is its new y-coordinate?',
    answer: 15,
    explanation: 'A dilation scales both coordinates: $y = 5 \\times 3 = 15$.',
  },
};

module.exports = { APPLIED_EXAMPLES };
