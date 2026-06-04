// Exercise Memory + Diversity Engine
// ------------------------------------------------------------------------------------
// The keystone of the anti-repetition system. Two responsibilities:
//
//   1. MEMORY   — remember what each learner has recently experienced (per-user
//                 fingerprints of served problems) so the engine never generates blind.
//   2. DIVERSITY — score a *candidate* problem for novelty across several dimensions
//                 (concept / structure / context / answer) against that memory, so the
//                 generator can prefer the freshest of several candidates and discard
//                 near-duplicates.
//
// A problem is fingerprinted into several orthogonal "signatures":
//   - conceptSig    the concept/template family            ("linear_two_step")
//   - structureSig  the question skeleton with all numbers blanked to '#'  (template shape)
//   - contextSig    the non-numeric wording (story/framing)  (real-world dressing)
//   - answerSig     the normalized correct answer            (catches fixed-answer reuse)
//   - signature     conceptSig + structureSig                (primary near-duplicate key)
//
// The pure functions (computeSignatures / normalizeQuestion / scoreDiversity) carry no
// DB or IO and are unit-tested. The async helpers persist + read the per-user memory.

const crypto = require('crypto');

function hash(str) {
  return crypto.createHash('sha1').update(str || '').digest('hex').slice(0, 16);
}

// Collapse a question down to its structural skeleton: strip LaTeX delimiters and
// commands, blank every number to '#', lowercase, and collapse whitespace. Two problems
// with the same wording but different numbers map to the SAME structureSig — that is the
// definition of a "template duplicate" we want to detect.
function normalizeQuestion(question) {
  if (!question) return '';
  return String(question)
    .replace(/\$+/g, ' ')                 // drop $ / $$ math delimiters
    .replace(/\\[a-zA-Z]+/g, ' ')         // drop LaTeX commands (\frac, \pmod, \times...)
    .replace(/[{}()[\]\\]/g, ' ')         // drop grouping/escape chars
    .replace(/-?\d+(?:\.\d+)?/g, '#')     // blank every number
    .replace(/[^a-z#\s]/gi, ' ')          // keep letters / '#' / spaces only
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// The non-numeric "story words" — the contextual dressing of a problem (committee,
// shipping container, dice, chessboard...). Detects context/wording reuse independent of
// the underlying structure. We drop the very common math stop-words so two genuinely
// different real-world framings of the same concept don't collide.
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'of', 'to', 'for', 'in', 'is', 'are', 'be', 'and', 'or', 'with',
  'find', 'compute', 'evaluate', 'determine', 'calculate', 'solve', 'value', 'what',
  'how', 'many', 'which', 'if', 'then', 'that', 'this', 'each', 'following', 'given',
  'x', 'n', 'k', 'y', 'equation', 'expression', 'number', 'integer', 'result',
]);

function contextWords(question) {
  const skeleton = normalizeQuestion(question);
  const words = skeleton
    .split(' ')
    .filter((w) => w.length > 2 && w !== '#' && !w.includes('#') && !STOP_WORDS.has(w));
  // Sorted unique set → order-independent context fingerprint.
  return Array.from(new Set(words)).sort();
}

// Normalize an answer for comparison: trim LaTeX, lowercase, strip spaces.
function normalizeAnswer(ans) {
  if (ans === null || ans === undefined) return '';
  return String(ans)
    .replace(/\$+/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim();
}

// Pull the concept identity off any problem shape we serve (standard, archive, daily).
function conceptOf(problem) {
  return (
    problem.conceptId ||
    problem.templateType ||
    problem.type ||
    (problem.title ? `archive:${problem.title}` : 'unknown')
  );
}

function answerOf(problem) {
  if (problem.correctAnswer !== undefined) return problem.correctAnswer;
  if (problem.correct_answer !== undefined) return problem.correct_answer;
  if (problem.answer !== undefined) return problem.answer;
  return '';
}

// Compute the full signature bundle for a problem.
function computeSignatures(problem) {
  const concept = String(conceptOf(problem));
  const skeleton = normalizeQuestion(problem.question);
  const ctxWords = contextWords(problem.question);
  const answer = normalizeAnswer(answerOf(problem));

  const conceptSig = concept;
  const structureSig = hash(`${concept}|${skeleton}`);
  const contextSig = hash(ctxWords.join('|'));
  const answerSig = hash(`${concept}|${answer}`);
  const signature = hash(`${conceptSig}|${structureSig}`);

  return { signature, conceptSig, structureSig, contextSig, answerSig };
}

// ------------------------------------------------------------------------------------
// Diversity scoring
// ------------------------------------------------------------------------------------
// Given a candidate's signatures and a list of recent exposures (most-recent first),
// return a novelty score in [0,1] plus a per-dimension breakdown. 1.0 = wholly novel.
// Recent items are weighted more heavily — repeating something from 2 problems ago is
// far worse than repeating something from 40 problems ago.

const DIMENSION_WEIGHTS = {
  signature: 0.45, // exact concept+structure repeat — the worst offense
  structure: 0.25, // same skeleton (e.g. always "ax + b = c")
  context: 0.15, // same story/framing
  answer: 0.05, // same answer for the same concept (e.g. always "1")
  concept: 0.10, // hammering the same concept many times in a row
};

function scoreDiversity(sigs, recent) {
  const recentList = recent || [];
  const n = recentList.length;
  if (n === 0) {
    return { score: 1, breakdown: { signature: 1, structure: 1, context: 1, answer: 1, concept: 1 } };
  }

  // Recency weight: index 0 (most recent) → 1.0, decaying linearly toward the window edge.
  const recencyWeight = (i) => 1 - (i / (n + 1));

  let sigPenalty = 0;
  let structPenalty = 0;
  let ctxPenalty = 0;
  let ansPenalty = 0;
  let conceptHits = 0;
  let conceptWeight = 0;

  recentList.forEach((r, i) => {
    const w = recencyWeight(i);
    if (r.signature === sigs.signature) sigPenalty = Math.max(sigPenalty, w);
    if (r.structureSig === sigs.structureSig) structPenalty = Math.max(structPenalty, w);
    if (r.contextSig === sigs.contextSig) ctxPenalty = Math.max(ctxPenalty, w);
    if (r.answerSig === sigs.answerSig) ansPenalty = Math.max(ansPenalty, w);
    if (r.conceptSig === sigs.conceptSig) {
      conceptHits += 1;
      conceptWeight += w;
    }
  });

  // Concept penalty grows with how recently/often the concept recurs, but saturates —
  // a learner DOES practise one concept repeatedly; we only punish monotony.
  const conceptPenalty = Math.min(1, conceptWeight / 3);

  const dims = {
    signature: 1 - sigPenalty,
    structure: 1 - structPenalty,
    context: 1 - ctxPenalty,
    answer: 1 - ansPenalty,
    concept: 1 - conceptPenalty,
  };

  const score =
    dims.signature * DIMENSION_WEIGHTS.signature +
    dims.structure * DIMENSION_WEIGHTS.structure +
    dims.context * DIMENSION_WEIGHTS.context +
    dims.answer * DIMENSION_WEIGHTS.answer +
    dims.concept * DIMENSION_WEIGHTS.concept;

  return { score, breakdown: dims, conceptHits };
}

// ------------------------------------------------------------------------------------
// Persistence (per-user memory)
// ------------------------------------------------------------------------------------

// Read the user's recent exposures (most-recent first), capped to a window.
function getRecentExposures(db, userId, limit = 60) {
  return new Promise((resolve) => {
    if (!db) return resolve([]);
    db.all(
      `SELECT signature, concept_sig AS conceptSig, structure_sig AS structureSig,
              context_sig AS contextSig, answer_sig AS answerSig, last_seen
         FROM exercise_exposure
        WHERE user_id = ?
        ORDER BY last_seen DESC
        LIMIT ?`,
      [userId, limit],
      (err, rows) => resolve(err || !rows ? [] : rows)
    );
  });
}

// Record (or bump) an exposure. Upsert keyed by (user, signature): structurally identical
// problems collapse into one row whose seen_count rises and last_seen refreshes.
function recordExposure(db, userId, sigs, surface = 'problem') {
  return new Promise((resolve) => {
    if (!db) return resolve();
    const now = Date.now();
    db.run(
      `INSERT INTO exercise_exposure
         (user_id, signature, concept_sig, structure_sig, context_sig, answer_sig, surface, seen_count, first_seen, last_seen)
       VALUES (?,?,?,?,?,?,?,1,?,?)
       ON CONFLICT(user_id, signature) DO UPDATE SET
         seen_count = seen_count + 1,
         last_seen  = excluded.last_seen,
         answer_sig = excluded.answer_sig,
         context_sig = excluded.context_sig`,
      [userId, sigs.signature, sigs.conceptSig, sigs.structureSig, sigs.contextSig, sigs.answerSig, surface, now, now],
      () => resolve()
    );
  });
}

// Aggregate per-concept recency for the orchestrator: how recently / how often has this
// learner seen each concept? Used to break ties when several concepts are equally valid to
// teach next, so concept *selection* rotates instead of always returning the same one.
// Returns a map { conceptSig: { lastSeen, seenCount } }.
function getConceptRecency(db, userId) {
  return new Promise((resolve) => {
    if (!db) return resolve({});
    db.all(
      `SELECT concept_sig AS conceptSig, MAX(last_seen) AS lastSeen, SUM(seen_count) AS seenCount
         FROM exercise_exposure
        WHERE user_id = ?
        GROUP BY concept_sig`,
      [userId],
      (err, rows) => {
        if (err || !rows) return resolve({});
        const map = {};
        for (const r of rows) map[r.conceptSig] = { lastSeen: r.lastSeen || 0, seenCount: r.seenCount || 0 };
        resolve(map);
      }
    );
  });
}

// Given candidate conceptIds and a recency map, return the one the learner has seen least
// recently (never-seen wins outright; ties break on lower total exposure, then input order).
// Pure — easy to unit test.
function leastRecentlySeen(candidates, recencyMap) {
  const list = candidates || [];
  if (list.length === 0) return null;
  const map = recencyMap || {};
  let best = list[0];
  let bestRank = null;
  list.forEach((c, i) => {
    const rec = map[c] || { lastSeen: 0, seenCount: 0 };
    // Lower lastSeen = staler = better. Unseen concepts have lastSeen 0 → most preferred.
    const rank = [rec.lastSeen, rec.seenCount, i];
    if (bestRank === null || rank[0] < bestRank[0] ||
        (rank[0] === bestRank[0] && rank[1] < bestRank[1])) {
      best = c;
      bestRank = rank;
    }
  });
  return best;
}

// Prune a user's memory to the most recent N rows (keeps the table bounded). Cheap and
// best-effort; called opportunistically after recording.
function pruneExposures(db, userId, keep = 400) {
  return new Promise((resolve) => {
    if (!db) return resolve();
    db.run(
      `DELETE FROM exercise_exposure
        WHERE user_id = ?
          AND signature NOT IN (
            SELECT signature FROM exercise_exposure
             WHERE user_id = ? ORDER BY last_seen DESC LIMIT ?
          )`,
      [userId, userId, keep],
      () => resolve()
    );
  });
}

// ------------------------------------------------------------------------------------
// Anti-repeat selection
// ------------------------------------------------------------------------------------
// Generate several candidates and keep the freshest. `generate(attempt)` is a *sync*
// factory returning a problem object. We score each candidate against (a) the user's
// persisted recent memory and (b) the items already chosen earlier in THIS batch (so a
// single page of problems is internally diverse too).
//
// opts:
//   recent          pre-fetched exposure list (avoids a DB round-trip per call)
//   batchSigs       signatures already chosen in this batch (mutated/extended by caller)
//   attempts        how many candidates to try (default 6)
//   threshold       accept the first candidate scoring >= this (default 0.7)
async function pickFreshExercise(db, userId, generate, opts = {}) {
  const recent = opts.recent || (await getRecentExposures(db, userId));
  const batchSigs = opts.batchSigs || [];
  const attempts = opts.attempts || 6;
  const threshold = opts.threshold !== undefined ? opts.threshold : 0.7;

  let best = null;
  for (let i = 0; i < attempts; i++) {
    let problem;
    try {
      problem = generate(i);
    } catch (_) {
      continue;
    }
    if (!problem) continue;
    const sigs = computeSignatures(problem);
    // Score against persisted memory + what we've already picked this batch (batch items
    // are treated as the most-recent of all, prepended).
    const combined = batchSigs.concat(recent);
    const { score, breakdown } = scoreDiversity(sigs, combined);

    const candidate = { problem, sigs, diversity: score, breakdown };
    if (!best || score > best.diversity) best = candidate;
    if (score >= threshold) break; // good enough — stop early
  }

  if (!best) {
    // Generator never produced anything usable; fall back to a single raw attempt.
    const problem = generate(0);
    best = { problem, sigs: computeSignatures(problem || {}), diversity: 0, breakdown: {} };
  }

  // Remember it: persist + add to the in-batch list so siblings avoid it.
  batchSigs.unshift(best.sigs);
  if (db && userId) {
    await recordExposure(db, userId, best.sigs, opts.surface || 'problem');
  }
  return best;
}

module.exports = {
  // pure
  normalizeQuestion,
  contextWords,
  normalizeAnswer,
  computeSignatures,
  scoreDiversity,
  DIMENSION_WEIGHTS,
  // persistence + selection
  getRecentExposures,
  getConceptRecency,
  leastRecentlySeen,
  recordExposure,
  pruneExposures,
  pickFreshExercise,
};
