// Unit tests for the Exercise Memory + Diversity engine (mathEngine/exerciseMemory.js).
// Locks the fingerprinting and novelty-scoring contract that the whole anti-repetition
// system depends on.
const { test } = require('node:test');
const assert = require('node:assert');
const M = require('../mathEngine/exerciseMemory');

test('normalizeQuestion blanks numbers and strips LaTeX to a structural skeleton', () => {
  const a = M.normalizeQuestion('Solve $$3x + 7 = 19$$');
  const b = M.normalizeQuestion('Solve $$5x + 2 = 42$$');
  assert.strictEqual(a, b, 'same structure, different numbers -> identical skeleton');
  assert.ok(a.includes('#'), 'numbers are blanked to #');
  assert.ok(a.includes('solve'), 'words are preserved and lowercased');
});

test('computeSignatures: same structure+concept collide; different concept/structure differ', () => {
  const p1 = { question: 'Solve $$3x + 7 = 19$$', correctAnswer: '4', templateType: 'linear_two_step' };
  const p2 = { question: 'Solve $$5x + 2 = 42$$', correctAnswer: '8', templateType: 'linear_two_step' };
  const p3 = { question: 'A taxi costs 7 plus 3 per mile, total 19. Miles?', correctAnswer: '4', templateType: 'linear_two_step' };
  const p4 = { question: 'Compute $$3 + 7$$', correctAnswer: '10', templateType: 'arithmetic_add' };

  const s1 = M.computeSignatures(p1);
  const s2 = M.computeSignatures(p2);
  const s3 = M.computeSignatures(p3);
  const s4 = M.computeSignatures(p4);

  assert.strictEqual(s1.signature, s2.signature, 'template duplicates share a signature');
  assert.notStrictEqual(s1.signature, s3.signature, 'a word-problem framing is a different structure');
  assert.notStrictEqual(s1.conceptSig, s4.conceptSig, 'different concepts differ');
  assert.notStrictEqual(s1.signature, s4.signature);
});

test('answerSig catches fixed-answer reuse within a concept', () => {
  const a = M.computeSignatures({ question: 'Different wording entirely about primes', correctAnswer: '1', templateType: 'fermat_little' });
  const b = M.computeSignatures({ question: 'Yet another framing of a prime fact', correctAnswer: '1', templateType: 'fermat_little' });
  assert.strictEqual(a.answerSig, b.answerSig, 'same concept + same answer -> same answerSig');
});

test('scoreDiversity: fully novel candidate scores ~1; exact recent repeat scores low', () => {
  const sig = M.computeSignatures({ question: 'Solve $$3x + 7 = 19$$', correctAnswer: '4', templateType: 'linear_two_step' });

  const novel = M.scoreDiversity(sig, []);
  assert.strictEqual(novel.score, 1, 'no history -> maximally fresh');

  const repeated = M.scoreDiversity(sig, [sig]);
  assert.ok(repeated.score < 0.5, `exact recent repeat is heavily penalised (got ${repeated.score})`);
  assert.ok(repeated.breakdown.signature < 0.2, 'signature dimension tanks on exact repeat');
});

test('scoreDiversity: a new structure of a recently-seen concept beats an exact repeat', () => {
  const seen = M.computeSignatures({ question: 'Solve $$3x + 7 = 19$$', correctAnswer: '4', templateType: 'linear_two_step' });
  const sameStructure = M.computeSignatures({ question: 'Solve $$9x + 1 = 28$$', correctAnswer: '3', templateType: 'linear_two_step' });
  const newStructure = M.computeSignatures({ question: 'A taxi costs 7 plus 3 per mile, total 19. Miles?', correctAnswer: '5', templateType: 'linear_two_step' });

  const repeatScore = M.scoreDiversity(sameStructure, [seen]).score;
  const freshScore = M.scoreDiversity(newStructure, [seen]).score;
  assert.ok(freshScore > repeatScore, 'a fresh representation of the same concept is preferred');
});

test('pickFreshExercise (no db) selects the most novel of several candidates', async () => {
  // Candidate factory: attempts 0..3 yield the SAME structure; attempt 4 yields a novel one.
  // With the recent list already containing that repeated structure, the novel one must win.
  const repeated = { question: 'Solve $$3x + 7 = 19$$', correctAnswer: '4', templateType: 'linear_two_step' };
  const novel = { question: 'A network of 6 computers, cable each pair. How many cables?', correctAnswer: '15', templateType: 'combinations' };
  const recent = [M.computeSignatures(repeated)];

  const generate = (attempt) => (attempt >= 4 ? novel : repeated);
  const picked = await M.pickFreshExercise(null, null, generate, { recent, attempts: 6, threshold: 0.9 });
  assert.strictEqual(picked.problem, novel, 'the novel candidate is chosen over repeats');
  assert.ok(picked.diversity > 0.8);
});

test('pickFreshExercise records the pick into the batch list to keep a page internally diverse', async () => {
  const batchSigs = [];
  const p = { question: 'Compute $$2 + 2$$', correctAnswer: '4', templateType: 'arithmetic_add' };
  await M.pickFreshExercise(null, null, () => p, { recent: [], batchSigs, attempts: 2 });
  assert.strictEqual(batchSigs.length, 1, 'the chosen signature is pushed onto the batch list');
});

test('leastRecentlySeen prefers unseen concepts, then the stalest, then input order', () => {
  // 'b' was seen most recently, 'a' a while ago, 'c' never seen.
  const recency = {
    a: { lastSeen: 100, seenCount: 5 },
    b: { lastSeen: 999, seenCount: 1 },
  };
  assert.strictEqual(M.leastRecentlySeen(['a', 'b', 'c'], recency), 'c', 'never-seen wins');
  assert.strictEqual(M.leastRecentlySeen(['a', 'b'], recency), 'a', 'staler of two seen wins');
  // Tie on lastSeen → lower total exposure wins.
  const tie = { a: { lastSeen: 100, seenCount: 9 }, b: { lastSeen: 100, seenCount: 2 } };
  assert.strictEqual(M.leastRecentlySeen(['a', 'b'], tie), 'b');
  // Empty history → first candidate.
  assert.strictEqual(M.leastRecentlySeen(['x', 'y'], {}), 'x');
});
