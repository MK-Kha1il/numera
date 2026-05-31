// Algorithmic Math-Aware Distractor Generator

function generateDistractors(answer, type, params = {}) {
  const distractors = new Set();
  const correctStr = answer.toString().trim();
  const numericAnswer = Number(answer);

  if (isNaN(numericAnswer)) {
    // Non-numeric fallback (e.g. symbolic fractions or LaTeX)
    if (params.distractors && params.distractors.length > 0) {
      params.distractors.forEach(d => {
        if (d.toString().trim() !== correctStr) {
          distractors.add(d.toString().trim());
        }
      });
    }
    // Hardcoded safety defaults
    const fallbacks = ["0", "1", "x", "-1", "True", "False", "None"];
    for (const f of fallbacks) {
      if (distractors.size >= 3) break;
      if (f !== correctStr) {
        distractors.add(f);
      }
    }
    return Array.from(distractors).slice(0, 3);
  }

  // Numerical Distractors
  // 1. Check if template provided custom math distractors
  if (params.distractors && params.distractors.length > 0) {
    params.distractors.forEach(d => {
      const dNum = Number(d);
      if (!isNaN(dNum) && d.toString().trim() !== correctStr && dNum >= 0) {
        distractors.add(d.toString().trim());
      }
    });
  }

  // 2. Add algebraic sign flips
  if (numericAnswer !== 0) {
    const flipped = -numericAnswer;
    if (flipped >= 0 && flipped.toString() !== correctStr) {
      distractors.add(flipped.toString());
    }
  }

  // 3. Add operator-slip distractors based on the type of problem
  if (type === "linear_one_step_add" && params.a !== undefined && params.b !== undefined) {
    // Problem: x + a = b. Correct: b - a. Slip: b + a or a - b.
    const slip1 = params.b + params.a;
    const slip2 = Math.abs(params.a - params.b);
    if (slip1.toString() !== correctStr) distractors.add(slip1.toString());
    if (slip2.toString() !== correctStr) distractors.add(slip2.toString());
  } 
  else if (type === "linear_one_step_mult" && params.a !== undefined && params.b !== undefined) {
    // Problem: ax = b. Correct: b / a. Slip: b * a or b - a.
    const slip1 = params.b * params.a;
    const slip2 = params.b - params.a;
    if (slip1.toString() !== correctStr) distractors.add(slip1.toString());
    if (slip2.toString() !== correctStr) distractors.add(slip2.toString());
  }
  else if (type === "quadratic" && params.x1 !== undefined && params.x2 !== undefined) {
    // Roots: x1, x2. Correct: max(x1,x2). Slip: min(x1,x2), coeffB, coeffC.
    const slip1 = params.x1;
    const slip2 = params.x2;
    if (slip1.toString() !== correctStr) distractors.add(slip1.toString());
    if (slip2.toString() !== correctStr) distractors.add(slip2.toString());
  }
  else if (type === "modulo" && params.mod !== undefined) {
    // Modular arithmetic slips: off-by-one modulo errors
    const slip1 = (numericAnswer + 1) % params.mod;
    const slip2 = (numericAnswer - 1 + params.mod) % params.mod;
    if (slip1.toString() !== correctStr) distractors.add(slip1.toString());
    if (slip2.toString() !== correctStr) distractors.add(slip2.toString());
  }

  // 4. General mathematical offsets
  const offsets = [1, -1, 2, -2, 10, -10, 5, -5];
  for (const offset of offsets) {
    if (distractors.size >= 3) break;
    const val = numericAnswer + offset;
    if (val.toString() !== correctStr && val >= 0) {
      distractors.add(val.toString());
    }
  }

  // 5. Emergency default values if we still don't have 3 distractors
  let emergency = 0;
  while (distractors.size < 3) {
    if (emergency.toString() !== correctStr) {
      distractors.add(emergency.toString());
    }
    emergency++;
  }

  return Array.from(distractors).slice(0, 3);
}

module.exports = {
  generateDistractors
};
