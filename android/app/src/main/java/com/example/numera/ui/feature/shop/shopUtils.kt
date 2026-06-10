package com.example.numera.ui.feature.shop

import androidx.compose.foundation.layout.*
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Brush
import com.example.numera.data.network.*
import com.example.numera.theme.*

fun getRankValue(rankStr: String?): Int {
    if (rankStr.isNullOrBlank()) return 0
    val cleaned = rankStr.replace(Regex("Unranked.*", RegexOption.IGNORE_CASE), "").trim()
    if (cleaned.isEmpty()) return 0

    val ranks = listOf("Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster")
    val divisions = listOf("III", "II", "I")

    var tierVal = 0
    for (i in ranks.indices) {
        if (cleaned.startsWith(ranks[i])) {
            tierVal = (i + 1) * 10
            break
        }
    }

    var divVal = 0
    for (j in divisions.indices) {
        if (cleaned.endsWith(divisions[j])) {
            divVal = j + 1
            break
        }
    }

    return tierVal + divVal
}

// Rarity visuals are owned by theme/Rarity.kt (one collectible language across shop,
// reveals, and profile). These remain as thin string-based adapters for call sites.
fun getRarityColor(rarity: String): Color = Rarity.from(rarity).color

fun getRarityBorderBrush(rarity: String): Brush = Rarity.from(rarity).borderBrush

fun formatDuration(seconds: Long): String {
    val days = seconds / 86400
    val hours = (seconds % 86400) / 3600
    val minutes = (seconds % 3600) / 60
    return if (days > 0) {
        "${days}d ${hours}h"
    } else {
        "${hours}h ${minutes}m"
    }
}
