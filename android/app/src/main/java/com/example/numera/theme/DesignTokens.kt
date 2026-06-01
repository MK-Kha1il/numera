package com.example.numera.theme

import androidx.compose.ui.unit.dp

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

// NOTE: app-wide text styles live in Type.kt (Material3 `Typography`, wired in Theme.kt
// and consumed via MaterialTheme.typography). A duplicate `AppTypography` object used to
// live here but was unreferenced — removed to keep a single source of truth for type.
