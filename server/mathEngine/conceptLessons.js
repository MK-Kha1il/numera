// Concept-First Lesson Library
// ----------------------------------------------------------------------------
// Each lesson teaches a concept the way an elite tutor would: intuition BEFORE
// the rule, the idea from MULTIPLE representations, an honest account of WHY it
// works, WHEN to reach for it, the mistakes learners actually make (sourced from
// the misconception rules in knowledgeGraph.js so teaching and remediation
// agree), and the CONNECTIONS that turn isolated facts into a web of meaning.
//
// Shape (all string fields may contain $...$ LaTeX; the client auto-detects):
//   { title, formula, oneLineSummary,
//     intuitionHook, whatItIs, whyItWorks, whenToUse,
//     representations: [{ kind, label, body }],
//     commonMistakes:  [{ label, why, fix }],
//     connections:     [{ concept, note }],
//     examples:        [{ question, answer, explanation }] }
//
// `representations[].kind` is one of: number_line | area_model | real_world |
// symbolic | balance | grid — a hint the client can use for an icon/accent.
// Content is intentionally authored, not generated: quality over volume.
// ----------------------------------------------------------------------------

const CONCEPT_LESSONS = {
  // ===========================================================================
  arithmetic_add: {
    title: "Addition",
    formula: "a + b = b + a",
    oneLineSummary: "Addition combines two amounts into one total — and the order never changes the result.",
    intuitionHook: "You have 5 stickers and a friend hands you 7 more. Without counting one-by-one from 1, can you feel that the pile is now 12? Addition is just the name we give to that feeling of 'putting together'.",
    whatItIs: "Addition takes two quantities and reports how much you have altogether. We call the inputs the *addends* and the result the *sum*.",
    whyItWorks: "Counting is exhausting because each object is treated as separate. Addition is a shortcut: instead of recounting the whole pile, we start from one amount and count on by the other. Because 'putting together' doesn't care which pile you grab first, $5+7$ and $7+5$ land on the same total — this is the **commutative property**, and it lets you start from the larger number to count on less.",
    whenToUse: "Reach for addition whenever you are joining groups, moving forward/right on a number line, finding a total, or undoing a subtraction.",
    representations: [
      { kind: "number_line", label: "Number line", body: "Start at $5$ and take $7$ steps to the right. You land on $12$. Adding always moves you to the right — toward bigger numbers." },
      { kind: "area_model", label: "Place-value columns", body: "Stack numbers so units sit over units and tens over tens: $24 + 15$ becomes $(20+10)+(4+5)=30+9=39$. Carrying happens when a column overflows $9$." },
      { kind: "real_world", label: "In the world", body: "Money in two pockets, scores across two rounds, distance over two days — any time separate amounts merge into one." }
    ],
    commonMistakes: [
      { label: "Place-value misalignment", why: "Writing $24+5$ as $24+50$ by sliding the $5$ into the tens column. The digits look fine but their *value* is wrong.", fix: "Always line up the right-hand (units) edge first. A lone digit like $5$ is units, not tens." },
      { label: "Off-by-one when counting on", why: "Counting the starting number itself as the first step, so $5$ count-on $7$ lands on $11$ instead of $12$.", fix: "The first step lands on $6$, not $5$. Say the next number as you take the first step." }
    ],
    connections: [
      { concept: "arithmetic_sub", note: "Subtraction is addition run backwards — it undoes a join." },
      { concept: "arithmetic_mult", note: "Multiplication is repeated addition of equal groups." }
    ],
    examples: [
      { question: "Compute $8 + 9$ by counting on from the larger number.", answer: "17", explanation: "Start at $9$ (the bigger addend, so you count fewer steps) and count on $8$: $10,11,\\dots,17$. Commutativity guarantees this equals $8+9$." },
      { question: "Evaluate $24 + 15$ using place value.", answer: "39", explanation: "Split by place value: tens give $20+10=30$, units give $4+5=9$. Recombine: $30+9=39$. No column overflowed $9$, so no carrying was needed." }
    ]
  },

  // ===========================================================================
  arithmetic_sub: {
    title: "Subtraction",
    formula: "a - b = c \\iff c + b = a",
    oneLineSummary: "Subtraction measures the gap between two amounts — equivalently, what you must add back to return to the start.",
    intuitionHook: "You had 12 cookies and ate 5. You don't recount what's left from 1 — you feel that 7 remain. Now flip it: how many more cookies would refill the plate to 12? Same 7. Subtraction and 'adding back' are two views of one idea.",
    whatItIs: "Subtraction answers either 'how much is left after removing some' (take-away) or 'how far apart are these two amounts' (difference). Same operation, two stories.",
    whyItWorks: "Every subtraction hides an addition: $12 - 5 = 7$ is true precisely because $7 + 5 = 12$. That is why subtraction *undoes* addition. The 'difference' view explains a fast trick — to find $45 - 38$, don't take away $38$; instead count UP from $38$ to $45$ (that's $7$), because the gap is the same measured from either end.",
    whenToUse: "Use subtraction to find what remains, to compare two quantities, to find change owed, or to reverse an addition.",
    representations: [
      { kind: "number_line", label: "Number line", body: "$45 - 38$: stand on $38$ and measure the jump to $45$. That distance — $7$ — is the answer. Subtraction is the arrow *between* two points." },
      { kind: "area_model", label: "Borrowing", body: "In $45 - 18$, units need $5 - 8$ which won't go, so borrow: regroup one ten into ten units, making it $15 - 8 = 7$, and the tens become $3 - 1 = 2$. Result $27$." },
      { kind: "real_world", label: "In the world", body: "Change from a purchase, temperature drop overnight, how many pages are left in a book." }
    ],
    commonMistakes: [
      { label: "Subtracting the wrong way round", why: "Treating $a-b$ as $b-a$ because 'you always take small from big'. Order matters: $5-8 \\ne 8-5$.", fix: "Keep the minuend (the amount you start with) on the left. If the result should be negative, let it be negative — don't silently flip." },
      { label: "Borrowing slip", why: "Reducing the units gap but forgetting to drop the borrowed ten from the tens column.", fix: "Borrowing is a fair trade: $+10$ to units must cost $-1$ from tens. Check both columns moved." },
      { label: "Adding instead of subtracting", why: "Under time pressure the brain defaults to the more practised '+'.", fix: "Re-read the question: 'left', 'fewer', 'difference', 'change' all signal subtraction." }
    ],
    connections: [
      { concept: "arithmetic_add", note: "Subtraction is the inverse of addition — each checks the other." },
      { concept: "linear_one_step", note: "Solving $x + a = b$ is exactly one subtraction: $x = b - a$." }
    ],
    examples: [
      { question: "Compute $45 - 38$ by counting up (the difference view).", answer: "7", explanation: "From $38$, jump $+2$ to $40$, then $+5$ to $45$. Total jump $2+5=7$. Counting up avoids borrowing entirely." },
      { question: "Compute $45 - 18$ with regrouping.", answer: "27", explanation: "Units: $5-8$ won't go, so borrow a ten: $15-8=7$. Tens: now $3-1=2$. Answer $27$. Verify by adding back: $27+18=45$." }
    ]
  },

  // ===========================================================================
  arithmetic_mult: {
    title: "Multiplication",
    formula: "a \\times b = \\underbrace{a + a + \\dots + a}_{b\\text{ times}}",
    oneLineSummary: "Multiplication is a shortcut for adding the same amount many times — and it counts the cells of a rectangle.",
    intuitionHook: "Four bags, each holding 6 marbles. You *could* add $6+6+6+6$. But notice you're adding the same number again and again — that repetition is exactly what multiplication packages up. So $4 \\times 6 = 24$ without four separate additions.",
    whatItIs: "Multiplication takes a group size and a number of groups and returns the total. $a \\times b$ means '$b$ groups of $a$'.",
    whyItWorks: "Repeated addition is slow and error-prone; multiplication is the compressed form. The deeper picture is **area**: arrange $4$ rows of $6$ dots and you get a rectangle whose dots you can count as $4\\times 6$ — or, tilting your head, as $6\\times 4$. The rectangle looks the same rotated, which is *why* multiplication is commutative. Splitting that rectangle also reveals the **distributive property**: $7\\times 14 = 7\\times(10+4)=70+28$.",
    whenToUse: "Use multiplication for equal groups, scaling a quantity up, finding areas, or converting between units (e.g. hours to minutes).",
    representations: [
      { kind: "area_model", label: "Rectangle of dots", body: "$3 \\times 4$ is a grid with $3$ rows and $4$ columns. Count the dots: $12$. Rotating the grid to $4\\times 3$ doesn't change the dot count — that's commutativity." },
      { kind: "number_line", label: "Equal jumps", body: "Start at $0$ and take $4$ jumps of size $6$: $6, 12, 18, 24$. Skip-counting is multiplication in motion." },
      { kind: "symbolic", label: "Distributive split", body: "Break a hard product into easy ones: $7 \\times 14 = 7\\times 10 + 7\\times 4 = 70 + 28 = 98$." }
    ],
    commonMistakes: [
      { label: "Adding the factors instead of multiplying", why: "Reading $4 \\times 6$ as $4 + 6 = 10$ — confusing 'groups of' with 'put together'.", fix: "Ask: is it ONE combined pile (add) or SEVERAL equal piles (multiply)? '$4$ groups of $6$' is repeated addition: $24$." },
      { label: "Times-table neighbour slip", why: "Recalling an adjacent fact, e.g. $7\\times 8 = 54$ (that's $6\\times 9$) instead of $56$.", fix: "Anchor to a known fact and adjust: $7\\times 8 = 7\\times 7 + 7 = 49+7 = 56$." }
    ],
    connections: [
      { concept: "arithmetic_add", note: "Multiplication is repeated addition of equal groups." },
      { concept: "arithmetic_div", note: "Division undoes multiplication: it asks 'how many groups?' or 'how big is each group?'." },
      { concept: "pythagorean", note: "Squaring a side ($a\\times a$) is multiplication — the engine inside $a^2+b^2=c^2$." }
    ],
    examples: [
      { question: "Why does $4 \\times 6 = 6 \\times 4$? Find both totals.", answer: "24", explanation: "$4$ groups of $6$ add to $24$; $6$ groups of $4$ also add to $24$. The same dot rectangle, rotated — commutativity isn't a rule to memorise, it's a picture." },
      { question: "Use the distributive property to compute $7 \\times 14$.", answer: "98", explanation: "Split $14 = 10 + 4$: $7\\times 10 = 70$ and $7\\times 4 = 28$. Add the two easy products: $70 + 28 = 98$." }
    ]
  },

  // ===========================================================================
  arithmetic_div: {
    title: "Division",
    formula: "a \\div b = c \\iff c \\times b = a",
    oneLineSummary: "Division splits a total into equal shares — and it is multiplication asked backwards.",
    intuitionHook: "12 cookies, 3 friends, fair shares. You hand them out one round at a time until they're gone — each friend ends with 4. You just divided, and notice you were really asking: '$3$ times what equals $12$?'",
    whatItIs: "Division answers one of two questions: 'how big is each share?' (sharing) or 'how many shares fit?' (grouping). Both split a total $a$ by a divisor $b$.",
    whyItWorks: "Division is the inverse of multiplication: $12 \\div 3 = 4$ holds *because* $4 \\times 3 = 12$. That link is your most reliable check — if a quotient is right, multiplying it back must rebuild the dividend. When the split isn't exact, what's left over is the **remainder**, and ignoring it changes the answer's meaning entirely.",
    whenToUse: "Use division to share equally, to find a rate (per unit), to find how many times one amount fits inside another, or to reverse a multiplication.",
    representations: [
      { kind: "area_model", label: "Sharing into rows", body: "$12 \\div 3$: deal $12$ dots into $3$ equal rows. Each row gets $4$. (Sharing view: divisor = number of groups.)" },
      { kind: "number_line", label: "Repeated subtraction", body: "How many $3$s fit in $12$? Jump back by $3$: $12\\to9\\to6\\to3\\to0$ — four jumps. (Grouping view: divisor = size of each group.)" },
      { kind: "real_world", label: "In the world", body: "Splitting a bill, miles per hour, packing items into boxes that hold a fixed number." }
    ],
    commonMistakes: [
      { label: "Ignoring the remainder", why: "Reporting $13 \\div 4 = 3$ and dropping the leftover $1$, even when the question needs it (e.g. '4 seats per car, 13 people' needs a 4th car).", fix: "Decide what the leftover means in context: round up for 'enough containers', keep as remainder for 'what's left', or continue into a fraction/decimal." },
      { label: "Dividing in the wrong direction", why: "Computing $b \\div a$ instead of $a \\div b$ — division, unlike multiplication, is NOT commutative.", fix: "The total (dividend) goes inside; the number you split by (divisor) goes outside. $12\\div 3 \\ne 3 \\div 12$." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Division undoes multiplication — multiply the quotient back to check." },
      { concept: "gcd_lcm", note: "The Euclidean algorithm for GCD is repeated division with remainders." },
      { concept: "modular_arithmetic", note: "Modular arithmetic keeps the remainder and throws away the quotient." }
    ],
    examples: [
      { question: "Compute $15 \\div 3$ and state the multiplication that confirms it.", answer: "5", explanation: "Ask '$3$ times what is $15$?' — that's $5$. Check: $5 \\times 3 = 15$. The inverse multiplication is the proof, not a separate step." },
      { question: "13 people travel in cars holding 4 each. How many cars are needed?", answer: "4", explanation: "$13 \\div 4 = 3$ remainder $1$. Three full cars seat $12$; the leftover person still needs a car, so round UP to $4$. Here the remainder forces rounding up — dropping it would strand someone." }
    ]
  },

  // ===========================================================================
  pemdas: {
    title: "Order of Operations",
    formula: "\\text{Parentheses} \\to \\text{Exponents} \\to \\times,\\div \\to +,-",
    oneLineSummary: "A shared agreement on which operation goes first, so every reader of an expression gets the same answer.",
    intuitionHook: "Does $3 + 4 \\times 5$ equal $35$ or $23$? If we each evaluated left-to-right we'd argue forever. Mathematics avoids the argument with one rule book — and the rule isn't arbitrary, it reflects that multiplication is 'stronger glue' than addition.",
    whatItIs: "Order of operations (PEMDAS / BODMAS) is the convention that fixes the sequence: Parentheses, then Exponents, then Multiplication/Division left-to-right, then Addition/Subtraction left-to-right.",
    whyItWorks: "Multiplication is repeated addition, so $3 + 4\\times 5$ means '$3$ plus five fours' = $3 + 20 = 23$, not $(3+4)$ fives. The hierarchy preserves the meaning of the compressed notation. Parentheses are the override switch: they let a writer *force* a different grouping when the default isn't what's meant.",
    whenToUse: "Apply it whenever an expression mixes operations. When in doubt, add parentheses to make your intent unambiguous — even when not strictly required.",
    representations: [
      { kind: "symbolic", label: "Stronger glue first", body: "Think of $\\times,\\div$ as binding tighter than $+,-$. In $3 + 4\\times 5$, the $4$ and $5$ are glued into $20$ before the $3$ can join: $3 + 20 = 23$." },
      { kind: "real_world", label: "Why it matters", body: "'$3$ shirts plus $4$ packs of $5$ socks' is $3 + 4\\times 5$ items. Evaluating left-to-right would wrongly merge shirts and packs before counting the socks." }
    ],
    commonMistakes: [
      { label: "Strict left-to-right evaluation", why: "Computing $6 + 2\\times 8$ as $(6+2)\\times 8 = 64$ instead of $6 + 16 = 22$.", fix: "Scan for $\\times$ and $\\div$ first and resolve them before any $+$ or $-$, regardless of position." },
      { label: "Treating M before D (or A before S) as fixed", why: "Believing multiplication ALWAYS precedes division. They share a tier.", fix: "Within the $\\times,\\div$ tier (and within $+,-$), work strictly left-to-right. $8 \\div 4 \\times 2 = 4$, not $1$." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Multiplication outranks addition precisely because it is repeated addition." },
      { concept: "linear_two_step", note: "Solving equations reverses this order — undo $+,-$ first, then $\\times,\\div$." }
    ],
    examples: [
      { question: "Evaluate $6 + 2 \\times 8$.", answer: "22", explanation: "Multiplication is stronger glue: bind $2\\times 8 = 16$ first, then add $6 + 16 = 22$. The $2$ belongs to the $8$, not the $6$." },
      { question: "Evaluate $8 \\div 4 \\times 2$.", answer: "4", explanation: "$\\div$ and $\\times$ share a tier, so go left-to-right: $8\\div 4 = 2$, then $2\\times 2 = 4$. Doing multiplication first would wrongly give $1$." }
    ]
  },

  // ===========================================================================
  linear_one_step: {
    title: "One-Step Equations",
    formula: "x + a = b \\implies x = b - a",
    oneLineSummary: "An equation is a balanced scale; you isolate the unknown by undoing whatever was done to it — equally on both sides.",
    intuitionHook: "$x + 5 = 12$. Picture a balance scale: an unknown weight plus a $5$ kg block balances $12$ kg. To find the unknown alone, lift $5$ kg off — but you must lift $5$ off the OTHER side too, or the scale tips. That 'do it to both sides' instinct is all of equation-solving.",
    whatItIs: "A one-step linear equation has the variable changed by a single operation. Solving means rearranging until the variable stands alone, with its value on the other side.",
    whyItWorks: "An equals sign is a promise that both sides weigh the same. Any operation applied identically to both sides keeps that promise true. To strip away a $+5$, apply its **inverse** ($-5$) to both sides; the $+5$ and $-5$ cancel, leaving $x$ bare. Inverse operations are the keys: $+ \\leftrightarrow -$ and $\\times \\leftrightarrow \\div$.",
    whenToUse: "Use it whenever exactly one operation stands between you and the variable — a foundation for every harder equation.",
    representations: [
      { kind: "balance", label: "Balance scale", body: "$x + 5 = 12$: remove $5$ from each pan. Left becomes $x$, right becomes $7$. The scale stays level, so $x = 7$." },
      { kind: "symbolic", label: "Inverse cancels", body: "Multiplication version: $3x = 15$ is undone by dividing both sides by $3$, since $\\div 3$ reverses $\\times 3$: $x = 5$." },
      { kind: "real_world", label: "In the world", body: "'I spent 5 dollars and have 12 left — how much did I start with?' is $x - 5 = 12$, solved by adding $5$ back: $x = 17$." }
    ],
    commonMistakes: [
      { label: "Using the same sign instead of the inverse", why: "Seeing $x + 5 = 12$ and adding $5$ (because '$5$ is there'), getting $x = 17$.", fix: "Undo with the OPPOSITE operation. A $+5$ is removed by $-5$. Ask 'what cancels this?', not 'what do I see?'." },
      { label: "Operating on only one side", why: "Subtracting $5$ from the left but leaving the right as $12$, breaking the balance.", fix: "Whatever you do to one side, do identically to the other — that's the only way the equals sign stays honest." }
    ],
    connections: [
      { concept: "arithmetic_sub", note: "Solving $x+a=b$ is a single subtraction in disguise." },
      { concept: "linear_two_step", note: "Two-step equations are this idea applied twice, in reverse PEMDAS order." }
    ],
    examples: [
      { question: "Solve $x + 5 = 12$, and name the operation you used.", answer: "7", explanation: "The variable has $+5$ attached; its inverse is $-5$. Apply to both sides: $x = 12 - 5 = 7$. Check: $7 + 5 = 12$. ✓" },
      { question: "Solve $3x = 15$.", answer: "5", explanation: "Here $x$ is multiplied by $3$, so divide both sides by $3$ (the inverse of $\\times 3$): $x = 15 \\div 3 = 5$. Check: $3 \\times 5 = 15$. ✓" }
    ]
  },

  // ===========================================================================
  linear_two_step: {
    title: "Two-Step Equations",
    formula: "ax + b = c \\implies x = \\dfrac{c - b}{a}",
    oneLineSummary: "Two operations wrap the variable, so peel them off in reverse order — constants first, coefficient last.",
    intuitionHook: "Think of $3x + 4 = 19$ as the variable getting dressed: first it was multiplied by $3$ (socks), then $4$ was added (shoes). To undo dressing you reverse the order — shoes before socks. So subtract the $4$ first, then divide by $3$.",
    whatItIs: "A two-step linear equation applies two operations to the variable. Solving unwinds them in the opposite order they were applied.",
    whyItWorks: "Operations were layered onto $x$ following the order of operations (multiply, then add). To invert a sequence you reverse it — like untying knots, last tied is first untied. So you clear the added constant first (it's the outermost layer), then divide away the coefficient. Subtracting the constant before dividing keeps the whole side intact; dividing first would force you to split the constant too, inviting errors.",
    whenToUse: "Use it for equations of the form $ax + b = c$ — the workhorse of algebra, and the pattern beneath most word problems.",
    representations: [
      { kind: "balance", label: "Balance, two moves", body: "$3x + 4 = 19$: first lift $4$ off both pans → $3x = 15$. Then split each pan into $3$ equal parts → $x = 5$." },
      { kind: "symbolic", label: "Reverse the build", body: "Build: $x \\xrightarrow{\\times 3} 3x \\xrightarrow{+4} 3x+4$. Solve by reversing: $\\;\\xrightarrow{-4}\\;\\xrightarrow{\\div 3}\\;$." },
      { kind: "real_world", label: "In the world", body: "'A taxi charges 4 dollars plus 3 dollars per mile; the fare was 19 dollars — how many miles?' is $3x + 4 = 19$." }
    ],
    commonMistakes: [
      { label: "Dividing before clearing the constant", why: "Turning $3x + 4 = 19$ into $x + 4 = ...$ by dividing only the $3x$, or dividing everything but mishandling the $+4$.", fix: "Strip the $+4$ first (it's the outer layer): $3x = 15$. Only then divide by $3$. Reverse PEMDAS." },
      { label: "Forgetting to divide the whole other side", why: "From $3x = 15$, writing $x = 15$ — dividing the left by $3$ but not the right.", fix: "Divide BOTH sides by the coefficient: $x = 15 \\div 3 = 5$." }
    ],
    connections: [
      { concept: "linear_one_step", note: "Each step here is a one-step equation; this is that skill, twice." },
      { concept: "pemdas", note: "You undo operations in the reverse of the order-of-operations sequence." },
      { concept: "quadratic", note: "When $x$ appears squared, two-step methods aren't enough — that's the leap to quadratics." }
    ],
    examples: [
      { question: "Solve $3x + 4 = 19$. Why subtract before dividing?", answer: "5", explanation: "Subtract the outer layer first: $3x = 15$. Then divide by $3$: $x = 5$. Subtracting first keeps the $3x$ term whole; dividing first would force you to compute $19\\div3$ and $4\\div3$ — messier and error-prone. Check: $3(5)+4=19$. ✓" },
      { question: "Solve $2y + 6 = 14$.", answer: "4", explanation: "Clear the constant: $2y = 8$. Divide by the coefficient: $y = 4$. Reverse-PEMDAS in action. Check: $2(4)+6 = 14$. ✓" }
    ]
  },

  // ===========================================================================
  pythagorean: {
    title: "The Pythagorean Theorem",
    formula: "a^2 + b^2 = c^2",
    oneLineSummary: "In a right triangle, the square built on the longest side equals the two squares on the shorter sides — combined.",
    intuitionHook: "Imagine literal squares glued to each side of a right triangle. The astonishing claim: the two smaller squares, if melted down, would exactly fill the biggest one. Area in, area out — no leftover, no shortfall. That balance is the theorem.",
    whatItIs: "For any right-angled triangle with legs $a$ and $b$ and hypotenuse $c$ (the side opposite the right angle), the areas satisfy $a^2 + b^2 = c^2$.",
    whyItWorks: "The $a^2$, $b^2$, $c^2$ aren't abstract — they are the *areas* of squares on each side. Classic proofs rearrange four copies of the triangle inside a big square two different ways; comparing the leftover area forces $a^2+b^2=c^2$. The square (the second power) appears because area is two-dimensional. Crucially, this *only* holds when the angle between $a$ and $b$ is exactly $90°$ — the right angle is what makes the areas balance.",
    whenToUse: "Use it to find a missing side of a right triangle, to compute straight-line distance between two points, or to test whether a triangle is right-angled.",
    representations: [
      { kind: "area_model", label: "Squares on the sides", body: "Legs $3$ and $4$ carry squares of area $9$ and $16$. Their sum $25$ is the area of the square on the hypotenuse — so $c = \\sqrt{25} = 5$." },
      { kind: "symbolic", label: "Solving for a leg", body: "Rearrange when the unknown is a leg: $a^2 = c^2 - b^2$. For $a=5,\\,c=13$: $b^2 = 169 - 25 = 144$, so $b = 12$." },
      { kind: "real_world", label: "Distance", body: "Walk $3$ blocks east then $4$ north; your straight-line distance home is $\\sqrt{3^2+4^2}=5$ blocks. The distance formula IS Pythagoras." }
    ],
    commonMistakes: [
      { label: "Adding the sides instead of their squares", why: "Computing $c = a + b$ (e.g. $3+4=7$) — forgetting the squares, treating it like a straight path.", fix: "It's $a^2 + b^2 = c^2$, areas not lengths: $9 + 16 = 25$, then $c = \\sqrt{25} = 5$. Square first, add, then square-root." },
      { label: "Subtracting lengths when finding a leg", why: "Writing $b = c - a$ instead of $b = \\sqrt{c^2 - a^2}$.", fix: "Work with squares throughout: $b^2 = c^2 - a^2$, then take the root. $13-5=8$ is wrong; $\\sqrt{169-25}=12$ is right." },
      { label: "Using it on a non-right triangle", why: "Applying $a^2+b^2=c^2$ when there is no $90°$ angle.", fix: "Confirm the right angle first. Without it, the area balance fails and the formula doesn't apply." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Each square ($a^2 = a\\times a$) is a multiplication — the operation powering the theorem." },
      { concept: "linear_two_step", note: "Finding a leg means solving $a^2 + b^2 = c^2$ for an unknown — algebraic rearrangement." }
    ],
    examples: [
      { question: "Legs $a=3$, $b=4$. Find the hypotenuse, and explain in terms of area.", answer: "5", explanation: "$c^2 = 3^2 + 4^2 = 9 + 16 = 25$. The two small squares (areas $9$ and $16$) fill the big square (area $25$), so $c = \\sqrt{25} = 5$. The famous $3$-$4$-$5$ triangle." },
      { question: "A right triangle has $a = 5$ and hypotenuse $c = 13$. Find leg $b$.", answer: "12", explanation: "Rearrange to isolate the leg: $b^2 = c^2 - a^2 = 169 - 25 = 144$, so $b = \\sqrt{144} = 12$. Subtract the SQUARES, then root — never subtract the raw lengths." }
    ]
  },

  // ===========================================================================
  percentage: {
    title: "Percentages",
    formula: "p\\% \\text{ of } N = \\dfrac{p}{100} \\times N",
    oneLineSummary: "A percentage is a fraction with a fixed denominator of 100 — 'per hundred' — which makes different proportions instantly comparable.",
    intuitionHook: "Which test went better: 18 out of 24, or 30 out of 40? Hard to tell as-is. But rescale both to 'out of 100' and they're both $75\\%$ — identical. That rescaling-to-100 is the entire point of percentages.",
    whatItIs: "Percent means 'per hundred'. $p\\%$ is the fraction $\\frac{p}{100}$, a way to express any proportion on a common 0–100 scale.",
    whyItWorks: "Fractions with different denominators are awkward to compare ($\\frac{18}{24}$ vs $\\frac{30}{40}$). Fixing the denominator at $100$ gives every proportion the same yardstick. Mental shortcuts fall out of this: $50\\% = \\frac12$, $25\\% = \\frac14$, $10\\% = \\frac1{10}$ — so '$25\\%$ of $80$' is just '$80$ split into $4$' = $20$. Building up from $10\\%$ handles the rest: $30\\%$ is three lots of $10\\%$.",
    whenToUse: "Use percentages for discounts, tips, tax, interest, statistics, and any time you must compare proportions measured out of different totals.",
    representations: [
      { kind: "grid", label: "Hundred grid", body: "Shade a $10\\times 10$ grid: $25\\%$ shades $25$ of the $100$ cells — exactly one quarter of the square." },
      { kind: "symbolic", label: "Friendly fractions", body: "Convert and divide: $25\\% = \\frac14 \\Rightarrow \\frac{80}{4}=20$; $10\\% = \\frac1{10} \\Rightarrow \\frac{150}{10}=15$." },
      { kind: "real_world", label: "In the world", body: "A $20\\%$ tip on a 30 dollar meal: $10\\%$ is $3$, so $20\\%$ is $6$. Discounts, exam scores, and battery levels are all percentages." }
    ],
    commonMistakes: [
      { label: "Taking the percentage of the wrong base", why: "After a $20\\%$ rise then a $20\\%$ fall, assuming you're back to start — but the fall is taken of a LARGER number, so you end lower.", fix: "Always ask 'percent OF what?'. The base can change between steps; never assume two percentages share a base." },
      { label: "Confusing 'p% of' with 'increase by p%'", why: "Reading 'increase by $20\\%$' as 'multiply by $0.20$' instead of $1.20$.", fix: "'$p\\%$ OF' uses $\\frac{p}{100}$; 'increase BY $p\\%$' uses $1 + \\frac{p}{100}$ (and decrease uses $1 - \\frac{p}{100}$)." }
    ],
    connections: [
      { concept: "arithmetic_div", note: "Finding $25\\%$ is dividing by $4$; percentages are friendly fractions, and fractions are division." },
      { concept: "arithmetic_mult", note: "Scaling by a percentage (e.g. $\\times 1.2$ for a $20\\%$ rise) is multiplication." }
    ],
    examples: [
      { question: "Find $25\\%$ of $80$ using a friendly fraction.", answer: "20", explanation: "$25\\% = \\frac14$, so '$25\\%$ of $80$' means split $80$ into $4$ equal parts: $80 \\div 4 = 20$. No multiplication by $0.25$ needed — the fraction is faster." },
      { question: "A 30 dollar item rises 20%, then falls 20%. Is the final price 30 dollars?", answer: "No", explanation: "Rise: $30 \\times 1.20 = 36$. Fall: $36 \\times 0.80 = 28.80$ — NOT $30$. The $20\\%$ drop is taken of the larger $36$, so it removes more than the rise added. Percentages depend on their base." }
    ]
  },

  // ===========================================================================
  // INTEGERS STRAND
  // ===========================================================================
  absolute_value: {
    title: "Absolute Value",
    formula: "|x| = \\text{distance of } x \\text{ from } 0",
    oneLineSummary: "Absolute value is how far a number sits from zero — a distance, so it is never negative.",
    intuitionHook: "Walk $7$ steps left or $7$ steps right from a doorway: either way you've travelled $7$ steps. Direction differs, distance doesn't. Absolute value throws away the direction and keeps the distance.",
    whatItIs: "The absolute value $|x|$ is the distance between $x$ and $0$ on the number line. Distances are never negative, so $|x|$ is always zero or positive.",
    whyItWorks: "On the number line, $-7$ and $7$ sit the same distance from $0$ — just on opposite sides. Absolute value reports that distance, $7$, ignoring which side. That is why $|{-7}| = 7$ and $|7| = 7$: the bars strip the sign and leave the size. Only $0$ has absolute value $0$, because only $0$ is no distance away.",
    whenToUse: "Use it whenever only the size matters, not the direction: distance travelled, the gap between two values, error magnitude, or 'how far off' regardless of over/under.",
    representations: [
      { kind: "number_line", label: "Distance from zero", body: "$-7$ is seven units left of $0$; its distance — its absolute value — is $7$." },
      { kind: "real_world", label: "Steps, not direction", body: "Owing 5 dollars or having 5 dollars: the AMOUNT is $5$ either way. $|{-5}| = 5$." },
      { kind: "symbolic", label: "Strip the sign", body: "$|{-3}| = 3$, $|3| = 3$, $|0| = 0$ — the bars remove any minus sign." }
    ],
    commonMistakes: [
      { label: "Keeping the negative sign", why: "Writing $|{-7}| = -7$, treating the bars as if they did nothing.", fix: "Absolute value is a DISTANCE — never negative. The result of $|{-7}|$ is the positive $7$." },
      { label: "Thinking absolute value just flips the sign", why: "Assuming $|x|$ always makes a number negative or always positive by flipping.", fix: "It makes the result non-negative: $|5|$ stays $5$ (already positive); only negatives lose their sign." }
    ],
    connections: [
      { concept: "integer_add", note: "Adding integers compares distances from zero — absolute values — to find the result's size and sign." },
      { concept: "arithmetic_sub", note: "The distance between two numbers is the absolute value of their difference." }
    ],
    examples: [
      { question: "Evaluate $|{-7}|$.", answer: "7", explanation: "$-7$ is $7$ units from $0$, so its absolute value is $7$." },
      { question: "Evaluate $|9|$.", answer: "9", explanation: "$9$ is already $9$ units from $0$; a positive number is its own absolute value." }
    ]
  },

  integer_add: {
    title: "Adding Integers",
    formula: "\\text{same sign: add \\& keep; different: subtract \\& take the bigger sign}",
    oneLineSummary: "Adding integers is moving along the number line — right for positives, left for negatives.",
    intuitionHook: "Owe 5 dollars, then earn 3: you're still 2 dollars short, so $-5 + 3 = -2$. Owe 5, then borrow 3 more: you're 8 short, $-5 + (-3) = -8$. Money makes the signs obvious.",
    whatItIs: "Adding integers combines signed numbers — positives push right (up), negatives push left (down) — to land on a single result with its own sign.",
    whyItWorks: "Picture each number as a move on the number line: $+3$ steps right, $-3$ steps left. Adding stacks the moves. SAME signs march the same way, so add the sizes and keep that direction: $-5 + (-3)$ goes $8$ left, $-8$. DIFFERENT signs pull against each other, so subtract the sizes and the winner's sign survives: $-5 + 3$ — the $5$-left beats the $3$-right by $2$ left, $-2$. That is why $7 + (-7) = 0$: equal and opposite cancel.",
    whenToUse: "Temperatures rising and falling, money in and out, gaining and losing yards, elevators going up and down — any quantity with two opposing directions.",
    representations: [
      { kind: "number_line", label: "Stack the moves", body: "$-5 + 3$: start at $-5$, move $3$ right, land on $-2$." },
      { kind: "real_world", label: "Money in and out", body: "Debt of $5$ plus income of $3$ leaves a debt of $2$: $-5 + 3 = -2$." },
      { kind: "symbolic", label: "Same vs different signs", body: "Same: $-4 + (-3) = -7$ (add, keep sign). Different: $5 + (-4) = 1$ (subtract, bigger sign wins)." }
    ],
    commonMistakes: [
      { label: "Dropping the sign", why: "Adding the sizes and reporting a positive, e.g. $-5 + 3 = 8$ or $2$ without the minus.", fix: "With different signs, SUBTRACT the sizes, then copy the sign of the number with the bigger size." },
      { label: "Treating two negatives as a positive", why: "Reading $-4 + (-3)$ as $-4 + 3 = -1$ or as $+7$.", fix: "Two negatives both move LEFT, so they add up further negative: $-4 + (-3) = -7$." }
    ],
    connections: [
      { concept: "absolute_value", note: "Different-sign addition compares the absolute values to find the result's size and sign." },
      { concept: "integer_sub", note: "Subtraction is just adding the opposite — same number-line moves." },
      { concept: "arithmetic_add", note: "Adding positives is the right-moving special case you already know." }
    ],
    examples: [
      { question: "Calculate $-5 + 3$.", answer: "-2", explanation: "Different signs: subtract sizes ($5 - 3 = 2$) and keep the bigger size's sign (negative): $-2$." },
      { question: "Calculate $-4 + (-3)$.", answer: "-7", explanation: "Same sign: add sizes ($4 + 3 = 7$) and keep the shared sign: $-7$." }
    ]
  },

  integer_sub: {
    title: "Subtracting Integers",
    formula: "a - b = a + (-b)",
    oneLineSummary: "Subtracting an integer means adding its opposite — flip the sign of the second number, then add.",
    intuitionHook: "It's $2^{\\circ}$ and the temperature drops $4^{\\circ}$: now $-2^{\\circ}$, so $2 - 4 = -2$. And subtracting a debt? Forgiving a 6-dollar debt LEAVES you richer: $4 - (-6) = 10$. Minus-a-minus turns into plus.",
    whatItIs: "Subtracting integers finds the difference between two signed numbers. The reliable method is to rewrite it as adding the opposite of the second number.",
    whyItWorks: "Subtraction is 'add the opposite': $a - b = a + (-b)$. This single rule handles every sign. $2 - 4 = 2 + (-4) = -2$. And subtracting a negative adds a positive — $4 - (-6) = 4 + 6 = 10$ — because the opposite of $-6$ is $+6$. On the number line, $a - b$ is the jump FROM $b$ TO $a$; that jump can point either direction, which is why differences can be negative.",
    whenToUse: "Finding a drop in temperature, change in elevation, the gap between two signed readings, or how much was lost — anywhere you compare two signed amounts.",
    representations: [
      { kind: "symbolic", label: "Add the opposite", body: "$4 - (-6) = 4 + (+6) = 10$; $2 - 4 = 2 + (-4) = -2$." },
      { kind: "number_line", label: "Jump between points", body: "$2 - 4$ is the move from $4$ to $2$: two steps LEFT, so $-2$." },
      { kind: "real_world", label: "Temperature drop", body: "From $2^{\\circ}$ down $4^{\\circ}$ lands at $-2^{\\circ}$." }
    ],
    commonMistakes: [
      { label: "Subtracting the wrong way round", why: "Reading $2 - 4$ as $4 - 2 = 2$ because 'big minus small'.", fix: "Order matters. $2 - 4 = 2 + (-4) = -2$; let the answer be negative when it should be." },
      { label: "Minus-a-minus mishandled", why: "Treating $4 - (-6)$ as $4 - 6 = -2$ instead of $4 + 6$.", fix: "Subtracting a negative ADDS: the two minus signs combine into a plus, so $4 - (-6) = 10$." }
    ],
    connections: [
      { concept: "integer_add", note: "Every subtraction becomes an addition of the opposite." },
      { concept: "arithmetic_sub", note: "Positive subtraction is the familiar special case." },
      { concept: "absolute_value", note: "The distance between two numbers is the absolute value of their difference." }
    ],
    examples: [
      { question: "Calculate $2 - 4$.", answer: "-2", explanation: "Add the opposite: $2 + (-4) = -2$." },
      { question: "Calculate $4 - (-6)$.", answer: "10", explanation: "Subtracting a negative adds: $4 + 6 = 10$." }
    ]
  },

  integer_mult: {
    title: "Multiplying Integers",
    formula: "(-)(-) = +,\\quad (-)( + ) = -",
    oneLineSummary: "Multiply the sizes, then set the sign: same signs make a positive, different signs make a negative.",
    intuitionHook: "Lose 3 dollars a day for 4 days: that's $-3 \\times 4 = -12$, a 12-dollar loss. Now REMOVE four such losses from the record — undoing four debts of 3 — and you're 12 dollars better off: $-3 \\times (-4) = +12$. Negating a negative is a positive.",
    whatItIs: "Multiplying integers combines a count and a size, both possibly signed. You multiply the magnitudes and then decide the sign from a simple rule.",
    whyItWorks: "Multiplication is repeated grouping, and the sign tracks direction. A negative times a positive repeats a LEFT-ward (negative) amount, staying negative: $-3 \\times 4 = -12$. A negative times a negative REVERSES that direction — taking away negative groups — flipping it positive: $-3 \\times (-4) = 12$. Hence the rule: same signs $\\to +$, different signs $\\to -$. The size is always just the product of the magnitudes.",
    whenToUse: "Rates of loss or decline over time, reversing repeated debts, areas/products in coordinate work, and any scaling where direction can flip.",
    representations: [
      { kind: "symbolic", label: "Sign rule", body: "$(-)(+) = -$ and $(-)(-) = +$. $-2 \\times 5 = -10$; $-2 \\times (-5) = 10$." },
      { kind: "real_world", label: "Repeated loss", body: "Losing 3 dollars daily for 4 days: $-3 \\times 4 = -12$." },
      { kind: "number_line", label: "Direction flips", body: "Multiplying by a negative flips the number line; an even count of flips returns to positive." }
    ],
    commonMistakes: [
      { label: "Wrong sign on the product", why: "Reporting $-3 \\times 4 = 12$ (dropped the minus) or $-3 \\times (-4) = -12$ (kept it).", fix: "Apply the rule deliberately: different signs $\\to$ negative; same signs $\\to$ positive. Size first, then sign." },
      { label: "Adding instead of multiplying", why: "Computing $-3 + 4 = 1$ when the operation is multiplication.", fix: "Multiplication groups: $-3 \\times 4$ is four lots of $-3$, which is $-12$, not $1$." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Positive multiplication is the magnitude part; integers just add the sign rule." },
      { concept: "integer_add", note: "A negative times a whole number is repeated addition of that negative." }
    ],
    examples: [
      { question: "Calculate $-3 \\times 4$.", answer: "-12", explanation: "Sizes: $3 \\times 4 = 12$. Different signs give a negative: $-12$." },
      { question: "Calculate $-3 \\times (-4)$.", answer: "12", explanation: "Sizes: $3 \\times 4 = 12$. Same signs give a positive: $12$." }
    ]
  },

  // ===========================================================================
  // DECIMALS STRAND
  // ===========================================================================
  decimal_add: {
    title: "Adding Decimals",
    formula: "\\text{line up the decimal points, then add column by column}",
    oneLineSummary: "Stack the numbers so the decimal points line up, then add as usual — the point drops straight down.",
    intuitionHook: "Buy a snack for $1.40$ dollars and a drink for $2.70$ dollars. You don't add the $40$ cents to the $2$ dollars — you add cents to cents and dollars to dollars: $4.10$. Lining up the decimal point is just lining up dollars over dollars, dimes over dimes.",
    whatItIs: "Adding decimals combines two numbers that include a fractional part. The only new rule beyond whole-number addition is making sure each place value sits above its match.",
    whyItWorks: "Place value is the whole story. The digit just right of the point is tenths, the next is hundredths — and you can only add like to like. Lining up the decimal points forces tenths over tenths and ones over ones, so each column adds digits of the SAME size. Carrying works exactly as with whole numbers: ten tenths make one whole and carry left. The point in the answer sits directly below the points above it because the place values never moved.",
    whenToUse: "Totalling prices, summing measurements (lengths in metres, masses in kilograms), or combining any quantities written with a decimal point.",
    representations: [
      { kind: "symbolic", label: "Stack and align", body: "$3.4 + 2.7$: align the points, add tenths ($4+7=11$, write $1$ carry $1$), add ones ($3+2+1=6$) $\\to 6.1$." },
      { kind: "real_world", label: "Money", body: "$1.40 + 2.70$ dollars: cents add to cents ($40+70=110$, i.e. a dollar and $10$ cents), dollars to dollars $\\to 4.10$." },
      { kind: "place_value", label: "Like over like", body: "Tenths column over tenths column, ones over ones — never tenths over ones." }
    ],
    commonMistakes: [
      { label: "Not lining up the points", why: "Right-justifying digits instead, so $3.4 + 2.75$ adds the $4$ to the $5$.", fix: "Align the DECIMAL POINTS, not the right edges. Pad with a zero if needed: $3.40 + 2.75$." },
      { label: "Forgetting to carry", why: "Adding $4 + 7 = 11$ in the tenths but writing $1$ and dropping the carried whole.", fix: "Ten tenths make one whole — carry the $1$ left into the ones column, just like whole-number addition." }
    ],
    connections: [
      { concept: "arithmetic_add", note: "Decimal addition IS whole-number addition once the columns are aligned by place value." },
      { concept: "decimal_sub", note: "Subtraction uses the same align-the-points setup, then borrows instead of carries." },
      { concept: "decimal_mult", note: "Multiplying decimals does NOT align points — that's the key contrast to remember." }
    ],
    examples: [
      { question: "Add the decimals: $3.4 + 2.7$.", answer: "6.1", explanation: "Tenths: $4 + 7 = 11$ (write $1$, carry $1$). Ones: $3 + 2 + 1 = 6$. Result $6.1$." },
      { question: "Add the decimals: $5.6 + 1.8$.", answer: "7.4", explanation: "Tenths: $6 + 8 = 14$ (write $4$, carry $1$). Ones: $5 + 1 + 1 = 7$. Result $7.4$." }
    ]
  },

  decimal_sub: {
    title: "Subtracting Decimals",
    formula: "\\text{line up the decimal points, then subtract column by column}",
    oneLineSummary: "Stack so the points line up, then subtract place by place — borrow across the point exactly as with whole numbers.",
    intuitionHook: "You have $5.20$ dollars and spend $1.80$. To find what's left you don't subtract $80$ cents from $20$ cents directly — you borrow a whole dollar, making it $120$ cents minus $80$ cents. Borrowing across the decimal point is the same trick as borrowing across any column.",
    whatItIs: "Subtracting decimals finds the difference between two numbers with fractional parts. Like addition, the work is whole-number subtraction once the place values are aligned.",
    whyItWorks: "Each column holds one place value, and you can only subtract like from like, so aligning the decimal points puts tenths under tenths and ones under ones. When the top digit is smaller, you borrow: one whole becomes ten tenths, one tenth becomes ten hundredths — the same regrouping as whole numbers, just one place to the right of the point. The answer's decimal point sits directly under the others because no place value ever shifted.",
    whenToUse: "Making change, finding how much taller/heavier/longer one measurement is than another, or any 'how much is left' or 'how much more' with decimal quantities.",
    representations: [
      { kind: "symbolic", label: "Align and borrow", body: "$5.2 - 1.8$: tenths $2 - 8$ needs a borrow $\\to 12 - 8 = 4$; ones $4 - 1 = 3$ (after lending). Result $3.4$." },
      { kind: "real_world", label: "Making change", body: "$5.20 - 1.80$ dollars: borrow a dollar so $120$ cents $- 80$ cents $= 40$ cents, leaving $3.40$." },
      { kind: "place_value", label: "Like under like", body: "Tenths under tenths, ones under ones — the points form a single vertical line." }
    ],
    commonMistakes: [
      { label: "Subtracting the smaller digit from the larger per column", why: "In $5.2 - 1.8$, doing $8 - 2 = 6$ in the tenths because $8 > 2$.", fix: "Keep the order: top minus bottom. If the top is smaller, BORROW from the next column ($12 - 8 = 4$)." },
      { label: "Not lining up the points", why: "Right-justifying so $5.2 - 1.85$ subtracts the wrong digits.", fix: "Align the decimal points and pad with a zero: $5.20 - 1.85$." }
    ],
    connections: [
      { concept: "decimal_add", note: "Same align-the-points setup; subtraction borrows where addition carries." },
      { concept: "arithmetic_sub", note: "It's ordinary subtraction once the place values are stacked correctly." },
      { concept: "integer_sub", note: "Subtracting a larger from a smaller decimal gives a negative — handled by the integers strand." }
    ],
    examples: [
      { question: "Subtract the decimals: $5.2 - 1.8$.", answer: "3.4", explanation: "Tenths: $2 - 8$ borrows $\\to 12 - 8 = 4$. Ones: $4 - 1 = 3$. Result $3.4$." },
      { question: "Subtract the decimals: $7.3 - 2.9$.", answer: "4.4", explanation: "Tenths: $3 - 9$ borrows $\\to 13 - 9 = 4$. Ones: $6 - 2 = 4$. Result $4.4$." }
    ]
  },

  decimal_mult: {
    title: "Multiplying Decimals",
    formula: "\\text{multiply the digits, then place the point: total decimal places of the factors}",
    oneLineSummary: "Ignore the points and multiply as whole numbers, then give the answer as many decimal places as the two factors had together.",
    intuitionHook: "What is $0.3 \\times 0.4$? Three tenths of four tenths is a small sliver of a square — much less than one. Multiplying $3 \\times 4 = 12$, then realising the answer must be tiny, you place the point to get $0.12$. The size sanity-check is half the skill.",
    whatItIs: "Multiplying decimals scales one decimal by another. Unlike addition, you do NOT line up the points — you multiply the digits and then count decimal places to position the point.",
    whyItWorks: "A decimal is a fraction in disguise: $0.3 = 3/10$ and $0.4 = 4/10$. Multiplying gives $\\frac{3}{10} \\times \\frac{4}{10} = \\frac{12}{100} = 0.12$. The denominators $10 \\times 10 = 100$ explain the rule: each factor's decimal places ADD, so one place times one place gives two places. That's why you multiply the digits ($3 \\times 4 = 12$) and then shift the point left by the TOTAL number of decimal places in the factors.",
    whenToUse: "Scaling a price by a quantity ($2.5$ kg at $1.20$ per kg), finding a fraction-of via a decimal, areas with decimal side lengths, and unit conversions.",
    representations: [
      { kind: "fraction", label: "Tenths times tenths", body: "$0.3 \\times 0.4 = \\frac{3}{10} \\times \\frac{4}{10} = \\frac{12}{100} = 0.12$ — the hundredths come from $10 \\times 10$." },
      { kind: "symbolic", label: "Digits then point", body: "$0.3 \\times 0.4$: multiply $3 \\times 4 = 12$; factors have $1 + 1 = 2$ decimal places, so $0.12$." },
      { kind: "estimation", label: "Sanity-check the size", body: "Both factors are below $1$, so the product must be below either — $0.12$, not $1.2$." }
    ],
    commonMistakes: [
      { label: "Miscounting the decimal places", why: "Writing $0.3 \\times 0.4 = 1.2$ — placing only one decimal instead of two.", fix: "ADD the factors' decimal places: $1 + 1 = 2$. The answer needs two places: $0.12$." },
      { label: "Lining up the points like addition", why: "Trying to align the decimals before multiplying, as if adding.", fix: "Multiplication ignores alignment: multiply the digits first, then count places to set the point." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "You multiply the digits exactly as whole numbers; only the point-placement is new." },
      { concept: "decimal_add", note: "A key contrast: addition aligns points, multiplication counts them — don't mix the rules." },
      { concept: "fraction_of", note: "Multiplying by a decimal below $1$ is taking a fraction-of, so the result shrinks." }
    ],
    examples: [
      { question: "Multiply the decimals: $0.3 \\times 0.4$.", answer: "0.12", explanation: "Digits: $3 \\times 4 = 12$. Two decimal places total $\\to 0.12$." },
      { question: "Multiply the decimals: $1.2 \\times 0.5$.", answer: "0.60", explanation: "Digits: $12 \\times 5 = 60$. Two decimal places total $\\to 0.60$." }
    ]
  },

  decimal_round: {
    title: "Rounding Decimals",
    formula: "\\text{look at the next digit: } \\geq 5 \\text{ rounds up, } < 5 \\text{ rounds down}",
    oneLineSummary: "To round to a place, look at the very next digit: 5 or more rounds the place up, less than 5 leaves it.",
    intuitionHook: "Is $3.47$ closer to $3.4$ or $3.5$? It's past the halfway mark $3.45$, so it's nearer $3.5$. Rounding is just asking 'which marked tick on the ruler is closest?' — and the digit after the cut-off tells you the answer.",
    whatItIs: "Rounding a decimal replaces it with the nearest value at a chosen place (nearest tenth, hundredth, whole) — a controlled simplification that keeps the size while dropping precision.",
    whyItWorks: "Rounding to the nearest tenth means choosing whichever tenth ($3.4$ or $3.5$) the number is closest to. The midpoint is $3.45$; anything from $3.45$ up is nearer $3.5$, anything below is nearer $3.4$. You only need the hundredths digit to decide: $5$–$9$ means you're at or past halfway (round up), $0$–$4$ means you're below it (round down). The deciding digit and everything after it then disappear, because they were only there to locate you between the two ticks.",
    whenToUse: "Reporting money to the cent, a measurement to a sensible precision, an average that came out long, or any time extra decimals add noise rather than meaning.",
    representations: [
      { kind: "number_line", label: "Nearest tick", body: "$3.47$ sits between $3.4$ and $3.5$, past the midpoint $3.45$ — so it rounds to $3.5$." },
      { kind: "symbolic", label: "Check the next digit", body: "Round $3.47$ to a tenth: the hundredths digit is $7 \\geq 5$, so round up to $3.5$." },
      { kind: "real_world", label: "Cents and precision", body: "An average of $3.47$ stars, reported 'to the nearest tenth', is $3.5$ stars." }
    ],
    commonMistakes: [
      { label: "Truncating instead of rounding", why: "Chopping $3.47$ to $3.4$ by just deleting the extra digits, ignoring that $7 \\geq 5$.", fix: "Don't just cut — CHECK the next digit. $7$ is $5$ or more, so the tenths digit goes up: $3.5$." },
      { label: "Rounding the wrong digit", why: "Looking at the tenths digit itself instead of the one AFTER the place you're rounding to.", fix: "To round to tenths, the DECIDER is the hundredths digit (the next one to the right)." }
    ],
    connections: [
      { concept: "decimal_add", note: "Rounding rests on the same place-value reading — knowing which digit is tenths vs hundredths." },
      { concept: "percent_change", note: "Results from real data are usually rounded to a sensible place before reporting." }
    ],
    examples: [
      { question: "Round $3.47$ to the nearest tenth.", answer: "3.5", explanation: "The hundredths digit is $7 \\geq 5$, so round up: $3.5$." },
      { question: "Round $6.23$ to the nearest tenth.", answer: "6.2", explanation: "The hundredths digit is $3 < 5$, so round down: $6.2$." }
    ]
  },

  decimal_div: {
    title: "Dividing Decimals",
    formula: "\\frac{a}{b} = \\frac{a \\times 10^k}{b \\times 10^k} \\;\\text{(shift until the divisor is whole)}",
    oneLineSummary: "Slide the decimal point in BOTH numbers until the divisor is a whole number, then divide as usual.",
    intuitionHook: "What is $4.8 \\div 0.6$? Dividing by $0.6$ feels awkward, so make the divisor whole: multiply BOTH by $10$ to get $48 \\div 6 = 8$. Scaling both numbers the same way doesn't change the quotient — like asking 'how many 6-cent coins in 48 cents' instead of 'how many 0.6 in 4.8'.",
    whatItIs: "Dividing decimals finds how many times one decimal fits into another. The reliable method removes the decimal from the divisor by shifting the point in both numbers equally.",
    whyItWorks: "A quotient is a ratio, and a ratio is unchanged when you scale BOTH numbers by the same factor: $\\frac{4.8}{0.6} = \\frac{4.8 \\times 10}{0.6 \\times 10} = \\frac{48}{6}$. So you multiply the divisor by whatever power of ten makes it a whole number, and multiply the dividend by the SAME power to keep the ratio fixed. Now it's ordinary whole-number (or whole-divisor) division: $48 \\div 6 = 8$. The point only ever moves the same number of places in both numbers — that equal shift is what preserves the answer.",
    whenToUse: "Unit pricing ($/per item), splitting a decimal amount into equal parts, converting rates, and 'how many of this fit into that' with decimal quantities.",
    representations: [
      { kind: "shift", label: "Make the divisor whole", body: "$4.8 \\div 0.6$: shift both one place $\\to 48 \\div 6 = 8$." },
      { kind: "ratio", label: "Scaling keeps the quotient", body: "$\\frac{4.8}{0.6} = \\frac{48}{6}$ — multiplying top and bottom by $10$ doesn't change the value." },
      { kind: "real_world", label: "How many fit", body: "How many $0.6$-litre cups fill a $4.8$-litre jug? $8$ cups." }
    ],
    commonMistakes: [
      { label: "Shifting only the divisor", why: "Turning $4.8 \\div 0.6$ into $4.8 \\div 6 = 0.8$ — moving the point in just one number.", fix: "Move the point the SAME number of places in BOTH numbers: $48 \\div 6 = 8$." },
      { label: "Misplacing the decimal point in the answer", why: "Getting the right digits but the wrong size, e.g. $0.8$ or $80$.", fix: "After shifting to a whole divisor, the division is exact — sanity-check size: $0.6$ goes into $4.8$ about $8$ times, not $0.8$." }
    ],
    connections: [
      { concept: "decimal_mult", note: "Division and multiplication of decimals are inverses; both hinge on tracking the decimal point carefully." },
      { concept: "fraction_div", note: "Writing the division as a fraction and scaling top and bottom is the same idea as dividing fractions." }
    ],
    examples: [
      { question: "Divide $4.8 \\div 0.6$.", answer: "8", explanation: "Multiply both by $10$: $48 \\div 6 = 8$." },
      { question: "Divide $3.6 \\div 0.4$.", answer: "9", explanation: "Multiply both by $10$: $36 \\div 4 = 9$." }
    ]
  },

  // ===========================================================================
  // FRACTIONS STRAND
  // ===========================================================================
  fraction_simplify: {
    title: "Simplifying Fractions",
    formula: "\\frac{a}{b} = \\frac{a \\div g}{b \\div g}, \\quad g = \\gcd(a, b)",
    oneLineSummary: "Divide the top and bottom by the same number — their greatest common factor — to write a fraction in lowest terms.",
    intuitionHook: "Cut a pizza into $4$ slices and take $2$: you've taken $\\frac{2}{4}$. But that's the same amount as cutting into $2$ and taking $1$ — half the pizza. $\\frac{2}{4}$ and $\\frac{1}{2}$ name the SAME portion; the simplest name is $\\frac{1}{2}$.",
    whatItIs: "Simplifying (reducing) a fraction rewrites it with the smallest possible whole-number top and bottom while keeping the same value, by removing the factor they share.",
    whyItWorks: "A fraction's value is a ratio, and multiplying or dividing BOTH parts by the same nonzero number doesn't change a ratio — it just renames it. So $\\frac{2}{4}$, $\\frac{3}{6}$, and $\\frac{1}{2}$ are all equal. To reach the simplest name, divide top and bottom by their greatest common factor: $\\gcd(2,4) = 2$, so $\\frac{2}{4} = \\frac{2 \\div 2}{4 \\div 2} = \\frac{1}{2}$. Once the top and bottom share no factor bigger than $1$, the fraction can't be reduced further — that's 'lowest terms'.",
    whenToUse: "Reporting a final fraction answer cleanly, comparing fractions, and as the last step of nearly every add/subtract/multiply with fractions.",
    representations: [
      { kind: "area", label: "Same portion, fewer pieces", body: "$\\frac{2}{4}$ of a pizza is the same shaded region as $\\frac{1}{2}$ — coarser slices, equal amount." },
      { kind: "symbolic", label: "Divide by the GCF", body: "$\\frac{12}{16}$: $\\gcd(12,16)=4$, so $\\frac{12 \\div 4}{16 \\div 4} = \\frac{3}{4}$." },
      { kind: "factor", label: "Cancel shared factors", body: "$\\frac{6}{9} = \\frac{2\\cdot 3}{3\\cdot 3} = \\frac{2}{3}$ after cancelling the common $3$." }
    ],
    commonMistakes: [
      { label: "Dividing only the top or only the bottom", why: "Turning $\\frac{6}{9}$ into $\\frac{2}{9}$ by dividing just the numerator.", fix: "Whatever you divide the top by, divide the bottom by the SAME number: $\\frac{6\\div 3}{9 \\div 3} = \\frac{2}{3}$." },
      { label: "Stopping before lowest terms", why: "Reducing $\\frac{12}{16}$ to $\\frac{6}{8}$ and stopping (still shares a factor of $2$).", fix: "Keep going until top and bottom share no factor but $1$: $\\frac{6}{8} = \\frac{3}{4}$." }
    ],
    connections: [
      { concept: "gcd_lcm", note: "Reducing to lowest terms divides out exactly the greatest common divisor of top and bottom." },
      { concept: "fraction_add", note: "Sums and differences of fractions are simplified with this same divide-by-the-GCF step." }
    ],
    examples: [
      { question: "Simplify $\\frac{12}{16}$ to lowest terms.", answer: "3/4", explanation: "$\\gcd(12,16)=4$: $\\frac{12\\div4}{16\\div4} = \\frac{3}{4}$." },
      { question: "Simplify $\\frac{6}{9}$ to lowest terms.", answer: "2/3", explanation: "$\\gcd(6,9)=3$: $\\frac{6\\div3}{9\\div3} = \\frac{2}{3}$." }
    ]
  },

  fraction_add: {
    title: "Adding Fractions",
    formula: "\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + cb}{bd}",
    oneLineSummary: "Give the fractions a common denominator first, then add only the numerators — the denominator names the piece size and must match.",
    intuitionHook: "Try adding $\\frac{1}{2} + \\frac{1}{3}$ by just adding across and you get $\\frac{2}{5}$ — but $\\frac{2}{5}$ is SMALLER than the $\\frac{1}{2}$ you started with, which is impossible. The fix: cut both into the same-size pieces (sixths) first, $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$.",
    whatItIs: "Adding fractions combines two parts of a whole. It only works directly when the parts are the same size — i.e. the denominators match — so the first job is to make them match.",
    whyItWorks: "A denominator says how big each piece is; a numerator counts the pieces. You can only add counts when the pieces are identical, so you rewrite each fraction over a common denominator (their product $bd$ always works): $\\frac{a}{b} = \\frac{ad}{bd}$ and $\\frac{c}{d} = \\frac{cb}{bd}$. Now both are in $bd$-sized pieces, so you add the counts: $\\frac{ad + cb}{bd}$. The denominator does NOT add, because the piece size didn't change — only how many you have. Finally reduce. That's why adding straight across fails: it pretends $\\frac{1}{2}$ and $\\frac{1}{3}$ are the same-size pieces when they aren't.",
    whenToUse: "Combining parts of a whole — portions of a recipe, fractions of an hour, lengths in mixed units — and as a step inside algebra with rational expressions.",
    representations: [
      { kind: "common_denominator", label: "Match the pieces, add the counts", body: "$\\frac{1}{2} + \\frac{1}{3} = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$." },
      { kind: "area", label: "Same-size slices", body: "Re-slice both pizzas into sixths so the shaded parts can be counted together." },
      { kind: "symbolic", label: "Cross-multiply over $bd$", body: "$\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + cb}{bd}$, then simplify." }
    ],
    commonMistakes: [
      { label: "Adding straight across", why: "Writing $\\frac{1}{2} + \\frac{1}{3} = \\frac{2}{5}$ — adding both tops and both bottoms.", fix: "Denominators must MATCH first. Convert to sixths: $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$; the denominator stays $6$." },
      { label: "Forgetting to convert a numerator", why: "Using the common denominator but leaving a numerator unscaled.", fix: "When you scale the denominator by a factor, scale that fraction's numerator by the SAME factor." }
    ],
    connections: [
      { concept: "fraction_simplify", note: "After adding, reduce the result to lowest terms with the GCF step." },
      { concept: "fraction_sub", note: "Subtraction uses the identical common-denominator setup, then subtracts the counts." },
      { concept: "decimal_add", note: "Like decimals, you must line up comparable units (here, equal-size pieces) before adding." }
    ],
    examples: [
      { question: "Add $\\frac{1}{2} + \\frac{1}{3}$.", answer: "5/6", explanation: "Common denominator $6$: $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$." },
      { question: "Add $\\frac{2}{3} + \\frac{3}{5}$.", answer: "19/15", explanation: "Common denominator $15$: $\\frac{10}{15} + \\frac{9}{15} = \\frac{19}{15}$." }
    ]
  },

  fraction_sub: {
    title: "Subtracting Fractions",
    formula: "\\frac{a}{b} - \\frac{c}{d} = \\frac{ad - cb}{bd}",
    oneLineSummary: "Give the fractions a common denominator, then subtract the numerators — the denominator stays the same.",
    intuitionHook: "You have $\\frac{3}{4}$ of a tank and use $\\frac{1}{2}$. To find what's left you can't subtract across; re-cut into quarters: $\\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}$ of a tank remains.",
    whatItIs: "Subtracting fractions finds the difference between two parts of a whole. As with addition, it requires the pieces to be the same size, so you match denominators first.",
    whyItWorks: "The denominator fixes the piece size and the numerator counts pieces; you can only take away counts of identical pieces. Rewrite both over the common denominator $bd$ — $\\frac{ad}{bd}$ and $\\frac{cb}{bd}$ — and subtract the counts: $\\frac{ad - cb}{bd}$. The denominator is unchanged because the piece size never changed, only how many remain. Reduce at the end. Subtracting straight across fails for the same reason it does in addition: it treats differently-sized pieces as if they were the same.",
    whenToUse: "How much is left, how much more one amount is than another, change between two fractional readings, and rational-expression algebra.",
    representations: [
      { kind: "common_denominator", label: "Match, then take away", body: "$\\frac{3}{4} - \\frac{1}{2} = \\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}$." },
      { kind: "area", label: "Remove same-size slices", body: "Re-slice both into quarters, then remove the used portion from the full one." },
      { kind: "symbolic", label: "Difference over $bd$", body: "$\\frac{a}{b} - \\frac{c}{d} = \\frac{ad - cb}{bd}$, then simplify." }
    ],
    commonMistakes: [
      { label: "Subtracting straight across", why: "Writing $\\frac{3}{4} - \\frac{1}{2} = \\frac{2}{2} = 1$ by subtracting tops and bottoms.", fix: "Match denominators first: $\\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}$; the denominator stays $4$." },
      { label: "Subtracting in the wrong order", why: "Computing $\\frac{c}{d} - \\frac{a}{b}$ and getting the wrong sign.", fix: "Keep the order given: the first fraction minus the second. Convert both, then subtract the numerators in that order." }
    ],
    connections: [
      { concept: "fraction_add", note: "Same common-denominator setup as addition; only the final combine step differs." },
      { concept: "fraction_simplify", note: "Reduce the difference to lowest terms as the last step." },
      { concept: "integer_sub", note: "If the second fraction is larger, the difference is negative — handled by signed arithmetic." }
    ],
    examples: [
      { question: "Subtract $\\frac{3}{4} - \\frac{1}{2}$.", answer: "1/4", explanation: "Common denominator $4$: $\\frac{3}{4} - \\frac{2}{4} = \\frac{1}{4}$." },
      { question: "Subtract $\\frac{4}{5} - \\frac{2}{3}$.", answer: "2/15", explanation: "Common denominator $15$: $\\frac{12}{15} - \\frac{10}{15} = \\frac{2}{15}$." }
    ]
  },

  fraction_mult: {
    title: "Multiplying Fractions",
    formula: "\\frac{a}{b} \\times \\frac{c}{d} = \\frac{a\\,c}{b\\,d}",
    oneLineSummary: "Multiply the tops together and the bottoms together — no common denominator needed — then reduce.",
    intuitionHook: "What is $\\frac{1}{2}$ of $\\frac{1}{3}$? Take a third of a pizza and halve it: you get a sixth. 'Of' means multiply: $\\frac{1}{2} \\times \\frac{1}{3} = \\frac{1}{6}$. Multiplying fractions makes them SMALLER because you're taking a part of a part.",
    whatItIs: "Multiplying fractions scales one fraction by another — taking a fraction OF a fraction. Unlike adding, it needs no common denominator: you multiply straight across.",
    whyItWorks: "A fraction $\\frac{a}{b}$ means 'divide into $b$ parts, take $a$'. Applying that to $\\frac{c}{d}$ first splits the whole into $d$ parts (giving $\\frac{c}{d}$ of it), then into $b$ parts again, making $b \\times d$ equal pieces in total — that's the new denominator. The number of those tiny pieces you end up with is $a \\times c$ — the new numerator. So $\\frac{a}{b} \\times \\frac{c}{d} = \\frac{ac}{bd}$. No common denominator is needed because you're not combining same-size pieces, you're sub-dividing. Reduce the result at the end.",
    whenToUse: "Taking a fraction OF a quantity, scaling recipes up or down, probability of independent events, areas with fractional side lengths, and repeated proportional discounts.",
    representations: [
      { kind: "area", label: "A part of a part", body: "$\\frac{1}{2}$ of $\\frac{1}{3}$ of a square shades $\\frac{1}{6}$ — the overlap of a half-strip and a third-strip." },
      { kind: "symbolic", label: "Multiply across", body: "$\\frac{2}{3} \\times \\frac{4}{5} = \\frac{2\\cdot4}{3\\cdot5} = \\frac{8}{15}$." },
      { kind: "real_world", label: "Scaling a recipe", body: "Half of a $\\frac{3}{4}$-cup measure is $\\frac{1}{2}\\times\\frac{3}{4} = \\frac{3}{8}$ cup." }
    ],
    commonMistakes: [
      { label: "Looking for a common denominator", why: "Trying to match denominators as if adding, e.g. converting before multiplying.", fix: "Multiplication needs NO common denominator — just multiply tops and bottoms straight across." },
      { label: "Cross-multiplying", why: "Computing $\\frac{a}{b}\\times\\frac{c}{d}$ as $\\frac{ad}{bc}$ (the division procedure).", fix: "Multiply across, top$\\times$top and bottom$\\times$bottom: $\\frac{ac}{bd}$. Cross-multiplying is for DIVIDING fractions." }
    ],
    connections: [
      { concept: "fraction_simplify", note: "Reduce the product to lowest terms (you can also cancel common factors before multiplying)." },
      { concept: "fraction_of", note: "'A fraction of a quantity' is exactly fraction multiplication — taking a part of a part." },
      { concept: "decimal_mult", note: "Like decimal multiplication, the result shrinks when both factors are below $1$." }
    ],
    examples: [
      { question: "Multiply $\\frac{1}{2} \\times \\frac{1}{3}$.", answer: "1/6", explanation: "Multiply across: $\\frac{1\\cdot1}{2\\cdot3} = \\frac{1}{6}$." },
      { question: "Multiply $\\frac{2}{3} \\times \\frac{4}{5}$.", answer: "8/15", explanation: "Multiply across: $\\frac{2\\cdot4}{3\\cdot5} = \\frac{8}{15}$ (already in lowest terms)." }
    ]
  },

  fraction_div: {
    title: "Dividing Fractions",
    formula: "\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c}",
    oneLineSummary: "Keep the first fraction, change ÷ to ×, and flip the second — then multiply across.",
    intuitionHook: "How many $\\frac{1}{2}$s are in $3$? Six. Notice $3 \\div \\frac{1}{2} = 6$ is the same as $3 \\times 2$ — dividing by a half is multiplying by two. Dividing by a fraction asks 'how many of THAT fit in this', and flipping turns it into a multiplication.",
    whatItIs: "Dividing fractions finds how many times one fraction fits into another. The standard method rewrites the division as multiplication by the reciprocal (flip) of the second fraction.",
    whyItWorks: "The reciprocal of $\\frac{c}{d}$ is $\\frac{d}{c}$, the number you multiply it by to get $1$. Dividing by a number is the same as multiplying by its reciprocal — true for whole numbers ($\\div 2 = \\times \\frac{1}{2}$) and for fractions too. So $\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c} = \\frac{ad}{bc}$. 'Keep, change, flip': keep the first, change the sign to multiply, flip the second. Then multiply straight across and reduce. Because flipping a proper fraction makes it bigger than $1$, dividing by a small fraction yields a LARGE answer — matching the intuition that many small pieces fit inside a whole.",
    whenToUse: "How many portions of a given size fit in a total, splitting a fractional amount into fractional shares, converting rates, and rational-expression algebra.",
    representations: [
      { kind: "keep_change_flip", label: "Multiply by the reciprocal", body: "$\\frac{1}{2} \\div \\frac{2}{5} = \\frac{1}{2} \\times \\frac{5}{2} = \\frac{5}{4}$." },
      { kind: "real_world", label: "How many fit", body: "How many $\\frac{1}{2}$-cups in $3$ cups? $3 \\div \\frac{1}{2} = 3 \\times 2 = 6$." },
      { kind: "reciprocal", label: "Flip makes it bigger", body: "Dividing by a fraction below $1$ flips it above $1$, so the quotient grows." }
    ],
    commonMistakes: [
      { label: "Forgetting to flip", why: "Multiplying straight across without taking the reciprocal: $\\frac{1}{2} \\div \\frac{2}{5} = \\frac{2}{10}$.", fix: "Division means multiply by the RECIPROCAL: flip the second fraction first, $\\frac{1}{2} \\times \\frac{5}{2} = \\frac{5}{4}$." },
      { label: "Flipping the wrong fraction", why: "Inverting the first fraction instead of the second.", fix: "KEEP the first unchanged; flip only the SECOND (the divisor): $\\frac{a}{b} \\times \\frac{d}{c}$." }
    ],
    connections: [
      { concept: "fraction_mult", note: "Division becomes multiplication once you flip the divisor — same multiply-across-and-reduce finish." },
      { concept: "fraction_simplify", note: "Reduce the result to lowest terms as the final step." },
      { concept: "decimal_div", note: "Both divisions work by rewriting into an easier equivalent — flip a fraction, or shift a decimal point." }
    ],
    examples: [
      { question: "Divide $\\frac{1}{2} \\div \\frac{2}{5}$.", answer: "5/4", explanation: "Keep–change–flip: $\\frac{1}{2} \\times \\frac{5}{2} = \\frac{5}{4}$." },
      { question: "Divide $\\frac{3}{4} \\div \\frac{1}{2}$.", answer: "3/2", explanation: "Keep–change–flip: $\\frac{3}{4} \\times \\frac{2}{1} = \\frac{6}{4} = \\frac{3}{2}$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY STRAND
  // ===========================================================================
  geo_perimeter_rect: {
    title: "Perimeter of a Rectangle",
    formula: "P = 2(l + w)",
    oneLineSummary: "Perimeter is the distance once around the edge — for a rectangle, two lengths plus two widths.",
    intuitionHook: "Imagine walking around the outside of a rectangular garden. You walk the long side, then the short side, then the long side again, then the short side. You've traced the whole boundary — that total walking distance IS the perimeter.",
    whatItIs: "Perimeter is the total length of the boundary of a flat shape. For a rectangle, opposite sides are equal, so the boundary is made of two equal lengths and two equal widths.",
    whyItWorks: "A rectangle has four sides, but only two distinct lengths: the long side $l$ (appearing twice) and the short side $w$ (appearing twice). Adding all four, $l + w + l + w$, groups naturally into $2l + 2w = 2(l+w)$. The factored form is a shortcut: add length and width ONCE, then double — because there are two of each.",
    whenToUse: "Reach for perimeter when you need a length that goes AROUND something: fencing a yard, framing a picture, trim around a window, edging a rug.",
    representations: [
      { kind: "real_world", label: "Walk the border", body: "Trace the outline of a $7 \\times 2$ rectangle: $7 + 2 + 7 + 2 = 18$. You walked each side exactly once." },
      { kind: "symbolic", label: "Add once, double", body: "$2(l+w)$: add the two DIFFERENT sides ($7+2=9$), then double ($18$) because each side has a twin." },
      { kind: "grid", label: "Count edge units", body: "On grid paper, count the unit edges along the outside of the rectangle — that count is the perimeter." }
    ],
    commonMistakes: [
      { label: "Confusing perimeter with area", why: "Multiplying $l \\times w$ gives the space INSIDE (area), not the distance AROUND (perimeter).", fix: "Perimeter is a length (units), area is a covering (square units). 'Around' adds; 'inside' multiplies." },
      { label: "Forgetting to double", why: "Adding $l + w$ once and stopping, which counts only two of the four sides.", fix: "There are two lengths AND two widths. After adding $l+w$, multiply by $2$." }
    ],
    connections: [
      { concept: "arithmetic_add", note: "Perimeter is just addition around a boundary." },
      { concept: "geo_area_rect", note: "Same two numbers, different question: perimeter goes around, area fills in." }
    ],
    examples: [
      { question: "Find the perimeter of a rectangle that is $7$ long and $2$ wide.", answer: "18", explanation: "Add one of each side and double: $2(7+2) = 2 \\times 9 = 18$. Equivalently $7+2+7+2 = 18$." },
      { question: "A $6 \\times 3$ rug needs edging tape around its border. How much tape?", answer: "18", explanation: "Perimeter $= 2(6+3) = 18$ units of tape. (Note its area would be $18$ too here — coincidence; the questions are different.)" }
    ]
  },

  geo_area_rect: {
    title: "Area of a Rectangle",
    formula: "A = l \\times w",
    oneLineSummary: "Area counts the square units that tile a shape — for a rectangle, rows times columns.",
    intuitionHook: "Picture a chocolate bar scored into a grid: $4$ rows of $6$ squares. You don't count all $24$ one by one — you see $4$ groups of $6$. That grid-counting is exactly what area measures.",
    whatItIs: "Area is the amount of flat surface a shape covers, measured in square units. A rectangle's area is how many unit squares fit inside it.",
    whyItWorks: "Lay unit squares inside the rectangle: a $l$-by-$w$ rectangle holds $w$ rows, each with $l$ squares. Counting $l$ squares, $w$ times, is multiplication: $l \\times w$. This is why area is a PRODUCT, not a sum — you're filling a 2-D region, and each of the $w$ rows contributes a full row of $l$.",
    whenToUse: "Use area whenever you cover or fill a surface: paint on a wall, carpet on a floor, turf on a field, tiles on a backsplash.",
    representations: [
      { kind: "grid", label: "Tile the rectangle", body: "A $5 \\times 3$ rectangle splits into $5$ columns and $3$ rows of unit squares: $15$ squares fill it." },
      { kind: "area_model", label: "Rows of a grid", body: "$3$ rows, each holding $5$ squares: $5 + 5 + 5 = 15$, which is just $5 \\times 3$." },
      { kind: "real_world", label: "In the world", body: "Buying carpet for a $4\\text{m} \\times 6\\text{m}$ room means buying $24$ square metres to cover the floor." }
    ],
    commonMistakes: [
      { label: "Computing perimeter instead", why: "Adding the sides ($2(l+w)$) reports the distance around, not the surface filled.", fix: "Area FILLS (multiply); perimeter SURROUNDS (add). Area's units are squared." },
      { label: "Wrong units", why: "Reporting area in plain units instead of square units.", fix: "Multiplying length by width multiplies the units too: $\\text{m} \\times \\text{m} = \\text{m}^2$." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Area IS multiplication — the rectangle of dots that defines a product." },
      { concept: "geo_area_triangle", note: "A triangle is half a rectangle; its area is half of base times height." },
      { concept: "geo_perimeter_rect", note: "Same dimensions, the complementary question: fill versus surround." }
    ],
    examples: [
      { question: "Find the area of a rectangle with length $7$ and width $2$.", answer: "14", explanation: "Tile it: $7$ squares per row, $2$ rows, $7 \\times 2 = 14$ square units." },
      { question: "A wall is $5$ m wide and $3$ m tall. How many square metres of paint cover it?", answer: "15", explanation: "Area $= 5 \\times 3 = 15$ square metres. Each of the $3$ rows holds $5$ square metres." }
    ]
  },

  geo_area_triangle: {
    title: "Area of a Triangle",
    formula: "A = \\tfrac{1}{2}\\, b \\, h",
    oneLineSummary: "A triangle is exactly half of a rectangle with the same base and height.",
    intuitionHook: "Take any rectangle and slice it along a diagonal. You get two identical triangles. So one triangle must be HALF the rectangle — that's where the mysterious $\\frac12$ comes from. It was never arbitrary.",
    whatItIs: "The area of a triangle is the surface it covers. With base $b$ and perpendicular height $h$, it is half the area of the $b \\times h$ rectangle that boxes it in.",
    whyItWorks: "Box a triangle inside a rectangle of width $b$ and height $h$. For a right triangle the diagonal cut gives two equal halves directly. For ANY triangle, copy it, rotate the copy $180^{\\circ}$, and the two together form a full $b \\times h$ parallelogram (area $b h$) — so one triangle is $\\frac12 b h$. The height must be PERPENDICULAR to the base, because that's the true 'thickness' of the rectangle you're halving.",
    whenToUse: "Use it for any triangular surface — a gable end of a roof, a sail, a slice of pizza approximated as a triangle, a plot of land.",
    representations: [
      { kind: "area_model", label: "Half a rectangle", body: "A triangle with base $6$, height $4$ sits inside a $6 \\times 4 = 24$ rectangle; the triangle is half: $12$." },
      { kind: "symbolic", label: "Box then halve", body: "Compute the rectangle $b\\times h$ first, then take half: $\\frac{1}{2}(6)(4) = \\frac{24}{2} = 12$." },
      { kind: "real_world", label: "In the world", body: "A triangular flag $8$ wide and $5$ tall uses $\\frac12(8)(5) = 20$ square units of fabric." }
    ],
    commonMistakes: [
      { label: "Forgetting the one-half", why: "Computing $b \\times h$ and stopping — that's the whole rectangle, double the triangle.", fix: "Always halve: a triangle is HALF its bounding rectangle. If your answer equals $b\\times h$, you forgot the $\\frac12$." },
      { label: "Using a slanted side as the height", why: "Multiplying base by the length of a leaning side instead of the perpendicular height.", fix: "Height is the straight-up distance from the base to the opposite point — it meets the base at a right angle." }
    ],
    connections: [
      { concept: "geo_area_rect", note: "The triangle is literally half of this rectangle." },
      { concept: "pythagorean", note: "Finding a triangle's perpendicular height often needs the Pythagorean theorem." }
    ],
    examples: [
      { question: "Find the area of a triangle with base $7$ and height $8$.", answer: "28", explanation: "Box it in a $7\\times 8 = 56$ rectangle and halve: $\\frac{1}{2}(56) = 28$." },
      { question: "Why is a triangle's area half of base times height?", answer: "Two triangles make a rectangle", explanation: "Rotating a copy of the triangle $180^{\\circ}$ pairs it into a $b \\times h$ parallelogram of area $bh$, so a single triangle is $\\frac12 bh$." }
    ]
  },

  geo_angles_triangle: {
    title: "Angles in a Triangle",
    formula: "\\alpha + \\beta + \\gamma = 180^{\\circ}",
    oneLineSummary: "The three interior angles of ANY triangle always add to a straight line: 180 degrees.",
    intuitionHook: "Tear the three corners off a paper triangle and lay them side by side, points touching. They always line up into a perfectly straight edge — a half-turn, $180^{\\circ}$. Every triangle, every time.",
    whatItIs: "An interior angle is the turn at a corner of the triangle. The three of them always sum to $180^{\\circ}$, no matter the triangle's shape or size.",
    whyItWorks: "Draw a line through the top vertex parallel to the base. The two base angles reappear at the top as 'alternate' angles (parallel lines copy angles across a crossing line). Now all three angles sit together along that straight top line — and a straight line is $180^{\\circ}$. So the three interior angles must total $180^{\\circ}$.",
    whenToUse: "Use it to find a missing angle when two are known, to check whether three angles can form a triangle, or to reason about parallel lines and shapes built from triangles.",
    representations: [
      { kind: "real_world", label: "Tear the corners", body: "The three torn corners always assemble into a straight line — a physical proof that they sum to $180^{\\circ}$." },
      { kind: "symbolic", label: "Subtract from 180", body: "If two angles are $60^{\\circ}$ and $70^{\\circ}$, the third is $180 - 60 - 70 = 50^{\\circ}$." },
      { kind: "number_line", label: "Angle budget", body: "Think of $180^{\\circ}$ as a budget the three angles must spend exactly — no more, no less." }
    ],
    commonMistakes: [
      { label: "Using 360 instead of 180", why: "Confusing a triangle with a quadrilateral (four-sided shapes total $360^{\\circ}$).", fix: "Triangles total $180^{\\circ}$; each extra side adds another $180^{\\circ}$, so quadrilaterals are $360^{\\circ}$." },
      { label: "Adding instead of subtracting", why: "Adding the two known angles and reporting that, instead of subtracting from $180^{\\circ}$.", fix: "The third angle is what's LEFT of the $180^{\\circ}$ budget: $180 - (\\text{known} + \\text{known})$." }
    ],
    connections: [
      { concept: "arithmetic_sub", note: "Finding the missing angle is one subtraction from $180^{\\circ}$." },
      { concept: "geo_area_triangle", note: "The same shape, now studied through its angles rather than its area." }
    ],
    examples: [
      { question: "Two angles of a triangle are $60^{\\circ}$ and $70^{\\circ}$. Find the third.", answer: "50", explanation: "Spend the $180^{\\circ}$ budget: $180 - 60 - 70 = 50^{\\circ}$." },
      { question: "Can a triangle have angles $90^{\\circ}, 90^{\\circ}, 10^{\\circ}$?", answer: "No", explanation: "They sum to $190^{\\circ} \\ne 180^{\\circ}$. Two right angles already use the whole budget, leaving nothing for a third corner." }
    ]
  },

  geo_circle_area: {
    title: "Area of a Circle",
    formula: "A = \\pi r^2",
    oneLineSummary: "A circle's area is pi times the radius squared — about three-and-a-bit copies of the radius square.",
    intuitionHook: "Draw the square on a circle's radius ($r \\times r$). Now ask: how many of those little squares cover the whole circle? Always the same magic number — a bit more than $3$. We call it $\\pi$ (about $3.14$).",
    whatItIs: "The area of a circle is the surface enclosed by it. It depends only on the radius $r$ (the distance from centre to edge), as $\\pi r^2$.",
    whyItWorks: "Slice the circle into many thin pie wedges and re-arrange them alternately point-up and point-down. They interlock into a shape approaching a rectangle whose height is the radius $r$ and whose width is half the circumference, $\\pi r$. Its area is $r \\times \\pi r = \\pi r^2$. The radius is SQUARED because area is two-dimensional — double the radius and you quadruple the area.",
    whenToUse: "Use it for anything round: a pizza, a circular table, a sprinkler's reach, a pond, a coin.",
    representations: [
      { kind: "grid", label: "Radius squares", body: "The square on the radius has area $r^2$; the circle holds about $3.14$ of them, so $A = \\pi r^2$." },
      { kind: "area_model", label: "Rearranged wedges", body: "Pie slices rearranged form a near-rectangle of height $r$ and width $\\pi r$: area $\\pi r^2$." },
      { kind: "symbolic", label: "In terms of pi", body: "Radius $7$: $A = \\pi (7)^2 = 49\\pi$. Leaving $\\pi$ symbolic keeps the answer exact." }
    ],
    commonMistakes: [
      { label: "Using circumference instead of area", why: "Computing $2\\pi r$ (the distance around) when the question asks for the surface inside.", fix: "Area uses $r$ SQUARED ($\\pi r^2$); circumference is linear ($2\\pi r$). If you didn't square the radius, you found the wrong thing." },
      { label: "Doubling the radius instead of squaring", why: "Reading $r^2$ as $2r$, so radius $7$ gives $14\\pi$ instead of $49\\pi$.", fix: "$r^2$ means $r \\times r$, not $r + r$. For $r=7$ that is $49$, not $14$." }
    ],
    connections: [
      { concept: "exponent_power", note: "The $r^2$ is a square — an exponent, the engine of the formula." },
      { concept: "geo_area_rect", note: "The wedge-rearrangement turns the circle into a rectangle of area $\\pi r^2$." }
    ],
    examples: [
      { question: "Find the area of a circle with radius $7$, in terms of $\\pi$.", answer: "49\\pi", explanation: "$A = \\pi r^2 = \\pi(7)^2 = 49\\pi$. Square the radius first, then attach $\\pi$." },
      { question: "A circle's radius doubles from $3$ to $6$. How does its area change?", answer: "It quadruples", explanation: "Area goes from $9\\pi$ to $36\\pi$ — four times larger, because squaring doubles the doubling: $(2r)^2 = 4r^2$." }
    ]
  },

  // ===========================================================================
  // NUMBER SENSE / PRE-ALGEBRA STRAND
  // ===========================================================================
  percentage_of: {
    title: "Percent of a Number",
    formula: "p\\% \\text{ of } N = \\dfrac{p}{100}\\times N",
    oneLineSummary: "Finding a percent of a number is taking that many hundredths of it — often easiest as a friendly fraction.",
    intuitionHook: "A $25\\%$ off sign on an $80$ dollar jacket. You don't reach for a calculator — $25\\%$ is just a quarter, and a quarter of $80$ is $20$. Percent-of is fraction-of in disguise.",
    whatItIs: "'$p\\%$ of $N$' asks for the part of $N$ that corresponds to $p$ out of every $100$. It is the fraction $\\frac{p}{100}$ applied to $N$.",
    whyItWorks: "Percent means 'per hundred', so $p\\%$ is the fraction $\\frac{p}{100}$. Taking a percent OF a number is multiplying by that fraction. The shortcut: convert to a friendly fraction first. $25\\% = \\frac14$, $50\\% = \\frac12$, $10\\% = \\frac1{10}$ — then dividing is faster than multiplying by a decimal. And $10\\%$ is a Swiss-army move: find it by moving the decimal one place, then scale ($30\\%$ is three $10\\%$s).",
    whenToUse: "Discounts, tips, tax, commission, exam scores, survey results — any time you take a slice of a known total.",
    representations: [
      { kind: "grid", label: "Hundred grid", body: "Shade $25$ of $100$ cells: that quarter of the grid is $25\\%$. A quarter of $80$ is $20$." },
      { kind: "symbolic", label: "Friendly fraction", body: "$25\\%$ of $80 = \\frac14 \\times 80 = \\frac{80}{4} = 20$ — divide instead of multiplying by $0.25$." },
      { kind: "real_world", label: "Build from 10%", body: "$30\\%$ of $40$: $10\\%$ is $4$, so $30\\%$ is $3 \\times 4 = 12$." }
    ],
    commonMistakes: [
      { label: "Decimal-place slip", why: "Treating $\\frac{p}{100}$ as $\\frac{p}{10}$, so $20\\%$ of $40$ comes out as $80$ instead of $8$.", fix: "Per CENT means per HUNDRED — divide by $100$, two places, not one." },
      { label: "Confusing 'of' with 'off'", why: "Reading '$25\\%$ off $80$' as '$25\\%$ of $80 = 20$' and stopping, when the price is $80 - 20 = 60$.", fix: "'OF' is the part ($20$); 'OFF' subtracts it from the whole ($60$)." }
    ],
    connections: [
      { concept: "fraction_of", note: "A percent is just a fraction with denominator $100$ — same 'of a number' move." },
      { concept: "percent_change", note: "Increase/decrease builds directly on finding the percent part first." },
      { concept: "arithmetic_div", note: "Friendly percents ($25\\%, 10\\%$) turn the problem into simple division." }
    ],
    examples: [
      { question: "Find $25\\%$ of $80$.", answer: "20", explanation: "$25\\% = \\frac14$, so split $80$ into four: $80 \\div 4 = 20$." },
      { question: "Find $30\\%$ of $40$ by building from $10\\%$.", answer: "12", explanation: "$10\\%$ of $40$ is $4$; $30\\%$ is three of those: $3 \\times 4 = 12$." }
    ]
  },

  fraction_of: {
    title: "Fraction of a Number",
    formula: "\\dfrac{p}{q}\\text{ of }N = (N \\div q)\\times p",
    oneLineSummary: "A fraction of a number means: cut into q equal parts, then take p of them.",
    intuitionHook: "Three-quarters of a $20$ dollar pizza fund. Split $20$ into $4$ equal parts ($5$ each), then grab $3$ of them: $15$ dollars. 'Of' a fraction is just 'divide, then multiply'.",
    whatItIs: "'$\\frac{p}{q}$ of $N$' is the part of $N$ you get by dividing it into $q$ equal pieces and keeping $p$ of those pieces.",
    whyItWorks: "The denominator $q$ tells you how many equal parts to cut $N$ into — that's the division $N \\div q$ (the size of one part). The numerator $p$ tells you how many of those parts to take — that's the multiplication. Order helps: divide FIRST (keeps numbers small and often whole), then multiply. $\\frac34$ of $20$: one quarter is $20\\div4 = 5$, three quarters is $3\\times5 = 15$.",
    whenToUse: "Sharing quantities, recipe scaling, reading 'two-thirds of the class', or any portion of a whole.",
    representations: [
      { kind: "area_model", label: "Bar split into parts", body: "Draw a bar of $20$, cut into $4$ equal blocks of $5$. Shade $3$ blocks: $15$." },
      { kind: "symbolic", label: "Divide then multiply", body: "$\\frac34$ of $20 = (20\\div 4)\\times 3 = 5 \\times 3 = 15$." },
      { kind: "real_world", label: "In the world", body: "$\\frac23$ of a $30$-minute show is $30\\div 3 \\times 2 = 20$ minutes." }
    ],
    commonMistakes: [
      { label: "Taking just one part", why: "Dividing by $q$ and forgetting to multiply by $p$, so $\\frac34$ of $20$ comes out as $5$.", fix: "Two steps: cut into $q$ parts AND take $p$ of them. $\\frac34$ keeps three quarters, not one." },
      { label: "Multiplying by the denominator", why: "Computing $N \\times q$ or $p \\times q$ instead of dividing by $q$.", fix: "The denominator DIVIDES (it cuts into parts); the numerator MULTIPLIES (it collects parts)." }
    ],
    connections: [
      { concept: "arithmetic_div", note: "The denominator is a division — cutting into equal parts." },
      { concept: "percentage_of", note: "A percent is a fraction over $100$; this is the same move with any denominator." },
      { concept: "ratio_solve", note: "Fractions and ratios both compare parts to wholes." }
    ],
    examples: [
      { question: "Find $\\frac34$ of $20$.", answer: "15", explanation: "One quarter is $20\\div 4 = 5$; three quarters is $3 \\times 5 = 15$." },
      { question: "Find $\\frac23$ of $21$.", answer: "14", explanation: "One third is $21 \\div 3 = 7$; two thirds is $2 \\times 7 = 14$." }
    ]
  },

  ratio_solve: {
    title: "Ratios & Proportions",
    formula: "a : b = (a\\times k) : (b\\times k)",
    oneLineSummary: "A ratio compares two amounts by scaling — multiply both parts by the same number to keep it equivalent.",
    intuitionHook: "A recipe says flour to sugar is $2 : 3$. You use $4$ cups of flour — double the recipe. So you need double the sugar too: $6$ cups. A ratio is a rule for scaling that keeps the mix the same.",
    whatItIs: "A ratio $a : b$ states how two quantities relate in size. A proportion keeps that relationship fixed while scaling both parts up or down by the same factor.",
    whyItWorks: "A ratio is really a constant rate: $2 : 3$ means 'for every $2$ of the first, $3$ of the second'. To keep the mixture identical, whatever you multiply the first part by, you must multiply the second by the SAME factor $k$. So if the first grows from $2$ to $4$ (factor $k=2$), the second grows from $3$ to $3\\times2 = 6$. Find the scale factor, then apply it.",
    whenToUse: "Recipes, maps and scale models, mixing paint or fuel, currency conversion, comparing rates and unit prices.",
    representations: [
      { kind: "real_world", label: "Scaling a recipe", body: "$2:3$ flour to sugar, tripled, becomes $6:9$ — same taste, bigger batch." },
      { kind: "symbolic", label: "Find the factor", body: "First goes $2 \\to 4$, so $k = 4 \\div 2 = 2$; the second goes $3 \\to 3\\times 2 = 6$." },
      { kind: "number_line", label: "Equal steps", body: "Both parts step up together in equal multiples: $2:3,\\ 4:6,\\ 6:9,\\ 8:12$." }
    ],
    commonMistakes: [
      { label: "Adding instead of scaling", why: "Seeing the first part rise by $2$ (from $2$ to $4$) and adding $2$ to the other part too, giving $5$ instead of $6$.", fix: "Ratios MULTIPLY, not add. Find the factor ($\\times 2$) and apply it to both parts." },
      { label: "Scaling only one part", why: "Changing the first quantity but leaving the second unchanged, which breaks the ratio.", fix: "Whatever factor you apply to one part, apply to BOTH — that's what keeps the ratio equivalent." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Scaling a ratio is multiplication by a common factor." },
      { concept: "fraction_of", note: "A ratio $a:b$ is closely tied to the fractions $\\frac{a}{a+b}$ and $\\frac{b}{a+b}$ of the whole." },
      { concept: "percentage_of", note: "Percentages are ratios out of $100$." }
    ],
    examples: [
      { question: "Two quantities are in the ratio $2 : 3$. If the first is $4$, find the second.", answer: "6", explanation: "Scale factor $k = 4 \\div 2 = 2$. The second is $3 \\times 2 = 6$." },
      { question: "Paint mixes red to blue as $3 : 5$. With $12$ litres of red, how much blue?", answer: "20", explanation: "Factor $k = 12 \\div 3 = 4$; blue $= 5 \\times 4 = 20$ litres." }
    ]
  },

  percent_change: {
    title: "Percent Increase & Decrease",
    formula: "\\text{new} = N\\left(1 \\pm \\tfrac{p}{100}\\right)",
    oneLineSummary: "To change by a percent, find that percent of the original and add it on (increase) or take it off (decrease).",
    intuitionHook: "A $40$ dollar game goes up $25\\%$. The rise is a quarter of $40$, which is $10$ — so the new price is $40 + 10 = 50$. A percent change is just a percent-of, then a single add or subtract.",
    whatItIs: "Percent increase/decrease adjusts a starting amount $N$ by a percentage of itself. The result is the original plus (or minus) that percentage part.",
    whyItWorks: "First find the change: $p\\%$ of $N$ is $\\frac{p}{100}\\times N$. Then the new total is $N$ plus that change (increase) or minus it (decrease). The one-step form bundles this: increasing by $25\\%$ means keeping the original $100\\%$ AND adding $25\\%$, i.e. $125\\% = \\times 1.25$; decreasing by $25\\%$ keeps $75\\% = \\times 0.75$. The percent is always taken OF the original, not the result.",
    whenToUse: "Sales and markups, tips and tax, pay rises, population growth, depreciation — any before-and-after with a percentage.",
    representations: [
      { kind: "real_world", label: "Find the change, then adjust", body: "$25\\%$ of $40$ is $10$; a $25\\%$ rise gives $40 + 10 = 50$, a $25\\%$ fall gives $40 - 10 = 30$." },
      { kind: "symbolic", label: "Multiplier form", body: "Up $25\\%$: $\\times 1.25$. Down $25\\%$: $\\times 0.75$. $40 \\times 1.25 = 50$." },
      { kind: "grid", label: "Original plus a slice", body: "Picture the full bar ($100\\%$) with an extra quarter-bar ($25\\%$) added on top: $125\\%$." }
    ],
    commonMistakes: [
      { label: "Reporting only the change", why: "Finding the $10$ increase and stopping, instead of adding it to the original $40$.", fix: "The question asks for the NEW amount: change $+$ original (or original $-$ change for a decrease)." },
      { label: "Taking the percent of the new value", why: "After an increase, computing the decrease off the larger result, expecting to return to start.", fix: "Each percent is taken OF its own starting amount; a rise then an equal-percent fall does NOT return to the original." }
    ],
    connections: [
      { concept: "percentage_of", note: "Step one is always finding the percent OF the original." },
      { concept: "arithmetic_add", note: "Step two is a single add (increase) or subtract (decrease)." }
    ],
    examples: [
      { question: "A price of $40$ is increased by $25\\%$. Find the new price.", answer: "50", explanation: "$25\\%$ of $40$ is $10$; add it: $40 + 10 = 50$ (or $40\\times 1.25 = 50$)." },
      { question: "An $80$ dollar coat is reduced by $10\\%$. Find the sale price.", answer: "72", explanation: "$10\\%$ of $80$ is $8$; subtract: $80 - 8 = 72$ (or $80\\times 0.90 = 72$)." }
    ]
  },

  exponent_power: {
    title: "Exponents & Powers",
    formula: "b^{n} = \\underbrace{b\\times b\\times\\dots\\times b}_{n\\text{ times}}",
    oneLineSummary: "An exponent is repeated multiplication — the base multiplied by itself, exponent-many times.",
    intuitionHook: "A rumour told to $3$ people, each of whom tells $3$ more, each telling $3$ more... After $4$ rounds it's $3\\times3\\times3\\times3 = 81$. Exponents are how repeated multiplying explodes — fast.",
    whatItIs: "A power $b^n$ means multiply the base $b$ by itself $n$ times. $b$ is the base, $n$ is the exponent (or index).",
    whyItWorks: "Just as multiplication compresses repeated addition, exponents compress repeated MULTIPLICATION. $b^n$ is $n$ copies of $b$ all multiplied. The exponent counts the FACTORS, not a multiplier — so $2^5$ is five $2$s multiplied ($32$), emphatically not $2\\times5 = 10$. Because each step multiplies, powers grow explosively: doubling just $10$ times already passes a thousand.",
    whenToUse: "Areas and volumes ($r^2$, $s^3$), repeated doubling/halving, compound growth, scientific notation, and squares inside formulas like the Pythagorean theorem.",
    representations: [
      { kind: "symbolic", label: "Count the factors", body: "$3^4 = 3\\times 3\\times 3\\times 3$. Four threes, multiplied: $9 \\times 9 = 81$." },
      { kind: "area_model", label: "Squares and cubes", body: "$5^2$ is the area of a $5\\times5$ square ($25$); $2^3$ is the volume of a $2\\times2\\times2$ cube ($8$)." },
      { kind: "real_world", label: "Doubling", body: "$2^{10}$ is ten doublings: $1,2,4,8,\\dots,1024$ — repeated multiplication races ahead of repeated addition." }
    ],
    commonMistakes: [
      { label: "Multiplying base by exponent", why: "Reading $3^4$ as $3\\times 4 = 12$ instead of four $3$s multiplied.", fix: "The exponent COUNTS factors; it is not a multiplier. $3^4 = 3\\times3\\times3\\times3 = 81$." },
      { label: "Off-by-one on the exponent", why: "Multiplying one too few or too many copies of the base.", fix: "The exponent is exactly how many bases are multiplied — $b^3$ has three $b$s, not two." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Exponents are repeated multiplication, just as multiplication is repeated addition." },
      { concept: "geo_circle_area", note: "The $r^2$ in $\\pi r^2$ is a power — a square." },
      { concept: "pythagorean", note: "$a^2 + b^2 = c^2$ is built entirely from squares (powers of $2$)." }
    ],
    examples: [
      { question: "Evaluate $3^4$.", answer: "81", explanation: "Multiply four $3$s: $3\\times3 = 9$, $9\\times3 = 27$, $27\\times3 = 81$." },
      { question: "Why is $2^5 = 32$ and not $10$?", answer: "32", explanation: "$2^5$ means five $2$s multiplied: $2\\times2\\times2\\times2\\times2 = 32$. $2\\times5 = 10$ would be repeated ADDITION, a different operation." }
    ]
  },

  // ===========================================================================
  // STATISTICS & PROBABILITY STRAND
  // ===========================================================================
  stat_mode: {
    title: "Mode of a Data Set",
    formula: "\\text{mode} = \\text{most frequent value}",
    oneLineSummary: "The mode is the value that shows up most often — the data set's most popular answer.",
    intuitionHook: "A shoe shop doesn't care about the 'average' shoe size — it cares which size sells MOST, so it stocks more of those. That most-common value is the mode.",
    whatItIs: "The mode is the value that appears most frequently in a data set. A set can have one mode, several, or none if nothing repeats.",
    whyItWorks: "Mean and median summarise the CENTRE; the mode summarises POPULARITY — which value occurs the most. You find it by counting occurrences, not by ordering or adding. It is the only one of the three averages that works for non-numeric data too (most common colour, most common name), because 'most frequent' needs only counting.",
    whenToUse: "Use the mode for the most common category or choice: best-selling size, most frequent score, the typical (most-seen) value, especially for categories rather than measurements.",
    representations: [
      { kind: "grid", label: "Tally chart", body: "Tally each value; the tallest column is the mode. In $5,7,5,9,11$ the value $5$ has two tallies, the rest one — mode $5$." },
      { kind: "real_world", label: "Most popular", body: "If most customers order a medium, 'medium' is the mode — what to stock most of." },
      { kind: "symbolic", label: "Count, do not order", body: "Mode ignores size and order; only the count of each value matters." }
    ],
    commonMistakes: [
      { label: "Choosing the largest value", why: "Picking the biggest number instead of the most frequent one.", fix: "Mode is about HOW OFTEN, not how big. Count repeats; the most repeated wins, even if it's small." },
      { label: "Confusing mode with mean or median", why: "Averaging or finding the middle instead of the most common value.", fix: "Mode = most frequent (count), mean = balance point (add and divide), median = middle (order)." }
    ],
    connections: [
      { concept: "stat_mean", note: "A different kind of average: mode is most-common, mean is the balance point." },
      { concept: "stat_median", note: "Median orders the data; mode just counts frequencies." }
    ],
    examples: [
      { question: "Find the mode of $5, 7, 5, 9, 11$.", answer: "5", explanation: "$5$ appears twice; every other value appears once. The most frequent value is $5$." },
      { question: "Find the mode of $3, 5, 3, 7, 9$.", answer: "3", explanation: "$3$ occurs twice and is the only repeat, so the mode is $3$." }
    ]
  },

  stat_mean: {
    title: "Mean (Average)",
    formula: "\\bar{x} = \\dfrac{\\text{sum of values}}{\\text{number of values}}",
    oneLineSummary: "The mean shares the total equally among all the values — the 'fair-share' average.",
    intuitionHook: "Four friends pooled $4, 6, 8, 10$ dollars for snacks, then split the kitty equally. Each effectively put in $7$. That fair-share amount — total divided by how many — is the mean.",
    whatItIs: "The mean (arithmetic average) is the total of all values divided by how many values there are. It's the amount each would have if the total were shared out equally.",
    whyItWorks: "Add everything to get the total 'stuff', then divide by the count to share it equally — that equal share is the mean. Picture the values as towers of blocks: the mean is the height they'd all reach if you levelled the towers, moving blocks from tall to short. That's why the mean is a balance point — it sits where the data evens out, and why a single extreme value can pull it noticeably.",
    whenToUse: "Use the mean for a typical value of measurements that don't have wild outliers: average score, average temperature, average speed.",
    representations: [
      { kind: "real_world", label: "Level the towers", body: "Block towers of $4,6,8,10$ levelled out all reach $7$ — the mean." },
      { kind: "symbolic", label: "Add then divide", body: "$\\frac{4+6+8+10}{4} = \\frac{28}{4} = 7$." },
      { kind: "number_line", label: "Balance point", body: "Place the values on a line; the mean is where they'd balance like a see-saw." }
    ],
    commonMistakes: [
      { label: "Forgetting to divide", why: "Reporting the total ($28$) instead of the per-item share ($7$).", fix: "The mean is total $\\div$ count. If your answer is as big as the whole sum, you skipped the division." },
      { label: "Dividing by the wrong count", why: "Dividing by a miscount of how many values there are.", fix: "Count the values carefully — divide by exactly how many numbers you added." }
    ],
    connections: [
      { concept: "arithmetic_div", note: "The mean is one division: total shared by the count." },
      { concept: "stat_median", note: "Both describe the centre; the median resists outliers, the mean does not." },
      { concept: "stat_mode", note: "Three averages, three ideas: balance point, middle, and most-common." }
    ],
    examples: [
      { question: "Find the mean of $4, 6, 8, 10$.", answer: "7", explanation: "Total $4+6+8+10 = 28$; divide by $4$ values: $28 \\div 4 = 7$." },
      { question: "Find the mean of $8, 10, 12, 14$.", answer: "11", explanation: "Sum $= 44$, count $= 4$, mean $= 44 \\div 4 = 11$." }
    ]
  },

  stat_median: {
    title: "Median of a Data Set",
    formula: "\\text{median} = \\text{middle value when ordered}",
    oneLineSummary: "The median is the middle value once the data is sorted — the halfway mark.",
    intuitionHook: "Line up your class by height. The person standing in the exact middle is the 'typical' height — the median. It ignores how tall the tallest is; only the middle position matters.",
    whatItIs: "The median is the middle value of a data set after the values are placed in order. Half the data lies below it, half above.",
    whyItWorks: "ORDER first — the median is about position, not value, so an unsorted middle is meaningless. With an odd count, one value sits dead centre. The median's superpower is resistance to outliers: a single huge value changes the mean a lot but barely nudges the median, because the middle POSITION hardly moves. That's why incomes and house prices are reported as medians.",
    whenToUse: "Use the median for a typical value when the data has outliers or is skewed: incomes, house prices, response times.",
    representations: [
      { kind: "number_line", label: "Order then point to the middle", body: "$5,6,8,10,13$ ordered: the $3$rd of $5$ is $8$ — two below, two above." },
      { kind: "real_world", label: "Middle of the line-up", body: "Sort people by height; the middle person's height is the median." },
      { kind: "symbolic", label: "Position, not size", body: "Always sort first; the median is the value at the central position." }
    ],
    commonMistakes: [
      { label: "Taking the middle of the UNSORTED list", why: "Picking the value that happens to sit in the middle position before ordering.", fix: "Always sort the data into order FIRST; only then read the central value." },
      { label: "Confusing median with mean", why: "Adding and dividing instead of ordering and finding the centre.", fix: "Median = middle of the ordered list; mean = total divided by count. They often differ." }
    ],
    connections: [
      { concept: "stat_mean", note: "Both find a centre; the median ignores outliers, the mean is swayed by them." },
      { concept: "stat_range", note: "Both require thinking about the ordered data (smallest to largest)." }
    ],
    examples: [
      { question: "Find the median of $13, 6, 10, 5, 8$.", answer: "8", explanation: "Order them: $5,6,8,10,13$. The middle (3rd of 5) value is $8$." },
      { question: "Find the median of $12, 5, 9, 4, 7$.", answer: "7", explanation: "Sorted: $4,5,7,9,12$. The central value is $7$." }
    ]
  },

  stat_range: {
    title: "Range of a Data Set",
    formula: "\\text{range} = \\text{maximum} - \\text{minimum}",
    oneLineSummary: "The range measures spread — how far the data stretches from lowest to highest.",
    intuitionHook: "Two classes both average $70\\%$. In one, scores run $68$–$72$; in the other, $40$–$100$. Same average, wildly different consistency. The range — high minus low — captures that spread the average hides.",
    whatItIs: "The range is the difference between the largest and smallest values in a data set. It's a simple measure of how spread out the data is.",
    whyItWorks: "Averages tell you the centre but say nothing about SPREAD. The range fixes that with one subtraction: largest minus smallest. A small range means the data is tightly clustered (consistent); a large range means it's widely scattered (variable). It uses only the two extremes, which makes it quick but also sensitive to a single unusual value.",
    whenToUse: "Use the range to compare consistency or variability: temperature swings, test-score spread, price differences, quality control.",
    representations: [
      { kind: "number_line", label: "Stretch from min to max", body: "For $6,7,8,10,14$ the data stretches from $6$ to $14$: range $14-6 = 8$." },
      { kind: "real_world", label: "Hottest minus coldest", body: "If the week's highs ran $12^{\\circ}$ to $21^{\\circ}$, the range of highs is $9^{\\circ}$." },
      { kind: "symbolic", label: "One subtraction", body: "Find the max and the min, then subtract: $\\text{max} - \\text{min}$." }
    ],
    commonMistakes: [
      { label: "Reporting the maximum", why: "Giving the largest value instead of the difference between largest and smallest.", fix: "Range is a GAP, not a value: subtract the minimum from the maximum." },
      { label: "Forgetting to find the true min/max", why: "Subtracting the first and last numbers as written instead of the actual smallest and largest.", fix: "Scan for the genuine highest and lowest values first; their order in the list doesn't matter." }
    ],
    connections: [
      { concept: "arithmetic_sub", note: "The range is a single subtraction: max minus min." },
      { concept: "stat_median", note: "Both rely on identifying order (extremes for range, centre for median)." }
    ],
    examples: [
      { question: "Find the range of $8, 14, 6, 10, 7$.", answer: "8", explanation: "Maximum $14$, minimum $6$; range $= 14 - 6 = 8$." },
      { question: "Find the range of $7, 11, 5, 9, 6$.", answer: "6", explanation: "Largest $11$, smallest $5$; range $= 11 - 5 = 6$." }
    ]
  },

  stat_probability: {
    title: "Simple Probability",
    formula: "P(\\text{event}) = \\dfrac{\\text{favourable outcomes}}{\\text{total outcomes}}",
    oneLineSummary: "Probability measures how likely something is, as the share of outcomes that count as a success.",
    intuitionHook: "A bag of $20$ marbles, $5$ of them red. Reach in blindly — what's the chance of red? Five of the twenty equally-likely grabs are red, so $\\frac{5}{20}$, or $25\\%$. Probability is just favourable-out-of-total.",
    whatItIs: "The probability of an event is the fraction of all equally-likely outcomes that make the event happen — a number from $0$ (impossible) to $1$ (certain), often written as a fraction or percent.",
    whyItWorks: "When every outcome is equally likely, likelihood is just a proportion: count the outcomes you want (favourable) over all outcomes possible (total). $\\frac{5}{20}$ of grabs are red. Expressing it as a percent ($25\\%$) makes likelihoods easy to compare. The favourable count can never exceed the total, so probability never exceeds $100\\%$ — and the chances of all outcomes add to a full $100\\%$.",
    whenToUse: "Use it for games of chance, risk and weather odds, sampling, and any 'what's the chance' question with equally-likely outcomes.",
    representations: [
      { kind: "real_world", label: "Marbles in a bag", body: "$5$ red of $20$: $P(\\text{red}) = \\frac{5}{20} = 25\\%$." },
      { kind: "grid", label: "Part of the whole", body: "Shade $5$ of $20$ cells: a quarter shaded means a $25\\%$ chance." },
      { kind: "symbolic", label: "Favourable over total", body: "$P = \\frac{\\text{favourable}}{\\text{total}}$, then convert to a percent if helpful." }
    ],
    commonMistakes: [
      { label: "Using a raw count, not a fraction", why: "Answering '$5$' (the number of red) instead of the proportion $\\frac{5}{20}$ or $25\\%$.", fix: "Probability compares favourable to TOTAL — it's a fraction or percent, not a bare count." },
      { label: "Confusing the event with its complement", why: "Reporting the chance of the OTHER outcome (the blue marbles) by mistake.", fix: "Match the count to the event asked for; the event and its complement together make $100\\%$." }
    ],
    connections: [
      { concept: "fraction_of", note: "Probability is a fraction of the total outcomes." },
      { concept: "percentage_of", note: "Probabilities are often expressed as a percent for easy comparison." }
    ],
    examples: [
      { question: "A bag has $5$ red marbles out of $20$. What is the probability of red, as a percent?", answer: "25", explanation: "$P(\\text{red}) = \\frac{5}{20} = \\frac14 = 25\\%$." },
      { question: "A bag has $2$ red marbles out of $20$. What is the probability of red, as a percent?", answer: "10", explanation: "$P(\\text{red}) = \\frac{2}{20} = \\frac1{10} = 10\\%$." }
    ]
  },

  // ===========================================================================
  // ALGEBRAIC EXPRESSIONS STRAND
  // ===========================================================================
  eval_expression: {
    title: "Evaluating Expressions",
    formula: "\\text{replace the letter with its value, then compute}",
    oneLineSummary: "A variable is a placeholder for a number — to evaluate, substitute the value and follow order of operations.",
    intuitionHook: "A taxi charges 2 dollars per mile plus a 3 dollar flag fee: cost $= 2x + 3$. For a 4-mile trip, the $x$ is just standing in for $4$. Swap it in: $2(4)+3 = 11$. A variable is a number wearing a name tag.",
    whatItIs: "An algebraic expression like $2x + 3$ is a recipe built from numbers and variables. Evaluating it means putting in a specific value for the variable and working out the single number that results.",
    whyItWorks: "A variable holds a place for a number you'll supply later — the expression $2x+3$ describes a RELATIONSHIP that works for any $x$. Evaluating just fills the slot and computes. The one rule: respect order of operations. $2x$ means $2 \\times x$, so multiply BEFORE adding the $3$ — exactly the PEMDAS habit from arithmetic, now with a letter in the mix.",
    whenToUse: "Whenever a formula meets a specific case: plugging a number into a cost formula, a temperature conversion, a physics equation, or a spreadsheet cell.",
    representations: [
      { kind: "real_world", label: "Formula with a value", body: "Cost $= 2x + 3$; for $x = 4$ miles, cost $= 2(4) + 3 = 11$ dollars." },
      { kind: "symbolic", label: "Substitute, then compute", body: "$3x + 2$ at $x = 4$: write $3(4) + 2$, multiply first ($12$), then add ($14$)." },
      { kind: "balance", label: "The letter is a slot", body: "$x$ is an empty box; evaluating drops a number into the box and simplifies." }
    ],
    commonMistakes: [
      { label: "Adding instead of substituting", why: "Reading $3x + 2$ at $x=4$ as $3 + 4 + 2$, treating the coefficient as a separate term.", fix: "$3x$ means $3 \\times x$. Replace $x$ with its value and MULTIPLY: $3(4) = 12$, then add $2$." },
      { label: "Ignoring order of operations", why: "Adding before multiplying, e.g. $3 \\times (4+2)$ instead of $3\\times4 + 2$.", fix: "Multiplication binds tighter than addition. Do $3x$ first, then add the constant." }
    ],
    connections: [
      { concept: "pemdas", note: "Evaluating is order-of-operations with a value substituted for the letter." },
      { concept: "linear_one_step", note: "Solving an equation reverses this: instead of plugging in $x$, you find the $x$ that makes it true." },
      { concept: "eval_two_var", note: "The same substitution move, now with two letters to fill." }
    ],
    examples: [
      { question: "Evaluate $3x + 2$ when $x = 4$.", answer: "14", explanation: "Substitute: $3(4) + 2$. Multiply first: $12 + 2 = 14$." },
      { question: "A cost is $5x + 1$ dollars for $x$ items. Find the cost of $3$ items.", answer: "16", explanation: "$5(3) + 1 = 15 + 1 = 16$ dollars." }
    ]
  },

  eval_two_var: {
    title: "Two-Variable Expressions",
    formula: "a\\,m + b\\,n \\;\\to\\; \\text{substitute both, then compute}",
    oneLineSummary: "Same idea as one variable, but fill EACH letter with its own value before computing.",
    intuitionHook: "A snack stall sells pretzels at 2 dollars and drinks at 3 dollars: total $= 2m + 3n$ for $m$ pretzels and $n$ drinks. Buy 4 pretzels and 2 drinks? Fill both slots: $2(4) + 3(2) = 14$.",
    whatItIs: "A two-variable expression like $2m + 3n$ depends on two independent quantities. Evaluating means substituting a value for each variable, then simplifying to one number.",
    whyItWorks: "Each variable is its own placeholder, and they don't interfere: replace $m$ with its value and $n$ with its value, keeping each with its own coefficient. Then it's ordinary arithmetic — multiply each term, then add. The only new discipline is bookkeeping: make sure each number lands on the RIGHT letter.",
    whenToUse: "Totals built from two different rates or prices, area as length times width, distance as speed times time across two legs, any formula with two inputs.",
    representations: [
      { kind: "real_world", label: "Two prices", body: "$2m + 3n$: $m$ pretzels at 2 dollars, $n$ drinks at 3 dollars. For $m=4, n=2$: $8 + 6 = 14$." },
      { kind: "symbolic", label: "Fill both slots", body: "$2m + 3n$ at $m=4, n=2$ becomes $2(4) + 3(2) = 8 + 6 = 14$." },
      { kind: "grid", label: "Keep the pairs straight", body: "Line up each value under its letter so $m$'s value never wanders into $n$'s term." }
    ],
    commonMistakes: [
      { label: "Swapping the values", why: "Putting $m$'s value into $n$'s term (or vice versa), e.g. $2(2) + 3(4)$ instead of $2(4) + 3(2)$.", fix: "Label as you substitute: write the value directly beneath its matching letter before computing." },
      { label: "Merging the variables", why: "Treating $m$ and $n$ as the same quantity and adding their coefficients first.", fix: "$m$ and $n$ are independent — keep their terms separate; only combine after substituting numbers." }
    ],
    connections: [
      { concept: "eval_expression", note: "The one-variable case; this just adds a second slot to fill." },
      { concept: "geo_area_rect", note: "Area $= l \\times w$ is a two-variable expression evaluated at specific dimensions." }
    ],
    examples: [
      { question: "Evaluate $2m + 3n$ when $m = 4$ and $n = 2$.", answer: "14", explanation: "Substitute both: $2(4) + 3(2) = 8 + 6 = 14$." },
      { question: "Evaluate $3a + 2b$ when $a = 5$ and $b = 4$.", answer: "23", explanation: "$3(5) + 2(4) = 15 + 8 = 23$." }
    ]
  },

  combine_like_terms: {
    title: "Combining Like Terms",
    formula: "a x + b x = (a + b)\\,x",
    oneLineSummary: "Terms with the same variable can be merged by adding their coefficients — like counting the same kind of object.",
    intuitionHook: "Three apples plus five apples is eight apples — you'd never call it 'fifteen apples' or 'eight apple-squared'. So $3x + 5x = 8x$. The $x$ is just the name of the thing you're counting.",
    whatItIs: "Like terms have the exact same variable part (e.g. both are $x$ terms). Combining them collapses a sum into a single term by adding the coefficients while keeping the variable unchanged.",
    whyItWorks: "$3x$ means 'three $x$s' and $5x$ means 'five $x$s'; together that's eight $x$s — $8x$. This is the distributive property read backwards: $3x + 5x = (3+5)x$. The variable is the UNIT being counted, so it stays exactly as it is: you don't add the exponents (that would change what you're counting) and you don't multiply the coefficients (that would be groups-of-groups, not a total).",
    whenToUse: "Simplifying expressions before solving, tidying a formula, collecting terms after expanding brackets — a constant housekeeping step in algebra.",
    representations: [
      { kind: "real_world", label: "Counting one kind", body: "$3x + 5x$ is $3$ boxes plus $5$ boxes of the same item: $8$ boxes, $8x$." },
      { kind: "symbolic", label: "Add the coefficients", body: "$3x + 5x = (3+5)x = 8x$ — the $x$ rides along unchanged." },
      { kind: "area_model", label: "Bars of x", body: "Lay three $x$-length bars next to five more; the total length is $8x$." }
    ],
    commonMistakes: [
      { label: "Multiplying the coefficients", why: "Writing $3x + 5x = 15x$, multiplying when the operation is addition.", fix: "Adding three $x$s and five $x$s gives eight $x$s. Multiply only if the problem actually multiplies." },
      { label: "Changing the variable's power", why: "Writing $3x + 5x = 8x^2$, adding exponents that were never multiplied.", fix: "The variable is the unit you're counting — it stays $x$. Exponents change only when terms are MULTIPLIED, not added." }
    ],
    connections: [
      { concept: "arithmetic_add", note: "Combining like terms is addition, with the variable as the unit." },
      { concept: "distribute", note: "This is distribution in reverse: $(a+b)x = ax + bx$." }
    ],
    examples: [
      { question: "Simplify $3x + 5x$.", answer: "8x", explanation: "Add the coefficients: $(3+5)x = 8x$. The variable stays $x$." },
      { question: "Simplify $4x + 2x$.", answer: "6x", explanation: "$ (4+2)x = 6x$ — six $x$s in total." }
    ]
  },

  distribute: {
    title: "The Distributive Property",
    formula: "a(x + b) = a x + a b",
    oneLineSummary: "Multiplying a group means multiplying EVERY term inside it — share the multiplier across the bracket.",
    intuitionHook: "Buying 4 combo meals, each a burger ($x$) plus 3-dollar fries: total $= 4(x + 3)$. That's 4 burgers AND 4 fries — $4x + 12$ — not 4 burgers and a lone 3. The multiplier reaches everything in the bag.",
    whatItIs: "The distributive property expands a product over a sum: $a(x + b)$ becomes $a x + a b$. The outside factor multiplies each term inside the parentheses.",
    whyItWorks: "$a(x+b)$ means $a$ copies of the whole group $(x+b)$. With $a$ copies you get $a$ of the $x$s AND $a$ of the $b$s — that's $ax + ab$. Pictured as area: a rectangle of height $a$ and width $(x+b)$ splits into an $a$-by-$x$ piece and an $a$-by-$b$ piece, whose areas $ax$ and $ab$ add to the whole. The multiplier must touch BOTH terms because both are inside the group being copied.",
    whenToUse: "Expanding brackets before combining terms or solving, mental-math splits ($7 \\times 14 = 7(10+4)$), factoring in reverse, and almost every multi-step algebra simplification.",
    representations: [
      { kind: "area_model", label: "Split the rectangle", body: "An $a \\times (x+b)$ rectangle divides into $a\\times x$ and $a\\times b$: areas $ax$ and $ab$." },
      { kind: "symbolic", label: "Multiply each term", body: "$4(x + 3) = 4\\cdot x + 4\\cdot 3 = 4x + 12$." },
      { kind: "real_world", label: "Copies of a group", body: "$4$ combos of (burger $+$ 3 fries) is $4$ burgers and $12$ fries: $4x + 12$." }
    ],
    commonMistakes: [
      { label: "Distributing to only the first term", why: "Writing $4(x + 3) = 4x + 3$, multiplying the $x$ but leaving the $3$ untouched.", fix: "The factor multiplies EVERY term inside: $4\\times x$ and $4\\times 3$. The constant gets multiplied too." },
      { label: "Adding instead of multiplying the constant", why: "Writing $4(x+3) = 4x + 7$, adding $4+3$ instead of multiplying.", fix: "Inside the bracket each term is MULTIPLIED by the outside factor: $4 \\times 3 = 12$, not $4 + 3$." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Distribution is the area-model of multiplication, splitting one factor into a sum." },
      { concept: "combine_like_terms", note: "Expanding often produces like terms to collect next." },
      { concept: "linear_two_step", note: "Solving equations with brackets starts by distributing." }
    ],
    examples: [
      { question: "Expand $4(x + 3)$.", answer: "4x + 12", explanation: "Multiply the $4$ by each term: $4\\cdot x + 4\\cdot 3 = 4x + 12$." },
      { question: "Expand $2(x + 5)$.", answer: "2x + 10", explanation: "$2\\cdot x + 2\\cdot 5 = 2x + 10$." }
    ]
  },

  // ===========================================================================
  // POWERS STRAND (exponents & roots — the 8.EE band).
  // ===========================================================================
  square_root: {
    title: "Square Roots",
    formula: "\\sqrt{n} = r \\iff r \\times r = n",
    oneLineSummary: "The square root asks: which number, multiplied by itself, makes this? It undoes squaring.",
    intuitionHook: "A square garden covers $64$ square meters. How long is one side? You need the number that times itself gives $64$ — that's $8$. The root of a square is literally the SIDE of a square.",
    whatItIs: "The square root of $n$ is the non-negative number $r$ with $r \\times r = n$. Numbers like $25$, $49$ and $144$ are perfect squares because their roots are whole numbers.",
    whyItWorks: "Squaring and rooting are inverse operations, like adding and subtracting. $7^2$ takes you from $7$ to $49$; $\\sqrt{49}$ walks the exact same step backwards. That's why $\\sqrt{n}$ is found by asking which times-table entry lands on $n$ — not by any operation on $n$ itself. Halving feels tempting because it also 'shrinks' the number, but halving undoes doubling, not squaring: $\\sqrt{36} = 6$, while $36 \\div 2 = 18$ — and $18 \\times 18$ is nowhere near $36$.",
    whenToUse: "Finding a side from an area, distance calculations (the Pythagorean theorem ends with a root), standard deviation in statistics, and solving $x^2 = n$ equations.",
    representations: [
      { kind: "area", label: "Side of a square", body: "$\\sqrt{64}$ is the side length of a square with area $64$: an $8 \\times 8$ grid of unit squares." },
      { kind: "inverse", label: "Squaring, reversed", body: "$3 \\to 9 \\to 3$: squaring goes right, rooting goes left along the same arrow." },
      { kind: "number_line", label: "Between the squares", body: "$\\sqrt{50}$ sits just past $7$, because $49 = 7^2$ is just below $50$ — perfect squares are the landmarks." }
    ],
    commonMistakes: [
      { label: "Halving instead of rooting", why: "Writing $\\sqrt{36} = 18$ — dividing by $2$ because the root 'makes it smaller'.", fix: "Check by multiplying back: $18 \\times 18 = 324$, not $36$. Ask 'what times itself?' — $6 \\times 6 = 36$." },
      { label: "Neighboring square slip", why: "Recalling $\\sqrt{49}$ as $8$ because $49$ sits near $64$ in the times tables.", fix: "Anchor the perfect squares as facts: $7^2 = 49$, $8^2 = 64$. Verify by squaring your answer." }
    ],
    connections: [
      { concept: "arithmetic_mult", note: "Roots are reverse multiplication — fluency with times tables is fluency with roots." },
      { concept: "pythagorean", note: "The Pythagorean theorem's last step is always a square root." },
      { concept: "quadratic", note: "Solving $x^2 = n$ — the simplest quadratic — is exactly taking a root." }
    ],
    examples: [
      { question: "Compute $\\sqrt{81}$.", answer: "9", explanation: "$9 \\times 9 = 81$, so $\\sqrt{81} = 9$." },
      { question: "Compute $\\sqrt{144}$.", answer: "12", explanation: "$12 \\times 12 = 144$, so $\\sqrt{144} = 12$." }
    ]
  },

  exponent_product_rule: {
    title: "Product Rule for Exponents",
    formula: "x^{a} \\cdot x^{b} = x^{a+b}",
    oneLineSummary: "Multiplying powers of the same base ADDS the exponents — you're pooling copies of the same factor.",
    intuitionHook: "$x^{3} \\cdot x^{4}$ is $(x \\cdot x \\cdot x)$ times $(x \\cdot x \\cdot x \\cdot x)$. Pour both piles together and count: $3 + 4 = 7$ copies of $x$. Nothing was multiplied except the $x$'s themselves.",
    whatItIs: "The product rule simplifies a product of two powers that share a base: keep the base, add the exponents. It only applies when the bases match.",
    whyItWorks: "An exponent is a COUNT of repeated factors. $x^{a}$ contributes $a$ copies of $x$ and $x^{b}$ contributes $b$ more, so the product holds $a + b$ copies: $x^{a+b}$. Multiplying the exponents instead answers a different question — $(x^{a})^{b}$ makes $b$ copies of the whole pile, which is $a \\times b$ copies (the power rule). Try it small: $2^{2} \\cdot 2^{3} = 4 \\cdot 8 = 32 = 2^{5}$, and $5 = 2 + 3$, not $2 \\times 3$.",
    whenToUse: "Simplifying algebraic products, scientific-notation multiplication, exponential growth (combining growth periods), and polynomial multiplication.",
    representations: [
      { kind: "expansion", label: "Count the copies", body: "$x^{2} \\cdot x^{3} = (x \\cdot x)(x \\cdot x \\cdot x) = x^{5}$ — write it out once and the rule is obvious." },
      { kind: "numeric", label: "Check with numbers", body: "$2^{2} \\cdot 2^{3} = 4 \\times 8 = 32 = 2^{5}$. The exponents added: $2 + 3 = 5$." },
      { kind: "symbolic", label: "The rule", body: "$x^{a} \\cdot x^{b} = x^{a+b}$ — same base, exponents add." }
    ],
    commonMistakes: [
      { label: "Multiplying the exponents", why: "Writing $x^{3} \\cdot x^{4} = x^{12}$ — confusing the product rule with the power rule $(x^{3})^{4}$.", fix: "Expand a small case: $x^{1} \\cdot x^{1} = x^{2}$, not $x^{1}$. Multiplying powers pools copies, so the counts ADD." },
      { label: "Applying it to different bases", why: "Simplifying $x^{2} \\cdot y^{3}$ to $(xy)^{5}$.", fix: "The rule needs ONE shared base. $x^{2} y^{3}$ is already as simple as it gets." }
    ],
    connections: [
      { concept: "exponent_power", note: "Evaluating single powers is the prerequisite skill — the rule organizes products of them." },
      { concept: "exponent_quotient_rule", note: "Division is the mirror image: exponents subtract instead of add." },
      { concept: "scientific_notation", note: "Multiplying numbers in scientific notation adds the powers of 10 by this exact rule." }
    ],
    examples: [
      { question: "Simplify $x^{2} \\cdot x^{5}$.", answer: "x^7", explanation: "Same base, add the exponents: $2 + 5 = 7$, so $x^{7}$." },
      { question: "Simplify $x^{4} \\cdot x^{4}$.", answer: "x^8", explanation: "$4 + 4 = 8$, so $x^{8}$." }
    ]
  },

  exponent_quotient_rule: {
    title: "Quotient Rule for Exponents",
    formula: "\\frac{x^{a}}{x^{b}} = x^{a-b}",
    oneLineSummary: "Dividing powers of the same base SUBTRACTS the exponents — each factor below cancels one above.",
    intuitionHook: "$\\frac{x^{5}}{x^{2}}$ is five $x$'s stacked over two $x$'s. Each bottom $x$ cancels one top $x$ — strike out two pairs and $3$ survive: $x^{3}$. Cancellation IS subtraction.",
    whatItIs: "The quotient rule simplifies a power divided by a power of the same base: keep the base, subtract the bottom exponent from the top one.",
    whyItWorks: "Write the division as a fraction of repeated factors: $\\frac{x \\cdot x \\cdot x \\cdot x \\cdot x}{x \\cdot x}$. Every $\\frac{x}{x}$ pair equals $1$ and disappears, removing one factor from the top per factor on the bottom — that's $a - b$ survivors. Dividing the exponents instead answers nothing meaningful: $\\frac{2^{6}}{2^{2}} = \\frac{64}{4} = 16 = 2^{4}$, and $4 = 6 - 2$, while $6 \\div 2 = 3$ gives the wrong answer $8$.",
    whenToUse: "Simplifying algebraic fractions, scientific-notation division, unit conversions with powers of 10, and deriving the zero/negative exponent meanings.",
    representations: [
      { kind: "cancellation", label: "Strike out pairs", body: "$\\frac{x^{5}}{x^{2}} = \\frac{x \\cdot x \\cdot x \\cdot x \\cdot x}{x \\cdot x}$ — each bottom $x$ cancels one top $x$, leaving $x^{3}$." },
      { kind: "numeric", label: "Check with numbers", body: "$\\frac{2^{6}}{2^{2}} = \\frac{64}{4} = 16 = 2^{4}$, and $6 - 2 = 4$." },
      { kind: "symbolic", label: "The rule", body: "$\\frac{x^{a}}{x^{b}} = x^{a-b}$ — same base, exponents subtract, top minus bottom." }
    ],
    commonMistakes: [
      { label: "Dividing the exponents", why: "Writing $\\frac{x^{8}}{x^{4}} = x^{2}$ because $8 \\div 4 = 2$.", fix: "Cancellation removes one bottom factor per top factor — that's subtraction: $8 - 4 = 4$, so $x^{4}$." },
      { label: "Subtracting in the wrong order", why: "Computing $b - a$ and getting $x^{-4}$ where $x^{4}$ was expected.", fix: "Always top exponent minus bottom exponent. (When the bottom is bigger, the negative result is real — see negative exponents.)" }
    ],
    connections: [
      { concept: "exponent_product_rule", note: "The mirror rule: multiplying adds exponents, dividing subtracts them." },
      { concept: "exponent_zero_negative", note: "Push this rule past zero and negative exponents fall out naturally." },
      { concept: "fraction_simplify", note: "The same cancel-common-factors instinct, applied to repeated identical factors." }
    ],
    examples: [
      { question: "Simplify $\\frac{x^{7}}{x^{3}}$.", answer: "x^4", explanation: "Subtract the exponents: $7 - 3 = 4$, so $x^{4}$." },
      { question: "Simplify $\\frac{x^{9}}{x^{4}}$.", answer: "x^5", explanation: "$9 - 4 = 5$, so $x^{5}$." }
    ]
  },

  exponent_zero_negative: {
    title: "Zero & Negative Exponents",
    formula: "x^{0} = 1, \\quad x^{-k} = \\frac{1}{x^{k}}",
    oneLineSummary: "Anything (nonzero) to the power zero is 1, and a negative exponent flips the value into a fraction — it never makes it negative.",
    intuitionHook: "Walk down the powers of 2: $2^{3} = 8$, $2^{2} = 4$, $2^{1} = 2$ — each step divides by 2. Keep walking: $2^{0} = 1$, then $2^{-1} = \\frac{1}{2}$, $2^{-2} = \\frac{1}{4}$. The pattern never breaks, and it never goes negative.",
    whatItIs: "Zero and negative exponents extend the exponent staircase below 1. $x^{0} = 1$ for any nonzero $x$, and $x^{-k}$ means the reciprocal of $x^{k}$.",
    whyItWorks: "The quotient rule forces both facts. $\\frac{x^{3}}{x^{3}} = x^{3-3} = x^{0}$, but anything divided by itself is $1$ — so $x^{0} = 1$. Likewise $\\frac{x^{2}}{x^{5}} = x^{-3}$, and writing the same fraction out gives $\\frac{1}{x^{3}}$ after cancelling — so $x^{-3} = \\frac{1}{x^{3}}$. The minus sign in the exponent records 'one division step past zero', not 'a negative number': $2^{-3} = \\frac{1}{8}$, which is small and positive.",
    whenToUse: "Scientific notation for small numbers ($10^{-6}$ = a millionth), unit prefixes (milli, micro, nano), algebraic simplification, and decay models.",
    representations: [
      { kind: "staircase", label: "Walk the staircase", body: "$2^{2} = 4$, $2^{1} = 2$, $2^{0} = 1$, $2^{-1} = \\frac{1}{2}$, $2^{-2} = \\frac{1}{4}$: each step down divides by the base." },
      { kind: "quotient", label: "Forced by division", body: "$\\frac{x^{3}}{x^{3}} = x^{0}$ and also $= 1$, so $x^{0} = 1$ — the rules leave no other choice." },
      { kind: "symbolic", label: "The rules", body: "$x^{0} = 1$; $x^{-k} = \\frac{1}{x^{k}}$ — the negative exponent is a flip below the fraction bar." }
    ],
    commonMistakes: [
      { label: "Deciding $x^{0} = 0$", why: "Zero in the exponent 'feels like nothing', so the answer feels like zero.", fix: "Walk the staircase: $2^{1} = 2$, divide by 2 once more → $2^{0} = 1$. Or: $\\frac{2^{5}}{2^{5}} = 1$ and its exponent is $0$." },
      { label: "Reading $x^{-k}$ as negative", why: "Writing $2^{-3} = -8$ — moving the minus sign onto the value.", fix: "The minus lives in the EXPONENT and means reciprocal: $2^{-3} = \\frac{1}{2^{3}} = \\frac{1}{8}$, positive and small." }
    ],
    connections: [
      { concept: "exponent_quotient_rule", note: "Both facts are the quotient rule pushed past equal exponents." },
      { concept: "fraction_simplify", note: "Negative exponents produce unit fractions — comfort with $\\frac{1}{n}$ pays off here." },
      { concept: "scientific_notation", note: "Small numbers in scientific notation run on negative powers of 10." }
    ],
    examples: [
      { question: "Evaluate $7^{0}$.", answer: "1", explanation: "Any nonzero number to the power $0$ is $1$." },
      { question: "Write $3^{-2}$ as a fraction.", answer: "1/9", explanation: "$3^{-2} = \\frac{1}{3^{2}} = \\frac{1}{9}$." }
    ]
  },

  scientific_notation: {
    title: "Scientific Notation",
    formula: "n = m \\times 10^{e}, \\quad 1 \\le m < 10",
    oneLineSummary: "Write a number as (something between 1 and 10) times a power of 10 — the exponent counts how far the decimal point moved.",
    intuitionHook: "Earth is about $150000000$ km from the Sun. Count zeros, lose your place, try again… or slide the decimal point until one digit remains in front — $1.5$ — and record the $8$ hops: $1.5 \\times 10^{8}$. The size lives in the exponent now, where you can actually read it.",
    whatItIs: "Scientific notation expresses any number as $m \\times 10^{e}$ where the mantissa $m$ is at least $1$ and less than $10$. Big numbers get positive exponents; numbers below 1 get negative ones.",
    whyItWorks: "Multiplying by $10$ shifts every digit one place left — so multiplying by $10^{e}$ shifts $e$ places. Writing $34000 = 3.4 \\times 10^{4}$ just factors the size (four shifts) out of the digits ($3.4$). The $1 \\le m < 10$ rule makes the form UNIQUE: $34 \\times 10^{3}$ and $0.34 \\times 10^{5}$ equal the same number, but only $3.4 \\times 10^{4}$ has exactly one digit before the point, so everyone writes the same thing and exponents can be compared at a glance.",
    whenToUse: "Astronomy and atomic scales, calculator and computer output (the E notation), comparing magnitudes instantly, and keeping track of zeros in any huge or tiny measurement.",
    representations: [
      { kind: "decimal_shift", label: "Slide and count", body: "$34000 \\rightarrow 3.4$ took $4$ left-hops, so $34000 = 3.4 \\times 10^{4}$. Reverse the hops to expand it back." },
      { kind: "magnitude", label: "Compare by exponent", body: "$9.9 \\times 10^{5} < 1.1 \\times 10^{6}$: the exponent outranks the mantissa, like comparing word lengths before letters." },
      { kind: "symbolic", label: "The form", body: "$m \\times 10^{e}$ with $1 \\le m < 10$ — one nonzero digit before the decimal point, always." }
    ],
    commonMistakes: [
      { label: "Off-by-one exponent", why: "Counting the digits instead of the decimal SHIFTS: $34000$ has 5 digits but needs only $4$ hops.", fix: "Slide the point one hop at a time and count aloud, or expand your answer back out to check." },
      { label: "Mantissa outside 1–10", why: "Writing $34 \\times 10^{3}$ — correct in value, wrong in form.", fix: "Exactly ONE nonzero digit may sit before the decimal point. Keep sliding until $1 \\le m < 10$." }
    ],
    connections: [
      { concept: "decimal_mult", note: "Shifting the decimal point is multiplication by powers of 10 — the same mechanics." },
      { concept: "exponent_zero_negative", note: "Tiny numbers ($0.00052 = 5.2 \\times 10^{-4}$) use negative exponents." },
      { concept: "exponent_product_rule", note: "Multiplying scientific-notation numbers adds the powers of 10 by the product rule." }
    ],
    examples: [
      { question: "Write $52000$ in scientific notation.", answer: "5.2 × 10^4", explanation: "Slide the decimal $4$ places: $52000 = 5.2 \\times 10^{4}$." },
      { question: "Write $7300000$ in scientific notation.", answer: "7.3 × 10^6", explanation: "Six hops: $7300000 = 7.3 \\times 10^{6}$." }
    ]
  },

  // ===========================================================================
  // GRAPHING STRAND (linear graphing & the coordinate plane — 8.EE/8.F/8.G).
  // ===========================================================================
  point_on_line: {
    title: "Points on a Line",
    formula: "y = mx + b",
    oneLineSummary: "A line's equation is a rule: feed in any x, multiply by the slope, add the intercept — out comes the y that sits on the line.",
    intuitionHook: "A taxi charges $3$ per kilometer plus a $\\$2$ flat fee: $y = 3x + 2$. Ride $4$ km and the fare is $3 \\cdot 4 + 2 = 14$. Every point on the line $(4, 14)$ is one possible ride — the equation IS the price list, written as geometry.",
    whatItIs: "The equation $y = mx + b$ pairs every $x$ with exactly one $y$. A point $(x, y)$ lies on the line precisely when its coordinates make the equation true — so evaluating the right side at $x$ produces the partner $y$.",
    whyItWorks: "The equation encodes two separate actions, in a fixed order: the slope $m$ scales $x$ (every unit of $x$ contributes $m$ to $y$), and only THEN the intercept $b$ shifts the whole result up or down once. Order matters because multiplication distributes: $3(x + 2)$ would charge the flat fee per kilometer — $3x + 6$, a different line entirely. Multiply first, shift last, and you trace the exact same line the graph draws.",
    whenToUse: "Any constant-rate-plus-starting-value situation: fares and fees, temperature conversion, checking whether a data point sits on a trend line, and reading predictions off a linear model.",
    representations: [
      { kind: "table", label: "An input–output machine", body: "$y = 2x + 1$: feed $x = 0, 1, 2, 3$ and out come $1, 3, 5, 7$ — each step right adds the slope once." },
      { kind: "graphical", label: "A point ON the line", body: "$(4, 14)$ sits on $y = 3x + 2$ because climbing from the intercept $2$ by four slope-steps of $3$ lands exactly at height $14$." },
      { kind: "story", label: "Rate plus starting value", body: "Slope = price per unit, intercept = flat fee. The line is every possible total, drawn at once." }
    ],
    commonMistakes: [
      { label: "Forgetting the intercept", why: "Computing $y = 3 \\cdot 4 = 12$ and stopping — the flat fee never gets added.", fix: "The equation has TWO parts. After multiplying by the slope, always apply the constant: $12 + 2 = 14$." },
      { label: "Adding before multiplying", why: "Computing $3(4 + 2) = 18$ — letting the intercept sneak inside the multiplication.", fix: "Order of operations: the slope multiplies $x$ alone. The intercept joins by addition afterwards, exactly once." }
    ],
    connections: [
      { concept: "eval_expression", note: "Evaluating $mx + b$ at a value IS expression evaluation — the same substitute-then-simplify skill." },
      { concept: "slope_from_points", note: "Walk between two points the machine produced and you recover the slope." },
      { concept: "slope_intercept_id", note: "Next step: read $m$ and $b$ straight off the equation without evaluating anything." }
    ],
    examples: [
      { question: "The line $y = 2x + 3$ — what is $y$ when $x = 5$?", answer: "13", explanation: "Multiply first: $2 \\cdot 5 = 10$, then add the intercept: $10 + 3 = 13$." },
      { question: "The line $y = 4x - 1$ — what is $y$ when $x = 3$?", answer: "11", explanation: "$4 \\cdot 3 = 12$, then $12 - 1 = 11$." }
    ]
  },

  slope_from_points: {
    title: "Slope Between Two Points",
    formula: "m = \\frac{y_2 - y_1}{x_2 - x_1}",
    oneLineSummary: "Slope is rise over run — how much the line climbs for every one step it moves right.",
    intuitionHook: "Two signposts on a hiking trail: at kilometer $2$ you're at $100$ m altitude, at kilometer $5$ you're at $160$ m. You climbed $60$ m over $3$ km — that's $20$ m of climb per km. You just computed a slope, and no triangle in math class is steeper than this trail made it feel.",
    whatItIs: "The slope of the line through $(x_1, y_1)$ and $(x_2, y_2)$ is the change in $y$ divided by the change in $x$. Positive slopes climb left-to-right, negative slopes fall, and the size says how fast.",
    whyItWorks: "A line is the shape with a CONSTANT rate: between any two of its points, the ratio rise/run comes out identical — that's what makes it straight. Dividing $y_2 - y_1$ by $x_2 - x_1$ measures that rate. The order rule exists because both differences must be walked in the SAME direction: swap only one of them and you've measured the climb walking east but the distance walking west, so the sign flips. Swap both and the minus signs cancel — $\\frac{y_1 - y_2}{x_1 - x_2}$ gives the same slope.",
    whenToUse: "Rates of change everywhere: speed from two timestamps, price trends from two data points, gradients of ramps and roofs, and as the $m$ you need before writing a line's equation.",
    representations: [
      { kind: "graphical", label: "The slope triangle", body: "Connect $(1, 2)$ and $(4, 11)$: the horizontal leg runs $3$, the vertical leg rises $9$, so $m = \\frac{9}{3} = 3$." },
      { kind: "numeric", label: "Same line, any two points", body: "On $y = 2x$: from $(1,2)$ to $(3,6)$, $m = \\frac{4}{2} = 2$; from $(0,0)$ to $(5,10)$, $m = \\frac{10}{5} = 2$. The ratio never changes." },
      { kind: "story", label: "Climb per step", body: "Slope $-3$ means: every step right, the line drops $3$. The sign is the direction, the size is the steepness." }
    ],
    commonMistakes: [
      { label: "Mixing the subtraction order", why: "Computing $\\frac{y_2 - y_1}{x_1 - x_2}$ — walking the rise one way and the run the other — flips the sign.", fix: "Pick an order and use it in BOTH the top and the bottom: second point minus first point, twice." },
      { label: "Run over rise", why: "Dividing $\\Delta x$ by $\\Delta y$ — the fraction upside down.", fix: "RISE over RUN: the climb goes on top. A steep line should give a BIG number — sanity-check against the picture." }
    ],
    connections: [
      { concept: "integer_sub", note: "The differences are signed subtractions — negative coordinates make sign care essential." },
      { concept: "point_on_line", note: "The slope you measure here is the $m$ that equation multiplies by." },
      { concept: "distance_formula", note: "The same two legs (rise and run) give distance when squared under a root instead of divided." }
    ],
    examples: [
      { question: "What is the slope of the line through $(2, 3)$ and $(5, 12)$?", answer: "3", explanation: "$m = \\frac{12 - 3}{5 - 2} = \\frac{9}{3} = 3$." },
      { question: "What is the slope of the line through $(1, 8)$ and $(4, 2)$?", answer: "-2", explanation: "$m = \\frac{2 - 8}{4 - 1} = \\frac{-6}{3} = -2$ — the line falls left-to-right." }
    ]
  },

  slope_intercept_id: {
    title: "Slope–Intercept Form",
    formula: "y = mx + b \\quad (m = \\text{slope}, \\; b = \\text{y-intercept})",
    oneLineSummary: "In y = mx + b the two numbers have fixed jobs: m (glued to x) is the steepness, b (standing alone) is where the line crosses the y-axis.",
    intuitionHook: "$y = 2x + 30$ describes a phone plan: $\\$30$ base fee, $\\$2$ per GB. The $30$ is where you START (use nothing, pay $30$) and the $2$ is how fast the bill GROWS. Two numbers, two completely different jobs — and the equation wears them on its sleeve.",
    whatItIs: "Slope–intercept form writes a line so its two defining numbers are visible at a glance: the coefficient on $x$ is the slope $m$, and the lone constant is the $y$-intercept $b$ — the height where the line crosses the $y$-axis.",
    whyItWorks: "Set $x = 0$ and the slope term vanishes: $y = m \\cdot 0 + b = b$ — so the constant is literally the line's height at the $y$-axis, no computation needed. Now step $x$ up by $1$: $y$ changes from $mx + b$ to $m(x+1) + b$, a difference of exactly $m$ — so the coefficient is literally the climb per step. Each number controls one thing and cannot touch the other: changing $b$ slides the line up or down without tilting it; changing $m$ tilts it around the crossing point.",
    whenToUse: "Reading any linear model at a glance (start value + rate), sketching a line in seconds (dot at $b$, climb by $m$), comparing steepness of two lines, and setting up equations from word problems.",
    representations: [
      { kind: "graphical", label: "Dot, then climb", body: "$y = 2x - 1$: put a dot at $(0, -1)$, then go right $1$, up $2$, repeat. The whole line from two numbers." },
      { kind: "story", label: "Base fee + rate", body: "$b$ is what you pay before consuming anything; $m$ is the price per unit. Every linear bill reads this way." },
      { kind: "symbolic", label: "Each number, one job", body: "In $y = -3x + 5$: slope $-3$ (falls 3 per step), intercept $5$ (crosses the axis at height 5). Swap them and you describe a different line." }
    ],
    commonMistakes: [
      { label: "Swapping slope and intercept", why: "In $y = 4x - 7$, reporting the slope as $-7$ — grabbing the wrong number.", fix: "The slope is GLUED to $x$ by multiplication; the intercept stands alone. Ask: which number multiplies $x$? That's $m$, always." },
      { label: "Dropping the sign", why: "Reading the intercept of $y = 4x - 7$ as $7$ — the minus belongs to the constant.", fix: "Rewrite mentally as $y = 4x + (-7)$: the intercept is $-7$. The sign travels with its number." }
    ],
    connections: [
      { concept: "slope_from_points", note: "The $m$ here is exactly the rise-over-run you compute from two points." },
      { concept: "point_on_line", note: "Evaluating $mx + b$ at $x = 0$ is how the intercept earns its name." },
      { concept: "linear_two_step", note: "Solving $mx + b = c$ runs this form backwards — undo the add, then the multiply." }
    ],
    examples: [
      { question: "What is the slope of $y = 5x - 3$?", answer: "5", explanation: "The slope is the coefficient multiplying $x$: $m = 5$. The $-3$ is the $y$-intercept." },
      { question: "What is the $y$-intercept of $y = -2x + 6$?", answer: "6", explanation: "Set $x = 0$: $y = -2 \\cdot 0 + 6 = 6$. The lone constant is the crossing height." }
    ]
  },

  midpoint: {
    title: "Midpoint of a Segment",
    formula: "M = \\left( \\frac{x_1 + x_2}{2}, \\; \\frac{y_1 + y_2}{2} \\right)",
    oneLineSummary: "The midpoint is the average of the endpoints — average the x's, average the y's, and you're standing exactly halfway.",
    intuitionHook: "You live at house number $30$, your friend at number $80$. Where do you meet halfway? At $\\frac{30 + 80}{2} = 55$ — the AVERAGE. The midpoint formula just does this twice: once for the street running east–west ($x$) and once for the street running north–south ($y$).",
    whatItIs: "The midpoint of the segment from $(x_1, y_1)$ to $(x_2, y_2)$ is the point exactly halfway along it. Each of its coordinates is the average of the matching endpoint coordinates.",
    whyItWorks: "Halfway means: walk half the difference from the start. Half of $x_2 - x_1$ added to $x_1$ gives $x_1 + \\frac{x_2 - x_1}{2} = \\frac{2x_1 + x_2 - x_1}{2} = \\frac{x_1 + x_2}{2}$ — the average, by algebra, not coincidence. The two coordinates are independent (moving east never changes how far north you are), so halving each axis separately lands exactly halfway along the diagonal too.",
    whenToUse: "Meeting points and centers: the center of a circle from a diameter's ends, the balance point of two locations, bisecting a segment in constructions, and averaging paired data.",
    representations: [
      { kind: "graphical", label: "Halfway along the diagonal", body: "From $(1, 3)$ to $(7, 11)$: the midpoint $(4, 7)$ sits at the center of the segment — half the run ($3$) and half the rise ($4$) from the start." },
      { kind: "numeric", label: "Just two averages", body: "$M_x = \\frac{1 + 7}{2} = 4$, $\\; M_y = \\frac{3 + 11}{2} = 7$. Each axis is the house-number problem again." },
      { kind: "balance", label: "The balance point", body: "Put equal weights at the endpoints — the segment balances exactly at the midpoint, the way a mean balances a data set." }
    ],
    commonMistakes: [
      { label: "Adding without halving", why: "Reporting $(x_1 + x_2, y_1 + y_2)$ — the sum lands PAST the far endpoint, not between them.", fix: "An average has two steps: add, then divide by $2$. Check: the midpoint must sit BETWEEN the endpoints on both axes." },
      { label: "Halving only the difference", why: "Computing $(\\frac{x_2 - x_1}{2}, \\frac{y_2 - y_1}{2})$ gives the half-STEP, not the halfway POINT — it forgets where the segment starts.", fix: "The half-difference must be added back to the starting point: $x_1 + \\frac{x_2 - x_1}{2}$. Or skip the detour and average directly." }
    ],
    connections: [
      { concept: "stat_mean", note: "Each coordinate is the mean of two values — the midpoint is a two-point average, drawn." },
      { concept: "point_on_line", note: "The midpoint always lies on the line through its endpoints — halfway in $x$ forces halfway in $y$." },
      { concept: "distance_formula", note: "The midpoint splits the segment into two pieces of equal distance — the formulas cross-check each other." }
    ],
    examples: [
      { question: "What is the midpoint of the segment from $(2, 5)$ to $(8, 9)$?", answer: "(5, 7)", explanation: "Average each axis: $\\frac{2 + 8}{2} = 5$ and $\\frac{5 + 9}{2} = 7$." },
      { question: "What is the midpoint of the segment from $(1, 4)$ to $(7, 12)$?", answer: "(4, 8)", explanation: "$\\frac{1 + 7}{2} = 4$ and $\\frac{4 + 12}{2} = 8$." }
    ]
  },

  distance_formula: {
    title: "Distance Between Points",
    formula: "d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}",
    oneLineSummary: "The distance between two points is the Pythagorean theorem in disguise — square the horizontal and vertical gaps, add, take the root.",
    intuitionHook: "A city walker goes $3$ blocks east and $4$ blocks north — $7$ blocks of walking. A crow flies the straight diagonal: only $5$. The crow's shortcut is the hypotenuse of the triangle the walker traced, and the distance formula is how the crow does its math.",
    whatItIs: "The distance between $(x_1, y_1)$ and $(x_2, y_2)$ is the length of the straight segment joining them: the square root of the sum of the squared coordinate differences.",
    whyItWorks: "Drop a right triangle under the segment: the horizontal leg is $x_2 - x_1$, the vertical leg is $y_2 - y_1$, and the segment itself is the hypotenuse. The Pythagorean theorem gives $d^2 = (x_2-x_1)^2 + (y_2-y_1)^2$; rooting both sides frees $d$. Squaring is what makes direction irrelevant — a gap of $-3$ squares to the same $9$ as $+3$ — so the formula works in every quadrant without case-checking.",
    whenToUse: "Straight-line distances on maps and grids, radii from a center to a point, checking whether triangles are isosceles, collision distances in games, and anywhere 'how far apart' has a diagonal answer.",
    representations: [
      { kind: "graphical", label: "The hidden right triangle", body: "From $(1, 2)$ to $(4, 6)$: legs $3$ and $4$ under the segment, so $d = \\sqrt{9 + 16} = \\sqrt{25} = 5$." },
      { kind: "story", label: "Walker vs crow", body: "Legs = the walker's blocks ($3 + 4 = 7$). Hypotenuse = the crow's flight ($5$). The diagonal always beats the corner." },
      { kind: "symbolic", label: "Pythagoras with coordinates", body: "$a^2 + b^2 = c^2$ where $a = \\Delta x$, $b = \\Delta y$, $c = d$. Same theorem, new clothes." }
    ],
    commonMistakes: [
      { label: "Adding the legs directly", why: "Reporting $3 + 4 = 7$ for legs $3$ and $4$ — that's the walk around the corner, not the straight line.", fix: "Legs combine as SQUARES: $\\sqrt{3^2 + 4^2} = 5$. The straight-line distance is always SHORTER than the leg sum." },
      { label: "Forgetting the square root", why: "Stopping at $d^2 = 25$ and answering $25$.", fix: "The theorem hands you the SQUARED distance. The last step is always the root: sanity-check that the answer is bigger than each leg but smaller than their sum." }
    ],
    connections: [
      { concept: "pythagorean", note: "This IS the Pythagorean theorem — the coordinate grid just builds the right triangle for you." },
      { concept: "square_root", note: "The final step is a square root; Pythagorean triples keep it whole." },
      { concept: "slope_from_points", note: "Same two legs ($\\Delta x$, $\\Delta y$): divided they give slope, squared under a root they give distance." }
    ],
    examples: [
      { question: "What is the distance between $(1, 1)$ and $(4, 5)$?", answer: "5", explanation: "Legs $3$ and $4$: $d = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$." },
      { question: "What is the distance between $(2, 3)$ and $(8, 11)$?", answer: "10", explanation: "Legs $6$ and $8$: $d = \\sqrt{36 + 64} = \\sqrt{100} = 10$." }
    ]
  },

  // ===========================================================================
  // INEQUALITIES STRAND (order reasoning — the 6.EE/7.EE band).
  // ===========================================================================
  inequality_one_step_add: {
    title: "One-Step Inequalities (Add/Subtract)",
    formula: "x + a > b \\implies x > b - a",
    oneLineSummary: "Solve an inequality the way you solve an equation — slide the same amount off both sides — and the < or > sign just comes along for the ride.",
    intuitionHook: "Your backpack holds at most $10$ kg and your books already weigh $3$ kg. How much MORE can you pack? Anything up to $7$ kg — not exactly $7$, anything UP TO it. That 'anything up to' is what an inequality says that an equation can't: the answer is a whole range, not one number.",
    whatItIs: "An inequality like $x + 3 > 10$ states that one side is bigger than the other. Solving it means isolating $x$ — and the solution is every number that works, written as a range like $x > 7$.",
    whyItWorks: "If one pile is heavier than another, adding the same weight to both piles — or removing it from both — keeps the heavier pile heavier. That's why adding or subtracting on both sides NEVER changes the direction of the sign: $x + 3 > 10$ and $x > 7$ describe the same set of numbers. Test it: $x = 8$ satisfies both; $x = 6$ fails both. The sign only ever flips for one specific reason (multiplying or dividing by a negative), and that reason never appears in this step.",
    whenToUse: "Budgets and capacity limits ('at most', 'at least'), minimum scores needed, age and height restrictions — any constraint where the answer is a range, not a single value.",
    representations: [
      { kind: "number_line", label: "A ray, not a point", body: "$x > 7$ is an open dot at $7$ with an arrow to the right — infinitely many solutions, drawn at once." },
      { kind: "balance", label: "An unbalanced scale", body: "$x + 3 > 10$: the left pan hangs heavier. Take $3$ off BOTH pans and it still hangs heavier: $x > 7$." },
      { kind: "story", label: "'At most' and 'at least'", body: "'You need at least $\\$25$ and you have $\\$9$': $9 + x \\ge 25$, so $x \\ge 16$ — every amount from $16$ up works." }
    ],
    commonMistakes: [
      { label: "Treating it as an equation", why: "Answering $x = 7$ for $x + 3 > 10$ — collapsing a whole range into a single number (which isn't even a solution here).", fix: "Keep the inequality sign through every step. The answer should still HAVE a $>$ or $<$ in it — check one number from your range in the original." },
      { label: "Flipping for no reason", why: "Writing $x < 7$ — over-applying the famous flip rule to a step that never triggers it.", fix: "The flip belongs to ONE move only: multiplying or dividing by a negative. Adding and subtracting never flip. Test $x = 8$: it satisfies $x + 3 > 10$, so the arrow must point toward it." }
    ],
    connections: [
      { concept: "linear_one_step", note: "The same one-step isolation — inequalities just keep a direction sign instead of an equals sign." },
      { concept: "inequality_one_step_mult", note: "Next: isolating x when it's multiplied — still no flip while the numbers stay positive." },
      { concept: "integer_add", note: "Ranges often cross zero — signed-number fluency keeps the endpoints honest." }
    ],
    examples: [
      { question: "Solve $x + 5 > 12$.", answer: "x > 7", explanation: "Subtract $5$ from both sides: $x > 7$. The $>$ never moves for subtraction." },
      { question: "Solve $x - 4 < 6$.", answer: "x < 10", explanation: "Add $4$ to both sides: $x < 10$." }
    ]
  },

  inequality_one_step_mult: {
    title: "One-Step Inequalities (Multiply/Divide)",
    formula: "ax < b \\implies x < \\tfrac{b}{a} \\quad (a > 0)",
    oneLineSummary: "Dividing both sides by a positive number keeps the inequality pointing exactly the same way.",
    intuitionHook: "Three identical tickets cost less than $\\$24$ in total — so one ticket costs less than $\\$8$. You just divided both sides of $3x < 24$ by $3$, and no part of you wanted to flip the 'less than'. Positive division preserves order; your intuition already knows it.",
    whatItIs: "Inequalities like $3x < 24$ isolate $x$ by dividing both sides by the coefficient. While that coefficient is positive, the direction of the inequality is untouched: $x < 8$.",
    whyItWorks: "Scaling two quantities by the same POSITIVE factor preserves their order — if one stack of coins is shorter than another, taking a third of each stack keeps the shorter one shorter. Formally: $3x < 24$ means $x$ tripled still falls below $24$, so $x$ itself falls below a third of $24$. The reason this needs saying at all is the negative case (next concept): multiplying by $-1$ MIRRORS the number line and reverses every order. Positive scaling does no mirroring, so nothing reverses.",
    whenToUse: "Unit prices from totals, speed limits from distances and times, sharing constraints ('the per-person cost must stay under...'), and the divide step inside every two-step inequality.",
    representations: [
      { kind: "numeric", label: "Check a value", body: "$3x < 24 \\to x < 8$. Try $x = 5$: $15 < 24$ ✓ and $5 < 8$ ✓ — both statements agree, no flip happened." },
      { kind: "stacks", label: "Scaling keeps order", body: "A 6-coin stack is shorter than a 9-coin stack; a third of each (2 vs 3) is STILL shorter. Positive scaling never reorders." },
      { kind: "number_line", label: "Stretching, not mirroring", body: "Dividing by $3$ squeezes the number line toward zero — points keep their left-to-right order." }
    ],
    commonMistakes: [
      { label: "Flipping for a positive divisor", why: "Learning 'dividing flips the sign' as a blanket rule and writing $3x < 24 \\to x > 8$.", fix: "The flip rule has one trigger: a NEGATIVE multiplier or divisor. Before flipping, ask: is the number I'm dividing by negative? If not, hands off the sign." },
      { label: "Subtracting the coefficient", why: "Turning $3x < 24$ into $x < 21$ — undoing multiplication with subtraction.", fix: "$3x$ means $3$ TIMES $x$; its inverse is division. $x < 24 \\div 3 = 8$. Check: $x = 21$ gives $63 < 24$ — false." }
    ],
    connections: [
      { concept: "inequality_one_step_add", note: "The add/subtract step — together they solve anything one-step." },
      { concept: "inequality_flip_negative", note: "The crucial exception: a NEGATIVE divisor mirrors the line and flips the sign." },
      { concept: "arithmetic_div", note: "The inverse-operation instinct: undo a multiply with a divide." }
    ],
    examples: [
      { question: "Solve $4x < 20$.", answer: "x < 5", explanation: "Divide both sides by $4$ (positive — no flip): $x < 5$." },
      { question: "Solve $5x > 35$.", answer: "x > 7", explanation: "Divide by $5$: $x > 7$. The direction is preserved." }
    ]
  },

  inequality_flip_negative: {
    title: "Flip on Negative",
    formula: "-ax < b \\implies x > -\\tfrac{b}{a} \\quad (a > 0)",
    oneLineSummary: "Multiplying or dividing an inequality by a negative number mirrors the number line — so the inequality sign must flip.",
    intuitionHook: "$3 < 5$, obviously. Now multiply both by $-1$: is $-3 < -5$? No — owing $3$ is BETTER than owing $5$, so $-3 > -5$. Negation turned the bigger number into the smaller one. Every time a negative multiplies through an inequality, this same reversal happens — and the sign has to flip to keep telling the truth.",
    whatItIs: "When solving inequalities like $-2x < 6$, the final step divides by a negative. That division reverses the order of every pair of numbers, so the inequality symbol reverses too: $x > -3$.",
    whyItWorks: "Multiplying by a negative number reflects the entire number line through zero: right becomes left, bigger becomes smaller. Any true statement about order ('$a$ is left of $b$') becomes false after the mirror unless the sign flips with it. Watch it concretely: $-2x < 6$ is satisfied by $x = 0$ (since $0 < 6$). Divide by $-2$ WITHOUT flipping and you'd get $x < -3$ — which excludes $0$. The flipped version $x > -3$ keeps $0$, matching reality. The flip isn't a ritual; it's the mirror's paperwork.",
    whenToUse: "Whenever the variable carries a negative coefficient: cooling rates, debts and losses, 'fewer than' constraints, and rearranging any inequality where you move the variable across the sign.",
    representations: [
      { kind: "mirror", label: "The number-line mirror", body: "Multiply by $-1$: the point $3$ lands on $-3$, the point $5$ on $-5$. Their left-right order swaps — that swap IS the flip." },
      { kind: "numeric", label: "Test a witness", body: "$-2x < 6$: try $x = 0 \\to 0 < 6$ ✓. So the solution must CONTAIN $0$: $x > -3$ does, $x < -3$ doesn't." },
      { kind: "table", label: "Watch the order reverse", body: "$1 < 2 < 3$ becomes $-1 > -2 > -3$ after negation — every comparison reverses at once." }
    ],
    commonMistakes: [
      { label: "Forgetting the flip", why: "Dividing $-2x < 6$ by $-2$ and writing $x < -3$ — the single most common inequality error in algebra.", fix: "Make the test-a-number check a habit: pick an easy value like $0$, see if it satisfies the ORIGINAL, and make sure your answer agrees. The flip will catch itself." },
      { label: "Flipping the sign of the answer instead", why: "Turning $-2x < 6$ into $x < 3$ or $x > 3$ — negating the VALUE when the SYMBOL was the thing that needed flipping.", fix: "Two separate things happen: the value gets its sign from arithmetic ($6 \\div (-2) = -3$), the symbol flips because the divisor is negative. Do both, separately: $x > -3$." }
    ],
    connections: [
      { concept: "inequality_one_step_mult", note: "The positive case it contrasts with — same move, opposite paperwork." },
      { concept: "integer_mult", note: "Sign rules for negatives power the arithmetic half of the step." },
      { concept: "inequality_two_step", note: "Two-step problems hide a possible flip in their final division — stay alert." }
    ],
    examples: [
      { question: "Solve $-3x < 12$.", answer: "x > -4", explanation: "Divide by $-3$ AND flip: $x > \\frac{12}{-3} = -4$. Check with $x=0$: $0 < 12$ ✓ and $0 > -4$ ✓." },
      { question: "Solve $-2x > -10$.", answer: "x < 5", explanation: "Divide by $-2$, flip the $>$ to $<$: $x < 5$. The two negatives cancel in the VALUE, but the flip still happens." }
    ]
  },

  inequality_two_step: {
    title: "Two-Step Inequalities",
    formula: "ax + b \\le c \\implies x \\le \\tfrac{c - b}{a} \\quad (a > 0)",
    oneLineSummary: "Unwrap the inequality in reverse order — subtract the constant first, divide by the coefficient second — flipping only if that divisor is negative.",
    intuitionHook: "A taxi charges a $\\$2$ flat fee plus $\\$3$ per km, and you have at most $\\$14$: $3x + 2 \\le 14$. Peel the fee off first ($3x \\le 12$), then split by the rate ($x \\le 4$). You can ride at most $4$ km — and you solved it exactly the way you'd un-dress the expression: last operation off first.",
    whatItIs: "Two-step inequalities wrap $x$ in a multiplication and an addition: $ax + b \\le c$. Solving reverses both operations in backwards order, keeping the inequality sign honest at each step.",
    whyItWorks: "Building $3x + 2$ from $x$ applies 'times 3' THEN 'plus 2' — so dismantling it must undo 'plus 2' first, 'times 3' second (socks on before shoes; shoes off before socks). Each undo obeys its own sign rule: the subtraction step never flips, and the division step flips only when the coefficient is negative. With $a = 3 > 0$ nothing flips, and each step produces an inequality with exactly the same solution set as the one before — that's why the final $x \\le 4$ answers the original question.",
    whenToUse: "Budget problems with a fixed cost plus a rate (rentals, taxis, phone plans), score targets with a baseline, and as the template for solving ANY linear inequality.",
    representations: [
      { kind: "unwrap", label: "Peel in reverse", body: "$3x + 2 \\le 14 \\to 3x \\le 12 \\to x \\le 4$: the $+2$ came last, so it leaves first." },
      { kind: "story", label: "Flat fee + rate", body: "Budget $\\$14$, fee $\\$2$, rate $\\$3$/km: after the fee, $\\$12$ remains, which buys at most $4$ km." },
      { kind: "number_line", label: "A closed ray", body: "$x \\le 4$: a filled dot at $4$ (the $\\le$ includes it) and everything to the left." }
    ],
    commonMistakes: [
      { label: "Dividing before subtracting", why: "Hitting $3x + 2 \\le 14$ with $\\div 3$ first gives $x + \\frac{2}{3} \\le \\frac{14}{3}$ — legal but messy, and usually botched.", fix: "Undo operations in REVERSE order of how the expression was built: constants peel off before coefficients." },
      { label: "Stopping at the multiplication", why: "Reaching $3x \\le 12$ and reporting $x \\le 12$ — the coefficient never got divided away.", fix: "The goal is a bare $x$. If a number still multiplies it, you're one step short: $x \\le 12 \\div 3 = 4$." }
    ],
    connections: [
      { concept: "linear_two_step", note: "The identical two-step unwrap with an equals sign — inequalities add only the sign-direction bookkeeping." },
      { concept: "inequality_flip_negative", note: "When the coefficient is negative, the final division flips the sign — the two skills combine." },
      { concept: "inequality_compound", note: "Next: the same moves applied to all three parts of a sandwich at once." }
    ],
    examples: [
      { question: "Solve $2x + 3 \\le 11$.", answer: "x ≤ 4", explanation: "Subtract $3$: $2x \\le 8$. Divide by $2$: $x \\le 4$. Positive divisor — no flip." },
      { question: "Solve $4x + 1 \\le 13$.", answer: "x ≤ 3", explanation: "Subtract $1$, then divide by $4$: $x \\le 3$." }
    ]
  },

  inequality_compound: {
    title: "Compound Inequalities",
    formula: "a < x + b < c \\implies a - b < x < c - b",
    oneLineSummary: "A compound inequality is a sandwich with three parts — whatever you do to the middle, do to BOTH outer slices too.",
    intuitionHook: "A water park says: riders must be older than $8$ but younger than $14$. That's one rule with two walls: $8 < \\text{age} < 14$. Solving a compound inequality is just moving both walls by the same amount — if everyone waits two years, the rule becomes $10 < \\text{age+2} < 16$. Three parts, one motion.",
    whatItIs: "A compound inequality like $4 < x + 1 < 9$ chains two conditions into one statement: $x + 1$ exceeds $4$ AND stays below $9$. The solution is the strip between two bounds: $3 < x < 8$.",
    whyItWorks: "The chain $a < x + b < c$ is shorthand for two simultaneous inequalities, $a < x + b$ and $x + b < c$. Solving each one subtracts $b$ from both of ITS sides — and since the middle expression appears in both, the subtraction must reach all three positions of the chain. Skip one outer part and the two component inequalities no longer say the same thing, so the strip of solutions shifts off target. Each part getting the same treatment is exactly what keeps both conditions true at once.",
    whenToUse: "Ranges with two walls: acceptable temperatures, valid measurement tolerances, age brackets, scores between two cutoffs — any 'between' in a word problem.",
    representations: [
      { kind: "number_line", label: "A bounded strip", body: "$3 < x < 8$: open dots at $3$ and $8$, shading only BETWEEN them — unlike a one-sided ray, this solution set has two ends." },
      { kind: "split", label: "Two inequalities in a trench coat", body: "$4 < x + 1 < 9$ is '$4 < x + 1$' AND '$x + 1 < 9$' — solve both, keep the overlap: $3 < x$ and $x < 8$." },
      { kind: "story", label: "Two walls, one motion", body: "Both cutoffs shift together: subtract the same $b$ from the lower wall, the middle, and the upper wall." }
    ],
    commonMistakes: [
      { label: "Operating on one side only", why: "Subtracting $1$ from the middle and the right of $4 < x + 1 < 9$ but not the left gives $4 < x < 8$ — the lower wall is wrong.", fix: "Count to three: a compound inequality has THREE parts and every operation visits all of them. $4 - 1 < x < 9 - 1$." },
      { label: "Dropping a bound", why: "Reporting just $x < 8$ — the 'between' became a one-sided ray, admitting values like $x = -100$ that the original excludes.", fix: "The answer to a 'between' question must still BE a between: two bounds, with $x$ in the middle." }
    ],
    connections: [
      { concept: "inequality_two_step", note: "Each component is an ordinary inequality — the compound just solves both at once." },
      { concept: "inequality_one_step_add", note: "The same slide-both-sides move, extended to a third position." },
      { concept: "stat_range", note: "A solution strip has a width — the distance between its walls — much like a data range." }
    ],
    examples: [
      { question: "Solve $5 < x + 2 < 9$.", answer: "3 < x < 7", explanation: "Subtract $2$ from all three parts: $5 - 2 < x < 9 - 2$, so $3 < x < 7$." },
      { question: "Solve $2 < x + 1 < 6$.", answer: "1 < x < 5", explanation: "Subtract $1$ everywhere: $1 < x < 5$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY DEPTH (solid measurement — volume, surface area, circumference).
  // ===========================================================================
  geo_volume_rect: {
    title: "Volume of a Rectangular Prism",
    formula: "V = l \\times w \\times h",
    oneLineSummary: "Volume counts the unit cubes that fill a box: one floor of l×w cubes, stacked h floors high.",
    intuitionHook: "Pack a moving box with $1$-cm sugar cubes. The bottom layer is a neat $5 \\times 4$ grid — $20$ cubes. The box fits $3$ such layers, so $60$ cubes fill it completely. You never measured anything 'three-dimensional'; you counted a floor and multiplied by the floors.",
    whatItIs: "The volume of a rectangular prism (a box) is the amount of space inside it, measured in unit cubes: length times width times height, in cubic units.",
    whyItWorks: "Multiplication counts rectangular arrangements. The bottom layer is an $l \\times w$ ARRAY of unit cubes — that's the area fact you already know, $lw$ cubes. The box is $h$ layers of that identical floor, so the total is $lw$ taken $h$ times: $lwh$. That's also why volume units are CUBIC (cm³): each counted object is a little cube, $1$ long, $1$ wide, $1$ tall. Adding $l + w + h$ instead measures a walk along three edges — a length, not a filling.",
    whenToUse: "Capacity of boxes, rooms, tanks and drawers; shipping and storage; converting between liters and cubic centimeters; and as the base case for every other volume formula.",
    representations: [
      { kind: "layers", label: "Floors of cubes", body: "$5 \\times 4 \\times 3$: a floor of $20$ cubes, $3$ floors — $60$ cubes. Volume is repeated floor-counting." },
      { kind: "symbolic", label: "Three factors", body: "$V = lwh$ — the order doesn't matter ($5 \\cdot 4 \\cdot 3 = 3 \\cdot 4 \\cdot 5$): any face can be the 'floor'." },
      { kind: "units", label: "Why cm³", body: "Each counted cube is $1\\text{cm} \\times 1\\text{cm} \\times 1\\text{cm} = 1\\text{cm}^3$ — three lengths multiplied give a three-dimensional unit." }
    ],
    commonMistakes: [
      { label: "Adding the dimensions", why: "$5 + 4 + 3 = 12$ measures the length of three edges laid end to end — a 1-dimensional answer to a 3-dimensional question.", fix: "Volume FILLS; filling is repeated multiplication. Picture the cube layers: $5 \\times 4$ per floor, times $3$ floors." },
      { label: "Stopping at the base area", why: "Computing $5 \\times 4 = 20$ and forgetting the box has height — that's the floor, not the box.", fix: "Three dimensions need three factors. After the base area, multiply by the height: $20 \\times 3 = 60$." }
    ],
    connections: [
      { concept: "geo_area_rect", note: "The base layer IS the rectangle-area fact; volume adds one more factor." },
      { concept: "geo_volume_cylinder", note: "Same recipe with a round floor: base area times height." },
      { concept: "geo_surface_area_rect", note: "The same box measured differently: surface wraps, volume fills." }
    ],
    examples: [
      { question: "A box is $4$ units long, $5$ units wide and $3$ units tall. What is its volume?", answer: "60", explanation: "$V = lwh = 4 \\times 5 \\times 3 = 60$ cubic units." },
      { question: "A box is $3$ units long, $6$ units wide and $2$ units tall. What is its volume?", answer: "36", explanation: "Base layer $3 \\times 6 = 18$ cubes, stacked $2$ high: $36$." }
    ]
  },

  geo_surface_area_rect: {
    title: "Surface Area of a Rectangular Prism",
    formula: "SA = 2(lw + lh + wh)",
    oneLineSummary: "Surface area is the wrapping paper: a box has three different face shapes, each appearing exactly twice.",
    intuitionHook: "Gift-wrap a shoebox. The top and bottom match. The front and back match. The two ends match. Three different rectangle shapes, two of each — measure one of each, add them up, double the lot. That's the whole formula, discovered with wrapping paper.",
    whatItIs: "Surface area is the total area of all six faces of a box, in square units — how much material covers the outside, as opposed to how much space fills the inside.",
    whyItWorks: "A box has six faces but only three SHAPES: top/bottom are $l \\times w$, front/back are $l \\times h$, and the two ends are $w \\times h$. Opposite faces are congruent because the box's edges are parallel — the top is a translated copy of the bottom. So the six areas collapse to $2lw + 2lh + 2wh$, factored as $2(lw + lh + wh)$. Forgetting the $2$ wraps exactly half the box; computing $lwh$ answers a different question entirely (filling, not wrapping) — and even has the wrong units, cubic instead of square.",
    whenToUse: "Paint, wrapping paper, sheet metal, cardboard — any 'how much material covers it' question; heat loss through walls; comparing packaging efficiency (most volume per surface).",
    representations: [
      { kind: "net", label: "Unfold the box", body: "Cut along the edges and flatten: six rectangles in a cross shape — count the three matching pairs directly." },
      { kind: "pairs", label: "Three pairs", body: "$(l \\times w)$ twice, $(l \\times h)$ twice, $(w \\times h)$ twice: $SA = 2(lw + lh + wh)$." },
      { kind: "units", label: "Square, not cubic", body: "Wrapping is 2-dimensional even on a 3-D object — surface area always lands in cm², never cm³." }
    ],
    commonMistakes: [
      { label: "Forgetting each face's twin", why: "Adding $lw + lh + wh$ covers the top, the front and one end — half a box, with the other three faces bare.", fix: "Faces come in opposite PAIRS. After summing the three shapes, double: $2(lw + lh + wh)$." },
      { label: "Computing the volume instead", why: "$lwh$ measures the space inside, not the cover outside — the units betray it (cubic, not square).", fix: "Ask which question is being answered: FILL (multiply all three) or WRAP (sum the face areas). Paint never cares how much water fits inside." }
    ],
    connections: [
      { concept: "geo_area_rect", note: "Each face is a plain rectangle — surface area is six area problems batched." },
      { concept: "geo_volume_rect", note: "The wrap-vs-fill contrast: same box, square units vs cubic units." },
      { concept: "geo_perimeter_rect", note: "The boundary-vs-inside distinction, one dimension up." }
    ],
    examples: [
      { question: "A box is $3$ units long, $4$ units wide and $2$ units tall. What is its surface area?", answer: "52", explanation: "$2(lw + lh + wh) = 2(12 + 6 + 8) = 2 \\times 26 = 52$ square units." },
      { question: "A box is $5$ units long, $4$ units wide and $3$ units tall. What is its surface area?", answer: "94", explanation: "$2(20 + 15 + 12) = 2 \\times 47 = 94$ square units." }
    ]
  },

  geo_circumference: {
    title: "Circumference of a Circle",
    formula: "C = 2\\pi r = \\pi d",
    oneLineSummary: "The circumference is the distance around a circle — always exactly π times the diameter, for every circle ever drawn.",
    intuitionHook: "Wrap a string around a tin can, then lay the string flat and measure it against the can's width. The string is always a little more than $3$ widths long — about $3.14159...$ of them, no matter the can. That stubborn ratio is $\\pi$: not a formula someone invented, but a fact every circle keeps repeating.",
    whatItIs: "Circumference is a circle's perimeter — the length of its rim. It equals $\\pi$ times the diameter, or equivalently $2\\pi r$, since the diameter is two radii.",
    whyItWorks: "All circles are scaled copies of one another, and scaling multiplies every length by the same factor — so the ratio rim-to-diameter is identical for every circle. That universal ratio is what we NAME $\\pi$; '$C = \\pi d$' is almost its definition. The $2$ in $2\\pi r$ does exactly one job: turning a radius into a diameter ($d = 2r$). It is not part of $\\pi$'s magic — given a diameter, the formula is just $C = \\pi d$, and doubling again wraps the circle twice.",
    whenToUse: "Wheels and rotations (one turn travels one circumference), circular tracks and fences, pipe and tree-trunk girth, pulleys and belts, gear ratios.",
    representations: [
      { kind: "string", label: "Unroll the rim", body: "Roll a wheel one full turn: it travels exactly its circumference — the rim, laid out straight." },
      { kind: "ratio", label: "Always π widths", body: "Rim $\\div$ width $= \\pi$ for a coin, a plate, a planet. $C = \\pi d$ just rearranges that fact." },
      { kind: "contrast", label: "Rim vs inside", body: "$C = 2\\pi r$ is a LENGTH (one $r$, units cm); $A = \\pi r^2$ is an AREA (two $r$'s, units cm²). One $r$ walks the edge, two $r$'s tile the inside." }
    ],
    commonMistakes: [
      { label: "Mixing radius and diameter", why: "Using $\\pi r$ for circumference (half the rim), or applying the doubling $2$ to a DIAMETER (twice the rim).", fix: "The $2$ exists only to convert radius → diameter. Given $r$: $C = 2\\pi r$. Given $d$: $C = \\pi d$, the $2$ is already inside." },
      { label: "Squaring the radius", why: "Writing $C = \\pi r^2$ — reaching for the area formula when the question asks for the rim.", fix: "Count the $r$'s: distance around uses ONE $r$; area inside uses TWO. A length can't come from $r^2$." }
    ],
    connections: [
      { concept: "geo_circle_area", note: "The companion formula: one $r$ for the rim, $r^2$ for the inside." },
      { concept: "geo_perimeter_rect", note: "Circumference is perimeter for round shapes — same 'distance around' idea." },
      { concept: "geo_volume_cylinder", note: "Sweep the circle upward and its rim becomes the cylinder's curved wall." }
    ],
    examples: [
      { question: "What is the circumference of a circle with radius $4$, in terms of $\\pi$?", answer: "8π", explanation: "$C = 2\\pi r = 2\\pi(4) = 8\\pi$." },
      { question: "What is the circumference of a circle with diameter $10$, in terms of $\\pi$?", answer: "10π", explanation: "$C = \\pi d = 10\\pi$ — the diameter is given, so the $2$ is already accounted for." }
    ]
  },

  geo_volume_cylinder: {
    title: "Volume of a Cylinder",
    formula: "V = \\pi r^2 h",
    oneLineSummary: "A cylinder is a circle swept upward: its volume is the circle's area times the height — base × height, with a round base.",
    intuitionHook: "A stack of identical coins: each coin is (almost) a flat circle of area $\\pi r^2$, and stacking $h$ of them builds a cylinder. The volume is just 'area of one coin' times 'how many coins high'. Same trick as the box — only the floor plan changed from rectangle to circle.",
    whatItIs: "The volume of a cylinder with radius $r$ and height $h$ is the area of its circular base, $\\pi r^2$, multiplied by its height — the space inside a can.",
    whyItWorks: "The prism principle: for any solid with straight vertical sides, volume = base area × height, because the solid is $h$ identical unit-thick slices of its base. The box uses base $lw$; the cylinder uses base $\\pi r^2$; nothing else changes. The $r^2$ is essential — it comes from the AREA of the disk. Using $\\pi r h$ sweeps a line segment instead of a disk and actually computes (half) the curved wall, not the filling; and slipping a diameter in where $r$ belongs quadruples the answer, since $(2r)^2 = 4r^2$.",
    whenToUse: "Cans, tanks, pipes, silos, glasses — capacity of anything round and straight-sided; comparing container sizes; liters from dimensions.",
    representations: [
      { kind: "stack", label: "A stack of disks", body: "Each slice has area $\\pi r^2$; the cylinder is $h$ slices: $V = \\pi r^2 h$." },
      { kind: "analogy", label: "Box recipe, round base", body: "Box: $(lw) \\times h$. Cylinder: $(\\pi r^2) \\times h$. Volume is always base × height for straight-sided solids." },
      { kind: "scaling", label: "Radius counts twice", body: "Double the height → volume doubles. Double the RADIUS → volume quadruples: $r$ appears squared because the base is 2-dimensional." }
    ],
    commonMistakes: [
      { label: "Forgetting to square the radius", why: "$\\pi r h$ multiplies a length by a length — it gives a wall area, not a volume; the units come out cm², not cm³.", fix: "The base is a DISK with area $\\pi r^2$. Compute that first, then multiply by height: disk, then stack." },
      { label: "Using the diameter as the radius", why: "A can '$10$ across' has $r = 5$; plugging $r = 10$ inflates the volume by a factor of four.", fix: "The radius runs from the CENTER to the rim — half of 'across'. Halve the diameter before it enters the formula." }
    ],
    connections: [
      { concept: "geo_circle_area", note: "The base-area fact the formula is built on: $A = \\pi r^2$." },
      { concept: "geo_volume_rect", note: "The same base-times-height principle with a rectangular floor." },
      { concept: "geo_circumference", note: "The disk's rim, swept up the height, forms the curved wall — perimeter and area each play their own role." }
    ],
    examples: [
      { question: "What is the volume of a cylinder with radius $3$ and height $5$, in terms of $\\pi$?", answer: "45π", explanation: "Base area $\\pi(3)^2 = 9\\pi$, times height $5$: $V = 45\\pi$." },
      { question: "What is the volume of a cylinder with radius $4$ and height $3$, in terms of $\\pi$?", answer: "48π", explanation: "$V = \\pi r^2 h = \\pi \\times 16 \\times 3 = 48\\pi$." }
    ]
  },

  // ===========================================================================
  // ALGEBRA PROMOTIONS (variety templates raised to first-class concepts).
  // ===========================================================================
  linear_variable_both_sides: {
    title: "Variables on Both Sides",
    formula: "ax + b = cx + d \\implies (a - c)x = d - b",
    oneLineSummary: "When x lives on both sides, collect the x-terms on one side first — moving a term across the equals sign flips its sign.",
    intuitionHook: "Two phone plans: Plan A charges $4$ coins per item minus a $5$-coin credit, Plan B charges $1$ coin per item plus a $12$-coin fee. When do they cost the same? $4x - 5 = x + 12$. You can't divide yet — $x$ is on BOTH sides, like two people pulling the same rope. First gather all the pull on one side.",
    whatItIs: "An equation with the variable on both sides, like $4x - 5 = x + 12$. Solving adds one step before the usual two: collect the x-terms together (and the constants together), then finish as a two-step equation.",
    whyItWorks: "The balance principle still rules: subtract $x$ from BOTH sides and the equation stays true, but now only one side holds the variable: $3x - 5 = 12$. 'Moving a term across the equals sign' is just shorthand for that — and the sign flips because what was ADDED on one side is being SUBTRACTED from both. From there it's the familiar unwrap: add $5$, divide by $3$, $x = \\frac{17}{3}$... or with friendlier numbers, an integer. Forgetting the sign flip is really forgetting that the move IS a subtraction.",
    whenToUse: "Break-even comparisons (when do two plans/offers cost the same?), balance puzzles, geometry problems equating two expressions, and any model where two changing quantities meet.",
    representations: [
      { kind: "balance", label: "A scale with blocks on both pans", body: "$4x - 5 = x + 12$: remove one block ($x$) from EACH pan — the balance holds: $3x - 5 = 12$." },
      { kind: "story", label: "Break-even point", body: "Two plans cost the same where their expressions are equal — solving finds the crossing quantity." },
      { kind: "graphical", label: "Two lines crossing", body: "$y = 4x - 5$ and $y = x + 12$ intersect where the equation holds — solving locates that x." }
    ],
    commonMistakes: [
      { label: "Moving a term without flipping its sign", why: "Turning $4x - 5 = x + 12$ into $5x = 17$ — the $x$ 'moved' but kept its $+$ sign.", fix: "Say the move out loud as an operation: 'subtract $x$ from both sides'. What lands on the other side carries the OPPOSITE sign: $3x$, not $5x$." },
      { label: "Combining unlike terms", why: "Merging $3x$ and $-5$ into $-2x$ — an x-term and a constant are different species.", fix: "Sort first, combine second: x-terms with x-terms, numbers with numbers. $3x - 5$ is already as combined as it gets." }
    ],
    connections: [
      { concept: "linear_two_step", note: "After collecting the x-terms, the finish IS a two-step equation." },
      { concept: "combine_like_terms", note: "The collection step is like-term combining across the equals sign." },
      { concept: "linear_system", note: "Two equations in two unknowns extend this: equating expressions is how substitution works." }
    ],
    examples: [
      { question: "Solve $5x - 4 = 2x + 8$.", answer: "4", explanation: "Subtract $2x$: $3x - 4 = 8$. Add $4$: $3x = 12$. Divide: $x = 4$." },
      { question: "Solve $6x + 3 = 4x + 11$.", answer: "4", explanation: "Subtract $4x$: $2x + 3 = 11$, so $2x = 8$ and $x = 4$." }
    ]
  },

  linear_system: {
    title: "Systems of Two Equations",
    formula: "x + y = s, \\;\\; x - y = d \\implies x = \\tfrac{s + d}{2}",
    oneLineSummary: "Two equations pin down two unknowns — add or subtract the equations to make one unknown vanish, then the other falls out.",
    intuitionHook: "Two numbers add up to $10$ and differ by $4$. Add the two facts together: $(x + y) + (x - y) = 10 + 4$ — the $y$'s cancel and $2x = 14$, so $x = 7$ (and $y = 3$). Two clues, each useless alone, intersect in exactly one answer. That's a system: triangulation with equations.",
    whatItIs: "A system of two linear equations shares two unknowns across two facts. The solution is the one pair $(x, y)$ satisfying BOTH — solvable by elimination (add/subtract equations to cancel a variable) or substitution.",
    whyItWorks: "Equations are balanced scales, and adding equal things to equal things preserves equality — so the SUM of two true equations is also true. Elimination picks the combination whose coefficients cancel: in $x + y = s$ and $x - y = d$, adding kills $+y$ against $-y$, leaving $2x = s + d$. One unknown, one step. Geometrically each equation is a line; two non-parallel lines cross at exactly one point, which is why two independent facts buy you a unique answer where one fact alone leaves a whole line of possibilities.",
    whenToUse: "Sum-and-difference puzzles, age problems, ticket-price/coin-count problems, mixture questions, break-even with two constraints — any scenario stating two facts about two quantities.",
    representations: [
      { kind: "graphical", label: "Two lines, one crossing", body: "Each equation draws a line of possibilities; the solution is their intersection point." },
      { kind: "elimination", label: "Stack and add", body: "$x + y = 10$ over $x - y = 4$: add columns — $2x = 14$. The $y$-column cancels itself." },
      { kind: "story", label: "Two clues triangulate", body: "'They add to 10' allows many pairs; 'they differ by 4' allows many pairs; only $(7, 3)$ survives both." }
    ],
    commonMistakes: [
      { label: "Reporting the wrong unknown", why: "Solving perfectly for the larger number and answering with the smaller (or vice versa) — the algebra was fine, the question wasn't reread.", fix: "After solving, return to the question: WHICH quantity did it ask for? Label your unknowns in writing ($x$ = older friend) before solving." },
      { label: "Halving the sum and ignoring the difference", why: "Answering $5$ and $5$ for 'sum $10$, difference $4$' — splitting evenly uses only the first fact.", fix: "Check BOTH facts: $5 - 5 = 0 \\ne 4$. The second clue moves the split off-center: half the sum plus half the difference." }
    ],
    connections: [
      { concept: "linear_variable_both_sides", note: "Substitution turns a system into one equation with x on both sides." },
      { concept: "stat_mean", note: "x = (s+d)/2 is the average of the sum and difference — the midpoint logic again." },
      { concept: "point_on_line", note: "The solution is a point lying on BOTH lines — coordinates meet algebra." }
    ],
    examples: [
      { question: "Two numbers have a sum of $14$ and a difference of $6$. What is the larger number?", answer: "10", explanation: "Add the facts: $2x = 14 + 6 = 20$, so $x = 10$ (the smaller is $4$)." },
      { question: "Solve for $x$: $x + y = 9$ and $x - y = 5$.", answer: "7", explanation: "Adding eliminates $y$: $2x = 14$, so $x = 7$." }
    ]
  },

  // ===========================================================================
  // SYSTEMS II — the two solving methods + the three solution-type cases (8.EE.C.8):
  // substitution, scale-and-eliminate, and counting solutions (one / none / infinitely many).
  // ===========================================================================
  linear_system_substitution: {
    title: "Solving Systems by Substitution",
    formula: "y = mx + c, \\;\\; ax + by = k \\;\\Rightarrow\\; ax + b(mx + c) = k",
    oneLineSummary: "When one equation already gives a variable alone, plug that expression into the other equation — two unknowns collapse into one you can solve.",
    intuitionHook: "Suppose you're told $y = x + 2$ and also $x + y = 8$. The first sentence says 'wherever you see $y$, you may write $x + 2$ instead.' So rewrite the second: $x + (x + 2) = 8$. Now there's only ONE unknown — $2x + 2 = 8$, so $x = 3$ (and $y = 5$). You didn't guess; you traded $y$ for what it equals.",
    whatItIs: "Substitution solves a system by using one equation to express a variable in terms of the other, then replacing that variable in the second equation. The result is a single linear equation in one unknown; solve it, then back-substitute to find the second unknown.",
    whyItWorks: "A system is two truths at once. If $y = mx + c$ is true, then $y$ and $mx + c$ are the SAME number everywhere — so swapping one for the other in the second equation changes nothing about its truth, but it erases $y$ from the page. What remains, $ax + b(mx + c) = k$, mentions only $x$, and one equation in one unknown always pins that unknown down. The single non-negotiable step is distributing $b$ across BOTH terms of $(mx + c)$ — over the $mx$ AND over the $c$ — because multiplication distributes over a sum. Skip either and the equation you solve isn't the one you were handed. Once $x$ is known, the isolated equation $y = mx + c$ hands you $y$ for free.",
    whenToUse: "Whenever one equation is already solved for a variable (or is one easy step from it) — $y = \\ldots$ or $x = \\ldots$ forms, and most word problems where one quantity is described directly in terms of another ('the length is $3$ more than the width').",
    representations: [
      { kind: "swap", label: "Trade equals for equals", body: "$y = x + 2$ lets you write $x + 2$ in place of $y$: $x + y = 8$ becomes $x + (x + 2) = 8$." },
      { kind: "collapse", label: "Two unknowns to one", body: "After the swap only $x$ remains: $2x + 2 = 8 \\Rightarrow x = 3$. One equation, one unknown, one answer." },
      { kind: "back_substitute", label: "Recover the other", body: "Put $x = 3$ back into $y = x + 2$: $y = 5$. The solution is the pair $(3, 5)$." }
    ],
    commonMistakes: [
      { label: "Reporting the wrong variable", why: "Solving cleanly for $x$ but answering with $y$ (or vice versa) — the algebra was right, the question wasn't reread.", fix: "Underline what the question asks for BEFORE solving. You found $x = 3$; if it wanted $x$, stop there — don't hand back $y$." },
      { label: "Forgetting to distribute", why: "Writing $ax + b\\cdot mx + c$ instead of $ax + b(mx + c) = ax + bmx + bc$ — the coefficient $b$ never reached the constant.", fix: "Multiply $b$ across EVERY term inside the bracket: the $mx$ and the $c$ both get hit. A missed factor changes the answer." },
      { label: "Substituting into the same equation", why: "Plugging $y = mx + c$ back into itself gives $0 = 0$ — no information.", fix: "Substitute into the OTHER equation, the one that still contains both variables." }
    ],
    connections: [
      { concept: "linear_system", note: "The same systems; this names and drills the substitution method explicitly." },
      { concept: "linear_variable_both_sides", note: "After substituting, you solve a one-variable linear equation — often with the variable on both sides." },
      { concept: "linear_system_elimination", note: "The other standard method; elimination shines when neither variable is already isolated." }
    ],
    examples: [
      { question: "Solve for $x$: $y = 2x - 1$ and $3x + y = 14$.", answer: "3", explanation: "Substitute: $3x + (2x - 1) = 14 \\Rightarrow 5x - 1 = 14 \\Rightarrow x = 3$ (then $y = 5$)." },
      { question: "Solve for $x$: $y = x + 4$ and $x + 2y = 11$.", answer: "1", explanation: "Substitute: $x + 2(x + 4) = 11 \\Rightarrow 3x + 8 = 11 \\Rightarrow x = 1$ (then $y = 5$)." }
    ]
  },

  linear_system_elimination: {
    title: "Solving Systems by Elimination",
    formula: "a_1x + b_1y = c_1,\\; a_2x + b_2y = c_2 \\;\\Rightarrow\\; \\text{scale, then add/subtract to cancel a variable}",
    oneLineSummary: "Scale the equations so one variable's coefficients match, then add or subtract to make that variable vanish — leaving one equation in one unknown.",
    intuitionHook: "You have $2x + y = 8$ and $x + 2y = 7$. Neither variable cancels yet. But multiply the first by $2$: $4x + 2y = 16$. Now BOTH equations have $2y$. Subtract: $(4x + 2y) - (x + 2y) = 16 - 7$, the $2y$'s annihilate, and $3x = 9$ — so $x = 3$. The trick is engineering a matching coefficient so a whole variable drops out.",
    whatItIs: "Elimination (the addition method) solves a system by multiplying one or both equations by constants so a chosen variable has equal (or opposite) coefficients, then adding or subtracting the equations to eliminate it. The leftover single-variable equation is solved, then back-substituted.",
    whyItWorks: "Adding equal quantities to equal quantities keeps a balance level: if $L_1 = R_1$ and $L_2 = R_2$ are both true, then $L_1 \\pm L_2 = R_1 \\pm R_2$ is true too. Elimination chooses the combination whose coefficients cancel. When the coefficients don't already match, you SCALE — multiplying an entire equation by a constant produces an equivalent equation (same solutions, every term grown by the same factor), so you may resize one until a variable's coefficient lines up with the other's. Then a single add or subtract kills that variable, because $by$ and $by$ (or $by$ and $-by$) sum to $0$ or cancel. The essential discipline is scaling the WHOLE equation — both sides, every term — not just the coefficient you're staring at; a half-scaled equation is a false one.",
    whenToUse: "Systems in standard form $ax + by = c$ where no variable is isolated, problems where one scaling makes coefficients match cleanly, and as the method of choice when substitution would introduce messy fractions.",
    representations: [
      { kind: "scale", label: "Resize to match", body: "Multiply $2x + y = 8$ by $2$ to get $4x + 2y = 16$ — now its $y$-coefficient matches the other equation's $2y$." },
      { kind: "cancel", label: "Add or subtract to vanish", body: "$(4x + 2y) - (x + 2y) = 16 - 7$: the $2y$ terms cancel, leaving $3x = 9$." },
      { kind: "solve_back", label: "One unknown, then the other", body: "$3x = 9 \\Rightarrow x = 3$; substitute into either original to get $y = 2$." }
    ],
    commonMistakes: [
      { label: "Adding without scaling first", why: "Combining $2x + y = 8$ and $x + 2y = 7$ straight away gives $3x + 3y = 15$ — both variables survive, nothing was eliminated.", fix: "First make a coefficient MATCH by multiplying an equation through; only then will a variable cancel when you combine." },
      { label: "Scaling only one term", why: "Doubling just the $2y$ to $4y$ but leaving the rest of the equation untouched — that equation is now false.", fix: "Multiply EVERY term on BOTH sides by the constant. Scaling an equation resizes the whole thing, not one piece." },
      { label: "Sign error when subtracting", why: "Subtracting equations but forgetting to flip the sign of every term in the one being subtracted.", fix: "Distribute the minus to each term: $(c_1) - (c_2)$ applies to the constants too. Adding the opposite equation is a safer framing." }
    ],
    connections: [
      { concept: "linear_system_substitution", note: "The companion method; elimination avoids the fractions substitution can create when nothing is isolated." },
      { concept: "linear_system", note: "Sum-and-difference systems are elimination's simplest case — the coefficients already match." },
      { concept: "linear_system_solution_types", note: "When elimination cancels BOTH variables, the leftover equation reveals no solution or infinitely many." }
    ],
    examples: [
      { question: "Solve for $x$: $2x + y = 8$ and $x + 2y = 7$.", answer: "3", explanation: "Scale eq1 by $2$: $4x + 2y = 16$; subtract eq2: $3x = 9 \\Rightarrow x = 3$ (then $y = 2$)." },
      { question: "Solve for $x$: $3x + 2y = 16$ and $2x - 2y = 4$.", answer: "4", explanation: "Add the equations — the $\\pm 2y$ cancel: $5x = 20 \\Rightarrow x = 4$ (then $y = 2$)." }
    ]
  },

  linear_system_solution_types: {
    title: "Number of Solutions to a System",
    formula: "\\text{different slopes} \\to 1; \\;\\; \\text{same slope, diff. intercept} \\to 0; \\;\\; \\text{same line} \\to \\infty",
    oneLineSummary: "Two lines either cross once (one solution), run parallel (no solution), or are the very same line (infinitely many) — read it off their slopes and intercepts.",
    intuitionHook: "Every linear equation is a line. Two lines can only relate three ways: they cross (one shared point), they're parallel and never touch (no shared point), or they're secretly the same line drawn twice (every point shared). A system's number of solutions is just which of those three is happening — no arithmetic marathon required, just compare the lines.",
    whatItIs: "A 2-variable linear system has exactly one solution, no solution, or infinitely many. Rewrite both equations in slope-intercept form: different slopes give one solution (the lines cross); equal slopes with different intercepts give none (parallel); identical slope AND intercept give infinitely many (one line).",
    whyItWorks: "A solution is a point lying on BOTH lines at once. Two lines with different slopes are tilted differently, so they must cross — exactly once, at one point: one solution. Two lines with the SAME slope are parallel; if their intercepts differ they march alongside forever without meeting, so no point is on both — no solution. But if same slope AND same intercept, the two equations describe one identical line, and every one of its infinitely many points satisfies both — infinitely many solutions. A fast algebra test: if one equation is a constant multiple of the other on BOTH sides, they're the same line ($\\infty$); if it's a multiple on the left (the variable side) but NOT the right, they're parallel ($0$); otherwise the slopes differ and you get exactly one. The trap is assuming 'two equations always pin down one answer' — that's only true when the lines actually cross.",
    whenToUse: "Before grinding through a solve — checking whether a system even HAS a unique answer, spotting parallel (no-solution) and coincident (infinite-solution) systems, and interpreting the $0 = 0$ or $0 = 5$ that elimination produces when a variable fully cancels.",
    representations: [
      { kind: "graphical", label: "Three ways two lines meet", body: "Crossing $\\to$ one solution; parallel $\\to$ none; same line $\\to$ infinitely many." },
      { kind: "slope_test", label: "Compare slopes & intercepts", body: "Different slopes $\\to 1$; same slope, different intercept $\\to 0$; same slope AND intercept $\\to \\infty$." },
      { kind: "elimination_signal", label: "What elimination tells you", body: "If both variables cancel: $0 = 0$ means infinitely many; $0 = 5$ (a false statement) means no solution." }
    ],
    commonMistakes: [
      { label: "Assuming there's always one solution", why: "Treating every 2-by-2 system as if the lines must cross, ignoring the parallel and identical cases.", fix: "Check the slopes first. Equal slopes mean the answer is either zero or infinitely many — never one." },
      { label: "Confusing none with infinitely many", why: "Both are 'same slope', so they get swapped: parallel (no solution) mistaken for coincident (infinite).", fix: "After matching slopes, check the intercepts: DIFFERENT intercept $\\to$ no solution (parallel); SAME intercept $\\to$ infinitely many (one line)." },
      { label: "Misreading the elimination signal", why: "Reaching $0 = 0$ and calling it 'no solution', or $0 = 7$ and calling it 'infinitely many'.", fix: "A TRUE leftover ($0 = 0$) means infinitely many; a FALSE leftover ($0 = 7$) means no solution. The truth of the statement is the tell." }
    ],
    connections: [
      { concept: "slope_intercept_id", note: "The test is just reading each line's slope and intercept — put both equations in $y = mx + b$ form." },
      { concept: "linear_system_elimination", note: "When elimination cancels both variables, the resulting $0 = 0$ or $0 = c$ names the solution count." },
      { concept: "matrix_determinant", note: "For a square system, a nonzero determinant guarantees the unique-solution case." }
    ],
    examples: [
      { question: "How many solutions: $x - y = 1$ and $x + y = 5$?", answer: "one solution", explanation: "Slopes $1$ and $-1$ differ, so the lines cross once — one solution." },
      { question: "How many solutions: $x + 2y = 4$ and $2x + 4y = 10$?", answer: "no solution", explanation: "The second's left side is twice the first's, but $10 \\ne 2\\cdot 4 = 8$: same slope, different intercept — parallel, no solution." },
      { question: "How many solutions: $x + y = 3$ and $2x + 2y = 6$?", answer: "infinitely many solutions", explanation: "The second equation is exactly twice the first — the same line — so every point works: infinitely many." }
    ]
  },

  // ===========================================================================
  // POLYNOMIAL DEPTH (expressions strand — multiply and factor binomials).
  // ===========================================================================
  foil_binomials: {
    title: "Multiplying Binomials (FOIL)",
    formula: "(x + a)(x + b) = x^2 + (a + b)x + ab",
    oneLineSummary: "Each term in the first bracket multiplies each term in the second — four products (First, Outer, Inner, Last), with the two middle ones merging.",
    intuitionHook: "A garden is $x + 3$ meters by $x + 4$ meters. Slice it into four patches: the $x \\times x$ lawn, an $x \\times 4$ strip, a $3 \\times x$ strip, and a $3 \\times 4$ corner. Total area: $x^2 + 4x + 3x + 12 = x^2 + 7x + 12$. FOIL isn't a trick — it's the four patches of a sliced rectangle.",
    whatItIs: "Multiplying two binomials applies the distributive law twice: every term of the first factor times every term of the second — four products, collected into a trinomial.",
    whyItWorks: "Distribution says $(x + a) \\cdot M = xM + aM$. Let $M$ be the whole second bracket: $(x+a)(x+b) = x(x+b) + a(x+b)$ — then distribute each piece: $x^2 + bx + ax + ab$. The middle terms $bx$ and $ax$ are like terms and merge into $(a+b)x$. So the final coefficients carry a fingerprint: the middle is the SUM of the constants, the last is their PRODUCT. FOIL (First-Outer-Inner-Last) is just a checklist ensuring none of the four products is forgotten — skipping Outer/Inner is exactly the error the checklist exists to prevent.",
    whenToUse: "Expanding areas with variable sides, building quadratics from roots, verifying a factoring, completing algebraic identities — the gateway move of polynomial algebra.",
    representations: [
      { kind: "area", label: "The sliced rectangle", body: "$(x+3)(x+4)$: four patches — $x^2$, $4x$, $3x$, $12$ — tile the whole garden." },
      { kind: "checklist", label: "F-O-I-L", body: "First $x \\cdot x$, Outer $x \\cdot 4$, Inner $3 \\cdot x$, Last $3 \\cdot 4$ — four products, every pairing exactly once." },
      { kind: "fingerprint", label: "Sum and product", body: "$(x+a)(x+b) = x^2 + (a{+}b)x + ab$: middle = sum, last = product. Factoring will read this fingerprint backwards." }
    ],
    commonMistakes: [
      { label: "Skipping the middle products", why: "Writing $(x+3)(x+4) = x^2 + 12$ — multiplying Firsts and Lasts like the brackets were independent.", fix: "Draw the rectangle: the two strips ($4x$ and $3x$) are real area you just erased. Four terms in, four products out, every time." },
      { label: "Losing a sign with negatives", why: "$(x-3)(x-4) = x^2 - 7x - 12$ — the Last product $(-3)(-4)$ kept a minus.", fix: "Negative times negative is POSITIVE: the last term is $+12$; only the middle stays negative. Expand slowly with the signs attached to their numbers." }
    ],
    connections: [
      { concept: "distribute", note: "FOIL is distribution applied twice — the same law, one level up." },
      { concept: "square_binomial", note: "The special case a = b, where the middle term doubles." },
      { concept: "factor_trinomial", note: "Factoring runs this expansion in reverse, hunting the sum/product fingerprint." }
    ],
    examples: [
      { question: "Expand $(x + 2)(x + 5)$.", answer: "x^2 + 7x + 10", explanation: "F: $x^2$, O: $5x$, I: $2x$, L: $10$ → $x^2 + 7x + 10$." },
      { question: "Expand $(x - 1)(x - 6)$.", answer: "x^2 - 7x + 6", explanation: "Middle: $-6x - x = -7x$; Last: $(-1)(-6) = +6$." }
    ]
  },

  square_binomial: {
    title: "Squaring a Binomial",
    formula: "(x + a)^2 = x^2 + 2ax + a^2",
    oneLineSummary: "Squaring a sum is NOT term-by-term: the cross term appears twice, so (x+a)² = x² + 2ax + a².",
    intuitionHook: "Extend a square garden of side $x$ by $3$ meters each way. The new $(x+3)^2$ garden isn't just the old lawn plus a $3 \\times 3$ corner — there are TWO $3 \\times x$ strips, one along each edge. Total: $x^2 + 3x + 3x + 9$. The strips are the famous middle term, and forgetting them is pretending the garden only grew at the corner.",
    whatItIs: "The square of a binomial expands to a perfect-square trinomial: the square of the first term, twice the product of both terms, and the square of the last. With a minus, only the middle term goes negative: $(x-a)^2 = x^2 - 2ax + a^2$.",
    whyItWorks: "$(x+a)^2$ means $(x+a)(x+a)$ — FOIL it and the Outer and Inner products are IDENTICAL ($ax$ both times), so they merge into $2ax$. That's the whole secret: squaring doesn't distribute over addition because multiplication crosses terms. The belief $(x+a)^2 = x^2 + a^2$ (the 'freshman's dream') dies on a one-number check: $(3+4)^2 = 49$, but $9 + 16 = 25$. The missing $24$ is exactly $2 \\cdot 3 \\cdot 4$ — the cross term, every time. And $(x-a)^2$ keeps $+a^2$ because a negative times itself is positive: squares are never negative.",
    whenToUse: "Perfect-square patterns, completing the square, mental arithmetic ($31^2 = (30+1)^2 = 900 + 60 + 1$), distance/Pythagorean expansions, and spotting factorable trinomials.",
    representations: [
      { kind: "area", label: "The extended square", body: "$(x+3)^2$: old lawn $x^2$ + TWO $3x$ strips + corner $9$. The strips are the $2ax$." },
      { kind: "numeric", label: "Mental-math superpower", body: "$31^2 = (30 + 1)^2 = 900 + 2(30) + 1 = 961$ — the identity does arithmetic for you." },
      { kind: "counterexample", label: "Test the dream", body: "$(3+4)^2 = 49 \\ne 25 = 3^2 + 4^2$. The gap, $24 = 2 \\cdot 3 \\cdot 4$, is the cross term." }
    ],
    commonMistakes: [
      { label: "The freshman's dream", why: "$(x+a)^2 = x^2 + a^2$ — distributing the square over the plus as if it were multiplication.", fix: "Write the square OUT: $(x+a)(x+a)$, then FOIL. Or test with numbers: $(3+4)^2$ vs $3^2 + 4^2$ settles it instantly." },
      { label: "Forgetting to double", why: "Writing $x^2 + ax + a^2$ — the cross term counted once instead of twice.", fix: "Outer AND Inner both contribute $ax$ — the garden has a strip on EACH side. The middle term is always $2 \\times$ first $\\times$ last." }
    ],
    connections: [
      { concept: "foil_binomials", note: "The special case of FOIL where both brackets match — and the middle merges into a double." },
      { concept: "exponent_power", note: "Squaring means multiplying by itself — exponent meaning powers the expansion." },
      { concept: "factor_trinomial", note: "Recognizing x² + 2ax + a² lets you factor perfect squares on sight." }
    ],
    examples: [
      { question: "Expand $(x + 5)^2$.", answer: "x^2 + 10x + 25", explanation: "$x^2 + 2(5)x + 5^2 = x^2 + 10x + 25$." },
      { question: "Expand $(x - 4)^2$.", answer: "x^2 - 8x + 16", explanation: "Middle doubles and keeps the minus: $-8x$; last squares to $+16$." }
    ]
  },

  factor_trinomial: {
    title: "Factoring Trinomials",
    formula: "x^2 + (a + b)x + ab = (x + a)(x + b)",
    oneLineSummary: "Factoring reads FOIL's fingerprint backwards: find two numbers that MULTIPLY to the last term and ADD to the middle coefficient.",
    intuitionHook: "A rectangle puzzle in reverse: the garden's total area is $x^2 + 7x + 12$, and you must recover its side lengths. FOIL left a fingerprint — the $12$ is the product of the two constants, the $7$ their sum. Which pair multiplies to $12$ and adds to $7$? Test: $(1,12)$ adds to $13$; $(2,6)$ to $8$; $(3,4)$ to $7$ ✓. Sides found: $(x+3)(x+4)$.",
    whatItIs: "Factoring a trinomial $x^2 + Sx + P$ rewrites it as a product of two binomials. The constants in those binomials are the pair of numbers whose product is $P$ and whose sum is $S$ — both conditions at once.",
    whyItWorks: "Expansion proved $(x+a)(x+b) = x^2 + (a{+}b)x + ab$ for every $a, b$ — so any trinomial matching that shape must have come from such a pair, and finding the pair IS the factoring. The signs narrate the pair's story: product positive + sum positive → both numbers positive; product positive + sum NEGATIVE → both negative (two negatives multiply positive but add negative); product negative → one of each. Each candidate pair satisfying only ONE condition is a trap — $(1, 12)$ multiplies to $12$ but adds to $13$ — which is why the check must verify both, ideally by FOILing the answer back out.",
    whenToUse: "Solving quadratics by the zero-product property, simplifying rational expressions, finding roots and x-intercepts, and reversing any expansion.",
    representations: [
      { kind: "fingerprint", label: "Sum & product hunt", body: "$x^2 + 7x + 12$: pairs multiplying to $12$ — $(1,12), (2,6), (3,4)$ — only $(3,4)$ also adds to $7$." },
      { kind: "sign_story", label: "Signs narrate the pair", body: "$x^2 - 7x + 12 = (x-3)(x-4)$: positive product, negative sum → BOTH factors negative." },
      { kind: "verification", label: "FOIL it back", body: "Factoring claims a product; expanding the claim must reproduce the original — a built-in answer check." }
    ],
    commonMistakes: [
      { label: "Right product, wrong sum", why: "Choosing $(2, 6)$ for $x^2 + 7x + 12$ because $2 \\times 6 = 12$ — the sum condition was never checked.", fix: "TWO conditions, one pair. List the product pairs, then test each sum — and FOIL your final answer to confirm both." },
      { label: "Mixing the signs", why: "Writing $(x + 3)(x - 4)$ for $x^2 - 7x + 12$ — but mixed signs make the product NEGATIVE ($-12$).", fix: "Read the sign story first: $+12$ product with $-7$ sum forces both negative: $(x-3)(x-4)$." }
    ],
    connections: [
      { concept: "foil_binomials", note: "The inverse operation — every factoring is an expansion read backwards." },
      { concept: "quadratic", note: "Factoring is the engine of solving quadratics: zero product → roots." },
      { concept: "gcd_lcm", note: "The product-pair hunt reuses divisor-finding fluency." }
    ],
    examples: [
      { question: "Factor $x^2 + 9x + 20$.", answer: "(x + 4)(x + 5)", explanation: "$4 \\times 5 = 20$ and $4 + 5 = 9$ — both conditions met." },
      { question: "Factor $x^2 - 8x + 15$.", answer: "(x - 3)(x - 5)", explanation: "Positive product, negative sum → both negative: $(-3)(-5) = 15$, $-3 - 5 = -8$." }
    ]
  },

  // ===========================================================================
  // MEASUREMENT (number-sense depth — unit conversion).
  // ===========================================================================
  unit_convert_metric: {
    title: "Metric Unit Conversion",
    formula: "1 \\text{ km} = 1000 \\text{ m}, \\quad 1 \\text{ m} = 100 \\text{ cm}, \\quad 1 \\text{ kg} = 1000 \\text{ g}",
    oneLineSummary: "Metric units convert by sliding the decimal point — multiply by the power of ten going to smaller units, divide going to larger.",
    intuitionHook: "A $2$ km walk is $2000$ m — you didn't compute anything, you renamed it. The metric system was DESIGNED so that converting is just relabeling with a shifted decimal point: kilo- means a thousand of, centi- means a hundredth of. The only real question is which way the point slides.",
    whatItIs: "Converting between metric units (km↔m, m↔cm, kg↔g, L↔mL) multiplies or divides by a power of ten given by the prefix: kilo = 1000, centi = 1/100, milli = 1/1000.",
    whyItWorks: "The quantity never changes — only the SIZE of the counting unit. Smaller units need MORE of themselves to cover the same amount ($2$ km = $2000$ m: meters are smaller, so the count grows), and larger units need fewer ($3000$ g = $3$ kg). That's why the direction rule is really a sanity check, not a memorized arrow: after converting, ask 'did the number grow when the unit shrank?' If number and unit moved the same way, the conversion went backwards. The powers of ten are the prefixes' literal meanings, so 'kilo→base' is always three decimal slides.",
    whenToUse: "Distances on maps vs signs, recipe and medicine dosages (mL), shopping weights, science class — and as the warm-up for scientific notation, which runs on the same decimal slides.",
    representations: [
      { kind: "ladder", label: "The prefix ladder", body: "km — m — cm — mm: each step down multiplies the count (×1000, ×100, ×10); each step up divides." },
      { kind: "sanity", label: "Smaller unit, bigger number", body: "$5$ kg → $5000$ g ✓ (grams are tinier, you need more). $5$ kg → $0.005$ g ✗ — number and unit both shrank." },
      { kind: "decimal", label: "Slide, don't compute", body: "$3.2$ km = $3200$ m: three decimal slides right. No multiplication algorithm needed — the system is base ten on purpose." }
    ],
    commonMistakes: [
      { label: "Off by a power of ten", why: "Converting $4$ km to $400$ m — sliding the decimal two places when kilo demands three.", fix: "Anchor the prefixes to their meanings: KILO = thousand (3 slides), CENTI = hundredth (2 slides), MILLI = thousandth (3). Count slides aloud." },
      { label: "Converting the wrong direction", why: "Turning $6000$ m into $6{,}000{,}000$ km — multiplying on the way to a BIGGER unit.", fix: "Bigger unit ⇒ fewer of them ⇒ divide. Run the sanity check: $6{,}000{,}000$ km is longer than the Earth-Moon round trip — the number should have SHRUNK." }
    ],
    connections: [
      { concept: "decimal_mult", note: "Sliding the decimal IS multiplying/dividing by powers of ten." },
      { concept: "scientific_notation", note: "The same decimal slides, formalized into exponents of 10." },
      { concept: "ratio_solve", note: "A conversion factor is a ratio: 1000 m per 1 km, used as a multiplier." }
    ],
    examples: [
      { question: "Convert $3$ km to meters.", answer: "3000", explanation: "Kilo = thousand: $3 \\times 1000 = 3000$ m. Smaller unit, bigger count ✓." },
      { question: "Convert $4000$ grams to kilograms.", answer: "4", explanation: "Going UP to kilograms divides: $4000 \\div 1000 = 4$ kg." }
    ]
  },

  unit_convert_time: {
    title: "Time Unit Conversion",
    formula: "1 \\text{ h} = 60 \\text{ min}, \\quad 1 \\text{ min} = 60 \\text{ s}",
    oneLineSummary: "Time runs on sixties, not tens — convert hours and minutes by multiplying by 60, and never let the decimal instinct sneak in a 100.",
    intuitionHook: "Why does $1.5$ hours feel like it should be $1$ hour $50$ minutes? Because everything ELSE you measure runs on tens. But clocks are Babylonian: $60$ minutes per hour, $60$ seconds per minute. $1.5$ hours is $90$ minutes — half an hour is $30$, not $50$. The single most useful time skill is noticing when your decimal reflexes are lying.",
    whatItIs: "Converting among hours, minutes and seconds multiplies or divides by 60 (and by 24 for days). Mixed amounts like '$2$ hours $15$ minutes' convert piecewise: whole units first, leftover added after.",
    whyItWorks: "A conversion factor counts how many small units tile one big unit — and a clock hour holds exactly $60$ minutes, so the multiplier is $60$, full stop. Mixed quantities work by the distributive law: $2$ h $15$ min $= 2 \\times 60 + 15 = 135$ min — convert the hours, then ADD the minutes that were already minutes. The classic wrong answers are both shape-errors: using $100$ imports the metric reflex into a base-60 system, and dropping the $+15$ converts only half the quantity.",
    whenToUse: "Schedules and durations, speed problems (km/h needs hours), cooking and exam timing, programming with seconds/milliseconds, converting race times.",
    representations: [
      { kind: "clock", label: "The base-60 dial", body: "The minute hand sweeps $60$ steps per hour — the conversion factor is drawn on every clock face." },
      { kind: "piecewise", label: "Whole units + leftover", body: "$2$ h $15$ min: the hours become $120$ min, the $15$ rides along: $135$ min total." },
      { kind: "contrast", label: "Tens vs sixties", body: "$1.5$ km $= 1500$ m (tens), but $1.5$ h $= 90$ min (sixties). Same idea, different base — the units choose the base." }
    ],
    commonMistakes: [
      { label: "Treating an hour as 100 minutes", why: "Computing $3$ h $= 300$ min — the decimal-system reflex applied to a base-60 unit.", fix: "Time is the exception to base ten: anchor on the clock face — one full sweep is $60$. $3 \\times 60 = 180$." },
      { label: "Dropping the leftover minutes", why: "Converting $2$ h $30$ min to $120$ min — only the hours got converted.", fix: "Convert piecewise and ADD: $2 \\times 60 = 120$, plus the $30$ already in minutes: $150$. Every part of the quantity must arrive." }
    ],
    connections: [
      { concept: "unit_convert_metric", note: "Same convert-by-factor idea — only the base changes from 10 to 60." },
      { concept: "arithmetic_mult", note: "The ×60 step is times-table work; fluency keeps clock math instant." },
      { concept: "modular_arithmetic", note: "Clock time wraps at 60 and 24 — the gateway example of mod." }
    ],
    examples: [
      { question: "How many minutes are in $2$ hours and $20$ minutes?", answer: "140", explanation: "$2 \\times 60 = 120$, plus the leftover $20$: $140$ minutes." },
      { question: "How many seconds are in $5$ minutes?", answer: "300", explanation: "$5 \\times 60 = 300$ seconds." }
    ]
  },

  // ===========================================================================
  // PROPORTIONAL REASONING DEPTH (number-sense strand).
  // ===========================================================================
  unit_rate: {
    title: "Unit Rates",
    formula: "\\text{rate} = \\frac{\\text{total}}{\\text{count}}",
    oneLineSummary: "A unit rate scales any quantity down to 'per ONE' — price per item, kilometers per hour — and 'per' always means divide.",
    intuitionHook: "Two stores: one sells $4$ pens for $\\$12$, the other $6$ pens for $\\$15$. Which is cheaper? You can't compare $12$ against $15$ — different counts. Bring both to PER ONE PEN: $\\$3$ vs $\\$2.50$. Unit rates are the universal adapter that makes any two deals comparable.",
    whatItIs: "A unit rate expresses a relationship per single unit: dollars per item, km per hour, points per game. It's computed by dividing the total by the count — and once everything is 'per one', comparison and prediction become plain arithmetic.",
    whyItWorks: "If $5$ notebooks cost $\\$20$ and each costs the same, the $\\$20$ splits equally five ways — division by definition: $\\$4$ each. The power move is reversing it: once you know the per-one price, ANY count is one multiplication away ($7$ notebooks: $7 \\times 4 = \\$28$). Subtracting ($20 - 5 = 15$) feels available but mixes units — dollars minus notebooks measures nothing. The word 'per' is a reliable translation cue: it literally marks the division bar.",
    whenToUse: "Best-buy comparisons, speed and pace, wages per hour, scoring averages, recipe scaling — and as the gateway to proportions, slopes and linear models (a slope IS a unit rate).",
    representations: [
      { kind: "sharing", label: "Split it equally", body: "$\\$20$ across $5$ identical notebooks: the money divides evenly — $\\$4$ lands on each." },
      { kind: "table", label: "The per-one row", body: "Pens: 4 → \\$12, 2 → \\$6, 1 → \\$3. Every ratio table has a per-one row, and it unlocks all the others." },
      { kind: "speed", label: "Distance per hour", body: "$120$ km in $3$ h = $40$ km in EACH hour — the unit rate is what the speedometer shows." }
    ],
    commonMistakes: [
      { label: "Subtracting instead of dividing", why: "'$6$ notebooks cost $\\$42$' → $42 - 6 = 36$ — the numbers got combined with the wrong operation, and the units (dollars minus notebooks) make no sense.", fix: "'Per' = divide. Check the answer by re-multiplying: $6 \\times 7 = 42$ ✓, while $6 \\times 36$ is nowhere near $42$." },
      { label: "Dividing the wrong way around", why: "Computing $6 \\div 42$ gives notebooks per dollar — a real rate, but not the one asked for.", fix: "Put the quantity you want ALONE on top: dollars per notebook = dollars ÷ notebooks. Say the unit of your answer out loud before computing." }
    ],
    connections: [
      { concept: "ratio_solve", note: "A unit rate is a ratio scaled until the second quantity is 1." },
      { concept: "proportion_solve", note: "Proportions scale unit rates up to any count." },
      { concept: "slope_from_points", note: "A line's slope is a unit rate: change in y per ONE step of x." }
    ],
    examples: [
      { question: "$5$ notebooks cost $\\$35$. What is the price per notebook?", answer: "7", explanation: "$35 \\div 5 = 7$ dollars each; check $5 \\times 7 = 35$ ✓." },
      { question: "A cyclist rides $80$ km in $4$ hours. What is her speed in km/h?", answer: "20", explanation: "$80 \\div 4 = 20$ km in each hour." }
    ]
  },

  proportion_solve: {
    title: "Solving Proportions",
    formula: "\\frac{a}{b} = \\frac{x}{bk} \\implies x = ak",
    oneLineSummary: "A proportion says two ratios are the same — solve it by finding the scale factor, because ratios scale by multiplying, never by adding.",
    intuitionHook: "A recipe for $2$ people uses $3$ eggs. For $8$ people? The crowd is $4\\times$ bigger, so the eggs are $4\\times$ more: $12$. NOT '$6$ more people, so $6$ more eggs' — $9$ eggs would feed your dinner party a strangely eggless meal. Recipes scale by multiplying; that's what keeps the TASTE (the ratio) the same.",
    whatItIs: "A proportion equates two ratios: $\\frac{3}{4} = \\frac{x}{20}$. Solving finds the missing value that keeps both ratios identical — via the scale factor between the known pair, or cross-multiplication.",
    whyItWorks: "Equal ratios are scaled copies: if $\\frac{3}{4} = \\frac{x}{20}$ and the denominator was multiplied by $5$ (since $4 \\times 5 = 20$), the numerator must be multiplied by the SAME $5$, giving $x = 15$ — multiplying top and bottom by one number is exactly what leaves a fraction's value unchanged. The additive trap ($4$ grew by $16$, so $3 + 16 = 19$) preserves the DIFFERENCE instead, and equal differences are a different promise than equal ratios: $\\frac{19}{20}$ is nearly a whole, $\\frac{3}{4}$ is not. When the scale factor is ugly, cross-multiplying ($3 \\times 20 = 4x$) runs the same logic without needing it to be whole.",
    whenToUse: "Recipe and model scaling, map distances, similar triangles, currency conversion, 'if 3 cost this, what do 7 cost' — every similarity argument in geometry runs on proportions.",
    representations: [
      { kind: "scaling", label: "The scale factor", body: "$\\frac{3}{4} = \\frac{x}{20}$: bottom went ×5, so top goes ×5 → $x = 15$. One factor moves both floors." },
      { kind: "table", label: "Ratio table", body: "people 2 → 8 (×4), eggs 3 → 12 (×4): the columns of a ratio table always move together." },
      { kind: "cross", label: "Cross-multiply", body: "$\\frac{a}{b} = \\frac{x}{c} \\implies a c = b x$ — the products of the diagonals match exactly when the ratios do." }
    ],
    commonMistakes: [
      { label: "Adding the difference", why: "'$4$ became $20$ by adding $16$, so $x = 3 + 16 = 19$' — keeping differences equal keeps the wrong thing equal.", fix: "Ask 'times what?', never 'plus what?'. Sanity-check: $\\frac{19}{20}$ is almost $1$, while $\\frac{3}{4}$ clearly isn't — the ratios don't match." },
      { label: "Scaling only one part", why: "Multiplying the denominator by the factor but copying the numerator across unchanged.", fix: "A fraction keeps its value only when top AND bottom take the same ride: $\\frac{3 \\times 5}{4 \\times 5}$." }
    ],
    connections: [
      { concept: "unit_rate", note: "Solving via the per-one value is the two-step version of the same scaling." },
      { concept: "fraction_simplify", note: "Equivalent fractions ARE proportions — simplifying runs the scale factor backwards." },
      { concept: "geo_area_rect", note: "Similar shapes keep side RATIOS equal — proportions power every similarity computation." }
    ],
    examples: [
      { question: "Solve $\\frac{2}{5} = \\frac{x}{20}$.", answer: "8", explanation: "The denominator scaled ×4 ($5 \\to 20$), so $x = 2 \\times 4 = 8$." },
      { question: "Solve $\\frac{3}{7} = \\frac{x}{21}$.", answer: "9", explanation: "$7 \\times 3 = 21$, so $x = 3 \\times 3 = 9$." }
    ]
  },

  // ===========================================================================
  // INTEGERS DEPTH (division sign rules, order of operations with negatives).
  // ===========================================================================
  integer_div: {
    title: "Dividing Integers",
    formula: "\\frac{+}{+} = +, \\;\\; \\frac{-}{-} = +, \\;\\; \\frac{+}{-} = \\frac{-}{+} = -",
    oneLineSummary: "Integer division follows the same sign rules as multiplication — like signs give positive, unlike signs give negative — because every division is a multiplication read backwards.",
    intuitionHook: "A debt of $24$ coins is split among $6$ friends: each owes $-24 \\div 6 = -4$ — sharing a debt gives everyone a piece of debt. But asking 'how many $-6$s fit into $-24$?' gives $+4$: it takes four steps of $-6$ to fall to $-24$. Same numbers, different signs in play, and the rules sort it out.",
    whatItIs: "Dividing signed integers: divide the magnitudes as usual, then set the sign — positive when the signs match, negative when they differ. Identical to the multiplication sign rules.",
    whyItWorks: "Division is defined by multiplication: $\\frac{-24}{6} = q$ means $q \\times 6 = -24$, and only $-4$ works. Because every division question secretly asks a multiplication question, it inherits multiplication's sign table wholesale — including the surprising row: $\\frac{-24}{-6} = +4$, since $+4 \\times (-6) = -24$. 'Two negatives stay negative' fails the check instantly: $-4 \\times -6 = +24 \\ne -24$. When in doubt, multiply back — the check is built into the definition.",
    whenToUse: "Splitting debts and losses, average temperature drops, rate-of-descent per hour, undoing signed multiplications when solving equations (including the inequality flip step).",
    representations: [
      { kind: "inverse", label: "Multiplication, reversed", body: "$\\frac{-24}{6} = ?$ asks: what times $6$ gives $-24$? Answer: $-4$. Every quotient is checkable by multiplying back." },
      { kind: "sharing", label: "Splitting a debt", body: "$-24$ split $6$ ways: six equal shares of $-4$. A shared loss is a smaller loss each, still a loss." },
      { kind: "table", label: "The sign table", body: "Same signs → $+$, different signs → $-$: one table serves both × and ÷, because ÷ is × in reverse." }
    ],
    commonMistakes: [
      { label: "Two negatives staying negative", why: "$\\frac{-24}{-6} = -4$ — carrying the 'negatives are negative' instinct into a place where the signs cancel.", fix: "Multiply back: $-4 \\times -6 = +24$, not $-24$. Only $+4$ survives the check." },
      { label: "Right magnitude, wrong sign", why: "Computing $24 \\div 6 = 4$ correctly, then guessing the sign instead of reading the rule.", fix: "Two steps, always in order: magnitudes first ($4$), then the sign rule (signs differ → negative)." }
    ],
    connections: [
      { concept: "integer_mult", note: "The sign rules are inherited directly — division is multiplication read backwards." },
      { concept: "arithmetic_div", note: "The magnitude half of every problem is plain division." },
      { concept: "inequality_flip_negative", note: "Dividing an inequality by a negative is this skill plus the flip." }
    ],
    examples: [
      { question: "Calculate $-35 \\div 7$.", answer: "-5", explanation: "Magnitudes: $35 \\div 7 = 5$. Signs differ → negative: $-5$. Check: $-5 \\times 7 = -35$ ✓." },
      { question: "Calculate $-42 \\div (-6)$.", answer: "7", explanation: "Like signs → positive: $+7$. Check: $7 \\times (-6) = -42$ ✓." }
    ]
  },

  integer_ops: {
    title: "Order of Operations with Negatives",
    formula: "a + b \\times c: \\text{ multiply first, even when signs fly}",
    oneLineSummary: "Negatives don't change the order of operations — multiplication still binds before addition; the signs just demand more care inside each step.",
    intuitionHook: "Your account sits at $-3$ coins, and then $2$ fees of $4$ coins each hit: $-3 + 2 \\times (-4)$. The fees multiply FIRST ($-8$), then join the balance: $-11$. Reading left to right ($-3 + 2 = -1$, times $-4$ = $+4$) would turn two fees into a profit — order isn't pedantry, it's the difference between owing and earning.",
    whatItIs: "Evaluating expressions that mix signed numbers with several operations. PEMDAS still rules: multiplication and division before addition and subtraction — negatives change the values, never the order.",
    whyItWorks: "The order convention exists so an expression means ONE thing: $-3 + 2 \\times (-4)$ is defined as $-3 + (2 \\times -4)$, a sum of a balance and a product. Grouping left to right computes a DIFFERENT expression, $(-3 + 2) \\times (-4)$ — with parentheses that aren't there. Negatives raise the stakes because each step also carries a sign decision (product of unlike signs is negative; adding two negatives goes deeper negative), so a slip in either the order or a single sign flips the final answer's direction entirely.",
    whenToUse: "Multi-step balance calculations, temperature changes with rates, evaluating formulas at negative inputs, and reading any expression before solving an equation built from it.",
    representations: [
      { kind: "story", label: "Balance plus fees", body: "$-3 + 2 \\times (-4)$: two $-4$ fees total $-8$; merged with the $-3$ balance: $-11$. The story forces the right order." },
      { kind: "tree", label: "The expression tree", body: "The $\\times$ sits BELOW the $+$: compute deep nodes first. $2 \\times (-4) = -8$ feeds upward into the sum." },
      { kind: "contrast", label: "What left-to-right computes", body: "$(-3 + 2) \\times (-4) = +4$ vs $-3 + 2 \\times (-4) = -11$: same symbols, different trees, opposite signs." }
    ],
    commonMistakes: [
      { label: "Working left to right", why: "Adding $-3 + 2$ first because it appears first — inserting parentheses the expression never had.", fix: "Scan for × and ÷ before touching anything: settle every product, then combine. The + waits its turn." },
      { label: "Dropping a negative mid-stream", why: "$2 \\times (-4)$ becoming $8$, or $-3 + (-8)$ becoming $+5$ — one sign lost anywhere flips everything after it.", fix: "Write each intermediate WITH its sign: $-3 + (-8)$. Adding two negatives digs deeper: $-11$." }
    ],
    connections: [
      { concept: "pemdas", note: "The same order convention — negatives are the stress test that exposes shortcuts." },
      { concept: "integer_mult", note: "Each product inside carries the sign rules." },
      { concept: "eval_expression", note: "Evaluating ax + b at negative values is exactly this skill with letters." }
    ],
    examples: [
      { question: "Calculate $-5 + 3 \\times (-2)$.", answer: "-11", explanation: "Multiply first: $3 \\times (-2) = -6$; then $-5 + (-6) = -11$." },
      { question: "Calculate $-2 + 4 \\times (-3)$.", answer: "-14", explanation: "$4 \\times (-3) = -12$, then $-2 - 12 = -14$." }
    ]
  },

  // ===========================================================================
  // FRACTIONS DEPTH (mixed numbers, structural comparison).
  // ===========================================================================
  mixed_number: {
    title: "Mixed Numbers & Improper Fractions",
    formula: "w\\tfrac{n}{d} = \\frac{w \\times d + n}{d}",
    oneLineSummary: "A mixed number and an improper fraction are two outfits for the same value — convert by trading wholes for parts at d parts per whole.",
    intuitionHook: "You have $2$ whole pizzas and $3$ extra quarter-slices. How many quarter-slices in total? Each whole pizza CASHES IN for $4$ quarters: $2 \\times 4 = 8$, plus the loose $3$ — eleven quarters, $\\frac{11}{4}$. The conversion is just exchanging big bills for coins.",
    whatItIs: "A mixed number ($2\\frac{3}{4}$) writes a value as wholes plus a proper part; an improper fraction ($\\frac{11}{4}$) counts everything in parts. Converting between them changes the notation, never the amount.",
    whyItWorks: "One whole IS $\\frac{d}{d}$ — that identity powers both directions. Going to improper: each of the $w$ wholes becomes $d$ parts, so the numerator is $w \\times d + n$ (multiply FIRST, because the wholes must be exchanged before the loose parts can join the count). Going back: divide — the quotient is how many full wholes the parts assemble into, the REMAINDER is what's left over: $\\frac{11}{4} \\to 11 \\div 4 = 2$ r $3 \\to 2\\frac{3}{4}$. Adding $w + n$ or gluing digits ($2$ and $3 \\to \\frac{23}{4}$) skips the exchange step and miscounts the wholes entirely.",
    whenToUse: "Adding and multiplying mixed amounts (recipes, measurements), placing values on number lines, reading rulers and measuring cups, interpreting division remainders.",
    representations: [
      { kind: "pizza", label: "Wholes cash in for slices", body: "$2\\frac{3}{4}$ pizzas in quarter-slices: $2 \\times 4 = 8$ from the wholes, $+3$ loose: $\\frac{11}{4}$." },
      { kind: "number_line", label: "Same point, two names", body: "$2\\frac{3}{4}$ and $\\frac{11}{4}$ land on the SAME tick — between $2$ and $3$, three quarter-steps past $2$." },
      { kind: "division", label: "Back via remainder", body: "$\\frac{11}{4}$: $4$ fits into $11$ twice (the wholes), remainder $3$ (the part): $2\\frac{3}{4}$." }
    ],
    commonMistakes: [
      { label: "Adding the whole to the numerator", why: "$2\\frac{3}{4} \\to \\frac{5}{4}$ — the $2$ joined the count without being exchanged into quarters first.", fix: "A whole is worth $d$ parts, not $1$: multiply before adding. $2 \\times 4 + 3 = 11$." },
      { label: "Gluing the digits", why: "$2\\frac{3}{4} \\to \\frac{23}{4}$ — treating the notation as digits instead of quantities ($\\frac{23}{4}$ is almost $6$, way past $2\\frac{3}{4}$).", fix: "Estimate first: $2\\frac{3}{4}$ is just under $3$, so the improper numerator must be just under $3 \\times 4 = 12$ — that's $11$, not $23$." }
    ],
    connections: [
      { concept: "fraction_simplify", note: "Both rest on the same identity: multiplying count and size of parts together preserves value." },
      { concept: "arithmetic_div", note: "Improper → mixed is division with remainder, wearing fraction clothes." },
      { concept: "fraction_add", note: "Adding mixed numbers usually routes through improper form — this conversion is the on-ramp." }
    ],
    examples: [
      { question: "Write $3\\frac{2}{5}$ as an improper fraction.", answer: "17/5", explanation: "$3 \\times 5 = 15$ fifths from the wholes, plus $2$: $\\frac{17}{5}$." },
      { question: "Write $\\frac{13}{4}$ as a mixed number.", answer: "3 1/4", explanation: "$4$ fits into $13$ three times (12), remainder $1$: $3\\frac{1}{4}$." }
    ]
  },

  fraction_compare: {
    title: "Comparing Fractions",
    formula: "\\frac{n}{n+g} = 1 - \\frac{g}{n+g} \\;\\; (\\text{larger } n \\Rightarrow \\text{closer to } 1)",
    oneLineSummary: "A fraction's size is a relationship, not a pair of numbers — compare by thinking about how much is missing from the whole, or against benchmarks like one half.",
    intuitionHook: "Which is more pizza: $\\frac{7}{8}$ or $\\frac{3}{4}$? Don't crunch — look at what's MISSING: $\\frac{7}{8}$ is one thin eighth short of a whole pizza; $\\frac{3}{4}$ is a whole fat quarter short. The one missing LESS is bigger. Strong comparers reason about the gap, not the digits.",
    whatItIs: "Deciding which of several fractions is largest. Tools, roughly in order of power: structural reasoning (distance to $0$, $\\frac{1}{2}$ or $1$), benchmarks, common denominators, and cross-multiplication as the fallback.",
    whyItWorks: "A fraction measures a part-to-whole RELATIONSHIP, so its size can't be read off either number alone: $\\frac{4}{5} > \\frac{5}{9}$ despite smaller digits. The gap trick works because fractions one step below a whole, $\\frac{n}{n+g}$, equal $1 - \\frac{g}{n+g}$ — and the missing piece $\\frac{g}{n+g}$ shrinks as $n$ grows (same $g$ split over a larger whole is a thinner slice). So in a family like $\\frac{2}{3}, \\frac{3}{4}, \\frac{4}{5}, \\frac{5}{6}$, the LAST is largest: it's missing the thinnest sliver. 'Bigger numbers = bigger fraction' is the precise opposite of how denominators work.",
    whenToUse: "Choosing the better deal or bigger share, ordering data given as rates, judging probabilities, estimating before computing — and number-line placement everywhere.",
    representations: [
      { kind: "gap", label: "What's missing", body: "$\\frac{7}{8}$ misses $\\frac{1}{8}$; $\\frac{3}{4}$ misses $\\frac{1}{4}$. Smaller gap → bigger fraction — no common denominator needed." },
      { kind: "benchmark", label: "Anchor at one half", body: "$\\frac{4}{9}$ is below $\\frac{1}{2}$ (since $4 < 4.5$), $\\frac{5}{8}$ above. Half the comparisons in the wild end right there." },
      { kind: "number_line", label: "Place, don't compute", body: "Each fraction is a point; comparing is just left-vs-right. $\\frac{2}{3}, \\frac{3}{4}, \\frac{4}{5}$ march rightward toward $1$." }
    ],
    commonMistakes: [
      { label: "Bigger numbers means bigger fraction", why: "Picking $\\frac{2}{5}$ over $\\frac{2}{3}$ because $5 > 3$ — but a bigger denominator means the whole is cut into SMALLER pieces.", fix: "Two pieces of a 3-cut pizza vs two pieces of a 5-cut: same count, fatter slices. When numerators match, the SMALLER denominator wins." },
      { label: "Comparing numerators alone", why: "Ranking $\\frac{5}{9}$ above $\\frac{4}{5}$ because $5 > 4$ — ignoring that the wholes are cut differently.", fix: "Check against $\\frac{1}{2}$ or $1$ first: $\\frac{5}{9}$ barely clears half; $\\frac{4}{5}$ is nearly whole." }
    ],
    connections: [
      { concept: "fraction_simplify", note: "Equivalent forms are what make comparison subtle — the same value wears many number-pairs." },
      { concept: "stat_probability", note: "Judging which event is likelier is comparing fractions in disguise." },
      { concept: "decimal_round", note: "Converting to decimals is the brute-force comparison when structure doesn't help." }
    ],
    examples: [
      { question: "Which is larger: $\\frac{5}{6}$ or $\\frac{7}{8}$?", answer: "7/8", explanation: "$\\frac{5}{6}$ is missing $\\frac{1}{6}$; $\\frac{7}{8}$ is missing only $\\frac{1}{8}$ — the smaller gap wins." },
      { question: "Which is larger: $\\frac{3}{7}$ or $\\frac{5}{8}$?", answer: "5/8", explanation: "$\\frac{3}{7}$ is below one half ($3 < 3.5$), $\\frac{5}{8}$ is above ($5 > 4$)." }
    ]
  },

  // ===========================================================================
  // STATISTICS DEPTH (compound events).
  // ===========================================================================
  compound_probability: {
    title: "Compound Probability",
    formula: "P(A \\text{ and } B) = P(A) \\times P(B) \\;\\; (\\text{independent events})",
    oneLineSummary: "For independent events, 'and' multiplies the probabilities — each extra requirement shrinks the chance, which is exactly what multiplying by a fraction does.",
    intuitionHook: "Flip a coin and roll a die. Heads alone: half the time. Heads AND a six? Of the half where the coin cooperates, only one time in six does the die join in: a sixth OF a half — $\\frac{1}{2} \\times \\frac{1}{6} = \\frac{1}{12}$. Stacking demands multiplies fractions, and the chance can only shrink.",
    whatItIs: "The probability that two independent events BOTH happen. Independent means neither outcome influences the other (separate spinners, coin then die); the joint probability is the product of the individual ones.",
    whyItWorks: "Count the outcome PAIRS: a coin (2 outcomes) with a die (6 outcomes) makes $2 \\times 6 = 12$ equally likely pairs, and exactly one is (heads, 6) — so $\\frac{1}{12}$, which is precisely $\\frac{1}{2} \\times \\frac{1}{6}$. The multiplication IS the grid of possibilities. Adding instead gives $\\frac{1}{2} + \\frac{1}{6} = \\frac{2}{3}$ — a probability that GREW after adding a second demand, which the smell test rejects instantly: requiring more can never be more likely. (Adding has its own job: either-or questions about mutually exclusive outcomes of a single draw.)",
    whenToUse: "Multiple coin flips or dice rolls, winning two games in a row, two components both failing, password-guessing odds, any chain of independent requirements.",
    representations: [
      { kind: "grid", label: "The outcome grid", body: "Coin × die: $2 \\times 6 = 12$ cells, one cell is (H, 6). The product rule is just cell-counting." },
      { kind: "tree", label: "Branch then branch again", body: "Half the tree is heads; a sixth of THAT branch is a six. Fractions of fractions multiply." },
      { kind: "shrink", label: "Demands shrink chances", body: "$P = \\frac{1}{2} \\to \\frac{1}{12}$: every extra requirement multiplies by something below 1. If your 'and' made the number grow, an addition snuck in." }
    ],
    commonMistakes: [
      { label: "Adding the probabilities", why: "$P(\\text{heads and } 6) = \\frac{1}{2} + \\frac{1}{6} = \\frac{2}{3}$ — but demanding BOTH can't beat the chance of either alone.", fix: "Run the smell test: more conditions ⇒ smaller chance. 'And' multiplies; 'or' (for exclusive outcomes) is what adds." },
      { label: "Ignoring one event", why: "Reporting $\\frac{1}{6}$ for heads-and-six — the coin's veto never got counted.", fix: "Draw the grid: only the rows where the FIRST event succeeded even get to ask about the second." }
    ],
    connections: [
      { concept: "stat_probability", note: "Single-event probability supplies the factors this rule multiplies." },
      { concept: "fraction_mult", note: "A fraction OF a fraction — the arithmetic engine under the product rule." },
      { concept: "combinations", note: "Counting outcome pairs is the first step into combinatorics." }
    ],
    examples: [
      { question: "Two spinners have $3$ and $5$ equal sections, one winning section each. What is the probability both land on the winning section?", answer: "1/15", explanation: "$\\frac{1}{3} \\times \\frac{1}{5} = \\frac{1}{15}$ — one pair out of $15$ equally likely pairs." },
      { question: "What is the probability of flipping heads twice in a row?", answer: "1/4", explanation: "$\\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4}$: of the four pair-outcomes HH, HT, TH, TT, one is HH." }
    ]
  },

  // ===========================================================================
  // DECIMALS DEPTH (representation fluency: percent ↔ decimal ↔ fraction, ordering).
  // ===========================================================================
  percent_decimal_convert: {
    title: "Percents & Decimals",
    formula: "p\\% = \\frac{p}{100} \\quad (\\text{two decimal slides})",
    oneLineSummary: "A percent IS a decimal in disguise — 'per hundred' means divide by 100, so the point slides exactly two places.",
    intuitionHook: "A $35\\%$ discount and the decimal $0.35$ are the SAME fact wearing different clothes: thirty-five hundredths. The percent sign is literally a squashed '$/100$' — once you see that, converting stops being a rule and becomes a translation.",
    whatItIs: "Converting between percent and decimal notation: percent → decimal divides by 100 (slide the point two left); decimal → percent multiplies by 100 (slide two right). The quantity never changes — only its outfit.",
    whyItWorks: "Percent means per hundred, so $p\\%$ is DEFINED as $\\frac{p}{100}$. Dividing by 100 moves the decimal point one place per zero — two places, always. That's why the one-place slide ($35\\% \\to 3.5$) is the classic slip: it divides by ten, leaving the value ten times too large. Sanity anchors kill the error fast: $100\\% = 1$ (the whole), $50\\% = 0.5$ (half), and anything under $100\\%$ must land below $1$.",
    whenToUse: "Discounts and tax, interest rates, statistics and survey results, probability ↔ percent translation, and any calculator work where the percent must enter as a decimal.",
    representations: [
      { kind: "translation", label: "Same value, two outfits", body: "$35\\% = \\frac{35}{100} = 0.35$ — the percent sign is a hidden ÷100." },
      { kind: "anchor", label: "Sanity anchors", body: "$100\\% = 1$, $50\\% = 0.5$, $7\\% = 0.07$. Below one hundred percent ⇒ below one." },
      { kind: "slides", label: "Two slides, always", body: "Percent → decimal: two left. Decimal → percent: two right. One per zero in 100." }
    ],
    commonMistakes: [
      { label: "Sliding one place instead of two", why: "$35\\% \\to 3.5$ — dividing by 10, because one slide 'feels like enough'.", fix: "Anchor on $100\\% = 1$: if $100\\%$ takes two slides to become $1$, so does everything else. $35\\% = 0.35$." },
      { label: "Dropping the percent sign", why: "$7\\% \\to 7$ — treating the sign as decoration. As a multiplier, $7$ is a hundred times too strong.", fix: "Read the sign as '$/100$' out loud: seven per hundred. $0.07$ of a price, not seven times the price." }
    ],
    connections: [
      { concept: "percentage_of", note: "Computing $p\\%$ OF a number starts with exactly this conversion." },
      { concept: "decimal_mult", note: "Sliding the point is multiplying/dividing by powers of ten." },
      { concept: "fraction_decimal_convert", note: "The third outfit: $35\\% = 0.35 = \\frac{7}{20}$ — one value, three notations." }
    ],
    examples: [
      { question: "Write $42\\%$ as a decimal.", answer: "0.42", explanation: "$42 \\div 100 = 0.42$ — two slides left." },
      { question: "Write $0.08$ as a percent.", answer: "8", explanation: "$0.08 \\times 100 = 8\\%$ — two slides right." }
    ]
  },

  decimal_compare: {
    title: "Comparing Decimals",
    formula: "\\text{compare place by place, left to right}",
    oneLineSummary: "Decimal size is decided left to right, one place at a time — the number of digits says nothing about the size.",
    intuitionHook: "Which is more money: $\\$0.5$ or $\\$0.45$? The first is $50$ cents, the second $45$ — yet $0.45$ LOOKS bigger because it has more digits. Whole-number instinct says longer = larger; decimals break that rule on purpose, because digits to the right only ever add smaller and smaller crumbs.",
    whatItIs: "Ordering decimals by value. The algorithm: compare the tenths digit first; if tied, move to hundredths, and so on. The first place where the digits differ settles it, no matter what follows.",
    whyItWorks: "Place value is a strict hierarchy: one tenth outweighs ANY number of hundredths and thousandths combined ($0.0999... < 0.1$). So once a higher place wins, nothing downstream can overturn it — that's why $0.5 > 0.499$ despite the three digits. The cleanest mental trick is padding with zeros until the lengths match: $0.5$ vs $0.45$ becomes $0.50$ vs $0.45$ — fifty hundredths against forty-five, and the illusion evaporates. Padding works because trailing zeros add nothing: $0.5$ and $0.50$ are the same point on the line.",
    whenToUse: "Comparing prices and measurements, reading sensor or lab values, ordering race times (where smaller wins), placing decimals on number lines, judging rounding results.",
    representations: [
      { kind: "money", label: "Cents make it concrete", body: "$0.5 = 50$ cents, $0.45 = 45$ cents, $0.399 = 39.9$ cents — money translates every comparison instantly." },
      { kind: "padding", label: "Pad to equal length", body: "$0.5$ vs $0.45$ → $0.50$ vs $0.45$: trailing zeros change nothing and the columns line up fairly." },
      { kind: "hierarchy", label: "Tenths outrank everything after", body: "$0.5 > 0.499$: the $4$ lost in the tenths place, and no quantity of $9$s behind it can catch up." }
    ],
    commonMistakes: [
      { label: "Longer means larger", why: "Picking $0.399$ over $0.4$ because $399 > 4$ — reading the decimal part as a whole number.", fix: "Pad and compare columns: $0.400$ vs $0.399$ — the tenths tie ($4$=$4$)... no wait, $4 > 3$ settles it at the FIRST digit. Or convert to money: $40$ cents beats $39.9$." },
      { label: "Longer means smaller", why: "Over-correcting with fraction logic ('thousandths are tinier, so $0.399 < 0.39$').", fix: "Digit count isn't evidence either way. Only the place-by-place comparison is: $0.399 > 0.390$ because the thousandths digit $9 > 0$." }
    ],
    connections: [
      { concept: "decimal_round", note: "Rounding asks which gridline is closest — comparison is the engine inside." },
      { concept: "fraction_compare", note: "The same lesson in fraction clothes: representation size ≠ value size." },
      { concept: "stat_median", note: "Finding a median starts by ORDERING values — often decimals." }
    ],
    examples: [
      { question: "Which is larger: $0.6$ or $0.58$?", answer: "0.6", explanation: "Pad: $0.60$ vs $0.58$ — sixty hundredths beats fifty-eight." },
      { question: "Which is larger: $0.72$ or $0.7199$?", answer: "0.72", explanation: "Tenths and hundredths tie; the next digit decides: $0.7200 > 0.7199$." }
    ]
  },

  fraction_decimal_convert: {
    title: "Fractions & Decimals",
    formula: "\\frac{a}{b} = a \\div b",
    oneLineSummary: "The fraction bar is a division sign — a fraction becomes a decimal by actually performing the divide, never by rearranging its digits.",
    intuitionHook: "Three friends split $\\$3$: a dollar each. Three friends split $\\$1$: that's $\\frac{1}{3}$ — and also $1 \\div 3 = 0.333...$ The fraction and the division were never two different things. $\\frac{3}{4}$ of a dollar is $3$ quarters: $75$ cents, $0.75$.",
    whatItIs: "Converting a fraction to its decimal form by dividing numerator by denominator. Benchmark fractions have exact, memorable forms: $\\frac{1}{2} = 0.5$, $\\frac{1}{4} = 0.25$, $\\frac{3}{4} = 0.75$, $\\frac{1}{5} = 0.2$, $\\frac{1}{8} = 0.125$.",
    whyItWorks: "$\\frac{a}{b}$ MEANS $a$ split into $b$ parts — which is the division $a \\div b$ by definition. A slick shortcut works whenever the denominator can scale to a power of ten: $\\frac{3}{4} = \\frac{75}{100} = 0.75$ — and that's the same maneuver as long division, just done in one jump. The digits themselves never simply 'move behind the point': $\\frac{3}{4} \\ne 0.34$, as a half-second size check shows ($\\frac{3}{4}$ is most of a whole; $0.34$ is barely a third). Estimation is the everywhere-armor: know roughly where the fraction lives before any digits get written.",
    whenToUse: "Money and measurements, calculator input/output, comparing a fraction against a decimal, percent work (via the decimal), and reading scales and gauges.",
    representations: [
      { kind: "money", label: "Quarters and dimes", body: "$\\frac{3}{4}$ dollar = 3 quarters = $0.75$; $\\frac{2}{5}$ dollar = 4 dimes = $0.40$. Coins are pre-converted fractions." },
      { kind: "scaling", label: "Aim for a power of ten", body: "$\\frac{3}{4} = \\frac{3 \\times 25}{4 \\times 25} = \\frac{75}{100} = 0.75$ — equivalent fractions do the long division in one hop." },
      { kind: "benchmark", label: "The famous five", body: "$\\frac{1}{2} = 0.5$, $\\frac{1}{4} = 0.25$, $\\frac{3}{4} = 0.75$, $\\frac{1}{5} = 0.2$, $\\frac{1}{8} = 0.125$ — anchors that locate every nearby fraction." }
    ],
    commonMistakes: [
      { label: "Gluing the digits", why: "$\\frac{3}{4} \\to 0.34$ — copying numerator and denominator behind a point instead of dividing.", fix: "Size-check first: $\\frac{3}{4}$ is three quarters of the way to $1$, so the decimal must be far above $0.34$. Then divide: $3 \\div 4 = 0.75$." },
      { label: "Misplacing the point after dividing", why: "$3 \\div 4$ computed as $7.5$ — right digits, wrong magnitude.", fix: "A proper fraction (top < bottom) ALWAYS lands below $1$. If the decimal beats $1$, the point is in the wrong house." }
    ],
    connections: [
      { concept: "decimal_div", note: "The conversion IS a decimal division — this is its most-used application." },
      { concept: "fraction_simplify", note: "Scaling the denominator to 100 is equivalent-fraction work in reverse." },
      { concept: "percent_decimal_convert", note: "Chain one step further and every fraction becomes a percent." }
    ],
    examples: [
      { question: "Write $\\frac{2}{5}$ as a decimal.", answer: "0.4", explanation: "$\\frac{2}{5} = \\frac{4}{10} = 0.4$ — or simply $2 \\div 5$." },
      { question: "Write $\\frac{1}{8}$ as a decimal.", answer: "0.125", explanation: "Halve $0.5$ twice: $\\frac{1}{4} = 0.25$, $\\frac{1}{8} = 0.125$." }
    ]
  },

  // ===========================================================================
  // POWERS DEPTH (cube roots, the power rule).
  // ===========================================================================
  cube_root: {
    title: "Cube Roots",
    formula: "\\sqrt[3]{n} = r \\iff r \\times r \\times r = n",
    oneLineSummary: "The cube root asks: which number, used three times in a product, builds this? It's the edge of a cube, recovered from its volume.",
    intuitionHook: "A storage cube holds $64$ unit boxes. How long is each edge? You need the number that multiplied by itself THREE times gives $64$ — that's $4$, because $4 \\times 4 \\times 4 = 64$. The cube root of a volume is literally the edge of the cube.",
    whatItIs: "The cube root of $n$ is the number $r$ with $r^3 = n$. Perfect cubes ($8, 27, 64, 125, 216$) have whole-number roots — and unlike square roots, cube roots of negatives exist: $\\sqrt[3]{-8} = -2$.",
    whyItWorks: "Cubing and cube-rooting are inverses: $4 \\to 64$ by cubing, $64 \\to 4$ by rooting — the same staircase walked backwards. The little $3$ in $\\sqrt[3]{n}$ COUNTS the identical factors; it never divides ($64 \\div 3$ is irrelevant) and it isn't the square root's $2$ in disguise: $\\sqrt{64} = 8$ but $\\sqrt[3]{64} = 4$ — same $64$, different questions ('which number twice?' vs 'which number three times?'). Knowing the cubes $2^3 = 8$, $3^3 = 27$, $4^3 = 64$, $5^3 = 125$, $6^3 = 216$ as facts makes every recognition instant.",
    whenToUse: "Edges from volumes (tanks, boxes, dice), scaling laws (double the edge → eight times the volume, and back), solving $x^3 = n$, and side-by-side with square roots in the 8.EE band.",
    representations: [
      { kind: "volume", label: "Edge of a cube", body: "$\\sqrt[3]{64}$ is the edge of a cube with volume $64$: a $4 \\times 4 \\times 4$ stack of unit boxes." },
      { kind: "inverse", label: "Cubing, reversed", body: "$4 \\to 64 \\to 4$: cube right, root left — the same arrow walked both ways." },
      { kind: "ladder", label: "Know the cubes", body: "$8, 27, 64, 125, 216$ — five landmarks; every perfect-cube question is a lookup once they're yours." }
    ],
    commonMistakes: [
      { label: "Mixing cube and square roots", why: "$\\sqrt[3]{64} = 8$ — answering the square root because $64$ is famous as $8^2$.", fix: "Read the index first: the $3$ demands THREE equal factors. $8 \\times 8 \\times 8 = 512$, way past $64$; only $4$ works." },
      { label: "Dividing by three", why: "$\\sqrt[3]{27} = 9$ — the little $3$ misread as a division.", fix: "Check by rebuilding: $9 \\times 9 \\times 9 = 729$, not $27$. The index counts factors; it never divides the number." }
    ],
    connections: [
      { concept: "square_root", note: "Same inverse idea, one factor deeper — and the index tells which question is being asked." },
      { concept: "geo_volume_rect", note: "Volume formulas are where cube roots come from: V = e³ run backwards." },
      { concept: "exponent_power", note: "Fluency with small powers IS fluency with their roots." }
    ],
    examples: [
      { question: "Compute $\\sqrt[3]{125}$.", answer: "5", explanation: "$5 \\times 5 \\times 5 = 125$, so the cube root is $5$." },
      { question: "Compute $\\sqrt[3]{27}$.", answer: "3", explanation: "$3^3 = 27$ — three equal factors of $3$." }
    ]
  },

  exponent_power_rule: {
    title: "Power Rule for Exponents",
    formula: "(x^{a})^{b} = x^{ab}",
    oneLineSummary: "Raising a power to a power MULTIPLIES the exponents — b nested piles of a copies is a×b copies in total.",
    intuitionHook: "$(x^{3})^{2}$ says: take the pile $x^3$ and square IT — two piles of three copies each. Lay them out: $x \\cdot x \\cdot x$ next to $x \\cdot x \\cdot x$ — six copies, $x^6$. Two piles of three is $2 \\times 3$, and that's the whole rule.",
    whatItIs: "The power rule simplifies a power raised to another power: keep the base, multiply the exponents. It's the third member of the exponent-rule family, next to the product rule (add) and quotient rule (subtract).",
    whyItWorks: "An exponent counts copies, so $(x^{a})^{b}$ counts copies OF copies: $b$ groups, each holding $a$ factors of $x$ — $a \\times b$ factors in all. The danger is the product-rule reflex: $x^{a} \\cdot x^{b}$ pools piles SIDE BY SIDE (exponents add), while $(x^{a})^{b}$ NESTS them (exponents multiply). Numbers settle any doubt: $(2^{2})^{3} = 4^3 = 64 = 2^{6}$, and $6 = 2 \\times 3$, not $2 + 3$.",
    whenToUse: "Simplifying nested powers, scientific-notation powers ($(10^{3})^{2} = 10^{6}$), compound growth over grouped periods, and algebraic manipulation throughout Algebra I and II.",
    representations: [
      { kind: "nesting", label: "Piles of piles", body: "$(x^{3})^{2}$: two bags, each holding three $x$'s — $2 \\times 3 = 6$ factors: $x^{6}$." },
      { kind: "numeric", label: "Check with numbers", body: "$(2^{2})^{3} = 4 \\cdot 4 \\cdot 4 = 64 = 2^{6}$; the exponents multiplied: $2 \\times 3 = 6$." },
      { kind: "family", label: "The three rules", body: "Side by side → add ($x^a x^b = x^{a+b}$). Stacked → subtract. NESTED → multiply: $(x^a)^b = x^{ab}$." }
    ],
    commonMistakes: [
      { label: "Adding the exponents", why: "$(x^{4})^{3} = x^{7}$ — the product-rule reflex fired on a nested power.", fix: "Ask: side-by-side or nested? A bracket around a power means nesting, and nesting multiplies: $x^{12}$. Expand a small case to feel it: $(x^2)^2 = x^2 \\cdot x^2 = x^4$." },
      { label: "Raising the exponent to the power", why: "$(x^{2})^{3} = x^{8}$ — computing $2^{3}$ in the exponent instead of $2 \\times 3$.", fix: "The outer exponent multiplies the inner one; it never exponentiates it. Count the factors: three bags of two is six, not eight." }
    ],
    connections: [
      { concept: "exponent_product_rule", note: "The contrast that defines both: side-by-side adds, nested multiplies." },
      { concept: "scientific_notation", note: "Powers of powers of ten — $(10^3)^2$ — appear whenever scaled units get squared." },
      { concept: "square_binomial", note: "Squaring expressions: $(x^a)^2 = x^{2a}$ is the clean case of what (x+a)² is the messy case of." }
    ],
    examples: [
      { question: "Simplify $(x^{3})^{4}$.", answer: "x^12", explanation: "Nested powers multiply: $3 \\times 4 = 12$, so $x^{12}$." },
      { question: "Simplify $(x^{5})^{3}$.", answer: "x^15", explanation: "$5 \\times 3 = 15$ — fifteen factors of $x$ in total." }
    ]
  },

  // ===========================================================================
  // GEOMETRY DEPTH II (composite figures).
  // ===========================================================================
  geo_composite: {
    title: "Composite Figures",
    formula: "A_{\\text{shape}} = A_{\\text{whole}} - A_{\\text{cut}} \\;\\; (\\text{or a sum of pieces})",
    oneLineSummary: "Complicated shapes are simple shapes in combination — add the pieces, or subtract the holes from an enclosing whole.",
    intuitionHook: "An L-shaped room has no 'L-area formula' — and needs none. See it as a big rectangle with a corner bitten off: full rectangle minus the bite. Or slice the L into two rectangles and add. Two roads, same area; the skill is SEEING the decomposition.",
    whatItIs: "Finding areas of figures built from (or carved out of) basic shapes: L-shapes, frames, T-shapes. The two strategies are decomposition (slice into pieces, add) and subtraction (enclose in a simple whole, remove the gaps).",
    whyItWorks: "Area is additive: a region split into non-overlapping pieces has area equal to the pieces' sum — that's what area MEANS as a measure. Subtraction is the same axiom rearranged: whole = shape + hole, so shape = whole − hole. The tempting wrong move — shrinking BOTH side lengths by the notch's dimensions, $(A-C)(B-D)$ — fails because subtracting from a length removes an entire STRIP across the figure, not one corner: side lengths and areas live in different dimensions and can't absorb each other's corrections.",
    whenToUse: "Floor plans and paint coverage, picture frames and borders (area between rectangles), garden plots with cutouts, cross-sections in engineering — most real-world area problems are composite.",
    representations: [
      { kind: "subtract", label: "Whole minus bite", body: "L-shape = $8 \\times 6$ rectangle $-$ $3 \\times 2$ corner: $48 - 6 = 42$. Enclose, then remove." },
      { kind: "slice", label: "Slice and add", body: "The same L cut into two rectangles: $8 \\times 4 + 5 \\times 2 = 32 + 10 = 42$ — different road, same destination (a built-in check!)." },
      { kind: "grid", label: "Count unit squares", body: "On grid paper both methods are visible at once: the bite's squares are exactly the ones the big rectangle over-counts." }
    ],
    commonMistakes: [
      { label: "Ignoring the cut", why: "Reporting the enclosing rectangle's full area — the missing corner counted as if it were floor.", fix: "Trace the actual boundary. If the shape has a notch, some of the big rectangle ISN'T shape — name the bite's area explicitly and subtract it." },
      { label: "Shrinking both sides", why: "Computing $(8-3)(6-2)$ for a $3 \\times 2$ corner cut — but each subtracted length removes a full strip, slicing away far more than the corner.", fix: "Corrections to AREA happen in area units: subtract $3 \\times 2 = 6$ square units, not $3$ from one ruler and $2$ from another." }
    ],
    connections: [
      { concept: "geo_area_rect", note: "Every piece is a plain rectangle — composites are area facts assembled." },
      { concept: "geo_surface_area_rect", note: "Surface area already thinks in pieces: six faces summed is decomposition practice." },
      { concept: "integer_sub", note: "The subtraction strategy runs on clean whole-minus-part arithmetic." }
    ],
    examples: [
      { question: "An L-shaped floor is a $9 \\times 7$ rectangle with a $3 \\times 2$ corner cut away. What is its area?", answer: "57", explanation: "$9 \\times 7 = 63$ minus the bite $3 \\times 2 = 6$: $57$ square units." },
      { question: "A $10 \\times 8$ rectangle has a $4 \\times 3$ corner removed. What is the remaining area?", answer: "68", explanation: "$80 - 12 = 68$." }
    ]
  },

  // ===========================================================================
  // STATISTICS DEPTH II (reverse-mean reasoning).
  // ===========================================================================
  mean_missing_value: {
    title: "Missing Value from the Mean",
    formula: "x = n \\cdot \\bar{x} - (\\text{sum of the known values})",
    oneLineSummary: "A mean is a total in disguise — multiply it back out, subtract what you already have, and the missing value is whatever's left.",
    intuitionHook: "You need a $90$ average across four tests, and your first three were $85$, $92$ and $88$. The average makes a promise about the TOTAL: $4 \\times 90 = 360$ points. So far you've banked $265$ — the last test must supply $360 - 265 = 95$. Every 'what do I need on the final' calculation ever done is this exact move.",
    whatItIs: "Finding an unknown data value when the mean of the full set is known. Reverse the averaging: total = count × mean, then the missing value is the total minus the known values' sum.",
    whyItWorks: "The mean is DEFINED as total ÷ count, so total = count × mean — the definition read right-to-left. The mean compresses the whole data set into one number, but the total is what it actually certifies; individual values are free to sit anywhere as long as they honor that sum. That's why 'the missing score probably equals the mean' fails: the known values already sit off-center (their average isn't the target), so the last value must pull AGAINST their lean to land the promised total — often well away from the mean itself.",
    whenToUse: "Grade targets ('what do I need on the final?'), sports averages, balancing budgets to a target daily spend, quality control (one lost measurement), any backwards-from-the-average puzzle.",
    representations: [
      { kind: "promise", label: "The total promise", body: "Mean $90$ over $4$ tests promises $360$ points. Banked: $265$. Owed: $95$. Three numbers, no algebra." },
      { kind: "balance", label: "The see-saw", body: "Values below the mean must be balanced by values above it: if the three known scores lean low, the missing one must sit high." },
      { kind: "equation", label: "As an equation", body: "$\\frac{85 + 92 + 88 + x}{4} = 90 \\implies x = 360 - 265$ — the formula is the story, symbolized." }
    ],
    commonMistakes: [
      { label: "Answering with the mean itself", why: "'The average is 90, so the last test must be 90' — but the known values rarely average exactly to the target.", fix: "Check the lean: $85, 92, 88$ average $88.3$, BELOW the target — so the missing score must land ABOVE $90$ to compensate. Compute the totals." },
      { label: "Never converting to a total", why: "Trying to reason directly with the mean and getting lost — the mean alone doesn't say what any value is.", fix: "First move, always: total $=$ count $\\times$ mean. Once the promise is a number, the rest is subtraction." }
    ],
    connections: [
      { concept: "stat_mean", note: "The definition run backwards — computing means forward is the prerequisite." },
      { concept: "linear_one_step", note: "It's an equation in disguise: sum + x = total, solved by one subtraction." },
      { concept: "stat_range", note: "The balance view (values above vs below the mean) is the doorway to spread and deviations." }
    ],
    examples: [
      { question: "The mean of four scores is $12$. Three of them are $9$, $14$ and $11$. What is the fourth?", answer: "14", explanation: "Total promised: $4 \\times 12 = 48$. Banked: $34$. Missing: $48 - 34 = 14$." },
      { question: "The mean of four numbers is $10$; three are $7$, $12$ and $9$. Find the fourth.", answer: "12", explanation: "$40 - 28 = 12$." }
    ]
  },

  // ===========================================================================
  // INTEGERS DEPTH II (ordering on the number line).
  // ===========================================================================
  integer_compare: {
    title: "Ordering Integers",
    formula: "a < b \\iff a \\text{ lies left of } b \\text{ on the number line}",
    oneLineSummary: "Smaller means further left on the number line — among negatives, the one with BIGGER digits is the SMALLER number.",
    intuitionHook: "Which is colder: $-8°$ or $-3°$? Minus eight, obviously — it's deeper below freezing. Yet on paper, $8 > 3$ whispers that $-8$ should be 'bigger'. Temperature already taught you the truth: the further below zero, the smaller. The number line just draws what winter feels like.",
    whatItIs: "Ordering positive and negative integers by value. The rule is geometric: every number sits at a point on the number line, and left means smaller — always, regardless of how large the digits look.",
    whyItWorks: "The digits of a number measure its DISTANCE from zero (that's absolute value); the sign says which side of zero it lives on. Order is about position, not distance: $-8$ is eight steps left of zero, $-3$ only three, so $-8$ sits further left and is smaller. Money makes it concrete — owing $8$ leaves you poorer than owing $3$ — and every positive number, however tiny, beats every negative one, because right of zero always beats left of it.",
    whenToUse: "Temperatures, elevations and depths, bank balances and debts, golf scores, sorting any data with negatives — and reading inequalities like $x > -4$ correctly.",
    representations: [
      { kind: "number_line", label: "Left is less", body: "$-8 \\;\\; -3 \\;\\; 0 \\;\\; 4 \\;\\; 8$: written in line order, already sorted. Position IS the comparison." },
      { kind: "temperature", label: "Below zero", body: "$-8°$ is colder than $-3°$ — the thermometer is a vertical number line everyone already trusts." },
      { kind: "money", label: "Debts", body: "A balance of $-8$ coins is worse than $-3$: bigger debt, smaller fortune. Digits measure the size of the hole." }
    ],
    commonMistakes: [
      { label: "Ranking negatives by their digits", why: "Choosing $-3$ as smaller than $-8$ because $3 < 8$ — comparing distances when the question asked about positions.", fix: "Translate to temperature or debt: which is colder, which owes more? Or sketch the line: $-8$ sits LEFT of $-3$." },
      { label: "Putting a negative above a positive", why: "Feeling that $-9$ with its big digits should beat $2$.", fix: "Zero is the gatekeeper: everything negative is below $0$, everything positive above. $2 > 0 > -9$, no contest." }
    ],
    connections: [
      { concept: "absolute_value", note: "Digits = distance from zero; sign = side. Comparison uses the side first, distance second." },
      { concept: "integer_sub", note: "Subtracting walks the line leftward — ordering is reading the line standing still." },
      { concept: "inequality_one_step_add", note: "Solution ranges like x > -4 only make sense once the line's order is solid." }
    ],
    examples: [
      { question: "Which is smaller: $-9$ or $-2$?", answer: "-9", explanation: "$-9$ lies further left (deeper below zero): a $9$-coin debt beats a $2$-coin debt at being broke." },
      { question: "Order from smallest: $3, -5, 0, -1$.", answer: "-5, -1, 0, 3", explanation: "Number-line order, left to right: $-5 < -1 < 0 < 3$." }
    ]
  },

  // ===========================================================================
  // EXPRESSIONS DEPTH II (words → symbols).
  // ===========================================================================
  translate_expression: {
    title: "Words to Expressions",
    formula: "\\text{\"}b\\text{ more than }a\\text{ times a number\"} = ax + b",
    oneLineSummary: "Translating words into algebra is building the expression inside-out — find the core quantity first, then apply each phrase to it, watching for English's reversed 'less than'.",
    intuitionHook: "A taxi fare: '$3$ per kilometer, plus a $\\$5$ pickup fee'. Before you compute anything, you can WRITE it: $3x + 5$. Algebra's superpower is exactly this — turning a sentence into a machine. The translation step, not the arithmetic, is where word problems are won or lost.",
    whatItIs: "Converting verbal phrases into algebraic expressions: 'times' and 'of' multiply, 'more than' adds, 'less than' subtracts — in reverse — and the order of phrases tells you what wraps what.",
    whyItWorks: "Phrases nest like the operations they describe. '$5$ more than $3$ times a number' has a core ('3 times a number' → $3x$) and a modifier ('5 more than' → $+5$ applied to that core): $3x + 5$. Parentheses appear only when the words group first: '$3$ times the SUM of a number and 5' wraps before multiplying — $3(x+5)$, a genuinely different machine (test $x=2$: $11$ vs $21$). The notorious reversal: '$5$ less than $y$' means $y - 5$, not $5 - y$ — English names the amount removed first, but algebra writes the thing it's removed FROM first. '3 less than 10' is 7; the words and symbols run opposite directions.",
    whenToUse: "Setting up every equation from a story: fares, plans and fees, perimeter conditions, age puzzles — translation is step one of all applied algebra.",
    representations: [
      { kind: "machine", label: "Build inside-out", body: "Core first: 'twice a number' → $2x$. Then the wrapper: '7 more than' → $2x + 7$. Each phrase is one assembly step." },
      { kind: "test_value", label: "Check with a number", body: "Does '$3$ times the sum of $x$ and $5$' mean $3x+5$ or $3(x+5)$? Try $x = 2$: the words promise $3 \\times 7 = 21$ — the parentheses win." },
      { kind: "reversal", label: "The 'less than' flip", body: "'$5$ less than $y$' = $y - 5$. Anchor: '3 less than 10' is 7 = $10 - 3$. The words run backwards; the math doesn't." }
    ],
    commonMistakes: [
      { label: "Reversing the subtraction", why: "Writing '$4$ less than $3x$' as $4 - 3x$ — following the word order instead of the meaning.", fix: "Test with plain numbers: '4 less than 10' is 6, which is $10 - 4$. The amount removed goes SECOND: $3x - 4$." },
      { label: "Grouping what wasn't grouped", why: "Turning '$5$ more than $3$ times $x$' into $3(x + 5)$ — letting the addition sneak inside the multiplication.", fix: "Find the core phrase first: '3 times x' stands alone as $3x$; the '5 more' arrives after. Only 'the sum/the quantity' words create parentheses." }
    ],
    connections: [
      { concept: "eval_expression", note: "Evaluating is running the machine; translating is building it — inverse fluencies." },
      { concept: "distribute", note: "Why $3(x+5) \\ne 3x+5$: distribution shows the grouped version multiplies the 5 too." },
      { concept: "multi_step_word", note: "Word problems = translate, then compute. This is the translate half." }
    ],
    examples: [
      { question: "Translate: \"$7$ more than $4$ times a number $x$\".", answer: "4x + 7", explanation: "Core: $4x$. Wrapper: $+7$. Result: $4x + 7$." },
      { question: "Translate: \"$3$ less than $5$ times a number $x$\".", answer: "5x - 3", explanation: "'Less than' reverses: the $3$ is removed FROM $5x$: $5x - 3$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY DEPTH III (angle pairs at a crossing).
  // ===========================================================================
  geo_angles_lines: {
    title: "Angles at a Crossing",
    formula: "\\text{vertical: equal} \\quad\\;\\; \\text{adjacent on a line: sum to } 180^{\\circ}",
    oneLineSummary: "Two crossing lines make two angle relationships: opposite (vertical) angles are equal, neighboring angles on a straight line sum to 180°.",
    intuitionHook: "Open a pair of scissors. The gap at the top and the gap at the bottom are obviously the same angle — close one and the other closes with it. That's vertical angles: equal not by decree but because both blades move together. The side gaps? Each pairs with a top gap to fill the straight blade — together they make $180°$.",
    whatItIs: "When two straight lines cross they form four angles. Opposite (vertical) angles are always equal; adjacent angles — sharing one arm, sitting together along a straight line — are supplementary (sum to $180°$).",
    whyItWorks: "Everything follows from one fact: a straight line is a $180°$ angle. Call the four angles $a, b, a', b'$ going around. $a$ and $b$ fill one straight line, so $a + b = 180°$. But $b$ and $a'$ fill the OTHER straight line too: $b + a' = 180°$. Two things that complete the same partner must be equal: $a = a' = 180° - b$. Vertical angles are equal because each is the same leftover of the same straight line — the 'rule' is just subtraction done twice. The $90°$ instinct belongs to complementary angles (right-angle corners) and has no business at a straight crossing.",
    whenToUse: "Road intersections and map angles, scissor and lever mechanisms, finding unknown angles in figures, and as the base for parallel-line angle chasing (corresponding/alternate angles).",
    representations: [
      { kind: "scissors", label: "Blades move together", body: "Opening the scissors widens BOTH opposite gaps at once — vertical angles can't disagree." },
      { kind: "subtraction", label: "Same leftover twice", body: "$a = 180° - b$ and $a' = 180° - b$: equal because they're the same subtraction. The X holds two straight lines, each worth $180°$." },
      { kind: "four_angles", label: "Only two sizes", body: "The four angles at a crossing come in two matched pairs: $35°, 145°, 35°, 145°$ — know one, know all four." }
    ],
    commonMistakes: [
      { label: "Subtracting from 180° for a vertical angle", why: "Computing the OPPOSITE angle as $180° - 35° = 145°$ — applying the neighbor rule to the wrong pair.", fix: "Opposite = equal (the scissors); NEIGHBOR = supplementary (the straight line). Locate the angle first: across the X, or beside it?" },
      { label: "Using 90° at a straight line", why: "Computing a neighbor as $90° - 35°$ — the complement reflex, imported from right angles.", fix: "Ask what the two angles fill together: a straight LINE is $180°$; only a right-angle CORNER is $90°$." }
    ],
    connections: [
      { concept: "geo_angles_triangle", note: "The same fill-up-a-known-total reasoning — 180° in a triangle, 180° on a line." },
      { concept: "integer_sub", note: "Angle chasing is subtraction with a geometric story." },
      { concept: "geo_perimeter_rect", note: "Right angles and straight lines are the degree benchmarks all figures lean on." }
    ],
    examples: [
      { question: "Two lines cross; one angle is $40°$. What is the angle directly opposite?", answer: "40", explanation: "Vertical angles are equal: $40°$. Both are $180° - 140°$, the same leftover." },
      { question: "Two lines cross; one angle is $40°$. What is the angle next to it?", answer: "140", explanation: "Neighbors fill a straight line: $180° - 40° = 140°$." }
    ]
  },

  // ===========================================================================
  // PERCENT APPLICATIONS (number-sense depth II).
  // ===========================================================================
  percent_discount: {
    title: "Discounts & Sale Prices",
    formula: "\\text{sale price} = P - P \\cdot \\frac{p}{100}",
    oneLineSummary: "A discount is a percent OF the price — compute the slice first, then subtract it; the percent number itself is never dollars.",
    intuitionHook: "'$25\\%$ off an $\\$80$ jacket.' The store isn't handing you $\\$25$ — it's handing you a quarter OF the price: $\\$20$. Final price $\\$60$. Same percent on a $\\$400$ TV is $\\$100$ off. The percent is a RATE; what it's worth depends entirely on what it bites into.",
    whatItIs: "Computing sale prices and savings: the discount equals the price times the percent (as a fraction of 100); the sale price is the original minus that discount. Two questions, two answers — 'how much do you save' wants the slice, 'what do you pay' wants the remainder.",
    whyItWorks: "Percent means per hundred, so $25\\%$ off promises: for every $\\$100$ of price, $\\$25$ leaves. An $\\$80$ jacket holds $0.8$ hundreds, so $0.8 \\times 25 = \\$20$ leaves — that's exactly $P \\times \\frac{p}{100}$. Subtracting the bare $25$ from $\\$80$ would take the same $\\$25$ off a jacket or a yacht, which no store intends. A slick shortcut: paying after $25\\%$ off means keeping $75\\%$ — sale price $= P \\times 0.75$ in one step. Both roads must agree, which doubles as a check.",
    whenToUse: "Shopping and sales, tips and taxes (the same math, added instead of subtracted), commission, percent-off coupons stacked against budgets, comparing deals.",
    representations: [
      { kind: "slice", label: "Slice, then subtract", body: "$\\$80$ at $25\\%$ off: slice $= 80 \\times \\frac{25}{100} = \\$20$; pay $80 - 20 = \\$60$." },
      { kind: "keep_rate", label: "What you still pay", body: "$25\\%$ off = keep $75\\%$: $80 \\times 0.75 = \\$60$ — one multiplication, same answer, built-in check." },
      { kind: "per_hundred", label: "Per hundred, literally", body: "$\\$25$ off each $\\$100$: an $\\$80$ item is $0.8$ hundreds → $\\$20$ off. A $\\$400$ item is $4$ hundreds → $\\$100$ off." }
    ],
    commonMistakes: [
      { label: "Subtracting the percent as dollars", why: "$\\$80 - 25 = \\$55$ — treating the rate like a coupon worth $\\$25$ flat.", fix: "A percent has no dollar value until it meets a price: $25\\%$ OF $80$ is $20$. Compute the slice before any subtraction." },
      { label: "Answering the wrong question", why: "Reporting $\\$20$ when asked the sale price, or $\\$60$ when asked the savings — both numbers are correct, for each other's questions.", fix: "Last step, every time: reread the question. 'Save' → the slice. 'Pay' → the remainder. They always sum to the original." }
    ],
    connections: [
      { concept: "percentage_of", note: "The discount slice IS a percent-of computation — this concept aims it at money." },
      { concept: "percent_decimal_convert", note: "The keep-rate shortcut runs on percent → decimal conversion." },
      { concept: "simple_interest", note: "The same slice, repeated per year and added instead of removed." }
    ],
    examples: [
      { question: "A $\\$60$ game is $20\\%$ off. What is the sale price?", answer: "48", explanation: "Slice: $60 \\times 0.20 = 12$. Pay: $60 - 12 = \\$48$ (or directly $60 \\times 0.80$)." },
      { question: "A $\\$120$ chair is $25\\%$ off. How much do you save?", answer: "30", explanation: "$120 \\times \\frac{25}{100} = \\$30$ — the slice is the saving." }
    ]
  },

  simple_interest: {
    title: "Simple Interest",
    formula: "I = P \\cdot \\frac{r}{100} \\cdot t",
    oneLineSummary: "Simple interest pays the same percent slice of the original deposit every year — multiply the one-year slice by the years.",
    intuitionHook: "Park $\\$300$ at $5\\%$ simple interest and the bank mails you the SAME $\\$15$ every year — year one, year two, year three: $\\$45$ after three years. It's rent paid on your money, at a flat rate. (Banks compounding is the sequel; simple interest is the clean original.)",
    whatItIs: "Interest computed only on the original principal: each year earns $P \\times \\frac{r}{100}$, so after $t$ years the total interest is $I = P \\cdot \\frac{r}{100} \\cdot t$. The balance is principal plus interest: $P + I$.",
    whyItWorks: "Two facts multiply together. The yearly slice is a percent-of computation ($5\\%$ of $\\$300$ = $\\$15$ — per hundred, times three hundreds). 'Simple' means that slice never changes, because it's always measured against the ORIGINAL deposit — so $t$ years pay $t$ identical slices: multiplication as repeated addition, $15 + 15 + 15 = 15 \\times 3$. Forgetting the $t$ answers a one-year question; reporting $P + I$ answers the balance question. The formula is three quantities with one job each: $P$ sets the base, $r$ sets the rate, $t$ counts the repeats.",
    whenToUse: "Savings bonds and CDs, simple loans between people, deposit math in word problems, quick estimates before compound formulas — and as the bridge from percents into linear growth.",
    representations: [
      { kind: "rent", label: "Rent on money", body: "$\\$300$ at $5\\%$: the money earns $\\$15$/year of rent. Three years of tenancy: $\\$45$." },
      { kind: "table", label: "Year by year", body: "Year 1: $+15$. Year 2: $+15$. Year 3: $+15$. Simple interest is a flat staircase — the same step forever." },
      { kind: "linear", label: "A line in disguise", body: "Balance $= P + (P \\tfrac{r}{100}) t$ — slope-intercept form with the deposit as intercept and the yearly slice as slope." }
    ],
    commonMistakes: [
      { label: "Forgetting the years", why: "Computing the $\\$15$ yearly slice and stopping — a $t$-year question answered for $t = 1$.", fix: "The formula has three factors; count them off: principal ✓ rate ✓ TIME ✓. Each year adds another identical slice." },
      { label: "Reporting the balance as the interest", why: "Answering $\\$345$ (deposit + earnings) when only the earnings were asked.", fix: "Interest is what the money EARNED; balance is earnings plus the original. Reread which one the question wants." }
    ],
    connections: [
      { concept: "percent_discount", note: "The same percent-slice computation — added over time instead of subtracted once." },
      { concept: "unit_rate", note: "The yearly slice is a rate: dollars per year. Interest is a unit rate with a bank account." },
      { concept: "point_on_line", note: "Balance over time is y = mx + b: simple interest IS linear growth." }
    ],
    examples: [
      { question: "You deposit $\\$200$ at $4\\%$ simple interest. How much interest after $3$ years?", answer: "24", explanation: "Yearly slice: $200 \\times 0.04 = \\$8$. Three years: $8 \\times 3 = \\$24$." },
      { question: "You deposit $\\$500$ at $3\\%$ simple interest. How much interest after $2$ years?", answer: "30", explanation: "$500 \\times \\frac{3}{100} \\times 2 = \\$30$." }
    ]
  },

  multi_step_word: {
    title: "Multi-Step Word Problems",
    formula: "\\text{plan} \\to \\text{compute} \\to \\text{answer the question asked}",
    oneLineSummary: "Multi-step problems hide the real question behind an intermediate number — plan the chain of operations first, and never stop at a stop on the way.",
    intuitionHook: "Maya buys $4$ notebooks at $\\$6$ each and pays with a $\\$50$ bill. 'How much change?' Your brain computes $24$ — and $24$ is exactly the WRONG answer, sitting there looking finished. The cost was a stepping stone; the question asked about the change: $50 - 24 = \\$26$. Multi-step problems are traps built from your own correct work.",
    whatItIs: "Word problems requiring two or more operations in sequence: compute a subtotal (a cost, a sum), then use it in a second operation (change, remainder, difference). The skill is decomposition: which numbers combine, with which operations, in which order.",
    whyItWorks: "Stories nest computations the way expressions nest operations: 'change from $\\$50$ after buying $4$ at $\\$6$' is literally $50 - 4 \\times 6$ — the multiplication lives inside the subtraction, so it must finish first. Writing the plan as one expression imports all of order-of-operations for free. The classic failure isn't bad arithmetic; it's answering the inner step ($24$) because it arrived first and felt complete — or chaining the right numbers with wrong operations ($50 - 4 - 6$). Rereading the final question before answering catches both.",
    whenToUse: "Shopping and change, budgets and remainders, recipe leftovers, trip planning (distance minus progress), and as the assembled form of every single-skill problem in the catalog.",
    representations: [
      { kind: "chain", label: "Plan the chain", body: "Change problem: (price × count) THEN (bill − cost). Two links; the output of one feeds the other." },
      { kind: "expression", label: "Write it as one expression", body: "$50 - 4 \\times 6$: the story in symbols — and PEMDAS already knows the multiplication goes first." },
      { kind: "question_check", label: "The last-line test", body: "Underline the actual question. '$\\$24$' answers 'what did it cost?' — nobody asked that." }
    ],
    commonMistakes: [
      { label: "Stopping at the subtotal", why: "Answering $\\$24$ (the cost) to a question about change — the intermediate number feels like a destination.", fix: "Before writing the answer, reread the question's last line. Does your number answer THAT? The cost still needs the subtraction." },
      { label: "Right numbers, wrong chain", why: "Computing $50 - 4 - 6 = 40$ — every number used once, no operation matching the story.", fix: "Tell the story back: '4 notebooks at \\$6' is a MULTIPLICATION ($24$), not two subtractions. Each phrase picks its own operation." }
    ],
    connections: [
      { concept: "translate_expression", note: "Writing the plan as one expression is translation — the sibling skill." },
      { concept: "pemdas", note: "The inner-operation-first rule is order of operations, narrated." },
      { concept: "unit_rate", note: "The 'price × count' link is rate reasoning — most chains start with one." }
    ],
    examples: [
      { question: "Maya buys $3$ notebooks at $\\$4$ each and pays with a $\\$50$ bill. How much change does she get?", answer: "38", explanation: "Cost: $3 \\times 4 = \\$12$. Change: $50 - 12 = \\$38$." },
      { question: "Liam has $\\$40$ and buys $3$ books at $\\$7$ each. How much is left?", answer: "19", explanation: "Spent: $21$. Left: $40 - 21 = \\$19$." }
    ]
  },

  // ===========================================================================
  // FUNCTIONS STRAND (8.F — notation, tables, rate of change, initial value).
  // ===========================================================================
  function_evaluate: {
    title: "Evaluating Functions",
    formula: "f(x) = ax + b: \\quad f(c) = a \\cdot c + b",
    oneLineSummary: "A function is a machine and f(c) is its output for input c — the parentheses mean 'feed this in', never 'multiply'.",
    intuitionHook: "A vending machine: press B4, get a snack. The machine is $f$, the button is the input, the snack is $f(B4)$. Writing $f(x) = 2x + 3$ publishes the machine's wiring diagram — and $f(5)$ just asks: what falls out when you press $5$? (Answer: $13$.)",
    whatItIs: "Function notation names a rule and its inputs: $f(x) = 2x + 3$ defines the rule, $f(5)$ requests its output at $5$. Evaluating substitutes the input everywhere $x$ appears, then simplifies.",
    whyItWorks: "The notation is pure bookkeeping on top of expression evaluation: $f(5)$ for $f(x) = 2x + 3$ means exactly 'evaluate $2x + 3$ at $x = 5$'. What's NEW is the naming: the rule itself becomes an object, so different machines ($f$, $g$) can coexist and be compared. The parentheses are the historical hazard — everywhere else in algebra $a(b)$ multiplies, but $f(5)$ is an application, not a product. There is no quantity '$f$' to multiply by $5$; there's a machine $f$ being handed a $5$.",
    whenToUse: "Reading any formula in function form ($C(n)$ for cost, $h(t)$ for height), programming (functions ARE this idea executable), graphing point by point, and all later f-and-g algebra.",
    representations: [
      { kind: "machine", label: "Input → machine → output", body: "$f(x) = 2x + 3$: feed $5$, the machine doubles it and adds three, out comes $13$. $f(5) = 13$ records the transaction." },
      { kind: "substitution", label: "Replace every x", body: "$f(5)$: rewrite the rule with $5$ in $x$'s seat — $2(5) + 3$ — then simplify. Multiply before adding, as always." },
      { kind: "graph_point", label: "A point on the graph", body: "$f(5) = 13$ IS the point $(5, 13)$ on the machine's graph — evaluation and plotting are the same act." }
    ],
    commonMistakes: [
      { label: "Reading f(5) as f times 5", why: "Treating the parentheses as multiplication because $a(b)$ multiplies everywhere else.", fix: "$f$ is a machine, not a number — there's nothing to multiply. $f(5)$ is a request: run the machine on $5$." },
      { label: "Dropping the constant", why: "Computing $f(5) = 2 \\cdot 5 = 10$ for $f(x) = 2x + 3$ — the substitution stopped halfway.", fix: "Substitute into the WHOLE rule: every term survives. $2(5) + 3 = 13$ — the machine has two stages." }
    ],
    connections: [
      { concept: "eval_expression", note: "Evaluation is the engine; the notation adds a name and an interface." },
      { concept: "point_on_line", note: "f(c) for a linear f is finding y on the line — same computation, new clothes." },
      { concept: "function_solve", note: "The reverse request: given the output, recover the input." }
    ],
    examples: [
      { question: "Given $f(x) = 3x + 2$, find $f(4)$.", answer: "14", explanation: "Substitute: $3(4) + 2 = 12 + 2 = 14$." },
      { question: "Given $f(x) = 5x - 1$, find $f(3)$.", answer: "14", explanation: "$5(3) - 1 = 15 - 1 = 14$." }
    ]
  },

  function_table: {
    title: "Rules from Tables",
    formula: "\\text{step in } y \\to \\text{coefficient}; \\quad \\text{anchor a row} \\to \\text{constant}",
    oneLineSummary: "Read a linear rule off a table in two moves: the y-step per unit x is the coefficient, and any single row then pins down the constant.",
    intuitionHook: "A mystery machine logged its work: in 1 → out 7, in 2 → out 10, in 3 → out 13. Each extra input adds $3$ to the output — the machine multiplies by $3$. And at input 1 it gave $7 = 3 + 4$, so it also adds $4$: the rule is $y = 3x + 4$. Two observations, machine reverse-engineered.",
    whatItIs: "Recovering the rule $y = mx + b$ from a table of input-output pairs: the constant difference between consecutive outputs (per unit input) gives $m$; substituting any row gives $b$.",
    whyItWorks: "A linear rule adds its coefficient once per unit step — that's what 'times $m$' means — so consecutive outputs in a unit-step table differ by exactly $m$, every time. One row alone can't identify a rule: infinitely many rules pass through a single pair (the trap rule $y = 7x$ also maps $1 \\to 7$, then misses every other row). The STEP is what separates them, and the anchor row finishes the job. Checking the candidate rule against a row you didn't use is the professional habit — it catches both slips at once.",
    whenToUse: "Finding patterns in data, spreadsheet formulas from examples, sequences, science labs (fitting a linear law to measurements), and reverse-engineering any constant-rate process.",
    representations: [
      { kind: "differences", label: "Look at the steps", body: "Outputs $7, 10, 13, 16$: steps of $+3$ — the coefficient announces itself in the gaps." },
      { kind: "anchor", label: "Then anchor a row", body: "With $m = 3$ and the row $(1, 7)$: $7 = 3(1) + b$, so $b = 4$. Any row works; pick the easiest." },
      { kind: "verify", label: "Test an unused row", body: "Claim $y = 3x + 4$; check $x = 4$: $16$ ✓. A rule must fit EVERY row — one match is coincidence, four is a law." }
    ],
    commonMistakes: [
      { label: "Fitting only the first row", why: "Choosing $y = 7x$ because $7 \\times 1 = 7$ — one row matched, the rest never consulted.", fix: "A rule answers to the whole table. Check a second row immediately: $7 \\times 2 = 14 \\ne 10$ — discard and look at the steps instead." },
      { label: "Swapping rate and start", why: "Writing $y = 4x + 3$ when the steps say $3$ and the anchor says $4$ — both numbers right, both jobs wrong.", fix: "The STEP between rows is the multiplier; the leftover at the anchor is the adder. Label them as you find them." }
    ],
    connections: [
      { concept: "function_evaluate", note: "Each table row IS one evaluation — reading rules is evaluation run backwards." },
      { concept: "rate_of_change", note: "The y-step per unit x is the rate of change, met in table form." },
      { concept: "slope_intercept_id", note: "m and b have the same two jobs here as in y = mx + b — found instead of read." }
    ],
    examples: [
      { question: "A table maps $1, 2, 3 \\to 9, 13, 17$. Which rule fits?", answer: "y = 4x + 5", explanation: "Steps of $+4$ give the coefficient; row $(1, 9)$: $9 = 4 + b \\to b = 5$." },
      { question: "A table maps $1, 2, 3 \\to 5, 8, 11$. Which rule fits?", answer: "y = 3x + 2", explanation: "Steps $+3$; anchor $(1,5)$: $b = 2$. Check $x=3$: $11$ ✓." }
    ]
  },

  rate_of_change: {
    title: "Rate of Change",
    formula: "\\text{rate} = \\frac{\\Delta y}{\\Delta x} = \\frac{y_2 - y_1}{x_2 - x_1}",
    oneLineSummary: "Rate of change is how much the output moves per ONE unit of input — total change divided by elapsed input, the slope of a real story.",
    intuitionHook: "Your plant was $8$ cm in week 2 and $20$ cm in week 5. 'It grew $12$ cm' tells the past; '$4$ cm per week' predicts the future — next week, $24$. Dividing the total by the three weeks turns a fact into a forecast. That per-week number is the rate of change.",
    whatItIs: "The constant rate at which a linear quantity changes: the change in output divided by the change in input between any two measurements. In graphs it's the slope; in stories it's the speed, growth rate, or price per unit.",
    whyItWorks: "A steady process spreads its total change evenly across the elapsed input — $12$ cm over $3$ weeks means each week contributed equally: $12 \\div 3 = 4$. That's why the rate needs BOTH differences: the total change alone ($12$) answers 'how much', the elapsed input alone ($3$) answers 'how long', and only their ratio answers 'how fast'. Steadiness is what makes the answer trustworthy between and beyond the measurements — the same division on any two points of the same line yields the same rate.",
    whenToUse: "Growth and decay stories, speed from two odometer readings, cost per additional item, temperature change per hour — and as the m of every linear model you'll ever fit.",
    representations: [
      { kind: "story", label: "Per-week thinking", body: "$8$ cm → $20$ cm across weeks 2 → 5: $\\frac{12 \\text{ cm}}{3 \\text{ wk}} = 4$ cm/week. The units narrate the division." },
      { kind: "graphical", label: "Slope in costume", body: "Plot (2, 8) and (5, 20): the rate is the rise over run between them — slope, wearing a gardening glove." },
      { kind: "forecast", label: "Rates predict", body: "At 4 cm/week, week 6 ≈ 24 cm and week 10 ≈ 40 cm. A total can't do that; a rate can." }
    ],
    commonMistakes: [
      { label: "Reporting the total change", why: "Answering '12' to 'how fast does it grow per week?' — the change happened over THREE weeks, not one.", fix: "Read the unit in the question: PER WEEK demands a per-week number. Divide the total by the elapsed weeks." },
      { label: "Dividing by the raw endpoint", why: "Computing $12 \\div 5$ using week 5 instead of the elapsed $5 - 2 = 3$ weeks.", fix: "Both differences, top and bottom: $\\frac{y_2 - y_1}{x_2 - x_1}$. The clock starts at the FIRST measurement, not at zero." }
    ],
    connections: [
      { concept: "slope_from_points", note: "Identical computation — rate of change is slope with units attached." },
      { concept: "unit_rate", note: "A rate of change IS a unit rate measured between two snapshots." },
      { concept: "function_initial", note: "Rate plus starting value rebuilds the whole linear story: y = (rate)x + (start)." }
    ],
    examples: [
      { question: "A pool held $30$ L at minute 2 and $54$ L at minute 8. How many liters per minute is it filling?", answer: "4", explanation: "$\\frac{54 - 30}{8 - 2} = \\frac{24}{6} = 4$ L/min." },
      { question: "A plant was $6$ cm in week 1 and $21$ cm in week 6. How many cm per week did it grow?", answer: "3", explanation: "$\\frac{15}{5} = 3$ cm per week." }
    ]
  },

  function_initial: {
    title: "Initial Value",
    formula: "\\text{start} = \\text{current} \\pm \\text{rate} \\times \\text{time (rewound)}",
    oneLineSummary: "The initial value is the story rewound to time zero — undo the rate's work: add back what drained away, remove what accumulated.",
    intuitionHook: "A tank has been draining at $5$ L/min, and after $6$ minutes it holds $20$ L. How full was it at the start? The drain REMOVED $30$ L, so rewinding means putting them back: $50$ L. Rewinding a story flips its arrow — what drained must return, what grew must shrink.",
    whatItIs: "Finding a linear process's starting amount (the y-intercept, $b$) from its rate and a later measurement. It's the second of the two numbers — rate and start — that pin down any linear story.",
    whyItWorks: "A constant rate makes the past computable: in $t$ minutes, exactly $r \\times t$ entered or left, no more, no less. The current amount plus the rewound change recovers the start: $V_0 = V + rt$ for a drain (the lost liters return), $V_0 = V - rt$ for a fill (the gained liters leave). The direction flip is where errors live — subtracting from a draining tank drains it TWICE. Algebraically this is the $b$ in $V(t) = b - rt$: set the model against the measurement and solve. Time zero is where the graph cuts the y-axis; the initial value IS the y-intercept with a story attached.",
    whenToUse: "Reconstructing starting balances, original prices before steady markdowns, launch heights, how full the tank/battery was, and identifying b when fitting linear models to real data.",
    representations: [
      { kind: "rewind", label: "Play the tape backwards", body: "Drained $5$ L/min for $6$ min → $30$ L left the tank. Rewind: $20 + 30 = 50$ L at the start." },
      { kind: "intercept", label: "The y-axis crossing", body: "On the graph of liters vs minutes, the initial value is where the line meets $t = 0$ — the intercept of the story." },
      { kind: "model", label: "Solve the model", body: "$V(t) = V_0 - 5t$ and $V(6) = 20$: so $V_0 - 30 = 20$, $V_0 = 50$. The formula agrees with the rewind." }
    ],
    commonMistakes: [
      { label: "Walking the rate the wrong way", why: "Computing $20 - 30 = -10$ L for the draining tank — rewinding with the forward arrow drains it twice (into nonsense: negative liters).", fix: "Ask what the process DID, then undo it: draining removed liters, so the start had MORE. A negative or absurd answer is the direction flag." },
      { label: "Reporting the change instead of the start", why: "Answering $30$ — the amount drained — to a question about the starting amount.", fix: "$rt$ is the journey; the question asked for the origin. Combine: current $+$ journey $=$ start." }
    ],
    connections: [
      { concept: "rate_of_change", note: "Rate and initial value are the m and b of the story — this one anchors the line." },
      { concept: "slope_intercept_id", note: "The initial value IS b in y = mx + b, found from context instead of read from the form." },
      { concept: "linear_two_step", note: "Solving the model equation for V0 is a two-step solve." }
    ],
    examples: [
      { question: "A candle burns at $2$ cm/hour. After $4$ hours it is $7$ cm tall. How tall was it new?", answer: "15", explanation: "Burned: $2 \\times 4 = 8$ cm. Rewind: $7 + 8 = 15$ cm." },
      { question: "A tank drains at $4$ L/min; after $5$ minutes it holds $25$ L. How much did it start with?", answer: "45", explanation: "$25 + 4 \\times 5 = 45$ L." }
    ]
  },

  function_solve: {
    title: "Solving f(x) = T",
    formula: "f(x) = ax + b = T \\implies x = \\frac{T - b}{a}",
    oneLineSummary: "f(x) = T asks which INPUT produces output T — run the machine backwards by undoing its steps in reverse; plugging T in answers the opposite question.",
    intuitionHook: "A taxi charges $f(x) = 3x + 2$ dollars for $x$ kilometers, and you have exactly $\\$17$. 'How far can I ride?' is $f(x) = 17$ — the OUTPUT is known, the input is the mystery. Unwrap the fare: drop the $\\$2$ fee ($15$ left), divide by the rate ($5$ km). Plugging in $17$ instead would price a 17-km ride: $\\$53$ — the right math for the wrong question.",
    whatItIs: "Solving for the input given the output: set the function's formula equal to the target value and solve the resulting equation. For linear $f$, that's a two-step solve: subtract the constant, divide by the coefficient.",
    whyItWorks: "$f(x) = 17$ is a statement ABOUT the output: 'the machine produced $17$ — from what?' Since the machine multiplied then added, the rewind subtracts then divides — operations undone in reverse order, like unwrapping a package. The classic trap, computing $f(17)$, runs the machine FORWARD on the target: it treats the known output as a fresh input, answering 'what does $17$ produce?' instead of 'what produces $17$?'. The check is built in: feed your answer back through — $f(5) = 3(5) + 2 = 17$ ✓ — the forward machine certifies the backward solve.",
    whenToUse: "Budget questions (how much can I afford?), break-even points, 'when does it reach...' time questions, inverse lookups in any formula — the everyday direction of real-world function use.",
    representations: [
      { kind: "machine", label: "Run it backwards", body: "Forward: ×3 then +2. Backward from $17$: −2 then ÷3 → $5$. Reverse order, inverse operations." },
      { kind: "two_questions", label: "f(17) vs f(x) = 17", body: "$f(17) = 53$: what 17 produces. $f(x) = 17 \\to x = 5$: what produces 17. Same symbols, opposite directions." },
      { kind: "graph", label: "Horizontal line hunt", body: "On the graph, $f(x) = 17$ finds where the line crosses HEIGHT 17 — read down to the x-axis for the answer." }
    ],
    commonMistakes: [
      { label: "Plugging the target in", why: "Computing $f(17)$ for $f(x) = 17$ — the known value enters the wrong door (input instead of output).", fix: "Mark what's known: $17$ is an OUTPUT. Outputs sit on the right of $ax + b = T$; the unknown input is the x you solve for. Verify by feeding the answer forward." },
      { label: "Subtracting but not dividing", why: "Reaching $3x = 15$ and answering $15$ — one undo short of a bare x.", fix: "Count the wrapping layers: the input was multiplied AND shifted, so the rewind needs BOTH undos: $x = 15 \\div 3 = 5$." }
    ],
    connections: [
      { concept: "function_evaluate", note: "The forward direction — and the verification step for every backward solve." },
      { concept: "linear_two_step", note: "The algebra is exactly a two-step equation; the notation frames it as un-running a machine." },
      { concept: "inequality_two_step", note: "Budgets often ask f(x) ≤ T — the same rewind with a range answer." }
    ],
    examples: [
      { question: "Given $f(x) = 2x + 5$, for what $x$ is $f(x) = 17$?", answer: "6", explanation: "Rewind: $17 - 5 = 12$, then $12 \\div 2 = 6$. Check: $f(6) = 17$ ✓." },
      { question: "Given $f(x) = 4x + 3$, for what $x$ is $f(x) = 23$?", answer: "5", explanation: "$23 - 3 = 20$; $20 \\div 4 = 5$." }
    ]
  },

  // ===========================================================================
  // STATISTICS DEPTH III (the complement rule).
  // ===========================================================================
  probability_complement: {
    title: "Complement of an Event",
    formula: "P(\\text{not } A) = 1 - P(A)",
    oneLineSummary: "The chance an event does NOT happen is whatever's left of 100% after the event's own chance — certainty, minus the part you already counted.",
    intuitionHook: "If there's a $30\\%$ chance of rain, the chance of NO rain is the other $70\\%$ — you didn't recount the clouds, you just took what was left. Every event splits the future into 'happens' and 'doesn't', and the two slices always fill the whole pie.",
    whatItIs: "The complement of an event is everything OTHER than that event. Its probability is $1$ (or $100\\%$) minus the event's probability, because the event and its complement together cover every possible outcome exactly once.",
    whyItWorks: "Something must happen, and the total probability of all outcomes is always $1$ — a certainty. An event $A$ and its complement 'not $A$' partition that certainty with no overlap and no gap (every outcome is in exactly one), so their probabilities sum to $1$: $P(\\text{not }A) = 1 - P(A)$. The power is in the shortcut: counting the few ways to FAIL is often far easier than the many ways to SUCCEED — 'at least one' problems almost always go through the complement. The trap is subtracting from the wrong whole (the count instead of $100\\%$): the complement lives in probability space, where the total is always one whole.",
    whenToUse: "'At least one' questions, 'not', safety/failure rates, and any time the complement is easier to count than the event itself — a cornerstone problem-solving move.",
    representations: [
      { kind: "pie", label: "Two slices fill the pie", body: "$P(\\text{red}) = 35\\%$ → $P(\\text{not red}) = 65\\%$: the slices complete the whole $100\\%$ disk." },
      { kind: "shortcut", label: "Count the failures", body: "P(at least one six in many rolls) is a nightmare directly; P(no six) is one easy product — subtract it from 1." },
      { kind: "certainty", label: "Subtract from the whole", body: "Total probability $= 1$. The complement is $1$ minus the event — never the raw count minus the event." }
    ],
    commonMistakes: [
      { label: "Reporting the event itself", why: "Giving $P(\\text{red})$ when the question asked for $P(\\text{not red})$ — answering the opposite event.", fix: "Underline 'not'. The complement is what's LEFT: $100\\%$ minus the event's chance." },
      { label: "Subtracting from the wrong total", why: "Computing 'count of non-red' or subtracting from the marble count instead of from $100\\%$.", fix: "The complement is a PROBABILITY, so subtract from $1$ (or $100\\%$): $P(\\text{not }A) = 100\\% - P(A)$." }
    ],
    connections: [
      { concept: "stat_probability", note: "The event's own probability is the number you subtract from 1." },
      { concept: "compound_probability", note: "'At least one' problems pair the complement rule with the product rule." },
      { concept: "percent_change", note: "100% minus a percent is the same move as keeping what's left after a discount." }
    ],
    examples: [
      { question: "A spinner lands on blue $40\\%$ of the time. What percent of spins are NOT blue?", answer: "60", explanation: "$100\\% - 40\\% = 60\\%$." },
      { question: "A bag of $20$ marbles has $9$ green. What is the probability (percent) of drawing a NON-green marble?", answer: "55", explanation: "$P(\\text{green}) = \\frac{9}{20} = 45\\%$, so $P(\\text{not green}) = 55\\%$." }
    ]
  },

  // ===========================================================================
  // COORDINATE GEOMETRY (transformations on the plane).
  // ===========================================================================
  coord_reflect: {
    title: "Reflecting a Point",
    formula: "\\text{over x-axis: } (x, y) \\to (x, -y); \\quad \\text{over y-axis: } (x, y) \\to (-x, y)",
    oneLineSummary: "Reflecting a point across an axis flips the sign of ONE coordinate — the one measured perpendicular to that axis — and leaves the other alone.",
    intuitionHook: "Stand a mirror flat on the x-axis. Your reflection has the same left-right position but hangs the same distance BELOW — so $(3, 4)$ becomes $(3, -4)$. The mirror line itself doesn't move; only the across-the-mirror distance flips. Which coordinate changes is decided by which way you're looking into the glass.",
    whatItIs: "Reflecting a point over a coordinate axis produces its mirror image. Over the x-axis, the y-coordinate negates ($(x,y) \\to (x,-y)$); over the y-axis, the x-coordinate negates ($(x,y) \\to (-x,y)$). The coordinate along the mirror line is unchanged.",
    whyItWorks: "A reflection keeps every point the same distance from the mirror, but on the opposite side. The x-axis is a horizontal mirror, so it flips HEIGHT (the y-value's sign) while left-right position (x) is unaffected — you slide straight down through the axis to a point equally far below. The rule of thumb: the axis you reflect over names the coordinate that STAYS (reflect over the x-axis → x stays). Negating BOTH coordinates is a different transformation (a $180°$ rotation), and swapping them is reflection over the diagonal line $y=x$ — neither is a flip over an axis.",
    whenToUse: "Symmetry in figures and graphs, computer graphics and game sprites, folding/origami geometry, even/odd function behavior, and as a building block of all rigid transformations.",
    representations: [
      { kind: "mirror", label: "Flat mirror on the axis", body: "Over the x-axis: $(3, 4) \\to (3, -4)$ — same column, mirrored height. The axis is the waterline." },
      { kind: "rule", label: "The axis names what stays", body: "Reflect over x-axis → x unchanged, y flips. Over y-axis → y unchanged, x flips." },
      { kind: "distance", label: "Equal and opposite", body: "$4$ above the x-axis reflects to $4$ below: same distance, flipped sign. The mirror line itself holds still." }
    ],
    commonMistakes: [
      { label: "Flipping the wrong coordinate", why: "Reflecting $(3,4)$ over the x-axis to $(-3, 4)$ — negating x when the horizontal mirror flips height.", fix: "The axis you reflect over keeps its OWN coordinate: x-axis reflection leaves x alone. Picture sliding straight toward and through the axis." },
      { label: "Negating both", why: "Sending $(3,4) \\to (-3,-4)$ — that's a $180°$ rotation, not a single reflection.", fix: "A reflection over one axis changes exactly ONE sign. Two sign changes means two reflections (or a rotation)." }
    ],
    connections: [
      { concept: "integer_compare", note: "Negating a coordinate is sign reasoning on the number line, in two dimensions." },
      { concept: "coord_translate", note: "The other basic rigid motion — sliding instead of flipping." },
      { concept: "point_on_line", note: "Reflections act on the same (x, y) coordinates you plot and evaluate." }
    ],
    examples: [
      { question: "Reflect $(5, 2)$ over the x-axis.", answer: "(5, -2)", explanation: "x-axis flips height: y negates, x stays — $(5, -2)$." },
      { question: "Reflect $(5, 2)$ over the y-axis.", answer: "(-5, 2)", explanation: "y-axis flips left-right: x negates, y stays — $(-5, 2)$." }
    ]
  },

  coord_translate: {
    title: "Translating a Point",
    formula: "(x, y) \\xrightarrow{\\text{right } a,\\ \\text{up } b} (x + a, y + b)",
    oneLineSummary: "Translating slides a point without turning or flipping it — add the horizontal move to x and the vertical move to y, each on its own axis.",
    intuitionHook: "A chess piece moves '$2$ right, $3$ up' from its square: the column count rises by $2$, the row count by $3$, and the piece never rotates. $(4, 1)$ becomes $(6, 4)$. A translation is the simplest motion there is — a pure slide, with horizontal and vertical bookkept separately.",
    whatItIs: "A translation shifts every point by the same amount: right/left changes the x-coordinate, up/down changes the y-coordinate. The point keeps its size and orientation — only its position moves.",
    whyItWorks: "The x- and y-axes are independent directions, so a horizontal slide cannot affect height and a vertical slide cannot affect left-right position — each shift lands on its own coordinate. Rightward and upward are the positive directions, so 'right $a$' means $x + a$ and 'up $b$' means $y + b$ (left and down subtract). Because the moves are independent, you can do them in either order or both at once and reach the same place. The errors come from crossing the wires — adding the horizontal shift to y — or from sign-flipping the direction (treating 'right' as a subtraction).",
    whenToUse: "Moving sprites and objects in games and graphics, mapping and navigation offsets, shifting graphs (y = f(x) + b raises a curve), and composing with reflections/rotations for full transformations.",
    representations: [
      { kind: "chess", label: "Slide, don't turn", body: "'2 right, 3 up' from $(4,1)$: $x: 4 \\to 6$, $y: 1 \\to 4$ → $(6, 4)$. Orientation untouched." },
      { kind: "independent", label: "Each axis its own move", body: "Horizontal shift touches only x; vertical shift only y. The two never trade." },
      { kind: "signs", label: "Right/up add, left/down subtract", body: "Right $+$, left $-$ on x; up $+$, down $-$ on y. Direction picks the sign." }
    ],
    commonMistakes: [
      { label: "Applying a shift to the wrong axis", why: "Adding the horizontal move to the y-coordinate — crossing the wires.", fix: "Horizontal = x, vertical = y, always. 'Right' lives on the x-coordinate; 'up' on the y." },
      { label: "Moving the wrong direction", why: "Treating 'right 3' as $x - 3$ — flipping the sign of the slide.", fix: "Right and up are POSITIVE (add); left and down subtract. Match the word to the sign before computing." }
    ],
    connections: [
      { concept: "coord_reflect", note: "The two basic rigid motions: translations slide, reflections flip." },
      { concept: "integer_add", note: "Each coordinate update is a signed addition — direction sets the sign." },
      { concept: "slope_intercept_id", note: "Adding b to a function translates its whole graph vertically by b." }
    ],
    examples: [
      { question: "Translate $(3, 5)$ right $4$ and up $2$.", answer: "(7, 7)", explanation: "$x: 3+4 = 7$, $y: 5+2 = 7$ → $(7, 7)$." },
      { question: "Translate $(2, 6)$ right $3$ and up $1$.", answer: "(5, 7)", explanation: "$x: 2+3 = 5$, $y: 6+1 = 7$." }
    ]
  },

  // ===========================================================================
  // PERCENT APPLICATIONS II (markup, percent error).
  // ===========================================================================
  percent_markup: {
    title: "Markup & Percent Increase",
    formula: "\\text{new} = P + P \\cdot \\frac{p}{100} = P\\left(1 + \\frac{p}{100}\\right)",
    oneLineSummary: "A markup adds a percent of the original onto itself — compute the increase, then ADD it; a discount's mirror image.",
    intuitionHook: "A store buys a lamp for $\\$40$ and marks it up $25\\%$ to make a profit. The markup is a quarter OF $\\$40$ — that's $\\$10$ — added on top: $\\$50$. Same arithmetic as a discount, just climbing instead of falling. Markup builds the price up; discount knocks it down.",
    whatItIs: "Markup (percent increase) raises a starting amount by a percentage of itself: the increase is the percent times the original, and the new total is the original PLUS that increase. The mirror of a discount.",
    whyItWorks: "Percent means per hundred, so a $25\\%$ markup adds $\\$25$ for every $\\$100$ of cost — $0.25 \\times P$ in total. Crucially the percent is OF the original, not of the percent number itself: adding the bare $25$ to $\\$40$ ignores that a percent is a fraction of the base. A one-step shortcut mirrors the discount's 'keep 75%': a $25\\%$ markup means the price becomes $125\\%$ of cost, $P \\times 1.25$. And as with discounts, 'what's the increase' (the $\\$10$) and 'what's the new price' (the $\\$50$) are different questions — reread which one is asked.",
    whenToUse: "Retail pricing and profit margins, tips on a bill, population/salary growth, tax added to a price, and any 'increased by p%' phrasing — the additive twin of discounts.",
    representations: [
      { kind: "build_up", label: "Increase, then add", body: "$\\$40$ marked up $25\\%$: increase $= 40 \\times 0.25 = \\$10$; new price $= 40 + 10 = \\$50$." },
      { kind: "one_step", label: "Become 125% of cost", body: "Up $25\\%$ = $125\\%$ of the original: $40 \\times 1.25 = \\$50$ in one multiplication." },
      { kind: "mirror", label: "Discount, upside down", body: "Discount subtracts the slice; markup adds it. Same slice computation, opposite final step." }
    ],
    commonMistakes: [
      { label: "Reporting the increase as the price", why: "Answering $\\$10$ (the markup) when asked for the new selling price $\\$50$.", fix: "The increase is a STEP toward the new total — add it back: $40 + 10 = \\$50$. Reread whether the question wants the rise or the result." },
      { label: "Adding the percent as dollars", why: "Computing $40 + 25 = \\$65$ — treating the $25\\%$ as $\\$25$ flat.", fix: "A percent is a fraction of the base: $25\\%$ of $\\$40$ is $\\$10$, not $\\$25$. Find the slice before adding." }
    ],
    connections: [
      { concept: "percent_discount", note: "The exact mirror — discount subtracts the slice, markup adds it." },
      { concept: "percent_change", note: "Markup is percent increase; the general percent-change machinery underlies both." },
      { concept: "simple_interest", note: "Interest is a repeated markup on the same principal, year after year." }
    ],
    examples: [
      { question: "A $\\$60$ item is marked up $20\\%$. What is the new price?", answer: "72", explanation: "Increase: $60 \\times 0.20 = \\$12$; new price: $60 + 12 = \\$72$ (or $60 \\times 1.20$)." },
      { question: "A $\\$50$ item is marked up $30\\%$. What is the new price?", answer: "65", explanation: "$50 \\times 1.30 = \\$65$." }
    ]
  },

  percent_error: {
    title: "Percent Error",
    formula: "\\text{percent error} = \\frac{|\\text{measured} - \\text{true}|}{\\text{true}} \\times 100",
    oneLineSummary: "Percent error measures how far a measurement missed, as a fraction of the TRUE value — the accepted truth is always the yardstick, never your own reading.",
    intuitionHook: "You estimate a wall is $55$ cm; it's really $50$. You were off by $5$ cm — but is that a big miss? Only against the real size: $5$ out of $50$ is $10\\%$. Percent error turns a raw miss into a fair, comparable judgment by measuring it against the truth.",
    whatItIs: "Percent error expresses the gap between a measured (or estimated) value and the true value as a percentage of the true value: take the absolute difference, divide by the TRUE value, multiply by 100.",
    whyItWorks: "A raw error ($5$ cm) is meaningless without scale — $5$ cm off a wall is trivial, $5$ cm off a fingernail is absurd. Dividing by the true value rescales the miss into 'parts per hundred of the real thing', making errors of different sizes comparable. The truth is the denominator because it's the accepted reference everyone agrees on; dividing by your own measured value instead would make the yardstick depend on the mistake you're trying to grade. The absolute value appears because error size doesn't care about direction — over or under by $5$ is the same $5$ of miss.",
    whenToUse: "Lab accuracy in science, estimation vs actual, manufacturing tolerances, comparing the precision of different methods, and judging any prediction against a known result.",
    representations: [
      { kind: "scale", label: "Miss against the truth", body: "Off by $5$ on a true $50$: $\\frac{5}{50} = 10\\%$. The denominator is the real value, always." },
      { kind: "compare", label: "Why percent, not raw", body: "$5$ cm off a $50$ cm wall ($10\\%$) vs $5$ cm off a $500$ cm wall ($1\\%$): same raw miss, very different accuracy." },
      { kind: "absolute", label: "Direction doesn't matter", body: "Measured $55$ or $45$ against true $50$: both are $5$ off → both $10\\%$ error. The bars are absolute." }
    ],
    commonMistakes: [
      { label: "Dividing by the measured value", why: "Using $\\frac{5}{55}$ instead of $\\frac{5}{50}$ — grading the error against the flawed reading.", fix: "The TRUE value is the reference: it goes on the bottom. Your measurement is what's being judged, not the standard." },
      { label: "Reporting the raw difference", why: "Answering '$5$' — the gap in centimeters, never scaled to a percent.", fix: "Percent error is a percent: divide by the true value and multiply by 100. A bare difference isn't comparable across scales." }
    ],
    connections: [
      { concept: "percent_change", note: "Same structure — a difference over a baseline, times 100 — applied to accuracy instead of growth." },
      { concept: "percent_markup", note: "Both scale a difference against an original; here the original is the accepted truth." },
      { concept: "decimal_round", note: "Measurement and estimation lean on rounding — percent error grades the result." }
    ],
    examples: [
      { question: "A true value is $80$; a measurement reads $96$. What is the percent error?", answer: "20", explanation: "$\\frac{|96 - 80|}{80} \\times 100 = \\frac{16}{80} \\times 100 = 20\\%$." },
      { question: "A true value is $50$; an estimate is $55$. What is the percent error?", answer: "10", explanation: "$\\frac{5}{50} \\times 100 = 10\\%$ — divide by the TRUE value." }
    ]
  },

  // ===========================================================================
  // FRACTIONS DEPTH III (signed rational arithmetic, 7.NS).
  // ===========================================================================
  fraction_negative: {
    title: "Adding & Subtracting Signed Fractions",
    formula: "-\\frac{a}{b} + \\frac{c}{d} = \\frac{-ad + cb}{bd}",
    oneLineSummary: "Signed fractions combine in two stages: find a common denominator as usual, then let the integer sign rules govern the numerators.",
    intuitionHook: "You owe a friend $\\frac{3}{4}$ of a pizza but they give you back $\\frac{1}{2}$: where do you stand? $-\\frac{3}{4} + \\frac{1}{2}$. Put both over quarters — $-\\frac{3}{4} + \\frac{2}{4}$ — and the debt and the gift combine like signed numbers: $-\\frac{1}{4}$. Still owe a quarter. Fractions and negatives are two skills you already have; this is just doing them together.",
    whatItIs: "Adding and subtracting fractions that may be negative, including subtracting a negative. The denominator work is ordinary fraction arithmetic; the numerator work follows the integer sign rules.",
    whyItWorks: "A common denominator only rewrites the fractions into the same-size pieces — it never touches their signs. Once both share a denominator, the problem becomes 'combine these signed numerators over the common bottom', which is pure integer addition: $-3 + 2 = -1$ gives $-\\frac{1}{4}$. The notorious case is subtracting a negative: $\\frac{1}{2} - (-\\frac{1}{4})$ becomes $\\frac{1}{2} + \\frac{1}{4}$, because removing a debt is the same as gaining — exactly the integer rule, now wearing a denominator. Keeping the sign on the right numerator through the common-denominator step is the whole discipline.",
    whenToUse: "Temperature and elevation changes given as fractions, signed measurements, balancing accounts with fractional amounts, and all of pre-algebra where rationals and negatives meet.",
    representations: [
      { kind: "debt", label: "Debts and gifts", body: "$-\\frac{3}{4} + \\frac{2}{4}$: a $3$-quarter debt eased by a $2$-quarter gift leaves $-\\frac{1}{4}$ — still owed." },
      { kind: "number_line", label: "Signed jumps in pieces", body: "Start at $-\\frac{3}{4}$, jump right $\\frac{1}{2}$ (two quarters): land on $-\\frac{1}{4}$. The jumps are fractional, the direction signed." },
      { kind: "two_stage", label: "Denominator, then sign", body: "Stage 1: common denominator (sign-free). Stage 2: combine numerators by the integer rules." }
    ],
    commonMistakes: [
      { label: "Losing a sign in the numerators", why: "Computing $-\\frac{3}{4} + \\frac{2}{4}$ as $\\frac{5}{4}$ — adding magnitudes and forgetting the minus.", fix: "After matching denominators, the numerators ARE signed integers: $-3 + 2 = -1$, not $5$. Carry every sign through the rewrite." },
      { label: "Subtracting a negative as a subtraction", why: "Reading $\\frac{1}{2} - (-\\frac{1}{4})$ as $\\frac{1}{2} - \\frac{1}{4}$ — keeping the minus.", fix: "Two negatives make a plus: $-(-\\frac{1}{4}) = +\\frac{1}{4}$. Removing a debt adds. Rewrite the double sign FIRST, then find the common denominator." }
    ],
    connections: [
      { concept: "fraction_add", note: "The common-denominator machinery is identical — only the signs are new." },
      { concept: "integer_add", note: "The numerator step IS signed-integer addition." },
      { concept: "integer_sub", note: "Subtracting a negative fraction reuses the 'add the opposite' rule." }
    ],
    examples: [
      { question: "Calculate $-\\frac{2}{3} + \\frac{1}{6}$.", answer: "-1/2", explanation: "Common denominator $6$: $-\\frac{4}{6} + \\frac{1}{6} = -\\frac{3}{6} = -\\frac{1}{2}$." },
      { question: "Calculate $\\frac{1}{2} - \\left(-\\frac{1}{4}\\right)$.", answer: "3/4", explanation: "Subtracting a negative adds: $\\frac{1}{2} + \\frac{1}{4} = \\frac{3}{4}$." }
    ]
  },

  // ===========================================================================
  // STATISTICS DEPTH IV (dependent events — without replacement).
  // ===========================================================================
  prob_without_replacement: {
    title: "Probability Without Replacement",
    formula: "P(\\text{both}) = \\frac{w}{n} \\times \\frac{w-1}{n-1}",
    oneLineSummary: "When you don't replace the first item, the second draw sees a smaller bag — both the favorable count and the total drop by one.",
    intuitionHook: "A bag has $5$ marbles, $2$ gold. Draw one gold ($\\frac{2}{5}$) and keep it. Now only $4$ marbles remain, just $1$ gold — so the next gold is $\\frac{1}{4}$, not $\\frac{2}{5}$ again. The bag remembers what you took. That memory is the whole difference between with and without replacement.",
    whatItIs: "The probability that two (or more) draws all succeed when items are NOT returned between draws. Each successive draw uses updated counts: one fewer favorable item and one fewer total.",
    whyItWorks: "Probability is favorable-over-total, and removing an item changes BOTH numbers for the next draw. After pulling one gold from $5$ marbles with $2$ gold, the second draw faces $4$ marbles with $1$ gold: $\\frac{1}{4}$. The events are DEPENDENT — the first outcome reshapes the second's odds — so you multiply the conditional probabilities: $\\frac{2}{5} \\times \\frac{1}{4} = \\frac{2}{20} = \\frac{1}{10}$. Treating the draws as independent (reusing $\\frac{2}{5}$ twice) pretends the marble was put back; that's the with-replacement answer to a without-replacement question.",
    whenToUse: "Dealing cards, picking a committee or team, drawing names, quality sampling without restocking — any 'and then, without putting it back' scenario.",
    representations: [
      { kind: "shrinking_bag", label: "The bag shrinks", body: "$5$ marbles, $2$ gold → draw gold → $4$ marbles, $1$ gold. Both counts drop by one." },
      { kind: "conditional", label: "Multiply the updated odds", body: "$\\frac{2}{5}$ then $\\frac{1}{4}$: $\\frac{2}{5} \\times \\frac{1}{4} = \\frac{1}{10}$. The second factor already knows the first happened." },
      { kind: "contrast", label: "With vs without", body: "With replacement: $\\frac{2}{5} \\times \\frac{2}{5}$. Without: $\\frac{2}{5} \\times \\frac{1}{4}$. The dropped denominator is the tell." }
    ],
    commonMistakes: [
      { label: "Treating the draws as independent", why: "Using $\\frac{2}{5} \\times \\frac{2}{5}$ — reusing the original odds as if the marble were replaced.", fix: "Ask: was it put back? If not, the second draw has one fewer favorable AND one fewer total: $\\frac{1}{4}$, not $\\frac{2}{5}$." },
      { label: "Reporting a single draw", why: "Answering $\\frac{2}{5}$ — the first draw only, ignoring that BOTH must succeed.", fix: "Both events are required, so multiply both probabilities. One factor is half the question." }
    ],
    connections: [
      { concept: "compound_probability", note: "The independent case — without replacement adds the dependency twist." },
      { concept: "fraction_mult", note: "Combining the draws is fraction multiplication." },
      { concept: "combinations", note: "Counting committees formalizes without-replacement selection." }
    ],
    examples: [
      { question: "A bag has $6$ marbles, $3$ red. Draw two without replacement — probability both are red?", answer: "1/5", explanation: "$\\frac{3}{6} \\times \\frac{2}{5} = \\frac{6}{30} = \\frac{1}{5}$." },
      { question: "A bag has $5$ marbles, $2$ blue. Draw two without replacement — probability both blue?", answer: "1/10", explanation: "$\\frac{2}{5} \\times \\frac{1}{4} = \\frac{1}{10}$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY DEPTH IV (parallelogram & trapezoid areas).
  // ===========================================================================
  geo_area_parallelogram: {
    title: "Area of a Parallelogram",
    formula: "A = b \\times h \\;\\; (h = \\text{perpendicular height, not the slanted side})",
    oneLineSummary: "A parallelogram has the same area as a rectangle with the same base and PERPENDICULAR height — slide the triangle from one end to the other and it becomes a rectangle.",
    intuitionHook: "Lean a rectangle over into a parallelogram. Did its area change? No — you slid the top sideways but kept the same base and the same vertical height, so the same amount of floor is covered. The slant adds nothing to the area; only the straight-up height counts.",
    whatItIs: "The area of a parallelogram is its base times its perpendicular height — the straight-line distance between the two parallel bases, measured at a right angle, NOT along the slanted side.",
    whyItWorks: "Cut a right triangle off one end of a parallelogram and slide it to the other end: the shape becomes a rectangle with the same base and the same height, and rearranging pieces never changes area. So $A = b \\times h$, exactly the rectangle formula. The slanted side is longer than the height (it's the hypotenuse of that cut triangle), so using it overstates the area — the height is the only vertical measure that reflects how much floor is actually covered. The perpendicular height is what 'how tall' really means for area.",
    whenToUse: "Land plots and tilted fields, structural panels, vector parallelograms (area = cross product), and as the stepping stone to triangle and trapezoid areas.",
    representations: [
      { kind: "shear", label: "Slide it into a rectangle", body: "Cut the end triangle, slide it across: a $b \\times h$ rectangle appears — same area, slant gone." },
      { kind: "height", label: "Straight-up height only", body: "The height is the perpendicular gap between the parallel sides — drop a vertical line, not a slanted one." },
      { kind: "compare", label: "Slant overstates", body: "The slanted side is the hypotenuse, longer than the height — using it claims more floor than exists." }
    ],
    commonMistakes: [
      { label: "Using the slanted side", why: "Multiplying base by the slanted edge instead of the perpendicular height — counting the hypotenuse as the height.", fix: "Area needs the STRAIGHT-UP distance between the bases. The slanted side is longer; drop a right-angle height instead." },
      { label: "Adding base and height", why: "Computing $b + h$ — confusing area with a perimeter-like sum.", fix: "Area is a product (square units): $b \\times h$. Adding gives a length, not an area." }
    ],
    connections: [
      { concept: "geo_area_rect", note: "Same formula — a parallelogram is a sheared rectangle of equal area." },
      { concept: "geo_area_triangle", note: "Half a parallelogram is a triangle: A = ½bh." },
      { concept: "geo_area_trapezoid", note: "A trapezoid generalizes this to two different parallel sides." }
    ],
    examples: [
      { question: "A parallelogram has base $7$ and perpendicular height $4$. What is its area?", answer: "28", explanation: "$A = b \\times h = 7 \\times 4 = 28$. The slanted side is irrelevant." },
      { question: "A parallelogram has base $9$ and perpendicular height $5$. What is its area?", answer: "45", explanation: "$9 \\times 5 = 45$." }
    ]
  },

  geo_area_trapezoid: {
    title: "Area of a Trapezoid",
    formula: "A = \\frac{b_1 + b_2}{2} \\times h",
    oneLineSummary: "Average the two parallel sides, then multiply by the height — a trapezoid is a rectangle whose width is the average of its two bases.",
    intuitionHook: "A trapezoid has a short top and a long bottom. What 'width' should you use? Neither extreme — the AVERAGE. A garden $4$ m across the top and $8$ m across the bottom behaves, for area, like a $6$ m-wide rectangle of the same height. The average base turns an awkward shape into a familiar one.",
    whatItIs: "The area of a trapezoid (a quadrilateral with one pair of parallel sides) is the average of the two parallel sides times the perpendicular height between them.",
    whyItWorks: "Take two identical trapezoids and rotate one to fit against the other: together they form a parallelogram whose base is $b_1 + b_2$ and whose height is $h$, with area $(b_1 + b_2)h$. One trapezoid is half of that: $\\frac{(b_1 + b_2)}{2} h$. The $\\frac{1}{2}$ — equivalently, AVERAGING the two bases — is exactly what makes a trapezoid not a rectangle; forgetting it doubles the area. When the two bases are equal the formula collapses to $b \\times h$, the rectangle, confirming it's the natural generalization.",
    whenToUse: "Cross-sections of channels and dams, tapered plots, the area under a line between two points (the trapezoidal rule), and any four-sided figure with one parallel pair.",
    representations: [
      { kind: "average", label: "The average base", body: "Top $4$, bottom $8$ → average $6$: area is $6 \\times h$, as if the shape were a $6$-wide rectangle." },
      { kind: "two_copies", label: "Two make a parallelogram", body: "Rotate a copy onto it: a parallelogram of base $b_1 + b_2$ appears. The trapezoid is half — hence the $\\frac{1}{2}$." },
      { kind: "limit", label: "Equal bases → rectangle", body: "If $b_1 = b_2$, the average is just $b$, and $A = bh$: the rectangle is a trapezoid with matching sides." }
    ],
    commonMistakes: [
      { label: "Forgetting to average", why: "Computing $(b_1 + b_2) \\times h$ — the parallelogram of TWO trapezoids, double the real area.", fix: "Halve the base sum (average the two sides) before multiplying: $\\frac{b_1 + b_2}{2} \\times h$." },
      { label: "Using one base only", why: "Multiplying a single parallel side by the height — ignoring the other base entirely.", fix: "A trapezoid has TWO different parallel sides; both shape the area. Average them, don't pick one." }
    ],
    connections: [
      { concept: "geo_area_parallelogram", note: "Two trapezoids form a parallelogram — that pairing is the proof." },
      { concept: "stat_mean", note: "Averaging the two bases is a two-value mean." },
      { concept: "geo_area_rect", note: "Equal bases reduce the trapezoid to a rectangle — the formula's base case." }
    ],
    examples: [
      { question: "A trapezoid has parallel sides $5$ and $9$ and height $4$. What is its area?", answer: "28", explanation: "$\\frac{5 + 9}{2} \\times 4 = 7 \\times 4 = 28$." },
      { question: "A trapezoid has parallel sides $3$ and $7$ and height $6$. What is its area?", answer: "30", explanation: "$\\frac{3 + 7}{2} \\times 6 = 5 \\times 6 = 30$." }
    ]
  },

  // ===========================================================================
  // POWERS DEPTH III (power of a product).
  // ===========================================================================
  exponent_power_of_product: {
    title: "Power of a Product",
    formula: "(ab)^n = a^n b^n",
    oneLineSummary: "Raising a product to a power raises EVERY factor inside — coefficients included; the exponent distributes over multiplication.",
    intuitionHook: "$(3x)^2$ means $(3x)(3x)$ — gather like with like: $3 \\times 3 = 9$ and $x \\times x = x^2$, giving $9x^2$. The $3$ doesn't get a free pass just because it's a number; it's a factor, and the square hits every factor.",
    whatItIs: "The power-of-a-product rule: when a product is raised to an exponent, each factor is raised to that exponent. Crucially, a numeric coefficient is a factor too, so it gets raised — not left alone, not multiplied by the exponent.",
    whyItWorks: "An exponent is repeated multiplication of the WHOLE base: $(3x)^2 = (3x)(3x)$. Multiplication lets you regroup freely, so the $3$s collect into $3^2 = 9$ and the $x$s into $x^2$ — every factor copied the same number of times. This is why the coefficient is raised, not multiplied: $(3x)^2$ has two $3$s ($3^2 = 9$), not $3 \\times 2 = 6$. The rule distributes over multiplication only — it does NOT distribute over addition, which is why $(a+b)^2 \\ne a^2 + b^2$ but $(ab)^2 = a^2 b^2$.",
    whenToUse: "Simplifying monomial powers, scientific notation ($(2 \\times 10^3)^2 = 4 \\times 10^6$), volume/area scaling (double every dimension → $2^3$ the volume), and all polynomial algebra.",
    representations: [
      { kind: "expand", label: "Write out the copies", body: "$(3x)^2 = (3x)(3x) = (3 \\cdot 3)(x \\cdot x) = 9x^2$. Regroup the like factors." },
      { kind: "every_factor", label: "The power hits each factor", body: "$(2xy)^3 = 2^3 x^3 y^3 = 8x^3 y^3$ — coefficient and every variable, all cubed." },
      { kind: "contrast", label: "Products, not sums", body: "$(ab)^2 = a^2 b^2$ works; $(a+b)^2 = a^2 b^2$ does NOT — distributing a power needs multiplication inside." }
    ],
    commonMistakes: [
      { label: "Leaving the coefficient un-raised", why: "Writing $(3x)^2 = 3x^2$ — powering the variable but not the $3$.", fix: "The coefficient is a factor inside the parentheses: it gets raised too. $(3x)^2 = 3^2 x^2 = 9x^2$." },
      { label: "Multiplying the coefficient by the exponent", why: "Computing $(3x)^2 = 6x^2$ — doing $3 \\times 2$ instead of $3^2$.", fix: "A power is repeated MULTIPLICATION: two $3$s is $3 \\times 3 = 9$, not $3 + 3$ or $3 \\times 2$." }
    ],
    connections: [
      { concept: "exponent_power_rule", note: "Both distribute an outer exponent — one over a power, this one over a product." },
      { concept: "square_binomial", note: "The warning sign: powers distribute over products, NOT over sums." },
      { concept: "scientific_notation", note: "Squaring (2 × 10^3) raises both the mantissa and the power of ten." }
    ],
    examples: [
      { question: "Simplify $(2x)^3$.", answer: "8x^3", explanation: "Every factor cubed: $2^3 x^3 = 8x^3$." },
      { question: "Simplify $(4x)^2$.", answer: "16x^2", explanation: "$4^2 x^2 = 16x^2$ — the coefficient is squared too." }
    ]
  },

  // ===========================================================================
  // ADVANCED PROMOTIONS (calculus limits, number-theory divisor counting).
  // ===========================================================================
  limit: {
    title: "Limits at Infinity",
    formula: "\\lim_{n \\to \\infty} \\frac{a n + \\dots}{b n + \\dots} = \\frac{a}{b}",
    oneLineSummary: "As n races to infinity, only the highest-degree terms matter — the limit of a rational expression is the ratio of its leading coefficients.",
    intuitionHook: "Imagine $\\frac{2n + 5}{n + 100}$ as $n$ grows huge. At $n = 1000$ the $+5$ and $+100$ are rounding errors against the $2000$ and $1000$ — the fraction is essentially $\\frac{2n}{n} = 2$. The big terms drown out the small ones; the limit listens only to the loudest.",
    whatItIs: "A limit at infinity describes the value a sequence or function approaches as its input grows without bound. For a ratio of polynomials of equal degree, that value is the ratio of the leading coefficients; lower-degree terms vanish in the limit.",
    whyItWorks: "Divide top and bottom by the highest power of $n$: $\\frac{2n + 5}{n + 100} = \\frac{2 + 5/n}{1 + 100/n}$. As $n \\to \\infty$, every term with $n$ in the denominator decays to $0$ — $5/n$ and $100/n$ both vanish — leaving $\\frac{2 + 0}{1 + 0} = 2$. The lower-degree terms don't merely get small; they become negligible RELATIVE to the growing leading terms, which is exactly what a limit captures. This is also why a constant term alone is the wrong answer: the limit is governed by the dominant GROWTH, the coefficients on the fastest-growing terms, not by the fixed pieces.",
    whenToUse: "End behavior of functions and sequences, convergence of series, horizontal asymptotes, stability analysis, and the foundational idea beneath derivatives and integrals.",
    representations: [
      { kind: "dominance", label: "Big terms drown small", body: "$\\frac{2n+5}{n+100}$ at $n = 10^6$: $\\approx \\frac{2{,}000{,}005}{1{,}000{,}100} \\approx 2$. The constants stop mattering." },
      { kind: "divide", label: "Divide by the top power", body: "$\\frac{2 + 5/n}{1 + 100/n} \\to \\frac{2 + 0}{1 + 0} = 2$: the $/n$ terms decay to zero." },
      { kind: "leading", label: "Just the leaders", body: "Equal degrees ⇒ limit is leading-coefficient over leading-coefficient: here $\\frac{2}{1} = 2$." }
    ],
    commonMistakes: [
      { label: "Keeping a lower-degree term", why: "Letting the $+5$ or $+100$ influence the answer — they vanish as $n \\to \\infty$.", fix: "Divide through by the highest power of $n$: every leftover $1/n$ term goes to zero. Only the leaders survive." },
      { label: "Reading off a constant", why: "Answering $5$ or $100$ — grabbing a fixed term instead of the leading-coefficient ratio.", fix: "The limit is set by GROWTH, not by the constants. Compare the highest-degree terms: $\\frac{2n}{n} = 2$." }
    ],
    connections: [
      { concept: "derivative", note: "The derivative is itself a limit — of a difference quotient as the step shrinks." },
      { concept: "rate_of_change", note: "Limits formalize 'approaches' — the instantaneous version of average rate." },
      { concept: "exponent_quotient_rule", note: "Dividing by the top power of n uses exponent arithmetic to expose the leaders." }
    ],
    examples: [
      { question: "Evaluate $\\lim_{n \\to \\infty} \\frac{3n + 7}{n + 2}$.", answer: "3", explanation: "Equal degrees: ratio of leading coefficients $\\frac{3}{1} = 3$ (the $+7$, $+2$ vanish)." },
      { question: "Evaluate $\\lim_{n \\to \\infty} \\frac{6n + 1}{2n + 9}$.", answer: "3", explanation: "$\\frac{6}{2} = 3$." }
    ]
  },

  divisor_count: {
    title: "Counting Divisors",
    formula: "n = p_1^{a_1} p_2^{a_2} \\cdots \\implies d(n) = (a_1 + 1)(a_2 + 1)\\cdots",
    oneLineSummary: "Count a number's divisors without listing them: factor into primes, add one to each exponent, and multiply — each prime's exponent offers that many+1 choices.",
    intuitionHook: "How many divisors does $12$ have? List them — $1, 2, 3, 4, 6, 12$ — six. But for $720$ you'd be there all day. The shortcut: $12 = 2^2 \\times 3^1$, and $(2+1)(1+1) = 6$. Every divisor is built by CHOOSING how many of each prime to include, and counting choices is multiplication.",
    whatItIs: "The divisor function $d(n)$ counts the positive divisors of $n$. From the prime factorization $n = p_1^{a_1} \\cdots p_k^{a_k}$, it equals the product $(a_1 + 1)(a_2 + 1)\\cdots(a_k + 1)$ — no listing required.",
    whyItWorks: "Every divisor of $n$ is made by picking, for each prime, how many copies to use — from $0$ up to its exponent $a_i$. That's $a_i + 1$ choices per prime (the $+1$ counts the option of using NONE). Since the choices are independent across primes, the total number of divisors is the PRODUCT of the per-prime choice counts: $(a_1 + 1)(a_2 + 1)\\cdots$ — the multiplication principle of counting. For $12 = 2^2 3^1$: $\\{2^0, 2^1, 2^2\\}$ (3 choices) times $\\{3^0, 3^1\\}$ (2 choices) = $6$ divisors. Counting the primes alone misses the combinations; multiplying the exponents (instead of exponent-plus-one) forgets the 'use none' option.",
    whenToUse: "Number theory and competition math, perfect/abundant number analysis, cryptography (structure of moduli), and any 'how many factors' question — instantly, for any size.",
    representations: [
      { kind: "choices", label: "Choices per prime", body: "$12 = 2^2 \\cdot 3^1$: use $0,1$ or $2$ twos (3 ways) and $0$ or $1$ three (2 ways) → $3 \\times 2 = 6$." },
      { kind: "grid", label: "A combination grid", body: "Each divisor is one cell of a $3 \\times 2$ grid of prime-power choices — six cells, six divisors." },
      { kind: "exponent_plus_one", label: "Add one, then multiply", body: "Exponents $2$ and $1$ → $(2+1)(1+1) = 6$. The $+1$ is the 'include none of this prime' option." }
    ],
    commonMistakes: [
      { label: "Counting only the primes", why: "Saying $12$ has $2$ divisors because it has primes $2$ and $3$ — ignoring composite divisors like $4$ and $6$.", fix: "Divisors include combinations and $1$ and $n$ itself. Build them from prime-power CHOICES: $(2+1)(1+1) = 6$." },
      { label: "Multiplying the exponents", why: "Computing $2 \\times 1 = 2$ from the exponents directly — forgetting the $+1$ for 'use none'.", fix: "Add one to each exponent BEFORE multiplying: each prime offers (exponent + 1) choices, including zero copies." }
    ],
    connections: [
      { concept: "gcd_lcm", note: "Both read structure straight off the prime factorization." },
      { concept: "combinations", note: "Counting divisors IS a counting-principle product — independent choices multiply." },
      { concept: "exponent_power", note: "Prime factorization and its exponents are the raw material." }
    ],
    examples: [
      { question: "How many positive divisors does $18$ have?", answer: "6", explanation: "$18 = 2^1 \\cdot 3^2$, so $(1+1)(2+1) = 6$ (they are $1,2,3,6,9,18$)." },
      { question: "How many positive divisors does $36$ have?", answer: "9", explanation: "$36 = 2^2 \\cdot 3^2$, so $(2+1)(2+1) = 9$." }
    ]
  },

  // ===========================================================================
  // SEQUENCES STRAND (arithmetic & geometric patterns — next term, common
  // difference, the nth-term formula, then the multiplicative switch).
  // ===========================================================================
  arithmetic_next_term: {
    title: "Next Term of an Arithmetic Sequence",
    formula: "a_{n+1} = a_n + d \\quad (d = \\text{the constant step})",
    oneLineSummary: "An arithmetic sequence adds the same amount every step, so the next term is just the last term plus that constant difference.",
    intuitionHook: "Climbing stairs where every step is the same height: $3, 7, 11, 15, \\ldots$ rises by $4$ each time. You don't need a formula to find the next stair — stand on $15$ and take one more $+4$ step to $19$. The rhythm of 'same jump, every time' IS an arithmetic sequence.",
    whatItIs: "A sequence is an ordered list of numbers; it's arithmetic when consecutive terms differ by a constant, called the common difference $d$. Finding the next term means spotting $d$ and adding it once more.",
    whyItWorks: "The defining promise of an arithmetic sequence is that the gap never changes: $a_2 - a_1 = a_3 - a_2 = \\cdots = d$. So once you measure one gap, you've measured them all — extending the list is just repeating that single move. This is why checking a SECOND gap matters: it confirms the pattern really is arithmetic (constant step) and not something that merely looked steady at the start. The step $d$ can be negative (a decreasing sequence) — the rule is identical, you just add a negative.",
    whenToUse: "Predicting evenly-spaced values: seats per row, savings that grow by a fixed amount, tile patterns, anything that increases or decreases by the same chunk each period.",
    representations: [
      { kind: "step_ladder", label: "Same jump each time", body: "$3, 7, 11, 15$: each $+4$. Next is $15 + 4 = 19$ — one more rung of the same height." },
      { kind: "gap_check", label: "Confirm with a second gap", body: "$7 - 3 = 4$ AND $11 - 7 = 4$: two matching gaps say 'arithmetic', so $d = 4$ is trustworthy." },
      { kind: "number_line", label: "Equal hops", body: "On a number line the terms sit at equal spacing; the next term is the next evenly-spaced point." }
    ],
    commonMistakes: [
      { label: "Repeating the last term", why: "Writing $15$ again — naming the current term instead of taking the next step.", fix: "The question asks for the term AFTER $15$. Add the difference once: $15 + 4 = 19$." },
      { label: "Multiplying instead of adding", why: "Treating 'common difference' like a ratio and doubling, e.g. $15 \\times 2 = 30$.", fix: "Arithmetic sequences ADD a fixed amount; only geometric ones multiply. Add $d$." }
    ],
    connections: [
      { concept: "arithmetic_common_difference", note: "Finding the step d is the companion skill — here you use it, there you extract it." },
      { concept: "arithmetic_nth_term", note: "Adding d repeatedly is what the nth-term formula does in one shot." },
      { concept: "geometric_next_term", note: "The multiplicative twin: same idea, but the step is ×r instead of +d." }
    ],
    examples: [
      { question: "What is the next term of $5, 9, 13, 17, \\ldots$?", answer: "21", explanation: "The common difference is $9 - 5 = 4$, so the next term is $17 + 4 = 21$." },
      { question: "What is the next term of $20, 17, 14, 11, \\ldots$?", answer: "8", explanation: "The difference is $-3$ (decreasing), so $11 + (-3) = 8$." }
    ]
  },

  arithmetic_common_difference: {
    title: "Common Difference",
    formula: "d = a_{n+1} - a_n \\quad (\\text{same for every neighbouring pair})",
    oneLineSummary: "The common difference is the constant gap between neighbours — found by subtracting any term from the one after it.",
    intuitionHook: "A sequence $11, 15, 19, 23, \\ldots$ is a staircase, and the common difference is the height of one stair. Subtract any step from the next — $15 - 11 = 4$ — and you've measured the whole staircase, because every stair is the same.",
    whatItIs: "The single number $d$ that an arithmetic sequence adds at each step. It's the rate of the sequence, obtained by subtracting consecutive terms (later minus earlier).",
    whyItWorks: "Because the gap is constant by definition, ANY adjacent pair reveals it: $a_2 - a_1$ gives the same $d$ as $a_4 - a_3$. The order matters — later minus earlier — so an increasing sequence yields a positive $d$ and a decreasing one a negative $d$; flipping the subtraction flips the sign and points the sequence the wrong way. A term of the sequence (like $15$) is a POSITION, not a STEP — confusing the two is the central trap, which is why the operation is subtraction, never just reading a value.",
    whenToUse: "Identifying the rule behind evenly-spaced data, finding the slope of a linear pattern from a table, and as the first step before writing an nth-term formula.",
    representations: [
      { kind: "subtract_neighbours", label: "Later minus earlier", body: "$15 - 11 = 4$; check $19 - 15 = 4$. The matching results confirm $d = 4$." },
      { kind: "sign_of_d", label: "Direction lives in the sign", body: "$20, 17, 14$: $17 - 20 = -3$, so $d = -3$ — the negative says 'decreasing'." },
      { kind: "term_vs_step", label: "A term is not the step", body: "$15$ is where you ARE; $d = 4$ is how far you MOVE. The question asks for the move." }
    ],
    commonMistakes: [
      { label: "Reporting a term instead of the gap", why: "Answering $15$ because it's prominent in the list — but that's a location, not a step.", fix: "Subtract two neighbours: $15 - 11 = 4$. The answer is the GAP, not a member of the sequence." },
      { label: "Subtracting in the wrong order", why: "Computing earlier minus later ($11 - 15 = -4$) on an increasing sequence.", fix: "Always later term minus earlier term. A wrong sign means you flipped the subtraction." }
    ],
    connections: [
      { concept: "arithmetic_next_term", note: "Once you have d, the next term is just last + d." },
      { concept: "rate_of_change", note: "The common difference is the rate of change of a sequence — slope in list form." },
      { concept: "arithmetic_nth_term", note: "d is the multiplier inside a_n = a_1 + (n-1)d." }
    ],
    examples: [
      { question: "Find the common difference of $7, 12, 17, 22, \\ldots$.", answer: "5", explanation: "$12 - 7 = 5$, and $17 - 12 = 5$ confirms it. So $d = 5$." },
      { question: "Find the common difference of $30, 24, 18, 12, \\ldots$.", answer: "-6", explanation: "$24 - 30 = -6$ (decreasing), so $d = -6$." }
    ]
  },

  arithmetic_nth_term: {
    title: "nth Term of an Arithmetic Sequence",
    formula: "a_n = a_1 + (n - 1)\\,d",
    oneLineSummary: "Jump straight to any term: start at the first term and add the common difference (n − 1) times — because reaching term n takes one fewer step than n.",
    intuitionHook: "To find the $50$th term you won't write out $50$ numbers. From the first term, getting to the $50$th takes $49$ steps — not $50$ — because the first term is the starting line, not a step. So add $d$ exactly $49$ times: $a_{50} = a_1 + 49d$.",
    whatItIs: "A closed formula that returns any term directly from its position $n$: the first term plus $(n-1)$ copies of the common difference. It turns 'count your way there' into one calculation.",
    whyItWorks: "Term $1$ requires zero steps, term $2$ requires one step, term $3$ requires two — so term $n$ requires $n-1$ steps, each of size $d$. That single off-by-one ($n-1$, not $n$) is the whole subtlety: the first term is where you BEGIN, so it doesn't cost a step. Writing $a_1 + n\\,d$ adds one step too many and lands you on term $n+1$. The formula is just 'starting value plus rate times steps taken' — the same shape as $y = b + mx$, with $a_1$ the intercept and $d$ the slope.",
    whenToUse: "Finding a far-off term without listing, writing the rule for a linear pattern, comparing sequences, and converting between a sequence and its line $y = a_1 + (x-1)d$.",
    representations: [
      { kind: "steps_taken", label: "Steps = n − 1", body: "Term $1$: 0 steps. Term $5$: 4 steps. Term $n$: $(n-1)$ steps of size $d$." },
      { kind: "plug_in", label: "Substitute and simplify", body: "$a_1 = 3, d = 4, n = 10$: $a_{10} = 3 + (10-1)\\cdot 4 = 3 + 36 = 39$." },
      { kind: "line_in_disguise", label: "It's a line", body: "$a_n = a_1 + (n-1)d$ is $y = mx + b$ with slope $d$ — sequences are linear functions of position." }
    ],
    commonMistakes: [
      { label: "Using n instead of (n − 1)", why: "Writing $a_1 + n\\,d$ — counting the first term as a step it never was.", fix: "The first term is the starting line. Reaching term $n$ costs $n-1$ steps: use $(n-1)d$." },
      { label: "Dropping the first term", why: "Computing $(n-1)d$ alone and forgetting to add $a_1$.", fix: "You must add the starting value back: $a_n = a_1 + (n-1)d$." }
    ],
    connections: [
      { concept: "arithmetic_common_difference", note: "d, the step, is the multiplier in the formula." },
      { concept: "slope_intercept_id", note: "a_1 plays the intercept, d plays the slope — the same two jobs as in y = mx + b." },
      { concept: "function_evaluate", note: "Computing a_n is evaluating the sequence's rule at the input n." }
    ],
    examples: [
      { question: "An arithmetic sequence has first term $4$ and common difference $3$. What is the $10$th term?", answer: "31", explanation: "$a_{10} = 4 + (10-1)\\cdot 3 = 4 + 27 = 31$." },
      { question: "Find the $8$th term of $5, 9, 13, \\ldots$.", answer: "33", explanation: "$a_1 = 5, d = 4$: $a_8 = 5 + (8-1)\\cdot 4 = 5 + 28 = 33$." }
    ]
  },

  geometric_next_term: {
    title: "Next Term of a Geometric Sequence",
    formula: "a_{n+1} = a_n \\times r \\quad (r = \\text{the constant ratio})",
    oneLineSummary: "A geometric sequence multiplies by the same number every step, so the next term is the last term times the common ratio.",
    intuitionHook: "Folding a paper doubles its thickness each time: $1, 2, 4, 8, \\ldots$. The gaps ($1, 2, 4$) keep growing, but the OPERATION never changes — always $\\times 2$. So after $8$ comes $8 \\times 2 = 16$. Growth that compounds is geometric.",
    whatItIs: "A sequence where each term is a constant multiple of the previous one; that multiplier is the common ratio $r$. Finding the next term means multiplying the last term by $r$.",
    whyItWorks: "The defining rule is a constant RATIO, not a constant difference: $a_2 / a_1 = a_3 / a_2 = r$. So the differences between terms keep changing (they scale up with the terms), which is exactly why treating a geometric sequence as arithmetic — adding the last gap — fails. The constant thing to grab is the ratio: divide any term by the one before it to find $r$, then multiply forward. Because each step multiplies, geometric sequences grow (or shrink, if $0 < r < 1$) far faster than arithmetic ones — this is the mathematics of compounding.",
    whenToUse: "Doubling/halving, compound interest, population growth, repeated percentage change — any process that scales by a fixed factor each period.",
    representations: [
      { kind: "multiply_step", label: "Same multiplier each time", body: "$1, 2, 4, 8$: each $\\times 2$. Next is $8 \\times 2 = 16$." },
      { kind: "ratio_check", label: "Confirm with a ratio", body: "$2 \\div 1 = 2$ and $4 \\div 2 = 2$: matching ratios say 'geometric', so $r = 2$." },
      { kind: "gaps_grow", label: "Gaps aren't constant", body: "Differences $1, 2, 4$ keep growing — proof it's NOT arithmetic; only the ratio holds steady." }
    ],
    commonMistakes: [
      { label: "Adding the last gap", why: "Doing $8 + (8-4) = 12$ — treating a geometric sequence as arithmetic.", fix: "The gaps grow; the RATIO is constant. Multiply: $8 \\times 2 = 16$." },
      { label: "Adding the ratio instead of multiplying", why: "Computing $8 + 2 = 10$ — mistaking $r$ for a difference.", fix: "The ratio is a multiplier, not an addend: $8 \\times r$, not $8 + r$." }
    ],
    connections: [
      { concept: "geometric_common_ratio", note: "Finding r is the companion skill — divide neighbours to get it." },
      { concept: "arithmetic_next_term", note: "The additive twin: same idea of a constant step, but +d instead of ×r." },
      { concept: "exponent_power", note: "Repeated multiplication is exponentiation — geometric terms are a_1 · r^(n-1)." }
    ],
    examples: [
      { question: "What is the next term of $2, 6, 18, 54, \\ldots$?", answer: "162", explanation: "The ratio is $6 \\div 2 = 3$, so the next term is $54 \\times 3 = 162$." },
      { question: "What is the next term of $3, 6, 12, 24, \\ldots$?", answer: "48", explanation: "Each term doubles ($r = 2$), so $24 \\times 2 = 48$." }
    ]
  },

  geometric_common_ratio: {
    title: "Common Ratio",
    formula: "r = \\dfrac{a_{n+1}}{a_n} \\quad (\\text{same for every neighbouring pair})",
    oneLineSummary: "The common ratio is the constant multiplier of a geometric sequence — found by dividing any term by the one before it.",
    intuitionHook: "In $5, 15, 45, 135, \\ldots$ each term is $3$ times the last. To uncover that $3$, divide neighbours: $15 \\div 5 = 3$. Division is the inverse of the multiply-each-step rule, so it hands you back the multiplier.",
    whatItIs: "The number $r$ a geometric sequence multiplies by at each step, obtained by dividing a term by its predecessor (later over earlier).",
    whyItWorks: "Since every term is the previous one times $r$, dividing them cancels everything but $r$: $a_{n+1}/a_n = (a_n \\cdot r)/a_n = r$. Any adjacent pair gives the same answer, which is also how you VERIFY a sequence is geometric — compute two ratios and check they match. The dominant error is subtracting instead of dividing, importing the arithmetic habit; but in a geometric sequence the differences aren't constant, so subtraction yields a different number for every pair. Ratio is to geometric sequences what difference is to arithmetic ones.",
    whenToUse: "Identifying the growth/decay factor behind multiplying data, finding the base of an exponential model, and before writing a geometric nth-term rule $a_n = a_1 r^{n-1}$.",
    representations: [
      { kind: "divide_neighbours", label: "Later over earlier", body: "$15 \\div 5 = 3$; check $45 \\div 15 = 3$. Matching results confirm $r = 3$." },
      { kind: "ratio_not_difference", label: "Divide, don't subtract", body: "Subtracting gives $15 - 5 = 10$ then $45 - 15 = 30$ — not constant, so subtraction is wrong here." },
      { kind: "decay_case", label: "r can be a fraction", body: "$80, 40, 20, \\ldots$: $40 \\div 80 = \\tfrac{1}{2}$, a shrinking sequence with $r = \\tfrac12$." }
    ],
    commonMistakes: [
      { label: "Subtracting consecutive terms", why: "Computing $15 - 5 = 10$ as if the sequence were arithmetic.", fix: "Geometric sequences multiply, so DIVIDE: $15 \\div 5 = 3$. Subtraction won't give a constant here." },
      { label: "Reporting a term instead of the ratio", why: "Answering $15$ because it's in the list — a term, not the multiplier.", fix: "The ratio is the result of a division, not a member of the sequence: $15 \\div 5 = 3$." }
    ],
    connections: [
      { concept: "geometric_next_term", note: "Once you have r, the next term is just last × r." },
      { concept: "arithmetic_common_difference", note: "The additive analogue — difference is to arithmetic what ratio is to geometric." },
      { concept: "fraction_div", note: "Finding r is a division; for shrinking sequences r is a fraction." }
    ],
    examples: [
      { question: "Find the common ratio of $4, 12, 36, 108, \\ldots$.", answer: "3", explanation: "$12 \\div 4 = 3$, and $36 \\div 12 = 3$ confirms it. So $r = 3$." },
      { question: "Find the common ratio of $2, 10, 50, 250, \\ldots$.", answer: "5", explanation: "$10 \\div 2 = 5$, so $r = 5$." }
    ]
  },

  geometric_nth_term: {
    title: "nth Term of a Geometric Sequence",
    formula: "a_n = a_1 \\cdot r^{\\,n-1}",
    oneLineSummary: "Reach any term of a geometric sequence by multiplying the first term by the common ratio (n − 1) times.",
    intuitionHook: "Money doubling each year from $\\$1$: year 1 is $\\$1$, year 2 is $\\$2$, year 5 is $\\$1 \\times 2^4 = \\$16$ — four doublings, not five, because year 1 hasn't doubled yet. The exponent counts the JUMPS between terms, one fewer than the term number.",
    whatItIs: "A closed formula for the $n$th term of a geometric sequence: the first term times the common ratio raised to the power $(n-1)$. It jumps straight to any term without listing.",
    whyItWorks: "Each step multiplies by $r$, and getting from term 1 to term $n$ takes $n-1$ steps — the first term is the starting point, costing no multiplication. So you apply $r$ exactly $n-1$ times, which is $r^{n-1}$. This is the multiplicative twin of the arithmetic $a_1 + (n-1)d$: same off-by-one on the steps, but repeated multiplication (a power) instead of repeated addition. Using $r^n$ multiplies one extra time and lands on term $n+1$; multiplying by $r(n-1)$ confuses 'a power' with 'times the step count'.",
    whenToUse: "Compound interest and growth, halving and decay, population models, and any quantity scaling by a fixed factor each period.",
    representations: [
      { kind: "count_jumps", label: "Exponent = n − 1 jumps", body: "Term 1: $r^0$. Term 5: $r^4$. Term $n$: $r^{n-1}$." },
      { kind: "plug_in", label: "Substitute and power", body: "$a_1 = 3, r = 2, n = 4$: $3 \\cdot 2^{3} = 3 \\cdot 8 = 24$." },
      { kind: "vs_arithmetic", label: "Power, not product", body: "Arithmetic adds $(n-1)d$; geometric MULTIPLIES by $r^{n-1}$." }
    ],
    commonMistakes: [
      { label: "Using the exponent n", why: "Writing $a_1 r^n$ — one multiplication too many (that's term $n+1$).", fix: "The first term costs no jump: use $r^{n-1}$." },
      { label: "Multiplying instead of powering", why: "Computing $a_1 \\cdot r \\cdot (n-1)$ — treating repeated multiplication like repeated addition.", fix: "Apply $r$ as a POWER: $r^{n-1}$, not $r \\times (n-1)$." }
    ],
    connections: [
      { concept: "arithmetic_nth_term", note: "The additive twin: a_1 + (n-1)d adds where this multiplies." },
      { concept: "geometric_common_ratio", note: "You need r first; this formula then reaches any term." },
      { concept: "exponent_power", note: "r^(n-1) is repeated multiplication — exactly an exponent." }
    ],
    examples: [
      { question: "A geometric sequence has first term $3$ and ratio $2$. What is the 4th term?", answer: "24", explanation: "$3 \\cdot 2^{4-1} = 3 \\cdot 8 = 24$." },
      { question: "Find the 5th term of $2, 6, 18, \\ldots$ (ratio $3$).", answer: "162", explanation: "$2 \\cdot 3^{4} = 2 \\cdot 81 = 162$." }
    ]
  },

  arithmetic_series: {
    title: "Sum of an Arithmetic Series",
    formula: "S_n = n \\cdot \\frac{a_1 + a_n}{2}",
    oneLineSummary: "Add up an arithmetic sequence by multiplying how many terms there are by the average of the first and last.",
    intuitionHook: "To add $1 + 2 + \\cdots + 100$, the young Gauss paired $1{+}100$, $2{+}99$, … — fifty pairs of $101$, total $5050$. Each pair has the same sum, so the whole series is just the count times the average of the ends.",
    whatItIs: "A formula for the sum of the first $n$ terms of an arithmetic sequence: the number of terms times the average of the first and last term.",
    whyItWorks: "In an arithmetic sequence the terms rise by a constant step, so they're symmetric about their middle — the first and last average to the same value as the second and second-to-last, and so on. That shared average is $\\frac{a_1 + a_n}{2}$, and there are $n$ terms, so the total is $n \\cdot \\frac{a_1 + a_n}{2}$. Writing it as 'pairs' explains the halving: pairing the ends gives $\\frac{n}{2}$ pairs each summing to $a_1 + a_n$. Forgetting the $\\div 2$ counts every term twice; using $n \\cdot a_n$ assumes every term equals the largest.",
    whenToUse: "Totaling evenly-spaced values — seats in rows, stacked logs, cumulative savings — and any 'sum $1$ to $N$' problem.",
    representations: [
      { kind: "pair_the_ends", label: "Average of the ends", body: "$2,4,6,8$: ends average $\\frac{2+8}{2}=5$; $4$ terms $\\to 4\\cdot5 = 20$." },
      { kind: "gauss_pairs", label: "Count × average", body: "$n$ terms, each pair sums to first + last → $S = n\\cdot\\frac{a_1+a_n}{2}$." },
      { kind: "find_last_first", label: "You need the last term", body: "$a_n = a_1 + (n-1)d$ before averaging." }
    ],
    commonMistakes: [
      { label: "Forgetting to halve", why: "Computing $n(a_1 + a_n)$ — that's the doubled total (every term counted twice).", fix: "Divide by 2: pairing the ends gives $\\frac{n}{2}$ pairs, so $S = n\\cdot\\frac{a_1+a_n}{2}$." },
      { label: "Multiplying by the last term", why: "Using $n \\cdot a_n$ assumes all terms equal the biggest one.", fix: "Use the AVERAGE of first and last, not the last alone." }
    ],
    connections: [
      { concept: "arithmetic_nth_term", note: "You need the last term a_n = a_1 + (n-1)d before summing." },
      { concept: "stat_mean", note: "The series sum is the count times the average term — a mean in disguise." },
      { concept: "arithmetic_common_difference", note: "The constant step is what makes the terms symmetric about the middle." }
    ],
    examples: [
      { question: "Sum the first 4 terms of $2, 4, 6, 8, \\ldots$.", answer: "20", explanation: "Last term $8$; $S = 4 \\cdot \\frac{2+8}{2} = 4 \\cdot 5 = 20$." },
      { question: "Sum the first 5 terms of $3, 5, 7, \\ldots$.", answer: "35", explanation: "Last term $11$; $S = 5 \\cdot \\frac{3+11}{2} = 5 \\cdot 7 = 35$." }
    ]
  },

  fibonacci_next: {
    title: "Recursive Sequences",
    formula: "a_{n} = a_{n-1} + a_{n-2} \\quad (\\text{each term from the two before})",
    oneLineSummary: "In a recursive sequence each term is built from previous ones — Fibonacci-style, every term is the sum of the two before it.",
    intuitionHook: "$1, 1, 2, 3, 5, 8, \\ldots$ — the Fibonacci numbers. Each one is just the two before it added together: $3 + 5 = 8$. You don't need a formula for $n$; you only need to look back two steps.",
    whatItIs: "A sequence defined by a rule that builds each term from earlier terms (a recurrence), rather than from its position. The Fibonacci-style rule adds the two most recent terms.",
    whyItWorks: "An explicit rule (like $a_n = a_1 + (n-1)d$) computes a term straight from its position $n$; a RECURSIVE rule instead says how to get the next term from the ones you already have. For the Fibonacci pattern that rule is 'add the latest two', so each new term needs only the two immediately before it — always the most recent pair, sliding forward one step at a time. The errors come from grabbing the wrong inputs: doubling the last term, or reusing an older term instead of the current two.",
    whenToUse: "Patterns where growth depends on recent history — Fibonacci in nature, population with memory, and any 'each term depends on the previous ones' rule.",
    representations: [
      { kind: "look_back_two", label: "Add the latest two", body: "$2, 3, 5, 8$: next is $5 + 8 = 13$." },
      { kind: "sliding_pair", label: "The pair slides forward", body: "Each step uses the two newest terms, then moves on by one." },
      { kind: "recursive_vs_explicit", label: "Rule from history, not position", body: "No position formula needed — build forward from what you have." }
    ],
    commonMistakes: [
      { label: "Doubling the last term", why: "Computing $2 \\times$ (last) instead of last + second-to-last.", fix: "Add the two DIFFERENT recent terms; they're usually not equal." },
      { label: "Using an older term", why: "Adding the last term to one further back instead of the immediate pair.", fix: "Always the two MOST RECENT terms — slide the pair forward each step." }
    ],
    connections: [
      { concept: "arithmetic_next_term", note: "Also extends a sequence step by step — there by adding a constant, here by adding history." },
      { concept: "arithmetic_common_difference", note: "Arithmetic is the simplest recurrence: add the same number each time." },
      { concept: "geometric_next_term", note: "Another recurrence: multiply by a constant instead of summing terms." }
    ],
    examples: [
      { question: "Each term is the sum of the two before it: $2, 3, 5, 8, \\ldots$ What is next?", answer: "13", explanation: "$5 + 8 = 13$." },
      { question: "Continue $1, 4, 5, 9, \\ldots$ (each = sum of previous two).", answer: "14", explanation: "$5 + 9 = 14$." }
    ]
  },

  // ===========================================================================
  // EQUATIONS STRAND — solving equations with fractions (6.EE / 7.EE / 7.RP).
  // ===========================================================================
  eqn_onestep_div: {
    title: "One-Step Equations (Division)",
    formula: "\\frac{x}{a} = b \\implies x = a \\cdot b",
    oneLineSummary: "When x is divided by a number, undo it by multiplying both sides by that same number.",
    intuitionHook: "A balance scale holds $\\frac{x}{4}$ on one side and $5$ on the other. To find the whole $x$, scale BOTH pans up by $4$: the left becomes $x$, the right becomes $20$. Whatever you do to one side you must do to the other — that's how the scale stays balanced.",
    whatItIs: "Solving an equation where the unknown has been divided by a number. The inverse of division is multiplication, so you multiply both sides by the divisor to free $x$.",
    whyItWorks: "An equation is a balance: the two sides are equal, and they stay equal only if you do the SAME operation to both. Here $x$ has been divided by $a$, and division is undone by multiplication, so multiplying both sides by $a$ cancels the $\\frac{1}{a}$ on the left ($\\frac{x}{a} \\cdot a = x$) while scaling the right to $a \\cdot b$. The single most common slip is reporting $b$ as the answer — but $b$ is what $\\frac{x}{a}$ equals, a SHRUNKEN version of $x$, not $x$ itself. You must scale back up.",
    whenToUse: "Any 'a part is known, find the whole' setup: $\\frac{1}{a}$ of a number is given, splitting into equal groups, or reversing a unit conversion.",
    representations: [
      { kind: "balance", label: "Scale both sides", body: "$\\frac{x}{4} = 5$: multiply both pans by $4 \\to x = 20$." },
      { kind: "inverse_op", label: "Undo division with ×", body: "Divided by $a$? Multiply by $a$. The operations cancel: $\\frac{x}{a}\\cdot a = x$." },
      { kind: "check", label: "Verify by substituting", body: "$x = 20$: $\\frac{20}{4} = 5$ ✓ — the answer must satisfy the original equation." }
    ],
    commonMistakes: [
      { label: "Leaving the answer as b", why: "Reporting $5$ for $\\frac{x}{4} = 5$ — that's $\\frac{x}{4}$, not $x$.", fix: "Multiply by the divisor: $x = 5 \\times 4 = 20$. $b$ is a fraction of $x$, not $x$." },
      { label: "Dividing instead of multiplying", why: "Computing $\\frac{b}{a}$ — that divides again, shrinking $x$ further.", fix: "$x$ was already divided; reverse it by MULTIPLYING both sides by $a$." }
    ],
    connections: [
      { concept: "linear_one_step", note: "Same one-step idea — here the operation to undo is division." },
      { concept: "integer_div", note: "Recognizing the division is what tells you to multiply to undo it." },
      { concept: "eqn_fraction_coeff", note: "Next step up: a fractional coefficient needs both a multiply and a divide." }
    ],
    examples: [
      { question: "Solve: $\\frac{x}{3} = 7$.", answer: "21", explanation: "Multiply both sides by $3$: $x = 7 \\times 3 = 21$." },
      { question: "Solve: $\\frac{x}{5} = 4$.", answer: "20", explanation: "$x = 4 \\times 5 = 20$." }
    ]
  },

  eqn_fraction_coeff: {
    title: "Fractional Coefficients",
    formula: "\\frac{a}{b}x = c \\implies x = c \\cdot \\frac{b}{a}",
    oneLineSummary: "To undo multiplication by a fraction, multiply both sides by its reciprocal (flip it).",
    intuitionHook: "If $\\frac{2}{3}$ of a number is $8$, the number is bigger than $8$. Flipping the fraction does both jobs at once: $8 \\times \\frac{3}{2} = 12$. The reciprocal divides by the $2$ and multiplies by the $3$ in a single clean move.",
    whatItIs: "Solving an equation whose unknown is multiplied by a fraction $\\frac{a}{b}$. You isolate $x$ by multiplying both sides by the reciprocal $\\frac{b}{a}$.",
    whyItWorks: "A number times its reciprocal is $1$: $\\frac{a}{b} \\cdot \\frac{b}{a} = 1$. So multiplying both sides of $\\frac{a}{b}x = c$ by $\\frac{b}{a}$ turns the left into $1 \\cdot x = x$ and the right into $c \\cdot \\frac{b}{a}$. The reciprocal packs TWO inverse operations into one: dividing by the numerator $a$ and multiplying by the denominator $b$. Doing only half — dividing by $a$ but forgetting to multiply by $b$ (or vice versa) — leaves the job unfinished, which is exactly the trap. Flipping the fraction guarantees you do both.",
    whenToUse: "Solving for a variable scaled by a fraction or percent, reversing a 'fraction of' relationship, and rearranging rate or recipe problems.",
    representations: [
      { kind: "reciprocal", label: "Flip and multiply", body: "$\\frac{2}{3}x = 8$: multiply by $\\frac{3}{2} \\to x = \\frac{3}{2}\\cdot 8 = 12$." },
      { kind: "two_moves", label: "Divide by a, times b", body: "$\\div 2$ then $\\times 3$: $8 \\div 2 = 4$, $4 \\times 3 = 12$. The reciprocal does both." },
      { kind: "check", label: "Substitute back", body: "$\\frac{2}{3}(12) = 8$ ✓." }
    ],
    commonMistakes: [
      { label: "Only dividing by the numerator", why: "Computing $8 \\div 2 = 4$ and stopping — the denominator $3$ was never used.", fix: "Multiply by the WHOLE reciprocal $\\frac{3}{2}$: divide by $2$ AND multiply by $3$." },
      { label: "Only multiplying by the denominator", why: "Computing $8 \\times 3 = 24$ and stopping — the numerator $2$ was ignored.", fix: "The reciprocal is $\\frac{b}{a}$: you owe both the $\\times b$ and the $\\div a$." }
    ],
    connections: [
      { concept: "eqn_onestep_div", note: "Builds on undoing one operation; a fraction needs the reciprocal (two at once)." },
      { concept: "fraction_mult", note: "Multiplying by the reciprocal is fraction multiplication." },
      { concept: "fraction_div", note: "Dividing by a fraction IS multiplying by its reciprocal — the same move." }
    ],
    examples: [
      { question: "Solve: $\\frac{3}{4}x = 9$.", answer: "12", explanation: "Multiply by $\\frac{4}{3}$: $x = 9 \\times \\frac{4}{3} = 12$." },
      { question: "Solve: $\\frac{2}{5}x = 6$.", answer: "15", explanation: "$x = 6 \\times \\frac{5}{2} = 15$." }
    ]
  },

  eqn_clear_denom: {
    title: "Clearing a Denominator",
    formula: "\\frac{x + c}{a} = d \\implies x + c = a \\cdot d \\implies x = ad - c",
    oneLineSummary: "When a whole expression sits over a denominator, multiply both sides by it first to clear the fraction, then solve normally.",
    intuitionHook: "$\\frac{x + 2}{3} = 5$ looks scary until you clear the $3$: multiply both sides and it becomes $x + 2 = 15$, an ordinary two-step equation. The fraction is just a disguise — lift the denominator off the whole top and the problem turns plain.",
    whatItIs: "Solving an equation where an entire expression (like $x + c$) is divided by a number. Multiply both sides by the denominator to clear it, then undo the remaining operations.",
    whyItWorks: "The fraction bar groups the ENTIRE numerator — $\\frac{x+c}{a}$ means $(x + c)$ all divided by $a$. Multiplying both sides by $a$ undoes that division, but because the whole top was divided, the whole top reappears: $x + c = a \\cdot d$. (Distributing the $a$ only onto part of the numerator is the classic error.) Now it's a routine two-step equation: subtract $c$. Clearing the denominator FIRST keeps the grouping intact and turns a fraction equation into one you already know how to solve.",
    whenToUse: "Equations with a sum or difference over a number, averages set equal to a value, and formula rearrangements with a fraction.",
    representations: [
      { kind: "clear_first", label: "Lift off the denominator", body: "$\\frac{x+2}{3} = 5 \\to x + 2 = 15$ (both sides $\\times 3$)." },
      { kind: "then_solve", label: "Now it's two-step", body: "$x + 2 = 15 \\to x = 13$ (subtract $2$)." },
      { kind: "whole_top", label: "The bar groups everything", body: "The $\\times a$ hits the WHOLE numerator $(x + c)$, not just $x$." }
    ],
    commonMistakes: [
      { label: "Solving the numerator without clearing", why: "Treating $\\frac{x+c}{a} = d$ as $x + c = d$ — the denominator was ignored.", fix: "Multiply both sides by $a$ FIRST: $x + c = ad$, then continue." },
      { label: "Forgetting to subtract c", why: "Stopping at $x + c = ad$ and reporting $ad$.", fix: "After clearing, undo the addition: $x = ad - c$." }
    ],
    connections: [
      { concept: "eqn_onestep_div", note: "Clearing the denominator is the one-step multiply, applied to a whole expression." },
      { concept: "linear_two_step", note: "After clearing, what remains is exactly a two-step equation." },
      { concept: "eqn_two_step_fraction", note: "A sibling case where the fraction and the constant sit apart." }
    ],
    examples: [
      { question: "Solve: $\\frac{x + 4}{2} = 6$.", answer: "8", explanation: "Multiply by $2$: $x + 4 = 12$; subtract $4$: $x = 8$." },
      { question: "Solve: $\\frac{x + 3}{4} = 5$.", answer: "17", explanation: "$x + 3 = 20$, so $x = 17$." }
    ]
  },

  eqn_proportion: {
    title: "Solving Proportions",
    formula: "\\frac{a}{b} = \\frac{x}{d} \\implies b \\cdot x = a \\cdot d \\implies x = \\frac{a \\cdot d}{b}",
    oneLineSummary: "Two equal ratios let you cross-multiply, turning the proportion into a simple equation you finish by dividing.",
    intuitionHook: "If $\\frac{3}{4} = \\frac{x}{8}$, the second ratio is the first one scaled up. Cross-multiplying — $4x = 3 \\times 8$ — trades the two fractions for one clean equation, and dividing by $4$ finishes it: $x = 6$.",
    whatItIs: "Solving an equation stating two ratios are equal. Cross-multiplication converts it to a linear equation, which you then solve by dividing.",
    whyItWorks: "A proportion $\\frac{a}{b} = \\frac{x}{d}$ is two fractions set equal. Multiply both sides by both denominators ($b$ and $d$) and the fractions clear, leaving $a \\cdot d = b \\cdot x$ — that shortcut is 'cross-multiplication', and it works because it's just clearing two denominators at once. The result is a one-step equation: divide by $b$ to isolate $x$. The two traps are cross-multiplying the wrong pairs and stopping after the multiply without the final divide — cross-multiplication is only HALF the solve.",
    whenToUse: "Scaling recipes and maps, similar-figure side lengths, unit-rate and percent problems, and any 'this is to that as x is to the other' relationship.",
    representations: [
      { kind: "cross_multiply", label: "Multiply across the equals", body: "$\\frac{3}{4} = \\frac{x}{8}$: $4 \\cdot x = 3 \\cdot 8 = 24$." },
      { kind: "then_divide", label: "Finish by dividing", body: "$4x = 24 \\to x = 6$. The divide is the second half." },
      { kind: "scale_factor", label: "One ratio scaled", body: "$8$ is $4 \\times 2$, so $x = 3 \\times 2 = 6$ — same answer, scaling view." }
    ],
    commonMistakes: [
      { label: "Cross-multiplying but not dividing", why: "Reporting $24$ for $\\frac{3}{4} = \\frac{x}{8}$ — that's $4x$, not $x$.", fix: "After $4x = 24$, divide by $4$: $x = 6$. The multiply is only step one." },
      { label: "Copying the denominator", why: "Answering $8$ because it sits opposite $x$.", fix: "$x$ is unknown — solve for it; the denominator $8$ is given, not the answer." }
    ],
    connections: [
      { concept: "proportion_solve", note: "The same proportional reasoning, here framed as a cross-multiply equation." },
      { concept: "eqn_onestep_div", note: "After cross-multiplying you're left with a one-step divide." },
      { concept: "ratio_solve", note: "Proportions are equal ratios; this solves for the missing term." }
    ],
    examples: [
      { question: "Solve: $\\frac{2}{3} = \\frac{x}{9}$.", answer: "6", explanation: "Cross-multiply: $3x = 18$; divide by $3$: $x = 6$." },
      { question: "Solve: $\\frac{5}{2} = \\frac{x}{4}$.", answer: "10", explanation: "$2x = 20$, so $x = 10$." }
    ]
  },

  eqn_two_step_fraction: {
    title: "Two-Step Equations with a Fraction",
    formula: "\\frac{x}{a} - c = d \\implies \\frac{x}{a} = d + c \\implies x = a(d + c)",
    oneLineSummary: "Undo the addition or subtraction first to isolate the fraction, then multiply by the denominator — reverse order of operations.",
    intuitionHook: "$\\frac{x}{2} - 3 = 4$: first put the $3$ back ($\\frac{x}{2} = 7$), THEN scale up by $2$ ($x = 14$). You unwrap an equation like a package — outermost layer (the $-3$) comes off first, the division last.",
    whatItIs: "Solving an equation with two operations on $x$: a division and an added/subtracted constant. You reverse them in opposite order — undo the constant, then undo the division.",
    whyItWorks: "Building the left side, $x$ was first divided by $a$, THEN had $c$ subtracted. To unbuild it, reverse the steps in REVERSE order: undo the last operation first. So add $c$ to both sides to clear the constant, isolating $\\frac{x}{a} = d + c$; only then multiply by $a$ to clear the denominator. Multiplying first, before adding $c$ back, would scale the constant too and corrupt it — which is exactly why order matters. It's the same 'unwrap outermost-first' logic as any two-step equation.",
    whenToUse: "Real-world setups where a quantity is split into parts and then adjusted by a fixed amount, and any equation mixing a fraction with a constant term.",
    representations: [
      { kind: "add_first", label: "Undo +/- first", body: "$\\frac{x}{2} - 3 = 4 \\to \\frac{x}{2} = 7$ (add $3$)." },
      { kind: "then_multiply", label: "Clear the denominator last", body: "$\\frac{x}{2} = 7 \\to x = 14$ (multiply by $2$)." },
      { kind: "reverse_order", label: "Unwrap outermost first", body: "Built: $\\div 2$ then $-3$. Undo: $+3$ then $\\times 2$ — reverse order." }
    ],
    commonMistakes: [
      { label: "Forgetting to multiply by the denominator", why: "Stopping at $\\frac{x}{2} = 7$ and reporting $7$.", fix: "Once the fraction is isolated, multiply both sides by the denominator: $x = 14$." },
      { label: "Clearing the denominator before adding c", why: "Multiplying by $a$ while the $-c$ is still attached, so $c$ gets scaled too.", fix: "Add $c$ back FIRST to isolate the fraction, THEN multiply by $a$." }
    ],
    connections: [
      { concept: "eqn_clear_denom", note: "Both clear a denominator; here the constant sits outside the fraction." },
      { concept: "linear_two_step", note: "Same reverse-order, two-step logic, with division as one of the steps." },
      { concept: "eqn_onestep_div", note: "The final move is the one-step multiply you already know." }
    ],
    examples: [
      { question: "Solve: $\\frac{x}{3} - 2 = 4$.", answer: "18", explanation: "Add $2$: $\\frac{x}{3} = 6$; multiply by $3$: $x = 18$." },
      { question: "Solve: $\\frac{x}{2} - 5 = 3$.", answer: "16", explanation: "$\\frac{x}{2} = 8$, so $x = 16$." }
    ]
  },

  // ===========================================================================
  // RATIOS & RATES STRAND — applied proportional reasoning (6.RP / 7.RP / 7.G).
  // ===========================================================================
  ratio_simplify: {
    title: "Simplifying Ratios",
    formula: "a : b = \\frac{a}{g} : \\frac{b}{g} \\quad (g = \\gcd(a, b))",
    oneLineSummary: "Divide both parts of a ratio by their greatest common factor to write it in lowest terms — like reducing a fraction, but keep the order.",
    intuitionHook: "Twelve boys to eight girls, $12:8$, describes the same mix as $3:2$ — for every $3$ boys there are $2$ girls. Both ratios tell the identical story; $3:2$ just tells it with the smallest possible numbers.",
    whatItIs: "Reducing a ratio to its simplest form by dividing both quantities by their greatest common factor, so the two numbers share no common factor larger than $1$.",
    whyItWorks: "A ratio compares two quantities by division, so scaling both parts by the same number doesn't change the comparison — $12:8$, $6:4$, and $3:2$ are all the same relationship, just at different scales (exactly like equivalent fractions). Dividing both parts by their GCF strips out every shared factor at once, landing on the unique smallest whole-number form. Two cautions: divide BOTH parts by the same number (halving only one changes the ratio), and keep the ORDER — $3:2$ and $2:3$ describe opposite mixes.",
    whenToUse: "Comparing quantities cleanly (recipes, mixtures, maps, odds), checking whether two ratios are equivalent, and as the first step before sharing in a ratio.",
    representations: [
      { kind: "like_fractions", label: "Reduce like a fraction", body: "$12:8$ → divide both by $4$ → $3:2$, the same way $\\frac{12}{8} = \\frac{3}{2}$." },
      { kind: "both_parts", label: "Same divisor on both", body: "Halving only one part ($12:8 \\to 6:8$) changes the mix — divide BOTH by the GCF." },
      { kind: "order_matters", label: "Keep the order", body: "$3:2$ (more of the first) is not $2:3$ (more of the second)." }
    ],
    commonMistakes: [
      { label: "Not fully simplifying", why: "Dividing $12:8$ by $2$ to get $6:4$ and stopping — $6$ and $4$ still share a factor.", fix: "Divide by the GREATEST common factor ($4$), or keep reducing until the parts are coprime." },
      { label: "Reversing the order", why: "Writing $2:3$ when the ratio was $12:8$.", fix: "The first quantity stays first: $12:8 \\to 3:2$." }
    ],
    connections: [
      { concept: "fraction_simplify", note: "Same reduce-by-the-GCF move, written with a colon instead of a bar." },
      { concept: "ratio_share", note: "Simplest form gives the fewest 'parts' to split a total into." },
      { concept: "ratio_solve", note: "Equivalent ratios are the engine behind solving for a missing term." }
    ],
    examples: [
      { question: "Simplify the ratio $10 : 15$.", answer: "2:3", explanation: "Divide both by their GCF $5$: $10 \\div 5 = 2$, $15 \\div 5 = 3$, giving $2:3$." },
      { question: "Simplify the ratio $9 : 12$.", answer: "3:4", explanation: "GCF is $3$: $9 \\div 3 = 3$, $12 \\div 3 = 4$, so $3:4$." }
    ]
  },

  ratio_share: {
    title: "Sharing in a Ratio",
    formula: "\\text{one part} = \\frac{\\text{total}}{\\text{sum of ratio terms}}; \\quad \\text{share} = (\\text{its terms}) \\times \\text{one part}",
    oneLineSummary: "Add the ratio terms to get the number of equal parts, divide the total by that to size one part, then multiply by each person's terms.",
    intuitionHook: "Split $\\$20$ between two people in a $2:3$ ratio. Think of $5$ equal envelopes ($2 + 3$): each holds $\\$4$. One person takes $2$ envelopes ($\\$8$), the other takes $3$ ($\\$12$). The ratio tells you how many envelopes each gets, not the dollars directly.",
    whatItIs: "Dividing a total amount into shares that follow a given ratio. The ratio terms count how many equal 'parts' each share contains.",
    whyItWorks: "A ratio $2:3$ means the total is cut into $2 + 3 = 5$ equal parts. Finding the size of ONE part — total $\\div 5$ — is the key move, because every share is just a whole number of those identical parts. Then each person's share is their term count times the part size. This is why you add the terms first: the sum is the denominator of the whole, and skipping it (e.g. treating the total as one person's share, or stopping at one part's value) answers a different question. The shares always add back to the total, a built-in check.",
    whenToUse: "Splitting money, ingredients, profits, or time fairly by a ratio; mixing solutions; and any 'divide this among them in the ratio…' problem.",
    representations: [
      { kind: "equal_parts", label: "Count the parts", body: "$2:3$ → $5$ equal parts. $\\$20 \\div 5 = \\$4$ per part." },
      { kind: "scale_each", label: "Multiply by each term", body: "Shares: $2 \\times \\$4 = \\$8$ and $3 \\times \\$4 = \\$12$." },
      { kind: "adds_back", label: "Check: shares sum to the total", body: "$\\$8 + \\$12 = \\$20$ ✓ — the parts rebuild the whole." }
    ],
    commonMistakes: [
      { label: "Reporting the wrong share", why: "Giving the smaller share when the larger was asked (or vice versa).", fix: "Match the term to the person: the larger share uses the bigger ratio number." },
      { label: "Forgetting to add the terms", why: "Dividing by one term instead of the sum, or giving the whole total.", fix: "One part $=$ total $\\div$ (sum of ALL terms); then scale by each term." }
    ],
    connections: [
      { concept: "ratio_simplify", note: "Simplest form gives the fewest parts to divide into." },
      { concept: "fraction_of", note: "Each share is a fraction (its terms over the sum) of the total." },
      { concept: "ratio_solve", note: "Both rest on equal parts; sharing distributes a known total across them." }
    ],
    examples: [
      { question: "Share $\\$35$ in the ratio $3 : 4$. What is the larger share?", answer: "20", explanation: "$3 + 4 = 7$ parts; $\\$35 \\div 7 = \\$5$; larger $= 4 \\times \\$5 = \\$20$." },
      { question: "Share $\\$24$ in the ratio $1 : 2$. What is the larger share?", answer: "16", explanation: "$3$ parts of $\\$8$; larger $= 2 \\times \\$8 = \\$16$." }
    ]
  },

  unit_price: {
    title: "Unit Price",
    formula: "\\text{unit price} = \\frac{\\text{total cost}}{\\text{number of items}}",
    oneLineSummary: "Divide the total cost by the number of items to get the price of one — the key to comparing 'which is the better buy'.",
    intuitionHook: "Six notebooks for $\\$4.80$ sounds different from $\\$0.80$ each, but they're the same deal seen two ways. Dividing the total by how many you get collapses any package size down to one comparable number: the cost of a single item.",
    whatItIs: "The cost of a single item, found by dividing the total price by the quantity. It turns differently-sized packages into a fair, head-to-head comparison.",
    whyItWorks: "Price scales with quantity, so a total bundles together many items' costs; dividing by the count spreads that total evenly back over each item — the definition of 'per one'. Because every option is reduced to the SAME unit (one item), their unit prices are directly comparable, which is the whole point: the smaller unit price is the better buy regardless of package size. The classic slip is reporting the total (that's all the items) or the count (that's how many, not how much each).",
    whenToUse: "Comparing deals at the store (the 'better buy'), reading per-unit pricing, and any 'cost per one' question — the everyday face of unit rates.",
    representations: [
      { kind: "divide_down", label: "Total over count", body: "$\\$4.80$ for $6$: $\\$4.80 \\div 6 = \\$0.80$ each." },
      { kind: "compare", label: "Same unit, fair race", body: "Reduce every package to price-per-item, then the smallest wins." },
      { kind: "scale_back_up", label: "Check by multiplying", body: "$\\$0.80 \\times 6 = \\$4.80$ ✓ — one item's price rebuilds the total." }
    ],
    commonMistakes: [
      { label: "Reporting the total", why: "Giving the whole price instead of the per-item cost.", fix: "Divide the total by the number of items — the question asks for ONE." },
      { label: "Dividing the wrong way", why: "Computing items $\\div$ cost, which gives items-per-dollar, not dollars-per-item.", fix: "Unit PRICE is dollars per item: cost on top, count on the bottom." }
    ],
    connections: [
      { concept: "unit_rate", note: "Unit price is a unit rate measured in dollars per item." },
      { concept: "speed_dist_time", note: "Same 'per one' division — there it's miles per hour, here dollars per item." },
      { concept: "ratio_solve", note: "Comparing unit prices is comparing two rates." }
    ],
    examples: [
      { question: "5 pens cost $\\$15$. What is the price of one pen?", answer: "3", explanation: "$\\$15 \\div 5 = \\$3$ per pen." },
      { question: "4 apples cost $\\$12$. What is the price of one apple?", answer: "3", explanation: "$\\$12 \\div 4 = \\$3$ each." }
    ]
  },

  speed_dist_time: {
    title: "Speed, Distance & Time",
    formula: "\\text{speed} = \\frac{\\text{distance}}{\\text{time}}",
    oneLineSummary: "Speed is distance divided by time — how far you cover in one unit of time.",
    intuitionHook: "Drive $150$ miles in $3$ hours and you average $50$ miles every hour. Dividing the whole trip by the hours it took spreads the distance evenly across the clock — that even pace is the speed.",
    whatItIs: "The rate of travel: distance covered per unit of time, found by dividing distance by time. The same triangle relationship also gives distance ($= $ speed $\\times$ time) and time ($= $ distance $\\div$ speed).",
    whyItWorks: "Speed answers 'how far per one hour?', and 'per one' always means divide: split the total distance across the total time and you get the distance for a single hour. The three quantities form one relationship — $d = s \\times t$ — so knowing any two gives the third by rearranging. The errors come from reporting a raw quantity instead of the rate: the distance alone says how far (not how fast), and the time alone says how long. Only the division produces a speed, and its units (miles per hour) name the operation.",
    whenToUse: "Trip planning, comparing how fast things move, physics rate problems, and any of the three when you know the other two.",
    representations: [
      { kind: "per_hour", label: "Distance per one hour", body: "$150$ miles in $3$ hours: $150 \\div 3 = 50$ mph." },
      { kind: "triangle", label: "One relationship, three forms", body: "$d = s \\cdot t$, $s = d / t$, $t = d / s$ — cover the unknown to see the formula." },
      { kind: "units_name_it", label: "Units tell you to divide", body: "'Miles per hour' literally means miles $\\div$ hours." }
    ],
    commonMistakes: [
      { label: "Reporting the distance", why: "Answering with the miles travelled when asked for the speed.", fix: "Speed is distance PER hour: divide the distance by the time." },
      { label: "Dividing time by distance", why: "Computing time $\\div$ distance, which gives hours-per-mile.", fix: "For miles per hour, distance goes on top: $s = d / t$." }
    ],
    connections: [
      { concept: "unit_rate", note: "Speed is a unit rate: distance per one unit of time." },
      { concept: "unit_price", note: "Same 'per one' division, with miles and hours instead of dollars and items." },
      { concept: "proportion_solve", note: "Steady speed means distance and time stay in proportion." }
    ],
    examples: [
      { question: "A train travels $240$ miles in $4$ hours. What is its average speed in mph?", answer: "60", explanation: "$240 \\div 4 = 60$ mph." },
      { question: "A runner covers $20$ km in $2$ hours. What is the average speed in km/h?", answer: "10", explanation: "$20 \\div 2 = 10$ km/h." }
    ]
  },

  scale_factor: {
    title: "Scale Drawings",
    formula: "\\text{actual} = \\text{drawing measurement} \\times \\text{scale}",
    oneLineSummary: "A scale tells you how many real units each drawing unit stands for, so multiply the map measurement by the scale to get the real distance.",
    intuitionHook: "On a map where $1$ cm means $50$ km, two cities $4$ cm apart are really $200$ km apart. Each centimetre is a stand-in for $50$ real kilometres, so four of them carry $4 \\times 50$ kilometres of real ground.",
    whatItIs: "Using a scale (like $1\\text{ cm} : 50\\text{ km}$) to convert between a drawing and reality. To find the real distance, multiply the drawing measurement by the scale; to go the other way, divide.",
    whyItWorks: "A scale is a fixed rate: every single drawing-unit represents the same number of real units. So a drawing length of $m$ units stands for $m$ copies of that rate — $m \\times (\\text{real per drawing unit})$ — which is why you MULTIPLY to enlarge a map distance up to reality. Adding the scale to the measurement makes no sense dimensionally (it mixes centimetres with kilometres); the relationship is proportional, not additive. Going from real back to the drawing reverses it: divide by the scale.",
    whenToUse: "Maps, blueprints, models, and floor plans — anywhere a small drawing represents something larger (or a model represents something tiny).",
    representations: [
      { kind: "each_unit", label: "Each unit stands for the scale", body: "$1$ cm $= 50$ km, so $4$ cm $= 4 \\times 50 = 200$ km." },
      { kind: "multiply_up", label: "Drawing → real: multiply", body: "Map measurement $\\times$ scale $=$ real distance." },
      { kind: "divide_back", label: "Real → drawing: divide", body: "Real distance $\\div$ scale $=$ how long to draw it." }
    ],
    commonMistakes: [
      { label: "Adding instead of multiplying", why: "Computing $4 + 50$ — that mixes centimetres and kilometres.", fix: "A scale is a multiplier: real $=$ measurement $\\times$ scale, so $4 \\times 50 = 200$." },
      { label: "Reporting the scale", why: "Giving the per-unit value ($50$) instead of the actual distance.", fix: "Multiply by how many units there are: $4 \\times 50 = 200$ km." }
    ],
    connections: [
      { concept: "proportion_solve", note: "A scale is a proportion between drawing units and real units." },
      { concept: "coord_dilate", note: "Both scale by a fixed factor; a dilation does it to coordinates." },
      { concept: "unit_convert_metric", note: "Scale conversion is a units-style multiply by a fixed rate." }
    ],
    examples: [
      { question: "A map scale is $1$ cm : $20$ km. A road is $5$ cm long on the map. How long is it in reality?", answer: "100", explanation: "$5 \\times 20 = 100$ km." },
      { question: "A model uses $1$ cm : $8$ m. A wall is $3$ cm in the model. How tall is the real wall?", answer: "24", explanation: "$3 \\times 8 = 24$ m." }
    ]
  },

  // ===========================================================================
  // FACTORS & MULTIPLES STRAND — middle-school number theory (4.OA / 6.NS).
  // ===========================================================================
  prime_factorization: {
    title: "Prime Factorization",
    formula: "N = p_1^{a_1} \\times p_2^{a_2} \\times \\cdots \\quad (\\text{all } p_i \\text{ prime})",
    oneLineSummary: "Break a number into a product of prime numbers only — the unique 'atomic' recipe every whole number has.",
    intuitionHook: "Think of a number as a molecule and primes as its atoms. $12$ splits into $4 \\times 3$, but $4$ isn't an atom — keep splitting: $2 \\times 2 \\times 3$. Now nothing breaks further. Every number has exactly ONE such atomic recipe.",
    whatItIs: "Writing a whole number as a product of prime numbers (often using exponents for repeats), continuing until no factor can be broken down any more.",
    whyItWorks: "A prime is a number with no factors but $1$ and itself, so it can't be split — primes are the indivisible building blocks. Any composite number can be broken into two smaller factors; repeat on each piece and you must eventually hit primes (the pieces only get smaller). The Fundamental Theorem of Arithmetic guarantees the result is UNIQUE no matter how you start splitting — $12$ is always $2^2 \\times 3$ whether you begin with $4 \\times 3$ or $2 \\times 6$. That uniqueness is exactly why prime factorization powers GCF, LCM, and fraction simplifying: it exposes the shared atoms. The trap is stopping early — leaving a composite like $4$ or $6$ in the answer.",
    whenToUse: "Finding GCF and LCM, simplifying fractions, identifying perfect squares, and any problem about the divisor structure of a number.",
    representations: [
      { kind: "factor_tree", label: "Split until prime", body: "$12 \\to 4 \\times 3 \\to (2 \\times 2) \\times 3 = 2^2 \\times 3$. Branches end only on primes." },
      { kind: "exponents", label: "Group the repeats", body: "$2 \\times 2 \\times 3 = 2^2 \\times 3$ — exponents tally how many of each prime." },
      { kind: "unique", label: "One recipe per number", body: "Any starting split of $12$ lands on the same $2^2 \\times 3$." }
    ],
    commonMistakes: [
      { label: "Leaving composite factors", why: "Writing $4 \\times 3$ for $12$ — but $4 = 2 \\times 2$ isn't prime.", fix: "Keep splitting every composite until ALL factors are prime: $2^2 \\times 3$." },
      { label: "Stopping too early", why: "Giving $2 \\times 6$ and calling it done — $6$ still factors.", fix: "A factorization is complete only when no factor can break down further." }
    ],
    connections: [
      { concept: "find_gcf", note: "GCF is the product of the primes two numbers share." },
      { concept: "find_lcm", note: "LCM is built from the highest power of every prime that appears." },
      { concept: "fraction_simplify", note: "Cancelling shared prime factors is how fractions reduce." }
    ],
    examples: [
      { question: "Write $30$ as a product of primes.", answer: "2 × 3 × 5", explanation: "$30 = 2 \\times 15 = 2 \\times 3 \\times 5$ — all prime." },
      { question: "Write $40$ as a product of primes.", answer: "2^3 × 5", explanation: "$40 = 8 \\times 5 = 2^3 \\times 5$." }
    ]
  },

  find_gcf: {
    title: "Greatest Common Factor",
    formula: "\\gcd(a, b) = \\text{product of the prime factors } a \\text{ and } b \\text{ share}",
    oneLineSummary: "The greatest common factor is the largest number that divides both — the shared part of their prime recipes.",
    intuitionHook: "$12 = 2 \\times 2 \\times 3$ and $18 = 2 \\times 3 \\times 3$. What do they have in common? One $2$ and one $3$ — multiply those shared atoms: $6$. That's the biggest number dividing both.",
    whatItIs: "The greatest common factor (GCF) of two numbers is the largest whole number that divides each of them exactly. It is the product of the prime factors they have in common.",
    whyItWorks: "A common factor must be built only from primes that BOTH numbers contain, and only as many of each as both can supply. So line up the prime factorizations and take the overlap: for $12 = 2^2 \\times 3$ and $18 = 2 \\times 3^2$, both supply one $2$ and one $3$, giving $2 \\times 3 = 6$. Taking the highest shared powers makes it the GREATEST such factor. The classic confusion is with the LCM — the GCF is a FACTOR (it divides the numbers, so it's $\\le$ the smaller one), while the LCM is a MULTIPLE (the numbers divide it, so it's $\\ge$ the larger).",
    whenToUse: "Simplifying fractions to lowest terms, splitting two quantities into the largest equal groups, and reducing ratios.",
    representations: [
      { kind: "shared_primes", label: "Overlap of the recipes", body: "$12 = 2^2\\cdot3$, $18 = 2\\cdot3^2$: shared is $2\\cdot3 = 6$." },
      { kind: "divides_both", label: "Largest that divides both", body: "$6$ divides $12$ and $18$; nothing bigger does." },
      { kind: "vs_lcm", label: "Factor, not multiple", body: "GCF $\\le$ the smaller number; the LCM is $\\ge$ the larger — opposite directions." }
    ],
    commonMistakes: [
      { label: "Giving the LCM instead", why: "Reporting the smallest common multiple when asked for the greatest common factor.", fix: "GCF DIVIDES the numbers (it's small); LCM is a MULTIPLE (it's big). Match the word to the size." },
      { label: "Reporting one of the numbers", why: "Choosing $12$ or $18$ — but those aren't factors of EACH other.", fix: "The GCF must divide BOTH; check it goes evenly into each." }
    ],
    connections: [
      { concept: "prime_factorization", note: "The GCF is the product of the shared prime factors." },
      { concept: "fraction_simplify", note: "Dividing numerator and denominator by their GCF gives lowest terms in one step." },
      { concept: "find_lcm", note: "GCF and LCM are partners: gcd × lcm = the product of the two numbers." }
    ],
    examples: [
      { question: "Find the GCF of $24$ and $36$.", answer: "12", explanation: "$24 = 2^3\\cdot3$, $36 = 2^2\\cdot3^2$; shared $2^2\\cdot3 = 12$." },
      { question: "Find the GCF of $15$ and $20$.", answer: "5", explanation: "Both share a single factor of $5$." }
    ]
  },

  find_lcm: {
    title: "Least Common Multiple",
    formula: "\\text{lcm}(a, b) = \\frac{a \\times b}{\\gcd(a, b)}",
    oneLineSummary: "The least common multiple is the smallest number both divide into — take the highest power of every prime that appears.",
    intuitionHook: "Multiples of $4$: $4, 8, 12, \\ldots$; of $6$: $6, 12, 18, \\ldots$. The first one in BOTH lists is $12$. That's the least common multiple — the earliest meeting point of the two counting patterns.",
    whatItIs: "The least common multiple (LCM) of two numbers is the smallest whole number that both divide into evenly. It uses the highest power of each prime found in either number.",
    whyItWorks: "A common multiple must contain enough of every prime to be divisible by BOTH numbers, so for each prime you take the higher of the two powers: $4 = 2^2$ and $6 = 2\\cdot3$ need $2^2$ (for the $4$) and $3$ (for the $6$), giving $2^2\\cdot3 = 12$. Taking only the highest powers — no more — makes it the LEAST such multiple. A handy shortcut: since the GCF holds the shared factors, multiplying $a \\times b$ double-counts them, so $\\text{lcm} = \\frac{a\\times b}{\\gcd}$ removes the duplication. Multiplying $a\\times b$ alone gives A common multiple, just not the smallest.",
    whenToUse: "Adding fractions (the common denominator is the LCM), and timing problems where two repeating events line up.",
    representations: [
      { kind: "highest_powers", label: "Highest power of each prime", body: "$4 = 2^2$, $6 = 2\\cdot3 \\Rightarrow 2^2\\cdot3 = 12$." },
      { kind: "first_shared", label: "First common multiple", body: "$4,8,\\mathbf{12}$ and $6,\\mathbf{12}$ meet first at $12$." },
      { kind: "via_gcf", label: "Product over GCF", body: "$\\frac{4\\times6}{\\gcd(4,6)=2} = \\frac{24}{2} = 12$." }
    ],
    commonMistakes: [
      { label: "Multiplying without reducing", why: "Giving $a\\times b$ — that's a common multiple but usually not the least.", fix: "Divide the product by the GCF (or take highest prime powers): $\\frac{a\\times b}{\\gcd}$." },
      { label: "Giving the GCF instead", why: "Reporting the shared factor when the smallest multiple was asked.", fix: "LCM is a MULTIPLE (large); the GCF is a FACTOR (small). Don't swap them." }
    ],
    connections: [
      { concept: "prime_factorization", note: "The LCM takes the highest power of every prime that appears." },
      { concept: "find_gcf", note: "Partner identity: gcd × lcm = a × b." },
      { concept: "fraction_add", note: "The least common denominator is the LCM of the denominators." }
    ],
    examples: [
      { question: "Find the LCM of $4$ and $6$.", answer: "12", explanation: "$\\frac{4\\times6}{\\gcd=2} = 12$, the first shared multiple." },
      { question: "Find the LCM of $6$ and $9$.", answer: "18", explanation: "$6 = 2\\cdot3$, $9 = 3^2 \\Rightarrow 2\\cdot3^2 = 18$." }
    ]
  },

  gcf_word: {
    title: "GCF Word Problems",
    formula: "\\text{largest equal groups using all items} = \\gcd(\\text{the quantities})",
    oneLineSummary: "When you split two amounts into the largest identical groups with nothing left over, the number of groups is their GCF.",
    intuitionHook: "You have $12$ apples and $18$ oranges and want identical fruit baskets using every piece. The most baskets you can make is $6$ — the GCF — each holding $2$ apples and $3$ oranges. Push for $7$ baskets and the fruit won't divide evenly.",
    whatItIs: "A real-world problem that hides a GCF: dividing two (or more) quantities into the greatest number of equal groups, with each quantity used up completely.",
    whyItWorks: "Each group must contain a whole number of EACH item with none left over, so the number of groups has to divide both quantities exactly — it's a common factor. Wanting the GREATEST number of groups means the greatest common factor. Recognizing the signal is the real skill: 'largest/greatest', 'equal groups', 'no leftovers', 'split/share into identical' all point to GCF. (Contrast the LCM signals — 'next time both', 'smallest amount that works for both'.) Reporting the total amount answers 'how many items', not 'how many groups'.",
    whenToUse: "'Greatest number of identical groups/teams/bags', cutting two lengths into the longest equal pieces, and arranging two sets into equal rows.",
    representations: [
      { kind: "equal_groups", label: "Groups divide both", body: "$12$ and $18$ into equal baskets: the count must divide both → a common factor." },
      { kind: "greatest", label: "Most groups = GCF", body: "Greatest such count is $\\gcd(12,18) = 6$." },
      { kind: "signal_words", label: "Spot the GCF cue", body: "'largest', 'equal groups', 'no leftovers' ⇒ GCF (not LCM)." }
    ],
    commonMistakes: [
      { label: "Using the LCM", why: "Reaching for the LCM because the problem mentions both quantities.", fix: "'Largest equal groups from a fixed supply' is GCF; LCM is for 'when do they next coincide'." },
      { label: "Reporting the total", why: "Adding the quantities and giving that.", fix: "The question asks for the number of GROUPS — the GCF — not the total items." }
    ],
    connections: [
      { concept: "find_gcf", note: "The computation under the story is exactly the GCF." },
      { concept: "lcm_word", note: "Its mirror: equal-groups ⇒ GCF, coinciding-events ⇒ LCM." },
      { concept: "fraction_simplify", note: "Both reduce by the largest shared factor." }
    ],
    examples: [
      { question: "$16$ pencils and $24$ erasers go into identical packs using everything. Greatest number of packs?", answer: "8", explanation: "$\\gcd(16,24) = 8$ packs (2 pencils, 3 erasers each)." },
      { question: "Greatest number of identical bags from $18$ red and $30$ blue marbles?", answer: "6", explanation: "$\\gcd(18,30) = 6$." }
    ]
  },

  lcm_word: {
    title: "LCM Word Problems",
    formula: "\\text{next time two cycles coincide} = \\text{lcm}(\\text{the cycle lengths})",
    oneLineSummary: "When two repeating events start together, they next coincide after the least common multiple of their intervals.",
    intuitionHook: "One bus comes every $4$ minutes, another every $6$. Leaving together now, when do they next leave together? List the times — $4,8,12$ and $6,12$ — they realign at $12$ minutes, the LCM. The cycles only sync at a shared multiple.",
    whatItIs: "A real-world problem that hides an LCM: two (or more) repeating cycles that begin together and you want the next moment (or smallest amount) where they line up again.",
    whyItWorks: "Event A recurs at multiples of its interval; event B at multiples of its. They coincide exactly at the numbers in BOTH lists — common multiples — and the NEXT coincidence is the smallest of those, the LCM. The signal words are the skill: 'next time both', 'again at the same time', 'smallest number that works for both', 'least amount' all point to LCM. (Contrast GCF cues — 'largest groups', 'split a fixed supply'.) Multiplying the intervals gives A coincidence time but usually not the soonest; adding them isn't a multiple of either.",
    whenToUse: "'When will both happen together again', synchronizing repeating schedules, and the least quantity that packages evenly two different ways.",
    representations: [
      { kind: "two_cycles", label: "Lists overlap at multiples", body: "$4,8,\\mathbf{12}$ and $6,\\mathbf{12}$ first realign at $12$." },
      { kind: "least", label: "Soonest = LCM", body: "Next coincidence is $\\text{lcm}(4,6) = 12$ minutes." },
      { kind: "signal_words", label: "Spot the LCM cue", body: "'next time both', 'again together', 'smallest for both' ⇒ LCM (not GCF)." }
    ],
    commonMistakes: [
      { label: "Multiplying the intervals", why: "Giving $4 \\times 6 = 24$ — a coincidence time, but not the first.", fix: "Take the LEAST common multiple, $12$; multiplying overshoots when the intervals share a factor." },
      { label: "Adding the intervals", why: "Reporting $4 + 6 = 10$, which isn't a multiple of either.", fix: "Coincidences happen at common MULTIPLES — use the LCM, not the sum." }
    ],
    connections: [
      { concept: "find_lcm", note: "The computation under the story is exactly the LCM." },
      { concept: "gcf_word", note: "Its mirror: coinciding-events ⇒ LCM, equal-groups ⇒ GCF." },
      { concept: "fraction_add", note: "Finding a common denominator is the same 'least common multiple' move." }
    ],
    examples: [
      { question: "Lights flash every $6$ s and $8$ s, together now. Next together in how many seconds?", answer: "24", explanation: "$\\text{lcm}(6,8) = 24$ seconds." },
      { question: "Two timers ring every $5$ and $10$ minutes, starting together. Next shared ring?", answer: "10", explanation: "$\\text{lcm}(5,10) = 10$ minutes." }
    ]
  },

  // ===========================================================================
  // STATISTICS II — measures of spread (quartiles, IQR, mean absolute deviation).
  // ===========================================================================
  stat_quartile: {
    title: "Quartiles",
    formula: "\\text{Q1} = \\text{median of the lower half}, \\quad \\text{Q3} = \\text{median of the upper half}",
    oneLineSummary: "Quartiles cut sorted data into four equal-sized groups — Q1 is the median of the lower half, Q3 the median of the upper half.",
    intuitionHook: "Line up a class by height and split them into four equal queues. The cut between the first and second queue is Q1: a quarter of the class is shorter than it. Q1 isn't the shortest kid — it's the 'typical shorty', the middle of the bottom half.",
    whatItIs: "Quartiles are three values (Q1, the median Q2, and Q3) that divide an ordered data set into four parts each holding about a quarter of the values. Finding a quartile means taking the median of one half of the data.",
    whyItWorks: "The median already splits sorted data into a lower and an upper half. Quartiles just repeat that move INSIDE each half: Q1 is the median of everything below the overall median, Q3 the median of everything above it. So quartiles inherit the median's resistance to extreme values — a single huge outlier barely moves them, because they depend on POSITION (which value sits in the middle of a half), not on the actual sizes of the far-out numbers. The data MUST be sorted first; quartiles are defined by order, and an unsorted list gives meaningless 'middles'.",
    whenToUse: "Describing the shape of a distribution, building box plots, comparing two data sets' spreads fairly, and spotting outliers (which sit far beyond Q1 and Q3).",
    representations: [
      { kind: "four_groups", label: "Cut into quarters", body: "Seven sorted values: the $4$th is the median; Q1 is the middle of the first three, Q3 the middle of the last three." },
      { kind: "median_of_a_half", label: "Median, recursed", body: "Q1 is just 'the median' applied to the lower half — the same skill, one level down." },
      { kind: "not_the_extremes", label: "Not the smallest", body: "Q1 is a typical low value, not the minimum; about $25\\%$ of the data lies below it." }
    ],
    commonMistakes: [
      { label: "Reporting the overall median", why: "Giving Q2 (the center of ALL the data) when asked for Q1.", fix: "Q1 lives in the lower half only. First find the median, then take the median of the values below it." },
      { label: "Reporting the minimum", why: "Confusing 'lower quartile' with 'lowest value'.", fix: "Q1 is the MIDDLE of the lower half, not its smallest member — about a quarter of the data sits beneath it." }
    ],
    connections: [
      { concept: "stat_median", note: "A quartile is a median taken on half the data — same procedure, smaller set." },
      { concept: "stat_iqr", note: "Q3 − Q1 is the interquartile range, the next concept's whole subject." },
      { concept: "stat_range", note: "Range uses the extremes; quartiles use positions and so ignore wild outliers." }
    ],
    examples: [
      { question: "Find Q1 of $2, 4, 5, 8, 10, 12, 15$.", answer: "4", explanation: "The median is the 4th value, $8$. The lower half is $2, 4, 5$; its median is $4$." },
      { question: "Find Q3 of $1, 3, 4, 6, 9, 10, 14$.", answer: "10", explanation: "Median is $6$; the upper half is $9, 10, 14$, whose median is $10$." }
    ]
  },

  stat_iqr: {
    title: "Interquartile Range",
    formula: "\\text{IQR} = \\text{Q3} - \\text{Q1}",
    oneLineSummary: "The interquartile range is Q3 minus Q1 — the width of the middle 50% of the data, a spread measure that ignores outliers.",
    intuitionHook: "Forget the tallest and shortest kids — how spread out is the 'middle bunch'? The IQR answers exactly that: the distance from the typical-short (Q1) to the typical-tall (Q3). One freakishly tall newcomer doesn't change it at all, because they're outside the middle half.",
    whatItIs: "A measure of variability equal to the gap between the third and first quartiles. It captures how wide the central half of the data is, deliberately excluding the top and bottom quarters.",
    whyItWorks: "Range (max − min) is hostage to its two most extreme values — one outlier can blow it up and misrepresent a tight data set. The IQR fixes this by chopping off the outer quarters and measuring only what's left: Q1 and Q3 are positional, so the subtraction $Q3 - Q1$ reports the spread of the robust middle. That's why statisticians use the IQR to DEFINE outliers (points more than $1.5 \\times \\text{IQR}$ beyond a quartile) — it's a yardstick the outliers themselves can't distort.",
    whenToUse: "Comparing spreads when data may contain outliers, drawing the box of a box plot (its length is the IQR), and flagging anomalies.",
    representations: [
      { kind: "middle_half", label: "Width of the center", body: "If Q1 $= 4$ and Q3 $= 11$, the middle $50\\%$ spans $11 - 4 = 7$." },
      { kind: "vs_range", label: "Robust vs fragile", body: "Range uses min and max (outlier-sensitive); IQR uses Q1 and Q3 (outlier-resistant)." },
      { kind: "box_length", label: "The box in a box plot", body: "On a box plot the box stretches from Q1 to Q3 — its length IS the IQR." }
    ],
    commonMistakes: [
      { label: "Using the full range", why: "Computing max − min instead of Q3 − Q1.", fix: "The IQR is built from QUARTILES, not extremes: subtract Q1 from Q3, leaving the outer quarters out." },
      { label: "Reporting a single quartile", why: "Giving Q3 (or Q1) and stopping, forgetting it's a difference.", fix: "IQR is a gap: you need both quartiles, then subtract — $\\text{Q3} - \\text{Q1}$." }
    ],
    connections: [
      { concept: "stat_quartile", note: "You must find Q1 and Q3 first; the IQR is their difference." },
      { concept: "stat_range", note: "Range is the extremes' spread; IQR is the middle's spread — robust where range is fragile." },
      { concept: "stat_mad", note: "Both summarize variability; MAD averages distances, IQR measures the central band." }
    ],
    examples: [
      { question: "Find the IQR of $2, 4, 5, 8, 10, 12, 15$.", answer: "8", explanation: "Q1 $= 4$, Q3 $= 12$ (medians of the halves), so IQR $= 12 - 4 = 8$." },
      { question: "A data set has Q1 $= 6$ and Q3 $= 13$. What is the IQR?", answer: "7", explanation: "$\\text{Q3} - \\text{Q1} = 13 - 6 = 7$." }
    ]
  },

  stat_mad: {
    title: "Mean Absolute Deviation",
    formula: "\\text{MAD} = \\dfrac{\\sum |x_i - \\bar{x}|}{n}",
    oneLineSummary: "The mean absolute deviation is the average distance of the data from its mean — a single number for 'how spread out' the values are.",
    intuitionHook: "Five friends stand at different points on a road; the mean is their meeting spot. On average, how far must each walk to get there? That average walking distance IS the MAD — a typical gap between a value and the center.",
    whatItIs: "A measure of variability: compute the mean, find how far each value is from it (always a positive distance), then average those distances. Small MAD means tightly clustered data; large MAD means widely scattered.",
    whyItWorks: "We want one number for 'typical distance from center'. The raw deviations $x_i - \\bar{x}$ can't just be averaged — they always sum to zero (the positives and negatives cancel, which is what makes the mean the balance point). Taking the ABSOLUTE value first removes the cancellation, so every distance counts as a real, positive gap. Averaging those gaps gives the typical spread in the data's own units. Two steps are essential and often skipped: take absolute values (or everything cancels) AND divide by the count (or you report a total, not an average).",
    whenToUse: "Reporting consistency (test scores, manufacturing tolerances, daily temperatures), comparing how reliable two processes are, and introducing variability before standard deviation.",
    representations: [
      { kind: "average_distance", label: "Mean of the gaps", body: "Mean $= 20$; values $14, 18, 22, 26$ sit $6, 2, 2, 6$ away; average $= \\frac{16}{4} = 4$." },
      { kind: "why_absolute", label: "Why absolute value", body: "Signed deviations sum to $0$ by definition — absolute values stop the cancellation so distances add up." },
      { kind: "spread_meter", label: "Tight vs scattered", body: "A small MAD means values hug the mean; a large MAD means they sprawl far from it." }
    ],
    commonMistakes: [
      { label: "Forgetting to divide", why: "Adding up the distances and reporting the total instead of the average.", fix: "MAD is a MEAN of distances: after summing $|x_i - \\bar{x}|$, divide by the number of values." },
      { label: "Reporting the mean instead", why: "Confusing the center (mean) with the spread (MAD).", fix: "The mean is where the data centers; the MAD is how far, on average, it strays from there — a different question." }
    ],
    connections: [
      { concept: "stat_mean", note: "MAD is built on the mean — you must find the center before measuring distance from it." },
      { concept: "stat_iqr", note: "Both quantify spread; MAD uses every point, IQR uses the quartiles." },
      { concept: "absolute_value", note: "Absolute value turns each deviation into a positive distance so they don't cancel." }
    ],
    examples: [
      { question: "Find the MAD of $14, 18, 22, 26$.", answer: "4", explanation: "Mean $= 20$. Distances $6, 2, 2, 6$ sum to $16$; $16 \\div 4 = 4$." },
      { question: "Find the MAD of $3, 5, 7, 9$.", answer: "2", explanation: "Mean $= 6$. Distances $3, 1, 1, 3$ sum to $8$; $8 \\div 4 = 2$." }
    ]
  },

  // ===========================================================================
  // STATISTICS III — probability foundations (7.SP.C): theoretical probability,
  // experimental probability, and the counting principle / sample space.
  // ===========================================================================
  stat_theoretical_prob: {
    title: "Theoretical Probability",
    formula: "P(\\text{event}) = \\dfrac{\\text{favorable outcomes}}{\\text{total equally likely outcomes}}",
    oneLineSummary: "Theoretical probability is the fraction of equally likely outcomes that count as a success — favorable over total, then reduced.",
    intuitionHook: "Before you ever spin the wheel, you can name your chances. A spinner with $8$ equal slices, $2$ of them gold, is gold $\\frac{2}{8} = \\frac{1}{4}$ of the time — a quarter of the wheel is gold, so a quarter of your spins should be. You're not guessing from data; you're counting the wheel itself.",
    whatItIs: "Theoretical probability is the chance of an event computed by reasoning about the outcomes, not by experimenting. When every outcome is equally likely, it equals the number of favorable outcomes divided by the total number of outcomes, written as a fraction in simplest form (or an equivalent decimal or percent).",
    whyItWorks: "If a situation has outcomes that are all equally likely — a fair spinner's slices, a fair die's faces, marbles drawn blind — then 'how likely' is just 'what share'. Each outcome carries the same slice of certainty, and the total certainty is $1$ shared equally among $n$ outcomes, so each is worth $\\frac{1}{n}$. An event made of $f$ of those outcomes therefore carries $\\frac{f}{n}$. The 'equally likely' condition is everything: it's what lets you count instead of measure. We reduce the fraction because $\\frac{2}{8}$ and $\\frac{1}{4}$ name the same chance, and simplest form is the standard way to state it. The trap is the flip side — favorable over total, never total over favorable: probability is a part OF the whole, so it can never exceed $1$.",
    whenToUse: "Fair games of chance (dice, cards, spinners, coins), genetics squares, any 'what are the chances' question where the outcomes are symmetric and you can count them, and as the prediction that experimental probability is compared against.",
    representations: [
      { kind: "part_of_whole", label: "Favorable over total", body: "$8$ slices, $2$ gold $\\Rightarrow P(\\text{gold}) = \\frac{2}{8} = \\frac{1}{4}$ — count the wins, divide by the total." },
      { kind: "area", label: "Share of the wheel", body: "A quarter of the spinner's area is gold, so a quarter of spins land gold: probability IS the share." },
      { kind: "scale", label: "From $0$ to $1$", body: "Impossible $= 0$, certain $= 1$. A probability is always a part of the whole, so it stays between them — never above $1$." }
    ],
    commonMistakes: [
      { label: "Leaving it unreduced", why: "Writing $\\frac{2}{8}$ when the question asks for simplest form.", fix: "Divide the numerator and denominator by their GCF: $\\frac{2}{8} = \\frac{1}{4}$. Same chance, standard form." },
      { label: "Giving the complement", why: "Reporting the chance the event does NOT happen — counting the losing outcomes.", fix: "Favorable means the outcomes you WANT. Count those over the total, not the rest." },
      { label: "Flipping the fraction", why: "Writing total over favorable, e.g. $\\frac{8}{2}$, which exceeds $1$.", fix: "Probability is a part of the whole: favorable goes on TOP. If your answer is more than $1$, you flipped it." }
    ],
    connections: [
      { concept: "stat_probability", note: "The basic 'favorable out of total' idea — here expressed as a reduced fraction." },
      { concept: "fraction_simplify", note: "Stating a probability in simplest form is exactly fraction reduction." },
      { concept: "stat_experimental_prob", note: "Theoretical is the prediction; experimental is what the data actually shows — the next concept compares them." }
    ],
    examples: [
      { question: "A bag has $3$ red and $9$ marbles total. Find $P(\\text{red})$ in simplest form.", answer: "1/3", explanation: "$\\frac{3}{9} = \\frac{1}{3}$ — favorable over total, reduced." },
      { question: "A fair spinner has $10$ equal sections, $4$ blue. Find $P(\\text{blue})$ in simplest form.", answer: "2/5", explanation: "$\\frac{4}{10} = \\frac{2}{5}$." }
    ]
  },

  stat_experimental_prob: {
    title: "Experimental Probability",
    formula: "P(\\text{event}) \\approx \\dfrac{\\text{times the event happened}}{\\text{total trials}}",
    oneLineSummary: "Experimental probability is what actually happened in the data — successes divided by the number of trials, read off real results rather than predicted.",
    intuitionHook: "Flip a chip $12$ times and it lands heads $9$ of them. You didn't assume a fair $\\frac{1}{2}$ — you watched and counted: heads came up $\\frac{9}{12} = \\frac{3}{4}$ of the time. That fraction, straight from the experiment, is the experimental probability. Maybe the chip is weighted; the data tells you what theory can't.",
    whatItIs: "Experimental (or empirical) probability is the chance of an event estimated from observed results: the number of times the event occurred divided by the total number of trials. It's computed from data, then usually reduced to simplest form.",
    whyItWorks: "Theoretical probability assumes you know the outcomes are equally likely. Often you don't — a bent coin, a real spinner with sticky slices, the chance a free throw goes in. So instead of reasoning, you RUN the trials and count: out of $n$ attempts, the event happened $h$ times, so your best estimate of its probability is $\\frac{h}{n}$. The Law of Large Numbers makes this honest: the more trials you run, the closer the experimental probability tends to settle toward the true (often theoretical) probability. A handful of flips can stray far from $\\frac{1}{2}$; thousands rarely do. That's why 'how many trials' matters — experimental probability is an estimate that sharpens with data.",
    whenToUse: "Estimating chances when outcomes aren't obviously equally likely, testing whether a die or coin is fair (compare experimental to theoretical), sports and quality-control statistics, and simulations.",
    representations: [
      { kind: "tally", label: "Count the results", body: "$12$ flips, $9$ heads $\\Rightarrow \\frac{9}{12} = \\frac{3}{4}$ — read straight off the tally." },
      { kind: "vs_theoretical", label: "Data vs prediction", body: "Theory says a fair chip is $\\frac{1}{2}$; the data says $\\frac{3}{4}$. The gap hints the chip may be biased — or that $12$ flips is too few." },
      { kind: "convergence", label: "More trials, truer estimate", body: "A few trials wander; many trials settle toward the real probability (Law of Large Numbers)." }
    ],
    commonMistakes: [
      { label: "Counting the other outcome", why: "Reporting tails when asked for heads — dividing the failures by the trials.", fix: "Put the count of the event you were ASKED about on top: heads observed over total flips." },
      { label: "Flipping the fraction", why: "Writing trials over successes, e.g. $\\frac{12}{9}$, which exceeds $1$.", fix: "Successes go on top, total trials on the bottom — a probability never exceeds $1$." },
      { label: "Confusing it with theoretical", why: "Answering $\\frac{1}{2}$ for a coin because that's 'the' probability, ignoring the data given.", fix: "Experimental probability comes from the OBSERVED results — use the numbers in the problem, not the fair-coin assumption." }
    ],
    connections: [
      { concept: "stat_theoretical_prob", note: "The prediction this is compared against; with enough trials, experimental drifts toward theoretical." },
      { concept: "fraction_simplify", note: "The result is stated as a reduced fraction, just like theoretical probability." },
      { concept: "stat_probability", note: "Both express 'how often' as favorable-over-total — one from counting outcomes, one from counting results." }
    ],
    examples: [
      { question: "A spinner is spun $9$ times and lands on green $6$ times. Find the experimental probability of green in simplest form.", answer: "2/3", explanation: "$\\frac{6}{9} = \\frac{2}{3}$ — observed greens over total spins." },
      { question: "A die is rolled $15$ times and shows a six $10$ times. Find the experimental probability of a six in simplest form.", answer: "2/3", explanation: "$\\frac{10}{15} = \\frac{2}{3}$ (this die is likely loaded — theory says $\\frac{1}{6}$)." }
    ]
  },

  stat_sample_space: {
    title: "Sample Space and the Counting Principle",
    formula: "\\text{total outcomes} = n_1 \\times n_2 \\times \\cdots \\times n_k",
    oneLineSummary: "When a choice happens in stages, the number of possible combinations is the product of the choices at each stage — you multiply, not add.",
    intuitionHook: "You own $2$ shirts and $3$ pairs of pants. Each shirt can go with any of the $3$ pants, so the first shirt makes $3$ outfits and the second makes $3$ more — $2 \\times 3 = 6$ outfits in all. Add a hat with $4$ options and every one of those $6$ outfits splits into $4$: $6 \\times 4 = 24$. Stages multiply.",
    whatItIs: "The sample space is the set of all possible outcomes of an experiment. The fundamental counting principle says that if one stage has $n_1$ outcomes, the next $n_2$, and so on independently, the total number of combined outcomes is the PRODUCT $n_1 \\times n_2 \\times \\cdots \\times n_k$.",
    whyItWorks: "Picture a tree. The first stage branches into $n_1$ options. From the end of EACH of those branches, the second stage sprouts another $n_2$ branches — so after two stages there are $n_1$ groups of $n_2$, which is $n_1 \\times n_2$ leaves. Every further stage multiplies the leaf count again, because each existing path can be continued in $n_2$ (then $n_3$, …) ways. That's why you multiply, not add: adding would count the choices ($n_1 + n_2$), but you want the COMBINATIONS — every pairing of one choice from each stage. The principle needs the stages to be independent (your shirt doesn't limit your pants); when they interact, you count more carefully. Knowing the size of the sample space is the engine of theoretical probability: it's the denominator, the 'total equally likely outcomes'.",
    whenToUse: "Counting outfit/menu/license-plate combinations, finding the total outcomes for a probability (the denominator), tree diagrams, and any 'how many ways' question with independent stages.",
    representations: [
      { kind: "tree", label: "A branching tree", body: "$2$ shirts each branch to $3$ pants $\\Rightarrow 2 \\times 3 = 6$ leaves. A third stage of $4$ hats makes $6 \\times 4 = 24$." },
      { kind: "grid", label: "Rows times columns", body: "Lay shirts down the side, pants across the top: the grid has $2 \\times 3 = 6$ cells, one per outfit." },
      { kind: "denominator", label: "The total for probability", body: "The sample-space size is the 'total outcomes' you divide by in $P = \\frac{\\text{favorable}}{\\text{total}}$." }
    ],
    commonMistakes: [
      { label: "Adding instead of multiplying", why: "Computing $2 + 3 + 4 = 9$ — that counts individual items, not combinations.", fix: "Each stage multiplies the running total: $2 \\times 3 \\times 4 = 24$. Adding answers 'how many things', not 'how many combinations'." },
      { label: "Forgetting a stage", why: "Multiplying only two of three stages, e.g. $2 \\times 3 = 6$ and stopping.", fix: "Include EVERY independent choice in the product — one factor per stage." }
    ],
    connections: [
      { concept: "stat_theoretical_prob", note: "The counting principle gives the denominator (total outcomes) of a theoretical probability." },
      { concept: "arithmetic_mult", note: "The whole principle is repeated multiplication — one factor per decision stage." },
      { concept: "compound_probability", note: "Multiplying probabilities across independent events mirrors multiplying counts across independent stages." }
    ],
    examples: [
      { question: "A meal is one of $3$ mains, one of $4$ sides, and one of $2$ drinks. How many meals are possible?", answer: "24", explanation: "$3 \\times 4 \\times 2 = 24$ — multiply the stages." },
      { question: "A password is one letter ($5$ choices) followed by one digit ($3$ choices). How many passwords?", answer: "15", explanation: "$5 \\times 3 = 15$ combinations." }
    ]
  },

  // ===========================================================================
  // TRANSFORMATIONS II — rotations and dilations about the origin (8.G.A).
  // ===========================================================================
  coord_rotate_180: {
    title: "Rotating a Point 180°",
    formula: "(x, y) \\to (-x, -y)",
    oneLineSummary: "A 180° turn about the origin sends every point straight through the center to the opposite side, so both coordinates reverse sign.",
    intuitionHook: "Pin a photo to a board through its center and spin it half a turn — top-right ends up bottom-left. The point $(3, 4)$ (right and up) lands at $(-3, -4)$ (left and down). A half-turn is the most symmetric move there is: everything goes to its exact opposite.",
    whatItIs: "A rotation of 180° around the origin: each point travels along the line through itself and the origin, to the equally-distant point on the far side. Numerically, negate both coordinates.",
    whyItWorks: "Every point and the origin define a line; a 180° rotation slides the point to the mirror-position through the origin on that same line, the same distance away. In coordinates, 'opposite side, same distance' is exactly $(x, y) \\to (-x, -y)$ — both signs flip together. This is why it differs from a reflection: a reflection flips only ONE coordinate (over an axis), leaving the other fixed, while a half-turn is two reflections at once and flips BOTH. A 180° rotation is also its own undo — do it twice and you're back home, since negating twice restores the original.",
    whenToUse: "Point symmetry (a figure that looks identical after a half-turn), rotating shapes in graphics, and as the building block that combines a horizontal and a vertical reflection.",
    representations: [
      { kind: "through_origin", label: "Opposite side, same distance", body: "$(3, 4) \\to (-3, -4)$: same distance from the origin, exactly across it." },
      { kind: "two_reflections", label: "Both axes at once", body: "Flip over the x-axis AND the y-axis: $(x, y) \\to (x, -y) \\to (-x, -y)$ — a half-turn." },
      { kind: "self_inverse", label: "Undoes itself", body: "Two half-turns make a full turn: $(-(-x), -(-y)) = (x, y)$, back to start." }
    ],
    commonMistakes: [
      { label: "Flipping only one coordinate", why: "Writing $(-x, y)$ — that's a reflection over the y-axis, not a rotation.", fix: "A half-turn changes BOTH signs: $(x, y) \\to (-x, -y)$. Changing one is a mirror, not a spin." },
      { label: "Swapping the coordinates", why: "Confusing 180° with the 90° rule (which does swap).", fix: "A 180° turn keeps each coordinate in its place and only negates it; swapping belongs to quarter-turns." }
    ],
    connections: [
      { concept: "coord_reflect", note: "A 180° rotation equals a reflection over the x-axis followed by one over the y-axis." },
      { concept: "coord_rotate_90", note: "Two 90° turns make a 180° turn — apply the quarter-turn rule twice." },
      { concept: "integer_mult", note: "Negating a coordinate is multiplying it by -1." }
    ],
    examples: [
      { question: "Rotate $(5, 2)$ by 180° about the origin.", answer: "(-5, -2)", explanation: "Negate both coordinates: $(5, 2) \\to (-5, -2)$." },
      { question: "Rotate $(-3, 7)$ by 180° about the origin.", answer: "(3, -7)", explanation: "Both signs flip: $-3 \\to 3$ and $7 \\to -7$, giving $(3, -7)$." }
    ]
  },

  coord_rotate_90: {
    title: "Rotating a Point 90°",
    formula: "(x, y) \\to (-y, x) \\quad (\\text{90° counterclockwise})",
    oneLineSummary: "A 90° counterclockwise turn about the origin swaps the coordinates and negates the new first one: (x, y) becomes (-y, x).",
    intuitionHook: "Stand facing east and turn a quarter-turn left — now you face north. The point $(4, 1)$, mostly 'east', swings to $(-1, 4)$, mostly 'north'. A quarter-turn trades horizontal for vertical, and the direction of the turn decides which new coordinate picks up a minus sign.",
    whatItIs: "A rotation of 90° counterclockwise around the origin. The horizontal and vertical roles swap, and one coordinate changes sign according to the turn direction: counterclockwise gives $(x, y) \\to (-y, x)$.",
    whyItWorks: "A quarter-turn sends the rightward direction to the upward direction and the upward direction to the leftward direction. So a point's old x-amount (how far right) becomes a new y-amount (how far up), and its old y-amount (how far up) becomes a new x-amount pointing LEFT — hence negative. That's the swap-and-sign $(x, y) \\to (-y, x)$. The sign lives entirely in the direction: counterclockwise negates the new x, clockwise negates the new y ($(x, y) \\to (y, -x)$). Skipping the sign (just swapping to $(y, x)$) is actually a reflection across the diagonal line $y = x$, not a rotation — which is why the sign is the whole difference between a turn and a flip.",
    whenToUse: "Rotating shapes a quarter-turn (screen rotation, tiling, tetromino-style games), building 270° turns (three 90°s), and understanding rotational symmetry of order 4.",
    representations: [
      { kind: "swap_and_sign", label: "Swap, then sign the new x", body: "$(4, 1) \\to$ swap $\\to (1, 4) \\to$ negate first $\\to (-1, 4)$ for counterclockwise." },
      { kind: "direction_matters", label: "Which coordinate gets the minus", body: "Counterclockwise: $(-y, x)$. Clockwise: $(y, -x)$. The turn direction chooses the negative." },
      { kind: "quarter_of_a_turn", label: "Do it four times", body: "Four 90° turns return the point home — each swap-and-sign composes into a full circle." }
    ],
    commonMistakes: [
      { label: "Swapping without the sign", why: "Writing $(y, x)$ — that reflects across the line $y = x$ instead of rotating.", fix: "A rotation needs the sign change too: counterclockwise is $(-y, x)$. Pure swapping is a mirror." },
      { label: "Signing the wrong coordinate", why: "Using $(y, -x)$ for a counterclockwise turn — that's actually the clockwise rule.", fix: "Counterclockwise negates the NEW x: $(x, y) \\to (-y, x)$. Match the sign to the turn direction." }
    ],
    connections: [
      { concept: "coord_rotate_180", note: "Two 90° turns equal a 180° turn — apply (-y, x) twice to get (-x, -y)." },
      { concept: "coord_reflect", note: "Swapping coordinates without a sign change is a reflection over y = x, not a rotation." },
      { concept: "midpoint", note: "Both are coordinate operations on points in the plane; here the operation is a turn." }
    ],
    examples: [
      { question: "Rotate $(4, 1)$ by 90° counterclockwise about the origin.", answer: "(-1, 4)", explanation: "Swap to $(1, 4)$, then negate the new x: $(-1, 4)$." },
      { question: "Rotate $(2, 5)$ by 90° counterclockwise about the origin.", answer: "(-5, 2)", explanation: "$(x, y) \\to (-y, x)$ gives $(-5, 2)$." }
    ]
  },

  coord_dilate: {
    title: "Dilating a Point",
    formula: "(x, y) \\to (kx, ky) \\quad (k = \\text{scale factor, center at origin})",
    oneLineSummary: "A dilation from the origin multiplies both coordinates by the scale factor, moving the point that many times farther out along the same ray.",
    intuitionHook: "Shine a projector from the origin: a slide twice as far away makes an image twice as big. The point $(3, 4)$ dilated by $2$ becomes $(6, 8)$ — same direction from the origin, double the distance. Dilation is the zoom knob of geometry.",
    whatItIs: "A transformation that resizes by a scale factor $k$ from a center point (here the origin). Each coordinate is multiplied by $k$, so the figure keeps its shape (stays similar) while its size changes.",
    whyItWorks: "A point's coordinates ARE its distances along the two axes, so to push the point $k$ times farther from the origin along the same ray you scale each distance by $k$: $(x, y) \\to (kx, ky)$. Both coordinates must scale by the SAME factor — that's what preserves the direction (the ray from the origin) and therefore the shape; scaling only one coordinate stretches the figure and distorts it. With $k > 1$ the point moves outward (enlargement); with $0 < k < 1$ it moves inward (reduction). Crucially, scaling is MULTIPLICATION, not addition: adding $k$ shifts the point a fixed step regardless of how far out it is, which neither preserves direction nor produces similar figures.",
    whenToUse: "Scaling drawings and maps, similar-figure problems, zoom in graphics, and any 'resize about a center' operation.",
    representations: [
      { kind: "same_ray", label: "Farther along the same line", body: "$(3, 4)$ with $k = 2 \\to (6, 8)$: identical direction from the origin, twice as far." },
      { kind: "both_scale", label: "Both coordinates, same factor", body: "Multiply each by $k$: scaling only one ($(6, 4)$) would distort the shape, not resize it." },
      { kind: "enlarge_or_reduce", label: "k decides the size", body: "$k > 1$ enlarges, $0 < k < 1$ shrinks; the shape stays similar either way." }
    ],
    commonMistakes: [
      { label: "Adding the factor instead of multiplying", why: "Writing $(x + k, y + k)$ — that's a translation, a fixed shift, not a resize.", fix: "Dilation MULTIPLIES: $(x, y) \\to (kx, ky)$. Adding moves the point; multiplying scales its distance." },
      { label: "Scaling only one coordinate", why: "Multiplying just x (or just y), e.g. $(kx, y)$.", fix: "Both coordinates scale by the SAME factor, or the shape stretches out of proportion." }
    ],
    connections: [
      { concept: "coord_translate", note: "Translation ADDS a fixed shift; dilation MULTIPLIES — the add-vs-multiply contrast is the core trap." },
      { concept: "integer_mult", note: "Each new coordinate is a multiplication of the old by the scale factor." },
      { concept: "ratio_solve", note: "A dilation is proportional scaling — the scale factor is the ratio of new size to old." }
    ],
    examples: [
      { question: "Dilate $(3, 5)$ by a scale factor of 2 from the origin.", answer: "(6, 10)", explanation: "Multiply both coordinates by 2: $(3 \\cdot 2, 5 \\cdot 2) = (6, 10)$." },
      { question: "Dilate $(4, 6)$ by a scale factor of 3 from the origin.", answer: "(12, 18)", explanation: "$(4 \\cdot 3, 6 \\cdot 3) = (12, 18)$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY VOLUME II — cone, sphere, pyramid (8.G.C.9 / HSG-GMD).
  // ===========================================================================
  geo_volume_cone: {
    title: "Volume of a Cone",
    formula: "V = \\dfrac{1}{3}\\pi r^2 h",
    oneLineSummary: "A cone holds exactly one-third of the cylinder with the same base and height — so V = (1/3)πr²h.",
    intuitionHook: "Fill an ice-cream cone with water and pour it into a can (cylinder) of the same radius and height. It takes exactly THREE conefuls to fill the can. That stubborn factor of 3 is the whole story: a cone is a third of its cylinder.",
    whatItIs: "The volume of a cone: the area of its circular base, times its height, times one-third. It's the cylinder formula with a $\\frac{1}{3}$ attached.",
    whyItWorks: "Start from the cylinder, $\\pi r^2 h$ — a stack of identical circular disks. A cone with the same base and height tapers from the full circle down to a point, so at every level it covers less area than the cylinder. Calculus (or three physical coneful-pours) shows the tapering removes exactly two-thirds of the cylinder's volume, leaving $\\frac{1}{3}$. The radius is still SQUARED because the base is a circle (a 2-D area swept through a height), and the answer is left 'in terms of $\\pi$' to stay exact. Drop the $\\frac{1}{3}$ and you've computed the can, not the cone.",
    whenToUse: "Capacity of cone-shaped containers, funnels, piles of sand or grain, party hats, and any tapering circular solid.",
    representations: [
      { kind: "three_cones", label: "Three cones fill the cylinder", body: "Same base and height: $3 \\times (\\text{cone}) = \\text{cylinder}$, so a cone is $\\frac{1}{3}\\pi r^2 h$." },
      { kind: "from_cylinder", label: "Cylinder, then thirded", body: "$r = 3, h = 6$: cylinder $= \\pi (9)(6) = 54\\pi$; cone $= \\frac{54\\pi}{3} = 18\\pi$." },
      { kind: "square_the_radius", label: "Base is a circle", body: "The $r^2$ comes from the circular base area $\\pi r^2$; forgetting to square it sweeps a line, not a disk." }
    ],
    commonMistakes: [
      { label: "Forgetting the one-third", why: "Computing $\\pi r^2 h$ — that's the whole cylinder, three times too big.", fix: "A cone is a THIRD of its cylinder: multiply by $\\frac{1}{3}$ at the end." },
      { label: "Not squaring the radius", why: "Using $\\pi r h$ instead of $\\pi r^2 h$.", fix: "The base is a circle of area $\\pi r^2$ — the radius is squared before the height multiplies." }
    ],
    connections: [
      { concept: "geo_volume_cylinder", note: "A cone is exactly one-third of the cylinder with the same base and height." },
      { concept: "geo_circle_area", note: "The base is a circle; its area πr² is the starting point." },
      { concept: "geo_volume_sphere", note: "Both are curved solids whose volumes carry a fractional coefficient (1/3 vs 4/3)." }
    ],
    examples: [
      { question: "Volume of a cone with radius 3 and height 6 (in terms of π)?", answer: "18\\pi", explanation: "$\\frac{1}{3}\\pi (3)^2(6) = \\frac{1}{3}\\pi (54) = 18\\pi$." },
      { question: "Volume of a cone with radius 4 and height 3 (in terms of π)?", answer: "16\\pi", explanation: "$\\frac{1}{3}\\pi (4)^2(3) = \\frac{1}{3}\\pi (48) = 16\\pi$." }
    ]
  },

  geo_volume_sphere: {
    title: "Volume of a Sphere",
    formula: "V = \\dfrac{4}{3}\\pi r^3",
    oneLineSummary: "A sphere's volume is four-thirds π times the radius cubed — the radius is cubed because volume is three-dimensional.",
    intuitionHook: "A ball wedged snugly in a can (a cylinder as tall as the ball is wide) fills exactly two-thirds of it. The radius gets CUBED, not squared, because a sphere is solid in all three directions at once — double the radius and you get eight times the ball.",
    whatItIs: "The volume enclosed by a sphere of radius $r$: four-thirds of $\\pi r^3$. The single defining input is the radius.",
    whyItWorks: "Volume grows with the cube of length: a shape twice as wide holds $2^3 = 8$ times as much, so any volume formula carries an $r^3$. The exact constant for a sphere is $\\frac{4}{3}\\pi$ — derivable by stacking infinitely many thin disks (calculus) or by Archimedes' result that a sphere is two-thirds of its circumscribing cylinder. Two errors hide here: squaring instead of cubing (that measures area, the wrong dimension) and dropping the $\\frac{4}{3}$ (which under-counts to a bare $r^3$). Keeping the answer in terms of $\\pi$ avoids rounding the irrational constant.",
    whenToUse: "Capacity of balls, bubbles, planets, tanks, and droplets; comparing how volume scales when a round object's size changes.",
    representations: [
      { kind: "cube_the_radius", label: "Three dimensions → r³", body: "Double the radius, eight times the volume: $r^3$ is what makes that true." },
      { kind: "two_thirds_cylinder", label: "Archimedes' ratio", body: "A sphere fills $\\frac{2}{3}$ of its snug cylinder; the algebra lands on $\\frac{4}{3}\\pi r^3$." },
      { kind: "worked", label: "Plug and cube", body: "$r = 3$: $\\frac{4}{3}\\pi (3)^3 = \\frac{4}{3}\\pi (27) = 36\\pi$." }
    ],
    commonMistakes: [
      { label: "Squaring instead of cubing", why: "Using $r^2$ — that's a 2-D area, not a 3-D volume.", fix: "Volume needs three factors of $r$: cube it, $r^3$." },
      { label: "Dropping the 4/3", why: "Reporting $\\pi r^3$ and forgetting the coefficient.", fix: "The sphere constant is $\\frac{4}{3}\\pi$ — keep the $\\frac{4}{3}$ in front of $r^3$." }
    ],
    connections: [
      { concept: "geo_volume_cylinder", note: "A sphere fills two-thirds of the cylinder that just contains it." },
      { concept: "geo_volume_cone", note: "Curved-solid cousins; both volumes carry a fraction (4/3 here, 1/3 for the cone)." },
      { concept: "cube_root", note: "Volume scales with r³, so recovering r from a volume is a cube root." }
    ],
    examples: [
      { question: "Volume of a sphere with radius 3 (in terms of π)?", answer: "36\\pi", explanation: "$\\frac{4}{3}\\pi (3)^3 = \\frac{4}{3}\\pi (27) = 36\\pi$." },
      { question: "Volume of a sphere with radius 6 (in terms of π)?", answer: "288\\pi", explanation: "$\\frac{4}{3}\\pi (6)^3 = \\frac{4}{3}\\pi (216) = 288\\pi$." }
    ]
  },

  geo_volume_pyramid: {
    title: "Volume of a Pyramid",
    formula: "V = \\dfrac{1}{3} \\times (\\text{base area}) \\times h",
    oneLineSummary: "A pyramid holds one-third of the prism with the same base and height — V = (1/3) × base area × height.",
    intuitionHook: "Three identical pyramids snap together to form a box (prism) on the same base. So a pyramid is a third of its prism — the very same one-third that makes a cone a third of its cylinder. Tapering to a point always costs two-thirds of the volume.",
    whatItIs: "The volume of a pyramid: the area of its base, times its height, times one-third. For a rectangular base that's $\\frac{1}{3} \\times l \\times w \\times h$.",
    whyItWorks: "A prism is the base area stacked straight up through the height: $\\text{base} \\times h$. A pyramid on the same base shrinks from the full base down to a single apex, so each level higher covers less than the prism. The shrinkage removes exactly two-thirds, leaving $\\frac{1}{3}$ — the identical taper logic as the cone, just with a polygon base instead of a circle. The base area must be computed first (it's two-dimensional), then multiplied by the height and by $\\frac{1}{3}$. Reporting the base area alone, or the full prism, are the two halves of the same unfinished calculation.",
    whenToUse: "Volume of pyramid-shaped roofs, tents, monuments, and crystal or packaging shapes with a flat base and a peak.",
    representations: [
      { kind: "three_pyramids", label: "Three pyramids fill the box", body: "Same base and height: $3 \\times (\\text{pyramid}) = \\text{prism}$, so a pyramid is $\\frac{1}{3} \\times \\text{base} \\times h$." },
      { kind: "base_then_third", label: "Base area, height, third", body: "Base $3 \\times 4 = 12$, height $6$: prism $= 72$, pyramid $= \\frac{72}{3} = 24$." },
      { kind: "same_as_cone", label: "Cone's polygon cousin", body: "Cone and pyramid share the $\\frac{1}{3}$ — a cone is just a pyramid with a circular base." }
    ],
    commonMistakes: [
      { label: "Forgetting the one-third", why: "Computing base × height — that's the full prism, three times too large.", fix: "A pyramid is a THIRD of its prism: multiply the prism volume by $\\frac{1}{3}$." },
      { label: "Stopping at the base area", why: "Reporting $l \\times w$ and forgetting the height and the third.", fix: "Base area is only 2-D; multiply by the height and by $\\frac{1}{3}$ to get the volume." }
    ],
    connections: [
      { concept: "geo_volume_rect", note: "A pyramid is one-third of the rectangular prism on the same base and height." },
      { concept: "geo_volume_cone", note: "A cone IS a pyramid with a circular base — same 1/3 factor." },
      { concept: "geo_area_rect", note: "The base area l × w is the first step before applying height and the third." }
    ],
    examples: [
      { question: "Volume of a pyramid with a 3 × 4 base and height 6?", answer: "24", explanation: "Base area $= 12$; $\\frac{1}{3} \\times 12 \\times 6 = \\frac{72}{3} = 24$." },
      { question: "Volume of a pyramid with a 5 × 3 base and height 6?", answer: "30", explanation: "Base area $= 15$; $\\frac{1}{3} \\times 15 \\times 6 = \\frac{90}{3} = 30$." }
    ]
  },

  // ===========================================================================
  // GEOMETRY SURFACE AREA II — cylinder, sphere, cone (7.G / HSG-GMD).
  // ===========================================================================
  geo_surface_cylinder: {
    title: "Surface Area of a Cylinder",
    formula: "S = 2\\pi r^2 + 2\\pi r h = 2\\pi r(r + h)",
    oneLineSummary: "Unroll a cylinder into two circular caps plus a rectangle, so its surface area is 2πr² + 2πrh.",
    intuitionHook: "Peel the label off a soup can and it flattens into a rectangle; the lid and base pop off as two circles. The whole skin of the can is just those three flat pieces — two circles and one rectangle — added together.",
    whatItIs: "The total area of a cylinder's outside: the two circular ends plus the curved side. Together that's $2\\pi r^2$ (the two caps) plus $2\\pi r h$ (the unrolled side).",
    whyItWorks: "Surface area is about COVERING, so break the surface into flat pieces you can measure. The two ends are circles, each $\\pi r^2$, giving $2\\pi r^2$. The curved side, slit and unrolled, is a rectangle: its height is the cylinder's height $h$, and its width is the distance around the circle — the circumference $2\\pi r$. So the side is $2\\pi r \\times h = 2\\pi r h$. Add them: $2\\pi r^2 + 2\\pi r h$. The width of that rectangle being the circumference is the key insight, and it's why surface area uses $2\\pi r$ while volume uses the area $\\pi r^2$ — covering the side needs its perimeter, filling the can needs its area.",
    whenToUse: "How much metal makes a can, paper wraps a tube, or paint coats a cylindrical tank; any 'cover the outside' question for a cylinder.",
    representations: [
      { kind: "three_pieces", label: "Two circles + a rectangle", body: "Caps: $2\\pi r^2$. Side unrolled: a rectangle $2\\pi r$ wide by $h$ tall $= 2\\pi r h$." },
      { kind: "circumference_width", label: "The label's width is the circumference", body: "Slit the side and flatten it: the width is $2\\pi r$, not $r$ — it wraps all the way around." },
      { kind: "cover_vs_fill", label: "Surface vs volume", body: "Surface area covers ($2\\pi r$ around); volume fills ($\\pi r^2$ across). Different jobs, different formulas." }
    ],
    commonMistakes: [
      { label: "Forgetting the two caps", why: "Computing only the side $2\\pi r h$ — the lid and base are uncovered.", fix: "Add both circular ends: $+ 2\\pi r^2$. A closed cylinder has three pieces, not one." },
      { label: "Computing the volume instead", why: "Using $\\pi r^2 h$ — that fills the can, it doesn't cover it.", fix: "Surface area sums flat areas of the skin; volume measures the space inside. Pick the covering formula." }
    ],
    connections: [
      { concept: "geo_circle_area", note: "Each cap is a circle of area πr² — two of them." },
      { concept: "geo_circumference", note: "The unrolled side's width is the circumference 2πr." },
      { concept: "geo_volume_cylinder", note: "Same solid: surface area covers it (2πr around), volume fills it (πr² across)." }
    ],
    examples: [
      { question: "Surface area of a cylinder with radius 3 and height 5 (in terms of π)?", answer: "48\\pi", explanation: "$2\\pi(3)^2 + 2\\pi(3)(5) = 18\\pi + 30\\pi = 48\\pi$." },
      { question: "Surface area of a cylinder with radius 2 and height 5 (in terms of π)?", answer: "28\\pi", explanation: "$2\\pi(2)^2 + 2\\pi(2)(5) = 8\\pi + 20\\pi = 28\\pi$." }
    ]
  },

  geo_surface_sphere: {
    title: "Surface Area of a Sphere",
    formula: "S = 4\\pi r^2",
    oneLineSummary: "A sphere's surface area is 4πr² — exactly four times the area of a flat circle with the same radius.",
    intuitionHook: "Peel an orange and flatten the rind: the scraps cover exactly four circles drawn around the orange's middle. A ball's skin is four times the area of its widest cross-section — a clean, surprising fact.",
    whatItIs: "The area of a sphere's curved surface, which depends only on the radius: four times $\\pi r^2$.",
    whyItWorks: "A flat circle through the sphere's center (a 'great circle') has area $\\pi r^2$. Archimedes proved the sphere's whole curved surface equals exactly FOUR of those circles — and equals the curved side of the cylinder that just contains the ball. So $S = 4\\pi r^2$. Two things to keep straight: the radius is SQUARED because area is two-dimensional (a common slip is leaving it as $r$), and the constant is $4$ (not $1$ like a flat circle, nor $2$). There's no separate 'base' to add — a sphere is all one smooth surface.",
    whenToUse: "Material to cover a ball or dome, heat radiating from a spherical object, paint on a globe; any 'skin of a sphere' question.",
    representations: [
      { kind: "four_circles", label: "Four great circles", body: "Great circle area $\\pi r^2$; the sphere's surface is $4 \\times \\pi r^2 = 4\\pi r^2$." },
      { kind: "square_the_radius", label: "Area is 2-D", body: "$r$ is squared: $r = 3 \\to 4\\pi(9) = 36\\pi$. Leaving it as $r$ measures a length, not an area." },
      { kind: "one_surface", label: "No caps to add", body: "Unlike a cylinder or cone, a sphere is a single closed surface — nothing extra to tack on." }
    ],
    commonMistakes: [
      { label: "Not squaring the radius", why: "Using $4\\pi r$ instead of $4\\pi r^2$.", fix: "Area is two-dimensional: square the radius, $4\\pi r^2$." },
      { label: "Using the wrong coefficient", why: "Writing $\\pi r^2$ or $2\\pi r^2$ — the right constant is 4.", fix: "A sphere's surface is FOUR great circles: the leading number is $4$." }
    ],
    connections: [
      { concept: "geo_circle_area", note: "A sphere's surface is exactly four flat circles of area πr²." },
      { concept: "geo_volume_sphere", note: "Same ball: surface area is 4πr² (covering), volume is 4/3 πr³ (filling)." },
      { concept: "geo_surface_cylinder", note: "A sphere's surface equals the curved side of its bounding cylinder." }
    ],
    examples: [
      { question: "Surface area of a sphere with radius 3 (in terms of π)?", answer: "36\\pi", explanation: "$4\\pi r^2 = 4\\pi(3)^2 = 4\\pi(9) = 36\\pi$." },
      { question: "Surface area of a sphere with radius 5 (in terms of π)?", answer: "100\\pi", explanation: "$4\\pi(5)^2 = 4\\pi(25) = 100\\pi$." }
    ]
  },

  geo_surface_cone: {
    title: "Surface Area of a Cone",
    formula: "S = \\pi r^2 + \\pi r l = \\pi r(r + l) \\quad (l = \\text{slant height})",
    oneLineSummary: "A cone's surface is its circular base plus its unrolled slanted side: πr² + πrl, where l is the slant height.",
    intuitionHook: "A party hat has no base — just the slanted cone. Slit it and it unrolls into a flat pie-slice (a sector). Add the circular base back and you have the cone's whole surface: a circle plus a fan.",
    whatItIs: "The total area of a cone's outside: the circular base ($\\pi r^2$) plus the curved lateral surface, which unrolls to a sector of area $\\pi r l$, using the SLANT height $l$ (not the vertical height).",
    whyItWorks: "Split the surface into the two flat-able pieces. The base is a circle: $\\pi r^2$. The slanted side, slit and unrolled, becomes a sector of a big circle whose radius is the slant height $l$; that sector's area works out to $\\pi r l$ — the base circumference $2\\pi r$ sets how much of the big circle the sector spans. So $S = \\pi r^2 + \\pi r l$. The crucial detail is the SLANT height in the lateral term: it's the true distance along the surface from base edge to tip, longer than the vertical height. Using the vertical height (or forgetting the base) is where most errors live.",
    whenToUse: "Material for a funnel, party hat, or cone-roof; any 'cover a cone' problem (often the slant height is given, or found by Pythagoras from r and the vertical height).",
    representations: [
      { kind: "circle_plus_sector", label: "Base + unrolled side", body: "Base $\\pi r^2$; the slit side flattens to a sector of area $\\pi r l$. Add them." },
      { kind: "slant_not_height", label: "Use the slant height", body: "The lateral term uses $l$, the distance along the surface — longer than the vertical height $h$." },
      { kind: "open_vs_closed", label: "Hat vs full cone", body: "A party hat (no base) is just $\\pi r l$; a closed cone adds the base $\\pi r^2$." }
    ],
    commonMistakes: [
      { label: "Forgetting the base", why: "Computing only $\\pi r l$ — that's an open hat, not a closed cone.", fix: "Add the circular base $\\pi r^2$ unless the problem says the cone is open." },
      { label: "Using the vertical height for the slant", why: "Plugging the height $h$ into $\\pi r l$ instead of the slant height $l$.", fix: "The lateral surface follows the SLOPE: use the slant height $l$ (find it by $\\sqrt{r^2 + h^2}$ if only $h$ is given)." }
    ],
    connections: [
      { concept: "geo_circle_area", note: "The base is a circle of area πr²." },
      { concept: "geo_volume_cone", note: "Same cone: surface area covers it (πr² + πrl), volume fills it (1/3 πr²h)." },
      { concept: "distance_formula", note: "The slant height is a hypotenuse: l = √(r² + h²) when only the vertical height is known." }
    ],
    examples: [
      { question: "A cone has radius 3 and slant height 5. Total surface area (in terms of π)?", answer: "24\\pi", explanation: "$\\pi r^2 + \\pi r l = \\pi(9) + \\pi(3)(5) = 9\\pi + 15\\pi = 24\\pi$." },
      { question: "A cone has radius 4 and slant height 6. Total surface area (in terms of π)?", answer: "40\\pi", explanation: "$\\pi(4)^2 + \\pi(4)(6) = 16\\pi + 24\\pi = 40\\pi$." }
    ]
  },

  // ===========================================================================
  // ADVANCED CONCEPTS (audit #1.1 — upgrading the original legacy lessons to the
  // rich concept-first shape, for concepts whose canonical-level template matches).
  // ===========================================================================
  quadratic: {
    title: "Solving Quadratic Equations",
    formula: "x^2 - (r_1 + r_2)x + r_1 r_2 = 0 \\implies x = r_1, r_2",
    oneLineSummary: "A quadratic equals zero when one of its factors is zero — find the two numbers that multiply to the constant and add to the middle coefficient.",
    intuitionHook: "Think of $x^2 - 11x + 24 = 0$ as a product $(x - r_1)(x - r_2) = 0$. A product is zero only when a factor is zero, so the whole puzzle becomes: which two numbers MULTIPLY to $24$ and ADD to $11$? That's $3$ and $8$ — the roots.",
    whatItIs: "A quadratic equation sets a degree-2 expression equal to zero. Its solutions (roots) are the values of $x$ that satisfy it — at most two, because a parabola crosses a horizontal line at most twice.",
    whyItWorks: "Factoring rewrites $x^2 - 11x + 24$ as $(x-3)(x-8)$. Expanding back confirms it: the $x$ terms $-3x - 8x = -11x$ (the sum of roots, negated) and the constant $(-3)(-8) = 24$ (the product of roots). The Zero-Product Property finishes it: if $(x-3)(x-8) = 0$, then $x - 3 = 0$ or $x - 8 = 0$, giving $x = 3$ or $x = 8$. So the coefficients literally encode the sum and product of the answers — that's why hunting for 'two numbers that add and multiply' works.",
    whenToUse: "Projectile heights and times, areas with an unknown side, optimization where a rate hits zero, and any model where a quantity depends on the square of a variable.",
    representations: [
      { kind: "symbolic", label: "Factor and zero-out", body: "$x^2 - 11x + 24 = (x-3)(x-8) = 0 \\implies x = 3 \\text{ or } 8$." },
      { kind: "graphical", label: "Where the parabola crosses zero", body: "The roots are the $x$-intercepts of $y = x^2 - 11x + 24$; the curve dips below the axis between $3$ and $8$." },
      { kind: "sum_product", label: "Read the coefficients", body: "Middle term $-11$ is the negated SUM of roots; constant $24$ is their PRODUCT." }
    ],
    commonMistakes: [
      { label: "Sign error on the roots", why: "Reading $(x-3)(x-8)=0$ as $x = -3, -8$ — flipping the sign of each root.", fix: "Set each factor to zero: $x - 3 = 0$ gives $x = +3$, not $-3$. The root has the OPPOSITE sign of the number in the factor." },
      { label: "Reporting the coefficient instead of a root", why: "Answering $11$ or $24$ because they're the visible numbers.", fix: "The solutions are the $x$-values that make it zero ($3$ and $8$), not the coefficients themselves." }
    ],
    connections: [
      { concept: "linear_two_step", note: "Quadratics need a second solution path (factoring) because isolating $x$ once isn't enough when it's squared." },
      { concept: "distribute", note: "Expanding $(x-3)(x-8)$ back to $x^2 - 11x + 24$ is repeated distribution — the check that your factoring is right." }
    ],
    examples: [
      { question: "Find the larger root of $x^2 - 11x + 24 = 0$.", answer: "8", explanation: "Two numbers multiplying to $24$ and adding to $11$ are $3$ and $8$: $(x-3)(x-8)=0$. Roots $3, 8$; the larger is $8$." },
      { question: "Find the larger root of $x^2 - 7x + 12 = 0$.", answer: "4", explanation: "$3$ and $4$ multiply to $12$ and add to $7$: $(x-3)(x-4)=0$. The larger root is $4$." }
    ]
  },

  matrix_trace: {
    title: "The Trace of a Matrix",
    formula: "\\text{tr}(A) = a_{11} + a_{22} + \\cdots + a_{nn}",
    oneLineSummary: "The trace is just the sum of the entries on the main diagonal — top-left to bottom-right — and nothing else.",
    intuitionHook: "A matrix is a full grid of numbers, but the trace asks only one question: walk the main diagonal from the top-left corner straight down to the bottom-right and add up what you step on. For $\\begin{pmatrix} 3 & 7 \\\\ 2 & 5 \\end{pmatrix}$ that path hits $3$ and $5$, so the trace is $8$. The off-diagonal $7$ and $2$ are simply ignored.",
    whatItIs: "The trace of a square matrix is the sum of the entries $a_{ii}$ lying on its main diagonal (where the row index equals the column index). It is defined only for square matrices and returns a single number.",
    whyItWorks: "The main diagonal entries are special because they pair each row with the matching column — $a_{11}$ links row $1$ to column $1$, $a_{22}$ links row $2$ to column $2$, and so on. Summing exactly these positions produces a quantity that survives a change of coordinates: the trace equals the sum of a matrix's eigenvalues, so it measures total 'stretch' a transformation applies regardless of how you rotate your axes. That coordinate-independence is why we single out the diagonal sum and give it a name instead of summing all the entries.",
    whenToUse: "Quick invariants of a linear map, the sum of eigenvalues without solving for them, checking a transformation's net scaling, and as a building block in physics (e.g. the divergence of a flow) and statistics (the total variance in a covariance matrix).",
    representations: [
      { kind: "diagonal_walk", label: "Sum the main diagonal", body: "$\\begin{pmatrix} 3 & 7 \\\\ 2 & 5 \\end{pmatrix}$: trace $= 3 + 5 = 8$ — only the corners on the $\\searrow$ diagonal." },
      { kind: "symbolic", label: "General formula", body: "For $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$, $\\text{tr} = a + d$; the off-diagonal $b, c$ never appear." },
      { kind: "invariant", label: "Sum of eigenvalues", body: "If a matrix has eigenvalues $\\lambda_1, \\lambda_2$, then $\\text{tr} = \\lambda_1 + \\lambda_2$ — the trace is coordinate-free." }
    ],
    commonMistakes: [
      { label: "Adding every entry", why: "Summing all four numbers ($3+7+2+5 = 17$) instead of just the diagonal.", fix: "Use ONLY the main-diagonal entries $a_{11}$ and $a_{22}$: $3 + 5 = 8$. The off-diagonal numbers are not part of the trace." },
      { label: "Using the anti-diagonal", why: "Adding the bottom-left and top-right ($2 + 7$) instead of top-left and bottom-right.", fix: "The MAIN diagonal runs top-left $\\to$ bottom-right ($a_{11}, a_{22}$). The anti-diagonal is a different set and is not the trace." }
    ],
    connections: [
      { concept: "matrix_determinant", note: "Trace (sum of eigenvalues) and determinant (product of eigenvalues) are the two basic invariants of a 2×2 matrix." },
      { concept: "arithmetic_add", note: "Once you've picked out the diagonal entries, the trace is just their sum — plain addition." }
    ],
    examples: [
      { question: "Compute the trace of $\\begin{pmatrix} 3 & 7 \\\\ 2 & 5 \\end{pmatrix}$.", answer: "8", explanation: "Add the main-diagonal entries: $3 + 5 = 8$." },
      { question: "Find the trace of $\\begin{pmatrix} 6 & 1 \\\\ 9 & 4 \\end{pmatrix}$.", answer: "10", explanation: "Main diagonal is $6$ and $4$: $6 + 4 = 10$ (the $1$ and $9$ are ignored)." }
    ]
  },

  matrix_determinant: {
    title: "The Determinant of a 2×2 Matrix",
    formula: "\\det\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} = ad - bc",
    oneLineSummary: "Cross-multiply the diagonals and subtract: main-diagonal product minus anti-diagonal product, $ad - bc$.",
    intuitionHook: "Picture the two columns of $\\begin{pmatrix} 4 & 3 \\\\ 2 & 5 \\end{pmatrix}$ as arrows from the origin. They span a parallelogram, and its (signed) area is the determinant: $4\\cdot 5 - 3\\cdot 2 = 14$. A big determinant means the matrix stretches space a lot; a determinant of $0$ means the arrows are squashed onto a line, collapsing all area.",
    whatItIs: "The determinant of a $2\\times2$ matrix is the single number $ad - bc$. Geometrically it is the signed area-scaling factor of the linear transformation the matrix represents.",
    whyItWorks: "Multiply the main diagonal ($ad$) and subtract the anti-diagonal ($bc$). That combination is exactly the signed area of the parallelogram spanned by the column vectors $(a, c)$ and $(b, d)$ — the same as their 2D cross product. When the columns point in independent directions the area is nonzero, so the transformation is invertible and a linear system $A\\mathbf{x} = \\mathbf{b}$ has a unique solution. When $ad - bc = 0$ the columns are parallel, the parallelogram flattens to zero area, and the matrix is singular (no unique inverse). So the formula's subtraction is what detects 'have the directions collapsed?'.",
    whenToUse: "Testing whether a $2\\times2$ system has a unique solution, computing a matrix inverse, finding the signed area a transformation produces, evaluating cross products in 2D, and Cramer's rule.",
    representations: [
      { kind: "diagonal_cross", label: "Main minus anti", body: "$\\begin{pmatrix} 4 & 3 \\\\ 2 & 5 \\end{pmatrix}$: $\\underbrace{4\\cdot5}_{ad} - \\underbrace{3\\cdot2}_{bc} = 20 - 6 = 14$." },
      { kind: "geometric", label: "Signed parallelogram area", body: "The columns $(a,c)$ and $(b,d)$ span a parallelogram whose signed area is $ad - bc$." },
      { kind: "singularity_test", label: "Zero means collapse", body: "$\\det = 0 \\Rightarrow$ columns are parallel, the system has no unique solution, and no inverse exists." }
    ],
    commonMistakes: [
      { label: "Adding the products instead of subtracting", why: "Writing $ad + bc$ ($20 + 6 = 26$) rather than $ad - bc$.", fix: "It is always a DIFFERENCE: main-diagonal product MINUS anti-diagonal product, $20 - 6 = 14$." },
      { label: "Sign slips with negative entries", why: "Mishandling $-bc$ when $b$ or $c$ is negative, e.g. forgetting the double negative.", fix: "Compute $bc$ first WITH its sign, then subtract: if $bc = -6$, then $ad - bc = ad - (-6) = ad + 6$." }
    ],
    connections: [
      { concept: "matrix_trace", note: "Determinant (product of eigenvalues) pairs with trace (their sum) as the two 2×2 invariants." },
      { concept: "linear_system", note: "A nonzero determinant is exactly the condition for a 2×2 linear system to have one unique solution." }
    ],
    examples: [
      { question: "Compute the determinant of $\\begin{pmatrix} 4 & 3 \\\\ 2 & 5 \\end{pmatrix}$.", answer: "14", explanation: "$ad - bc = (4)(5) - (3)(2) = 20 - 6 = 14$." },
      { question: "Find the determinant of $\\begin{pmatrix} 6 & 2 \\\\ 1 & 3 \\end{pmatrix}$.", answer: "16", explanation: "$ad - bc = (6)(3) - (2)(1) = 18 - 2 = 16$." }
    ]
  },

  pigeonhole: {
    title: "The Pigeonhole Principle",
    formula: "\\text{draws to guarantee a pair} = (\\text{number of categories}) + 1",
    oneLineSummary: "If you have more items than categories, two items must share a category — so one more than the number of categories guarantees a repeat.",
    intuitionHook: "A drawer holds socks in $5$ colors and you grab them in the dark. You could be unlucky and pull $5$ different colors in a row — but the very next sock, the $6$th, has nowhere new to go: it MUST match one you already hold.",
    whatItIs: "The Pigeonhole Principle says that distributing more items than there are containers forces at least one container to hold two or more. The 'guarantee a pair' version asks for the worst case plus one.",
    whyItWorks: "Imagine the adversary trying their hardest to AVOID a pair. With $5$ colors, the most they can draw without repeating is exactly one of each — $5$ socks. Every category is now 'occupied' by a single sock. The next draw can't open a new category (there are only $5$), so it lands in an occupied one and creates the pair. That's why the answer is categories $+ 1$: you spend one draw per pigeonhole to fill them, then one more to force a collision.",
    whenToUse: "Guarantee arguments ('must there be two people with…?'), worst-case planning, hashing collisions, and any 'how many to be sure' question where outcomes fall into a fixed number of buckets.",
    representations: [
      { kind: "worst_case", label: "Fill, then force", body: "$5$ colors: draw $5$ (one each) in the worst case, then $1$ more is forced to repeat $\\to 6$." },
      { kind: "real_world", label: "Socks in the dark", body: "With $5$ colors, $6$ socks guarantee a matching pair; $5$ might still be all different." },
      { kind: "general_rule", label: "Categories plus one", body: "$n$ categories $\\Rightarrow n + 1$ items guarantee at least one category has two." }
    ],
    commonMistakes: [
      { label: "Forgetting the +1", why: "Answering $5$ for $5$ colors — but $5$ draws could be one of each, no pair yet.", fix: "The worst case uses up one per category ($5$); you need ONE MORE to force a repeat: $6$." },
      { label: "Counting items needed for a specific color", why: "Confusing 'guarantee ANY pair' with 'guarantee a pair of red'.", fix: "Any-pair only needs categories $+1$. Guaranteeing a SPECIFIC color is a different, larger worst case." }
    ],
    connections: [
      { concept: "combinations", note: "Both are counting principles; pigeonhole reasons about the worst case rather than enumerating choices." },
      { concept: "arithmetic_add", note: "The whole rule reduces to 'one per box, then add one more'." }
    ],
    examples: [
      { question: "A drawer has socks of $5$ different colors. Minimum draws to guarantee a matching pair?", answer: "6", explanation: "Worst case draws one of each ($5$); the $6$th must repeat a color. Answer $6$." },
      { question: "With $8$ different colors, how many draws guarantee a pair?", answer: "9", explanation: "Categories $+1$: $8 + 1 = 9$." }
    ]
  },

  permutations: {
    title: "Permutations (Ordered Arrangements)",
    formula: "n! = n \\times (n-1) \\times \\cdots \\times 2 \\times 1",
    oneLineSummary: "To arrange $n$ distinct items in a row, multiply the shrinking number of choices for each position: $n!$.",
    intuitionHook: "Seat $6$ people in a row. The first chair has $6$ candidates; once they sit, the next chair has only $5$ left, then $4$, and so on. Multiply the choices: $6 \\times 5 \\times 4 \\times 3 \\times 2 \\times 1 = 720$ different line-ups.",
    whatItIs: "A permutation is an ordering of items where position matters. The number of ways to arrange $n$ distinct objects is $n$ factorial, written $n!$.",
    whyItWorks: "Build the arrangement one slot at a time and use the multiplication principle. The first position can be filled $n$ ways. Whatever you pick, the second position now has $n-1$ remaining choices, the third $n-2$, and so on down to the last slot with a single choice. Because each independent choice multiplies the running total, the count is $n \\times (n-1) \\times \\cdots \\times 1 = n!$. Order matters here, which is exactly why we don't divide out any rearrangements — every distinct sequence is counted once.",
    whenToUse: "Line-ups and seatings, rankings and finishing orders, scheduling distinct tasks, password/PIN counts where order matters, and as the building block for combinations.",
    representations: [
      { kind: "slot_filling", label: "Shrinking choices", body: "$6$ seats: $6\\times5\\times4\\times3\\times2\\times1 = 720$ — one factor per seat." },
      { kind: "real_world", label: "Race finish orders", body: "$4$ runners can finish $4! = 24$ different ways (gold/silver/bronze/4th all distinct)." },
      { kind: "symbolic", label: "Factorial growth", body: "$3! = 6$, $4! = 24$, $5! = 120$ — each step multiplies by the next integer." }
    ],
    commonMistakes: [
      { label: "Adding instead of multiplying the choices", why: "Computing $6+5+4+\\dots$ instead of the product.", fix: "Each position's choice is INDEPENDENT, so the counts MULTIPLY: $6\\times5\\times4\\cdots = 720$." },
      { label: "Treating order as irrelevant", why: "Dividing by arrangements as if it were a combination.", fix: "If rearranging the SAME items counts as a new outcome (a line-up), it's a permutation — don't divide it out." }
    ],
    connections: [
      { concept: "combinations", note: "Combinations are permutations with the orderings divided out, since order doesn't matter there." },
      { concept: "arithmetic_mult", note: "Factorials are just repeated multiplication of the shrinking choice counts." }
    ],
    examples: [
      { question: "How many ways can $6$ distinct paintings be displayed side-by-side?", answer: "720", explanation: "$6! = 6\\times5\\times4\\times3\\times2\\times1 = 720$." },
      { question: "In how many orders can $4$ runners finish a race (no ties)?", answer: "24", explanation: "$4! = 4\\times3\\times2\\times1 = 24$." }
    ]
  },

  combinations: {
    title: "Combinations (Unordered Selections)",
    formula: "\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}",
    oneLineSummary: "Count how many ways to CHOOSE $k$ items from $n$ when order doesn't matter — take the ordered count and divide out the rearrangements.",
    intuitionHook: "Pick a committee of $2$ from $6$ people. If order mattered there'd be $6\\times5 = 30$ ways. But 'Ann then Bob' is the SAME committee as 'Bob then Ann' — each pair got counted twice — so the real answer is $30 / 2 = 15$. A combination is a permutation with the duplicate orderings removed.",
    whatItIs: "A combination counts the number of ways to select a subset of $k$ items from $n$ distinct items where the ORDER of selection is irrelevant. It is written $\\binom{n}{k}$, read '$n$ choose $k$'.",
    whyItWorks: "Start with the ordered count: there are $n\\times(n-1)\\times\\cdots$ ways to pick $k$ items in order, which is $\\frac{n!}{(n-k)!}$. But any chosen group of $k$ items can itself be arranged in $k!$ orders, and as an unordered selection all of those count as one and the same. So we divide the ordered count by $k!$ to collapse each group's rearrangements into a single combination: $\\binom{n}{k} = \\frac{n!}{k!\\,(n-k)!}$. For choosing $2$ this simplifies to $\\frac{n(n-1)}{2}$ — pick an ordered pair, then halve because the two orders are the same selection.",
    whenToUse: "Committees and teams, lottery and card hands, handshake/round-robin counts, choosing toppings, and any 'how many groups' question where shuffling the chosen items changes nothing.",
    representations: [
      { kind: "divide_out_order", label: "Permutations ÷ k!", body: "Choose $2$ of $6$: ordered $6\\times5 = 30$, then divide by $2! = 2$ duplicate orders $\\to 15$." },
      { kind: "symbolic", label: "The choose formula", body: "$\\binom{n}{2} = \\frac{n(n-1)}{2}$; e.g. $\\binom{6}{2} = \\frac{6\\cdot5}{2} = 15$." },
      { kind: "handshake", label: "Pairs in a group", body: "$n$ people each shake hands once: every handshake is an unordered pair, $\\binom{n}{2}$ total." }
    ],
    commonMistakes: [
      { label: "Forgetting to divide out the order", why: "Reporting the permutation count $n(n-1)$ (e.g. $30$) and treating it as the number of groups.", fix: "Order doesn't matter for a SELECTION, so divide by $k!$: $30 / 2! = 15$ committees, not $30$." },
      { label: "Confusing combinations with permutations", why: "Using $n!/(n-k)!$ because a line-up and a group feel similar.", fix: "Ask: does rearranging the chosen items make a NEW outcome? If no (a committee), it's a combination — divide by $k!$." }
    ],
    connections: [
      { concept: "permutations", note: "A combination is a permutation with the $k!$ internal orderings divided out, since order is irrelevant." },
      { concept: "pigeonhole", note: "Both are core counting tools; combinations enumerate the groups, pigeonhole reasons about guarantees over them." }
    ],
    examples: [
      { question: "A committee of $2$ is chosen from $6$ people. How many different committees are possible?", answer: "15", explanation: "$\\binom{6}{2} = \\frac{6\\cdot5}{2} = 15$ (order within the pair doesn't matter)." },
      { question: "At a meeting of $8$ people, everyone shakes hands once. How many handshakes occur?", answer: "28", explanation: "Each handshake is an unordered pair: $\\binom{8}{2} = \\frac{8\\cdot7}{2} = 28$." }
    ]
  },

  derivative: {
    title: "Derivatives (The Power Rule)",
    formula: "\\frac{d}{dx}\\,x^n = n\\,x^{n-1}",
    oneLineSummary: "The derivative measures instantaneous rate of change — for a power $x^n$, bring the exponent down as a multiplier and drop it by one.",
    intuitionHook: "A car's position is $s(t) = 5t^2$. How fast is it going at one instant, not on average? The derivative answers that: $s'(t) = 10t$, so at $t = 1$ the speed is $10$. It's the slope of the curve at a single point — the speedometer reading.",
    whatItIs: "A derivative gives the instantaneous rate at which a function changes — the slope of its graph at each point. The Power Rule is the shortcut for differentiating $x^n$.",
    whyItWorks: "Slope is rise-over-run, but a curve's steepness changes everywhere, so we shrink the run toward zero and read the LIMITING slope at a point. Carrying that limit out on $x^n$ produces a clean pattern: the exponent drops in front as a coefficient and the power decreases by one, $n x^{n-1}$. A constant multiplier just rides along, $(a x^n)' = a n x^{n-1}$, because scaling a function scales its slope. So $5t^2$ differentiates to $5\\cdot 2 t^{1} = 10t$ — that's the velocity from the position.",
    whenToUse: "Velocity from position, marginal cost/revenue in economics, the slope of a tangent line, rates of growth or decay, and finding maxima/minima where the slope is zero.",
    representations: [
      { kind: "symbolic", label: "Drop and decrement", body: "$\\frac{d}{dx}\\,5x^2 = 5\\cdot 2 x^{1} = 10x$ — exponent to the front, power minus one." },
      { kind: "graphical", label: "Slope of the tangent", body: "$f'(a)$ is the steepness of the curve at $x=a$; flat spots have $f'=0$." },
      { kind: "real_world", label: "Position to velocity", body: "If $s(t)=5t^2$ then $v(t)=s'(t)=10t$; at $t=1$, $v=10$." }
    ],
    commonMistakes: [
      { label: "Forgetting to multiply by the old exponent", why: "Writing $(x^3)' = x^2$ instead of $3x^2$.", fix: "The exponent comes DOWN as a coefficient first: $x^3 \\to 3x^2$." },
      { label: "Mishandling the constant multiplier", why: "Differentiating $5x^2$ as $x$ or $2x$, dropping the $5$ or the exponent.", fix: "Keep the constant and apply the rule to the power: $5x^2 \\to 5\\cdot 2x = 10x$." }
    ],
    connections: [
      { concept: "integral", note: "Integration is the reverse of differentiation — the antiderivative undoes the power rule." },
      { concept: "exponent_power", note: "The power rule manipulates exponents directly, so fluency with powers comes first." }
    ],
    examples: [
      { question: "An object's position is $s(t) = 5t^2$. Find its instantaneous velocity at $t = 1$.", answer: "10", explanation: "$s'(t) = 5\\cdot 2t = 10t$; at $t=1$, $v = 10$." },
      { question: "Find $f'(x)$ for $f(x) = 3x^2$.", answer: "6x", explanation: "Power rule: $3\\cdot 2x^{2-1} = 6x$." }
    ]
  },

  integral: {
    title: "Definite Integrals",
    formula: "\\int_a^b f(x)\\,dx = F(b) - F(a), \\quad F'(x) = f(x)",
    oneLineSummary: "A definite integral is the signed area under a curve — find an antiderivative, then subtract its values at the two endpoints.",
    intuitionHook: "Drive at a steady $5$ units/hour for $4$ hours: distance is $5 \\times 4 = 20$ — the area of a rectangle under the speed graph. The integral $\\int_0^4 5\\,dx = 20$ generalizes that 'area under the rate curve gives the total' to any shape.",
    whatItIs: "A definite integral accumulates a quantity over an interval — geometrically, the signed area between a curve and the axis from $x=a$ to $x=b$.",
    whyItWorks: "Slice the region under $f(x)$ into thin strips, approximate each as a rectangle, and add them; refining the slices gives the exact area. The Fundamental Theorem of Calculus turns that infinite sum into algebra: if $F$ is an antiderivative of $f$ (so $F' = f$), then the accumulated area from $a$ to $b$ is just $F(b) - F(a)$. Differentiation built up the rate; integration reverses it to recover the total, and the endpoints fix how much you've accumulated. For $\\int_0^4 5\\,dx$, an antiderivative of $5$ is $5x$, and $5(4) - 5(0) = 20$.",
    whenToUse: "Total distance from a speed, accumulated growth from a rate, area and volume, average values, and work done by a varying force.",
    representations: [
      { kind: "area", label: "Signed area under the curve", body: "$\\int_0^4 5\\,dx$ is the area of a $4$-wide, $5$-tall rectangle $= 20$." },
      { kind: "symbolic", label: "Antiderivative then subtract", body: "$\\int_1^3 2x\\,dx = [x^2]_1^3 = 9 - 1 = 8$." },
      { kind: "real_world", label: "Rate to total", body: "Integrating a speed over time recovers the distance travelled." }
    ],
    commonMistakes: [
      { label: "Forgetting to subtract the lower endpoint", why: "Computing only $F(b)$ and ignoring $-F(a)$.", fix: "A definite integral is $F(b) - F(a)$ — always evaluate at BOTH bounds and subtract." },
      { label: "Differentiating instead of antidifferentiating", why: "Applying the power rule forward, e.g. treating $\\int x^2\\,dx$ like $2x$.", fix: "Integration REVERSES the power rule: raise the power and divide, $\\int x^2\\,dx = x^3/3$." }
    ],
    connections: [
      { concept: "derivative", note: "Integration is the inverse operation; the antiderivative is a function whose derivative is the integrand." },
      { concept: "geo_area_rect", note: "A constant integrand is literally a rectangle's area — the simplest case of 'area under the curve'." }
    ],
    examples: [
      { question: "Evaluate $\\int_0^4 5\\,dx$.", answer: "20", explanation: "Antiderivative of $5$ is $5x$: $5(4) - 5(0) = 20$ (a $4\\times5$ rectangle)." },
      { question: "Evaluate $\\int_1^3 2x\\,dx$.", answer: "8", explanation: "Antiderivative is $x^2$: $3^2 - 1^2 = 9 - 1 = 8$." }
    ]
  },

  gcd_lcm: {
    title: "Greatest Common Divisor",
    formula: "\\gcd(a, b) = \\gcd(b,\\, a \\bmod b)",
    oneLineSummary: "The GCD is the largest number dividing both values — the biggest equal group you can split each into with nothing left over.",
    intuitionHook: "You have $8$ muffins and $12$ cookies and want identical gift boxes using everything. The number of boxes must divide BOTH $8$ and $12$; the most boxes possible is the greatest such divisor — $\\gcd(8,12) = 4$.",
    whatItIs: "The greatest common divisor of two integers is the largest positive integer that divides both exactly. It captures the largest shared 'group size'.",
    whyItWorks: "Any common divisor must fit evenly into both numbers, so list the factors of each and the biggest one they share is the GCD: $8 = \\{1,2,4,8\\}$, $12 = \\{1,2,3,4,6,12\\}$, shared $\\{1,2,4\\}$, greatest $4$. The Euclidean Algorithm finds it fast without listing: replace the larger number by its remainder against the smaller, $\\gcd(a,b) = \\gcd(b, a \\bmod b)$, repeating until the remainder is $0$ — the last nonzero remainder is the GCD. It works because any divisor of $a$ and $b$ also divides their remainder, so the common divisors never change as you reduce.",
    whenToUse: "Splitting two quantities into equal groups, simplifying fractions to lowest terms, tiling without offcuts, and synchronizing repeating cycles (paired with the LCM).",
    representations: [
      { kind: "shared_factors", label: "Largest common factor", body: "$8 = \\{1,2,4,8\\}$, $12 = \\{1,2,3,4,6,12\\}$: greatest shared factor is $4$." },
      { kind: "euclid", label: "Euclidean reduction", body: "$\\gcd(12,8)\\to\\gcd(8,4)\\to\\gcd(4,0) = 4$ (last nonzero remainder)." },
      { kind: "real_world", label: "Equal gift boxes", body: "$8$ muffins and $12$ cookies split into $4$ identical boxes, nothing left over." }
    ],
    commonMistakes: [
      { label: "Confusing GCD with LCM", why: "Answering $24$ (a common MULTIPLE) when asked for the greatest common DIVISOR.", fix: "GCD divides INTO both (and is $\\le$ the smaller number); LCM is a multiple OF both (and is $\\ge$ the larger)." },
      { label: "Stopping at a common factor that isn't the greatest", why: "Answering $2$ for $\\gcd(8,12)$ because $2$ divides both.", fix: "Keep going to the LARGEST shared factor: $4$ also divides both and is bigger." }
    ],
    connections: [
      { concept: "arithmetic_div", note: "GCD is built on exact division — a divisor leaves remainder zero." },
      { concept: "modular_arithmetic", note: "The Euclidean Algorithm uses the mod (remainder) operation repeatedly." }
    ],
    examples: [
      { question: "A baker has $8$ muffins and $12$ cookies and wants identical boxes using every item. Largest number of boxes?", answer: "4", explanation: "Boxes must divide both; $\\gcd(8,12) = 4$." },
      { question: "Find $\\gcd(15, 25)$.", answer: "5", explanation: "Shared factors of $15$ and $25$ are $\\{1,5\\}$; the greatest is $5$." }
    ]
  },

  modular_arithmetic: {
    title: "Modular Arithmetic",
    formula: "a \\equiv r \\pmod{m} \\iff m \\mid (a - r),\\quad 0 \\le r < m",
    oneLineSummary: "Modular arithmetic keeps only the remainder after dividing by the modulus — numbers 'wrap around' like a clock.",
    intuitionHook: "On a $12$-hour clock, $4$ hours after $10$ o'clock isn't $14$ — it's $2$. The clock wraps at $12$. Modular arithmetic is exactly that wrap: $14 \\bmod 12 = 2$. The modulus is where the count resets to zero.",
    whatItIs: "Modular arithmetic works with remainders against a fixed modulus $m$. Two numbers are congruent mod $m$ if they leave the same remainder — equivalently, if their difference is a multiple of $m$.",
    whyItWorks: "Dividing $a$ by $m$ gives a quotient and a remainder $r$ with $0 \\le r < m$; modular arithmetic throws away the quotient and keeps $r$. Because adding or multiplying only cares about remainders (the multiples of $m$ contribute nothing extra mod $m$), you can reduce at every step to keep numbers small. For powers like $3^3 \\bmod 11$: $27 = 2\\cdot 11 + 5$, so the remainder is $5$. The 'wrap' is just repeatedly subtracting the modulus until you land in the range $0$ to $m-1$.",
    whenToUse: "Clock and calendar arithmetic, cycling through a fixed set of states, checksums and hashing, cryptography, and any 'every $k$th' or 'wraps around' pattern.",
    representations: [
      { kind: "clock", label: "Wrap-around counting", body: "$14 \\bmod 12 = 2$: after passing $12$, the count restarts from $0$." },
      { kind: "remainder", label: "Keep the remainder", body: "$3^3 = 27 = 2\\cdot 11 + 5$, so $3^3 \\equiv 5 \\pmod{11}$." },
      { kind: "real_world", label: "Repeating cycles", body: "Day $100$ of a $7$-day week is day $100 \\bmod 7 = 2$ of the cycle." }
    ],
    commonMistakes: [
      { label: "Reporting the full value, not the remainder", why: "Answering $27$ for $3^3 \\pmod{11}$ instead of reducing.", fix: "Divide by the modulus and keep only the remainder: $27 \\bmod 11 = 5$." },
      { label: "Letting the remainder fall outside $0..m-1$", why: "Writing a remainder of $11$ or a negative value mod $11$.", fix: "The remainder must satisfy $0 \\le r < m$; add or subtract $m$ until it lands in range." }
    ],
    connections: [
      { concept: "arithmetic_div", note: "The modulus is the remainder part of integer division." },
      { concept: "totient", note: "Euler's totient theorem uses modular powers to simplify huge exponents." }
    ],
    examples: [
      { question: "Evaluate $3^3 \\pmod{11}$.", answer: "5", explanation: "$3^3 = 27 = 2\\cdot 11 + 5$, so the remainder is $5$." },
      { question: "Evaluate $(9 \\times 8) \\pmod{11}$.", answer: "6", explanation: "$72 = 6\\cdot 11 + 6$, so $72 \\equiv 6 \\pmod{11}$." }
    ]
  },

  totient: {
    title: "Euler's Totient Function",
    formula: "\\phi(p\\,q) = (p-1)(q-1) \\quad (p, q \\text{ distinct primes})",
    oneLineSummary: "$\\phi(n)$ counts how many numbers from $1$ to $n$ share no common factor with $n$ — the integers 'coprime' to it.",
    intuitionHook: "How many numbers up to $10$ share no factor with $10$ (besides $1$)? Cross out the evens and the multiples of $5$; what's left is $\\{1, 3, 7, 9\\}$ — four of them. So $\\phi(10) = 4$. The totient measures how much of $n$'s range is 'relatively prime' to it.",
    whatItIs: "Euler's totient $\\phi(n)$ is the count of integers in $1, 2, \\dots, n$ that are coprime to $n$ (greatest common divisor $1$).",
    whyItWorks: "A number is coprime to $n$ when it shares none of $n$'s prime factors. For a prime $p$, EVERY smaller positive integer is coprime to it, so $\\phi(p) = p - 1$. The function is multiplicative on coprime parts: if $n = p\\,q$ with $p, q$ distinct primes, then $\\phi(pq) = \\phi(p)\\phi(q) = (p-1)(q-1)$, because the only forbidden numbers are the multiples of $p$ or of $q$. So $\\phi(119) = \\phi(7\\cdot 17) = 6 \\times 16 = 96$ — you never have to list and test all $119$ numbers.",
    whenToUse: "Counting coprime residues, simplifying large modular exponents via Euler's theorem ($a^{\\phi(n)} \\equiv 1 \\pmod n$ when $\\gcd(a,n)=1$), and the key-generation step in RSA cryptography.",
    representations: [
      { kind: "enumeration", label: "Count the coprimes", body: "$\\phi(10)$: coprime to $10$ are $\\{1,3,7,9\\}$, so $\\phi(10) = 4$." },
      { kind: "prime_formula", label: "Product of (prime − 1)", body: "$\\phi(7\\cdot 17) = (7-1)(17-1) = 6\\times 16 = 96$." },
      { kind: "prime_case", label: "Prime modulus", body: "For a prime $p$, all $p-1$ smaller numbers are coprime: $\\phi(13) = 12$." }
    ],
    commonMistakes: [
      { label: "Using $pq$ instead of $(p-1)(q-1)$", why: "Computing $\\phi(15)$ as $15$ or $3\\times 5$ rather than $2\\times 4$.", fix: "Subtract one from EACH prime factor first: $\\phi(15) = (3-1)(5-1) = 8$." },
      { label: "Counting $n$ itself or including non-coprimes", why: "Including numbers that share a factor with $n$ in the count.", fix: "Only count values with $\\gcd = 1$; $n$ itself is never coprime to $n$." }
    ],
    connections: [
      { concept: "modular_arithmetic", note: "Euler's theorem uses $\\phi(n)$ to collapse modular powers $a^{\\phi(n)} \\equiv 1 \\pmod n$." },
      { concept: "gcd_lcm", note: "'Coprime' means a GCD of $1$ — the totient counts how many numbers hit that." }
    ],
    examples: [
      { question: "Evaluate $\\phi(119)$, where $119 = 7 \\times 17$.", answer: "96", explanation: "$\\phi(7\\cdot 17) = (7-1)(17-1) = 6\\times 16 = 96$." },
      { question: "Evaluate $\\phi(13)$ for the prime $13$.", answer: "12", explanation: "For a prime $p$, $\\phi(p) = p - 1 = 12$." }
    ]
  }
};

// Map a (category, level) to a conceptId, mirroring the level thresholds used by
// getLessonAndExamples in lessons.js so the rich content lines up with the path
// the learner actually walks.
function levelToConceptId(category, level) {
  const cat = (category || 'arithmetic').toLowerCase();
  const lvl = Number(level) || 0;

  if (cat === 'arithmetic') {
    if (lvl <= 3) return 'arithmetic_add';
    if (lvl <= 6) return 'arithmetic_sub';
    if (lvl <= 9) return 'arithmetic_mult';
    return 'pemdas';
  }
  if (cat === 'algebra') {
    if (lvl <= 12) return 'linear_one_step';
    if (lvl <= 13) return 'linear_two_step';
    if (lvl <= 14) return 'linear_variable_both_sides';
    if (lvl <= 15) return 'quadratic';
    if (lvl === 16) return 'linear_system';
    if (lvl === 17) return 'matrix_trace';
    if (lvl === 18 || lvl === 19) return 'matrix_determinant';
    // L20 Fermat milestone keeps legacy; 21-23 are Systems II (depth on linear_system).
    if (lvl === 21) return 'linear_system_substitution';
    if (lvl === 22) return 'linear_system_elimination';
    if (lvl === 23) return 'linear_system_solution_types';
    return null;
  }
  if (cat === 'combinatorics') {
    if (lvl <= 22) return 'pigeonhole';
    if (lvl <= 24) return 'permutations'; // L23 n!, L24 multiset permutations
    if (lvl <= 26) return 'combinations'; // L25 nC2, L26 handshakes (also a C(n,2) count)
    return null; // L27+ keep legacy
  }
  if (cat === 'calculus') {
    if (lvl <= 34) return 'derivative';
    if (lvl <= 37) return 'integral';
    return 'limit'; // L38-39
  }
  if (cat === 'number_theory' || cat === 'number theory') {
    if (lvl <= 42) return 'gcd_lcm';
    if (lvl <= 46) return 'modular_arithmetic';
    if (lvl === 47) return 'divisor_count';
    if (lvl === 48 || lvl === 49) return 'totient';
    return null; // L50, L60 milestones keep legacy
  }
  if (cat === 'mental') {
    if (lvl <= 4) return 'percentage';
    return null; // squaring / probability — legacy
  }
  // Strand-based curriculum (audit #1.1): each new strand maps its levels to a rich concept lesson.
  if (cat === 'integers') {
    if (lvl <= 4) return 'absolute_value';
    if (lvl <= 5) return 'integer_add';
    if (lvl <= 6) return 'integer_sub';
    if (lvl <= 7) return 'integer_compare';
    if (lvl <= 8) return 'integer_mult';
    if (lvl <= 10) return 'integer_div';
    return 'integer_ops';
  }
  if (cat === 'decimals') {
    if (lvl <= 3) return 'decimal_add';
    if (lvl <= 4) return 'percent_decimal_convert';
    if (lvl <= 5) return 'decimal_sub';
    if (lvl <= 6) return 'decimal_compare';
    if (lvl <= 7) return 'decimal_mult';
    if (lvl <= 8) return 'fraction_decimal_convert';
    if (lvl <= 10) return 'decimal_round';
    return 'decimal_div';
  }
  if (cat === 'fractions') {
    if (lvl <= 3) return 'fraction_simplify';
    if (lvl <= 4) return 'fraction_add';
    if (lvl <= 5) return 'mixed_number';
    if (lvl <= 6) return 'fraction_sub';
    if (lvl <= 7) return 'fraction_compare';
    if (lvl <= 8) return 'fraction_mult';
    if (lvl <= 9) return 'fraction_div';
    return 'fraction_negative';
  }
  if (cat === 'geometry') {
    if (lvl <= 2) return 'geo_perimeter_rect';
    if (lvl <= 3) return 'geo_area_rect';
    if (lvl <= 4) return 'geo_area_triangle';
    if (lvl <= 5) return 'geo_angles_triangle';
    if (lvl <= 6) return 'geo_volume_rect';
    if (lvl <= 7) return 'geo_surface_area_rect';
    if (lvl <= 8) return 'geo_circumference';
    if (lvl <= 10) return 'geo_volume_cylinder'; // 10 has no template key; closest-below serves 9
    if (lvl <= 11) return 'geo_composite';
    if (lvl <= 12) return 'geo_circle_area';
    if (lvl <= 13) return 'geo_angles_lines';
    if (lvl <= 14) return 'geo_area_parallelogram';
    if (lvl <= 15) return 'geo_area_trapezoid';
    if (lvl <= 16) return 'geo_volume_cone';
    if (lvl <= 17) return 'geo_volume_sphere';
    if (lvl <= 18) return 'geo_volume_pyramid';
    if (lvl <= 19) return 'geo_surface_cylinder';
    if (lvl <= 21) return 'geo_surface_sphere';
    return 'geo_surface_cone';
  }
  if (cat === 'number_sense' || cat === 'number sense') {
    if (lvl <= 6) return 'percentage_of';
    if (lvl <= 7) return 'fraction_of';
    if (lvl <= 8) return 'ratio_solve';
    if (lvl <= 10) return 'percent_change';
    if (lvl <= 11) return 'unit_convert_metric';
    if (lvl <= 12) return 'unit_convert_time';
    if (lvl <= 13) return 'unit_rate';
    if (lvl <= 14) return 'exponent_power';
    if (lvl <= 15) return 'proportion_solve';
    if (lvl <= 16) return 'percent_discount';
    if (lvl <= 17) return 'simple_interest';
    if (lvl <= 18) return 'multi_step_word';
    if (lvl <= 19) return 'percent_markup';
    return 'percent_error';
  }
  if (cat === 'statistics') {
    if (lvl <= 7) return 'stat_mode';
    if (lvl <= 8) return 'stat_mean';
    if (lvl <= 9) return 'stat_median';
    if (lvl <= 11) return 'stat_range';
    if (lvl <= 12) return 'mean_missing_value';
    if (lvl <= 13) return 'stat_probability';
    if (lvl <= 14) return 'compound_probability';
    if (lvl <= 15) return 'probability_complement';
    if (lvl <= 16) return 'prob_without_replacement';
    if (lvl <= 17) return 'stat_quartile';
    if (lvl <= 18) return 'stat_iqr';
    if (lvl <= 19) return 'stat_mad';
    if (lvl <= 21) return 'stat_theoretical_prob';
    if (lvl <= 22) return 'stat_experimental_prob';
    return 'stat_sample_space';
  }
  if (cat === 'powers') {
    if (lvl <= 4) return 'square_root';
    if (lvl <= 5) return 'cube_root';
    if (lvl <= 6) return 'exponent_power_of_product';
    if (lvl <= 7) return 'exponent_product_rule';
    if (lvl <= 8) return 'exponent_power_rule';
    if (lvl <= 9) return 'exponent_quotient_rule';
    if (lvl <= 11) return 'exponent_zero_negative';
    return 'scientific_notation';
  }
  if (cat === 'graphing') {
    if (lvl <= 8) return 'point_on_line';
    if (lvl <= 9) return 'slope_from_points';
    if (lvl <= 11) return 'slope_intercept_id';
    if (lvl <= 13) return 'midpoint';
    if (lvl <= 15) return 'distance_formula';
    if (lvl <= 16) return 'coord_reflect';
    if (lvl <= 17) return 'coord_translate';
    if (lvl <= 18) return 'coord_rotate_180';
    if (lvl <= 19) return 'coord_rotate_90';
    return 'coord_dilate';
  }
  if (cat === 'inequalities') {
    if (lvl <= 7) return 'inequality_one_step_add';
    if (lvl <= 9) return 'inequality_one_step_mult';
    if (lvl <= 11) return 'inequality_flip_negative';
    if (lvl <= 13) return 'inequality_two_step';
    return 'inequality_compound';
  }
  if (cat === 'functions') {
    if (lvl <= 7) return 'function_evaluate';
    if (lvl <= 9) return 'function_table';
    if (lvl <= 11) return 'rate_of_change';
    if (lvl <= 13) return 'function_initial';
    return 'function_solve';
  }
  if (cat === 'sequences') {
    if (lvl <= 7) return 'arithmetic_next_term';
    if (lvl <= 9) return 'arithmetic_common_difference';
    if (lvl <= 11) return 'arithmetic_nth_term';
    if (lvl <= 13) return 'geometric_next_term';
    if (lvl <= 15) return 'geometric_common_ratio';
    if (lvl <= 17) return 'geometric_nth_term';
    if (lvl <= 18) return 'arithmetic_series';
    return 'fibonacci_next';
  }
  if (cat === 'equations') {
    if (lvl <= 7) return 'eqn_onestep_div';
    if (lvl <= 9) return 'eqn_fraction_coeff';
    if (lvl <= 11) return 'eqn_clear_denom';
    if (lvl <= 13) return 'eqn_proportion';
    return 'eqn_two_step_fraction';
  }
  if (cat === 'rates') {
    if (lvl <= 7) return 'ratio_simplify';
    if (lvl <= 9) return 'ratio_share';
    if (lvl <= 11) return 'unit_price';
    if (lvl <= 13) return 'speed_dist_time';
    return 'scale_factor';
  }
  if (cat === 'factors') {
    if (lvl <= 7) return 'prime_factorization';
    if (lvl <= 9) return 'find_gcf';
    if (lvl <= 11) return 'find_lcm';
    if (lvl <= 13) return 'gcf_word';
    return 'lcm_word';
  }
  if (cat === 'expressions') {
    if (lvl <= 11) return 'eval_expression';
    if (lvl <= 12) return 'eval_two_var';
    if (lvl <= 13) return 'combine_like_terms';
    if (lvl <= 14) return 'translate_expression';
    if (lvl <= 15) return 'distribute';
    if (lvl <= 16) return 'foil_binomials';
    if (lvl <= 17) return 'square_binomial';
    return 'factor_trinomial';
  }
  return null;
}

function getConceptLesson(conceptId) {
  if (!conceptId) return null;
  return CONCEPT_LESSONS[conceptId] || null;
}

// Build the API-facing `sections` object from a rich lesson (omits the flat
// fields the response already carries: title/formula/examples).
function buildSections(lesson) {
  if (!lesson) return null;
  return {
    intuitionHook:  lesson.intuitionHook  || null,
    whatItIs:       lesson.whatItIs        || null,
    whyItWorks:     lesson.whyItWorks      || null,
    whenToUse:      lesson.whenToUse       || null,
    representations: lesson.representations || [],
    commonMistakes:  lesson.commonMistakes  || [],
    connections:     lesson.connections     || []
  };
}

module.exports = {
  CONCEPT_LESSONS,
  getConceptLesson,
  levelToConceptId,
  buildSections
};
