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
    if (lvl <= 13) return 'linear_one_step';
    if (lvl <= 16) return 'linear_two_step';
    return null; // matrices etc. — legacy lessons handle these
  }
  if (cat === 'mental') {
    if (lvl <= 4) return 'percentage';
    return null; // squaring / probability — legacy
  }
  // Strand-based curriculum (audit #1.1): each new strand maps its levels to a rich concept lesson.
  if (cat === 'geometry') {
    if (lvl <= 2) return 'geo_perimeter_rect';
    if (lvl <= 3) return 'geo_area_rect';
    if (lvl <= 4) return 'geo_area_triangle';
    if (lvl <= 5) return 'geo_angles_triangle';
    return 'geo_circle_area';
  }
  if (cat === 'number_sense' || cat === 'number sense') {
    if (lvl <= 6) return 'percentage_of';
    if (lvl <= 7) return 'fraction_of';
    if (lvl <= 8) return 'ratio_solve';
    if (lvl <= 9) return 'percent_change';
    return 'exponent_power';
  }
  if (cat === 'statistics') {
    if (lvl <= 7) return 'stat_mode';
    if (lvl <= 8) return 'stat_mean';
    if (lvl <= 9) return 'stat_median';
    if (lvl <= 11) return 'stat_range';
    return 'stat_probability';
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
