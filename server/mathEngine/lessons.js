// Static Lesson and Example definitions

const { getConceptLesson, levelToConceptId, buildSections } = require('./conceptLessons');

// Milestone levels carry special advanced-theorem lessons (handled by the legacy
// resolver). Everything else on the foundational path is served by the rich,
// concept-first lesson library (conceptLessons.js).
const MILESTONE_LEVELS = new Set([10, 20, 30, 40, 50, 60]);

function getLessonAndExamples(category, level) {
  const lvl = Number(level) || 0;

  // Concept-first content for the foundational path (non-milestone levels).
  if (!MILESTONE_LEVELS.has(lvl)) {
    const rich = getConceptLesson(levelToConceptId(category, lvl));
    if (rich) {
      return {
        lessonTitle:   rich.title,
        lessonContent: rich.oneLineSummary,
        lessonFormula: rich.formula,
        examples:      rich.examples,
        sections:      buildSections(rich)
      };
    }
  }

  // Fall back to the legacy lesson set (milestones + topics without rich content
  // yet). The Pythagorean milestone gets concept-first sections layered on.
  const legacy = getLegacyLessonAndExamples(category, lvl);
  if (lvl === 10) {
    const p = getConceptLesson('pythagorean');
    if (p) legacy.sections = buildSections(p);
  }
  return legacy;
}

function getLegacyLessonAndExamples(category, level) {
  if (level === 10) {
    return {
      lessonTitle: "The Pythagorean Theorem",
      lessonContent: "The Pythagorean Theorem relates the three sides of a right triangle. For any right-angled triangle, the square of the length of the hypotenuse (the side opposite the right angle) is equal to the sum of the squares of the lengths of the other two sides. This is one of the most fundamental results in geometry, forming the basis for coordinate distance formulas and trigonometry.",
      lessonFormula: "a^2 + b^2 = c^2",
      examples: [
        {
          question: "A right triangle has perpendicular sides of length $a = 3$ and $b = 4$. What is the hypotenuse $c$?",
          answer: "5",
          explanation: "Applying the Pythagorean theorem:\n$$c^2 = a^2 + b^2 = 3^2 + 4^2 = 9 + 16 = 25$$\nTaking the square root: $c = \\sqrt{25} = 5$."
        },
        {
          question: "A right triangle has side $a = 5$ and hypotenuse $c = 13$. Find the length of side $b$.",
          answer: "12",
          explanation: "Using the relation $a^2 + b^2 = c^2$:\n$$5^2 + b^2 = 13^2 \\implies 25 + b^2 = 169$$\n$$b^2 = 169 - 25 = 144 \\implies b = \\sqrt{144} = 12$$"
        }
      ]
    };
  }
  
  if (level === 20) {
    return {
      lessonTitle: "Fermat's Little Theorem",
      lessonContent: "Fermat's Little Theorem states that if $p$ is a prime number, then for any integer $a$, the number $a^p - a$ is an integer multiple of $p$. In modular arithmetic notation, this is expressed as $a^p \\equiv a \\pmod{p}$. Furthermore, if $a$ is not divisible by $p$, this implies $a^{p-1} \\equiv 1 \\pmod{p}$, which is extremely useful for simplifying large modular exponents.",
      lessonFormula: "a^{p-1} \\equiv 1 \\pmod{p} \\quad (\\gcd(a,p)=1)",
      examples: [
        {
          question: "Find the remainder when $2^{12}$ is divided by $13$.",
          answer: "1",
          explanation: "Since $13$ is a prime number and $\\gcd(2, 13) = 1$, we can apply Fermat's Little Theorem with $a=2$ and $p=13$:\n$$2^{13-1} \\equiv 2^{12} \\equiv 1 \\pmod{13}$$\nThus, the remainder is $1$."
        },
        {
          question: "Simplify $3^{22} \\pmod{23}$.",
          answer: "1",
          explanation: "The modulo $p=23$ is a prime number. Since $\\gcd(3, 23) = 1$, Fermat's Little Theorem states that:\n$$3^{22} \\equiv 1 \\pmod{23}$$\nTherefore, the answer is $1$."
        }
      ]
    };
  }

  if (level === 30) {
    return {
      lessonTitle: "The Binomial Theorem",
      lessonContent: "The Binomial Theorem describes the algebraic expansion of powers of a binomial. It states that the expansion of $(x+y)^n$ for any non-negative integer $n$ is a sum where the coefficient of the term $x^{n-k}y^k$ is the binomial coefficient $\\binom{n}{k}$, computed as $\\frac{n!}{k!(n-k)!}$.",
      lessonFormula: "(x+y)^n = \\sum_{k=0}^n \\binom{n}{k} x^{n-k} y^k",
      examples: [
        {
          question: "What is the coefficient of $x^2 y$ in the expansion of $(x+y)^3$?",
          answer: "3",
          explanation: "According to the Binomial Theorem, the term is $\\binom{3}{1} x^{3-1} y^1 = 3 x^2 y$. The coefficient is $3$."
        },
        {
          question: "Evaluate the sum of all coefficients in the expansion of $(x+y)^4$.",
          answer: "16",
          explanation: "To find the sum of coefficients, we set both variables $x$ and $y$ to $1$:\n$$(1+1)^4 = 2^4 = 16$$"
        }
      ]
    };
  }

  if (level === 40) {
    return {
      lessonTitle: "Fundamental Theorem of Calculus",
      lessonContent: "The Fundamental Theorem of Calculus (FTC) bridges differential and integral calculus. The first part states that integration is the inverse of differentiation. The second part provides a practical method to evaluate definite integrals: if $f(x)$ is continuous and $F(x)$ is its antiderivative (i.e. $F'(x) = f(x)$), then the definite integral of $f(x)$ from $a$ to $b$ is equal to $F(b) - F(a)$. This converts the calculation of limit sums into algebra.",
      lessonFormula: "\\int_a^b f(x) \\, dx = F(b) - F(a)",
      examples: [
        {
          question: "Evaluate the definite integral: $\\int_1^3 2x \\, dx$.",
          answer: "8",
          explanation: "1. Find the antiderivative: $F(x) = \\int 2x \\, dx = x^2$.\n2. Evaluate at the integration bounds:\n$$F(3) - F(1) = 3^2 - 1^2 = 9 - 1 = 8$$"
        },
        {
          question: "Find the value of $\\int_0^2 3x^2 \\, dx$.",
          answer: "8",
          explanation: "1. Find the antiderivative: $F(x) = \\int 3x^2 \\, dx = x^3$.\n2. Evaluate at the bounds:\n$$F(2) - F(0) = 2^3 - 0^3 = 8 - 0 = 8$$"
        }
      ]
    };
  }

  if (level === 50) {
    return {
      lessonTitle: "Euler's Totient Theorem",
      lessonContent: "Euler's Totient Theorem generalizes Fermat's Little Theorem to any coprime modulus $n$. It states that if two positive integers $a$ and $n$ are coprime ($\\gcd(a, n) = 1$), then $a^{\\phi(n)} \\equiv 1 \\pmod{n}$, where $\\phi(n)$ is Euler's totient function which counts the positive integers up to $n$ that are relatively prime to $n$.",
      lessonFormula: "a^{\\phi(n)} \\equiv 1 \\pmod{n}",
      examples: [
        {
          question: "Calculate the value of Euler's totient function $\\phi(10)$.",
          answer: "4",
          explanation: "We count the positive integers up to $10$ that share no common factors with $10$ other than $1$. These are $\\{1, 3, 7, 9\\}$. Hence, $\\phi(10) = 4$."
        },
        {
          question: "Use Euler's theorem to find the remainder of $3^4$ when divided by $10$.",
          answer: "1",
          explanation: "Since $\\gcd(3, 10) = 1$ and $\\phi(10) = 4$, Euler's theorem states:\n$$3^{\\phi(10)} \\equiv 3^4 \\equiv 1 \\pmod{10}$$\nSo the remainder is $1$."
        }
      ]
    };
  }

  if (level === 60) {
    return {
      lessonTitle: "Euler's Identity",
      lessonContent: "Euler's Identity is widely considered the most beautiful theorem in mathematics. Derived from Euler's Formula $e^{ix} = \\cos(x) + i\\sin(x)$ by setting $x = \\pi$, it links five fundamental constants of mathematical analysis: $e$ (base of natural logarithms), $i$ (imaginary unit), $\\pi$ (ratio of circle circumference to diameter), $1$ (additive identity), and $0$ (multiplicative identity).",
      lessonFormula: "e^{i\\pi} + 1 = 0",
      examples: [
        {
          question: "Evaluate the complex exponential $e^{i\\pi}$.",
          answer: "-1",
          explanation: "Using Euler's formula:\n$$e^{i\\pi} = \\cos(\\pi) + i\\sin(\\pi) = -1 + i(0) = -1$$"
        },
        {
          question: "Evaluate $e^{i\\pi} + 2$.",
          answer: "1",
          explanation: "Since $e^{i\\pi} = -1$, the expression simplifies to:\n$$-1 + 2 = 1$$"
        }
      ]
    };
  }

  const cat = (category || 'arithmetic').toLowerCase();
  
  if (cat === 'arithmetic') {
    if (level <= 3) {
      return {
        lessonTitle: "Integer Addition",
        lessonContent: "Addition is the mathematical process of combining collections into a single sum. On the number line, addition corresponds to moving to the right. When adding integers, align the place values (units, tens) and perform column-wise summation.",
        lessonFormula: "a + b = c",
        examples: [
          { question: "Compute: $5 + 7$.", answer: "12", explanation: "Aligning values on the number axis: $5 + 7 = 12$." },
          { question: "Find the sum of: $8 + 9$.", answer: "17", explanation: "Adding units: $8 + 9 = 17$." }
        ]
      };
    } else if (level <= 6) {
      return {
        lessonTitle: "Two-Digit Sums and Differences",
        lessonContent: "Addition and subtraction of two-digit numbers is performed by decomposing values into place values (tens and units). For subtraction, if the units column of the minuend is smaller than the subtrahend, borrow $10$ from the tens column.",
        lessonFormula: "(10a + b) \\pm (10c + d)",
        examples: [
          { question: "Evaluate: $24 + 15$.", answer: "39", explanation: "Decompose by place value:\n$$20 + 10 = 30$$\n$$4 + 5 = 9$$\n$$30 + 9 = 39$$" },
          { question: "Evaluate: $45 - 18$.", answer: "27", explanation: "Subtract tens first: $45 - 10 = 35$. Then subtract units: $35 - 8 = 27$." }
        ]
      };
    } else if (level <= 9) {
      return {
        lessonTitle: "Integer Multiplication",
        lessonContent: "Multiplication is the arithmetic operation of scaling one number by another. It represents repeated addition. For example, $a \\times b$ is adding $a$ to itself $b$ times.",
        lessonFormula: "a \\times b = \\underbrace{a + a + \\dots + a}_{b \\text{ times}}",
        examples: [
          { question: "Multiply: $4 \\times 6$.", answer: "24", explanation: "Adding $4$ to itself $6$ times: $4+4+4+4+4+4 = 24$." },
          { question: "Find the product: $7 \\times 8$.", answer: "56", explanation: "Standard multiplication table lookup yields $56$." }
        ]
      };
    } else {
      return {
        lessonTitle: "Operator Precedence",
        lessonContent: "When evaluating expressions with multiple operations, we follow standard precedence rules (order of operations). Multiplication and division must be performed before addition and subtraction, moving from left to right.",
        lessonFormula: "a \\times b + c = (a \\times b) + c",
        examples: [
          { question: "Evaluate: $3 \\times 4 + 5$.", answer: "17", explanation: "First multiply: $3 \\times 4 = 12$. Then add: $12 + 5 = 17$." },
          { question: "Evaluate: $6 + 2 \\times 8$.", answer: "22", explanation: "Perform multiplication first: $2 \\times 8 = 16$. Then add: $6 + 16 = 22$." }
        ]
      };
    }
  }

  if (cat === 'algebra') {
    if (level <= 13) {
      return {
        lessonTitle: "Linear Equations (One-Step)",
        lessonContent: "A linear equation is an algebraic relation equating two expressions where variables have exponent $1$. To solve, apply inverse operations to isolate the variable on one side.",
        lessonFormula: "x + a = b \\implies x = b - a",
        examples: [
          { question: "Solve for $x$: $x + 5 = 12$.", answer: "7", explanation: "Subtract $5$ from both sides: $x = 12 - 5 = 7$." },
          { question: "Solve for $y$: $y - 3 = 8$.", answer: "11", explanation: "Add $3$ to both sides: $y = 8 + 3 = 11$." }
        ]
      };
    } else if (level <= 16) {
      return {
        lessonTitle: "Two-Step Linear Equations",
        lessonContent: "Two-step linear equations require isolating the variable term first (by adding/subtracting constants) and then dividing by the variable's coefficient.",
        lessonFormula: "ax - b = c \\implies ax = c + b \\implies x = \\frac{c+b}{a}",
        examples: [
          { question: "Solve for $x$: $3x - 4 = 11$.", answer: "5", explanation: "1. Add $4$: $3x = 15$.\n2. Divide by $3$: $x = 5$." },
          { question: "Find $y$: $2y + 6 = 14$.", answer: "4", explanation: "1. Subtract $6$: $2y = 8$.\n2. Divide by $2$: $y = 4$." }
        ]
      };
    } else {
      return {
        lessonTitle: "2x2 Matrix Determinants",
        lessonContent: "A matrix is a grid of numbers. The determinant of a $2 \\times 2$ matrix $A$ measures the scaling factor of area under the transformation. It is calculated by cross-multiplying diagonal entries.",
        lessonFormula: "\\det \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc",
        examples: [
          { question: "Find the determinant of $\\begin{pmatrix} 3 & 2 \\\\ 1 & 4 \\end{pmatrix}$.", answer: "10", explanation: "Using the formula: $3 \\cdot 4 - 2 \\cdot 1 = 12 - 2 = 10$." },
          { question: "Calculate det(A) for $A = \\begin{pmatrix} 2 & -1 \\\\ 3 & 5 \\end{pmatrix}$.", answer: "13", explanation: "$$2 \\cdot 5 - (-1) \\cdot 3 = 10 - (-3) = 13$$" }
        ]
      };
    }
  }

  if (cat === 'mental') {
    if (level <= 4) {
      return {
        lessonTitle: "Mental Percentage Calculation",
        lessonContent: "Percentages express ratios relative to $100$. To calculate $p\\%$ of a value mentally, convert $p\\%$ into simple fractions (e.g. $10\\% = 1/10$, $25\\% = 1/4$, $50\\% = 1/2$).",
        lessonFormula: "p\\% \\times N = \\frac{p}{100} \\times N",
        examples: [
          { question: "Find $25\\%$ of $80$.", answer: "20", explanation: "$25\\%$ is $1/4$ of $80$: $80 / 4 = 20$." },
          { question: "Compute $10\\%$ of $150$.", answer: "15", explanation: "$10\\%$ is $1/10$ of $150$: $150 / 10 = 15$." }
        ]
      };
    } else if (level <= 8) {
      return {
        lessonTitle: "Mental Squaring Shortcuts",
        lessonContent: "Squaring a number is multiplying it by itself. Learning squares of numbers from $11$ to $20$ provides strong mathematical foundations for arithmetic and algebra.",
        lessonFormula: "N^2 = N \\times N",
        examples: [
          { question: "Evaluate: $12^2$.", answer: "144", explanation: "$12 \\times 12 = 144$." },
          { question: "Compute: $15^2$.", answer: "225", explanation: "$15 \\times 15 = 225$." }
        ]
      };
    } else {
      return {
        lessonTitle: "Probability Sample Space",
        lessonContent: "The probability of an event is the ratio of successful outcomes to the total outcomes in a sample space. For rolling two six-sided dice, the total sample space is $6 \\times 6 = 36$ outcomes.",
        lessonFormula: "P(E) = \\frac{|Event|}{|Sample \\ Space|}",
        examples: [
          { question: "How many dice outcomes sum to $7$ when two fair dice are rolled?", answer: "6", explanation: "The successful pairs are $\\{(1,6), (2,5), (3,4), (4,3), (5,2), (6,1)\\}$. There are $6$ outcomes." },
          { question: "How many outcomes sum to $12$ when rolling two dice?", answer: "1", explanation: "Only the pair $\\{(6,6)\\}$ sums to $12$. There is $1$ outcome." }
        ]
      };
    }
  }

  if (cat === 'calculus') {
    if (level <= 34) {
      return {
        lessonTitle: "The Power Rule of Derivatives",
        lessonContent: "The derivative measures the instantaneous rate of change of a function. The Power Rule states that for any function $f(x) = x^n$, the derivative is $f'(x) = n x^{n-1}$. For linear combinations, $(a f(x))' = a f'(x)$.",
        lessonFormula: "(x^n)' = n x^{n-1}",
        examples: [
          { question: "Find $f'(x)$ for $f(x) = 3x^2$.", answer: "6x", explanation: "Using the power rule:\n$$f'(x) = 3 \\cdot 2x^{2-1} = 6x$$" },
          { question: "Evaluate the derivative of $f(x) = 2x^3$ at $x=1$.", answer: "6", explanation: "$$f'(x) = 6x^2 \\implies f'(1) = 6(1)^2 = 6$$" }
        ]
      };
    } else if (level <= 37) {
      return {
        lessonTitle: "Definite Riemann Integrals",
        lessonContent: "A definite integral calculates the signed area bounded under a curve $f(x)$ over an interval $[a, b]$. We integrate using the reverse power rule: $\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C$.",
        lessonFormula: "\\int x^n \\, dx = \\frac{x^{n+1}}{n+1}",
        examples: [
          { question: "Evaluate: $\\int_0^2 2x \\, dx$.", answer: "4", explanation: "Antiderivative is $x^2$. Evaluating from $0$ to $2$:\n$$2^2 - 0^2 = 4$$" },
          { question: "Compute: $\\int_0^1 3x^2 \\, dx$.", answer: "1", explanation: "Antiderivative is $x^3$. Evaluating from $0$ to $1$:\n$$1^3 - 0^3 = 1$$" }
        ]
      };
    } else {
      return {
        lessonTitle: "Limits at Infinity",
        lessonContent: "The limit of a sequence or rational function as $n \\to \\infty$ represents the horizontal asymptote. To evaluate, divide the numerator and denominator by the highest power of $n$ in the denominator.",
        lessonFormula: "\\lim_{n \\to \\infty} \\frac{a n^k + c}{b n^k + d} = \\frac{a}{b}",
        examples: [
          { question: "Evaluate $\\lim_{n \\to \\infty} \\frac{4n^2 + 1}{2n^2 - 3}$.", answer: "2", explanation: "Divide by $n^2$: $\\lim \\frac{4 + 1/n^2}{2 - 3/n^2} = \\frac{4+0}{2-0} = 2$." },
          { question: "Find the limit: $\\lim_{n \\to \\infty} \\frac{9n - 2}{3n + 5}$.", answer: "3", explanation: "Highest power is $n^1$. The limit is $9 / 3 = 3$." }
        ]
      };
    }
  }

  if (cat === 'combinatorics') {
    if (level <= 22) {
      return {
        lessonTitle: "Dirichlet's Pigeonhole Principle",
        lessonContent: "The Pigeonhole Principle states that if $n$ items are put into $m$ containers, and $n > m$, then at least one container must contain more than one item. In drawing problems, to guarantee matching colors, we must exceed the number of distinct categories by 1.",
        lessonFormula: "N_{draws} = N_{colors} + 1",
        examples: [
          { question: "With 4 distinct colors, what is the minimum draws to guarantee a pair matches?", answer: "5", explanation: "Worst-case scenario: draw 1 of each color (4 draws). The 5th draw must repeat one of the colors." },
          { question: "With 10 distinct colors, what is the minimum draws to guarantee a pair?", answer: "11", explanation: "$$10 + 1 = 11$$" }
        ]
      };
    } else if (level <= 24) {
      return {
        lessonTitle: "Combinations (Subset Selection)",
        lessonContent: "Combinations count the number of ways to choose a subset of elements from a larger set where the order of selection does not matter. The number of ways to choose $k$ items from $n$ items is $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$.",
        lessonFormula: "\\binom{n}{k} = \\frac{n!}{k!(n-k)!}",
        examples: [
          { question: "How many ways can we choose 2 students from a group of 5?", answer: "10", explanation: "$$\\binom{5}{2} = \\frac{5 \\times 4}{2 \\times 1} = 10$$" },
          { question: "If 6 people shake hands once, how many handshakes occur?", answer: "15", explanation: "$$\\binom{6}{2} = \\frac{6 \\times 5}{2} = 15$$" }
        ]
      };
    } else if (level <= 27) {
      return {
        lessonTitle: "Permutations of a Multiset",
        lessonContent: "A permutation is an ordered arrangement. When some elements in the set are identical, we divide the total factorial of elements by the product of the factorials of the duplicate counts.",
        lessonFormula: "P = \\frac{N!}{n_1! \\cdot n_2! \\cdot \\dots \\cdot n_k!}",
        examples: [
          { question: "How many distinct arrangements of letters are in 'EULER'?", answer: "60", explanation: "Length is 5, 'E' repeats twice. Permutations: $5! / 2! = 120 / 2 = 60$." },
          { question: "Find permutations of 'MATH'.", answer: "24", explanation: "All letters are unique: $4! = 24$." }
        ]
      };
    } else {
      return {
        lessonTitle: "Combinatorial Probability",
        lessonContent: "Combinatorial probability uses counting techniques to find the likelihood of an event. When rolling two fair six-sided dice, there are $6 \\times 6 = 36$ equally likely outcomes. To find the probability of a specific sum, count the number of outcomes that add up to that sum.",
        lessonFormula: "P(A) = \\frac{\\text{Number of Favorable Outcomes}}{36}",
        examples: [
          { question: "How many dice outcomes sum to exactly 7?", answer: "6", explanation: "The outcomes are (1,6), (2,5), (3,4), (4,3), (5,2), (6,1). Total is 6." },
          { question: "How many dice outcomes sum to 11?", answer: "2", explanation: "The outcomes are (5,6) and (6,5). Total is 2." }
        ]
      };
    }
  }

  if (cat === 'number_theory' || cat === 'number theory') {
    if (level <= 44) {
      return {
        lessonTitle: "Euclidean Algorithm for GCD",
        lessonContent: "The Greatest Common Divisor (GCD) of two integers is the largest positive integer that divides both. The Euclidean Algorithm is a recursive method using successive division: $\\gcd(a, b) = \\gcd(b, a \\bmod b)$ until the remainder is $0$.",
        lessonFormula: "\\gcd(a, b) = \\gcd(b, a \\bmod b)",
        examples: [
          { question: "Find $\\gcd(12, 18)$.", answer: "6", explanation: "1. $18 = 1 \\cdot 12 + 6$.\n2. $12 = 2 \\cdot 6 + 0$. The last non-zero remainder is $6$." },
          { question: "Compute $\\gcd(15, 25)$.", answer: "5", explanation: "1. $25 = 1 \\cdot 15 + 10$.\n2. $15 = 1 \\cdot 10 + 5$.\n3. $10 = 2 \\cdot 5 + 0$. GCD is $5$." }
        ]
      };
    } else if (level <= 47) {
      return {
        lessonTitle: "Modular Arithmetic & Congruence",
        lessonContent: "Modular arithmetic is arithmetic for integers where numbers 'wrap around' upon reaching a modulus $m$. We say $a \\equiv b \\pmod{m}$ if $a - b$ is divisible by $m$. The modular exponentiation $a^k \\pmod{m}$ represents the remainder after division.",
        lessonFormula: "a \\equiv r \\pmod{m}",
        examples: [
          { question: "Find $3^3 \\pmod{7}$.", answer: "6", explanation: "$3^3 = 27$. $27 = 3 \\cdot 7 + 6$. So remainder is $6$." },
          { question: "Find $2^5 \\pmod{10}$.", answer: "2", explanation: "$2^5 = 32$. $32 = 3 \\cdot 10 + 2$. Remainder is $2$." }
        ]
      };
    } else {
      return {
        lessonTitle: "Euler's Totient Function",
        lessonContent: "Euler's totient function $\\phi(n)$ counts the number of integers up to $n$ relatively prime to $n$. For any prime $p$, $\\phi(p) = p-1$. For coprime $a,b$, $\\phi(ab) = \\phi(a)\\phi(b)$.",
        lessonFormula: "\\phi(pq) = (p-1)(q-1) \\quad (\\gcd(p,q)=1)",
        examples: [
          { question: "Evaluate $\\phi(15)$ where $15 = 3 \\times 5$.", answer: "8", explanation: "Since 3 and 5 are primes: $\\phi(15) = (3-1)(5-1) = 2 \\times 4 = 8$." },
          { question: "Evaluate $\\phi(7)$.", answer: "6", explanation: "7 is prime, so $\\phi(7) = 7 - 1 = 6$." }
        ]
      };
    }
  }

  // Fallback
  return {
    lessonTitle: "Mathematical Principles",
    lessonContent: "Mathematics is the language of patterns, logic, and structure. Master each level in sequence to build robust foundations for advanced analytical fields.",
    lessonFormula: "",
    examples: []
  };
}


function getLessonForArchive(title, category, stars) {
  const t = (title || "").toLowerCase();

  // 1. Euclid's Proof of Infinitude of Primes
  if (t.includes("infinitude") && t.includes("prime")) {
    return {
      lessonTitle: "Euclid's Theorem on Primes",
      lessonContent: "Euclid proved that there are infinitely many prime numbers. Assuming a finite set of primes $p_1, p_2, \\dots, p_n$, the number $P = (p_1 p_2 \\dots p_n) + 1$ must either be prime or have a prime factor not in the list, creating a contradiction.",
      lessonFormula: "P = \\left(\\prod_{i=1}^n p_i\\right) + 1",
      examples: [
        { question: "If the only primes were $\\{2, 3\\}$, calculate $P$.", answer: "7", explanation: "$$P = (2 \\times 3) + 1 = 7$$. Since 7 is prime and not in the list, the list is incomplete." }
      ]
    };
  }

  // 2. Fermat's Last Theorem for n=4
  if (t.includes("fermat's last") || t.includes("fermat's last theorem")) {
    return {
      lessonTitle: "Fermat's Last Theorem (FLT)",
      lessonContent: "Fermat's Last Theorem states that $x^n + y^n = z^n$ has no positive integer solutions for $n > 2$. Fermat proved the case $n=4$ using infinite descent, a method of proof by contradiction where assuming a solution allows constructing a strictly smaller one.",
      lessonFormula: "x^n + y^n = z^n \\quad (n > 2 \\implies \\text{no solution})",
      examples: [
        { question: "Does $x^4 + y^4 = z^4$ have positive integer solutions?", answer: "No", explanation: "No positive integer solutions exist for $n = 4$ as proven by Fermat." }
      ]
    };
  }

  // 3. Euler's Totient of 100
  if (t.includes("totient of 100") || t.includes("phi(100)")) {
    return {
      lessonTitle: "Euler's Totient function",
      lessonContent: "Euler's totient function $\\phi(n)$ counts positive integers up to $n$ coprime to $n$. For any number $n$, we find its prime factorization and use the product formula. For example, since $12 = 2^2 \\times 3$, we have $\\phi(12) = 12(1 - 1/2)(1 - 1/3) = 4$.",
      lessonFormula: "\\phi(n) = n \\prod_{p|n} \\left(1 - \\frac{1}{p}\\right)",
      examples: [
        { question: "Calculate $\\phi(10)$.", answer: "4", explanation: "$$\\phi(10) = 10 \\times \\left(1 - \\frac{1}{2}\\right) \\times \\left(1 - \\frac{1}{5}\\right) = 4$$. Coprime values are $\\{1, 3, 7, 9\\}$." }
      ]
    };
  }

  // 4. GCD and Bezout Coefficients
  if (t.includes("bezout") || t.includes("coefficients")) {
    return {
      lessonTitle: "Bezout's Identity & GCD",
      lessonContent: "Bezout's Identity states that for non-zero integers $a, b$, there exist integers $x, y$ such that $ax + by = \\gcd(a, b)$. The coefficients can be found using the Extended Euclidean Algorithm.",
      lessonFormula: "ax + by = \\gcd(a, b)",
      examples: [
        { question: "For $a = 6$ and $b = 8$, find the Bezout coefficients $(x, y)$.", answer: "(-1, 1)", explanation: "$$\\gcd(6, 8) = 2$$. We check: $6(-1) + 8(1) = -6 + 8 = 2$." }
      ]
    };
  }

  // 5. Goldbach's Weak Conjecture
  if (t.includes("goldbach")) {
    return {
      lessonTitle: "Goldbach's Weak Conjecture",
      lessonContent: "Goldbach's weak conjecture asserts that every odd number greater than 5 can be expressed as the sum of three prime numbers. It was proven by Harald Helfgott in 2013.",
      lessonFormula: "2k + 1 = p_1 + p_2 + p_3 \\quad (p_i \\in \\mathbb{P})",
      examples: [
        { question: "Express 17 as a sum of three primes.", answer: "3, 7, 7", explanation: "$$3 + 7 + 7 = 17$$. All three components are prime." }
      ]
    };
  }

  // 6. Wilson's Theorem for p=7
  if (t.includes("wilson's theorem") || t.includes("wilson")) {
    return {
      lessonTitle: "Wilson's Theorem",
      lessonContent: "Wilson's Theorem states that a natural number $p > 1$ is prime if and only if the product of all positive integers less than $p$ is one less than a multiple of $p$: $(p-1)! \\equiv -1 \\pmod{p}$.",
      lessonFormula: "(p-1)! \\equiv -1 \\pmod{p}",
      examples: [
        { question: "Compute $(5-1)! \\pmod{5}$.", answer: "4", explanation: "$$4! = 24 \\equiv 24 \\pmod{5} = 4 \\equiv -1 \\pmod{5}$$." }
      ]
    };
  }

  // 7. Chinese Remainder Theorem System
  if (t.includes("chinese remainder") || t.includes("theorem system") || t.includes("crt")) {
    return {
      lessonTitle: "Chinese Remainder Theorem (CRT)",
      lessonContent: "The Chinese Remainder Theorem states that if one knows the remainders of a number divided by pairwise coprime moduli, one can determine the remainder of the number divided by the product of these moduli uniquely.",
      lessonFormula: "x \\equiv a_i \\pmod{m_i}",
      examples: [
        { question: "Solve $x \\equiv 1 \\pmod{3}$ and $x \\equiv 2 \\pmod{5}$.", answer: "7", explanation: "Multiples of 5 offset by 2 are $\\{2, 7, 12, \\dots\\}$. Checking mod 3: $7 \\equiv 1 \\pmod{3}$. Smallest solution is 7." }
      ]
    };
  }

  // 8. Mersenne Primes M_7
  if (t.includes("mersenne")) {
    return {
      lessonTitle: "Mersenne Primes",
      lessonContent: "A Mersenne prime is a prime number of the form $M_p = 2^p - 1$, where the exponent $p$ must also be a prime number.",
      lessonFormula: "M_p = 2^p - 1",
      examples: [
        { question: "Calculate Mersenne number $M_5$.", answer: "31", explanation: "$$M_5 = 2^5 - 1 = 32 - 1 = 31$$, which is prime." }
      ]
    };
  }

  // 9. Catalan Numbers and Dyck Paths
  if (t.includes("catalan") || t.includes("dyck")) {
    return {
      lessonTitle: "Catalan Numbers",
      lessonContent: "The Catalan numbers $C_n$ form a sequence of natural numbers that occur in various counting problems. They count Dyck paths of length $2n$, binary trees with $n$ internal nodes, or polygon triangulations.",
      lessonFormula: "C_n = \\frac{1}{n+1} \\binom{2n}{n}",
      examples: [
        { question: "Calculate $C_2$.", answer: "2", explanation: "$$C_2 = \\frac{1}{3} \\binom{4}{2} = \\frac{6}{3} = 2$$." }
      ]
    };
  }

  // 10. Stars and Bars Distribution
  if (t.includes("stars and bars")) {
    return {
      lessonTitle: "Stars and Bars Distribution",
      lessonContent: "Stars and bars is a combinatorics technique to count the number of ways to distribute $k$ identical items into $n$ distinct bins. If bins cannot be empty, the formula is $\\binom{k-1}{n-1}$.",
      lessonFormula: "\\binom{k-1}{n-1} \\quad (\\text{no empty bins})",
      examples: [
        { question: "Distribute 6 identical coins to 3 kids, each getting at least one.", answer: "10", explanation: "Apply formula: $$\\binom{6-1}{3-1} = \\binom{5}{2} = 10$$." }
      ]
    };
  }

  // 11. Derangements of Four Items
  if (t.includes("derangements") || t.includes("derangement")) {
    return {
      lessonTitle: "Derangements (Subfactorials)",
      lessonContent: "A derangement is a permutation of a set where no element remains in its original position. The number of derangements of $n$ items is written as subfactorial $!n$.",
      lessonFormula: "!n = n! \\sum_{i=0}^n \\frac{(-1)^i}{i!}",
      examples: [
        { question: "Find the derangements of 3 items.", answer: "2", explanation: "$$!3 = 3! \\times (1 - 1 + 1/2 - 1/6) = 6 \\times (1/3) = 2$$." }
      ]
    };
  }

  // 12. Pigeonhole Principle Selection
  if (t.includes("pigeonhole")) {
    return {
      lessonTitle: "The Pigeonhole Principle",
      lessonContent: "The Pigeonhole Principle states that if $n$ items are put into $m$ containers, and $n > m$, then at least one container must contain more than one item.",
      lessonFormula: "n > m \\implies \\lceil n/m \\rceil \\geq 2",
      examples: [
        { question: "With 4 distinct colors of socks, how many draws guarantee a pair?", answer: "5", explanation: "By drawing 4, we could get one of each. The 5th draw must repeat an existing color." }
      ]
    };
  }

  // 13. The Handshaking Lemma
  if (t.includes("handshaking") || t.includes("handshake")) {
    return {
      lessonTitle: "The Handshaking Lemma",
      lessonContent: "The Handshaking Lemma states that in any graph, the sum of degrees of all vertices is twice the number of edges. This implies that any graph must have an even number of vertices with odd degree.",
      lessonFormula: "\\sum_{v \\in V} \\deg(v) = 2 |E|",
      examples: [
        { question: "If 5 people shake hands once, how many handshakes occur?", answer: "10", explanation: "This represents complete graph $K_5$. Edges: $$\\binom{5}{2} = 10$$." }
      ]
    };
  }

  // 14. Ramsey Number R(3,3)
  if (t.includes("ramsey")) {
    return {
      lessonTitle: "Ramsey Theory & R(3,3)",
      lessonContent: "Ramsey's Theorem states that in any graph coloring, cliques of certain sizes are guaranteed to emerge. $R(3,3) = 6$ implies that in any group of 6 people, there are either 3 mutual friends or 3 mutual strangers.",
      lessonFormula: "R(3,3) = 6",
      examples: [
        { question: "What is the minimum group size to guarantee 2 mutual friends or 3 mutual strangers?", answer: "3", explanation: "This is the Ramsey number $R(2,3) = 3$." }
      ]
    };
  }

  // 15. Inclusion-Exclusion Principle
  if (t.includes("inclusion-exclusion") || t.includes("inclusion exclusion")) {
    return {
      lessonTitle: "Inclusion-Exclusion Principle (PIE)",
      lessonContent: "The Principle of Inclusion-Exclusion is a counting technique that generalizes the method of finding the size of the union of multiple sets by adding, subtracting, and re-adding sizes of their intersections.",
      lessonFormula: "|A \\cup B| = |A| + |B| - |A \\cap B|",
      examples: [
        { question: "In a class of 30, 15 play piano, 12 play violin, and 5 play both. How many play at least one?", answer: "22", explanation: "$$15 + 12 - 5 = 22$$." }
      ]
    };
  }

  // 16. Binomial Expansion Coefficient
  if (t.includes("binomial expansion") || t.includes("binomial coefficient")) {
    return {
      lessonTitle: "The Binomial Theorem",
      lessonContent: "The Binomial Theorem describes the algebraic expansion of powers of a binomial $(x+y)^n$. The coefficient of the term $x^{n-k}y^k$ is $\\binom{n}{k}$.",
      lessonFormula: "(x+y)^n = \\sum_{k=0}^n \\binom{n}{k} x^{n-k} y^k",
      examples: [
        { question: "What is the coefficient of $x^2 y$ in $(x+y)^3$?", answer: "3", explanation: "Using the formula: $$\\binom{3}{1} x^{3-1} y^1 = 3x^2 y$$, so the coefficient is 3." }
      ]
    };
  }

  // 17. The Basel Problem Summation
  if (t.includes("basel")) {
    return {
      lessonTitle: "The Basel Problem",
      lessonContent: "The Basel Problem asks for the precise sum of the reciprocals of the squares of all positive integers. Leonhard Euler famously solved it in 1734, proving the sum converges to a clean rational multiple of $\\pi^2$.",
      lessonFormula: "\\sum_{n=1}^\\infty \\frac{1}{n^2} = \\zeta(2)",
      examples: [
        { question: "Evaluate the sum of the related series $\\sum_{n=1}^\\infty \\frac{1}{n^4}$ (often denoted as $\\zeta(4)$).", answer: "\\pi^4/90", explanation: "Using Euler's product expansion of sine, the sum of reciprocals of fourth powers converges to $\\pi^4/90$." }
      ]
    };
  }

  // 18. The Gaussian Integral
  if (t.includes("gaussian integral")) {
    return {
      lessonTitle: "The Gaussian Integral",
      lessonContent: "The Gaussian Integral is the integral of the probability density function $e^{-x^2}$ over the entire real line. Its value is evaluated by converting to polar coordinates in two dimensions.",
      lessonFormula: "\\int_{-\\infty}^\\infty e^{-x^2} \\, dx = I",
      examples: [
        { question: "Evaluate the single-sided Gaussian integral: $\\int_0^\\infty e^{-x^2} \\, dx$.", answer: "\\sqrt{\\pi}/2", explanation: "Since the integrand $e^{-x^2}$ is symmetric (an even function), the integral from $0$ to $\\infty$ is exactly half of the integral from $-\\infty$ to $\\infty$." }
      ]
    };
  }

  // 19. Stirling's Approximation Factorial
  if (t.includes("stirling")) {
    return {
      lessonTitle: "Stirling's Approximation",
      lessonContent: "Stirling's approximation is a formula used to estimate factorials of large numbers. It shows that $n!$ grows asymptotically like $\\sqrt{2\\pi n} (n/e)^n$.",
      lessonFormula: "n! \\approx \\sqrt{2\\pi n} \\left(\\frac{n}{e}\\right)^n",
      examples: [
        { question: "Use Stirling's formula to approximate the value of $3!$.", answer: "5.83", explanation: "$$3! \\approx \\sqrt{6\\pi} \\left(\\frac{3}{e}\\right)^3 \\approx 4.34 \\times 1.34 \\approx 5.83$$ which is close to the exact value of 6." }
      ]
    };
  }

  // 20. Taylor Series for ln(2)
  if (t.includes("taylor series") || t.includes("ln(2)")) {
    return {
      lessonTitle: "Taylor Series Expansions",
      lessonContent: "A Taylor series represents a function as an infinite sum of terms calculated from the values of its derivatives at a single point. For $\\ln(1+x)$ centered at $0$, the series is $x - x^2/2 + x^3/3 - \\dots$.",
      lessonFormula: "f(x) = \\sum_{n=0}^\\infty \\frac{f^{(n)}(a)}{n!} (x-a)^n",
      examples: [
        { question: "Find the sum of the infinite series $1 + 1 + 1/2! + 1/3! + 1/4! + \\dots$.", answer: "e", explanation: "This is the Taylor series for $e^x = \\sum x^n/n!$ evaluated at $x=1$." }
      ]
    };
  }

  // 21. Dirichlet Integral of sin(x)/x
  if (t.includes("dirichlet")) {
    return {
      lessonTitle: "The Dirichlet Integral",
      lessonContent: "The Dirichlet Integral evaluates the improper integral of $\\frac{\\sin(x)}{x}$ from $0$ to $\\infty$. The integral is calculated using Laplace transforms or Feynman's integration trick.",
      lessonFormula: "\\int_0^\\infty \\frac{\\sin(x)}{x} \\, dx = I",
      examples: [
        { question: "Find the value of the double-sided Dirichlet integral: $\\int_{-\\infty}^\\infty \\frac{\\sin(x)}{x} \\, dx$.", answer: "\\pi", explanation: "Since $\\frac{\\sin(x)}{x}$ is an even function, the integral from $-\\infty$ to $\\infty$ is twice the value of the integral from $0$ to $\\infty$." }
      ]
    };
  }

  // 22. Derivative of Exponential Functions
  if (t.includes("derivative") && t.includes("exponential")) {
    return {
      lessonTitle: "Exponential Differentiation",
      lessonContent: "The derivative of the natural exponential function $e^x$ is itself. Using the chain rule, the derivative of $e^{u(x)}$ is $u'(x) e^{u(x)}$.",
      lessonFormula: "\\frac{d}{dx} e^{kx} = k e^{kx}",
      examples: [
        { question: "Find the derivative of $e^{2x}$ at $x=0$.", answer: "2", explanation: "Derivative is $2e^{2x}$. At $x=0$, $2e^0 = 2$." }
      ]
    };
  }

  // 23. Maclaurin Series for sin(x)
  if (t.includes("maclaurin")) {
    return {
      lessonTitle: "Maclaurin Series for sin(x)",
      lessonContent: "A Maclaurin series is a Taylor series centered at $x=0$. The Maclaurin series for $\\sin(x)$ consists of only odd-powered terms with alternating signs.",
      lessonFormula: "\\sin(x) = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\dots",
      examples: [
        { question: "What is the term containing $x^4$ in the Maclaurin series for $\\cos(x)$?", answer: "x^4/24", explanation: "The Maclaurin series is $\\cos(x) = 1 - x^2/2! + x^4/4! - \\dots$. The $x^4$ term is $x^4/4! = x^4/24$." }
      ]
    };
  }

  // 24. Divergence of the Harmonic Series
  if (t.includes("harmonic")) {
    return {
      lessonTitle: "The Harmonic Series",
      lessonContent: "The Harmonic Series is the infinite sum of reciprocals of positive integers. Even though the terms approach $0$, the sum grows without bound (diverges), as proven by Nicole Oresme.",
      lessonFormula: "\\sum_{n=1}^\\infty \\frac{1}{n} = \\infty",
      examples: [
        { question: "Does the series $\\sum_{n=1}^\\infty \\frac{1}{n^2}$ converge?", answer: "Yes", explanation: "By the p-series test, since $p = 2 > 1$, the series converges." }
      ]
    };
  }

  // 25. Eigenvalues of a 2x2 Matrix
  if (t.includes("eigenvalues")) {
    return {
      lessonTitle: "Matrix Eigenvalues",
      lessonContent: "Eigenvalues $\\lambda$ are scalars associated with a linear system of equations. They satisfy $A v = \\lambda v$, which means $\\det(A - \\lambda I) = 0$.",
      lessonFormula: "\\det(A - \\lambda I) = 0",
      examples: [
        { question: "Find the eigenvalues of $A = \\begin{pmatrix} 2 & 1 \\\\ 1 & 2 \\end{pmatrix}$.", answer: "1, 3", explanation: "Solving characteristic equation:\n$$\\det \\begin{pmatrix} 2-\\lambda & 1 \\\\ 1 & 2-\\lambda \\end{pmatrix} = (2-\\lambda)^2 - 1 = 0$$\n$$\\implies 2-\\lambda = \\pm 1 \\implies \\lambda = 1, 3$$." }
      ]
    };
  }

  // 26. Determinant of a 3x3 Matrix
  if (t.includes("determinant") && t.includes("3x3")) {
    return {
      lessonTitle: "3x3 Matrix Determinants",
      lessonContent: "The determinant of a $3 \\times 3$ matrix is evaluated by expansion along the first row (Laplace expansion) using $2 \\times 2$ sub-determinants.",
      lessonFormula: "\\det(A) = a(ei-fh) - b(di-fg) + c(dh-eg)",
      examples: [
        { question: "Find the determinant of $A = \\begin{pmatrix} 1 & 0 & 2 \\\\ 0 & 3 & 0 \\\\ 4 & 0 & 5 \\end{pmatrix}$.", answer: "-9", explanation: "Expand along the second row or first row. Expanding along the second row:\n$$\\det(A) = 3 \\cdot \\det \\begin{pmatrix} 1 & 2 \\\\ 4 & 5 \\end{pmatrix} = 3(5 - 8) = 3(-3) = -9$$." }
      ]
    };
  }

  // 27. Fibonacci Calculation via Matrices
  if (t.includes("fibonacci")) {
    return {
      lessonTitle: "Fibonacci Matrix Exponentiation",
      lessonContent: "The Fibonacci sequence can be represented in matrix form. Raising the transition matrix to the $n$-th power allows calculating the $n$-th Fibonacci number in logarithmic time.",
      lessonFormula: "\\begin{pmatrix} F_{n+1} & F_n \\\\ F_n & F_{n-1} \\end{pmatrix} = \\begin{pmatrix} 1 & 1 \\\\ 1 & 0 \\end{pmatrix}^n",
      examples: [
        { question: "Compute the square of $\\begin{pmatrix} 1 & 1 \\\\ 1 & 0 \\end{pmatrix}$.", answer: "\\begin{pmatrix} 2 & 1 \\\\ 1 & 1 \\end{pmatrix}", explanation: "Matrix multiplication yields the 2nd power containing Fibonacci numbers $F_3, F_2, F_1$." }
      ]
    };
  }

  // 28. Cayley-Hamilton Theorem Application
  if (t.includes("cayley-hamilton")) {
    return {
      lessonTitle: "The Cayley-Hamilton Theorem",
      lessonContent: "The Cayley-Hamilton Theorem states that every square matrix satisfies its own characteristic equation $p(\\lambda) = \\det(A - \\lambda I) = 0$.",
      lessonFormula: "p(A) = 0",
      examples: [
        { question: "For $A = \\begin{pmatrix} 2 & 0 \\\\ 0 & 2 \\end{pmatrix}$, what is its characteristic polynomial?", answer: "A^2 - 4A + 4I = 0", explanation: "Polynomial: $(\\lambda - 2)^2 = \\lambda^2 - 4\\lambda + 4$. Substituting $A$: $A^2 - 4A + 4I = 0$." }
      ]
    };
  }

  // 29. Vector Dot and Cross Products
  if (t.includes("vector dot")) {
    return {
      lessonTitle: "Vector Dot & Cross Products",
      lessonContent: "The dot product of two vectors measures their alignment (scalar). The cross product generates a third vector perpendicular to both, with magnitude equal to the area of the spanned parallelogram.",
      lessonFormula: "u \\cdot v = ||u|| ||v|| \\cos(\\theta)",
      examples: [
        { question: "Calculate the dot product of $(1, 2, 3)$ and $(2, -1, 0)$.", answer: "0", explanation: "$$1(2) + 2(-1) + 3(0) = 2 - 2 = 0$$. They are orthogonal." }
      ]
    };
  }

  // 30. The Rank-Nullity Theorem
  if (t.includes("rank-nullity")) {
    return {
      lessonTitle: "The Rank-Nullity Theorem",
      lessonContent: "The Rank-Nullity Theorem states that for any linear map from a vector space $V$ to $W$, the dimension of the domain is equal to the rank (dimension of image) plus the nullity (dimension of kernel).",
      lessonFormula: "\\text{rank}(A) + \\text{nullity}(A) = n",
      examples: [
        { question: "If a 4x6 matrix has rank 3, what is its nullity?", answer: "3", explanation: "$$6 - 3 = 3$$." }
      ]
    };
  }

  // 31. Orthogonal Diagonalization
  if (t.includes("diagonalization")) {
    return {
      lessonTitle: "Orthogonal Diagonalization",
      lessonContent: "A symmetric matrix can be orthogonally diagonalized as $A = P D P^T$, where $D$ is diagonal containing the eigenvalues and $P$ is orthogonal containing orthonormal eigenvectors.",
      lessonFormula: "A = P D P^T",
      examples: [
        { question: "Is the matrix $A = \\begin{pmatrix} 1 & 2 \\\\ 2 & 3 \\end{pmatrix}$ orthogonally diagonalizable?", answer: "Yes", explanation: "By the Spectral Theorem, a real matrix is orthogonally diagonalizable if and only if it is symmetric. Since $A = A^T$, it is symmetric and thus orthogonally diagonalizable." }
      ]
    };
  }

  // 32. Trace of a Matrix Product
  if (t.includes("trace")) {
    return {
      lessonTitle: "Matrix Trace",
      lessonContent: "The trace of a square matrix is the sum of its diagonal elements. It is equal to the sum of its eigenvalues and is invariant under basis changes.",
      lessonFormula: "\\text{Tr}(A) = \\sum_{i=1}^n a_{ii}",
      examples: [
        { question: "If the trace of $AB$ is 15, what is the trace of $BA$?", answer: "15", explanation: "By the cyclic property of trace, $\\text{Tr}(AB) = \\text{Tr}(BA)$ for any matrices $A$ and $B$ where the products are square." }
      ]
    };
  }

  // 33. Prisoner's Dilemma Nash Equilibrium
  if (t.includes("prisoner")) {
    return {
      lessonTitle: "Nash Equilibrium (Game Theory)",
      lessonContent: "A Nash Equilibrium is a set of strategies where no player has an incentive to deviate unilaterally. In the Prisoner's Dilemma, both players choosing to defect is the unique Nash Equilibrium, despite cooperation yielding a better collective outcome.",
      lessonFormula: "\\text{Best Response}_i(s_{-i}) = s_i",
      examples: [
        { question: "In a coordination game where both players want to meet at the same location (A or B), how many Nash equilibria exist?", answer: "2", explanation: "If both choose A, neither wants to deviate. If both choose B, neither wants to deviate. Thus, (A, A) and (B, B) are both Nash equilibria." }
      ]
    };
  }

  // 34. Bayes Theorem False Positive Rate
  if (t.includes("bayes")) {
    return {
      lessonTitle: "Bayes' Theorem",
      lessonContent: "Bayes' Theorem calculates conditional probability. It updates the prior probability of an event based on new evidence.",
      lessonFormula: "P(A|B) = \\frac{P(B|A)P(A)}{P(B)}",
      examples: [
        { question: "Evaluate $P(A|B)$ if $P(B|A)=0.8, P(A)=0.1, P(B)=0.2$.", answer: "0.4", explanation: "$$P(A|B) = \\frac{0.8 \\times 0.1}{0.2} = 0.4$$." }
      ]
    };
  }

  // 35. The Monty Hall Dilemma
  if (t.includes("monty hall")) {
    return {
      lessonTitle: "The Monty Hall Problem",
      lessonContent: "The Monty Hall problem is a probability puzzle based on a game show. You choose 1 of several doors, after which the host reveals one or more incorrect doors. Switching choice leverages remaining probability space.",
      lessonFormula: "P(\\text{Win}) = \\text{varies by strategy}",
      examples: [
        { question: "In a 4-door Monty Hall problem, if you choose one door, and the host opens 2 goat doors, what is your win probability if you switch to the other remaining door?", answer: "3/4", explanation: "Initially, the chosen door has a $1/4$ chance of containing the prize, leaving a $3/4$ chance for the other doors combined. When the host opens 2 goat doors from those other doors, the entire $3/4$ probability concentrates on the single remaining unopened door." }
      ]
    };
  }

  // 36. Expected Value of a Standard Die
  if (t.includes("expected value")) {
    return {
      lessonTitle: "Expected Value",
      lessonContent: "The expected value is the long-run average value of repetitions of a random variable. It is calculated by multiplying each outcome by its probability and summing them.",
      lessonFormula: "E[X] = \\sum x_i P(X = x_i)",
      examples: [
        { question: "Find the expected value of rolling a fair 4-sided die.", answer: "2.5", explanation: "$$\\frac{1+2+3+4}{4} = \\frac{10}{4} = 2.5$$." }
      ]
    };
  }

  // 37. Buffon's Needle Problem
  if (t.includes("buffon")) {
    return {
      lessonTitle: "Buffon's Needle Problem",
      lessonContent: "Buffon's needle problem is a question of geometric probability. Dropping a needle of length $l$ onto a floor with parallel lines spacing $d$ (with $l \\leq d$) has crossing probability $2l / (\\pi d)$.",
      lessonFormula: "P = \\frac{2l}{\\pi d}",
      examples: [
        { question: "If the needle length $l$ is half the spacing $d$ ($l = d/2$), what is the crossing probability?", answer: "1/\\pi", explanation: "Substituting $l = d/2$ into the formula: $$P = \\frac{2(d/2)}{\\pi d} = \\frac{1}{\\pi}$$." }
      ]
    };
  }

  // 38. Gambler's Ruin Probability
  if (t.includes("gambler")) {
    return {
      lessonTitle: "Gambler's Ruin Probability",
      lessonContent: "Gambler's Ruin is a Markov chain modeling gambling. A gambler with capital $i$ playing a fair game against a house with total $N$ has ruin probability $1 - i/N$.",
      lessonFormula: "P_{\\text{ruin}} = 1 - \\frac{i}{N}",
      examples: [
        { question: "With a stake of 10 and total capital of 40, what is your ruin probability in a fair game?", answer: "3/4", explanation: "Your ruin probability is $1 - i/N = 1 - 10/40 = 1 - 1/4 = 3/4$." }
      ]
    };
  }

  // 39. The Birthday Paradox
  if (t.includes("birthday paradox")) {
    return {
      lessonTitle: "The Birthday Paradox",
      lessonContent: "The Birthday Paradox states that the probability that at least two people share a birthday grows rapidly and exceeds 50% with a small group. This is because the number of pairs grows quadratically with group size.",
      lessonFormula: "P(\\text{match}) = 1 - \\frac{365!}{(365-n)! \\cdot 365^n}",
      examples: [
        { question: "If there are 2 people in a room, what is the probability they do NOT share a birthday?", answer: "364/365", explanation: "The first person can have any birthday. The second person must have a different birthday, which leaves 364 options out of 365. The probability is $364/365$." }
      ]
    };
  }

  // 40. Markov Chain Steady State
  if (t.includes("markov")) {
    return {
      lessonTitle: "Markov Chain Steady State",
      lessonContent: "A steady-state vector $\\pi$ of a Markov chain transition matrix $P$ represents the long-term probability distribution. It satisfies $\\pi P = \\pi$.",
      lessonFormula: "\\pi (P - I) = 0",
      examples: [
        { question: "For transition $P = \\begin{pmatrix} 0.5 & 0.5 \\\\ 0.5 & 0.5 \\end{pmatrix}$, what is the steady state vector?", answer: "[0.5, 0.5]", explanation: "Checking: $[0.5, 0.5] \\begin{pmatrix} 0.5 & 0.5 \\\\ 0.5 & 0.5 \\end{pmatrix} = [0.5, 0.5]$." }
      ]
    };
  }

  // 41. Gauss's Summation
  if (t.includes("gauss")) {
    return {
      lessonTitle: "Gauss's Summation Formula",
      lessonContent: "Carl Friedrich Gauss as a child summed a sequence of integers instantly by pairing the first and last elements: $(1+n) + (2+n-1) + \\dots$ which leads to the arithmetic progression sum formula.",
      lessonFormula: "\\sum_{i=1}^n i = \\frac{n(n+1)}{2}",
      examples: [
        { question: "Sum the numbers from 1 to 10.", answer: "55", explanation: "$$\\frac{10 \\times 11}{2} = 55$$." }
      ]
    };
  }

  // 42. Diophantus's Epitaph
  if (t.includes("diophantus")) {
    return {
      lessonTitle: "Diophantus's Epitaph",
      lessonContent: "Diophantus of Alexandria was a Greek mathematician known as the father of algebra. His age was written as a riddle on his tombstone, solved using a linear algebraic equation.",
      lessonFormula: "x = \\frac{x}{6} + \\frac{x}{12} + \\frac{x}{7} + 5 + \\frac{x}{2} + 4",
      examples: [
        { question: "A person spent 1/4 of their life as a child, 1/2 as an adult, and 10 years in retirement. How long did they live?", answer: "40", explanation: "Equation: $$x/4 + x/2 + 10 = x \\implies 3x/4 + 10 = x \\implies x/4 = 10 \\implies x = 40$$." }
      ]
    };
  }

  // Fallback: derive an appropriate lesson level from the archive entry's star rating
  const fakeLevel = stars >= 4 ? 45 : stars >= 3 ? 30 : stars >= 2 ? 18 : 9;
  return getLessonAndExamples(category, fakeLevel);
}

// ------------------------------------------------------------------------------------
// Concept-anchored archive/daily lesson resolution (docs/ContentEngineAudit-2026-06.md §4)
// ------------------------------------------------------------------------------------
// The Archive and Daily Puzzle USED to re-derive a problem's lesson by fuzzy keyword matching on
// its rendered title, with a star→fakeLevel fallback that silently bound unrelated concepts. Now the
// generator stamps each problem with a canonical `conceptKey`, and we resolve the lesson from THAT —
// deterministically — via one of three sources:
//   1. EXTRA_ARCHIVE_LESSONS  — authored lessons for archive concepts that have no graph node and no
//                               existing curated title case (telescoping, geometric series, etc.).
//   2. GRAPH_BACKED_ARCHIVE   — concepts that already have a rich 5-part lesson; resolve via level.
//   3. ARCHIVE_PROBE_TITLE    — concepts whose curated lesson already lives in getLessonForArchive;
//                               reuse that body via a probe title (zero duplication).

const EXTRA_ARCHIVE_LESSONS = {
  telescoping_series: {
    lessonTitle: "Telescoping Series",
    lessonContent: "A telescoping series is an infinite sum whose general term splits into a difference of two pieces, so consecutive terms cancel and almost everything collapses. The key move is partial fractions: rewrite $\\frac{1}{n(n+1)}$ as $\\frac{1}{n} - \\frac{1}{n+1}$, then watch neighbours annihilate, leaving only the first surviving piece (the tail vanishes).",
    lessonFormula: "\\sum_{n=1}^{\\infty} \\left(a_n - a_{n+1}\\right) = a_1 - \\lim_{n\\to\\infty} a_{n+1}",
    examples: [
      { question: "Evaluate $\\sum_{n=2}^{\\infty}\\left(\\frac{1}{n} - \\frac{1}{n+1}\\right)$.", answer: "1/2", explanation: "The partial sums collapse to the first surviving term $\\tfrac12$; the tail $\\tfrac1{n+1}\\to 0$." },
      { question: "Find $\\sum_{n=1}^{\\infty} \\frac{1}{n(n+2)}$ using $\\frac{1}{n(n+2)} = \\tfrac12\\left(\\tfrac1n - \\tfrac1{n+2}\\right)$.", answer: "3/4", explanation: "Two staggered telescopes leave $\\tfrac12\\left(1 + \\tfrac12\\right) = \\tfrac34$." }
    ]
  },
  geometric_series: {
    lessonTitle: "Convergent Geometric Series",
    lessonContent: "A geometric series adds terms that each multiply the previous by a fixed ratio $r$. When $|r| < 1$ the terms shrink fast enough that the infinite sum settles on a finite value. The closed form $\\frac{a}{1-r}$ (first term over one-minus-ratio) is the workhorse behind countless infinite-sum arguments.",
    lessonFormula: "\\sum_{n=0}^{\\infty} a\\,r^n = \\frac{a}{1-r}, \\quad |r| < 1",
    examples: [
      { question: "Evaluate $\\sum_{n=0}^{\\infty} \\frac{1}{3^n}$.", answer: "3/2", explanation: "$a=1$, $r=\\tfrac13$: $\\frac{1}{1-\\tfrac13} = \\frac{1}{\\tfrac23} = \\tfrac32$." },
      { question: "Evaluate $\\sum_{n=1}^{\\infty} \\frac{1}{4^n}$.", answer: "1/3", explanation: "Starting at $n=1$: $\\frac{\\tfrac14}{1-\\tfrac14} = \\frac{\\tfrac14}{\\tfrac34} = \\tfrac13$." }
    ]
  },
  geometric_progression: {
    lessonTitle: "Geometric Progressions & Doubling",
    lessonContent: "In a geometric progression each term is the previous one times a fixed ratio. Doubling is the ratio-2 case: $1, 2, 4, 8, \\dots$, where the $n$-th term is $2^{n-1}$ and the sum of the first $n$ terms is $2^n - 1$. Geometric growth is explosive — the chessboard-and-wheat legend ends in astronomically large numbers for exactly this reason.",
    lessonFormula: "a_n = a\\,r^{\\,n-1}, \\qquad \\sum_{i=0}^{n-1} a\\,r^i = a\\,\\frac{r^n - 1}{r - 1}",
    examples: [
      { question: "What is the 4th term of $1, 2, 4, 8, \\dots$?", answer: "8", explanation: "The $n$-th term is $2^{n-1}$, so the 4th is $2^3 = 8$." },
      { question: "Sum the first 5 terms of $1, 2, 4, 8, \\dots$.", answer: "31", explanation: "$2^5 - 1 = 31$ — always one short of the next power of two." }
    ]
  },
  conditional_probability: {
    lessonTitle: "Conditional Probability",
    lessonContent: "Conditional probability asks: given that event $B$ already happened, how likely is event $A$? Knowing $B$ shrinks the sample space to only the outcomes consistent with $B$, and we re-weigh $A$ inside that smaller world. This is why 'at least one is a boy' changes the odds that both children are boys — it eliminates one of four equally likely family types.",
    lessonFormula: "P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}",
    examples: [
      { question: "A fair die is rolled. Given the result is even, what is the probability it is a 6?", answer: "1/3", explanation: "'Even' restricts the space to $\\{2,4,6\\}$; one of three is a 6." },
      { question: "A card is drawn from a standard deck. Given it is a face card, what is the probability it is a King?", answer: "1/3", explanation: "Face cards per suit are J, Q, K; one of the three ranks is a King, so $4/12 = 1/3$." }
    ]
  },
  linear_word: {
    lessonTitle: "Word Problems as Linear Equations",
    lessonContent: "Many word puzzles become easy once translated into a single linear equation: name the unknown with a variable, turn each sentence into algebra, then solve. For consecutive integers, centre them on a middle value $x$ as $x-1,\\,x,\\,x+1$, so their sum is simply $3x$ — the symmetry does the work.",
    lessonFormula: "(x-1) + x + (x+1) = 3x",
    examples: [
      { question: "Three consecutive integers sum to 33. What is the largest?", answer: "12", explanation: "$3x = 33 \\Rightarrow x = 11$ (the middle), so the largest is $12$." },
      { question: "Two consecutive even numbers sum to 30. What is the larger?", answer: "16", explanation: "$x + (x+2) = 30 \\Rightarrow x = 14$, so the larger is $16$." }
    ]
  }
};

// conceptKey → [category, level] for concepts that already own a rich 5-part lesson.
const GRAPH_BACKED_ARCHIVE = {
  fermat_little:      ['number theory', 20], // milestone "Fermat's Little Theorem" lesson
  totient:            ['number theory', 49],
  combinations:       ['combinatorics', 25],
  integral:           ['calculus', 35],
  matrix_determinant: ['algebra', 18]
};

// conceptKey → a probe title that deterministically hits the matching curated case in
// getLessonForArchive (reuses those authored bodies with no duplication).
const ARCHIVE_PROBE_TITLE = {
  chinese_remainder: 'Chinese Remainder Theorem',
  derangements:      'Derangements',
  stars_and_bars:    'Stars and Bars',
  taylor_series:     'Taylor Series',
  basel:             'Basel',
  eigenvalues:       'Eigenvalues',
  cayley_hamilton:   'Cayley-Hamilton',
  expected_value:    'Expected Value',
  bayes:             'Bayes',
  monty_hall:        'Monty Hall',
  gauss_sum:         'Gauss Summation',
  diophantus:        'Diophantus'
};

// Resolve a lesson from a canonical conceptKey (returns null for an unknown key so the caller can
// fall back to the legacy title path).
function getLessonForConcept(conceptKey, category, stars) {
  if (!conceptKey) return null;
  if (EXTRA_ARCHIVE_LESSONS[conceptKey]) return EXTRA_ARCHIVE_LESSONS[conceptKey];
  if (GRAPH_BACKED_ARCHIVE[conceptKey]) {
    const [cat, lvl] = GRAPH_BACKED_ARCHIVE[conceptKey];
    return getLessonAndExamples(cat, lvl);
  }
  if (ARCHIVE_PROBE_TITLE[conceptKey]) {
    return getLessonForArchive(ARCHIVE_PROBE_TITLE[conceptKey], category, stars);
  }
  return null;
}

// Resolve the lesson for any archive/daily problem object. Prefers the generator-stamped conceptKey
// (the concept-anchored path); falls back to the legacy title matcher only for DB-seeded rows that
// carry no conceptKey but do carry a curated title.
function getLessonForArchiveProblem(problem) {
  if (!problem) return getLessonForArchive('', '', 0);
  if (problem.conceptKey) {
    const lesson = getLessonForConcept(problem.conceptKey, problem.category, problem.stars);
    if (lesson) return lesson;
  }
  return getLessonForArchive(problem.title, problem.category, problem.stars);
}

module.exports = {
  getLessonAndExamples,
  getLessonForArchive,
  getLessonForConcept,
  getLessonForArchiveProblem
};
