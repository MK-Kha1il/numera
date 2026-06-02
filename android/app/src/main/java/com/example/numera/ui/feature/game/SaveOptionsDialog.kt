package com.example.numera.ui.feature.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.numera.theme.Spacing

/**
 * The "Exercise Options" sheet opened from the favorite button on the equation card: save/unsave
 * this question, save the whole level, or retry the exercise. All four actions are owned by
 * GameplayScreen and passed as callbacks ([onToggleFavorite] / [onSaveLevel] / [onRetryExercise] /
 * [onDismiss], each of which closes the dialog and does its work); [isSaved] only picks the
 * save/unsave label. Body moved verbatim from the old inline `if (showSaveDialog)` block.
 * Guarded by GameplayScreenTest (tap the favorite button -> dialog renders).
 */
@Composable
fun SaveOptionsDialog(
    isSaved: Boolean,
    onToggleFavorite: () -> Unit,
    onSaveLevel: () -> Unit,
    onRetryExercise: () -> Unit,
    onDismiss: () -> Unit,
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                Text("Exercise Options", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)

                // Save this question
                OutlinedButton(
                    onClick = onToggleFavorite,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(if (isSaved) "❤️  Unsave This Question" else "❤️  Save This Question", fontWeight = FontWeight.Bold)
                }

                // Save entire level
                Button(
                    onClick = onSaveLevel,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("📁  Save Entire Level", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                }

                // Retry this exercise
                Button(
                    onClick = onRetryExercise,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    Text("🔄  Retry This Exercise", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSecondary)
                }

                TextButton(onClick = onDismiss, modifier = Modifier.align(Alignment.End)) {
                    Text("Cancel")
                }
            }
        }
    }
}
