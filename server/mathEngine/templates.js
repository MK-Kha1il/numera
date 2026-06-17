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
      // The smaller unknown, the sum, the difference — each a real solve-path slip.
      distractors: [yVal, s, d],
      explanation: v.explanation,
      type: "linear_system",
      xVal, yVal
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
  // ---- Systems of linear equations II: substitution, elimination, solution types (8.EE.C.8) ----
  // Depth on the existing linear_system concept (level 16, sum-and-difference elimination). These add
  // the two canonical SOLVING methods (substitution, scale-and-eliminate) and the three SOLUTION-TYPE
  // cases (one / none / infinitely many). Every distractor is a genuinely DIFFERENT integer value or a
  // distinct label — a real solve-path slip — never a re-expression of the answer (the equivalence-aware
  // competitive grader would otherwise treat a re-expression as a SECOND correct option).
  21: (_diffFactor, idx) => {
    // Solve by SUBSTITUTION. eq1 already isolates y: y = m·x + c. eq2 is a·x + b·y = k. Substitute eq1
    // into eq2 and solve for x. Curated (x, y, m, a, b) so every quantity is a clean integer and the
    // four options are distinct. c = y - m·x; k = a·x + b·y.
    const [x, y, m, a, b] = [[3, 1, 1, 1, 3], [4, 1, 1, 1, 2], [5, 3, 1, 1, 3], [6, 1, 1, 2, 3], [2, 5, 1, 1, 2]][idx % 5];
    const c = y - m * x;             // intercept of eq1 (y = m·x + c)
    const k = a * x + b * y;         // RHS of eq2
    const coef = a + b * m;          // coefficient of x after substituting (> 0 for every tuple here)
    const cStr = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`;
    const mStr = m === 1 ? '' : m;
    // Distractors (each a real slip): reported y (solved for the wrong variable); a sign slip on the
    // constant when substituting, x' = (k + b·c)/coef; and forgetting to multiply the m·x term by b,
    // i.e. using (a + m) as the x-coefficient, x'' = (k - b·c)/(a + m). All curated to clean integers.
    const wrongVar = y;
    const signSlip = (k + b * c) / coef;
    const badCoef = (k - b * c) / (a + m);
    return {
      question: `Solve the system for $x$ by substitution:\n$$y = ${mStr}x ${cStr}$$\n$$${a === 1 ? '' : a}x + ${b === 1 ? '' : b}y = ${k}$$`,
      answer: x,
      distractors: [wrongVar, signSlip, badCoef],
      explanation: `The first equation already gives $y = ${mStr}x ${cStr}$. Substitute it into the second:\n$$${a === 1 ? '' : a}x + ${b === 1 ? '' : b}(${mStr}x ${cStr}) = ${k}$$\nDistribute and collect the $x$-terms — the coefficient becomes $a + b\\cdot m = ${a} + ${b}\\cdot${m} = ${coef}$ — giving $${coef}x = ${k - b * c}$, so $x = ${x}$. (Back-substituting gives $y = ${y}$, but the question asked for $x$.)`,
      type: "linear_system_substitution",
      xVal: x, yVal: y
    };
  },
  22: (_diffFactor, idx) => {
    // Solve by ELIMINATION with SCALING. eq1: a1·x + b1·y = c1, eq2: a2·x + b2·y = c2, with BOTH the x-
    // and y-coefficients differing so you must multiply an equation before combining. Curated so the
    // unique solution (x, y) is a clean integer pair and the four options are distinct integers.
    const [x, y, a1, b1, a2, b2] = [[1, 5, 1, 3, 3, 1], [2, 5, 1, 2, 2, 1], [3, 5, 1, 2, 2, 1], [4, 5, 1, 2, 2, 1], [5, 6, 1, 3, 2, 2]][idx % 5];
    const c1 = a1 * x + b1 * y;
    const c2 = a2 * x + b2 * y;
    // Eliminate y: multiply eq1 by b2, eq2 by b1, subtract. (b1·b2)y cancels; x = (b2·c1 - b1·c2)/(b2·a1 - b1·a2).
    const xDen = b2 * a1 - b1 * a2;
    const xNum = b2 * c1 - b1 * c2;
    // Distractors: reported y (wrong variable); ADDED the equations without scaling first,
    // x' = (c1 + c2)/(a1 + a2); and a sign slip in the combination, x'' = (b2·c1 + b1·c2)/(b2·a1 + b1·a2).
    const wrongVar = y;
    const noScale = (c1 + c2) / (a1 + a2);
    const signSlip = (b2 * c1 + b1 * c2) / (b2 * a1 + b1 * a2);
    return {
      question: `Solve the system for $x$ by elimination:\n$$${a1 === 1 ? '' : a1}x + ${b1 === 1 ? '' : b1}y = ${c1}$$\n$$${a2 === 1 ? '' : a2}x + ${b2 === 1 ? '' : b2}y = ${c2}$$`,
      answer: x,
      distractors: [wrongVar, noScale, signSlip],
      explanation: `Neither variable's coefficients match, so SCALE first. To eliminate $y$, multiply the first equation by $${b2}$ and the second by $${b1}$, then subtract: the $y$-terms cancel and $${xDen}x = ${xNum}$, so $x = ${x}$. (Substituting back gives $y = ${y}$, but the question asked for $x$.) Adding the equations without scaling leaves both $x$ and $y$ — the classic slip.`,
      type: "linear_system_elimination",
      xVal: x, yVal: y
    };
  },
  23: (_diffFactor, idx) => {
    // SOLUTION TYPES: one solution / no solution / infinitely many. Compare the two lines:
    //   same slope & same intercept  => infinitely many (the SAME line),
    //   same slope & different intercept => no solution (parallel),
    //   different slope => exactly one solution.
    // The answer is a LABEL, so there is no numeric-equivalence risk; the three labels are distinct.
    const ONE = "one solution", NONE = "no solution", INF = "infinitely many solutions";
    // "two solutions" is a genuine misconception (a linear system can never have exactly two) — it
    // also keeps the option count at four authored labels so the engine never injects a generic "0".
    const TWO = "two solutions";
    // [a1, b1, c1, a2, b2, c2, label] — verified trios for each case.
    const cases = [
      [1, 1, 5, 1, -1, 1, ONE],   // different slopes -> cross once
      [2, 1, 7, 1, 3, 8, ONE],
      [1, 2, 4, 2, 4, 10, NONE],  // eq2 LHS = 2·eq1 LHS, RHS would be 8 but is 10 -> parallel
      [3, 1, 5, 6, 2, 7, NONE],   // eq2 LHS = 2·eq1 LHS, RHS would be 10 but is 7 -> parallel
      [1, 1, 3, 2, 2, 6, INF],    // eq2 = 2·eq1 entirely -> same line
      [2, 1, 4, 4, 2, 8, INF],    // eq2 = 2·eq1 entirely -> same line
    ];
    const [a1, b1, c1, a2, b2, c2, label] = cases[idx % cases.length];
    const fmt = (a, b, c) => `${a === 1 ? '' : a === -1 ? '-' : a}x ${b < 0 ? `- ${Math.abs(b) === 1 ? '' : Math.abs(b)}` : `+ ${b === 1 ? '' : b}`}y = ${c}`;
    let why;
    if (label === ONE) {
      why = `Solve each for $y$: the two lines have DIFFERENT slopes, so they cross at exactly one point — one solution.`;
    } else if (label === NONE) {
      why = `The second equation's left side is a multiple of the first's, but the right side is NOT the matching multiple: same slope, different intercept. The lines are parallel and never meet — no solution.`;
    } else {
      why = `The entire second equation is the first multiplied by a constant (both sides), so they are the SAME line. Every point on it satisfies both — infinitely many solutions.`;
    }
    return {
      question: `How many solutions does this system have?\n$$${fmt(a1, b1, c1)}$$\n$$${fmt(a2, b2, c2)}$$`,
      answer: label,
      distractors: [ONE, NONE, INF, TWO].filter((l) => l !== label),
      explanation: why,
      type: "linear_system_solution_types"
    };
  },
  // ---- Quadratic equations II: solving methods (HSA-REI.B.4) ----
  // Depth on the existing `quadratic` concept (level 15), which only finds the LARGER root of an
  // already-factored monic quadratic. These add the real SOLVING toolkit: solve by factoring (incl.
  // negative roots, answer = the SMALLER root), the quadratic formula on a general ax²+bx+c=0, and
  // reading the number of real roots off the discriminant's sign. Every numeric distractor is a
  // genuinely DIFFERENT value modelling a real solve-path slip — never a re-expression of the answer
  // (the equivalence-aware competitive grader would treat a re-expression as a SECOND correct option).
  24: (_diffFactor, idx) => {
    // SOLVE BY FACTORING. Build x² - (r1+r2)x + r1·r2 = 0 from integer roots (r1 < r2, either sign),
    // and ask for the SMALLER root (distinct from the level-15 `quadratic` template, which asks for the
    // larger root of positive-only roots). Factoring: find two numbers that multiply to c and add to
    // -(b). Curated tuples so the four options are always distinct integers.
    const roots = [[-3, 2], [1, 5], [-4, -1], [2, 6], [-5, 3], [1, 7], [-6, 2]];
    const [r1, r2] = roots[idx % roots.length];
    const small = Math.min(r1, r2);
    const large = Math.max(r1, r2);
    const b = -(r1 + r2);            // coefficient of x in x² + b·x + c
    const c = r1 * r2;               // constant term
    const bStr = b < 0 ? `- ${Math.abs(b)}` : `+ ${b}`;
    const cStr = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`;
    // Distractors, each a real slip: the OTHER root (reported the larger when the smaller was asked);
    // the sign-flip of the answer (read the factor $(x - r)$ as giving root $-r$); and the negated
    // middle coefficient $r_1 + r_2 = -b$ (read a coefficient off the equation as if it were a root).
    const wrongRoot = large;
    const signFlip = -small;
    const readCoef = r1 + r2;
    return {
      question: `Solve by factoring. What is the SMALLER root of $$x^2 ${bStr}x ${cStr} = 0?$$`,
      answer: small,
      distractors: [wrongRoot, signFlip, readCoef],
      explanation: `Find two numbers that multiply to $${c}$ and add to $${-b}$: they are $${r1}$ and $${r2}$. So the equation factors as $(x ${r1 < 0 ? `+ ${-r1}` : `- ${r1}`})(x ${r2 < 0 ? `+ ${-r2}` : `- ${r2}`}) = 0$. Setting each factor to zero gives the roots $x = ${r1}$ and $x = ${r2}$ — note each root has the OPPOSITE sign of the number inside its factor. The smaller root is $${small}$.`,
      type: "quadratic_factoring"
    };
  },
  25: (_diffFactor, idx) => {
    // SOLVE WITH THE QUADRATIC FORMULA. General ax² + bx + c = 0 (a ≥ 1) built from integer roots so
    // the discriminant is a perfect square and the roots are clean. Ask for the LARGER root. Curated
    // [a, r1, r2] so every quantity below is an integer and the four options are distinct.
    const cases = [[1, 2, 5], [1, -1, 4], [2, 1, 3], [1, -2, 6], [2, -1, 2], [1, 3, 7], [3, 1, 2], [2, 2, 5], [1, -3, 4], [2, -2, 3]];
    const [a, r1, r2] = cases[idx % cases.length];
    const b = -a * (r1 + r2);        // standard-form b
    const c = a * r1 * r2;           // standard-form c
    const disc = b * b - 4 * a * c;  // perfect square by construction
    const sq = Math.round(Math.sqrt(disc));
    const big = Math.max(r1, r2);
    const small = Math.min(r1, r2);
    const aStr = a === 1 ? '' : a;
    const bStr = b < 0 ? `- ${Math.abs(b)}` : `+ ${b}`;
    const cStr = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`;
    // Distractors, each a real formula slip: used $+b$ in the numerator instead of $-b$ (forgot the
    // leading minus); forgot to divide by $2a$ (divided by $a$ only); and the OTHER (smaller) root.
    const usedPlusB = (b + sq) / (2 * a);
    const forgotTwoA = (-b + sq) / a;
    return {
      question: `Use the quadratic formula to find the LARGER root of $$${aStr}x^2 ${bStr}x ${cStr} = 0.$$`,
      answer: big,
      distractors: [usedPlusB, forgotTwoA, small],
      explanation: `Here $a = ${a}$, $b = ${b}$, $c = ${c}$. The discriminant is $b^2 - 4ac = ${b * b} - ${4 * a * c} = ${disc}$, and $\\sqrt{${disc}} = ${sq}$. The quadratic formula gives $x = \\dfrac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} = \\dfrac{${-b} \\pm ${sq}}{${2 * a}}$, so the roots are $${big}$ and $${small}$. The larger root is $${big}$. (Using $+b$ instead of $-b$, or dividing by $a$ rather than $2a$, are the classic slips.)`,
      type: "quadratic_formula"
    };
  },
  26: (_diffFactor, idx) => {
    // THE DISCRIMINANT — number of real roots from the sign of b² − 4ac. The answer is a LABEL, so
    // there is no numeric-equivalence risk; four authored, distinct labels (the three real cases + the
    // "infinitely many" misconception) keep the option count at four so the engine never injects a
    // generic numeric filler. positive → two, zero → one, negative → none.
    const TWO = "two real solutions", ONE = "one real solution", NONE = "no real solutions";
    const INF = "infinitely many real solutions"; // genuine misconception (a quadratic has at most two)
    // [a, b, c, label] — verified: label matches sign(b² − 4ac).
    const cases = [
      [1, -5, 6, TWO], [1, 1, -6, TWO], [2, -7, 3, TWO],
      [1, -4, 4, ONE], [1, 6, 9, ONE], [4, 4, 1, ONE],
      [1, 0, 4, NONE], [1, 2, 5, NONE], [2, 1, 3, NONE],
    ];
    const [a, b, c, label] = cases[idx % cases.length];
    const disc = b * b - 4 * a * c;
    const aStr = a === 1 ? '' : a;
    const bTerm = b === 0 ? '' : (b < 0 ? ` - ${Math.abs(b) === 1 ? '' : Math.abs(b)}x` : ` + ${b === 1 ? '' : b}x`);
    const cStr = c < 0 ? `- ${Math.abs(c)}` : `+ ${c}`;
    let why;
    if (label === TWO) {
      why = `The discriminant is $b^2 - 4ac = ${b * b} - ${4 * a * c} = ${disc}$. It is POSITIVE, so $\\pm\\sqrt{${disc}}$ gives two different values — two real solutions (the parabola crosses the x-axis twice).`;
    } else if (label === ONE) {
      why = `The discriminant is $b^2 - 4ac = ${b * b} - ${4 * a * c} = ${disc}$. It is exactly ZERO, so $\\pm\\sqrt{0}$ adds nothing — the two roots coincide into one repeated real solution (the parabola is tangent to the x-axis).`;
    } else {
      why = `The discriminant is $b^2 - 4ac = ${b * b} - ${4 * a * c} = ${disc}$. It is NEGATIVE, and a real square root of a negative number does not exist — so there are no real solutions (the parabola never touches the x-axis).`;
    }
    return {
      question: `How many real solutions does $$${aStr}x^2${bTerm} ${cStr} = 0$$ have? (Use the discriminant.)`,
      answer: label,
      distractors: [TWO, ONE, NONE, INF].filter((l) => l !== label),
      explanation: why,
      type: "discriminant_roots"
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
  // Volume of a rectangular prism: V = l·w·h. Dimension ranges (l 3..5, w 4..6, h 2..4) are
  // chosen so no distractor can ever equal the answer or another distractor.
  6: (_diffFactor, idx) => {
    const l = 3 + (idx % 3);
    const w = 4 + ((idx + 1) % 3);
    const h = 2 + ((idx + 2) % 4);
    const answer = l * w * h;
    return {
      question: `A box is $${l}$ units long, $${w}$ units wide and $${h}$ units tall. What is its volume?`,
      answer,
      distractors: [l * w, l + w + h, 2 * (l * w + l * h + w * h)], // forgot the height; added the dimensions; surface area
      explanation: `Volume fills the box layer by layer: the base holds $${l} \\times ${w} = ${l * w}$ unit cubes, stacked $${h}$ layers high — $V = lwh = ${l * w} \\times ${h} = ${answer}$ cubic units.`,
      type: "geo_volume_rect",
      l, w, h
    };
  },
  // Surface area of a rectangular prism: SA = 2(lw + lh + wh).
  7: (_diffFactor, idx) => {
    const l = 3 + (idx % 3);
    const w = 4 + ((idx + 1) % 3);
    const h = 2 + ((idx + 2) % 4);
    const half = l * w + l * h + w * h;
    const answer = 2 * half;
    return {
      question: `A box is $${l}$ units long, $${w}$ units wide and $${h}$ units tall. What is its surface area?`,
      answer,
      distractors: [half, l * w * h, 2 * (l + w + h)], // forgot each face appears twice; volume; doubled the edge sum
      explanation: `A box has three PAIRS of identical faces: top/bottom ($${l} \\times ${w}$), front/back ($${l} \\times ${h}$) and the two sides ($${w} \\times ${h}$). One of each is $${l * w} + ${l * h} + ${w * h} = ${half}$; doubling covers all six: $SA = ${answer}$ square units.`,
      type: "geo_surface_area_rect",
      l, w, h
    };
  },
  // Circumference in terms of pi, alternating radius/diameter prompts.
  8: (_diffFactor, idx) => {
    if (idx % 2 === 0) {
      const r = 3 + (idx % 5); // 3..7
      return {
        question: `What is the circumference of a circle with radius $${r}$? Give your answer in terms of $\\pi$.`,
        answer: `${2 * r}\\pi`,
        distractors: [`${r}\\pi`, `${r * r}\\pi`, `${2 * r * r}\\pi`], // forgot the 2; area instead; mixed both formulas
        explanation: `Circumference is $\\pi$ times the DIAMETER: $C = 2\\pi r = 2 \\pi (${r}) = ${2 * r}\\pi$. Squaring the radius ($${r * r}\\pi$) measures area — the inside, not the rim.`,
        type: "geo_circumference"
      };
    }
    const d = 2 * (3 + (idx % 5)); // even 6..14
    return {
      question: `What is the circumference of a circle with diameter $${d}$? Give your answer in terms of $\\pi$.`,
      answer: `${d}\\pi`,
      distractors: [`${2 * d}\\pi`, `${d * d}\\pi`, `${d / 2}\\pi`], // doubled the diameter too; squared; halved
      explanation: `With the diameter already given, $C = \\pi d = ${d}\\pi$. The $2$ in $2\\pi r$ exists only to turn a RADIUS into a diameter — applying it to $d$ doubles the circle.`,
      type: "geo_circumference"
    };
  },
  // Volume of a cylinder in terms of pi: V = pi r^2 h (r >= 3 keeps all options distinct).
  9: (_diffFactor, idx) => {
    const r = 3 + (idx % 3);       // 3..5
    const h = 3 + ((idx + 1) % 4); // 3..6
    return {
      question: `What is the volume of a cylinder with radius $${r}$ and height $${h}$? Give your answer in terms of $\\pi$.`,
      answer: `${r * r * h}\\pi`,
      distractors: [`${r * h}\\pi`, `${2 * r * h}\\pi`, `${4 * r * r * h}\\pi`], // forgot to square; lateral surface; used the diameter
      explanation: `A cylinder is a circle of area $\\pi r^2 = ${r * r}\\pi$ swept up through height $${h}$: $V = \\pi r^2 h = ${r * r}\\pi \\times ${h} = ${r * r * h}\\pi$. Forgetting the square ($${r * h}\\pi$) sweeps a line, not a disk.`,
      type: "geo_volume_cylinder"
    };
  },
  // Composite figure: an L-shape is a rectangle with a corner bitten off.
  11: (_diffFactor, idx) => {
    const A = 8 + (idx % 4);             // 8..11
    const B = 6 + (idx % 3);             // 6..8
    const C = 2 + (idx % 3);             // 2..4 (notch, strictly smaller than the rectangle)
    const D = 2 + ((idx + 1) % 3);       // 2..4
    const answer = A * B - C * D;
    return {
      question: `An L-shaped floor is a $${A} \\times ${B}$ rectangle with a $${C} \\times ${D}$ corner cut away. What is its area?`,
      answer,
      distractors: [A * B, A * B + C * D, (A - C) * (B - D)], // ignored the cut; added the cut back on; shrank both sides
      explanation: `Composite areas decompose: the full rectangle holds $${A} \\times ${B} = ${A * B}$, and the missing corner took $${C} \\times ${D} = ${C * D}$ of it away: $${A * B} - ${C * D} = ${answer}$. Shrinking both side lengths ($${A - C} \\times ${B - D}$) removes a whole STRIP along each edge — far more than one corner.`,
      type: "geo_composite",
      full: A * B, notch: C * D
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
  },
  // Angle pairs where two lines cross: vertical (equal) vs adjacent (supplementary).
  // θ avoids 45° so the complement distractor can never equal the answer.
  13: (_diffFactor, idx) => {
    const theta = [25, 35, 55, 65, 75][idx % 5];
    if (idx % 2 === 0) {
      return {
        question: `Two straight lines cross. One of the four angles measures $${theta}^{\\circ}$. What is the measure of the angle directly OPPOSITE it?`,
        answer: theta,
        distractors: [180 - theta, 90 - theta, 180 - 2 * theta], // supplement; complement; invented arithmetic
        explanation: `Opposite (vertical) angles are EQUAL: both are what's left of the same straight line after the same neighbor is removed — $180^{\\circ} - ${180 - theta}^{\\circ} = ${theta}^{\\circ}$ twice over. No subtraction needed for the opposite angle itself.`,
        type: "geo_angles_lines"
      };
    }
    return {
      question: `Two straight lines cross. One of the four angles measures $${theta}^{\\circ}$. What is the measure of the angle NEXT to it (sharing one arm)?`,
      answer: 180 - theta,
      distractors: [theta, 90 - theta, 360 - theta], // copied the vertical rule; complement; full-turn confusion
      explanation: `Neighboring angles at a crossing sit together on a STRAIGHT line, so they sum to $180^{\\circ}$: the neighbor is $180 - ${theta} = ${180 - theta}^{\\circ}$. The $90^{\\circ}$ rule belongs to right-angle corners, not straight lines.`,
      type: "geo_angles_lines"
    };
  },
  // Area of a parallelogram: base × PERPENDICULAR height (not the slanted side).
  14: (_diffFactor, idx) => {
    const base = 4 + (idx % 6);          // 4..9
    const h = 3 + (idx % 5);             // 3..7
    const slant = h + 2 + (idx % 3);     // the slanted side, always > h
    return {
      question: `A parallelogram has base $${base}$ and perpendicular height $${h}$ (its slanted side is $${slant}$). What is its area?`,
      answer: base * h,
      distractors: [base * slant, base + h, 2 * (base + h)], // used the slanted side; added; perimeter-ish
      explanation: `A parallelogram is a rectangle with a triangle slid from one end to the other — same base, same HEIGHT, same area: $A = b \\times h = ${base} \\times ${h} = ${base * h}$. The slanted side ($${slant}$) is longer than the height and is never used for area.`,
      type: "geo_area_parallelogram"
    };
  },
  // Area of a trapezoid: average the two parallel sides, times the height.
  15: (_diffFactor, idx) => {
    const h = 2 * (2 + (idx % 4));        // even height 4,6,8,10 keeps the half integer
    const b1 = 3 + (idx % 4);             // 3..6
    const b2 = b1 + 2 + (idx % 4);        // strictly bigger
    const answer = ((b1 + b2) / 2) * h;
    return {
      question: `A trapezoid has parallel sides $${b1}$ and $${b2}$ and height $${h}$. What is its area?`,
      answer,
      distractors: [b1 * b2, (b1 + b2) * h, b1 * h], // multiplied the bases; forgot to halve; used one base only
      explanation: `Average the two parallel sides, then multiply by the height: $A = \\frac{${b1} + ${b2}}{2} \\times ${h} = ${(b1 + b2) / 2} \\times ${h} = ${answer}$. The average is what a trapezoid contributes that a rectangle (equal sides) does not — forgetting to halve doubles the area.`,
      type: "geo_area_trapezoid"
    };
  },
  // Volume of a cone: V = (1/3) pi r^2 h. h is a multiple of 3 so the pi-coefficient stays integer.
  16: (_diffFactor, idx) => {
    const r = 3 + (idx % 3);              // 3..5
    const h = 3 * (1 + (idx % 2));        // 3 or 6 → h/3 is a whole number
    const coef = (r * r * h) / 3;
    return {
      question: `What is the volume of a cone with radius $${r}$ and height $${h}$? Give your answer in terms of $\\pi$.`,
      answer: `${coef}\\pi`,
      distractors: [`${r * r * h}\\pi`, `${(r * h) / 3}\\pi`, `${(4 * r * r * h) / 3}\\pi`], // cylinder (no 1/3); forgot to square; used the diameter
      explanation: `A cone is exactly one-third of the cylinder with the same base and height — pour three cones of water to fill the can. So $V = \\frac{1}{3}\\pi r^2 h = \\frac{1}{3}\\pi (${r})^2(${h}) = ${coef}\\pi$. Dropping the $\\frac{1}{3}$ gives the whole cylinder $${r * r * h}\\pi$.`,
      type: "geo_volume_cone"
    };
  },
  // Volume of a sphere: V = (4/3) pi r^3. r is a multiple of 3 so the pi-coefficient stays integer.
  17: (_diffFactor, idx) => {
    const r = 3 * (1 + (idx % 2));        // 3 or 6 → r^3 divisible by 3
    const coef = (4 * r * r * r) / 3;
    return {
      question: `What is the volume of a sphere with radius $${r}$? Give your answer in terms of $\\pi$.`,
      answer: `${coef}\\pi`,
      distractors: [`${r * r * r}\\pi`, `${(4 * r * r) / 3}\\pi`, `${4 * r * r * r}\\pi`], // dropped 4/3; squared not cubed; forgot to divide by 3
      explanation: `The volume of a sphere is $V = \\frac{4}{3}\\pi r^3 = \\frac{4}{3}\\pi (${r})^3 = \\frac{4}{3}\\pi (${r * r * r}) = ${coef}\\pi$. The radius is CUBED (volume is three-dimensional), and the $\\frac{4}{3}$ is essential — without it you under-count to $${r * r * r}\\pi$.`,
      type: "geo_volume_sphere"
    };
  },
  // Volume of a pyramid: V = (1/3) * base area * height. h is a multiple of 3 (>=6) for an integer answer.
  18: (_diffFactor, idx) => {
    const l = 3 + (idx % 3);              // 3..5
    const w = 3 + ((idx + 1) % 3);        // 3..5
    const h = 3 * (2 + (idx % 2));        // 6 or 9 → h/3 is 2 or 3 (never 1, so 'base only' stays distinct)
    const base = l * w;
    const prism = base * h;
    const answer = prism / 3;
    return {
      question: `A pyramid has a $${l} \\times ${w}$ rectangular base and a height of $${h}$. What is its volume?`,
      answer,
      distractors: [prism, base, (2 * prism) / 3], // forgot the 1/3 (prism); gave the base area; used 2/3
      explanation: `A pyramid fills one-third of the prism on the same base and height: $V = \\frac{1}{3} \\times (\\text{base area}) \\times h = \\frac{1}{3} \\times ${base} \\times ${h} = ${answer}$. The base area $${base}$ alone is two-dimensional; the prism $${prism}$ forgets the $\\frac{1}{3}$.`,
      type: "geo_volume_pyramid",
      prism, base
    };
  },
  // Surface area of a cylinder: 2πr² (two caps) + 2πrh (the unrolled label). r >= 3 and h > r
  // keep every option distinct.
  19: (_diffFactor, idx) => {
    const r = 3 + (idx % 3);              // 3..5
    const h = r + 1 + (idx % 5);          // r+1..r+5 (always > r)
    const coef = 2 * r * r + 2 * r * h;   // 2πr(r + h)
    return {
      question: `What is the total surface area of a cylinder with radius $${r}$ and height $${h}$? Give your answer in terms of $\\pi$.`,
      answer: `${coef}\\pi`,
      distractors: [`${2 * r * h}\\pi`, `${2 * r * r}\\pi`, `${r * r * h}\\pi`], // lateral side only; two caps only; computed the volume
      explanation: `Unroll the cylinder: two circular caps ($2 \\times \\pi r^2 = ${2 * r * r}\\pi$) plus a rectangular label whose width is the circumference $2\\pi r$ and height $${h}$ ($2\\pi r h = ${2 * r * h}\\pi$). Total $= ${2 * r * r}\\pi + ${2 * r * h}\\pi = ${coef}\\pi$. The label alone forgets the lids; the volume $${r * r * h}\\pi$ measures filling, not covering.`,
      type: "geo_surface_cylinder"
    };
  },
  // Surface area of a sphere: 4πr². r drawn from {3,5,6,7} so no two options collide.
  21: (_diffFactor, idx) => {
    const r = [3, 5, 6, 7][idx % 4];
    return {
      question: `What is the surface area of a sphere with radius $${r}$? Give your answer in terms of $\\pi$.`,
      answer: `${4 * r * r}\\pi`,
      distractors: [`${4 * r}\\pi`, `${r * r}\\pi`, `${2 * r * r}\\pi`], // forgot to square; dropped the 4; used 2 instead of 4
      explanation: `A sphere's surface area is $4\\pi r^2 = 4\\pi (${r})^2 = ${4 * r * r}\\pi$ — exactly four times the area of a flat circle of the same radius (a remarkable fact, also the curved area of its bounding cylinder). The radius is squared (area is 2-D), and the leading number is $4$, not $1$ or $2$.`,
      type: "geo_surface_sphere"
    };
  },
  // Surface area of a cone: πr² (base) + πrl (unrolled slant sector). Slant height l is GIVEN
  // and kept > r so the lateral/base distractors stay distinct.
  22: (_diffFactor, idx) => {
    const r = 3 + (idx % 3);              // 3..5
    const l = r + 2 + (idx % 4);          // slant height r+2..r+5 (> r)
    const coef = r * r + r * l;           // πr(r + l)
    return {
      question: `A cone has radius $${r}$ and slant height $${l}$. What is its total surface area? Give your answer in terms of $\\pi$.`,
      answer: `${coef}\\pi`,
      distractors: [`${r * l}\\pi`, `${r * r}\\pi`, `${2 * r * l}\\pi`], // slanted side only; base only; treated the side like a cylinder
      explanation: `A cone's surface is its circular base ($\\pi r^2 = ${r * r}\\pi$) plus the curved side, which unrolls into a sector of area $\\pi r l = ${r * l}\\pi$ (slant height $l$ as the sector's radius). Total $= ${r * r}\\pi + ${r * l}\\pi = ${coef}\\pi$. The slanted side alone forgets the base; the base alone forgets the side.`,
      type: "geo_surface_cone"
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
  // Metric conversion, alternating directions. Distractors stay powers of 10 apart.
  11: (_diffFactor, idx) => {
    const units = [
      ['km', 'meters', 1000],
      ['kg', 'grams', 1000],
      ['liters', 'milliliters', 1000],
      ['m', 'centimeters', 100],
    ];
    const [big, small, f] = units[idx % 4];
    const v = 2 + (idx % 7); // 2..8
    if (idx % 2 === 0) {
      return {
        question: `Convert $${v}$ ${big} to ${small}.`,
        answer: v * f,
        distractors: [v * f / 10, v * f * 10, v * f / 100], // one power of ten short; one too many; two short
        explanation: `$1$ ${big} $= ${f}$ ${small}, so $${v}$ ${big} $= ${v} \\times ${f} = ${v * f}$ ${small}. Metric prefixes move by powers of ten — count the zeros, don't guess them.`,
        type: "unit_convert_metric"
      };
    }
    return {
      question: `Convert $${v * f}$ ${small} to ${big}.`,
      answer: v,
      distractors: [v * 10, v * f, v * f * 10], // divided one power short; never divided; multiplied instead
      explanation: `Going from ${small} UP to ${big} divides: $${v * f} \\div ${f} = ${v}$ ${big}. The bigger unit needs FEWER of itself — if the number grew, the conversion went the wrong way.`,
      type: "unit_convert_metric"
    };
  },
  // Time conversion — the base is 60, not 10. Mixed hours+minutes keeps the remainder honest.
  12: (_diffFactor, idx) => {
    if (idx % 2 === 0) {
      const h = 2 + (idx % 4);          // 2..5
      const m = 10 + 5 * (idx % 7);     // 10..40
      const answer = 60 * h + m;
      return {
        question: `How many minutes are in $${h}$ hours and $${m}$ minutes?`,
        answer,
        distractors: [60 * h, 100 * h + m, h + m], // dropped the extra minutes; used 100 min/hour; added raw numbers
        explanation: `Each hour is $60$ minutes: $${h} \\times 60 = ${60 * h}$, plus the leftover $${m}$: $${answer}$ minutes. Time runs on $60$s, not $100$s — the decimal instinct is the trap.`,
        type: "unit_convert_time"
      };
    }
    const m = 3 + (idx % 6); // 3..8
    return {
      question: `How many seconds are in $${m}$ minutes?`,
      answer: 60 * m,
      distractors: [100 * m, 30 * m, 6 * m], // used 100; used half a minute; dropped a zero
      explanation: `Each minute is $60$ seconds: $${m} \\times 60 = ${60 * m}$ seconds.`,
      type: "unit_convert_time"
    };
  },
  // Unit rates: price per item / speed per hour.
  13: (_diffFactor, idx) => {
    if (idx % 2 === 0) {
      const u = 3 + (idx % 4);            // 3..6 per item
      const n = u + 1 + (idx % 3);        // count > unit price keeps every option distinct
      const total = u * n;
      return {
        question: `$${n}$ identical notebooks cost $\\$${total}$ in total. What is the price per notebook?`,
        answer: u,
        distractors: [total - n, n, total * n], // subtracted; reported the count; multiplied
        explanation: `A unit rate divides the total by the count: $\\$${total} \\div ${n} = \\$${u}$ each. Check by re-multiplying: $${n} \\times ${u} = ${total}$ — 'per' always signals a division.`,
        type: "unit_rate",
        total, count: n
      };
    }
    const s = 20 + 10 * (idx % 5);        // 20..60 km/h
    const t = 2 + (idx % 3);              // 2..4 h
    const dkm = s * t;
    return {
      question: `A train covers $${dkm}$ km in $${t}$ hours at a steady speed. How fast is it going, in km/h?`,
      answer: s,
      distractors: [dkm - t, dkm + t, dkm * t], // subtracted; added; multiplied
      explanation: `Speed is the distance covered in ONE hour: $${dkm} \\div ${t} = ${s}$ km/h. Subtracting mixes units (km minus hours measures nothing).`,
      type: "unit_rate",
      total: dkm, count: t
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
  },
  // Solve a proportion: the ratio scales, it never adds.
  15: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);             // 2..5
    const b = a + 1 + (idx % 3);         // > a, so the additive trap never equals the answer
    const k = 2 + ((idx + 1) % 4);       // scale factor 2..5
    const big = b * k, x = a * k;
    return {
      question: `Solve the proportion for $x$: $\\frac{${a}}{${b}} = \\frac{x}{${big}}$`,
      answer: x,
      distractors: [a + (big - b), a * b, x + a], // kept the DIFFERENCE equal (additive trap); multiplied the wrong pair; overshot a step
      explanation: `The denominator grew by a factor of $${k}$ (because $${b} \\times ${k} = ${big}$), so the numerator must grow by the SAME factor: $x = ${a} \\times ${k} = ${x}$. Adding the gap ($+${big - b}$, giving $${a + big - b}$) keeps the difference equal — proportions keep the RATIO equal, and those are different promises.`,
      type: "proportion_solve"
    };
  },
  // Discounts: percent OF the price, never the percent AS dollars. No P=100, no 50% —
  // those make distractors collide with the answer.
  16: (_diffFactor, idx) => {
    const P = [40, 60, 80, 120][idx % 4];
    const pct = [10, 20, 25, 40][(idx + 1) % 4];
    const D = (P * pct) / 100;
    if (idx % 2 === 0) {
      return {
        question: `A $\\$${P}$ jacket is $${pct}\\%$ off. What is the sale price?`,
        answer: P - D,
        distractors: [D, P - pct, P + D], // gave the discount; subtracted the percent as dollars; raised the price
        explanation: `The discount is $${pct}\\%$ OF $\\$${P}$: $${P} \\times \\frac{${pct}}{100} = \\$${D}$. The sale price is what REMAINS: $${P} - ${D} = \\$${P - D}$. Subtracting the bare $${pct}$ treats a percent like dollars — it's a fraction of the price, not a price.`,
        type: "percent_discount",
        P, pct
      };
    }
    return {
      question: `A $\\$${P}$ jacket is $${pct}\\%$ off. How much money do you save?`,
      answer: D,
      distractors: [P - D, pct, P - pct], // gave the sale price; the bare percent; percent-as-dollars
      explanation: `The saving IS the discount: $${pct}\\%$ of $\\$${P} = ${P} \\times \\frac{${pct}}{100} = \\$${D}$. The sale price ($\\$${P - D}$) answers a different question — always reread which number was asked for.`,
      type: "percent_discount",
      P, pct
    };
  },
  // Simple interest: I = P × r × t / 100 — the years multiply too.
  17: (_diffFactor, idx) => {
    const P = 100 * (2 + (idx % 4));      // 200..500
    const r = 2 + ((idx + 1) % 5);        // 2..6 percent
    const t = 2 + (idx % 3);              // 2..4 years
    const I = (P * r * t) / 100;
    return {
      question: `You deposit $\\$${P}$ at $${r}\\%$ simple interest per year. How much INTEREST has it earned after $${t}$ years?`,
      answer: I,
      distractors: [(P * r) / 100, P + I, 10 * r * t], // one year only; the full balance; small-number noise
      explanation: `Each year earns the same slice: $${r}\\%$ of $\\$${P} = \\$${(P * r) / 100}$. Over $${t}$ years that's $${(P * r) / 100} \\times ${t} = \\$${I}$ — the years MULTIPLY ($I = P \\cdot r \\cdot t$). The balance ($\\$${P + I}$) includes the principal; the question asked for the interest alone.`,
      type: "simple_interest",
      P, r, t
    };
  },
  // Multi-step word problems: the first computed number is almost never the answer.
  18: (_diffFactor, idx) => {
    if (idx % 2 === 0) {
      const n = 3 + (idx % 3);            // 3..5 items
      const p = [3, 4, 6, 7][idx % 4];    // no 5 — keeps n·p clear of 25 (= 50 − 25 collision)
      const cost = n * p;
      return {
        question: `Maya buys $${n}$ notebooks at $\\$${p}$ each and pays with a $\\$50$ bill. How much change does she get?`,
        answer: 50 - cost,
        distractors: [cost, 50 - n - p, 50 - p], // stopped at the cost; subtracted the parts; bought one notebook
        explanation: `Two steps, in order: the notebooks cost $${n} \\times ${p} = \\$${cost}$; the change is what's left of the bill: $50 - ${cost} = \\$${50 - cost}$. The cost is a STOP on the way, not the destination — reread the question before answering.`,
        type: "multi_step_word"
      };
    }
    const T = 30 + 10 * (idx % 3);        // 30..50
    const k = 2 + (idx % 3);              // 2..4 books
    const q = 4 + (idx % 4);              // 4..7 each
    const spent = k * q;
    return {
      question: `Liam has $\\$${T}$. He buys $${k}$ books at $\\$${q}$ each. How much money does he have left?`,
      answer: T - spent,
      distractors: [spent, T - q, T - k - q], // stopped at the spending; one book only; subtracted the parts
      explanation: `First the spending: $${k} \\times ${q} = \\$${spent}$. Then what remains: $${T} - ${spent} = \\$${T - spent}$. Multi-step problems hide the real question behind an intermediate number — finish the chain.`,
      type: "multi_step_word"
    };
  },
  // Markup: add the increase to the original. pct avoids 50 (which makes up == P - up).
  19: (_diffFactor, idx) => {
    const P = [40, 50, 80, 120][idx % 4];
    const pct = [10, 25, 30, 40][(idx + 1) % 4];
    const up = (P * pct) / 100;
    return {
      question: `A store buys a lamp for $\\$${P}$ and marks it up by $${pct}\\%$. What is the selling price?`,
      answer: P + up,
      distractors: [up, P - up, P + pct], // gave the markup; subtracted it; added the percent as dollars
      explanation: `A markup ADDS to the cost: the increase is $${pct}\\%$ of $\\$${P} = \\$${up}$, so the price becomes $${P} + ${up} = \\$${P + up}$. (Keeping $${100 + pct}\\%$ of the cost in one step: $${P} \\times ${(100 + pct) / 100} = \\$${P + up}$.) A discount would subtract — a markup climbs.`,
      type: "percent_markup"
    };
  },
  // Percent error: |measured - true| / TRUE × 100. Always an OVER-measurement so the
  // divide-by-measured distractor rounds strictly below the answer (no collision); errors
  // are large enough that the rounded wrong value never lands on the right one.
  21: (_diffFactor, idx) => {
    const T = [50, 80, 200, 40][idx % 4];      // true value
    const errPct = [10, 20, 25, 40][idx % 4];  // intended whole-percent error
    const diff = (T * errPct) / 100;
    const measured = T + diff;
    return {
      question: `A true value is $${T}$, but an experiment measured $${measured}$. What is the percent error?`,
      answer: errPct,
      distractors: [Math.round((diff / measured) * 100), diff, errPct + 5], // divided by measured; raw difference; near miss
      explanation: `Percent error scales the miss against the TRUE value: $\\frac{|${measured} - ${T}|}{${T}} \\times 100 = \\frac{${diff}}{${T}} \\times 100 = ${errPct}\\%$. Dividing by the measured value ($${measured}$) answers a subtly different — and wrong — question: the accepted truth is the yardstick, not your own reading.`,
      type: "percent_error"
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
  // Work BACKWARDS from the mean: the total is the mean's hidden promise.
  12: (_diffFactor, idx) => {
    const M = 10 + (idx % 5);                  // mean 10..14
    const a = M - 4 + (idx % 3);
    const b = M + 1 + (idx % 3);
    const c = M - 2 - (idx % 2);
    const x = 4 * M - (a + b + c);             // always > M by construction (never equals the mean distractor)
    return {
      question: `The mean of four scores is $${M}$. Three of them are $${a}$, $${b}$ and $${c}$. What is the fourth score?`,
      answer: x,
      distractors: [M, 4 * M, a + b + c], // repeated the mean; gave the total; summed the three
      explanation: `A mean of $${M}$ over four scores promises a TOTAL of $4 \\times ${M} = ${4 * M}$. The three known scores supply $${a} + ${b} + ${c} = ${a + b + c}$, so the fourth must contribute the rest: $${4 * M} - ${a + b + c} = ${x}$. The mean itself is rarely any individual score — it's the total in disguise.`,
      type: "mean_missing_value"
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
  },
  // Compound probability: independent events MULTIPLY. Answers as fractions.
  14: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);   // 2..4 sections on the first spinner
    const b = 4 + (idx % 3);   // 4..6 on the second
    return {
      question: `One spinner has $${a}$ equal sections (one is red); another has $${b}$ equal sections (one is blue). You spin both. What is the probability of landing on red AND blue?`,
      answer: `1/${a * b}`,
      distractors: [`1/${a + b}`, `${a + b}/${a * b}`, `1/${b}`], // added the denominators; added the probabilities; ignored the first spinner
      explanation: `The spins don't influence each other, so the probabilities MULTIPLY: $\\frac{1}{${a}} \\times \\frac{1}{${b}} = \\frac{1}{${a * b}}$ — of the $${a * b}$ equally likely outcome PAIRS, exactly one is (red, blue). Adding probabilities is only for either-or questions about a single draw, never for both-at-once.`,
      type: "compound_probability"
    };
  },
  // The complement rule: P(not A) = 1 - P(A), as a percent.
  15: (_diffFactor, idx) => {
    const total = 20;
    const fav = [3, 7, 9, 11, 13][idx % 5];   // favorable count; pct never 50, never equals 100-pct
    const pct = (fav * 100) / total;
    return {
      question: `A bag holds $20$ marbles, $${fav}$ of them red. What is the probability of drawing a marble that is NOT red, as a percent?`,
      answer: 100 - pct,
      distractors: [pct, fav, total - fav], // gave P(red); the red count; the non-red count (not a percent)
      explanation: `Every marble is red OR not red, and the two chances fill the whole $100\\%$: $P(\\text{red}) = \\frac{${fav}}{20} = ${pct}\\%$, so $P(\\text{not red}) = 100\\% - ${pct}\\% = ${100 - pct}\\%$. The complement is what's LEFT of certainty — subtract from $100$, not from the count.`,
      type: "probability_complement"
    };
  },
  // Drawing TWO without replacement: the second draw sees a smaller bag. Answer as a fraction.
  16: (_diffFactor, idx) => {
    const total = [5, 6, 7][idx % 3];     // small bag
    const win = 2 + (idx % 2);            // 2 or 3 winners
    // P(both winners) = win/total × (win-1)/(total-1)
    return {
      question: `A bag has $${total}$ marbles, $${win}$ of them gold. You draw TWO without putting the first back. What is the probability BOTH are gold?`,
      answer: `${win * (win - 1)}/${total * (total - 1)}`,
      distractors: [
        `${win * win}/${total * total}`,         // treated draws as independent (with replacement)
        `${win}/${total}`,                        // only the first draw
        `${(win - 1)}/${(total - 1)}`             // only the second draw
      ],
      explanation: `The first draw is $\\frac{${win}}{${total}}$ gold. Now the bag has ONE fewer gold and one fewer marble, so the second is $\\frac{${win - 1}}{${total - 1}}$. Multiply: $\\frac{${win}}{${total}} \\times \\frac{${win - 1}}{${total - 1}} = \\frac{${win * (win - 1)}}{${total * (total - 1)}}$. Without replacement, the second denominator DROPS — the draws are no longer independent.`,
      type: "prob_without_replacement"
    };
  },
  // ---- Statistics II: measures of spread (quartiles, IQR, MAD — 6.SP.B.5c) ----
  // First quartile: the median of the lower half. 7 sorted values → Q1 = 2nd, median = 4th, Q3 = 6th.
  17: (_diffFactor, idx) => {
    const v0 = 2 + (idx % 6);
    const g = [1 + (idx % 3), 1 + ((idx + 1) % 3), 2 + (idx % 2), 1 + ((idx + 2) % 3), 2 + ((idx + 1) % 2), 1 + (idx % 3)];
    const v = [v0];
    for (let k = 0; k < 6; k++) v.push(v[v.length - 1] + g[k]);
    return {
      question: `Find the first quartile (Q1) of the data set $${v.join(', ')}$.`,
      answer: v[1],
      distractors: [v[3], v[0], v[5]], // gave the overall median; gave the minimum; gave Q3 instead
      explanation: `With $7$ values the median is the $4$th, $${v[3]}$, which splits off a lower half $${v[0]}, ${v[1]}, ${v[2]}$. Q1 is the median of THAT half — its middle value, $${v[1]}$. The lowest value $${v[0]}$ is the minimum, not the quartile; the overall median $${v[3]}$ is the center of all seven.`,
      type: "stat_quartile",
      median: v[3], min: v[0], q3: v[5], q1: v[1]
    };
  },
  // Interquartile range: Q3 − Q1, the spread of the middle half (resists outliers).
  18: (_diffFactor, idx) => {
    const v0 = 2 + (idx % 6);
    const g = [1 + (idx % 3), 1 + ((idx + 1) % 3), 2 + (idx % 2), 1 + ((idx + 2) % 3), 2 + ((idx + 1) % 2), 1 + (idx % 3)];
    const v = [v0];
    for (let k = 0; k < 6; k++) v.push(v[v.length - 1] + g[k]);
    const q1 = v[1], q3 = v[5];
    return {
      question: `Find the interquartile range (IQR) of the data set $${v.join(', ')}$.`,
      answer: q3 - q1,
      distractors: [v[6] - v[0], q3, q1], // gave the full range; gave Q3 alone; gave Q1 alone
      explanation: `The IQR measures the middle $50\\%$: $\\text{Q3} - \\text{Q1}$. Here Q1 $= ${q1}$ (median of the lower half) and Q3 $= ${q3}$ (median of the upper half), so IQR $= ${q3} - ${q1} = ${q3 - q1}$. The full range $${v[6]} - ${v[0]} = ${v[6] - v[0]}$ uses the extremes; the IQR deliberately ignores them.`,
      type: "stat_iqr",
      max: v[6], min: v[0], q3, q1
    };
  },
  // Mean absolute deviation: the average distance from the mean. Symmetric data → integer MAD.
  19: (_diffFactor, idx) => {
    const m = 20 + (idx % 6);
    const a = 2 + (idx % 3);
    const b = a + 2;
    const values = [m - b, m - a, m + a, m + b]; // mean is m by symmetry
    const mad = a + 1;                            // (b + a + a + b) / 4 = (a + b) / 2 = a + 1
    return {
      question: `Find the mean absolute deviation (MAD) of the data set $${values.join(', ')}$.`,
      answer: mad,
      distractors: [4 * mad, 2 * b, m], // summed the deviations but never divided; gave the range; gave the mean
      explanation: `The mean is $${m}$ (the data is balanced around it). The distances from $${m}$ are $${b}, ${a}, ${a}, ${b}$, which sum to $${4 * mad}$. MAD is the AVERAGE distance: $\\frac{${4 * mad}}{4} = ${mad}$. Forgetting to divide leaves the total $${4 * mad}$; the mean itself ($${m}$) is the center, not the spread.`,
      type: "stat_mad",
      mean: m, sumdev: 4 * mad, range: 2 * b
    };
  },
  // ---- Statistics III: probability foundations (7.SP.C) ----
  // Theoretical probability as a REDUCED fraction: favorable / total. Distractors are genuinely
  // DIFFERENT VALUES (never an unreduced form of the answer — the CAS grader treats 2/6 == 1/3, so
  // an unreduced "distractor" would grade as a second correct option). Misconceptions modeled:
  // the complement (P of not winning), the flipped fraction, and ODDS (wins : losses) read as P.
  21: (_diffFactor, idx) => {
    // Curated (favorable, total): the fraction reduces, favorable != total/2 (complement differs),
    // and the odds form wins/(total-wins) is a genuinely different value from favorable/total.
    const [fav, total] = [[2, 6], [3, 9], [2, 8], [4, 10], [3, 12]][idx % 5];
    const g = gcd(fav, total);
    const rn = fav / g, rd = total / g;          // reduced favorable / total (the answer)
    const cf = total - fav;                       // non-favorable count (losers)
    const cg = gcd(cf, total);
    const cn = cf / cg, cd = total / cg;          // reduced complement = P(not win)
    const og = gcd(fav, cf);
    const on = fav / og, od = cf / og;            // reduced ODDS for: wins / losses
    return {
      question: `A spinner has $${total}$ equal sections, $${fav}$ of them winning. What is the theoretical probability of a win, as a fraction in simplest form?`,
      answer: `${rn}/${rd}`,
      distractors: [
        `${cn}/${cd}`,            // probability of NOT winning (complement)
        `${total}/${fav}`,        // flipped the fraction (total over favorable)
        `${on}/${od}`             // ODDS wins:losses read as a probability (favorable over non-favorable)
      ],
      explanation: `Theoretical probability is favorable over TOTAL outcomes: $\\frac{${fav}}{${total}} = \\frac{${rn}}{${rd}}$ in simplest form. $\\frac{${cn}}{${cd}}$ is the chance of NOT winning (the complement); $\\frac{${total}}{${fav}}$ flips numerator and denominator; and $\\frac{${on}}{${od}}$ is the ODDS (wins to losses, $${fav}$ over $${cf}$), which uses the wrong denominator — probability divides by the total, not by the losers.`,
      type: "stat_theoretical_prob"
    };
  },
  // Experimental probability from observed trials: successes / trials (reduced). Distractors are
  // genuinely DIFFERENT VALUES (no unreduced form of the answer): failures/trials, the flipped
  // fraction, and successes/failures (the odds, a wrong denominator).
  22: (_diffFactor, idx) => {
    // Curated (successes, trials): successes != trials/2 (failures differ), the fraction reduces.
    const [succ, trials] = [[6, 9], [8, 12], [9, 12], [4, 10], [10, 15]][idx % 5];
    const g = gcd(succ, trials);
    const rn = succ / g, rd = trials / g;         // reduced successes / trials (the answer)
    const fail = trials - succ;
    const fg = gcd(fail, trials);
    const fn = fail / fg, fd = trials / fg;        // reduced failures / trials
    const og = gcd(succ, fail);
    const on = succ / og, od = fail / og;          // reduced successes / failures (odds)
    return {
      question: `A chip was flipped $${trials}$ times and landed heads $${succ}$ times. What is the experimental probability of heads, as a fraction in simplest form?`,
      answer: `${rn}/${rd}`,
      distractors: [
        `${fn}/${fd}`,           // probability of the OTHER outcome (tails)
        `${trials}/${succ}`,     // flipped the fraction (trials over successes)
        `${on}/${od}`            // successes over FAILURES (odds, wrong denominator)
      ],
      explanation: `Experimental probability uses what actually HAPPENED: heads over total FLIPS, $\\frac{${succ}}{${trials}} = \\frac{${rn}}{${rd}}$ in simplest form. $\\frac{${fn}}{${fd}}$ is the experimental probability of tails; $\\frac{${trials}}{${succ}}$ flips the fraction; and $\\frac{${on}}{${od}}$ divides heads by TAILS (the odds), not by the total flips.`,
      type: "stat_experimental_prob"
    };
  },
  // Sample space via the fundamental counting principle: total outcomes = product of the choices
  // at each independent stage. Distractors: ADDING the stages (the classic error), and one stage alone.
  23: (_diffFactor, idx) => {
    // Curated (shirts, pants, hats): product, sum, a·b and b·c are all distinct (the distractors
    // model adding the stages, and using only two of the three stages).
    const [a, b, c] = [[2, 3, 4], [3, 2, 4], [2, 3, 5], [4, 2, 3], [3, 3, 4]][idx % 5];
    const product = a * b * c;
    const sum = a + b + c;
    return {
      question: `An outfit is one of $${a}$ shirts, one of $${b}$ pairs of pants, and one of $${c}$ hats. How many different outfits are possible?`,
      answer: product,
      distractors: [sum, a * b, b * c], // added the stages; used only two stages; dropped the first stage
      explanation: `By the counting principle, independent choices MULTIPLY: $${a} \\times ${b} \\times ${c} = ${product}$ outfits — every shirt pairs with every pants-and-hat combination. Adding ($${a} + ${b} + ${c} = ${sum}$) counts items, not combinations, and using only two of the three stages ($${a * b}$ or $${b * c}$) forgets a choice.`,
      type: "stat_sample_space",
      sum, partial: a * b
    };
  }
};

// -------------------------------------------------------------
// ALGEBRAIC EXPRESSIONS TEMPLATES — the bridge from arithmetic to equation-solving (audit #1.1
// Phase 5): evaluating expressions, combining like terms, and distributing. Numeric answers stay
// positive; the simplify/expand items use symbolic STRING answers with custom string distractors
// (the distractor engine passes those through untouched). Routed by the 'expressions' category.
// -------------------------------------------------------------
templates.expressions = {
  // Evaluate a x + b at a given x.
  11: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);
    const b = 1 + (idx % 6);
    const x = 2 + (idx % 5);
    const answer = a * x + b;
    return {
      question: `Evaluate $${a}x + ${b}$ when $x = ${x}$.`,
      answer,
      distractors: [a + x + b, a * x, a * (x + b)], // added everything; forgot +b; wrong order of ops
      explanation: `Substitute $x = ${x}$ and follow order of operations: $${a}(${x}) + ${b} = ${a * x} + ${b} = ${answer}$.`,
      type: "eval_expression"
    };
  },
  // Evaluate a two-variable expression a·m + b·n.
  12: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);
    const b = 2 + (idx % 4);
    const m = 2 + (idx % 4);
    const n = 1 + (idx % 5);
    const answer = a * m + b * n;
    return {
      question: `Evaluate $${a}m + ${b}n$ when $m = ${m}$ and $n = ${n}$.`,
      answer,
      distractors: [a + b + m + n, a * m, a * n + b * m], // added all; only first term; swapped values
      explanation: `Substitute both values: $${a}(${m}) + ${b}(${n}) = ${a * m} + ${b * n} = ${answer}$.`,
      type: "eval_two_var"
    };
  },
  // Combine like terms a x + b x.
  13: (_diffFactor, idx) => {
    const a = 2 + (idx % 5);
    const b = 3 + (idx % 4);
    const sum = a + b;
    return {
      question: `Simplify: $${a}x + ${b}x$`,
      answer: `${sum}x`,
      distractors: [`${a * b}x`, `${sum}x^2`, `${sum}`], // multiplied coefficients; added exponents; dropped x
      explanation: `Like terms share the variable, so add their coefficients: $${a}x + ${b}x = (${a} + ${b})x = ${sum}x$.`,
      type: "combine_like_terms"
    };
  },
  // Words → symbols. b > a keeps the swapped-roles distractor honest.
  14: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);           // multiplier 2..5
    const b = a + 1 + (idx % 4);       // constant, strictly bigger than a
    if (idx % 2 === 0) {
      return {
        question: `Translate into an expression: "$${b}$ more than $${a}$ times a number $x$".`,
        answer: `${a}x + ${b}`,
        distractors: [`${a}(x + ${b})`, `${b}x + ${a}`, `${a}x - ${b}`], // grouped the addition inside; swapped the roles; flipped more/less
        explanation: `Build it inside-out: "$${a}$ times a number" is $${a}x$; "$${b}$ more than" THAT adds $${b}$ afterwards: $${a}x + ${b}$. Wrapping it as $${a}(x + ${b})$ multiplies the $${b}$ too — the words never asked for that.`,
        type: "translate_expression"
      };
    }
    return {
      question: `Translate into an expression: "$${b}$ less than $${a}$ times a number $x$".`,
      answer: `${a}x - ${b}`,
      distractors: [`${b} - ${a}x`, `${a}x + ${b}`, `${a}(x - ${b})`], // reversed the subtraction (THE classic); flipped less/more; grouped
      explanation: `"$${b}$ less than SOMETHING" means the something comes first and $${b}$ leaves it: $${a}x - ${b}$. English reverses the order here — "$${b}$ less than $${a}x$" is NOT $${b} - ${a}x$, just as "3 less than 10" is 7, not $-7$.`,
      type: "translate_expression"
    };
  },
  // Distribute a(x + b).
  15: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);
    const b = 3 + (idx % 5);
    return {
      question: `Expand: $${a}(x + ${b})$`,
      answer: `${a}x + ${a * b}`,
      distractors: [`${a}x + ${b}`, `x + ${a * b}`, `${a}x + ${a + b}`], // forgot to distribute to constant; to first term; added instead of multiplied
      explanation: `Multiply $${a}$ by each term inside the parentheses: $${a}(x + ${b}) = ${a}x + ${a * b}$.`,
      type: "distribute"
    };
  },
  // --- Polynomial depth (keys 16-18; key 14 stays free so 10s/boss rules are untouched). ---
  // Multiply two binomials (FOIL). b > a >= 1 keeps the sum and product always distinct.
  16: (_diffFactor, idx) => {
    const a = 1 + (idx % 4);            // 1..4
    const b = a + 1 + (idx % 3);        // a+1 .. a+3
    const S = a + b, P = a * b;
    if (idx % 2 === 0) {
      return {
        question: `Expand: $(x + ${a})(x + ${b})$`,
        answer: `x^2 + ${S}x + ${P}`,
        distractors: [`x^2 + ${P}`, `x^2 + ${P}x + ${S}`, `x^2 + ${S}x + ${S}`], // skipped Outer/Inner; swapped sum and product; used the sum twice
        explanation: `Four products — First $x \\cdot x$, Outer $x \\cdot ${b}$, Inner $${a} \\cdot x$, Last $${a} \\cdot ${b}$: $x^2 + ${b}x + ${a}x + ${P} = x^2 + ${S}x + ${P}$. The middle term comes from the Outer+Inner pairs — skipping them is the classic slip.`,
        type: "foil_binomials"
      };
    }
    return {
      question: `Expand: $(x - ${a})(x - ${b})$`,
      answer: `x^2 - ${S}x + ${P}`,
      distractors: [`x^2 - ${S}x - ${P}`, `x^2 + ${S}x + ${P}`, `x^2 - ${P}x + ${S}`], // negative times negative stayed negative; dropped both minus signs; swapped sum and product
      explanation: `FOIL with signs: $x^2 - ${b}x - ${a}x + ${P}$. The Last product $(-${a})(-${b}) = +${P}$ — two negatives multiply to a POSITIVE, while the middle terms stay negative: $x^2 - ${S}x + ${P}$.`,
      type: "foil_binomials"
    };
  },
  // Square a binomial. a >= 3 keeps 2a, a, and a^2 pairwise distinct in the options.
  17: (_diffFactor, idx) => {
    const a = 3 + (idx % 4); // 3..6
    const D = 2 * a, Q = a * a;
    if (idx % 2 === 0) {
      return {
        question: `Expand: $(x + ${a})^2$`,
        answer: `x^2 + ${D}x + ${Q}`,
        distractors: [`x^2 + ${Q}`, `x^2 + ${a}x + ${Q}`, `x^2 + ${D}x + ${D}`], // the freshman's dream; forgot to double the middle; doubled the last term too
        explanation: `$(x + ${a})^2 = (x + ${a})(x + ${a})$ — FOIL it: $x^2 + ${a}x + ${a}x + ${Q} = x^2 + ${D}x + ${Q}$. The middle term appears TWICE (once Outer, once Inner), which is where the $2$ in $2ax$ comes from. $x^2 + ${Q}$ ignores both cross terms.`,
        type: "square_binomial"
      };
    }
    return {
      question: `Expand: $(x - ${a})^2$`,
      answer: `x^2 - ${D}x + ${Q}`,
      distractors: [`x^2 - ${Q}`, `x^2 - ${D}x - ${Q}`, `x^2 - ${a}x + ${Q}`], // freshman's dream with a minus; last term kept negative; forgot to double
      explanation: `$(x - ${a})^2$: the cross terms are $-${a}x$ twice → $-${D}x$, and the Last is $(-${a})(-${a}) = +${Q}$ — a square is never negative: $x^2 - ${D}x + ${Q}$.`,
      type: "square_binomial"
    };
  },
  // Factor a trinomial back into binomials. a >= 2 keeps the (1, P) trap a genuine distractor.
  18: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);            // 2..4
    const b = a + 1 + (idx % 3);        // a+1 .. a+3
    const S = a + b, P = a * b;
    if (idx % 2 === 0) {
      return {
        question: `Factor: $x^2 + ${S}x + ${P}$`,
        answer: `(x + ${a})(x + ${b})`,
        distractors: [`(x + 1)(x + ${P})`, `(x + 1)(x + ${S - 1})`, `(x - ${a})(x - ${b})`], // right product, wrong sum; right sum, wrong product; flipped the signs
        explanation: `Hunt for two numbers that MULTIPLY to $${P}$ and ADD to $${S}$: $${a}$ and $${b}$. Then $x^2 + ${S}x + ${P} = (x + ${a})(x + ${b})$ — FOIL it back to check both conditions, not just one.`,
        type: "factor_trinomial"
      };
    }
    return {
      question: `Factor: $x^2 - ${S}x + ${P}$`,
      answer: `(x - ${a})(x - ${b})`,
      distractors: [`(x + ${a})(x + ${b})`, `(x + ${a})(x - ${b})`, `(x - 1)(x - ${P})`], // ignored the minus; mixed signs (product would be negative); right product, wrong sum
      explanation: `The product $+${P}$ is positive but the sum $-${S}$ is negative — BOTH factors must be negative: $(x - ${a})(x - ${b})$. Mixed signs would make the product negative; check by expanding.`,
      type: "factor_trinomial"
    };
  }
};

// -------------------------------------------------------------
// INTEGERS TEMPLATES — signed-number arithmetic & absolute value (audit #1.1): the negative-number
// band the curriculum lacked entirely. Answers may be NEGATIVE; the distractor engine now passes
// author-supplied signed distractors through (see distractors.js), so the wrong options encode the
// real sign errors (dropped the minus, added magnitudes, kept the sign through an absolute value).
// Routed by the 'integers' category. `wrap` parenthesises a negative so "$-5 + (-3)$" reads clean.
// -------------------------------------------------------------
const wrap = (n) => (n < 0 ? `(${n})` : `${n}`);

templates.integers = {
  // Absolute value: distance from zero, always non-negative.
  4: (_diffFactor, idx) => {
    const p = 3 + (idx % 8);
    return {
      question: `Evaluate: $|{-${p}}|$`,
      answer: p,
      distractors: [-p, 0, 2 * p], // kept the sign; collapsed to zero; doubled
      explanation: `Absolute value is distance from zero, which is never negative: $|{-${p}}| = ${p}$.`,
      type: "absolute_value"
    };
  },
  // Adding integers with mixed signs.
  5: (_diffFactor, idx) => {
    const m1 = 3 + (idx % 6);
    const m2 = 2 + (idx % 5);
    const [s1, s2] = [[-1, 1], [-1, -1], [1, -1]][idx % 3];
    const a = s1 * m1, b = s2 * m2;
    const answer = a + b;
    return {
      question: `Calculate: $${a} + ${wrap(b)}$`,
      answer,
      distractors: [a - b, -(a + b), b - a], // subtracted instead; flipped the sign; reversed
      explanation: `Combine the signed numbers on the number line: $${a} + ${wrap(b)} = ${answer}$.`,
      type: "integer_add"
    };
  },
  // Subtracting integers (including subtracting a negative).
  6: (_diffFactor, idx) => {
    const m1 = 2 + (idx % 5);
    const m2 = 4 + (idx % 5);
    const [s1, s2] = [[1, 1], [-1, 1], [1, -1]][idx % 3];
    const a = s1 * m1, b = s2 * m2;
    const answer = a - b;
    return {
      question: `Calculate: $${a} - ${wrap(b)}$`,
      answer,
      distractors: [b - a, a + b, -(a + b)], // reversed the order; added instead; flipped
      explanation: `Subtracting is adding the opposite: $${a} - ${wrap(b)} = ${a} + ${wrap(-b)} = ${answer}$.`,
      type: "integer_sub"
    };
  },
  // Ordering integers: left on the number line is smaller, whatever the digits say.
  7: (_diffFactor, idx) => {
    const m = 2 + (idx % 4); // 2..5
    const vals = [-(m + 6), -(m + 1), m + 2, m + 6];
    const fmt = (v) => `${v}`;
    if (idx % 2 === 0) {
      return {
        question: `Which of these integers is the smallest? $${vals[0]}, \\;\\; ${m + 2}, \\;\\; ${vals[1]}, \\;\\; ${m + 6}$`,
        answer: fmt(vals[0]),
        distractors: [fmt(vals[1]), fmt(m + 2), fmt(m + 6)], // the 'smaller-looking' negative; the positives
        explanation: `On the number line, smaller means further LEFT. Both negatives sit left of both positives, and between the negatives, $${vals[0]}$ lies further left than $${vals[1]}$ — a bigger debt is a smaller balance. Digits measure distance from zero, not order.`,
        type: "integer_compare"
      };
    }
    return {
      question: `Which of these integers is the largest? $${vals[1]}, \\;\\; ${m + 6}, \\;\\; ${vals[0]}, \\;\\; ${m + 2}$`,
      answer: fmt(m + 6),
      distractors: [fmt(vals[0]), fmt(m + 2), fmt(vals[1])], // the big-digit negative trap; the runner-up; the near negative
      explanation: `Largest means furthest RIGHT: $${m + 6}$. The trap is $${vals[0]}$ — its digits are big, but the minus sign sends it furthest LEFT of all. Any positive beats every negative.`,
      type: "integer_compare"
    };
  },
  // Multiplying signed integers (sign rules).
  8: (_diffFactor, idx) => {
    const m1 = 2 + (idx % 5);
    const m2 = 2 + (idx % 4);
    const [s1, s2] = [[-1, 1], [-1, -1], [1, -1]][idx % 3];
    const a = s1 * m1, b = s2 * m2;
    const answer = a * b;
    return {
      question: `Calculate: $${a} \\times ${wrap(b)}$`,
      answer,
      distractors: [-(a * b), a + b, -(a + b)], // wrong sign; added instead; flipped sum
      explanation: `Like signs give a positive product, unlike signs a negative one: $${a} \\times ${wrap(b)} = ${answer}$.`,
      type: "integer_mult"
    };
  },
  // Dividing signed integers (sign rules; quotients always exact).
  9: (_diffFactor, idx) => {
    const q = 2 + (idx % 5);              // 2..6
    const d = 2 + ((idx + 1) % 4);        // 2..5
    const [s1, s2] = [[-1, 1], [-1, -1], [1, -1]][idx % 3];
    const a = s1 * q * d, b = s2 * d;
    const answer = a / b;                  // ±q
    return {
      question: `Calculate: $${a} \\div ${wrap(b)}$`,
      answer,
      distractors: [-answer, a * b, answer + (answer > 0 ? 1 : -1)], // sign slip; multiplied instead; magnitude slip
      explanation: `Divide the magnitudes ($${q * d} \\div ${d} = ${q}$), then apply the SAME sign rule as multiplication — like signs positive, unlike signs negative: $${answer}$.`,
      type: "integer_div"
    };
  },
  // Order of operations with negatives: multiplication binds before addition.
  11: (_diffFactor, idx) => {
    const a = 2 + (idx % 5);             // 2..6
    const b = 2 + ((idx + 1) % 4);       // 2..5
    const c = 2 + ((idx + 2) % 3);       // 2..4
    const answer = -a - b * c;
    return {
      question: `Calculate: $-${a} + ${b} \\times (-${c})$`,
      answer,
      distractors: [(-a + b) * -c, -a + b * c, a + b * c], // added before multiplying; treated -c as c; dropped both signs
      explanation: `Multiplication first: $${b} \\times (-${c}) = -${b * c}$. Then combine: $-${a} + (-${b * c}) = ${answer}$. Working left to right computes $(-${a} + ${b}) \\times (-${c})$ — a different expression entirely.`,
      type: "integer_ops"
    };
  }
};

// -------------------------------------------------------------
// DECIMALS TEMPLATES (audit #1.1 — decimal place value & operations).
// Every arithmetic step is done in scaled INTEGERS (tenths / hundredths) and only
// formatted with toFixed at the very end, so binary-float noise (the classic
// 0.1 + 0.2 = 0.30000000000000004 bug) can never reach a question, answer, or
// distractor. Distractors encode real place-value misconceptions.
// -------------------------------------------------------------
templates.decimals = {
  // Adding decimals — line up the decimal points (one decimal place each).
  3: (_diffFactor, idx) => {
    const a10 = 12 + (idx % 58);          // 1.2 .. 6.9
    const b10 = 7 + ((idx * 3) % 42);     // 0.7 .. 4.8
    const sum10 = a10 + b10;
    const a = (a10 / 10).toFixed(1);
    const b = (b10 / 10).toFixed(1);
    const answer = (sum10 / 10).toFixed(1);
    return {
      question: `Add the decimals: $${a} + ${b}$`,
      answer,
      distractors: [
        ((sum10 - 10) / 10).toFixed(1),   // forgot to carry into the ones place
        ((sum10 + 1) / 10).toFixed(1),     // tenths-place slip
        ((sum10 - 1) / 10).toFixed(1)      // tenths-place slip
      ],
      explanation: `Line up the decimal points and add column by column: $${a} + ${b} = ${answer}$.`,
      type: "decimal_add"
    };
  },
  // Percent ↔ decimal conversion: a percent IS hundredths, so the point slides two places.
  4: (_diffFactor, idx) => {
    const p = [35, 7, 42, 65, 8, 56, 73][idx % 7]; // no 50 (its complement would collide)
    if (idx % 2 === 0) {
      return {
        question: `Write $${p}\\%$ as a decimal.`,
        answer: (p / 100).toFixed(2),
        distractors: [(p / 10).toFixed(1), `${p}`, (p / 10000).toFixed(4)], // slid one place; dropped the percent; slid too far
        explanation: `Percent means 'per hundred', so $${p}\\% = \\frac{${p}}{100} = ${(p / 100).toFixed(2)}$ — the decimal point slides exactly TWO places left, one per zero in 100.`,
        type: "percent_decimal_convert"
      };
    }
    return {
      question: `Write $${(p / 100).toFixed(2)}$ as a percent (number only).`,
      answer: p,
      distractors: [p / 10, p * 10, 100 - p], // slid one place; slid three; complement confusion
      explanation: `Multiply by $100$ (slide the point two places right): $${(p / 100).toFixed(2)} = ${p}\\%$. Out of a hundred — that's all a percent says.`,
      type: "percent_decimal_convert"
    };
  },
  // Subtracting decimals — line up the points (result kept positive; signs are the integers strand).
  5: (_diffFactor, idx) => {
    const b10 = 8 + ((idx * 3) % 36);     // 0.8 .. 4.3
    const a10 = b10 + 12 + (idx % 47);    // always greater than b10
    const diff10 = a10 - b10;
    const a = (a10 / 10).toFixed(1);
    const b = (b10 / 10).toFixed(1);
    const answer = (diff10 / 10).toFixed(1);
    return {
      question: `Subtract the decimals: $${a} - ${b}$`,
      answer,
      distractors: [
        ((diff10 + 10) / 10).toFixed(1),  // forgot to borrow (off by a whole)
        ((diff10 + 1) / 10).toFixed(1),    // tenths-place slip
        ((diff10 - 1) / 10).toFixed(1)     // tenths-place slip
      ],
      explanation: `Line up the decimal points and subtract column by column: $${a} - ${b} = ${answer}$.`,
      type: "decimal_sub"
    };
  },
  // Which decimal is largest? The "more digits = bigger" trap, by construction.
  6: (_diffFactor, idx) => {
    const t = 3 + (idx % 4); // tenths digit 3..6
    const a = `0.${t}5`;                 // largest
    const b = `0.${t}`;
    const c = `0.${t - 1}99`;            // the most DIGITS, yet third in size
    const d = `0.${t - 1}8`;
    return {
      question: `Which of these decimals is the largest? $${a}, \\;\\; ${b}, \\;\\; ${c}, \\;\\; ${d}$`,
      answer: a,
      distractors: [c, b, d], // the longest string; the bare tenths; the smallest
      explanation: `Compare place by place, left to right: the tenths digit decides first — $${a}$ and $${b}$ start with $${t}$, beating the $${t - 1}$s regardless of how many digits follow. Then hundredths: $5 > 0$. Length is not size: $${c}$ wears the most digits and still loses to $${b}$.`,
      type: "decimal_compare"
    };
  },
  // Multiplying decimals — multiply the digits, then count decimal places.
  7: (_diffFactor, idx) => {
    const a10 = 3 + (idx % 12);           // 0.3 .. 1.4
    const b10 = 2 + ((idx * 3) % 11);     // 0.2 .. 1.2
    const prod100 = a10 * b10;
    const a = (a10 / 10).toFixed(1);
    const b = (b10 / 10).toFixed(1);
    const answer = (prod100 / 100).toFixed(2);
    return {
      question: `Multiply the decimals: $${a} \\times ${b}$`,
      answer,
      distractors: [
        (prod100 / 10).toFixed(1),         // miscounted decimal places (10x too big)
        ((a10 + b10) / 10).toFixed(1),     // added instead of multiplying
        ((prod100 + 1) / 100).toFixed(2)   // hundredths slip
      ],
      explanation: `Multiply the digits as whole numbers ($${a10} \\times ${b10} = ${prod100}$), then place the point so the product has $2$ decimal places: $${answer}$.`,
      type: "decimal_mult"
    };
  },
  // Fraction → decimal: benchmark fractions with exact decimal forms.
  8: (_diffFactor, idx) => {
    const pairs = [[1, 2, '0.5'], [3, 4, '0.75'], [1, 4, '0.25'], [2, 5, '0.4'], [3, 5, '0.6'], [1, 8, '0.125'], [4, 5, '0.8']];
    const [a, b, dec] = pairs[idx % 7];
    return {
      question: `Write $\\frac{${a}}{${b}}$ as a decimal.`,
      answer: dec,
      distractors: [
        `${(a / b * 10) % 1 === 0 ? (a / b * 10) : (a / b * 10).toFixed(1)}`, // decimal point one place off
        `0.${a}${b}`,                                                          // glued the digits
        `0.${a}`                                                               // numerator as tenths
      ],
      explanation: `The fraction bar is a division: $${a} \\div ${b} = ${dec}$. The digits of the fraction never just move behind a point — $\\frac{${a}}{${b}}$ means '$${a}$ split $${b}$ ways', and only dividing performs the split.`,
      type: "fraction_decimal_convert"
    };
  },
  // Rounding decimals — round a hundredths value to the nearest tenth.
  9: (_diffFactor, idx) => {
    const whole = 1 + (idx % 8);          // 1 .. 8
    const tenth = 1 + ((idx * 2) % 8);    // 1 .. 8 (keeps the answer off whole numbers)
    const hund = 1 + ((idx * 3) % 9);     // 1 .. 9 (never .x0, so rounding always matters)
    const n100 = whole * 100 + tenth * 10 + hund;
    const value = (n100 / 100).toFixed(2);
    const rounded10 = Math.round(n100 / 10);           // nearest tenth, expressed in tenths
    const answer = (rounded10 / 10).toFixed(1);
    const altTenth = hund >= 5 ? rounded10 - 1 : rounded10 + 1; // rounded the wrong direction
    return {
      question: `Round $${value}$ to the nearest tenth.`,
      answer,
      distractors: [
        value,                                  // never rounded — kept both decimals
        (altTenth / 10).toFixed(1),             // rounded the wrong direction
        String(Math.round(n100 / 100))          // rounded to the nearest whole instead
      ],
      explanation: `The hundredths digit is $${hund}$, so round ${hund >= 5 ? 'up' : 'down'}: $${value} \\approx ${answer}$ to the nearest tenth.`,
      type: "decimal_round"
    };
  },
  // Dividing decimals — shift both numbers so the divisor is a whole number, then divide.
  11: (_diffFactor, idx) => {
    const q = 2 + (idx % 8);              // clean whole-number quotient 2..9
    const d10 = 2 + ((idx * 3) % 8);      // divisor in tenths: 0.2..0.9
    const dividend10 = q * d10;           // exact, in tenths
    const a = (dividend10 / 10).toFixed(1);
    const b = (d10 / 10).toFixed(1);
    const answer = String(q);
    return {
      question: `Divide the decimals: $${a} \\div ${b}$`,
      answer,
      distractors: [
        (q / 10).toFixed(1),   // didn't shift the divisor to a whole number (10x too small)
        String(q + 1),          // arithmetic slip
        String(q - 1)           // arithmetic slip
      ],
      explanation: `Multiply both numbers by $10$ so the divisor is whole, then divide: $${a} \\div ${b} = ${dividend10} \\div ${d10} = ${answer}$.`,
      type: "decimal_div"
    };
  }
};

// -------------------------------------------------------------
// FRACTIONS TEMPLATES (audit #1.1 — fraction operations, the core middle-school topic).
// All work is exact integer arithmetic on numerators/denominators; reduceFrac() returns the
// fully-reduced fraction as a STRING ("3/4", or a whole number "2" when it reduces to an integer).
// fracDistractors() turns a pool of (num,den) misconception candidates into up to 3 DISTINCT
// valid-fraction strings (the trailing near-miss pairs guarantee we always reach 3, so the
// distractor engine's generic "0/1/x" fallbacks never fire for these string answers).
// -------------------------------------------------------------
function reduceFrac(n, d) {
  if (d === 0) return String(n);
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(Math.abs(n), Math.abs(d)) || 1;
  n = n / g; d = d / g;
  return d === 1 ? String(n) : `${n}/${d}`;
}
function fracDistractors(correctStr, candidatePairs) {
  const out = [];
  const seen = new Set([correctStr]);
  for (const [n, d] of candidatePairs) {
    if (d === 0) continue;
    const s = reduceFrac(n, d);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
    if (out.length >= 3) break;
  }
  return out;
}
// All numerators coprime to their denominator (1..den-1, gcd 1) — so every displayed fraction is
// already in lowest terms. Picking two DISTINCT denominators then guarantees the operands are
// unequal (a reduced fraction's value uniquely fixes its denominator), avoiding degenerate
// problems like "1/2 + 2/4" or a difference of zero.
const FRACTION_DENS = [2, 3, 4, 5, 6, 8];
function coprimeNumerator(den, seed) {
  const opts = [];
  for (let k = 1; k < den; k++) if (gcd(k, den) === 1) opts.push(k);
  return opts[seed % opts.length];
}

templates.fractions = {
  // Simplify a fraction to lowest terms (divide by the greatest common factor).
  3: (_diffFactor, idx) => {
    const g = 2 + (idx % 6);                  // shared factor baked in: 2..7
    const baseN = 1 + (idx % 5);              // 1..5
    const baseD = baseN + 1;                  // consecutive ⇒ always coprime, so answer = baseN/baseD
    const num = baseN * g, den = baseD * g;
    const answer = reduceFrac(num, den);
    return {
      question: `Simplify the fraction to lowest terms: $\\frac{${num}}{${den}}$`,
      answer,
      distractors: fracDistractors(answer, [
        [num, den - g],        // reduced the numerator's factor but slipped on the denominator
        [baseN, den],          // only divided the numerator
        [num, baseD],          // only divided the denominator
        [baseN + 1, baseD],    // near miss
        [baseN, baseD + 1]     // near miss
      ]),
      explanation: `Divide the top and bottom by their greatest common factor $${gcd(num, den)}$: $\\frac{${num}}{${den}} = ${answer}$.`,
      type: "fraction_simplify"
    };
  },
  // Add fractions with unlike denominators (find a common denominator first).
  4: (_diffFactor, idx) => {
    const b = FRACTION_DENS[idx % FRACTION_DENS.length];
    const d = FRACTION_DENS[(idx + 1 + (idx % 2)) % FRACTION_DENS.length] === b
      ? FRACTION_DENS[(idx + 2) % FRACTION_DENS.length]
      : FRACTION_DENS[(idx + 1 + (idx % 2)) % FRACTION_DENS.length];
    const a = coprimeNumerator(b, idx);
    const c = coprimeNumerator(d, idx + 1);
    const cn = a * d + c * b, cd = b * d;
    const answer = reduceFrac(cn, cd);
    return {
      question: `Add the fractions: $\\frac{${a}}{${b}} + \\frac{${c}}{${d}}$`,
      answer,
      distractors: fracDistractors(answer, [
        [a + c, b + d],        // added straight across (the classic error)
        [a + c, b * d],        // added numerators but multiplied denominators
        [a + c, b],            // added numerators, kept one denominator
        [cn + 1, cd],          // near miss
        [cn - 1, cd]           // near miss
      ]),
      explanation: `Rewrite over the common denominator $${cd}$: $\\frac{${a * d}}{${cd}} + \\frac{${c * b}}{${cd}} = \\frac{${cn}}{${cd}} = ${answer}$.`,
      type: "fraction_add"
    };
  },
  // Mixed numbers ↔ improper fractions. Odd denominators keep the complement slip distinct.
  5: (_diffFactor, idx) => {
    const d = [3, 5, 7][idx % 3];
    const w = 2 + (idx % 3);             // 2..4
    const n = 1 + (idx % (d - 1));       // 1..d-1, always a proper part
    const improper = w * d + n;
    if (idx % 2 === 0) {
      return {
        question: `Write $${w}\\frac{${n}}{${d}}$ as an improper fraction.`,
        answer: `${improper}/${d}`,
        distractors: [`${w + n}/${d}`, `${w * d}/${d}`, `${w}${n}/${d}`], // added w to the numerator; dropped the extra part; glued the digits
        explanation: `The whole number hides $${w} \\times ${d} = ${w * d}$ ${d}ths; add the $${n}$ extra: $\\frac{${improper}}{${d}}$. The whole number must be MULTIPLIED by the denominator first — never just added or glued onto the numerator.`,
        type: "mixed_number"
      };
    }
    return {
      question: `Write $\\frac{${improper}}{${d}}$ as a mixed number.`,
      answer: `${w} ${n}/${d}`,
      distractors: [`${w + 1} ${n}/${d}`, `${w} ${d - n}/${d}`, `${n} ${w}/${d}`], // whole part off by one; complement slip; swapped the parts
      explanation: `$${d}$ fits into $${improper}$ exactly $${w}$ times ($${w * d}$), with $${improper} - ${w * d} = ${n}$ left over: $${w}\\frac{${n}}{${d}}$. The remainder — not its complement — becomes the fraction part.`,
      type: "mixed_number"
    };
  },
  // Subtract fractions with unlike denominators (kept positive — signs are the integers strand).
  6: (_diffFactor, idx) => {
    let b = FRACTION_DENS[idx % FRACTION_DENS.length];
    let d = FRACTION_DENS[(idx + 2) % FRACTION_DENS.length];
    if (d === b) d = FRACTION_DENS[(idx + 3) % FRACTION_DENS.length];
    let a = coprimeNumerator(b, idx);
    let c = coprimeNumerator(d, idx + 2);
    let cn = a * d - c * b;
    if (cn < 0) { [a, b, c, d] = [c, d, a, b]; cn = a * d - c * b; } // ensure the first fraction is larger
    const cd = b * d;
    const answer = reduceFrac(cn, cd);
    return {
      question: `Subtract the fractions: $\\frac{${a}}{${b}} - \\frac{${c}}{${d}}$`,
      answer,
      distractors: fracDistractors(answer, [
        [a - c, b - d || 1],   // subtracted straight across
        [a * d - c, cd],       // forgot to convert the second numerator
        [Math.abs(a - c), b],  // subtracted numerators, kept one denominator
        [cn + 1, cd],          // near miss
        [cn + 2, cd]           // near miss
      ]),
      explanation: `Rewrite over the common denominator $${cd}$: $\\frac{${a * d}}{${cd}} - \\frac{${c * b}}{${cd}} = \\frac{${cn}}{${cd}} = ${answer}$.`,
      type: "fraction_sub"
    };
  },
  // Which fraction is largest? A same-gap family n/(n+g): the piece missing from 1 shrinks as n grows.
  7: (_diffFactor, idx) => {
    const g = 1 + (idx % 3);             // gap 1..3
    const m = 1 + (idx % 4);             // smallest numerator 1..4
    const fr = (n) => `${n}/${n + g}`;
    return {
      question: `Which of these fractions is the largest? $\\frac{${m}}{${m + g}}, \\;\\; \\frac{${m + 1}}{${m + 1 + g}}, \\;\\; \\frac{${m + 2}}{${m + 2 + g}}, \\;\\; \\frac{${m + 3}}{${m + 3 + g}}$`,
      answer: fr(m + 3),
      distractors: [fr(m), fr(m + 1), fr(m + 2)], // 'smallest numbers' trap and the two middles
      explanation: `Every one of these is exactly $${g}$ part short of a whole: $\\frac{n}{n+${g}} = 1 - \\frac{${g}}{n+${g}}$. The missing piece $\\frac{${g}}{n+${g}}$ SHRINKS as $n$ grows, so $\\frac{${m + 3}}{${m + 3 + g}}$ sits closest to $1$. Don't judge a fraction by the size of its numbers — judge the part against the whole.`,
      type: "fraction_compare"
    };
  },
  // Multiply fractions (multiply across, then reduce).
  8: (_diffFactor, idx) => {
    const b = FRACTION_DENS[idx % FRACTION_DENS.length];
    const d = FRACTION_DENS[(idx + 3) % FRACTION_DENS.length];
    const a = coprimeNumerator(b, idx);
    const c = coprimeNumerator(d, idx + 1);
    const cn = a * c, cd = b * d;
    const answer = reduceFrac(cn, cd);
    return {
      question: `Multiply the fractions: $\\frac{${a}}{${b}} \\times \\frac{${c}}{${d}}$`,
      answer,
      distractors: fracDistractors(answer, [
        [a * c, b + d],        // multiplied numerators but added denominators
        [a + c, b * d],        // added numerators but multiplied denominators
        [a * d, b * c],        // cross-multiplied (the division procedure)
        [cn + 1, cd],          // near miss
        [cn - 1, cd]           // near miss
      ]),
      explanation: `Multiply straight across: $\\frac{${a} \\times ${c}}{${b} \\times ${d}} = \\frac{${cn}}{${cd}} = ${answer}$.`,
      type: "fraction_mult"
    };
  },
  // Divide fractions — keep, change to multiply, flip the second (multiply by the reciprocal).
  9: (_diffFactor, idx) => {
    const b = FRACTION_DENS[idx % FRACTION_DENS.length];
    const d = FRACTION_DENS[(idx + 3) % FRACTION_DENS.length]; // offset 3 ≠ 0 mod 6 ⇒ d ≠ b
    const a = coprimeNumerator(b, idx);
    const c = coprimeNumerator(d, idx + 1);
    const cn = a * d, cd = b * c;          // a/b ÷ c/d = (a·d)/(b·c)
    const answer = reduceFrac(cn, cd);
    return {
      question: `Divide the fractions: $\\frac{${a}}{${b}} \\div \\frac{${c}}{${d}}$`,
      answer,
      distractors: fracDistractors(answer, [
        [a * c, b * d],        // multiplied straight across without flipping
        [b * c, a * d],        // flipped the wrong fraction (reciprocal of the answer)
        [cn + 1, cd],          // near miss
        [cn - 1, cd],          // near miss
        [cn, cd + 1]           // near miss
      ]),
      explanation: `Dividing is multiplying by the reciprocal (keep–change–flip): $\\frac{${a}}{${b}} \\div \\frac{${c}}{${d}} = \\frac{${a}}{${b}} \\times \\frac{${d}}{${c}} = \\frac{${cn}}{${cd}} = ${answer}$.`,
      type: "fraction_div"
    };
  },
  // Adding/subtracting SIGNED fractions — the rational-number band (7.NS). Common denominator
  // first, then the integer sign rules govern the numerators.
  11: (_diffFactor, idx) => {
    const b = FRACTION_DENS[idx % FRACTION_DENS.length];
    let d = FRACTION_DENS[(idx + 2) % FRACTION_DENS.length];
    if (d === b) d = FRACTION_DENS[(idx + 3) % FRACTION_DENS.length];
    const a = coprimeNumerator(b, idx);
    const c = coprimeNumerator(d, idx + 2);
    const cd = b * d;
    if (idx % 2 === 0) {
      // Negative plus positive.
      const total = -a * d + c * b;
      const answer = reduceFrac(total, cd);
      return {
        question: `Calculate: $-\\frac{${a}}{${b}} + \\frac{${c}}{${d}}$`,
        answer,
        distractors: fracDistractors(answer, [
          [a * d + c * b, cd],         // dropped the negative sign
          [-a * d - c * b, cd],        // made both terms negative
          [total + 1, cd],             // near miss
          [total - 1, cd]              // near miss
        ]),
        explanation: `Common denominator $${cd}$: $-\\frac{${a * d}}{${cd}} + \\frac{${c * b}}{${cd}} = \\frac{-${a * d} + ${c * b}}{${cd}} = \\frac{${total}}{${cd}} = ${answer}$. Rewrite over a common denominator first, THEN combine the signed numerators by the integer rules.`,
        type: "fraction_negative"
      };
    }
    // Positive minus a negative (subtracting a negative adds).
    const total = a * d + c * b;
    const answer = reduceFrac(total, cd);
    return {
      question: `Calculate: $\\frac{${a}}{${b}} - \\left(-\\frac{${c}}{${d}}\\right)$`,
      answer,
      distractors: fracDistractors(answer, [
        [a * d - c * b, cd],           // treated −(−) as subtraction
        [-a * d - c * b, cd],          // sign-flipped both terms
        [total + 1, cd],               // near miss
        [total - 1, cd]                // near miss
      ]),
      explanation: `Subtracting a negative ADDS: $\\frac{${a}}{${b}} - \\left(-\\frac{${c}}{${d}}\\right) = \\frac{${a}}{${b}} + \\frac{${c}}{${d}}$. Over the common denominator $${cd}$: $\\frac{${a * d} + ${c * b}}{${cd}} = \\frac{${total}}{${cd}} = ${answer}$.`,
      type: "fraction_negative"
    };
  }
};

// -------------------------------------------------------------
// POWERS TEMPLATES — exponents & roots (the 8.EE band): square roots of perfect squares, the
// product/quotient exponent rules, zero & negative exponents, and scientific notation. Routed by
// the 'powers' category. Rule answers use plain "x^n" text (no LaTeX in options) so MCQ string
// comparison stays exact; questions render the LaTeX form.
// -------------------------------------------------------------
templates.powers = {
  // Square roots of perfect squares.
  4: (_diffFactor, idx) => {
    const r = 3 + (idx % 11); // roots 3..13
    const n = r * r;
    return {
      question: `Compute $\\sqrt{${n}}$`,
      answer: r,
      distractors: [n / 2, r + 1, r - 1], // halved instead of rooting; neighboring roots
      explanation: `$\\sqrt{${n}}$ asks: which number times itself makes $${n}$? Since $${r} \\times ${r} = ${n}$, the root is $${r}$. (Halving gives $${n / 2}$ — a different operation entirely.)`,
      type: "square_root"
    };
  },
  // Cube roots of perfect cubes (r >= 3 keeps 2r, r+1 and r^2 pairwise distinct).
  5: (_diffFactor, idx) => {
    const r = 3 + (idx % 4); // roots 3..6
    const n = r * r * r;
    return {
      question: `Compute $\\sqrt[3]{${n}}$`,
      answer: r,
      distractors: [r * r, 2 * r, r + 1], // squared/cubed mix-up; doubled; neighboring root
      explanation: `$\\sqrt[3]{${n}}$ asks: which number used THREE times in a product makes $${n}$? Since $${r} \\times ${r} \\times ${r} = ${n}$, the cube root is $${r}$. The little $3$ counts the factors — it never divides anything.`,
      type: "cube_root"
    };
  },
  // Power of a product: (kx)^n = k^n · x^n — the exponent reaches EVERY factor inside.
  // k >= 3 so k^n, k·n and k stay three distinct coefficients (k=n=2 would collide).
  6: (_diffFactor, idx) => {
    const k = 3 + (idx % 3);             // coefficient 3..5
    const n = 2 + (idx % 2);             // power 2..3
    const kn = Math.pow(k, n);
    return {
      question: `Simplify: $(${k}x)^{${n}}$`,
      answer: `${kn}x^${n}`,
      distractors: [`${k}x^${n}`, `${k * n}x^${n}`, `${kn}x^${n + 1}`], // didn't raise the coefficient; multiplied k·n instead of k^n; wrong exponent
      explanation: `The exponent applies to EVERY factor inside the parentheses: $(${k}x)^{${n}} = ${k}^{${n}} \\cdot x^{${n}} = ${kn}x^{${n}}$. The coefficient $${k}$ gets raised too — leaving it as $${k}$, or multiplying $${k} \\times ${n}$, forgets that the power means repeated MULTIPLICATION of the whole product.`,
      type: "exponent_power_of_product"
    };
  },
  // Product rule: x^a · x^b = x^(a+b).
  7: (_diffFactor, idx) => {
    const a = 2 + (idx % 5); // 2..6
    const b = 2 + ((idx + 2) % 5);
    const sum = a + b;
    return {
      question: `Simplify: $x^{${a}} \\cdot x^{${b}}$`,
      answer: `x^${sum}`,
      distractors: [`x^${a * b}`, `2x^${sum}`, `x^${Math.abs(a - b) || 1}`], // multiplied exponents; invented a coefficient; subtracted
      explanation: `$x^{${a}}$ means ${a} copies of $x$ multiplied, and $x^{${b}}$ means ${b} more — so together there are $${a} + ${b} = ${sum}$ copies: $x^{${sum}}$. Multiplying the exponents (getting $x^{${a * b}}$) counts copies of copies, which is the POWER rule, not the product rule.`,
      type: "exponent_product_rule"
    };
  },
  // Power rule: (x^a)^b = x^(ab). b >= 3 keeps a^b clear of ab for every a.
  8: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);       // 2..5
    const b = 3 + (idx % 2);       // 3..4
    const prod = a * b;
    return {
      question: `Simplify: $(x^{${a}})^{${b}}$`,
      answer: `x^${prod}`,
      distractors: [`x^${a + b}`, `x^${Math.pow(a, b)}`, `x^${prod + 1}`], // added (product-rule reflex); raised the exponent itself; near miss
      explanation: `$(x^{${a}})^{${b}}$ makes $${b}$ copies of the whole pile $x^{${a}}$ — $${b}$ piles of $${a}$ copies is $${a} \\times ${b} = ${prod}$ copies: $x^{${prod}}$. ADDING the exponents is the product rule ($x^{${a}} \\cdot x^{${b}}$), where the piles sit side by side instead of nesting.`,
      type: "exponent_power_rule"
    };
  },
  // Quotient rule: x^a / x^b = x^(a−b).
  9: (_diffFactor, idx) => {
    const b = 2 + (idx % 4);       // 2..5
    const a = b + 2 + (idx % 4);   // keeps a > b, difference 2..5
    const diff = a - b;
    return {
      question: `Simplify: $\\frac{x^{${a}}}{x^{${b}}}$`,
      answer: `x^${diff}`,
      distractors: [`x^${a + b}`, a % b === 0 ? `x^${a / b}` : `x^${b - a}`, `x^${diff + 1}`], // added; divided (or reversed); near miss
      explanation: `Each $x$ below cancels one $x$ above: $${b}$ of the $${a}$ copies cancel, leaving $${a} - ${b} = ${diff}$ copies — $x^{${diff}}$. Subtract the exponents; never divide them.`,
      type: "exponent_quotient_rule"
    };
  },
  // Zero & negative exponents, alternating variants.
  11: (_diffFactor, idx) => {
    const base = [2, 3, 5, 10][idx % 4];
    if (idx % 2 === 0) {
      return {
        question: `Evaluate $${base}^{0}$`,
        answer: 1,
        distractors: [0, base, -base], // "zero power is zero"; "leaves the base"; sign confusion
        explanation: `Follow the quotient rule downwards: $\\frac{${base}^{1}}{${base}^{1}} = ${base}^{0}$, and any number divided by itself is $1$. Anything (nonzero) to the power $0$ is $1$ — not $0$.`,
        type: "exponent_zero_negative"
      };
    }
    const k = 1 + (idx % 3); // 1..3
    const pow = Math.pow(base, k);
    return {
      question: `Write $${base}^{-${k}}$ as a fraction.`,
      answer: `1/${pow}`,
      distractors: [`-${pow}`, `1/${base * k}`, `-1/${pow}`], // negative number; multiplied base·k; stray sign
      explanation: `A negative exponent means the reciprocal: $${base}^{-${k}} = \\frac{1}{${base}^{${k}}} = \\frac{1}{${pow}}$. It flips the value below the fraction bar — it never makes it negative.`,
      type: "exponent_zero_negative"
    };
  },
  // Scientific notation: integer → a.b × 10^e.
  13: (_diffFactor, idx) => {
    const lead = 1 + (idx % 9);          // 1..9 — keeps the mantissa inside [1, 10)
    const dec = (idx + 3) % 10;          // 0..9
    const e = 3 + (idx % 4);             // 10^3..10^6
    const mantissa = dec === 0 ? `${lead}` : `${lead}.${dec}`;
    const value = (lead * 10 + dec) * Math.pow(10, e - 1); // exact integer, no float error
    return {
      question: `Write $${value}$ in scientific notation.`,
      answer: `${mantissa} × 10^${e}`,
      distractors: [
        `${mantissa} × 10^${e - 1}`,            // counted the shift off by one
        `${lead}${dec} × 10^${e - 1}`,          // mantissa left outside 1–10
        `0.${lead}${dec} × 10^${e + 1}`         // mantissa below 1
      ],
      explanation: `Move the decimal point until exactly one nonzero digit is left of it: $${value} \\rightarrow ${mantissa}$, a shift of $${e}$ places, so $${value} = ${mantissa} \\times 10^{${e}}$. The leading number must be at least $1$ and less than $10$.`,
      type: "scientific_notation"
    };
  }
};

// -------------------------------------------------------------
// GRAPHING TEMPLATES — linear graphing & the coordinate plane (the 8.EE/8.F/8.G bridge):
// evaluating a line at a point, slope between two points, reading slope–intercept form, the
// midpoint formula, and the distance formula (Pythagorean triples keep distances integer).
// Routed by the 'graphing' category. NOTE: template keys must skip multiples of 10 — those are
// milestone boss keys that generateProblemInstance force-routes to other categories.
// Extra fields (m/b/x, coordinates, legs) ride along as the params bag for the misconception
// classifier (knowledgeGraph rules read them).
// -------------------------------------------------------------
templates.graphing = {
  // Evaluate y = mx + b at a given x.
  8: (_diffFactor, idx) => {
    const m = 2 + (idx % 4);              // 2..5
    const bMag = 1 + ((idx + 1) % 5);     // 1..5
    const b = idx % 2 === 0 ? bMag : -bMag;
    const x = 2 + (idx % 5);              // 2..6
    const y = m * x + b;
    const bTxt = b >= 0 ? `+ ${b}` : `- ${bMag}`;
    return {
      question: `The line $y = ${m}x ${bTxt}$ — what is $y$ when $x = ${x}$?`,
      answer: y,
      distractors: [m * x, m * (x + b), m * x - b], // forgot the intercept; added before multiplying; flipped its sign
      explanation: `Substitute $x = ${x}$ and multiply FIRST: $y = ${m} \\cdot ${x} ${bTxt} = ${m * x} ${bTxt} = ${y}$. The intercept shifts the result ${b >= 0 ? 'up' : 'down'} by $${bMag}$ at the very end — it never joins $x$ before the slope multiplies it.`,
      type: "point_on_line",
      m, b, x
    };
  },
  // Slope through two points (integer slopes, positive and negative).
  9: (_diffFactor, idx) => {
    const slopes = [2, 3, -2, 4, -3];
    const m = slopes[idx % 5];
    const x1 = 1 + (idx % 4);            // 1..4
    const dx = 2 + (idx % 3);            // 2..4
    const x2 = x1 + dx;
    const y1 = 2 + (idx % 5);            // 2..6
    const y2 = y1 + m * dx;
    const inverted = m < 0 ? `-1/${-m}` : `1/${m}`; // run over rise
    return {
      question: `What is the slope of the line through $(${x1}, ${y1})$ and $(${x2}, ${y2})$?`,
      answer: m,
      distractors: [-m, inverted, m * dx], // mixed the subtraction order; inverted rise/run; used the rise alone
      explanation: `Slope is rise over run: $\\frac{${y2} - ${y1}}{${x2} - ${x1}} = \\frac{${m * dx}}{${dx}} = ${m}$. Keep the points in the SAME order on top and bottom — mixing the orders flips the sign, and the rise alone is not a slope until the run divides it.`,
      type: "slope_from_points",
      x1, y1, x2, y2
    };
  },
  // Read m or b straight off slope–intercept form.
  11: (_diffFactor, idx) => {
    const mMag = 2 + (idx % 5);                 // 2..6
    const mVal = idx % 4 === 1 ? -mMag : mMag;
    const bMag = mMag + 2 + (idx % 3);          // strictly bigger than |m|, so they never collide
    const bVal = mVal > 0 ? -bMag : bMag;       // opposite sign from the slope
    const eq = `y = ${mVal}x ${bVal >= 0 ? '+' : '-'} ${bMag}`;
    if (idx % 2 === 0) {
      return {
        question: `What is the slope of $${eq}$?`,
        answer: mVal,
        distractors: [bVal, -mVal, -bVal], // picked the intercept; dropped the sign; intercept, sign flipped
        explanation: `In slope–intercept form $y = mx + b$, the slope is the coefficient MULTIPLYING $x$: here $m = ${mVal}$. The lone constant $${bVal}$ is the $y$-intercept — where the line crosses the $y$-axis, not how steep it is.`,
        type: "slope_intercept_id",
        m: mVal, b: bVal
      };
    }
    return {
      question: `What is the $y$-intercept of $${eq}$?`,
      answer: bVal,
      distractors: [mVal, -bVal, -mVal], // picked the slope; dropped the sign; slope, sign flipped
      explanation: `The $y$-intercept is the constant term — the value of $y$ when $x = 0$: $y = ${mVal} \\cdot 0 ${bVal >= 0 ? '+' : '-'} ${bMag} = ${bVal}$. The number attached to $x$ ($${mVal}$) is the slope, not the crossing point.`,
      type: "slope_intercept_id",
      m: mVal, b: bVal
    };
  },
  // Midpoint of a segment (even differences keep the midpoint integer).
  13: (_diffFactor, idx) => {
    const x1 = 1 + (idx % 5);                 // 1..5
    const y1 = 3 + (idx % 4);                 // 3..6 (offset chosen so no distractor tuple can collide)
    const dx = 2 * (1 + (idx % 4));           // 2,4,6,8
    const dy = 2 * (1 + ((idx + 1) % 4));     // 2,4,6,8
    const x2 = x1 + dx, y2 = y1 + dy;
    const mx = x1 + dx / 2, my = y1 + dy / 2;
    return {
      question: `What is the midpoint of the segment from $(${x1}, ${y1})$ to $(${x2}, ${y2})$?`,
      answer: `(${mx}, ${my})`,
      distractors: [
        `(${dx / 2}, ${dy / 2})`,             // halved the differences but forgot the start
        `(${x1 + x2}, ${y1 + y2})`,           // summed without halving
        `(${dx}, ${dy})`                      // subtracted instead of averaging
      ],
      explanation: `Average each coordinate: $x = \\frac{${x1} + ${x2}}{2} = ${mx}$ and $y = \\frac{${y1} + ${y2}}{2} = ${my}$. The midpoint is the AVERAGE of the endpoints — adding without halving lands past the far end, and halving only the difference forgets where the segment starts.`,
      type: "midpoint",
      x1, y1, x2, y2
    };
  },
  // Distance between two points — Pythagorean triples keep every answer a whole number.
  15: (_diffFactor, idx) => {
    const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];
    const [a, b, c] = triples[idx % 5];
    const x1 = 1 + (idx % 4), y1 = 1 + ((idx + 2) % 4);
    const x2 = x1 + a, y2 = y1 + b;
    return {
      question: `What is the distance between $(${x1}, ${y1})$ and $(${x2}, ${y2})$?`,
      answer: c,
      distractors: [a + b, c * c, b], // added the legs; forgot the root; one leg only
      explanation: `The horizontal leg is $${x2} - ${x1} = ${a}$ and the vertical leg is $${y2} - ${y1} = ${b}$; the distance is the hypotenuse: $\\sqrt{${a}^2 + ${b}^2} = \\sqrt{${a * a} + ${b * b}} = \\sqrt{${c * c}} = ${c}$. Legs combine as SQUARES under a root — adding them directly measures the walk around the corner, not the straight line.`,
      type: "distance_formula",
      legA: a, legB: b
    };
  },
  // Reflect a point over an axis: one coordinate flips sign, the other is untouched.
  16: (_diffFactor, idx) => {
    const x = 2 + (idx % 6);              // 2..7
    const yRaw = 2 + ((idx + 2) % 6);     // 2..7
    const y = yRaw === x ? yRaw + 1 : yRaw; // keep x != y so the 'swapped' distractor stays distinct
    if (idx % 2 === 0) {
      return {
        question: `Reflect the point $(${x}, ${y})$ over the x-axis. What are its new coordinates?`,
        answer: `(${x}, -${y})`,
        distractors: [`(-${x}, ${y})`, `(-${x}, -${y})`, `(${y}, ${x})`], // flipped x instead; negated both; swapped
        explanation: `The x-axis is the floor; reflecting across it flips only the HEIGHT: $y \\to -y$, while $x$ (the left-right position) stays put. $(${x}, ${y}) \\to (${x}, -${y})$. The axis you reflect over is the one whose coordinate holds STILL.`,
        type: "coord_reflect"
      };
    }
    return {
      question: `Reflect the point $(${x}, ${y})$ over the y-axis. What are its new coordinates?`,
      answer: `(-${x}, ${y})`,
      distractors: [`(${x}, -${y})`, `(-${x}, -${y})`, `(${y}, ${x})`], // flipped y instead; negated both; swapped
      explanation: `The y-axis is the vertical mirror; reflecting across it flips only the left-right position: $x \\to -x$, while the height $y$ stays. $(${x}, ${y}) \\to (-${x}, ${y})$. Mirror over an axis, and that axis's own coordinate never moves.`,
      type: "coord_reflect"
    };
  },
  // Translate a point: horizontal adds to x, vertical adds to y — independently.
  17: (_diffFactor, idx) => {
    const x = 2 + (idx % 5);              // 2..6
    const y = 3 + (idx % 4);              // 3..6
    const dx = 2 + (idx % 4);             // 2..5
    const dy = 3 + ((idx + 1) % 3);       // 3..5 (dx != dy keeps the swapped distractor distinct)
    return {
      question: `Translate the point $(${x}, ${y})$ right $${dx}$ and up $${dy}$. What are its new coordinates?`,
      answer: `(${x + dx}, ${y + dy})`,
      distractors: [`(${x + dy}, ${y + dx})`, `(${x - dx}, ${y - dy})`, `(${x}, ${y + dx + dy})`], // swapped the shifts; moved the wrong way; piled both onto y
      explanation: `Horizontal and vertical moves are independent: 'right $${dx}$' adds to the x-coordinate ($${x} + ${dx} = ${x + dx}$), 'up $${dy}$' adds to the y-coordinate ($${y} + ${dy} = ${y + dy}$). Each shift travels on its OWN axis — $(${x + dx}, ${y + dy})$.`,
      type: "coord_translate"
    };
  },
  // Rotate 180° about the origin: every point flips through the center, so BOTH signs change.
  18: (_diffFactor, idx) => {
    const x = 2 + (idx % 6);              // 2..7
    const yRaw = 2 + ((idx + 2) % 6);     // 2..7
    const y = yRaw === x ? yRaw + 1 : yRaw; // x != y keeps the 'swapped' distractor distinct
    return {
      question: `Rotate the point $(${x}, ${y})$ by $180°$ about the origin. What are its new coordinates?`,
      answer: `(-${x}, -${y})`,
      distractors: [`(-${x}, ${y})`, `(${x}, -${y})`, `(${y}, ${x})`], // negated only x; only y; swapped instead
      explanation: `A $180°$ turn sends every point straight through the origin to the opposite side, so BOTH coordinates reverse sign: $(${x}, ${y}) \\to (-${x}, -${y})$. Flipping just one coordinate is a reflection across an axis, not a half-turn.`,
      type: "coord_rotate_180"
    };
  },
  // Rotate 90° counterclockwise about the origin: (x, y) -> (-y, x) — swap AND sign the new x.
  19: (_diffFactor, idx) => {
    const x = 2 + (idx % 6);              // 2..7
    const yRaw = 2 + ((idx + 3) % 6);     // 2..7
    const y = yRaw === x ? yRaw + 1 : yRaw; // x != y so the swapped/clockwise distractors stay distinct
    return {
      question: `Rotate the point $(${x}, ${y})$ by $90°$ counterclockwise about the origin. What are its new coordinates?`,
      answer: `(-${y}, ${x})`,
      distractors: [`(${y}, ${x})`, `(${y}, -${x})`, `(-${x}, -${y})`], // swapped, no sign; rotated clockwise; did 180° instead
      explanation: `A quarter-turn counterclockwise swaps the coordinates and negates the new x: $(x, y) \\to (-y, x)$, so $(${x}, ${y}) \\to (-${y}, ${x})$. The point that pointed right-and-up now points up-and-left. Swapping without the sign change, or signing the wrong coordinate, sends it the wrong way ($90°$ clockwise is $(y, -x)$).`,
      type: "coord_rotate_90"
    };
  },
  // Dilate from the origin by an integer scale factor: (x, y) -> (kx, ky).
  21: (_diffFactor, idx) => {
    const k = 2 + (idx % 2);              // 2 or 3
    const x = 3 + (idx % 4);              // 3..6 (>= 3 keeps the 'added factor' distractor distinct for k = 2)
    const y = 3 + ((idx + 2) % 4);        // 3..6
    return {
      question: `Dilate the point $(${x}, ${y})$ by a scale factor of $${k}$, centered at the origin. What are its new coordinates?`,
      answer: `(${k * x}, ${k * y})`,
      distractors: [`(${x + k}, ${y + k})`, `(${k * x}, ${y})`, `(${x}, ${k * y})`], // added k; scaled only x; scaled only y
      explanation: `A dilation from the origin multiplies BOTH coordinates by the scale factor: $(${x}, ${y}) \\to (${k} \\cdot ${x}, ${k} \\cdot ${y}) = (${k * x}, ${k * y})$. The point moves $${k}$ times farther from the origin along the same ray — the shape stays similar, only its size changes. Adding $${k}$ shifts the point instead of scaling it.`,
      type: "coord_dilate"
    };
  }
};

// -------------------------------------------------------------
// INEQUALITIES TEMPLATES — solving order statements (the 6.EE/7.EE band): one-step add/subtract,
// one-step multiply/divide, the flip-on-negative rule (THE signature misconception), two-step,
// and compound sandwiches. Answers are plain solution strings like "x > 4" (questions render
// LaTeX; options stay exact-match text). Keys skip multiples of 10 (milestone boss keys).
// -------------------------------------------------------------
templates.inequalities = {
  // One-step add/subtract: x + a > b  /  x - a < b.
  7: (_diffFactor, idx) => {
    const a = 2 + (idx % 5); // 2..6
    if (idx % 2 === 0) {
      const v = 2 + (idx % 4); // 2..5
      const b = a + v;
      return {
        question: `Solve: $x + ${a} > ${b}$`,
        answer: `x > ${v}`,
        distractors: [`x < ${v}`, `x > ${b + a}`, `x = ${v}`], // flipped for no reason; added instead of subtracting; equation thinking
        explanation: `Subtract $${a}$ from both sides: $x > ${b} - ${a}$, so $x > ${v}$. Adding or subtracting NEVER flips an inequality — the order of two numbers doesn't change when both slide the same distance.`,
        type: "inequality_one_step_add"
      };
    }
    const b = 3 + (idx % 6); // 3..8
    const s = a + b;
    return {
      question: `Solve: $x - ${a} < ${b}$`,
      answer: `x < ${s}`,
      distractors: [`x > ${s}`, `x < ${b - a}`, `x = ${s}`], // flipped; subtracted instead of adding; equation thinking
      explanation: `Add $${a}$ to both sides: $x < ${b} + ${a}$, so $x < ${s}$. The $- ${a}$ is undone by ADDING $${a}$ — and the $<$ stays exactly as it was.`,
      type: "inequality_one_step_add"
    };
  },
  // One-step multiply/divide by a POSITIVE coefficient (no flip).
  9: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);  // 2..5
    const q = 3 + (idx % 4);  // 3..6 (q >= 3 keeps b - a from ever equaling q)
    const b = a * q;
    return {
      question: `Solve: $${a}x < ${b}$`,
      answer: `x < ${q}`,
      distractors: [`x > ${q}`, `x < ${b - a}`, `x = ${q}`], // flipped though the divisor is positive; subtracted instead of dividing; equation thinking
      explanation: `Divide both sides by $${a}$: $x < \\frac{${b}}{${a}} = ${q}$. Dividing by a POSITIVE number keeps the inequality's direction — the flip rule only fires for negatives.`,
      type: "inequality_one_step_mult"
    };
  },
  // Flip on negative: -ax < b  →  x > -b/a. The whole concept is the flip.
  11: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);  // 2..4
    const q = 2 + (idx % 4);  // 2..5
    const b = a * q;
    if (idx % 2 === 0) {
      return {
        question: `Solve: $-${a}x < ${b}$`,
        answer: `x > -${q}`,
        distractors: [`x < -${q}`, `x > ${q}`, `x < ${q}`], // forgot the flip; dropped the negative; both slips
        explanation: `Divide both sides by $-${a}$ — and dividing by a NEGATIVE flips the inequality: $x > \\frac{${b}}{-${a}} = -${q}$. Check with a number: $x = 0$ satisfies the original ($0 < ${b}$), and indeed $0 > -${q}$.`,
        type: "inequality_flip_negative"
      };
    }
    return {
      question: `Solve: $-${a}x > -${b}$`,
      answer: `x < ${q}`,
      distractors: [`x > ${q}`, `x < -${q}`, `x > -${q}`], // forgot the flip; sign moved onto the answer; both
      explanation: `Divide by $-${a}$ and FLIP: $x < \\frac{-${b}}{-${a}} = ${q}$. Both negatives cancel in the value, but the flip still happens — it comes from the division, not from the signs of the numbers.`,
      type: "inequality_flip_negative"
    };
  },
  // Two-step: ax + b <= c  →  x <= q.
  13: (_diffFactor, idx) => {
    const a = 2 + (idx % 4); // 2..5
    const b = 1 + (idx % 5); // 1..5
    const q = 2 + (idx % 5); // 2..6
    const c = a * q + b;
    return {
      question: `Solve: $${a}x + ${b} \\le ${c}$`,
      answer: `x ≤ ${q}`,
      distractors: [`x ≥ ${q}`, `x ≤ ${a * q}`, `x = ${q}`], // flipped without a negative; subtracted b but forgot to divide; equation thinking
      explanation: `Undo the operations in reverse order: subtract $${b}$ ($${a}x \\le ${a * q}$), then divide by $${a}$ ($x \\le ${q}$). No negative divisor appeared, so the $\\le$ never flips.`,
      type: "inequality_two_step"
    };
  },
  // Compound sandwich: a < x + b < c  →  subtract b from ALL THREE parts.
  15: (_diffFactor, idx) => {
    const b = 1 + (idx % 4);        // 1..4
    const lo = 1 + (idx % 3);       // 1..3
    const hi = lo + 2 + (idx % 3);  // 3..8
    const a = lo + b, c = hi + b;
    return {
      question: `Solve: $${a} < x + ${b} < ${c}$`,
      answer: `${lo} < x < ${hi}`,
      distractors: [`${a} < x < ${c}`, `${a} < x < ${hi}`, `x < ${hi}`], // never subtracted; subtracted on the right only; dropped the left bound
      explanation: `A compound inequality is a sandwich — whatever you do, do to ALL THREE parts. Subtract $${b}$ everywhere: $${a} - ${b} < x < ${c} - ${b}$, so $${lo} < x < ${hi}$. Dropping a side keeps numbers the sandwich was built to exclude.`,
      type: "inequality_compound"
    };
  }
};

// -------------------------------------------------------------
// FUNCTIONS TEMPLATES — the 8.F band: function notation, rules from tables, rate of change,
// initial value, and solving f(x) = T. Routed by the 'functions' category. Keys skip
// multiples of 10 (milestone boss keys). Params (a/b/c, dx, V/r/t, T) ride along for the
// misconception classifier.
// -------------------------------------------------------------
templates.functions = {
  // Evaluate f(c) for f(x) = ax + b — the notation is the new skill.
  7: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);              // 2..5
    const bMag = 1 + ((idx + 1) % 5);     // 1..5
    const b = idx % 2 === 0 ? bMag : -bMag;
    const c = 2 + (idx % 5);              // 2..6
    const y = a * c + b;
    const bTxt = b >= 0 ? `+ ${b}` : `- ${bMag}`;
    return {
      question: `Given $f(x) = ${a}x ${bTxt}$, find $f(${c})$.`,
      answer: y,
      distractors: [a * c, a * (c + b), a * c - b], // dropped the constant; added before multiplying; flipped its sign
      explanation: `$f(${c})$ means: feed $${c}$ into the machine wherever $x$ appears. Multiply first: $${a} \\cdot ${c} = ${a * c}$, then apply the constant: $${a * c} ${bTxt} = ${y}$. The notation $f(${c})$ is an INPUT, never a multiplication of $f$ by $${c}$.`,
      type: "function_evaluate",
      a, b, c
    };
  },
  // Which rule produced the table? The trap rule fits only the first row.
  9: (_diffFactor, idx) => {
    const r = 2 + (idx % 3);              // rate 2..4
    const s = r + 1 + (idx % 3);          // start, strictly bigger than the rate
    const row = (x) => r * x + s;
    return {
      question: `A table pairs inputs with outputs:\n$x$: $1, 2, 3, 4$\n$y$: $${row(1)}, ${row(2)}, ${row(3)}, ${row(4)}$\nWhich rule produces this table?`,
      answer: `y = ${r}x + ${s}`,
      distractors: [`y = ${r + s}x`, `y = ${s}x + ${r}`, `y = ${r}x - ${s}`], // fits the first row only; swapped rate and start; sign slip
      explanation: `Check the STEP between rows: each $+1$ in $x$ adds $${r}$ to $y$ — that's the coefficient. Then anchor any row: at $x = 1$, $y = ${row(1)} = ${r} + ${s}$, so the constant is $${s}$. The rule $y = ${r + s}x$ matches the first row and nothing after — one row is never enough evidence.`,
      type: "function_table"
    };
  },
  // Rate of change from two measurements in context.
  11: (_diffFactor, idx) => {
    const m = 2 + (idx % 4);              // 2..5 cm per week
    const x1 = 2 + (idx % 3);             // week 2..4
    const dx = 3 + (idx % 2);             // 3..4 weeks later (parity keeps dx clear of m)
    const x2 = x1 + dx;
    const y1 = 5 + (idx % 5);             // 5..9 cm
    const y2 = y1 + m * dx;
    return {
      question: `A plant measured $${y1}$ cm in week $${x1}$ and $${y2}$ cm in week $${x2}$, growing at a steady rate. How many cm does it grow per week?`,
      answer: m,
      distractors: [y2 - y1, dx, y2], // the total change; the elapsed weeks; the final height
      explanation: `Rate of change is change PER unit: the plant grew $${y2} - ${y1} = ${y2 - y1}$ cm over $${x2} - ${x1} = ${dx}$ weeks, so $\\frac{${y2 - y1}}{${dx}} = ${m}$ cm each week. The total ($${y2 - y1}$) answers 'how much', not 'how fast'.`,
      type: "rate_of_change",
      y1, y2, dx
    };
  },
  // Initial value: walk the rate backwards from a later measurement.
  13: (_diffFactor, idx) => {
    const r = 3 + (idx % 4);              // drains 3..6 L/min
    const t = 4 + (idx % 3);              // after 4..6 min
    const V = 20 + 5 * (idx % 5);         // current 20..40 L
    const V0 = V + r * t;
    return {
      question: `A tank drains at $${r}$ liters per minute. After $${t}$ minutes it holds $${V}$ liters. How many liters did it hold at the start?`,
      answer: V0,
      distractors: [V - r * t, r * t, V], // walked the rate the wrong way; the drained amount; the current amount
      explanation: `Run the story backwards: $${t}$ minutes of draining removed $${r} \\times ${t} = ${r * t}$ liters, so the start held the current amount PLUS what left: $${V} + ${r * t} = ${V0}$. Subtracting drains it twice — direction matters when you rewind.`,
      type: "function_initial",
      V, r, t
    };
  },
  // Solve f(x) = T — the input is the unknown, and plugging T in is the classic trap.
  15: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);              // 2..5
    const b = 1 + ((idx + 1) % 5);        // 1..5
    const q = 2 + (idx % 5);              // 2..6
    const T = a * q + b;
    return {
      question: `Given $f(x) = ${a}x + ${b}$, for what value of $x$ is $f(x) = ${T}$?`,
      answer: q,
      distractors: [a * T + b, T - b, q + 1], // computed f(T); forgot to divide; near miss
      explanation: `$f(x) = ${T}$ asks which INPUT produces the output $${T}$ — solve $${a}x + ${b} = ${T}$: subtract $${b}$ ($${a}x = ${T - b}$), divide by $${a}$ ($x = ${q}$). Computing $f(${T}) = ${a * T + b}$ answers the opposite question: it feeds the target in as an input.`,
      type: "function_solve",
      a, b, T
    };
  }
};

// -------------------------------------------------------------
// SEQUENCES TEMPLATES — arithmetic & geometric patterns: next term, common difference,
// the nth-term formula a_n = a_1 + (n-1)d (the off-by-one trap), then the multiplicative
// switch (geometric next term + common ratio). Routed by the 'sequences' category. Keys
// skip multiples of 10 (milestone boss keys). Params (a/d/n, last/prev/r, t2/diff) ride
// along for the misconception classifier.
// -------------------------------------------------------------
templates.sequences = {
  // Next term of an arithmetic sequence — spot the constant step, then take one more.
  7: (_diffFactor, idx) => {
    const a = 2 + (idx % 6);              // first term 2..7
    const d = 2 + (idx % 5);              // common difference 2..6
    const t2 = a + d, t3 = a + 2 * d, t4 = a + 3 * d;
    const next = a + 4 * d;
    return {
      question: `What is the next term in the arithmetic sequence $${a}, ${t2}, ${t3}, ${t4}, \\ldots$?`,
      answer: next,
      distractors: [t4, t4 + d + 1, 2 * t4], // forgot to add the step; overshot the step; doubled the last term
      explanation: `Each term jumps by the same amount: $${t2} - ${a} = ${d}$. The pattern is "add $${d}$", so the next term is $${t4} + ${d} = ${next}$. Repeating $${t4}$ forgets the step; doubling it confuses "add the difference" with "multiply".`,
      type: "arithmetic_next_term",
      last: t4, d, a
    };
  },
  // Common difference — the constant gap, found by subtracting (not reading a term).
  9: (_diffFactor, idx) => {
    const a = 10 + (idx % 8);             // first term 10..17 (kept clear of the small step)
    const d = 2 + (idx % 6);              // common difference 2..7
    const t2 = a + d, t3 = a + 2 * d, t4 = a + 3 * d;
    return {
      question: `Find the common difference of the arithmetic sequence $${a}, ${t2}, ${t3}, ${t4}, \\ldots$.`,
      answer: d,
      distractors: [t2, a, a + t2], // read off a term; used the first term; added two terms
      explanation: `The common difference is the constant GAP between neighbours: $${t2} - ${a} = ${d}$ (and $${t3} - ${t2} = ${d}$, so it checks out). A term like $${t2}$ or the start $${a}$ is not the gap — it's the distance you travel each step that defines the sequence.`,
      type: "arithmetic_common_difference",
      a, d, t2
    };
  },
  // nth term — the formula a_n = a_1 + (n-1)d, with n large enough to force it (not extend-by-hand).
  11: (_diffFactor, idx) => {
    const a1 = 3 + (idx % 5);             // first term 3..7
    const d = 2 + (idx % 4);              // common difference 2..5
    const n = 8 + (idx % 5);             // the term index 8..12
    const t2 = a1 + d, t3 = a1 + 2 * d;
    const ans = a1 + (n - 1) * d;
    return {
      question: `An arithmetic sequence begins $${a1}, ${t2}, ${t3}, \\ldots$ with a common difference of $${d}$. What is the $${n}$th term?`,
      answer: ans,
      distractors: [a1 + n * d, (n - 1) * d, a1 + (n - 1)], // used n not (n-1); dropped the first term; treated d as 1
      explanation: `Use $a_n = a_1 + (n-1)d$: the first term already counts as term 1, so reaching term $${n}$ takes $${n} - 1 = ${n - 1}$ steps of $${d}$. That gives $${a1} + ${n - 1} \\cdot ${d} = ${ans}$. Multiplying by $${n}$ instead adds one step too many — the classic off-by-one.`,
      type: "arithmetic_nth_term",
      a1, d, n
    };
  },
  // Next term of a geometric sequence — the step is a MULTIPLY, not an add.
  13: (_diffFactor, idx) => {
    const a = 1 + (idx % 3);              // first term 1..3
    const r = 2 + (idx % 2);              // common ratio 2..3
    const t2 = a * r, t3 = a * r * r, t4 = a * r * r * r;
    const next = t4 * r;
    return {
      question: `What is the next term in the geometric sequence $${a}, ${t2}, ${t3}, ${t4}, \\ldots$?`,
      answer: next,
      distractors: [2 * t4 - t3, t4 + r, t4 + t4 * r], // added the last gap (arithmetic); added the ratio; over-multiplied
      explanation: `Here each term is MULTIPLIED by the same number: $${t2} \\div ${a} = ${r}$. So the next term is $${t4} \\times ${r} = ${next}$. Adding the gap $${t4 - t3}$ treats a geometric pattern as arithmetic — but the gaps grow, only the ratio stays constant.`,
      type: "geometric_next_term",
      last: t4, prev: t3, r
    };
  },
  // Common ratio — divide neighbours (don't subtract them as if arithmetic).
  15: (_diffFactor, idx) => {
    const a = 3 + (idx % 3);              // first term 3..5
    const r = 2 + ((idx + 1) % 3);        // common ratio 2..4 (offset cycle keeps r != a coincidences clear)
    const t2 = a * r, t3 = a * r * r, t4 = a * r * r * r;
    return {
      question: `Find the common ratio of the geometric sequence $${a}, ${t2}, ${t3}, ${t4}, \\ldots$.`,
      answer: r,
      distractors: [t2 - a, t2, r + 1], // subtracted like arithmetic; read off a term; off by one
      explanation: `A geometric sequence multiplies by a constant ratio, so DIVIDE neighbours: $${t2} \\div ${a} = ${r}$ (and $${t3} \\div ${t2} = ${r}$). Subtracting gives $${t2 - a}$, the kind of answer an arithmetic sequence would have — but here the gaps change while the ratio holds.`,
      type: "geometric_common_ratio",
      a, r, t2, diff: t2 - a
    };
  },
  // nth term of a geometric sequence: a_n = a1 · r^(n-1). Small a1/r/n keep the answer reasonable.
  17: (_diffFactor, idx) => {
    const a1 = 1 + (idx % 3);             // 1..3
    const r = 2 + (idx % 2);              // 2..3
    const n = 4 + (idx % 3);              // 4..6
    const ans = a1 * Math.pow(r, n - 1);
    const t2 = a1 * r, t3 = a1 * r * r;
    return {
      question: `A geometric sequence begins $${a1}, ${t2}, ${t3}, \\ldots$ with a common ratio of $${r}$. What is the $${n}$th term?`,
      answer: ans,
      distractors: [a1 * Math.pow(r, n), a1 * Math.pow(r, n - 2), a1 * r * (n - 1)], // exponent n not n-1; n-2; multiplied instead of powered
      explanation: `Use $a_n = a_1 \\cdot r^{n-1}$: the first term is already term 1, so reaching term $${n}$ multiplies by $${r}$ exactly $${n} - 1 = ${n - 1}$ times: $${a1} \\cdot ${r}^{${n - 1}} = ${ans}$. Using the exponent $${n}$ multiplies one time too many.`,
      type: "geometric_nth_term",
      a1, r, n
    };
  },
  // Sum of the first n terms of an arithmetic series: S = n·(first + last)/2.
  18: (_diffFactor, idx) => {
    const a1 = 1 + (idx % 4);             // 1..4
    const d = 1 + (idx % 3);              // 1..3
    const n = 4 + (idx % 3);              // 4..6
    const last = a1 + (n - 1) * d;
    const sum = (n * (a1 + last)) / 2;    // always an integer for these values
    return {
      question: `An arithmetic sequence starts at $${a1}$ with a common difference of $${d}$. What is the sum of its first $${n}$ terms?`,
      answer: sum,
      distractors: [n * (a1 + last), n * last, last], // forgot to halve; used the last term not the average; gave the last term
      explanation: `Pair the first and last terms: their average is $\\frac{${a1} + ${last}}{2}$, and there are $${n}$ terms, so $S = ${n} \\cdot \\frac{${a1} + ${last}}{2} = ${sum}$. (The last term is $a_${n} = ${a1} + ${n - 1}\\cdot${d} = ${last}$.) Forgetting to halve doubles the sum.`,
      type: "arithmetic_series",
      doubled: n * (a1 + last), nlast: n * last
    };
  },
  // Recursive (Fibonacci-like) sequence: each term is the sum of the two before it.
  19: (_diffFactor, idx) => {
    const t1 = 1 + (idx % 3);             // 1..3
    const t2 = t1 + 1 + (idx % 2);        // > t1
    const t3 = t1 + t2, t4 = t2 + t3, t5 = t3 + t4;
    return {
      question: `In the sequence $${t1}, ${t2}, ${t3}, ${t4}, \\ldots$ each term is the sum of the two before it. What is the next term?`,
      answer: t5,
      distractors: [2 * t4, t4 + t1, t4], // doubled the last; added the wrong earlier term; summed an earlier pair
      explanation: `Add the two most recent terms: $${t3} + ${t4} = ${t5}$. Each step uses the LATEST pair — $${t3}$ and $${t4}$ — not the last term twice ($${2 * t4}$) or an older term.`,
      type: "fibonacci_next",
      t4, t1
    };
  }
};

// -------------------------------------------------------------
// EQUATIONS TEMPLATES — solving equations with fractions (the 6.EE/7.EE/7.RP band): undoing
// division, fractional coefficients (multiply by the reciprocal), clearing a denominator,
// proportions (cross-multiply then divide), and a two-step equation with a fraction. Numeric
// answers; setups are built backwards from an integer solution so every answer is whole. Keys
// skip multiples of 10 (milestone boss keys). Params ride along for the misconception classifier.
// -------------------------------------------------------------
templates.equations = {
  // One-step: x/a = b  ->  x = ab. Undo division by multiplying.
  7: (_diffFactor, idx) => {
    const a = 2 + (idx % 4);              // divisor 2..5
    const q = 3 + (idx % 4);              // a = q-1 by construction, so a != q
    const b = q;                          // right-hand side
    const x = a * q;                      // answer
    return {
      question: `Solve for $x$: $\\frac{x}{${a}} = ${b}$`,
      answer: x,
      distractors: [b, a, a + b], // forgot to multiply back; gave the divisor; added the two numbers
      explanation: `Dividing by $${a}$ is undone by MULTIPLYING by $${a}$: $x = ${b} \\times ${a} = ${x}$. Leaving the answer as $${b}$ skips that step — the $${a}$ under $x$ has to move to the other side.`,
      type: "eqn_onestep_div",
      a, b
    };
  },
  // Fractional coefficient: (a/b)x = c  ->  multiply by the reciprocal b/a. Built so x is whole.
  9: (_diffFactor, idx) => {
    const pairs = [[2, 3], [3, 4], [2, 5], [3, 5]];
    const [a, b] = pairs[idx % 4];        // coefficient a/b with a < b
    const k = 2 + (idx % 3);              // 2..4
    const c = a * k;                      // right-hand side (integer)
    const x = b * k;                      // answer
    return {
      question: `Solve for $x$: $\\frac{${a}}{${b}}x = ${c}$`,
      answer: x,
      distractors: [k, a * b * k, c], // only divided by a; only multiplied by b; never solved
      explanation: `Multiply both sides by the reciprocal $\\frac{${b}}{${a}}$: $x = ${c} \\times \\frac{${b}}{${a}} = ${x}$. Dividing by $${a}$ alone gives $${k}$ — you still owe the $\\times ${b}$.`,
      type: "eqn_fraction_coeff",
      k, abk: a * b * k
    };
  },
  // Clear the denominator first: (x + c)/a = d  ->  x = ad - c.
  11: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);              // 2..4
    const c = 2 + (idx % 2);              // 2..3
    const d = c + 2 + (idx % 3);          // d = c+2..c+4 (> c)
    const x = a * d - c;                  // answer
    return {
      question: `Solve for $x$: $\\frac{x + ${c}}{${a}} = ${d}$`,
      answer: x,
      distractors: [d - c, a * d, a * (d - c)], // never cleared the denominator; forgot to subtract c; distributed wrongly
      explanation: `Clear the fraction first — multiply both sides by $${a}$: $x + ${c} = ${a} \\times ${d} = ${a * d}$. Then subtract $${c}$: $x = ${a * d} - ${c} = ${x}$. The whole numerator is multiplied by $${a}$, not just part of it.`,
      type: "eqn_clear_denom",
      a, c, d
    };
  },
  // Proportion: a/b = x/d  ->  cross-multiply, then divide by b. d is a multiple of b so x is whole.
  13: (_diffFactor, idx) => {
    const b = 2 + (idx % 3);              // 2..4
    const t = 2 + (idx % 2);              // 2..3
    const a = b + 2 + (idx % 3);          // numerator a = b+2..b+4 (> b)
    const d = b * t;                      // right-hand denominator
    const x = a * t;                      // answer = a*d/b
    return {
      question: `Solve for $x$: $\\frac{${a}}{${b}} = \\frac{x}{${d}}$`,
      answer: x,
      distractors: [a * d, d, a * t + b], // cross-multiplied but never divided; copied the denominator; off by one step
      explanation: `Cross-multiply: $${b}x = ${a} \\times ${d} = ${a * d}$, then divide by $${b}$: $x = \\frac{${a * d}}{${b}} = ${x}$. Stopping at $${a * d}$ does only half of the cross-multiplication — the $\\div ${b}$ is the rest.`,
      type: "eqn_proportion",
      ad: a * d, d
    };
  },
  // Two-step with a fraction: x/a - c = d  ->  add c, then multiply by a.
  15: (_diffFactor, idx) => {
    const a = 2 + (idx % 3);              // 2..4
    const c = 2 + ((idx + 1) % 3);        // 2..4 (decoupled from a for variety)
    const d = c + 2 + (idx % 2);          // d = c+2..c+3 (> c)
    const x = a * (d + c);                // answer
    return {
      question: `Solve for $x$: $\\frac{x}{${a}} - ${c} = ${d}$`,
      answer: x,
      distractors: [d + c, a * d, a * d + c], // forgot to multiply by a; forgot to add c first; cleared before adding
      explanation: `Undo the subtraction first: $\\frac{x}{${a}} = ${d} + ${c} = ${d + c}$. Then multiply both sides by $${a}$: $x = ${a} \\times ${d + c} = ${x}$. Add $${c}$ back BEFORE clearing the denominator — order matters.`,
      type: "eqn_two_step_fraction",
      a, c, d
    };
  }
};

// -------------------------------------------------------------
// RATES TEMPLATES — applied proportional reasoning (the 6.RP/7.RP/7.G band): simplifying a
// ratio, sharing an amount in a ratio, unit price, speed/distance/time, and scale drawings.
// Built backwards from whole answers; the ratio_simplify answer is a STRING ("p:q"), the rest
// are numeric. Keys skip multiples of 10. Params ride along for the misconception classifier.
// -------------------------------------------------------------
templates.rates = {
  // Simplify a ratio by dividing both parts by their GCF. Answer is a "p:q" string.
  7: (_diffFactor, idx) => {
    const reduced = [[2, 3], [3, 4], [2, 5], [3, 5], [4, 5]];
    const [p, q] = reduced[idx % 5];      // already coprime, p < q
    const g = 2 + (idx % 4);              // common factor 2..5
    const a = p * g, b = q * g;
    return {
      question: `Simplify the ratio $${a} : ${b}$ to its lowest terms.`,
      answer: `${p}:${q}`,
      distractors: [`${a}:${b}`, `${q}:${p}`, `${b}:${a}`], // didn't simplify; reversed; reversed and unsimplified
      explanation: `Divide both parts by their greatest common factor, $${g}$: $${a} \\div ${g} = ${p}$ and $${b} \\div ${g} = ${q}$, giving $${p}:${q}$. A ratio is in lowest terms when the two numbers share no factor bigger than $1$ — and the order ($${p}$ then $${q}$) must be kept.`,
      type: "ratio_simplify"
    };
  },
  // Share a total in a ratio m:n; ask for the LARGER share. total = (m+n)*k keeps shares whole.
  9: (_diffFactor, idx) => {
    const m = 2 + (idx % 2);              // 2..3
    const n = m + 1 + (idx % 2);          // m+1..m+2 (> m, so the n-part is larger)
    const k = 3 + (idx % 4);              // value of one part, 3..6
    const total = (m + n) * k;
    const larger = n * k;
    return {
      question: `Two friends share $\\$${total}$ in the ratio $${m} : ${n}$. How much is the LARGER share?`,
      answer: larger,
      distractors: [m * k, k, total], // the smaller share; the value of one part; the whole amount
      explanation: `The ratio has $${m} + ${n} = ${m + n}$ equal parts, so each part is $\\$${total} \\div ${m + n} = \\$${k}$. The larger share is $${n}$ parts: $${n} \\times ${k} = \\$${larger}$. The smaller share ($\\$${m * k}$) and the total ($\\$${total}$) answer different questions.`,
      type: "ratio_share",
      smaller: m * k, total
    };
  },
  // Unit price: N items cost $C -> price per item C/N. C = N*p keeps it whole; p > N avoids collisions.
  11: (_diffFactor, idx) => {
    const count = 3 + (idx % 4);          // 3..6 items
    const p = count + 1 + (idx % 3);      // price per item > count
    const total = count * p;
    return {
      question: `${count} identical notebooks cost $\\$${total}$ in total. What is the price of ONE notebook?`,
      answer: p,
      distractors: [total, count, count + p], // gave the total; gave the count; added the two numbers
      explanation: `Unit price is the total shared equally among the items: $\\$${total} \\div ${count} = \\$${p}$ per notebook. The total $\\$${total}$ is for all $${count}$ together — divide to bring it down to one.`,
      type: "unit_price",
      total, count
    };
  },
  // Speed from distance and time: speed = distance / time. distance = time*speed keeps it whole.
  13: (_diffFactor, idx) => {
    const time = 2 + (idx % 4);           // 2..5 hours
    const speed = 10 + 5 * (idx % 5);     // 10..30 mph
    const dist = time * speed;
    return {
      question: `A car travels $${dist}$ miles in $${time}$ hours at a steady pace. What is its average speed in miles per hour?`,
      answer: speed,
      distractors: [dist, time, dist + time], // gave the distance; gave the time; added the two numbers
      explanation: `Speed is distance PER hour: $${dist} \\div ${time} = ${speed}$ mph. Dividing spreads the $${dist}$ miles evenly across the $${time}$ hours — the distance alone ($${dist}$) tells you how far, not how fast.`,
      type: "speed_dist_time",
      dist, time
    };
  },
  // Scale drawing: map distance m at scale 1:k (1 cm = k km) -> actual = m*k.
  15: (_diffFactor, idx) => {
    const k = 10 + 10 * (idx % 4);        // scale 10..40 km per cm
    const m = 2 + (idx % 5);              // 2..6 cm on the map
    const actual = m * k;
    return {
      question: `On a map, $1$ cm represents $${k}$ km. Two cities are $${m}$ cm apart on the map. What is the real distance between them, in km?`,
      answer: actual,
      distractors: [m + k, k, m], // added instead of multiplying; gave the scale; gave the map distance
      explanation: `Each centimetre stands for $${k}$ km, so $${m}$ cm stand for $${m} \\times ${k} = ${actual}$ km. The scale is a MULTIPLIER, not something to add — $${m} + ${k}$ mixes centimetres with kilometres.`,
      type: "scale_factor",
      m, k
    };
  }
};

// -------------------------------------------------------------
// FACTORS & MULTIPLES TEMPLATES — middle-school number theory (the 4.OA/6.NS band): prime
// factorization (a "p^a × q^b" STRING answer from a curated set), GCF, LCM, and their classic
// word-problem applications (equal grouping = GCF, coinciding events = LCM). Concept ids are
// prefixed (find_gcf/find_lcm) to avoid substring-collision with the advanced gcd_lcm type.
// Numeric setups built from a shared GCF g and coprime cofactors so answers are whole. Keys
// skip multiples of 10. Params ride along for the misconception classifier.
// -------------------------------------------------------------
templates.factors = {
  // Prime factorization — curated so every answer string is clean and the distractors are real
  // (composite-factor or incomplete) factorizations.
  7: (_diffFactor, idx) => {
    const items = [
      { n: 12, a: "2^2 × 3",   d: ["4 × 3", "2 × 6", "2 × 3"] },
      { n: 18, a: "2 × 3^2",   d: ["3 × 6", "2 × 9", "2 × 3"] },
      { n: 20, a: "2^2 × 5",   d: ["4 × 5", "2 × 10", "2 × 5"] },
      { n: 24, a: "2^3 × 3",   d: ["4 × 6", "8 × 3", "2^2 × 3"] },
      { n: 45, a: "3^2 × 5",   d: ["9 × 5", "3 × 15", "3 × 5"] },
      { n: 50, a: "2 × 5^2",   d: ["5 × 10", "2 × 25", "2 × 5"] },
      { n: 28, a: "2^2 × 7",   d: ["4 × 7", "2 × 14", "2 × 7"] },
      { n: 36, a: "2^2 × 3^2", d: ["4 × 9", "6 × 6", "2 × 3^2"] },
    ];
    const it = items[idx % items.length];
    return {
      question: `Write $${it.n}$ as a product of its prime factors.`,
      answer: it.a,
      distractors: it.d, // composite factors left in, or an incomplete factorization
      explanation: `Break $${it.n}$ down until every factor is prime: ${it.a}. A prime factorization may contain ONLY primes (2, 3, 5, 7, …) — the other options still hide composite numbers that can be split further.`,
      type: "prime_factorization"
    };
  },
  // GCF of two numbers built as g·m and g·n with m, n coprime, so the GCF is exactly g.
  9: (_diffFactor, idx) => {
    const g = 3 + (idx % 4);              // 3..6
    const pairs = [[2, 3], [3, 4], [4, 5], [2, 5], [3, 5]];
    const [m, n] = pairs[idx % 5];        // coprime, m < n
    const a = g * m, b = g * n;
    const lcm = g * m * n;
    return {
      question: `What is the greatest common factor (GCF) of $${a}$ and $${b}$?`,
      answer: g,
      distractors: [lcm, a, g + 1], // gave the LCM; gave one of the numbers; off by one
      explanation: `Since $${a} = ${g} \\times ${m}$ and $${b} = ${g} \\times ${n}$, and $${m}, ${n}$ share no common factor, the largest factor of BOTH is $${g}$. The LCM $${lcm}$ is the smallest common MULTIPLE — the opposite idea.`,
      type: "find_gcf",
      lcm, num: a
    };
  },
  // LCM of the same construction: lcm = g·m·n. The product a·b overshoots by exactly g.
  11: (_diffFactor, idx) => {
    const g = 2 + (idx % 4);              // 2..5
    const pairs = [[2, 3], [3, 4], [4, 5], [2, 5], [3, 5]];
    const [m, n] = pairs[idx % 5];
    const a = g * m, b = g * n;
    const lcm = g * m * n;
    const prod = a * b;
    return {
      question: `What is the least common multiple (LCM) of $${a}$ and $${b}$?`,
      answer: lcm,
      distractors: [prod, g, a], // multiplied without dividing by the GCF; gave the GCF; gave a number
      explanation: `LCM $= \\frac{${a} \\times ${b}}{\\gcd} = \\frac{${prod}}{${g}} = ${lcm}$. Multiplying $${a} \\times ${b} = ${prod}$ without removing the shared factor $${g}$ overshoots; $${g}$ itself is the smallest common FACTOR, not a multiple.`,
      type: "find_lcm",
      prod, gcf: g
    };
  },
  // GCF applied: equal groups using ALL of both quantities -> the number of groups is the GCF.
  13: (_diffFactor, idx) => {
    const g = 3 + (idx % 4);
    const pairs = [[2, 3], [3, 4], [4, 5], [2, 5], [3, 5]];
    const [m, n] = pairs[idx % 5];
    const a = g * m, b = g * n;
    const lcm = g * m * n;
    return {
      question: `A florist has $${a}$ roses and $${b}$ tulips. She makes identical bouquets using ALL the flowers with none left over. What is the greatest number of bouquets she can make?`,
      answer: g,
      distractors: [lcm, a + b, a], // used the LCM; the total flowers; one of the counts
      explanation: `Each bouquet must split both piles evenly, so the number of bouquets is the GCF of $${a}$ and $${b}$: $${g}$ (each holds $${m}$ roses and $${n}$ tulips). The total $${a + b}$ counts flowers, not bouquets.`,
      type: "gcf_word",
      lcm, total: a + b
    };
  },
  // LCM applied: two repeating events coincide at their least common multiple.
  15: (_diffFactor, idx) => {
    const items = [
      { x: 4, y: 6, l: 12 }, { x: 6, y: 8, l: 24 }, { x: 4, y: 10, l: 20 },
      { x: 6, y: 9, l: 18 }, { x: 8, y: 12, l: 24 }, { x: 10, y: 15, l: 30 },
      { x: 6, y: 10, l: 30 }, { x: 9, y: 12, l: 36 },
    ];
    const it = items[idx % items.length];
    const prod = it.x * it.y, sum = it.x + it.y;
    return {
      question: `One bus leaves every $${it.x}$ minutes and another every $${it.y}$ minutes. They leave together now. In how many minutes will they next leave at the same time?`,
      answer: it.l,
      distractors: [prod, sum, Math.max(it.x, it.y)], // multiplied the intervals; added them; just the longer interval
      explanation: `They coincide at common multiples of $${it.x}$ and $${it.y}$; the FIRST one is the least common multiple, $${it.l}$. Multiplying ($${prod}$) gives a common multiple but not the smallest, and the longer interval ($${Math.max(it.x, it.y)}$) is not a multiple of the shorter.`,
      type: "lcm_word",
      prod, sum
    };
  }
};

module.exports = {
  templates
};
