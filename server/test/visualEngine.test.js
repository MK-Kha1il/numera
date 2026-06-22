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

test('concept gate blocks a manipulative the question would coincidentally trigger', () => {
  // A fraction in the question would normally build a fraction_bar — but if the learner's concept is
  // a recognized NON-fraction visual concept, the gate must suppress it (no wrong-context visual).
  const spec = buildVisualSpec(
    { question: 'Which is larger: $\\frac{2}{3}$ or $\\frac{3}{5}$?' },
    'linear_two_step', NOVICE
  );
  assert.equal(spec, null, 'a fraction bar must not attach to a linear-equation concept');
});

test('concept gate still serves the concept its OWN manipulative', () => {
  const spec = buildVisualSpec(
    { question: 'Which is larger: $\\frac{2}{3}$ or $\\frac{3}{5}$?' },
    'fraction_compare', NOVICE
  );
  assert.ok(spec, 'fraction_compare should still get a fraction bar');
  assert.equal(spec.type, 'fraction_bar');
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
