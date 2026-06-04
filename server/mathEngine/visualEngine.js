// Interactive Visual Engine
// -----------------------------------------------------------------------------
// Decides WHEN a problem benefits from an interactive manipulative, and emits a
// declarative spec the client renders natively. The engine never renders — it
// only describes "what mathematical object should the learner be able to touch,
// and what idea becomes easier once they do."
//
// Core principle (mirrors the product mission): only attach interaction when a
// concept becomes easier to understand through manipulation. No decorative
// interactivity. Adaptive Visual Intelligence gates *whether* and *how much*
// guidance is offered based on the learner's mastery of the concept.
//
// The spec is intentionally schema-light on the client: the client forwards the
// raw JSON to a canvas renderer, so adding a new visual type requires no client
// model changes.

// ----------------------------------------------------------------------------
// Adaptive Visual Intelligence — progressive complexity gating
// ----------------------------------------------------------------------------
// Returns one of: 'guided' | 'explore' | 'ondemand' | null
//   guided   — beginner: interactive, full scaffolding, opens automatically
//   explore  — intermediate: interactive, reduced guidance, opens automatically
//   ondemand — advanced: interactive but collapsed; learner taps to reveal
//   null     — expert / not useful: no visual attached
function decideComplexity(profile) {
  if (!profile) return 'guided'; // brand-new learner — maximum support
  const mastery  = typeof profile.mastery_score === 'number' ? profile.mastery_score : 0;
  const exposure = typeof profile.exposure_count === 'number' ? profile.exposure_count : 0;

  if (exposure < 3 || mastery < 0.45) return 'guided';
  if (mastery < 0.75)                 return 'explore';
  if (mastery < 0.92)                 return 'ondemand';
  // Expert: avoid creating dependence on visual supports.
  return null;
}

// ----------------------------------------------------------------------------
// LaTeX / text normalisation for tolerant parsing
// ----------------------------------------------------------------------------
function normalize(str) {
  if (!str) return '';
  return String(str)
    .replace(/\$\$?/g, ' ')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\,|\\;|\\!|\\ /g, ' ')
    .replace(/\\\(|\\\)|\\\[|\\\]/g, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.abs(n - Math.round(n)) < 1e-9; }

// ----------------------------------------------------------------------------
// Concept-specific spec builders. Each returns a spec object or null.
// A spec looks like:
//   { type, mode, params:{...}, prompt, goal }
// ----------------------------------------------------------------------------

// Linear equations → balance scale.  Parses  a*x + b = c  (a,b optional/signed).
function buildLinearScale(question) {
  const q = normalize(question);
  // capture: optional coeff, x, optional (+/- b), = c
  const m = q.match(/(-?\d*)\s*x\s*([+-]\s*\d+)?\s*=\s*(-?\d+)/);
  if (!m) return null;

  const a = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : parseInt(m[1], 10));
  const b = m[2] ? parseInt(m[2].replace(/\s+/g, ''), 10) : 0;
  const c = parseInt(m[3], 10);
  if (!isInt(a) || a === 0) return null;

  if (a <= 0) return null;                       // balance metaphor needs a positive count of x-tiles
  const solution = (c - b) / a;
  if (!isInt(solution)) return null;            // keep manipulatives clean (whole blocks)
  if (a > 5 || Math.abs(b) > 20 || Math.abs(c) > 40) return null; // too many blocks to drag

  // A genuine two-step needs BOTH a constant to clear (b≠0) and a coefficient to divide (|a|≠1).
  const twoStep = b !== 0 && Math.abs(a) !== 1;
  return {
    type: 'balance_scale',
    mode: twoStep ? 'two_step' : 'one_step',
    params: { a, b, c, solution },
    prompt: twoStep
      ? 'Keep the scale balanced: remove the same amount from both pans, then split each pan into equal groups.'
      : (b !== 0
          ? 'Remove the same amount from both pans to leave x alone.'
          : 'Split both pans into equal groups to find one x.'),
    goal: 'Discover why doing the same thing to both sides keeps the equation true.'
  };
}

// Quadratics → draggable parabola.  Parses  a*x^2 + b*x + c.
function buildParabola(question) {
  const q = normalize(question).replace(/\s+/g, '');
  // a x^2
  const am = q.match(/(-?\d*)x\^?2/);
  if (!am) return null;
  const a = am[1] === '' || am[1] === '+' ? 1 : (am[1] === '-' ? -1 : parseInt(am[1], 10));
  // b x  (the x term that is NOT x^2)
  let b = 0;
  const bm = q.replace(/(-?\d*)x\^?2/, '').match(/([+-]?\d*)x(?!\^?2)/);
  if (bm && bm[1] !== undefined) b = bm[1] === '' || bm[1] === '+' ? 1 : (bm[1] === '-' ? -1 : parseInt(bm[1], 10));
  // c constant
  let c = 0;
  const cm = q.match(/x\^?2[^=]*?([+-]\d+)\s*(?:=\s*0)?\s*$/);
  if (cm) c = parseInt(cm[1], 10);
  if (!isInt(a) || a === 0) return null;
  if (Math.abs(a) > 4) return null;

  return {
    type: 'parabola',
    mode: 'roots',
    params: { a, b, c },
    prompt: 'Drag the a, b, c sliders. Watch where the curve crosses the x-axis — those are the roots.',
    goal: 'See how each coefficient reshapes the parabola and moves its roots.'
  };
}

// Pythagoras → draggable right triangle (legs adjustable, hypotenuse live).
function buildRightTriangle(question, conceptId) {
  if (conceptId !== 'pythagorean') return null;
  const q = normalize(question);
  // try to seed with two leg lengths if present
  let a = 3, b = 4;
  const legs = q.match(/(\d+)\D+(\d+)/);
  if (legs) {
    const x = parseInt(legs[1], 10), y = parseInt(legs[2], 10);
    if (x > 0 && x <= 12 && y > 0 && y <= 12) { a = x; b = y; }
  }
  return {
    type: 'right_triangle',
    mode: 'explore',
    params: { a, b },
    prompt: 'Drag a leg. The squares on each side update live — watch a² + b² stay equal to c².',
    goal: 'Feel why the square on the hypotenuse equals the sum of the squares on the legs.'
  };
}

// Fractions → bar / area model.  Triggers on any \frac{n}{d} in the question.
function buildFractionBar(question) {
  const fracs = [];
  const re = /\\frac\s*\{?\s*(\d+)\s*\}?\s*\{?\s*(\d+)\s*\}?/g;
  let m;
  while ((m = re.exec(question)) !== null) {
    const n = parseInt(m[1], 10), d = parseInt(m[2], 10);
    if (d > 0 && d <= 12 && n >= 0 && n <= d * 2) fracs.push({ n, d });
    if (fracs.length >= 2) break;
  }
  if (fracs.length === 0) return null;

  const adding = /\+/.test(normalize(question)) && fracs.length === 2;
  return {
    type: 'fraction_bar',
    mode: adding ? 'add' : (fracs.length === 2 ? 'compare' : 'build'),
    params: { fractions: fracs },
    prompt: adding
      ? 'Drag the slices together. Notice you can only add them once the pieces are the same size.'
      : (fracs.length === 2
          ? 'Resize the bars to compare. Equal shaded area means equal fractions.'
          : 'Tap segments to shade. Build the fraction and see the part-of-whole.'),
    goal: adding
      ? 'Discover why fractions need a common denominator before they can be added.'
      : 'Connect the symbol to the shaded area it represents.'
  };
}

// Probability → dice simulator with running mean (also a live statistics view).
function buildDiceSim(question) {
  const q = normalize(question).toLowerCase();
  if (!/\b(die|dice|six-sided|fair .*roll|expected value of a (?:single )?roll)\b/.test(q)) return null;
  return {
    type: 'dice_sim',
    mode: 'expected_value',
    params: { faces: 6 },
    prompt: 'Roll many times. Watch the running average settle toward the expected value.',
    goal: 'Experience how the long-run average of outcomes approaches the expected value.'
  };
}

// Arithmetic / modular → number line hops.
function buildNumberLine(question, conceptId) {
  const q = normalize(question);
  // modular: a mod m  /  a \pmod m
  const mod = q.match(/(\d+)\s*(?:mod|\\pmod)\s*(\d+)/i) || q.match(/(\d+)\s*%\s*(\d+)/);
  if (mod && (conceptId === 'modular_arithmetic' || /mod/i.test(q))) {
    const a = parseInt(mod[1], 10), m = parseInt(mod[2], 10);
    if (m > 0 && m <= 12 && a <= 60) {
      return {
        type: 'number_line',
        mode: 'modulo',
        params: { value: a, modulus: m },
        prompt: 'Step forward in jumps of the modulus. Where you land is the remainder.',
        goal: 'See the remainder as the leftover distance after equal jumps.'
      };
    }
  }
  // simple addition / subtraction
  if (conceptId === 'arithmetic_add' || conceptId === 'arithmetic_sub') {
    const add = q.match(/(-?\d+)\s*([+-])\s*(-?\d+)/);
    if (add) {
      const x = parseInt(add[1], 10), op = add[2], y = parseInt(add[3], 10);
      if (Math.abs(x) <= 20 && Math.abs(y) <= 20) {
        return {
          type: 'number_line',
          mode: 'jump',
          params: { start: x, delta: op === '-' ? -y : y },
          prompt: op === '-' ? 'Hop left to subtract.' : 'Hop right to add.',
          goal: 'Anchor the operation as movement along the number line.'
        };
      }
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Master dispatcher
// ----------------------------------------------------------------------------
const BUILDERS = [
  (problem, conceptId) => buildLinearScale(problem.question),
  (problem, conceptId) => buildParabola(problem.question),
  (problem, conceptId) => buildRightTriangle(problem.question, conceptId),
  (problem, conceptId) => buildFractionBar(problem.question),
  (problem, conceptId) => buildDiceSim(problem.question),
  (problem, conceptId) => buildNumberLine(problem.question, conceptId)
];

// Returns a full spec (with adaptive metadata) or null.
//   problem        : { question, correctAnswer, ... }
//   conceptId      : knowledge-graph concept id (may be null)
//   learnerProfile : { mastery_score, exposure_count } or null
function buildVisualSpec(problem, conceptId, learnerProfile) {
  if (!problem || !problem.question) return null;

  const complexity = decideComplexity(learnerProfile);
  if (!complexity) return null; // expert — no dependence on visual supports

  let spec = null;
  for (const build of BUILDERS) {
    try {
      spec = build(problem, conceptId);
    } catch (_) {
      spec = null;
    }
    if (spec) break;
  }
  if (!spec) return null;

  spec.complexity  = complexity;
  spec.interactive = true;
  spec.collapsed   = complexity === 'ondemand';
  // Guidance text is strongest for beginners; trimmed for explorers.
  if (complexity === 'explore') spec.goal = null;
  return spec;
}

// Convenience: returns the JSON string the client forwards to its renderer, or null.
function buildVisualSpecJson(problem, conceptId, learnerProfile) {
  const spec = buildVisualSpec(problem, conceptId, learnerProfile);
  return spec ? JSON.stringify(spec) : null;
}

module.exports = {
  buildVisualSpec,
  buildVisualSpecJson,
  decideComplexity
};
