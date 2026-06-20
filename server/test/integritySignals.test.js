// Pure unit tests for the rating-pump / collusion detector (lib/integritySignals.js, audit #18).
const { test } = require('node:test');
const assert = require('node:assert');
const { detectRatingPump } = require('../lib/integritySignals');

test('a win-trade pair (one opponent = nearly all of a player\'s rating gains) is flagged', () => {
  const rows = [
    { userId: 1, opponentId: 2, matches: 12, posDelta: 180, wins: 7 }, // the pump
    { userId: 1, opponentId: 3, matches: 4, posDelta: 20, wins: 2 },
    { userId: 1, opponentId: 4, matches: 3, posDelta: 10, wins: 1 },
  ];
  const flagged = detectRatingPump(rows);
  assert.equal(flagged.length, 1, 'only the concentrated pair is flagged');
  assert.equal(flagged[0].opponentId, 2);
  assert.ok(flagged[0].concentration >= 0.6, 'most of the gains came from one opponent');
  assert.ok(flagged[0].reasons.includes('rating_concentration'));
});

test('a boosting pair (almost always beats one opponent) is flagged as lopsided', () => {
  const rows = [
    { userId: 5, opponentId: 6, matches: 10, posDelta: 50, wins: 10 }, // 100% winrate vs one foe
    { userId: 5, opponentId: 7, matches: 8, posDelta: 60, wins: 4 },
  ];
  const flagged = detectRatingPump(rows);
  const boost = flagged.find((f) => f.opponentId === 6);
  assert.ok(boost, 'the lopsided pair is flagged');
  assert.ok(boost.reasons.includes('lopsided_winrate'));
});

test('varied, balanced play across many opponents is NOT flagged', () => {
  const rows = [
    { userId: 8, opponentId: 9, matches: 7, posDelta: 30, wins: 4 },
    { userId: 8, opponentId: 10, matches: 8, posDelta: 35, wins: 4 },
    { userId: 8, opponentId: 11, matches: 6, posDelta: 28, wins: 3 },
    { userId: 8, opponentId: 12, matches: 7, posDelta: 32, wins: 4 },
  ];
  assert.equal(detectRatingPump(rows).length, 0, 'healthy spread of opponents trips nothing');
});

test('small samples are ignored (need enough matches first)', () => {
  const rows = [{ userId: 1, opponentId: 2, matches: 3, posDelta: 100, wins: 3 }];
  assert.equal(detectRatingPump(rows).length, 0, 'below MIN_MATCHES → no flag even if concentrated');
});

test('flagged pairs are ranked by severity (more matches × more extreme)', () => {
  const rows = [
    { userId: 1, opponentId: 2, matches: 20, posDelta: 200, wins: 20 },
    { userId: 3, opponentId: 4, matches: 6, posDelta: 60, wins: 6 },
  ];
  const flagged = detectRatingPump(rows);
  assert.ok(flagged[0].score >= flagged[1].score, 'highest severity first');
});
