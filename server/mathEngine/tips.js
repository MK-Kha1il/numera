const tipsMap = {
  'arithmetic_add': {
    concept: 'Integer Addition',
    subskill: 'Basic Addition',
    difficulty: 'Easy',
    learningObjective: 'Master base-10 addition of positive integers.',
    commonMistakes: 'Misaligning digit columns or forgetting to carry digits over.',
    tip: 'Break down larger numbers to add their place values individually (tens and units). For example, $23 + 8$ is $(20) + (3 + 8) = 20 + 11 = 31$.',
    conceptualReminder: 'Addition combines two or more values to find their total sum.'
  },
  'arithmetic_sub': {
    concept: 'Integer Subtraction',
    subskill: 'Basic Subtraction',
    difficulty: 'Easy',
    learningObjective: 'Understand how subtraction represents the difference between two quantities.',
    commonMistakes: 'Swapping subtraction order (remember: order matters in subtraction).',
    tip: 'Find the difference by counting up from the smaller number to the larger number, or subtract in stages (e.g. $45 - 7$ is $45 - 5 - 2$).',
    conceptualReminder: 'Subtraction calculates the difference between two quantities.'
  },
  'arithmetic_mult': {
    concept: 'Integer Multiplication',
    subskill: 'Multiplication Tables',
    difficulty: 'Easy',
    learningObjective: 'Recognize multiplication as repeated addition.',
    commonMistakes: 'Miscounting repeated addition terms or basic multiplication table slips.',
    tip: 'Think of multiplication as repeated addition. For example, $3 \\times 4$ is three groups of four ($4 + 4 + 4$). You can also swap the order: $4 \\times 3$.',
    conceptualReminder: 'Multiplication scales a quantity by a factor, representing repeated addition.'
  },
  'arithmetic_div': {
    concept: 'Integer Division',
    subskill: 'Basic Division',
    difficulty: 'Easy',
    learningObjective: 'Perform division as the inverse operation of multiplication.',
    commonMistakes: 'Dividing the wrong way around or mixing up divisors.',
    tip: 'Division is the reverse of multiplication. Ask yourself: "What number times the divisor equals the dividend?" (e.g., $15 \\div 3 = ?$ means $3 \\times ? = 15$).',
    conceptualReminder: 'Division splits a quantity into a specified number of equal parts.'
  },
  'arithmetic_mixed': {
    concept: 'Order of Operations',
    subskill: 'PEMDAS / BODMAS',
    difficulty: 'Medium',
    learningObjective: 'Apply order of operations rules to evaluate complex expressions.',
    commonMistakes: 'Evaluating operations from left to right instead of priority order.',
    tip: 'Remember the order of operations: Parentheses first, then Exponents, then Multiplication/Division (left to right), and finally Addition/Subtraction (left to right).',
    conceptualReminder: 'PEMDAS establishes the standard order of arithmetic precedence.'
  },
  // Mental Math
  'mental_add': {
    concept: 'Mental Arithmetic',
    subskill: 'Rapid Addition',
    difficulty: 'Medium',
    learningObjective: 'Perform rapid mental calculations without carrying paper.',
    commonMistakes: 'Forgetting carried digits.',
    tip: 'Try rounding one of the numbers to the nearest ten to simplify addition, then adjust. For example, $47 + 19$ is $47 + 20 - 1 = 67 - 1 = 66$.',
    conceptualReminder: 'Mental addition can be accelerated by using base-10 anchors.'
  },
  'mental_sub': {
    concept: 'Mental Arithmetic',
    subskill: 'Rapid Subtraction',
    difficulty: 'Medium',
    learningObjective: 'Subtract quantities mentally by decomposition.',
    commonMistakes: 'Sign errors when decomposing numbers.',
    tip: 'Decompose the number being subtracted. To subtract 28, subtract 20 first, then subtract 8 from the result.',
    conceptualReminder: 'Decomposition breaks a complex mental operation into simple steps.'
  },
  'mental_mult': {
    concept: 'Mental Arithmetic',
    subskill: 'Rapid Multiplication',
    difficulty: 'Hard',
    learningObjective: 'Solve multi-digit products using mental strategies.',
    commonMistakes: 'Mixing up partial products.',
    tip: 'Use the distributive property: $a \\times (b + c) = ab + ac$. For example, $7 \\times 14 = 7 \\times (10 + 4) = 70 + 28 = 98$.',
    conceptualReminder: 'The distributive property is the foundation for mental multiplication.'
  },
  'mental_square': {
    concept: 'Mental Arithmetic',
    subskill: 'Perfect Squares',
    difficulty: 'Hard',
    learningObjective: 'Calculate squares of double-digit numbers mentally.',
    commonMistakes: 'Forgetting the middle cross-product term.',
    tip: 'Use the identity $(a+b)^2 = a^2 + 2ab + b^2$ or near-squares: for $15^2$, remember ending in 5 squares are calculated as $n \\times (n+1)$ followed by 25 (e.g. $1 \\times 2 = 2 \\implies 225$).',
    conceptualReminder: 'Squaring a number is multiplying a quantity by itself.'
  },
  'mental_cube': {
    concept: 'Mental Arithmetic',
    subskill: 'Perfect Cubes',
    difficulty: 'Expert',
    learningObjective: 'Recall or calculate perfect cubes mentally.',
    commonMistakes: 'Simple multiplication errors.',
    tip: 'A cube is $x^3 = x \\times x \\times x$. Find the square $x^2$ first, then multiply the result by $x$ one more time.',
    conceptualReminder: 'Cubic values scale a quantity across three dimensions.'
  },
  // Algebra
  'linear_one_step_add': {
    concept: 'Linear Equations',
    subskill: 'One-step Add/Sub',
    difficulty: 'Easy',
    learningObjective: 'Isolate variables using inverse addition or subtraction.',
    commonMistakes: 'Adding to one side instead of performing the same operation on both.',
    tip: 'Perform the inverse operation on both sides of the equation to isolate the variable. If you see $+a$, subtract $a$ from both sides.',
    conceptualReminder: 'To keep an equation balanced, apply the exact same operation to both sides.'
  },
  'linear_one_step_mult': {
    concept: 'Linear Equations',
    subskill: 'One-step Mult/Div',
    difficulty: 'Easy',
    learningObjective: 'Isolate variables using inverse multiplication or division.',
    commonMistakes: 'Forgetting to divide the entire opposite side.',
    tip: 'Perform the inverse operation on both sides of the equation. If the variable is multiplied by $k$, divide both sides of the equation by $k$.',
    conceptualReminder: 'Inverse operations undo algebraic ties to isolate the variable.'
  },
  'linear_two_step': {
    concept: 'Linear Equations',
    subskill: 'Two-step Equations',
    difficulty: 'Medium',
    learningObjective: 'Solve linear equations requiring two arithmetic operations.',
    commonMistakes: 'Dividing before removing constant additions.',
    tip: 'Undo addition or subtraction first, then undo multiplication or division. Isolate the variable term first, then isolate the variable itself.',
    conceptualReminder: 'Solving linear equations follows the reverse order of arithmetic operations.'
  },
  'linear_variable_both_sides': {
    concept: 'Linear Equations',
    subskill: 'Variables on Both Sides',
    difficulty: 'Medium',
    learningObjective: 'Group variable terms and constant terms to solve equations.',
    commonMistakes: 'Combining terms with different signs incorrectly.',
    tip: 'Move all variable terms to one side of the equation (usually the side with the larger coefficient) and all constants to the other side.',
    conceptualReminder: 'Group like algebraic terms to reduce the equation to a solvable format.'
  },
  'quadratic': {
    concept: 'Quadratic Equations',
    subskill: 'Factoring or Formula',
    difficulty: 'Hard',
    learningObjective: 'Solve quadratic equations of the form $ax^2 + bx + c = 0$.',
    commonMistakes: 'Forgetting the negative sign in the quadratic formula numerator.',
    tip: 'Try factoring the quadratic equation into $(x - r_1)(x - r_2) = 0$, where the roots multiply to $c/a$ and add to $-b/a$. Alternatively, use the quadratic formula.',
    conceptualReminder: 'Quadratic equations represent parabolas and have up to two real roots.'
  },
  'linear_system': {
    concept: 'Systems of Equations',
    subskill: 'Substitution or Elimination',
    difficulty: 'Hard',
    learningObjective: 'Solve systems of two linear equations simultaneously.',
    commonMistakes: 'Substituting into the wrong variable or calculation slips.',
    tip: 'Use elimination (adding or subtracting equations to cancel a variable) or substitution (solving one equation for a variable and plugging it into the other).',
    conceptualReminder: 'Systems of equations find the intersection point of multiple lines.'
  },
  // Pythagorean
  'pythagorean': {
    concept: 'Geometry',
    subskill: 'Right Triangles',
    difficulty: 'Medium',
    learningObjective: 'Solve right-triangle side lengths using the Pythagorean Theorem.',
    commonMistakes: 'Adding leg squares when trying to find a leg instead of the hypotenuse.',
    tip: 'Use $a^2 + b^2 = c^2$, where $c$ is the hypotenuse (opposite the right angle). If finding a leg, rewrite as $a^2 = c^2 - b^2$.',
    conceptualReminder: 'The Pythagorean Theorem relates the three sides of a right triangle.'
  },
  // Advanced number theory
  'fermat_little': {
    concept: 'Modular Arithmetic',
    subskill: "Fermat's Little Theorem",
    difficulty: 'Expert',
    learningObjective: "Apply Fermat's Little Theorem to simplify prime modular exponents.",
    commonMistakes: 'Using the theorem when the modulus is not prime.',
    tip: "Fermat's Little Theorem states that $a^{p-1} \\equiv 1 \\pmod{p}$ for a prime $p$ when $a$ is not divisible by $p$. Use this to reduce large exponents!",
    conceptualReminder: "Fermat's Little Theorem provides a shortcut for calculating modular powers with prime bases."
  },
  'euler_totient': {
    concept: 'Modular Arithmetic',
    subskill: "Euler's Totient Function",
    difficulty: 'Expert',
    learningObjective: 'Calculate the count of coprime integers up to $n$ using $\\phi(n)$.',
    commonMistakes: 'Applying prime properties to composite modulus calculations.',
    tip: 'For $n = p \\times q$ (product of primes), $\\phi(n) = (p-1)(q-1)$. For any prime $p$, $\\phi(p) = p-1$. Coprime numbers satisfy $a^{\\phi(n)} \\equiv 1 \\pmod{n}$.',
    conceptualReminder: "Euler's Totient function counts positive integers up to $n$ that are relatively prime to $n$."
  },
  'euler_identity': {
    concept: 'Complex Numbers',
    subskill: "Euler's Formula",
    difficulty: 'Expert',
    learningObjective: "Apply Euler's Identity to link algebra, trigonometry, and complex coordinates.",
    commonMistakes: 'Confusing radians and degrees.',
    tip: "Remember Euler's formula: $e^{i\\theta} = \\cos\\theta + i\\sin\\theta$. At $\\theta = \\pi$, this yields the famous identity $e^{i\\pi} + 1 = 0$.",
    conceptualReminder: "Euler's Identity connects five fundamental mathematical constants."
  },
  'binomial': {
    concept: 'Combinatorics',
    subskill: 'Binomial Theorem',
    difficulty: 'Hard',
    learningObjective: 'Expand powers of binomial expressions using binomial coefficients.',
    commonMistakes: 'Forgetting coefficient indices or factorial divisions.',
    tip: 'The coefficient of $x^{n-k}y^k$ in $(x+y)^n$ is $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$. To find the sum of all coefficients, set $x = 1, y = 1$.',
    conceptualReminder: "The Binomial Theorem expansion coefficients correspond to rows in Pascal's Triangle."
  },
  'limit': {
    concept: 'Calculus',
    subskill: 'Limits Evaluation',
    difficulty: 'Hard',
    learningObjective: 'Evaluate limits of rational and algebraic functions.',
    commonMistakes: 'Assuming $0/0$ is the final answer instead of simplifying or using L\'Hopital\'s rule.',
    tip: 'If direct substitution gives $0/0$, try factoring and simplifying the expression, or apply L\'Hôpital\'s rule (differentiating numerator and denominator).',
    conceptualReminder: 'Limits describe the value a function approaches as its input gets arbitrarily close to a point.'
  },
  'derivative': {
    concept: 'Calculus',
    subskill: 'Differentiation Rules',
    difficulty: 'Hard',
    learningObjective: 'Find derivatives using power, product, quotient, and chain rules.',
    commonMistakes: 'Forgetting chain rule multipliers for composite functions.',
    tip: 'Use the Power Rule: $\\frac{d}{dx}[x^n] = n x^{n-1}$. For trigonometric derivatives, remember $\\frac{d}{dx}[\\sin x] = \\cos x$ and $\\frac{d}{dx}[\\cos x] = -\\sin x$.',
    conceptualReminder: 'The derivative represents the instantaneous rate of change of a function.'
  },
  'integral': {
    concept: 'Calculus',
    subskill: 'Definite Integrals',
    difficulty: 'Hard',
    learningObjective: 'Calculate areas under curves using antiderivatives and the Fundamental Theorem of Calculus.',
    commonMistakes: 'Forgetting boundary evaluations or incorrect antiderivatives.',
    tip: 'Find the antiderivative $F(x)$ first, then evaluate the definite integral by calculating the difference at the boundaries: $F(b) - F(a)$.',
    conceptualReminder: 'Integration accumulates values, representing area under curves.'
  },
  'matrix_determinant': {
    concept: 'Linear Algebra',
    subskill: '2x2 Determinant',
    difficulty: 'Hard',
    learningObjective: 'Calculate the determinant of a 2x2 square matrix.',
    commonMistakes: 'Adding diagonals instead of subtracting ($ad - bc$, not $ad + bc$).',
    tip: 'For a matrix $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$, the determinant is calculated as $ad - bc$. Subtract the product of the off-diagonal from the main diagonal.',
    conceptualReminder: 'The determinant describes the scaling factor of a linear transformation.'
  },
  'matrix_trace': {
    concept: 'Linear Algebra',
    subskill: 'Matrix Trace',
    difficulty: 'Medium',
    learningObjective: 'Sum diagonal elements of square matrices.',
    commonMistakes: 'Summing off-diagonal elements.',
    tip: 'The trace of a square matrix is simply the sum of all elements on its main diagonal (from top-left to bottom-right).',
    conceptualReminder: 'The trace is invariant under basis changes and equals the sum of eigenvalues.'
  },
  'probability': {
    concept: 'Probability',
    subskill: 'Event Probability',
    difficulty: 'Medium',
    learningObjective: 'Calculate event probabilities using sample spaces.',
    commonMistakes: 'Dividing by the wrong total size.',
    tip: 'Probability is the number of favorable outcomes divided by the total number of possible outcomes. Ensure you correctly enumerate the sample space.',
    conceptualReminder: 'Probability measures the likelihood of an event occurring, bounded between 0 and 1.'
  },
  'combinations': {
    concept: 'Combinatorics',
    subskill: 'Combinations (nCr)',
    difficulty: 'Hard',
    learningObjective: 'Calculate selection combinations when order does not matter.',
    commonMistakes: 'Forgetting to divide by the factorial of selection size.',
    tip: 'Use combinations ($nCr$) when order does not matter: $\\binom{n}{r} = \\frac{n!}{r!(n-r)!}$. For example, selecting 2 items out of 4 is $\\frac{4 \\times 3}{2 \\times 1} = 6$.',
    conceptualReminder: 'Combinations measure subsets of size $r$ chosen from a set of size $n.'
  },
  'permutations': {
    concept: 'Combinatorics',
    subskill: 'Permutations (nPr)',
    difficulty: 'Hard',
    learningObjective: 'Calculate arrangement permutations when order does matter.',
    commonMistakes: 'Dividing by selection size factorial (which is for combinations, not permutations).',
    tip: 'Use permutations ($nPr$) when order matters: $P(n, r) = \\frac{n!}{(n-r)!}$. For example, arranging 2 items out of 4 is $4 \\times 3 = 12$.',
    conceptualReminder: 'Permutations measure ordered arrangements of size $r$ from a set of size $n$.'
  },
  'pigeonhole': {
    concept: 'Combinatorics',
    subskill: 'Pigeonhole Principle',
    difficulty: 'Medium',
    learningObjective: 'Apply the Pigeonhole Principle to resolve discrete math problems.',
    commonMistakes: 'Miscounting the number of pigeons or holes.',
    tip: 'The Pigeonhole Principle states that if $n$ items are put into $m$ containers, with $n > m$, then at least one container must contain more than one item.',
    conceptualReminder: 'The Pigeonhole Principle is a fundamental tool in combinatorics and proofs.'
  },
  'modulo': {
    concept: 'Modular Arithmetic',
    subskill: 'Congruences',
    difficulty: 'Medium',
    learningObjective: 'Compute modular congruences and remainders.',
    commonMistakes: 'Confusing negative numbers remainders (mod is always non-negative).',
    tip: '$a \\pmod{n}$ is the remainder when $a$ is divided by $n$. Ensure the remainder is always positive and strictly less than $n$.',
    conceptualReminder: 'Modular arithmetic handles cyclic numbers, like hours on a clock.'
  },
  'totient': {
    concept: 'Number Theory',
    subskill: 'Totient Calculations',
    difficulty: 'Expert',
    learningObjective: 'Resolve coprimality calculations using totient properties.',
    commonMistakes: 'Basic division slips.',
    tip: 'To find $\\phi(n)$ for a prime power $p^k$, use $\\phi(p^k) = p^k - p^{k-1}$. For composite numbers, multiply by $(1 - 1/p)$ for each prime factor $p$.',
    conceptualReminder: 'The totient function maps numbers to their coprime set count.'
  },
  'gcd': {
    concept: 'Number Theory',
    subskill: 'Greatest Common Divisor',
    difficulty: 'Easy',
    learningObjective: 'Find the largest integer dividing both values.',
    commonMistakes: 'Finding the Least Common Multiple instead of GCD.',
    tip: 'The Greatest Common Divisor (GCD) is the largest positive integer that divides both numbers. Use prime factorization or the Euclidean algorithm.',
    conceptualReminder: 'The GCD is the largest common factor shared by two numbers.'
  },
  'divisors': {
    concept: 'Number Theory',
    subskill: 'Divisors Count',
    difficulty: 'Medium',
    learningObjective: 'Find all divisors of an integer.',
    commonMistakes: 'Forgetting 1 or the number itself.',
    tip: 'If prime factorization of $n$ is $p^a \\times q^b \\dots$, the total number of divisors is $(a+1) \\times (b+1) \\dots$. Don\'t forget to list 1 and $n$!',
    conceptualReminder: 'Divisors divide an integer leaving zero remainder.'
  },
  'average': {
    concept: 'Statistics',
    subskill: 'Arithmetic Mean',
    difficulty: 'Easy',
    learningObjective: 'Calculate the average of a set of values.',
    commonMistakes: 'Summing incorrectly or dividing by wrong sample count.',
    tip: 'The average is the sum of all elements divided by the count of elements: $\\text{Mean} = \\frac{\\sum x_i}{N}$.',
    conceptualReminder: 'The average or mean represents the central value of a set of numbers.'
  },
  'percentage': {
    concept: 'Arithmetic',
    subskill: 'Percentages',
    difficulty: 'Easy',
    learningObjective: 'Perform percentage increases and decreases.',
    commonMistakes: 'Applying percentage directly to wrong bases.',
    tip: 'Percent means "per 100". To find $p\\%$ of $x$, calculate $\\frac{p}{100} \\times x$. To increase by $p\\%$, multiply by $(1 + \\frac{p}{100})$.',
    conceptualReminder: 'Percentages describe fractions of a quantity in terms of hundredths.'
  },
  'estimation': {
    concept: 'Arithmetic',
    subskill: 'Approximation',
    difficulty: 'Easy',
    learningObjective: 'Estimate complex products or sums using rounding.',
    commonMistakes: 'Rounding to wrong place values.',
    tip: 'Round the numbers to their nearest significant place value first to simplify multiplication/addition and find a close estimate.',
    conceptualReminder: 'Estimation provides rapid approximations to verify exact calculations.'
  }
};

module.exports = { tipsMap };
