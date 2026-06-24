package com.example.numera.ui.components

import android.annotation.SuppressLint
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.numera.haptic.HapticManager
import com.example.numera.motion.MotionManager
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.WrongRed
import org.json.JSONObject

/**
 * Interactive Mathematical Discovery surface.
 *
 * Renders a declarative visual spec (produced by the server's Adaptive Visual
 * Intelligence) as a native-feeling, touch-manipulable canvas. The Kotlin side
 * is a thin host: it injects design-system color tokens + the spec, then relays
 * interaction events back. All rendering/interaction lives in the shared
 * `assets/interactive_visuals.html` canvas renderer.
 *
 * @param specJson the raw JSON spec string (MathProblem.interactiveVisualJson).
 * @param onEvent  interaction signal callback, e.g. {"event":"solve",...}.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun InteractiveVisual(
    specJson: String,
    modifier: Modifier = Modifier,
    onEvent: (String) -> Unit = {}
) {
    val scheme = MaterialTheme.colorScheme

    // Map the active theme into the renderer's token contract.
    val themeJson = remember(scheme) {
        fun hex(c: Color) = String.format("#%06X", 0xFFFFFF and c.toArgb())
        JSONObject().apply {
            put("bg", hex(scheme.background))
            put("surface", hex(scheme.surfaceVariant))
            put("primary", hex(scheme.primary))
            put("secondary", hex(scheme.secondary))
            put("tertiary", hex(scheme.tertiary))
            put("onSurface", hex(scheme.onSurface))
            put("border", hex(scheme.outline))
            put("subtext", hex(scheme.onSurface.copy(alpha = 0.6f)))
            put("correct", hex(CorrectGreen))
            put("wrong", hex(WrongRed))
        }.toString()
    }

    val cardColorArgb = scheme.surfaceVariant.toArgb()

    // Height adapts to the kind of manipulative so each feels purpose-built.
    val height: Dp = remember(specJson) { heightForSpec(specJson) }

    // Interaction events are NOT dropped: the host turns them into haptic feedback
    // (premium feel) and forwards them to the caller for telemetry. Haptics respect
    // HapticManager.isEnabled; the renderer itself reads reduce-motion for visuals.
    val sink: (String) -> Unit = remember(onEvent) {
        { json ->
            playHapticFor(json)
            onEvent(json)
        }
    }

    val bridge = remember(specJson, themeJson, height) {
        VisualBridge(specJson, themeJson, height.value.toInt(), sink)
    }

    AndroidView(
        modifier = modifier.fillMaxWidth().height(height),
        factory = { context ->
            WebView(context).apply {
                settings.apply {
                    javaScriptEnabled = true
                    domStorageEnabled = true
                    useWideViewPort = false
                    loadWithOverviewMode = false
                }
                // Opaque background matching the card. A transparent WebView can suppress the
                // hardware-composited <canvas> layer on some devices (HTML shows, canvas doesn't).
                setBackgroundColor(cardColorArgb)
                isVerticalScrollBarEnabled = false
                isHorizontalScrollBarEnabled = false
                webViewClient = WebViewClient()
                addJavascriptInterface(bridge, "AndroidBridge")
                loadUrl("file:///android_asset/interactive_visuals.html")
            }
        }
    )
}

/** JS <-> Kotlin contract used by interactive_visuals.html. */
private class VisualBridge(
    private val specJson: String,
    private val themeJson: String,
    private val heightDp: Int,
    private val eventSink: (String) -> Unit
) {
    @JavascriptInterface fun getSpec(): String = specJson
    @JavascriptInterface fun getTheme(): String = themeJson
    // The exact layout height (CSS px == dp under width=device-width, initial-scale=1).
    // The WebView's own viewport height is unreliable on some devices, so we drive layout from this.
    @JavascriptInterface fun getHeightDp(): Int = heightDp
    // Lets the renderer suppress confetti + entrance animation when the user (or OS)
    // has asked for reduced motion. Direct-manipulation springs stay (they're feedback).
    @JavascriptInterface fun getReduceMotion(): Boolean = MotionManager.reduceMotion
    @JavascriptInterface fun onEvent(json: String) {
        Log.d("InteractiveVisual", "event $json")
        eventSink(json)
    }
}

/** Map a renderer interaction event to tactile feedback (no-op if haptics are off). */
private fun playHapticFor(json: String) {
    val event = try { JSONObject(json).optString("event") } catch (e: Exception) { "" }
    when (event) {
        "manipulate", "predict" -> HapticManager.playSoft()
        "discover" -> HapticManager.playMedium()
        "solve" -> HapticManager.playSuccess()
    }
}

private fun heightForSpec(specJson: String): Dp {
    val type = try { JSONObject(specJson).optString("type") } catch (e: Exception) { "" }
    return when (type) {
        "balance_scale" -> 340.dp
        "fraction_bar" -> 300.dp
        "right_triangle" -> 340.dp
        "shape_grid" -> 340.dp
        "parabola" -> 340.dp
        "function_grapher" -> 340.dp
        "calculus" -> 340.dp
        "dice_sim" -> 320.dp
        "probability" -> 320.dp
        "number_line" -> 230.dp
        "dot_plot" -> 300.dp
        "percent_bar" -> 250.dp
        "ratio_line" -> 270.dp
        "area_model" -> 330.dp
        "algebra_tiles" -> 280.dp
        "circle" -> 340.dp
        else -> 300.dp
    }
}
