// Derived Active-Learning Layer — scales transfer / self-explanation / worked-example coverage
// across the WHOLE catalog from authored data the system already holds, instead of hand-authoring
// 150 of each.
//
// Why this exists (see docs/ContentLearningScienceAudit-2026-06.md): the three highest-effect-size
// active-recall layers were authored deeply for the first ~8–15 foundational concepts and never
// scaled (transfer 5%, self-explain 9%, worked-examples 7% of 161 concepts). The adaptive/mastery
// engine — whose `transfer` dimension is earned ONLY out-of-context — was therefore starved for
// ~90% of the catalog.
//
// The key insight that keeps QUALITY high: we don't invent prose. Every lesson already carries
// authored `oneLineSummary`, `whyItWorks`, `whenToUse`, `commonMistakes[]`, and `examples[]`
// (a fully worked, often applied, canonical instance). We RE-SHAPE that authored content into the
// three artifact contracts. Authored hand-tuned entries always take precedence; these are the
// fallback so coverage is catalog-wide without ever surfacing un-vetted text.
//
// Pure (no DB/IO); unit-tested in test/deriveActiveLearning.test.js.

const { CONCEPT_LESSONS } = require('./conceptLessons');
const { concepts } = require('./knowledgeGraph');
const { generateDistractors } = require('./distractors');

// A question is "applied" (a transfer-worthy novel context) when it is NOT a bare symbolic command.
const SYMBOLIC_STEM = /^(simplify|solve|evaluate|expand|factor|compute|find the slope|differentiate|integrate|use the quadratic|what is\s+\$|write|state|identify)/i;
const NUMERIC = /^-?\d+(\.\d+)?$/;

function isApplied(question) {
  return !!question && !SYMBOLIC_STEM.test(question.trim());
}

// Split an authored explanation into ordered solution steps. Authored explanations are written as
// sequential reasoning separated by "; " or sentence boundaries, so this recovers genuine steps.
function splitExplanationSteps(explanation) {
  if (!explanation) return [];
  return String(explanation)
    .split(/(?<=[.!?;])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 1 && s !== '✓');
}

// Turn one clause into a {action, math, why} step. Authored clauses frequently follow the shape
// "Do this thing: $math$" — when they do we split it cleanly; otherwise the whole clause is shown
// (LaTeX `$...$` is auto-detected by the client, so it still renders).
function clauseToStep(clause, index) {
  const m = clause.match(/^([^$:]{3,48}):\s*(.+)$/);
  if (m) {
    return { action: m[1].trim().replace(/[.;]$/, ''), math: m[2].trim(), why: '' };
  }
  return { action: `Step ${index + 1}`, math: clause, why: '' };
}

// ---------------------------------------------------------------------------------------------
// WORKED EXAMPLE — re-shape the authored example into the worked-example contract.
//   { problem, steps: [{ action, math, why }] }
// Catalog-wide: every lesson has an authored, fully-solved example.
// ---------------------------------------------------------------------------------------------
function deriveWorkedExample(conceptId) {
  const lesson = CONCEPT_LESSONS[conceptId];
  const ex = lesson && Array.isArray(lesson.examples) ? lesson.examples[0] : null;
  if (!ex || !ex.question || !ex.explanation) return null;

  let steps = splitExplanationSteps(ex.explanation).map(clauseToStep);
  if (steps.length === 0) return null;
  // Cap the reveal at a digestible length.
  if (steps.length > 5) steps = steps.slice(0, 5);

  // Guarantee the answer is the final revealed line so the predict-then-reveal arc resolves.
  const ans = String(ex.answer == null ? '' : ex.answer).trim();
  const lastMath = steps[steps.length - 1].math || '';
  if (ans && !lastMath.includes(ans)) {
    // Wrap LaTeX-bearing answers in $...$ so they render (numeric answers stay plain).
    const math = /[\\^_{}]/.test(ans) && !ans.includes('$') ? `$${ans}$` : ans;
    steps.push({ action: 'Answer', math, why: '' });
  }

  // Strip a trailing reflective aside ("... Why subtract before dividing?") from the PROBLEM —
  // a worked example states the task, it does not also quiz the learner.
  const problem = ex.question.replace(/\s*(why|how|what|which)\b[^.?!$]*\?\s*$/i, '').trim();

  // The final step closes the predict-then-reveal arc; when it has no authored `why`, anchor it
  // to the concept's governing principle so the reveal ends on the REASON, not just the value.
  const last = steps[steps.length - 1];
  if (!last.why) {
    last.why = firstSentence(lesson.whyItWorks) || firstSentence(lesson.oneLineSummary) || '';
  }

  return { problem, steps, derived: true };
}

// ---------------------------------------------------------------------------------------------
// TRANSFER — re-shape an authored APPLIED, numeric example into a transfer problem.
//   { conceptId, question, correctAnswer, options, explanation, transferContext, isTransfer }
// Gated on numeric answer + applied (non-symbolic) framing so we never mislabel a bare symbolic
// drill as "transfer" (transfer = the SAME concept in an unfamiliar context).
// ---------------------------------------------------------------------------------------------
// The applied instance for a concept: the authored APPLIED_EXAMPLES entry wins (added for
// the 85 concepts whose lesson examples are symbolic or have non-numeric answers), else the
// first lesson example that is applied AND numeric.
function appliedExampleFor(conceptId) {
  const { APPLIED_EXAMPLES } = require('./appliedExamples'); // lazy: keeps module load-order flat
  if (APPLIED_EXAMPLES[conceptId]) return APPLIED_EXAMPLES[conceptId];
  const lesson = CONCEPT_LESSONS[conceptId];
  const list = lesson && Array.isArray(lesson.examples) ? lesson.examples : [];
  return list.find(
    (ex) => ex && NUMERIC.test(String(ex.answer == null ? '' : ex.answer).trim()) && isApplied(ex.question)
  ) || null;
}

function canDeriveTransfer(conceptId) {
  return !!appliedExampleFor(conceptId);
}

function deriveTransfer(conceptId) {
  const ex = appliedExampleFor(conceptId);
  if (!ex) return null;
  const correct = String(ex.answer).trim();

  const dList = generateDistractors(correct, conceptId, {});
  const options = new Set([correct]);
  for (const d of dList) {
    if (options.size >= 4) break;
    options.add(String(d));
  }
  let offset = 1;
  while (options.size < 4) {
    const v = Number(correct) + offset;
    if (Number.isFinite(v) && v >= 0 && String(v) !== correct) options.add(String(v));
    offset = offset > 0 ? -offset : -offset + 1;
  }
  const shuffled = Array.from(options);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    conceptId,
    question: ex.question,
    correctAnswer: correct,
    options: shuffled,
    explanation: ex.explanation || '',
    transferContext: 'applied-example',
    isTransfer: true,
    derived: true,
  };
}

// ---------------------------------------------------------------------------------------------
// SELF-EXPLANATION — the correct option is the authored governing principle; the distractors are
// the three classic wrong-rationale archetypes (rote / superficial / coincidental — exactly the
// families the authored sets use) instantiated with the concept's own topic + a real misconception
// where one is cleanly available. The skill is recognising the substantive principle.
//   { question, correct, distractors: [..] }
// ---------------------------------------------------------------------------------------------
function firstSentence(s) {
  if (!s) return '';
  const m = String(s).match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : String(s)).replace(/\s+/g, ' ').trim();
}

// Deterministic per-concept hash so each concept gets a stable but DIFFERENT phrasing from
// each archetype pool. A single fixed phrasing per archetype was trivially meta-gameable
// ("pick the option that isn't the template sentence") once a learner saw a few prompts.
function conceptHash(conceptId) {
  let h = 0;
  const s = String(conceptId || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const QUESTION_STEMS = [
  'Which statement is the real reason this approach works?',
  'Why does this method actually give the right answer?',
  'What makes this approach mathematically sound?',
  'Which of these is the genuine principle behind the method you used?',
];

// Wrong-rationale archetype pools. rote = memorised-rule circularity; surface = superficial
// pattern-matching; lucky = coincidence. `${topic}` is substituted with the lesson title.
const ROTE_POOL = [
  'Because it is just the memorised rule for ${topic}, with no deeper reason.',
  'Because that is the procedure the lesson on ${topic} says to follow.',
  'Because with ${topic} you simply do the steps in the taught order.',
  'Because the rule for ${topic} is a convention you have to memorise.',
];
const SURFACE_POOL = [
  'Because problems that look like this always use the same operation.',
  'Because you apply the most obvious operation to the numbers you see.',
  'Because the numbers in the problem tell you which operation to pick.',
  'Because this kind of question always follows the same visual pattern.',
];
const LUCKY_POOL = [
  'Because it happens to produce a tidy answer in problems like this.',
  'Because the answer comes out clean, which shows the method was right.',
  'Because any method that gives a whole-number result must be correct.',
  'Because checking one example is enough to prove the method always works.',
];

function pickFrom(pool, h, salt) {
  return pool[(h + salt) % pool.length];
}

function deriveSelfExplain(conceptId) {
  const lesson = CONCEPT_LESSONS[conceptId];
  if (!lesson) return null;
  const principle = firstSentence(lesson.oneLineSummary) || firstSentence(lesson.whyItWorks);
  if (!principle || principle.length < 12) return null;
  const topic = (lesson.title || 'this kind of problem').toLowerCase();
  const h = conceptHash(conceptId);

  // Concept-specific wrong rationales from REAL misconceptions (up to two), phrased as claims.
  const misc = (concepts[conceptId] && concepts[conceptId].misconceptions) || [];
  const fromMisc = misc
    .slice(0, 2)
    .map((m) => `Because the natural move is what leads to "${m.label.toLowerCase()}".`);

  // Fill the remaining slots from distinct archetype pools, phrasing varied per concept.
  const generic = [
    pickFrom(ROTE_POOL, h, 0).replace('${topic}', topic),
    pickFrom(SURFACE_POOL, h, 1),
    pickFrom(LUCKY_POOL, h, 2),
  ];
  const distractors = fromMisc.concat(generic).slice(0, 3);

  return {
    question: pickFrom(QUESTION_STEMS, h, 3),
    correct: principle,
    distractors,
    explanation: principle,
    derived: true,
  };
}

// Convenience predicates (used by the engines' fallbacks).
function listDerivable() {
  const ids = Object.keys(concepts);
  return {
    worked: ids.filter((id) => deriveWorkedExample(id)),
    transfer: ids.filter((id) => canDeriveTransfer(id)),
    selfExplain: ids.filter((id) => deriveSelfExplain(id)),
  };
}

module.exports = {
  deriveWorkedExample,
  deriveTransfer,
  canDeriveTransfer,
  deriveSelfExplain,
  splitExplanationSteps,
  isApplied,
  listDerivable,
};
