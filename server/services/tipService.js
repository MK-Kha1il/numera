// Attaches a pedagogically-safe hint to a problem: classify the problem into a template
// type, look up its tip, and suppress the tip if it would leak the answer.
const { tipsMap } = require('../mathEngine/tips');
const { buildHintLadder } = require('../mathEngine/hintLadder');

// Canonical conceptKey → tip template key. The generator now stamps every archive/daily problem
// with a conceptKey (mathGenerator.ARCHIVE_TITLE_TO_CONCEPT); resolving the hint from THAT keeps the
// tip on the same concept as the lesson, instead of re-guessing it by fuzzy title matching (which
// produced e.g. a PEMDAS tip on a chessboard-doubling problem). See docs/ContentEngineAudit-2026-06.md.
const CONCEPT_KEY_TO_TIP = {
  fermat_little:           'fermat_little',
  totient:                 'euler_totient',
  chinese_remainder:       'modulo',
  combinations:            'combinations',
  derangements:            'permutations',
  stars_and_bars:          'combinations',
  integral:                'integral',
  taylor_series:           'derivative',
  basel:                   'limit',
  telescoping_series:      'limit',
  geometric_series:        'limit',
  geometric_progression:   'limit',
  matrix_determinant:      'matrix_determinant',
  eigenvalues:             'matrix_determinant',
  cayley_hamilton:         'matrix_determinant',
  expected_value:          'probability',
  bayes:                   'probability',
  monty_hall:              'probability',
  conditional_probability: 'probability',
  gauss_sum:               'arithmetic_add',
  diophantus:              'linear_two_step',
  linear_word:             'linear_two_step'
};

// Best-effort classification of an archive problem into a tip template key from its
// title/category.
function getArchiveTemplateType(title, category) {
  const t = (title || '').toLowerCase();
  const c = (category || '').toLowerCase();

  if (t.includes('totient')) return 'euler_totient';
  if (t.includes('gcd') || t.includes('greatest common divisor')) return 'gcd';
  if (t.includes('divisor')) return 'divisors';
  if (t.includes('pigeonhole')) return 'pigeonhole';
  if (t.includes('fermat')) return 'fermat_little';
  if (t.includes("euler's identity") || t.includes("euler's formula") || t.includes('euler identity')) return 'euler_identity';
  if (t.includes('limit')) return 'limit';
  if (t.includes('derivative') || t.includes('differentiation')) return 'derivative';
  if (t.includes('integral') || t.includes('integration')) return 'integral';
  if (t.includes('determinant')) return 'matrix_determinant';
  if (t.includes('trace')) return 'matrix_trace';
  if (t.includes('combination') || t.includes('stars and bars') || t.includes('catalan') || t.includes('handshaking') || t.includes('choose')) return 'combinations';
  if (t.includes('permutation') || t.includes('derangement') || t.includes('arrange')) return 'permutations';
  if (t.includes('probability') || t.includes('birthday paradox') || t.includes("gambler's ruin")) return 'probability';
  if (t.includes('congruence') || t.includes('chinese remainder') || t.includes("wilson's theorem") || t.includes('modulo') || t.includes('prime')) return 'modulo';
  if (t.includes('pythagorean') || t.includes('triangle')) return 'pythagorean';

  if (c.includes('number theory')) return 'modulo';
  if (c.includes('combinatorics')) return 'combinations';
  if (c.includes('calculus')) return 'limit';
  if (c.includes('algebra')) return 'linear_two_step';
  if (c.includes('mental')) return 'mental_add';
  if (c.includes('arithmetic')) return 'arithmetic_add';

  return 'arithmetic_add';
}

// Returns false if the tip text would reveal the correct answer.
function checkTipSafety(tipText, correctAnswer) {
  if (!tipText || !correctAnswer) return true;

  const cleanAnswer = correctAnswer.toString().replace(/\$/g, '').trim().toLowerCase();
  const cleanTip = tipText.toString().replace(/\$/g, '').trim().toLowerCase();

  if (cleanAnswer.length === 0) return true;

  const index = cleanTip.indexOf(cleanAnswer);
  if (index !== -1) {
    if (cleanAnswer.length === 1) {
      const regex = new RegExp('\\b' + cleanAnswer + '\\b');
      if (regex.test(cleanTip)) {
        return false;
      }
    } else {
      return false;
    }
  }
  return true;
}

// Mutates and returns the problem with a `.tip` and `.tipMetadata`, falling back safely
// when no tip exists or the tip would leak the answer.
function attachTipToProblem(problem, isArchive) {
  if (!problem) return problem;
  const templateType = problem.templateType
    || (problem.conceptKey && CONCEPT_KEY_TO_TIP[problem.conceptKey])
    || getArchiveTemplateType(problem.title, problem.category);
  const tipData = tipsMap[templateType];
  const correctAnswer = problem.correctAnswer || problem.correct_answer || '';

  // Phase 11: every problem carries the escalating hint ladder (single `tip` kept for
  // backward compatibility = the "method" rung). The full solution is never in the ladder.
  problem.hintLadder = buildHintLadder(templateType, correctAnswer);

  if (!tipData) {
    problem.tip = 'Focus on the core concepts shown in the lesson.';
    return problem;
  }

  const rawTip = tipData.tip || '';

  const isSafe = checkTipSafety(rawTip, correctAnswer);

  if (isSafe) {
    problem.tip = rawTip;
  } else {
    if (isArchive) {
      problem.tip = tipData.conceptualReminder || 'Remember the fundamental properties of this math topic.';
    } else {
      problem.tip = 'Tip unavailable for this exercise.';
    }
  }

  problem.tipMetadata = {
    concept: tipData.concept,
    subskill: tipData.subskill,
    difficulty: tipData.difficulty,
    learningObjective: tipData.learningObjective,
    commonMistakes: tipData.commonMistakes,
  };

  return problem;
}

module.exports = { getArchiveTemplateType, checkTipSafety, attachTipToProblem };
