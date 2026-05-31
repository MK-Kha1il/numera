package com.example.numera.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import kotlinx.coroutines.delay
import kotlin.random.Random

data class Particle(
    var x: Float,
    var y: Float,
    var vx: Float,
    var vy: Float,
    val color: Color,
    val size: Float,
    var rotation: Float,
    val rotationSpeed: Float,
    var alpha: Float = 1.0f
)

@Composable
fun VictoryParticles(
    trigger: Boolean,
    onFinished: () -> Unit
) {
    if (!trigger) return

    val particles = remember { mutableStateListOf<Particle>() }
    
    // Spawn particles on launch
    LaunchedEffect(trigger) {
        particles.clear()
        val colors = listOf(
            Color(0xFF00F5FF), // Teal
            Color(0xFFFF007F), // Pink
            Color(0xFFFFB703), // Gold
            Color(0xFF50FA7B), // Green
            Color(0xFFBD93F9)  // Purple
        )
        
        // Spawn 40 particles shooting upwards from the bottom-center
        for (i in 0 until 40) {
            particles.add(
                Particle(
                    x = 540f, // Center baseline (approximate, updates to canvas layout)
                    y = 1200f,
                    vx = Random.nextFloat() * 30f - 15f,
                    vy = -(Random.nextFloat() * 30f + 25f), // shoot up
                    color = colors[Random.nextInt(colors.size)],
                    size = Random.nextFloat() * 15f + 10f,
                    rotation = Random.nextFloat() * 360f,
                    rotationSpeed = Random.nextFloat() * 10f - 5f
                )
            )
        }

        // Animation update loop (60 FPS approximate)
        var elapsed = 0
        while (elapsed < 1500 && particles.isNotEmpty()) {
            delay(16)
            elapsed += 16
            
            // Update particles
            for (i in particles.indices.reversed()) {
                val p = particles[i]
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.8f // gravity
                p.rotation += p.rotationSpeed
                p.alpha = (1.0f - (elapsed / 1500f)).coerceIn(0f, 1f)
                
                // Remove out of bounds or dead
                if (p.y > 2200f || p.alpha <= 0f) {
                    particles.removeAt(i)
                }
            }
        }
        onFinished()
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        val width = size.width
        val height = size.height

        // Calibrate spawn center if it was initialized statically
        particles.forEach { p ->
            if (p.x == 540f && p.y == 1200f) {
                p.x = width / 2f
                p.y = height * 0.8f
            }
            
            rotate(p.rotation, pivot = Offset(p.x, p.y)) {
                drawRect(
                    color = p.color.copy(alpha = p.alpha),
                    topLeft = Offset(p.x - p.size / 2, p.y - p.size / 2),
                    size = Size(p.size, p.size)
                )
            }
        }
    }
}
