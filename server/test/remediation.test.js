// Unit tests for misconception-targeted remediation (mathEngine/remediationEngine.js).
const { test } = require('node:test');
const assert = require('node:assert');
const { predictedWrongAnswer, applyRemediation } = require('../mathEngine/remediationEngine');

test('predictedWrongAnswer: global structural patterns', () => {
  assert.strictEqual(predictedWrongAnswer('sign_error', 'arithmetic_sub', '5'), -5);
  assert.strictEqual(predictedWrongAnswer('off_by_one', 'pigeonhole', '6'), 7);
  assert.strictEqual(predictedWrongAnswer('forgot_negative', 'arithmetic_sub', '-4'), 4);
  // sign_error on 0 is meaningless.
  assert.strictEqual(predictedWrongAnswer('sign_error', 'arithmetic_sub', '0'), null);
});

test('predictedWrongAnswer: concept-specific rule that needs only the answer', () => {
  // quadratic "sign_flip_roots": rule (ans) => -ans
  assert.strictEqual(predictedWrongAnswer('sign_flip_roots', 'quadratic', '3'), -3);
});

test('predictedWrongAnswer: returns null when a rule needs params we do not have', () => {
  // linear_two_step "divide_before_subtract" needs p.a/p.b/p.c -> NaN -> null (no crash).
  assert.strictEqual(predictedWrongAnswer('divide_before_subtract', 'linear_two_step', '4', {}), null);
});

test('applyRemediation surfaces the tempting wrong answer as an option and adds focus', () => {
  const problem = {
    conceptId: 'quadratic',
    correctAnswer: '3',
    options: ['3', '5', '8', '11'], // -3 (the sign-flip error) is absent
    hintLadder: [{ stage: 1, level: 'nudge', label: 'Nudge', text: 'orient' }],
  };
  applyRemediation(problem, { misconception_type: 'sign_flip_roots', misconception_label: 'Inverted root sign', concept_id: 'quadratic' });

  assert.ok(problem.options.includes('-3'), 'the learner\'s own wrong answer is now a choice');
  assert.ok(problem.options.includes('3'), 'the correct answer is preserved');
  assert.strictEqual(new Set(problem.options).size, 4, 'still four distinct options');
  assert.strictEqual(problem.remediation.temptingAnswer, '-3');
  assert.ok(problem.remediation.focus.includes('Inverted root sign'));
});

test('applyRemediation prepends a remediation rung and re-numbers the ladder; no answer leak', () => {
  const problem = {
    conceptId: 'arithmetic_sub',
    correctAnswer: '5',
    options: ['5', '2', '9', '12'],
    hintLadder: [
      { stage: 1, level: 'nudge', label: 'Nudge', text: 'orient' },
      { stage: 2, level: 'method', label: 'Method', text: 'subtract carefully' },
    ],
  };
  applyRemediation(problem, { misconception_type: 'sign_error', misconception_label: 'Sign error' });

  assert.strictEqual(problem.hintLadder[0].level, 'remediation', 'remediation leads the ladder');
  assert.deepStrictEqual(problem.hintLadder.map((r) => r.stage), [1, 2, 3], 'contiguously re-numbered');
  for (const rung of problem.hintLadder) {
    assert.ok(!rung.text.includes('5'), 'no rung contains the correct answer');
  }
});

test('applyRemediation is a safe no-op when the error cannot be reconstructed', () => {
  const problem = {
    conceptId: 'linear_two_step',
    correctAnswer: '4',
    options: ['4', '6', '8', '10'],
    hintLadder: [{ stage: 1, level: 'nudge', label: 'Nudge', text: 'orient' }],
  };
  applyRemediation(problem, { misconception_type: 'divide_before_subtract', misconception_label: 'Divided early', concept_id: 'linear_two_step' });
  // Still attaches qualitative remediation even without a tempting distractor.
  assert.strictEqual(problem.remediation.temptingAnswer, null);
  assert.ok(problem.remediation.focus.length > 0);
  assert.strictEqual(problem.hintLadder[0].level, 'remediation');
  assert.deepStrictEqual(problem.options, ['4', '6', '8', '10'], 'options untouched when no tempting answer');
});
