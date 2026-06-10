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
    if (lvl <= 14) return 'linear_two_step';
    if (lvl <= 15) return 'quadratic';
    // L16 template generates a linear_system (sum/difference) — keep legacy; the matrix concepts
    // align with their templates: L17 = trace, L18/L19 = determinant.
    if (lvl === 17) return 'matrix_trace';
    if (lvl === 18 || lvl === 19) return 'matrix_determinant';
    return null; // L16 linear_system + L20 Fermat milestone keep legacy
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
    return null; // limits (L38-39) keep legacy
  }
  if (cat === 'number_theory' || cat === 'number theory') {
    if (lvl <= 42) return 'gcd_lcm';
    if (lvl <= 46) return 'modular_arithmetic';
    if (lvl === 48 || lvl === 49) return 'totient';
    return null; // L47 divisors / L50,L60 milestones keep legacy
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
    return 'integer_mult';
  }
  if (cat === 'decimals') {
    if (lvl <= 3) return 'decimal_add';
    if (lvl <= 5) return 'decimal_sub';
    if (lvl <= 7) return 'decimal_mult';
    if (lvl <= 9) return 'decimal_round';
    return 'decimal_div';
  }
  if (cat === 'fractions') {
    if (lvl <= 3) return 'fraction_simplify';
    if (lvl <= 4) return 'fraction_add';
    if (lvl <= 6) return 'fraction_sub';
    if (lvl <= 8) return 'fraction_mult';
    return 'fraction_div';
  }
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
  if (cat === 'powers') {
    if (lvl <= 4) return 'square_root';
    if (lvl <= 7) return 'exponent_product_rule';
    if (lvl <= 9) return 'exponent_quotient_rule';
    if (lvl <= 11) return 'exponent_zero_negative';
    return 'scientific_notation';
  }
  if (cat === 'expressions') {
    if (lvl <= 11) return 'eval_expression';
    if (lvl <= 12) return 'eval_two_var';
    if (lvl <= 13) return 'combine_like_terms';
    return 'distribute';
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
