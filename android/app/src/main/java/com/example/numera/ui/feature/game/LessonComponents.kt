package com.example.numera.ui.feature.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.ui.components.MathText
import com.example.numera.theme.Spacing
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.IconSize

// Renders lesson prose that may contain inline LaTeX ($...$) or plain text.
@Composable
internal fun LessonProse(text: String, color: Color, mathPx: Int = 28) {
    if (text.contains("$") || text.contains("\\")) {
        MathText(text = text, fontSizePx = mathPx, color = color, modifier = Modifier.fillMaxWidth())
    } else {
        Text(text = text, fontSize = 15.sp, color = color, lineHeight = 22.sp)
    }
}

// A labelled concept-first lesson section (intuition hook, what/why/when, a representation).
@Composable
internal fun LessonSectionCard(
    label: String,
    body: String,
    accent: Color,
    onSurface: Color,
    border: Color,
    bg: Color
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CornerRadius.l))
            .background(bg)
            .border(1.5.dp, border.copy(alpha = 0.5f), RoundedCornerShape(CornerRadius.l))
            .padding(Spacing.l),
        verticalArrangement = Arrangement.spacedBy(Spacing.s)
    ) {
        Text(text = label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accent, letterSpacing = 0.5.sp)
        LessonProse(body, onSurface.copy(alpha = 0.85f), 28)
    }
}
