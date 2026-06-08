package com.example.numera.ui.components

// Accessibility (audit #1.12 / #45 — the math WebView is opaque to screen readers). This pure
// converter turns the LaTeX/markup a MathText renders into a spoken-readable string that we attach
// as the composable's contentDescription, so TalkBack announces "3 over 4" instead of nothing.
// It is intentionally a *spoken approximation*, not a MathML tree: structure (fractions, powers,
// roots, matrices), operators, and Greek letters become words; unknown commands are dropped.
//
// Only the MATH portions of a mixed prose+LaTeX string are converted — text between `$...$`
// delimiters — so prose hyphens ("right-angled") aren't mangled into "right minus angled".

private val MATH_SEGMENT = Regex(
    // $$...$$ | $...$ | \(...\) | \[...\]  (capture the inner expression of whichever matched)
    "\\\$\\\$(.+?)\\\$\\\$|\\\$(.+?)\\\$|\\\\\\((.+?)\\\\\\)|\\\\\\[(.+?)\\\\\\]",
    RegexOption.DOT_MATCHES_ALL
)

private val LOOKS_LIKE_LATEX = Regex("\\\\[a-zA-Z]+|\\^|_\\{|\\\\frac")

private val SYMBOLS = listOf(
    "\\times" to " times ", "\\cdot" to " times ", "\\div" to " divided by ",
    "\\pm" to " plus or minus ", "\\mp" to " minus or plus ",
    "\\neq" to " not equal to ", "\\leq" to " less than or equal to ", "\\le" to " less than or equal to ",
    "\\geq" to " greater than or equal to ", "\\ge" to " greater than or equal to ",
    "\\approx" to " approximately ", "\\equiv" to " is congruent to ", "\\pmod" to " mod ", "\\bmod" to " mod ",
    "\\infty" to " infinity ", "\\sum" to " sum ", "\\prod" to " product ", "\\int" to " integral ",
    "\\lim" to " limit ", "\\to" to " approaches ", "\\rightarrow" to " approaches ", "\\implies" to " implies ",
    "\\pi" to " pi ", "\\theta" to " theta ", "\\alpha" to " alpha ", "\\beta" to " beta ",
    "\\gamma" to " gamma ", "\\lambda" to " lambda ", "\\mu" to " mu ", "\\sigma" to " sigma ",
    "\\Delta" to " delta ", "\\delta" to " delta ", "\\Sigma" to " sigma ", "\\phi" to " phi ", "\\Phi" to " phi ",
    "\\sin" to " sine ", "\\cos" to " cosine ", "\\tan" to " tangent ", "\\log" to " log ", "\\ln" to " natural log ",
    "\\left" to "", "\\right" to "", "\\," to " ", "\\;" to " ", "\\!" to "", "\\quad" to " ", "\\qquad" to " "
)

private fun braceGroup(name: String) = Regex("\\\\$name\\{([^{}]*)\\}\\{([^{}]*)\\}")

// Convert a pure LaTeX expression (no surrounding prose) into spoken words.
private fun speakExpression(expr: String): String {
    var s = expr
    // Fractions / binomials (repeat to resolve one level of simple nesting).
    repeat(3) { s = braceGroup("d?frac").replace(s) { "(${it.groupValues[1]}) over (${it.groupValues[2]})" } }
    s = braceGroup("binom").replace(s) { "${it.groupValues[1]} choose ${it.groupValues[2]}" }
    s = Regex("\\\\sqrt\\{([^{}]*)\\}").replace(s) { "square root of (${it.groupValues[1]})" }
    s = s.replace("\\sqrt", "square root")
    // Powers.
    s = s.replace(Regex("\\^\\{2\\}|\\^2"), " squared ")
    s = s.replace(Regex("\\^\\{3\\}|\\^3"), " cubed ")
    s = Regex("\\^\\{([^{}]*)\\}").replace(s) { " to the power of ${it.groupValues[1]} " }
    s = Regex("\\^(\\w)").replace(s) { " to the power of ${it.groupValues[1]} " }
    // Subscripts.
    s = Regex("_\\{([^{}]*)\\}").replace(s) { " sub ${it.groupValues[1]} " }
    s = Regex("_(\\w)").replace(s) { " sub ${it.groupValues[1]} " }
    // Matrices / environments → spoken rows & columns.
    s = s.replace(Regex("\\\\begin\\{[a-zA-Z]*matrix\\}"), " matrix ")
    s = s.replace(Regex("\\\\end\\{[a-zA-Z]*matrix\\}"), " ")
    s = s.replace(Regex("\\\\begin\\{[^}]*\\}"), " ").replace(Regex("\\\\end\\{[^}]*\\}"), " ")
    s = s.replace("\\\\", " ; ").replace("&", " , ")
    // Named symbols & functions.
    for ((k, v) in SYMBOLS) s = s.replace(k, v)
    // Bare operators (safe here: we're inside a math segment, so "-" is a minus, not a hyphen).
    s = s.replace("=", " equals ").replace("+", " plus ").replace("-", " minus ")
    s = s.replace("<", " less than ").replace(">", " greater than ")
    // Drop any remaining LaTeX commands and grouping characters.
    s = s.replace(Regex("\\\\[a-zA-Z]+"), " ")
    s = s.replace("{", " ").replace("}", " ").replace("\$", " ")
    return s.replace(Regex("\\s+"), " ").trim()
}

/**
 * Build a screen-reader-friendly description of a (possibly mixed prose + LaTeX) string. Returns
 * the input collapsed to plain prose when there's no math. Never throws.
 */
fun latexToSpeech(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    val hasDelimiter = raw.contains('$') || raw.contains("\\(") || raw.contains("\\[")
    val spoken = when {
        hasDelimiter -> MATH_SEGMENT.replace(raw) { m ->
            val inner = m.groupValues.drop(1).firstOrNull { it.isNotEmpty() } ?: ""
            " ${speakExpression(inner)} "
        }
        LOOKS_LIKE_LATEX.containsMatchIn(raw) -> speakExpression(raw) // raw LaTeX with no delimiters
        else -> raw // plain prose or a bare number
    }
    return spoken.replace(Regex("\\s+"), " ").trim()
}
