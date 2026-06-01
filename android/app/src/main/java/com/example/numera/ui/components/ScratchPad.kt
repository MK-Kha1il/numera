package com.example.numera.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Redo
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.asAndroidPath
import androidx.compose.ui.graphics.drawscope.Stroke as DrawStroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.haptic.HapticManager
import com.example.numera.theme.*
import kotlin.math.*

data class ScratchStroke(
    val points: List<Offset>,
    val color: Color,
    val width: Float,
    val isEraser: Boolean = false
)

@Composable
fun ScratchPad(
    strokes: MutableList<ScratchStroke>,
    redoStrokes: MutableList<ScratchStroke>,
    modifier: Modifier = Modifier,
    onClose: () -> Unit
) {
    var isEraserMode by remember { mutableStateOf(false) }
    var selectedColor by remember { mutableStateOf(Color(0xFF2D3748)) }
    val isDarkMode = !MaterialTheme.colorScheme.background.luminance().let { it > 0.5 }

    // Multi-page: page 0 uses the externally-keyed strokes; extra pages live here
    val extraPages = remember { mutableStateListOf<SnapshotStateList<ScratchStroke>>() }
    val extraRedoPages = remember { mutableStateListOf<SnapshotStateList<ScratchStroke>>() }
    var currentPage by remember { mutableIntStateOf(0) }
    val totalPages = extraPages.size + 1

    val activeStrokes: MutableList<ScratchStroke> =
        if (currentPage == 0) strokes else extraPages[currentPage - 1]
    val activeRedoStrokes: MutableList<ScratchStroke> =
        if (currentPage == 0) redoStrokes else extraRedoPages[currentPage - 1]

    val activeStrokeColor = remember(selectedColor, isDarkMode) {
        if (selectedColor == Color(0xFF2D3748) || selectedColor == Color.White) {
            if (isDarkMode) Color.White else Color(0xFF2D3748)
        } else selectedColor
    }

    val strokeWidth = if (isEraserMode) 35f else 8f

    val colorOptions = listOf(
        if (isDarkMode) Color.White else Color(0xFF2D3748),
        Color(0xFF3182CE),
        Color(0xFF38A169),
        Color(0xFFE53E3E)
    )

    var currentPoints = remember { mutableStateListOf<Offset>() }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
            .background(if (isDarkMode) Color(0xFF1E222A) else Color(0xFFFCFBF7))
            .border(
                width = 2.dp,
                color = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
            )
    ) {
        // Page tab bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.6f))
                .padding(horizontal = 12.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            repeat(totalPages) { idx ->
                val isActive = idx == currentPage
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(
                            if (isActive) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                        )
                        .clickable {
                            currentPage = idx
                            currentPoints.clear()
                            HapticManager.playSoft()
                        }
                        .padding(horizontal = 12.dp, vertical = 5.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "P${idx + 1}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (isActive) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
            // Add new page
            if (totalPages < 6) {
                IconButton(
                    onClick = {
                        extraPages.add(mutableStateListOf())
                        extraRedoPages.add(mutableStateListOf())
                        currentPage = extraPages.size  // go to the new page
                        currentPoints.clear()
                        HapticManager.playSoft()
                    },
                    modifier = Modifier.size(30.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "New Page",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        }

        // Toolbar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Left: Pen / Eraser
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { isEraserMode = false; HapticManager.playSoft() },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (!isEraserMode) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Pen Mode",
                        tint = if (!isEraserMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground
                    )
                }
                IconButton(
                    onClick = { isEraserMode = true; HapticManager.playSoft() },
                    colors = IconButtonDefaults.iconButtonColors(
                        containerColor = if (isEraserMode) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else Color.Transparent
                    )
                ) {
                    Icon(
                        imageVector = Icons.Default.Clear,
                        contentDescription = "Eraser Mode",
                        tint = if (isEraserMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onBackground
                    )
                }
            }

            // Middle: Color selector
            if (!isEraserMode) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    colorOptions.forEach { color ->
                        val isSelected = selectedColor == color ||
                            (color == Color.White && selectedColor == Color(0xFF2D3748)) ||
                            (color == Color(0xFF2D3748) && selectedColor == Color.White)
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .clip(CircleShape)
                                .background(color)
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                    shape = CircleShape
                                )
                                .clickable { selectedColor = color; HapticManager.playSoft() }
                        )
                    }
                }
            } else {
                Text("Eraser Active", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), modifier = Modifier.padding(horizontal = 8.dp))
            }

            // Right: Undo, Redo, Clear, Close
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = {
                        if (activeStrokes.isNotEmpty()) {
                            val last = activeStrokes.removeAt(activeStrokes.size - 1)
                            activeRedoStrokes.add(last)
                            HapticManager.playSoft()
                        }
                    },
                    enabled = activeStrokes.isNotEmpty()
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Undo,
                        contentDescription = "Undo",
                        tint = if (activeStrokes.isNotEmpty()) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
                IconButton(
                    onClick = {
                        if (activeRedoStrokes.isNotEmpty()) {
                            val last = activeRedoStrokes.removeAt(activeRedoStrokes.size - 1)
                            activeStrokes.add(last)
                            HapticManager.playSoft()
                        }
                    },
                    enabled = activeRedoStrokes.isNotEmpty()
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Redo,
                        contentDescription = "Redo",
                        tint = if (activeRedoStrokes.isNotEmpty()) MaterialTheme.colorScheme.onBackground else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
                IconButton(
                    onClick = {
                        if (activeStrokes.isNotEmpty()) {
                            activeStrokes.clear()
                            activeRedoStrokes.clear()
                            HapticManager.playSoft()
                        }
                    },
                    enabled = activeStrokes.isNotEmpty()
                ) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Clear Page",
                        tint = if (activeStrokes.isNotEmpty()) Color(0xFFE53E3E) else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                    )
                }
                IconButton(onClick = { HapticManager.playSoft(); onClose() }) {
                    Icon(imageVector = Icons.Default.Close, contentDescription = "Close Board", tint = MaterialTheme.colorScheme.onBackground)
                }
            }
        }

        Divider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

        // Drawing Area
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .pointerInput(isEraserMode, activeStrokeColor, currentPage) {
                    detectDragGestures(
                        onDragStart = { offset ->
                            currentPoints.clear()
                            currentPoints.add(offset)
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            currentPoints.add(change.position)
                        },
                        onDragEnd = {
                            if (currentPoints.size >= 2) {
                                var strokePoints = currentPoints.toList()
                                
                                // Apply Shape Assistance if not in eraser mode
                                if (!isEraserMode) {
                                    val assistedPoints = cleanAndStraightenShape(strokePoints)
                                    if (assistedPoints != null) {
                                        strokePoints = assistedPoints
                                        // Extra micro haptic to signal shape snap success
                                        HapticManager.playSoft()
                                    }
                                }
                                
                                activeStrokes.add(
                                    ScratchStroke(
                                        points = strokePoints,
                                        color = activeStrokeColor,
                                        width = strokeWidth,
                                        isEraser = isEraserMode
                                    )
                                )
                                activeRedoStrokes.clear()
                            }
                            currentPoints.clear()
                        },
                        onDragCancel = {
                            currentPoints.clear()
                        }
                    )
                }
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val canvasWidth = size.width
                val canvasHeight = size.height

                // Draw dotted paper grid background (calming & mathematics-themed)
                val dotSpacing = 24.dp.toPx()
                val dotColor = if (isDarkMode) Color(0xFF323A47) else Color(0xFFE2E4E6)
                
                var x = dotSpacing
                while (x < canvasWidth) {
                    var y = dotSpacing
                    while (y < canvasHeight) {
                        drawCircle(
                            color = dotColor,
                            radius = 1.25.dp.toPx(),
                            center = Offset(x, y)
                        )
                        y += dotSpacing
                    }
                    x += dotSpacing
                }

                // Double buffer drawing layers:
                // Grid is drawn, then save layer is opened for strokes & blending erasures
                drawIntoCanvas { canvas ->
                    val paint = Paint()
                    canvas.saveLayer(Rect(0f, 0f, canvasWidth, canvasHeight), paint)

                    // Draw completed strokes
                    activeStrokes.forEach { stroke ->
                        if (!stroke.isEraser) {
                            drawStrokeCurve(this, stroke.points, stroke.color, stroke.width)
                        } else {
                            drawEraserStroke(canvas, stroke.points, stroke.width)
                        }
                    }

                    // Draw current active stroke segment
                    if (currentPoints.size >= 2) {
                        if (!isEraserMode) {
                            drawStrokeCurve(this, currentPoints.toList(), activeStrokeColor, strokeWidth)
                        } else {
                            drawEraserStroke(canvas, currentPoints.toList(), strokeWidth)
                        }
                    }

                    canvas.restore()
                }
            }
        }
    }
}

// Draw smooth stroke curves using Bezier interpolation
private fun drawStrokeCurve(
    drawScope: androidx.compose.ui.graphics.drawscope.DrawScope,
    points: List<Offset>,
    color: Color,
    width: Float
) {
    if (points.size < 2) return
    val path = Path()
    path.moveTo(points[0].x, points[0].y)
    
    for (i in 1 until points.size - 1) {
        val p0 = points[i]
        val p1 = points[i + 1]
        // Quadratic bezier smoothing
        path.quadraticBezierTo(
            p0.x, p0.y,
            (p0.x + p1.x) / 2f,
            (p0.y + p1.y) / 2f
        )
    }
    path.lineTo(points.last().x, points.last().y)

    drawScope.drawPath(
        path = path,
        color = color,
        style = DrawStroke(
            width = width,
            cap = StrokeCap.Round,
            join = StrokeJoin.Round
        )
    )
}

// Draw eraser strokes directly using Canvas Paint BlendMode.Clear
private fun drawEraserStroke(
    canvas: Canvas,
    points: List<Offset>,
    width: Float
) {
    if (points.size < 2) return
    val path = Path()
    path.moveTo(points[0].x, points[0].y)
    
    for (i in 1 until points.size - 1) {
        val p0 = points[i]
        val p1 = points[i + 1]
        path.quadraticBezierTo(
            p0.x, p0.y,
            (p0.x + p1.x) / 2f,
            (p0.y + p1.y) / 2f
        )
    }
    path.lineTo(points.last().x, points.last().y)

    val nativePaint = Paint().asFrameworkPaint().apply {
        xfermode = android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.CLEAR)
        isAntiAlias = true
        style = android.graphics.Paint.Style.STROKE
        strokeWidth = width
        strokeCap = android.graphics.Paint.Cap.ROUND
        strokeJoin = android.graphics.Paint.Join.ROUND
    }

    canvas.nativeCanvas.drawPath(path.asAndroidPath(), nativePaint)
}

// Math assistance to clean up shapes (straight lines and perfect circles)
private fun cleanAndStraightenShape(points: List<Offset>): List<Offset>? {
    if (points.size < 6) return null

    val p0 = points.first()
    val pn = points.last()

    // 1. Straight Line Check
    var totalPathLength = 0f
    for (i in 1 until points.size) {
        totalPathLength += distance(points[i], points[i-1])
    }
    
    val lineDistance = distance(p0, pn)
    if (lineDistance > 40f && (totalPathLength / lineDistance) < 1.12f) {
        // It's a straight line, return just start and end points
        return listOf(p0, pn)
    }

    // 2. Circle Check
    // Calculate bounding box and its center
    var minX = Float.MAX_VALUE
    var maxX = Float.MIN_VALUE
    var minY = Float.MAX_VALUE
    var maxY = Float.MIN_VALUE
    
    points.forEach { pt ->
        minX = min(minX, pt.x)
        maxX = max(maxX, pt.x)
        minY = min(minY, pt.y)
        maxY = max(maxY, pt.y)
    }
    
    val width = maxX - minX
    val height = maxY - minY
    val sizeRatio = min(width, height) / max(width, height)
    
    // Bounding box must be somewhat square for a circle
    if (sizeRatio > 0.7f && width > 40f && height > 40f) {
        val center = Offset((minX + maxX) / 2f, (minY + maxY) / 2f)
        val radii = points.map { distance(it, center) }
        val avgRadius = radii.average().toFloat()
        
        // Calculate standard deviation of radii to check roundness
        val variance = radii.map { (it - avgRadius) * (it - avgRadius) }.average()
        val stdDev = sqrt(variance).toFloat()
        
        // Start and end points must be relatively close to form a closed loop
        val endPointsDistance = distance(p0, pn)
        
        if ((stdDev / avgRadius) < 0.12f && endPointsDistance < avgRadius * 0.9f) {
            // Draw a perfect circle with 48 points
            val circlePoints = mutableListOf<Offset>()
            val steps = 48
            for (i in 0..steps) {
                val angle = (i * 2 * PI / steps)
                circlePoints.add(
                    Offset(
                        (center.x + avgRadius * cos(angle)).toFloat(),
                        (center.y + avgRadius * sin(angle)).toFloat()
                    )
                )
            }
            return circlePoints
        }
    }

    return null
}

private fun distance(a: Offset, b: Offset): Float {
    return sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y))
}
