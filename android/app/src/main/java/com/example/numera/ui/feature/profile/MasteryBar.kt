package com.example.numera.ui.feature.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.*
import com.example.numera.theme.*

@Composable
fun MasteryBar(
    topicName: String,
    correctCount: Int,
    maxCount: Int,
    color: Color,
    modifier: Modifier = Modifier
) {
    val targetProgress = if (maxCount > 0) (correctCount.toFloat() / maxCount.toFloat()).coerceIn(0f, 1f) else 0f
    var animProgress by remember { mutableStateOf(0f) }
    LaunchedEffect(targetProgress) {
        animProgress = targetProgress
    }
    val progress by animateFloatAsState(
        targetValue = animProgress,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "MasteryBarProgress"
    )
    
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = topicName,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "$correctCount / $maxCount solved",
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
            )
        }
        
        Spacer(modifier = Modifier.height(6.dp))
        
        val height = 14.dp
        val shape = RoundedCornerShape(CornerRadius.s)
        
        val shadowColor = Color(
            red = (WrongRed.red * 0.7f).coerceIn(0f, 1f),
            green = (color.green * 0.7f).coerceIn(0f, 1f),
            blue = (color.blue * 0.7f).coerceIn(0f, 1f),
            alpha = color.alpha
        )
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(height + Spacing.xs)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .align(Alignment.BottomStart)
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
            )
            
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(height)
                    .align(Alignment.TopStart)
                    .clip(shape)
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.3f))
            )
            
            if (progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(height)
                        .align(Alignment.BottomStart)
                        .clip(shape)
                        .background(shadowColor)
                )
                
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(height)
                        .align(Alignment.TopStart)
                        .clip(shape)
                        .background(color)
                )
            }
        }
    }
}
