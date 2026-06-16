// Plain-language learner progress report (ultra review #51/#78/#40). Built from data we already
// have (the user row + strand mastery counters), framed in concept language a parent can read —
// "what I can do now", not XP jargon. Reused by the parent progress email today and intended to
// back a teacher/class view later, so it returns a structured object plus a renderer.
const { db } = require('../db');

// Learner-facing strand labels (subset of user_mastery's *_correct columns — the ones worth
// surfacing to a parent). Order here is the tie-break when solve counts are equal.
const STRAND_LABELS = {
  arithmetic_correct: 'Arithmetic',
  fractions_correct: 'Fractions',
  decimals_correct: 'Decimals',
  integers_correct: 'Negative numbers',
  algebra_correct: 'Algebra',
  expressions_correct: 'Algebraic expressions',
  equations_correct: 'Equations',
  geometry_correct: 'Geometry',
  number_theory_correct: 'Number theory',
  factors_correct: 'Factors & multiples',
  statistics_correct: 'Statistics & data',
  rates_correct: 'Ratios & rates',
  sequences_correct: 'Sequences',
  functions_correct: 'Functions',
  calculus_correct: 'Calculus',
};

// Resolve a structured report for a user. Never throws for missing mastery (treated as zeros).
function buildProgressReport(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT username, display_name, level, rank, streak, max_streak, solved_count FROM users WHERE id = ?',
      [userId],
      (err, u) => {
        if (err) return reject(err);
        if (!u) return reject(new Error('User not found'));
        db.get('SELECT * FROM user_mastery WHERE user_id = ?', [userId], (e2, m) => {
          if (e2) return reject(e2);
          const strands = [];
          for (const [col, label] of Object.entries(STRAND_LABELS)) {
            const solved = (m && m[col]) || 0;
            if (solved > 0) strands.push({ label, solved });
          }
          strands.sort((a, b) => b.solved - a.solved);
          resolve({
            name: u.display_name || u.username,
            level: u.level || 1,
            rank: u.rank || 'Unranked',
            streak: u.streak || 0,
            maxStreak: u.max_streak || 0,
            totalSolved: u.solved_count || 0,
            // What they're strongest in (most practiced) — concept language, not numbers-first.
            strengths: strands.slice(0, 5),
          });
        });
      }
    );
  });
}

// A warm, plain-text email body a parent can skim. No jargon, no marketing.
function renderReportText(r) {
  const lines = [];
  lines.push(`Here's how ${r.name} is doing on Numera:`);
  lines.push('');
  lines.push(`• Level ${r.level} (${r.rank})`);
  lines.push(`• ${r.totalSolved} problems solved in total`);
  lines.push(`• Current streak: ${r.streak} day${r.streak === 1 ? '' : 's'} (best: ${r.maxStreak})`);
  lines.push('');
  if (r.strengths.length) {
    lines.push('What they’ve been practicing most:');
    for (const s of r.strengths) lines.push(`   - ${s.label} (${s.solved} solved)`);
  } else {
    lines.push('They’re just getting started — check back soon to see their progress grow.');
  }
  lines.push('');
  lines.push('You’re receiving this because the learner chose to share their progress with you.');
  return lines.join('\n');
}

module.exports = { buildProgressReport, renderReportText, STRAND_LABELS };
