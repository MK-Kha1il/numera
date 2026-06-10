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


# ── Solve WITH worked steps ──────────────────────────────────────────────────────────────────────
# Beyond bare solutions (_solve), produce a PEDAGOGICAL derivation: move to standard form, then —
# by polynomial degree — isolate (linear), factor or apply the quadratic formula (quadratic), or
# just report the roots (higher). Steps are LaTeX strings matching the catalog's $…$ style, so the
# client can render "show me how" the same way it renders an authored explanation. This is what the
# hand-built linear.js does for linear equations; SymPy extends it to quadratics and beyond.
def _solve_steps(req):
    from sympy import Eq, Poly, factor, latex, solve, sqrt, Rational

    raw = req.get("equation", "")
    if "=" in raw:
        lhs, rhs = raw.split("=", 1)
        lhs_e, rhs_e = _parse(lhs), _parse(rhs)
    else:
        lhs_e, rhs_e = _parse(raw), _parse("0")
    expr = lhs_e - rhs_e  # standard form: expr = 0

    syms = sorted(expr.free_symbols, key=lambda s: s.name)
    if not syms:
        return {"ok": False, "error": "no variable to solve for"}
    var = syms[0]
    sols = solve(Eq(lhs_e, rhs_e), var, dict=False)
    sol_tex = [latex(s) for s in sols]

    steps = []
    if rhs_e != 0:
        steps.append("Move everything to one side: $%s = 0$." % latex(expr))

    degree = None
    try:
        degree = Poly(expr, var).degree()
    except Exception:
        degree = None

    if degree == 1:
        # ax + b = 0  →  x = -b/a
        a = expr.coeff(var, 1)
        b = expr.coeff(var, 0)
        steps.append("Isolate the variable term: $%s%s = %s$." % (latex(a), latex(var), latex(-b)))
        steps.append("Divide both sides by $%s$: $%s = %s$." % (latex(a), latex(var), sol_tex[0]))
    elif degree == 2:
        factored = factor(expr)
        if factored.is_Mul:  # factors over the rationals → show the factored form
            steps.append("Factor: $%s = 0$." % latex(factored))
            roots = " or ".join("$%s = %s$" % (latex(var), s) for s in sol_tex)
            steps.append("Set each factor to zero: %s." % roots)
        else:  # irreducible over the rationals → quadratic formula
            a = expr.coeff(var, 2)
            b = expr.coeff(var, 1)
            c = expr.coeff(var, 0)
            disc = b * b - 4 * a * c
            steps.append(
                "Apply the quadratic formula $%s = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ "
                "with $a=%s,\\ b=%s,\\ c=%s$." % (latex(var), latex(a), latex(b), latex(c))
            )
            steps.append("Discriminant: $b^2 - 4ac = %s$." % latex(disc))
            steps.append("Solutions: $%s = %s$." % (latex(var), ",\\ ".join(sol_tex)))
    else:
        steps.append("Solve for $%s$: $%s = %s$." % (latex(var), latex(var), ",\\ ".join(sol_tex)))

    return {"ok": True, "variable": str(var), "solutions": [str(s) for s in sols], "steps": steps}


# ── Verified problem generation ─────────────────────────────────────────────────────────────────
# Generate UNBOUNDED, level-scaled problems whose answer is computed (and thus verified) by SymPy,
# so a ranked duel can't serve a wrong-keyed problem. Answers are kept INTEGER by construction so the
# duel's MCQ options are clean. Families are chosen by level band; we mix in nearby families so a set
# isn't monotonous. Each problem carries 4 shuffled options (the verified answer + 3 distractors).
import random


def _int_options(answer, candidates):
    opts = []
    seen = {answer}
    for c in candidates:
        c = int(c)
        if c not in seen:
            seen.add(c)
            opts.append(str(c))
        if len(opts) >= 3:
            break
    bump = 1
    while len(opts) < 3:  # guarantee 3 distinct distractors
        for cand in (answer + bump, answer - bump):
            if cand not in seen:
                seen.add(cand)
                opts.append(str(cand))
            if len(opts) >= 3:
                break
        bump += 1
    options = opts[:3] + [str(answer)]
    random.shuffle(options)
    return options


def _gen_one(level, x):
    # SymPy not only computes the answer but also derives the WORKED SOLUTION (factored form /
    # derivative / antiderivative via latex()), so every generated problem ships a self-consistent
    # `explanation` — the same field catalog problems carry, so a CAS duel exercise saved to the
    # library reads exactly like a hand-authored one. LaTeX matches the catalog's $…$ / $$…$$ style.
    from sympy import diff, integrate, factor, latex
    fams = ["quadratic"]
    if level >= 31:
        fams.append("derivative")
    if level >= 38:
        fams.append("integral")
    fam = random.choice(fams)

    if fam == "quadratic":
        spread = 2 + level // 6
        r1 = random.randint(-spread, spread)
        r2 = r1 + random.randint(1, spread + 1)          # distinct, r2 > r1
        b, c = -(r1 + r2), r1 * r2
        answer = int(max(r1, r2))
        bt = ("+ %d" % b) if b >= 0 else ("- %d" % -b)
        ct = ("+ %d" % c) if c >= 0 else ("- %d" % -c)
        question = "Find the larger root of $x^2 %s x %s = 0$" % (bt, ct)
        options = _int_options(answer, [r1, r1 + r2, -r2, answer + 1, answer - 2])
        factored = latex(factor(x ** 2 + b * x + c))     # SymPy factors the quadratic
        explanation = (
            "Factor the quadratic:\n$$x^2 %s x %s = %s$$\n"
            "Setting each factor equal to $0$ gives the roots $x = %d$ and $x = %d$.\n"
            "The larger root is $%d$." % (bt, ct, factored, r1, r2, answer)
        )
        return {"question": question, "answer": str(answer), "options": options, "explanation": explanation}

    if fam == "derivative":
        a = random.randint(2, 3 + level // 12)
        n = random.randint(2, 4)
        p = random.randint(1, 3)
        f = a * x ** n
        fprime = diff(f, x)                              # SymPy differentiates
        answer = int(fprime.subs(x, p))                 # SymPy computes f'(p)
        question = "For $f(x) = %dx^{%d}$, find $f'(%d)$." % (a, n, p)
        options = _int_options(answer, [int(f.subs(x, p)), a * n * p, answer + a, answer - a, answer * 2])
        explanation = (
            "Apply the power rule $\\frac{d}{dx}x^{n} = n\\,x^{n-1}$:\n$$f'(x) = %s$$\n"
            "Substitute $x = %d$:\n$$f'(%d) = %d$$" % (latex(fprime), p, p, answer)
        )
        return {"question": question, "answer": str(answer), "options": options, "explanation": explanation}

    # integral: choose a divisible by (n+1) so the definite integral is an integer
    n = random.randint(1, 3)
    a = (n + 1) * random.randint(1, 2)
    upper = random.randint(2, 3)
    antider = integrate(a * x ** n, x)                  # SymPy finds the antiderivative
    answer = int(integrate(a * x ** n, (x, 0, upper)))  # SymPy computes the definite integral
    question = "Evaluate $\\int_0^{%d} %dx^{%d}\\,dx$." % (upper, a, n)
    options = _int_options(answer, [answer + a, answer - a, answer // 2 if answer else 1, answer * 2])
    antider_tex = latex(antider)
    explanation = (
        "Integrate using the power rule $\\int x^{n}\\,dx = \\frac{x^{n+1}}{n+1}$:\n"
        "$$\\int %dx^{%d}\\,dx = %s$$\n"
        "Evaluate from $0$ to $%d$:\n$$\\left[%s\\right]_0^{%d} = %d$$"
        % (a, n, antider_tex, upper, antider_tex, upper, answer)
    )
    return {"question": question, "answer": str(answer), "options": options, "explanation": explanation}


def _generate(req):
    from sympy import symbols
    level = max(1, min(120, int(req.get("level", 10))))
    count = max(1, min(20, int(req.get("count", 5))))
    x = symbols("x")
    problems = [_gen_one(level, x) for _ in range(count)]
    return {"ok": True, "level": level, "problems": problems}


def main():
    try:
        req = json.loads(sys.stdin.read() or "{}")
        op = req.get("op")
        if op == "ping":
            import sympy
            out = {"ok": True, "pong": True, "sympy": sympy.__version__}
        elif op == "solve":
            out = _solve(req)
        elif op == "solve_steps":
            out = _solve_steps(req)
        elif op == "equivalent":
            out = _equivalent(req)
        elif op == "generate":
            out = _generate(req)
        else:
            out = {"ok": False, "error": "unknown op"}
    except Exception as exc:  # never crash the bridge — report the error as JSON
        out = {"ok": False, "error": str(exc)}
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()
