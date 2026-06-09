// Node adapter for the SymPy bridge — the powerful end of the CAS layer. Spawns the Python bridge
// per call, sends a JSON request on stdin, and parses the JSON response. SymPy is a genuine CAS, so
// this handles what the hand-built JS primitives can't (quadratics/higher-degree solves, symbolic
// equivalence by simplification) — across the full level range the duel feature spans.
//
// Deliberately OFF the hot path: it's a subprocess (tens of ms), so it powers offline/heavy work
// (generating + verifying level-scaled problems, content checks, worked-answer derivation), NOT
// per-keystroke duel grading (that stays the fast in-process areEquivalent). Every call fails SOFT:
// if Python/SymPy isn't installed or times out, callers get { ok:false } and fall back to JS.
const { spawn } = require('child_process');
const path = require('path');

const PYTHON = process.env.NUMERA_PYTHON || 'python';
const BRIDGE = path.join(__dirname, 'sympy_bridge.py');
const TIMEOUT_MS = Number(process.env.NUMERA_CAS_TIMEOUT_MS || 8000);

function call(request) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(PYTHON, [BRIDGE], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      return resolve({ ok: false, error: 'spawn_failed', available: false });
    }
    let out = '';
    let err = '';
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };

    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch { /* noop */ } done({ ok: false, error: 'timeout' }); }, TIMEOUT_MS);

    proc.on('error', () => { clearTimeout(timer); done({ ok: false, error: 'spawn_error', available: false }); });
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err += d; });
    proc.on('close', () => {
      clearTimeout(timer);
      try { done(JSON.parse(out)); }
      catch { done({ ok: false, error: 'bad_output', raw: out, stderr: err }); }
    });

    try { proc.stdin.write(JSON.stringify(request)); proc.stdin.end(); }
    catch { clearTimeout(timer); done({ ok: false, error: 'write_failed' }); }
  });
}

// Cached availability probe so callers can cheaply decide whether to use SymPy or fall back to JS.
let _available = null;
async function isAvailable() {
  if (_available !== null) return _available;
  const r = await call({ op: 'ping' });
  _available = !!(r && r.ok && r.pong);
  return _available;
}

// Solve an equation/expression for its single variable. Returns { ok, variable, solutions[] }.
function solve(equation) { return call({ op: 'solve', equation }); }

// Symbolic equivalence by simplification (a - b == 0). Returns { ok, equivalent }.
function equivalent(a, b) { return call({ op: 'equivalent', a, b }); }

// Generate `count` verified, level-scaled problems in ONE subprocess call. Each problem is
// { question, answer, options[4] } with an integer answer SymPy computed (so it's correct) and
// MCQ-ready options. Returns { ok, level, problems[] }.
function generate(level, count = 5) { return call({ op: 'generate', level, count }); }

module.exports = { isAvailable, solve, equivalent, generate, call };
