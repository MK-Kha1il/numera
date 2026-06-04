// Multi-stage Hint Ladder (Phase 11)
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
// dropped and the ladder re-numbered. Pure module (tipsMap + normalizeAnswer only).

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

// Build the staged ladder for a template type. `correctAnswer` is used only to filter
// answer-leaking rungs.
function buildHintLadder(templateType, correctAnswer) {
  const t = templateType ? tipsMap[templateType] : null;

  if (!t) {
    return [
      {
        stage: 1,
        level: 'nudge',
        label: 'Nudge',
        text: 'Re-read the question and pin down exactly what you need to find and what you are given.',
      },
    ];
  }

  const rungs = [];
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

  // Drop any rung that would leak the answer, then re-number sequentially.
  return rungs
    .filter((r) => !leaksAnswer(r.text, correctAnswer))
    .map((r, i) => ({ stage: i + 1, ...r }));
}

module.exports = { buildHintLadder, leaksAnswer };
