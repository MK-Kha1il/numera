// Multi-stage Hint Ladder
// ------------------------------------------------------------------------------------
// A single "here's the tip" reveal either gives too much or too little. This builds an
// ordered ladder of escalating hints so the learner can ask for exactly as much help as
// they need and no more — preserving productive struggle:
//
//   Stage 1  nudge    — tiny orientation: what are you being asked / what is given?
//   Stage 2  concept  — which idea applies (the conceptual reminder)
//   Stage 3  method   — which procedure to use (the "how", no numbers plugged in)
//   Stage 4  guided   — apply the method to YOUR numbers + the trap to avoid
//   (solution)        — the full worked answer, served separately and ONLY on explicit
//                       request (problem.explanation / enrichedExplanation). It is never
//                       part of the ladder, so no rung can hand over the answer.
//
// Every rung is run through an answer-leak guard; any rung that would reveal the answer is
// dropped and the ladder re-numbered. Pure module (tipsMap + normalizeAnswer + lessons only).
//
// Coverage: authored tips (tipsMap) win when present. For the ~157 template types that
// post-date tips.js, the ladder is DERIVED from the concept's authored lesson (title /
// oneLineSummary / formula / whyItWorks / commonMistakes) — same re-shape-authored-content
// pattern as deriveActiveLearning.js, so no un-vetted prose is ever surfaced. Types with
// neither a tip nor a lesson keep the single generic nudge.

const { tipsMap } = require('./tips');
const { normalizeAnswer } = require('./exerciseMemory');

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// True if `text` would reveal `answer`. The answer is normalized (spaces/LaTeX stripped);
// the text keeps its spaces so word boundaries are meaningful. Multi-char answers: substring
// match. Single-char answers (e.g. "1", "x"): require a non-alphanumeric boundary so we don't
// flag the "1" inside "100" or ordinary prose.
function leaksAnswer(text, answer) {
  const a = normalizeAnswer(answer);
  if (!a) return false;
  const t = String(text || '').replace(/\$+/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  if (!t.trim()) return false;
  if (a.length === 1) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(a)}([^a-z0-9]|$)`).test(t);
  }
  // Check both the spaced text and a despaced form (LaTeX can split digits with spacing).
  return t.includes(a) || t.replace(/\s+/g, '').includes(a);
}

function firstSentence(s) {
  if (!s) return '';
  const m = String(s).match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : String(s)).replace(/\s+/g, ' ').trim();
}

// Derive the four rungs from the concept's authored lesson. Template types share ids with
// knowledge-graph concepts, so CONCEPT_LESSONS[templateType] is the same concept's lesson.
// Required lazily to avoid a load-order cycle (conceptLessons is a large leaf module).
function deriveRungsFromLesson(templateType) {
  const { CONCEPT_LESSONS } = require('./conceptLessons');
  const lesson = templateType ? CONCEPT_LESSONS[templateType] : null;
  if (!lesson) return null;

  const rungs = [];
  rungs.push({
    level: 'nudge',
    label: 'Nudge',
    text: `This problem is about ${lesson.title}. Start by identifying what you're asked to find and which quantities you're given — don't compute yet.`,
  });
  if (lesson.oneLineSummary) {
    rungs.push({ level: 'concept', label: 'Concept', text: firstSentence(lesson.oneLineSummary) || lesson.oneLineSummary });
  }
  if (lesson.formula) {
    rungs.push({
      level: 'method',
      label: 'Method',
      text: `Set up the governing relationship $${lesson.formula}$ — match each quantity in your problem to its role, then solve for the one you need.`,
    });
  } else if (lesson.whyItWorks) {
    rungs.push({ level: 'method', label: 'Method', text: firstSentence(lesson.whyItWorks) });
  }
  const cm = Array.isArray(lesson.commonMistakes) ? lesson.commonMistakes[0] : null;
  if (cm && cm.label) {
    const fix = cm.fix ? ` ${firstSentence(cm.fix)}` : '';
    rungs.push({
      level: 'guided',
      label: 'Guided',
      text: `Now work your own numbers one step at a time. The classic slip here is "${cm.label.toLowerCase()}" — check your work against it.${fix}`,
    });
  }
  return rungs;
}

// Build the staged ladder for a template type. `correctAnswer` is used only to filter
// answer-leaking rungs.
function buildHintLadder(templateType, correctAnswer) {
  const t = templateType ? tipsMap[templateType] : null;

  let rungs = null;
  if (t) {
    rungs = [];
    rungs.push({
      level: 'nudge',
      label: 'Nudge',
      text: `This is a ${t.subskill} problem. Start by identifying what you're asked to find and which quantities you're given — don't compute yet.`,
    });
    if (t.conceptualReminder) {
      rungs.push({ level: 'concept', label: 'Concept', text: t.conceptualReminder });
    }
    if (t.tip) {
      rungs.push({ level: 'method', label: 'Method', text: t.tip });
    }
    if (t.commonMistakes) {
      rungs.push({
        level: 'guided',
        label: 'Guided',
        text: `Now apply that method to your specific numbers, one step at a time. A common slip to avoid here: ${t.commonMistakes}`,
      });
    }
  } else {
    rungs = deriveRungsFromLesson(templateType);
  }

  if (!rungs || rungs.length === 0) {
    return [
      {
        stage: 1,
        level: 'nudge',
        label: 'Nudge',
        text: 'Re-read the question and pin down exactly what you need to find and what you are given.',
      },
    ];
  }

  // Drop any rung that would leak the answer, then re-number sequentially.
  const safe = rungs
    .filter((r) => !leaksAnswer(r.text, correctAnswer))
    .map((r, i) => ({ stage: i + 1, ...r }));
  if (safe.length === 0) {
    return [
      {
        stage: 1,
        level: 'nudge',
        label: 'Nudge',
        text: 'Re-read the question and pin down exactly what you need to find and what you are given.',
      },
    ];
  }
  return safe;
}

module.exports = { buildHintLadder, leaksAnswer };
