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
//
// As of the 2026-06 redesign the "when / how much" decision is delegated to the
// Visualization Benefit Engine (visualBenefit.js), and every spec is enriched from
// the Concept Visualization Metadata registry (visualMetadata.js): learning goal,
// reflection prompt, interaction primitives, feedback rules, and the concept's real
// misconceptions. The builders below only describe the manipulable object.

const { scoreVisualBenefit } = require('./visualBenefit');
const {
  MODEL_CONCEPTS, modelFor, isVisualConcept, enrichSpec
} = require('./visualMetadata');

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
    prompt: 'Choose your moves — only moves applied to BOTH pans keep the scale true. Get x alone, then count what it equals.',
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
    prompt: 'Predict where the curve crosses the x-axis, then drag a slider and check yourself against the grid.',
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
    prompt: 'Drag a leg, then count the grid cells in the two squares — their total is c². What must c be?',
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
      ? 'Resplit the bars yourself (drag ⇕) until the pieces match — only same-size pieces can be counted together.'
      : (fracs.length === 2
          ? 'Predict which fraction is bigger FIRST — then check your call against the bars.'
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

// Percentages → ten-cell percent bar.  Parses  p% of N  (LaTeX \% tolerated).
function buildPercentBar(question) {
  const q = normalize(question).replace(/\\%/g, '%');
  const m = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const percent = parseFloat(m[1]);
  const base = parseFloat(m[2]);
  if (!(percent > 0 && percent <= 100)) return null;     // the bar models parts of one whole
  if (!(base > 0 && base <= 1000) || !isInt(base)) return null;
  return {
    type: 'percent_bar',
    mode: 'percent_of',
    params: { percent, base },
    prompt: 'Slide to the mark. Each cell is a tenth of the whole — build the part by counting cells.',
    goal: 'See a percentage as a count of equal cells, not a magic formula.'
  };
}

// Ratios → double number line.  Parses  a : b  or "ratio of a to b".
function buildRatioLine(question, conceptId) {
  const q = normalize(question);
  const looksLikeRatio = /\bratio\b|\bproportion\b/i.test(q) ||
    conceptId === 'ratios' || conceptId === 'proportions';
  if (!looksLikeRatio) return null;
  let a = null, b = null;
  const colon = q.match(/(\d+)\s*:\s*(\d+)/);
  const words = q.match(/ratio\s+of\s+(\d+)\s+to\s+(\d+)/i);
  if (colon) { a = parseInt(colon[1], 10); b = parseInt(colon[2], 10); }
  else if (words) { a = parseInt(words[1], 10); b = parseInt(words[2], 10); }
  if (!a || !b || a > 12 || b > 12) return null;
  return {
    type: 'ratio_line',
    mode: 'equivalent',
    params: { a, b },
    prompt: 'Drag to scale BOTH lines together. Every aligned pair you make is the same ratio — find the one you need.',
    goal: 'Feel equivalent ratios as two quantities growing in lockstep.'
  };
}

// Multiplication / distribution → partitioned-rectangle area model.
//   product    — a × b  (numeric): a countable a×b grid the learner can split.
//   distribute — a(x + c)         : a rectangle split into a symbolic a·x region
//                and a countable a×c region; the learner reads off both and adds.
// The product / expanded form is NEVER printed — the learner counts and assembles.
function buildAreaModel(question) {
  const q = normalize(question);
  // binomial product (FOIL):  (x + a)(x + b)  →  a 2×2 partitioned rectangle.
  // The two off-diagonal regions ARE the middle term — so the renderer makes the
  // "forgot the Outer/Inner pair" slip impossible. Only the sum form gets the area
  // model (a difference would need subtracted strips — out of scope, returns null).
  const foil = q.match(/\(\s*([a-zA-Z])\s*\+\s*(\d+)\s*\)\s*\(\s*([a-zA-Z])\s*\+\s*(\d+)\s*\)/);
  if (foil && foil[1] === foil[3]) {
    const v = foil[1], a = parseInt(foil[2], 10), b = parseInt(foil[4], 10);
    if (isInt(a) && isInt(b) && a >= 1 && b >= 1 && a <= 9 && b <= 9) {
      return {
        type: 'area_model',
        mode: 'foil',
        params: { a, b, variable: v },
        prompt: 'The rectangle is (' + v + ' + ' + a + ') by (' + v + ' + ' + b + '). Claim all four parts — the two middle strips together are the ' + v + '-term.',
        goal: 'See multiplying binomials as four rectangle areas — and why the middle term is two of them.',
        reflectionPrompt: 'Why are there TWO ' + v + '-strips, and what happens to the answer if you skip one?'
      };
    }
  }
  // factoring a trinomial (reverse FOIL):  x² + S·x + P  →  (x + a)(x + b).
  // The corner always holds P squares (a·b = P, from divisor pairs); the learner
  // slides through the pairs until the two middle strips total S·x — confronting
  // the "right product, wrong sum" slip directly. Only the all-plus form.
  const fac = q.match(/x\^?2\s*\+\s*(\d+)\s*x\s*\+\s*(\d+)\s*$/);
  if (fac) {
    const S = parseInt(fac[1], 10), P = parseInt(fac[2], 10);
    let fa = 0, fb = 0;
    for (let t = 1; t * t <= P; t++) {
      if (P % t === 0 && t + P / t === S) { fa = t; fb = P / t; break; }
    }
    if (fa && S >= 3 && S <= 14 && P >= 2 && P <= 36 && fb <= 12) {
      return {
        type: 'area_model',
        mode: 'factor',
        params: { S, P, variable: 'x' },
        prompt: 'The corner always holds ' + P + ' squares — slide through the pairs until the two middle strips total ' + S + 'x.',
        goal: 'Factor by finding the pair that multiplies to the constant and adds to the middle coefficient.',
        reflectionPrompt: 'Every pair multiplied to ' + P + ' — why did only one of them give the right middle term?'
      };
    }
  }
  // perfect square (x + a)²  →  the FOIL box with both sides equal: the x-strip
  // appears TWICE, which is exactly where the doubled middle term comes from
  // (confronts "dropped the middle" and "forgot to double"). Sum form only.
  const sq = q.match(/\(\s*([a-zA-Z])\s*\+\s*(\d+)\s*\)\s*\^?\s*2(?!\d)/);
  if (sq) {
    const v = sq[1], a = parseInt(sq[2], 10);
    if (isInt(a) && a >= 1 && a <= 9) {
      return {
        type: 'area_model',
        mode: 'foil',
        params: { a, b: a, variable: v },
        prompt: 'The square is (' + v + ' + ' + a + ') on every side. Claim all four parts — notice the ' + v + '-strip appears TWICE.',
        goal: 'See why squaring a binomial doubles the middle term (and never drops it).',
        reflectionPrompt: 'There are TWO ' + v + '-strips — why does that make the middle term doubled, not missing?'
      };
    }
  }
  // distribution over a binomial:  a(x + c)  /  a(x - c)
  const dist = q.match(/(-?\d+)\s*\(\s*([a-zA-Z])\s*([+-])\s*(\d+)\s*\)/);
  if (dist) {
    const a = parseInt(dist[1], 10);
    const v = dist[2];
    const c = (dist[3] === '-' ? -1 : 1) * parseInt(dist[4], 10);
    if (isInt(a) && a > 0 && a <= 12 && c > 0 && c <= 12) {
      return {
        type: 'area_model',
        mode: 'distribute',
        params: { a, c, variable: v },
        prompt: 'The rectangle is ' + a + ' tall and (' + v + ' + ' + c + ') wide. Read off the two regions and combine them.',
        goal: 'See distribution as splitting one area into two you can add.'
      };
    }
  }
  // plain product:  a × b  (normalize turns \times into *)
  const prod = q.replace(/\s+/g, '').match(/(-?\d+)\*(\d+)/);
  if (prod) {
    const a = parseInt(prod[1], 10);
    const b = parseInt(prod[2], 10);
    if (isInt(a) && isInt(b) && a > 0 && b > 0 && a <= 12 && b <= 12) {
      return {
        type: 'area_model',
        mode: 'product',
        params: { a, b },
        prompt: 'Drag the split to break the rectangle into two parts. Count each part and add — that is the whole area.',
        goal: 'See a product as the area of a rectangle you can split.'
      };
    }
  }
  return null;
}

// Lines & linear functions → interactive coordinate grapher.
//   line       — y = mx + b drawn on a grid; a tracer the learner drags along the
//                line, with a rise/run slope triangle and the y-axis crossing
//                marked. Optional target: {x:k} (drag to read y) or {y:T} (drag to
//                read x). Slope / intercept / coordinate are READ off the axes.
//   two_points — two draggable points; the line + slope triangle through them.
// Slope, intercept, y-value, and x-value are never printed.
function buildFunctionGrapher(question, conceptId) {
  const q = normalize(question);

  // slope_from_points: "... through (a, b) and (c, d)"
  if (conceptId === 'slope_from_points') {
    const m = q.match(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)\s*and\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/i);
    if (m) {
      const p1 = { x: parseInt(m[1], 10), y: parseInt(m[2], 10) };
      const p2 = { x: parseInt(m[3], 10), y: parseInt(m[4], 10) };
      if (p1.x !== p2.x && [p1.x, p1.y, p2.x, p2.y].every((n) => Math.abs(n) <= 9)) {
        return {
          type: 'function_grapher',
          mode: 'two_points',
          params: { p1, p2 },
          prompt: 'Drag the points. The triangle shows the rise and the run — slope is rise ÷ run.',
          goal: 'See slope as how far up the line climbs for each step across.'
        };
      }
    }
    return null;
  }

  // Everything else carries a line:  y = mx + b   or   f(x) = mx + b
  const lm = q.match(/(?:y|f\(x\))\s*=\s*(-?\d*)\s*x\s*([+-]\s*\d+)?/i);
  if (!lm) return null;
  const m = lm[1] === '' || lm[1] === '+' ? 1 : (lm[1] === '-' ? -1 : parseInt(lm[1], 10));
  const b = lm[2] ? parseInt(lm[2].replace(/\s+/g, ''), 10) : 0;
  if (!isInt(m) || m === 0 || Math.abs(m) > 6 || Math.abs(b) > 12) return null;

  // function_solve: "... for what value of x is f(x) = T" → horizontal target y=T.
  const tm = q.match(/f\(x\)\s*=\s*(-?\d+)(?!\s*\*?\s*x)/i);
  if (conceptId === 'function_solve' && tm) {
    const T = parseInt(tm[1], 10);
    if (Math.abs(T) <= 18) {
      return {
        type: 'function_grapher', mode: 'line', params: { m, b, target: { y: T } },
        prompt: 'Drag the tracer until the line reaches the dashed height. Then read its x off the axis.',
        goal: 'Solve f(x) = value by finding where the line reaches that height.'
      };
    }
  }

  // evaluate at a point: f(k) / "y when x = k" → vertical target x=k.
  let k = null;
  const fk = q.match(/f\(\s*(-?\d+)\s*\)/i);          // f(2)
  const wx = q.match(/when\s*x\s*=\s*(-?\d+)/i);      // y when x = 2
  if (fk) k = parseInt(fk[1], 10);
  else if (wx) k = parseInt(wx[1], 10);
  if ((conceptId === 'function_evaluate' || conceptId === 'point_on_line') && k !== null && Math.abs(k) <= 9) {
    return {
      type: 'function_grapher', mode: 'line', params: { m, b, target: { x: k } },
      prompt: 'Drag the tracer to the dashed input. Then read the output (y) off the vertical axis.',
      goal: 'Evaluate a function by reading the line at a chosen input.'
    };
  }

  // slope_intercept_id: read the slope or the y-intercept of the given line.
  if (conceptId === 'slope_intercept_id') {
    const ask = /intercept/i.test(q) ? 'intercept' : 'slope';
    return {
      type: 'function_grapher', mode: 'line', params: { m, b, ask },
      prompt: ask === 'intercept'
        ? 'Find where the line crosses the y-axis, then read that value off the axis.'
        : 'Drag the tracer one step right — the triangle shows the rise. Read rise ÷ run.',
      goal: 'Read slope from rise-over-run and the intercept from the y-axis crossing.'
    };
  }
  return null;
}

// Data sets → dot plot with a balance-point fulcrum.
//   mean         — dots on a number line; the learner drags a fulcrum until the
//                  data balances (the mean IS the balance point), then reads it.
//   mean_missing — known dots + a fixed fulcrum at the given mean; the learner
//                  drags the one missing dot until it balances, then reads it.
//   range        — the learner brackets the min and max; the span is the range.
// The mean / missing value / range is never printed — it is read off the axis.
function buildDotPlot(question, conceptId) {
  const q = normalize(question);
  const nums = (str) => {
    const m = str.match(/-?\d+/g);
    return m ? m.map((n) => parseInt(n, 10)) : [];
  };
  const okData = (d) => d.length >= 3 && d.length <= 9 && d.every((v) => v >= 0 && v <= 30);

  if (conceptId === 'mean_missing_value') {
    const mm = q.match(/mean of .*?\bis\b\s*(\d+)/i);
    const am = q.match(/are\s+([\d,\sand]+?)[.?]/i);
    if (mm && am) {
      const mean = parseInt(mm[1], 10);
      const known = nums(am[1]);
      const n = known.length + 1;
      const missing = n * mean - known.reduce((a, b) => a + b, 0);
      if (mean > 0 && mean <= 30 && known.length >= 2 && okData(known) && missing >= 0 && missing <= 30) {
        return {
          type: 'dot_plot', mode: 'mean_missing', params: { known, targetMean: mean, n },
          prompt: 'Drag the empty dot until the data balances on the fulcrum at the given mean. Then read its value.',
          goal: 'Find a missing value by making the data balance at the mean.'
        };
      }
    }
    return null;
  }

  // mean / range share a comma-separated data list.
  const listM = q.match(/(\d+(?:\s*,\s*\d+){2,})/);
  if (!listM) return null;
  const data = nums(listM[1]);
  if (!okData(data)) return null;

  if (conceptId === 'stat_range') {
    return {
      type: 'dot_plot', mode: 'range', params: { data },
      prompt: 'Bracket the smallest and largest values. The distance between them is the range.',
      goal: 'See the range as the full spread of the data.'
    };
  }
  if (conceptId === 'stat_median') {
    return {
      type: 'dot_plot', mode: 'median', params: { data },
      prompt: 'Drag the divider until each side has the same number of dots — the median sits there.',
      goal: 'See the median as the middle of the data.',
      reflectionPrompt: 'Why is the middle value the one with equal counts on each side?'
    };
  }
  if (conceptId === 'stat_mode') {
    return {
      type: 'dot_plot', mode: 'mode', params: { data },
      prompt: 'Stack the dots by value, then tap the tallest column — the value that appears most.',
      goal: 'See the mode as the most frequent value: the tallest stack.',
      reflectionPrompt: 'Why is the tallest stack the mode — and how is that different from the largest value?'
    };
  }
  // Mean absolute deviation: the AVERAGE distance from the mean. Each value's
  // distance is a bar; the learner slides a line until the overhangs fill the gaps
  // — that balancing level is the MAD, read off the axis (never printed).
  if (conceptId === 'stat_mad') {
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    if (Number.isInteger(mean)) {
      return {
        type: 'dot_plot', mode: 'mad', params: { data, mean },
        prompt: 'Each bar is a value’s distance from the mean. Slide the line until the overhangs fill the gaps — that level is the average distance.',
        goal: 'See the MAD as the average distance from the mean: the level that balances the long and short bars.',
        reflectionPrompt: 'Why is the balancing level the AVERAGE distance, not the biggest distance or the mean itself?'
      };
    }
    return null;
  }
  // Quartiles / IQR share a box-plot construction over a 7-value sorted set:
  // median = v[3], Q1 = median of the lower half (v[1]), Q3 = median of the upper
  // half (v[5]). The quartile / IQR value is read off the axis, never printed.
  if (conceptId === 'stat_quartile' || conceptId === 'stat_iqr') {
    if (data.length === 7
        && data.every((v, i) => i === 0 || v > data[i - 1])
        && data.every((v) => v >= 0 && v <= 40)) {
      const ask = conceptId === 'stat_iqr' ? 'iqr' : 'q1';
      return {
        type: 'dot_plot', mode: 'box', params: { data, ask },
        prompt: ask === 'iqr'
          ? 'Place Q1 and Q3 — each is the middle of its half. The box between them is the middle half; read its width.'
          : 'Place Q1 — the middle of the LOWER half (left of the median). Then read it off the axis.',
        goal: ask === 'iqr'
          ? 'See the IQR as the width of the box holding the middle half of the data.'
          : 'See Q1 as the median of the lower half — not the smallest value, not the overall median.',
        reflectionPrompt: ask === 'iqr'
          ? 'Why does the box width (Q3 − Q1) describe the spread better than the full range?'
          : 'Why is Q1 the middle of the lower half, rather than the smallest value?'
      };
    }
    return null;
  }
  // default: mean (balance point)
  return {
    type: 'dot_plot', mode: 'mean', params: { data },
    prompt: 'Drag the fulcrum until the dots balance — that balance point is the mean. Read it off the axis.',
    goal: 'Discover the mean as the balance point of the data.'
  };
}

// Probability → sample-space grid + trial simulator.
// A grid of all equally-likely outcomes with the favorable ones highlighted; the
// learner counts favorable/total and TESTS it by running trials, watching the
// experimental rate converge to the theoretical. The probability is never printed.
function buildProbability(question, conceptId) {
  const q = normalize(question);

  // Experimental probability: the trials ALREADY happened. Show the recorded
  // outcomes; the learner tallies the successes out of the total trials (what
  // happened), in contrast with the equally-likely sample space of theoretical.
  if (conceptId === 'stat_experimental_prob') {
    const m = q.match(/(\d+)\s*times?[^0-9]*?(\d+)\s*times?/i);
    if (m) {
      const trials = parseInt(m[1], 10), succ = parseInt(m[2], 10);
      if (trials >= 2 && trials <= 24 && succ >= 0 && succ <= trials) {
        return {
          type: 'probability', mode: 'experimental', params: { trials, succ, label: 'heads', kind: 'flip' },
          prompt: 'These flips already happened. Tap each heads to tally it — the experimental probability is heads out of all the flips.',
          goal: 'See experimental probability as what actually happened: successes out of total trials.',
          reflectionPrompt: 'Why do you divide the heads by the TOTAL flips, not by the number of tails?'
        };
      }
    }
    return null;
  }

  if (conceptId === 'stat_theoretical_prob') {
    const m = q.match(/(\d+)\s*equal sections?,?\s*(\d+)/i);
    if (m) {
      const total = parseInt(m[1], 10), fav = parseInt(m[2], 10);
      if (total >= 2 && total <= 24 && fav >= 1 && fav <= total) {
        return {
          type: 'probability', mode: 'theoretical', params: { total, favorable: fav, label: 'winning', kind: 'spinner' },
          prompt: 'Count the winning sections out of all equal sections. Then TEST it — run trials and watch the rate approach your count.',
          goal: 'See theoretical probability as favorable out of equally-likely, confirmed by trials.'
        };
      }
    }
    return null;
  }

  if (conceptId === 'probability_complement') {
    const m = q.match(/holds\s*(\d+)\s*marbles,?\s*(\d+)\s*of them/i);
    if (m) {
      const total = parseInt(m[1], 10), red = parseInt(m[2], 10), fav = total - red;
      if (total >= 2 && total <= 24 && red >= 0 && red <= total) {
        return {
          type: 'probability', mode: 'theoretical', params: { total, favorable: fav, label: 'not red', complement: true, kind: 'bag' },
          prompt: 'Highlight the marbles that are NOT red — count them out of the total. Then test it with draws.',
          goal: 'See the complement as everything that is not the event.'
        };
      }
    }
    return null;
  }

  // stat_probability (simple): "holds k red marbles out of N"
  const m = q.match(/holds\s*(\d+)\s*\w+\s*marbles?\s*out of\s*(\d+)/i);
  if (m) {
    const fav = parseInt(m[1], 10), total = parseInt(m[2], 10);
    if (total >= 2 && total <= 24 && fav >= 0 && fav <= total) {
      return {
        type: 'probability', mode: 'theoretical', params: { total, favorable: fav, label: 'red', kind: 'bag' },
        prompt: 'Count the favorable marbles out of the total. Then TEST it — draw many times and watch the rate approach your count.',
        goal: 'See probability as favorable out of total, confirmed by experiment.'
      };
    }
  }
  return null;
}

// 2D area → unit-grid shape studio.
//   rect          — drag a corner to build an L×W rectangle on a grid; count squares.
//   triangle      — a right triangle in its b×h rectangle; tap to mirror the copy
//                   and SEE the triangle is exactly half the rectangle.
//   parallelogram — shear the leaning shape until it becomes a b×h rectangle,
//                   showing same base + same height ⇒ same area.
// The area number is never printed — it is counted in unit squares.
function buildShapeGrid(question, conceptId) {
  const q = normalize(question);
  if (conceptId === 'geo_area_rect') {
    const m = q.match(/length\s*(\d+)\s*and\s*width\s*(\d+)/i);
    if (m) {
      const l = parseInt(m[1], 10), w = parseInt(m[2], 10);
      if (l >= 1 && l <= 10 && w >= 1 && w <= 10) {
        return {
          type: 'shape_grid', mode: 'rect', params: { l, w },
          prompt: 'Drag the corner to build the rectangle, then count the unit squares it covers.',
          goal: 'See area as the number of unit squares a shape covers.'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_area_triangle') {
    const m = q.match(/base\s*(\d+)\s*and\s*height\s*(\d+)/i);
    if (m) {
      const b = parseInt(m[1], 10), h = parseInt(m[2], 10);
      if (b >= 1 && b <= 10 && h >= 1 && h <= 10) {
        return {
          type: 'shape_grid', mode: 'triangle', params: { b, h },
          prompt: 'Complete the rectangle around the triangle — the triangle is exactly half of it.',
          goal: 'Discover why a triangle is half of its base × height rectangle.'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_composite') {
    const m = q.match(/(\d+)\s*\*\s*(\d+)\s*rectangle with a\s*(\d+)\s*\*\s*(\d+)\s*corner/i);
    if (m) {
      const w = parseInt(m[1], 10), h = parseInt(m[2], 10), cw = parseInt(m[3], 10), ch = parseInt(m[4], 10);
      if (w >= 2 && w <= 10 && h >= 2 && h <= 10 && cw >= 1 && cw < w && ch >= 1 && ch < h) {
        return {
          type: 'shape_grid', mode: 'composite', params: { w, h, cw, ch },
          prompt: 'Cut the highlighted corner away, then count the squares that remain.',
          goal: 'See a composite area as a big rectangle minus the piece cut from it.',
          reflectionPrompt: 'Why does cutting the corner mean you subtract its area from the whole rectangle?'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_perimeter_rect') {
    const m = q.match(/(\d+)\s*units?\s*long\s*and\s*(\d+)\s*units?\s*wide/i);
    if (m) {
      const l = parseInt(m[1], 10), w = parseInt(m[2], 10);
      if (l >= 1 && l <= 10 && w >= 1 && w <= 10) {
        return {
          type: 'shape_grid', mode: 'perimeter', params: { l, w },
          prompt: 'Tap each of the four sides to measure it, then add the four lengths.',
          goal: 'See perimeter as the total distance around the boundary.',
          reflectionPrompt: 'Why is the perimeter the sum of all four side lengths?'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_area_trapezoid') {
    const m = q.match(/parallel sides\s*(\d+)\s*and\s*(\d+)\s*and height\s*(\d+)/i);
    if (m) {
      const b1 = parseInt(m[1], 10), b2 = parseInt(m[2], 10), h = parseInt(m[3], 10);
      if (b1 >= 1 && b2 >= 1 && b1 <= 11 && b2 <= 11 && h >= 1 && h <= 10 && b1 !== b2) {
        const lo = Math.min(b1, b2), hi = Math.max(b1, b2);
        return {
          type: 'shape_grid', mode: 'trapezoid', params: { b1: lo, b2: hi, h },
          prompt: 'The trapezoid is a rectangle plus a triangle. Tap the empty corner to complete the triangle into its rectangle — then count the rectangle and add half the triangle box.',
          goal: 'See a trapezoid as a rectangle plus a triangle — the average of the two parallel sides times the height.',
          reflectionPrompt: 'Why does the slanted piece add exactly half of the extra-width rectangle?'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_area_parallelogram') {
    const m = q.match(/base\s*(\d+)\s*and\s*perpendicular height\s*(\d+)/i);
    if (m) {
      const b = parseInt(m[1], 10), h = parseInt(m[2], 10);
      if (b >= 1 && b <= 9 && h >= 1 && h <= 9) {
        return {
          type: 'shape_grid', mode: 'parallelogram', params: { b, h },
          prompt: 'Slide the top so the parallelogram becomes a rectangle — same base, same height, same area.',
          goal: 'See why a parallelogram has the same area as a base × height rectangle.'
        };
      }
    }
    return null;
  }
  return null;
}

// Calculus → dynamic tangent / accumulation.
//   tangent      — y = a·xⁿ; the learner tilts a line through the point until it
//                  just KISSES the curve (any other slope cuts through). The slope
//                  of that tangent is read as rise ÷ run — the derivative.
//   accumulation — ∫₀ᵇ c dx; the learner drags the upper limit, sweeping out unit
//                  strips of area under the line, then counts the squares.
// The derivative value / integral value is never printed.
function buildCalculus(question, conceptId) {
  const q = normalize(question);
  if (conceptId === 'derivative') {
    const m = q.match(/=\s*(-?\d*)\s*[xt]\s*\^?\s*(\d)/);
    if (!m) return null;
    const a = m[1] === '' || m[1] === '+' ? 1 : (m[1] === '-' ? -1 : parseInt(m[1], 10));
    const n = parseInt(m[2], 10);
    if (!isInt(a) || a < 1 || a > 4 || n < 2 || n > 3) return null;
    const ptm = q.match(/'\s*\(\s*(\d+)\s*\)/) || q.match(/at\s*\$?\s*t\s*=\s*(\d+)/i);
    const pt = ptm ? parseInt(ptm[1], 10) : 1;
    if (pt < 1 || pt > 2) return null;
    return {
      type: 'calculus', mode: 'tangent', params: { a, n, pt },
      prompt: 'Tilt the line until it just touches the curve without cutting through — that tangent’s slope is rise ÷ run.',
      goal: 'See the derivative as the slope of the line that just kisses the curve.',
      reflectionPrompt: 'Every other slope cut through the curve — why is the touching one the slope at that point?'
    };
  }
  if (conceptId === 'integral') {
    const m = q.match(/_\s*0\s*\^?\s*(\d+)\s+(\d+)/);
    if (!m) return null;
    const b = parseInt(m[1], 10), c = parseInt(m[2], 10);
    if (b < 1 || b > 8 || c < 1 || c > 8) return null;
    return {
      type: 'calculus', mode: 'accumulation', params: { b, c },
      prompt: 'Drag the upper limit to sweep out the area under the line, one strip at a time. Then count the unit squares.',
      goal: 'See a definite integral as the area accumulated under the curve.',
      reflectionPrompt: 'Why does the area you swept out equal the height times the width?'
    };
  }
  if (conceptId === 'limit') {
    // (p·n + r) / (q·n + s)  — the limit at infinity is the ratio of leading coeffs.
    const m = q.match(/(\d+)\s*n\s*([+-])\s*(\d+)[^0-9]*?(\d+)\s*n\s*([+-])\s*(\d+)/);
    if (!m) return null;
    const p = parseInt(m[1], 10), r = (m[2] === '-' ? -1 : 1) * parseInt(m[3], 10);
    const qq = parseInt(m[4], 10), s = (m[5] === '-' ? -1 : 1) * parseInt(m[6], 10);
    if (qq === 0) return null;
    const L = p / qq;
    if (!isInt(L) || L < 1 || L > 8 || p > 20 || qq > 9) return null; // keep a readable integer level
    return {
      type: 'calculus', mode: 'limit', params: { p, q: qq, r, s },
      prompt: 'Add more terms and watch where the sequence settles. Read the level it approaches off the axis.',
      goal: 'See a limit as the value a sequence settles toward.',
      reflectionPrompt: 'Why do the far-out terms stop changing and settle on one value?'
    };
  }
  return null;
}

// Combining like terms → algebra tiles.
//   a·x + b·x : two groups of x-tiles the learner drags together (merge); the
//   combined row has (a+b) tiles to count. Only LIKE tiles join — the sum is read
//   off the tile count, never printed.
function buildAlgebraTiles(question) {
  const q = normalize(question);
  const m = q.match(/(\d*)\s*x\s*\+\s*(\d*)\s*x/);
  if (!m) return null;
  const a = m[1] === '' ? 1 : parseInt(m[1], 10);
  const b = m[2] === '' ? 1 : parseInt(m[2], 10);
  if (!isInt(a) || !isInt(b) || a < 1 || b < 1 || a > 8 || b > 8) return null;
  return {
    type: 'algebra_tiles',
    mode: 'combine',
    params: { a, b, variable: 'x' },
    prompt: 'Drag the two groups of x-tiles together. Then count how many x-tiles you have.',
    goal: 'See that like terms combine by counting the tiles.'
  };
}

// Circle → the two π-relationships, made visible (the answer is "in terms of π",
// so the learner reads the COEFFICIENT of π off the construction, never a decimal).
//   area          — geo_circle_area: build the square on the radius (side = r) and
//                   count its r² unit cells; the circle holds about π of those squares.
//   circumference — geo_circumference: roll the circle one full turn along a track
//                   marked in diameters; one revolution covers exactly π diameters.
function buildCircle(question, conceptId) {
  const q = normalize(question);
  if (conceptId === 'geo_circle_area') {
    const m = q.match(/radius\s*(\d+)/i);
    if (m) {
      const r = parseInt(m[1], 10);
      if (r >= 2 && r <= 8) {
        return {
          type: 'circle', mode: 'area', params: { r },
          prompt: 'Build the square on the radius (side = the radius) and count its unit squares — the circle holds about π of them.',
          goal: 'See a circle’s area as π copies of the square on its radius (π·r²).',
          reflectionPrompt: 'The circle isn’t made of neat squares — why is its area still exactly π of the radius-squares?'
        };
      }
    }
    return null;
  }
  if (conceptId === 'geo_circumference') {
    const dm = q.match(/diameter\s*(\d+)/i);
    const rm = q.match(/radius\s*(\d+)/i);
    if (dm) {
      const d = parseInt(dm[1], 10);
      if (d >= 2 && d <= 16) {
        return {
          type: 'circle', mode: 'circumference', params: { d, given: 'diameter' },
          prompt: 'Roll the circle one full turn along the track — how many diameters does the rim cover?',
          goal: 'See the circumference as π times the diameter (the rim unrolls to π diameters).',
          reflectionPrompt: 'Why does one full roll always cover π diameters, whatever the circle’s size?'
        };
      }
    }
    if (rm) {
      const r = parseInt(rm[1], 10);
      if (r >= 2 && r <= 8) {
        return {
          type: 'circle', mode: 'circumference', params: { d: 2 * r, given: 'radius', r },
          prompt: 'Roll the circle one full turn along the track — the rim covers π diameters, and the diameter is twice the radius.',
          goal: 'See the circumference as 2π times the radius (π diameters, with the diameter being 2r).',
          reflectionPrompt: 'Why does one full roll always cover the same number of diameters, whatever the size?'
        };
      }
    }
    return null;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Master dispatcher
// ----------------------------------------------------------------------------
// Each builder declares the concepts it legitimately serves. When the learner's concept is a KNOWN
// visual concept we run ONLY that concept's builders, so a stray pattern in the question text (e.g.
// a `\frac` inside a non-fraction problem, or "p% of N" inside a non-percent one) can't attach the
// wrong manipulative. When the concept is null/unknown we fall back to trying every builder (the spec
// is still pattern-validated and answer-safe). See docs/ContentEngineAudit-2026-06.md §3.3.
// The concept→model mapping lives in visualMetadata.js (single source of truth);
// each builder reads its served concepts from MODEL_CONCEPTS and supplies the
// function that describes the manipulable object.
const BUILDERS = [
  { name: 'balance_scale', concepts: MODEL_CONCEPTS.balance_scale, build: (p, c) => buildLinearScale(p.question, c) },
  { name: 'parabola', concepts: MODEL_CONCEPTS.parabola, build: (p) => buildParabola(p.question) },
  { name: 'function_grapher', concepts: MODEL_CONCEPTS.function_grapher, build: (p, c) => buildFunctionGrapher(p.question, c) },
  { name: 'right_triangle', concepts: MODEL_CONCEPTS.right_triangle, build: (p, c) => buildRightTriangle(p.question, c) },
  { name: 'shape_grid', concepts: MODEL_CONCEPTS.shape_grid, build: (p, c) => buildShapeGrid(p.question, c) },
  { name: 'percent_bar', concepts: MODEL_CONCEPTS.percent_bar, build: (p) => buildPercentBar(p.question) },
  { name: 'ratio_line', concepts: MODEL_CONCEPTS.ratio_line, build: (p, c) => buildRatioLine(p.question, c) },
  { name: 'fraction_bar', concepts: MODEL_CONCEPTS.fraction_bar, build: (p) => buildFractionBar(p.question) },
  { name: 'dice_sim', concepts: MODEL_CONCEPTS.dice_sim, build: (p) => buildDiceSim(p.question) },
  { name: 'probability', concepts: MODEL_CONCEPTS.probability, build: (p, c) => buildProbability(p.question, c) },
  { name: 'number_line', concepts: MODEL_CONCEPTS.number_line, build: (p, c) => buildNumberLine(p.question, c) },
  { name: 'dot_plot', concepts: MODEL_CONCEPTS.dot_plot, build: (p, c) => buildDotPlot(p.question, c) },
  { name: 'calculus', concepts: MODEL_CONCEPTS.calculus, build: (p, c) => buildCalculus(p.question, c) },
  { name: 'area_model', concepts: MODEL_CONCEPTS.area_model, build: (p) => buildAreaModel(p.question) },
  { name: 'algebra_tiles', concepts: MODEL_CONCEPTS.algebra_tiles, build: (p) => buildAlgebraTiles(p.question) },
  { name: 'circle', concepts: MODEL_CONCEPTS.circle, build: (p, c) => buildCircle(p.question, c) }
];

// Build the manipulative spec for a problem (or null). The concept gate runs the
// matching builder; benefit/scaffold/enrichment are layered by buildVisualSpec.
function buildModelSpec(problem, conceptId) {
  // Concept gate: only active when we recognize the concept as a visual concept (so null/unknown
  // concepts keep the legacy try-all behavior). When active, a builder runs only if it serves this
  // concept — blocking a manipulative that the question text would otherwise coincidentally trigger.
  const gate = isVisualConcept(conceptId);
  for (const b of BUILDERS) {
    if (gate && !b.concepts.includes(conceptId)) continue;
    let spec = null;
    try {
      spec = b.build(problem, conceptId);
    } catch (_) {
      spec = null;
    }
    if (spec) return spec;
  }
  return null;
}

// Returns a full spec (benefit decision + metadata enrichment) or null.
//   problem        : { question, correctAnswer, ... }
//   conceptId      : knowledge-graph concept id (may be null)
//   learnerProfile : { mastery_score, exposure_count } or null
//   opts           : { context: 'lesson'|'exercise'|'competitive' }  (default 'exercise')
function buildVisualSpec(problem, conceptId, learnerProfile, opts) {
  if (!problem || !problem.question) return null;
  const context = (opts && opts.context) || 'exercise';

  // First decide whether a visual helps at all (cheap), only building the model
  // if the concept is recognized; unrecognized concepts fall back to try-all and
  // pass `hasModelHint` so a pattern-matched model can still earn a visual.
  const recognized = isVisualConcept(conceptId);
  let spec = null;
  if (recognized) {
    const pre = scoreVisualBenefit({ conceptId, context, learnerProfile });
    if (!pre.attach) return null;
    spec = buildModelSpec(problem, conceptId);
    if (!spec) return null;
    return finishSpec(spec, conceptId, pre);
  }

  // Unrecognized / null concept: build first (pattern match), then score with the hint.
  spec = buildModelSpec(problem, conceptId);
  if (!spec) return null;
  const decision = scoreVisualBenefit({ conceptId, context, learnerProfile, hasModelHint: true });
  if (!decision.attach) return null;
  return finishSpec(spec, conceptId, decision);
}

// Apply the benefit decision + metadata enrichment to a built model spec.
function finishSpec(spec, conceptId, decision) {
  spec.complexity  = decision.scaffold;
  spec.interactive = true;
  spec.collapsed   = decision.collapsed;
  spec.benefitScore = decision.score;
  // Enrich with concept metadata: learningGoal, reflectionPrompt, primitives,
  // feedbackRules, representations, loop, and the concept's real misconceptions.
  enrichSpec(spec, conceptId);
  // Guidance text is strongest for beginners; trimmed for explorers/experts.
  if (decision.scaffold === 'explore') spec.goal = null;
  return spec;
}

// Convenience: returns the JSON string the client forwards to its renderer, or null.
function buildVisualSpecJson(problem, conceptId, learnerProfile, opts) {
  const spec = buildVisualSpec(problem, conceptId, learnerProfile, opts);
  return spec ? JSON.stringify(spec) : null;
}

// The name of the manipulative a concept maps to (e.g. 'fraction_bar'), or null if the concept has
// no interactive model. Lets the knowledge graph answer "what visual model does this node have?".
function visualModelFor(conceptId) {
  return modelFor(conceptId);
}

module.exports = {
  buildVisualSpec,
  buildVisualSpecJson,
  decideComplexity,
  visualModelFor
};
