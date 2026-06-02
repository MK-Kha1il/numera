package com.example.numera.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.theme.Alpha
import com.example.numera.theme.Spacing

/**
 * Shared empty-state system: a small themed illustration, a human one-liner, and a primary CTA.
 *
 * Empty states must never feel abandoned. Every collection that can be empty renders this instead
 * of a blank box or a robotic "No records found". Copy is supplied at the call site so it stays
 * conversational and contextual; the illustration is lightweight Canvas line-art (no assets).
 */

enum class EmptyIllustration { Saved, Mistakes, Notifications, Search, Friends, Leaderboard, Generic }

@Composable
fun NumeraEmptyState(
    illustration: EmptyIllustration,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    ctaLabel: String? = null,
    onCta: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.xl, vertical = Spacing.xxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(Spacing.l)
    ) {
        EmptyArt(illustration)
        Text(
            text = title,
            color = MaterialTheme.colorScheme.onSurface,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )
        Text(
            text = message,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = Alpha.secondary),
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth(0.85f)
        )
        if (ctaLabel != null && onCta != null) {
            Spacer(Modifier.height(Spacing.xs))
            DuoButton(text = ctaLabel, onClick = onCta)
        }
    }
}

/** Themed line-art, ~120dp, tinted with the active theme's primary/secondary. */
@Composable
private fun EmptyArt(kind: EmptyIllustration) {
    val primary = MaterialTheme.colorScheme.primary
    val secondary = MaterialTheme.colorScheme.secondary
    val faint = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)
    Canvas(modifier = Modifier.size(120.dp)) {
        val w = size.width
        val h = size.height
        val sw = 4.dp.toPx()
        val stroke = Stroke(width = sw, cap = StrokeCap.Round, join = StrokeJoin.Round)

        // Soft pedestal so the art never floats in a void.
        drawCircle(color = primary.copy(alpha = 0.08f), radius = w * 0.42f, center = Offset(w / 2f, h / 2f))

        when (kind) {
            EmptyIllustration.Saved -> {
                // bookmark / ribbon
                val p = Path().apply {
                    moveTo(w * 0.34f, h * 0.26f)
                    lineTo(w * 0.66f, h * 0.26f)
                    lineTo(w * 0.66f, h * 0.74f)
                    lineTo(w * 0.50f, h * 0.60f)
                    lineTo(w * 0.34f, h * 0.74f)
                    close()
                }
                drawPath(p, color = primary, style = stroke)
            }
            EmptyIllustration.Mistakes -> {
                // clean slate: circle with a check
                drawCircle(secondary, radius = w * 0.22f, center = Offset(w / 2f, h * 0.46f), style = stroke)
                val p = Path().apply {
                    moveTo(w * 0.40f, h * 0.46f)
                    lineTo(w * 0.47f, h * 0.54f)
                    lineTo(w * 0.61f, h * 0.38f)
                }
                drawPath(p, color = primary, style = stroke)
            }
            EmptyIllustration.Notifications -> {
                // bell
                val p = Path().apply {
                    moveTo(w * 0.36f, h * 0.60f)
                    cubicTo(w * 0.34f, h * 0.40f, w * 0.40f, h * 0.30f, w * 0.50f, h * 0.30f)
                    cubicTo(w * 0.60f, h * 0.30f, w * 0.66f, h * 0.40f, w * 0.64f, h * 0.60f)
                    close()
                }
                drawPath(p, color = primary, style = stroke)
                drawLine(primary, Offset(w * 0.30f, h * 0.60f), Offset(w * 0.70f, h * 0.60f), sw, StrokeCap.Round)
                drawCircle(secondary, radius = w * 0.04f, center = Offset(w / 2f, h * 0.68f))
            }
            EmptyIllustration.Search -> {
                drawCircle(primary, radius = w * 0.18f, center = Offset(w * 0.44f, h * 0.44f), style = stroke)
                drawLine(primary, Offset(w * 0.57f, h * 0.57f), Offset(w * 0.70f, h * 0.70f), sw, StrokeCap.Round)
            }
            EmptyIllustration.Friends -> {
                drawCircle(primary, radius = w * 0.10f, center = Offset(w * 0.40f, h * 0.40f), style = stroke)
                drawCircle(secondary, radius = w * 0.10f, center = Offset(w * 0.60f, h * 0.40f), style = stroke)
                val arc = Path().apply {
                    moveTo(w * 0.30f, h * 0.66f)
                    cubicTo(w * 0.34f, h * 0.54f, w * 0.66f, h * 0.54f, w * 0.70f, h * 0.66f)
                }
                drawPath(arc, color = faint, style = stroke)
            }
            EmptyIllustration.Leaderboard -> {
                // three rising bars
                drawLine(faint, Offset(w * 0.36f, h * 0.62f), Offset(w * 0.36f, h * 0.50f), sw * 1.6f, StrokeCap.Round)
                drawLine(secondary, Offset(w * 0.50f, h * 0.62f), Offset(w * 0.50f, h * 0.38f), sw * 1.6f, StrokeCap.Round)
                drawLine(primary, Offset(w * 0.64f, h * 0.62f), Offset(w * 0.64f, h * 0.30f), sw * 1.6f, StrokeCap.Round)
            }
            EmptyIllustration.Generic -> {
                drawCircle(primary, radius = w * 0.20f, center = Offset(w / 2f, h * 0.46f), style = stroke)
                drawLine(secondary, Offset(w * 0.42f, h * 0.46f), Offset(w * 0.58f, h * 0.46f), sw, StrokeCap.Round)
            }
        }

        // A couple of sparkles for warmth.
        drawCircle(secondary.copy(alpha = 0.6f), radius = w * 0.02f, center = Offset(w * 0.74f, h * 0.30f))
        drawCircle(primary.copy(alpha = 0.5f), radius = w * 0.015f, center = Offset(w * 0.26f, h * 0.66f))
    }
}
