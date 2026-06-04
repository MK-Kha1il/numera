// Unit tests for the self-auditing engine scorers (mathEngine/contentAudit.js).
const { test } = require('node:test');
const assert = require('node:assert');
const { flagWeakContent, flagRepetition, runSelfAudit } = require('../mathEngine/contentAudit');

test('flagWeakContent: healthy template is not flagged', () => {
  const row = { template_type: 'arithmetic_add', total_attempts: 50, successes: 45, frustration_index: 0.1, average_time_taken: 6 };
  assert.strictEqual(flagWeakContent(row), null);
});

test('flagWeakContent: ignores templates with too little signal', () => {
  const row = { template_type: 'x', total_attempts: 3, successes: 0, frustration_index: 0.9 };
  assert.strictEqual(flagWeakContent(row), null);
});

test('flagWeakContent: flags low success + high frustration as high severity', () => {
  const row = { template_type: 'quadratic', total_attempts: 40, successes: 8, frustration_index: 0.7, average_time_taken: 50 };
  const flag = flagWeakContent(row);
  assert.ok(flag);
  assert.ok(flag.issues.includes('low_success_rate'));
  assert.ok(flag.issues.includes('high_frustration'));
  assert.ok(flag.issues.includes('slow_completion'));
  assert.strictEqual(flag.severity, 'high');
});

test('flagWeakContent: works on lesson_analytics shape (ms time, abandon/hint rates)', () => {
  const row = { template_type: 'integral', attempt_count: 30, success_count: 12, abandon_count: 9, hint_rate: 0.5, avg_time_ms: 20000 };
  const flag = flagWeakContent(row);
  assert.ok(flag.issues.includes('low_success_rate'));
  assert.ok(flag.issues.includes('high_abandonment'));
  assert.ok(flag.issues.includes('high_hint_dependence'));
});

test('flagRepetition: healthy spread (many distinct structures) is not flagged', () => {
  assert.strictEqual(flagRepetition({ conceptSig: 'linear_two_step', totalSeen: 40, distinctStructures: 12 }), null);
});

test('flagRepetition: high volume + few structures is flagged, single structure is high severity', () => {
  const flagged = flagRepetition({ conceptSig: 'fermat_little', totalSeen: 30, distinctStructures: 1 });
  assert.ok(flagged);
  assert.strictEqual(flagged.severity, 'high');
  assert.strictEqual(flagged.repetitionRatio, 30);
  assert.deepStrictEqual(flagged.issues, ['low_structural_variety']);
  assert.strictEqual(flagged.recommendation, 'add_more_representations');
});

test('flagRepetition: ignores low-volume concepts', () => {
  assert.strictEqual(flagRepetition({ conceptSig: 'totient', totalSeen: 5, distinctStructures: 1 }), null);
});

test('runSelfAudit tolerates a null db and returns a well-formed empty report', async () => {
  const report = await runSelfAudit(null);
  assert.ok(report.generatedAt);
  assert.deepStrictEqual(report.weakContent, []);
  assert.deepStrictEqual(report.repetitiveContent, []);
  assert.strictEqual(report.summary.weakContentCount, 0);
  assert.strictEqual(report.summary.topRecommendation, null);
});
