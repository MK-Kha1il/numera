// Server-authoritative duel grading. The live Socket.IO duel used to trust a client-sent isCorrect
// boolean (and a client-sent next index). applyDuelAnswer now grades the submitted answer itself,
// against the canonical answer the server kept, and owns the progress index. These tests lock that:
// equivalent answer forms are accepted, wrong answers don't score, and — critically — a client
// cannot farm points by replaying an earlier problem, because the server advances the index.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { bootServer, shutdown } = require('./helpers');

let ctx;
before(async () => { ctx = await bootServer(); });
after(async () => { await shutdown(ctx); });

// A room whose answer key is `answers`; problems are answer-stripped like buildDuelProblemSet emits.
// `explanations` is the parallel server-only worked-solution key (revealed only in the submit ack).
function makeRoom(answers, explanations) {
  return {
    roomId: 'grade_test',
    problems: answers.map(() => ({ question: 'q', options: [] })),
    answers,
    explanations: explanations || answers.map((_, i) => `worked solution ${i}`),
    p1: { id: 1, username: 'a', score: 0, progress: 0 },
    p2: { id: 2, username: 'b', score: 0, progress: 0 },
    startTime: Date.now() - 60000, // old start ⇒ generous elapsed, no superhuman-speed flag
    problemLevel: 5,
    isCasual: true
  };
}

test('grades the submitted answer server-side; an equivalent form is accepted', () => {
  const room = makeRoom(['1/2', '5', '8x']);
  const r = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '0.5' }); // 0.5 ≡ 1/2
  assert.equal(r.isCorrect, true, '0.5 should grade as the canonical 1/2');
  assert.equal(room.p1.score, 20, 'a correct answer scores');
  assert.equal(room.p1.progress, 1, 'the server advances the index by one');
  assert.equal(r.correctAnswer, '1/2', 'the canonical answer is disclosed in the ack');
});

test('a wrong answer does not score but still advances', () => {
  const room = makeRoom(['1/2', '5', '8x']);
  const r = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '9' });
  assert.equal(r.isCorrect, false);
  assert.equal(room.p1.score, 0);
  assert.equal(room.p1.progress, 1);
});

test('accepts an equivalent algebraic form (reordered terms)', () => {
  const room = makeRoom(['4x + 12']);
  const r = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '12 + 4x' });
  assert.equal(r.isCorrect, true);
  assert.equal(room.p1.score, 20);
});

test('cannot farm points by replaying problem 0 — the server owns the index', () => {
  const room = makeRoom(['1/2', '5', '8x']); // each problem has a different answer
  // A cheating client spams problem 0's correct answer, hoping to re-score it every time.
  for (let i = 0; i < 10; i++) ctx.mod.applyDuelAnswer(room, 'p1', { answer: '1/2' });
  // Only the first problem (answer 1/2) ever matches; the index marches on and later answers
  // differ, then submissions past the set are ignored. Score is bounded to a single problem.
  assert.equal(room.p1.score, 20, 'only one problem is ever scored — no farming');
  assert.equal(room.p1.progress, 3, 'index advances to the end of the set and stops');
});

test('the worked solution is disclosed only in the post-answer ack, per problem', () => {
  const room = makeRoom(['1/2', '5'], ['half is 0.5', 'the answer is 5']);
  // The live problem set the client received carries NO worked solution (anti-leak invariant)...
  for (const p of room.problems) assert.equal(p.explanation, undefined);
  // ...it is returned only after the irreversible submission, matched to the answered problem.
  const r0 = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '0.5' });
  assert.equal(r0.explanation, 'half is 0.5', 'ack carries problem 0\'s worked solution');
  const r1 = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '5' });
  assert.equal(r1.explanation, 'the answer is 5', 'ack carries problem 1\'s worked solution');
});

test('submissions after the set is finished are ignored (no extra scoring)', () => {
  const room = makeRoom(['1/2', '5']);
  room.p1.progress = 2; room.p2.progress = 2; // both already finished
  const r = ctx.mod.applyDuelAnswer(room, 'p1', { answer: '1/2' });
  assert.equal(room.p1.score, 0, 'no scoring past the end of the problem set');
  assert.equal(r.ended, true, 'the duel reports ended when both players are done');
});
