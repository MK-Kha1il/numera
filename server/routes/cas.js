// CAS API — the public front door to the symbolic SOLVING half of the CAS layer. A single
// authenticated, rate-limited endpoint that turns an equation into a worked, step-by-step solution
// (exact JS for linear, SymPy for quadratics and beyond). Powers the client's "show me how" / hint
// surface. Read-only: it computes, it never touches the DB or grants rewards.
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimit');
const { solveWithSteps } = require('../mathEngine/cas/solver');

const router = express.Router();

const MAX_LEN = 200;

// POST /api/cas/solve  { equation: "x^2 - 5x + 6 = 0" }
//   200 → { ok:true, equation, variable, solutions:[str], steps:[str], source }
//   400 → malformed request   422 → well-formed but couldn't be solved (e.g. SymPy unavailable)
router.post('/api/cas/solve', authenticateToken, rateLimiter(30, 60 * 1000), async (req, res) => {
  const equation = req.body && req.body.equation;
  if (typeof equation !== 'string' || !equation.trim() || equation.length > MAX_LEN) {
    return res.status(400).json({ ok: false, error: `equation required (string, 1-${MAX_LEN} chars)` });
  }
  try {
    const result = await solveWithSteps(equation);
    return res.status(result.ok ? 200 : 422).json(result);
  } catch {
    return res.status(500).json({ ok: false, error: 'solver_error' });
  }
});

module.exports = router;
