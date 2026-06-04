// Teaching Engine — infers each learner's preferred explanation style
// and adapts explanations accordingly

// Style taxonomy
const STYLES = {
  visual:      'visual',      // diagrams, spatial reasoning, geometric intuition
  pattern:     'pattern',     // notices numerical / structural patterns first
  intuition:   'intuition',   // intuition-first, guess then verify
  rule_based:  'rule_based',  // prefers explicit rule statement before examples
  example:     'example'      // prefers worked example before rule
};

// A signal is a (style, outcome) pair emitted when a learner interacts with content.
// Outcome: +1 = faster/correct after this style, -1 = slower/wrong despite this style.
function recordStyleSignal(db, userId, styleType, outcome) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO learning_style_signals (user_id, style_type, signal_weight, sample_count, last_updated)
       VALUES (?,?,?,1,?)
       ON CONFLICT(user_id, style_type) DO UPDATE SET
         signal_weight = (signal_weight * sample_count + ?) / (sample_count + 1),
         sample_count  = sample_count + 1,
         last_updated  = ?`,
      [userId, styleType, outcome, Date.now(), outcome, Date.now()],
      (err) => err ? reject(err) : resolve()
    );
  });
}

// Returns { dominant: styleKey, weights: { style: weight, ... } }
function getLearningStyle(db, userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT style_type, signal_weight, sample_count FROM learning_style_signals
       WHERE user_id=? ORDER BY signal_weight DESC`,
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        if (!rows || rows.length === 0) {
          return resolve({ dominant: STYLES.example, weights: {}, confident: false });
        }
        const weights = {};
        rows.forEach(r => { weights[r.style_type] = r.signal_weight; });
        const dominant = rows[0].style_type;
        const confident = rows[0].sample_count >= 5;
        resolve({ dominant, weights, confident });
      }
    );
  });
}

// Adapt an explanation object based on inferred learning style.
// explanation: { solution, simplified, tip, misconceptionWarning }
function adaptExplanation(explanation, styleProfile) {
  const { dominant, confident } = styleProfile;
  if (!confident) return explanation; // not enough data yet — return as-is

  const adapted = { ...explanation };

  if (dominant === STYLES.rule_based) {
    // Lead with the rule, then show the solution
    adapted.lead = '📐 **Rule first**: ' + (explanation.tip || '');
    adapted.body = explanation.solution;
  } else if (dominant === STYLES.example) {
    // Lead with a worked step, then generalise
    adapted.lead = '🔢 **Worked example**:';
    adapted.body = explanation.solution;
  } else if (dominant === STYLES.intuition) {
    // Lead with intuition check, then formalise
    adapted.lead = '💭 **Intuition check**: Does your answer feel right given the numbers?';
    adapted.body = explanation.simplified || explanation.solution;
  } else if (dominant === STYLES.pattern) {
    // Highlight the mathematical pattern
    adapted.lead = '🔍 **Pattern**: Look for a structural regularity in the numbers.';
    adapted.body = explanation.solution;
  } else if (dominant === STYLES.visual) {
    adapted.lead = '📊 **Visualise**: Draw or sketch the relationship before calculating.';
    adapted.body = explanation.solution;
  }

  return adapted;
}

// Infer a style signal from a problem result
// Called by the orchestrator after every answer
function inferSignalFromResult(event, conceptId) {
  // If user was fast and correct → their dominant style worked
  // If user was slow or wrong → their dominant style may not fit
  const signals = [];

  if (event.usedHint) {
    // Hint needed → current explanation style didn't work
    signals.push({ style: STYLES.example, outcome: -0.5 });
  }

  if (event.correct && event.responseMs < 8000) {
    // Fast correct → reinforce whatever style they prefer
    signals.push({ style: STYLES.pattern, outcome: 0.3 });
  }

  if (!event.correct && event.wasRetry) {
    // Retried and still wrong → needs rule-based clarity
    signals.push({ style: STYLES.rule_based, outcome: 0.5 });
  }

  return signals;
}

module.exports = {
  STYLES,
  recordStyleSignal,
  getLearningStyle,
  adaptExplanation,
  inferSignalFromResult
};
