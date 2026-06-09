// Answer-equivalence engine tests. This is the correctness backbone of the competitive-grading
// upgrade: in ranked, a false NEGATIVE (rejecting a correct answer) costs Elo and enrages players,
// and a false POSITIVE (accepting a wrong answer) corrupts the ladder. So we test BOTH directions
// hard — every equivalent pair must pass, and a wall of genuinely-different pairs must be rejected.
const { test } = require('node:test');
const assert = require('node:assert');
const { areEquivalent } = require('../mathEngine/answerEquivalence');

// Pairs that MUST be judged equal (symmetry is checked automatically below).
const EQUIVALENT = [
  ['1/2', '0.5'],
  ['2/4', '1/2'],
  ['3/4', '0.75'],
  ['0.20', '0.2'],
  ['6.1', '61/10'],
  ['2', '2/1'],
  ['2', '2.0'],
  ['-1/2', '-0.5'],
  ['-3/4', '-0.75'],
  ['50%', '50'],
  ['25 %', '25'],
  ['8x', '8x'],
  ['4x + 12', '12 + 4x'],
  ['4x+12', '4x + 12'],
  ['2(x+2)', '2x+4'],
  ['2x', 'x*2'],
  ['x+x', '2x'],
  ['3x + 2x', '5x'],
  ['2\\pi', '2 pi'],
  ['2\\pi', '2π'],
  ['\\pi', 'pi'],
  ['-pi/3', '-1/3 pi'],
  ['5', '5'],
  ['  7 ', '7']
];

// Pairs that MUST be judged different (no false positives).
const DIFFERENT = [
  ['1/2', '1/3'],
  ['0.5', '0.6'],
  ['2/4', '3/4'],
  ['8x', '8'],            // an expression is never equal to a bare number
  ['8', '8x'],
  ['2x', '3x'],
  ['x+1', 'x+2'],
  ['x', 'y'],
  ['2\\pi', '3\\pi'],
  ['pi', '1'],            // a pi-multiple is never equal to a plain number
  ['50%', '0.5'],         // conservative: percent value 50 ≠ 0.5 (we never over-accept)
  ['', '5'],
  ['abc', '5'],
  ['x', 'x;return 1'],    // injection attempt is rejected, judged not-equal
  ['1/0', '5']
];

for (const [a, b] of EQUIVALENT) {
  test(`equivalent: ${JSON.stringify(a)} ≡ ${JSON.stringify(b)}`, () => {
    assert.equal(areEquivalent(a, b), true, `${a} should equal ${b}`);
    assert.equal(areEquivalent(b, a), true, `equivalence must be symmetric: ${b} vs ${a}`);
  });
}

for (const [a, b] of DIFFERENT) {
  test(`different: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`, () => {
    assert.equal(areEquivalent(a, b), false, `${a} should NOT equal ${b}`);
    assert.equal(areEquivalent(b, a), false, `non-equivalence must be symmetric: ${b} vs ${a}`);
  });
}

// The additive contract: anything the old exact `normalize===normalize` grader accepted, the new
// check must still accept (it can only ever ADD correct matches, never remove one).
test('additive contract: every exact normalized match is still accepted', () => {
  const samples = ['5', '-7', '3/4', '0.5', '8x', '4x + 12', '2\\pi', 'N/A', 'true'];
  for (const s of samples) {
    assert.equal(areEquivalent(s, s), true, `exact self-match must hold for ${s}`);
    assert.equal(areEquivalent(` ${s} `, s.toUpperCase()), true, `trim+case match must hold for ${s}`);
  }
});
