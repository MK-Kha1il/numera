// Procedural Templates Engine for All Numera Levels (1-60)
const {
  factorial,
  gcd,
  lcm,
  isPrime,
  getPrimeFactors,
  getDivisors,
  generatePythagoreanTriple,
  generateQuadraticEquation,
  generateMatrix2x2,
  derangement
} = require('./symbolic');

const templates = {};

// Helper to choose a random item from an array
function choose(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------------------------------------------------
// ARITHMETIC TEMPLATES (Levels 1-10)
// -------------------------------------------------------------
templates.arithmetic = {
  1: (diffFactor, idx) => {
    const baseA = (idx % 5) + 2;
    const baseB = ((idx + 3) % 4) + 2;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const answer = a + b;
    const formulations = [
      `Compute the sum of the single-digit integers: $$${a} + ${b}$$`,
      `Evaluate the basic arithmetic sum: $$${a} + ${b}$$`,
      `Determine the total quantity: $$${a} + ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `To find the sum of $${a}$ and $${b}$, perform basic addition:\n$$${a} + ${b} = ${answer}$$`,
      type: "arithmetic_add"
    };
  },
  2: (diffFactor, idx) => {
    const baseA = (idx % 10) + 11;
    const baseB = ((idx + 4) % 7) + 3;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const answer = a + b;
    const formulations = [
      `Calculate the sum of the two integers: $$${a} + ${b}$$`,
      `Find the value of: $$${a} + ${b}$$`,
      `Determine the combined total: $$${a} + ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `Aligning the units and tens places:\n$$${a} + ${b} = ${answer}$$`,
      type: "arithmetic_add"
    };
  },
  3: (diffFactor, idx) => {
    // Double-digit addition (tens, no carry)
    const baseA = ((idx % 4) + 1) * 10 + 2;
    const baseB = (((idx + 2) % 3) + 1) * 10 + 5;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const answer = a + b;
    const formulations = [
      `Evaluate the summation: $$${a} + ${b}$$`,
      `Compute the double-digit sum: $$${a} + ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `Sum the units column: $${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}$.\nSum the tens column: $${Math.floor(a / 10)}0 + ${Math.floor(b / 10)}0 = ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10}$.\nThus:\n$$${a} + ${b} = ${answer}$$`,
      type: "arithmetic_add"
    };
  },
  4: (diffFactor, idx) => {
    // Multi-operand addition and subtraction
    const baseA = 20 + (idx % 15);
    const baseB = 10 + ((idx + 3) % 10);
    const baseC = 5 + ((idx + 1) % 5);
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const c = Math.round(baseC * diffFactor);
    const answer = a + b - c;
    const formulations = [
      `Evaluate the multi-operand arithmetic expression: $$${a} + ${b} - ${c}$$`,
      `Simplify the three-operand arithmetic progression: $$${a} + ${b} - ${c}$$`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `First, perform the addition:\n$$${a} + ${b} = ${a + b}$$\nSubsequently, subtract $${c}$:\n$$${a + b} - ${c} = ${answer}$$`,
      type: "arithmetic_mixed"
    };
  },
  5: (diffFactor, idx) => {
    // Double-digit addition with carrying
    const baseA = (idx % 30) + 25;
    const baseB = ((idx + 7) % 30) + 28;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const answer = a + b;
    return {
      question: `Evaluate the two-digit sum: $$${a} + ${b}$$`,
      answer,
      explanation: `Add the units column: $${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}$ (carry $1$ to the tens column).\nAdd the tens column with carry:\n$$${Math.floor(a / 10)}0 + ${Math.floor(b / 10)}0 + 10 = ${Math.floor(a / 10) * 10 + Math.floor(b / 10) * 10 + 10}$$\nCombined result:\n$$${a} + ${b} = ${answer}$$`,
      type: "arithmetic_add"
    };
  },
  6: (diffFactor, idx) => {
    // Double-digit subtraction with borrowing
    const baseA = ((idx % 4) + 5) * 10 + 2;
    const baseB = (((idx + 3) % 3) + 1) * 10 + 7;
    let a = Math.round(baseA * diffFactor);
    let b = Math.round(baseB * diffFactor);
    if (a < b) {
      const temp = a;
      a = b;
      b = temp;
    }
    const answer = a - b;
    return {
      question: `Evaluate the subtraction under borrowing: $$${a} - ${b}$$`,
      answer,
      explanation: `Since the units digit of the minuend ($${a % 10}$) is smaller than that of the subtrahend ($${b % 10}$), borrow $10$ from the tens column:\n$$10 + ${a % 10} - ${b % 10} = ${10 + (a % 10) - (b % 10)}$$\nThen subtract the tens column:\n$$${Math.floor(a / 10) - 1 - Math.floor(b / 10)}0$$\nThis yields:\n$$${a} - ${b} = ${answer}$$`,
      type: "arithmetic_sub"
    };
  },
  7: (diffFactor, idx) => {
    // Multiplication table
    const baseA = (idx % 8) + 2;
    const baseB = (((idx + 3) % 8) + 2);
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const answer = a * b;
    const formulations = [
      `Compute the product of the following values: $$${a} \\times ${b}$$`,
      `Evaluate the product: $$${a} \\times ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `Multiplication represents repeated addition. Adding $${a}$ to itself $${b}$ times yields:\n$$${a} \\times ${b} = ${answer}$$`,
      type: "arithmetic_mult"
    };
  },
  8: (diffFactor, idx) => {
    // Simple division
    const baseA = (idx % 8) + 2;
    const baseB = (((idx + 5) % 8) + 2);
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const dividend = a * b;
    return {
      question: `Evaluate the exact division: $$\\frac{${dividend}}{${a}}$$`,
      answer: b,
      explanation: `Division is the inverse operation of multiplication. Since $${a} \\times ${b} = ${dividend}$, it follows that:\n$$\\frac{${dividend}}{${a}} = ${b}$$`,
      type: "arithmetic_div"
    };
  },
  9: (diffFactor, idx) => {
    // Mixed operations (PEMDAS)
    const baseA = (idx % 6) + 3;
    const baseB = ((idx + 2) % 5) + 3;
    const baseC = ((idx + 4) % 15) + 5;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const c = Math.round(baseC * diffFactor);
    const answer = a * b + c;
    return {
      question: `Evaluate the arithmetic expression under standard precedence rules: $$${a} \\times ${b} + ${c}$$`,
      answer,
      explanation: `By the order of algebraic operations, perform multiplication before addition:\n$$${a} \\times ${b} = ${a * b}$$\nThen add the constant:\n$$${a * b} + ${c} = ${answer}$$`,
      type: "arithmetic_mixed"
    };
  },
  10: (diffFactor, idx) => {
    // Pythagorean Theorem Milestone
    const triple = generatePythagoreanTriple(diffFactor);
    const sa = triple.a;
    const sb = triple.b;
    const sc = triple.c;
    
    if (idx % 2 === 0) {
      return {
        question: `A right-angled triangle has perpendicular sides of length $a = ${sa}$ and $b = ${sb}$. Calculate the length of the hypotenuse $c$:`,
        answer: sc,
        explanation: `By the Pythagorean Theorem:\n$$c^2 = a^2 + b^2 = ${sa}^2 + ${sb}^2 = ${sa * sa} + ${sb * sb} = ${sc * sc}$$\nTaking the square root:\n$$c = \\sqrt{${sc * sc}} = ${sc}$$`,
        type: "pythagorean"
      };
    } else {
      return {
        question: `A right-angled triangle has a hypotenuse of length $c = ${sc}$ and one side $a = ${sa}$. Determine the length of the remaining side $b$:`,
        answer: sb,
        explanation: `By the Pythagorean Theorem:\n$$a^2 + b^2 = c^2 \\implies ${sa}^2 + b^2 = ${sc}^2$$\n$$${sa * sa} + b^2 = ${sc * sc} \\implies b^2 = ${sc * sc - sa * sa}$$\nTaking the square root:\n$$b = \\sqrt{${sc * sc - sa * sa}} = ${sb}$$`,
        type: "pythagorean"
      };
    }
  }
};

// -------------------------------------------------------------
// ALGEBRA TEMPLATES (Levels 11-20)
// -------------------------------------------------------------
templates.algebra = {
  11: (diffFactor, idx) => {
    const xVal = Math.round((idx % 8 + 2) * diffFactor);
    const a = Math.round((idx % 12 + 3) * diffFactor);
    const b = xVal + a;
    const formulations = [
      `Solve for the unknown variable $x$ in the linear relation: $$x + ${a} = ${b}$$`,
      `Find the root of the first-order algebraic equation: $$x + ${a} = ${b}$$`,
      `A shipping container holds $${b}$ tons of cargo. If $${a}$ tons are already loaded, find the remaining cargo capacity $x$ satisfying: $$x + ${a} = ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer: xVal,
      explanation: `Subtract $${a}$ from both sides to isolate $x$:\n$$x + ${a} - ${a} = ${b} - ${a}$$\n$$x = ${xVal}$$`,
      type: "linear_one_step_add",
      a, b
    };
  },
  12: (diffFactor, idx) => {
    const xVal = Math.round((idx % 8 + 2) * diffFactor);
    const a = Math.round((idx % 5 + 2) * diffFactor);
    const b = a * xVal;
    const formulations = [
      `Solve for $x$ in the multiplication equation: $$${a}x = ${b}$$`,
      `Determine the value of $x$ that satisfies the relation: $$${a}x = ${b}$$`
    ];
    return {
      question: choose(formulations),
      answer: xVal,
      explanation: `Divide both sides by the coefficient $${a}$ to isolate $x$:\n$$x = \\frac{${b}}{${a}} = ${xVal}$$`,
      type: "linear_one_step_mult",
      a, b
    };
  },
  13: (diffFactor, idx) => {
    // Two-step linear equation
    const xVal = Math.round((idx % 5 + 2) * diffFactor);
    const a = Math.round((idx % 4 + 2) * diffFactor);
    const b = Math.round((idx % 6 + 2) * diffFactor);
    const c = a * xVal + b;
    return {
      question: `Solve the two-step equation: $$${a}x + ${b} = ${c}$$`,
      answer: xVal,
      explanation: `Solve by isolating the variable term first:\n1. Subtract $${b}$ from both sides:\n$$${a}x = ${c} - ${b} = ${c - b}$$\n2. Divide by the coefficient $${a}$:\n$$x = \\frac{${c - b}}{${a}} = ${xVal}$$`,
      type: "linear_two_step"
    };
  },
  14: (diffFactor, idx) => {
    // Variable on both sides
    const xVal = Math.round((idx % 5 + 1) * diffFactor);
    const a = Math.round((idx % 3 + 4) * diffFactor);
    const c = Math.round((idx % 3 + 1) * diffFactor);
    const b = Math.round((idx % 5 + 2) * diffFactor);
    const d = (a - c) * xVal + b;
    return {
      question: `Determine $x$ for the algebraic expression: $$${a}x - ${b} = ${c}x + ${d - b}$$`,
      answer: xVal,
      explanation: `1. Group variables on the left side by subtracting $${c}x$:\n$$(${a} - ${c})x - ${b} = ${d - b} \\implies ${a - c}x - ${b} = ${d - b}$$\n2. Add $${b}$ to both sides to isolate the variable:\n$$${a - c}x = ${d}$$\n3. Divide by the coefficient:\n$$x = \\frac{${d}}{${a - c}} = ${xVal}$$`,
      type: "linear_variable_both_sides"
    };
  },
  15: (diffFactor, idx) => {
    // Quadratic equation
    const quad = generateQuadraticEquation(diffFactor);
    const sum = quad.a + quad.x2; // dummy
    const coeffB = quad.a + quad.x2; // let's stick to simple form
    const sumRoots = quad.x1 + quad.x2;
    const prodRoots = quad.x1 * quad.x2;
    // x^2 - (x1+x2)x + x1*x2 = 0
    const bStr = sumRoots < 0 ? `+ ${Math.abs(sumRoots)}` : `- ${sumRoots}`;
    const cStr = prodRoots < 0 ? `- ${Math.abs(prodRoots)}` : `+ ${prodRoots}`;
    
    return {
      question: `Find the larger root of the quadratic equation: $$x^2 ${bStr}x ${cStr} = 0$$`,
      answer: quad.larger,
      explanation: `We can factor the quadratic equation into linear binomials:\n$$(x - ${quad.x1})(x - ${quad.x2}) = 0$$\nThe roots are $x = ${quad.x1}$ and $x = ${quad.x2}$. The larger value is $${quad.larger}$.`,
      type: "quadratic",
      x1: quad.x1,
      x2: quad.x2
    };
  },
  16: (diffFactor, idx) => {
    // System of two linear equations
    const xVal = Math.round((idx % 5 + 3) * diffFactor);
    const yVal = Math.round((idx % 5 + 1) * diffFactor);
    const s = xVal + yVal;
    const d = xVal - yVal;
    return {
      question: `Solve the system of equations for the variable $x$:\n$$x + y = ${s}$$\n$$x - y = ${d}$$`,
      answer: xVal,
      explanation: `Add the two linear equations together to eliminate the variable $y$:\n$$(x + y) + (x - y) = ${s} + ${d} \\implies 2x = ${s + d}$$\nDivide by 2 to solve for $x$:\n$$x = \\frac{${s + d}}{2} = ${xVal}$$`,
      type: "linear_system"
    };
  },
  17: (diffFactor, idx) => {
    // Trace of 2x2 matrix
    const matrix = generateMatrix2x2(diffFactor);
    return {
      question: `Compute the trace of the square matrix $A$: $$A = \\begin{pmatrix} ${matrix.a} & ${matrix.c} \\\\ ${matrix.d} & ${matrix.b} \\end{pmatrix}$$`,
      answer: matrix.trace,
      explanation: `The trace of a square matrix $\\text{tr}(A)$ is the sum of its main diagonal elements:\n$$\\text{tr}(A) = a_{11} + a_{22} = ${matrix.a} + ${matrix.b} = ${matrix.trace}$$`,
      type: "matrix_trace"
    };
  },
  18: (diffFactor, idx) => {
    // Determinant of 2x2 matrix (positive entries)
    const a = Math.round((idx % 4 + 1) * diffFactor);
    const b = Math.round(((idx + 2) % 3 + 1) * diffFactor);
    const c = Math.round(((idx + 1) % 3 + 1) * diffFactor);
    const d = Math.round(((idx + 3) % 4 + 1) * diffFactor);
    const answer = a * d - b * c;
    return {
      question: `Determine the determinant of the $2 \\times 2$ matrix $A$: $$A = \\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$$`,
      answer,
      explanation: `The determinant of a $2 \\times 2$ matrix is defined by the formula $\\det(A) = ad - bc$:\n$$\\det(A) = (${a} \\cdot ${d}) - (${b} \\cdot ${c}) = ${a * d} - ${b * c} = ${answer}$$`,
      type: "matrix_determinant"
    };
  },
  19: (diffFactor, idx) => {
    // Determinant with negative entries
    const a = Math.round((idx % 6 - 3) * diffFactor);
    const b = Math.round(((idx + 1) % 6 - 3) * diffFactor);
    const c = Math.round(((idx + 3) % 6 - 3) * diffFactor);
    const d = Math.round(((idx + 5) % 6 - 3) * diffFactor);
    const answer = a * d - b * c;
    return {
      question: `Determine the determinant of the $2 \\times 2$ matrix $A$ (incorporating negative values): $$A = \\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}$$`,
      answer,
      explanation: `Applying the determinant formula $\\det(A) = ad - bc$:\n$$\\det(A) = (${a} \\cdot ${d}) - (${b} \\cdot ${c}) = ${a * d} - (${b * c}) = ${answer}$$`,
      type: "matrix_determinant"
    };
  },
  20: (diffFactor, idx) => {
    // Fermat's Little Theorem Milestone
    const primes = [7, 11, 13, 17, 19];
    const p = primes[idx % primes.length];
    const bases = [2, 3, 5];
    const a = bases[idx % bases.length];
    
    if (idx % 2 === 0) {
      return {
        question: `Using Fermat's Little Theorem, simplify the modular congruence relation: $$${a}^{${p - 1}} \\pmod{${p}}$$`,
        answer: 1,
        explanation: `Fermat's Little Theorem states that if $p$ is a prime number and $\\gcd(a, p) = 1$, then:\n$$a^{p-1} \\equiv 1 \\pmod{p}$$\nSince $${p}$ is prime and $\\gcd(${a}, ${p}) = 1$, we immediately obtain:\n$$${a}^{${p - 1}} \\equiv 1 \\pmod{${p}}$$`,
        type: "fermat_little"
      };
    } else {
      return {
        question: `Evaluate the modular exponential: $$${a}^{${p}} \\pmod{${p}}$$`,
        answer: a,
        explanation: `Fermat's Little Theorem states that for any prime $p$ and integer $a$:\n$$a^p \\equiv a \\pmod{p}$$\nTherefore, we have:\n$$${a}^{${p}} \\equiv ${a} \\pmod{${p}}$$`,
        type: "fermat_little"
      };
    }
  }
};

// -------------------------------------------------------------
// COMBINATORICS TEMPLATES (Levels 21-30)
// -------------------------------------------------------------
templates.combinatorics = {
  21: (diffFactor, idx) => {
    // Basic Pigeonhole Principle
    const pigeonholes = Math.round(((idx % 3) + 3) * diffFactor);
    const formulations = [
      `Given containers holding marbles of $${pigeonholes}$ distinct colors, what is the minimum number of marbles that must be drawn to guarantee that at least 2 marbles share the same color?`,
      `A drawer has socks of $${pigeonholes}$ different colors. What is the minimum number of socks that must be drawn to guarantee at least one matching pair (2 of the same color)?`
    ];
    return {
      question: choose(formulations),
      answer: pigeonholes + 1,
      explanation: `By Dirichlet's Pigeonhole Principle, drawing $k + 1$ items from $k = ${pigeonholes}$ color classes guarantees a repeat:\n$$\\text{Minimum draws} = k + 1 = ${pigeonholes} + 1 = ${pigeonholes + 1}$$`,
      type: "pigeonhole"
    };
  },
  22: (diffFactor, idx) => {
    // Advanced Pigeonhole Principle
    const pigeonholes = Math.round(((idx % 5) + 6) * diffFactor);
    return {
      question: `A collection consists of cards belonging to $${pigeonholes}$ distinct categories. Determine the minimum number of card selections required to guarantee that at least 2 cards are from the same category:`,
      answer: pigeonholes + 1,
      explanation: `By the Pigeonhole Principle, to guarantee that at least one category contains $\\ge 2$ cards when there are $k = ${pigeonholes}$ categories, we must draw:\n$$\\text{Minimum selections} = k + 1 = ${pigeonholes} + 1 = ${pigeonholes + 1}$$`,
      type: "pigeonhole"
    };
  },
  23: (diffFactor, idx) => {
    // Basic Permutations (n!)
    const n = Math.min(6, Math.max(3, Math.round(((idx % 3) + 4) * diffFactor)));
    const formulations = [
      `In how many distinct ways can $${n}$ unique mathematics textbooks be arranged in a row on a bookshelf?`,
      `A group of $${n}$ students is standing in a single-file line. How many unique line orderings are possible?`,
      `How many different ways can $${n}$ distinct paintings be displayed side-by-side on a wall?`
    ];
    return {
      question: choose(formulations),
      answer: factorial(n),
      explanation: `The number of linear arrangements (permutations) of $n$ unique items is given by $n!$:\n$$${n}! = ${factorial(n)}$$`,
      type: "permutations"
    };
  },
  24: (diffFactor, idx) => {
    // Repeating letters permutations
    const words = [
      { word: "EULER", len: 5, ans: 60, exp: "5! / 2! (since E repeats 2 times)" },
      { word: "GAUSS", len: 5, ans: 60, exp: "5! / 2! (since S repeats 2 times)" },
      { word: "ALDO", len: 4, ans: 12, exp: "4! / 2! (since L and D are unique, wait, ALDO is unique? Ah, ALDO has 4 unique letters, wait, ans=12? Ah, if L repeats? No, no repeat. Wait, the original code had ALDO ans 12. Let's fix that: ALDO is unique so 4! = 24. Let's stick to GAUSS/EULER or correct ones.)" },
      { word: "LEIBNIZ", len: 7, ans: 2520, exp: "7! / 2! (since I repeats 2 times)" },
      { word: "FERMAT", len: 6, ans: 720, exp: "6! (all letters are unique)" }
    ];
    const w = words[idx % words.length];
    // fix ALDO logic to be mathematically perfect
    const len = w.word.length;
    let dupFactor = 1;
    if (w.word === "EULER") dupFactor = 2; // E repeats twice
    if (w.word === "GAUSS") dupFactor = 2; // S repeats twice
    if (w.word === "LEIBNIZ") dupFactor = 2; // I repeats twice
    const ans = factorial(len) / dupFactor;

    return {
      question: `How many distinct permutations can be formed using the letters of the word $\\text{"${w.word}"}$?`,
      answer: ans,
      explanation: `Using the multiset permutation formula:\n$$P = \\frac{N!}{\\prod n_i!} = \\frac{${len}!}{${dupFactor}!} = ${ans}$$`,
      type: "permutations"
    };
  },
  25: (diffFactor, idx) => {
    // Combinations (n choose k)
    const n = Math.round(((idx % 4) + 5) * diffFactor);
    const k = 2;
    return {
      question: `Evaluate the binomial coefficient representation for selecting $${k}$ items from $${n}$ distinct items: $$\\binom{${n}}{${k}}$$`,
      answer: (n * (n - 1)) / 2,
      explanation: `By the combination formula:\n$$\\binom{${n}}{2} = \\frac{${n}!}{2!(${n}-2)!} = \\frac{${n}(${n}-1)}{2} = ${(n * (n - 1)) / 2}$$`,
      type: "combinations"
    };
  },
  26: (diffFactor, idx) => {
    // Handshakes / tournament games
    const n = Math.round(((idx % 7) + 9) * diffFactor);
    const formulations = [
      `In a conference room of $${n}$ researchers, if each person shakes hands with every other person exactly once, what is the total number of handshakes?`,
      `A round-robin chess tournament has $${n}$ players. If every player plays a single match against every other player, how many total matches are scheduled?`
    ];
    return {
      question: choose(formulations),
      answer: (n * (n - 1)) / 2,
      explanation: `This is equivalent to choosing subsets of size 2 from a set of size $n = ${n}$:\n$$\\binom{${n}}{2} = \\frac{${n}(${n}-1)}{2} = ${(n * (n - 1)) / 2}$$`,
      type: "combinations"
    };
  },
  27: (diffFactor, idx) => {
    // Coin flips sample space
    const flips = Math.min(5, Math.max(3, Math.round(((idx % 3) + 3) * diffFactor)));
    return {
      question: `What is the total number of unique outcomes in the sample space when flipping $${flips}$ fair, independent coins?`,
      answer: Math.pow(2, flips),
      explanation: `Since each coin flip has 2 independent outcomes (Heads or Tails), the size of the combined sample space for $${flips}$ flips is:\n$$2^{${flips}} = ${Math.pow(2, flips)}$$`,
      type: "probability"
    };
  },
  28: (diffFactor, idx) => {
    // Circular permutations
    const n = Math.min(6, Math.max(4, Math.round(((idx % 3) + 4) * diffFactor)));
    return {
      question: `Determine the number of distinct ways to arrange $${n}$ people around a circular dining table (where rotations are considered equivalent):`,
      answer: factorial(n - 1),
      explanation: `For circular permutations of $n$ objects, fixing one object's position yields $(n-1)!$ unique relative orderings:\n$$(${n}-1)! = ${factorial(n - 1)}$$`,
      type: "permutations"
    };
  },
  29: (diffFactor, idx) => {
    // Stars and Bars
    const tokens = Math.round(((idx % 3) + 5) * diffFactor);
    const answer = ((tokens - 1) * (tokens - 2)) / 2;
    return {
      question: `How many ways can we distribute $${tokens}$ identical tokens into $3$ distinct boxes such that each box receives at least 1 token?`,
      answer,
      explanation: `By the Stars and Bars theorem (positive integer partitions), distributing $n = ${tokens}$ items into $k = 3$ bins is equivalent to choosing $k-1 = 2$ dividers from $n-1 = ${tokens - 1}$ slots:\n$$\\binom{${tokens}-1}{2} = \\frac{(${tokens}-1)(${tokens}-2)}{2} = ${answer}$$`,
      type: "combinations"
    };
  },
  30: (diffFactor, idx) => {
    // Binomial Theorem Coefficient Milestone
    const terms = [
      { n: 3, k: 1, text: "x^2 y", coeff: 3 },
      { n: 4, k: 2, text: "x^2 y^2", coeff: 6 },
      { n: 5, k: 1, text: "x^4 y", coeff: 5 },
      { n: 4, k: 1, text: "x^3 y", coeff: 4 }
    ];
    if (idx % 2 === 0) {
      const choice = terms[idx % terms.length];
      return {
        question: `Find the coefficient of the $${choice.text}$ term in the expansion of $(x+y)^{${choice.n}}$:`,
        answer: choice.coeff,
        explanation: `By the Binomial Theorem, the coefficient of the term $x^{n-k}y^k$ in the expansion of $(x+y)^n$ is $\\binom{n}{k}$:\n$$\\binom{${choice.n}}{${choice.k}} = \\frac{${choice.n}!}{${choice.k}!(${choice.n}-${choice.k})!} = ${choice.coeff}$$`,
        type: "binomial"
      };
    } else {
      const n = (idx % 3) + 3;
      const answer = Math.pow(2, n);
      return {
        question: `Determine the sum of all coefficients in the algebraic expansion of $(x+y)^{${n}}$:`,
        answer,
        explanation: `The sum of binomial coefficients $\\sum_{k=0}^n \\binom{n}{k}$ is found by substituting $x=1$ and $y=1$ directly into $(x+y)^n$:\n$$(1+1)^{${n}} = 2^{${n}} = ${answer}$$`,
        type: "binomial"
      };
    }
  }
};

// -------------------------------------------------------------
// CALCULUS TEMPLATES (Levels 31-40)
// -------------------------------------------------------------
templates.calculus = {
  31: (diffFactor, idx) => {
    const coeff = Math.round(((idx % 4) + 2) * diffFactor);
    const power = Math.round(((idx % 3) + 2) * diffFactor);
    const answer = coeff * power;
    const formulations = [
      `Find the derivative $f'(1)$ for the power function: $$f(x) = ${coeff}x^${power}$$`,
      `An object's position is given by the function $s(t) = ${coeff}t^${power}$. Determine its instantaneous velocity at $t = 1$:`
    ];
    return {
      question: choose(formulations),
      answer,
      explanation: `By the Power Rule, the derivative of $a x^n$ is $a \\cdot n x^{n-1}$:\n$$f'(x) = ${coeff * power} x^${power - 1}$$\nEvaluating at $x = 1$:\n$$f'(1) = ${coeff * power} (1)^${power - 1} = ${answer}$$`,
      type: "derivative"
    };
  },
  32: (diffFactor, idx) => {
    // Derivative of polynomial
    const a = Math.round(((idx % 3) + 2) * diffFactor);
    const b = Math.round(((idx % 3) + 1) * diffFactor);
    const answer = a * 3 + b * 2;
    return {
      question: `Determine the derivative value $f'(1)$ for the function: $$f(x) = ${a}x^3 + ${b}x^2$$`,
      answer,
      explanation: `Differentiate each term of the polynomial using the power rule:\n$$f'(x) = 3 \\cdot ${a}x^2 + 2 \\cdot ${b}x = ${a * 3}x^2 + ${b * 2}x$$\nEvaluating at $x = 1$:\n$$f'(1) = ${a * 3}(1)^2 + ${b * 2}(1) = ${answer}$$`,
      type: "derivative"
    };
  },
  33: (diffFactor, idx) => {
    // Tangent slope at x_0
    const a = Math.round(((idx % 3) + 2) * diffFactor);
    const x0 = 2;
    const answer = a * 2 * x0;
    return {
      question: `Determine the slope of the tangent line to $f(x) = ${a}x^2$ at $x = ${x0}$:`,
      answer,
      explanation: `The slope of the tangent line is the derivative evaluated at that point. Since $f'(x) = ${a * 2}x$:\n$$f'(${x0}) = ${a * 2}(${x0}) = ${answer}$$`,
      type: "derivative"
    };
  },
  34: (diffFactor, idx) => {
    // Derivative of simple trigonometric addition at x=0
    const a = Math.round(((idx % 5) + 3) * diffFactor);
    const b = Math.round(((idx % 4) + 1) * diffFactor);
    const answer = a + b;
    return {
      question: `Calculate $f'(0)$ for the function: $$f(x) = ${a}\\sin(x) + ${b}x$$`,
      answer,
      explanation: `Differentiate using the sum rule, knowing that $(\\sin(x))' = \\cos(x)$:\n$$f'(x) = ${a}\\cos(x) + ${b}$$\nEvaluating at $x = 0$ (since $\\cos(0) = 1$):\n$$f'(0) = ${a}(1) + ${b} = ${answer}$$`,
      type: "derivative"
    };
  },
  35: (diffFactor, idx) => {
    // Definite integral of constant
    const c = Math.round(((idx % 5) + 3) * diffFactor);
    const upper = Math.round(((idx % 3) + 2) * diffFactor);
    const answer = c * upper;
    return {
      question: `Evaluate the definite integral of the constant function: $$\\int_0^{${upper}} ${c} \\, dx$$`,
      answer,
      explanation: `The antiderivative of a constant $c$ is $F(x) = cx$:\n$$\\int_0^{${upper}} ${c} \\, dx = \\left[ ${c}x \\right]_0^{${upper}} = ${c}(${upper}) - 0 = ${answer}$$`,
      type: "integral"
    };
  },
  36: (diffFactor, idx) => {
    // Definite integral of linear function
    const a = Math.round(((idx % 3) + 2) * diffFactor);
    const upper = Math.round(((idx % 3) + 2) * diffFactor);
    const coeff = 2 * a;
    const answer = a * upper * upper;
    return {
      question: `Evaluate the definite Riemann integral: $$\\int_0^{${upper}} ${coeff}x \\, dx$$`,
      answer,
      explanation: `The antiderivative of $c x$ is $F(x) = \\frac{c}{2} x^2$:\n$$F(x) = \\frac{${coeff}}{2} x^2 = ${a}x^2$$\nEvaluating from $0$ to $${upper}$:\n$$F(${upper}) - F(0) = ${a}(${upper})^2 - 0 = ${answer}$$`,
      type: "integral"
    };
  },
  37: (diffFactor, idx) => {
    // Average value of function
    const a = Math.round(((idx % 3) + 1) * diffFactor);
    const b = Math.round(((idx % 2) + 2) * diffFactor);
    const answer = a * b * b;
    return {
      question: `Find the average value of the function $f(x) = ${3 * a}x^2$ over the interval $[0, ${b}]$:`,
      answer,
      explanation: `The average value of a function over $[0, b]$ is given by $\\frac{1}{b} \\int_0^b f(x) \\, dx$. First, integrate:\n$$\\int_0^{${b}} ${3 * a}x^2 \\, dx = \\left[ ${a}x^3 \\right]_0^{${b}} = ${a}(${b})^3 = ${a * b * b * b}$$\nThen divide by the interval length $b$:\n$$\\text{Average} = \\frac{${a * b * b * b}}{${b}} = ${answer}$$`,
      type: "integral"
    };
  },
  38: (diffFactor, idx) => {
    // Sequence limits rational linear
    const factor = Math.round(((idx % 3) + 2) * diffFactor);
    const a = 2 * factor;
    const b = Math.round(((idx % 4) + 1) * diffFactor);
    return {
      question: `Determine the limit of the rational sequence as $n \\to \\infty$: $$\\lim_{n \\to \\infty} \\frac{${a}n + ${b}}{2n - 1}$$`,
      answer: factor,
      explanation: `Divide numerator and denominator by the highest power of $n$ (which is $n^1$):\n$$\\lim_{n \\to \\infty} \\frac{${a} + ${b}/n}{2 - 1/n} = \\frac{${a} + 0}{2 - 0} = ${factor}$$`,
      type: "limit"
    };
  },
  39: (diffFactor, idx) => {
    // Sequence limits rational quadratic
    const b = Math.round(((idx % 2) + 2) * diffFactor);
    const a = b * Math.round(((idx % 3) + 2) * diffFactor);
    return {
      question: `Determine the limit of the rational sequence as $n \\to \\infty$: $$\\lim_{n \\to \\infty} \\frac{${a}n^2 + 5}{${b}n^2 - 2}$$`,
      answer: a / b,
      explanation: `Divide both parts by $n^2$:\n$$\\lim_{n \\to \\infty} \\frac{${a} + 5/n^2}{${b} - 2/n^2} = \\frac{${a} + 0}{${b} - 0} = ${a / b}$$`,
      type: "limit"
    };
  },
  40: (diffFactor, idx) => {
    // Fundamental Theorem of Calculus Milestone
    const integrals = [
      { f: "2x", F: "x^2", a: 1, b: 3, ans: 8 },
      { f: "3x^2", F: "x^3", a: 0, b: 2, ans: 8 },
      { f: "4x^3", F: "x^4", a: 0, b: 2, ans: 16 },
      { f: "6x", F: "3x^2", a: 1, b: 2, ans: 9 },
      { f: "3x^2", F: "x^3", a: 1, b: 3, ans: 26 }
    ];
    const choice = integrals[idx % integrals.length];
    return {
      question: `Evaluate the definite integral using the Fundamental Theorem of Calculus: $$\\int_{${choice.a}}^{${choice.b}} ${choice.f} \\, dx$$`,
      answer: choice.ans,
      explanation: `By the Fundamental Theorem of Calculus:\n$$\\int_a^b f(x) \\, dx = F(b) - F(a)$$\nFor $f(x) = ${choice.f}$, the antiderivative is $F(x) = ${choice.F}$. Evaluating at bounds:\n$$F(${choice.b}) - F(${choice.a}) = ${choice.ans}$$`,
      type: "integral"
    };
  }
};

// -------------------------------------------------------------
// NUMBER THEORY TEMPLATES (Levels 41-50, 60)
// -------------------------------------------------------------
templates.number_theory = {
  41: (diffFactor, idx) => {
    // GCD Euclidean smaller
    const mult = Math.round(((idx % 4) + 2) * diffFactor);
    const a = 2 * mult;
    const b = 3 * mult;
    return {
      question: `Compute the Greatest Common Divisor: $$\\gcd(${a}, ${b})$$`,
      answer: mult,
      explanation: `Since $${a} = 2 \\cdot ${mult}$ and $${b} = 3 \\cdot ${mult}$, and $2$ and $3$ share no common factors (coprime), the Greatest Common Divisor is $${mult}$.`,
      type: "gcd"
    };
  },
  42: (diffFactor, idx) => {
    // GCD Euclidean larger
    const mult = Math.round(((idx % 5) + 6) * diffFactor);
    const a = 3 * mult;
    const b = 4 * mult;
    return {
      question: `Determine the Greatest Common Divisor: $$\\gcd(${a}, ${b})$$`,
      answer: mult,
      explanation: `Apply the Euclidean Division Algorithm:\n$$${b} = 1 \\cdot ${a} + ${mult}$$\n$$${a} = 3 \\cdot ${mult} + 0$$\nThe last non-zero remainder is the GCD, which is $${mult}$.`,
      type: "gcd"
    };
  },
  43: (diffFactor, idx) => {
    // Modular addition
    const a = Math.round(((idx % 20) + 15) * diffFactor);
    const b = Math.round(((idx % 20) + 10) * diffFactor);
    const mod = Math.round(((idx % 6) + 7) * diffFactor);
    const answer = (a + b) % mod;
    return {
      question: `Evaluate the modular addition: $$(${a} + ${b}) \\pmod{${mod}}$$`,
      answer,
      explanation: `First, sum the values: $${a} + ${b} = ${a + b}$. Dividing by the modulus $${mod}$ gives a remainder of $${answer}$:\n$$${a + b} \\equiv ${answer} \\pmod{${mod}}$$`,
      type: "modulo",
      mod
    };
  },
  44: (diffFactor, idx) => {
    // Modular multiplication
    const a = Math.round(((idx % 8) + 5) * diffFactor);
    const b = Math.round(((idx % 8) + 4) * diffFactor);
    const mod = Math.round(((idx % 5) + 6) * diffFactor);
    const answer = (a * b) % mod;
    return {
      question: `Evaluate the modular multiplication: $$(${a} \\times ${b}) \\pmod{${mod}}$$`,
      answer,
      explanation: `Compute the product: $${a} \\times ${b} = ${a * b}$. Modulo division by $${mod}$ yields the remainder:\n$$${a * b} \\equiv ${answer} \\pmod{${mod}}$$`,
      type: "modulo",
      mod
    };
  },
  45: (diffFactor, idx) => {
    // Modular exponentiation smaller
    const base = [2, 3, 5][idx % 3];
    const power = 3;
    const mod = Math.round(((idx % 4) + 6) * diffFactor);
    const answer = Math.pow(base, power) % mod;
    return {
      question: `Evaluate the modular exponent: $$${base}^{${power}} \\pmod{${mod}}$$`,
      answer,
      explanation: `Compute the power: $${base}^{${power}} = ${Math.pow(base, power)}$. Dividing by $${mod}$ yields a remainder of $${answer}$:\n$$${Math.pow(base, power)} \\equiv ${answer} \\pmod{${mod}}$$`,
      type: "modulo",
      mod
    };
  },
  46: (diffFactor, idx) => {
    // Modular exponentiation larger
    const base = [2, 3][idx % 2];
    const power = Math.round(((idx % 2) + 4) * diffFactor);
    const mod = Math.round(((idx % 4) + 7) * diffFactor);
    const answer = Math.pow(base, power) % mod;
    return {
      question: `Evaluate the modular exponent: $$${base}^{${power}} \\pmod{${mod}}$$`,
      answer,
      explanation: `Calculate the power: $${base}^{${power}} = ${Math.pow(base, power)}$. Dividing by $${mod}$ yields the remainder $${answer}$:\n$$${Math.pow(base, power)} \\equiv ${answer} \\pmod{${mod}}$$`,
      type: "modulo",
      mod
    };
  },
  47: (diffFactor, idx) => {
    // Number of positive divisors
    const primes = [
      { p: 2, q: 3, n: 12, ans: 6, exp: "12 = 2^2 \\times 3. \\text{Divisors} = (2+1)(1+1) = 6" },
      { p: 3, q: 2, n: 18, ans: 6, exp: "18 = 2 \\times 3^2. \\text{Divisors} = (1+1)(2+1) = 6" },
      { p: 2, q: 5, n: 20, ans: 6, exp: "20 = 2^2 \\times 5. \\text{Divisors} = (2+1)(1+1) = 6" },
      { p: 2, q: 7, n: 28, ans: 6, exp: "28 = 2^2 \\times 7. \\text{Divisors} = (2+1)(1+1) = 6" }
    ];
    const choice = primes[idx % primes.length];
    return {
      question: `Determine the total number of positive divisors of the integer $${choice.n}$:`,
      answer: choice.ans,
      explanation: `Factor $${choice.n}$ into prime factorization:\n$$${choice.exp.split(".")[0]}$$\nUsing divisor formula $\\prod (e_i + 1)$:\n$$${choice.exp.split("Divisors = ")[1]}$$`,
      type: "divisors"
    };
  },
  48: (diffFactor, idx) => {
    // Totient of prime
    const primes = [11, 13, 17, 19, 23, 29];
    const p = primes[idx % primes.length];
    return {
      question: `Evaluate the Euler totient function $\\phi(${p})$ for the prime $${p}$:`,
      answer: p - 1,
      explanation: `For any prime number $p$, all integers less than $p$ are coprime to it. Thus:\n$$\\phi(${p}) = ${p} - 1 = ${p - 1}$$`,
      type: "totient"
    };
  },
  49: (diffFactor, idx) => {
    // Totient of composite
    const p = [5, 7][idx % 2];
    const q = [11, 13, 17][(idx + 1) % 3];
    const actualQ = p === q ? 11 : q;
    const n = p * actualQ;
    const answer = (p - 1) * (actualQ - 1);
    return {
      question: `Evaluate the Euler totient function $\\phi(${n})$, where $${n} = ${p} \\times ${actualQ}$:`,
      answer,
      explanation: `Since $${p}$ and $${actualQ}$ are distinct primes (coprime), the totient function is multiplicative:\n$$\\phi(${n}) = \\phi(${p}) \\cdot \\phi(${actualQ}) = (${p}-1)(${actualQ}-1) = ${p - 1} \\times ${actualQ - 1} = ${answer}$$`,
      type: "totient"
    };
  },
  50: (diffFactor, idx) => {
    // Euler's Totient Theorem Milestone
    const primes = [3, 5, 7];
    const p = primes[idx % primes.length];
    const q = [11, 13][idx % 2];
    const N = p * q;
    const totient = (p - 1) * (q - 1);
    
    if (idx % 2 === 0) {
      return {
        question: `Calculate the value of Euler's totient function $\\phi(${N})$ for the product of primes $${p} \\times ${q}$:`,
        answer: totient,
        explanation: `Using the multiplicative property of Euler's totient function for coprime factors:\n$$\\phi(${N}) = \\phi(${p}) \\cdot \\phi(${q}) = (${p}-1)(${q}-1) = ${totient}$$`,
        type: "totient"
      };
    } else {
      const base = 3;
      return {
        question: `Using Euler's Totient Theorem, evaluate the modular exponentiation (note: $\\gcd(${base}, ${N})=1$): $$${base}^{\\phi(${N})} \\pmod{${N}}$$`,
        answer: 1,
        explanation: `Euler's Totient Theorem states that if $\\gcd(a, n) = 1$, then:\n$$a^{\\phi(n)} \\equiv 1 \\pmod{n}$$\nSince $\\gcd(${base}, ${N}) = 1$, it follows immediately that:\n$$${base}^{\\phi(${N})} \\equiv 1 \\pmod{${N}}$$`,
        type: "euler_totient"
      };
    }
  },
  60: (diffFactor, idx) => {
    // Euler's Identity Milestone
    if (idx % 2 === 0) {
      return {
        question: `Evaluate the complex expression derived from Euler's Identity: $$e^{i\\pi} + 5$$`,
        answer: 4,
        explanation: `By Euler's Identity, $e^{i\\pi} = -1$. Substituting this value into the expression yields:\n$$-1 + 5 = 4$$`,
        type: "euler_identity"
      };
    } else {
      return {
        question: `Simplify the complex value: $$e^{2i\\pi} - 1$$`,
        answer: 0,
        explanation: `Using Euler's formula, $e^{i\\theta} = \\cos(\\theta) + i\\sin(\\theta)$. For $\\theta = 2\\pi$:\n$$e^{2i\\pi} = \\cos(2\\pi) + i\\sin(2\\pi) = 1 + 0 = 1$$\nSubtracting yields $1 - 1 = 0$.`,
        type: "euler_identity"
      };
    }
  }
};

// -------------------------------------------------------------
// MENTAL TEMPLATES (Levels 1-10)
// -------------------------------------------------------------
templates.mental = {
  1: (diffFactor, idx) => {
    const a = Math.round((idx % 5 + 1) * 10 * diffFactor);
    const b = Math.round((idx % 4 + 1) * 5 * diffFactor);
    const isSub = idx % 2 === 0;
    if (isSub) {
      return {
        question: `Calculate mentally: $$${a + b} - ${b}$$`,
        answer: a,
        explanation: `Subtracting the multiples of 5 and 10:\n$$${a + b} - ${b} = ${a}$$`,
        type: "mental_sub"
      };
    } else {
      return {
        question: `Calculate mentally: $$${a} + ${b}$$`,
        answer: a + b,
        explanation: `Adding mentally:\n$$${a} + ${b} = ${a + b}$$`,
        type: "mental_add"
      };
    }
  },
  2: (diffFactor, idx) => {
    // Simple percentages
    const base = Math.round((idx % 5 + 1) * 20 * diffFactor / 10) * 10;
    const pct = [10, 25, 50, 75][idx % 4];
    return {
      question: `Evaluate the percentage of the base value: $${pct}\\%$ of $${base}$`,
      answer: (pct / 100) * base,
      explanation: `Convert the percentage into a fraction and multiply:\n$$\\text{Value} = \\frac{${pct}}{100} \\times ${base} = ${(pct / 100) * base}$$`,
      type: "percentage",
      mod: base // metadata
    };
  },
  3: (diffFactor, idx) => {
    // Tricky percentages
    const base = Math.round((idx % 5 + 2) * 50 * diffFactor / 10) * 10;
    const pct = [15, 35, 60, 80][idx % 4];
    return {
      question: `Calculate mentally: $${pct}\\%$ of $${base}$`,
      answer: (pct / 100) * base,
      explanation: `Break down the percentage calculations into parts (e.g. $10\\% + 5\\%$ or $50\\% + 10\\%$):\n$$${pct}\\% \\times ${base} = ${(pct / 100) * base}$$`,
      type: "percentage",
      mod: base
    };
  },
  4: (diffFactor, idx) => {
    // Multiplying by 11, 5, 9
    const a = Math.round((idx % 15 + 12) * diffFactor);
    const mult = [5, 9, 11][idx % 3];
    const answer = a * mult;
    return {
      question: `Multiply mentally: $$${a} \\times ${mult}$$`,
      answer,
      explanation: `Mental shortcut:\n- Multiplying by 5: halve the number and multiply by 10.\n- Multiplying by 9: multiply by 10 and subtract the number.\n- Multiplying by 11: multiply by 10 and add the number.\n$$${a} \\times ${mult} = ${answer}$$`,
      type: "mental_mult"
    };
  },
  5: (diffFactor, idx) => {
    // Squaring 11..20
    const num = Math.round((idx % 10 + 11) * diffFactor);
    return {
      question: `Evaluate the square of the integer: $$${num}^2$$`,
      answer: num * num,
      explanation: `Multiplying the value by itself:\n$$${num} \\times ${num} = ${num * num}$$`,
      type: "mental_square"
    };
  },
  6: (diffFactor, idx) => {
    // Cubing single digit
    const num = Math.round((idx % 5 + 4) * diffFactor);
    return {
      question: `Evaluate the cube of the integer: $$${num}^3$$`,
      answer: num * num * num,
      explanation: `Multiply the value three times:\n$$${num} \\times ${num} \\times ${num} = ${num * num * num}$$`,
      type: "mental_cube"
    };
  },
  7: (diffFactor, idx) => {
    // Estimating sums/products
    const a = (idx % 5 + 2.1) * diffFactor;
    const b = (idx % 4 + 3.8) * diffFactor;
    const answer = Math.round(a * b);
    return {
      question: `Estimate the product to the nearest integer: $$${a.toFixed(2)} \\times ${b.toFixed(2)}$$`,
      answer,
      explanation: `Round both numbers to perform a quick estimate:\n$$${a.toFixed(2)} \\approx ${Math.round(a)}$$\n$$${b.toFixed(2)} \\approx ${Math.round(b)}$$\n$$${Math.round(a)} \\times ${Math.round(b)} = ${Math.round(a) * Math.round(b)}$$ (Actual rounded: $${answer}$)`,
      type: "estimation"
    };
  },
  8: (diffFactor, idx) => {
    // Average of 4 numbers
    const n1 = Math.round((idx % 5 + 2) * diffFactor);
    const n2 = Math.round((idx % 5 + 5) * diffFactor);
    const n3 = Math.round((idx % 5 + 8) * diffFactor);
    let sum = n1 + n2 + n3;
    let n4 = 4 - (sum % 4);
    sum += n4;
    return {
      question: `Find the arithmetic mean (average) of the values: $$${n1}, \\, ${n2}, \\, ${n3}, \\, ${n4}$$`,
      answer: sum / 4,
      explanation: `Sum the numbers and divide by the count ($4$):\n$$\\text{Mean} = \\frac{${n1} + ${n2} + ${n3} + ${n4}}{4} = \\frac{${sum}}{4} = ${sum / 4}$$`,
      type: "average"
    };
  },
  9: (diffFactor, idx) => {
    // Rolling two dice
    const targetSum = [4, 5, 6, 7, 8, 9, 10][idx % 7];
    const outcomes = {
      4: { ans: 3, exp: "(1,3), (2,2), (3,1)" },
      5: { ans: 4, exp: "(1,4), (2,3), (3,2), (4,1)" },
      6: { ans: 5, exp: "(1,5), (2,4), (3,3), (4,2), (5,1)" },
      7: { ans: 6, exp: "(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)" },
      8: { ans: 5, exp: "(2,6), (3,5), (4,4), (5,3), (6,2)" },
      9: { ans: 4, exp: "(3,6), (4,5), (5,4), (6,3)" },
      10: { ans: 3, exp: "(4,6), (5,5), (6,4)" }
    };
    const choice = outcomes[targetSum];
    return {
      question: `Let two fair, independent, six-sided dice be rolled. How many outcomes in the sample space sum to exactly $${targetSum}$?`,
      answer: choice.ans,
      explanation: `The successful outcomes are: $${choice.exp}$. Total number of combinations is $${choice.ans}$.`,
      type: "probability"
    };
  },
  10: (diffFactor, idx) => {
    // Composite probability or percentage combinations
    const p1 = [10, 20, 25, 50][idx % 4];
    const p2 = [10, 20, 25, 50][(idx + 1) % 4];
    const base = Math.round((200 + idx * 50) * diffFactor / 10) * 10;
    const answer = (p1 / 100) * (p2 / 100) * base;
    return {
      question: `Compute the compound ratio: $${p1}\\%$ of $${p2}\\%$ of $${base}$`,
      answer,
      explanation: `Multiply the percentages consecutively:\n$$\\text{Value} = \\frac{${p1}}{100} \\times \\left( \\frac{${p2}}{100} \\times ${base} \\right) = ${answer}$$`,
      type: "percentage",
      mod: base
    };
  }
};

module.exports = {
  templates
};
