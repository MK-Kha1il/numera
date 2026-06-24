// Error-Detection ("Spot the Mistake") Engine — a genuinely different exercise TYPE, breaking the
// multiple-choice/"just solve it" monoculture (see docs/ContentLearningScienceAudit-2026-06.md gap
// #6). Detecting a flaw in someone else's reasoning is a distinct, high-transfer skill — it forces
// the learner to VERIFY rather than generate, and it is exactly the metacognition strong students
// use to catch their own errors.
//
// It reuses two things this sprint already produced: the catalog-wide WORKED EXAMPLES
// (workedExampleEngine, now derived for ~all concepts) provide a correct, fully-worked solution; we
// corrupt exactly ONE line into a FALSE equation (e.g. "2 × 5 = 10" → "2 × 5 = 11") and ask which
// line is wrong. The corrupted line is internally inconsistent, so the error is unambiguous and its
// position varies (it is not always the last line — that would be gameable).
//
// The problem is rendered through the EXISTING multiple-choice gameplay: the full numbered working
// lives in the question; the options are "Line 1…Line N" labels (order-independent, so the client's
// option shuffle is harmless). Pure (no DB/IO); unit-tested in test/errorDetection.test.js.

const { buildWorkedExampleJson } = require('./workedExampleEngine');
const { concepts } = require('./knowledgeGraph');

// Inline-render a worked step's math. Authored worked examples store raw LaTeX (no `$`, because
// their own client component renders it as math); derived ones carry `$...$` inline. In a plain
// question string the client only treats `$...$` as math, so wrap bare LaTeX.
function asInlineMath(math) {
  const m = String(math || '');
  return m.includes('$') ? m : `$${m}$`;
}

// A readable single line for a worked step. "Step N:" / "Answer:" prefixes are noise here, so drop
// them; a meaningful action label (e.g. "Add the numerators") is kept as context.
function lineText(step) {
  const action = step.action || '';
  const labelled = action && !/^Step \d+$/.test(action) && action.toLowerCase() !== 'answer';
  return ((labelled ? `${action}: ` : '') + asInlineMath(step.math)).trim();
}

// Corrupt the LAST standalone integer in a math line into a clearly-wrong value, making the line a
// false statement. Returns null if there is no integer to bump.
function corruptMath(math) {
  const matches = [...String(math).matchAll(/\d+/g)];
  if (matches.length === 0) return null;
  const m = matches[matches.length - 1];
  const n = parseInt(m[0], 10);
  // Bump by a noticeable, plausible amount; avoid 0 and avoid accidentally re-creating n.
  let wrong = n + (n >= 4 ? 2 : 1);
  if (wrong === n) wrong = n + 3;
  const corrupted = math.slice(0, m.index) + String(wrong) + math.slice(m.index + m[0].length);
  return { corrupted, original: String(math), from: n, to: wrong };
}

// True if the concept can produce a Spot-the-Mistake problem (worked example with enough steps and a
// corruptible line that is not the very first setup line).
function canBuildErrorDetection(conceptId) {
  const json = buildWorkedExampleJson(conceptId);
  if (!json) return false;
  let parsed;
  try { parsed = JSON.parse(json); } catch { return false; }
  const steps = parsed.steps || [];
  if (steps.length < 3) return false;
  // Only an EQUATION line (contains `=`) can be corrupted into an unambiguous false statement —
  // this excludes derived prose clauses, which have no checkable arithmetic. Skip the first line so
  // the flaw is in the reasoning, not the given premise.
  return steps.some((s, i) => i > 0 && /=/.test(s.math || '') && corruptMath(s.math));
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build one Spot-the-Mistake problem for a concept, or null if it can't.
function buildErrorDetectionProblem(conceptId, rng = Math.random) {
  const json = buildWorkedExampleJson(conceptId);
  if (!json) return null;
  let parsed;
  try { parsed = JSON.parse(json); } catch { return null; }
  const { problem, steps } = parsed;
  if (!steps || steps.length < 3) return null;

  // Corruptible steps: an equation line (has `=`), past the premise line, with a bumpable integer.
  const candidates = steps
    .map((s, i) => ({ i, s, corr: i > 0 && /=/.test(s.math || '') ? corruptMath(s.math || '') : null }))
    .filter((c) => c.corr);
  if (candidates.length === 0) return null;

  const pick = candidates[Math.floor(rng() * candidates.length)];
  const corruptedSteps = steps.map((s, i) => (i === pick.i ? { ...s, math: pick.corr.corrupted } : s));
  const lines = corruptedSteps.map(lineText);
  const numbered = lines.map((t, i) => `${i + 1}) ${t}`).join('\n');
  const k = pick.i + 1;

  const options = shuffle(lines.map((_, i) => `Line ${i + 1}`), rng);
  const conceptName = (concepts[conceptId] && concepts[conceptId].name) || conceptId;

  return {
    question:
      `Here is a student's full working for: ${problem}\n\n${numbered}\n\n` +
      `Exactly one line contains a mistake. Which line is it?`,
    correctAnswer: `Line ${k}`,
    options,
    explanation:
      `Line ${k} is wrong: it states ${asInlineMath(pick.corr.corrupted)}, but it should be ${asInlineMath(pick.corr.original)}. ` +
      `The trick is to re-check each line on its own — a line is wrong if its own arithmetic doesn't hold.`,
    category: 'Spot the Mistake',
    conceptId,
    conceptName,
    errorLine: k, // test/diagnostic aid; harmless if served
  };
}

// All concepts that can produce a Spot-the-Mistake problem, easiest first (by baseElo).
function errorDetectionConcepts() {
  return Object.keys(concepts)
    .filter(canBuildErrorDetection)
    .sort((a, b) => (concepts[a].baseElo || 0) - (concepts[b].baseElo || 0));
}

// Build a set of `count` problems, biased toward concepts near the learner's level. Mirrors the
// estimation/word-problem route contract: returns an array of MCQ-shaped problems.
function buildErrorDetectionSet(count, level = 1, seed = Date.now()) {
  let s = seed >>> 0;
  const rng = () => {
    // small deterministic LCG so a given seed reproduces (testable)
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const pool = errorDetectionConcepts();
  if (pool.length === 0) return [];

  // Bias: a window of the pool centred on the learner's level (pool is sorted easy→hard).
  const center = Math.min(pool.length - 1, Math.max(0, Math.round((level / 60) * pool.length)));
  const lo = Math.max(0, center - 20);
  const hi = Math.min(pool.length, center + 20);
  const window = pool.slice(lo, hi);
  const picks = shuffle(window.length >= count ? window : pool, rng).slice(0, count);

  const out = [];
  for (const conceptId of picks) {
    const p = buildErrorDetectionProblem(conceptId, rng);
    if (p && p.options.length >= 3) out.push(p);
    if (out.length >= count) break;
  }
  return out;
}

module.exports = {
  buildErrorDetectionProblem,
  buildErrorDetectionSet,
  canBuildErrorDetection,
  errorDetectionConcepts,
  corruptMath,
};
