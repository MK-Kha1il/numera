package com.example.numera.ui.components

import android.view.View
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Test seam: the KaTeX renderer below runs inside a [WebView], which JVM (Robolectric) UI tests
 * can't drive — its async load/measure/draw makes the Compose semantics tree settle unreliably,
 * so assertions on math content flake. Tests set this to a plain-[androidx.compose.material3.Text]
 * renderer that keeps the same string in the semantics tree, making gameplay/lesson tests
 * deterministic. Null in production, where the real WebView renders. See OverlayTest / gameplay
 * tests. Reset to null in an @After so it never leaks across tests.
 */
internal var mathTextRendererForTest: (@Composable (String, Modifier, Color, Int) -> Unit)? = null

@Composable
fun MathText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = MaterialTheme.colorScheme.onSurface,
    fontSizePx: Int = 42
) {
    mathTextRendererForTest?.let { render ->
        render(text, modifier, color, fontSizePx)
        return
    }

    val hexColor = String.format("#%06X", 0xFFFFFF and color.toArgb())
    val htmlContent = remember(text, hexColor, fontSizePx) {
        buildMathHtml(text, hexColor, fontSizePx)
    }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                // Software layer: the hardware (GPU) WebView render path crashes with a native
                // SIGSEGV in libhwui's Skia-GL pipeline on emulated GPUs (e.g. BlueStacks). KaTeX
                // here is static math, so software rendering has no meaningful perf cost and is the
                // standard workaround for these libhwui WebView crashes.
                setLayerType(View.LAYER_TYPE_SOFTWARE, null)
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    useWideViewPort   = false
                    loadWithOverviewMode = true
                }
                setBackgroundColor(0)
                webViewClient = WebViewClient()
                // Pass all touch events up so parent Compose handlers (answer tap, etc.) work
                setOnTouchListener { _, _ -> false }
            }
        },
        update = { webView ->
            webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
        },
        modifier = modifier.fillMaxWidth().heightIn(min = 40.dp)
    )
}

private fun buildMathHtml(text: String, hexColor: String, fontSizePx: Int): String = """
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <style>
    body {
      margin: 0; padding: 4px;
      background-color: transparent;
      color: $hexColor;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: ${fontSizePx}px;
      line-height: 1.5;
      overflow-x: auto;
    }
    #math-content { white-space: pre-wrap; word-wrap: break-word; }
    .katex-display { margin: 0.5em 0; }
    ::-webkit-scrollbar { height: 4px; }
    ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }
  </style>
</head>
<body>
  <div id="math-content"></div>
  <script type="text/plain" id="math-source">${text.replace("</", "<\\/")}</script>
  <script>
    var attempts = 0;
    function tryRender() {
      var src  = document.getElementById('math-source');
      var dst  = document.getElementById('math-content');
      if (window.katex && window.renderMathInElement && src && dst) {
        var raw = src.textContent;
        var len = raw.length;
        if (len > 250)      document.body.style.fontSize = (${fontSizePx} * 0.65) + 'px';
        else if (len > 120) document.body.style.fontSize = (${fontSizePx} * 0.80) + 'px';
        try {
          dst.textContent = raw;
          renderMathInElement(dst, {
            delimiters: [
              {left: '$$',  right: '$$',  display: true},
              {left: '$',   right: '$',   display: false},
              {left: '\\(', right: '\\)', display: false},
              {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError: false
          });
        } catch(err) {
          console.error('KaTeX render failed:', err);
          dst.innerHTML = plaintextFallback(raw);
          dst.style.fontStyle = 'italic';
        }
      } else if (++attempts < 60) {
        setTimeout(tryRender, 50);
      } else {
        // CDN timed out — render plain text
        var src2 = document.getElementById('math-source');
        var dst2 = document.getElementById('math-content');
        if (src2 && dst2) dst2.innerHTML = plaintextFallback(src2.textContent);
      }
    }
    function plaintextFallback(t) {
      return t
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g,  '$1 / $2')
        .replace(/\\sqrt\{([^}]+)\}/g,              '√($1)')
        .replace(/\\sqrt/g,                         '√')
        .replace(/\\sum/g,                          'Σ')
        .replace(/\\int/g,                          '∫')
        .replace(/\\infty/g,                        '∞')
        .replace(/\\sin/g,                          'sin')
        .replace(/\\cos/g,                          'cos')
        .replace(/\\tan/g,                          'tan')
        .replace(/\\log/g,                          'log')
        .replace(/\\ln/g,                           'ln')
        .replace(/\\lim/g,                          'lim')
        .replace(/\\Delta/g,                        'Δ')
        .replace(/\\theta/g,                        'θ')
        .replace(/\\alpha/g,                        'α')
        .replace(/\\beta/g,                         'β')
        .replace(/\\gamma/g,                        'γ')
        .replace(/\\lambda/g,                       'λ')
        .replace(/\\mu/g,                           'μ')
        .replace(/\\sigma/g,                        'σ')
        .replace(/\\pi/g,                           'π')
        .replace(/\\begin\{pmatrix\}/g,             '[ ')
        .replace(/\\end\{pmatrix\}/g,               ' ]')
        .replace(/\\begin\{[^}]+\}/g,               '')
        .replace(/\\end\{[^}]+\}/g,                 '')
        .replace(/\\times/g,                        ' × ')
        .replace(/\\cdot/g,                         ' · ')
        .replace(/\\approx/g,                       ' ≈ ')
        .replace(/\\neq/g,                          ' ≠ ')
        .replace(/\\leq/g,                          ' ≤ ')
        .replace(/\\geq/g,                          ' ≥ ')
        .replace(/\\left[\(\[]/g,                   '(')
        .replace(/\\right[\)\]]/g,                  ')')
        .replace(/\^\{([^}]+)\}/g,                  '^$1')
        .replace(/_\{([^}]+)\}/g,                   '_$1')
        .replace(/\$/g,                             '');
    }
    tryRender();
  </script>
</body>
</html>
""".trimIndent()
