package com.example.numera.ui.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/** Pure-JVM guard for the LaTeX -> screen-reader-speech converter (accessibility, audit #1.12). */
class MathSpeechTest {

    @Test fun blankInputIsEmpty() {
        assertEquals("", latexToSpeech(null))
        assertEquals("", latexToSpeech("   "))
    }

    @Test fun bareNumberPassesThrough() {
        assertEquals("42", latexToSpeech("42"))
    }

    @Test fun proseHyphensAreNotTurnedIntoMinus() {
        // The hyphen in prose must survive — only math segments become "minus".
        val out = latexToSpeech("A right-angled triangle has hypotenuse \$c = 5\$")
        assertTrue(out, out.contains("right-angled"))
        assertTrue(out, out.contains("c equals 5"))
        assertTrue(out, !out.contains("right minus angled"))
    }

    @Test fun fractionIsSpokenAsOver() {
        assertTrue(latexToSpeech("\$\\frac{3}{4}\$").contains("(3) over (4)"))
    }

    @Test fun powersAreSpoken() {
        assertTrue(latexToSpeech("\$x^2\$").contains("squared"))
        assertTrue(latexToSpeech("\$x^3\$").contains("cubed"))
        assertTrue(latexToSpeech("\$2^{10}\$").contains("to the power of 10"))
    }

    @Test fun sqrtAndOperators() {
        assertTrue(latexToSpeech("\$\\sqrt{9} = 3\$").contains("square root of (9)"))
        assertTrue(latexToSpeech("\$5 \\times 4\$").contains("times"))
        assertTrue(latexToSpeech("\$a \\leq b\$").contains("less than or equal to"))
    }

    @Test fun greekAndSymbols() {
        assertTrue(latexToSpeech("\$\\pi r^2\$").contains("pi"))
        assertTrue(latexToSpeech("\$x \\to \\infty\$").contains("approaches"))
        assertTrue(latexToSpeech("\$x \\to \\infty\$").contains("infinity"))
    }

    @Test fun rawLatexWithoutDelimitersIsStillConverted() {
        // Options sometimes arrive as bare LaTeX with no $ wrappers.
        assertTrue(latexToSpeech("\\frac{1}{2}").contains("over"))
    }

    @Test fun unknownCommandsAreDroppedNotLeftAsBackslashes() {
        val out = latexToSpeech("\$\\vec{v} + 1\$")
        assertTrue(out, !out.contains("\\"))
        assertTrue(out, out.contains("plus 1"))
    }
}
