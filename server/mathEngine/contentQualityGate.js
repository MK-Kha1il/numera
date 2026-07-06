// Content Quality Gate — the checklist every lesson and exercise generator must pass
// before it ships. Enforced by test/contentQualityGate.test.js, which runs this gate over
// the ENTIRE catalog on every `npm test` — so a new lesson or generator that fails a check
// breaks the build (and the pre-commit quality-gate hook blocks the commit).
//
// The checklist (docs/ContentQualityGate.md has the full authoring guide):
//   1. Learning objective explicit      — title + one-line summary state what is learned.
//   2. Concept & prerequisite mapping   — the id exists in the knowledge graph, its prereqs
//                                         resolve, and generated types map to a concept.
//   3. No answer leakage                — the stem never states its own answer; hint rungs
//                                         are leak-filtered; no LaTeX control-char corruption.
//   4. Reasoning over memorization      — a WHY (whyItWorks/intuition), ≥2 representations,
//                                         and a common-mistake with its fix; exercises carry
//                                         an explanation and a real (≥3-rung) hint ladder.
//   5. Sufficiently different           — a generator must vary its surface across instances
//                                         (no constant question/answer).
//   6. Adaptive-engine fit              — the mapped concept has baseElo and ≥2 misconceptions
//                                         so diagnosis, distractor tagging and remediation work.
//   7. The 10% bar                      — HUMAN judgment ("would you keep it if you could only
//                                         ship 10% of your content?"); not automatable, see doc.
//
// Pure module (no DB / IO). Checks return { id, label, pass, detail } so failures are
// self-explanatory in test output.

const { concepts } = require('./knowledgeGraph');
const { CONCEPT_LESSONS } = require('./conceptLessons');
const { buildHintLadder } = require('./hintLadder');
const { conceptFromType } = require('./problemOrchestrator');

// Legacy problem types that pre-date the concept graph (the original mental-math band and
// the advanced one-off topics). They are fully covered by authored tips.js entries, but have
// no graph concept/lesson. FROZEN: do not add to this list — new types must map to a graph
// concept (that is the point of the gate).
const LEGACY_UNMAPPED_TYPES = new Set([
  'arithmetic_mixed', 'mental_add', 'mental_sub', 'mental_mult', 'mental_square', 'mental_cube',
  'fermat_little', 'euler_identity', 'gcd', 'modulo', 'probability', 'average', 'estimation',
  'percentage',
]);

// Problem types whose answer is INHERENTLY part of the stem: the task is to SELECT a value
// from data shown in the question (mode/median of a list, comparisons, orderings). For these
// the "stem must not contain the answer" check is meaningless and is skipped.
const SELECTION_TYPES = new Set([
  'stat_mode', 'stat_median', 'stat_range', 'stat_quartile', 'stat_iqr', 'stat_mad',
  'integer_compare', 'decimal_compare', 'fraction_compare', 'better_buy',
]);

// True when a stem literally STATES its own answer — "… $3 + 4 = 7$." with answer 7, or
// "the answer is 7". A plain substring match is wrong for math content (the answer digit
// legitimately appears as a coefficient in "Solve $2x + 2 = 6$", or as data in "mode of
// 5, 7, 5"); what the gate must catch is the authoring error of including the solution.
// Conceptual "why" stems (self-explain style: "Why is $2^5 = 32$…?") intentionally state
// the value — the task is the reasoning — so they are exempt.
function statesAnswer(stem, answer) {
  const q = String(stem || '');
  if (/^\s*(why|which|explain|what makes)\b/i.test(q)) return false;
  const a = String(answer == null ? '' : answer).trim().replace(/^\$+|\$+$/g, '');
  if (!a) return false;
  const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Prose statement: "the answer/result/solution is/equals ANS".
  if (new RegExp(`(answer|result|solution)\\s+(is|equals)\\s*\\$?\\s*${esc}\\b`, 'i').test(q)) return true;

  // Completed equality: "… = ANS" where the left side is a PURE computation. An equality
  // whose left side contains variables ("2x - 2y = 4") is a given constraint, not a leak —
  // stating the answer means finishing the arithmetic ("3 + 4 = 7").
  const eq = new RegExp(`=\\s*\\$?\\s*${esc}\\s*\\$?\\s*(?:[.?!,]|$)`, 'g');
  let m;
  while ((m = eq.exec(q)) !== null) {
    // The segment back to the previous delimiter is the equality's left side.
    const before = q.slice(0, m.index);
    const segStart = Math.max(
      before.lastIndexOf('$$'), before.lastIndexOf(':'), before.lastIndexOf(','),
      before.toLowerCase().lastIndexOf(' and '), before.lastIndexOf('=')
    );
    const lhs = before
      .slice(segStart + 1)
      .replace(/\\text\{[^}]*\}/g, ' ')  // drop \text{...} prose
      .replace(/\\[a-zA-Z]+/g, ' ');     // drop LaTeX commands (\times, \div, \frac…)
    // A VARIABLE is a standalone single letter ("x", "2y") — prose task words ("Compute")
    // are multi-letter and don't make the equality a constraint.
    const hasVariable = /(^|[^a-zA-Z])[a-zA-Z]([^a-zA-Z]|$)/.test(lhs);
    if (!hasVariable) return true;
  }
  return false;
}

const ALLOWED_CONTROLS = new Set([9, 10, 13]);
function hasControlChar(s) {
  const str = String(s == null ? '' : s);
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 32 && !ALLOWED_CONTROLS.has(c)) return true;
  }
  return false;
}

function check(id, label, pass, detail) {
  return { id, label, pass: !!pass, detail: pass ? '' : String(detail || '') };
}

function summarize(checks) {
  return { pass: checks.every((c) => c.pass), checks };
}

// ---------------------------------------------------------------------------------------------
// LESSON GATE — evaluates a CONCEPT_LESSONS entry (pass the conceptId; entry looked up, or
// pass a candidate entry directly as `lessonOverride` to gate content BEFORE inserting it).
// ---------------------------------------------------------------------------------------------
function gateLesson(conceptId, lessonOverride) {
  const lesson = lessonOverride || CONCEPT_LESSONS[conceptId];
  const checks = [];

  if (!lesson) {
    return summarize([check('exists', 'Lesson exists', false, `no lesson for ${conceptId}`)]);
  }

  // 1. Learning objective explicit
  checks.push(check(
    'objective', 'Learning objective is explicit',
    lesson.title && lesson.oneLineSummary && String(lesson.oneLineSummary).trim().length >= 20,
    'needs a title and a oneLineSummary (≥20 chars) stating what is learned'
  ));

  // 2. Concept & prerequisite mapping
  const node = concepts[conceptId];
  const isLegacy = LEGACY_UNMAPPED_TYPES.has(conceptId);
  checks.push(check(
    'concept_map', 'Maps to a knowledge-graph concept',
    !!node || isLegacy,
    `${conceptId} is not in the knowledge graph (new lessons must add a graph node)`
  ));
  if (node) {
    const badPrereqs = (node.prereqs || []).filter((p) => !concepts[p]);
    checks.push(check(
      'prereq_map', 'All prerequisites resolve',
      badPrereqs.length === 0,
      `dangling prereqs: ${badPrereqs.join(', ')}`
    ));
  }

  // 3. No answer leakage / corruption
  const texts = [];
  const collect = (v) => { if (typeof v === 'string') texts.push(v); };
  collect(lesson.title); collect(lesson.formula); collect(lesson.oneLineSummary);
  collect(lesson.intuitionHook); collect(lesson.whatItIs); collect(lesson.whyItWorks);
  collect(lesson.whenToUse);
  for (const r of lesson.representations || []) { collect(r.kind); collect(r.text); collect(r.description); }
  for (const m of lesson.commonMistakes || []) { collect(m.label); collect(m.why); collect(m.fix); }
  for (const c of lesson.connections || []) { collect(typeof c === 'string' ? c : c.text); }
  for (const e of lesson.examples || []) { collect(e.question); collect(e.explanation); }
  checks.push(check(
    'no_corruption', 'No LaTeX control-char corruption',
    !texts.some(hasControlChar),
    'a string contains a raw control char — single-backslash LaTeX like "\\f"/"\\p" in a JS string'
  ));
  const leakyExamples = (lesson.examples || []).filter(
    (e) => e && e.question && e.answer != null && statesAnswer(e.question, e.answer)
  );
  checks.push(check(
    'no_answer_leak', "Example stems don't state their own answer",
    leakyExamples.length === 0,
    `example question states its answer: "${leakyExamples[0] && leakyExamples[0].question}"`
  ));

  // 4. Reasoning over memorization
  checks.push(check(
    'why', 'Teaches WHY, not just the rule',
    (lesson.whyItWorks && String(lesson.whyItWorks).trim().length >= 30) || lesson.intuitionHook,
    'needs whyItWorks (≥30 chars) or an intuitionHook — a rule statement alone trains memorization'
  ));
  const mistakesWithFix = (lesson.commonMistakes || []).filter((m) => m && m.label && (m.fix || m.why));
  checks.push(check(
    'mistakes', 'Names a common mistake with its fix',
    mistakesWithFix.length >= 1,
    'needs ≥1 commonMistakes entry with label + fix/why (feeds hints, socratic probes, error analysis)'
  ));
  checks.push(check(
    'worked_example', 'Carries a fully worked example',
    (lesson.examples || []).some((e) => e && e.question && e.answer != null && e.explanation),
    'needs ≥1 example with question + answer + explanation (feeds the worked-example engine)'
  ));

  // 5. Representation diversity
  const kinds = new Set((lesson.representations || []).map((r) => r && r.kind).filter(Boolean));
  checks.push(check(
    'representations', 'Shows ≥2 distinct representations',
    kinds.size >= 2,
    `only ${kinds.size} representation kind(s) — a single representation trains pattern-matching`
  ));

  // 6. Adaptive-engine fit
  if (node) {
    checks.push(check(
      'adaptive_fit', 'Concept is adaptive-ready (baseElo + ≥2 misconceptions)',
      Number.isFinite(node.baseElo) && (node.misconceptions || []).length >= 2,
      `baseElo=${node.baseElo}, misconceptions=${(node.misconceptions || []).length} — needs both for diagnosis/placement`
    ));
  }

  return summarize(checks);
}

// ---------------------------------------------------------------------------------------------
// EXERCISE / GENERATOR GATE — samples a generator function `(diffFactor, idx) => problem`
// and gates the family it produces. Also usable on a single problem via gateExercise.
// ---------------------------------------------------------------------------------------------
function gateExercise(problem) {
  const checks = [];
  if (!problem || typeof problem !== 'object') {
    return summarize([check('exists', 'Problem exists', false, 'generator returned nothing')]);
  }

  const type = problem.type || problem.templateType;
  const mapped = type ? (conceptFromType(type) || type) : null;
  const node = mapped ? concepts[mapped] : null;
  const lesson = mapped ? (CONCEPT_LESSONS[mapped] || CONCEPT_LESSONS[type]) : null;
  const isLegacy = LEGACY_UNMAPPED_TYPES.has(type);

  // 1+2. Objective via concept mapping
  checks.push(check(
    'concept_map', 'Type maps to a graph concept with a lesson (the learning objective)',
    (node && lesson) || isLegacy,
    `type "${type}" does not resolve to a knowledge-graph concept + lesson — new exercise types must`
  ));

  // Basic integrity
  checks.push(check(
    'answer', 'Has a non-empty correct answer',
    problem.answer != null && String(problem.answer).trim() !== '' ||
    problem.correctAnswer != null && String(problem.correctAnswer).trim() !== '',
    'missing answer/correctAnswer'
  ));
  const ans = problem.correctAnswer != null ? problem.correctAnswer : problem.answer;
  if (Array.isArray(problem.options) && problem.options.length > 0) {
    const opts = problem.options.map(String);
    checks.push(check(
      'options', 'MCQ options are distinct and include the answer',
      new Set(opts).size === opts.length && opts.includes(String(ans)),
      `options=${JSON.stringify(opts)} answer=${ans}`
    ));
  }

  // 3. No answer leakage / corruption
  if (!SELECTION_TYPES.has(type)) {
    checks.push(check(
      'no_answer_leak', "Stem doesn't state the answer",
      !(problem.question && ans != null && statesAnswer(problem.question, ans)),
      `question states the answer "${ans}": ${String(problem.question).slice(0, 120)}`
    ));
  }
  checks.push(check(
    'no_corruption', 'No LaTeX control-char corruption',
    !hasControlChar(problem.question) && !hasControlChar(problem.explanation),
    'question/explanation contains a raw control char (single-backslash LaTeX bug)'
  ));

  // 4. Reasoning: explanation + real hint ladder
  checks.push(check(
    'explanation', 'Carries a worked explanation',
    problem.explanation && String(problem.explanation).trim().length >= 15,
    'every exercise must explain its solution path (serves the post-answer review)'
  ));
  const ladder = buildHintLadder(type, ' gate-probe-no-collision ');
  checks.push(check(
    'hint_ladder', 'Hint ladder has ≥3 rungs (nudge → concept → method)',
    ladder.length >= 3,
    `type "${type}" only builds ${ladder.length} rung(s) — needs a tips entry or a concept lesson to derive from`
  ));

  // 6. Adaptive fit
  if (node) {
    checks.push(check(
      'adaptive_fit', 'Mapped concept is adaptive-ready',
      Number.isFinite(node.baseElo) && (node.misconceptions || []).length >= 2,
      `${mapped}: baseElo=${node.baseElo}, misconceptions=${(node.misconceptions || []).length}`
    ));
  }

  return summarize(checks);
}

// Samples `gen(diffFactor, idx)` across idx values; gates each instance AND the family-level
// variety requirement (checklist item 5 — "sufficiently different from recent content").
function gateGenerator(gen, { samples = 12 } = {}) {
  const problems = [];
  const checks = [];
  // Cycle difficulty factors the way live serving does (percentile-scaled), so the variety
  // measurement reflects what a learner actually sees across sessions.
  const diffFactors = [0.9, 1, 1.15];
  for (let idx = 0; idx < samples; idx++) {
    try {
      const p = gen(diffFactors[idx % diffFactors.length], idx);
      if (p) problems.push(p);
    } catch (e) {
      return summarize([check('generates', 'Generator runs without throwing', false, e.message)]);
    }
  }
  checks.push(check('generates', 'Generator produces problems', problems.length === samples,
    `${problems.length}/${samples} samples`));

  // Gate each sampled instance; report the first failing instance for a readable message.
  for (const p of problems) {
    const r = gateExercise(p);
    if (!r.pass) {
      const failed = r.checks.filter((c) => !c.pass);
      return summarize(checks.concat(failed));
    }
  }
  checks.push(check('instances', 'Every sampled instance passes the exercise gate', true));

  // 5. Sufficiently different: surface AND answer must vary across the sample.
  const questions = new Set(problems.map((p) => String(p.question)));
  const answers = new Set(problems.map((p) => String(p.correctAnswer != null ? p.correctAnswer : p.answer)));
  checks.push(check(
    'variety', 'Instances vary (anti-repetition)',
    questions.size >= Math.min(3, samples) && answers.size >= 2,
    `${questions.size} distinct questions, ${answers.size} distinct answers across ${samples} samples — a near-constant generator repeats content`
  ));

  return summarize(checks);
}

module.exports = {
  gateLesson,
  gateExercise,
  gateGenerator,
  LEGACY_UNMAPPED_TYPES,
  SELECTION_TYPES,
};
