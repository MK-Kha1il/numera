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

fun getRarityColor(rarity: String): Color {
    return when (rarity.lowercase()) {
        "mythic" -> MedalGold
        "legendary" -> Color(0xFFFDB813)
        "epic" -> Color(0xFF8A2BE2)
        "rare" -> Color(0xFF00CED1)
        else -> Color(0xFF708090)
    }
}

fun getRarityBorderBrush(rarity: String): Brush {
    return when (rarity.lowercase()) {
        "mythic" -> Brush.linearGradient(listOf(Color(0xFF6A0DAD), MedalGold, MilestoneGold))
        "legendary" -> Brush.linearGradient(listOf(Color(0xFFB76E79), Color(0xFFFDB813)))
        "epic" -> Brush.linearGradient(listOf(Color(0xFF8A2BE2), Color(0xFF4B0082)))
        "rare" -> Brush.linearGradient(listOf(Color(0xFF00CED1), Color(0xFF1E90FF)))
        else -> Brush.linearGradient(listOf(Color(0xFF708090), Color(0xFF708090)))
    }
}

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
