// visualEngine — builder parsing, adaptive gating, and the no-answer-leak guard.
// The educational contract under test: specs describe structure to manipulate;
// their visible text (prompt/goal) must never contain the exercise's answer.
const test = require('node:test');
const assert = require('node:assert');
const { buildVisualSpec, decideComplexity } = require('../mathEngine/visualEngine');

const NOVICE = { mastery_score: 0.1, exposure_count: 0 };

function visibleText(spec) {
  return `${spec.prompt || ''} ${spec.goal || ''}`;
}

test('decideComplexity gates by mastery and exposure', () => {
  assert.equal(decideComplexity(null), 'guided');
  assert.equal(decideComplexity({ mastery_score: 0.2, exposure_count: 1 }), 'guided');
  assert.equal(decideComplexity({ mastery_score: 0.6, exposure_count: 10 }), 'explore');
  assert.equal(decideComplexity({ mastery_score: 0.85, exposure_count: 10 }), 'ondemand');
  assert.equal(decideComplexity({ mastery_score: 0.95, exposure_count: 30 }), null);
});

test('linear equation builds a balance scale and leaks no answer text', () => {
  const spec = buildVisualSpec({ question: 'Solve for x: $3x + 4 = 19$' }, 'linear_equations', NOVICE);
  assert.ok(spec, 'expected a spec');
  assert.equal(spec.type, 'balance_scale');
  assert.equal(spec.params.solution, 5); // engine data the renderer uses for physics…
  assert.ok(!/\b5\b/.test(visibleText(spec)), '…but the visible text must not state x = 5');
  assert.ok(!/x\s*=\s*\d/.test(visibleText(spec)));
});

test('percent question builds the ten-cell percent bar', () => {
  const spec = buildVisualSpec({ question: 'What is 35% of 80?' }, null, NOVICE);
  assert.ok(spec, 'expected a spec');
  assert.equal(spec.type, 'percent_bar');
  assert.deepEqual({ p: spec.params.percent, b: spec.params.base }, { p: 35, b: 80 });
  assert.ok(!/\b28\b/.test(visibleText(spec)), 'must not state the part (28)');
});

test('percent bar handles LaTeX-escaped percent signs', () => {
  const spec = buildVisualSpec({ question: 'Compute $20\\% $ of $50$.' }, null, NOVICE);
  assert.ok(spec);
  assert.equal(spec.type, 'percent_bar');
  assert.equal(spec.params.percent, 20);
  assert.equal(spec.params.base, 50);
});

test('percent bar rejects over-100% and huge bases', () => {
  assert.equal(buildVisualSpec({ question: 'What is 150% of 80?' }, null, NOVICE), null);
  assert.equal(buildVisualSpec({ question: 'What is 10% of 5000?' }, null, NOVICE), null);
});

test('ratio question builds the double number line', () => {
  const spec = buildVisualSpec(
    { question: 'The ratio of cats to dogs is 3:4. If there are 12 cats, how many dogs are there?' },
    null, NOVICE
  );
  assert.ok(spec, 'expected a spec');
  assert.equal(spec.type, 'ratio_line');
  assert.deepEqual({ a: spec.params.a, b: spec.params.b }, { a: 3, b: 4 });
  assert.ok(!/\b16\b/.test(visibleText(spec)), 'must not state the answer (16 dogs)');
});

test('a bare colon without ratio context does not trigger the ratio line', () => {
  assert.equal(buildVisualSpec({ question: 'Time 3:45 plus 2 hours is what?' }, null, NOVICE), null);
});

test('fraction comparison prompts predict-first', () => {
  const spec = buildVisualSpec(
    { question: 'Which is larger: $\\frac{2}{3}$ or $\\frac{3}{5}$?' }, null, NOVICE
  );
  assert.ok(spec);
  assert.equal(spec.type, 'fraction_bar');
  assert.equal(spec.mode, 'compare');
  assert.match(spec.prompt, /[Pp]redict/);
});

test('expert learners get no visual at all', () => {
  const spec = buildVisualSpec(
    { question: 'Solve for x: $3x + 4 = 19$' }, 'linear_equations',
    { mastery_score: 0.95, exposure_count: 40 }
  );
  assert.equal(spec, null);
});

test('specs carry the complexity level the renderer scaffolds from', () => {
  const guided = buildVisualSpec({ question: 'What is 35% of 80?' }, null, NOVICE);
  assert.equal(guided.complexity, 'guided');
  const ondemand = buildVisualSpec({ question: 'What is 35% of 80?' }, null, { mastery_score: 0.85, exposure_count: 10 });
  assert.equal(ondemand.complexity, 'ondemand');
  assert.equal(ondemand.collapsed, true);
});

test('specs are enriched with metadata: learning goal, reflection prompt, primitives', () => {
  const spec = buildVisualSpec({ question: 'Solve for x: $3x + 4 = 19$' }, 'linear_two_step', NOVICE);
  assert.ok(spec.reflectionPrompt && /[Ww]hy/.test(spec.reflectionPrompt), 'Explain step present');
  assert.ok(Array.isArray(spec.primitives) && spec.primitives.length);
  assert.ok(Array.isArray(spec.feedbackRules), 'productive-failure rules attached');
  assert.ok(Array.isArray(spec.loop) && spec.loop.includes('explain'));
  assert.ok(typeof spec.benefitScore === 'number');
});

test('multiplication builds an area model (product) and leaks no product', () => {
  const spec = buildVisualSpec({ question: 'Evaluate the product: $$7 \\times 6$$' }, 'arithmetic_mult', NOVICE);
  assert.ok(spec, 'expected an area_model spec');
  assert.equal(spec.type, 'area_model');
  assert.equal(spec.mode, 'product');
  assert.deepEqual({ a: spec.params.a, b: spec.params.b }, { a: 7, b: 6 });
  assert.ok(!/\b42\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the product (42)');
});

test('distribution builds an algebraic area model and leaks no expansion', () => {
  const spec = buildVisualSpec({ question: 'Expand: $2(x + 3)$' }, 'distribute', NOVICE);
  assert.ok(spec, 'expected an area_model spec');
  assert.equal(spec.type, 'area_model');
  assert.equal(spec.mode, 'distribute');
  assert.deepEqual({ a: spec.params.a, c: spec.params.c, v: spec.params.variable }, { a: 2, c: 3, v: 'x' });
  assert.ok(!/2x\s*\+\s*6/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the expansion (2x + 6)');
});

test('binomial product builds a 2×2 FOIL area model and leaks no expansion', () => {
  const spec = buildVisualSpec({ question: 'Expand: $(x + 2)(x + 3)$' }, 'foil_binomials', NOVICE);
  assert.ok(spec, 'expected an area_model spec');
  assert.equal(spec.type, 'area_model');
  assert.equal(spec.mode, 'foil');
  assert.deepEqual({ a: spec.params.a, b: spec.params.b, v: spec.params.variable }, { a: 2, b: 3, v: 'x' });
  // expansion is x^2 + 5x + 6 — neither the middle coefficient (5) nor the constant (6) may appear
  assert.ok(!/\b5\b|\b6\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the expansion (x^2 + 5x + 6)');
  assert.ok(spec.reflectionPrompt && /TWO|skip/.test(spec.reflectionPrompt), 'reflection confronts the forgot-middle slip');
  // the difference form gets no area model (subtracted strips are out of scope)
  assert.equal(buildVisualSpec({ question: 'Expand: $(x - 2)(x - 3)$' }, 'foil_binomials', NOVICE), null);
});

test('trinomial factoring builds a reverse-FOIL box and leaks no factor pair', () => {
  const spec = buildVisualSpec({ question: 'Factor: $x^2 + 5x + 6$' }, 'factor_trinomial', NOVICE);
  assert.ok(spec, 'expected an area_model spec');
  assert.equal(spec.type, 'area_model');
  assert.equal(spec.mode, 'factor');
  assert.deepEqual({ S: spec.params.S, P: spec.params.P }, { S: 5, P: 6 });
  // the factors are 2 and 3 — neither may appear in the visible text (only the given S=5, P=6)
  assert.ok(!/\b2\b|\b3\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the factors (2, 3)');
  assert.ok(spec.reflectionPrompt && /middle term/.test(spec.reflectionPrompt), 'reflection confronts the wrong-sum slip');
  // the all-minus form gets no box (negative strips are out of scope)
  assert.equal(buildVisualSpec({ question: 'Factor: $x^2 - 5x + 6$' }, 'factor_trinomial', NOVICE), null);
});

test('squaring a binomial reuses the FOIL box with two equal middle strips', () => {
  const spec = buildVisualSpec({ question: 'Expand: $(x + 4)^2$' }, 'square_binomial', NOVICE);
  assert.ok(spec, 'expected an area_model spec');
  assert.equal(spec.type, 'area_model');
  assert.equal(spec.mode, 'foil');
  assert.deepEqual({ a: spec.params.a, b: spec.params.b }, { a: 4, b: 4 });
  // answer is x^2 + 8x + 16 — neither the doubled middle (8) nor the square (16) may appear
  assert.ok(!/\b8\b|\b16\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state 8x or 16');
  assert.ok(/TWICE|TWO/.test(`${spec.prompt} ${spec.reflectionPrompt || ''}`), 'frames the doubled middle');
  // the minus form gets no box
  assert.equal(buildVisualSpec({ question: 'Expand: $(x - 4)^2$' }, 'square_binomial', NOVICE), null);
});

test('slope-intercept question builds a line grapher asking for the slope/intercept', () => {
  const s1 = buildVisualSpec({ question: 'What is the slope of $y = 2x - 4$?' }, 'slope_intercept_id', NOVICE);
  assert.ok(s1); assert.equal(s1.type, 'function_grapher'); assert.equal(s1.mode, 'line');
  assert.equal(s1.params.ask, 'slope');
  assert.deepEqual({ m: s1.params.m, b: s1.params.b }, { m: 2, b: -4 });
  assert.ok(!/\b2\b/.test(`${s1.prompt} ${s1.goal || ''}`), 'must not state the slope (2)');
  const s2 = buildVisualSpec({ question: 'What is the $y$-intercept of $y = -3x + 6$?' }, 'slope_intercept_id', NOVICE);
  assert.equal(s2.params.ask, 'intercept');
  assert.deepEqual({ m: s2.params.m, b: s2.params.b }, { m: -3, b: 6 });
});

test('function evaluate / solve build a grapher with the right target', () => {
  const ev = buildVisualSpec({ question: 'Given $f(x) = 2x + 2$, find $f(2)$.' }, 'function_evaluate', NOVICE);
  assert.ok(ev); assert.equal(ev.type, 'function_grapher');
  assert.deepEqual(ev.params.target, { x: 2 });
  assert.ok(!/\b6\b/.test(`${ev.prompt} ${ev.goal || ''}`), 'must not state f(2)=6');
  const sv = buildVisualSpec({ question: 'Given $f(x) = 2x + 2$, for what value of $x$ is $f(x) = 6$?' }, 'function_solve', NOVICE);
  assert.ok(sv); assert.deepEqual(sv.params.target, { y: 6 });
  assert.deepEqual({ m: sv.params.m, b: sv.params.b }, { m: 2, b: 2 });
});

test('slope-from-two-points builds the two-point grapher', () => {
  const spec = buildVisualSpec({ question: 'What is the slope of the line through $(1, 2)$ and $(3, 6)$?' }, 'slope_from_points', NOVICE);
  assert.ok(spec); assert.equal(spec.mode, 'two_points');
  assert.deepEqual(spec.params.p1, { x: 1, y: 2 });
  assert.deepEqual(spec.params.p2, { x: 3, y: 6 });
  assert.ok(!/\b2\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the slope (2)');
});

test('mean / range / missing-value questions build a dot plot, leaking no answer', () => {
  const mean = buildVisualSpec({ question: 'Find the mean (average) of: 2, 4, 6, 8' }, 'stat_mean', NOVICE);
  assert.ok(mean); assert.equal(mean.type, 'dot_plot'); assert.equal(mean.mode, 'mean');
  assert.deepEqual(mean.params.data, [2, 4, 6, 8]);
  assert.ok(!/\b5\b/.test(`${mean.prompt} ${mean.goal || ''}`), 'must not state the mean (5)');

  const range = buildVisualSpec({ question: 'Find the range of: 6, 10, 4, 8, 5' }, 'stat_range', NOVICE);
  assert.ok(range); assert.equal(range.mode, 'range');
  assert.deepEqual(range.params.data, [6, 10, 4, 8, 5]);
  assert.ok(!/\b6\b/.test(`${range.prompt} ${range.goal || ''}`), 'must not state the range (6)');

  const miss = buildVisualSpec({ question: 'The mean of four scores is $10$. Three of them are $6$, $11$ and $8$. What is the fourth score?' }, 'mean_missing_value', NOVICE);
  assert.ok(miss); assert.equal(miss.mode, 'mean_missing');
  assert.deepEqual({ known: miss.params.known, mean: miss.params.targetMean, n: miss.params.n }, { known: [6, 11, 8], mean: 10, n: 4 });
  assert.ok(!/\b15\b/.test(`${miss.prompt} ${miss.goal || ''}`), 'must not state the missing value (15)');

  const med = buildVisualSpec({ question: 'Find the median of: 11, 4, 8, 3, 6' }, 'stat_median', NOVICE);
  assert.ok(med); assert.equal(med.mode, 'median');
  assert.deepEqual(med.params.data, [11, 4, 8, 3, 6]);
  assert.ok(!/\b6\b/.test(`${med.prompt} ${med.goal || ''}`), 'must not state the median (6)');

  const mode = buildVisualSpec({ question: 'Find the mode of the data set: 3, 5, 3, 7, 9' }, 'stat_mode', NOVICE);
  assert.ok(mode); assert.equal(mode.mode, 'mode');
  assert.deepEqual(mode.params.data, [3, 5, 3, 7, 9]);
  assert.ok(/[Tt]allest|most/.test(`${mode.prompt} ${mode.goal || ''}`), 'mode prompt frames the tallest stack');
  assert.ok(mode.reflectionPrompt && /largest/.test(mode.reflectionPrompt), 'reflection confronts the picked-max misconception');

  const q1 = buildVisualSpec({ question: 'Find the first quartile (Q1) of the data set $2, 3, 5, 7, 10, 13, 14$.' }, 'stat_quartile', NOVICE);
  assert.ok(q1); assert.equal(q1.type, 'dot_plot'); assert.equal(q1.mode, 'box'); assert.equal(q1.params.ask, 'q1');
  assert.deepEqual(q1.params.data, [2, 3, 5, 7, 10, 13, 14]);
  assert.ok(!/\b3\b/.test(`${q1.prompt} ${q1.goal || ''}`), 'must not state Q1 (3)');

  const iqr = buildVisualSpec({ question: 'Find the interquartile range (IQR) of the data set $2, 3, 5, 7, 10, 13, 14$.' }, 'stat_iqr', NOVICE);
  assert.ok(iqr); assert.equal(iqr.mode, 'box'); assert.equal(iqr.params.ask, 'iqr');
  assert.ok(!/\b10\b/.test(`${iqr.prompt} ${iqr.goal || ''}`), 'must not state the IQR (10)');

  // a non-7-value set does not build the box plot (the construction assumes 7 sorted values)
  assert.equal(buildVisualSpec({ question: 'Find the first quartile (Q1) of the data set $2, 3, 5$.' }, 'stat_quartile', NOVICE), null);

  const mad = buildVisualSpec({ question: 'Find the mean absolute deviation (MAD) of the data set $16, 18, 22, 24$.' }, 'stat_mad', NOVICE);
  assert.ok(mad); assert.equal(mad.type, 'dot_plot'); assert.equal(mad.mode, 'mad');
  assert.deepEqual(mad.params.data, [16, 18, 22, 24]);
  assert.equal(mad.params.mean, 20);
  assert.ok(!/\b3\b/.test(`${mad.prompt} ${mad.goal || ''}`), 'must not state the MAD (3)');
});

test('probability questions build a sample-space grid, leaking no probability', () => {
  const bag = buildVisualSpec({ question: 'A bag holds 2 red marbles out of 20 marbles in total. What is the probability of drawing a red marble, expressed as a percent?' }, 'stat_probability', NOVICE);
  assert.ok(bag); assert.equal(bag.type, 'probability');
  assert.deepEqual({ t: bag.params.total, f: bag.params.favorable }, { t: 20, f: 2 });
  assert.ok(!/\b10\b/.test(`${bag.prompt} ${bag.goal || ''}`), 'must not state the probability (10%)');

  const comp = buildVisualSpec({ question: 'A bag holds $20$ marbles, $3$ of them red. What is the probability of drawing a marble that is NOT red, as a percent?' }, 'probability_complement', NOVICE);
  assert.ok(comp); assert.equal(comp.params.favorable, 17, 'complement = 20 − 3');
  assert.equal(comp.params.complement, true);

  const spin = buildVisualSpec({ question: 'A spinner has $6$ equal sections, $2$ of them winning. What is the theoretical probability of a win, as a fraction in simplest form?' }, 'stat_theoretical_prob', NOVICE);
  assert.ok(spin); assert.equal(spin.params.kind, 'spinner');
  assert.deepEqual({ t: spin.params.total, f: spin.params.favorable }, { t: 6, f: 2 });

  const exp = buildVisualSpec({ question: 'A chip was flipped $9$ times and landed heads $6$ times. What is the experimental probability of heads, as a fraction in simplest form?' }, 'stat_experimental_prob', NOVICE);
  assert.ok(exp); assert.equal(exp.type, 'probability'); assert.equal(exp.mode, 'experimental');
  assert.deepEqual({ trials: exp.params.trials, succ: exp.params.succ }, { trials: 9, succ: 6 });
  assert.ok(!/2\s*\/\s*3|\b3\b/.test(`${exp.prompt} ${exp.goal || ''}`), 'must not state the experimental probability (2/3)');
});

test('2D area questions build a shape grid, leaking no area', () => {
  const rect = buildVisualSpec({ question: 'Find the area of a rectangle with length 3 and width 5.' }, 'geo_area_rect', NOVICE);
  assert.ok(rect); assert.equal(rect.type, 'shape_grid'); assert.equal(rect.mode, 'rect');
  assert.deepEqual({ l: rect.params.l, w: rect.params.w }, { l: 3, w: 5 });
  assert.ok(!/\b15\b/.test(`${rect.prompt} ${rect.goal || ''}`), 'must not state the area (15)');

  const tri = buildVisualSpec({ question: 'A triangle has base 3 and height 4. What is its area?' }, 'geo_area_triangle', NOVICE);
  assert.ok(tri); assert.equal(tri.mode, 'triangle');
  assert.deepEqual({ b: tri.params.b, h: tri.params.h }, { b: 3, h: 4 });
  assert.ok(!/\b6\b/.test(`${tri.prompt} ${tri.goal || ''}`), 'must not state the area (6)');

  const par = buildVisualSpec({ question: 'A parallelogram has base 4 and perpendicular height 3 (its slanted side is 5). What is its area?' }, 'geo_area_parallelogram', NOVICE);
  assert.ok(par); assert.equal(par.mode, 'parallelogram');
  assert.deepEqual({ b: par.params.b, h: par.params.h }, { b: 4, h: 3 });
  assert.ok(!/\b12\b/.test(`${par.prompt} ${par.goal || ''}`), 'must not state the area (12)');

  const peri = buildVisualSpec({ question: 'A rectangle is 3 units long and 5 units wide. What is its perimeter?' }, 'geo_perimeter_rect', NOVICE);
  assert.ok(peri); assert.equal(peri.mode, 'perimeter');
  assert.deepEqual({ l: peri.params.l, w: peri.params.w }, { l: 3, w: 5 });
  assert.ok(!/\b16\b/.test(`${peri.prompt} ${peri.goal || ''}`), 'must not state the perimeter (16)');

  const comp = buildVisualSpec({ question: 'An L-shaped floor is a $8 \\times 6$ rectangle with a $2 \\times 3$ corner cut away. What is its area?' }, 'geo_composite', NOVICE);
  assert.ok(comp); assert.equal(comp.mode, 'composite');
  assert.deepEqual({ w: comp.params.w, h: comp.params.h, cw: comp.params.cw, ch: comp.params.ch }, { w: 8, h: 6, cw: 2, ch: 3 });
  assert.ok(!/\b42\b/.test(`${comp.prompt} ${comp.goal || ''}`), 'must not state the area (42)');

  const trap = buildVisualSpec({ question: 'A trapezoid has parallel sides 3 and 6 and height 4. What is its area?' }, 'geo_area_trapezoid', NOVICE);
  assert.ok(trap); assert.equal(trap.type, 'shape_grid'); assert.equal(trap.mode, 'trapezoid');
  assert.deepEqual({ b1: trap.params.b1, b2: trap.params.b2, h: trap.params.h }, { b1: 3, b2: 6, h: 4 });
  assert.ok(!/\b18\b/.test(`${trap.prompt} ${trap.goal || ''}`), 'must not state the area (18)');
});

test('calculus questions build tangent / accumulation, leaking no value', () => {
  const der = buildVisualSpec({ question: "Find the derivative $f'(1)$ for the power function: $$f(x) = 2x^2$$" }, 'derivative', NOVICE);
  assert.ok(der); assert.equal(der.type, 'calculus'); assert.equal(der.mode, 'tangent');
  assert.deepEqual({ a: der.params.a, n: der.params.n, pt: der.params.pt }, { a: 2, n: 2, pt: 1 });
  assert.ok(!/\b4\b/.test(`${der.prompt} ${der.goal || ''}`), "must not state f'(1)=4");
  assert.ok(der.reflectionPrompt && /touch|cut|kiss|slope/i.test(der.reflectionPrompt), 'mode-specific reflection prompt kept');

  const vel = buildVisualSpec({ question: "An object's position is given by $s(t) = 3t^3$. Determine its instantaneous velocity at $t = 1$:" }, 'derivative', NOVICE);
  assert.ok(vel); assert.deepEqual({ a: vel.params.a, n: vel.params.n }, { a: 3, n: 3 });

  const intg = buildVisualSpec({ question: 'Evaluate the definite integral of the constant function: $$\\int_0^{2} 3 \\, dx$$' }, 'integral', NOVICE);
  assert.ok(intg); assert.equal(intg.mode, 'accumulation');
  assert.deepEqual({ b: intg.params.b, c: intg.params.c }, { b: 2, c: 3 });
  assert.ok(!/\b6\b/.test(`${intg.prompt} ${intg.goal || ''}`), 'must not state the integral (6)');

  const lim = buildVisualSpec({ question: 'Determine the limit as $n \\to \\infty$: $$\\lim_{n \\to \\infty} \\frac{4n + 1}{2n - 1}$$' }, 'limit', NOVICE);
  assert.ok(lim); assert.equal(lim.mode, 'limit');
  assert.deepEqual({ p: lim.params.p, q: lim.params.q, r: lim.params.r, s: lim.params.s }, { p: 4, q: 2, r: 1, s: -1 });
  assert.ok(!/\b2\b/.test(`${lim.prompt} ${lim.goal || ''}`), 'must not state the limit (2)');
});

test('combine-like-terms builds algebra tiles, leaking no sum', () => {
  const spec = buildVisualSpec({ question: 'Simplify: $2x + 3x$' }, 'combine_like_terms', NOVICE);
  assert.ok(spec); assert.equal(spec.type, 'algebra_tiles'); assert.equal(spec.mode, 'combine');
  assert.deepEqual({ a: spec.params.a, b: spec.params.b }, { a: 2, b: 3 });
  assert.ok(!/5x/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the sum (5x)');
  const one = buildVisualSpec({ question: 'Simplify: $x + 4x$' }, 'combine_like_terms', NOVICE);
  assert.deepEqual({ a: one.params.a, b: one.params.b }, { a: 1, b: 4 });
});

test('circle area builds the square-on-radius model and leaks no coefficient', () => {
  const spec = buildVisualSpec({ question: 'What is the area of a circle with radius $5$? Give your answer in terms of $\\pi$.' }, 'geo_circle_area', NOVICE);
  assert.ok(spec); assert.equal(spec.type, 'circle'); assert.equal(spec.mode, 'area');
  assert.equal(spec.params.r, 5);
  assert.ok(!/\b25\b/.test(`${spec.prompt} ${spec.goal || ''}`), 'must not state the coefficient (25)');
  assert.ok(spec.reflectionPrompt && /π|squares/.test(spec.reflectionPrompt));
});

test('circumference rolls the circle; diameter and radius variants both build', () => {
  const dia = buildVisualSpec({ question: 'What is the circumference of a circle with diameter $6$? Give your answer in terms of $\\pi$.' }, 'geo_circumference', NOVICE);
  assert.ok(dia); assert.equal(dia.type, 'circle'); assert.equal(dia.mode, 'circumference');
  assert.deepEqual({ d: dia.params.d, given: dia.params.given }, { d: 6, given: 'diameter' });

  const rad = buildVisualSpec({ question: 'What is the circumference of a circle with radius $4$? Give your answer in terms of $\\pi$.' }, 'geo_circumference', NOVICE);
  assert.ok(rad); assert.deepEqual({ d: rad.params.d, given: rad.params.given }, { d: 8, given: 'radius' });
  assert.ok(!/\b8\b/.test(`${rad.prompt} ${rad.goal || ''}`), 'must not state the coefficient (8)');
});

test('context: competitive gets no visual; lessons keep it for experts, exercises do not', () => {
  const q = { question: 'Which is larger: $\\frac{2}{3}$ or $\\frac{3}{5}$?' };
  assert.equal(buildVisualSpec(q, 'fraction_compare', NOVICE, { context: 'competitive' }), null);
  const expert = { mastery_score: 0.95, exposure_count: 40 };
  assert.ok(buildVisualSpec(q, 'fraction_compare', expert, { context: 'lesson' }), 'lesson keeps the tool');
  assert.equal(buildVisualSpec(q, 'fraction_compare', expert, { context: 'exercise' }), null, 'exercise withholds from experts');
});
