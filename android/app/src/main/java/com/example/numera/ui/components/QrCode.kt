package com.example.numera.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.MultiFormatWriter

/**
 * Renders [content] (e.g. an otpauth:// URI) as a scannable QR code. Returns nothing if encoding
 * fails, so callers can fall back to a manual-entry key.
 */
@Composable
fun QrCodeImage(content: String, sizePx: Int = 512, modifier: Modifier = Modifier) {
    val bitmap = remember(content, sizePx) { generateQrBitmap(content, sizePx) }
    bitmap?.let {
        Image(bitmap = it.asImageBitmap(), contentDescription = "QR code", modifier = modifier)
    }
}

private fun generateQrBitmap(content: String, size: Int): Bitmap? = try {
    val matrix = MultiFormatWriter().encode(
        content,
        BarcodeFormat.QR_CODE,
        size,
        size,
        mapOf(EncodeHintType.MARGIN to 1),
    )
    val pixels = IntArray(size * size)
    val black = android.graphics.Color.BLACK
    val white = android.graphics.Color.WHITE
    for (y in 0 until size) {
        val offset = y * size
        for (x in 0 until size) {
            pixels[offset + x] = if (matrix.get(x, y)) black else white
        }
    }
    Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565).apply {
        setPixels(pixels, 0, size, 0, 0, size, size)
    }
} catch (e: Exception) {
    null
}
