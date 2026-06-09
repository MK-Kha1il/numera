# SymPy bridge for the Numera CAS layer. Reads ONE JSON request from stdin and writes ONE JSON
# response to stdout, so the Node adapter (sympyClient.js) can drive a real computer-algebra system
# without an in-process binding. Stays local (no network) — keeps the app's offline/privacy posture.
#
# Ops:
#   {"op":"ping"}                         -> {"ok":true,"pong":true,"sympy":"<version>"}
#   {"op":"solve","equation":"x^2-5x+6=0"}-> {"ok":true,"variable":"x","solutions":["2","3"]}
#   {"op":"equivalent","a":"(x+1)^2","b":"x^2+2x+1"} -> {"ok":true,"equivalent":true}
#
# Input is parsed with parse_expr (NOT sympify/eval) plus implicit-multiplication and ^→**
# transformations, and capped in length, so "3x" / "x^2" work without an arbitrary-eval surface.
import sys
import json

MAX_LEN = 500


def _parse(expr_str):
    from sympy.parsing.sympy_parser import (
        parse_expr, standard_transformations,
        implicit_multiplication_application, convert_xor,
    )
    if not isinstance(expr_str, str) or len(expr_str) > MAX_LEN:
        raise ValueError("invalid expression")
    transforms = standard_transformations + (implicit_multiplication_application, convert_xor)
    return parse_expr(expr_str, transformations=transforms, evaluate=True)


def _solve(req):
    from sympy import Eq, solve
    raw = req.get("equation", "")
    if "=" in raw:
        lhs, rhs = raw.split("=", 1)
        equation = Eq(_parse(lhs), _parse(rhs))
    else:
        equation = Eq(_parse(raw), 0)
    syms = sorted(equation.free_symbols, key=lambda s: s.name)
    if not syms:
        return {"ok": False, "error": "no variable to solve for"}
    var = syms[0]
    sols = solve(equation, var, dict=False)
    return {"ok": True, "variable": str(var), "solutions": [str(s) for s in sols]}


def _equivalent(req):
    from sympy import simplify
    diff = simplify(_parse(req.get("a", "")) - _parse(req.get("b", "")))
    return {"ok": True, "equivalent": bool(diff == 0)}


def main():
    try:
        req = json.loads(sys.stdin.read() or "{}")
        op = req.get("op")
        if op == "ping":
            import sympy
            out = {"ok": True, "pong": True, "sympy": sympy.__version__}
        elif op == "solve":
            out = _solve(req)
        elif op == "equivalent":
            out = _equivalent(req)
        else:
            out = {"ok": False, "error": "unknown op"}
    except Exception as exc:  # never crash the bridge — report the error as JSON
        out = {"ok": False, "error": str(exc)}
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()
