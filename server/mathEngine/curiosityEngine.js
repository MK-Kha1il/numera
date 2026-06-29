// Curiosity Engine — the "spark" layer. Mathematics is the most surprising subject there is, and a
// learning app that never shows the wonder trains compliance, not love. This module attaches one
// genuine aha-moment to a concept: a surprising pattern, an elegant shortcut, a counter-intuitive
// result, or a glimpse of where the idea connects to something bigger. Surfaced at the end of a
// lesson (the "✨ surprising bit") and reusable as a standalone delight.
//
// Curiosity is SELECTIVE by design (quality over coverage): a concept gets a spark only when there
// is a real, accurate, memorable hook — never a manufactured one. Each entry is authored.
//
// type drives the client's framing/icon: pattern | shortcut | counterintuitive | wonder.
// body may contain $...$ LaTeX (client auto-detects). Pure data + helpers; no DB/IO.

const CURIOSITY = {
  // ---------------- Arithmetic & number ----------------
  arithmetic_mult: {
    type: 'shortcut',
    title: 'The 11× trick',
    body: 'To multiply a two-digit number by $11$, split its digits and drop their sum in the middle. $35 \\times 11$: the $3$ and $5$ split apart and $3+5=8$ slides between them → $385$. (When the middle sum passes $9$, carry the extra ten left.)',
  },
  arithmetic_series: {
    type: 'shortcut',
    title: "Gauss's lightning sum",
    body: 'Asked to add $1+2+\\dots+100$, a young Gauss paired the ends: $1{+}100, 2{+}99, \\dots$ — fifty pairs each summing to $101$. So the total is $50 \\times 101 = 5050$, found in seconds instead of minutes. Any such run sums to (first + last) × (how many) ÷ 2.',
  },
  pemdas: {
    type: 'wonder',
    title: 'A handshake, not a law of nature',
    body: 'Order of operations is not a fact about numbers — it is an agreement so that everyone reads $3 + 4 \\times 5$ the same way. Multiplication binds tighter because it is shorthand for repeated addition, so we untangle it first. Change the convention and the maths still works; we just chose the most useful grammar.',
  },
  percentage_of: {
    type: 'shortcut',
    title: 'Percentages flip',
    body: '$x\\%$ of $y$ always equals $y\\%$ of $x$. Stuck on $8\\%$ of $50$? Flip it: $50\\%$ of $8$ is just $4$. The hard-looking one and the easy one are the same number wearing different clothes.',
  },

  // ---------------- Number theory ----------------
  prime_factorization: {
    type: 'wonder',
    title: 'Every number has one fingerprint',
    body: 'Pick any whole number above $1$. There is exactly ONE way to build it from primes — no number has two different prime recipes. This is the Fundamental Theorem of Arithmetic, and it is why primes are called the atoms of arithmetic.',
  },
  divisor_count: {
    type: 'counterintuitive',
    title: 'Odd one out',
    body: 'Divisors come in pairs ($12$: $1{\\times}12, 2{\\times}6, 3{\\times}4$). So almost every number has an EVEN count of divisors — except perfect squares, where one pair is a number times itself ($36 = 6 \\times 6$) and the partner is shared. A number has an odd number of divisors exactly when it is a perfect square.',
  },
  find_gcf: {
    type: 'pattern',
    title: 'GCF and LCM are partners',
    body: 'For any two numbers, $\\gcd(a,b) \\times \\operatorname{lcm}(a,b) = a \\times b$. Find one and you get the other for free — the greatest factor they share and the least multiple they meet at always multiply back to the original product.',
  },
  modular_arithmetic: {
    type: 'pattern',
    title: 'Clocks do this every day',
    body: 'Modular arithmetic is just clock maths: $9 + 5$ on a $12$-hour clock is $2$, not $14$. The old trick of "casting out nines" to check arithmetic is the same idea in disguise — working mod $9$.',
  },
  fibonacci_next: {
    type: 'wonder',
    title: 'Hidden in the petals',
    body: 'Divide each Fibonacci number by the one before it — $\\tfrac{3}{2}, \\tfrac{5}{3}, \\tfrac{8}{5}, \\dots$ — and the ratios home in on the golden ratio $\\varphi \\approx 1.618$. The same number shows up in sunflower spirals, pinecones, and nautilus shells.',
  },

  // ---------------- Combinatorics & probability ----------------
  permutations: {
    type: 'wonder',
    title: 'A shuffle no one has ever seen',
    body: 'The number of orderings of a $52$-card deck is $52!$ — about $8 \\times 10^{67}$. Shuffle thoroughly and you almost certainly hold an arrangement that has never existed before in human history, and never will again.',
  },
  combinations: {
    type: 'pattern',
    title: "Pascal's triangle is full of choices",
    body: 'Every number in Pascal\'s triangle is a combination: the entry counts the ways to choose. Each one is the sum of the two above it — which is just saying a choice either includes the new item or it doesn\'t.',
  },
  stat_probability: {
    type: 'counterintuitive',
    title: 'The birthday surprise',
    body: 'In a room of just $23$ people, it is more likely than not that two share a birthday. With $70$ people it is a near-certainty ($99.9\\%$). It feels impossible because you instinctively count matches to YOUR birthday, not the far larger number of pairs.',
  },
  pigeonhole: {
    type: 'counterintuitive',
    title: 'Two strangers, same hair count',
    body: 'A human head has at most ~$150{,}000$ hairs, but London has millions of people. With more people than possible hair-counts, at least two Londoners must have EXACTLY the same number of hairs. You can prove it without checking a single head.',
  },

  // ---------------- Algebra ----------------
  foil_binomials: {
    type: 'shortcut',
    title: 'Multiply near a round number',
    body: '$49 \\times 51$ looks ugly until you see it as $(50-1)(50+1) = 50^2 - 1 = 2499$. Difference of squares turns a hard multiplication into a square minus a tiny correction.',
  },
  square_binomial: {
    type: 'shortcut',
    title: 'Squaring numbers ending in 5',
    body: '$35^2$: take the front digit $3$, multiply by the next number up $4$ to get $12$, then tack on $25$ → $1225$. It works because $(10a+5)^2 = 100\\,a(a+1) + 25$.',
  },
  exponent_zero_negative: {
    type: 'counterintuitive',
    title: 'Why anything to the zero is 1',
    body: 'Walk the powers of $2$ DOWN: $8, 4, 2, \\dots$ each step halves. Keep going past $2^1=2$ and the pattern forces $2^0 = 1$, then $2^{-1} = \\tfrac12$. Zero and negative exponents are not special rules — they are the only way to keep the pattern unbroken.',
  },

  // ---------------- Geometry ----------------
  pythagorean: {
    type: 'pattern',
    title: 'Infinitely many perfect triangles',
    body: '$3,4,5$ is the famous right triangle with whole-number sides, but it is far from alone: $5,12,13$ and $8,15,17$ work too, and there are infinitely many. Every one hides inside the simple identity $(m^2-n^2)^2 + (2mn)^2 = (m^2+n^2)^2$.',
  },
  geo_angles_triangle: {
    type: 'counterintuitive',
    title: 'Triangles that break the 180 rule',
    body: 'A triangle\'s angles sum to $180°$ — but only on a flat surface. Draw one on a globe (equator up to the north pole and back) and the angles can sum to $270°$ or more. The "$180°$" you learned is a fact about flatness, not about triangles.',
  },
  geo_volume_cone: {
    type: 'pattern',
    title: 'Three cones fill a cylinder',
    body: 'A cone holds exactly one-third of the cylinder with the same base and height — pour three cone-fulls of water and the cylinder is full. The mysterious $\\tfrac13$ in the volume formula is just that fact written down.',
  },
  geo_circle_area: {
    type: 'wonder',
    title: 'Unrolling a circle',
    body: 'Slice a circle into thin wedges and lay them alternately like teeth of a zip — they form a near-rectangle of height $r$ and width half the circumference, $\\pi r$. Its area $\\pi r \\times r = \\pi r^2$. That is WHERE the formula comes from.',
  },

  // ---------------- Calculus & limits ----------------
  limit: {
    type: 'counterintuitive',
    title: 'Is 0.999… equal to 1?',
    body: 'Yes — exactly, not approximately. If $x = 0.999\\dots$ then $10x = 9.999\\dots$, so $10x - x = 9$, giving $9x = 9$ and $x = 1$. Two different-looking decimals can name the very same number.',
  },
  derivative: {
    type: 'wonder',
    title: 'Speed at a single instant',
    body: 'A speedometer shows your speed RIGHT NOW — but speed is distance over time, and at a single instant no time passes. The derivative resolves the paradox by watching the average speed over shorter and shorter intervals and seeing what value it closes in on.',
  },

  // ---------------- Decimals & fractions ----------------
  fraction_decimal_convert: {
    type: 'pattern',
    title: 'The sevenths carousel',
    body: '$\\tfrac17 = 0.\\overline{142857}$, and $\\tfrac27, \\tfrac37, \\dots$ all repeat those SAME six digits, just started at a different point on the loop. One little cycle, $142857$, generates them all.',
  },
};

function getCuriosity(conceptId) {
  return (conceptId && CURIOSITY[conceptId]) || null;
}

function hasCuriosity(conceptId) {
  return !!(conceptId && CURIOSITY[conceptId]);
}

// A random spark, optionally excluding one concept — for "did you know" interstitials / loaders.
function getRandomCuriosity(excludeConceptId) {
  const ids = Object.keys(CURIOSITY).filter((id) => id !== excludeConceptId);
  if (ids.length === 0) return null;
  const id = ids[Math.floor(Math.random() * ids.length)];
  return { conceptId: id, ...CURIOSITY[id] };
}

module.exports = { CURIOSITY, getCuriosity, hasCuriosity, getRandomCuriosity };
