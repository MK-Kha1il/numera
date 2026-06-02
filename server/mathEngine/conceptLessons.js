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
