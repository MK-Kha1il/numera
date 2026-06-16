// Estimation / number-sense generator (ultra review edu#16). The catalog trains exact computation
// but never ESTIMATION — yet judging "about how big should this be?" is the foundation that catches
// every place-value and operation blunder before it happens. Each problem shows a computation and
// asks for the BEST estimate; the strategy is to round each part to a friendly number, so the
// distractors are the classic number-sense failures: an order of magnitude off (place-value slips)
// and choosing the wrong operation. The correct option is, by construction, genuinely the closest
// to the real value — so a good estimator can also just reason it out.
//
// Pure (no DB/IO). Deterministic given a seed (mulberry32) so a set is reproducible and testable.

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
const randint = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
const roundTo = (n, step) => Math.round(n / step) * step;

// Each template: skill + minLevel + gen(rng, level) → { question, answer, distractors[3], explanation,
// actual }. `answer`/`distractors` are STRINGS; `actual` is the true value (used only to assert, in
// tests, that the stated answer really is the closest option). Distractors: one order of magnitude
// up, one down, and one wrong-operation estimate — all clearly farther from `actual` than `answer`.
const TEMPLATES = [
  {
    skill: 'estimate_product',
    minLevel: 1,
    gen(rng, level) {
      const span = level >= 4 ? 90 : 40;
      const a = randint(rng, 12, 12 + span);
      const b = randint(rng, 12, 12 + span);
      const actual = a * b;
      const est = roundTo(a, 10) * roundTo(b, 10); // round each factor, then multiply
      return {
        question: `About how big is ${a} × ${b}?`,
        answer: String(est),
        distractors: [
          String(est * 10),
          String(Math.max(1, Math.round(est / 10))),
          String(roundTo(a, 10) + roundTo(b, 10)), // added the rounded factors instead of multiplying
        ],
        explanation: `Round each factor: ${a} ≈ ${roundTo(a, 10)} and ${b} ≈ ${roundTo(b, 10)}, so ${roundTo(a, 10)} × ${roundTo(b, 10)} = ${est}.`,
        actual,
      };
    },
  },
  {
    skill: 'estimate_sum',
    minLevel: 1,
    gen(rng, level) {
      const hi = level >= 4 ? 9000 : 900;
      const a = randint(rng, 110, hi);
      const b = randint(rng, 110, hi);
      // Always round to the nearest 100 (never 1000 — that can round a small addend to zero).
      const step = 100;
      const actual = a + b;
      const est = roundTo(a, step) + roundTo(b, step);
      return {
        question: `Estimate ${a} + ${b}.`,
        answer: String(est),
        distractors: [
          String(est * 10),
          String(Math.max(1, Math.round(est / 10))),
          String(Math.abs(roundTo(a, step) - roundTo(b, step))), // subtracted instead of adding
        ],
        explanation: `Round each number: ${a} ≈ ${roundTo(a, step)} and ${b} ≈ ${roundTo(b, step)}, so the sum is about ${est}.`,
        actual,
      };
    },
  },
  {
    skill: 'estimate_quotient',
    minLevel: 2,
    gen(rng, level) {
      const divisor = randint(rng, 18, level >= 4 ? 90 : 42);
      const quotient = randint(rng, 8, 40);
      const dividend = divisor * quotient + randint(rng, 0, divisor - 1);
      const est = roundTo(dividend, 100) / Math.max(10, roundTo(divisor, 10));
      const estRounded = Math.max(1, Math.round(est));
      const actual = dividend / divisor;
      return {
        question: `About how many times does ${divisor} go into ${dividend}?`,
        answer: String(estRounded),
        distractors: [
          String(estRounded * 10),
          String(Math.max(1, Math.round(estRounded / 10))),
          String(roundTo(dividend, 100)), // forgot to divide — kept the dividend's magnitude
        ],
        explanation: `Round to friendly numbers: ${dividend} ≈ ${roundTo(dividend, 100)} and ${divisor} ≈ ${Math.max(10, roundTo(divisor, 10))}, so ${roundTo(dividend, 100)} ÷ ${Math.max(10, roundTo(divisor, 10))} ≈ ${estRounded}.`,
        actual,
      };
    },
  },
  {
    skill: 'estimate_percent',
    minLevel: 3,
    gen(rng) {
      const pct = randint(rng, 1, 9) * 10 + [1, -1, 0][randint(rng, 0, 2)]; // near a round 10%
      const base = randint(rng, 2, 9) * 100 + randint(rng, 1, 99);
      const roundPct = roundTo(pct, 10);
      const roundBase = roundTo(base, 100);
      const est = (roundPct / 100) * roundBase;
      const actual = (pct / 100) * base;
      return {
        question: `About what is ${pct}% of ${base}?`,
        answer: String(est),
        distractors: [
          String(est * 10),
          String(Math.max(1, Math.round(est / 10))),
          String(roundPct + roundBase), // added the percent to the amount instead of scaling
        ],
        explanation: `Round to ${roundPct}% of ${roundBase}: that's ${roundPct / 100} × ${roundBase} = ${est}.`,
        actual,
      };
    },
  },
];

// Build one estimation MCQ for the seed + level. Shape matches the generator's other problems
// (question / correctAnswer / options / explanation) so existing gameplay grades it.
function generateEstimationProblem(seed, level = 1) {
  const rng = mulberry32(seed);
  const eligible = TEMPLATES.filter((t) => t.minLevel <= level);
  const pool = eligible.length ? eligible : TEMPLATES;
  const tpl = pool[Math.floor(rng() * pool.length)];
  const p = tpl.gen(rng, level);

  const seen = new Set([p.answer]);
  const options = [p.answer];
  for (const d of p.distractors) {
    if (!seen.has(d)) {
      seen.add(d);
      options.push(d);
    }
  }
  // Backfill (rare collisions) with order-of-magnitude variants so there are always 4 choices.
  const base = parseInt(p.answer, 10);
  for (const f of [2, 5, 3, 20]) {
    if (options.length >= 4) break;
    const cand = String(base * f);
    if (!seen.has(cand)) {
      seen.add(cand);
      options.push(cand);
    }
  }
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
    category: 'Estimation',
    _actual: p.actual, // test-only: lets a test confirm the stated answer is the closest option
  };
}

function buildEstimationSet(count, level = 1, seed = Date.now()) {
  const out = [];
  const seenQ = new Set();
  let i = 0;
  const guard = count * 8;
  while (out.length < count && i < guard) {
    const p = generateEstimationProblem(seed + i * 131 + out.length * 7, level);
    if (p.question && !seenQ.has(p.question) && p.options.length >= 3) {
      seenQ.add(p.question);
      // Strip the test-only field from the served payload.
      const { _actual, ...served } = p;
      out.push(served);
    }
    i++;
  }
  return out;
}

module.exports = { generateEstimationProblem, buildEstimationSet, TEMPLATES };
