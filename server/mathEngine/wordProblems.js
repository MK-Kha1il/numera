// Word-Problem Generator — the missing "applied math" capability (ultra review #9 / edu#5).
//
// The catalog was entirely symbolic: "compute 0.2 × 80", never "a $80 jacket is 20% off — what's
// the sale price?". Word problems are the single most-tested real-world skill, and the hardest part
// is almost always *choosing the operation*, not the arithmetic. So each template here is built
// around one real context (shopping, change, discounts, rates, sharing, tips) and its distractors
// are the classic operation-choice slips — added instead of multiplied, used the discount as the
// price, divided the wrong way — so a wrong tap reveals a real misconception, not a careless sum.
//
// Pure (no DB/IO). Deterministic given a seed (mulberry32) so the set is reproducible and testable.
// Answers are kept "clean" by construction (whole-dollar / .50 results) — number ranges are chosen
// per template so a learner never fights an ugly decimal on top of parsing the story.

// Deterministic RNG so a given seed always yields the same problem (reproducible + unit-testable).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const randint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

// Money formatter: whole dollars stay whole; cents only when needed.
const money = (n) => '$' + (Number.isInteger(n) ? String(n) : n.toFixed(2));

// Parse a formatted answer ("$50", "120 miles") back into a numeric value + a same-format renderer,
// so the option backfill can synthesize near-miss distractors that match the answer's units.
function answerShape(ans) {
  const s = String(ans);
  if (s.startsWith('$')) return { val: parseFloat(s.slice(1)), render: (n) => money(n) };
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (m) return { val: parseFloat(m[1]), render: (n) => `${n} ${m[2]}`.trim() };
  return null;
}

const NAMES = ['Maya', 'Leo', 'Aisha', 'Sam', 'Priya', 'Diego', 'Noah', 'Zoe', 'Omar', 'Lily'];
const ITEMS = ['notebook', 'water bottle', 'pencil case', 'comic book', 'sticker pack', 'lunchbox'];
const VEHICLES = ['train', 'car', 'cyclist', 'bus'];

// Each template: skill = the underlying operation, minLevel = when it starts appearing, and
// gen(rng) → { question, answer, distractors[3], explanation }. Distractors are operation-choice
// errors (the real word-problem trap), never just answer±1.
const TEMPLATES = [
  {
    skill: 'multiplication',
    minLevel: 1,
    gen(rng) {
      const item = pick(rng, ITEMS);
      const name = pick(rng, NAMES);
      const price = randint(rng, 2, 9);
      const qty = randint(rng, 3, 8);
      const total = price * qty;
      return {
        question: `One ${item} costs ${money(price)}. ${name} buys ${qty} of them. How much do they spend in total?`,
        answer: money(total),
        distractors: [money(price + qty), money(total - price), money(total + price)],
        explanation: `"Each" repeated ${qty} times means multiply: ${qty} × ${money(price)} = ${money(total)}.`,
      };
    },
  },
  {
    skill: 'subtraction',
    minLevel: 1,
    gen(rng) {
      const item = pick(rng, ITEMS);
      const name = pick(rng, NAMES);
      const bill = pick(rng, [20, 50, 100]);
      const cost = randint(rng, 3, bill - 3);
      const change = bill - cost;
      return {
        question: `${name} pays for a ${item} that costs ${money(cost)} with a ${money(bill)} note. How much change should they get back?`,
        answer: money(change),
        distractors: [money(bill + cost), money(cost), money(Math.abs(change - 1))],
        explanation: `Change is what's left from the note: ${money(bill)} − ${money(cost)} = ${money(change)}.`,
      };
    },
  },
  {
    skill: 'unit_rate',
    minLevel: 2,
    gen(rng) {
      const item = pick(rng, ITEMS);
      const each = randint(rng, 2, 9);
      const qty = randint(rng, 3, 8);
      const total = each * qty;
      return {
        question: `${qty} identical ${item}s cost ${money(total)} altogether. What is the price of one ${item}?`,
        answer: money(each),
        distractors: [money(total * 1 + qty), money(total - qty), money(each + qty)],
        explanation: `Split the total evenly: ${money(total)} ÷ ${qty} = ${money(each)} each.`,
      };
    },
  },
  {
    skill: 'sharing_division',
    minLevel: 2,
    gen(rng) {
      const name = pick(rng, NAMES);
      const each = randint(rng, 3, 9);
      const friends = randint(rng, 2, 6);
      const total = each * friends;
      return {
        question: `${name} shares ${money(total)} equally among ${friends} friends. How much does each friend get?`,
        answer: money(each),
        distractors: [money(total), money(total - friends), money(each * friends - each)],
        explanation: `Equal shares means divide: ${money(total)} ÷ ${friends} = ${money(each)} each.`,
      };
    },
  },
  {
    skill: 'rate_distance',
    minLevel: 3,
    gen(rng) {
      const vehicle = pick(rng, VEHICLES);
      const speed = pick(rng, [30, 40, 50, 60]);
      const hours = randint(rng, 2, 4);
      const dist = speed * hours;
      return {
        question: `A ${vehicle} travels at ${speed} mph for ${hours} hours. How far does it go?`,
        answer: `${dist} miles`,
        distractors: [`${speed + hours} miles`, `${dist + speed} miles`, `${Math.round(speed / hours)} miles`],
        explanation: `Distance = speed × time = ${speed} × ${hours} = ${dist} miles.`,
      };
    },
  },
  {
    skill: 'percent_discount',
    minLevel: 3,
    gen(rng) {
      const item = pick(rng, ITEMS);
      const price = pick(rng, [20, 40, 60, 80, 100]);
      // 50%-off is excluded here: it makes the discount equal the sale price, which would collide
      // the "answered the discount" distractor with the correct answer.
      const pct = pick(rng, [10, 20, 25]);
      const off = (price * pct) / 100;
      const sale = price - off;
      return {
        question: `A ${item} is priced at ${money(price)} and is ${pct}% off. What is the sale price?`,
        answer: money(sale),
        // Classic slips: answered the discount amount; forgot to subtract; added instead.
        distractors: [money(off), money(price), money(price + off)],
        explanation: `${pct}% of ${money(price)} is ${money(off)} off, so the sale price is ${money(price)} − ${money(off)} = ${money(sale)}.`,
      };
    },
  },
  {
    skill: 'percent_tip',
    minLevel: 4,
    gen(rng) {
      const name = pick(rng, NAMES);
      const meal = pick(rng, [20, 40, 60, 80]);
      const pct = pick(rng, [10, 15, 20]);
      const tip = (meal * pct) / 100;
      const total = meal + tip;
      return {
        question: `${name}'s meal costs ${money(meal)}. They add a ${pct}% tip. What is the total bill?`,
        answer: money(total),
        distractors: [money(tip), money(meal - tip), money(meal + pct)],
        explanation: `The tip is ${pct}% of ${money(meal)} = ${money(tip)}, so the total is ${money(meal)} + ${money(tip)} = ${money(total)}.`,
      };
    },
  },
];

// Build a single MCQ word problem for the given seed + level. Shape matches the generator's other
// problems (question / correctAnswer / options / explanation) so the existing gameplay grades it.
function generateWordProblem(seed, level = 1) {
  const rng = mulberry32(seed);
  const eligible = TEMPLATES.filter((t) => t.minLevel <= level);
  const pool = eligible.length ? eligible : TEMPLATES;
  const tpl = pool[Math.floor(rng() * pool.length)];
  const p = tpl.gen(rng);

  // Build 4 unique options (answer + 3 distractors), dropping any that collide with the answer or
  // each other (e.g. two operation slips that happen to land on the same value).
  const seen = new Set([p.answer]);
  const options = [p.answer];
  for (const d of p.distractors) {
    if (!seen.has(d)) {
      seen.add(d);
      options.push(d);
    }
  }
  // Safety net: if collisions left fewer than 4 options, backfill with near-miss values in the same
  // format (money or "<n> units") so every problem still presents a full 4-choice question.
  if (options.length < 4) {
    const shape = answerShape(p.answer);
    for (const delta of [2, 3, 5, 1, 4, 7, 10] ) {
      if (options.length >= 4 || !shape) break;
      const cand = shape.render(shape.val + delta);
      if (!seen.has(cand)) {
        seen.add(cand);
        options.push(cand);
      }
    }
  }
  // Shuffle (Fisher–Yates with the same rng) so the answer isn't always first.
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    question: p.question,
    correctAnswer: p.answer,
    options,
    explanation: p.explanation,
    skill: tpl.skill,
    category: 'Word Problems',
  };
}

// Assemble a set of `count` word problems for a session (deduped by question text).
function buildWordProblemSet(count, level = 1, seed = Date.now()) {
  const out = [];
  const seenQ = new Set();
  let i = 0;
  const guard = count * 8;
  while (out.length < count && i < guard) {
    const p = generateWordProblem(seed + i * 101 + out.length * 7, level);
    if (p.question && !seenQ.has(p.question) && p.options.length >= 3) {
      seenQ.add(p.question);
      out.push(p);
    }
    i++;
  }
  return out;
}

module.exports = { generateWordProblem, buildWordProblemSet, TEMPLATES };
