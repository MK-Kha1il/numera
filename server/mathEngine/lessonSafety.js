// Lesson & Visual Answer-Leak Guard
// ------------------------------------------------------------------------------------
// A lesson should TEACH the concept; it must never hand the learner the answer to the
// exercise sitting in front of them, nor simply restate that exercise as a "worked
// example". This module inspects a lesson against the problem(s) being served and:
//
//   - drops any example whose answer equals an exercise's answer (direct leak), and
//   - drops any example whose question shares the exercise's structural skeleton
//     (a near-identical restatement that removes the productive struggle).
//
// It also strips any explicit answer field accidentally embedded in an interactive
// visual spec (Phase 10: visuals reveal structure, never the answer).
//
// Pure module — reuses the fingerprinting helpers from exerciseMemory.

const { normalizeAnswer, normalizeQuestion } = require('./exerciseMemory');

// Build the "do not reveal" context from the problems being served alongside a lesson.
function buildLeakContext(problems) {
  const list = Array.isArray(problems) ? problems : [problems];
  const answers = new Set();
  const structures = new Set();
  for (const p of list) {
    if (!p) continue;
    const ans = p.correctAnswer !== undefined ? p.correctAnswer
      : p.correct_answer !== undefined ? p.correct_answer
        : p.answer;
    if (ans !== undefined && ans !== null && String(ans).trim() !== '') {
      answers.add(normalizeAnswer(ans));
    }
    if (p.question) structures.add(normalizeQuestion(p.question));
  }
  return { answers, structures };
}

// Returns { lesson, leaks } where leaks is a list of { reason, example } that were removed.
function sanitizeLesson(lesson, problems) {
  if (!lesson || !Array.isArray(lesson.examples) || lesson.examples.length === 0) {
    return { lesson, leaks: [] };
  }
  const ctx = buildLeakContext(problems);
  if (ctx.answers.size === 0 && ctx.structures.size === 0) {
    return { lesson, leaks: [] };
  }

  const leaks = [];
  const safeExamples = lesson.examples.filter((ex) => {
    if (!ex) return false;
    const exAns = normalizeAnswer(ex.answer);
    if (exAns && ctx.answers.has(exAns)) {
      leaks.push({ reason: 'answer_match', example: ex });
      return false;
    }
    const exStruct = normalizeQuestion(ex.question);
    if (exStruct && ctx.structures.has(exStruct)) {
      leaks.push({ reason: 'structure_match', example: ex });
      return false;
    }
    return true;
  });

  if (leaks.length === 0) return { lesson, leaks };

  // Return a shallow clone with the leaking examples removed so we never mutate the
  // shared static lesson objects.
  return { lesson: { ...lesson, examples: safeExamples }, leaks };
}

// Strip any explicit-answer field from an interactive visual spec object. Visuals may
// carry the values needed to render a manipulative, but never a literal "answer" /
// "solution" key the client could surface.
const FORBIDDEN_VISUAL_KEYS = new Set(['answer', 'correctAnswer', 'solution', 'correct_answer']);

function sanitizeVisualSpec(spec) {
  if (!spec || typeof spec !== 'object') return spec;
  let changed = false;
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) {
        if (FORBIDDEN_VISUAL_KEYS.has(k)) {
          changed = true;
          continue;
        }
        out[k] = walk(v);
      }
      return out;
    }
    return node;
  };
  const cleaned = walk(spec);
  return changed ? cleaned : spec;
}

// Convenience for the visual JSON string the orchestrator produces.
function sanitizeVisualJson(json) {
  if (!json || typeof json !== 'string') return json;
  try {
    const parsed = JSON.parse(json);
    const cleaned = sanitizeVisualSpec(parsed);
    return JSON.stringify(cleaned);
  } catch (_) {
    return json;
  }
}

module.exports = {
  buildLeakContext,
  sanitizeLesson,
  sanitizeVisualSpec,
  sanitizeVisualJson,
};
