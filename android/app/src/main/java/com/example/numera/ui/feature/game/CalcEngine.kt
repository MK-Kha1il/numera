package com.example.numera.ui.feature.game

// Scientific-calculator expression engine for the in-game calculator overlay.
// Pure Kotlin (no Compose/IO) — a recursive-descent parser over a normalized
// expression string. Extracted verbatim from SoloGameScreen.

internal fun evaluateExpression(expr: String): Double =
    CalcParser(
        expr.replace(" ", "")
            .replace("π", "pi")
            .replace("÷", "/")
            .replace("×", "*")
            .replace("√", "sqrt")
            .lowercase()
    ).parse()

internal class CalcParser(private val s: String) {
    private var pos = 0

    fun parse(): Double {
        val result = parseExpression()
        if (pos < s.length) throw RuntimeException("Unexpected: '${s[pos]}'")
        return result
    }

    private fun peek(): Char = if (pos < s.length) s[pos] else ' '

    private fun eat(c: Char): Boolean {
        if (peek() == c) { pos++; return true }
        return false
    }

    private fun parseExpression(): Double {
        var x = parseTerm()
        while (true) x = when {
            eat('+') -> x + parseTerm()
            eat('-') -> x - parseTerm()
            else     -> return x
        }
    }

    private fun parseTerm(): Double {
        var x = parsePower()
        while (true) x = when {
            eat('*') -> x * parsePower()
            eat('/') -> { val d = parsePower(); if (d == 0.0) throw RuntimeException("Division by zero"); x / d }
            else     -> return x
        }
    }

    private fun parsePower(): Double {
        val base = parseUnary()
        return if (peek() == '^') { pos++; Math.pow(base, parsePower()) } else base
    }

    private fun parseUnary(): Double {
        if (eat('+')) return parseUnary()
        if (eat('-')) return -parseUnary()
        return parsePostfix()
    }

    private fun parsePostfix(): Double {
        var x = parseAtom()
        while (true) x = when {
            eat('!') -> factorial(x.toLong())
            eat('%') -> x / 100.0
            else     -> return x
        }
    }

    private fun parseAtom(): Double {
        if (eat('(')) {
            val x = parseExpression()
            eat(')')
            return x
        }
        if (peek().isDigit() || peek() == '.') {
            val start = pos
            while (pos < s.length && (s[pos].isDigit() || s[pos] == '.')) pos++
            return s.substring(start, pos).toDouble()
        }
        if (peek().isLetter()) {
            val start = pos
            while (pos < s.length && s[pos].isLetter()) pos++
            return when (val name = s.substring(start, pos)) {
                "pi"    -> Math.PI
                "e"     -> Math.E
                "sqrt"  -> fn1 { Math.sqrt(it) }
                "sin"   -> fn1 { Math.sin(Math.toRadians(it)) }
                "cos"   -> fn1 { Math.cos(Math.toRadians(it)) }
                "tan"   -> fn1 { Math.tan(Math.toRadians(it)) }
                "ln"    -> fn1 { if (it <= 0) throw RuntimeException("ln undefined for x<=0"); Math.log(it) }
                "log"   -> fn1 { if (it <= 0) throw RuntimeException("log undefined for x<=0"); Math.log10(it) }
                "abs"   -> fn1 { Math.abs(it) }
                "ceil"  -> fn1 { Math.ceil(it) }
                "floor" -> fn1 { Math.floor(it) }
                "round" -> fn1 { Math.round(it).toDouble() }
                else    -> throw RuntimeException("Unknown function: $name")
            }
        }
        throw RuntimeException("Unexpected: '${peek()}'")
    }

    private fun fn1(f: (Double) -> Double): Double {
        eat('(')
        val a = parseExpression()
        eat(')')
        return f(a)
    }

    private fun factorial(n: Long): Double {
        if (n < 0) throw RuntimeException("Factorial undefined for negatives")
        if (n > 20) throw RuntimeException("Factorial too large (max 20!)")
        var r = 1.0
        for (i in 2..n) r *= i
        return r
    }
}
