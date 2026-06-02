package com.example.numera.ui.feature.game

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.numera.theme.CorrectGreen
import com.example.numera.theme.Spacing
import com.example.numera.theme.WrongRed
import com.example.numera.ui.components.DuoButton

/**
 * The "out of hearts" prompt shown after three mistakes in a level. Read-only over
 * [retryTokensLeft]; the two actions stay owned by SoloGameScreen: [onUseRetryToken] (consume a
 * token + restore hearts) and [onExit] (close + finish). Body moved verbatim from the old inline
 * `if (showRetryDialogPrompt)` block, onClick bodies replaced by the callbacks. Guarded by
 * GameplayScreenTest (three mistakes -> dialog renders).
 */
@Composable
fun OutOfHeartsDialog(
    retryTokensLeft: Int,
    onUseRetryToken: () -> Unit,
    onExit: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = {},
        title = {
            Text(
                text = "💔 OUT OF HEARTS",
                fontWeight = FontWeight.Black,
                fontSize = 18.sp,
                color = WrongRed
            )
        },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(Spacing.m)
            ) {
                Text(
                    text = "You made 3 mistakes and failed the level.",
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "You currently have $retryTokensLeft Retry Tokens in your inventory.",
                    fontSize = 14.sp
                )
                if (retryTokensLeft > 0) {
                    Text(
                        text = "Use a Retry Token to restore your hearts and continue playing this level without losing progress!",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                } else {
                    Text(
                        text = "You don't have any Retry Tokens left. You can purchase them in the Shop tab.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
            }
        },
        confirmButton = {
            if (retryTokensLeft > 0) {
                DuoButton(
                    text = "Use Retry Token ($retryTokensLeft left)",
                    onClick = onUseRetryToken,
                    color = CorrectGreen
                )
            }
        },
        dismissButton = {
            TextButton(
                onClick = onExit
            ) {
                Text("Exit Level", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            }
        }
    )
}
