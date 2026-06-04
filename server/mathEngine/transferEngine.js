// Transfer Engine — generates "transfer" problems: the SAME underlying concept dressed in a NEW,
// unfamiliar context or representation (a word problem, a real-world scenario, a reverse framing).
//
// Why this exists: drilling `3 + 4` proves you can execute the procedure; it does NOT prove you
// understand addition. Transfer is the real test of understanding — can the learner recognise that
// an unfamiliar situation calls for this concept and apply it? Success here feeds the `transfer`
// mastery dimension (masteryEngine.js), which is earned ONLY out-of-context.
//
// Pure & deterministic given its inputs (no DB / IO) — unit-tested in test/transfer.test.js.

const { generateDistractors } = require('./distractors');
const { generatePythagoreanTriple } = require('./symbolic');

// Scale a base integer by difficulty, keeping it a sensible whole number ≥ min.
const scale = (base, diffFactor, min = 1) => Math.max(min, Math.round(base * (diffFactor || 1)));

// Authored transfer templates, keyed by conceptId. Each takes (diffFactor, idx) and returns
// { question, answer, explanation, params, context }. The framing is deliberately different from
// how the concept is drilled in templates.js — that contrast is the whole point.
const TRANSFER_TEMPLATES = {
  arithmetic_add: (diff, idx) => {
    const a = scale(6 + (idx % 5), diff, 2);
    const b = scale(4 + ((idx + 2) % 6), diff, 2);
    return {
      question: `A library receives ${a} books on Monday and ${b} more on Tuesday. How many books did it receive in total?`,
      answer: a + b,
      explanation: `Combining the two deliveries means adding them: ${a} + ${b} = ${a + b}.`,
      params: { a, b },
      context: 'real-world',
    };
  },
  arithmetic_sub: (diff, idx) => {
    const total = scale(18 + (idx % 10), diff, 6);
    const used = scale(5 + ((idx + 1) % 6), diff, 2);
    const a = Math.max(total, used + 1);
    return {
      question: `A water tank holds ${a} litres. After ${used} litres are used, how many litres remain?`,
      answer: a - used,
      explanation: `"How many remain" means taking away what was used: ${a} − ${used} = ${a - used}.`,
      params: { a, b: used },
      context: 'real-world',
    };
  },
  arithmetic_mult: (diff, idx) => {
    const rows = scale(4 + (idx % 5), diff, 2);
    const seats = scale(5 + ((idx + 3) % 5), diff, 2);
    return {
      question: `A theatre has ${rows} rows with ${seats} seats in each row. How many seats are there in total?`,
      answer: rows * seats,
      explanation: `Equal groups call for multiplication: ${rows} rows × ${seats} seats = ${rows * seats}.`,
      params: { a: rows, b: seats },
      context: 'real-world',
    };
  },
  arithmetic_div: (diff, idx) => {
    const groups = scale(3 + (idx % 4), diff, 2);
    const each = scale(4 + ((idx + 2) % 5), diff, 2);
    const total = groups * each;
    return {
      question: `${total} cookies are shared equally among ${groups} children. How many cookies does each child get?`,
      answer: each,
      explanation: `Sharing equally means dividing: ${total} ÷ ${groups} = ${each}.`,
      params: { dividend: total, a: groups },
      context: 'real-world',
    };
  },
  pemdas: (diff, idx) => {
    const packs = scale(3 + (idx % 4), diff, 2);
    const perPack = scale(4 + ((idx + 1) % 4), diff, 2);
    const lost = scale(2 + ((idx + 2) % 5), diff, 1);
    return {
      question: `You buy ${packs} packs of pens with ${perPack} pens in each pack, then lose ${lost} pens. How many pens do you have left?`,
      answer: packs * perPack - lost,
      explanation: `Work out the packs first (multiplication before subtraction): ${packs} × ${perPack} = ${packs * perPack}, then ${packs * perPack} − ${lost} = ${packs * perPack - lost}.`,
      params: { a: packs, b: perPack, c: lost },
      context: 'real-world',
    };
  },
  pythagorean: (diff) => {
    const t = generatePythagoreanTriple(diff || 1);
    return {
      question: `A ladder leans against a wall. Its base is ${t.a} m from the wall and the top reaches ${t.b} m up the wall. How long is the ladder (in metres)?`,
      answer: t.c,
      explanation: `The wall, ground and ladder form a right triangle, so the ladder is the hypotenuse: √(${t.a}² + ${t.b}²) = √${t.a * t.a + t.b * t.b} = ${t.c}.`,
      params: { a: t.a, b: t.b, c: t.c },
      context: 'geometry-applied',
    };
  },
  linear_one_step: (diff, idx) => {
    const start = scale(5 + (idx % 8), diff, 2);
    const gained = scale(3 + ((idx + 2) % 7), diff, 2);
    const total = start + gained;
    return {
      question: `Maria collects stickers. After a friend gives her ${gained} more, she has ${total}. How many stickers did she start with?`,
      answer: start,
      explanation: `If x + ${gained} = ${total}, undo the addition: x = ${total} − ${gained} = ${start}.`,
      params: { a: gained, b: total },
      context: 'reverse',
    };
  },
  linear_two_step: (diff, idx) => {
    const perKm = scale(2 + (idx % 4), diff, 2);
    const base = scale(3 + ((idx + 1) % 5), diff, 2);
    const km = scale(2 + ((idx + 2) % 6), diff, 2);
    const cost = perKm * km + base;
    return {
      question: `A taxi charges a $${base} base fare plus $${perKm} per kilometre. A ride cost $${cost} in total. How many kilometres was the ride?`,
      answer: km,
      explanation: `The cost is ${perKm}·x + ${base} = ${cost}. Subtract the base fare: ${perKm}·x = ${cost - base}; then divide: x = ${km}.`,
      params: { a: perKm, b: base, c: cost },
      context: 'real-world',
    };
  },
};

// Concept ids that have an authored transfer framing.
const TRANSFER_CONCEPTS = Object.keys(TRANSFER_TEMPLATES);

function hasTransfer(conceptId) {
  return !!TRANSFER_TEMPLATES[conceptId];
}

// Build a transfer problem for a concept, or null if the concept has no transfer framing yet.
// Shape matches what the client expects (question/correctAnswer/options/explanation) plus
// transfer metadata used for recording the out-of-context outcome.
function buildTransferProblem(conceptId, diffFactor = 1, idx = 0) {
  const template = TRANSFER_TEMPLATES[conceptId];
  if (!template) return null;

  const raw = template(diffFactor, idx);
  const correct = raw.answer.toString();

  // Misconception-aligned distractors where the params allow, else numeric offsets.
  const dList = generateDistractors(raw.answer, conceptId, { ...raw.params, distractors: [] });
  const options = new Set([correct]);
  for (const d of dList) {
    if (options.size >= 4) break;
    options.add(d.toString());
  }
  let offset = 1;
  while (options.size < 4) {
    const v = Number(correct) + offset;
    if (v >= 0 && v.toString() !== correct) options.add(v.toString());
    offset = offset > 0 ? -offset : -offset + 1;
  }
  const shuffled = Array.from(options);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    conceptId,
    question: raw.question,
    correctAnswer: correct,
    options: shuffled,
    explanation: raw.explanation,
    transferContext: raw.context,
    isTransfer: true,
  };
}

module.exports = {
  TRANSFER_TEMPLATES,
  TRANSFER_CONCEPTS,
  hasTransfer,
  buildTransferProblem,
};
