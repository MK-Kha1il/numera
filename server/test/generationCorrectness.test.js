// Content-correctness sweep (audit #25). The generator already shipped wrong math once — a
// LaTeX-corruption bug where single-backslash sequences in JS strings ("\frac", "\nu", "\beta")
// silently became control characters, producing garbage questions/answer choices. This locks the
// whole playable curriculum: for every concept, generate many instances and assert each is
// well-formed — non-empty question + answer, options that actually contain the correct answer,
// and NO control characters anywhere (the corruption fingerprint).
const { test } = require('node:test');
const assert = require('node:assert');
const { generateProblem, CONCEPT_TO_LEVEL } = require('../mathGenerator');

const INSTANCES_PER_CONCEPT = 25;
const ELO = 1200;
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

// The corruption fingerprint is a NON-whitespace control character. The LaTeX-corruption bug turns
// "\frac"/"\beta"/"\vec" into formfeed(12)/backspace(8)/vertical-tab(11)/null(0)/bell(7) etc. We
// allow the legitimate whitespace controls — tab(9), newline(10), carriage-return(13) — which do
// appear on purpose in multi-line questions (e.g. a "solve the system" prompt), and flag the rest.
const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function controlCharAt(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32 && !ALLOWED_CONTROLS.has(code)) return { index: i, code };
  }
  return null;
}

function assertClean(label, value) {
  const cc = controlCharAt(value);
  assert.equal(cc, null, `${label} contains a control char (code ${cc && cc.code}) — LaTeX-corruption fingerprint: ${JSON.stringify(value)}`);
}

for (const [conceptId, meta] of Object.entries(CONCEPT_TO_LEVEL)) {
  test(`every generated ${conceptId} problem is well-formed and corruption-free`, () => {
    for (let i = 0; i < INSTANCES_PER_CONCEPT; i++) {
      const p = generateProblem(meta.category, meta.level, i, ELO);
      const where = `${conceptId}[#${i}]`;

      assert.ok(p && typeof p.question === 'string' && p.question.trim().length > 0, `${where}: empty/invalid question`);
      assert.ok(p.correctAnswer != null && String(p.correctAnswer).trim().length > 0, `${where}: missing correct answer`);

      assertClean(`${where} question`, p.question);
      assertClean(`${where} answer`, p.correctAnswer);

      if (Array.isArray(p.options) && p.options.length > 0) {
        p.options.forEach((opt, k) => {
          assert.ok(typeof opt === 'string' || typeof opt === 'number', `${where}: option ${k} is not a scalar`);
          assertClean(`${where} option ${k}`, opt);
        });
        // The correct answer must be one of the offered choices, or the item is unanswerable.
        const present = p.options.some((opt) => norm(opt) === norm(p.correctAnswer));
        assert.ok(present, `${where}: correct answer "${p.correctAnswer}" is not among options ${JSON.stringify(p.options)}`);
        // No duplicate options (a duplicate hints at a generation/formatting bug).
        const uniq = new Set(p.options.map(norm));
        assert.equal(uniq.size, p.options.length, `${where}: duplicate options ${JSON.stringify(p.options)}`);
      }
    }
  });
}
