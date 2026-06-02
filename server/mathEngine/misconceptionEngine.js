// Misconception Engine — classifies wrong answers into named error patterns,
// tracks frequency / severity / persistence, and drives targeted remediation

const { concepts } = require('./knowledgeGraph');

// Severity thresholds
const SEVERITY = { low: 1, medium: 3, high: 6 };  // frequency cutoffs

// Additional structural misconception patterns not captured by knowledgeGraph rules
const GLOBAL_PATTERNS = [
  {
    id:    'sign_error',
    label: 'Sign error — positive/negative confusion',
    test:  (correct, wrong) => Math.abs(correct) === Math.abs(wrong) && correct !== wrong
  },
  {
    id:    'off_by_one',
    label: 'Off-by-one counting error',
    test:  (correct, wrong) => Math.abs(correct - wrong) === 1
  },
  {
    id:    'order_of_operations',
    label: 'PEMDAS / BODMAS order of operations error',
    test:  (correct, wrong) => {
      // Heuristic: wrong answer is plausible if it could result from left-to-right eval
      return typeof correct === 'number' && typeof wrong === 'number' &&
             Math.abs(correct - wrong) > 1 && Math.abs(correct - wrong) < Math.abs(correct) * 0.5;
    }
  },
  {
    id:    'fraction_addition',
    label: 'Fraction addition — added numerators AND denominators',
    test:  (correct, wrong, meta) => meta && meta.fractionOp === 'add' &&
                                     wrong === meta.numSum / meta.denSum
  },
  {
    id:    'forgot_negative',
    label: 'Dropped negative sign in result',
    test:  (correct, wrong) => correct < 0 && wrong === -correct
  }
];

// Classify a wrong answer for a given concept
function classifyMisconception(conceptId, correctAnswer, wrongAnswer, params = {}) {
  const num_correct = parseFloat(correctAnswer);
  const num_wrong   = parseFloat(wrongAnswer);

  // 1. Try concept-specific misconception rules from knowledgeGraph
  const concept = concepts[conceptId];
  if (concept && concept.misconceptions) {
    for (const m of concept.misconceptions) {
      try {
        const predicted = m.rule(num_correct, params);
        if (Math.abs(predicted - num_wrong) < 0.01) {
          return { id: m.id, label: m.label, source: 'concept_specific' };
        }
      } catch (_) { /* rule may throw for missing params — skip */ }
    }
  }

  // 2. Try global structural patterns
  for (const p of GLOBAL_PATTERNS) {
    if (p.test(num_correct, num_wrong, params)) {
      return { id: p.id, label: p.label, source: 'global' };
    }
  }

  // 3. No match — log as generic wrong answer
  return { id: 'unclassified', label: 'Unclassified error', source: 'none' };
}

// Severity based on frequency
function computeSeverity(frequency) {
  if (frequency >= SEVERITY.high)   return 'high';
  if (frequency >= SEVERITY.medium) return 'medium';
  return 'low';
}

// Record a misconception occurrence for a user
function recordMisconception(db, userId, conceptId, misconceptionId, misconceptionLabel) {
  return new Promise((resolve, reject) => {
    const now = Date.now();
    db.get(
      `SELECT * FROM user_misconceptions WHERE user_id=? AND concept_id=? AND misconception_type=?`,
      [userId, conceptId, misconceptionId],
      (err, row) => {
        if (err) return reject(err);
        if (row) {
          const newFreq = row.frequency + 1;
          const severity = computeSeverity(newFreq);
          // Persistence: how many sessions ago it first appeared (proxy: unchanged label = still there)
          const persistence = Math.min(1, newFreq / 10);
          db.run(
            `UPDATE user_misconceptions SET
               frequency=?, severity=?, persistence=?, last_occurred=?, resolved=0
             WHERE user_id=? AND concept_id=? AND misconception_type=?`,
            [newFreq, severity, persistence, now, userId, conceptId, misconceptionId],
            (e) => e ? reject(e) : resolve({ ...row, frequency: newFreq, severity, persistence })
          );
        } else {
          db.run(
            `INSERT INTO user_misconceptions
               (user_id, concept_id, misconception_type, misconception_label,
                frequency, last_occurred, severity, persistence, resolved)
             VALUES (?,?,?,?,1,?,'low',0.1,0)`,
            [userId, conceptId, misconceptionId, misconceptionLabel, now],
            function (e) {
              e ? reject(e) : resolve({
                user_id: userId, concept_id: conceptId,
                misconception_type: misconceptionId, misconception_label: misconceptionLabel,
                frequency: 1, severity: 'low', persistence: 0.1, resolved: 0
              });
            }
          );
        }
      }
    );
  });
}

// Mark a misconception as resolved when user answers correctly after having it
function resolveMisconception(db, userId, conceptId, misconceptionId) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE user_misconceptions SET resolved=1, persistence=MAX(0, persistence-0.2)
       WHERE user_id=? AND concept_id=? AND misconception_type=?`,
      [userId, conceptId, misconceptionId],
      (err) => err ? reject(err) : resolve()
    );
  });
}

// Get active (unresolved) misconceptions for a user, ordered by severity/persistence
function getActiveMisconceptions(db, userId, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM user_misconceptions
       WHERE user_id=? AND resolved=0
       ORDER BY
         CASE severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
         persistence DESC,
         frequency DESC
       LIMIT ?`,
      [userId, limit],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Get misconceptions for a specific concept
function getConceptMisconceptions(db, userId, conceptId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM user_misconceptions
       WHERE user_id=? AND concept_id=? AND resolved=0
       ORDER BY frequency DESC`,
      [userId, conceptId],
      (err, rows) => err ? reject(err) : resolve(rows || [])
    );
  });
}

// Build a targeted explanation warning based on known misconceptions
function buildMisconceptionWarning(misconceptions) {
  if (!misconceptions || misconceptions.length === 0) return null;
  const top = misconceptions[0];
  return {
    type:       top.misconception_type,
    label:      top.misconception_label,
    severity:   top.severity,
    frequency:  top.frequency,
    warning:    `⚠️ Watch out: you have previously made the error "${top.misconception_label}" ` +
                `${top.frequency} time${top.frequency > 1 ? 's' : ''}. ` +
                `Double-check this step carefully.`
  };
}

module.exports = {
  classifyMisconception,
  recordMisconception,
  resolveMisconception,
  getActiveMisconceptions,
  getConceptMisconceptions,
  buildMisconceptionWarning
};
