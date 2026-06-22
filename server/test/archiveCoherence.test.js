// Archive / Daily-Puzzle content COHERENCE (docs/ContentEngineAudit-2026-06.md §2, §4).
// ------------------------------------------------------------------------------------
// The defect this guards against: archive & daily problems used to re-derive their lesson and hint
// by fuzzy keyword matching on the rendered title, with a star→fakeLevel fallback that silently bound
// unrelated concepts (a Euler-totient problem taught with the Binomial Theorem; chessboard doubling
// taught with PEMDAS). Now the generator stamps a canonical `conceptKey` and lesson/hint resolve from
// THAT. This locks the guarantee: for every problem the generator can emit,
//   (1) it carries a conceptKey,
//   (2) the lesson resolves to that exact concept (never the generic fallback, never a mismatch),
//   (3) the hint resolves to a concept-matched tip (tipMetadata present, not the bare default).
const { test } = require('node:test');
const assert = require('node:assert');
const { generateArchiveProblem, getLessonForArchiveProblem } = require('../mathGenerator');
const { attachTipToProblem } = require('../services/tipService');
const LessonSafety = require('../mathEngine/lessonSafety');

// Every category × star tier the daily/archive generators sample from.
const CATEGORIES = ['Number Theory', 'Combinatorics', 'Calculus', 'Algebra', 'Mental', 'Arithmetic'];
const STARS = [2, 3, 4, 5];
const SAMPLES = 20; // enough to hit every random sub-branch (rolls, coin flips) per cell

// conceptKey → a pattern the resolved lesson title MUST match. Proves the lesson is on-concept
// rather than an unrelated fallback.
const CONCEPT_EXPECT = {
  fermat_little:           /fermat/i,
  totient:                 /totient/i,
  chinese_remainder:       /chinese remainder/i,
  combinations:            /combination/i,
  derangements:            /derangement/i,
  stars_and_bars:          /stars and bars/i,
  integral:                /integral/i,
  taylor_series:           /taylor/i,
  basel:                   /basel/i,
  telescoping_series:      /telescop/i,
  geometric_series:        /geometric/i,
  geometric_progression:   /geometric|progression|doubling/i,
  matrix_determinant:      /determinant/i,
  eigenvalues:             /eigenvalue/i,
  cayley_hamilton:         /cayley/i,
  expected_value:          /expected value/i,
  bayes:                   /bayes/i,
  monty_hall:              /monty hall/i,
  conditional_probability: /conditional probability/i,
  gauss_sum:               /gauss/i,
  diophantus:              /diophantus/i,
  linear_word:             /linear|word/i,
};

const GENERIC_FALLBACK_TITLE = 'Mathematical Principles';

test('every generated archive problem carries a conceptKey', () => {
  for (const cat of CATEGORIES) {
    for (const stars of STARS) {
      for (let i = 0; i < SAMPLES; i++) {
        const p = generateArchiveProblem(cat, stars);
        assert.ok(p.conceptKey, `${cat} ${stars}★ "${p.title}" has no conceptKey`);
        assert.ok(CONCEPT_EXPECT[p.conceptKey], `unknown conceptKey "${p.conceptKey}" from "${p.title}" — add it to the mapping + this test`);
      }
    }
  }
});

test('lesson resolves to the SAME concept as the problem (no generic fallback, no mismatch)', () => {
  for (const cat of CATEGORIES) {
    for (const stars of STARS) {
      for (let i = 0; i < SAMPLES; i++) {
        const p = generateArchiveProblem(cat, stars);
        const lesson = getLessonForArchiveProblem(p);
        assert.ok(lesson && lesson.lessonTitle, `${p.title}: no lesson resolved`);
        assert.notStrictEqual(lesson.lessonTitle, GENERIC_FALLBACK_TITLE, `${p.title} (${p.conceptKey}): fell back to the generic lesson`);
        const expect = CONCEPT_EXPECT[p.conceptKey];
        assert.match(
          lesson.lessonTitle,
          expect,
          `${p.conceptKey}: lesson "${lesson.lessonTitle}" does not match its concept`
        );
      }
    }
  }
});

test('lesson is answer-safe and never empties out against the problem', () => {
  for (const cat of CATEGORIES) {
    for (const stars of STARS) {
      for (let i = 0; i < SAMPLES; i++) {
        const p = generateArchiveProblem(cat, stars);
        const lesson = getLessonForArchiveProblem(p);
        const { lesson: safe } = LessonSafety.sanitizeLesson(lesson, {
          question: p.question,
          correct_answer: p.correct_answer,
        });
        assert.ok(safe && safe.lessonTitle, `${p.conceptKey}: lesson lost its title after answer-leak sanitize`);
        assert.ok(safe.lessonContent && safe.lessonContent.length > 0, `${p.conceptKey}: lesson lost its content`);
      }
    }
  }
});

test('hint resolves to a concept-matched tip (tipMetadata present, not the bare default)', () => {
  for (const cat of CATEGORIES) {
    for (const stars of STARS) {
      for (let i = 0; i < SAMPLES; i++) {
        const p = generateArchiveProblem(cat, stars);
        const tipped = attachTipToProblem({ ...p }, true);
        assert.ok(tipped.tip && tipped.tip.length > 0, `${p.conceptKey}: no tip`);
        assert.ok(tipped.tipMetadata, `${p.conceptKey}: hint fell through to the no-template default (no tipMetadata)`);
      }
    }
  }
});
