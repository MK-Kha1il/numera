package com.example.numera.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

object Spacing {
    val zero  = 0.dp
    val xs    = 4.dp
    val s     = 8.dp
    val m     = 12.dp
    val l     = 16.dp
    val xl    = 24.dp
    val xxl   = 32.dp
    val xxxl  = 48.dp
}

object CornerRadius {
    val s    = 8.dp
    val m    = 12.dp
    val l    = 16.dp
    val xl   = 24.dp
    val full = 9999.dp
}

object IconSize {
    val s  = 16.dp
    val m  = 24.dp
    val l  = 32.dp
    val xl = 48.dp
}

object Elevation {
    val none   = 0.dp
    val card   = 2.dp
    val raised = 6.dp
    val modal  = 16.dp
}

object AnimDuration {
    const val instant  = 100
    const val fast     = 200
    const val normal   = 300
    const val slow     = 450
    const val xslow    = 600
    const val entrance = 800
}

object Alpha {
    const val disabled  = 0.38f
    const val hint      = 0.50f
    const val secondary = 0.70f
    const val high      = 0.87f
    const val full      = 1.00f
}

object AppTypography {
    val titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize   = 24.sp,
        lineHeight = 32.sp
    )
    val titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize   = 20.sp,
        lineHeight = 28.sp
    )
    val bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize   = 16.sp,
        lineHeight = 24.sp
    )
    val bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize   = 14.sp,
        lineHeight = 20.sp
    )
    val labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize   = 14.sp,
        lineHeight = 20.sp
    )
    val labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize   = 12.sp,
        lineHeight = 16.sp
    )
}
