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
    // Division — symbolic / equal-sharing / grouping / rate. dividend / a = b throughout.
    const baseA = (idx % 8) + 2;
    const baseB = (((idx + 5) % 8) + 2);
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const dividend = a * b;
    const why = `Division undoes multiplication. Since $${a} \\times ${b} = ${dividend}$:\n$$\\frac{${dividend}}{${a}} = ${b}$$`;
    const variants = [
      { question: `Evaluate the exact division: $$\\frac{${dividend}}{${a}}$$`, explanation: why },
      { question: `$${dividend}$ apples are shared equally among $${a}$ baskets. How many apples are in each basket?`, explanation: `Sharing equally means dividing:\n${why}` },
      { question: `You have $${dividend}$ stickers and put exactly $${a}$ on each page. How many pages do you fill?`, explanation: `Grouping into equal piles is division:\n${why}` },
      { question: `A car travels $${dividend}$ km in $${a}$ hours at a steady speed. What is its speed in km/h?`, explanation: `Speed is distance divided by time:\n${why}` },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer: b, explanation: v.explanation, type: "arithmetic_div" };
  },
  9: (diffFactor, idx) => {
    // Order of operations — symbolic / shopping total / error-detection. a*b + c throughout.
    const baseA = (idx % 6) + 3;
    const baseB = ((idx + 2) % 5) + 3;
    const baseC = ((idx + 4) % 15) + 5;
    const a = Math.round(baseA * diffFactor);
    const b = Math.round(baseB * diffFactor);
    const c = Math.round(baseC * diffFactor);
    const answer = a * b + c;
    const why = `Multiplication binds tighter than addition:\n$$${a} \\times ${b} = ${a * b}, \\quad ${a * b} + ${c} = ${answer}$$`;
    const variants = [
      { question: `Evaluate under standard precedence: $$${a} \\times ${b} + ${c}$$`, explanation: why },
      { question: `You buy $${b}$ notebooks at $${a}$ coins each, plus a $${c}$-coin pen. What is the total cost?`, explanation: `Cost is (price × quantity) + extra:\n${why}` },
      { question: `A student evaluated $${a} \\times ${b} + ${c}$ left-to-right as $(${a}+${b}) \\times ...$ and got it wrong. What is the correct value?`, explanation: `Do multiplication first, not left-to-right.\n${why}` },
      { question: `Evaluate, respecting order of operations: $$${c} + ${a} \\times ${b}$$`, explanation: `Multiply before adding, regardless of position:\n$$${a} \\times ${b} = ${a * b}, \\quad ${c} + ${a * b} = ${answer}$$` },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer, explanation: v.explanation, type: "arithmetic_mixed" };
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
    // Two-step linear equation — taught through MULTIPLE representations so the same
    // concept never arrives in the same shape twice (symbolic / word / reverse-reasoning /
    // error-detection). The underlying relation ax + b = c is constant; only the framing
    // and the reasoning path change. The diversity engine spreads these across a session.
    const xVal = Math.round((idx % 5 + 2) * diffFactor);
    const a = Math.round((idx % 4 + 2) * diffFactor);
    const b = Math.round((idx % 6 + 2) * diffFactor);
    const c = a * xVal + b;
    const solveSteps = `1. Subtract $${b}$ from both sides:\n$$${a}x = ${c} - ${b} = ${c - b}$$\n2. Divide by the coefficient $${a}$:\n$$x = \\frac{${c - b}}{${a}} = ${xVal}$$`;

    const variants = [
      // 0. Symbolic
      {
        question: `Solve the two-step equation: $$${a}x + ${b} = ${c}$$`,
        explanation: `Solve by isolating the variable term first:\n${solveSteps}`,
      },
      // 1. Real-world word problem (linear cost model)
      {
        question: `A workshop charges a flat booking fee of $${b}$ coins plus $${a}$ coins per hour. A session cost $${c}$ coins in total. For how many hours $x$ was it booked?`,
        explanation: `Model the total cost as $${a}x + ${b} = ${c}$, then isolate $x$:\n${solveSteps}`,
      },
      // 2. Reverse / missing-value reasoning
      {
        question: `A number $x$ is multiplied by $${a}$, and then $${b}$ is added, giving $${c}$. What is $x$?`,
        explanation: `Undo the operations in reverse order (add → multiply becomes subtract → divide):\n${solveSteps}`,
      },
      // 3. Error-detection (find the right answer by spotting the slip)
      {
        question: `A student solving $${a}x + ${b} = ${c}$ divided by $${a}$ *before* subtracting $${b}$, and got the wrong answer. Solve it correctly: what is $x$?`,
        explanation: `The constant must be removed before dividing.\n${solveSteps}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: xVal,
      explanation: v.explanation,
      type: "linear_two_step"
    };
  },
  14: (diffFactor, idx) => {
    // Variable on both sides — taught as symbolic / two-plan comparison / balance reasoning
    // / error-detection. The relation ax - b = cx + (d-b) and its solution xVal are constant.
    const xVal = Math.round((idx % 5 + 1) * diffFactor);
    const a = Math.round((idx % 3 + 4) * diffFactor);
    const c = Math.round((idx % 3 + 1) * diffFactor);
    const b = Math.round((idx % 5 + 2) * diffFactor);
    const d = (a - c) * xVal + b;
    const rhsConst = d - b;
    const solveSteps = `1. Subtract $${c}x$ from both sides:\n$$${a - c}x - ${b} = ${rhsConst}$$\n2. Add $${b}$:\n$$${a - c}x = ${d}$$\n3. Divide by the coefficient:\n$$x = \\frac{${d}}{${a - c}} = ${xVal}$$`;
    const variants = [
      {
        question: `Determine $x$: $$${a}x - ${b} = ${c}x + ${rhsConst}$$`,
        explanation: solveSteps,
      },
      {
        question: `Plan A costs $${a}$ coins per item minus a $${b}$-coin credit; Plan B costs $${c}$ coins per item plus a $${rhsConst}$-coin fee. For how many items $x$ do the two plans cost the same?`,
        explanation: `Set the plans equal: $${a}x - ${b} = ${c}x + ${rhsConst}$, then collect the variable:\n${solveSteps}`,
      },
      {
        question: `A balance holds $${a}$ equal blocks on the left (after removing $${b}$ kg) and $${c}$ equal blocks on the right (plus $${rhsConst}$ kg). If it balances, what is the weight $x$ of one block?`,
        explanation: `Balance means $${a}x - ${b} = ${c}x + ${rhsConst}$. Move the blocks to one side:\n${solveSteps}`,
      },
      {
        question: `A student solving $${a}x - ${b} = ${c}x + ${rhsConst}$ moved $${c}x$ to the left but forgot to change its sign. Solve it correctly: what is $x$?`,
        explanation: `Subtracting $${c}x$ flips its sign to negative on the left.\n${solveSteps}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: xVal,
      explanation: v.explanation,
      type: "linear_variable_both_sides"
    };
  },
  15: (diffFactor, idx) => {
    // Quadratic equation
    const quad = generateQuadraticEquation(diffFactor);
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
    // System of two linear equations — symbolic / sum-and-difference / ages / coins. The
    // larger value xVal solves x+y=s, x-y=d in every framing.
    const xVal = Math.round((idx % 5 + 3) * diffFactor);
    const yVal = Math.round((idx % 5 + 1) * diffFactor);
    const s = xVal + yVal;
    const d = xVal - yVal;
    const elim = `Add the equations to eliminate the smaller quantity:\n$$2x = ${s} + ${d} = ${s + d} \\implies x = \\frac{${s + d}}{2} = ${xVal}$$`;
    const variants = [
      {
        question: `Solve the system for $x$:\n$$x + y = ${s}$$\n$$x - y = ${d}$$`,
        explanation: elim,
      },
      {
        question: `Two numbers have a sum of $${s}$ and a difference of $${d}$. What is the larger number?`,
        explanation: `Let the numbers be $x \\ge y$, so $x + y = ${s}$ and $x - y = ${d}$.\n${elim}`,
      },
      {
        question: `Two friends' ages add up to $${s}$ years, and one is $${d}$ years older than the other. How old is the older friend?`,
        explanation: `With ages $x > y$: $x + y = ${s}$ and $x - y = ${d}$.\n${elim}`,
      },
      {
        question: `A piggy bank has $${s}$ coins in two stacks; the taller stack has $${d}$ more coins than the shorter. How many coins are in the taller stack?`,
        explanation: `Let the stacks be $x$ and $y$ with $x + y = ${s}$, $x - y = ${d}$.\n${elim}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: xVal,
      explanation: v.explanation,
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
    // 2x2 determinant — notation / transformation scaling / system-uniqueness test /
    // cross-product framing. All equal the signed value ad - bc (sign-safe).
    const a = Math.round((idx % 4 + 1) * diffFactor);
    const b = Math.round(((idx + 2) % 3 + 1) * diffFactor);
    const c = Math.round(((idx + 1) % 3 + 1) * diffFactor);
    const d = Math.round(((idx + 3) % 4 + 1) * diffFactor);
    const answer = a * d - b * c;
    const work = `Using $\\det(A) = ad - bc$:\n$$(${a} \\cdot ${d}) - (${b} \\cdot ${c}) = ${a * d} - ${b * c} = ${answer}$$`;
    const matrix = `\\begin{pmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{pmatrix}`;
    const variants = [
      { question: `Determine the determinant of the $2 \\times 2$ matrix $A$: $$A = ${matrix}$$`, explanation: work },
      { question: `A linear transformation has matrix $${matrix}$. By what signed factor does it scale areas (i.e. its determinant)?`, explanation: `The signed area-scaling factor is the determinant.\n${work}` },
      { question: `For the coefficient matrix $${matrix}$, compute the determinant (its value decides whether the linear system has a unique solution).`, explanation: `A nonzero determinant means a unique solution.\n${work}` },
      { question: `Vectors $\\vec{u} = (${a}, ${c})$ and $\\vec{v} = (${b}, ${d})$ form the columns of a matrix. Compute $\\det = ad - bc$.`, explanation: `This is the 2D cross-product of the column vectors.\n${work}` },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer, explanation: v.explanation, type: "matrix_determinant" };
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
    // Pigeonhole — cards / gloves / coupons / keys. Answer k+1 in every framing.
    const k = Math.round(((idx % 5) + 6) * diffFactor);
    const why = `With $k = ${k}$ categories, drawing $k+1$ guarantees a repeat:\n$$${k} + 1 = ${k + 1}$$`;
    const variants = [
      { question: `Cards belong to $${k}$ distinct categories. What is the minimum number of cards you must draw to guarantee at least 2 from the same category?`, explanation: why },
      { question: `A box holds gloves in $${k}$ different colours, mixed up. What is the fewest you must grab in the dark to be sure of $2$ matching the same colour?`, explanation: why },
      { question: `A promotion gives one of $${k}$ different coupons at random per visit. How many visits guarantee you receive at least one duplicate coupon?`, explanation: why },
      { question: `There are $${k}$ types of keys in a drawer. What is the minimum number to pull out to be certain two are of the same type?`, explanation: why },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer: k + 1, explanation: v.explanation, type: "pigeonhole" };
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
    // Combinations (n choose 2) — multiple representations of one concept: symbolic
    // notation, a committee selection, a handshake count, and a pairing/route framing.
    const n = Math.round(((idx % 4) + 5) * diffFactor);
    const ans = (n * (n - 1)) / 2;
    const formula = `By the combination formula (order doesn't matter):\n$$\\binom{${n}}{2} = \\frac{${n}!}{2!(${n}-2)!} = \\frac{${n}(${n}-1)}{2} = ${ans}$$`;
    const variants = [
      {
        question: `Evaluate the binomial coefficient for selecting $2$ items from $${n}$ distinct items: $$\\binom{${n}}{2}$$`,
        explanation: formula,
      },
      {
        question: `A committee of $2$ people must be chosen from a team of $${n}$. How many different committees are possible?`,
        explanation: `Choosing a committee is an unordered selection of $2$ from $${n}$:\n${formula}`,
      },
      {
        question: `At a meeting of $${n}$ people, everyone shakes hands with everyone else exactly once. How many handshakes occur?`,
        explanation: `Each handshake is an unordered pair of $2$ people from $${n}$:\n${formula}`,
      },
      {
        question: `A network has $${n}$ computers, and a direct cable connects every pair. How many cables are needed?`,
        explanation: `Each cable joins an unordered pair of $2$ nodes from $${n}$:\n${formula}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: ans,
      explanation: v.explanation,
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
    // The multiplication principle (2^k outcomes) shown through coins / binary strings /
    // yes-no decisions / on-off switches — the same counting idea in four guises.
    const flips = Math.min(5, Math.max(3, Math.round(((idx % 3) + 3) * diffFactor)));
    const total = Math.pow(2, flips);
    const rule = `Each independent step has $2$ choices, so the multiplication principle gives:\n$$2^{${flips}} = ${total}$$`;
    const variants = [
      {
        question: `How many unique outcomes are in the sample space when flipping $${flips}$ fair, independent coins?`,
        explanation: `Each coin lands Heads or Tails (2 outcomes).\n${rule}`,
      },
      {
        question: `How many distinct binary strings of length $${flips}$ (each character a 0 or 1) exist?`,
        explanation: `Each of the $${flips}$ positions is independently 0 or 1.\n${rule}`,
      },
      {
        question: `A survey has $${flips}$ yes/no questions. How many different complete answer sheets are possible?`,
        explanation: `Each question is answered independently in 2 ways.\n${rule}`,
      },
      {
        question: `A panel has $${flips}$ independent on/off switches. How many distinct configurations of the panel are there?`,
        explanation: `Each switch is independently on or off.\n${rule}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: total,
      explanation: v.explanation,
      type: "probability"
    };
  },
  28: (diffFactor, idx) => {
    // Circular permutations (n-1)! — round table / keychain beads / circular schedule / ring.
    const n = Math.min(6, Math.max(4, Math.round(((idx % 3) + 4) * diffFactor)));
    const ans = factorial(n - 1);
    const rule = `Fixing one item to remove equivalent rotations leaves $(n-1)!$ orderings:\n$$(${n}-1)! = ${ans}$$`;
    const variants = [
      {
        question: `How many distinct ways can $${n}$ people be seated around a circular table (rotations considered the same)?`,
        explanation: rule,
      },
      {
        question: `How many distinct ways can $${n}$ differently-coloured beads be arranged on a circular bracelet (ignoring rotation only)?`,
        explanation: `Beads in a ring: fix one to anchor the rotations.\n${rule}`,
      },
      {
        question: `$${n}$ teams take turns in a repeating cycle. How many genuinely different turn-orders are there (a cycle that only rotates counts once)?`,
        explanation: `A repeating cycle is a circular arrangement of $${n}$ teams.\n${rule}`,
      },
      {
        question: `How many distinct ways can $${n}$ charms be placed around a circular ring (rotations equivalent)?`,
        explanation: `Placement around a ring is a circular permutation.\n${rule}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: ans,
      explanation: v.explanation,
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
    // Polynomial derivative at 1 — pure derivative / velocity / tangent slope / marginal rate.
    // f'(x) = 3a x^2 + 2b x, evaluated at x=1 gives 3a + 2b in every framing.
    const a = Math.round(((idx % 3) + 2) * diffFactor);
    const b = Math.round(((idx % 3) + 1) * diffFactor);
    const answer = a * 3 + b * 2;
    const work = `By the power rule, $f'(x) = ${a * 3}x^2 + ${b * 2}x$. At the point $1$:\n$$${a * 3}(1)^2 + ${b * 2}(1) = ${answer}$$`;
    const variants = [
      {
        question: `Determine $f'(1)$ for the function: $$f(x) = ${a}x^3 + ${b}x^2$$`,
        explanation: work,
      },
      {
        question: `An object's position is $s(t) = ${a}t^3 + ${b}t^2$. What is its instantaneous velocity at $t = 1$?`,
        explanation: `Velocity is the derivative of position.\n${work}`,
      },
      {
        question: `What is the slope of the tangent line to $f(x) = ${a}x^3 + ${b}x^2$ at $x = 1$?`,
        explanation: `The tangent slope is $f'(1)$.\n${work}`,
      },
      {
        question: `A cost curve is $C(q) = ${a}q^3 + ${b}q^2$. What is the marginal cost (rate of change) at $q = 1$?`,
        explanation: `Marginal cost is the derivative $C'(1)$.\n${work}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer,
      explanation: v.explanation,
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
    // GCD — symbolic notation / largest-equal-groups / tiling / repeating-rhythm framings.
    // a = 2*mult, b = 3*mult, gcd = mult in every case.
    const mult = Math.round(((idx % 4) + 2) * diffFactor);
    const a = 2 * mult;
    const b = 3 * mult;
    const why = `Since $${a} = 2 \\cdot ${mult}$ and $${b} = 3 \\cdot ${mult}$, and $2,3$ are coprime, the greatest common divisor is $${mult}$.`;
    const variants = [
      {
        question: `Compute the Greatest Common Divisor: $$\\gcd(${a}, ${b})$$`,
        explanation: why,
      },
      {
        question: `A baker has $${a}$ muffins and $${b}$ cookies, and wants to make identical gift boxes using every item with none left over. What is the largest number of boxes possible?`,
        explanation: `The largest number of boxes dividing both counts evenly is $\\gcd(${a}, ${b})$.\n${why}`,
      },
      {
        question: `A floor is $${a}$ by $${b}$ units. What is the side length of the largest identical square tile that fits exactly, leaving no gaps?`,
        explanation: `The largest square tiling both dimensions has side $\\gcd(${a}, ${b})$.\n${why}`,
      },
      {
        question: `Two lights blink every $${a}$ and $${b}$ seconds. The largest interval that divides both their periods evenly is $\\gcd(${a}, ${b})$. Find it.`,
        explanation: `The largest common divisor of the two periods is the GCD.\n${why}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: mult,
      explanation: v.explanation,
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
    // Modular addition — symbolic / clock / counter-wraparound / cyclic position. Same
    // remainder (a+b) mod m in every framing (cyclic arithmetic is "clock" arithmetic).
    const a = Math.round(((idx % 20) + 15) * diffFactor);
    const b = Math.round(((idx % 20) + 10) * diffFactor);
    const mod = Math.round(((idx % 6) + 7) * diffFactor);
    const answer = (a + b) % mod;
    const why = `Sum then take the remainder mod $${mod}$: $${a} + ${b} = ${a + b}$, and $${a + b} \\equiv ${answer} \\pmod{${mod}}$.`;
    const variants = [
      { question: `Evaluate the modular addition: $$(${a} + ${b}) \\pmod{${mod}}$$`, explanation: why },
      { question: `On a clock with $${mod}$ hours (labelled $0$ to $${mod - 1}$), it is hour $${a % mod}$. After $${b}$ more hours, which hour does it show?`, explanation: `Clock arithmetic wraps around mod $${mod}$:\n${why}` },
      { question: `A counter that wraps at $${mod}$ (values $0..${mod - 1}$) starts at $${a}$ and is incremented $${b}$ times. What value does it display?`, explanation: `A wrapping counter is modular addition:\n${why}` },
      { question: `Around a ring of $${mod}$ positions ($0..${mod - 1}$), a token at position $${a % mod}$ moves forward $${b}$ steps. Where does it land?`, explanation: `Cyclic movement is addition mod $${mod}$:\n${why}` },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer, explanation: v.explanation, type: "modulo", mod };
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
    // Simple percentages — one concept across symbolic, financial (discount/tip), grid, and
    // probability framings so "X% of N" never feels like the same drill twice.
    const base = Math.round((idx % 5 + 1) * 20 * diffFactor / 10) * 10;
    const pct = [10, 25, 50, 75][idx % 4];
    const ans = (pct / 100) * base;
    const calc = `Convert the percentage to a fraction and multiply:\n$$\\frac{${pct}}{100} \\times ${base} = ${ans}$$`;
    const variants = [
      {
        question: `Evaluate $${pct}\\%$ of $${base}$.`,
        explanation: calc,
      },
      {
        question: `An item priced at $${base}$ coins is discounted by $${pct}\\%$. How many coins is the discount worth?`,
        explanation: `The discount is $${pct}\\%$ of the price:\n${calc}`,
      },
      {
        question: `Out of $${base}$ students, $${pct}\\%$ joined the math club. How many students joined?`,
        explanation: `Find $${pct}\\%$ of the group:\n${calc}`,
      },
      {
        question: `A $10\\times10$ grid ($${base === 100 ? '100' : base}$ squares total, scaled) has $${pct}\\%$ of its area shaded. What value does the shaded part represent out of $${base}$?`,
        explanation: `Shaded fraction times the whole:\n${calc}`,
      },
    ];
    const v = variants[idx % variants.length];
    return {
      question: v.question,
      answer: ans,
      explanation: v.explanation,
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
    // Arithmetic mean of 4 values — abstract / test scores / temperatures / heights. Same
    // four numbers and mean in every framing.
    const n1 = Math.round((idx % 5 + 2) * diffFactor);
    const n2 = Math.round((idx % 5 + 5) * diffFactor);
    const n3 = Math.round((idx % 5 + 8) * diffFactor);
    let sum = n1 + n2 + n3;
    const n4 = 4 - (sum % 4);
    sum += n4;
    const mean = sum / 4;
    const why = `Add them and divide by $4$:\n$$\\frac{${n1} + ${n2} + ${n3} + ${n4}}{4} = \\frac{${sum}}{4} = ${mean}$$`;
    const variants = [
      { question: `Find the arithmetic mean of: $$${n1}, \\, ${n2}, \\, ${n3}, \\, ${n4}$$`, explanation: why },
      { question: `A student scored $${n1}$, $${n2}$, $${n3}$ and $${n4}$ on four quizzes. What is their average score?`, explanation: why },
      { question: `Daily high temperatures over four days were $${n1}°$, $${n2}°$, $${n3}°$ and $${n4}°$. What was the average daily high?`, explanation: why },
      { question: `Four plants measure $${n1}$, $${n2}$, $${n3}$ and $${n4}$ cm tall. What is their mean height?`, explanation: why },
    ];
    const v = variants[idx % variants.length];
    return { question: v.question, answer: mean, explanation: v.explanation, type: "average" };
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

// -------------------------------------------------------------
// GEOMETRY TEMPLATES — a parallel strand (audit #1.1 curriculum breadth). Routed by the
// 'geometry' category, NOT the level band, so it broadens the catalog without renumbering the
// existing 1–60 ladder. Answers are integer (or "N\pi") so the distractor + correctness layers
// stay robust. Distractors encode the classic confusions (perimeter vs. area, forgetting the ½,
// area vs. circumference).
// -------------------------------------------------------------
templates.geometry = {
  // Perimeter of a rectangle: P = 2(l + w)
  2: (diffFactor, idx) => {
    const l = Math.max(2, Math.round(((idx % 8) + 3) * diffFactor));
    const w = Math.max(2, Math.round((((idx + 3) % 6) + 2) * diffFactor));
    const answer = 2 * (l + w);
    return {
      question: `A rectangle is $${l}$ units long and $${w}$ units wide. What is its perimeter?`,
      answer,
      distractors: [l + w, l * w, 2 * l + w], // forgot to double; computed area; doubled one side only
      explanation: `Perimeter adds all four sides: $P = 2(l + w) = 2(${l} + ${w}) = ${answer}$.`,
      type: "geo_perimeter_rect"
    };
  },
  // Area of a rectangle: A = l * w
  3: (diffFactor, idx) => {
    const l = Math.max(2, Math.round(((idx % 9) + 3) * diffFactor));
    const w = Math.max(2, Math.round((((idx + 4) % 7) + 2) * diffFactor));
    const answer = l * w;
    return {
      question: `Find the area of a rectangle with length $${l}$ and width $${w}$.`,
      answer,
      distractors: [2 * (l + w), l + w, l * w + l], // computed perimeter; added sides; arithmetic slip
      explanation: `Area multiplies length by width: $A = l \\times w = ${l} \\times ${w} = ${answer}$.`,
      type: "geo_area_rect"
    };
  },
  // Area of a triangle: A = (b * h) / 2  (b nudged so the half-area is a whole number)
  4: (diffFactor, idx) => {
    let b = Math.max(2, Math.round(((idx % 8) + 3) * diffFactor));
    const h = Math.max(2, Math.round((((idx + 2) % 6) + 2) * diffFactor));
    if ((b * h) % 2 !== 0) b += 1;
    const answer = (b * h) / 2;
    return {
      question: `A triangle has base $${b}$ and height $${h}$. What is its area?`,
      answer,
      distractors: [b * h, b + h, answer + b], // forgot the ½; added base+height; slip
      explanation: `A triangle's area is half the base times the height: $A = \\frac{1}{2} b h = \\frac{1}{2}(${b})(${h}) = ${answer}$.`,
      type: "geo_area_triangle"
    };
  },
  // Missing interior angle of a triangle: the three angles sum to 180°.
  5: (_diffFactor, idx) => {
    const a = 30 + (idx % 5) * 10;       // 30..70
    const c = 20 + ((idx + 2) % 6) * 10; // 20..70
    const answer = 180 - a - c;
    return {
      question: `Two interior angles of a triangle measure $${a}^{\\circ}$ and $${c}^{\\circ}$. What is the measure of the third angle, in degrees?`,
      answer,
      distractors: [180 - a, a + c, 180 - c], // subtracted one angle only; added the two; other slip
      explanation: `The interior angles of a triangle sum to $180^{\\circ}$, so the third angle is $180 - ${a} - ${c} = ${answer}$.`,
      type: "geo_angles_triangle"
    };
  },
  // Area of a circle in terms of pi: A = pi r^2  → answer like "16\\pi" (r >= 3 keeps all options distinct)
  12: (diffFactor, idx) => {
    const r = Math.max(3, Math.round(((idx % 5) + 3) * Math.max(1, diffFactor)));
    const answer = `${r * r}\\pi`;
    return {
      question: `What is the area of a circle with radius $${r}$? Give your answer in terms of $\\pi$.`,
      answer,
      distractors: [`${2 * r}\\pi`, `${r}\\pi`, `${2 * r * r}\\pi`], // circumference 2πr; rπ; doubled area
      explanation: `The area of a circle is $A = \\pi r^2 = \\pi (${r})^2 = ${r * r}\\pi$.`,
      type: "geo_circle_area"
    };
  }
};

// -------------------------------------------------------------
// NUMBER SENSE / PRE-ALGEBRA TEMPLATES — the band the curriculum used to skip entirely (it jumped
// straight from arithmetic to algebra). Percentages, fractions-of, ratios, percent change, and
// powers. All answers are integer so the distractor + correctness layers stay robust; the setups
// pick divisible operands so the "nice" answer is guaranteed.
// -------------------------------------------------------------
templates.number_sense = {
  // P% of N  (N is a multiple of 20 so 10/20/25/50% lands on a whole number)
  6: (_diffFactor, idx) => {
    const P = [10, 20, 25, 50][idx % 4];
    const N = 20 * (2 + (idx % 5));
    const answer = (N * P) / 100;
    return {
      question: `What is $${P}\\%$ of $${N}$?`,
      answer,
      distractors: [(N * P) / 10, N - answer, P], // decimal-place slip; forgot to take the part; echoed P
      explanation: `$${P}\\%$ of $${N}$ is $\\frac{${P}}{100} \\times ${N} = ${answer}$.`,
      type: "percentage_of"
    };
  },
  // p/q of N  (N is a multiple of q)
  7: (_diffFactor, idx) => {
    const q = [2, 3, 4, 5][idx % 4];
    const p = 1 + (idx % (q - 1));
    const N = q * (2 + (idx % 6));
    const answer = (N / q) * p;
    return {
      question: `What is $\\frac{${p}}{${q}}$ of $${N}$?`,
      answer,
      distractors: [N - answer, N / q, p * q], // the complement; just one part; multiplied p·q
      explanation: `$\\frac{${p}}{${q}}$ of $${N}$ is $\\frac{${p}}{${q}} \\times ${N} = ${answer}$.`,
      type: "fraction_of"
    };
  },
  // Ratio a:b — given the first quantity, find the second. (b > a so the ratio is never degenerate.)
  8: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);          // 2..4
    const b = a + 1 + (idx % 3);      // a+1 .. a+3, always distinct from a
    const mult = 2 + (idx % 4);
    const X = a * mult;
    const answer = b * mult;
    return {
      question: `Two quantities are in the ratio $${a} : ${b}$. If the first is $${X}$, what is the second?`,
      answer,
      distractors: [X + (b - a), a * b, X], // added the difference; multiplied the ratio; echoed X
      explanation: `Scale the ratio: $${X} \\div ${a} = ${mult}$, so the second is $${b} \\times ${mult} = ${answer}$.`,
      type: "ratio_solve"
    };
  },
  // Increase N by P%.
  9: (_diffFactor, idx) => {
    const P = [10, 20, 25, 50][idx % 4];
    const N = 20 * (2 + (idx % 5));
    const change = (N * P) / 100;
    const answer = N + change;
    return {
      question: `A price of $${N}$ is increased by $${P}\\%$. What is the new price?`,
      answer,
      distractors: [change, N - change, N + P], // reported just the increase; decreased instead; added P directly
      explanation: `The increase is $${P}\\%$ of $${N} = ${change}$, so the new price is $${N} + ${change} = ${answer}$.`,
      type: "percent_change"
    };
  },
  // Evaluate b^e.
  14: (_diffFactor, idx) => {
    const b = [2, 3, 4, 5][idx % 4];
    const e = 2 + (idx % 3);
    const answer = Math.pow(b, e);
    return {
      question: `Evaluate $${b}^{${e}}$.`,
      answer,
      distractors: [b * e, Math.pow(b, e - 1), b + e], // multiplied instead of powered; off-by-one exponent; added
      explanation: `$${b}^{${e}}$ means $${b}$ multiplied by itself $${e}$ times: $${b}^{${e}} = ${answer}$.`,
      type: "exponent_power"
    };
  }
};

// -------------------------------------------------------------
// STATISTICS TEMPLATES — descriptive statistics & basic probability (audit #1.1 Phase 3). Data
// sets are plain text with numeric answers (no LaTeX), and the setups are constructed so the
// statistic is a whole number; distractors encode the classic errors (forgot to divide for the
// mean, took the middle of the UNSORTED list for the median, reported a count instead of the
// statistic). Routed by the 'statistics' category.
// -------------------------------------------------------------
templates.statistics = {
  // Mode: the value that appears most often (one clear mode, appears twice; others once).
  7: (_diffFactor, idx) => {
    const mode = 3 + (idx % 6);
    const a = mode + 2, b = mode + 4, c = mode + 6;
    const set = [mode, a, mode, b, c];
    return {
      question: `Find the mode of the data set: ${set.join(', ')}`,
      answer: mode,
      distractors: [a, c, mode + a],
      explanation: `The mode is the most frequent value. ${mode} appears twice; every other value appears once, so the mode is ${mode}.`,
      type: "stat_mode"
    };
  },
  // Mean: the four values sum to 4·m, so the average is the whole number m.
  8: (_diffFactor, idx) => {
    const m = 5 + (idx % 8);
    const set = [m - 3, m - 1, m + 1, m + 3];
    const sum = set.reduce((s, v) => s + v, 0);
    return {
      question: `Find the mean (average) of: ${set.join(', ')}`,
      answer: m,
      distractors: [sum, m + 2, m - 2],
      explanation: `Add the values to get ${sum}, then divide by how many there are (4): ${sum} / 4 = ${m}.`,
      type: "stat_mean"
    };
  },
  // Median: the middle value of the SORTED list (the unsorted-middle is offered as a trap).
  9: (_diffFactor, idx) => {
    const base = 3 + (idx % 5);
    const vals = [base + 8, base + 1, base + 5, base, base + 3]; // distinct, intentionally unsorted
    const sorted = [...vals].sort((x, y) => x - y);
    const answer = sorted[2];
    return {
      question: `Find the median of: ${vals.join(', ')}`,
      answer,
      distractors: [vals[2], sorted[0], sorted[4]], // middle of the unsorted list; min; max
      explanation: `Order the values: ${sorted.join(', ')}. The middle (3rd of 5) value is ${answer}.`,
      type: "stat_median"
    };
  },
  // Range: largest minus smallest (the spread varies so the answer isn't constant).
  11: (_diffFactor, idx) => {
    const base = 4 + (idx % 5);
    const spread = 6 + (idx % 6);
    const vals = [base + 2, base + spread, base, base + 4, base + 1];
    const max = Math.max(...vals), min = Math.min(...vals);
    const answer = max - min;
    return {
      question: `Find the range of: ${vals.join(', ')}`,
      answer,
      distractors: [max, max + min, base + 2], // gave the max; summed instead; a stray value
      explanation: `Range = largest - smallest = ${max} - ${min} = ${answer}.`,
      type: "stat_range"
    };
  },
  // Probability as a percent (operands chosen so the percent is a whole number).
  13: (_diffFactor, idx) => {
    const total = 20;
    const pct = [10, 20, 25, 30, 40, 60][idx % 6];
    const R = (total * pct) / 100;
    return {
      question: `A bag holds ${R} red marbles out of ${total} marbles in total. What is the probability of drawing a red marble, expressed as a percent?`,
      answer: pct,
      distractors: [R, 100 - pct, total - R], // the count; the complement; the blue count
      explanation: `Probability of red = ${R} out of ${total} = ${R}/${total} = ${pct}%.`,
      type: "stat_probability"
    };
  }
};

module.exports = {
  templates
};
