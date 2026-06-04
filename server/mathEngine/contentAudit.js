// Self-Auditing Engine (Phase 15)
// ------------------------------------------------------------------------------------
// Continuously turns the telemetry the app already collects into an actionable content
// health report, so weak/confusing/repetitive content surfaces automatically instead of
// waiting for a human to notice. Three signals, fused into one audit:
//
//   1. WEAK CONTENT     — from problem_pedagogical_feedback + lesson_analytics: low success,
//                         high frustration/hint usage, high abandonment, slow completion.
//   2. REPETITIVE       — from exercise_exposure (the anti-repetition memory): concepts that
//                         are served a lot but draw from very few distinct STRUCTURES are
//                         exactly the slots whose generator needs more representations. This
//                         is the signal that closes the loop on this whole overhaul.
//   3. SUMMARY          — counts + the single highest-priority recommendation.
//
// Pure scoring helpers are exported for unit testing; the DB readers wrap them.

// --- pure: classify one template's pedagogical feedback row into issue flags ---
function flagWeakContent(row) {
  const attempts = row.total_attempts || row.attempt_count || 0;
  if (attempts < 8) return null; // not enough signal to judge
  const successes = row.successes != null ? row.successes : row.success_count || 0;
  const successRate = attempts > 0 ? successes / attempts : 0;
  const frustration = row.frustration_index != null ? row.frustration_index : null;
  const abandonRate = row.abandon_count != null ? row.abandon_count / attempts : null;
  const hintRate = row.hint_rate != null ? row.hint_rate : null;
  const avgTime = row.average_time_taken != null ? row.average_time_taken : (row.avg_time_ms || 0);

  const issues = [];
  if (successRate < 0.5) issues.push('low_success_rate');
  if (frustration != null && frustration > 0.5) issues.push('high_frustration');
  if (abandonRate != null && abandonRate > 0.2) issues.push('high_abandonment');
  if (hintRate != null && hintRate > 0.4) issues.push('high_hint_dependence');
  // avg_time stored in ms for lesson_analytics; pedagogical_feedback stores seconds — treat
  // either >45s as slow.
  const slowMs = avgTime > 1000 ? avgTime : avgTime * 1000;
  if (slowMs > 45000) issues.push('slow_completion');

  if (issues.length === 0) return null;
  const severity = issues.length >= 3 || successRate < 0.3 ? 'high' : issues.length === 2 ? 'medium' : 'low';
  return {
    templateType: row.template_type,
    successRate: Number(successRate.toFixed(3)),
    frustration,
    abandonRate: abandonRate != null ? Number(abandonRate.toFixed(3)) : null,
    hintRate: hintRate != null ? Number(hintRate.toFixed(3)) : null,
    attempts,
    issues,
    severity,
  };
}

// --- pure: judge whether a concept is being served too repetitively ---
// row: { conceptSig, totalSeen, distinctStructures }
function flagRepetition(row) {
  const totalSeen = row.totalSeen || 0;
  const distinct = row.distinctStructures || 0;
  if (totalSeen < 12) return null; // need enough volume to call it repetitive
  if (distinct >= 6) return null; // plenty of structural variety, regardless of volume
  // Average times each distinct structure has been served. High ratio = the generator keeps
  // re-serving the same few shapes -> the slot needs more representations.
  const ratio = distinct > 0 ? totalSeen / distinct : totalSeen;
  if (ratio < 3) return null; // few structures but each only lightly reused — acceptable
  const severity = distinct <= 1 ? 'high' : ratio >= 6 ? 'high' : ratio >= 4 ? 'medium' : 'low';
  return {
    conceptSig: row.conceptSig,
    totalSeen,
    distinctStructures: distinct,
    repetitionRatio: Number(ratio.toFixed(2)),
    issues: ['low_structural_variety'],
    severity,
    recommendation: 'add_more_representations',
  };
}

// --- DB: pull weak-content candidates from both feedback tables ---
function getWeakContent(db) {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    db.all('SELECT * FROM problem_pedagogical_feedback', [], (err, pRows) => {
      const fromPedagogical = (err || !pRows ? [] : pRows).map(flagWeakContent).filter(Boolean);
      db.all('SELECT * FROM lesson_analytics', [], (err2, lRows) => {
        const fromLessons = (err2 || !lRows ? [] : lRows).map(flagWeakContent).filter(Boolean);
        // Merge by templateType, keeping the worst severity.
        const byType = {};
        const rank = { low: 1, medium: 2, high: 3 };
        for (const item of fromPedagogical.concat(fromLessons)) {
          const cur = byType[item.templateType];
          if (!cur || rank[item.severity] > rank[cur.severity]) byType[item.templateType] = item;
          else if (cur) cur.issues = Array.from(new Set(cur.issues.concat(item.issues)));
        }
        resolve(Object.values(byType).sort((a, b) => rank[b.severity] - rank[a.severity]));
      });
    });
  });
}

// --- DB: aggregate the exposure memory into per-concept structural variety ---
function getRepetitiveContent(db) {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    db.all(
      `SELECT concept_sig AS conceptSig,
              SUM(seen_count) AS totalSeen,
              COUNT(DISTINCT structure_sig) AS distinctStructures
         FROM exercise_exposure
        GROUP BY concept_sig`,
      [],
      (err, rows) => {
        if (err || !rows) return resolve([]);
        const rank = { low: 1, medium: 2, high: 3 };
        resolve(rows.map(flagRepetition).filter(Boolean).sort((a, b) => rank[b.severity] - rank[a.severity]));
      }
    );
  });
}

// --- DB: the full self-audit report ---
async function runSelfAudit(db) {
  const [weakContent, repetitiveContent] = await Promise.all([
    getWeakContent(db),
    getRepetitiveContent(db),
  ]);

  const topWeak = weakContent[0];
  const topRepetitive = repetitiveContent[0];
  let topRecommendation = null;
  if (topWeak && (topWeak.severity === 'high' || !topRepetitive)) {
    topRecommendation = `Revise lesson/hints for "${topWeak.templateType}" (${topWeak.issues.join(', ')}).`;
  } else if (topRepetitive) {
    topRecommendation = `Add more representations for "${topRepetitive.conceptSig}" (only ${topRepetitive.distinctStructures} distinct structures over ${topRepetitive.totalSeen} exposures).`;
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      weakContentCount: weakContent.length,
      repetitiveContentCount: repetitiveContent.length,
      highSeverityCount:
        weakContent.filter((w) => w.severity === 'high').length +
        repetitiveContent.filter((r) => r.severity === 'high').length,
      topRecommendation,
    },
    weakContent,
    repetitiveContent,
  };
}

module.exports = { flagWeakContent, flagRepetition, getWeakContent, getRepetitiveContent, runSelfAudit };
